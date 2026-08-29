// google.js — אינטגרציות Google: Calendar, Tasks, Classroom. אופציונלי לחלוטין.
// בלי googleClientId ב-config.js המודול פשוט מדווח "לא מוגדר" והאפליקציה ממשיכה כרגיל.

import * as store from './storage.js';
import { KEYS } from './keys.js';
import { config } from './cloud.js';

const GIS = 'https://accounts.google.com/gsi/client';

export const SCOPES = {
  calendar: 'https://www.googleapis.com/auth/calendar.readonly',
  tasks: 'https://www.googleapis.com/auth/tasks',
  // קריאה בלבד: המודול רק מושך קורסים ומטלות. scope רחב יותר גם היה דורש אישור
  // מחדש במסך ההסכמה, וגם מבקש מהמשתמש הרשאה שאיננו צריכים.
  classroom: 'https://www.googleapis.com/auth/classroom.courses.readonly https://www.googleapis.com/auth/classroom.coursework.me.readonly',
};

let clientId = null;
let gisReady = null;

export async function googleConfigured() {
  const c = await config();
  clientId = c?.googleClientId || null;
  return !!clientId;
}

function loadGIS() {
  if (gisReady) return gisReady;
  gisReady = new Promise((res, rej) => {
    if (window.google?.accounts?.oauth2) return res();
    const s = document.createElement('script');
    s.src = GIS; s.async = true; s.defer = true;
    s.onload = () => res();
    s.onerror = () => rej(new Error('טעינת Google נכשלה — בדוק את חיבור הרשת.'));
    document.head.append(s);
  });
  return gisReady;
}

// ---------- טוקן ----------

function readToken() {
  const t = store.get(KEYS.classroomToken);
  if (!t?.access_token || !t.expiresAt) return null;
  return Date.now() < t.expiresAt - 60_000 ? t : null;
}
function writeToken(t) { store.set(KEYS.classroomToken, t); }

export function isConnected(scopeKey) {
  const t = readToken();
  if (!t) return false;
  return !scopeKey || (t.scopes || '').includes(SCOPES[scopeKey].split(' ')[0]);
}

export function disconnect() {
  const t = readToken();
  if (t?.access_token && window.google?.accounts?.oauth2) {
    try { window.google.accounts.oauth2.revoke(t.access_token); } catch { /* noop */ }
  }
  store.remove(KEYS.classroomToken);
}

/** מבקש הרשאה. חייב לרוץ מתוך קליק של המשתמש (חוסם חלונות קופצים). */
export async function connect(scopeKeys = ['calendar']) {
  if (!(await googleConfigured())) {
    throw new Error('אינטגרציית Google לא מוגדרת. הוסף googleClientId ל-config.js.');
  }
  await loadGIS();
  const existing = readToken();
  const scopes = [...new Set([...(existing?.scopes || '').split(' ').filter(Boolean),
    ...scopeKeys.flatMap((k) => SCOPES[k].split(' '))])].join(' ');

  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId, scope: scopes,
      callback: (resp) => {
        if (resp.error) { reject(new Error(resp.error_description || resp.error)); return; }
        const token = {
          access_token: resp.access_token,
          expiresAt: Date.now() + (Number(resp.expires_in) || 3600) * 1000,
          scopes,
        };
        writeToken(token);
        resolve(token);
      },
      error_callback: (e) => reject(new Error(e?.message || 'ההרשאה בוטלה.')),
    });
    client.requestAccessToken({ prompt: existing ? '' : 'consent' });
  });
}

async function api(path, { method = 'GET', body, params } = {}) {
  const t = readToken();
  if (!t) throw new Error('לא מחובר ל-Google. התחבר מההגדרות.');
  const url = new URL(path);
  for (const [k, v] of Object.entries(params || {})) if (v !== undefined) url.searchParams.set(k, v);
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${t.access_token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) { store.remove(KEYS.classroomToken); throw new Error('ההרשאה פגה. התחבר שוב ל-Google.'); }
  if (!res.ok) throw new Error(`Google API ${res.status}: ${(await res.text()).slice(0, 120)}`);
  return res.status === 204 ? null : res.json();
}

