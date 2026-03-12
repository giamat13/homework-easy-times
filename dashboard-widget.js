// ============================================
//  DASHBOARD WIDGET
//  Calendar + Google Tasks — משולב ב-homework
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

  let _tokenClient = null;

  // ── Init ──────────────────────────────────────
  function init() {
    _renderShell();
    _initGoogleServices();
  }

  // ── Render shell ─────────────────────────────
  function _renderShell() {
    const el = document.getElementById('dashboard-widget');
    if (!el) return;

    el.innerHTML = `
      <div class="dw-grid">

        <!-- Calendar -->
        <div class="panel dw-panel">
          <div class="dw-panel-header">
            <h2 class="dw-title">📅 אירועים קרובים</h2>
            <button id="dw-cal-disconnect" class="dw-disconnect hidden" onclick="dashboardWidget.disconnectCal()">התנתק</button>
          </div>
          <div id="dw-cal-content">
            <button class="dw-connect-btn" id="dw-cal-btn">
              התחבר ל-Google Calendar
            </button>
          </div>
        </div>

        <!-- Tasks -->
        <div class="panel dw-panel">
          <div class="dw-panel-header">
            <h2 class="dw-title">✅ Google Tasks</h2>
            <button id="dw-tasks-disconnect" class="dw-disconnect hidden" onclick="dashboardWidget.disconnectTasks()">התנתק</button>
          </div>
          <div id="dw-tasks-content">
            <button class="dw-connect-btn" id="dw-tasks-btn">
              התחבר ל-Google Tasks
            </button>
          </div>
        </div>

      </div>`;

    document.getElementById('dw-cal-btn').onclick   = () => _requestToken();
    document.getElementById('dw-tasks-btn').onclick = () => _requestToken();
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
        if (!resp.access_token) return;
        ds.calToken       = resp.access_token;
        ds.calConnected   = true;
        ds.tasksConnected = true;
        _updateButtons();
        await Promise.all([
          _loadCalendar(resp.access_token),
          _loadTasks(resp.access_token),
        ]);
      },
    });
  }

  function _requestToken() {
    if (_tokenClient) _tokenClient.requestAccessToken();
  }

  function _updateButtons() {
    _toggle('dw-cal-disconnect',    ds.calConnected);
    _toggle('dw-cal-btn',          !ds.calConnected);
    _toggle('dw-tasks-disconnect',  ds.tasksConnected);
    _toggle('dw-tasks-btn',        !ds.tasksConnected);
  }

  function _toggle(id, show) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle('hidden', !show);
  }

  // ── Disconnect ────────────────────────────────
  function disconnectCal() {
    ds.calConnected = false;
    ds.calEvents    = [];
    if (!ds.tasksConnected && ds.calToken) {
      google.accounts.oauth2.revoke(ds.calToken, () => {});
      ds.calToken = null;
    }
    _updateButtons();
    document.getElementById('dw-cal-content').innerHTML =
      `<button class="dw-connect-btn" id="dw-cal-btn" onclick="dashboardWidget._requestToken()">התחבר ל-Google Calendar</button>`;
  }

  function disconnectTasks() {
    ds.tasksConnected = false;
    ds.tasks    = [];
    ds.taskLists = [];
    if (!ds.calConnected && ds.calToken) {
      google.accounts.oauth2.revoke(ds.calToken, () => {});
      ds.calToken = null;
    }
    _updateButtons();
    document.getElementById('dw-tasks-content').innerHTML =
      `<button class="dw-connect-btn" id="dw-tasks-btn" onclick="dashboardWidget._requestToken()">התחבר ל-Google Tasks</button>`;
  }

  // ── Calendar ──────────────────────────────────
  async function _loadCalendar(token) {
    const wrapper = document.getElementById('dw-cal-content');
    wrapper.innerHTML = _skeletons(3);
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
    const wrapper = document.getElementById('dw-tasks-content');
    wrapper.innerHTML = _skeletons(3);
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
    _renderTasks();
  }

  function _renderTasks() {
    const wrapper = document.getElementById('dw-tasks-content');
    if (!ds.tasks.length) {
      wrapper.innerHTML = `<div class="empty-state" style="padding:2rem;text-align:center;color:var(--text-secondary)">אין משימות פתוחות</div>`;
      return;
    }
    const today = new Date(); today.setHours(0,0,0,0);
    wrapper.innerHTML = ds.tasks.map(t => {
      const due  = t.due ? new Date(t.due) : null;
      const days = due ? Math.round((due - today) / 86400000) : null;
      let dueLabel = '', dueClass = '';
      if (due !== null) {
        if      (days < 0)   { dueLabel = `פג לפני ${Math.abs(days)} ימים`; dueClass = 'overdue'; }
        else if (days === 0) { dueLabel = 'היום';  dueClass = 'urgent'; }
        else if (days === 1) { dueLabel = 'מחר';   dueClass = 'urgent'; }
        else                 { dueLabel = _fmtDate(t.due.split('T')[0]); dueClass = ''; }
      }

      return `
        <div class="homework-item ${dueClass}" id="dw-task-${t.id}" style="margin-bottom:0.5rem">
          <div class="homework-header">
            <input type="checkbox" class="checkbox" onchange="dashboardWidget.completeTask('${t.id}', '${t.listId}', this)">
            <div class="homework-content">
              <div class="homework-badges">
                <span class="badge" style="background:#6366f1">${_esc(t.listTitle)}</span>
              </div>
              <div class="homework-title">${_esc(t.title || 'ללא כותרת')}</div>
              ${dueLabel ? `<div class="homework-meta"><span class="days-left ${dueClass}">${dueLabel}</span></div>` : ''}
            </div>
          </div>
        </div>`;
    }).join('');
  }

  async function completeTask(taskId, listId, checkbox) {
    checkbox.disabled = true;
    try {
      // 1. עדכן ב-Google Tasks
      await fetch(
        `https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks/${taskId}`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${ds.calToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'completed' }),
        }
      );

      // 2. אם קשור ל-homework — עדכן ב-Firestore דרך storage
      const linkedHw = (window.homework || []).find(h => h.googleTaskId === taskId);
      if (linkedHw) {
        linkedHw.completed   = true;
        linkedHw.completedAt = new Date().toISOString();
        if (typeof saveData === 'function') saveData();
        if (typeof render === 'function')   render();
      }

      // 3. הסר מה-state ורנדר מחדש
      ds.tasks = ds.tasks.filter(t => t.id !== taskId);
      setTimeout(() => _renderTasks(), 400);
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

  function _fmtDate(d) {
    return new Date(d + 'T00:00:00').toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });
  }

  return { init, disconnectCal, disconnectTasks, completeTask, _requestToken };

})();
