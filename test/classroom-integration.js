// Google Classroom Integration
// ================================

const classroomIntegration = (() => {

  const CLIENT_ID = window.GOOGLE_CLIENT_ID || '';
  const SCOPES = [
    'https://www.googleapis.com/auth/classroom.coursework.me.readonly',
    'https://www.googleapis.com/auth/classroom.courses.readonly',
    'https://www.googleapis.com/auth/classroom.student-submissions.me.readonly'
  ].join(' ');

  let tokenClient = null;
  let accessToken = null;
  let isSyncing = false;

  // ==================== אתחול ====================

  function initialize() {
    console.log('📚 Classroom: Initializing...');
    _injectSvgIcons();
    _injectStyles();

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = () => {
      console.log('✅ Classroom: Google Identity Services loaded');
      _setupTokenClient();
    };
    document.head.appendChild(script);

    // שחזר טוקן שמור
    const saved = localStorage.getItem('classroom_token');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.expires_at && Date.now() < parsed.expires_at) {
          accessToken = parsed.token;
          console.log('✅ Classroom: Restored saved token');
        } else {
          localStorage.removeItem('classroom_token');
        }
      } catch (e) {
        localStorage.removeItem('classroom_token');
      }
    }
  }

  function _setupTokenClient() {
    if (!window.google || !window.google.accounts || !CLIENT_ID) return;

    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (tokenResponse) => {
        if (tokenResponse.error) {
          console.error('❌ Classroom: OAuth error:', tokenResponse.error);
          _showError('שגיאה בהתחברות ל-Google Classroom');
          _updateSettingsUI();
          return;
        }
        accessToken = tokenResponse.access_token;
        const expires_at = Date.now() + (tokenResponse.expires_in * 1000);
        localStorage.setItem('classroom_token', JSON.stringify({ token: accessToken, expires_at }));
        console.log('✅ Classroom: Got access token');
        _updateSettingsUI();
        syncHomework();
      }
    });

    _updateSettingsUI();
    console.log('✅ Classroom: Token client ready');
  }

  // ==================== חיבור / ניתוק ====================

  function connect() {
    if (!tokenClient) {
      _showError('Google Classroom לא מאותחל. נסה שוב בעוד רגע.');
      return;
    }
    tokenClient.requestAccessToken({ prompt: 'select_account' });
  }

  function disconnect() {
    if (!confirm('להתנתק מ-Google Classroom?\nהמשימות שיובאו ישארו, אך לא יסונכרנו יותר אוטומטית.')) return;

    if (accessToken && window.google && window.google.accounts) {
      window.google.accounts.oauth2.revoke(accessToken, () => {
        console.log('✅ Classroom: Token revoked');
      });
    }

    accessToken = null;
    localStorage.removeItem('classroom_token');
    _updateSettingsUI();
    _showNotification('התנתקת מ-Google Classroom', 'info');
  }

  // ==================== סנכרון ====================

  // סנכרון שקט — נקרא מ-syncAndRefresh, לא מבקש login
  async function syncIfConnected() {
    if (!accessToken) return false;
    return await _doSync();
  }

  // סנכרון מלא — מבקש login אם צריך
  async function syncHomework() {
    if (isSyncing) return;
    if (!accessToken) { connect(); return; }
    await _doSync();
  }

  async function _doSync() {
    if (isSyncing) return false;
    isSyncing = true;
    console.log('🔄 Classroom: Starting sync...');

    try {
      const courses = await _fetchCourses();
      if (!courses.length) {
        _showNotification('לא נמצאו קורסים ב-Google Classroom', 'info');
        return true;
      }

      let totalImported = 0, totalSkipped = 0, totalUpdated = 0;

      for (const course of courses) {
        const r = await _syncCourseWork(course);
        totalImported += r.imported;
        totalSkipped  += r.skipped;
        totalUpdated  += r.updated;
      }

      if (totalImported > 0 || totalUpdated > 0) {
        await saveData();
        render();
      }

      const parts = [];
      if (totalImported > 0) parts.push(`${totalImported} חדשות`);
      if (totalUpdated  > 0) parts.push(`${totalUpdated} עודכנו`);
      if (totalSkipped  > 0) parts.push(`${totalSkipped} ללא שינוי`);
      _showNotification(
        `📚 Classroom: ${parts.length ? parts.join(', ') : 'אין שינויים'}`,
        totalImported > 0 ? 'success' : 'info'
      );
      return true;

    } catch (err) {
      console.error('❌ Classroom: Sync failed:', err);
      if (err.status === 401) {
        accessToken = null;
        localStorage.removeItem('classroom_token');
        _updateSettingsUI();
        _showError('פג תוקף ההתחברות ל-Classroom. התחבר מחדש בהגדרות.');
      } else {
        _showError('שגיאה בסנכרון עם Google Classroom');
      }
      return false;
    } finally {
      isSyncing = false;
    }
  }

  async function _fetchCourses() {
    const res = await _apiCall('https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE');
    return res.courses || [];
  }

  async function _syncCourseWork(course) {
    let imported = 0, skipped = 0, updated = 0;

    try {
      const cwRes = await _apiCall(
        `https://classroom.googleapis.com/v1/courses/${course.id}/courseWork?orderBy=dueDate%20desc&pageSize=20`
      );
      const courseWorks = cwRes.courseWork || [];

      let submissions = {};
      try {
        const subRes = await _apiCall(
          `https://classroom.googleapis.com/v1/courses/${course.id}/courseWork/-/studentSubmissions?states=CREATED,RECLAIMED_BY_STUDENT,TURNED_IN`
        );
        (subRes.studentSubmissions || []).forEach(sub => {
          submissions[sub.courseWorkId] = sub.state;
        });
      } catch (e) {
        console.warn(`⚠️ Classroom: Could not fetch submissions for ${course.name}`);
      }

      for (const cw of courseWorks) {
        // ── מניעת כפילויות לפי classroomId ──
        const existingIdx = homework.findIndex(h => h.classroomId === cw.id);

        if (existingIdx !== -1) {
          // משימה קיימת — עדכן סטטוס הגשה אם השתנה ולא נערכה ידנית
          const existing = homework[existingIdx];
          const isNowCompleted = submissions[cw.id] === 'TURNED_IN';
          if (!existing._manuallyEdited && existing.completed !== isNowCompleted) {
            homework[existingIdx].completed    = isNowCompleted;
            homework[existingIdx].completedAt  = isNowCompleted ? new Date().toISOString() : null;
            updated++;
          } else {
            skipped++;
          }
          continue;
        }

        // משימה חדשה
        const hw = _courseWorkToHomework(cw, course, submissions[cw.id]);
        if (hw) { homework.push(hw); imported++; }
      }
    } catch (err) {
      console.warn(`⚠️ Classroom: Error syncing course ${course.name}:`, err);
    }

    return { imported, skipped, updated };
  }

  function _courseWorkToHomework(cw, course, submissionState) {
    let subject = subjects.find(s =>
      s.name.trim().toLowerCase() === course.name.trim().toLowerCase()
    );

    if (!subject) {
      const palette = ['#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6','#ec4899','#06b6d4'];
      const used = subjects.map(s => s.color);
      const color = palette.find(c => !used.includes(c)) || palette[subjects.length % palette.length];
      subject = { id: 'classroom_' + course.id, name: course.name, color, fromClassroom: true };
      subjects.push(subject);
      console.log(`➕ Classroom: Created new subject: ${course.name}`);
    }

    let dueDate = '';
    if (cw.dueDate) {
      const { year, month, day } = cw.dueDate;
      dueDate = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    }

    const isCompleted = submissionState === 'TURNED_IN';

    return {
      id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      classroomId: cw.id,
      courseId: course.id,
      subject: subject.id,
      title: cw.title || 'מטלה ללא שם',
      description: cw.description || '',
      dueDate,
      completed: isCompleted,
      completedAt: isCompleted ? new Date().toISOString() : null,
      priority: _guessPriority(dueDate),
      tags: ['Classroom'],
      createdAt: cw.creationTime || new Date().toISOString(),
      wasEarly: false,
      classroomLink: cw.alternateLink || '',
      fromClassroom: true,
      _manuallyEdited: false
    };
  }

  function _guessPriority(d) {
    if (!d) return 'medium';
    const days = Math.ceil((new Date(d) - new Date()) / 86400000);
    return days <= 1 ? 'high' : days <= 3 ? 'medium' : 'low';
  }

  async function _apiCall(url) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) { const e = new Error(`API error ${res.status}`); e.status = res.status; throw e; }
    return res.json();
  }

  // ==================== UI בהגדרות ====================

  function _updateSettingsUI() {
    const container = document.getElementById('classroom-settings-container');
    if (!container) return;

    if (accessToken) {
      container.innerHTML = `
        <div class="classroom-status connected">
          <span class="classroom-status-dot"></span>
          מחובר ל-Google Classroom
        </div>
        <div class="setting-item" style="display:flex; gap:0.5rem; flex-wrap:wrap;">
          <button class="btn btn-primary" onclick="classroomIntegration.syncHomework()">
            <svg width="18" height="18"><use href="#classroom-icon"></use></svg>
            סנכרן עכשיו
          </button>
          <button class="btn btn-secondary" onclick="classroomIntegration.disconnect()" style="color:#dc2626; border-color:#dc2626;">
            התנתק
          </button>
        </div>`;
    } else {
      container.innerHTML = `
        <div class="classroom-status disconnected">
          <span class="classroom-status-dot"></span>
          לא מחובר
        </div>
        <div class="setting-item">
          <button class="btn btn-primary" onclick="classroomIntegration.connect()">
            <svg width="18" height="18"><use href="#classroom-icon"></use></svg>
            התחבר ל-Google Classroom
          </button>
        </div>`;
    }
  }

  function _showNotification(msg, type = 'info') {
    if (typeof notifications !== 'undefined' && notifications.showInAppNotification) {
      notifications.showInAppNotification(msg, type);
    }
  }
  function _showError(msg) { _showNotification('❌ ' + msg, 'error'); }

  function _injectSvgIcons() {
    const svg = document.querySelector('svg');
    if (!svg || document.getElementById('classroom-icon')) return;
    const sym = document.createElementNS('http://www.w3.org/2000/svg', 'symbol');
    sym.setAttribute('id', 'classroom-icon');
    sym.setAttribute('viewBox', '0 0 24 24');
    sym.innerHTML = `<path fill="currentColor" d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z"/>`;
    svg.appendChild(sym);
  }

  function _injectStyles() {
    if (document.getElementById('classroom-styles')) return;
    const s = document.createElement('style');
    s.id = 'classroom-styles';
    s.textContent = `
      .classroom-status { display:flex; align-items:center; gap:0.5rem; font-size:0.875rem; margin-bottom:0.75rem; font-weight:500; }
      .classroom-status-dot { width:10px; height:10px; border-radius:50%; flex-shrink:0; }
      .classroom-status.connected { color:#16a34a; }
      .classroom-status.connected .classroom-status-dot { background:#16a34a; }
      .classroom-status.disconnected { color:#6b7280; }
      .classroom-status.disconnected .classroom-status-dot { background:#9ca3af; }
      .dark-mode .classroom-status.connected { color:#4ade80; }
      .dark-mode .classroom-status.connected .classroom-status-dot { background:#4ade80; }
    `;
    document.head.appendChild(s);
  }

  return { initialize, syncHomework, syncIfConnected, connect, disconnect, get isConnected() { return !!accessToken; } };

})();

document.addEventListener('DOMContentLoaded', () => classroomIntegration.initialize());
if (document.readyState !== 'loading') classroomIntegration.initialize();

console.log('📚 Google Classroom Integration loaded');