// ---------- Calendar ----------

/** אירועים מהיום ועד days קדימה. */
export async function listCalendarEvents({ days = 14 } = {}) {
  const data = await api('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    params: {
      timeMin: new Date().toISOString(),
      timeMax: new Date(Date.now() + days * 86400000).toISOString(),
      singleEvents: 'true', orderBy: 'startTime', maxResults: '50',
    },
  });
  return (data.items || []).map((e) => ({
    id: e.id,
    title: e.summary || '(ללא כותרת)',
    date: (e.start?.date || e.start?.dateTime || '').slice(0, 10),
    time: e.start?.dateTime ? e.start.dateTime.slice(11, 16) : null,
    location: e.location || '',
    link: e.htmlLink,
  })).filter((e) => e.date);
}

// ---------- Tasks ----------

export async function listGoogleTaskLists() {
  const d = await api('https://tasks.googleapis.com/tasks/v1/users/@me/lists');
  return (d.items || []).map((l) => ({ id: l.id, title: l.title }));
}

export async function listGoogleTasks(listId = '@default') {
  const d = await api(`https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(listId)}/tasks`, {
    params: { showCompleted: 'true', showHidden: 'false', maxResults: '100' },
  });
  return (d.items || []).map((t) => ({
    id: t.id, listId,
    title: t.title || '(ללא כותרת)',
    notes: t.notes || '',
    due: t.due ? t.due.slice(0, 10) : '',
    completed: t.status === 'completed',
  }));
}

/** סימון דו־כיווני: משנה סטטוס ב-Google Tasks. */
export async function setGoogleTaskStatus(listId, taskId, completed) {
  return api(`https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(listId)}/tasks/${encodeURIComponent(taskId)}`, {
    method: 'PATCH',
    body: completed
      ? { status: 'completed', completed: new Date().toISOString() }
      : { status: 'needsAction', completed: null },
  });
}

// ---------- Classroom ----------

export async function listCourses() {
  const d = await api('https://classroom.googleapis.com/v1/courses', {
    params: { courseStates: 'ACTIVE', pageSize: '50' },
  });
  return (d.courses || []).map((c) => ({ id: c.id, name: c.name, section: c.section || '' }));
}

export async function listCourseWork(courseId) {
  const d = await api(`https://classroom.googleapis.com/v1/courses/${encodeURIComponent(courseId)}/courseWork`, {
    params: { pageSize: '100', orderBy: 'dueDate desc' },
  });
  return (d.courseWork || []).map((w) => ({
    id: w.id, courseId,
    title: w.title || '(ללא כותרת)',
    description: (w.description || '').slice(0, 1500),
    due: w.dueDate ? `${w.dueDate.year}-${String(w.dueDate.month).padStart(2, '0')}-${String(w.dueDate.day).padStart(2, '0')}` : '',
    link: w.alternateLink || '',
    maxPoints: w.maxPoints ?? null,
  }));
}

// ---------- מיפוי קורס → מקצוע ----------

export function getMapping() {
  const m = store.get(KEYS.classroomMapping);
  return m && typeof m === 'object' ? m : {};
}
export function setMapping(m) { store.set(KEYS.classroomMapping, m || {}); }

/** מיפוי אוטומטי ראשוני לפי דמיון שמות — המשתמש תמיד יכול לתקן. */
export function guessMapping(courses, subjects) {
  const m = { ...getMapping() };
  for (const c of courses) {
    if (m[c.id]) continue;
    const cn = c.name.toLowerCase();
    const hit = subjects.find((s) => s.name && (cn.includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(cn.split(' ')[0])));
    if (hit) m[c.id] = hit.id;
  }
  return m;
}

/** זיהוי כפילויות: משימה שכבר יובאה מזוהה לפי externalId. */
export function isDuplicate(tasks, work) {
  return tasks.some((t) => t.externalId === `classroom:${work.id}`
    || (t.title === work.title && t.dueDate === work.due));
}
