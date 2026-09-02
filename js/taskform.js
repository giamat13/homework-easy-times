// taskform.js — עורך המשימה. שדות מלאים, ולידציה, ותת-משימות/תגיות/קבצים.

import { h, openModal, toast, fieldRow, showFormError } from './ui.js';
import { S, terms, save } from './state.js';
import { createTask, updateTask, PRIORITIES, REPEATS } from './tasks.js';
import { uid, num } from './util.js';

const MAX_FILE = 400 * 1024; // מעל זה נשמר קישור בלבד — localStorage לא נועד לקבצים

/** openTaskForm(null|task, onSaved) */
export function openTaskForm(task, onSaved = () => {}) {
  const T = terms();
  // אובייקט בלי id הוא טיוטה עם ערכי ברירת מחדל (FAB, לוח שנה), לא משימה קיימת.
  const isNew = !task?.id;
  const d = task || {
    subject: S.subjects[0]?.id || '', title: '', description: '', startDate: '',
    dueDate: '', priority: 'normal', tags: [], assignees: [], customFields: {},
    files: [], subtasks: [], repeat: 'none', estimateMin: null,
    progressTarget: null, progressCurrent: 0, progressUnit: '',
  };

  let tags = [...(d.tags || [])];
  let assignees = [...(d.assignees || [])];
  let files = [...(d.files || [])];
  let subtasks = (d.subtasks || []).map((s) => ({ ...s }));

  const form = h('form', { class: 'form', novalidate: true });

  const titleField = fieldRow({ name: 'title', label: 'כותרת', value: d.title, required: true, maxlength: 200, placeholder: 'מה צריך לעשות?' });
  const subjectField = fieldRow({
    name: 'subject', label: T.subject, type: 'select', value: d.subject,
    options: [{ value: '', label: `— ללא ${T.subject} —` }, ...S.subjects.filter((s) => !s.archived).map((s) => ({ value: s.id, label: s.name }))],
  });
  const descField = fieldRow({ name: 'description', label: 'תיאור', type: 'textarea', value: d.description, maxlength: 2000 });

  const dates = h('div', { class: 'form-grid form-grid--2' },
    fieldRow({ name: 'startDate', label: 'תאריך התחלה', type: 'date', value: d.startDate, hint: 'המשימה תוסתר עד לתאריך הזה' }),
    fieldRow({ name: 'dueDate', label: 'תאריך הגשה', type: 'date', value: d.dueDate }),
  );
  const meta = h('div', { class: 'form-grid form-grid--2' },
    fieldRow({ name: 'priority', label: 'עדיפות', type: 'select', value: d.priority, options: PRIORITIES.map((p) => ({ value: p.id, label: `${p.icon} ${p.name}` })) }),
    fieldRow({ name: 'repeat', label: 'חזרתיות', type: 'select', value: d.repeat, options: REPEATS.map((r) => ({ value: r.id, label: r.name })) }),
  );
  const estimate = fieldRow({ name: 'estimateMin', label: 'הערכת זמן (דקות)', type: 'number', min: 0, step: 5, value: d.estimateMin ?? '' });

  const progressFields = h('div', { class: 'form-grid form-grid--2' },
    fieldRow({ name: 'progressTarget', label: 'יעד התקדמות (רשות)', type: 'number', min: 0, step: 1, value: d.progressTarget ?? '', hint: 'למשל 100 לאחוזים, 10 לעמודים, 60 לדקות' }),
    fieldRow({ name: 'progressCurrent', label: 'התקדמות נוכחית', type: 'number', min: 0, step: 1, value: d.progressCurrent ?? 0 }),
  );
  const progressUnitField = h('div', {},
    fieldRow({ name: 'progressUnit', label: 'יחידה', value: d.progressUnit ?? '', list: 'progress-units', placeholder: "% / עמ' / דק'" }),
    h('datalist', { id: 'progress-units' }, ...['%', "עמ'", "דק'", 'שאלות', 'תרגילים'].map((u) => h('option', { value: u }))),
  );

  form.append(titleField, subjectField, descField, dates, meta, estimate);
  form.append(section('התקדמות', h('div', { class: 'stack' }, progressFields, progressUnitField)));
  form.append(section('תגיות', tagsEditor()));
  if (subtasksEnabled()) form.append(section('תת-משימות', subtasksEditor()));
  if (S.members.length) form.append(section('אחראים', assigneesEditor()));
  if (S.customFields.length) form.append(section('שדות מותאמים', customFieldsEditor()));
  form.append(section('קבצים וקישורים', filesEditor()));

  const modal = openModal({
    title: isNew ? `${T.task} חדשה` : `עריכת ${T.task}`,
    size: 'lg',
    body: form,
    actions: [
      { label: 'ביטול', onClick: (c) => c() },
      { label: 'שמירה', variant: 'primary', onClick: () => form.requestSubmit() },
    ],
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(form).entries());
    const title = String(fd.title || '').trim();
    if (!title) { showFormError(form, 'חובה למלא כותרת.'); form.querySelector('[name=title]').focus(); return; }
    if (fd.startDate && fd.dueDate && fd.startDate > fd.dueDate) {
      showFormError(form, 'תאריך ההתחלה מאוחר מתאריך ההגשה.'); return;
    }
    const progressTarget = fd.progressTarget === '' ? null : num(fd.progressTarget, null);
    if (progressTarget !== null && progressTarget <= 0) {
      showFormError(form, 'יעד ההתקדמות חייב להיות גדול מ-0.'); return;
    }
    for (const f of S.customFields) {
      if (f.required && !String(fd[`cf_${f.id}`] || '').trim()) {
        showFormError(form, `השדה "${f.name}" הוא חובה.`); return;
      }
    }
    const customFields = {};
    for (const f of S.customFields) {
      const v = fd[`cf_${f.id}`];
      if (v !== undefined && v !== '') customFields[f.id] = f.type === 'number' ? num(v, null) : String(v);
    }
    const payload = {
      title, subject: fd.subject || '', description: String(fd.description || '').trim(),
      startDate: fd.startDate || '', dueDate: fd.dueDate || '',
      priority: fd.priority, repeat: fd.repeat, estimateMin: num(fd.estimateMin, null),
      progressTarget, progressCurrent: num(fd.progressCurrent, 0), progressUnit: String(fd.progressUnit || '').trim(),
      tags, assignees, files, subtasks, customFields,
    };
    if (isNew) createTask(payload); else updateTask(task.id, payload);
    modal.close();
    toast(isNew ? 'המשימה נוספה' : 'המשימה עודכנה', { type: 'success' });
    onSaved();
  });

  setTimeout(() => form.querySelector('[name=title]')?.focus(), 60);

  // ---------- עורכי משנה ----------

  function section(label, node) {
    return h('fieldset', { class: 'field', style: { border: 'none', padding: 0, margin: 0 } },
      h('legend', { style: { fontSize: 'var(--fs-sm)', fontWeight: '550', color: 'var(--text-2)', padding: 0 }, text: label }),
      node);
  }

  function subtasksEnabled() { return true; }

  function tagsEditor() {
    const list = h('div', { class: 'chips' });
    const input = h('input', { type: 'text', placeholder: 'הוסף תגית ו-Enter', 'aria-label': 'תגית חדשה', list: 'known-tags' });
    const datalist = h('datalist', { id: 'known-tags' }, ...S.tags.map((g) => h('option', { value: g })));
    function draw() {
      list.replaceChildren(...tags.map((g) => h('span', { class: 'chip' }, `#${g}`,
        h('button', { class: 'chip__x', type: 'button', 'aria-label': `הסרת תגית ${g}`, on: { click: () => { tags = tags.filter((x) => x !== g); draw(); } } }, '×'))));
    }
    input.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ',') return;
      e.preventDefault();
      const v = input.value.trim().replace(/^#/, '');
      if (v && !tags.includes(v)) { tags.push(v); draw(); }
      input.value = '';
    });
    draw();
    return h('div', { class: 'stack' }, list, input, datalist);
  }

  function subtasksEditor() {
    const list = h('div', { class: 'stack' });
    const input = h('input', { type: 'text', placeholder: 'תת-משימה ו-Enter', 'aria-label': 'תת-משימה חדשה' });
    function draw() {
      list.replaceChildren(...subtasks.map((s) => h('div', { class: 'row' },
        h('input', { type: 'checkbox', checked: s.done, 'aria-label': `סימון ${s.title}`, on: { change: (e) => { s.done = e.target.checked; } } }),
        h('input', { type: 'text', value: s.title, class: 'grow', 'aria-label': 'שם תת-משימה', on: { input: (e) => { s.title = e.target.value; } } }),
        h('button', { class: 'icon-btn', type: 'button', 'aria-label': `מחיקת ${s.title}`, on: { click: () => { subtasks = subtasks.filter((x) => x !== s); draw(); } } }, '×'),
      )));
    }
    input.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const v = input.value.trim();
      if (v) { subtasks.push({ id: uid('s'), title: v, done: false }); draw(); }
      input.value = '';
    });
    draw();
    return h('div', { class: 'stack' }, list, input);
  }

  function assigneesEditor() {
    return h('div', { class: 'chips' }, ...S.members.map((m) => {
      const btn = h('button', {
        class: 'chip', type: 'button', 'aria-pressed': String(assignees.includes(m.id)),
        on: { click: () => {
          assignees = assignees.includes(m.id) ? assignees.filter((x) => x !== m.id) : [...assignees, m.id];
          btn.setAttribute('aria-pressed', String(assignees.includes(m.id)));
        } },
      }, `👤 ${m.name}`);
      return btn;
    }));
  }

  function customFieldsEditor() {
    return h('div', { class: 'form-grid form-grid--2' }, ...S.customFields.map((f) => fieldRow({
      name: `cf_${f.id}`, label: f.name + (f.required ? ' *' : ''),
      type: f.type === 'select' ? 'select' : f.type,
      value: d.customFields?.[f.id] ?? '',
      options: f.type === 'select' ? ['', ...f.options] : undefined,
    })));
  }

  function filesEditor() {
    const list = h('div', { class: 'stack' });
    const picker = h('input', { type: 'file', multiple: true, 'aria-label': 'צירוף קבצים' });
    const linkInput = h('input', { type: 'url', placeholder: 'https://... והוסף קישור', 'aria-label': 'קישור' });

    function draw() {
      list.replaceChildren(...files.map((f) => h('div', { class: 'row' },
        f.url ? h('a', { href: f.url, target: '_blank', rel: 'noopener noreferrer', class: 'grow truncate', text: f.name })
          : h('span', { class: 'grow truncate', text: f.name }),
        h('span', { class: 'xsmall dim', text: f.size ? `${Math.round(f.size / 1024)}KB` : 'קישור' }),
        h('button', { class: 'icon-btn', type: 'button', 'aria-label': `הסרת ${f.name}`, on: { click: () => { files = files.filter((x) => x !== f); draw(); } } }, '×'),
      )));
    }

    picker.addEventListener('change', async () => {
      for (const file of [...picker.files]) {
        if (file.size > MAX_FILE) {
          toast(`"${file.name}" גדול מדי (מעל 400KB) — צרף קישור במקום.`, { type: 'warn', timeout: 7000 });
          continue;
        }
        files.push({ name: file.name, size: file.size, type: file.type, url: await readAsDataUrl(file) });
      }
      picker.value = '';
      draw();
    });
    linkInput.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const v = linkInput.value.trim();
      if (!/^https?:\/\//i.test(v)) { toast('קישור חייב להתחיל ב-http או https', { type: 'warn' }); return; }
      files.push({ name: v.replace(/^https?:\/\//, '').slice(0, 60), url: v, size: 0 });
      linkInput.value = ''; draw();
    });
    draw();
    return h('div', { class: 'stack' }, list, picker, linkInput,
      h('small', { class: 'field__hint', text: 'קבצים נשמרים בדפדפן. לקבצים גדולים עדיף קישור ל-Drive.' }));
  }
}

function readAsDataUrl(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = () => rej(new Error('קריאת הקובץ נכשלה'));
    r.readAsDataURL(file);
  });
}

