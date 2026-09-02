// statspage.js — KPI, גרפים ותובנות. הגרפים מקבלים את צבעי המקצועות מהמודל.

import { h, mount, $ } from './ui.js';
import { boot } from './boot.js';
import { S, subjectById, terms } from './state.js';
import { taskStats } from './tasks.js';
import { examStats, nextDate } from './exams.js';
import { getStats, levelInfo } from './gamification.js';
import { barChart, lineChart, donutChart, heatmap } from './charts.js';
import { insights } from './insights.js';
import { todayISO, addDays, fmtDate, daysUntil, autoColor, groupBy, fmtTime } from './util.js';

let rangeDays = 30;

boot({ onChange: () => render() }).then(() => {
  $('#range').addEventListener('change', (e) => { rangeDays = Number(e.target.value); render(); });
  $('#print-report').addEventListener('click', () => window.print());
  render();
});

function inRange(iso) {
  if (!rangeDays) return true;
  return !!iso && iso >= addDays(todayISO(), -rangeDays);
}

function render() {
  const T = terms();
  const ts = taskStats();
  const es = examStats();
  const gs = getStats();
  const li = levelInfo();
  $('#range-label').textContent = rangeDays ? `${rangeDays} הימים האחרונים` : 'כל הזמן';

  const tasks = S.tasks.filter((t) => !t.archived);
  const doneInRange = tasks.filter((t) => t.completed && inRange(t.completedAt));

  mount($('#view'),
    h('section', { class: 'grid grid--kpi' },
      kpi(ts.total, `סה״כ ${T.tasks}`),
      kpi(`${ts.rate}%`, 'שיעור השלמה', `${ts.done} הושלמו`),
      kpi(ts.overdue, 'באיחור', ts.overdue ? 'דורש טיפול' : 'הכל בזמן', ts.overdue ? 'down' : 'up'),
      kpi(`רמה ${li.level}`, `${gs.totalXP} XP`, `🔥 ${gs.streak} ימים`),
      T.hasExams ? kpi(es.avg ?? '—', 'ממוצע ציונים', es.graded ? `${es.graded} מבחנים` : null) : null,
      kpi(fmtTime(gs.totalStudyTime || 0), 'זמן לימוד מצטבר', `${gs.pomodoroSessions || 0} סשנים`),
    ),

    section('💡 תובנות', h('div', { class: 'stack' },
      ...insights().map((i) => h('div', { class: 'insight', data: { tone: i.tone } },
        h('span', { class: 'insight__icon', 'aria-hidden': 'true', text: i.icon }),
        h('span', { class: 'insight__text', text: i.text }))))),

    h('div', { class: 'grid grid--2' },
      section('📊 השלמה לפי מצב', donutChart([
        { label: 'הושלמו', value: ts.done, color: 'var(--ok)' },
        { label: 'פתוחות', value: ts.open - ts.overdue, color: 'var(--brand)' },
        { label: 'באיחור', value: ts.overdue, color: 'var(--danger)' },
      ], { centerValue: `${ts.rate}%`, centerLabel: 'הושלמו' })),

      section(`🎨 לפי ${T.subject}`, bySubjectChart(tasks)),
    ),

    section('📈 מגמה יומית', dailyTrend(doneInRange)),
    section('🗓️ מפת פעילות', heatmap(activityCounts(tasks), { weeks: 18 })),

    h('div', { class: 'grid grid--2' },
      section('⏰ פרודוקטיביות לפי יום בשבוע', byWeekday(doneInRange)),
      T.hasExams ? section('🎯 התפלגות ציונים', gradeDistribution()) : section('🏷️ לפי תגית', byTag(tasks)),
    ),

    T.hasExams ? section('📝 עומס מבחנים קרוב', examLoad()) : null,
  );
}

function section(title, node) {
  return h('section', { class: 'card', style: { marginBlockStart: 'var(--space-4)' } },
    h('div', { class: 'card__head' }, h('h2', { class: 'card__title', text: title })), node);
}

function kpi(val, label, delta, dir) {
  return h('div', { class: 'card kpi' },
    h('span', { class: 'kpi__val', text: String(val) }),
    h('span', { class: 'kpi__label', text: label }),
    delta ? h('span', { class: 'kpi__delta', data: dir ? { dir } : {}, text: delta }) : null);
}

function subColor(id) {
  const s = subjectById(id);
  return s ? (s.color || autoColor(s.name)) : 'var(--text-3)';
}

