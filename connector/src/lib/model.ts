// Pure helpers that mirror the site's js/state.js and js/util.js, so records written here look exactly like
// records written by the web app (same field names, same defaults, same date format yyyy-mm-dd).

export const TZ = "Asia/Jerusalem";

export const PRIORITIES = [
  { id: "urgent", name: "דחוף", icon: "🔴", rank: 0 },
  { id: "high", name: "גבוה", icon: "🟠", rank: 1 },
  { id: "normal", name: "רגיל", icon: "⚪", rank: 2 },
  { id: "low", name: "נמוך", icon: "🔵", rank: 3 },
] as const;
export const prioIcon = (p: string) => PRIORITIES.find((x) => x.id === p)?.icon ?? "⚪";
export const prioName = (p: string) => PRIORITIES.find((x) => x.id === p)?.name ?? "רגיל";
export const prioRank = (p: string) => PRIORITIES.find((x) => x.id === p)?.rank ?? 2;

export const REPEAT_NAMES: Record<string, string> = { none: "לא חוזרת", daily: "כל יום", weekly: "כל שבוע", monthly: "כל חודש" };

export const uid = (prefix = "id") => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

// ---------- dates (ISO yyyy-mm-dd, Israel time) ----------

export const todayISO = (): string => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
const parse = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : NaN;
};
export const isISO = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(parse(s));
export function addDays(iso: string, n: number): string {
  const d = new Date(parse(iso) + n * 86400000);
  return d.toISOString().slice(0, 10);
}
export function shiftMonth(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + n, d));
  return dt.toISOString().slice(0, 10);
}
export function daysUntil(iso: string): number | null {
  const t = parse(iso);
  return Number.isNaN(t) ? null : Math.round((t - parse(todayISO())) / 86400000);
}
export function fmtDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}
export function relativeDay(iso: string): string {
  const n = daysUntil(iso);
  if (n === null) return "";
  if (n === 0) return "היום";
  if (n === 1) return "מחר";
  if (n === 2) return "מחרתיים";
  if (n === -1) return "אתמול";
  if (n < 0) return `באיחור ${Math.abs(n)} ימים`;
  if (n <= 7) return `בעוד ${n} ימים`;
  return fmtDate(iso);
}

// ---------- normalisation ----------

const num = (v: any, d: number | null = null) => {
  if (v === "" || v === null || v === undefined) return d;
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};
const arr = (v: any): any[] => (Array.isArray(v) ? v : v ? [v] : []);

export function normTask(t: any): any {
  const o: any = {
    id: "", subject: "", title: "", description: "", startDate: "", dueDate: "", priority: "normal", completed: false,
    files: [], tags: [], customFields: {}, assignees: [], notified: false, todayNotified: false, archived: false,
    createdAt: null, completedAt: null, subtasks: [], repeat: "none", estimateMin: null, order: 0,
    progressTarget: null, progressCurrent: 0, progressUnit: "",
    ...(t && typeof t === "object" ? t : {}),
  };
  o.id = o.id || uid("t");
  o.title = String(o.title ?? "");
  if (!PRIORITIES.some((p) => p.id === o.priority)) o.priority = "normal";
  o.completed = !!o.completed;
  o.archived = !!o.archived;
  o.tags = arr(o.tags);
  o.assignees = arr(o.assignees);
  o.files = arr(o.files);
  o.subtasks = arr(o.subtasks).map((s) =>
    typeof s === "string" ? { id: uid("s"), title: s, done: false } : { id: s.id || uid("s"), title: String(s.title ?? ""), done: !!s.done },
  );
  if (!o.customFields || typeof o.customFields !== "object") o.customFields = {};
  o.createdAt = o.createdAt || o.dueDate || todayISO();
  if (o.completed && !o.completedAt) o.completedAt = o.createdAt;
  if (!o.completed) o.completedAt = null;
  o.estimateMin = num(o.estimateMin, null);
  if (!["none", "daily", "weekly", "monthly"].includes(o.repeat)) o.repeat = "none";
  o.progressTarget = o.progressTarget === null || o.progressTarget === "" ? null : Math.max(0, num(o.progressTarget, 0)!);
  o.progressUnit = String(o.progressUnit ?? "");
  o.progressCurrent = o.progressTarget === null ? 0 : Math.max(0, Math.min(num(o.progressCurrent, 0)!, o.progressTarget));
  return o;
}

