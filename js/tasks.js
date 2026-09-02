// tasks.js — לוגיקת המשימות. בלי DOM: יצירה, עדכון, סינון, מיון, וחזרתיות.

import { S, save, normTask, subjectById } from './state.js';
import { awardTask, revertTask } from './gamification.js';
import { todayISO, daysUntil, addDays, matches, cmpText, isScheduledAhead, uid } from './util.js';

export const PRIORITIES = [
  { id: 'urgent', name: 'דחוף', icon: '🔴', rank: 0 },
  { id: 'high', name: 'גבוה', icon: '🟠', rank: 1 },
  { id: 'normal', name: 'רגיל', icon: '⚪', rank: 2 },
  { id: 'low', name: 'נמוך', icon: '🔵', rank: 3 },
];
const prioRank = (p) => PRIORITIES.find((x) => x.id === p)?.rank ?? 2;

export const REPEATS = [
  { id: 'none', name: 'לא חוזרת' },
  { id: 'daily', name: 'כל יום' },
  { id: 'weekly', name: 'כל שבוע' },
  { id: 'monthly', name: 'כל חודש' },
];

// ---------- CRUD ----------

export function createTask(data) {
  const t = normTask({ ...data, id: uid('t'), createdAt: todayISO() });
  t.order = S.tasks.length;
  S.tasks.push(t);
  registerTags(t.tags);
  save('tasks');
  return t;
}

export function updateTask(id, patch) {
  const i = S.tasks.findIndex((t) => t.id === id);
  if (i < 0) return null;
  S.tasks[i] = normTask({ ...S.tasks[i], ...patch });
  registerTags(S.tasks[i].tags);
  save('tasks');
  return S.tasks[i];
}

/** מחיקה שמחזירה פונקציית שחזור — כל מחיקה בממשק מציעה "בטל". */
export function deleteTask(id) {
  const i = S.tasks.findIndex((t) => t.id === id);
  if (i < 0) return null;
  const [removed] = S.tasks.splice(i, 1);
  save('tasks');
  return () => { S.tasks.splice(Math.min(i, S.tasks.length), 0, removed); save('tasks'); };
}

export function duplicateTask(id) {
  const src = S.tasks.find((t) => t.id === id);
  if (!src) return null;
  return createTask({ ...src, id: '', title: `${src.title} (עותק)`, completed: false, completedAt: null, notified: false, todayNotified: false, progressCurrent: 0 });
}

export function archiveTask(id, archived = true) { return updateTask(id, { archived }); }

/**
 * סימון/ביטול השלמה. מטפל ב-XP, בהישגים ובמשימות חוזרות.
 * מחזיר { task, completed, xp, newAchievements, lostAchievements, spawned, undo }
 */
export function toggleComplete(id) {
  const t = S.tasks.find((x) => x.id === id);
  if (!t) return null;
  const wasCompleted = t.completed;
  const prevCompletedAt = t.completedAt;
  const prevProgressCurrent = t.progressCurrent;

  t.completed = !wasCompleted;
  t.completedAt = t.completed ? todayISO() : null;
  if (t.completed && t.progressTarget !== null) t.progressCurrent = t.progressTarget;

  let result;
  let spawned = null;
  if (t.completed) {
    result = awardTask(t);
    if (t.repeat !== 'none') spawned = spawnNext(t);
  } else {
    result = revertTask(t);
  }
  save('tasks');

  // מאתרים מחדש לפי מזהה: אם בינתיים הגיע סנכרון מהענן, ההפניה הישנה כבר לא במודל.
  const undo = () => {
    const cur = S.tasks.find((x) => x.id === id);
    if (!cur) return;
    cur.completed = wasCompleted;
    cur.completedAt = prevCompletedAt;
    cur.progressCurrent = prevProgressCurrent;
    if (wasCompleted) awardTask(cur); else revertTask(cur);
    if (spawned) { const i = S.tasks.findIndex((x) => x.id === spawned.id); if (i >= 0) S.tasks.splice(i, 1); }
    save('tasks');
  };

  return { task: t, completed: t.completed, spawned, undo, ...result };
}

/** יוצר את המופע הבא של משימה חוזרת. */
function spawnNext(t) {
  const base = t.dueDate || todayISO();
  const next = t.repeat === 'daily' ? addDays(base, 1)
    : t.repeat === 'weekly' ? addDays(base, 7)
      : shiftMonth(base, 1);
  return createTask({
    ...t, id: '', dueDate: next, completed: false, completedAt: null, progressCurrent: 0,
    notified: false, todayNotified: false,
    startDate: t.startDate ? addDays(t.startDate, diffDays(base, next)) : '',
    subtasks: (t.subtasks || []).map((s) => ({ ...s, id: uid('s'), done: false })),
  });
}
function shiftMonth(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1 + n, d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}
function diffDays(a, b) { return Math.round((new Date(b) - new Date(a)) / 86400000); }

/**
 * עדכון התקדמות (0..progressTarget). הגעה ליעד משלימה את המשימה אוטומטית —
 * דרך toggleComplete, כך שה-XP וההישגים עוברים באותו נתיב יחיד.
 */
export function setProgress(id, current) {
  const t = S.tasks.find((x) => x.id === id);
  if (!t || t.progressTarget === null) return null;
  t.progressCurrent = Math.max(0, Math.min(Math.round(current), t.progressTarget));
  if (t.progressCurrent >= t.progressTarget && !t.completed) return toggleComplete(id);
  save('tasks');
  return { task: t, completed: t.completed };
}

