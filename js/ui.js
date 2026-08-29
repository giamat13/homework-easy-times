// ui.js — פרימיטיבים של ממשק: יצירת אלמנטים, טוסטים, מודלים, אישור, undo.
// אין כאן ידע על משימות או מבחנים.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/**
 * יצירת אלמנט. props: מאפיינים רגילים, `class`, `style` (אובייקט),
 * `on` (מאזינים), `data` (data-*), `html` (רק לתוכן שכבר עבר בריחה).
 */
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = Array.isArray(v) ? v.filter(Boolean).join(' ') : v;
    // משתני CSS מותאמים (--x) חייבים setProperty. Object.assign פשוט מתעלם מהם בשקט,
    // וזה מה שהשאיר את כל צבעי המקצועות אפורים.
    else if (k === 'style' && typeof v === 'object') {
      for (const [prop, val] of Object.entries(v)) {
        if (val === null || val === undefined) continue;
        if (prop.startsWith('--')) el.style.setProperty(prop, val);
        else el.style[prop] = val;
      }
    }
    else if (k === 'on') for (const [ev, fn] of Object.entries(v)) el.addEventListener(ev, fn);
    else if (k === 'data') for (const [d, dv] of Object.entries(v)) el.dataset[d] = dv;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'text') el.textContent = v;
    else if (k in el && k !== 'list' && typeof v !== 'object') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  add(el, children);
  return el;
}
function add(el, children) {
  for (const c of children.flat(4)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

export function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }
export function mount(el, ...children) { clear(el); add(el, children); return el; }

// ---------- טוסטים ----------

function toastHost() {
  let host = $('#toast-host');
  if (!host) {
    host = h('div', { id: 'toast-host', class: 'toast-host', role: 'status', 'aria-live': 'polite' });
    document.body.append(host);
  }
  return host;
}

/**
 * toast('נשמר')  |  toast('נמחק', { type:'warn', action:{ label:'בטל', onClick } })
 */
const TOAST_ICON = { success: '✓', warn: '!', error: '✕', info: 'i' };

export function toast(message, { type = 'info', timeout = null, action = null } = {}) {
  // טוסט עם פעולת ביטול מקבל חלון ארוך — 4 שניות לא מספיקות כדי לשים לב ולהספיק ללחוץ
  if (timeout === null) timeout = action ? 9000 : 4000;
  const host = toastHost();
  const node = h('div', { class: `toast toast--${type}`, role: 'alert' },
    h('span', { class: 'toast__icon', 'aria-hidden': 'true', text: TOAST_ICON[type] || 'i' }),
    h('span', { class: 'toast__msg', text: message }),
    action && h('button', {
      class: 'toast__action', type: 'button',
      on: { click: () => { close(); action.onClick(); } },
    }, action.label),
    h('button', {
      class: 'toast__x', type: 'button', 'aria-label': 'סגור הודעה',
      on: { click: () => close() },
    }, '×'),
  );
  host.prepend(node);
  const t = timeout ? setTimeout(close, timeout) : null;
  function close() { clearTimeout(t); node.classList.add('is-out'); setTimeout(() => node.remove(), 200); }
  return close;
}

// ---------- מודל ----------

let openStack = [];

/**
 * openModal({ title, body, actions, size, onClose }) -> { close }
 * מלכודת פוקוס, Esc לסגירה, החזרת פוקוס למקור.
 */
export function openModal({ title, body, actions = [], size = 'md', onClose } = {}) {
  const opener = document.activeElement;
  const titleId = `mt_${Math.random().toString(36).slice(2, 8)}`;

  const dialog = h('div', {
    class: `modal modal--${size}`, role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId,
  },
    h('header', { class: 'modal__head' },
      h('h2', { id: titleId, class: 'modal__title', text: title || '' }),
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'סגירה', on: { click: () => close() } }, '×'),
    ),
    h('div', { class: 'modal__body' }, body),
    actions.length ? h('footer', { class: 'modal__foot' },
      actions.map((a) => h('button', {
        class: `btn ${a.variant ? `btn--${a.variant}` : ''}`, type: a.type || 'button',
        disabled: a.disabled, on: { click: () => a.onClick?.(close) },
      }, a.label)),
    ) : null,
  );

  const overlay = h('div', { class: 'overlay', on: { mousedown: (e) => { if (e.target === overlay) close(); } } }, dialog);
  document.body.append(overlay);
  document.body.classList.add('is-modal-open');
  openStack.push(close);

  overlay.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
    if (e.key !== 'Tab') return;
    const f = focusables(dialog);
    if (!f.length) return;
    const [first, last] = [f[0], f[f.length - 1]];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  requestAnimationFrame(() => (focusables(dialog)[0] || dialog).focus());

  function close(result) {
    if (!overlay.isConnected) return;
    overlay.remove();
    openStack = openStack.filter((c) => c !== close);
    if (!openStack.length) document.body.classList.remove('is-modal-open');
    opener?.focus?.();
    onClose?.(result);
  }
  return { close, dialog, overlay };
}

