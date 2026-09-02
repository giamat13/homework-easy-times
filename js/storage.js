// storage.js — שכבת האחסון האחידה. שאר האפליקציה לא יודעת איפה הנתונים יושבים.
//
// חוזה נספח א׳: הנתונים הפעילים יושבים ב-localStorage תחת שם המפתח *בדיוק*.
// כדי לתמוך גם בריבוי פרופילים, כל פרופיל מקבל תמונת מצב ב-`__ns:{scope}:{key}`,
// והפרופיל הפעיל תמיד משוקף למפתחות הנקיים. כך נתונים ישנים נטענים כמו שהם.

import { KEYS, SYNCED, DEVICE_ONLY, defaultFor } from './keys.js';
import { cloudSet, cloudRemove, cloudGetAll, cloudStamps, cloudWipe, cloudWatch, available } from './cloud.js';

const NS = (scope, key) => `__ns:${scope}:${key}`;
const MT = (scope) => `__mt:${scope}`;
const PENDING = (scope) => `__pending:${scope}`;

const listeners = { change: new Set(), status: new Set() };
let scope = { kind: null, id: null, uid: null }; // null = טרם נקבע סקופ בטעינה הזו
let autoSync = true;
let unwatch = null;
let status = { mode: 'local', syncing: false, lastSync: null, pending: 0, error: null };

// ---------- גישה גולמית ל-localStorage (עם הגנה מפני מכסה מלאה / מצב פרטי) ----------

function rawGet(k) {
  try { const s = localStorage.getItem(k); return s === null ? undefined : JSON.parse(s); }
  catch { return undefined; }
}
function rawSet(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)); return true; }
  catch (e) {
    setStatus({ error: 'האחסון המקומי מלא — ייצא גיבוי ומחק ארכיון.' });
    console.error('[storage] כתיבה נכשלה', k, e);
    return false;
  }
}
function rawDel(k) { try { localStorage.removeItem(k); } catch { /* noop */ } }

// ---------- אירועים ----------

export function on(evt, fn) { listeners[evt]?.add(fn); return () => listeners[evt]?.delete(fn); }
function emit(evt, ...a) { for (const f of listeners[evt] || []) { try { f(...a); } catch (e) { console.error(e); } } }
function setStatus(patch) { status = { ...status, ...patch }; emit('status', status); }
export function getStatus() { return { ...status }; }

// ---------- מעקב זמני שינוי מקומיים ----------

function mtimes() { return rawGet(MT(scope.id)) || {}; }
function touch(key) { const m = mtimes(); m[key] = Date.now(); rawSet(MT(scope.id), m); }

function pending() { return rawGet(PENDING(scope.id)) || []; }
function addPending(key) {
  const p = new Set(pending()); p.add(key);
  rawSet(PENDING(scope.id), [...p]); setStatus({ pending: p.size });
}
function clearPending(key) {
  const p = pending().filter((k) => k !== key);
  rawSet(PENDING(scope.id), p); setStatus({ pending: p.length });
}

// ---------- ה-API הציבורי ----------

/** קריאה. תמיד מקומית ומיידית — הענן מסתנכרן ברקע. */
export function get(key, fallback) {
  const v = rawGet(key);
  if (v === undefined) return fallback !== undefined ? fallback : defaultFor(key);
  return v;
}

/** כתיבה. מקומית תמיד; לענן בנוסף, וכשלון בענן נכנס לתור ולא מאבד כלום. */
export function set(key, value) {
  const ok = rawSet(key, value);
  if (!ok) return false;
  if (!DEVICE_ONLY.includes(key)) {
    rawSet(NS(scope.id, key), value);
    touch(key);
  }
  emit('change', key, value);
  if (scope.uid && SYNCED.includes(key)) pushKey(key);
  return true;
}

export function remove(key) {
  rawDel(key);
  rawDel(NS(scope.id, key));
  emit('change', key, undefined);
  if (scope.uid && SYNCED.includes(key)) cloudRemove(scope.uid, key).catch(() => addPending(key));
}

/** מוחק את כל נתוני הפרופיל הנוכחי (לא נוגע בפרופילים אחרים). */
export function clearAll({ cloud = false } = {}) {
  for (const k of SYNCED) { rawDel(k); rawDel(NS(scope.id, k)); }
  rawDel(MT(scope.id)); rawDel(PENDING(scope.id));
  emit('change', '*', undefined);
  if (cloud && scope.uid) return cloudWipe(scope.uid).catch((e) => console.warn(e));
  return Promise.resolve();
}

// ---------- סקופים (פרופיל אורח / משתמש מחובר) ----------

export function currentScope() { return { ...scope }; }

/**
 * מחליף פרופיל: שומר תמונת מצב של הנוכחי, וטוען את החדש למפתחות הנקיים.
 * adopt=true — נתונים שכבר יושבים במפתחות הנקיים "מאומצים" לסקופ החדש
 * (כך משתמש קיים שנכנס לראשונה לא מאבד כלום).
 */
