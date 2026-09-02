// exportimport.js — גיבוי JSON, ייצוא CSV/Excel עם עברית תקינה, וייצוא PDF דרך הדפסה.
// PDF נעשה עם חלון ההדפסה של הדפדפן במקום ספריית PDF — עברית ו-RTL יוצאים מושלמים,
// בלי 300KB של ספרייה שממילא לא יודעת לעצב עברית כמו שצריך.

import * as store from './storage.js';
import { KEYS, SYNCED } from './keys.js';
import { S, loadAll } from './state.js';
import { toast, confirmDialog } from './ui.js';
import { fmtDate, todayISO, esc } from './util.js';
import { subjectName } from './state.js';
import { EXAM_TYPES, SEMESTERS } from './exams.js';

const APP = 'homework-manager';
const VERSION = 2;

// ---------- הורדה ----------

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.rel = 'noopener';
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const stamp = () => todayISO().replace(/-/g, '');

// ---------- JSON ----------

export function buildBackup() {
  const data = {};
  for (const k of SYNCED) {
    const v = store.get(k);
    if (v !== undefined && v !== null) data[k] = v;
  }
  return { app: APP, version: VERSION, exportedAt: new Date().toISOString(), data };
}

export function exportJSON() {
  const backup = buildBackup();
  download(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }), `גיבוי-משימות-${stamp()}.json`);
  store.set(KEYS.lastBackup, todayISO());
  toast('הגיבוי הורד בהצלחה', { type: 'success' });
  return backup;
}

/**
 * ייבוא. mode: 'replace' מחליף הכל, 'merge' מוסיף רק פריטים שאין להם מזהה קיים.
 * מוודא מבנה לפני שנוגע בנתונים — קובץ פגום לא ימחק כלום.
 */
export async function importJSON(file, { mode = 'merge' } = {}) {
  const text = await file.text();
  let parsed;
  try { parsed = JSON.parse(text); }
  catch { throw new Error('הקובץ אינו JSON תקין.'); }

  const data = parsed?.data && typeof parsed.data === 'object' ? parsed.data
    : (parsed && typeof parsed === 'object' && parsed[KEYS.tasks] ? parsed : null);
  if (!data) throw new Error('הקובץ אינו גיבוי של האפליקציה.');

  const known = Object.keys(data).filter((k) => SYNCED.includes(k));
  if (!known.length) throw new Error('לא נמצאו נתונים מוכרים בקובץ.');

  const counts = {
    [KEYS.tasks]: Array.isArray(data[KEYS.tasks]) ? data[KEYS.tasks].length : 0,
    [KEYS.exams]: Array.isArray(data[KEYS.exams]) ? data[KEYS.exams].length : 0,
    [KEYS.subjects]: Array.isArray(data[KEYS.subjects]) ? data[KEYS.subjects].length : 0,
  };

  const ok = await confirmDialog(
    `הקובץ מכיל ${counts[KEYS.tasks]} משימות, ${counts[KEYS.exams]} מבחנים ו-${counts[KEYS.subjects]} מקצועות.\n` +
    (mode === 'replace' ? 'הנתונים הקיימים יוחלפו לחלוטין.' : 'הפריטים יתווספו לנתונים הקיימים.'),
    { title: 'אישור ייבוא', okLabel: 'ייבא', danger: mode === 'replace' },
  );
  if (!ok) return null;

  // גיבוי אוטומטי לפני ייבוא — הרשת ביטחון שמונעת אובדן נתונים
  const safety = buildBackup();
  try { localStorage.setItem('__pre-import-backup', JSON.stringify(safety)); } catch { /* noop */ }

  for (const key of known) {
    const incoming = data[key];
    if (mode === 'replace' || !Array.isArray(incoming)) { store.set(key, incoming); continue; }
    const existing = store.get(key);
    if (!Array.isArray(existing)) { store.set(key, incoming); continue; }
    const ids = new Set(existing.map((x) => x?.id).filter(Boolean));
    const merged = [...existing, ...incoming.filter((x) => !x?.id || !ids.has(x.id))];
    store.set(key, merged);
  }
  loadAll();
  toast('הייבוא הושלם', { type: 'success' });
  return counts;
}

