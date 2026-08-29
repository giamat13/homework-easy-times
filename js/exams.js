// exams.js — לוגיקת המבחנים והציונים. בלי DOM.

import { S, save, normExam, computeFinalGrade, subjectById } from './state.js';
import { awardExam, revertExam, awardTopic } from './gamification.js';
import { uid, todayISO, daysUntil, matches, sum, num } from './util.js';

export const EXAM_TYPES = [
  { id: 'test', name: 'מבחן' },
  { id: 'quiz', name: 'בוחן' },
  { id: 'paper', name: 'עבודה' },
  { id: 'project', name: 'פרויקט' },
  { id: 'oral', name: 'בחינה בעל פה' },
  { id: 'bagrut', name: 'בגרות' },
  { id: 'other', name: 'אחר' },
];
export const TERMS = [
  { id: 'a', name: 'מועד א׳' }, { id: 'b', name: 'מועד ב׳' }, { id: 'c', name: 'מועד ג׳' },
];
export const SEMESTERS = [
  { id: '1', name: 'מחצית א׳' }, { id: '2', name: 'מחצית ב׳' }, { id: 'year', name: 'שנתי' },
];
export const GRADES = ['ז׳', 'ח׳', 'ט׳', 'י׳', 'י״א', 'י״ב'];
export const CORRECTION_MODES = [
  { id: 'higher', name: 'הציון הגבוה מבין השניים' },
  { id: 'average', name: 'ממוצע שני הציונים' },
];

// ---------- CRUD ----------

export function createExam(data) {
  const e = normExam({ ...data, id: uid('x'), createdAt: todayISO() });
  S.exams.push(e); save('exams');
  return e;
}

export function updateExam(id, patch) {
  const i = S.exams.findIndex((e) => e.id === id);
  if (i < 0) return null;
  S.exams[i] = normExam({ ...S.exams[i], ...patch });
  save('exams');
  return S.exams[i];
}

export function deleteExam(id) {
  const i = S.exams.findIndex((e) => e.id === id);
  if (i < 0) return null;
  const [removed] = S.exams.splice(i, 1);
  save('exams');
  return () => { S.exams.splice(Math.min(i, S.exams.length), 0, removed); save('exams'); };
}

export function toggleExamComplete(id) {
  const e = S.exams.find((x) => x.id === id);
  if (!e) return null;
  e.completed = !e.completed;
  const r = e.completed ? awardExam(e) : revertExam(e);
  save('exams');
  const undo = () => {
    const cur = S.exams.find((x) => x.id === id);
    if (!cur) return;
    cur.completed = !cur.completed;
    if (cur.completed) awardExam(cur); else revertExam(cur);
    save('exams');
  };
  return { exam: e, completed: e.completed, undo, ...r };
}

/** סימון נושא לימוד. מזכה XP ומחזיר את מצב ההתקדמות. */
export function toggleTopic(examId, topicId) {
  const e = S.exams.find((x) => x.id === examId);
  const t = e?.topics.find((x) => x.id === topicId);
  if (!t) return null;
  t.done = !t.done;
  const r = awardTopic(t.done ? 1 : -1);
  save('exams');
  return { topic: t, progress: topicProgress(e), ...r };
}

export function addTopic(examId, title) {
  const e = S.exams.find((x) => x.id === examId);
  if (!e || !String(title).trim()) return null;
  e.topics.push({ id: uid('tp'), title: String(title).trim(), done: false });
  save('exams');
  return e;
}

// ---------- חישובים ----------

export function topicProgress(e) {
  const n = e?.topics?.length || 0;
  const done = n ? e.topics.filter((t) => t.done).length : 0;
  return { done, total: n, ratio: n ? done / n : 0 };
}

/** התאריך הרלוונטי הבא של המבחן — א׳, ב׳ או ג׳ לפי מה שעוד לא עבר. */
export function nextDate(e) {
  const today = todayISO();
  return [e.date, e.dateB, e.dateC].filter(Boolean).find((d) => d >= today) || e.date || '';
}

export function gradeBand(pct) {
  if (pct === null || pct === undefined) return null;
  if (pct >= 90) return 'great';
  if (pct >= 75) return 'ok';
  if (pct >= 56) return 'low';
  return 'fail';
}

export { computeFinalGrade };

/** ממוצע משוקלל לפי weight (ברירת מחדל 1). */
export function weightedAverage(list = S.exams) {
  const g = list.filter((e) => typeof e.gradePct === 'number');
  if (!g.length) return null;
  const w = sum(g, (e) => num(e.weight, 1) || 1);
  if (!w) return null;
  return Math.round((sum(g, (e) => e.gradePct * (num(e.weight, 1) || 1)) / w) * 10) / 10;
}

export function examStats(list = S.exams) {
  const active = list.filter((e) => !e.archived);
  const graded = active.filter((e) => typeof e.gradePct === 'number');
  const upcoming = active.filter((e) => !e.completed && nextDate(e) >= todayISO());
  const soon = upcoming.filter((e) => { const d = daysUntil(nextDate(e)); return d !== null && d <= 14; });
  const pcts = graded.map((e) => e.gradePct);
  return {
    total: active.length,
    graded: graded.length,
    upcoming: upcoming.length,
    soon: soon.length,
    avg: pcts.length ? Math.round((sum(pcts) / pcts.length) * 10) / 10 : null,
    weightedAvg: weightedAverage(active),
    best: pcts.length ? Math.max(...pcts) : null,
    worst: pcts.length ? Math.min(...pcts) : null,
    // הפרש בין ציון משוער לציון בפועל — מדד לכיול עצמי
    forecastBias: (() => {
      const both = active.filter((e) => typeof e.gradePct === 'number' && typeof e.gradeExpected === 'number');
      if (!both.length) return null;
      return Math.round((sum(both, (e) => e.gradePct - (e.gradeExpected / (e.gradeMax || 100)) * 100) / both.length) * 10) / 10;
    })(),
  };
}

// ---------- סינון ----------

export function filterExams(f = {}) {
  return S.exams.filter((e) => {
    if (!f.showArchived && e.archived) return false;
    if (f.subject && e.subject !== f.subject) return false;
    if (f.semester && e.semester !== f.semester) return false;
    if (f.class && e.class !== f.class) return false;
    if (f.status === 'upcoming' && (e.completed || nextDate(e) < todayISO())) return false;
    if (f.status === 'done' && !e.completed) return false;
    if (f.status === 'graded' && typeof e.gradePct !== 'number') return false;
    if (f.q && !matches([e.title, e.notes, subjectById(e.subject)?.name, ...(e.topics || []).map((t) => t.title)].join(' '), f.q)) return false;
    return true;
  });
}

export function sortExams(list, by = 'date') {
  const arr = [...list];
  if (by === 'grade') return arr.sort((a, b) => (b.gradePct ?? -1) - (a.gradePct ?? -1));
  if (by === 'subject') return arr.sort((a, b) => (subjectById(a.subject)?.name || '').localeCompare(subjectById(b.subject)?.name || '', 'he'));
  return arr.sort((a, b) => (nextDate(a) || '9999').localeCompare(nextDate(b) || '9999'));
}
