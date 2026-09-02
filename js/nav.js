// nav.js — הניווט המשותף לכל המסכים: מותג, קישורים, מצב סנכרון, טיימר ותפריט משתמש.

import { h, mount, toast, confirmDialog, formModal, $ } from './ui.js';
import * as store from './storage.js';
import { getSession, onAuth, signOutUser, listProfiles, switchProfile, createProfile, isGuest, resendVerification } from './auth.js';
import { terms } from './state.js';
import { toggleDark, getTheme } from './theme.js';
import { openPalette } from './search.js';
import { openTimer } from './timerview.js';
import * as T from './timer.js';

const LINKS = [
  { href: 'index.html', label: 'משימות', icon: '🏠' },
  { href: 'exams.html', label: 'מבחנים', icon: '📝', studentOnly: true },
  { href: 'stats.html', label: 'סטטיסטיקה', icon: '📊' },
  { href: 'achievements.html', label: 'הישגים', icon: '🏆' },
  { href: 'settings.html', label: 'הגדרות', icon: '⚙️' },
];

/** renderNav(mountEl, { onChange }) */
export function renderNav(el, { onChange = () => {} } = {}) {
  const here = location.pathname.split('/').pop() || 'index.html';
  const T2 = terms();

  const syncDot = h('span', { class: 'sync-dot', role: 'img' });
  const timerChip = h('button', {
    class: 'icon-btn', type: 'button', 'aria-label': 'טיימר פומודורו', title: 'טיימר',
    on: { click: () => openTimer() },
  }, '⏱️');

  function paintSync(st) {
    const state = st.syncing ? 'syncing' : st.error ? 'error' : st.pending ? 'pending' : st.mode === 'cloud' ? 'cloud' : 'local';
    syncDot.dataset.state = state;
    syncDot.setAttribute('aria-label', {
      syncing: 'מסנכרן…', error: 'שגיאת סנכרון — הנתונים שמורים מקומית',
      pending: `${st.pending} שינויים ממתינים לסנכרון`, cloud: 'מסונכרן לענן', local: 'נשמר במכשיר הזה',
    }[state]);
    syncDot.title = syncDot.getAttribute('aria-label');
  }
  paintSync(store.getStatus());
  store.on('status', paintSync);

  function paintTimer(st) {
    if (st.running) {
      timerChip.classList.add('is-on');
      timerChip.textContent = `${String(Math.floor(st.left / 60)).padStart(2, '0')}:${String(st.left % 60).padStart(2, '0')}`;
      timerChip.style.width = 'auto'; timerChip.style.padding = '0 10px';
      timerChip.style.fontVariantNumeric = 'tabular-nums'; timerChip.style.fontSize = 'var(--fs-sm)';
    } else {
      timerChip.classList.remove('is-on');
      timerChip.textContent = '⏱️';
      timerChip.style.width = ''; timerChip.style.padding = '';
    }
  }
  T.onTimer(paintTimer);

  mount(el, h('div', { class: 'app-nav__inner' },
    h('a', { class: 'brand', href: 'index.html' },
      h('span', { class: 'brand__mark', 'aria-hidden': 'true', text: '✓' }),
      h('span', { text: 'המשימות שלי' }),
    ),
    h('nav', { class: 'nav-links', 'aria-label': 'ניווט ראשי' },
      ...LINKS.filter((l) => !l.studentOnly || T2.hasExams).map((l) => h('a', {
        class: 'nav-link', href: l.href,
        'aria-current': here === l.href ? 'page' : null,
      }, `${l.icon} ${l.label}`)),
    ),
    h('span', { class: 'spacer' }),
    h('button', {
      class: 'icon-btn', type: 'button', 'aria-label': 'חיפוש ופקודות (Ctrl+K)', title: 'חיפוש — Ctrl+K',
      on: { click: () => openPalette({ onChange }) },
    }, '🔍'),
    timerChip,
    h('button', {
      class: 'icon-btn', type: 'button', 'aria-label': 'החלפת מצב כהה/בהיר', title: 'מצב כהה/בהיר',
      on: { click: () => { const t = toggleDark(); toast(t.dark ? 'מצב לילה' : 'מצב יום', { type: 'info', timeout: 1500 }); } },
    }, getTheme().dark ? '☀️' : '🌙'),
    syncDot,
    userMenu(onChange),
  ));
}

