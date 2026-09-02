// loginpage.js — מסך כניסה. מצב אורח הוא הדרך המהירה פנימה, לא הערה בשוליים.

import { h, mount, $, toast, installErrorReporting, showFormError } from './ui.js';
import { initTheme } from './theme.js';
import {
  initAuth, getSession, isGuest, listProfiles, switchProfile, createProfile,
  signIn, signUp, signInGoogle, resetPassword, upgradeGuest, authError, cloudAvailable,
} from './auth.js';

const params = new URLSearchParams(location.search);
const upgradeMode = params.get('upgrade') === '1';
let mode = upgradeMode ? 'signup' : 'signin';
let cloud = false;

(async () => {
  installErrorReporting();
  initTheme();
  await initAuth();
  cloud = await cloudAvailable();
  // כבר מחובר לחשבון אמיתי ולא ביקשנו שדרוג — ישר פנימה
  if (!isGuest() && !upgradeMode) { location.replace('index.html'); return; }
  render();
})();

function render() {
  mount($('#view'), h('div', { class: 'auth-card' },
    h('div', { class: 'auth-hero' },
      h('div', { class: 'auth-hero__logo', 'aria-hidden': 'true', text: '✅' }),
      h('h1', { text: upgradeMode ? 'שמירת הנתונים בענן' : 'המשימות שלי' }),
      h('p', { class: 'muted small', text: upgradeMode
        ? 'צור חשבון וכל מה שכבר עשית יעבור אליו — בלי לאבד כלום.'
        : 'ניהול משימות ומבחנים. בעברית, מהטלפון.' }),
    ),
    h('div', { class: 'card stack' },
      !upgradeMode ? guestBlock() : null,
      !upgradeMode && cloud ? h('div', { class: 'divider', text: 'או' }) : null,
      cloud ? authBlock() : (!upgradeMode ? null : h('p', { class: 'small muted', text: 'התחברות לענן אינה מוגדרת. הוסף config.js כדי לאפשר חשבונות.' })),
    ),
    h('p', { class: 'xsmall dim center', style: { marginBlockStart: 'var(--space-4)' },
      text: 'הנתונים שלך נשמרים בדפדפן. בלי חשבון הם לא עוזבים את המכשיר.' }),
  ));
}

// ---------- אורח ----------

function guestBlock() {
  const profiles = listProfiles();
  const s = getSession();
  return h('div', { class: 'stack' },
    h('h2', { class: 'card__title', text: 'כניסה מהירה — בלי הרשמה' }),
    ...profiles.map((p) => h('button', {
      class: `profile-row ${p.id === s.id ? 'is-active' : ''}`, type: 'button',
      on: { click: async () => { await switchProfile(p.id); location.href = 'index.html'; } },
    },
      h('span', { class: 'avatar', text: p.emoji || '🙂' }),
      h('span', { class: 'grow' },
        h('div', { class: 'strong', text: p.name }),
        h('div', { class: 'xsmall dim', text: `נוצר ${new Date(p.createdAt).toLocaleDateString('he-IL')}` })),
      h('span', { 'aria-hidden': 'true', text: '‹' }),
    )),
    h('button', {
      class: 'btn btn--block', type: 'button',
      on: { click: async () => {
        const p = createProfile(`פרופיל ${profiles.length + 1}`);
        await switchProfile(p.id);
        location.href = 'index.html';
      } },
    }, '+ פרופיל אורח חדש'),
  );
}

// ---------- חשבון ----------

function authBlock() {
  const box = h('div', { class: 'stack' });
  drawAuth(box);
  return box;
}

