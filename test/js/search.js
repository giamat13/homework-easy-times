// search.js — לוח פקודות: חיפוש חוצה־ישויות + פעולות מהירות במקום אחד.

import { h, openModal, mount } from './ui.js';
import { S, subjectById, terms } from './state.js';
import { norm, fmtDate, relativeDay } from './util.js';
import { openTaskForm } from './taskform.js';
import { openExamForm } from './examform.js';
import { nextDate } from './exams.js';

const PAGES = [
  { label: 'משימות', href: 'index.html', icon: '🏠' },
  { label: 'מבחנים וציונים', href: 'exams.html', icon: '📝' },
  { label: 'סטטיסטיקה', href: 'stats.html', icon: '📊' },
  { label: 'הישגים', href: 'achievements.html', icon: '🏆' },
  { label: 'הגדרות', href: 'settings.html', icon: '⚙️' },
];

/**
 * בונה את רשימת התוצאות. actions מגיע מהמסך כדי שהפקודות יהיו רלוונטיות להקשר.
 */
export function buildResults(q, { onChange = () => {}, actions = [] } = {}) {
  const T = terms();
  const nq = norm(q);
  const out = [];

  const add = (kind, icon, label, hint, run, score = 0) => out.push({ kind, icon, label, hint, run, score });

  // פעולות
  const baseActions = [
    { icon: '➕', label: `${T.task} חדשה`, run: () => openTaskForm(null, onChange) },
    ...(T.hasExams ? [{ icon: '📝', label: 'מבחן חדש', run: () => openExamForm(null, onChange) }] : []),
    ...actions,
  ];
  for (const a of baseActions) {
    if (!nq || norm(a.label).includes(nq)) add('פעולה', a.icon, a.label, a.hint, a.run, 100);
  }

  // ניווט
  for (const p of PAGES) {
    if (!nq || norm(p.label).includes(nq)) add('מסך', p.icon, p.label, null, () => { location.href = p.href; }, 90);
  }

  if (nq) {
    for (const t of S.tasks) {
      if (t.archived) continue;
      const hay = [t.title, t.description, subjectById(t.subject)?.name, ...t.tags].join(' ');
      if (!norm(hay).includes(nq)) continue;
      add(T.task, t.completed ? '✅' : '🗒️', t.title,
        [subjectById(t.subject)?.name, t.dueDate && relativeDay(t.dueDate)].filter(Boolean).join(' · '),
        () => openTaskForm(t, onChange),
        norm(t.title).startsWith(nq) ? 80 : 50);
    }
    for (const e of S.exams) {
      if (e.archived) continue;
      const hay = [e.title, e.notes, subjectById(e.subject)?.name, ...(e.topics || []).map((x) => x.title)].join(' ');
      if (!norm(hay).includes(nq)) continue;
      add('מבחן', '📝', e.title,
        [subjectById(e.subject)?.name, nextDate(e) && fmtDate(nextDate(e))].filter(Boolean).join(' · '),
        () => openExamForm(e, onChange),
        norm(e.title).startsWith(nq) ? 78 : 48);
    }
    for (const s of S.subjects) {
      if (!norm(s.name).includes(nq)) continue;
      add(T.subject, '🎨', s.name, `${S.tasks.filter((t) => t.subject === s.id).length} ${T.tasks}`,
        () => { location.href = `index.html?subject=${encodeURIComponent(s.id)}`; }, 60);
    }
    for (const g of S.tags) {
      if (!norm(g).includes(nq)) continue;
      add('תגית', '🏷️', `#${g}`, `${S.tasks.filter((t) => t.tags.includes(g)).length} משימות`,
        () => { location.href = `index.html?tag=${encodeURIComponent(g)}`; }, 55);
    }
    for (const m of S.members) {
      if (!norm(m.name).includes(nq)) continue;
      add('אחראי', '👤', m.name, `${S.tasks.filter((t) => t.assignees.includes(m.id)).length} משימות`,
        () => { location.href = `index.html?assignee=${encodeURIComponent(m.id)}`; }, 55);
    }
  }

  return out.sort((a, b) => b.score - a.score).slice(0, 40);
}

/** פותח את לוח הפקודות. */
export function openPalette({ onChange = () => {}, actions = [], initial = '' } = {}) {
  let items = [];
  let idx = 0;

  const input = h('input', {
    type: 'search', class: 'palette__input', value: initial,
    placeholder: 'חפש משימה, מבחן, מקצוע — או הקלד פעולה…',
    'aria-label': 'חיפוש ופקודות', 'aria-controls': 'palette-list', autocomplete: 'off',
  });
  const list = h('div', { class: 'palette__list', id: 'palette-list', role: 'listbox' });

  function draw() {
    items = buildResults(input.value, { onChange, actions });
    idx = Math.min(idx, Math.max(0, items.length - 1));
    if (!items.length) {
      mount(list, h('p', { class: 'muted center', style: { padding: 'var(--space-4)' }, text: 'אין תוצאות.' }));
      return;
    }
    mount(list, ...items.map((it, i) => h('button', {
      class: 'palette__item', type: 'button', role: 'option',
      'aria-selected': String(i === idx),
      on: { click: () => pick(i), mousemove: () => { if (idx !== i) { idx = i; sync(); } } },
    },
      h('span', { 'aria-hidden': 'true', text: it.icon }),
      h('span', { class: 'grow truncate' }, h('span', { text: it.label }),
        it.hint ? h('span', { class: 'xsmall dim', text: ` — ${it.hint}` }) : null),
      h('span', { class: 'palette__kind', text: it.kind }),
    )));
  }
  function sync() {
    [...list.children].forEach((el, i) => el.setAttribute?.('aria-selected', String(i === idx)));
    list.children[idx]?.scrollIntoView?.({ block: 'nearest' });
  }
  function pick(i) { const it = items[i]; if (!it) return; modal.close(); setTimeout(() => it.run(), 0); }

  input.addEventListener('input', draw);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); idx = (idx + 1) % Math.max(1, items.length); sync(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); idx = (idx - 1 + items.length) % Math.max(1, items.length); sync(); }
    else if (e.key === 'Enter') { e.preventDefault(); pick(idx); }
  });

  const body = h('div', { class: 'palette' }, input, list);
  const modal = openModal({ title: 'חיפוש ופקודות', body, size: 'md' });
  draw();
  setTimeout(() => input.focus(), 50);
  return modal;
}
