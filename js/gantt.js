// gantt.js — תצוגת גאנט חודשית. כל משימה היא שורה עם פס מתאריך התחלה עד תאריך הגשה.

import { h, mount, openModal } from './ui.js';
import { S, subjectById } from './state.js';
import { toISO, fromISO, fmtMonth, fmtDate, todayISO, autoColor, readableOn } from './util.js';
import { taskCard } from './taskview.js';

/**
 * renderGantt(container, list, { onChange })
 * list: משימות מסוננות/ממוינות (מ-filterTasks/sortTasks), כמו renderTaskList.
 */
export function renderGantt(container, list, { onChange = () => {} } = {}) {
  let cur = new Date();
  cur.setDate(1);

  function draw() {
    const first = new Date(cur.getFullYear(), cur.getMonth(), 1);
    const daysInMonth = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate();
    const monthStart = toISO(first);
    const monthEnd = toISO(new Date(cur.getFullYear(), cur.getMonth(), daysInMonth));
    const today = todayISO();

    const rows = list
      .map((t) => {
        const end = t.dueDate || '';
        const start = t.startDate || t.createdAt?.slice(0, 10) || end;
        if (!end && !start) return null;
        return { t, start: start || end, end: end || start };
      })
      .filter((r) => r && r.end >= monthStart && r.start <= monthEnd);

    const days = [];
    for (let i = 1; i <= daysInMonth; i++) days.push(i);

    mount(container, h('div', { class: 'gantt' },
      h('div', { class: 'cal__head' },
        h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'חודש קודם', on: { click: () => shift(-1) } }, '›'),
        h('div', { class: 'row' },
          h('h2', { class: 'cal__title', text: fmtMonth(cur) }),
          h('button', { class: 'btn btn--sm', type: 'button', on: { click: () => { cur = new Date(); cur.setDate(1); draw(); } } }, 'היום'),
        ),
        h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'חודש הבא', on: { click: () => shift(1) } }, '‹'),
      ),
      !rows.length
        ? h('p', { class: 'muted', style: { padding: 'var(--space-3)' }, text: 'אין משימות עם תאריכים בחודש הזה.' })
        : h('div', { class: 'gantt__scroll' },
          h('div', { class: 'gantt__grid', style: { '--gantt-days': daysInMonth } },
            h('div', { class: 'gantt__row gantt__row--head' },
              h('div', { class: 'gantt__label' }),
              h('div', { class: 'gantt__track' },
                ...days.map((d) => h('div', {
                  class: `gantt__day ${toISO(new Date(cur.getFullYear(), cur.getMonth(), d)) === today ? 'is-today' : ''}`,
                  text: String(d),
                })),
              ),
            ),
            ...rows.map((r) => row(r, first, daysInMonth)),
          ),
        ),
    ));
  }

  function row({ t, start, end }, first, daysInMonth) {
    const clampStart = Math.max(1, dayIndex(start, first));
    const clampEnd = Math.min(daysInMonth, dayIndex(end, first));
    const span = Math.max(1, clampEnd - clampStart + 1);
    const color = t.subject ? (subjectById(t.subject)?.color || autoColor(subjectById(t.subject)?.name || '')) : '';

    return h('div', { class: 'gantt__row' },
      h('div', { class: 'gantt__label', title: t.title, text: t.title }),
      h('div', { class: 'gantt__track' },
        h('button', {
          class: `gantt__bar ${t.completed ? 'is-done' : ''}`,
          type: 'button',
          style: {
            '--start': clampStart, '--span': span,
            '--sub-color': color || 'var(--brand)', '--sub-ink': readableOn(color || 'var(--brand)'),
          },
          title: `${t.title} · ${fmtDate(start)} – ${fmtDate(end)}`,
          on: { click: () => openDetails(t) },
        }, t.title),
      ),
    );
  }

  function dayIndex(iso, first) {
    const d = fromISO(iso);
    if (!d) return 1;
    return Math.round((d - first) / 86400000) + 1;
  }

  function shift(n) { cur = new Date(cur.getFullYear(), cur.getMonth() + n, 1); draw(); }

  function openDetails(t) {
    openModal({
      title: t.title,
      body: taskCard(t, { onChange: () => { onChange(); draw(); } }),
      actions: [{ label: 'סגירה', variant: 'primary', onClick: (c) => c() }],
    });
  }

  draw();
  return { setMonth: (m) => { cur = new Date(m.getFullYear(), m.getMonth(), 1); draw(); }, redraw: draw, get month() { return cur; } };
}
