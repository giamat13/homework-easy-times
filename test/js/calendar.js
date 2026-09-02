// calendar.js — לוח שנה חודשי בעברית. מציג משימות ומבחנים, ופתיחת יום מציגה את הכל.

import { h, mount, openModal } from './ui.js';
import { S, subjectById } from './state.js';
import { toISO, fmtMonth, fmtDateLong, todayISO, autoColor, readableOn } from './util.js';
import { taskCard } from './taskview.js';
import { openTaskForm } from './taskform.js';
import { examCard } from './examview.js';

const DOW = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
const MAX_PILLS = 3;

/**
 * renderCalendar(container, { month: Date, onChange })
 * מחזיר { setMonth, month }
 */
export function renderCalendar(container, { month = new Date(), onChange = () => {} } = {}) {
  let cur = new Date(month.getFullYear(), month.getMonth(), 1);

  function draw() {
    const today = todayISO();
    const first = new Date(cur.getFullYear(), cur.getMonth(), 1);
    const start = new Date(first);
    start.setDate(1 - first.getDay()); // ראשון של השבוע הראשון

    const cells = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const iso = toISO(d);
      const outside = d.getMonth() !== cur.getMonth();
      const items = itemsOn(iso);

      cells.push(h('button', {
        class: `cal__cell ${outside ? 'is-out' : ''} ${iso === today ? 'is-today' : ''}`,
        type: 'button',
        'aria-label': `${fmtDateLong(iso)} — ${items.length} פריטים`,
        on: { click: () => openDay(iso, items) },
      },
        h('span', { class: 'cal__num', text: String(d.getDate()) }),
        ...items.slice(0, MAX_PILLS).map(pill),
        items.length > MAX_PILLS ? h('span', { class: 'cal__more', text: `+${items.length - MAX_PILLS} נוספים` }) : null,
      ));
    }

    mount(container, h('div', { class: 'cal' },
      h('div', { class: 'cal__head' },
        h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'חודש קודם', on: { click: () => shift(-1) } }, '›'),
        h('div', { class: 'row' },
          h('h2', { class: 'cal__title', text: fmtMonth(cur) }),
          h('button', { class: 'btn btn--sm', type: 'button', on: { click: () => { cur = new Date(); cur.setDate(1); draw(); } } }, 'היום'),
        ),
        h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'חודש הבא', on: { click: () => shift(1) } }, '‹'),
      ),
      h('div', { class: 'cal__dow', 'aria-hidden': 'true' }, ...DOW.map((d) => h('div', { text: d }))),
      h('div', { class: 'cal__grid', role: 'grid', 'aria-label': `לוח שנה ${fmtMonth(cur)}` }, ...cells),
    ));
  }

  function shift(n) { cur = new Date(cur.getFullYear(), cur.getMonth() + n, 1); draw(); }

  function pill(it) {
    const color = it.subject ? (subjectById(it.subject)?.color || autoColor(subjectById(it.subject)?.name || '')) : '';
    return h('span', {
      class: `cal__pill ${it.kind === 'exam' ? 'cal__pill--exam' : ''}`,
      style: color ? { '--sub-color': color, '--sub-ink': readableOn(color) } : {},
      title: it.title,
      text: `${it.kind === 'exam' ? '📝 ' : ''}${it.title}`,
    });
  }

  function openDay(iso, items) {
    const body = h('div', { class: 'stack' });
    if (!items.length) {
      body.append(h('p', { class: 'muted', text: 'אין פריטים ביום הזה.' }));
    } else {
      for (const it of items) {
        body.append(it.kind === 'exam'
          ? examCard(it.raw, { onChange: () => { onChange(); draw(); } })
          : taskCard(it.raw, { onChange: () => { onChange(); draw(); } }));
      }
    }
    openModal({
      title: fmtDateLong(iso), body,
      actions: [
        { label: 'משימה ליום הזה', onClick: (c) => { c(); openTaskForm({ dueDate: iso, subject: S.subjects[0]?.id || '', title: '', description: '', startDate: '', priority: 'normal', tags: [], assignees: [], customFields: {}, files: [], subtasks: [], repeat: 'none' }, () => { onChange(); draw(); }); } },
        { label: 'סגירה', variant: 'primary', onClick: (c) => c() },
      ],
    });
  }

  draw();
  return { setMonth: (m) => { cur = new Date(m.getFullYear(), m.getMonth(), 1); draw(); }, redraw: draw, get month() { return cur; } };
}

/** כל הפריטים בתאריך נתון — משימות (מועד הגשה) ומבחנים (כל המועדים). */
export function itemsOn(iso) {
  const out = [];
  for (const t of S.tasks) {
    if (t.archived || t.dueDate !== iso) continue;
    out.push({ kind: 'task', title: t.title, subject: t.subject, done: t.completed, raw: t });
  }
  for (const e of S.exams) {
    if (e.archived) continue;
    const which = e.date === iso ? '' : e.dateB === iso ? ' (מועד ב׳)' : e.dateC === iso ? ' (מועד ג׳)' : null;
    if (which === null) continue;
    out.push({ kind: 'exam', title: (e.title || 'מבחן') + which, subject: e.subject, done: e.completed, raw: e });
  }
  return out.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'exam' ? -1 : 1));
}