const round1 = (n: number) => Math.round(n * 10) / 10;
export function computeFinalGrade(e: any): number | null {
  const base = e.grade === null || e.grade === undefined ? null : e.grade + (e.gradeBonus || 0);
  const corr = e.gradeCorrection ?? null;
  if (base === null && corr === null) return null;
  if (corr === null) return round1(base!);
  if (base === null) return round1(corr);
  return round1(e.correctionMode === "average" ? (base + corr) / 2 : Math.max(base, corr));
}

export function normExam(e: any): any {
  const o: any = {
    id: "", subject: "", title: "", date: "", class: "", type: "", typeOther: "", term: "", semester: "", dateB: "", dateC: "",
    gradeExpected: null, grade: null, gradeBonus: null, gradeCorrection: null, correctionMode: "higher", gradeFinal: null,
    gradeMax: 100, gradePct: null, weight: null, link: "", notes: "", topics: [], completed: false, archived: false,
    createdAt: null, reminderDays: null,
    ...(e && typeof e === "object" ? e : {}),
  };
  o.id = o.id || uid("x");
  o.title = String(o.title ?? "");
  o.completed = !!o.completed;
  o.gradeMax = num(o.gradeMax, 100) || 100;
  for (const k of ["gradeExpected", "grade", "gradeBonus", "gradeCorrection", "weight"]) o[k] = num(o[k], null);
  o.correctionMode = o.correctionMode === "average" ? "average" : "higher";
  o.topics = arr(o.topics).map((t) =>
    typeof t === "string" ? { id: uid("tp"), title: t, done: false } : { id: t.id || uid("tp"), title: String(t.title ?? ""), done: !!t.done },
  );
  o.createdAt = o.createdAt || o.date || todayISO();
  o.gradeFinal = computeFinalGrade(o);
  o.gradePct = o.gradeFinal === null ? null : Math.round((o.gradeFinal / o.gradeMax) * 1000) / 10;
  return o;
}

export function normSubject(s: any): any {
  const o: any = { id: "", name: "", color: "", archived: false, teacher: "", weeklyHours: null, ...(s && typeof s === "object" ? s : {}) };
  o.id = o.id || uid("sub");
  o.name = String(o.name ?? "");
  return o;
}

// ---------- lookup helpers ----------

/** Loose text normalisation: lower-case, no niqqud, no quotes. */
export const norm = (s: unknown) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/[֑-ׇ]/g, "")
    .replace(/["'׳״]/g, "")
    .trim();

export type Found<T> = { item: T } | { error: string };

/** Finds a record by exact id, exact title, or unique partial match. Ambiguity returns the candidates. */
export function findBy<T extends { id: string }>(list: T[], q: string, label: (x: T) => string, noun: string): Found<T> {
  const byId = list.find((x) => x.id === q);
  if (byId) return { item: byId };
  const n = norm(q);
  const exact = list.filter((x) => norm(label(x)) === n);
  if (exact.length === 1) return { item: exact[0] };
  const part = exact.length ? exact : list.filter((x) => norm(label(x)).includes(n));
  if (part.length === 1) return { item: part[0] };
  if (part.length > 1)
    return { error: `יש כמה ${noun} שמתאימים ל-"${q}". ציין מזהה (id) מדויק:\n${part.slice(0, 8).map((x) => `- ${label(x)} (id: ${x.id})`).join("\n")}` };
  const near = list.slice(0, 8).map((x) => label(x)).join(", ");
  return { error: `לא נמצא ${noun} בשם "${q}".${near ? ` קיימים: ${near}` : ""}` };
}
