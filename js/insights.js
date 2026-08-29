// insights.js — מנוע התובנות. כל תובנה מבוססת על נתון אמיתי ומנוסחת בעברית.
// כל כלל מחזיר null אם אין לו מספיק נתונים — עדיף שקט מתובנה מומצאת.

import { S, subjectById } from './state.js';
import { taskStats } from './tasks.js';
import { examStats, nextDate } from './exams.js';
import { getStats } from './gamification.js';
import { todayISO, daysUntil, groupBy, sum, fmtTime } from './util.js';

const DOW = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

/** מחזיר [{ icon, text, tone }] ממוין לפי חשיבות. */
export function insights() {
  const ctx = {
    tasks: S.tasks.filter((t) => !t.archived),
    exams: S.exams.filter((e) => !e.archived),
    ts: taskStats(),
    es: examStats(),
    gs: getStats(),
    today: todayISO(),
  };
  return RULES.map((r) => { try { return r(ctx); } catch { return null; } })
    .filter(Boolean)
    .sort((a, b) => (b.weight || 0) - (a.weight || 0))
    .slice(0, 8);
}

const say = (icon, text, tone = 'info', weight = 1) => ({ icon, text, tone, weight });

const RULES = [
  // --- דחיפות ---
  ({ ts }) => (ts.overdue >= 3
    ? say('⚠️', `יש ${ts.overdue} משימות באיחור. התחל מהוותיקה ביותר — היא זו שמושכת את כולן.`, 'bad', 10)
    : ts.overdue === 1 ? say('⏰', 'משימה אחת באיחור. חמש דקות עכשיו חוסכות ערב שלם.', 'warn', 8) : null),

  ({ ts }) => (ts.dueToday >= 4
    ? say('📌', `${ts.dueToday} משימות להיום. פזר אותן: שתיים עכשיו, השאר אחרי הפסקה.`, 'warn', 9) : null),

  // --- עומס מבחנים ---
  ({ exams, today }) => {
    const soon = exams.filter((e) => !e.completed && daysUntil(nextDate(e)) !== null && daysUntil(nextDate(e)) >= 0 && daysUntil(nextDate(e)) <= 7);
    if (soon.length < 2) return null;
    return say('📝', `${soon.length} מבחנים בשבוע הקרוב (${soon.map((e) => subjectById(e.subject)?.name || e.title).slice(0, 3).join(', ')}). שווה לפרוס את הלמידה כבר היום.`, 'warn', 9.5);
  },

  ({ exams }) => {
    const unprepared = exams.filter((e) => {
      const d = daysUntil(nextDate(e));
      if (e.completed || d === null || d < 0 || d > 5 || !e.topics?.length) return false;
      return e.topics.filter((t) => t.done).length / e.topics.length < 0.5;
    });
    if (!unprepared.length) return null;
    const e = unprepared[0];
    const left = e.topics.filter((t) => !t.done).length;
    return say('📖', `למבחן "${e.title}" נותרו ${left} נושאים ועוד ${daysUntil(nextDate(e))} ימים. זה כ-${Math.ceil(left / Math.max(1, daysUntil(nextDate(e))))} נושאים ליום.`, 'warn', 9.2);
  },

  // --- מקצוע חלש ---
  ({ tasks }) => {
    const bySub = [...groupBy(tasks.filter((t) => t.subject), (t) => t.subject)]
      .map(([id, list]) => ({ id, list, rate: list.filter((t) => t.completed).length / list.length }))
      .filter((x) => x.list.length >= 4);
    if (bySub.length < 2) return null;
    const worst = bySub.sort((a, b) => a.rate - b.rate)[0];
    if (worst.rate > 0.55) return null;
    return say('🎯', `ב"${subjectById(worst.id)?.name}" הושלמו רק ${Math.round(worst.rate * 100)}% מהמשימות — הכי נמוך אצלך.`, 'warn', 7);
  },

  ({ tasks }) => {
    const bySub = [...groupBy(tasks.filter((t) => t.subject), (t) => t.subject)]
      .map(([id, list]) => ({ id, rate: list.filter((t) => t.completed).length / list.length, n: list.length }))
      .filter((x) => x.n >= 4);
    const best = bySub.sort((a, b) => b.rate - a.rate)[0];
    if (!best || best.rate < 0.9) return null;
    return say('🌟', `"${subjectById(best.id)?.name}" בשליטה מלאה — ${Math.round(best.rate * 100)}% הושלמו.`, 'good', 5);
  },

  // --- ציונים ---
  ({ es }) => (es.avg !== null && es.graded >= 3
    ? say(es.avg >= 85 ? '🥇' : es.avg >= 70 ? '📊' : '📉',
      `ממוצע הציונים שלך ${es.avg}${es.weightedAvg !== null && es.weightedAvg !== es.avg ? ` (משוקלל: ${es.weightedAvg})` : ''} מתוך ${es.graded} מבחנים.`,
      es.avg >= 85 ? 'good' : es.avg >= 70 ? 'info' : 'warn', 6) : null),

  ({ es }) => {
    if (es.forecastBias === null || es.graded < 3) return null;
    if (Math.abs(es.forecastBias) < 5) return say('🎯', 'הערכות הציון שלך מדויקות להפליא — סימן שאתה מכיר את עצמך.', 'good', 4);
    return es.forecastBias > 0
      ? say('📈', `אתה מזלזל בעצמך: בממוצע אתה מקבל ${Math.abs(es.forecastBias)} נק׳ יותר מהצפי שלך.`, 'good', 5)
      : say('📉', `הצפי שלך אופטימי ב-${Math.abs(es.forecastBias)} נק׳ בממוצע. שווה להוסיף שעת חזרה לפני מבחן.`, 'warn', 5.5);
  },

  ({ exams }) => {
    const g = exams.filter((e) => typeof e.gradePct === 'number' && e.date).sort((a, b) => a.date.localeCompare(b.date));
    if (g.length < 4) return null;
    const half = Math.floor(g.length / 2);
    const early = sum(g.slice(0, half), (e) => e.gradePct) / half;
    const late = sum(g.slice(half), (e) => e.gradePct) / (g.length - half);
    const diff = Math.round((late - early) * 10) / 10;
    if (Math.abs(diff) < 3) return null;
    return diff > 0
      ? say('📈', `מגמת שיפור ברורה: ${diff}+ נקודות בין המחצית הראשונה של המבחנים לאחרונה.`, 'good', 7)
      : say('📉', `הציונים ירדו ב-${Math.abs(diff)} נקודות לאחרונה. שווה לבדוק מה השתנה בשגרה.`, 'bad', 7.5);
  },

  // --- הרגלים ---
  ({ tasks }) => {
    const done = tasks.filter((t) => t.completed && t.completedAt);
    if (done.length < 8) return null;
    const byDow = groupBy(done, (t) => new Date(t.completedAt).getDay());
    const best = [...byDow].sort((a, b) => b[1].length - a[1].length)[0];
    return say('📅', `יום ${DOW[best[0]]} הוא היום הפרודוקטיבי שלך — ${best[1].length} משימות הושלמו בו.`, 'info', 3);
  },

  ({ tasks }) => {
    const done = tasks.filter((t) => t.completed && t.completedAt && t.dueDate);
    if (done.length < 6) return null;
    const early = done.filter((t) => t.completedAt < t.dueDate).length;
    const pct = Math.round((early / done.length) * 100);
    if (pct >= 60) return say('⏰', `${pct}% מהמשימות הוגשו לפני המועד. זה הרגל של תלמידים חזקים.`, 'good', 5);
    if (pct <= 20) return say('🔥', `רק ${pct}% מהמשימות הוגשו מוקדם — רוב העבודה נעשית ברגע האחרון.`, 'warn', 6);
    return null;
  },

  ({ gs }) => (gs.streak >= 5
    ? say('🔥', `רצף של ${gs.streak} ימים${gs.streak === gs.longestStreak ? ' — השיא האישי שלך!' : ` (השיא: ${gs.longestStreak})`}.`, 'good', 4) : null),

  ({ gs }) => (gs.totalStudyTime >= 60
    ? say('⏱️', `נצברו ${fmtTime(gs.totalStudyTime)} של לימוד ממוקד בטיימר.`, 'info', 2) : null),

  ({ ts }) => (ts.total >= 10 && ts.rate >= 80
    ? say('✅', `${ts.rate}% מהמשימות שלך הושלמו. זה שיעור גבוה מאוד.`, 'good', 4)
    : ts.total >= 10 && ts.rate < 40
      ? say('📋', `רק ${ts.rate}% מהמשימות הושלמו. אולי כדאי לפרק משימות גדולות לתת-משימות.`, 'warn', 6) : null),

  ({ tasks }) => {
    const noDate = tasks.filter((t) => !t.completed && !t.dueDate).length;
    return noDate >= 5 ? say('📄', `${noDate} משימות בלי תאריך הגשה. משימה בלי תאריך נוטה להישכח.`, 'warn', 4.5) : null;
  },

  ({ ts, gs }) => (ts.total === 0
    ? say('👋', 'ברוך הבא! הוסף מקצוע ומשימה ראשונה — התובנות יופיעו כשיהיו נתונים.', 'info', 20)
    : gs.perfectDayToday ? say('🎯', 'סיימת היום את כל מה שתכננת. יום מושלם.', 'good', 12) : null),
];
