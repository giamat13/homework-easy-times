// Google Classroom Integration
// ================================

const classroomIntegration = (() => {

  const CLIENT_ID = window.GOOGLE_CLIENT_ID || '';
  const SCOPES = [
    'https://www.googleapis.com/auth/classroom.coursework.me.readonly',
    'https://www.googleapis.com/auth/classroom.courses.readonly',
    'https://www.googleapis.com/auth/classroom.student-submissions.me.readonly',
    'https://www.googleapis.com/auth/classroom.topics.readonly'
  ].join(' ');

  let tokenClient   = null;
  let accessToken   = null;
  let isSyncing     = false;
  let cachedCourses = [];
  // cachedTopics: { [courseId]: [ {topicId, name}, ... ] }
  let cachedTopics  = {};

  // מיפוי: key → subjectId
  // key יכול להיות:
  //   "course:{courseId}"         — כל הקורס
  //   "topic:{courseId}:{topicId}" — topic ספציפי
  // topic גובר על קורס
  let mapping = {};

  // ==================== אתחול ====================

  function initialize() {
    console.log('📚 Classroom: Initializing...');
    _injectSvgIcons();
    _injectStyles();

    const saved = localStorage.getItem('classroom_token');
    if (saved) {
      try {
        const p = JSON.parse(saved);
        if (p.expires_at && Date.now() < p.expires_at) {
          accessToken = p.token;
          console.log('✅ Classroom: Restored saved token');
        } else { localStorage.removeItem('classroom_token'); }
      } catch(e) { localStorage.removeItem('classroom_token'); }
    }

    const savedMapping = localStorage.getItem('classroom_mapping');
    if (savedMapping) {
      try {
        mapping = JSON.parse(savedMapping) || {};
        // remove topics under any ignored course
        Object.keys(mapping).forEach(k => {
          if (k.startsWith('course:') && mapping[k] === 'ignore') {
            const courseId = k.split(':')[1];
            const prefix = `topic:${courseId}:`;
            Object.keys(mapping).forEach(tk => {
              if (tk.startsWith(prefix)) delete mapping[tk];
            });
          }
        });
      } catch(e) {}
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = () => {
      console.log('✅ Classroom: Google Identity Services loaded');
      _setupTokenClient();
    };
    document.head.appendChild(script);
  }

  function _setupTokenClient() {
    if (!window.google || !window.google.accounts || !CLIENT_ID) return;

    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: async (tokenResponse) => {
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
        await _loadCoursesAndTopics();
        _updateSettingsUI();
      }
    });

    if (accessToken) _loadCoursesAndTopics();
    _updateSettingsUI();
    console.log('✅ Classroom: Token client ready');
  }

  // ==================== חיבור / ניתוק ====================

  function connect() {
    if (!tokenClient) { _showError('Google Classroom לא מאותחל. נסה שוב בעוד רגע.'); return; }
    tokenClient.requestAccessToken({ prompt: 'select_account' });
  }

  function disconnect() {
    if (!confirm('להתנתק מ-Google Classroom?\nהמשימות שיובאו ישארו, אך לא יסונכרנו יותר אוטומטית.')) return;
    if (accessToken && window.google && window.google.accounts) {
      window.google.accounts.oauth2.revoke(accessToken, () => console.log('✅ Classroom: Token revoked'));
    }
    accessToken = null;
    cachedCourses = [];
    cachedTopics = {};
    localStorage.removeItem('classroom_token');
    _updateSettingsUI();
    _showNotification('התנתקת מ-Google Classroom', 'info');
  }

  // ==================== טעינת קורסים + topics ====================

  async function _loadCoursesAndTopics() {
    if (!accessToken) return;

    const mapContainer = document.getElementById('classroom-mapping-container');
    if (mapContainer) mapContainer.innerHTML = `<p style="font-size:0.8rem; color:#6b7280;">טוען קורסים ונושאים...</p>`;

    try {
      const res = await _apiCall('https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE');
      cachedCourses = res.courses || [];

      // טען topics לכל קורס
      for (const course of cachedCourses) {
        try {
          // topics may be paginated; gather all pages
          let allTopics = [];
          let pageToken = '';
          do {
            const url = `https://classroom.googleapis.com/v1/courses/${course.id}/topics?pageSize=100${pageToken ? `&pageToken=${pageToken}` : ''}`;
            const tRes = await _apiCall(url);
            allTopics = allTopics.concat(tRes.topics || []);
            pageToken = tRes.nextPageToken || '';
          } while (pageToken);
          cachedTopics[course.id] = allTopics.map(t => ({ topicId: t.topicId, name: t.name }));
          console.log(`📚 Classroom: Course "${course.name}" has ${cachedTopics[course.id].length} topics`);
        } catch(e) {
          console.warn(`⚠️ Classroom: Could not load topics for ${course.name}:`, e.message);
          cachedTopics[course.id] = [];
        }
      }

      _renderMappingTable();
    } catch(e) {
      console.warn('⚠️ Classroom: Could not load courses/topics', e);
      if (mapContainer) mapContainer.innerHTML = `<p style="font-size:0.8rem; color:#dc2626;">שגיאה בטעינת קורסים. נסה להתנתק ולהתחבר מחדש.</p>`;
    }
  }

  // ==================== שמירת מיפוי ====================

  function _saveMapping() {
    localStorage.setItem('classroom_mapping', JSON.stringify(mapping));
  }

  function setCourseMapping(courseId, subjectId) {
    // if ignoring a course, clear topic mappings underneath to avoid confusion
    if (subjectId === 'ignore') {
      const prefix = `topic:${courseId}:`;
      Object.keys(mapping).forEach(k => {
        if (k.startsWith(prefix)) delete mapping[k];
      });
    }
    mapping['course:' + courseId] = subjectId;
    _saveMapping();
  }

  function setTopicMapping(courseId, topicId, subjectId) {
    const key = `topic:${courseId}:${topicId}`;
    if (subjectId === 'inherit') {
      delete mapping[key]; // חזור לברירת מחדל של הקורס
    } else {
      mapping[key] = subjectId;
    }
    _saveMapping();
  }

  // ==================== טבלת מיפוי ====================

  function _renderMappingTable() {
    const container = document.getElementById('classroom-mapping-container');
    if (!container || !cachedCourses.length) return;

    const subjectOptions = (selected, includeInherit = false, inheritLabel = '', includeIgnore = false) => {
      let ignoreOpt = '';
      if (includeIgnore) {
        ignoreOpt = `<option value="ignore" ${selected === 'ignore' ? 'selected' : ''}>🚫 התעלם מכיתה זו</option>`;
      }
      const inherit = includeInherit
        ? `<option value="inherit" ${selected === 'inherit' || !selected ? 'selected' : ''}>${inheritLabel}</option>`
        : `<option value="new" ${selected === 'new' || !selected ? 'selected' : ''}>➕ צור מקצוע חדש</option>`;
      return ignoreOpt + inherit + subjects.map(s =>
        `<option value="${s.id}" ${selected === s.id ? 'selected' : ''}>${s.name}</option>`
      ).join('');
    };

    const rows = cachedCourses.map(course => {
      const courseKey    = 'course:' + course.id;
      const courseMapped = mapping[courseKey] || 'new';
      const topics       = cachedTopics[course.id] || [];

      // שורת קורס
      let html = `
        <tr style="background:rgba(59,130,246,0.05);">
          <td style="padding:0.4rem 0.5rem; font-size:0.85rem; font-weight:600;">
            📚 ${course.name}
          </td>
          <td style="padding:0.4rem 0.5rem;">
            <select class="input" style="padding:0.25rem 0.5rem; font-size:0.8rem; width:100%;"
              onchange="classroomIntegration.setCourseMapping('${course.id}', this.value)">
              ${subjectOptions(courseMapped, false, '', true)}
            </select>
          </td>
        </tr>`;

      // שורות topics – בדרך כלל, אלא אם משתמש בחר להתעלם מהקורס
      if (courseMapped !== 'ignore') {
        topics.forEach(t => {
          const topicKey    = `topic:${course.id}:${t.topicId}`;
          const topicMapped = mapping[topicKey] || 'inherit';
          const inheritName = subjects.find(s => s.id === courseMapped)?.name || 'כמו הקורס';

          html += `
            <tr>
              <td style="padding:0.3rem 0.5rem 0.3rem 1.5rem; font-size:0.8rem; color:#6b7280;">
                ↳ ${t.name}
              </td>
              <td style="padding:0.3rem 0.5rem;">
                <select class="input" style="padding:0.2rem 0.4rem; font-size:0.78rem; width:100%;"
                  onchange="classroomIntegration.setTopicMapping('${course.id}', '${t.topicId}', this.value)">
                  ${subjectOptions(topicMapped, true, `↑ כמו הקורס (${inheritName})`, true)}
                </select>
              </td>
            </tr>`;
        });
      } else {
        // show a small note row indicating topics are ignored
        html += `
          <tr>
            <td colspan="2" style="padding:0.3rem 0.5rem; font-size:0.75rem; color:#9ca3af;">
              נושאים לא יוצגו כאשר הכיתה מואנשת.
            </td>
          </tr>`;
      }

      return html;
    }).join('');

    container.innerHTML = `
      <p style="font-size:0.8rem; color:#6b7280; margin-bottom:0.5rem;">
        שייך קורסים ו/או נושאים למקצועות. נושא גובר על הקורס.
      </p>
      <table style="width:100%; border-collapse:collapse;">
        <thead>
          <tr>
            <th style="text-align:right; font-size:0.8rem; color:#6b7280; padding:0.25rem 0.5rem; border-bottom:1px solid #e5e7eb;">קורס / נושא</th>
            <th style="text-align:right; font-size:0.8rem; color:#6b7280; padding:0.25rem 0.5rem; border-bottom:1px solid #e5e7eb;">מקצוע</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  // ==================== סנכרון ====================

  async function syncIfConnected() {
    if (!accessToken) return false;
    return await _doSync();
  }

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
      const courses = await _apiCall('https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE');
      cachedCourses = courses.courses || [];
      if (!cachedCourses.length) {
        _showNotification('לא נמצאו קורסים ב-Google Classroom', 'info');
        return true;
      }

      let totalImported = 0, totalSkipped = 0, totalUpdated = 0;
      for (const course of cachedCourses) {
        // עדכן topics תוך כדי סנכרון
        try {
          // paginate topics during sync as well
          let allTopics = [];
          let pageToken = '';
          do {
            const url = `https://classroom.googleapis.com/v1/courses/${course.id}/topics?pageSize=100${pageToken ? `&pageToken=${pageToken}` : ''}`;
            const tRes = await _apiCall(url);
            allTopics = allTopics.concat(tRes.topics || []);
            pageToken = tRes.nextPageToken || '';
          } while (pageToken);
          cachedTopics[course.id] = allTopics.map(t => ({ topicId: t.topicId, name: t.name }));
        } catch(e) { cachedTopics[course.id] = cachedTopics[course.id] || []; }

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

    } catch(err) {
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

  async function _syncCourseWork(course) {
    let imported = 0, skipped = 0, updated = 0;

    // if the entire course is ignored, bail out early
    const courseKey = 'course:' + course.id;
    if (mapping[courseKey] === 'ignore') {
      console.log(`🔕 Classroom: skipping ignored course ${course.name}`);
      return { imported: 0, skipped: 0, updated: 0 };
    }

    try {
      const cwRes = await _apiCall(
        `https://classroom.googleapis.com/v1/courses/${course.id}/courseWork?orderBy=dueDate%20desc&pageSize=20`
      );
      const courseWorks = cwRes.courseWork || [];

      // שלוף הגשות לכל מטלה
      let submissions = {};
      for (const cw of courseWorks) {
        try {
          const subRes = await _apiCall(
            `https://classroom.googleapis.com/v1/courses/${course.id}/courseWork/${cw.id}/studentSubmissions`
          );
          (subRes.studentSubmissions || []).forEach(sub => {
            submissions[sub.courseWorkId] = sub.state;
          });
        } catch(e) {}
      }

      for (const cw of courseWorks) {
        const existingIdx = homework.findIndex(h => h.classroomId === cw.id);

        if (existingIdx !== -1) {
          const existing      = homework[existingIdx];
          const isNowCompleted = submissions[cw.id] === 'TURNED_IN';
          if (!existing._manuallyEdited && existing.completed !== isNowCompleted) {
            homework[existingIdx].completed   = isNowCompleted;
            homework[existingIdx].completedAt = isNowCompleted ? new Date().toISOString() : null;
            updated++;
          } else { skipped++; }
          continue;
        }

        const hw = await _courseWorkToHomework(cw, course, submissions[cw.id]);
        if (hw) {
          homework.push(hw);
          imported++;
        } else {
          skipped++;
        }
      }
    } catch(err) {
      console.warn(`⚠️ Classroom: Error syncing course ${course.name}:`, err);
    }

    return { imported, skipped, updated };
  }

  // course: Classroom course resource
  // topicId: id from coursework
  // topicName: optional name guess (e.g. from homework data or fetched single-topic request)
  function _resolveSubject(course, topicId, topicName) {
    console.log('🔍 resolveSubject', { courseId: course.id, topicId, topicName });
    // 0. אם קיבלנו שם גלוי, נסה אותו לפני הכול
    if (topicName) {
      const byTopicName = subjects.find(s =>
        s.name.trim().toLowerCase() === topicName.trim().toLowerCase()
      );
      console.log('🔤 resolveSubject check name fallback', topicName, '->', byTopicName && byTopicName.id);
      if (byTopicName) return byTopicName;
    }

    // 1. נסה topic ספציפי במיפוי
    if (topicId) {
      const topicKey = `topic:${course.id}:${topicId}`;
      const topicMapped = mapping[topicKey];
      if (topicMapped) {
        if (topicMapped === 'ignore') return null;
        if (topicMapped !== 'inherit') {
          const s = subjects.find(s => s.id === topicMapped);
          if (s) return s;
        }
      }
    }

    // 2. נסה מיפוי קורס
    const courseKey    = 'course:' + course.id;
    const courseMapped = mapping[courseKey];
    if (courseMapped) {
      if (courseMapped === 'ignore') return null;
      if (courseMapped !== 'new') {
        const s = subjects.find(s => s.id === courseMapped);
        if (s) return s;
      }
    }

    // 3. נסה לפי שם קורס
    const byName = subjects.find(s =>
      s.name.trim().toLowerCase() === course.name.trim().toLowerCase()
    );
    if (byName) return byName;

    // 4. נסה לפי שם topic מקוטלג
    if (topicId) {
      const topicData = (cachedTopics[course.id] || []).find(t => t.topicId === topicId);
      if (topicData) {
        const byTopicName2 = subjects.find(s =>
          s.name.trim().toLowerCase() === topicData.name.trim().toLowerCase()
        );
        if (byTopicName2) return byTopicName2;
      }
    }

    // 5. צור חדש — לפי שם topic אם יש, אחרת לפי שם קורס
    const topicData = topicId && (cachedTopics[course.id] || []).find(t => t.topicId === topicId);
    const newName   = topicData ? topicData.name : (topicName || course.name);
    const newId     = topicData ? `classroom_topic_${topicId}` : `classroom_${course.id}`;

    const palette = ['#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6','#ec4899','#06b6d4'];
    const used    = subjects.map(s => s.color);
    const color   = palette.find(c => !used.includes(c)) || palette[subjects.length % palette.length];

    const newSubject = { id: newId, name: newName, color, fromClassroom: true };
    subjects.push(newSubject);

    // שמור מיפוי אוטומטי
    if (topicData) {
      mapping[`topic:${course.id}:${topicId}`] = newId;
    } else {
      mapping['course:' + course.id] = newId;
    }
    _saveMapping();
    console.log(`➕ Classroom: Created new subject: ${newName}`);
    return newSubject;
  }

  async function _courseWorkToHomework(cw, course, submissionState) {
    console.log('🔄 Classroom: converting coursework', cw.id, 'course', course.id, 'topicId', cw.topicId, 'topic', cw.topic);
    // pull any topic name already included in the coursework payload
    const cwTopicName = cw.topic && cw.topic.name ? cw.topic.name : null;
    if (cwTopicName) console.log('🔤 Classroom: coursework provided topic name', cwTopicName);

    // initial resolution; provide cwTopicName if available
    let subject = _resolveSubject(course, cw.topicId, cwTopicName);
    console.log('🧠 Classroom: subject after initial resolve', subject && subject.id);

    // if we couldn't resolve and there is a topicId, try fetching the single topic entry
    if (!subject && cw.topicId) {
      try {
        const tRes = await _apiCall(
          `https://classroom.googleapis.com/v1/courses/${course.id}/topics/${cw.topicId}`
        );
        if (tRes && tRes.name) {
          // cache result
          cachedTopics[course.id] = cachedTopics[course.id] || [];
          if (!cachedTopics[course.id].some(t => t.topicId === cw.topicId)) {
            cachedTopics[course.id].push({ topicId: cw.topicId, name: tRes.name });
          }
          // retry resolution now that we know the name
          subject = _resolveSubject(course, cw.topicId, tRes.name);
        }
      } catch(e) {
        // ignore permission errors or other failures
      }
    }

    // fallback: match subject name to topicId string itself
    if (!subject && cw.topicId) {
      const byIdName = subjects.find(s =>
        s.name.trim().toLowerCase() === cw.topicId.trim().toLowerCase()
      );
      if (byIdName) subject = byIdName;
    }

    if (!subject) return null; // nothing to do (either ignored or unresolvable)

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
      topicId: cw.topicId || null,
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

  // ==================== UI ====================

  function _updateSettingsUI() {
    const container = document.getElementById('classroom-settings-container');
    if (!container) return;

    if (accessToken) {
      container.innerHTML = `
        <div class="classroom-status connected">
          <span class="classroom-status-dot"></span>
          מחובר ל-Google Classroom
        </div>
        <div class="setting-item" style="display:flex; gap:0.5rem; flex-wrap:wrap; margin-bottom:1rem;">
          <button class="btn btn-primary" onclick="classroomIntegration.syncHomework()">
            <svg width="18" height="18"><use href="#classroom-icon"></use></svg>
            סנכרן עכשיו
          </button>
          <button class="btn btn-secondary" onclick="classroomIntegration.disconnect()" style="color:#dc2626; border-color:#dc2626;">
            התנתק
          </button>
        </div>
        <div id="classroom-mapping-container"></div>`;

      if (cachedCourses.length) {
        _renderMappingTable();
      } else {
        document.getElementById('classroom-mapping-container').innerHTML =
          `<p style="font-size:0.8rem; color:#6b7280;">טוען קורסים...</p>`;
        _loadCoursesAndTopics();
      }
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
      #classroom-mapping-container table { font-size:0.82rem; }
      #classroom-mapping-container tbody tr:hover td { background:rgba(0,0,0,0.02); }
      .dark-mode #classroom-mapping-container tbody tr:hover td { background:rgba(255,255,255,0.04); }
    `;
    document.head.appendChild(s);
  }

  return {
    initialize,
    syncHomework,
    syncIfConnected,
    connect,
    disconnect,
    setCourseMapping,
    setTopicMapping,
    refreshSettingsUI: () => {
      _updateSettingsUI();
      if (accessToken && !cachedCourses.length) _loadCoursesAndTopics();
    },
    get isConnected() { return !!accessToken; }
  };

})();

document.addEventListener('DOMContentLoaded', () => classroomIntegration.initialize());
if (document.readyState !== 'loading') classroomIntegration.initialize();

console.log('📚 Google Classroom Integration loaded');