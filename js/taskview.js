// taskview.js — רינדור כרטיסי משימות ורשימות. כל טקסט משתמש עובר דרך textContent/esc.

import { h, mount, emptyState, confirmDialog, toast } from './ui.js';
import { S, subjectById, memberById, terms } from './state.js';
import { PRIORITIES, groupForDisplay, toggleComplete, toggleSubtask, setProgress, deleteTask, duplicateTask, archiveTask } from './tasks.js';
import { relativeDay, fmtDate, urgency, autoColor, readableOn, isScheduledAhead } from './util.js';
import { openTaskForm } from './taskform.js';

/** צבעי מקצוע כמשתני CSS — הצבע צובע badge, כרטיס וגרפים מאותו מקור. */
export function subjectVars(subjectId) {
  const s = subjectById(subjectId);
  const color = s?.color || (s ? autoColor(s.name) : '');
  return color ? { '--sub-color': color, '--sub-ink': readableOn(color) } : {};
}

export function subjectBadge(subjectId) {
  const s = subjectById(subjectId);
  if (!s) return null;
  return h('span', { class: 'subject-badge', style: subjectVars(subjectId), text: s.name });
}

function prioOf(id) { return PRIORITIES.find((p) => p.id === id) || PRIORITIES[2]; }

/** כרטיס משימה בודד. onChange נקרא אחרי כל שינוי שדורש רינדור מחדש. */
export function taskCard(t, { onChange = () => {} } = {}) {
  const u = urgency(t.dueDate);
  const p = prioOf(t.priority);
  const doneSubs = (t.subtasks || []).filter((s) => s.done).length;

  const check = h('button', {
    class: 'task__check', type: 'button',
    'aria-pressed': String(t.completed),
    'aria-label': `${t.completed ? 'ביטול השלמה של' : 'סימון כהושלם'}: ${t.title}`,
    on: { click: () => handleToggle(t, onChange) },
  }, '✓');

  const meta = h('div', { class: 'task__meta' },
    subjectBadge(t.subject),
    t.dueDate && h('span', { class: 'due', data: { u }, text: `${t.completed ? '' : '⏳ '}${relativeDay(t.dueDate)}` }),
    isScheduledAhead(t) && h('span', { class: 'badge badge--info', text: `מתחילה ${fmtDate(t.startDate)}` }),
    p.id !== 'normal' && h('span', { class: 'prio', data: { p: p.id } }, `${p.icon} ${p.name}`),
    t.subtasks?.length ? h('span', { text: `☑ ${doneSubs}/${t.subtasks.length}` }) : null,
    t.files?.length ? h('span', { text: `📎 ${t.files.length}` }) : null,
    t.repeat !== 'none' ? h('span', { title: 'משימה חוזרת', text: '🔁' }) : null,
    ...t.tags.map((g) => h('span', { class: 'badge', text: `#${g}` })),
    ...t.assignees.map((id) => {
      const m = memberById(id);
      return m ? h('span', { class: 'badge badge--info', text: `👤 ${m.name}` }) : null;
    }),
    ...Object.entries(t.customFields || {}).filter(([, v]) => v !== '' && v !== null && v !== undefined)
      .map(([k, v]) => {
        const f = S.customFields.find((x) => x.id === k || x.name === k);
        return h('span', { class: 'badge', text: `${f?.name || k}: ${v}` });
      }),
  );

  const progress = t.progressTarget ? h('div', { class: 'task__progress' },
    h('input', {
      type: 'range', min: 0, max: t.progressTarget, value: t.progressCurrent, step: 1,
      'aria-label': `התקדמות: ${t.title}`,
      on: { change: (e) => handleProgress(t, Number(e.target.value), onChange) },
    }),
    h('span', { class: 'task__progress-label num', text: `${t.progressCurrent}/${t.progressTarget}${t.progressUnit ? ' ' + t.progressUnit : ''}` }),
  ) : null;

  const subs = t.subtasks?.length ? h('div', { class: 'subtasks' },
    ...t.subtasks.map((s) => h('label', { class: `subtask ${s.done ? 'is-done' : ''}` },
      h('input', {
        type: 'checkbox', checked: s.done,
        'aria-label': `תת-משימה: ${s.title}`,
        on: { change: () => { toggleSubtask(t.id, s.id); onChange(); } },
      }),
      h('span', { text: s.title }),
    )),
  ) : null;

  return h('article', {
    class: `task ${t.completed ? 'is-done' : ''} ${u === 'overdue' && !t.completed ? 'is-overdue' : ''}`,
    style: subjectVars(t.subject), data: { id: t.id },
  },
    check,
    h('div', { class: 'task__main' },
      h('button', {
        class: 'task__title', type: 'button', style: { textAlign: 'start', font: 'inherit' },
        on: { click: () => openTaskForm(t, onChange) },
      }, t.title || '(ללא כותרת)'),
      t.description && h('p', { class: 'task__desc', text: t.description }),
      progress,
      subs,
      meta,
    ),
    h('div', { class: 'task__side' },
      h('button', {
        class: 'icon-btn', type: 'button', 'aria-label': `עריכת ${t.title}`, title: 'עריכה',
        on: { click: () => openTaskForm(t, onChange) },
      }, '✏️'),
      taskMenu(t, onChange),
    ),
  );
}

