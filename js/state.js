// state.js — המודל בזיכרון. כל קריאה/כתיבה עוברת דרך storage, וכל רשומה מנורמלת
// בכניסה כך שרשומה ישנה שחסרים בה שדות חדשים נטענת בלי לקרוס.

import * as store from './storage.js';
import { KEYS, defaultFor } from './keys.js';
import { uid, withDefaults, num, todayISO } from './util.js';

const SLICES = {
  tasks: KEYS.tasks, subjects: KEYS.subjects, tags: KEYS.tags,
  customFields: KEYS.customFields, settings: KEYS.settings,
  exams: KEYS.exams, members: KEYS.members,
};

export const S = {
  tasks: [], subjects: [], tags: [], customFields: [],
  settings: defaultFor(KEYS.settings), exams: [], members: [],
};

const subs = new Set();
/** מנוי לשינויי מודל. מחזיר פונקציית ביטול. */
export function onData(fn) { subs.add(fn); return () => subs.delete(fn); }
export function notify(what = '*') { for (const f of subs) { try { f(what); } catch (e) { console.error(e); } } }

// ---------- נירמול ----------

const TASK_DEFAULTS = {
  id: '', subject: '', title: '', description: '', startDate: '', dueDate: '',
  priority: 'normal', completed: false, files: [], tags: [], customFields: {},
  assignees: [], notified: false, todayNotified: false,
  // תוספות
  archived: false, createdAt: null, completedAt: null, subtasks: [],
  repeat: 'none', estimateMin: null, order: 0,
};

export function normTask(t) {
  const o = withDefaults(t, TASK_DEFAULTS);
  o.id = o.id || uid('t');
  o.title = String(o.title ?? '');
  o.priority = ['low', 'normal', 'high', 'urgent'].includes(o.priority) ? o.priority : 'normal';
  o.completed = !!o.completed;
  o.archived = !!o.archived;
  o.tags = arr(o.tags); o.assignees = arr(o.assignees); o.files = arr(o.files);
  o.subtasks = arr(o.subtasks).map((s) => (typeof s === 'string'
    ? { id: uid('s'), title: s, done: false }
    : { id: s.id || uid('s'), title: String(s.title ?? ''), done: !!s.done }));
  o.customFields = (o.customFields && typeof o.customFields === 'object') ? o.customFields : {};
  o.createdAt = o.createdAt || (o.dueDate || todayISO());
  if (o.completed && !o.completedAt) o.completedAt = o.createdAt;
  if (!o.completed) o.completedAt = null;
  o.estimateMin = num(o.estimateMin, null);
  if (!['none', 'daily', 'weekly', 'monthly'].includes(o.repeat)) o.repeat = 'none';
  return o;
}

const EXAM_DEFAULTS = {
  id: '', subject: '', title: '', date: '', class: '', type: '', typeOther: '',
  term: '', semester: '', dateB: '', dateC: '', gradeExpected: null, grade: null,
  gradeBonus: null, gradeCorrection: null, correctionMode: 'higher', gradeFinal: null,
  gradeMax: 100, gradePct: null, weight: null, link: '', notes: '', topics: [],
  completed: false,
  // תוספות
  archived: false, createdAt: null, reminderDays: null,
};

export function normExam(e) {
  const o = withDefaults(e, EXAM_DEFAULTS);
  o.id = o.id || uid('x');
  o.title = String(o.title ?? '');
  o.completed = !!o.completed;
  o.gradeMax = num(o.gradeMax, 100) || 100;
  for (const k of ['gradeExpected', 'grade', 'gradeBonus', 'gradeCorrection', 'weight']) o[k] = num(o[k], null);
  o.correctionMode = o.correctionMode === 'average' ? 'average' : 'higher';
  o.topics = arr(o.topics).map((t) => (typeof t === 'string'
    ? { id: uid('tp'), title: t, done: false }
    : { id: t.id || uid('tp'), title: String(t.title ?? ''), done: !!t.done }));
  o.createdAt = o.createdAt || o.date || todayISO();
  o.gradeFinal = computeFinalGrade(o);
  o.gradePct = o.gradeFinal === null ? null : Math.round((o.gradeFinal / o.gradeMax) * 1000) / 10;
  return o;
}

