// ============================================
//  DASHBOARD.JS — Personal OS
//  Firebase + Google Calendar
// ============================================

// ── State ───────────────────────────────────
const state = {
  user: null,
  isGuest: false,
  homework: [],
  subjects: [],
  calEvents: [],
  calConnected: false,
  activeTab: 'today',
};

// ── Firebase helpers ─────────────────────────
function getDb()   { return firebase.firestore(); }
function getAuth() { return firebase.auth(); }

// ── Boot ─────────────────────────────────────
function boot() {
  // אתחול Firebase ישירות מה-config הקיים
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  getAuth().onAuthStateChanged(user => {
    if (user) {
      state.user    = user;
      state.isGuest = user.isAnonymous;
      showDashboard(user);
      loadHomework();
      renderCalSection();
    } else {
      showAuth();
    }
  });
}

// ── Auth screens ─────────────────────────────
function showAuth() {
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('app-screen').style.display  = 'none';
  showAuthTab('google');
}

function showAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t =>
    t.classList.toggle('active', t.dataset.tab === tab));
  document.getElementById('auth-panel-google').style.display = tab === 'google' ? 'flex' : 'none';
  document.getElementById('auth-panel-email').style.display  = tab === 'email'  ? 'flex' : 'none';
  clearAuthError();
}

function showDashboard(user) {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app-screen').style.display  = 'grid';

  const name    = user.isAnonymous ? 'אורח' : (user.displayName || user.email || '?');
  const initial = name[0].toUpperCase();
  document.getElementById('user-initial').textContent = initial;
  document.getElementById('user-name').textContent    = name;

  if (user.photoURL) {
    const img = document.getElementById('user-avatar-img');
    img.src                                            = user.photoURL;
    img.style.display                                  = 'block';
    document.getElementById('user-initial').style.display = 'none';
  }
}

// ── Login methods ─────────────────────────────
function loginGoogle() {
  clearAuthError();
  const provider = new firebase.auth.GoogleAuthProvider();
  getAuth().signInWithPopup(provider).catch(err => showAuthError(friendlyError(err)));
}

function loginGuest() {
  clearAuthError();
  getAuth().signInAnonymously().catch(err => showAuthError(friendlyError(err)));
}

async function loginEmail() {
  clearAuthError();
  const email = document.getElementById('input-email').value.trim();
  const pass  = document.getElementById('input-pass').value;
  if (!email || !pass) { showAuthError('נא למלא מייל וסיסמה'); return; }

  const btn = document.getElementById('btn-email-login');
  btn.disabled = true; btn.textContent = 'מתחבר...';

  try {
    await getAuth().signInWithEmailAndPassword(email, pass);
  } catch (err) {
    showAuthError(
      (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' ||
       err.code === 'auth/invalid-credential') ? 'מייל או סיסמה שגויים' : friendlyError(err)
    );
    btn.disabled = false; btn.textContent = 'כניסה';
  }
}

async function registerEmail() {
  clearAuthError();
  const email = document.getElementById('input-email').value.trim();
  const pass  = document.getElementById('input-pass').value;
  if (!email || !pass) { showAuthError('נא למלא מייל וסיסמה'); return; }
  if (pass.length < 6) { showAuthError('הסיסמה חייבת להיות לפחות 6 תווים'); return; }

  const btn = document.getElementById('btn-email-register');
  btn.disabled = true; btn.textContent = 'יוצר חשבון...';

  try {
    await getAuth().createUserWithEmailAndPassword(email, pass);
  } catch (err) {
    showAuthError(err.code === 'auth/email-already-in-use' ? 'מייל זה כבר רשום — נסה להתחבר' : friendlyError(err));
    btn.disabled = false; btn.textContent = 'הרשמה';
  }
}

function showAuthError(msg) {
  const el = document.getElementById('auth-error');
  el.textContent = msg; el.style.display = 'block';
}
function clearAuthError() {
  const el = document.getElementById('auth-error');
  if (el) { el.textContent = ''; el.style.display = 'none'; }
}
function friendlyError(err) {
  return {
    'auth/network-request-failed': 'בעיית חיבור לרשת',
    'auth/too-many-requests':      'יותר מדי ניסיונות — נסה שוב מאוחר יותר',
    'auth/popup-closed-by-user':   'החלון נסגר לפני השלמת ההתחברות',
  }[err.code] || err.message;
}

function logout() { getAuth().signOut(); }