/** מנהל השדות המותאמים — נפרד כי הוא שייך להגדרות ולא לטופס המשימה. */
export function openCustomFieldsManager(onSaved = () => {}) {
  const list = h('div', { class: 'stack' });
  let fields = S.customFields.map((f) => ({ ...f }));

  function draw() {
    list.replaceChildren(...fields.map((f) => h('div', { class: 'row', style: { alignItems: 'flex-end' } },
      fieldRow({ name: `n_${f.id}`, label: 'שם', value: f.name, on: { input: (e) => { f.name = e.target.value; } } }),
      fieldRow({
        name: `t_${f.id}`, label: 'סוג', type: 'select', value: f.type,
        options: [{ value: 'text', label: 'טקסט' }, { value: 'number', label: 'מספר' }, { value: 'date', label: 'תאריך' }, { value: 'select', label: 'רשימה' }],
        on: { change: (e) => { f.type = e.target.value; draw(); } },
      }),
      f.type === 'select' ? fieldRow({ name: `o_${f.id}`, label: 'אפשרויות (פסיקים)', value: f.options.join(','), on: { input: (e) => { f.options = e.target.value.split(',').map((s) => s.trim()).filter(Boolean); } } }) : null,
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': `מחיקת שדה ${f.name}`, on: { click: () => { fields = fields.filter((x) => x !== f); draw(); } } }, '🗑️'),
    )), h('button', {
      class: 'btn btn--sm', type: 'button',
      on: { click: () => { fields.push({ id: uid('cf'), name: '', type: 'text', options: [], required: false }); draw(); } },
    }, '+ שדה חדש'));
  }
  draw();

  openModal({
    title: 'שדות מותאמים אישית', size: 'lg', body: list,
    actions: [
      { label: 'ביטול', onClick: (c) => c() },
      { label: 'שמירה', variant: 'primary', onClick: (c) => {
        S.customFields = fields.filter((f) => f.name.trim());
        save('customFields'); c(); toast('השדות נשמרו', { type: 'success' }); onSaved();
      } },
    ],
  });
}