export function toggleSubtask(taskId, subId) {
  const t = S.tasks.find((x) => x.id === taskId);
  const s = t?.subtasks.find((x) => x.id === subId);
  if (!s) return null;
  s.done = !s.done;
  save('tasks');
  return s;
}

function registerTags(tags) {
  let added = false;
  for (const g of tags || []) if (g && !S.tags.includes(g)) { S.tags.push(g); added = true; }
  if (added) save('tags');
}

// ---------- סינון ומיון ----------

export const SORTS = [
  { id: 'dueDate', name: 'לפי מועד הגשה' },
  { id: 'priority', name: 'לפי עדיפות' },
  { id: 'subject', name: 'לפי מקצוע' },
  { id: 'title', name: 'לפי שם' },
  { id: 'created', name: 'לפי מועד יצירה' },
];

/**
 * f = { q, subject, status, urgency, tags[], assignee, showFuture, showArchived }
 */
export function filterTasks(f = {}) {
  const today = todayISO();
  return S.tasks.filter((t) => {
    if (!f.showArchived && t.archived) return false;
    if (f.showArchived === 'only' && !t.archived) return false;

    // משימה עתידית מוסתרת עד שמגיע תאריך ההתחלה
    if (!f.showFuture && isScheduledAhead(t)) return false;

    if (f.status === 'open' && t.completed) return false;
    if (f.status === 'done' && !t.completed) return false;

    if (f.subject && t.subject !== f.subject) return false;
    if (f.assignee && !t.assignees.includes(f.assignee)) return false;
    if (f.tags?.length && !f.tags.every((g) => t.tags.includes(g))) return false;

    if (f.urgency) {
      const d = t.dueDate ? daysUntil(t.dueDate) : null;
      if (f.urgency === 'overdue' && !(d !== null && d < 0 && !t.completed)) return false;
      if (f.urgency === 'today' && t.dueDate !== today) return false;
      if (f.urgency === 'week' && !(d !== null && d >= 0 && d <= 7)) return false;
      if (f.urgency === 'nodate' && t.dueDate) return false;
    }

    if (f.q) {
      const hay = [t.title, t.description, subjectById(t.subject)?.name, ...t.tags,
        ...(t.subtasks || []).map((s) => s.title)].join(' ');
      if (!matches(hay, f.q)) return false;
    }
    return true;
  });
}

export function sortTasks(list, by = 'dueDate') {
  const arr = [...list];
  const noDateLast = (a, b) => (a.dueDate ? 0 : 1) - (b.dueDate ? 0 : 1);
  const cmp = {
    dueDate: (a, b) => noDateLast(a, b) || (a.dueDate || '').localeCompare(b.dueDate || '') || prioRank(a.priority) - prioRank(b.priority),
    priority: (a, b) => prioRank(a.priority) - prioRank(b.priority) || noDateLast(a, b) || (a.dueDate || '').localeCompare(b.dueDate || ''),
    subject: (a, b) => cmpText(subjectById(a.subject)?.name, subjectById(b.subject)?.name) || (a.dueDate || '').localeCompare(b.dueDate || ''),
    title: (a, b) => cmpText(a.title, b.title),
    created: (a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''),
  }[by] || (() => 0);
  // משימות שהושלמו תמיד יורדות למטה
  return arr.sort((a, b) => (a.completed - b.completed) || cmp(a, b));
}

/** קיבוץ לתצוגה: היום / השבוע / באיחור / בהמשך / ללא תאריך. */
export function groupForDisplay(list) {
  const buckets = {
    overdue: { label: 'באיחור', icon: '⚠️', items: [] },
    today: { label: 'היום', icon: '📌', items: [] },
    week: { label: 'השבוע', icon: '🗓️', items: [] },
    later: { label: 'בהמשך', icon: '📅', items: [] },
    nodate: { label: 'ללא תאריך', icon: '📄', items: [] },
    done: { label: 'הושלמו', icon: '✅', items: [] },
  };
  for (const t of list) {
    if (t.completed) { buckets.done.items.push(t); continue; }
    if (!t.dueDate) { buckets.nodate.items.push(t); continue; }
    const d = daysUntil(t.dueDate);
    if (d < 0) buckets.overdue.items.push(t);
    else if (d === 0) buckets.today.items.push(t);
    else if (d <= 7) buckets.week.items.push(t);
    else buckets.later.items.push(t);
  }
  return Object.entries(buckets).filter(([, b]) => b.items.length);
}

// ---------- סיכומים ----------

export function taskStats(list = S.tasks) {
  const active = list.filter((t) => !t.archived);
  const done = active.filter((t) => t.completed);
  const open = active.filter((t) => !t.completed);
  const today = todayISO();
  return {
    total: active.length,
    done: done.length,
    open: open.length,
    overdue: open.filter((t) => t.dueDate && t.dueDate < today).length,
    dueToday: open.filter((t) => t.dueDate === today).length,
    dueWeek: open.filter((t) => t.dueDate && daysUntil(t.dueDate) >= 0 && daysUntil(t.dueDate) <= 7).length,
    rate: active.length ? Math.round((done.length / active.length) * 100) : 0,
  };
}