// ── Load homework from Firestore ─────────────
async function loadHomework() {
  renderSkeletons('task-list', 4);

  if (state.isGuest) {
    state.homework = [];
    state.subjects = [];
    renderAll();
    return;
  }

  try {
    const uid = state.user.uid;
    const db  = getDb();

    const subDoc = await db.collection('users').doc(uid).collection('data').doc('homework-subjects').get();
    state.subjects = subDoc.exists ? (subDoc.data().value || []) : [];

    const hwDoc = await db.collection('users').doc(uid).collection('data').doc('homework-list').get();
    state.homework = hwDoc.exists ? (hwDoc.data().value || []) : [];
  } catch (e) {
    console.error('Error loading homework:', e);
    state.homework = [];
  }

  renderAll();
}

// ── Filtering ────────────────────────────────
function getFiltered() {
  const today = new Date(); today.setHours(0,0,0,0);

  return state.homework.filter(hw => {
    if (!hw.dueDate) return state.activeTab === 'all';
    const due = new Date(hw.dueDate + 'T00:00:00');
    if (state.activeTab === 'today') return due <= today || isSameDay(due, today);
    if (state.activeTab === 'week')  { const w = new Date(today); w.setDate(today.getDate()+7); return due <= w; }
    return true;
  });
}

function isSameDay(a, b) {
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}

function getDaysUntil(dueDate) {
  const today = new Date(); today.setHours(0,0,0,0);
  return Math.round((new Date(dueDate+'T00:00:00') - today) / 86400000);
}

// ── Render ────────────────────────────────────
function renderAll() { renderStats(); renderTasks(); }

function renderStats() {
  const all     = state.homework;
  const pending = all.filter(h => !h.completed);
  const today   = new Date(); today.setHours(0,0,0,0);
  const overdue = pending.filter(h => h.dueDate && new Date(h.dueDate+'T00:00:00') < today);

  document.getElementById('stat-pending').textContent = pending.length;
  document.getElementById('stat-overdue').textContent = overdue.length;
  document.getElementById('stat-done').textContent    = all.filter(h=>h.completed).length;
}

function renderTasks() {
  const list     = document.getElementById('task-list');
  const filtered = getFiltered();

  document.getElementById('task-count').textContent = filtered.length + ' משימות';

  if (state.isGuest) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">👋</div>
        <div>כאורח אין גישה לנתונים שמורים<br>
          <a href="./homework/" style="color:var(--accent);text-decoration:none">עבור לאפליקציית ש.ב ↗</a>
        </div>
      </div>`;
    return;
  }

  if (filtered.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">✦</div>
        <div>אין משימות ל${state.activeTab==='today'?'היום':state.activeTab==='week'?'השבוע':'תצוגה'}</div>
      </div>`;
    return;
  }

  const sorted = [...filtered].sort((a,b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (!a.dueDate) return 1; if (!b.dueDate) return -1;
    return new Date(a.dueDate) - new Date(b.dueDate);
  });

  list.innerHTML = sorted.map(hw => taskHTML(hw)).join('');
}

function taskHTML(hw) {
  const subject  = state.subjects.find(s => s.id == hw.subject);
  const color    = subject?.color || '#6b7080';
  const name     = subject?.name  || '';
  let dueLabel   = '', dueClass = '';

  if (hw.dueDate) {
    const days = getDaysUntil(hw.dueDate);
    if      (days < 0)  { dueLabel = `פג לפני ${Math.abs(days)} ימים`; dueClass = 'urgent'; }
    else if (days === 0) { dueLabel = 'היום';              dueClass = 'urgent'; }
    else if (days === 1) { dueLabel = 'מחר';               dueClass = 'soon';   }
    else if (days <= 3)  { dueLabel = `בעוד ${days} ימים`; dueClass = 'soon';   }
    else                 { dueLabel = formatDate(hw.dueDate); dueClass = 'ok';   }
  }

  return `
    <div class="task-item ${hw.completed?'completed':''}" data-id="${hw.id}">
      <div class="task-check ${hw.completed?'checked':''}" onclick="toggleTask('${hw.id}')"></div>
      <div class="task-body">
        <div class="task-title">${escHtml(hw.title||hw.description||'ללא כותרת')}</div>
        <div class="task-meta">
          ${name?`<span class="subject-pill" style="color:${color};border-color:${color}40;">${escHtml(name)}</span>`:''}
          ${dueLabel?`<span class="due-label ${dueClass}">${dueLabel}</span>`:''}
        </div>
      </div>
      <div class="task-priority priority-${hw.priority||'low'}"></div>
    </div>`;
}