function bySubjectChart(tasks) {
  const data = [...groupBy(tasks.filter((t) => t.subject), (t) => t.subject)]
    .map(([id, list]) => ({
      label: subjectById(id)?.name || '—',
      value: list.filter((t) => t.completed).length,
      total: list.length,
      color: subColor(id),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);
  if (!data.length) return h('p', { class: 'muted small center', text: 'שייך משימות למקצועות כדי לראות פילוח.' });
  return h('div', {},
    barChart(data, { title: null }),
    h('div', { class: 'chart-legend' }, ...data.map((d) => h('span', {},
      h('i', { style: { background: d.color } }),
      h('span', { text: `${d.label}: ${d.value}/${d.total}` })))),
  );
}

function dailyTrend(done) {
  const days = Math.min(rangeDays || 60, 60) || 60;
  const counts = new Map();
  for (const t of done) counts.set(t.completedAt, (counts.get(t.completedAt) || 0) + 1);
  const data = [];
  for (let i = days - 1; i >= 0; i--) {
    const iso = addDays(todayISO(), -i);
    data.push({ label: fmtDate(iso).slice(0, 5), value: counts.get(iso) || 0 });
  }
  return lineChart(data, { title: null });
}

function activityCounts(tasks) {
  const c = {};
  for (const t of tasks) if (t.completed && t.completedAt) c[t.completedAt] = (c[t.completedAt] || 0) + 1;
  return c;
}

function byWeekday(done) {
  const names = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  const counts = new Array(7).fill(0);
  for (const t of done) counts[new Date(t.completedAt).getDay()]++;
  return barChart(names.map((n, i) => ({ label: n, value: counts[i] })), { title: null });
}

function gradeDistribution() {
  const bands = [
    { label: '95–100', min: 95, color: 'var(--ok)' },
    { label: '85–94', min: 85, color: '#3fb96b' },
    { label: '75–84', min: 75, color: 'var(--info)' },
    { label: '56–74', min: 56, color: 'var(--warn)' },
    { label: 'מתחת ל-56', min: 0, color: 'var(--danger)' },
  ];
  const pcts = S.exams.filter((e) => !e.archived && typeof e.gradePct === 'number').map((e) => e.gradePct);
  if (!pcts.length) return h('p', { class: 'muted small center', text: 'הזן ציונים כדי לראות התפלגות.' });
  const data = bands.map((b, i) => ({
    label: b.label, color: b.color,
    value: pcts.filter((p) => p >= b.min && (i === 0 || p < bands[i - 1].min)).length,
  }));
  return barChart(data, { title: null });
}

function byTag(tasks) {
  const data = S.tags.map((g) => ({
    label: `#${g}`,
    value: tasks.filter((t) => t.tags.includes(g)).length,
    color: 'var(--brand)',
  })).filter((d) => d.value).sort((a, b) => b.value - a.value).slice(0, 8);
  if (!data.length) return h('p', { class: 'muted small center', text: 'הוסף תגיות למשימות כדי לראות פילוח.' });
  return barChart(data, { title: null });
}

function examLoad() {
  const weeks = 6;
  const buckets = Array.from({ length: weeks }, (_, i) => ({
    label: i === 0 ? 'השבוע' : `+${i} שב׳`,
    value: 0, color: 'var(--brand)', exams: [],
  }));
  for (const e of S.exams) {
    if (e.archived || e.completed) continue;
    const d = daysUntil(nextDate(e));
    if (d === null || d < 0) continue;
    const w = Math.floor(d / 7);
    if (w < weeks) { buckets[w].value++; buckets[w].exams.push(e); }
  }
  const peak = Math.max(...buckets.map((b) => b.value));
  for (const b of buckets) if (b.value === peak && peak >= 3) b.color = 'var(--danger)';
  if (!peak) return h('p', { class: 'muted small center', text: 'אין מבחנים קרובים. נשימה עמוקה.' });
  return h('div', {},
    barChart(buckets, { title: null }),
    peak >= 3 ? h('p', { class: 'small', style: { color: 'var(--danger)' }, text: `שבוע עמוס עם ${peak} מבחנים — כדאי להתחיל ללמוד מוקדם.` }) : null,
    h('ul', { class: 'small muted' }, ...buckets.flatMap((b) => b.exams.slice(0, 3).map((e) =>
      h('li', { text: `${e.title} — ${fmtDate(nextDate(e))}` })))),
  );
}
