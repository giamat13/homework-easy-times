// gamification.js — XP, רמות, רצף, ימים מושלמים, והישגים.
// כל פעולה שמעניקה XP חייבת פעולת היפוך מדויקת. ביטול סימון מחזיר את המצב לאחור.

import * as store from './storage.js';
import { KEYS, defaultFor } from './keys.js';
import { activeTasks } from './state.js';
import { withDefaults, todayISO, daysUntil, addDays } from './util.js';
import { evaluate, earnedNow, byId } from './achievements.js';

export const XP = {
  task: 10, taskHigh: 15, taskUrgent: 20,
  early: 5,          // בונוס להגשה לפני המועד
  overdue: -3,       // קנס על השלמה באיחור (לא יורד מתחת ל-0 מצטבר)
  perfectDay: 30,
  exam: 40, topic: 4, fullyPrepared: 25,
  studyPerMinute: 0.5, pomodoro: 12,
};

let stats = defaultFor(KEYS.gamStats);
let unlocked = [];
const subs = new Set();

export function onGam(fn) { subs.add(fn); return () => subs.delete(fn); }
function emit(evt) { for (const f of subs) { try { f(evt, getStats()); } catch (e) { console.error(e); } } }

export function getStats() { return { ...stats }; }
export function getUnlocked() { return [...unlocked]; }

// ---------- עקומת רמות ----------
// רמה n דורשת 100*n XP. פשוט, צפוי, וקל להסביר לתלמיד.

export function xpForLevel(level) { return 100 * level; }

export function levelInfo(totalXP = stats.totalXP) {
  let level = 1, rest = Math.max(0, totalXP);
  while (rest >= xpForLevel(level)) { rest -= xpForLevel(level); level++; }
  const need = xpForLevel(level);
  return { level, xpInLevel: rest, xpNeeded: need, ratio: need ? rest / need : 0 };
}

// ---------- טעינה ושמירה ----------

export function loadGam() {
  stats = withDefaults(store.get(KEYS.gamStats), defaultFor(KEYS.gamStats));
  const current = store.get(KEYS.gamAchievements) || [];
  const legacy = store.get(KEYS.legacyAchievements) || [];
  // מיזוג המפתח הישן — קוראים ולא כותבים אליו
  unlocked = [...new Set([...toIds(current), ...toIds(legacy)])];
  syncLevel();
  refreshAchievements({ silent: true });
  return getStats();
}

function toIds(v) {
  if (!Array.isArray(v)) return v && typeof v === 'object' ? Object.keys(v).filter((k) => v[k]) : [];
  return v.map((x) => (typeof x === 'string' ? x : x?.id)).filter(Boolean);
}

function persist() {
  store.set(KEYS.gamStats, stats);
  store.set(KEYS.gamAchievements, unlocked);
}

function syncLevel() {
  const li = levelInfo(stats.totalXP);
  stats.level = li.level;
  stats.xp = li.xpInLevel;
}

// ---------- מנוע XP ----------

/** מוסיף XP ורושם ביומן, כך שאפשר להסביר ולהפוך. */
function addXP(amount, reason, ref) {
  if (!amount) return;
  stats.totalXP = Math.max(0, Math.round((stats.totalXP + amount) * 10) / 10);
  stats.xpLog = [{ t: Date.now(), amount, reason, ref }, ...(stats.xpLog || [])].slice(0, 200);
  syncLevel();
}

// ---------- רצף יומי ----------

function bumpStreak() {
  const today = todayISO();
  if (stats.lastActivityDate === today) return;
  stats.streak = stats.lastActivityDate === addDays(today, -1) ? (stats.streak || 0) + 1 : 1;
  stats.lastActivityDate = today;
  stats.longestStreak = Math.max(stats.longestStreak || 0, stats.streak);
}

/** מנקה רצף שנקטע — נקרא בטעינת האפליקציה. */
export function refreshStreak() {
  const today = todayISO();
  const last = stats.lastActivityDate;
  if (last && last !== today && last !== addDays(today, -1)) stats.streak = 0;
  if (stats.lastPerfectDay && stats.lastPerfectDay !== today && stats.lastPerfectDay !== addDays(today, -1)) {
    stats.perfectDayStreak = 0;
  }
  if (stats.lastPerfectDay !== today) stats.perfectDayToday = false;
  persist();
  emit('streak');
}

// ---------- יום מושלם ----------

/** יום מושלם = היו משימות שמועדן היום, וכולן הושלמו. */
export function checkPerfectDay() {
  const today = todayISO();
  const dueToday = activeTasks().filter((t) => t.dueDate === today);
  const perfect = dueToday.length > 0 && dueToday.every((t) => t.completed);

  if (perfect && stats.lastPerfectDay !== today) {
    stats.perfectDays = (stats.perfectDays || 0) + 1;
    stats.perfectDayStreak = stats.lastPerfectDay === addDays(today, -1) ? (stats.perfectDayStreak || 0) + 1 : 1;
    stats.maxPerfectDayStreak = Math.max(stats.maxPerfectDayStreak || 0, stats.perfectDayStreak);
    stats.lastPerfectDay = today;
    stats.perfectDayToday = true;
    addXP(XP.perfectDay, 'perfectDay', today);
    return true;
  }
  if (!perfect && stats.lastPerfectDay === today) {
    // ביטול סימון שבר את היום המושלם — מחזירים הכל
    stats.perfectDays = Math.max(0, (stats.perfectDays || 0) - 1);
    stats.perfectDayStreak = Math.max(0, (stats.perfectDayStreak || 0) - 1);
    stats.lastPerfectDay = null;
    stats.perfectDayToday = false;
    addXP(-XP.perfectDay, 'perfectDay:undo', today);
  }
  return false;
}