/** שחזור הגיבוי האוטומטי שנשמר לפני הייבוא האחרון. */
export function undoLastImport() {
  const raw = localStorage.getItem('__pre-import-backup');
  if (!raw) { toast('אין גיבוי לשחזור.', { type: 'warn' }); return false; }
  const backup = JSON.parse(raw);
  for (const [k, v] of Object.entries(backup.data || {})) store.set(k, v);
  loadAll();
  toast('הנתונים שוחזרו למצב שלפני הייבוא', { type: 'success' });
  return true;
}

// ---------- CSV / Excel ----------

/** BOM חובה — בלעדיו Excel פותח עברית כג׳יבריש. */
function csvBlob(rows) {
  const body = rows.map((r) => r.map(cell).join(',')).join('\r\n');
  return new Blob(['﻿' + body], { type: 'text/csv;charset=utf-8' });
}
function cell(v) {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function exportTasksCSV(list = S.tasks) {
  const rows = [[
    'כותרת', 'מקצוע', 'תיאור', 'תאריך התחלה', 'תאריך הגשה', 'עדיפות',
    'סטטוס', 'תגיות', 'אחראים', 'תת-משימות', 'חזרתיות',
  ]];
  const prio = { urgent: 'דחוף', high: 'גבוה', normal: 'רגיל', low: 'נמוך' };
  for (const t of list) {
    rows.push([
      t.title, subjectName(t.subject), t.description,
      fmtDate(t.startDate), fmtDate(t.dueDate), prio[t.priority] || t.priority,
      t.completed ? 'הושלם' : 'פתוח', t.tags.join(' | '),
      t.assignees.map((a) => S.members.find((m) => m.id === a)?.name || a).join(' | '),
      `${(t.subtasks || []).filter((s) => s.done).length}/${(t.subtasks || []).length}`,
      t.repeat === 'none' ? '' : t.repeat,
    ]);
  }
  download(csvBlob(rows), `משימות-${stamp()}.csv`);
  toast('הקובץ הורד — נפתח ישירות באקסל', { type: 'success' });
}

export function exportExamsCSV(list = S.exams) {
  const rows = [[
    'שם', 'מקצוע', 'שכבה', 'סוג', 'מחצית', 'מועד א׳', 'מועד ב׳', 'מועד ג׳',
    'ציון משוער', 'ציון', 'בונוס', 'ציון תיקון', 'ציון סופי', 'ציון מרבי', 'אחוז',
    'משקל לתעודה', 'נושאים שהושלמו', 'הערות',
  ]];
  for (const e of list) {
    rows.push([
      e.title, subjectName(e.subject), e.class,
      e.type === 'other' ? e.typeOther : (EXAM_TYPES.find((t) => t.id === e.type)?.name || ''),
      SEMESTERS.find((s) => s.id === e.semester)?.name || '',
      fmtDate(e.date), fmtDate(e.dateB), fmtDate(e.dateC),
      e.gradeExpected, e.grade, e.gradeBonus, e.gradeCorrection, e.gradeFinal, e.gradeMax, e.gradePct,
      e.weight, `${(e.topics || []).filter((t) => t.done).length}/${(e.topics || []).length}`, e.notes,
    ]);
  }
  download(csvBlob(rows), `מבחנים-${stamp()}.csv`);
  toast('הקובץ הורד — נפתח ישירות באקסל', { type: 'success' });
}

// ---------- PDF ----------

/**
 * מייצר דוח נקי בחלון נפרד ופותח את תיבת ההדפסה.
 * המשתמש בוחר "שמור כ-PDF" — עברית, RTL, וכל הפונטים נכונים.
 */
export function exportPDF({ tasks = S.tasks, exams = S.exams, title = 'דוח משימות ומבחנים' } = {}) {
  const w = window.open('', '_blank');
  if (!w) { toast('הדפדפן חסם את החלון. אשר חלונות קופצים ונסה שוב.', { type: 'warn', timeout: 7000 }); return; }

  const openTasks = tasks.filter((t) => !t.archived && !t.completed);
  const doneTasks = tasks.filter((t) => !t.archived && t.completed);
  const activeExams = exams.filter((e) => !e.archived);

  const taskRows = (list) => list.map((t) => `<tr>
    <td>${esc(t.title)}</td><td>${esc(subjectName(t.subject))}</td>
    <td>${esc(fmtDate(t.dueDate))}</td>
    <td>${esc({ urgent: 'דחוף', high: 'גבוה', normal: 'רגיל', low: 'נמוך' }[t.priority] || '')}</td>
    <td>${esc(t.tags.join(', '))}</td></tr>`).join('');

  const examRows = activeExams.map((e) => `<tr>
    <td>${esc(e.title)}</td><td>${esc(subjectName(e.subject))}</td>
    <td>${esc(fmtDate(e.date))}</td>
    <td>${e.gradeFinal ?? '—'}</td>
    <td>${(e.topics || []).filter((t) => t.done).length}/${(e.topics || []).length}</td></tr>`).join('');

  w.document.write(`<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8">
<title>${esc(title)}</title><style>
  body{font-family:"Rubik","Segoe UI",system-ui,sans-serif;color:#111;margin:0;padding:22px;line-height:1.5}
  h1{font-size:20px;margin:0 0 4px} h2{font-size:15px;margin:22px 0 8px;border-bottom:2px solid #333;padding-bottom:4px}
  .meta{color:#666;font-size:12px;margin-bottom:16px}
  table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:12px}
  th,td{border:1px solid #ccc;padding:5px 7px;text-align:right;vertical-align:top}
  th{background:#f0f0f0;font-weight:600}
  tr:nth-child(even) td{background:#fafafa}
  .sum{display:flex;gap:18px;font-size:12px;color:#333;margin-bottom:10px;flex-wrap:wrap}
  @page{size:A4;margin:14mm}
</style></head><body>
<h1>${esc(title)}</h1>
<div class="meta">הופק ב-${esc(fmtDate(todayISO()))}</div>
<div class="sum"><span><b>${openTasks.length}</b> משימות פתוחות</span>
<span><b>${doneTasks.length}</b> הושלמו</span>
<span><b>${activeExams.length}</b> מבחנים</span></div>
${openTasks.length ? `<h2>משימות פתוחות</h2><table><thead><tr><th>כותרת</th><th>מקצוע</th><th>מועד הגשה</th><th>עדיפות</th><th>תגיות</th></tr></thead><tbody>${taskRows(openTasks)}</tbody></table>` : ''}
${activeExams.length ? `<h2>מבחנים</h2><table><thead><tr><th>שם</th><th>מקצוע</th><th>מועד</th><th>ציון</th><th>נושאים</th></tr></thead><tbody>${examRows}</tbody></table>` : ''}
${doneTasks.length ? `<h2>משימות שהושלמו</h2><table><thead><tr><th>כותרת</th><th>מקצוע</th><th>מועד הגשה</th><th>עדיפות</th><th>תגיות</th></tr></thead><tbody>${taskRows(doneTasks)}</tbody></table>` : ''}
</body></html>`);
  w.document.close();
  w.addEventListener('load', () => { w.focus(); w.print(); }, { once: true });
  setTimeout(() => { try { w.focus(); w.print(); } catch { /* noop */ } }, 400);
}

// ---------- גיבוי אוטומטי ----------

/** מזכיר גיבוי אחת לשבוע כשהאפשרות מופעלת. */
export function maybeRemindBackup() {
  if (!S.settings.autoBackup) return;
  const last = store.get(KEYS.lastBackup);
  if (last && (Date.now() - new Date(last).getTime()) < 7 * 86400000) return;
  toast('לא גיבית את הנתונים יותר משבוע.', {
    type: 'warn', timeout: 10000,
    action: { label: 'גבה עכשיו', onClick: () => exportJSON() },
  });
}
