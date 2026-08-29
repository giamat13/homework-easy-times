// examform.js — עורך המבחן: מועדים, מחצית, משקל, נושאים, וציונים על שלושת רבדיהם.

import { h, openModal, toast, fieldRow, showFormError } from './ui.js';
import { S } from './state.js';
import { createExam, updateExam, EXAM_TYPES, SEMESTERS, GRADES, CORRECTION_MODES } from './exams.js';
import { computeFinalGrade } from './state.js';
import { uid, num } from './util.js';

export function openExamForm(exam, onSaved = () => {}) {
  const isNew = !exam?.id; // אובייקט בלי id = טיוטה עם ברירות מחדל
  const d = exam || {
    subject: S.subjects[0]?.id || '', title: '', date: '', class: '', type: 'test', typeOther: '',
    term: 'a', semester: '1', dateB: '', dateC: '', gradeExpected: null, grade: null,
    gradeBonus: null, gradeCorrection: null, correctionMode: 'higher', gradeMax: 100,
    weight: null, link: '', notes: '', topics: [],
  };
  let topics = (d.topics || []).map((t) => ({ ...t }));

  const form = h('form', { class: 'form', novalidate: true });

  form.append(
    fieldRow({ name: 'title', label: 'שם המבחן', value: d.title, required: true, maxlength: 120, placeholder: 'למשל: מבחן באלגברה — פרק 3' }),
    h('div', { class: 'form-grid form-grid--2' },
      fieldRow({ name: 'subject', label: 'מקצוע', type: 'select', value: d.subject, options: [{ value: '', label: '— ללא מקצוע —' }, ...S.subjects.filter((s) => !s.archived).map((s) => ({ value: s.id, label: s.name }))] }),
      fieldRow({ name: 'class', label: 'שכבה', type: 'select', value: d.class, options: [{ value: '', label: '— לא צוין —' }, ...GRADES.map((g) => ({ value: g, label: g }))] }),
    ),
    h('div', { class: 'form-grid form-grid--2' },
      fieldRow({ name: 'type', label: 'סוג', type: 'select', value: d.type, options: EXAM_TYPES.map((t) => ({ value: t.id, label: t.name })) }),
      fieldRow({ name: 'typeOther', label: 'סוג אחר', value: d.typeOther, placeholder: 'רלוונטי רק אם בחרת "אחר"' }),
    ),
    h('div', { class: 'form-grid form-grid--2' },
      fieldRow({ name: 'semester', label: 'מחצית', type: 'select', value: d.semester, options: SEMESTERS.map((s) => ({ value: s.id, label: s.name })) }),
      fieldRow({ name: 'weight', label: 'משקל לתעודה (%)', type: 'number', min: 0, max: 100, value: d.weight ?? '' }),
    ),
    sectionTitle('מועדים'),
    h('div', { class: 'form-grid form-grid--2' },
      fieldRow({ name: 'date', label: 'מועד א׳', type: 'date', value: d.date, required: true }),
      fieldRow({ name: 'term', label: 'המועד שאני ניגש אליו', type: 'select', value: d.term, options: [{ value: 'a', label: 'מועד א׳' }, { value: 'b', label: 'מועד ב׳' }, { value: 'c', label: 'מועד ג׳' }] }),
      fieldRow({ name: 'dateB', label: 'מועד ב׳', type: 'date', value: d.dateB }),
      fieldRow({ name: 'dateC', label: 'מועד ג׳', type: 'date', value: d.dateC }),
    ),
    sectionTitle('ציונים'),
    h('div', { class: 'form-grid form-grid--2' },
      fieldRow({ name: 'gradeExpected', label: 'ציון משוער', type: 'number', min: 0, step: 0.5, value: d.gradeExpected ?? '', hint: 'מה אתה מעריך שתקבל' }),
      fieldRow({ name: 'grade', label: 'ציון בפועל', type: 'number', min: 0, step: 0.5, value: d.grade ?? '' }),
      fieldRow({ name: 'gradeBonus', label: 'בונוס', type: 'number', step: 0.5, value: d.gradeBonus ?? '' }),
      fieldRow({ name: 'gradeMax', label: 'ציון מרבי', type: 'number', min: 1, value: d.gradeMax ?? 100 }),
      fieldRow({ name: 'gradeCorrection', label: 'ציון תיקון (מועד נוסף)', type: 'number', min: 0, step: 0.5, value: d.gradeCorrection ?? '' }),
      fieldRow({ name: 'correctionMode', label: 'איך מחשבים תיקון', type: 'select', value: d.correctionMode, options: CORRECTION_MODES.map((c) => ({ value: c.id, label: c.name })) }),
    ),
    previewBox(),
    sectionTitle('נושאים ללימוד'),
    topicsEditor(),
    fieldRow({ name: 'link', label: 'קישור לחומרי לימוד', type: 'url', value: d.link, placeholder: 'https://' }),
    fieldRow({ name: 'notes', label: 'הערות', type: 'textarea', value: d.notes, maxlength: 1000 }),
  );

  const modal = openModal({
    title: isNew ? 'מבחן חדש' : 'עריכת מבחן', size: 'lg', body: form,
    actions: [
      { label: 'ביטול', onClick: (c) => c() },
      { label: 'שמירה', variant: 'primary', onClick: () => form.requestSubmit() },
    ],
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(form).entries());
    if (!String(fd.title).trim()) { showFormError(form, 'חובה למלא שם מבחן.'); return; }
    if (!fd.date) { showFormError(form, 'חובה למלא מועד א׳.'); return; }
    const gradeMax = num(fd.gradeMax, 100) || 100;
    for (const k of ['gradeExpected', 'grade', 'gradeCorrection']) {
      const v = num(fd[k], null);
      if (v !== null && (v < 0 || v > gradeMax * 1.5)) { showFormError(form, `ערך לא סביר בשדה הציונים (0–${gradeMax}).`); return; }
    }
    if (fd.dateB && fd.dateB < fd.date) { showFormError(form, 'מועד ב׳ מוקדם ממועד א׳.'); return; }

    const payload = {
      title: String(fd.title).trim(), subject: fd.subject || '', class: fd.class || '',
      type: fd.type, typeOther: fd.type === 'other' ? String(fd.typeOther || '').trim() : '',
      semester: fd.semester, term: fd.term, date: fd.date, dateB: fd.dateB || '', dateC: fd.dateC || '',
      gradeExpected: num(fd.gradeExpected, null), grade: num(fd.grade, null),
      gradeBonus: num(fd.gradeBonus, null), gradeCorrection: num(fd.gradeCorrection, null),
      correctionMode: fd.correctionMode, gradeMax, weight: num(fd.weight, null),
      link: String(fd.link || '').trim(), notes: String(fd.notes || '').trim(),
      topics: topics.filter((t) => t.title.trim()),
    };
    if (isNew) createExam(payload); else updateExam(exam.id, payload);
    modal.close();
    toast(isNew ? 'המבחן נוסף' : 'המבחן עודכן', { type: 'success' });
    onSaved();
  });

  // עדכון תצוגת הציון הסופי בזמן אמת
  form.addEventListener('input', updatePreview);
  setTimeout(() => { form.querySelector('[name=title]')?.focus(); updatePreview(); }, 60);

  function sectionTitle(t) { return h('h3', { class: 'small strong', style: { marginBlockStart: 'var(--space-3)', color: 'var(--text-2)' }, text: t }); }

  function previewBox() {
    return h('div', { class: 'card', id: 'grade-preview', style: { background: 'var(--surface-2)', padding: 'var(--space-3)' } });
  }

  function updatePreview() {
    const box = form.querySelector('#grade-preview');
    if (!box) return;
    const fd = Object.fromEntries(new FormData(form).entries());
    const e = {
      grade: num(fd.grade, null), gradeBonus: num(fd.gradeBonus, null),
      gradeCorrection: num(fd.gradeCorrection, null), correctionMode: fd.correctionMode,
    };
    const final = computeFinalGrade(e);
    const max = num(fd.gradeMax, 100) || 100;
    const expected = num(fd.gradeExpected, null);
    const pct = final === null ? null : Math.round((final / max) * 1000) / 10;
    box.replaceChildren(
      h('div', { class: 'row row--between' },
        h('span', { class: 'small muted', text: 'ציון סופי מחושב' }),
        h('b', { class: 'num', text: final === null ? '—' : `${final}${max !== 100 ? ` / ${max}` : ''}${pct !== null && max !== 100 ? ` (${pct}%)` : ''}` }),
      ),
      expected !== null && final !== null
        ? h('div', { class: 'row row--between' },
          h('span', { class: 'small muted', text: 'מול הצפי שלך' }),
          h('span', { class: 'small num', text: `${final > expected ? '▲ +' : final < expected ? '▼ ' : '= '}${Math.round((final - expected) * 10) / 10}` }),
        ) : null,
    );
  }

  function topicsEditor() {
    const box = h('div', { class: 'stack' });
    const input = h('input', { type: 'text', placeholder: 'נושא ללימוד ו-Enter (או הדבק רשימה מופרדת בשורות)', 'aria-label': 'נושא חדש' });
    function draw() {
      box.replaceChildren(
        ...topics.map((t) => h('div', { class: 'row' },
          h('input', { type: 'checkbox', checked: t.done, 'aria-label': `סימון ${t.title}`, on: { change: (ev) => { t.done = ev.target.checked; } } }),
          h('input', { type: 'text', class: 'grow', value: t.title, 'aria-label': 'שם נושא', on: { input: (ev) => { t.title = ev.target.value; } } }),
          h('button', { class: 'icon-btn', type: 'button', 'aria-label': `מחיקת ${t.title}`, on: { click: () => { topics = topics.filter((x) => x !== t); draw(); } } }, '×'),
        )),
        input,
      );
    }
    input.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      pushTopics(input.value); input.value = ''; draw(); input.focus();
    });
    input.addEventListener('paste', (e) => {
      const text = e.clipboardData?.getData('text') || '';
      if (!text.includes('\n')) return;
      e.preventDefault(); pushTopics(text); draw();
    });
    function pushTopics(text) {
      for (const line of String(text).split(/[\n,]/).map((s) => s.trim()).filter(Boolean)) {
        topics.push({ id: uid('tp'), title: line, done: false });
      }
    }
    draw();
    return box;
  }
}
