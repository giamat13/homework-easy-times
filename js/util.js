// util.js — פונקציות עזר טהורות. בלי DOM, בלי state, בלי תלויות.

/** בריחת HTML — כל טקסט ממשתמש עובר דרך כאן לפני שהוא נכנס ל-innerHTML. */
export function esc(v) {
  if (v === null || v === undefined) return '';
  return String(v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** מזהה ייחודי קצר וניתן למיון לפי זמן. */
export function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// ---------- תאריכים (ISO yyyy-mm-dd בפנים, פורמט ישראלי בחוץ) ----------

export function todayISO() { return toISO(new Date()); }

export function toISO(d) {
  if (!d) return '';
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt)) return '';
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

export function pad(n) { return String(n).padStart(2, '0'); }

/** ISO -> Date מקומי בחצות. מונע את באג ה-UTC של new Date('2025-01-01'). */
export function fromISO(iso) {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso));
  if (!m) { const d = new Date(iso); return isNaN(d) ? null : d; }
  return new Date(+m[1], +m[2] - 1, +m[3]);
}

const dtfShort = new Intl.DateTimeFormat('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
const dtfLong = new Intl.DateTimeFormat('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });
const dtfMonth = new Intl.DateTimeFormat('he-IL', { month: 'long', year: 'numeric' });

/** 05/03/2026 */
export function fmtDate(iso) { const d = fromISO(iso); return d ? dtfShort.format(d) : ''; }
/** יום חמישי, 5 במרץ */
export function fmtDateLong(iso) { const d = fromISO(iso); return d ? dtfLong.format(d) : ''; }
export function fmtMonth(d) { return dtfMonth.format(d); }

export function fmtTime(mins) {
  const h = Math.floor(mins / 60), m = Math.round(mins % 60);
  return h ? `${h} שע׳ ${m} דק׳` : `${m} דק׳`;
}

/** מספר ימים שלמים מהיום עד iso. שלילי = עבר. */
export function daysUntil(iso) {
  const d = fromISO(iso); if (!d) return null;
  const t = fromISO(todayISO());
  return Math.round((d - t) / 86400000);
}

/** טקסט יחסי בעברית: "היום", "מחר", "לפני 3 ימים". */
export function relativeDay(iso) {
  const n = daysUntil(iso);
  if (n === null) return '';
  if (n === 0) return 'היום';
  if (n === 1) return 'מחר';
  if (n === 2) return 'מחרתיים';
  if (n === -1) return 'אתמול';
  if (n < 0) return `באיחור ${Math.abs(n)} ימים`;
  if (n <= 7) return `בעוד ${n} ימים`;
  return fmtDate(iso);
}

/** דחיפות משימה: overdue | today | soon | later | none */
export function urgency(iso) {
  const n = daysUntil(iso);
  if (n === null) return 'none';
  if (n < 0) return 'overdue';
  if (n === 0) return 'today';
  if (n <= 3) return 'soon';
  return 'later';
}

/** האם משימה עתידית שעדיין לא "נפתחה" (startDate בעתיד). */
export function isScheduledAhead(task) {
  if (!task || !task.startDate) return false;
  const n = daysUntil(task.startDate);
  return n !== null && n > 0;
}

export function addDays(iso, n) {
  const d = fromISO(iso) || new Date();
  d.setDate(d.getDate() + n);
  return toISO(d);
}

/** מפתח שבוע ISO — לגרפי מגמה. */
export function weekKey(iso) {
  const d = fromISO(iso); if (!d) return '';
  const t = new Date(d); t.setDate(t.getDate() + 4 - (t.getDay() || 7));
  const y0 = new Date(t.getFullYear(), 0, 1);
  return `${t.getFullYear()}-W${pad(Math.ceil(((t - y0) / 86400000 + 1) / 7))}`;
}

// ---------- כללי ----------

export function debounce(fn, ms = 200) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

export function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }

export function sum(arr, f = (x) => x) { return arr.reduce((a, b) => a + (Number(f(b)) || 0), 0); }

export function groupBy(arr, f) {
  const m = new Map();
  for (const x of arr) { const k = f(x); if (!m.has(k)) m.set(k, []); m.get(k).push(x); }
  return m;
}

/** נירמול מחרוזת לחיפוש: חסר ניקוד, חסר רישיות, חסר גרשיים. */
export function norm(s) {
  return String(s ?? '').toLowerCase().replace(/[֑-ׇ]/g, '').replace(/["'׳״]/g, '').trim();
}

/** האם needle נמצא ב-hay (חיפוש סובלני). */
export function matches(hay, needle) {
  const n = norm(needle); if (!n) return true;
  return norm(hay).includes(n);
}

/** קריאה בטוחה של מספר, עם ברירת מחדל. */
export function num(v, dflt = null) {
  if (v === '' || v === null || v === undefined) return dflt;
  const n = Number(v);
  return Number.isFinite(n) ? n : dflt;
}

/** מייצר צבע יציב מתוך מחרוזת — למקצוע בלי צבע. */
export function autoColor(seed) {
  let h = 0;
  for (const ch of String(seed)) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return `hsl(${h} 62% 48%)`;
}

/** צבע טקסט קריא מעל רקע נתון (ניגודיות WCAG). */
export function readableOn(bg) {
  const c = parseColor(bg);
  if (!c) return '#fff';
  const l = (0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]));
  return l > 0.42 ? '#10131a' : '#ffffff';
}
function lin(v) { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }
function parseColor(s) {
  if (!s) return null;
  s = String(s).trim();
  let m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s);
  if (m) {
    let h = m[1]; if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  m = /^hsl\(\s*([\d.]+)[\s,]+([\d.]+)%[\s,]+([\d.]+)%/i.exec(s);
  if (m) return hsl2rgb(+m[1], +m[2] / 100, +m[3] / 100);
  m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(s);
  if (m) return [+m[1], +m[2], +m[3]];
  return null;
}
function hsl2rgb(h, s, l) {
  const a = s * Math.min(l, 1 - l);
  const f = (n) => { const k = (n + h / 30) % 12; return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); };
  return [f(0), f(8), f(4)];
}

/** השוואה בטוחה למיון עברי. */
const coll = new Intl.Collator('he');
export function cmpText(a, b) { return coll.compare(String(a ?? ''), String(b ?? '')); }

/** מיזוג עמוק רדוד-בטוח לברירות מחדל של רשומות ישנות. */
export function withDefaults(obj, defaults) {
  const out = { ...defaults, ...(obj && typeof obj === 'object' ? obj : {}) };
  for (const k of Object.keys(defaults)) if (out[k] === undefined || out[k] === null) out[k] = defaults[k];
  return out;
}
