// subjects.js — ניהול מקצועות, תגיות וחברי קבוצה. צבע המקצוע הוא מקור האמת לכל הצבעים.

import { h, openModal, toast, confirmDialog, fieldRow } from './ui.js';
import { S, save, terms, normSubject, normMember } from './state.js';
import { uid, autoColor, readableOn, cmpText } from './util.js';

export const PALETTE = [
  '#e5484d', '#e5794d', '#e5a94d', '#d6c033', '#8fbf3f', '#3fb96b',
  '#2fb0a0', '#3a9fd6', '#4d6fe5', '#7c5ce5', '#b44de5', '#e54da3',
  '#8d6e63', '#5c6b7a',
];

function recentColors() {
  return Array.isArray(S.settings.recentColors) ? S.settings.recentColors.slice(0, 8) : [];
}
// חייב לעבור דרך save('settings') ולא store.set ישירות: כתיבה גולמית מפעילה
// מחדש טעינה גורפת (state.js) שדרסה תחומים/מקצועות חדשים שעדיין לא נשמרו.
function pushRecentColor(c) {
  S.settings.recentColors = [c, ...(S.settings.recentColors || []).filter((x) => x !== c)].slice(0, 8);
  save('settings');
}

/** בורר צבע: פלטה + צבעים אחרונים + בורר חופשי. */
export function colorPicker(value, onPick) {
  let current = value || PALETTE[0];
  const swatches = h('div', { class: 'chips' });
  const custom = h('input', { type: 'color', value: current, 'aria-label': 'צבע מותאם' });

  function draw() {
    const recents = recentColors().filter((c) => !PALETTE.includes(c));
    swatches.replaceChildren(...[...recents, ...PALETTE].map((c) => h('button', {
      type: 'button', class: 'chip', 'aria-label': `צבע ${c}`, 'aria-pressed': String(c === current),
      style: { background: c, color: readableOn(c), borderColor: c, minWidth: '34px', height: '30px' },
      on: { click: () => { current = c; custom.value = c; onPick(c); draw(); } },
    }, c === current ? '✓' : '')));
  }
  custom.addEventListener('input', () => { current = custom.value; onPick(current); draw(); });
  draw();
  return h('div', { class: 'stack' }, swatches, h('div', { class: 'row' }, h('span', { class: 'small muted', text: 'צבע חופשי:' }), custom));
}

// ---------- מנהל המקצועות ----------

export function openSubjectsManager(onSaved = () => {}) {
  const T = terms();
  let items = S.subjects.map((s) => ({ ...s }));
  const list = h('div', { class: 'stack' });

  function draw() {
    list.replaceChildren(
      ...items.map((s) => {
        const color = s.color || autoColor(s.name);
        const row = h('div', { class: 'card', style: { padding: 'var(--space-3)' } },
          h('div', { class: 'row' },
            h('span', { class: 'subject-dot', style: { '--sub-color': color } }),
            h('input', {
              type: 'text', class: 'grow', value: s.name, maxlength: 60,
              'aria-label': `שם ${T.subject}`, placeholder: `שם ${T.subject}`,
              on: { input: (e) => { s.name = e.target.value; } },
            }),
            h('button', {
              class: 'icon-btn', type: 'button', 'aria-label': s.archived ? 'שחזור' : 'ארכוב',
              title: s.archived ? 'שחזור' : 'ארכוב',
              on: { click: () => { s.archived = !s.archived; draw(); } },
            }, s.archived ? '📤' : '📥'),
            h('button', {
              class: 'icon-btn', type: 'button', 'aria-label': `מחיקת ${s.name}`,
              on: { click: () => removeSubject(s) },
            }, '🗑️'),
          ),
          h('details', { style: { marginBlockStart: 'var(--space-2)' } },
            h('summary', { class: 'small muted', text: 'צבע ופרטים' }),
            h('div', { class: 'stack', style: { marginBlockStart: 'var(--space-2)' } },
              colorPicker(color, (c) => { s.color = c; draw(); }),
              h('div', { class: 'form-grid form-grid--2' },
                fieldRow({ name: `teacher_${s.id}`, label: 'מורה', value: s.teacher || '', on: { input: (e) => { s.teacher = e.target.value; } } }),
                fieldRow({ name: `hours_${s.id}`, label: 'שעות שבועיות', type: 'number', min: 0, value: s.weeklyHours ?? '', on: { input: (e) => { s.weeklyHours = e.target.value ? Number(e.target.value) : null; } } }),
              ),
            ),
          ),
        );
        if (s.archived) row.style.opacity = '.6';
        return row;
      }),
      h('button', {
        class: 'btn btn--block', type: 'button',
        on: { click: () => { items.push(normSubject({ id: uid('sub'), name: '', color: PALETTE[items.length % PALETTE.length] })); draw(); } },
      }, `+ ${T.subject} חדש`),
    );
  }

  async function removeSubject(s) {
    const used = S.tasks.filter((t) => t.subject === s.id).length + S.exams.filter((e) => e.subject === s.id).length;
    const msg = used
      ? `ל־"${s.name}" משויכים ${used} פריטים. הם יישארו אך ללא ${T.subject}. למחוק?`
      : `למחוק את "${s.name}"?`;
    if (!(await confirmDialog(msg, { title: `מחיקת ${T.subject}`, okLabel: 'מחק', danger: true }))) return;
    items = items.filter((x) => x !== s);
    draw();
  }

  draw();
  openModal({
    title: `ניהול ${T.subjects}`, size: 'lg', body: list,
    actions: [
      { label: 'ביטול', onClick: (c) => c() },
      { label: 'שמירה', variant: 'primary', onClick: (c) => {
        const kept = items.filter((s) => s.name.trim()).map(normSubject);
        const removedIds = S.subjects.filter((o) => !kept.some((k) => k.id === o.id)).map((o) => o.id);
        S.subjects = kept.sort((a, b) => cmpText(a.name, b.name));
        for (const c2 of kept) if (c2.color) pushRecentColor(c2.color);
        if (removedIds.length) {
          for (const t of S.tasks) if (removedIds.includes(t.subject)) t.subject = '';
          for (const e of S.exams) if (removedIds.includes(e.subject)) e.subject = '';
          save('tasks'); save('exams');
        }
        save('subjects'); c(); toast(`${T.subjects} נשמרו`, { type: 'success' }); onSaved();
      } },
    ],
  });
}

