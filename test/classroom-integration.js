// Google Classroom Integration
// ================================
// שואב משימות אוטומטית מ-Google Classroom

const classroomIntegration = (() => {

  const CLIENT_ID = window.GOOGLE_CLIENT_ID || ''; // יש להגדיר ב-config.js
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

    // טעינת Google Identity Services
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = () => {
      console.log('✅ Classroom: Google Identity Services loaded');
      _setupTokenClient();
    };
    script.onerror = () => {
      console.warn('⚠️ Classroom: Failed to load Google Identity Services');
    };
    document.head.appendChild(script);

    // שחזר טוקן שמור אם קיים
    const saved = localStorage.getItem('classroom_token');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.expires_at && Date.now() < parsed.expires_at) {
          accessToken = parsed.token;
          console.log('✅ Classroom: Restored saved token');
          _updateSyncButton(true);
        } else {
          localStorage.removeItem('classroom_token');
        }
      } catch (e) {
        localStorage.removeItem('classroom_token');
      }
    }
  }

  function _setupTokenClient() {
    if (!window.google || !window.google.accounts) return;
    if (!CLIENT_ID) {
      console.warn('⚠️ Classroom: No CLIENT_ID set. Set window.GOOGLE_CLIENT_ID before initialization.');
      return;
    }

    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (tokenResponse) => {
        if (tokenResponse.error) {
          console.error('❌ Classroom: OAuth error:', tokenResponse.error);
          _showError('שגיאה בהתחברות ל-Google Classroom');
          return;
        }

        accessToken = tokenResponse.access_token;
        const expires_at = Date.now() + (tokenResponse.expires_in * 1000);
        localStorage.setItem('classroom_token', JSON.stringify({ token: accessToken, expires_at }));

        console.log('✅ Classroom: Got access token');
        _updateSyncButton(true);
        syncHomework();
      }
    });

    console.log('✅ Classroom: Token client ready');
  }

  // ==================== סנכרון ====================

  async function syncHomework() {
    if (isSyncing) return;

    if (!accessToken) {
      // בקש הרשאה
      if (tokenClient) {
        tokenClient.requestAccessToken({ prompt: '' });
      } else {
        _showError('Google Classroom לא מאותחל. נסה שוב בעוד רגע.');
      }
      return;
    }

    isSyncing = true;
    _setSyncButtonLoading(true);
    console.log('🔄 Classroom: Starting sync...');

    try {
      const courses = await _fetchCourses();
      if (!courses.length) {
        _showNotification('לא נמצאו קורסים ב-Google Classroom', 'info');
        return;
      }

      let totalImported = 0;
      let totalSkipped = 0;

      for (const course of courses) {
        const { imported, skipped } = await _syncCourseWork(course);
        totalImported += imported;
        totalSkipped += skipped;
      }

      await saveData();
      render();

      const msg = totalImported > 0
        ? `✅ יובאו ${totalImported} משימות חדשות מ-Google Classroom${totalSkipped > 0 ? ` (${totalSkipped} כבר קיימות)` : ''}`
        : `Google Classroom: אין משימות חדשות לייבא`;

      _showNotification(msg, totalImported > 0 ? 'success' : 'info');
      console.log(`✅ Classroom: Sync complete. Imported: ${totalImported}, Skipped: ${totalSkipped}`);

    } catch (err) {
      console.error('❌ Classroom: Sync failed:', err);

      if (err.status === 401) {
        // הטוקן פג - בקש מחדש
        accessToken = null;
        localStorage.removeItem('classroom_token');
        _updateSyncButton(false);
        _showError('פג תוקף ההתחברות ל-Classroom. התחבר מחדש.');
      } else {
        _showError('שגיאה בסנכרון עם Google Classroom');
      }
    } finally {
      isSyncing = false;
      _setSyncButtonLoading(false);
    }
  }

  async function _fetchCourses() {
    const res = await _apiCall('https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE');
    return res.courses || [];
  }

  async function _syncCourseWork(course) {
    let imported = 0;
    let skipped = 0;

    try {
      // שליפת מטלות
      const cwRes = await _apiCall(
        `https://classroom.googleapis.com/v1/courses/${course.id}/courseWork?orderBy=dueDate%20desc&pageSize=20`
      );
      const courseWorks = cwRes.courseWorkStates ? [] : (cwRes.courseWork || []);

      // שליפת סטטוס הגשות
      let submissions = {};
      try {
        const subRes = await _apiCall(
          `https://classroom.googleapis.com/v1/courses/${course.id}/courseWork/-/studentSubmissions?states=CREATED,RECLAIMED_BY_STUDENT,TURNED_IN`
        );
        (subRes.studentSubmissions || []).forEach(sub => {
          submissions[sub.courseWorkId] = sub.state;
        });
      } catch (e) {
        console.warn(`⚠️ Classroom: Could not fetch submissions for course ${course.name}`);
      }

      for (const cw of courseWorks) {
        // בדוק אם כבר קיים
        const alreadyExists = homework.some(h => h.classroomId === cw.id);
        if (alreadyExists) {
          skipped++;
          continue;
        }

        // הפוך לפורמט של האפליקציה
        const hw = _courseWorkToHomework(cw, course, submissions[cw.id]);
        if (hw) {
          homework.push(hw);
          imported++;
        }
      }
    } catch (err) {
      console.warn(`⚠️ Classroom: Error syncing course ${course.name}:`, err);
    }

    return { imported, skipped };
  }

  function _courseWorkToHomework(cw, course, submissionState) {
    // מצא או צור מקצוע תואם
    let subject = subjects.find(s =>
      s.name.trim().toLowerCase() === course.name.trim().toLowerCase()
    );

    if (!subject) {
      // צור מקצוע חדש עם צבע אקראי
      const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
      const usedColors = subjects.map(s => s.color);
      const freeColor = colors.find(c => !usedColors.includes(c)) || colors[subjects.length % colors.length];

      subject = {
        id: 'classroom_' + course.id,
        name: course.name,
        color: freeColor,
        fromClassroom: true
      };
      subjects.push(subject);
      console.log(`➕ Classroom: Created new subject: ${course.name}`);
    }

    // תאריך יעד
    let dueDate = '';
    if (cw.dueDate) {
      const { year, month, day } = cw.dueDate;
      dueDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    // סטטוס הגשה
    const isCompleted = submissionState === 'TURNED_IN';

    return {
      id: Date.now() + Math.random(),
      classroomId: cw.id,
      courseId: course.id,
      subject: subject.id,
      title: cw.title || 'מטלה ללא שם',
      description: cw.description || '',
      dueDate: dueDate,
      completed: isCompleted,
      completedAt: isCompleted ? new Date().toISOString() : null,
      priority: _guessPriority(dueDate),
      tags: ['Classroom'],
      createdAt: cw.creationTime || new Date().toISOString(),
      wasEarly: false,
      classroomLink: cw.alternateLink || '',
      fromClassroom: true
    };
  }

  function _guessPriority(dueDateStr) {
    if (!dueDateStr) return 'medium';
    const days = Math.ceil((new Date(dueDateStr) - new Date()) / 86400000);
    if (days <= 1) return 'high';
    if (days <= 3) return 'medium';
    return 'low';
  }

  // ==================== API Helper ====================

  async function _apiCall(url) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!res.ok) {
      const err = new Error(`API error ${res.status}`);
      err.status = res.status;
      throw err;
    }

    return res.json();
  }

  // ==================== UI ====================

  function _updateSyncButton(connected) {
    const btn = document.getElementById('classroom-sync-btn');
    if (!btn) return;
    if (connected) {
      btn.title = 'סנכרן עם Google Classroom';
      btn.classList.add('classroom-connected');
    } else {
      btn.title = 'התחבר ל-Google Classroom';
      btn.classList.remove('classroom-connected');
    }
  }

  function _setSyncButtonLoading(loading) {
    const btn = document.getElementById('classroom-sync-btn');
    if (!btn) return;
    btn.disabled = loading;
    const use = btn.querySelector('svg use');
    if (use) {
      use.setAttribute('href', loading ? '#loader' : '#classroom-icon');
    }
    btn.style.opacity = loading ? '0.6' : '1';
  }

  function _showNotification(msg, type = 'info') {
    if (notifications && notifications.showInAppNotification) {
      notifications.showInAppNotification(msg, type);
    } else {
      alert(msg);
    }
  }

  function _showError(msg) {
    _showNotification('❌ ' + msg, 'error');
  }

  // ==================== הוספת כפתור לממשק ====================

  function addSyncButton() {
    const headerActions = document.querySelector('.header-actions');
    if (!headerActions || document.getElementById('classroom-sync-btn')) return;

    // הוסף SVG אייקון של Classroom
    const svgDefs = document.querySelector('svg defs') || document.querySelector('svg');
    if (svgDefs) {
      const classroomSymbol = document.createElementNS('http://www.w3.org/2000/svg', 'symbol');
      classroomSymbol.setAttribute('id', 'classroom-icon');
      classroomSymbol.setAttribute('viewBox', '0 0 24 24');
      classroomSymbol.innerHTML = `
        <path fill="currentColor" d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z"/>
      `;
      const loaderSymbol = document.createElementNS('http://www.w3.org/2000/svg', 'symbol');
      loaderSymbol.setAttribute('id', 'loader');
      loaderSymbol.setAttribute('viewBox', '0 0 24 24');
      loaderSymbol.innerHTML = `
        <path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
          <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
        </path>
      `;
      svgDefs.appendChild(classroomSymbol);
      svgDefs.appendChild(loaderSymbol);
    }

    const btn = document.createElement('button');
    btn.className = 'settings-btn';
    btn.id = 'classroom-sync-btn';
    btn.title = accessToken ? 'סנכרן עם Google Classroom' : 'התחבר ל-Google Classroom';
    btn.innerHTML = `
      <svg width="24" height="24"><use href="#classroom-icon"></use></svg>
    `;
    if (accessToken) btn.classList.add('classroom-connected');

    btn.addEventListener('click', syncHomework);

    // הכנס לפני כפתור ההגדרות
    const settingsBtn = document.getElementById('open-settings');
    if (settingsBtn) {
      headerActions.insertBefore(btn, settingsBtn);
    } else {
      headerActions.appendChild(btn);
    }

    // הוסף CSS
    const style = document.createElement('style');
    style.textContent = `
      #classroom-sync-btn.classroom-connected svg {
        color: #34a853;
      }
      #classroom-sync-btn:hover svg {
        color: #4285f4;
      }
      .classroom-badge {
        display: inline-block;
        background: #e8f0fe;
        color: #4285f4;
        font-size: 0.65rem;
        padding: 1px 5px;
        border-radius: 4px;
        margin-right: 4px;
        vertical-align: middle;
      }
      .dark-mode .classroom-badge {
        background: #1e3a5f;
        color: #7eb3f7;
      }
    `;
    document.head.appendChild(style);

    console.log('✅ Classroom: Sync button added to header');
  }

  // ==================== Public API ====================

  return {
    initialize,
    syncHomework,
    addSyncButton,
    get isConnected() { return !!accessToken; }
  };

})();

// אתחול אוטומטי לאחר טעינת הדף
document.addEventListener('DOMContentLoaded', () => {
  classroomIntegration.initialize();
  classroomIntegration.addSyncButton();
});

// גם אם DOMContentLoaded כבר עבר
if (document.readyState !== 'loading') {
  classroomIntegration.initialize();
  classroomIntegration.addSyncButton();
}

console.log('📚 Google Classroom Integration loaded');
