// examspage.js — מסך המבחנים: סינון, סיכומי ציונים ורשימה.

import { h, mount, $ } from './ui.js';
import { boot } from './boot.js';
import { S, terms } from './state.js';
import { filterExams, sortExams, examStats, SEMESTERS, GRADES } from './exams.js';
import { renderExamList } from './examview.js';
import { openExamForm } from './examform.js';
import { exportExamsCSV } from './exportimport.js';
import { debounce } from './util.js';

const filter = { q: '', subject: '', semester: '', class: '', status: '' };
let sortBy = 'date';

boot({ onChange: () => render() }).then(() => {
  if (!terms().hasExams) {
    mount($('#view'), h('div', { class: 'empty' },
      h('div', { class: 'empty__icon', text: '💼' }),
      h('h3', { text: 'מבחנים אינם רלוונטיים במצב השימוש הנוכחי' }),
      h('p', { text: 'עבור למצב "תלמיד" בהגדרות כדי לנהל מבחנים וציונים.' }),
      h('a', { class: 'btn btn--primary', href: 'settings.html' }, 'למסך ההגדרות'),
    ));
    $('#filters').remove();
    return;
  }
  $('#new-exam').addEventListener('click', () => openExamForm(null, render));
  $('#export-exams').addEventListener('click', () => exportExamsCSV(filterExams(filter)));
  render();
});

function render() { renderStrip(); renderFilters(); renderBody(); }

function renderStrip() {
  const st = examStats();
  $('#avg-label').textContent = st.avg === null ? 'אין עדיין ציונים' : `ממוצע ${st.avg}`;
  mount($('#strip'), h('div', { class: 'grid grid--kpi' },
    kpi(st.upcoming, 'מבחנים קרובים', st.soon ? `${st.soon} בשבועיים` : null, st.soon ? 'down' : null),
    kpi(st.avg ?? '—', 'ממוצע ציונים', st.weightedAvg !== null && st.weightedAvg !== st.avg ? `משוקלל ${st.weightedAvg}` : null),
    kpi(st.best ?? '—', 'הציון הגבוה', st.worst !== null ? `הנמוך: ${st.worst}` : null),
    kpi(st.graded, 'מבחנים עם ציון', `מתוך ${st.total}`),
  ));
}

function kpi(val, label, delta, dir) {
  return h('div', { class: 'card kpi' },
    h('span', { class: 'kpi__val', text: String(val) }),
    h('span', { class: 'kpi__label', text: label }),
    delta ? h('span', { class: 'kpi__delta', data: dir ? { dir } : {}, text: delta }) : null);
}

function renderFilters() {
  mount($('#filters'),
    h('div', { class: 'filters__row' },
      h('div', { class: 'search-box grow' },
        h('span', { class: 'search-box__icon', 'aria-hidden': 'true', text: '🔍' }),
        h('input', {
          type: 'search', value: filter.q, placeholder: 'חיפוש מבחן או נושא לימוד…',
          'aria-label': 'חיפוש מבחנים',
          on: { input: debounce((e) => { filter.q = e.target.value; renderBody(); }, 180) },
        }),
      ),
    ),
    h('div', { class: 'filters__row' },
      sel('מקצוע', filter.subject, [{ value: '', label: 'כל המקצועות' }, ...S.subjects.filter((s) => !s.archived).map((s) => ({ value: s.id, label: s.name }))], (v) => { filter.subject = v; renderBody(); }),
      sel('מחצית', filter.semester, [{ value: '', label: 'כל המחציות' }, ...SEMESTERS.map((s) => ({ value: s.id, label: s.name }))], (v) => { filter.semester = v; renderBody(); }),
      sel('שכבה', filter.class, [{ value: '', label: 'כל השכבות' }, ...GRADES.map((g) => ({ value: g, label: g }))], (v) => { filter.class = v; renderBody(); }),
      sel('סטטוס', filter.status, [
        { value: '', label: 'הכל' }, { value: 'upcoming', label: 'קרובים' },
        { value: 'done', label: 'הושלמו' }, { value: 'graded', label: 'עם ציון' },
      ], (v) => { filter.status = v; renderBody(); }),
      sel('מיון', sortBy, [
        { value: 'date', label: 'לפי מועד' }, { value: 'grade', label: 'לפי ציון' }, { value: 'subject', label: 'לפי מקצוע' },
      ], (v) => { sortBy = v; renderBody(); }),
    ),
  );
}

function sel(label, value, options, onChange) {
  return h('select', { 'aria-label': label, on: { change: (e) => onChange(e.target.value) } },
    ...options.map((o) => h('option', { value: o.value, selected: String(o.value) === String(value) }, o.label)));
}

function renderBody() {
  renderExamList($('#view'), sortExams(filterExams(filter), sortBy), { onChange: () => { renderStrip(); renderBody(); } });
}