function taskMenu(t, onChange) {
  const wrap = h('div', { class: 'menu' });
  const btn = h('button', {
    class: 'icon-btn', type: 'button', 'aria-label': `פעולות נוספות עבור ${t.title}`,
    'aria-expanded': 'false', 'aria-haspopup': 'true',
    on: { click: (e) => { e.stopPropagation(); toggle(); } },
  }, '⋯');
  let pop = null;

  function toggle() {
    if (pop) { close(); return; }
    pop = h('div', { class: 'menu__pop', role: 'menu' },
      item('📄 שכפול', () => { duplicateTask(t.id); toast('המשימה שוכפלה', { type: 'success' }); onChange(); }),
      item(t.archived ? '📤 הוצאה מארכיון' : '📥 העברה לארכיון', () => {
        archiveTask(t.id, !t.archived);
        toast(t.archived ? 'הוצא מהארכיון' : 'הועבר לארכיון', { type: 'success' });
        onChange();
      }),
      h('div', { class: 'menu__sep' }),
      item('🗑️ מחיקה', async () => {
        close();
        if (!(await confirmDialog(`למחוק את "${t.title}"?`, { title: 'מחיקת משימה', okLabel: 'מחק', danger: true }))) return;
        const undo = deleteTask(t.id);
        onChange();
        toast('המשימה נמחקה', { type: 'warn', action: { label: 'ביטול', onClick: () => { undo(); onChange(); } } });
      }, 'menu__item--danger'),
    );
    wrap.append(pop);
    btn.setAttribute('aria-expanded', 'true');
    setTimeout(() => document.addEventListener('click', close, { once: true }), 0);
  }
  function close() { pop?.remove(); pop = null; btn.setAttribute('aria-expanded', 'false'); }
  function item(label, onClick, cls = '') {
    return h('button', { class: `menu__item ${cls}`, type: 'button', role: 'menuitem', on: { click: (e) => { e.stopPropagation(); close(); onClick(); } } }, label);
  }
  wrap.append(btn);
  return wrap;
}

async function handleToggle(t, onChange) {
  const r = toggleComplete(t.id);
  if (!r) return;
  onChange();
  if (r.completed) {
    const bits = [`+${r.xp} XP`];
    if (r.spawned) bits.push('נוצר המופע הבא');
    toast(`${t.title} — ${bits.join(' · ')}`, {
      type: 'success',
      action: { label: 'ביטול', onClick: () => { r.undo(); onChange(); } },
    });
    for (const a of r.newAchievements || []) {
      toast(`${a.icon} הישג חדש: ${a.name}`, { type: 'success', timeout: 6000 });
    }
  } else {
    const lost = r.lostAchievements?.length ? ` (${r.lostAchievements.length} הישגים ננעלו)` : '';
    toast(`הסימון בוטל${lost}`, { type: 'info', action: { label: 'ביטול', onClick: () => { r.undo(); onChange(); } } });
  }
}

function handleProgress(t, value, onChange) {
  const r = setProgress(t.id, value);
  if (!r) return;
  onChange();
  if (r.xp === undefined) return; // עדכון חלקי — לא הגיע ליעד, בלי טוסט על כל גרירה
  const bits = [`+${r.xp} XP`];
  if (r.spawned) bits.push('נוצר המופע הבא');
  toast(`${t.title} — ${bits.join(' · ')}`, {
    type: 'success',
    action: { label: 'ביטול', onClick: () => { r.undo(); onChange(); } },
  });
  for (const a of r.newAchievements || []) {
    toast(`${a.icon} הישג חדש: ${a.name}`, { type: 'success', timeout: 6000 });
  }
}

/** רשימה מקובצת. groups=false לרשימה שטוחה. */
export function renderTaskList(container, list, { onChange = () => {}, grouped = true, onEmpty } = {}) {
  if (!list.length) {
    const t = terms();
    mount(container, onEmpty || emptyState('🗒️', `אין ${t.tasks} להצגה`,
      'נסה לשנות את הסינון, או הוסף משימה חדשה.',
      { label: 'משימה חדשה', onClick: () => openTaskForm(null, onChange) }));
    return;
  }
  const frag = document.createDocumentFragment();
  if (!grouped) {
    frag.append(h('div', { class: 'task-list' }, ...list.map((t) => taskCard(t, { onChange }))));
  } else {
    for (const [key, g] of groupForDisplay(list)) {
      frag.append(h('h2', { class: 'task-group__label', data: { g: key } },
        `${g.icon} ${g.label}`,
        h('span', { class: 'task-group__count', text: `(${g.items.length})` }),
      ));
      frag.append(h('div', { class: 'task-list' }, ...g.items.map((t) => taskCard(t, { onChange }))));
    }
  }
  mount(container, frag);
}
