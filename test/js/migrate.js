// migrate.js — ייבוא נתונים מגרסה 1.0. רץ פעם אחת, לפני האתחול, ואידמפוטנטי.
// לא מוחק ולא משנה שום מפתח של 1.0 — אם צריך לחזור אחורה, הנתונים נשארו במקומם.
//
// מה 1.0 השאירה מאחור, ואיפה:
//   • הפרופיל הפעיל   — במפתחות הנקיים (`homework-list` וכו'). נטען כמו שהוא, בלי מיגרציה.
//   • פרופילי אורח נוספים — ב-`guest_profile_{id}`: אובייקט שערכיו מחרוזות JSON (קידוד כפול).
//   • משתמש מחובר      — cache מקומי ב-`user-cache:{uid}:{key}`.
//   • הענן             — `users/{uid}/data/{key}`. אותו נתיב ואותו מבנה בדיוק, ולכן עובר מעצמו.

import { KEYS, SYNCED } from './keys.js';

const FLAG = '__migrated:1.0';

// שמונת המפתחות ש-1.0 שמרה בכל תמונת מצב של פרופיל אורח
const PROFILE_KEYS = [
  'homework-subjects', 'homework-list', 'homework-settings', 'homework-tags',
  'exams-list', 'homework-achievements', 'gamification-stats', 'gamification-achievements',
];

const CACHE_RE = /^user-cache:([^:]+):(.+)$/;

function parse(raw) { try { return raw === null ? undefined : JSON.parse(raw); } catch { return undefined; } }
function has(k) { return localStorage.getItem(k) !== null; }
function put(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } }

/** 1.0 שמרה ערכי פרופיל כמחרוזת JSON בתוך אובייקט. מפענח שכבה אחת אם צריך. */
function decode(v) {
  if (typeof v !== 'string') return v;
  const once = parse(v);
  return once === undefined ? v : once;
}

/**
 * מריץ את המיגרציה. מחזיר דוח קצר אם משהו הועבר, אחרת null.
 * בטוח לקריאה בכל טעינה — הדגל עוצר את ההרצה השנייה.
 */
export function migrate() {
  if (has(FLAG)) return null;
  const report = { profiles: 0, users: 0, keys: 0 };

  // ---------- 1. פרופילי אורח נוספים -> תמונות מצב בסקופ החדש ----------
  const profiles = parse(localStorage.getItem(KEYS.guestProfiles));
  for (const p of Array.isArray(profiles) ? profiles : []) {
    const blob = parse(localStorage.getItem(`guest_profile_${p?.id}`));
    if (!p?.id || !blob || typeof blob !== 'object') continue;
    let moved = 0;
    for (const key of PROFILE_KEYS) {
      const ns = `__ns:guest:${p.id}:${key}`;
      if (blob[key] === undefined || has(ns)) continue; // לא דורסים נתון חדש שכבר קיים
      const val = decode(blob[key]);
      if (val !== undefined && put(ns, val)) moved++;
    }
    if (moved) { report.profiles++; report.keys += moved; }
  }

  // ---------- 2. cache מקומי של משתמש מחובר -> תמונת מצב בסקופ user:{uid} ----------
  // אוספים קודם ורק אז כותבים: כתיבה תוך כדי מעבר על localStorage משבשת את האינדקסים.
  const cached = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    const m = k && CACHE_RE.exec(k);
    if (m && SYNCED.includes(m[2])) cached.push({ from: k, uid: m[1], key: m[2] });
  }
  const users = new Set();
  for (const { from, uid, key } of cached) {
    const ns = `__ns:user:${uid}:${key}`;
    if (has(ns)) continue;
    const val = parse(localStorage.getItem(from));
    if (val === undefined) continue;
    // בלי חותמת זמן מקומית — כך שבסנכרון הראשון הענן הוא האמת למשתמש מחובר,
    // והעותק המקומי משמש רק כשאין רשת.
    if (put(ns, val)) { report.keys++; users.add(uid); }
  }
  report.users = users.size;

  localStorage.setItem(FLAG, new Date().toISOString());
  return report.keys ? report : null;
}

/** נוסח הודעה למשתמש. מופרד כדי שאפשר יהיה לבדוק אותו בלי DOM. */
export function migrationMessage(r) {
  if (!r) return null;
  const parts = [];
  if (r.profiles) parts.push(r.profiles === 1 ? 'פרופיל אחד' : `${r.profiles} פרופילים`);
  if (r.users) parts.push(r.users === 1 ? 'חשבון אחד' : `${r.users} חשבונות`);
  return `יובאו נתונים מהגרסה הקודמת${parts.length ? ` — ${parts.join(', ')}` : ''}.`;
}