function renderSkeletons(id, count) {
  const el = document.getElementById(id); if (!el) return;
  el.innerHTML = Array.from({length:count}).map(()=>`
    <div class="loading-row">
      <div class="skeleton" style="width:18px;height:18px;border-radius:4px;flex-shrink:0"></div>
      <div style="flex:1;display:flex;flex-direction:column;gap:6px">
        <div class="skeleton" style="width:65%"></div>
        <div class="skeleton" style="width:35%"></div>
      </div>
    </div>`).join('');
}

// ── Toggle task ───────────────────────────────
async function toggleTask(id) {
  const hw = state.homework.find(h => h.id == id); if (!hw) return;
  hw.completed = !hw.completed; renderAll();
  try {
    await getDb().collection('users').doc(state.user.uid)
      .collection('data').doc('homework-list').set({ value: state.homework });
  } catch(e) { console.error(e); hw.completed = !hw.completed; renderAll(); }
}

// ── Tabs ─────────────────────────────────────
function setTab(tab) {
  state.activeTab = tab;
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  renderTasks();
}

// ── Date/header ──────────────────────────────
function renderHeader() {
  const now    = new Date();
  const days   = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
  const months = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
  document.getElementById('header-date').textContent =
    `יום ${days[now.getDay()]} · ${now.getDate()} ב${months[now.getMonth()]} ${now.getFullYear()}`;
  const h = now.getHours();
  document.getElementById('greeting-word').textContent =
    h<12 ? 'בוקר טוב' : h<17 ? 'צהריים טובים' : h<21 ? 'ערב טוב' : 'לילה טוב';
}

// ── Google Calendar ───────────────────────────
const CAL_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';
let _calTokenClient = null;

function renderCalSection() {
  const wrapper = document.getElementById('cal-content');
  if (!state.calConnected) {
    wrapper.innerHTML = `
      <button class="btn-connect-cal" id="cal-signin-btn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        התחבר ל-Google Calendar
      </button>`;
    initGoogleCalendar();
  }
}

function initGoogleCalendar() {
  if (typeof google === 'undefined' || !google.accounts) { setTimeout(initGoogleCalendar, 500); return; }
  const clientId = window.GOOGLE_CLIENT_ID;
  if (!clientId) {
    document.getElementById('cal-content').innerHTML =
      `<div class="empty-state"><div class="empty-icon">⚠️</div><div>חסר GOOGLE_CLIENT_ID ב-config.js</div></div>`;
    return;
  }
  _calTokenClient = google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: CAL_SCOPE,
    callback: (resp) => { if (resp.access_token) { state.calConnected=true; loadCalendarEvents(resp.access_token); } },
  });
  const btn = document.getElementById('cal-signin-btn');
  if (btn) btn.onclick = () => _calTokenClient.requestAccessToken();
}

async function loadCalendarEvents(token) {
  document.getElementById('cal-content').innerHTML = '';
  renderSkeletons('cal-content', 3);
  try {
    const now    = new Date().toISOString();
    const future = new Date(Date.now()+14*86400000).toISOString();
    const res    = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(now)}&timeMax=${encodeURIComponent(future)}&maxResults=8&orderBy=startTime&singleEvents=true`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    state.calEvents = (await res.json()).items || [];
  } catch(e) { console.error(e); state.calEvents = []; }
  renderCalEvents();
}

function renderCalEvents() {
  const wrapper = document.getElementById('cal-content');
  const events  = state.calEvents;
  if (!events.length) {
    wrapper.innerHTML = `<div class="empty-state"><div class="empty-icon">📅</div><div>אין אירועים קרובים</div></div>`;
    return;
  }
  const months = ['ינו','פבר','מרץ','אפר','מאי','יוני','יול','אוג','ספט','אוק','נוב','דצמ'];
  wrapper.innerHTML = `<div class="cal-events-list">` + events.map(ev => {
    const d       = new Date(ev.start?.dateTime || ev.start?.date);
    const timeStr = ev.start?.dateTime ? d.toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit'}) : 'כל היום';
    return `
      <div class="cal-event">
        <div class="cal-date-badge">
          <div class="cal-date-day">${d.getDate()}</div>
          <div class="cal-date-month">${months[d.getMonth()]}</div>
        </div>
        <div class="cal-divider"></div>
        <div class="cal-body">
          <div class="cal-title">${escHtml(ev.summary||'ללא כותרת')}</div>
          <div class="cal-time">${timeStr}</div>
        </div>
        
      </div>`;
  }).join('') + `</div>`;
}

// ── Utils ─────────────────────────────────────
function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function formatDate(d) {
  return new Date(d+'T00:00:00').toLocaleDateString('he-IL',{day:'numeric',month:'short'});
}

// ── Init ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => { renderHeader(); boot(); });