function drawAuth(box) {
  const isSignup = mode === 'signup';
  const isReset = mode === 'reset';

  const form = h('form', { class: 'form', novalidate: true });
  if (isSignup) form.append(field('displayName', 'שם', 'text', { autocomplete: 'name', maxlength: 60 }));
  form.append(field('email', 'אימייל', 'email', { required: true, autocomplete: 'email', inputmode: 'email' }));
  if (!isReset) form.append(field('password', 'סיסמה', 'password', { required: true, minlength: 6, autocomplete: isSignup ? 'new-password' : 'current-password' }));
  if (isSignup) form.append(h('p', { class: 'xsmall dim', text: 'לפחות 6 תווים. יישלח מייל אימות.' }));

  const submit = h('button', { class: 'btn btn--primary btn--block', type: 'submit' },
    isReset ? 'שלח קישור לאיפוס' : isSignup ? (upgradeMode ? 'צור חשבון והעבר את הנתונים' : 'הרשמה') : 'התחברות');
  form.append(submit);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(form).entries());
    const email = String(fd.email || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showFormError(form, 'כתובת אימייל לא תקינה.'); return; }
    if (!isReset && String(fd.password || '').length < 6) { showFormError(form, 'הסיסמה חייבת להיות לפחות 6 תווים.'); return; }

    submit.disabled = true; submit.textContent = 'רגע…';
    try {
      if (isReset) {
        await resetPassword(email);
        mount(box, h('p', { class: 'form__ok', text: `נשלח מייל לאיפוס הסיסמה אל ${email}. בדוק גם בספאם.` }),
          h('button', { class: 'btn btn--block', type: 'button', on: { click: () => { mode = 'signin'; drawAuth(box); } } }, 'חזרה להתחברות'));
        return;
      }
      if (isSignup && upgradeMode) {
        await upgradeGuest({ mode: 'signup', email, password: fd.password, displayName: fd.displayName });
        toast('החשבון נוצר והנתונים הועברו לענן ✓', { type: 'success' });
      } else if (isSignup) {
        await signUp(email, fd.password, fd.displayName);
        toast('החשבון נוצר. נשלח מייל אימות.', { type: 'success' });
      } else {
        await signIn(email, fd.password);
      }
      location.href = 'index.html';
    } catch (err) {
      showFormError(form, authError(err));
      submit.disabled = false;
      submit.textContent = isSignup ? 'הרשמה' : 'התחברות';
    }
  });

  const googleBtn = h('button', {
    class: 'btn btn--block', type: 'button',
    on: { click: async () => {
      try {
        if (upgradeMode) { await upgradeGuest({ mode: 'google' }); toast('החשבון חובר והנתונים הועברו ✓', { type: 'success' }); }
        else await signInGoogle();
        location.href = 'index.html';
      } catch (err) { toast(authError(err), { type: 'error', timeout: 8000 }); }
    } },
  }, '🔵 המשך עם Google');

  mount(box,
    h('h2', { class: 'card__title', text: isReset ? 'איפוס סיסמה' : isSignup ? 'יצירת חשבון' : 'התחברות לחשבון' }),
    form,
    !isReset ? h('div', { class: 'divider', text: 'או' }) : null,
    !isReset ? googleBtn : null,
    h('div', { class: 'row', style: { justifyContent: 'center', gap: 'var(--space-3)' } },
      !isSignup ? link('אין לי חשבון', () => { mode = 'signup'; drawAuth(box); }) : link('כבר יש לי חשבון', () => { mode = 'signin'; drawAuth(box); }),
      !isReset ? link('שכחתי סיסמה', () => { mode = 'reset'; drawAuth(box); }) : null,
    ),
    upgradeMode ? h('a', { class: 'small center', href: 'index.html', style: { display: 'block' } }, 'לא עכשיו — חזרה לאפליקציה') : null,
  );
}

function field(name, label, type, extra = {}) {
  const id = `f_${name}`;
  const input = h('input', { id, name, type, ...extra });
  return h('div', { class: 'field' }, h('label', { for: id, text: label }), input);
}

function link(text, onClick) {
  return h('button', { class: 'btn btn--ghost btn--sm', type: 'button', on: { click: onClick } }, text);
}