// ---------- מנהל התגיות ----------

export function openTagsManager(onSaved = () => {}) {
  let tags = [...S.tags];
  const list = h('div', { class: 'chips' });
  const input = h('input', { type: 'text', placeholder: 'תגית חדשה ו-Enter', 'aria-label': 'תגית חדשה' });

  function count(g) { return S.tasks.filter((t) => t.tags.includes(g)).length; }
  function draw() {
    list.replaceChildren(...tags.map((g) => h('span', { class: 'chip' }, `#${g}`,
      h('span', { class: 'xsmall dim', text: `(${count(g)})` }),
      h('button', {
        class: 'chip__x', type: 'button', 'aria-label': `מחיקת תגית ${g}`,
        on: { click: () => { tags = tags.filter((x) => x !== g); draw(); } },
      }, '×'))));
  }
  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const v = input.value.trim().replace(/^#/, '');
    if (v && !tags.includes(v)) { tags.push(v); draw(); }
    input.value = '';
  });
  draw();

  openModal({
    title: 'ניהול תגיות',
    body: h('div', { class: 'stack' }, list, input, h('small', { class: 'field__hint', text: 'מחיקת תגית מסירה אותה גם מהמשימות.' })),
    actions: [
      { label: 'ביטול', onClick: (c) => c() },
      { label: 'שמירה', variant: 'primary', onClick: (c) => {
        const removed = S.tags.filter((g) => !tags.includes(g));
        S.tags = tags;
        if (removed.length) {
          for (const t of S.tasks) t.tags = t.tags.filter((g) => !removed.includes(g));
          save('tasks');
        }
        save('tags'); c(); toast('התגיות נשמרו', { type: 'success' }); onSaved();
      } },
    ],
  });
}

// ---------- מנהל חברי הקבוצה ----------

export function openMembersManager(onSaved = () => {}) {
  let items = S.members.map((m) => ({ ...m }));
  const list = h('div', { class: 'stack' });

  function draw() {
    list.replaceChildren(
      ...items.map((m) => h('div', { class: 'row' },
        h('span', { class: 'avatar', text: (m.name || '?').slice(0, 2) }),
        h('input', { type: 'text', class: 'grow', value: m.name, placeholder: 'שם', 'aria-label': 'שם חבר קבוצה', on: { input: (e) => { m.name = e.target.value; } } }),
        h('input', { type: 'email', value: m.email || '', placeholder: 'אימייל (רשות)', 'aria-label': 'אימייל', on: { input: (e) => { m.email = e.target.value; } } }),
        h('button', { class: 'icon-btn', type: 'button', 'aria-label': `מחיקת ${m.name}`, on: { click: () => { items = items.filter((x) => x !== m); draw(); } } }, '🗑️'),
      )),
      h('button', { class: 'btn btn--block', type: 'button', on: { click: () => { items.push(normMember({ name: '' })); draw(); } } }, '+ חבר קבוצה'),
    );
  }
  draw();

  openModal({
    title: 'חברי הקבוצה', size: 'lg', body: list,
    actions: [
      { label: 'ביטול', onClick: (c) => c() },
      { label: 'שמירה', variant: 'primary', onClick: (c) => {
        const kept = items.filter((m) => m.name.trim()).map(normMember);
        const removed = S.members.filter((o) => !kept.some((k) => k.id === o.id)).map((o) => o.id);
        S.members = kept;
        if (removed.length) {
          for (const t of S.tasks) t.assignees = t.assignees.filter((a) => !removed.includes(a));
          save('tasks');
        }
        save('members'); c(); toast('חברי הקבוצה נשמרו', { type: 'success' }); onSaved();
      } },
    ],
  });
}
