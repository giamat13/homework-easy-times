// achievements.js — מרשם המדדים והערכת ההישגים. מערכת אחת בלבד.
// כל מדד מחזיר מספר, וכל הישג נפתח כאשר המדד >= היעד. לכן לכל הישג יש מד התקדמות.

import { ACHIEVEMENTS, CATEGORIES } from '../data/achievements.js';
import { S, terms } from './state.js';
import { groupBy, sum, todayISO } from './util.js';

/** הישגי מבחנים רלוונטיים רק במצב "תלמיד" — כמו כל שאר ה-UI של מבחנים. */
function visibleAchievements() {
  return terms().hasExams ? ACHIEVEMENTS : ACHIEVEMENTS.filter((a) => a.cat !== 'exams');
}

/** מרשם המדדים. ctx = { stats, tasks, exams, subjects, tags } */
const METRICS = {
  tasksCompleted: (c) => c.stats.totalTasksCompleted || 0,
  earlySubmissions: (c) => c.stats.earlySubmissions || 0,
  longestStreak: (c) => c.stats.longestStreak || 0,
  perfectDays: (c) => c.stats.perfectDays || 0,
  maxPerfectDayStreak: (c) => c.stats.maxPerfectDayStreak || 0,
  examsCompleted: (c) => c.stats.totalExamsCompleted || 0,
  topicsDone: (c) => c.stats.totalTopicsDone || 0,
  fullyPrepared: (c) => c.stats.fullyPreparedExams || 0,
  pomodoroSessions: (c) => c.stats.pomodoroSessions || 0,
  studyHours: (c) => Math.floor((c.stats.totalStudyTime || 0) / 60),
  level: (c) => c.stats.level || 1,
  totalXP: (c) => c.stats.totalXP || 0,

  subjectCount: (c) => c.subjects.filter((s) => s.name && s.color).length,
  tagCount: (c) => c.tags.filter(Boolean).length,
  scheduledTasks: (c) => c.tasks.filter((t) => t.startDate).length,
  tasksWithSubtasks: (c) => c.tasks.filter((t) => t.subtasks?.length).length,

  noOverdue: (c) => {
    const today = todayISO(); // לא toISOString — הוא מחזיר UTC ומזיז יום שלם בישראל
    const open = c.tasks.filter((t) => !t.completed && !t.archived && t.dueDate);
    if (!c.tasks.length) return 0;
    return open.every((t) => t.dueDate >= today) ? 1 : 0;
  },

  bestDayCount: (c) => {
    const done = c.tasks.filter((t) => t.completed && t.completedAt);
    if (!done.length) return 0;
    const perDay = [...groupBy(done, (t) => t.completedAt).values()].map((a) => a.length);
    return Math.max(0, ...perDay);
  },

  avgGrade90: (c) => {
    const g = c.exams.map((e) => e.gradePct).filter((n) => typeof n === 'number');
    if (g.length < 3) return 0;
    return sum(g) / g.length >= 90 ? 1 : 0;
  },

  improvingStreak: (c) => {
    const g = c.exams
      .filter((e) => typeof e.gradePct === 'number' && e.date)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((e) => e.gradePct);
    for (let i = 2; i < g.length; i++) if (g[i] > g[i - 1] && g[i - 1] > g[i - 2]) return 1;
    return 0;
  },
};

function context(stats) {
  return { stats: stats || {}, tasks: S.tasks, exams: S.exams, subjects: S.subjects, tags: S.tags };
}

/**
 * מעריך את כל ההישגים מול המצב הנוכחי.
 * מחזיר [{ ...def, progress, goal, ratio, unlocked }] ממוין: נעולים-קרובים קודם.
 */
export function evaluate(stats, unlockedIds = []) {
  const ctx = context(stats);
  const set = new Set(unlockedIds);
  return visibleAchievements().map((a) => {
    const fn = METRICS[a.metric];
    const progress = fn ? Math.max(0, Number(fn(ctx)) || 0) : 0;
    const ratio = Math.min(1, progress / a.goal);
    // הישג שנפתח בעבר נשאר פתוח גם אם המדד ירד (למשל "שולחן נקי").
    return { ...a, progress, ratio, unlocked: set.has(a.id) || progress >= a.goal };
  });
}

/** מזהי ההישגים שהושגו כרגע לפי המדדים בלבד (בלי הרשימה השמורה). */
export function earnedNow(stats) {
  const ctx = context(stats);
  return visibleAchievements().filter((a) => {
    const fn = METRICS[a.metric];
    return fn && (Number(fn(ctx)) || 0) >= a.goal;
  }).map((a) => a.id);
}

export function byId(id) { return ACHIEVEMENTS.find((a) => a.id === id) || null; }
export function all() { return visibleAchievements(); }
export { CATEGORIES };

/** בדיקת שפיות: כל הישג מצביע על מדד קיים ויעד חיובי. */
export function validateDefinitions() {
  const problems = [];
  const ids = new Set();
  for (const a of ACHIEVEMENTS) {
    if (ids.has(a.id)) problems.push(`מזהה כפול: ${a.id}`);
    ids.add(a.id);
    if (!METRICS[a.metric]) problems.push(`${a.id}: מדד לא קיים "${a.metric}"`);
    if (!(a.goal > 0)) problems.push(`${a.id}: יעד לא חוקי`);
    if (!CATEGORIES[a.cat]) problems.push(`${a.id}: קטגוריה לא קיימת "${a.cat}"`);
  }
  return problems;
}