function focusables(root) {
  return $$('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])', root)
    .filter((el) => el.offsetParent !== null || el === document.activeElement);
}

export function closeTopModal() { openStack.at(-1)?.(); }
export function hasOpenModal() { return openStack.length > 0; }

/** אישור. מחזיר Promise<boolean>. תמיד עדיף על confirm() — נגיש ובעברית. */
export function confirmDialog(message, { title = 'לאישור', okLabel = 'אישור', danger = false } = {}) {
  return new Promise((resolve) => {
    let done = false;
    const m = openModal({
      title, size: 'sm',
      body: h('p', { class: 'modal__text', text: message }),
      actions: [
        { label: 'ביטול', onClick: (c) => { done = true; c(); resolve(false); } },
        { label: okLabel, variant: danger ? 'danger' : 'primary', onClick: (c) => { done = true; c(); resolve(true); } },
      ],
      onClose: () => { if (!done) resolve(false); },
    });
    void m;
  });
}

/** טופס במודל. fields = [{name,label,type,value,options,required,hint}] */
export function formModal({ title, fields, okLabel = 'שמירה', validate }) {
  return new Promise((resolve) => {
    const form = h('form', { class: 'form', novalidate: true });
    for (const f of fields) form.append(fieldRow(f));
    let done = false;
    const m = openModal({
      title, body: form,
      actions: [
        { label: 'ביטול', onClick: (c) => { done = true; c(); resolve(null); } },
        { label: okLabel, variant: 'primary', onClick: () => form.requestSubmit() },
      ],
      onClose: () => { if (!done) resolve(null); },
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      const err = validate?.(data);
      if (err) { showFormError(form, err); return; }
      done = true; m.close(); resolve(data);
    });
  });
}

export function showFormError(form, msg) {
  let box = $('.form__error', form);
  if (!box) { box = h('p', { class: 'form__error', role: 'alert' }); form.prepend(box); }
  box.textContent = msg;
  box.scrollIntoView({ block: 'nearest' });
}

/** שורת שדה סטנדרטית עם label מקושר — נגישות בלי לחשוב על זה בכל טופס. */
export function fieldRow({ name, label, type = 'text', value = '', options, required, hint, ...rest }) {
  const id = `f_${name}_${Math.random().toString(36).slice(2, 6)}`;
  let input;
  if (type === 'select') {
    input = h('select', { id, name, required, ...rest },
      ...(options || []).map((o) => {
        const val = typeof o === 'string' ? o : o.value;
        const lab = typeof o === 'string' ? o : o.label;
        return h('option', { value: val, selected: String(val) === String(value) }, lab);
      }));
  } else if (type === 'textarea') {
    input = h('textarea', { id, name, required, rows: 3, ...rest });
    input.value = value ?? '';
  } else if (type === 'checkbox') {
    input = h('input', { id, name, type: 'checkbox', checked: !!value, ...rest });
  } else {
    input = h('input', { id, name, type, required, ...rest });
    input.value = value ?? '';
  }
  return h('div', { class: `field field--${type}` },
    h('label', { for: id, text: label }),
    input,
    hint ? h('small', { class: 'field__hint', text: hint }) : null,
  );
}

/**
 * מד התקדמות נגיש. ratio בטווח 0..1. מונפש ב-transform ולא ב-width.
 */
export function progressBar(ratio, { label, small = false } = {}) {
  const p = Math.max(0, Math.min(1, Number(ratio) || 0));
  const fill = h('div', { class: 'bar__fill' });
  fill.style.setProperty('--p', p);
  return h('div', {
    class: `bar ${small ? 'bar--sm' : ''}`, role: 'progressbar',
    'aria-valuenow': Math.round(p * 100), 'aria-valuemin': '0', 'aria-valuemax': '100',
    'aria-label': label || 'התקדמות',
  }, fill);
}

/** עדכון מד קיים בלי לבנות אותו מחדש. */
export function setProgress(barEl, ratio) {
  const p = Math.max(0, Math.min(1, Number(ratio) || 0));
  barEl.querySelector('.bar__fill')?.style.setProperty('--p', p);
  barEl.setAttribute('aria-valuenow', Math.round(p * 100));
}

export function emptyState(icon, title, text, action) {
  return h('div', { class: 'empty' },
    h('div', { class: 'empty__icon', 'aria-hidden': 'true', text: icon }),
    h('h3', { text: title }),
    text ? h('p', { text }) : null,
    action ? h('button', { class: 'btn btn--primary', type: 'button', on: { click: action.onClick } }, action.label) : null,
  );
}

/** מציג שגיאה שלא נתפסה למשתמש במקום להיעלם לקונסול. */
export function installErrorReporting() {
  const seen = new Set();
  const report = (msg) => {
    if (seen.has(msg)) return; seen.add(msg);
    setTimeout(() => seen.delete(msg), 5000);
    toast(`שגיאה: ${msg}`, { type: 'error', timeout: 8000 });
  };
  addEventListener('error', (e) => report(e.message || 'תקלה לא צפויה'));
  addEventListener('unhandledrejection', (e) => report(e.reason?.message || 'פעולה נכשלה'));
}
