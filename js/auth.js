// auth.js — זהות המשתמש: פרופילי אורח, הרשמה/התחברות, והחלפת סקופ האחסון.
// אין כאן DOM. המסכים מדברים עם המודול הזה בלבד.

import * as store from './storage.js';
import { KEYS } from './keys.js';
import { loadFirebase, available, cloudWipe } from './cloud.js';
import { uid } from './util.js';

let session = { kind: 'guest', id: null, name: 'אורח', email: null, uid: null, emailVerified: false, photo: null };
const subs = new Set();
let resolveReady; const ready = new Promise((r) => { resolveReady = r; });

export function onAuth(fn) { subs.add(fn); fn(getSession()); return () => subs.delete(fn); }
export function getSession() { return { ...session }; }
export function isGuest() { return session.kind === 'guest'; }
export function cloudAvailable() { return available(); }
function emit() { for (const f of subs) { try { f(getSession()); } catch (e) { console.error(e); } } }

// ---------- פרופילי אורח ----------

export function listProfiles() {
  const p = store.get(KEYS.guestProfiles);
  return Array.isArray(p) ? p : [];
}

function writeProfiles(list) { store.set(KEYS.guestProfiles, list); }

export function createProfile(name = 'פרופיל חדש', { emoji = '🙂' } = {}) {
  const list = listProfiles();
  const p = { id: uid('g'), name: String(name).slice(0, 40) || 'פרופיל', emoji, createdAt: new Date().toISOString() };
  list.push(p); writeProfiles(list);
  return p;
}

export function renameProfile(id, name) {
  const list = listProfiles();
  const p = list.find((x) => x.id === id); if (!p) return false;
  p.name = String(name).slice(0, 40) || p.name; writeProfiles(list);
  if (session.kind === 'guest' && session.id === id) { session.name = p.name; emit(); }
  return true;
}

/** מוחק פרופיל אורח ואת כל הנתונים שלו. לא ניתן למחוק את הפרופיל האחרון. */
export async function deleteProfile(id) {
  const list = listProfiles();
  if (list.length <= 1) throw new Error('חייב להישאר לפחות פרופיל אחד.');
  const next = list.filter((x) => x.id !== id);
  if (session.kind === 'guest' && session.id === id) await switchProfile(next[0].id);
  for (const k of Object.values(KEYS)) localStorage.removeItem(`__ns:guest:${id}:${k}`);
  localStorage.removeItem(`__mt:guest:${id}`);
  localStorage.removeItem(`__pending:guest:${id}`);
  writeProfiles(next);
  return true;
}

export async function switchProfile(id) {
  const p = listProfiles().find((x) => x.id === id);
  if (!p) throw new Error('פרופיל לא נמצא.');
  store.set(KEYS.guestActive, id);
  await store.setScope({ kind: 'guest', id: `guest:${id}`, uid: null });
  session = { kind: 'guest', id, name: p.name, email: null, uid: null, emailVerified: false, photo: p.emoji || null };
  emit();
  return session;
}

// ---------- אתחול ----------

/** מאתחל אחסון + זהות. פותר כשידוע אם יש משתמש מחובר. */
export async function initAuth() {
  store.initStorage();

  let profiles = listProfiles();
  const firstRun = profiles.length === 0;
  if (firstRun) {
    // האם כבר יושבים נתונים במפתחות הנקיים? אם כן — הם של המשתמש הקיים, מאמצים אותם.
    const hasLegacy = [KEYS.tasks, KEYS.subjects, KEYS.exams].some((k) => localStorage.getItem(k));
    const p = createProfile(hasLegacy ? 'הנתונים שלי' : 'אני');
    profiles = [p];
    store.set(KEYS.guestActive, p.id);
    await store.setScope({ kind: 'guest', id: `guest:${p.id}`, uid: null }, { adopt: hasLegacy });
    session = { ...session, id: p.id, name: p.name };
  } else {
    const activeId = store.get(KEYS.guestActive) || profiles[0].id;
    const p = profiles.find((x) => x.id === activeId) || profiles[0];
    await store.setScope({ kind: 'guest', id: `guest:${p.id}`, uid: null });
    session = { ...session, id: p.id, name: p.name, photo: p.emoji || null };
  }
  emit();

  const fb = await loadFirebase();
  if (!fb) { resolveReady(getSession()); return getSession(); }

  fb.authM.onAuthStateChanged(fb.auth, async (user) => {
    if (user) await adoptUser(user);
    else if (session.kind === 'user') await backToGuest();
    resolveReady(getSession());
  });
  // אם onAuthStateChanged מתעכב (רשת איטית) — לא תוקעים את האפליקציה
  setTimeout(() => resolveReady(getSession()), 4000);
  return ready;
}

export function authReady() { return ready; }

async function adoptUser(user) {
  await store.setScope({ kind: 'user', id: `user:${user.uid}`, uid: user.uid });
  session = {
    kind: 'user', id: user.uid, uid: user.uid,
    name: user.displayName || (user.email || '').split('@')[0] || 'משתמש',
    email: user.email, emailVerified: user.emailVerified, photo: user.photoURL,
  };
  emit();
}

async function backToGuest() {
  const profiles = listProfiles();
  const id = store.get(KEYS.guestActive) || profiles[0]?.id;
  if (id) await switchProfile(id);
}