// ---------- פעולות ----------

function taskXP(task) {
  let x = task.priority === 'urgent' ? XP.taskUrgent : task.priority === 'high' ? XP.taskHigh : XP.task;
  const d = task.dueDate ? daysUntil(task.dueDate) : null;
  if (d !== null && d > 0) x += XP.early;
  if (d !== null && d < 0) x += XP.overdue;
  return { x, early: d !== null && d > 0 };
}

/** השלמת משימה. מחזיר { xp, newAchievements }. */
export function awardTask(task) {
  const { x, early } = taskXP(task);
  addXP(x, 'task', task.id);
  stats.totalTasksCompleted = (stats.totalTasksCompleted || 0) + 1;
  if (early) stats.earlySubmissions = (stats.earlySubmissions || 0) + 1;
  bumpStreak();
  checkPerfectDay();
  const fresh = refreshAchievements();
  persist(); emit('task');
  return { xp: x, newAchievements: fresh };
}

/** ביטול השלמה — היפוך מלא, כולל נעילת הישגים שנפתחו בגללה. */
export function revertTask(task) {
  const { x, early } = taskXP(task);
  addXP(-x, 'task:undo', task.id);
  stats.totalTasksCompleted = Math.max(0, (stats.totalTasksCompleted || 0) - 1);
  if (early) stats.earlySubmissions = Math.max(0, (stats.earlySubmissions || 0) - 1);
  checkPerfectDay();
  const lost = relockAchievements();
  persist(); emit('task');
  return { xp: -x, lostAchievements: lost };
}

export function awardExam(exam) {
  addXP(XP.exam, 'exam', exam.id);
  stats.totalExamsCompleted = (stats.totalExamsCompleted || 0) + 1;
  if (exam.topics?.length && exam.topics.every((t) => t.done)) {
    stats.fullyPreparedExams = (stats.fullyPreparedExams || 0) + 1;
    addXP(XP.fullyPrepared, 'fullyPrepared', exam.id);
  }
  bumpStreak();
  const fresh = refreshAchievements();
  persist(); emit('exam');
  return { newAchievements: fresh };
}

export function revertExam(exam) {
  addXP(-XP.exam, 'exam:undo', exam.id);
  stats.totalExamsCompleted = Math.max(0, (stats.totalExamsCompleted || 0) - 1);
  if (exam.topics?.length && exam.topics.every((t) => t.done)) {
    stats.fullyPreparedExams = Math.max(0, (stats.fullyPreparedExams || 0) - 1);
    addXP(-XP.fullyPrepared, 'fullyPrepared:undo', exam.id);
  }
  const lost = relockAchievements();
  persist(); emit('exam');
  return { lostAchievements: lost };
}

/** delta = +1 לסימון נושא, -1 לביטול. */
export function awardTopic(delta = 1) {
  stats.totalTopicsDone = Math.max(0, (stats.totalTopicsDone || 0) + delta);
  addXP(XP.topic * delta, delta > 0 ? 'topic' : 'topic:undo');
  if (delta > 0) bumpStreak();
  const fresh = delta > 0 ? refreshAchievements() : (relockAchievements(), []);
  persist(); emit('topic');
  return { newAchievements: fresh };
}

/** זמן לימוד מהטיימר. minutes — דקות שהושלמו בפועל. */
export function awardStudy(minutes, { pomodoro = false } = {}) {
  const m = Math.max(0, Math.round(minutes));
  if (!m) return { newAchievements: [] };
  stats.totalStudyTime = (stats.totalStudyTime || 0) + m;
  addXP(Math.round(m * XP.studyPerMinute), 'study');
  if (pomodoro) { stats.pomodoroSessions = (stats.pomodoroSessions || 0) + 1; addXP(XP.pomodoro, 'pomodoro'); }
  bumpStreak();
  const fresh = refreshAchievements();
  persist(); emit('study');
  return { newAchievements: fresh };
}

// ---------- הישגים ----------

/** פותח הישגים חדשים שהושגו. מחזיר את ההגדרות של החדשים בלבד. */
export function refreshAchievements({ silent = false } = {}) {
  const now = new Set(earnedNow(stats));
  const fresh = [...now].filter((id) => !unlocked.includes(id));
  if (fresh.length) {
    unlocked = [...unlocked, ...fresh];
    if (!silent) { persist(); emit('achievement'); }
  }
  return fresh.map(byId).filter(Boolean);
}

/** נועל הישגים שכבר לא מתקיימים — כדי שביטול סימון באמת יבטל. */
export function relockAchievements() {
  const now = new Set(earnedNow(stats));
  const lost = unlocked.filter((id) => !now.has(id));
  if (lost.length) { unlocked = unlocked.filter((id) => now.has(id)); emit('achievement'); }
  return lost.map(byId).filter(Boolean);
}

export function achievementList() { return evaluate(stats, unlocked); }

/** איפוס מלא של הגיימיפיקציה (מהגדרות). */
export function resetGamification() {
  stats = defaultFor(KEYS.gamStats);
  unlocked = [];
  persist(); emit('reset');
}
