// shortcuts.js — קיצורי מקלדת ניתנים להתאמה ולכיבוי, עם מסך עזרה מובנה.

import * as store from './storage.js';
import { KEYS, defaultFor } from './keys.js';
import { h, openModal, toast, hasOpenModal, closeTopModal } from './ui.js';
import { withDefaults } from './util.js';

export const ACTION_LABELS = {
  newTask: 'משימה חדשה',
  newExam: 'מבחן חדש',
  search: 'חיפוש',
  palette: 'לוח פקודות',
  toggleView: 'מעבר רשימה/לוח שנה',
  timer: 'פתיחת הטיימר',
  help: 'עזרה — רשימת הקיצורים',
};

let cfg = defaultFor(KEYS.shortcuts);
let handlers = {};
let bound = null;

export function getShortcuts() { return structuredClone(cfg); }

export function saveShortcuts(next) {
  cfg = withDefaults(next, defaultFor(KEYS.shortcuts));
  store.set(KEYS.shortcuts, cfg);
  return cfg;
}

export function setEnabled(v) { saveShortcuts({ ...cfg, enabled: !!v }); }

/**
 * initShortcuts({ newTask(){}, ... }) — המסך מספק את הפעולות שהוא תומך בהן.
 * פעולה שלא סופקה פשוט לא תופעל.
 */
export function initShortcuts(actions = {}) {
  cfg = withDefaults(store.get(KEYS.shortcuts), defaultFor(KEYS.shortcuts));
  handlers = { help: openShortcutsHelp, ...actions };
  if (bound) removeEventListener('keydown', bound);
  bound = onKey;
  addEventListener('keydown', bound);
  return () => removeEventListener('keydown', bound);
}

function isTyping(e) {
  const el = e.target;
  return el instanceof HTMLElement
    && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));
}

function onKey(e) {
  // Esc תמיד עובד — גם כשהקיצורים כבויים
  if (e.key === 'Escape' && hasOpenModal()) { closeTopModal(); return; }

  // Ctrl/Cmd+K ללוח הפקודות — מוסכמה שמשתמשים מצפים לה
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === (cfg.bindings.palette || 'k')) {
    e.preventDefault(); handlers.palette?.(); return;
  }
  if (!cfg.enabled || e.ctrlKey || e.metaKey || e.altKey) return;
  if (isTyping(e) || hasOpenModal()) return;

  const key = e.key.toLowerCase();
  for (const [action, binding] of Object.entries(cfg.bindings)) {
    if (!binding || binding.toLowerCase() !== key) continue;
    const fn = handlers[action];
    if (!fn) continue;
    e.preventDefault();
    fn();
    return;
  }
}

/** מסך העזרה — נפתח ב-? ומראה בדיוק את הקיצורים הפעילים. */
export function openShortcutsHelp() {
  const rows = Object.entries(cfg.bindings)
    .filter(([a]) => ACTION_LABELS[a] && handlers[a])
    .map(([a, k]) => h('div', { class: 'row row--between' },
      h('span', { text: ACTION_LABELS[a] }),
      h('kbd', { class: 'ltr', text: a === 'palette' ? `Ctrl+${k.toUpperCase()}` : k.toUpperCase() }),
    ));
  openModal({
    title: '⌨️ קיצורי מקלדת', size: 'sm',
    body: h('div', { class: 'stack' },
      ...rows,
      h('div', { class: 'row row--between' }, h('span', { text: 'סגירת חלון' }), h('kbd', { class: 'ltr', text: 'Esc' })),
      h('p', { class: 'small muted', text: cfg.enabled ? 'הקיצורים פעילים. אפשר לשנות או לכבות בהגדרות.' : 'הקיצורים כבויים כרגע.' }),
    ),
    actions: [
      { label: 'התאמה אישית', onClick: (c) => { c(); openShortcutsEditor(); } },
      { label: 'סגירה', variant: 'primary', onClick: (c) => c() },
    ],
  });
}

/** עורך הקיצורים: לוכד הקשה אחת לכל פעולה ומונע התנגשויות. */
export function openShortcutsEditor(onSaved = () => {}) {
  let draft = structuredClone(cfg);
  const box = h('div', { class: 'stack' });

  function draw() {
    box.replaceChildren(
      h('label', { class: 'row', style: { gap: 'var(--space-2)' } },
        h('input', { type: 'checkbox', checked: draft.enabled, on: { change: (e) => { draft.enabled = e.target.checked; draw(); } } }),
        h('span', { text: 'הפעל קיצורי מקלדת' }),
      ),
      h('div', { class: 'menu__sep' }),
      ...Object.entries(ACTION_LABELS).filter(([action]) => handlers[action]).map(([action, label]) => {
        const btn = h('button', {
          class: 'btn btn--sm ltr', type: 'button', disabled: !draft.enabled,
          'aria-label': `שינוי הקיצור עבור ${label}`,
          on: { click: () => capture(action, btn) },
        }, (draft.bindings[action] || '—').toUpperCase());
        return h('div', { class: 'row row--between' }, h('span', { text: label }), btn);
      }),
      h('p', { class: 'small muted', text: 'לחץ על קיצור והקש מקש חדש. Ctrl+K ללוח הפקודות קבוע.' }),
    );
  }

  function capture(action, btn) {
    btn.textContent = '…';
    const onKeyOnce = (e) => {
      e.preventDefault(); e.stopPropagation();
      removeEventListener('keydown', onKeyOnce, true);
      if (e.key === 'Escape') { draw(); return; }
      const k = e.key.toLowerCase();
      if (k.length !== 1) { toast('בחר מקש בודד.', { type: 'warn' }); draw(); return; }
      const clash = Object.entries(draft.bindings).find(([a, v]) => a !== action && v === k);
      if (clash) { toast(`המקש כבר משויך ל"${ACTION_LABELS[clash[0]]}".`, { type: 'warn' }); draw(); return; }
      draft.bindings[action] = k;
      draw();
    };
    addEventListener('keydown', onKeyOnce, true);
  }

  draw();
  openModal({
    title: 'התאמת קיצורי מקלדת', size: 'sm', body: box,
    actions: [
      { label: 'איפוס', onClick: () => { draft = defaultFor(KEYS.shortcuts); draw(); } },
      { label: 'ביטול', onClick: (c) => c() },
      { label: 'שמירה', variant: 'primary', onClick: (c) => { saveShortcuts(draft); c(); toast('הקיצורים נשמרו', { type: 'success' }); onSaved(); } },
    ],
  });
}