export async function setScope(next, { adopt = false } = {}) {
  const prev = scope;
  const firstOfSession = !prev.id; // אין סקופ קודם בטעינה הזו — לא החלפת פרופיל
  if (!firstOfSession && prev.id === next.id && prev.uid === next.uid) return;

  if (unwatch) { unwatch(); unwatch = null; }

  // 1. שמירת תמונת מצב של הסקופ הקודם — רק אם באמת היה כזה
  if (!firstOfSession && !adopt) {
    for (const k of SYNCED) { const v = rawGet(k); if (v !== undefined) rawSet(NS(prev.id, k), v); }
  }

  scope = { kind: next.kind, id: next.id, uid: next.uid || null };
  const hasSnapshot = SYNCED.some((k) => rawGet(NS(scope.id, k)) !== undefined);

  // 2. טעינת הסקופ החדש למפתחות הנקיים.
  //    כלל הזהב: לעולם לא מוחקים מפתחות נקיים אם אין לסקופ תמונת מצב משלו.
  //    כך נתונים של משתמש קיים (או מגרסה ישנה) מאומצים במקום להימחק.
  if (adopt || (firstOfSession && !hasSnapshot)) {
    for (const k of SYNCED) { const v = rawGet(k); if (v !== undefined) rawSet(NS(scope.id, k), v); }
  } else if (firstOfSession) {
    // המפתח הנקי הוא מיקום החוזה (נספח א׳). set() תמיד כותב אליו ולתמונת המצב יחד,
    // ולכן אם הם נבדלים — מישהו חיצוני כתב לשם (גרסה ישנה, שחזור ידני). הוא מנצח.
    for (const k of SYNCED) {
      const plain = rawGet(k);
      const snap = rawGet(NS(scope.id, k));
      if (plain !== undefined && JSON.stringify(plain) !== JSON.stringify(snap)) {
        rawSet(NS(scope.id, k), plain);
        touch(k);
      } else if (snap === undefined) rawDel(k);
      else rawSet(k, snap);
    }
  } else {
    // החלפת פרופיל מפורשת — תמונת המצב של היעד היא האמת
    for (const k of SYNCED) {
      const v = rawGet(NS(scope.id, k));
      if (v === undefined) rawDel(k); else rawSet(k, v);
    }
  }

  setStatus({ mode: scope.uid ? 'cloud' : 'local', pending: pending().length, error: null });
  emit('change', '*', undefined);

  // 3. משיכה מהענן ברקע
  if (scope.uid) {
    await syncNow().catch((e) => console.warn('[storage] sync', e));
    if (autoSync) startWatch();
  }
}

function startWatch() {
  if (!scope.uid || unwatch) return;
  cloudWatch(scope.uid, (key, value) => {
    if (!SYNCED.includes(key)) return;
    if (value === undefined) { rawDel(key); rawDel(NS(scope.id, key)); }
    else { rawSet(key, value); rawSet(NS(scope.id, key), value); }
    emit('change', key, value);
  }).then((u) => { unwatch = u; });
}

// ---------- סנכרון ----------

async function pushKey(key) {
  if (!autoSync) { addPending(key); return; }
  try {
    await cloudSet(scope.uid, key, rawGet(key));
    clearPending(key);
    setStatus({ lastSync: Date.now(), error: null });
  } catch (e) {
    addPending(key);
    setStatus({ error: 'אין חיבור — הנתונים נשמרו מקומית ויסונכרנו אוטומטית.' });
  }
}

/** סנכרון דו־כיווני מלא. מפתח חדש יותר מנצח, לכל מפתח בנפרד. */
export async function syncNow() {
  if (!scope.uid) return { skipped: true };
  if (!(await available())) return { skipped: true };
  setStatus({ syncing: true, error: null });
  try {
    const [remote, stamps] = await Promise.all([cloudGetAll(scope.uid), cloudStamps(scope.uid)]);
    const local = mtimes();
    const pend = new Set(pending());
    let pulled = 0, pushed = 0;

    for (const key of SYNCED) {
      const hasRemote = remote.has(key);
      const localVal = rawGet(key);
      const hasLocal = localVal !== undefined;
      const rt = stamps.get(key) || 0;
      const lt = local[key] || 0;

      if (hasRemote && (!hasLocal || (rt > lt && !pend.has(key)))) {
        rawSet(key, remote.get(key)); rawSet(NS(scope.id, key), remote.get(key));
        emit('change', key, remote.get(key)); pulled++;
      } else if (hasLocal && (!hasRemote || lt > rt || pend.has(key))) {
        await cloudSet(scope.uid, key, localVal); clearPending(key); pushed++;
      }
    }
    setStatus({ syncing: false, lastSync: Date.now(), pending: pending().length });
    return { pulled, pushed };
  } catch (e) {
    setStatus({ syncing: false, error: 'הסנכרון נכשל — הנתונים בטוחים מקומית.' });
    throw e;
  }
}

export function setAutoSync(v) {
  autoSync = !!v;
  rawSet(KEYS.autoSync, autoSync);
  if (autoSync) { startWatch(); syncNow().catch(() => {}); }
  else if (unwatch) { unwatch(); unwatch = null; }
}
export function isAutoSync() { return autoSync; }

/** העלאת כל הנתונים המקומיים לענן — להמרת אורח לחשבון. */
export async function pushAll(uid) {
  for (const k of SYNCED) {
    const v = rawGet(k);
    if (v !== undefined) { try { await cloudSet(uid, k, v); } catch { addPending(k); } }
  }
}

// ---------- אתחול ----------

export function initStorage() {
  const a = rawGet(KEYS.autoSync);
  autoSync = a === undefined ? true : !!a;
  setStatus({ pending: pending().length });

  // סנכרון חוזר כשחוזרת הרשת
  addEventListener('online', () => { if (scope.uid && autoSync) syncNow().catch(() => {}); });
  // שינוי בטאב אחר של אותו דפדפן
  addEventListener('storage', (e) => {
    if (e.key && !e.key.startsWith('__')) emit('change', e.key, rawGet(e.key));
  });
  return { ...scope };
}

export { KEYS };
