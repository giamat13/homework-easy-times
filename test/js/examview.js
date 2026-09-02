// examview.js — כרטיס מבחן: מועדים, נושאי לימוד עם בר התקדמות, וציונים.

import { h, mount, toast, confirmDialog, emptyState, progressBar } from './ui.js';
import { subjectById } from './state.js';
import { relativeDay, fmtDate, autoColor, readableOn, todayISO } from './util.js';
import {
  EXAM_TYPES, SEMESTERS, nextDate, topicProgress, gradeBand,
  toggleExamComplete, toggleTopic, addTopic, deleteExam,
} from './exams.js';
import { openExamForm } from './examform.js';

function subjVars(id) {
  const s = subjectById(id);
  const c = s?.color || (s ? autoColor(s.name) : '');
  return c ? { '--sub-color': c, '--sub-ink': readableOn(c) } : {};
}

export function examCard(e, { onChange = () => {} } = {}) {
  const nd = nextDate(e);
  const prog = topicProgress(e);
  const band = gradeBand(e.gradePct);
  const typeName = e.type === 'other' ? (e.typeOther || 'אחר') : (EXAM_TYPES.find((t) => t.id === e.type)?.name || '');

  const grade = h('div', { class: 'exam__grade', data: band ? { band } : {} },
    e.gradeFinal === null
      ? h('span', { class: 'small dim', text: e.gradeExpected !== null ? `צפי ${e.gradeExpected}` : 'ללא ציון' })
      : [h('b', { text: String(e.gradeFinal) }), h('small', { text: e.gradeMax !== 100 ? `מתוך ${e.gradeMax}` : 'ציון' })],
  );

  const topicsBox = h('div', { class: 'stack' });
  drawTopics();

  function drawTopics() {
    const p = topicProgress(e);
    const input = h('input', { type: 'text', placeholder: 'הוסף נושא ללימוד ו-Enter', 'aria-label': 'נושא חדש' });
    input.addEventListener('keydown', (ev) => {
      if (ev.key !== 'Enter') return;
      ev.preventDefault();
      if (input.value.trim()) { addTopic(e.id, input.value); input.value = ''; drawTopics(); onChange(); }
    });
    mount(topicsBox,
      h('div', { class: 'row row--between' },
        h('span', { class: 'small strong', text: `נושאים ללימוד ${p.total ? `${p.done}/${p.total}` : ''}` }),
        p.total ? h('span', { class: 'small muted num', text: `${Math.round(p.ratio * 100)}%` }) : null,
      ),
      p.total ? progressBar(p.ratio, { label: `התקדמות לימוד ב${e.title}` }) : null,
      h('div', { class: 'topics' }, ...e.topics.map((t) => h('label', { class: `topic ${t.done ? 'is-done' : ''}` },
        h('input', {
          type: 'checkbox', checked: t.done, 'aria-label': `נושא: ${t.title}`,
          on: { change: () => {
            const r = toggleTopic(e.id, t.id);
            drawTopics(); onChange();
            for (const a of r?.newAchievements || []) toast(`${a.icon} הישג חדש: ${a.name}`, { type: 'success' });
            if (r?.progress.total && r.progress.ratio === 1) toast('כל הנושאים סומנו — מוכן למבחן! 🛡️', { type: 'success' });
          } },
        }),
        h('span', { text: t.title }),
      ))),
      input,
    );
  }

  return h('article', { class: 'card exam', style: subjVars(e.subject), data: { id: e.id } },
    h('div', { class: 'exam__top' },
      h('div', { class: 'grow' },
        h('div', { class: 'row', style: { gap: '6px' } },
          subjectById(e.subject) && h('span', { class: 'subject-badge', text: subjectById(e.subject).name }),
          typeName && h('span', { class: 'badge', text: typeName }),
          e.semester && h('span', { class: 'badge', text: SEMESTERS.find((s) => s.id === e.semester)?.name || e.semester }),
          e.class && h('span', { class: 'badge', text: `שכבה ${e.class}` }),
          e.weight ? h('span', { class: 'badge badge--info', text: `${e.weight}% לתעודה` }) : null,
        ),
        h('h3', { text: e.title || 'מבחן', style: { marginBlock: '6px' } }),
        h('div', { class: 'task__meta' },
          // מבחן שהושלם או שכבר עבר מוצג בתאריך יבש — "באיחור" חסר משמעות עבורו
          nd && h('span', {
            class: 'due',
            data: { u: e.completed || nd < todayISO() ? 'none' : 'today' },
            text: e.completed || nd < todayISO() ? `📅 ${fmtDate(nd)}` : `📅 ${relativeDay(nd)} · ${fmtDate(nd)}`,
          }),
          e.dateB && h('span', { class: 'small dim', text: `מועד ב׳ ${fmtDate(e.dateB)}` }),
          e.dateC && h('span', { class: 'small dim', text: `מועד ג׳ ${fmtDate(e.dateC)}` }),
          e.link && h('a', { href: e.link, target: '_blank', rel: 'noopener noreferrer', class: 'small', text: '🔗 חומרי לימוד' }),
        ),
      ),
      grade,
    ),
    e.notes && h('p', { class: 'small muted', text: e.notes }),
    topicsBox,
    h('div', { class: 'row row--end' },
      h('button', {
        class: `btn btn--sm ${e.completed ? '' : 'btn--primary'}`, type: 'button',
        on: { click: () => {
          const r = toggleExamComplete(e.id);
          onChange();
          toast(r.completed ? 'המבחן סומן כהושלם' : 'הסימון בוטל', {
            type: r.completed ? 'success' : 'info',
            action: { label: 'ביטול', onClick: () => { r.undo(); onChange(); } },
          });
          for (const a of r.newAchievements || []) toast(`${a.icon} הישג חדש: ${a.name}`, { type: 'success' });
        } },
      }, e.completed ? '↩︎ ביטול השלמה' : '✓ סמן כהושלם'),
      h('button', { class: 'btn btn--sm', type: 'button', on: { click: () => openExamForm(e, onChange) } }, '✏️ עריכה'),
      h('button', {
        class: 'btn btn--sm', type: 'button', 'aria-label': `מחיקת ${e.title}`,
        on: { click: async () => {
          if (!(await confirmDialog(`למחוק את "${e.title}"?`, { title: 'מחיקת מבחן', okLabel: 'מחק', danger: true }))) return;
          const undo = deleteExam(e.id); onChange();
          toast('המבחן נמחק', { type: 'warn', action: { label: 'ביטול', onClick: () => { undo(); onChange(); } } });
        } },
      }, '🗑️'),
    ),
  );
}

export function renderExamList(container, list, { onChange = () => {} } = {}) {
  if (!list.length) {
    mount(container, emptyState('📝', 'אין מבחנים להצגה', 'הוסף מבחן כדי לעקוב אחרי מועדים, נושאי לימוד וציונים.',
      { label: 'מבחן חדש', onClick: () => openExamForm(null, onChange) }));
    return;
  }
  mount(container, h('div', { class: 'grid grid--cards' }, ...list.map((e) => examCard(e, { onChange }))));
}