// ---------- Firebase Auth ----------

async function fb() {
  const f = await loadFirebase();
  if (!f) throw new Error('התחברות לענן אינה מוגדרת. הוסף config.js כדי להפעיל חשבונות.');
  return f;
}

export async function signUp(email, password, displayName) {
  const f = await fb();
  const cred = await f.authM.createUserWithEmailAndPassword(f.auth, email.trim(), password);
  if (displayName) await f.authM.updateProfile(cred.user, { displayName: displayName.trim() });
  await f.authM.sendEmailVerification(cred.user).catch(() => {});
  return cred.user;
}

export async function signIn(email, password) {
  const f = await fb();
  const cred = await f.authM.signInWithEmailAndPassword(f.auth, email.trim(), password);
  return cred.user;
}

export async function signInGoogle() {
  const f = await fb();
  const provider = new f.authM.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    const cred = await f.authM.signInWithPopup(f.auth, provider);
    return cred.user;
  } catch (e) {
    if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') {
      await f.authM.signInWithRedirect(f.auth, provider);
      return null;
    }
    throw e;
  }
}

export async function resetPassword(email) {
  const f = await fb();
  await f.authM.sendPasswordResetEmail(f.auth, email.trim());
}

export async function resendVerification() {
  const f = await fb();
  if (!f.auth.currentUser) throw new Error('אין משתמש מחובר.');
  await f.authM.sendEmailVerification(f.auth.currentUser);
}

export async function refreshUser() {
  const f = await loadFirebase();
  if (!f?.auth.currentUser) return session;
  await f.auth.currentUser.reload();
  session.emailVerified = f.auth.currentUser.emailVerified;
  emit();
  return getSession();
}

export async function signOutUser() {
  const f = await loadFirebase();
  if (f?.auth.currentUser) await f.authM.signOut(f.auth);
  else await backToGuest();
}

/**
 * המרת אורח לחשבון: יוצר/מחבר חשבון ומעלה את כל נתוני האורח לענן.
 * mode: 'signup' | 'google'
 */
export async function upgradeGuest({ mode, email, password, displayName }) {
  if (session.kind !== 'guest') throw new Error('כבר מחובר לחשבון.');
  const guestScope = `guest:${session.id}`;
  const snapshot = snapshotScope(guestScope);

  const user = mode === 'google' ? await signInGoogle() : await signUp(email, password, displayName);
  if (!user) return null; // redirect flow

  await adoptUser(user);
  // מיזוג: מה שהיה לאורח מנצח רק אם אין נתון בענן
  for (const [k, v] of Object.entries(snapshot)) {
    const existing = store.get(k);
    const empty = existing === undefined || existing === null
      || (Array.isArray(existing) && existing.length === 0);
    if (empty && v !== undefined) store.set(k, v);
  }
  await store.pushAll(user.uid);
  return user;
}

function snapshotScope(scopeId) {
  const out = {};
  for (const k of Object.values(KEYS)) {
    const raw = localStorage.getItem(`__ns:${scopeId}:${k}`);
    if (raw !== null) { try { out[k] = JSON.parse(raw); } catch { /* דילוג על רשומה פגומה */ } }
  }
  return out;
}

/**
 * מחיקת חשבון מלאה: כל המסמכים ב-Firestore, ואז המשתמש עצמו.
 * דורש התחברות מחדש אם הסשן ישן — אנחנו מטפלים בזה ומחזירים קוד ברור.
 */
export async function deleteAccount(password) {
  const f = await fb();
  const user = f.auth.currentUser;
  if (!user) throw new Error('אין משתמש מחובר.');
  try {
    if (password) {
      const cred = f.authM.EmailAuthProvider.credential(user.email, password);
      await f.authM.reauthenticateWithCredential(user, cred);
    }
    await cloudWipe(user.uid);
    await store.clearAll();
    await user.delete();
  } catch (e) {
    if (e.code === 'auth/requires-recent-login') {
      const err = new Error('מטעמי אבטחה יש להתחבר מחדש לפני מחיקת החשבון.');
      err.code = 'reauth'; throw err;
    }
    throw e;
  }
}

/** תרגום קודי שגיאה של Firebase לעברית אנושית. */
export function authError(e) {
  const map = {
    'auth/invalid-email': 'כתובת האימייל אינה תקינה.',
    'auth/user-disabled': 'החשבון הזה הושבת.',
    'auth/user-not-found': 'לא נמצא חשבון עם האימייל הזה.',
    'auth/wrong-password': 'סיסמה שגויה.',
    'auth/invalid-credential': 'אימייל או סיסמה שגויים.',
    'auth/email-already-in-use': 'כבר קיים חשבון עם האימייל הזה.',
    'auth/weak-password': 'הסיסמה קצרה מדי — לפחות 6 תווים.',
    'auth/too-many-requests': 'יותר מדי ניסיונות. נסה שוב בעוד כמה דקות.',
    'auth/network-request-failed': 'אין חיבור לרשת. אפשר להמשיך לעבוד במצב אורח.',
    'auth/popup-closed-by-user': 'חלון ההתחברות נסגר.',
    'auth/unauthorized-domain': 'הדומיין הזה לא מאושר בהגדרות Firebase.',
  };
  return map[e?.code] || e?.message || 'משהו השתבש. נסה שוב.';
}
