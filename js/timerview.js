// timerview.js — טבעת הטיימר. רכיב תצוגה בלבד; כל הלוגיקה ב-timer.js.

import { h, mount, openModal, toast, fieldRow } from './ui.js';
import { S, save } from './state.js';
import * as T from './timer.js';
import { filterTasks } from './tasks.js';

const R = 46, C = 2 * Math.PI * R;

export function timerPanel() {
  const box = h('div', { class: 'timer' });
  let off = null;

  function draw(st, evt) {
    const ratio = st.total ? st.left / st.total : 0;
    const mm = String(Math.floor(st.left / 60)).padStart(2, '0');
    const ss = String(st.left % 60).padStart(2, '0');
    const ph = T.PHASES[st.phase];
    const summary = T.todaySummary();

    const openTasks = filterTasks({ status: 'open' }).slice(0, 40);

    mount(box,
      h('div', { class: 'timer__ring', data: { phase: st.phase } },
        h('svg', { viewBox: '0 0 100 100', 'aria-hidden': 'true', html:
          `<circle class="timer__track" cx="50" cy="50" r="${R}"></circle>
           <circle class="timer__prog" cx="50" cy="50" r="${R}"
             stroke-dasharray="${C.toFixed(1)}"
             stroke-dashoffset="${(C * (1 - ratio)).toFixed(1)}"></circle>` }),
        h('div', { class: 'timer__face' },
          h('div', { class: 'timer__time ltr', role: 'timer', 'aria-live': 'off', text: `${mm}:${ss}` }),
          h('div', { class: 'timer__phase', text: `${ph.icon} ${ph.name}` }),
        ),
      ),
      h('div', { class: 'timer__dots', 'aria-label': `סבב ${st.round % st.config.rounds || st.config.rounds} מתוך ${st.config.rounds}` },
        ...Array.from({ length: st.config.rounds }, (_, i) =>
          h('i', { class: i < (st.round % st.config.rounds || (st.round && st.round % st.config.rounds === 0 ? st.config.rounds : 0)) ? 'is-on' : '' })),
      ),
      h('div', { class: 'row', style: { justifyContent: 'center' } },
        st.running
          ? h('button', { class: 'btn', type: 'button', on: { click: () => T.pause() } }, '⏸ השהיה')
          : h('button', { class: 'btn btn--primary', type: 'button', on: { click: () => (st.paused ? T.resume() : T.start(st.phase)) } }, '▶ התחלה'),
        h('button', { class: 'btn', type: 'button', on: { click: () => { T.stop(); toast('הטיימר נעצר — הזמן שנצבר נשמר.', { type: 'info' }); } } }, '⏹ עצירה'),
        h('button', { class: 'btn btn--ghost btn--sm', type: 'button', on: { click: () => T.start('short') } }, '☕ הפסקה'),
      ),
      openTasks.length ? h('div', { class: 'field' },
        h('label', { for: 'timer-task', text: 'על מה עובדים?' }),
        h('select', { id: 'timer-task', on: { change: (e) => T.setTask(e.target.value || null) } },
          h('option', { value: '' }, '— לימוד כללי —'),
          ...openTasks.map((t) => h('option', { value: t.id, selected: t.id === st.taskId }, t.title)),
        ),
      ) : null,
      h('div', { class: 'row', style: { justifyContent: 'center' } },
        h('span', { class: 'badge badge--info', text: `היום: ${summary.label} · ${summary.sessions} סשנים` }),
        h('button', { class: 'btn btn--sm btn--ghost', type: 'button', on: { click: openSettings } }, '⚙️ הגדרות'),
      ),
    );

    if (evt?.completed === 'focus') {
      toast(`כל הכבוד! ${st.config.focus} דקות מיקוד נרשמו.`, { type: 'success' });
      for (const a of evt.achievements || []) toast(`${a.icon} הישג חדש: ${a.name}`, { type: 'success' });
    }
  }

  off = T.onTimer(draw);
  // המנוי מתבטל ע"י מי שהרכיב אותו (openModal.onClose / dispose של המסך).
  return { node: box, dispose: () => off?.() };
}

function openSettings() {
  const p = S.settings.pomodoro;
  const form = h('form', { class: 'form' },
    h('div', { class: 'form-grid form-grid--2' },
      fieldRow({ name: 'focus', label: 'מיקוד (דקות)', type: 'number', min: 1, max: 120, value: p.focus }),
      fieldRow({ name: 'short', label: 'הפסקה קצרה', type: 'number', min: 1, max: 60, value: p.short }),
      fieldRow({ name: 'long', label: 'הפסקה ארוכה', type: 'number', min: 1, max: 90, value: p.long }),
      fieldRow({ name: 'rounds', label: 'סבבים עד הפסקה ארוכה', type: 'number', min: 1, max: 12, value: p.rounds }),
    ),
    fieldRow({ name: 'autoStart', label: 'התחלה אוטומטית של השלב הבא', type: 'checkbox', value: p.autoStart }),
  );
  openModal({
    title: 'הגדרות פומודורו', size: 'sm', body: form,
    actions: [
      { label: 'ביטול', onClick: (c) => c() },
      { label: 'שמירה', variant: 'primary', onClick: (c) => {
        const fd = Object.fromEntries(new FormData(form).entries());
        S.settings.pomodoro = {
          focus: clampInt(fd.focus, 1, 120, 25), short: clampInt(fd.short, 1, 60, 5),
          long: clampInt(fd.long, 1, 90, 15), rounds: clampInt(fd.rounds, 1, 12, 4),
          autoStart: fd.autoStart === 'on',
        };
        save('settings'); T.reset(); c(); toast('ההגדרות נשמרו', { type: 'success' });
      } },
    ],
  });
}
function clampInt(v, lo, hi, dflt) {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : dflt;
}

/** פותח את הטיימר במודל — נגיש מכל מסך. */
export function openTimer() {
  const panel = timerPanel();
  openModal({
    title: '⏱️ טיימר פומודורו', size: 'sm', body: panel.node,
    onClose: () => panel.dispose(),
    actions: [{ label: 'סגירה', onClick: (c) => c() }],
  });
}