function userMenu(onChange) {
  const wrap = h('div', { class: 'menu' });
  const btn = h('button', { class: 'icon-btn', type: 'button', 'aria-haspopup': 'true', 'aria-expanded': 'false' });
  let pop = null;

  function paint(s) {
    btn.replaceChildren(h('span', { class: 'avatar', text: (s.name || '?').slice(0, 2) }));
    btn.setAttribute('aria-label', `תפריט משתמש — ${s.name}`);
  }
  onAuth(paint);

  btn.addEventListener('click', (e) => { e.stopPropagation(); pop ? close() : open(); });

  function open() {
    const s = getSession();
    const guest = isGuest();
    pop = h('div', { class: 'menu__pop', role: 'menu' },
      h('div', { class: 'menu__head' },
        h('div', { class: 'strong', text: s.name }),
        h('div', { class: 'xsmall dim', text: guest ? 'מצב אורח — הנתונים במכשיר הזה' : s.email || '' }),
        !guest && !s.emailVerified ? h('button', {
          class: 'badge badge--warn', type: 'button', style: { marginBlockStart: '6px' },
          on: { click: async () => { try { await resendVerification(); toast('נשלח מייל אימות', { type: 'success' }); } catch (e) { toast(e.message, { type: 'error' }); } } },
        }, 'אמת אימייל') : null,
      ),
      guest ? profileSwitcher(onChange) : null,
      guest
        ? item('☁️ שמור בענן — צור חשבון', () => { location.href = 'login.html?upgrade=1'; })
        : item('🔄 סנכרן עכשיו', async () => {
          try { const r = await store.syncNow(); toast(r.skipped ? 'הסנכרון מושבת' : `סונכרן ✓ (${r.pulled} התקבלו, ${r.pushed} נשלחו)`, { type: 'success' }); onChange(); }
          catch { toast('הסנכרון נכשל — הנתונים בטוחים מקומית.', { type: 'error' }); }
        }),
      h('div', { class: 'menu__sep' }),
      item('⚙️ הגדרות', () => { location.href = 'settings.html'; }),
      item(guest ? '🔐 התחברות' : '🚪 יציאה', async () => {
        if (!guest && !(await confirmDialog('להתנתק מהחשבון? הנתונים יישארו בענן.', { title: 'יציאה', okLabel: 'התנתק' }))) return;
        if (guest) { location.href = 'login.html'; return; }
        await signOutUser(); location.href = 'login.html';
      }, guest ? '' : 'menu__item--danger'),
    );
    wrap.append(pop);
    btn.setAttribute('aria-expanded', 'true');
    setTimeout(() => document.addEventListener('click', close, { once: true }), 0);
  }

  function close() { pop?.remove(); pop = null; btn.setAttribute('aria-expanded', 'false'); }
  function item(label, onClick, cls = '') {
    return h('button', { class: `menu__item ${cls}`, type: 'button', role: 'menuitem', on: { click: (e) => { e.stopPropagation(); close(); onClick(); } } }, label);
  }

  paint(getSession());
  wrap.append(btn);
  return wrap;
}

function profileSwitcher(onChange) {
  const s = getSession();
  const profiles = listProfiles();
  return h('div', {},
    h('div', { class: 'xsmall dim', style: { padding: '4px 12px' }, text: 'פרופילים' },),
    ...profiles.map((p) => h('button', {
      class: 'menu__item', type: 'button', role: 'menuitem',
      style: p.id === s.id ? { background: 'var(--brand-soft)', fontWeight: '650' } : {},
      on: { click: async (e) => { e.stopPropagation(); await switchProfile(p.id); toast(`עברת ל"${p.name}"`, { type: 'success' }); onChange(); location.reload(); } },
    }, `${p.emoji || '🙂'} ${p.name}`)),
    h('button', {
      class: 'menu__item', type: 'button', role: 'menuitem',
      on: { click: async (e) => {
        e.stopPropagation();
        const data = await formModal({
          title: 'פרופיל אורח חדש',
          fields: [{ name: 'name', label: 'שם הפרופיל', required: true, maxlength: 40 }],
          okLabel: 'צור',
          validate: (d) => (d.name.trim() ? null : 'חובה למלא שם.'),
        });
        if (!data) return;
        const p = createProfile(data.name.trim());
        await switchProfile(p.id);
        location.reload();
      } },
    }, '➕ פרופיל חדש'),
    h('div', { class: 'menu__sep' }),
  );
}

/** שלד HTML לניווט — נקרא מכל דף לפני renderNav. */
export function navHost() {
  let el = $('#app-nav');
  if (!el) {
    el = h('header', { class: 'app-nav', id: 'app-nav' });
    document.body.prepend(el);
  }
  el.className = 'app-nav';
  return el;
}
