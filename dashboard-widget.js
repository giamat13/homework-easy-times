// ============================================
//  DASHBOARD WIDGET
//  Calendar + Google Tasks — משולב ב-homework
//  חיבור מתמשך — נשמר ב-Firestore
// ============================================

const dashboardWidget = (() => {

  // ── State ───────────────────────────────────
  const ds = {
    calConnected:   false,
    tasksConnected: false,
    calToken:       null,
    calEvents:      [],
    tasks:          [],
    taskLists:      [],
  };

  const GOOGLE_SCOPES = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/tasks',
  ].join(' ');

  const STORAGE_KEY = 'google-widget-connection';
  let _tokenClient  = null;

  // ── Init ──────────────────────────────────────
  async function init() {
    _renderShell();
    _initGoogleServices();
  }

  // ── Render shell ─────────────────────────────
  function _renderShell() {
    const el = document.getElementById('dashboard-widget');
    if (!el) return;

    el.innerHTML = `
      <div class="dw-grid" style="grid-template-columns: 1fr;">

        <!-- Calendar -->
        <div class="panel dw-panel">
          <div class="dw-panel-header">
            <h2 class="dw-title">📅 אירועים קרובים</h2>
            <button id="dw-cal-disconnect" class="dw-disconnect hidden" onclick="dashboardWidget.disconnectAll()">התנתק</button>
          </div>
          <div id="dw-cal-content">
            <button class="dw-connect-btn" id="dw-cal-btn">
              התחבר ל-Google Calendar
            </button>
          </div>
        </div>

      </div>`;

    document.getElementById('dw-cal-btn').onclick = () => _requestToken(false);
  }

  // ── Google token ─────────────────────────────
  function _initGoogleServices() {
    if (typeof google === 'undefined' || !google.accounts) {
      setTimeout(_initGoogleServices, 500);
      return;
    }
    const clientId = window.GOOGLE_CLIENT_ID;
    if (!clientId) return;

    _tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: GOOGLE_SCOPES,
      callback: async (resp) => {
        if (resp.error || !resp.access_token) {
          // silent re-auth נכשל — נציג כפתור התחברות
          _updateButtons();
          return;
        }
        ds.calToken       = resp.access_token;
        ds.calConnected   = true;
        ds.tasksConnected = true;
        // שמור ב-Firestore שהמשתמש מחובר
        await _saveConnectionState(true);
        _updateButtons();
        await Promise.all([
          _loadCalendar(resp.access_token),
          _loadTasks(resp.access_token),
        ]);
      },
    });

    // בדוק אם המשתמש היה מחובר קודם — נסה להתחבר בשקט
    _tryAutoReconnect();
  }

  // ── Auto reconnect ────────────────────────────
  async function _tryAutoReconnect() {
    try {
      const saved = await storage.get(STORAGE_KEY);
      if (saved && saved.connected) {
        // הצג skeleton בזמן ניסיון ההתחברות השקטה
        const wrapper = document.getElementById('dw-cal-content');
        if (wrapper) wrapper.innerHTML = _skeletons(3);
        // בקש טוקן בשקט (ללא popup אם האישור כבר ניתן)
        _requestToken(true);
      }
    } catch(e) {
      // אין שמירה — לא מתחברים אוטומטית
    }
  }

  function _requestToken(silent = false) {
    if (!_tokenClient) return;
    _tokenClient.requestAccessToken({ prompt: silent ? '' : 'consent' });
  }

  // ── Save / clear connection in Firestore ─────
  async function _saveConnectionState(connected) {
    try {
      if (connected) {
        await storage.set(STORAGE_KEY, { connected: true, savedAt: new Date().toISOString() });
      } else {
        await storage.remove(STORAGE_KEY);
      }
    } catch(e) { console.warn('Could not save connection state', e); }
  }

  function _updateButtons() {
    _toggle('dw-cal-disconnect', ds.calConnected);
    _toggle('dw-cal-btn',       !ds.calConnected);
    // כפתורי Tasks ב-toolbar רשימת המשימות
    _toggle('hw-tasks-connect-btn',    !ds.tasksConnected);
    _toggle('hw-tasks-disconnect-btn',  ds.tasksConnected);
    // עדכן הגדרות אם פתוח
    if (typeof updateSettingsTasksStatus === 'function') updateSettingsTasksStatus();
    // רנדר מחדש את הרשימה המאוחדת
    if (typeof renderHomework === 'function') renderHomework();
  }

  function _toggle(id, show) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = show ? '' : 'none';
  }

  // ── Disconnect ────────────────────────────────
  async function disconnectAll() {
    ds.calConnected   = false;
    ds.tasksConnected = false;
    ds.calEvents      = [];
    ds.tasks          = [];
    ds.taskLists      = [];
    if (ds.calToken) {
      google.accounts.oauth2.revoke(ds.calToken, () => {});
      ds.calToken = null;
    }
    await _saveConnectionState(false);
    _updateButtons();
    document.getElementById('dw-cal-content').innerHTML =
      `<button class="dw-connect-btn" id="dw-cal-btn" onclick="dashboardWidget._requestToken(false)">התחבר ל-Google Calendar</button>`;
  }

  // שמור תאימות לשמות הישנים
  function disconnectCal()   { return disconnectAll(); }
  function disconnectTasks() {
    ds.tasksConnected = false;
    ds.tasks          = [];
    ds.taskLists      = [];
    _saveConnectionState(false);
    _updateButtons();
    if (typeof renderHomework === 'function') renderHomework();
  }

  // ── Calendar ──────────────────────────────────
  async function _loadCalendar(token) {
    const wrapper = document.getElementById('dw-cal-content');
    if (wrapper) wrapper.innerHTML = _skeletons(3);
    try {
      const now    = new Date().toISOString();
      const future = new Date(Date.now() + 14 * 86400000).toISOString();
      const res    = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(now)}&timeMax=${encodeURIComponent(future)}&maxResults=8&orderBy=startTime&singleEvents=true`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      ds.calEvents = (await res.json()).items || [];
    } catch(e) { console.error(e); ds.calEvents = []; }
    _renderCalendar();
  }

  function _renderCalendar() {
    const wrapper = document.getElementById('dw-cal-content');
    if (!wrapper) return;
    if (!ds.calEvents.length) {
      wrapper.innerHTML = `<div class="empty-state" style="padding:2rem;text-align:center;color:var(--text-secondary)">אין אירועים קרובים</div>`;
      return;
    }
    const months = ['ינו','פבר','מרץ','אפר','מאי','יוני','יול','אוג','ספט','אוק','נוב','דצמ'];
    wrapper.innerHTML = ds.calEvents.map(ev => {
      const d       = new Date(ev.start?.dateTime || ev.start?.date);
      const timeStr = ev.start?.dateTime
        ? d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
        : 'כל היום';
      return `
        <div class="dw-event">
          <div class="dw-date-badge">
            <div class="dw-date-day">${d.getDate()}</div>
            <div class="dw-date-month">${months[d.getMonth()]}</div>
          </div>
          <div class="dw-event-body">
            <div class="dw-event-title">${_esc(ev.summary || 'ללא כותרת')}</div>
            <div class="dw-event-time">${timeStr}</div>
          </div>
        </div>`;
    }).join('');
  }

  // ── Tasks ─────────────────────────────────────
  async function _loadTasks(token) {
    try {
      const listsRes = await fetch(
        'https://tasks.googleapis.com/tasks/v1/users/@me/lists?maxResults=10',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      ds.taskLists = (await listsRes.json()).items || [];

      const allTasks = [];
      await Promise.all(ds.taskLists.map(async (list) => {
        const res  = await fetch(
          `https://tasks.googleapis.com/tasks/v1/lists/${list.id}/tasks?showCompleted=false&maxResults=20`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        (data.items || []).forEach(t => allTasks.push({ ...t, listTitle: list.title, listId: list.id }));
      }));

      ds.tasks = allTasks.sort((a, b) => {
        if (!a.due && !b.due) return 0;
        if (!a.due) return 1;
        if (!b.due) return -1;
        return new Date(a.due) - new Date(b.due);
      });
    } catch(e) { console.error(e); ds.tasks = []; }
    if (typeof renderHomework === 'function') renderHomework();
  }

  async function completeTask(taskId, listId, checkbox) {
    checkbox.disabled = true;
    try {
      await fetch(
        `https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks/${taskId}`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${ds.calToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'completed' }),
        }
      );
      const linkedHw = (window.homework || []).find(h => h.googleTaskId === taskId);
      if (linkedHw) {
        linkedHw.completed   = true;
        linkedHw.completedAt = new Date().toISOString();
        if (typeof saveData === 'function') saveData();
      }
      ds.tasks = ds.tasks.filter(t => t.id !== taskId);
      setTimeout(() => { if (typeof renderHomework === 'function') renderHomework(); }, 400);
    } catch(e) {
      console.error(e);
      checkbox.checked  = false;
      checkbox.disabled = false;
    }
  }

  // ── Utils ─────────────────────────────────────
  function _skeletons(n) {
    return Array.from({ length: n }).map(() => `
      <div style="display:flex;gap:0.75rem;padding:0.75rem;border:2px solid var(--border-color);border-radius:0.75rem;margin-bottom:0.5rem">
        <div style="width:40px;height:40px;border-radius:0.5rem;background:var(--border-color);flex-shrink:0"></div>
        <div style="flex:1;display:flex;flex-direction:column;gap:6px;justify-content:center">
          <div style="height:10px;width:65%;background:var(--border-color);border-radius:4px"></div>
          <div style="height:10px;width:35%;background:var(--border-color);border-radius:4px"></div>
        </div>
      </div>`).join('');
  }

  function _esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return {
    init,
    disconnectAll,
    disconnectCal,
    disconnectTasks,
    completeTask,
    _requestToken,
    getTasks:    () => ds.tasks,
    isConnected: () => ds.tasksConnected,
  };

})();