/** ציון סופי = בסיס + בונוס, ואז מיזוג עם ציון תיקון לפי האסטרטגיה. */
export function computeFinalGrade(e) {
  const base = e.grade === null || e.grade === undefined ? null : e.grade + (e.gradeBonus || 0);
  const corr = e.gradeCorrection;
  if (base === null && corr === null) return null;
  if (corr === null) return round1(base);
  if (base === null) return round1(corr);
  return round1(e.correctionMode === 'average' ? (base + corr) / 2 : Math.max(base, corr));
}
const round1 = (n) => Math.round(n * 10) / 10;

export function normSubject(s) {
  const o = withDefaults(s, { id: '', name: '', color: '', archived: false, teacher: '', weeklyHours: null });
  o.id = o.id || uid('sub');
  o.name = String(o.name ?? '');
  return o;
}

export function normField(f) {
  const o = withDefaults(f, { id: '', name: '', type: 'text', options: [], required: false });
  o.id = o.id || uid('cf');
  if (!['text', 'number', 'date', 'select'].includes(o.type)) o.type = 'text';
  o.options = arr(o.options).map(String);
  return o;
}

export function normMember(m) {
  if (typeof m === 'string') return { id: uid('m'), name: m, color: '', email: '' };
  return withDefaults(m, { id: uid('m'), name: '', color: '', email: '' });
}

function arr(v) { return Array.isArray(v) ? v : (v ? [v] : []); }

// ---------- טעינה ושמירה ----------

export function loadAll() {
  S.tasks = arr(store.get(KEYS.tasks)).map(normTask);
  S.subjects = arr(store.get(KEYS.subjects)).map(normSubject);
  S.tags = arr(store.get(KEYS.tags)).map(String);
  S.customFields = arr(store.get(KEYS.customFields)).map(normField);
  S.exams = arr(store.get(KEYS.exams)).map(normExam);
  S.members = arr(store.get(KEYS.members)).map(normMember);
  S.settings = withDefaults(store.get(KEYS.settings), defaultFor(KEYS.settings));
  S.settings.pomodoro = withDefaults(S.settings.pomodoro, defaultFor(KEYS.settings).pomodoro);
  // תגיות שנוצרו במשימות אך חסרות ברשימה — משלימים במקום לאבד אותן
  const known = new Set(S.tags);
  for (const t of S.tasks) for (const g of t.tags) if (g && !known.has(g)) { S.tags.push(g); known.add(g); }
  notify('*');
}

// כתיבה שלנו מסומנת כדי שלא נטען מחדש את המודל בתגובה לעצמנו.
// בלי זה כל save היה בונה מחדש את כל האובייקטים, וכל הפניה שמישהו החזיק
// (למשל ה-closure של "בטל") הייתה הופכת ליתומה שמעדכנת עותק מת.
let selfWrite = false;

/** שומר פרוסה אחת. `save('tasks')` */
export function save(slice) {
  const key = SLICES[slice];
  if (!key) throw new Error(`slice לא מוכר: ${slice}`);
  selfWrite = true;
  try { store.set(key, S[slice]); } finally { selfWrite = false; }
  notify(slice);
}

export function saveAll() {
  selfWrite = true;
  try { for (const k of Object.keys(SLICES)) store.set(SLICES[k], S[k]); } finally { selfWrite = false; }
  notify('*');
}

// טעינה מחדש כשהאחסון משתנה ממקור *חיצוני* — סנכרון מהענן, טאב אחר, החלפת פרופיל.
store.on('change', (key) => {
  if (selfWrite) return;
  if (key === '*' || Object.values(SLICES).includes(key)) loadAll();
});

// ---------- שאילתות נגזרות ----------

export function subjectById(id) { return S.subjects.find((s) => s.id === id) || null; }
export function subjectName(id) { return subjectById(id)?.name || ''; }
export function memberById(id) { return S.members.find((m) => m.id === id) || null; }

export function activeTasks() { return S.tasks.filter((t) => !t.archived); }

/** מצב שימוש נוכחי, עם תאימות לשדה הישן studentMode. */
export function usageMode() {
  const m = S.settings.usageMode;
  if (['student', 'general', 'group'].includes(m)) return m;
  return S.settings.studentMode === false ? 'general' : 'student';
}

/** מילון המונחים משתנה לפי מצב השימוש. */
export function terms() {
  const m = usageMode();
  if (m === 'general') return { subject: 'נושא', subjects: 'נושאים', task: 'מטלה', tasks: 'מטלות', hasExams: false };
  if (m === 'group') return { subject: 'תחום', subjects: 'תחומים', task: 'משימה', tasks: 'משימות', hasExams: false };
  return { subject: 'מקצוע', subjects: 'מקצועות', task: 'משימה', tasks: 'משימות', hasExams: true };
}
