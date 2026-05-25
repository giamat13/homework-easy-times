// Enhanced Main Application Logic

// ── Fallback: ודא שמשתנה storage זמין ──────────────────────────
// storage.js מגדיר window.storage, אבל אם הוא נטען לפני Firebase
// הוא עדיין עובד (fallback ל-localStorage). אם מסיבה כלשהי לא הוגדר -
// ניצור כאן stub בסיסי כדי למנוע ReferenceError.
if (typeof storage === 'undefined') {
  /* eslint-disable no-var */
  var storage = window.storage || window.storageManager || {
    get: async (key) => {
      try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; }
    },
    set: async (key, value) => {
      try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
    },
    remove: async (key) => { localStorage.removeItem(key); },
    clearAll: async () => { localStorage.clear(); },
    exportData: async () => false,
    importData: async () => ({ success: false }),
    autoBackup: async () => {},
    getLastBackupDate: async () => null,
    syncAllToFirestore: async () => {},
    syncAllFromFirestore: async () => {}
  };
}

const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
let subjects = [];
let homework = [];
let settings = {
  enableNotifications: false,
  notificationDays: 1,
  notificationTime: '09:00',
  autoBackup: false,
  darkMode: false,
  recentColors: [],
  viewMode: 'list',
  studentMode: true
};
let selectedColor = '#3b82f6';
let showArchive = false;
let filters = {
  subject: 'all',
  status: 'all',
  urgency: 'all',
  tags: []
};
let availableTags = [];
let exams = [];

// =============== טעינה ושמירה ===============


// ── Add Task Modal ────────────────────────────
function initEditHomeworkModal() {
  const modal    = document.getElementById('edit-hw-modal');
  const closeBtn = document.getElementById('close-edit-hw-modal');
  if (!modal) return;
  closeBtn && closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });
}

function initAddTaskModal() {
  const openBtn  = document.getElementById('open-add-task-modal');
  const modal    = document.getElementById('add-task-modal');
  const closeBtn = document.getElementById('close-add-task-modal');

  if (!openBtn || !modal) return;

  openBtn.addEventListener('click', () => {
    modal.classList.remove('hidden');
  });

  closeBtn && closeBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.add('hidden');
  });

  // סגירה אחרי הוספת משימה
  const addBtn = document.getElementById('add-homework');
  if (addBtn) {
    const origClick = addBtn.onclick;
    addBtn.addEventListener('click', () => {
      setTimeout(() => {
        // רק אם הטופס התנקה (משמעות שהמשימה נשמרה)
        const title = document.getElementById('hw-title');
        if (title && title.value === '') modal.classList.add('hidden');
      }, 100);
    });
  }
}

async function loadData() {
  console.log('🔄 loadData: Starting data load...');
  try {
    console.log('📊 loadData: Loading subjects...');
    subjects = await storage.get('homework-subjects') || [];
    console.log('✅ loadData: Subjects loaded:', subjects.length, 'items');
    
    console.log('📚 loadData: Loading homework...');
    homework = await storage.get('homework-list') || [];
    console.log('✅ loadData: Homework loaded:', homework.length, 'items');
    
    console.log('🏷️ loadData: Loading tags...');
    availableTags = await storage.get('homework-tags') || [];
    console.log('✅ loadData: Tags loaded:', availableTags.length, 'items');

    exams = await storage.get('exams-list') || [];
    console.log('✅ loadData: Exams loaded:', exams.length, 'items');
    
    console.log('⚙️ loadData: Loading settings...');
    settings = await storage.get('homework-settings') || {
      enableNotifications: false,
      notificationDays: 1,
      notificationTime: '09:00',
      autoBackup: false,
      darkMode: false,
      recentColors: [],
      viewMode: 'list'
    };
    console.log('✅ loadData: Settings loaded:', settings);
    await autoAdvanceGradeLevel();
    
    // החל מצב לילה אם נבחר
    if (settings.darkMode) {
      console.log('🌙 loadData: Applying dark mode...');
      document.body.classList.add('dark-mode');
      
      // עדכון האייקון של כפתור מצב הלילה
      const toggleBtn = document.getElementById('toggle-dark-mode');
      if (toggleBtn) {
        const svg = toggleBtn.querySelector('svg use');
        if (svg) {
          svg.setAttribute('href', '#sun');
          console.log('🌙 loadData: Dark mode icon updated to sun');
        }
      }
      
      console.log('✅ loadData: Dark mode applied');
    }
    
    // החל תצוגה שמורה (רשימה או לוח שנה)
    if (settings.viewMode) {
      console.log('📅 loadData: Applying saved view mode:', settings.viewMode);
      const toggleViewBtn = document.getElementById('toggle-view-mode');
      if (toggleViewBtn) {
        const svg = toggleViewBtn.querySelector('svg use');
        if (svg) {
          // עדכון האייקון לפי המצב השמור
          svg.setAttribute('href', settings.viewMode === 'list' ? '#calendar' : '#list');
          console.log('📅 loadData: View mode icon updated to', settings.viewMode === 'list' ? 'calendar' : 'list');
        }
      }
    }
    
    console.log('🎨 loadData: Starting render...');
    
    // נקה צבעים כפולים
    if (deduplicateColors()) {
      console.log('✅ loadData: Removed duplicate colors');
    }
    
    render();
    console.log('✅ loadData: Render complete');
    
    // אתחול מודל הוספת משימה
    initAddTaskModal();
    initExamModal();
    initEditHomeworkModal();
    applyMode();

    // התחל בדיקת התראות אם מופעל
    if (settings.enableNotifications && notifications.permission === 'granted') {
      console.log('🔔 loadData: Starting periodic notification check...');
      await notifications.startPeriodicCheck(homework, settings);
      console.log('✅ loadData: Notification check started');
    }
    
    // בדיקת גיבוי אוטומטי
    if (settings.autoBackup) {
      console.log('💾 loadData: Running auto backup...');
      await storage.autoBackup();
      console.log('✅ loadData: Auto backup complete');
    }
    
    console.log('✅✅✅ loadData: הנתונים נטענו בהצלחה');
  } catch (error) {
    console.error('❌❌❌ loadData: שגיאה בטעינת נתונים:', error);
    if (notifications && notifications.showInAppNotification) {
      notifications.showInAppNotification('שגיאה בטעינת הנתונים', 'error');
    }
  }
}

async function saveData() {
  console.log('💾 saveData: Starting data save...');
  try {
    await storage.set('homework-subjects', subjects);
    await storage.set('homework-list', homework);
    await storage.set('homework-settings', settings);
    await storage.set('homework-tags', availableTags);
    await storage.set('exams-list', exams);
    console.log('✅✅✅ saveData: הנתונים נשמרו בהצלחה');
  } catch (error) {
    console.error('❌❌❌ saveData: שגיאה בשמירת נתונים:', error);
    if (notifications && notifications.showInAppNotification) {
      notifications.showInAppNotification('⚠️ שגיאה בשמירת הנתונים', 'error');
    }
  }
}

// =============== חישובים ועזרים ===============

function getDaysUntilDue(dueDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + 'T00:00:00');
  const days = Math.round((due - today) / (1000 * 60 * 60 * 24));
  return days;
}

function downloadFile(filename, dataUrl) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// =============== Color Picker מתקדם ===============

function renderColorPicker() {
  const picker = document.getElementById('color-picker');
  
  let html = '<div class="color-grid">';
  
  // צבעים קבועים
  colors.forEach(color => {
    html += `
      <div class="color-option ${color === selectedColor ? 'selected' : ''}" 
           style="background-color: ${color};"
           onclick="selectColor('${color}')"></div>
    `;
  });
  
  // צבעים אחרונים
  if (settings.recentColors && settings.recentColors.length > 0) {
    html += '<div class="color-divider"></div>';
    settings.recentColors.slice(0, 6).forEach(color => {
      html += `
        <div class="color-option ${color === selectedColor ? 'selected' : ''}" 
             style="background-color: ${color};"
             onclick="selectColor('${color}')"></div>
      `;
    });
  }
  
  html += '</div>';
  
  // Custom color picker
  html += `
    <div class="custom-color-section">
      <input type="color" id="custom-color-input" value="${selectedColor}" 
             onchange="selectCustomColor(this.value)">
      <label for="custom-color-input">צבע מותאם אישית</label>
    </div>
  `;
  
  picker.innerHTML = html;
}

function selectColor(color) {
  selectedColor = color;
  if (!colors.includes(color)) {
    addToRecentColors(color);
  }
  renderColorPicker();
}

function selectCustomColor(color) {
  selectedColor = color;
  if (!colors.includes(color)) {
    addToRecentColors(color);
  }
  renderColorPicker();
}

function addToRecentColors(color) {
  if (colors.includes(color)) return;
  if (!settings.recentColors) settings.recentColors = [];
  settings.recentColors = settings.recentColors.filter(c => c !== color);
  settings.recentColors.unshift(color);
  if (settings.recentColors.length > 12) {
    settings.recentColors = settings.recentColors.slice(0, 12);
  }
  saveData();
}

// פונקציה לניקוי צבעים כפולים
function deduplicateColors() {
  console.log('🎨 deduplicateColors: Starting color deduplication...');
  
  if (!settings.recentColors || settings.recentColors.length === 0) {
    console.log('⏸️ deduplicateColors: No recent colors to deduplicate');
    return false;
  }
  
  const originalLength = settings.recentColors.length;
  console.log('🎨 deduplicateColors: Original colors:', settings.recentColors);
  
  // הסר צבעים שזהים לצבעי ברירת המחדל
  settings.recentColors = settings.recentColors.filter(color => !colors.includes(color));
  
  // הסר כפילויות
  settings.recentColors = [...new Set(settings.recentColors)];
  
  const newLength = settings.recentColors.length;
  console.log('🎨 deduplicateColors: Cleaned colors:', settings.recentColors);
  console.log('🎨 deduplicateColors: Removed', originalLength - newLength, 'duplicate colors');
  
  if (originalLength !== newLength) {
    saveData();
    return true;
  }
  
  return false;
}

// =============== מצב לילה ===============

function toggleDarkMode() {
  console.log('🌙 toggleDarkMode: Toggling dark mode...');
  settings.darkMode = !settings.darkMode;
  
  document.body.classList.toggle('dark-mode');
  
  // עדכון האייקון של הכפתור
  const toggleBtn = document.getElementById('toggle-dark-mode');
  if (toggleBtn) {
    const svg = toggleBtn.querySelector('svg use');
    if (svg) {
      svg.setAttribute('href', settings.darkMode ? '#sun' : '#moon');
    }
  }
  
  saveData();
  
  // עדכון צבעי הגרפים
  if (typeof updateChartColors === 'function') {
    setTimeout(() => updateChartColors(), 100);
  }
  
  const icon = settings.darkMode ? '🌙' : '☀️';
  const message = `מצב ${settings.darkMode ? 'לילה' : 'יום'} הופעל ${icon}`;
  notifications.showInAppNotification(message, 'success');
}

function toggleViewMode() {
  settings.viewMode = settings.viewMode === 'list' ? 'calendar' : 'list';
  
  // עדכון האייקון
  const toggleBtn = document.getElementById('toggle-view-mode');
  if (toggleBtn) {
    const svg = toggleBtn.querySelector('svg use');
    if (svg) {
      svg.setAttribute('href', settings.viewMode === 'list' ? '#calendar' : '#list');
    }
  }
  
  // שמירת ההגדרה
  saveData();
  
  const message = `תצוגת ${settings.viewMode === 'list' ? 'רשימה' : 'לוח שנה'}`;
  notifications.showInAppNotification(message, 'info');
  
  // החלפת התצוגה בפועל
  if (settings.viewMode === 'calendar') {
    console.log('📅 toggleViewMode: Switching to calendar view');
    if (typeof calendar !== 'undefined' && calendar.renderCalendar) {
      calendar.renderCalendar(showArchive);
    } else {
      console.error('❌ toggleViewMode: Calendar manager not found');
      notifications.showInAppNotification('שגיאה בטעינת לוח השנה', 'error');
    }
  } else {
    console.log('📋 toggleViewMode: Switching to list view');
    renderHomework();
  }
}

// =============== סינון משימות ===============

function applyFilters() {
  render();
}

function setFilter(type, value) {
  filters[type] = value;
  applyFilters();
}

function toggleTagFilter(tag) {
  const index = filters.tags.indexOf(tag);
  if (index > -1) {
    filters.tags.splice(index, 1);
  } else {
    filters.tags.push(tag);
  }
  applyFilters();
}

function getFilteredHomework(homeworkList) {
  return homeworkList.filter(hw => {
    if (filters.subject !== 'all' && hw.subject != filters.subject) return false;
    if (filters.status === 'completed' && !hw.completed) return false;
    if (filters.status === 'pending' && hw.completed) return false;
    
    if (filters.urgency !== 'all') {
      if (!hw.dueDate) return false; // ללא תאריך - לא נכלל בסינון דחיפות
      const daysLeft = getDaysUntilDue(hw.dueDate);
      if (filters.urgency === 'urgent' && (daysLeft > 2 || hw.completed)) return false;
      if (filters.urgency === 'overdue' && (daysLeft >= 0 || hw.completed)) return false;
    }
    
    if (filters.tags.length > 0) {
      if (!hw.tags || !hw.tags.some(tag => filters.tags.includes(tag))) return false;
    }
    
    return true;
  });
}

// =============== תגיות ===============

function addTag() {
  const input = document.getElementById('new-tag-input');
  const tag = input.value.trim();
  
  if (!tag) return;
  if (availableTags.includes(tag)) {
    notifications.showInAppNotification('תגית זו כבר קיימת', 'error');
    return;
  }
  
  availableTags.push(tag);
  input.value = '';
  saveData();
  renderTagSelector();
  notifications.showInAppNotification(`התגית "${tag}" נוספה`, 'success');
}

function removeTag(tag) {
  if (!confirm(`האם למחוק את התגית "${tag}"? היא תוסר מכל המשימות`)) return;
  
  availableTags = availableTags.filter(t => t !== tag);
  homework.forEach(hw => {
    if (hw.tags) hw.tags = hw.tags.filter(t => t !== tag);
  });
  
  saveData();
  render();
  notifications.showInAppNotification(`התגית "${tag}" נמחקה`, 'success');
}

function toggleHomeworkTag(homeworkId, tag) {
  const hw = homework.find(h => h.id === homeworkId);
  if (!hw) return;
  
  if (!hw.tags) hw.tags = [];
  const index = hw.tags.indexOf(tag);
  
  if (index > -1) {
    hw.tags.splice(index, 1);
  } else {
    hw.tags.push(tag);
  }
  
  saveData();
  render();
}

// =============== רינדור ===============

function renderSubjects() {
  const select       = document.getElementById('hw-subject');
  const filterSelect = document.getElementById('filter-subject');
  const examSelect   = document.getElementById('exam-subject');

  const subjectOptions = '<option value="">בחר מקצוע</option>' +
    subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
  if (select) select.innerHTML = subjectOptions;
  if (examSelect) {
    const prevVal = examSelect.value;
    examSelect.innerHTML = subjectOptions;
    if (prevVal) examSelect.value = prevVal;
  }

  if (filterSelect) {
    filterSelect.innerHTML = '<option value="all">כל המקצועות</option>' +
      subjects.map(s => `<option value="${s.id}" ${filters.subject == s.id ? 'selected' : ''}>${s.name}</option>`).join('');
  }
}

function renderFilters() {
  const statusEl  = document.getElementById('filter-status');
  const urgencyEl = document.getElementById('filter-urgency');
  if (statusEl)  statusEl.value  = filters.status  || 'all';
  if (urgencyEl) urgencyEl.value = filters.urgency || 'all';
  renderSubjects();
}

function clearFilters() {
  filters = {
    subject: 'all',
    status: 'all',
    urgency: 'all',
    tags: []
  };
  renderFilters();
  render();
}

function renderTagSelector() {
  const container = document.getElementById('tag-management');
  if (!container) return;
  
  let html = `
    <div class="tag-management-section">
      <h4>ניהול תגיות</h4>
      <div class="add-tag-form">
        <input type="text" class="input" id="new-tag-input" placeholder="תגית חדשה">
        <button class="btn btn-primary" onclick="addTag()">
          <svg width="16" height="16"><use href="#plus"></use></svg>
          הוסף
        </button>
      </div>
      <div class="tags-list">
        ${availableTags.map(tag => `
          <div class="tag-item">
            <span>${tag}</span>
            <button class="icon-btn" onclick="removeTag('${tag}')">
              <svg width="14" height="14"><use href="#x"></use></svg>
            </button>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  
  container.innerHTML = html;
}

function renderHomework() {
  const list = document.getElementById('homework-list');
  const archiveBtn = document.getElementById('archive-toggle');

  if (settings.viewMode === 'calendar') {
    if (typeof calendar !== 'undefined' && calendar.renderCalendar) {
      calendar.renderCalendar();
      archiveBtn.classList.add('hidden');
      return;
    }
  }

  const activeHomework = homework.filter(h => {
    if (!h.completed) return true;
    if (!h.dueDate) return false; // פריטים מושלמים בלי תאריך לא מוצגים ברשימה הפעילה
    return getDaysUntilDue(h.dueDate) >= 0;
  });

  const archivedHomework = homework.filter(h => {
    if (!h.completed) return false;
    if (!h.dueDate) return true; // פריטים בלי תאריך שהושלמו עוברים לארכיון
    return getDaysUntilDue(h.dueDate) < 0;
  });

  // מבחנים בארכיון = הושלמו + (אין תאריך או תאריך עבר)
  const archivedExams = (exams || []).filter(e => {
    if (!e.completed) return false;
    if (!e.date) return true; // מבחן בלי תאריך שהושלם עובר לארכיון
    return getDaysUntilDue(e.date) < 0;
  });
  const totalArchived = archivedHomework.length + archivedExams.length;

  if (totalArchived > 0) {
    archiveBtn.classList.remove('hidden');
    archiveBtn.textContent = showArchive ? 'הסתר ארכיון' : `ארכיון (${totalArchived})`;
  } else {
    archiveBtn.classList.add('hidden');
  }

  let displayList = showArchive ? archivedHomework : activeHomework;
  displayList = getFilteredHomework(displayList);

  // ── Google Tasks — מוסיף לרשימה המאוחדת ──
  const gTasks = (typeof dashboardWidget !== 'undefined' && dashboardWidget.isConnected())
    ? dashboardWidget.getTasks()
    : [];

  if (displayList.length === 0 && gTasks.length === 0 && (!showArchive || archivedExams.length === 0)) {
    const message = showArchive ? 'אין פריטים בארכיון' : 'אין משימות להצגה';
    list.innerHTML = `<p class="empty-state">${message}</p>`;
    return;
  }

  const sorted = [...displayList].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate) - new Date(b.dueDate);
  });

  // בנה HTML ל-Google Tasks
  const today_gtask = new Date(); today_gtask.setHours(0,0,0,0);
  const gTasksHTML = gTasks.map(t => {
    const due  = t.due ? new Date(t.due) : null;
    const days = due ? Math.round((due - today_gtask) / 86400000) : null;
    let daysText = '', itemClass = 'homework-item';
    if (due !== null) {
      if      (days < 0)   { daysText = `באיחור של ${Math.abs(days)} ימים`; itemClass += ' overdue'; }
      else if (days === 0) { daysText = 'היום!';       itemClass += ' urgent'; }
      else if (days === 1) { daysText = 'מחר';         itemClass += ' urgent'; }
      else if (days === 2) { daysText = 'מחרתיים';     itemClass += ' urgent'; }
      else                 { daysText = `עוד ${days} ימים`; }
    }
    const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    return `
      <div class="${itemClass}" id="gtask-${t.id}">
        <div class="homework-header">
          <input type="checkbox" class="checkbox" onchange="completeGTask('${t.id}','${t.listId}',this)">
          <div class="homework-content">
            <div class="homework-badges">
              <span class="badge" style="background:#6366f1">${esc(t.listTitle)}</span>
              <span class="badge" style="background:#0ea5e9">Google Tasks</span>
            </div>
            <h3 class="homework-title">${esc(t.title || 'ללא כותרת')}</h3>
            ${daysText ? `<div class="homework-meta"><span class="days-left ${days !== null && days < 0 ? 'overdue' : days !== null && days <= 2 ? 'urgent' : ''}">${daysText}</span></div>` : ''}
          </div>
        </div>
      </div>`;
  }).join('');

  // מיזוג מבחנים לרשימה המאוחדת
  const examsToShow = showArchive
    ? archivedExams
    : (exams || []).filter(e => {
        if (!e.completed) return true; // מבחנים לא מושלמים תמיד בתצוגה הפעילה
        if (!e.date) return false; // מבחנים מושלמים בלי תאריך לא בתצוגה הפעילה
        return getDaysUntilDue(e.date) >= 0; // מבחנים מושלמים עם תאריך עתידי בתצוגה הפעילה
      });
  const examItems = examsToShow.map(e => ({ ...e, _type: 'exam', dueDate: e.date }));

  const allItems = [...sorted, ...examItems].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return new Date(a.dueDate) - new Date(b.dueDate);
  });

  list.innerHTML = allItems.map(item => {
    if (item._type === 'exam') {
      // ── כרטיס מבחן ──
      const exam = item;
      const subject = subjects.find(s => s.id == exam.subject);
      const daysLeft = getDaysUntilDue(exam.date);
      const isUrgent  = daysLeft <= 3 && daysLeft >= 0 && !exam.completed;
      const isOverdue = daysLeft < 0 && !exam.completed;

      let daysText = '';
      if (!exam.completed) {
        if (isOverdue)       daysText = `עבר לפני ${Math.abs(daysLeft)} ימים`;
        else if (daysLeft === 0) daysText = '⚠️ היום!';
        else if (daysLeft === 1) daysText = '⚠️ מחר!';
        else                 daysText = `עוד ${daysLeft} ימים`;
      }

      let borderColor = subject ? subject.color : '#8b5cf6';
      if (isOverdue) borderColor = '#ef4444';
      if (isUrgent)  borderColor = '#f59e0b';

      const doneCnt  = (exam.topics || []).filter(t => t.done).length;
      const totalCnt = (exam.topics || []).length;
      const pct      = totalCnt ? Math.round((doneCnt / totalCnt) * 100) : null;

      let classes = 'homework-item exam-item';
      if (exam.completed) classes += ' completed exam-done';
      if (isOverdue) classes += ' overdue exam-overdue';
      else if (isUrgent) classes += ' urgent exam-urgent';

      return `
        <div class="${classes}" style="border-color:${borderColor};">
          <div class="homework-header">
            <input type="checkbox" class="checkbox" style="accent-color:#8b5cf6;"
              ${exam.completed ? 'checked' : ''} onchange="toggleExamDone('${exam.id}')">
            <div class="homework-content">
              <div class="homework-badges">
                <span class="badge exam-type-badge">📝 מבחן</span>
                ${subject ? `<span class="badge" style="background:${subject.color};">${subject.name}</span>` : ''}
                ${isOverdue ? '<span class="badge" style="background:#ef4444;">עבר!</span>' : ''}
                ${isUrgent  ? '<span class="badge" style="background:#f59e0b;">קרוב!</span>' : ''}
              </div>
              <h3 class="homework-title ${exam.completed ? 'completed' : ''}">${exam.title}</h3>
              ${exam.notes ? `<p class="homework-desc">${exam.notes}</p>` : ''}

              ${totalCnt ? `
                <div class="exam-topics" style="margin-top:0.6rem;">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.35rem;">
                    <span style="font-size:0.8rem;font-weight:600;color:#6b7280;">נושאים ללימוד</span>
                    <span style="font-size:0.8rem;color:#8b5cf6;font-weight:600;">${doneCnt}/${totalCnt} (${pct}%)</span>
                  </div>
                  <div class="exam-progress-bar"><div class="exam-progress-fill" style="width:${pct}%;"></div></div>
                  <div style="margin-top:0.45rem;">
                    ${(exam.topics || []).map((t, i) => `
                      <label class="exam-topic-check">
                        <input type="checkbox" ${t.done ? 'checked' : ''} onchange="toggleExamTopic('${exam.id}', ${i})">
                        <span style="${t.done ? 'text-decoration:line-through;color:#9ca3af;' : ''}">${t.name}</span>
                      </label>`).join('')}
                  </div>
                </div>
              ` : ''}

              <div class="homework-meta" style="margin-top:0.5rem;">
                <span>
                  <svg width="16" height="16" style="display:inline;vertical-align:middle;"><use href="#calendar"></use></svg>
                  ${new Date(exam.date).toLocaleDateString('he-IL')}
                </span>
                ${daysText ? `<span class="days-left ${isOverdue ? 'overdue' : isUrgent ? 'urgent' : ''}">${daysText}</span>` : ''}
                ${exam.gradeFinal !== null && exam.gradeFinal !== undefined ? `
                  <span class="exam-grade-badge" style="color:${exam.gradePct >= 90 ? '#16a34a' : exam.gradePct >= 75 ? '#2563eb' : exam.gradePct >= 55 ? '#d97706' : '#dc2626'};">
                    🎯 ${exam.gradeFinal}${exam.gradeMax && exam.gradeMax !== 100 ? '/'+exam.gradeMax : ''} (${exam.gradePct}%)
                  </span>` : ''}
              </div>
            </div>
            <div style="display:flex;flex-direction:column;gap:0.35rem;align-items:center;">
              <button class="icon-btn" onclick="openExamEditModal('${exam.id}')" title="עריכה" style="color:#7c3aed;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="icon-btn" onclick="deleteExam('${exam.id}')" title="מחיקה">
                <svg width="18" height="18"><use href="#trash"></use></svg>
              </button>
            </div>
          </div>
        </div>`;
    }

    // ── כרטיס משימה ──
    const hw = item;
    const subject = subjects.find(s => s.id == hw.subject);
    const daysLeft = hw.dueDate ? getDaysUntilDue(hw.dueDate) : null;
    const isUrgent = daysLeft !== null && daysLeft <= 2 && !hw.completed;
    const isOverdue = daysLeft !== null && daysLeft < 0 && !hw.completed;

    let classes = 'homework-item';
    if (hw.completed) classes += ' completed';
    if (isOverdue) classes += ' overdue';
    else if (isUrgent) classes += ' urgent';

    let daysText = '';
    if (!hw.completed && daysLeft !== null) {
      if (isOverdue) daysText = `באיחור של ${Math.abs(daysLeft)} ימים`;
      else if (daysLeft === 0) daysText = 'היום!';
      else if (daysLeft === 1) daysText = 'מחר';
      else if (daysLeft === 2) daysText = 'מחרתיים';
      else daysText = `עוד ${daysLeft} ימים`;
    }

    return `
      <div class="${classes}" ${!hw.completed && !isOverdue && !isUrgent && subject ? `style="border-color: ${subject.color};"` : ''}>
        <div class="homework-header">
          <input type="checkbox" class="checkbox" ${hw.completed ? 'checked' : ''}
                 onchange="toggleComplete(${hw.id})">
          <div class="homework-content">
            <div class="homework-badges">
              ${subject ? `<span class="badge" style="background-color: ${subject.color};">${subject.name}</span>` : ''}
              ${isOverdue ? '<span class="badge" style="background-color: #ef4444;">איחור!</span>' : ''}
              ${isUrgent && !isOverdue ? '<span class="badge" style="background-color: #f59e0b;">דחוף</span>' : ''}
              ${hw.tags && hw.tags.length > 0 ? hw.tags.map(tag => `
                <span class="badge tag-badge">${tag}</span>
              `).join('') : ''}
            </div>
            <h3 class="homework-title ${hw.completed ? 'completed' : ''}">${hw.title}</h3>
            ${hw.description ? `<p class="homework-desc">${hw.description}</p>` : ''}

            ${hw.files && hw.files.length ? `
              <div class="homework-files">
                <strong>קבצים מצורפים:</strong>
                <ul>
                  ${hw.files.map(f => `
                    <li>
                      ${f.name}
                      <button onclick="downloadFile('${f.name}', '${f.data}')" class="btn btn-secondary" style="margin-left:0.5rem; padding: 0.25rem 0.5rem; width: auto; font-size: 0.75rem;">הורד</button>
                    </li>
                  `).join('')}
                </ul>
              </div>
            ` : ''}

            ${availableTags.length > 0 ? `
              <div class="homework-tags-selector">
                <button class="btn btn-secondary" onclick="toggleTagEditor('${hw.id}')" style="padding: 0.25rem 0.5rem; width: auto; font-size: 0.75rem;">
                  <svg width="14" height="14"><use href="#tag"></use></svg>
                  ניהול תגיות
                </button>
                <div class="tags-editor hidden" id="tags-editor-${hw.id}">
                  ${availableTags.map(tag => `
                    <label class="tag-checkbox">
                      <input type="checkbox" ${hw.tags && hw.tags.includes(tag) ? 'checked' : ''}
                             onchange="toggleHomeworkTag(${hw.id}, '${tag}')">
                      ${tag}
                    </label>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            <div class="homework-meta">
              ${hw.dueDate ? `<span>
                <svg width="16" height="16" style="display: inline; vertical-align: middle;"><use href="#calendar"></use></svg>
                ${new Date(hw.dueDate).toLocaleDateString('he-IL')}
              </span>` : ''}
              ${daysText ? `<span class="days-left ${isOverdue ? 'overdue' : isUrgent ? 'urgent' : ''}">${daysText}</span>` : ''}
            </div>
          </div>
          <button class="icon-btn" onclick="openEditHomeworkModal('${hw.id}')" title="עריכה" style="color:#7c3aed;">
            <svg width="20" height="20"><use href="#pencil"></use></svg>
          </button>
          <button class="icon-btn" onclick="deleteHomework('${hw.id}')">
            <svg width="20" height="20"><use href="#trash"></use></svg>
          </button>
        </div>
      </div>
    `;
  }).join('') + gTasksHTML;
}

function toggleTagEditor(homeworkId) {
  const editor = document.getElementById(`tags-editor-${homeworkId}`);
  if (editor) editor.classList.toggle('hidden');
}

function updateStats() {
  const total = homework.length;
  const completed = homework.filter(h => h.completed).length;
  const pending = homework.filter(h => !h.completed).length;
  const urgent = homework.filter(h => !h.completed && h.dueDate && getDaysUntilDue(h.dueDate) <= 2).length;

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-completed').textContent = completed;
  document.getElementById('stat-pending').textContent = pending;
  document.getElementById('stat-urgent').textContent = urgent;

  // סטטיסטיקות מבחנים (מצב תלמיד)
  if (settings.studentMode !== false) {
    const examTotal    = (exams || []).length;
    const examUpcoming = (exams || []).filter(e => !e.completed && getDaysUntilDue(e.date) >= 0).length;
    const examSoon     = (exams || []).filter(e => !e.completed && getDaysUntilDue(e.date) >= 0 && getDaysUntilDue(e.date) <= 7).length;
    const examDone     = (exams || []).filter(e => e.completed).length;

    const el = id => document.getElementById(id);
    if (el('stat-exam-total'))    el('stat-exam-total').textContent    = examTotal;
    if (el('stat-exam-upcoming')) el('stat-exam-upcoming').textContent = examUpcoming;
    if (el('stat-exam-soon'))     el('stat-exam-soon').textContent     = examSoon;
    if (el('stat-exam-done'))     el('stat-exam-done').textContent     = examDone;

    const examStatsRow = document.getElementById('exam-stats-row');
    if (examStatsRow) examStatsRow.style.display = '';
  } else {
    const examStatsRow = document.getElementById('exam-stats-row');
    if (examStatsRow) examStatsRow.style.display = 'none';
  }

  if (typeof updateCharts === 'function') {
    updateCharts();
  }
}

function render() {
  renderSubjects();
  renderHomework();
  renderFilters();
  renderTagSelector();
  updateStats();
  applyMode();
}

function applyMode() {
  const isStudent = settings.studentMode !== false;

  // כותרת הרשימה
  const listTitle = document.getElementById('list-panel-title');
  if (listTitle) listTitle.textContent = isStudent ? 'רשימת משימות' : 'רשימת מטלות';

  // כפתור הוסף מבחן
  const examBtn = document.getElementById('open-add-exam-modal');
  if (examBtn) examBtn.style.display = isStudent ? '' : 'none';

  // סינון מקצוע
  const subjectFilter = document.getElementById('filter-subject');
  if (subjectFilter) subjectFilter.style.display = isStudent ? '' : 'none';

  // שדה מקצוע + כפתור מקצוע חדש במודל
  const subjectFormGroup = document.getElementById('hw-subject-group');
  if (subjectFormGroup) subjectFormGroup.style.display = isStudent ? '' : 'none';

  // Google Classroom בכותרת
  const classroomSection = document.querySelector('.settings-section.classroom-section');
  if (classroomSection) classroomSection.style.display = isStudent ? '' : 'none';

  // הוסף/הסר class ל-body
  // שדה שכבה ברירת מחדל בהגדרות
  const defaultGradeSetting = document.getElementById('default-grade-setting');
  if (defaultGradeSetting) defaultGradeSetting.style.display = isStudent ? '' : 'none';

  document.body.classList.toggle('non-student-mode', !isStudent);
}

// =============== פעולות על מקצועות ===============

function addSubject() {
  const name = document.getElementById('subject-name').value.trim();
  
  if (!name) {
    notifications.showInAppNotification('נא להזין שם מקצוע', 'error');
    return;
  }
  
  const newSubject = { id: Date.now(), name, color: selectedColor };
  subjects.push(newSubject);
  
  document.getElementById('subject-name').value = '';
  selectedColor = '#3b82f6';
  document.getElementById('add-subject-form').classList.add('hidden');
  document.getElementById('show-add-subject').classList.remove('hidden');
  
  saveData();
  render();
  notifications.showInAppNotification(`המקצוע "${name}" נוסף בהצלחה`, 'success');
}

function deleteSubject(id) {
  const subject = subjects.find(s => s.id === id);
  if (!subject) return;
  
  const relatedHomework = homework.filter(h => h.subject == id).length;
  let confirmMsg = `האם אתה בטוח שברצונך למחוק את המקצוע "${subject.name}"?`;
  
  if (relatedHomework > 0) {
    confirmMsg += `\n\n⚠️ פעולה זו תמחק גם ${relatedHomework} משימות הקשורות למקצוע זה!`;
  }
  
  if (!confirm(confirmMsg)) return;
  
  subjects = subjects.filter(s => s.id !== id);
  homework = homework.filter(h => h.subject != id);
  
  saveData();
  render();
  notifications.showInAppNotification(`המקצוע "${subject.name}" נמחק`, 'success');
}

// =============== פעולות על משימות ===============

function addHomework() {
  const subject = document.getElementById('hw-subject').value;
  const title = document.getElementById('hw-title').value.trim();
  const description = document.getElementById('hw-desc').value.trim();
  const dueDate = document.getElementById('hw-date').value;
  const priority = document.getElementById('hw-priority').value;
  const fileInput = document.getElementById('hw-files');

  if (!subject || !title || !dueDate) {
    notifications.showInAppNotification('נא למלא את כל השדות החובה (מקצוע, כותרת, תאריך)', 'error');
    return;
  }

  const files = Array.from(fileInput.files);
  const hwFiles = [];

  if (files.length === 0) {
    saveHomework([]);
  } else {
    let loadedCount = 0;
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = function(e) {
        hwFiles.push({
          name: file.name,
          type: file.type,
          data: e.target.result
        });
        loadedCount++;
        if (loadedCount === files.length) {
          saveHomework(hwFiles);
        }
      };
      reader.readAsDataURL(file);
    });
  }

  function saveHomework(hwFiles) {
    const newHomework = {
      id: Date.now(),
      subject,
      title,
      description,
      dueDate,
      priority,
      completed: false,
      files: hwFiles,
      tags: [],
      notified: false,
      todayNotified: false
    };
    
    homework.push(newHomework);

    document.getElementById('hw-subject').value = '';
    document.getElementById('hw-title').value = '';
    document.getElementById('hw-desc').value = '';
    document.getElementById('hw-date').value = '';
    document.getElementById('hw-priority').value = 'medium';
    document.getElementById('hw-files').value = '';

    saveData();
    render();
    notifications.showInAppNotification(`המשימה "${title}" נוספה בהצלחה`, 'success');
  }
}

function toggleComplete(id) {
  const hw = homework.find(h => h.id === id);
  if (!hw) return;
  
  hw.completed = !hw.completed;
  saveData();
  render();
  
  if (hw.completed) {
    notifications.showInAppNotification(`כל הכבוד! סיימת את "${hw.title}"`, 'success');
  }
}

async function completeGTask(taskId, listId, checkbox) {
  if (typeof dashboardWidget === 'undefined') return;
  checkbox.disabled = true;
  try {
    await dashboardWidget.completeTask(taskId, listId, checkbox);
    notifications.showInAppNotification('משימה הושלמה!', 'success');
  } catch(e) {
    checkbox.checked  = false;
    checkbox.disabled = false;
  }
}

function openEditHomeworkModal(id) {
  const numId = Number(id);
  const hw = homework.find(h => h.id === numId || h.id === id);
  if (!hw) return;

  // מלא את ה-select של מקצועות
  const subjectSelect = document.getElementById('edit-hw-subject');
  subjectSelect.innerHTML = '<option value="">בחר מקצוע</option>' +
    subjects.map(s => `<option value="${s.id}" ${s.id == hw.subject ? 'selected' : ''}>${s.name}</option>`).join('');

  document.getElementById('edit-hw-title').value = hw.title || '';
  document.getElementById('edit-hw-desc').value = hw.description || '';
  document.getElementById('edit-hw-date').value = hw.dueDate || '';
  document.getElementById('edit-hw-priority').value = hw.priority || 'medium';

  document.getElementById('save-edit-hw-btn').onclick = () => saveEditHomework(numId);

  document.getElementById('edit-hw-modal').classList.remove('hidden');
}

function saveEditHomework(id) {
  const numId = Number(id);
  const hw = homework.find(h => h.id === numId || h.id === id);
  if (!hw) return;

  const subject = document.getElementById('edit-hw-subject').value;
  const title   = document.getElementById('edit-hw-title').value.trim();

  if (!subject || !title) {
    notifications.showInAppNotification('נא למלא מקצוע וכותרת', 'error');
    return;
  }

  hw.subject     = subject;
  hw.title       = title;
  hw.description = document.getElementById('edit-hw-desc').value.trim();
  hw.dueDate     = document.getElementById('edit-hw-date').value || null;
  hw.priority    = document.getElementById('edit-hw-priority').value;

  saveData();
  render();
  document.getElementById('edit-hw-modal').classList.add('hidden');
  notifications.showInAppNotification('המשימה עודכנה בהצלחה', 'success');
}

function deleteHomework(id) {
  // id can arrive as string from onclick attribute, convert to match stored type
  const numId = Number(id);
  const hw = homework.find(h => h.id === numId || h.id === id);
  if (!hw) return;
  
  if (confirm(`האם אתה בטוח שברצונך למחוק את המשימה "${hw.title}"?\n\n⚠️ פעולה זו לא ניתנת לביטול!`)) {
    homework = homework.filter(h => h.id !== numId && h.id !== id);
    saveData();
    render();
    notifications.showInAppNotification('המשימה נמחקה', 'success');
  }
}

// =============== הגדרות ===============

function openSettings() {
  const modal = document.getElementById('settings-modal');
  if (!modal) return;
  modal.classList.remove('hidden');
  loadSettingsUI();
  // עדכן UI של Classroom
  if (typeof classroomIntegration !== 'undefined') {
    classroomIntegration.refreshSettingsUI();
  }
}

function closeSettings() {
  const modal = document.getElementById('settings-modal');
  if (!modal) return;
  modal.classList.add('hidden');
}

async function loadSettingsUI() {
  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.checked = val; };
  const setInput = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
  
  setVal('enable-notifications', settings.enableNotifications);
  setInput('notification-days', settings.notificationDays);
  setInput('notification-time', settings.notificationTime);
  setVal('auto-backup', settings.autoBackup);
  setVal('dark-mode-toggle', settings.darkMode);
  setVal('view-mode-toggle', settings.viewMode === 'calendar');
  setVal('student-mode-toggle', settings.studentMode !== false);
  if (typeof window.updateModeCards === 'function') window.updateModeCards();
  const defaultGradeEl = document.getElementById('default-grade-level');
  if (defaultGradeEl) defaultGradeEl.value = settings.defaultGradeLevel || '';
  
  try {
    const lastBackup = await storage.getLastBackupDate();
    const lastBackupInfo = document.getElementById('last-backup-info');
    if (lastBackupInfo) {
      if (lastBackup) {
        lastBackupInfo.textContent = `גיבוי אחרון: ${lastBackup.toLocaleDateString('he-IL')} בשעה ${lastBackup.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`;
      } else {
        lastBackupInfo.textContent = 'גיבוי אחרון: אף פעם';
      }
    }
  } catch (e) {
    // storage not available yet
  }
}

async function saveSettings() {
  const getChecked = (id) => { const el = document.getElementById(id); return el ? el.checked : false; };
  const getVal = (id, def) => { const el = document.getElementById(id); return el ? el.value : def; };
  
  settings.enableNotifications = getChecked('enable-notifications');
  settings.notificationDays = parseInt(getVal('notification-days', 1));
  settings.notificationTime = getVal('notification-time', '09:00');
  settings.autoBackup = getChecked('auto-backup');
  settings.studentMode = getChecked('student-mode-toggle');
  settings.defaultGradeLevel = (document.getElementById('default-grade-level')?.value || '').trim();
  applyMode();
  
  await storage.set('homework-settings', settings);
  
  if (settings.enableNotifications) {
    const granted = await notifications.requestPermission();
    if (granted) {
      await notifications.startPeriodicCheck(homework, settings);
      notifications.showInAppNotification('התראות הופעלו בהצלחה', 'success');
    } else {
      notifications.showInAppNotification('לא ניתן להפעיל התראות - ההרשאה נדחתה', 'error');
      settings.enableNotifications = false;
      document.getElementById('enable-notifications').checked = false;
    }
  } else {
    notifications.stopPeriodicCheck();
  }
  
  notifications.showInAppNotification('ההגדרות נשמרו', 'success');
}

// =============== ייבוא/ייצוא ===============

async function exportData() {
  const success = await storage.exportData();
  if (success) {
    notifications.showInAppNotification('הנתונים יוצאו בהצלחה', 'success');
    loadSettingsUI();
  } else {
    notifications.showInAppNotification('שגיאה בייצוא הנתונים', 'error');
  }
}

async function exportToPDF() {
  console.log('📄 exportToPDF: Starting PDF export...');
  
  try {
    notifications.showInAppNotification('מכין דוח PDF...', 'info');
    
    // יצירת תוכן HTML למסמך
    const pdfContent = document.createElement('div');
    pdfContent.style.fontFamily = 'Arial, sans-serif';
    pdfContent.style.direction = 'rtl';
    pdfContent.style.padding = '20px';
    pdfContent.style.backgroundColor = 'white';
    pdfContent.style.color = '#000';
    
    pdfContent.innerHTML = `
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #3b82f6; font-size: 28px; margin-bottom: 10px;">📚 דוח שיעורי בית</h1>
        <p style="color: #6b7280; font-size: 14px;">
          <strong>תאריך יצירת הדוח:</strong> ${new Date().toLocaleDateString('he-IL', { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
          })}
        </p>
      </div>
      
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px;">
        <div style="background: #dbeafe; padding: 15px; border-radius: 8px; text-align: center;">
          <div style="font-size: 32px; font-weight: bold; color: #2563eb;">${homework.length}</div>
          <div style="color: #6b7280; font-size: 14px; margin-top: 5px;">סך הכל משימות</div>
        </div>
        <div style="background: #dcfce7; padding: 15px; border-radius: 8px; text-align: center;">
          <div style="font-size: 32px; font-weight: bold; color: #16a34a;">${homework.filter(h => h.completed).length}</div>
          <div style="color: #6b7280; font-size: 14px; margin-top: 5px;">הושלמו</div>
        </div>
        <div style="background: #fed7aa; padding: 15px; border-radius: 8px; text-align: center;">
          <div style="font-size: 32px; font-weight: bold; color: #ea580c;">${homework.filter(h => !h.completed).length}</div>
          <div style="color: #6b7280; font-size: 14px; margin-top: 5px;">ממתינים</div>
        </div>
        <div style="background: #fecaca; padding: 15px; border-radius: 8px; text-align: center;">
          <div style="font-size: 32px; font-weight: bold; color: #dc2626;">${homework.filter(h => !h.completed && h.dueDate && getDaysUntilDue(h.dueDate) <= 2).length}</div>
          <div style="color: #6b7280; font-size: 14px; margin-top: 5px;">דחופים</div>
        </div>
      </div>
      
      <h2 style="color: #1f2937; font-size: 20px; margin: 30px 0 15px 0; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">
        רשימת מקצועות (${subjects.length})
      </h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
        <thead>
          <tr style="background: #3b82f6; color: white;">
            <th style="padding: 12px; text-align: right; border: 1px solid #2563eb;">שם המקצוע</th>
            <th style="padding: 12px; text-align: right; border: 1px solid #2563eb;">צבע</th>
            <th style="padding: 12px; text-align: right; border: 1px solid #2563eb;">מספר משימות</th>
          </tr>
        </thead>
        <tbody>
          ${subjects.map((subject, index) => {
            const count = homework.filter(h => h.subject == subject.id).length;
            return `
              <tr style="background: ${index % 2 === 0 ? '#f9fafb' : 'white'};">
                <td style="padding: 10px; border: 1px solid #e5e7eb;">${subject.name}</td>
                <td style="padding: 10px; border: 1px solid #e5e7eb;">
                  <span style="display: inline-block; padding: 4px 12px; background: ${subject.color}; color: white; border-radius: 4px; font-size: 12px;">
                    ${subject.color}
                  </span>
                </td>
                <td style="padding: 10px; border: 1px solid #e5e7eb;">${count}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
      
      <h2 style="color: #1f2937; font-size: 20px; margin: 30px 0 15px 0; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">
        כל המשימות (${homework.length})
      </h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
        <thead>
          <tr style="background: #3b82f6; color: white;">
            <th style="padding: 12px; text-align: right; border: 1px solid #2563eb;">כותרת</th>
            <th style="padding: 12px; text-align: right; border: 1px solid #2563eb;">מקצוע</th>
            <th style="padding: 12px; text-align: right; border: 1px solid #2563eb;">תאריך הגשה</th>
            <th style="padding: 12px; text-align: right; border: 1px solid #2563eb;">סטטוס</th>
            <th style="padding: 12px; text-align: right; border: 1px solid #2563eb;">ימים עד הגשה</th>
          </tr>
        </thead>
        <tbody>
          ${homework.map((hw, index) => {
            const subject = subjects.find(s => s.id == hw.subject);
            const daysLeft = getDaysUntilDue(hw.dueDate);
            const isUrgent = daysLeft <= 2 && !hw.completed;
            const isOverdue = daysLeft < 0 && !hw.completed;
            
            let bgColor = index % 2 === 0 ? '#f9fafb' : 'white';
            if (isOverdue) bgColor = '#fee2e2';
            else if (isUrgent) bgColor = '#fef3c7';
            
            let status = hw.completed ? '✅ הושלם' : '⏳ ממתין';
            if (isOverdue && !hw.completed) status = '⚠️ באיחור';
            else if (isUrgent && !hw.completed) status = '🔥 דחוף';
            
            const titleDecoration = hw.completed ? 'text-decoration: line-through; color: #6b7280;' : '';
            
            return `
              <tr style="background: ${bgColor};">
                <td style="padding: 10px; border: 1px solid #e5e7eb; ${titleDecoration}">${hw.title}</td>
                <td style="padding: 10px; border: 1px solid #e5e7eb;">
                  ${subject ? `<span style="display: inline-block; padding: 4px 8px; background: ${subject.color}; color: white; border-radius: 4px; font-size: 12px;">${subject.name}</span>` : '-'}
                </td>
                <td style="padding: 10px; border: 1px solid #e5e7eb;">${new Date(hw.dueDate).toLocaleDateString('he-IL')}</td>
                <td style="padding: 10px; border: 1px solid #e5e7eb;">${status}</td>
                <td style="padding: 10px; border: 1px solid #e5e7eb;">
                  ${hw.completed ? '-' : (daysLeft < 0 ? `איחור ${Math.abs(daysLeft)} ימים` : `${daysLeft} ימים`)}
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>

      ${(exams && exams.length > 0 && settings.studentMode !== false) ? `
      <h2 style="color: #7c3aed; font-size: 20px; margin: 30px 0 15px 0; border-bottom: 2px solid #ede9fe; padding-bottom: 8px;">
        📝 מבחנים (${exams.length})
      </h2>
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px;">
        <div style="background: #f5f3ff; padding: 12px; border-radius: 8px; text-align: center; border: 1px solid #ede9fe;">
          <div style="font-size: 28px; font-weight: bold; color: #7c3aed;">${exams.length}</div>
          <div style="color: #6b7280; font-size: 13px; margin-top: 4px;">סך הכל</div>
        </div>
        <div style="background: #ecfdf5; padding: 12px; border-radius: 8px; text-align: center; border: 1px solid #bbf7d0;">
          <div style="font-size: 28px; font-weight: bold; color: #059669;">${exams.filter(e => !e.completed && getDaysUntilDue(e.date) >= 0).length}</div>
          <div style="color: #6b7280; font-size: 13px; margin-top: 4px;">קרובים</div>
        </div>
        <div style="background: #fffbeb; padding: 12px; border-radius: 8px; text-align: center; border: 1px solid #fde68a;">
          <div style="font-size: 28px; font-weight: bold; color: #d97706;">${exams.filter(e => !e.completed && getDaysUntilDue(e.date) >= 0 && getDaysUntilDue(e.date) <= 7).length}</div>
          <div style="color: #6b7280; font-size: 13px; margin-top: 4px;">השבוע</div>
        </div>
        <div style="background: #f0fdf4; padding: 12px; border-radius: 8px; text-align: center; border: 1px solid #bbf7d0;">
          <div style="font-size: 28px; font-weight: bold; color: #16a34a;">${exams.filter(e => e.completed).length}</div>
          <div style="color: #6b7280; font-size: 13px; margin-top: 4px;">הסתיימו</div>
        </div>
      </div>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
        <thead>
          <tr style="background: #7c3aed; color: white;">
            <th style="padding: 12px; text-align: right; border: 1px solid #6d28d9;">שם המבחן</th>
            <th style="padding: 12px; text-align: right; border: 1px solid #6d28d9;">מקצוע</th>
            <th style="padding: 12px; text-align: right; border: 1px solid #6d28d9;">תאריך</th>
            <th style="padding: 12px; text-align: right; border: 1px solid #6d28d9;">סטטוס</th>
            <th style="padding: 12px; text-align: right; border: 1px solid #6d28d9;">נושאים</th>
          </tr>
        </thead>
        <tbody>
          ${[...exams].sort((a,b) => new Date(a.date) - new Date(b.date)).map((exam, idx) => {
            const subject = subjects.find(s => s.id == exam.subject);
            const daysLeft = getDaysUntilDue(exam.date);
            const isOverdue = daysLeft < 0 && !exam.completed;
            const isSoon = daysLeft >= 0 && daysLeft <= 7 && !exam.completed;
            let status = exam.completed ? '✅ הסתיים' : (isOverdue ? '⚠️ עבר' : (isSoon ? '🔥 קרוב' : '📅 קרוב'));
            let bg = idx % 2 === 0 ? '#f9fafb' : 'white';
            if (isOverdue) bg = '#fef2f2';
            if (isSoon && !isOverdue) bg = '#fffbeb';
            const doneCnt = (exam.topics || []).filter(t => t.done).length;
            const totalCnt = (exam.topics || []).length;
            return `
              <tr style="background: ${bg};">
                <td style="padding: 10px; border: 1px solid #e5e7eb; ${exam.completed ? 'text-decoration:line-through;color:#9ca3af;' : ''}">${exam.title}</td>
                <td style="padding: 10px; border: 1px solid #e5e7eb;">
                  ${subject ? `<span style="display:inline-block;padding:3px 8px;background:${subject.color};color:white;border-radius:4px;font-size:12px;">${subject.name}</span>` : '-'}
                </td>
                <td style="padding: 10px; border: 1px solid #e5e7eb;">${new Date(exam.date).toLocaleDateString('he-IL')}</td>
                <td style="padding: 10px; border: 1px solid #e5e7eb;">${status}</td>
                <td style="padding: 10px; border: 1px solid #e5e7eb;">${totalCnt ? `${doneCnt}/${totalCnt} נלמדו` : '-'}</td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>` : ''}

      <div style="margin-top: 40px; text-align: center; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
        <p>מערכת ניהול משימות</p>
        <p>© ${new Date().getFullYear()} - נוצר ב-${new Date().toLocaleString('he-IL')}</p>
      </div>
    `;
    
    // הגדרות ייצוא ל-PDF
    const opt = {
      margin: [10, 10, 10, 10],
      filename: `homework-report-${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        letterRendering: true
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait',
        compress: true
      },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };
    
    console.log('📄 exportToPDF: Generating PDF...');
    
    // יצירת ה-PDF
    await html2pdf().set(opt).from(pdfContent).save();
    
    notifications.showInAppNotification('📄 דוח PDF נוצר בהצלחה!', 'success');
    console.log('✅ exportToPDF: PDF export complete');
    
  } catch (error) {
    console.error('❌ exportToPDF: Error:', error);
    notifications.showInAppNotification('שגיאה ביצירת הדוח', 'error');
  }
}

async function exportToExcel() {
  console.log('📊 exportToExcel: Starting Excel export...');
  
  try {
    // יצירת תוכן CSV (Excel יכול לפתוח את זה)
    let csvContent = '\uFEFF'; // BOM for UTF-8
    
    // כותרת
    csvContent += `דוח שיעורי בית - ${new Date().toLocaleDateString('he-IL')}\n\n`;
    
    // סטטיסטיקות
    csvContent += 'סטטיסטיקות\n';
    csvContent += 'סך הכל,הושלמו,ממתינים,דחופים\n';
    csvContent += `${homework.length},${homework.filter(h => h.completed).length},${homework.filter(h => !h.completed).length},${homework.filter(h => !h.completed && h.dueDate && getDaysUntilDue(h.dueDate) <= 2).length}\n\n`;

    // סטטיסטיקות מבחנים
    if (settings.studentMode !== false && exams && exams.length > 0) {
      csvContent += 'סטטיסטיקות מבחנים\n';
      csvContent += 'סך הכל,קרובים,השבוע,הסתיימו\n';
      csvContent += `${exams.length},${exams.filter(e => !e.completed && getDaysUntilDue(e.date) >= 0).length},${exams.filter(e => !e.completed && getDaysUntilDue(e.date) >= 0 && getDaysUntilDue(e.date) <= 7).length},${exams.filter(e => e.completed).length}\n\n`;
    }
    
    // מקצועות
    csvContent += 'מקצועות\n';
    csvContent += 'שם המקצוע,צבע,מספר משימות\n';
    subjects.forEach(subject => {
      const count = homework.filter(h => h.subject == subject.id).length;
      csvContent += `${subject.name},${subject.color},${count}\n`;
    });
    csvContent += '\n';
    
    // משימות
    csvContent += 'כל המשימות\n';
    csvContent += 'כותרת,מקצוע,תיאור,תאריך הגשה,עדיפות,סטטוס,ימים עד הגשה,תגיות\n';
    
    const sortedHomework = [...homework].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    
    sortedHomework.forEach(hw => {
      const subject = subjects.find(s => s.id == hw.subject);
      const daysLeft = getDaysUntilDue(hw.dueDate);
      const isUrgent = daysLeft <= 2 && !hw.completed;
      const isOverdue = daysLeft < 0 && !hw.completed;
      
      let status = hw.completed ? 'הושלם' : 'ממתין';
      if (isOverdue && !hw.completed) status = 'באיחור';
      else if (isUrgent && !hw.completed) status = 'דחוף';
      
      const daysText = hw.completed ? '-' : (daysLeft < 0 ? `איחור ${Math.abs(daysLeft)} ימים` : `${daysLeft} ימים`);
      const tags = hw.tags ? hw.tags.join('; ') : '';
      const description = hw.description ? hw.description.replace(/,/g, '،').replace(/\n/g, ' ') : '';
      
      csvContent += `"${hw.title}","${subject ? subject.name : '-'}","${description}",${new Date(hw.dueDate).toLocaleDateString('he-IL')},${hw.priority},${status},${daysText},"${tags}"\n`;
    });
    
    // מבחנים
    if (settings.studentMode !== false && exams && exams.length > 0) {
      csvContent += 'מבחנים\n';
      csvContent += 'שם המבחן,מקצוע,תאריך,סטטוס,נושאים שנלמדו,סה"כ נושאים\n';
      [...exams].sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(exam => {
        const subject = subjects.find(s => s.id == exam.subject);
        const daysLeft = getDaysUntilDue(exam.date);
        let status = exam.completed ? 'הסתיים' : (daysLeft < 0 ? 'עבר' : (daysLeft <= 7 ? 'קרוב' : 'מתוכנן'));
        const doneCnt  = (exam.topics || []).filter(t => t.done).length;
        const totalCnt = (exam.topics || []).length;
        const notes = exam.notes ? exam.notes.replace(/,/g, '،').replace(/\n/g, ' ') : '';
        csvContent += `"${exam.title}","${subject ? subject.name : '-'}",${new Date(exam.date).toLocaleDateString('he-IL')},${status},${doneCnt},${totalCnt},"${notes}"\n`;
      });
      csvContent += '\n';
    }

    // יצירת Blob והורדה
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `homework-report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    notifications.showInAppNotification('📊 קובץ CSV נוצר בהצלחה! (פתח ב-Excel)', 'success');
    console.log('✅ exportToExcel: Excel export complete');
    
  } catch (error) {
    console.error('❌ exportToExcel: Error:', error);
    notifications.showInAppNotification('שגיאה ביצירת הקובץ', 'error');
  }
}

function importData() {
  document.getElementById('import-file').click();
}

async function handleImportFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const result = await storage.importData(file);
    if (result.success) {
      subjects = result.data.subjects;
      homework = result.data.homework;
      if (result.data.settings) settings = result.data.settings;
      if (result.data.tags) availableTags = result.data.tags;
      
      render();
      loadSettingsUI();
      notifications.showInAppNotification(result.message, 'success');
    } else {
      notifications.showInAppNotification(result.message, 'error');
    }
  } catch (error) {
    notifications.showInAppNotification(error.message || 'שגיאה בייבוא הנתונים', 'error');
  }
  
  event.target.value = '';
}

async function clearAllData() {
  const confirmMsg = '⚠️ אזהרה!\n\n' +
                    'פעולה זו תמחק את כל הנתונים במערכת:\n' +
                    `- ${subjects.length} מקצועות\n` +
                    `- ${homework.length} משימות\n` +
                    `- ${availableTags.length} תגיות\n` +
                    '- כל ההגדרות\n\n' +
                    '❌ פעולה זו לא ניתנת לשחזור!\n\n' +
                    'האם אתה בטוח לחלוטין?';
  
  if (!confirm(confirmMsg)) return;
  
  const doubleConfirm = prompt('כדי לאשר, הקלד "מחק הכל":');
  if (doubleConfirm !== 'מחק הכל') {
    notifications.showInAppNotification('המחיקה בוטלה', 'success');
    return;
  }
  
  const success = await storage.clearAll();
  if (success) {
    subjects = [];
    homework = [];
    availableTags = [];
    settings = {
      enableNotifications: false,
      notificationDays: 1,
      notificationTime: '09:00',
      autoBackup: false,
      darkMode: false,
      recentColors: []
    };
    
    render();
    closeSettings();
    notifications.showInAppNotification('כל הנתונים נמחקו', 'success');
  } else {
    notifications.showInAppNotification('שגיאה במחיקת הנתונים', 'error');
  }
}

// =============== Event Listeners ===============

function initializeEventListeners() {
  console.log('🎧 initializeEventListeners: Starting...');
  
  // ארכיון
  const archiveToggle = document.getElementById('archive-toggle');
  if (archiveToggle) {
    archiveToggle.addEventListener('click', () => {
      showArchive = !showArchive;
      renderHomework();
    });
  }

  // הוספת מקצוע
  const showAddSubject = document.getElementById('show-add-subject');
  if (showAddSubject) {
    showAddSubject.addEventListener('click', () => {
      document.getElementById('add-subject-form').classList.remove('hidden');
      document.getElementById('show-add-subject').classList.add('hidden');
      renderColorPicker();
    });
  }

  const cancelSubject = document.getElementById('cancel-subject');
  if (cancelSubject) {
    cancelSubject.addEventListener('click', () => {
      document.getElementById('add-subject-form').classList.add('hidden');
      document.getElementById('show-add-subject').classList.remove('hidden');
    });
  }

  const saveSubject = document.getElementById('save-subject');
  if (saveSubject) saveSubject.addEventListener('click', addSubject);

  const addHomeworkBtn = document.getElementById('add-homework');
  if (addHomeworkBtn) addHomeworkBtn.addEventListener('click', addHomework);

  // כפתורים בכותרת
  const toggleDarkModeBtn = document.getElementById('toggle-dark-mode');
  if (toggleDarkModeBtn) toggleDarkModeBtn.addEventListener('click', toggleDarkMode);

  const toggleViewModeBtn = document.getElementById('toggle-view-mode');
  if (toggleViewModeBtn) toggleViewModeBtn.addEventListener('click', toggleViewMode);

  // הגדרות
  const openSettingsBtn = document.getElementById('open-settings');
  if (openSettingsBtn) openSettingsBtn.addEventListener('click', openSettings);

  const closeSettingsBtn = document.getElementById('close-settings');
  if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', closeSettings);

  const settingsModal = document.getElementById('settings-modal');
  if (settingsModal) {
    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) closeSettings();
    });
  }
  
  // מצב לילה
  const darkModeToggle = document.getElementById('dark-mode-toggle');
  if (darkModeToggle) darkModeToggle.addEventListener('change', toggleDarkMode);
  
  // מצב תצוגה
  const viewModeToggle = document.getElementById('view-mode-toggle');
  if (viewModeToggle) {
    viewModeToggle.addEventListener('change', () => {
      console.log('📅 viewModeToggle: Toggle changed in settings');
      const newMode = viewModeToggle.checked ? 'calendar' : 'list';
      if (settings.viewMode !== newMode) {
        toggleViewMode();
      }
    });
  }
  
  // שמירת הגדרות
  const enableNotifications = document.getElementById('enable-notifications');
  if (enableNotifications) enableNotifications.addEventListener('change', saveSettings);

  const notificationDays = document.getElementById('notification-days');
  if (notificationDays) notificationDays.addEventListener('change', saveSettings);

  const notificationTime = document.getElementById('notification-time');
  if (notificationTime) notificationTime.addEventListener('change', saveSettings);

  const autoBackup = document.getElementById('auto-backup');
  if (autoBackup) autoBackup.addEventListener('change', saveSettings);

  const studentModeToggle = document.getElementById('student-mode-toggle');
  if (studentModeToggle) studentModeToggle.addEventListener('change', saveSettings);

  const defaultGradeLevelInput = document.getElementById('default-grade-level');
  if (defaultGradeLevelInput) defaultGradeLevelInput.addEventListener('change', saveSettings);

  // כרטיסי מצב שימוש
  const modeStudentCard = document.getElementById('mode-student-card');
  const modeOtherCard   = document.getElementById('mode-other-card');
  window.updateModeCards = function() {
    const toggle = document.getElementById('student-mode-toggle');
    const isStudent = toggle ? toggle.checked : true;
    if (modeStudentCard) modeStudentCard.classList.toggle('active', isStudent);
    if (modeOtherCard)   modeOtherCard.classList.toggle('active', !isStudent);
  };
  if (modeStudentCard) modeStudentCard.addEventListener('click', () => {
    const toggle = document.getElementById('student-mode-toggle');
    if (toggle) { toggle.checked = true; window.updateModeCards(); saveSettings(); }
  });
  if (modeOtherCard) modeOtherCard.addEventListener('click', () => {
    const toggle = document.getElementById('student-mode-toggle');
    if (toggle) { toggle.checked = false; window.updateModeCards(); saveSettings(); }
  });
  window.openSettings = function() { origOpenSettings && origOpenSettings(); window.updateModeCards(); };

  // ייבוא/ייצוא
  const exportDataBtn = document.getElementById('export-data');
  if (exportDataBtn) exportDataBtn.addEventListener('click', exportData);
  
  const exportPdfBtn = document.getElementById('export-pdf');
  if (exportPdfBtn) exportPdfBtn.addEventListener('click', exportToPDF);
  
  const exportExcelBtn = document.getElementById('export-excel');
  if (exportExcelBtn) exportExcelBtn.addEventListener('click', exportToExcel);

  const importDataBtn = document.getElementById('import-data');
  if (importDataBtn) importDataBtn.addEventListener('click', importData);

  const importFile = document.getElementById('import-file');
  if (importFile) importFile.addEventListener('change', handleImportFile);

  const clearAllDataBtn = document.getElementById('clear-all-data');
  if (clearAllDataBtn) clearAllDataBtn.addEventListener('click', clearAllData);
  
  console.log('✅ initializeEventListeners: Complete');
}

// =============== מבחנים ===============

function initExamModal() {
  const openBtn  = document.getElementById('open-add-exam-modal');
  const modal    = document.getElementById('add-exam-modal');
  const closeBtn = document.getElementById('close-add-exam-modal');
  if (!openBtn || !modal) return;

  openBtn.addEventListener('click', () => {
    modal.classList.remove('hidden');
    // מלא שכבה ברירת מחדל
    const classEl = document.getElementById('exam-class');
    if (classEl && !classEl.value && settings.defaultGradeLevel) {
      classEl.value = settings.defaultGradeLevel;
    }
    renderExamTopicsEditor();
  });
  closeBtn && closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
  modal.addEventListener('click', e => { if (e.target === modal) modal.classList.add('hidden'); });

  const saveBtn = document.getElementById('save-exam-btn');
  if (saveBtn) saveBtn.onclick = addExam;

  const addTopicBtn = document.getElementById('add-exam-topic-btn');
  if (addTopicBtn) addTopicBtn.addEventListener('click', addExamTopic);

  const topicInput = document.getElementById('new-exam-topic');
  if (topicInput) topicInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addExamTopic(); } });

  // אתחול מודל ציון
  const gradeModal    = document.getElementById('grade-modal');
  const closeGradeBtn = document.getElementById('close-grade-modal');
  if (closeGradeBtn && gradeModal) {
    closeGradeBtn.addEventListener('click', () => gradeModal.classList.add('hidden'));
    gradeModal.addEventListener('click', e => { if (e.target === gradeModal) gradeModal.classList.add('hidden'); });
  }

  // חישוב אוטומטי בטופס עריכה
  function recalcEditGrade() {
    const grade      = parseFloat(document.getElementById('exam-grade')?.value);
    const bonus      = parseFloat(document.getElementById('exam-grade-bonus')?.value) || 0;
    const correction = parseFloat(document.getElementById('exam-grade-correction')?.value);
    const max        = parseFloat(document.getElementById('exam-grade-max')?.value) || 100;
    const finalEl    = document.getElementById('exam-grade-final-display');
    const pctEl      = document.getElementById('exam-grade-pct-display');
    const finalGrade = !isNaN(correction) ? correction : (!isNaN(grade) ? Math.min(grade + bonus, max) : null);
    if (finalEl) {
      finalEl.textContent = finalGrade !== null ? finalGrade : '—';
      finalEl.style.color = finalGrade !== null
        ? (finalGrade/max >= 0.9 ? '#16a34a' : finalGrade/max >= 0.75 ? '#2563eb' : finalGrade/max >= 0.55 ? '#d97706' : '#dc2626')
        : '#7c3aed';
    }
    if (pctEl) pctEl.textContent = finalGrade !== null ? Math.round((finalGrade/max)*100)+'%' : '';
  }
  ['exam-grade','exam-grade-bonus','exam-grade-correction','exam-grade-max'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', recalcEditGrade);
  });
}

function renderExamTopicsEditor(topics) {
  const list = document.getElementById('exam-topics-list');
  if (!list) return;
  const arr = topics || window._examTopicsTemp || [];
  window._examTopicsTemp = arr;
  list.innerHTML = arr.length === 0 ? '<p style="color:#9ca3af;font-size:0.85rem;">טרם הוספת נושאים</p>' :
    arr.map((t, i) => `
      <div class="exam-topic-row" style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.4rem;">
        <input type="checkbox" class="checkbox" style="width:1.2rem;height:1.2rem;margin-top:0;" ${t.done ? 'checked' : ''}
          onchange="updateTempTopic(${i}, 'done', this.checked)">
        <span style="flex:1;${t.done ? 'text-decoration:line-through;color:#9ca3af;' : ''}">${t.name}</span>
        <button onclick="removeTempTopic(${i})" style="background:none;border:none;cursor:pointer;color:#ef4444;font-size:1.1rem;padding:0 0.25rem;">×</button>
      </div>`).join('');
}

function addExamTopic() {
  const input = document.getElementById('new-exam-topic');
  const val = input.value.trim();
  if (!val) return;
  window._examTopicsTemp = window._examTopicsTemp || [];
  window._examTopicsTemp.push({ name: val, done: false });
  input.value = '';
  renderExamTopicsEditor();
}

function removeTempTopic(i) {
  window._examTopicsTemp.splice(i, 1);
  renderExamTopicsEditor();
}

function updateTempTopic(i, key, val) {
  if (window._examTopicsTemp && window._examTopicsTemp[i]) {
    window._examTopicsTemp[i][key] = val;
    renderExamTopicsEditor();
  }
}

function onExamTypeChange() {
  const type = document.getElementById('exam-type')?.value;
  const otherEl = document.getElementById('exam-type-other');
  if (otherEl) otherEl.style.display = (type === 'other') ? '' : 'none';
}

function onExamTermChange() {
  const term = (document.getElementById('exam-term')?.value || '');
  const rowB = document.getElementById('exam-date-b-row');
  const rowC = document.getElementById('exam-date-c-row');
  if (rowB) rowB.style.display = (term === 'ב' || term === 'ג') ? '' : 'none';
  if (rowC) rowC.style.display = (term === 'ג') ? '' : 'none';
}

function calcFinalGrade(grade, bonus, correction, max, mode) {
  const base = grade !== null ? Math.min(grade + (bonus || 0), max) : null;
  if (correction === null) return base;
  if (mode === 'highest') return base !== null ? Math.max(base, correction) : correction;
  return correction; // replace (default)
}

function addExam() {
  const g = id => { const el = document.getElementById(id); return el ? el.value : ''; };
  const gNum = id => { const v = parseFloat(g(id)); return isNaN(v) ? null : v; };

  const subject  = g('exam-subject');
  const title    = g('exam-title').trim();
  const date     = g('exam-date');
  const dateB    = g('exam-date-b');
  const dateC    = g('exam-date-c');

  const termVal = g('exam-term');
  const rowBVisible = document.getElementById('exam-date-b-row')?.style.display !== 'none';
  const rowCVisible = document.getElementById('exam-date-c-row')?.style.display !== 'none';
  if (!subject) {
    notifications.showInAppNotification('נא למלא מקצוע', 'error');
    return;
  }

  const grade         = gNum('exam-grade');
  const gradeBonus    = gNum('exam-grade-bonus') || 0;
  const gradeCorrection = gNum('exam-grade-correction');
  const gradeMax      = gNum('exam-grade-max') || 100;

  const correctionMode = g('exam-correction-mode') || 'replace';
  const gradeFinal = calcFinalGrade(grade, gradeBonus, gradeCorrection, gradeMax, correctionMode);

  const pct = (gradeFinal !== null) ? Math.round((gradeFinal / gradeMax) * 100) : null;

  const newExam = {
    id: Date.now(),
    subject,
    title,
    date,
    class: g('exam-class').trim(),
    type: g('exam-type') || 'exam',
    typeOther: g('exam-type') === 'other' ? (document.getElementById('exam-type-other')?.value.trim() || '') : '',
    term: g('exam-term'),
    semester: g('exam-semester'),
    dateB,
    dateC,
    gradeExpected: gNum('exam-grade-expected'),
    grade,
    gradeBonus,
    gradeCorrection,
    correctionMode,
    gradeFinal,
    gradeMax,
    gradePct: pct,
    weight: gNum('exam-weight'),
    link: g('exam-link').trim(),
    notes: g('exam-notes').trim(),
    topics: window._examTopicsTemp || [],
    completed: false
  };

  exams.push(newExam);
  window._examTopicsTemp = [];

  if (typeof gamification !== 'undefined') gamification.onExamAdded(newExam);

  // ניקוי שדות
  ['exam-subject','exam-title','exam-date','exam-date-b','exam-date-c','exam-class','exam-term','exam-semester','exam-type-other','exam-correction-mode',
   'exam-grade-expected','exam-grade','exam-grade-max','exam-grade-bonus',
   'exam-grade-correction','exam-grade-final','exam-weight','exam-link','exam-notes'
  ].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const pctEl = document.getElementById('exam-pct-text');
  if (pctEl) pctEl.textContent = '—';

  saveData();
  render();
  document.getElementById('add-exam-modal').classList.add('hidden');
  notifications.showInAppNotification(`המבחן "${title}" נוסף בהצלחה 📝`, 'success');
}

function deleteExam(id) {
  const numId = Number(id);
  const exam = exams.find(e => e.id === numId || e.id === id);
  if (!exam) return;
  if (confirm(`למחוק את המבחן "${exam.title}"?`)) {
    exams = exams.filter(e => e.id !== numId && e.id !== id);
    saveData();
    render();
    notifications.showInAppNotification('המבחן נמחק', 'success');
  }
}

function toggleExamDone(id) {
  const numId = Number(id);
  const exam = exams.find(e => e.id === numId || e.id === id);
  if (!exam) return;

  if (!exam.completed) {
    // סימון הסתיים → פתח מודל ציון
    openGradeModal(exam);
  } else {
    // ביטול הסתיים
    exam.completed = false;
    saveData();
    render();
  }
}

function openGradeModal(exam) {
  const modal = document.getElementById('grade-modal');
  if (!modal) return;

  document.getElementById('grade-modal-title').textContent = `🎯 ${exam.title} — הזנת ציון`;
  document.getElementById('grade-exam-id').value = exam.id;

  // מלא ערכים קיימים
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val ?? ''; };
  set('grade-max',        exam.gradeMax || 100);
  set('grade-value',      exam.grade ?? '');
  set('grade-bonus',      exam.gradeBonus || '');
  set('grade-correction',      exam.gradeCorrection ?? '');
  set('grade-correction-mode', exam.correctionMode || 'replace');
  set('grade-expected',   exam.gradeExpected ?? '');

  recalcGradeModal();
  modal.classList.remove('hidden');
}

function recalcGradeModal() {
  const grade      = parseFloat(document.getElementById('grade-value')?.value);
  const bonus      = parseFloat(document.getElementById('grade-bonus')?.value) || 0;
  const correction = parseFloat(document.getElementById('grade-correction')?.value);
  const max        = parseFloat(document.getElementById('grade-max')?.value) || 100;
  const finalEl    = document.getElementById('grade-final-display');
  const pctEl      = document.getElementById('grade-pct-display');

  const corrMode = document.getElementById('grade-correction-mode')?.value || 'replace';
  const gradeVal = !isNaN(grade) ? grade : null;
  const corrVal  = !isNaN(correction) ? correction : null;
  const finalGrade = calcFinalGrade(gradeVal, bonus, corrVal, max, corrMode);

  if (finalEl) {
    finalEl.textContent = finalGrade !== null ? finalGrade : '—';
    finalEl.style.color = finalGrade !== null
      ? (finalGrade/max >= 0.9 ? '#16a34a' : finalGrade/max >= 0.75 ? '#2563eb' : finalGrade/max >= 0.55 ? '#d97706' : '#dc2626')
      : '#9ca3af';
  }
  if (pctEl && finalGrade !== null) {
    const pct = Math.round((finalGrade / max) * 100);
    pctEl.textContent = pct + '%';
    pctEl.style.color = pct >= 90 ? '#16a34a' : pct >= 75 ? '#2563eb' : pct >= 55 ? '#d97706' : '#dc2626';
  } else if (pctEl) {
    pctEl.textContent = '—';
    pctEl.style.color = '#9ca3af';
  }
}

function saveGrade() {
  const id   = Number(document.getElementById('grade-exam-id').value);
  const exam = exams.find(e => e.id === id);
  if (!exam) return;

  const gNum = elId => { const v = parseFloat(document.getElementById(elId)?.value); return isNaN(v) ? null : v; };
  exam.grade           = gNum('grade-value');
  exam.gradeBonus      = gNum('grade-bonus') || 0;
  exam.gradeCorrection = gNum('grade-correction');
  exam.gradeMax        = gNum('grade-max') || 100;
  exam.gradeExpected   = gNum('grade-expected');

  exam.correctionMode = document.getElementById('grade-correction-mode')?.value || 'replace';
  const finalGrade = calcFinalGrade(exam.grade, exam.gradeBonus, exam.gradeCorrection, exam.gradeMax, exam.correctionMode);
  exam.gradeFinal = finalGrade;
  exam.gradePct   = finalGrade !== null ? Math.round((finalGrade / exam.gradeMax) * 100) : null;

  exam.completed = true;
  if (typeof gamification !== 'undefined') gamification.onExamCompleted(exam);

  saveData();
  render();
  document.getElementById('grade-modal').classList.add('hidden');
  notifications.showInAppNotification(
    finalGrade !== null ? `✅ המבחן הסתיים — ציון: ${finalGrade}` : '✅ המבחן סומן כהסתיים',
    'success'
  );
}

function openExamEditModal(id) {
  const numId = Number(id);
  const exam  = exams.find(e => e.id === numId || e.id === id);
  if (!exam) return;

  // עדכן כותרת
  document.getElementById('add-exam-modal').querySelector('h2').textContent = '✏️ עריכת מבחן';
  document.getElementById('save-exam-btn').textContent = 'שמור שינויים';
  document.getElementById('save-exam-btn').onclick = () => saveExamEdit(exam.id);

  const set = (elId, val) => { const el = document.getElementById(elId); if (el) el.value = val ?? ''; };
  set('exam-subject',          exam.subject);
  set('exam-title',            exam.title);
  set('exam-date',             exam.date);
  set('exam-class',            exam.class || '');
  set('exam-type',             exam.type || 'exam');
  const typeOtherEl = document.getElementById('exam-type-other');
  if (typeOtherEl) { typeOtherEl.value = exam.typeOther || ''; typeOtherEl.style.display = exam.type === 'other' ? '' : 'none'; }
  set('exam-term',             exam.term || '');
  set('exam-semester',         exam.semester || '');
  set('exam-date-b',           exam.dateB || '');
  set('exam-date-c',           exam.dateC || '');
  onExamTermChange();
  set('exam-grade-expected',   exam.gradeExpected ?? '');
  set('exam-grade',            exam.grade ?? '');
  set('exam-grade-max',        exam.gradeMax || 100);
  set('exam-grade-bonus',      exam.gradeBonus || '');
  set('exam-grade-correction', exam.gradeCorrection ?? '');
  set('exam-correction-mode',   exam.correctionMode || 'replace');
  set('exam-weight',           exam.weight ?? '');
  set('exam-link',             exam.link || '');
  set('exam-notes',            exam.notes || '');

  window._examTopicsTemp = (exam.topics || []).map(t => ({ ...t }));
  renderExamTopicsEditor();

  // הצג שדות ציון בעריכה
  const gradeSection = document.getElementById('exam-grade-section');
  if (gradeSection) gradeSection.style.display = '';

  document.getElementById('add-exam-modal').classList.remove('hidden');
}

function saveExamEdit(id) {
  const numId = Number(id);
  const exam  = exams.find(e => e.id === numId || e.id === id);
  if (!exam) return;

  const g    = elId => { const el = document.getElementById(elId); return el ? el.value : ''; };
  const gNum = elId => { const v = parseFloat(g(elId)); return isNaN(v) ? null : v; };

  if (!g('exam-subject')) {
    notifications.showInAppNotification('נא למלא מקצוע', 'error');
    return;
  }
  const _rowBVisible = document.getElementById('exam-date-b-row')?.style.display !== 'none';
  const _rowCVisible = document.getElementById('exam-date-c-row')?.style.display !== 'none';
  if (_rowBVisible && !g('exam-date-b')) {
    notifications.showInAppNotification('נא למלא תאריך מועד ב׳', 'error');
    return;
  }
  if (_rowCVisible && !g('exam-date-c')) {
    notifications.showInAppNotification('נא למלא תאריך מועד ג׳', 'error');
    return;
  }

  exam.subject       = g('exam-subject');
  exam.title         = g('exam-title').trim();
  exam.date          = g('exam-date');
  exam.class         = g('exam-class').trim();
  exam.type          = g('exam-type') || 'exam';
  exam.typeOther     = exam.type === 'other' ? (document.getElementById('exam-type-other')?.value.trim() || '') : '';
  exam.term          = g('exam-term');
  exam.semester      = g('exam-semester');
  exam.dateB         = g('exam-date-b');
  exam.dateC         = g('exam-date-c');
  exam.gradeExpected = gNum('exam-grade-expected');
  exam.grade         = gNum('exam-grade');
  exam.gradeBonus    = gNum('exam-grade-bonus') || 0;
  exam.gradeCorrection = gNum('exam-grade-correction');
  exam.gradeMax      = gNum('exam-grade-max') || 100;
  exam.weight        = gNum('exam-weight');
  exam.link          = g('exam-link').trim();
  exam.notes         = g('exam-notes').trim();
  exam.topics        = window._examTopicsTemp || [];

  exam.correctionMode = g('exam-correction-mode') || 'replace';
  const finalGrade = calcFinalGrade(exam.grade, exam.gradeBonus, exam.gradeCorrection, exam.gradeMax, exam.correctionMode);
  exam.gradeFinal = finalGrade;
  exam.gradePct   = finalGrade !== null ? Math.round((finalGrade / exam.gradeMax) * 100) : null;

  window._examTopicsTemp = [];

  // איפוס כפתור לברירת מחדל
  const saveBtn = document.getElementById('save-exam-btn');
  if (saveBtn) { saveBtn.textContent = 'שמור מבחן'; saveBtn.onclick = addExam; }
  document.getElementById('add-exam-modal').querySelector('h2').textContent = '📝 הוסף מבחן חדש';

  saveData();
  render();
  document.getElementById('add-exam-modal').classList.add('hidden');
  notifications.showInAppNotification(`המבחן "${exam.title}" עודכן`, 'success');
}

function toggleExamTopic(examId, topicIndex) {
  const numId = Number(examId);
  const exam = exams.find(e => e.id === numId || e.id === examId);
  if (!exam || !exam.topics[topicIndex]) return;
  const wasDone = exam.topics[topicIndex].done;
  exam.topics[topicIndex].done = !wasDone;
  if (typeof gamification !== 'undefined') {
    if (!wasDone) gamification.onTopicDone(exam);
    else gamification.onTopicUndone();
  }
  saveData();
  render();
}

function renderExams() {
  const container = document.getElementById('exams-section');
  if (!container) return;

  const upcoming = exams
    .filter(e => !e.completed)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const done = exams.filter(e => e.completed);

  if (exams.length === 0) {
    container.innerHTML = '<p style="color:#9ca3af;font-size:0.9rem;text-align:center;padding:1rem 0;">אין מבחנים קרובים</p>';
    return;
  }

  const renderExamCard = (exam) => {
    const subject = subjects.find(s => s.id == exam.subject);
    const daysLeft = getDaysUntilDue(exam.date);
    const isOverdue = daysLeft < 0 && !exam.completed;
    const isUrgent  = daysLeft <= 3 && daysLeft >= 0 && !exam.completed;

    let daysText = '';
    if (!exam.completed) {
      if (isOverdue) daysText = `עבר לפני ${Math.abs(daysLeft)} ימים`;
      else if (daysLeft === 0) daysText = '⚠️ היום!';
      else if (daysLeft === 1) daysText = '⚠️ מחר!';
      else daysText = `עוד ${daysLeft} ימים`;
    }

    const doneCnt  = (exam.topics || []).filter(t => t.done).length;
    const totalCnt = (exam.topics || []).length;
    const pct      = totalCnt ? Math.round((doneCnt / totalCnt) * 100) : null;

    let borderColor = subject ? subject.color : '#8b5cf6';
    if (isOverdue) borderColor = '#ef4444';
    if (isUrgent)  borderColor = '#f59e0b';

    return `
      <div class="exam-card ${exam.completed ? 'exam-done' : ''} ${isOverdue ? 'exam-overdue' : ''} ${isUrgent ? 'exam-urgent' : ''}"
           style="border-left: 4px solid ${borderColor};">
        <div style="display:flex;align-items:start;gap:0.75rem;">
          <input type="checkbox" class="checkbox" style="width:1.3rem;height:1.3rem;accent-color:#8b5cf6;margin-top:0.2rem;"
            ${exam.completed ? 'checked' : ''} onchange="toggleExamDone('${exam.id}')">
          <div style="flex:1;">
            <div class="homework-badges" style="margin-bottom:0.4rem;">
              <span class="badge" style="background:#8b5cf6;">📝 מבחן</span>
              ${subject ? `<span class="badge" style="background:${subject.color};">${subject.name}</span>` : ''}
              ${isOverdue ? '<span class="badge" style="background:#ef4444;">עבר!</span>' : ''}
              ${isUrgent  ? '<span class="badge" style="background:#f59e0b;">קרוב!</span>' : ''}
            </div>
            <h3 class="homework-title ${exam.completed ? 'completed' : ''}" style="margin-bottom:0.35rem;">${exam.title}</h3>
            ${exam.notes ? `<p class="homework-desc">${exam.notes}</p>` : ''}

            <div class="homework-meta" style="margin-bottom:${totalCnt ? '0.75rem' : '0'};">
              <span>📅 ${new Date(exam.date).toLocaleDateString('he-IL')}</span>
              ${daysText ? `<span class="days-left ${isOverdue ? 'overdue' : isUrgent ? 'urgent' : ''}">${daysText}</span>` : ''}
            </div>

            ${totalCnt ? `
              <div class="exam-topics">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.4rem;">
                  <span style="font-size:0.82rem;font-weight:600;color:#6b7280;">נושאים ללימוד</span>
                  <span style="font-size:0.82rem;color:#8b5cf6;font-weight:600;">${doneCnt}/${totalCnt} (${pct}%)</span>
                </div>
                <div class="exam-progress-bar">
                  <div class="exam-progress-fill" style="width:${pct}%;"></div>
                </div>
                <div style="margin-top:0.5rem;">
                  ${(exam.topics || []).map((t, i) => `
                    <label class="exam-topic-check">
                      <input type="checkbox" ${t.done ? 'checked' : ''} onchange="toggleExamTopic('${exam.id}', ${i})">
                      <span style="${t.done ? 'text-decoration:line-through;color:#9ca3af;' : ''}">${t.name}</span>
                    </label>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </div>
          <button class="icon-btn" onclick="deleteExam('${exam.id}')" title="מחק מבחן">
            <svg width="20" height="20"><use href="#trash"></use></svg>
          </button>
        </div>
      </div>`;
  };

  container.innerHTML = upcoming.map(renderExamCard).join('') +
    (done.length ? `
      <div style="margin-top:1rem;">
        <p style="font-size:0.82rem;color:#9ca3af;margin-bottom:0.5rem;">מבחנים שהסתיימו (${done.length})</p>
        ${done.map(renderExamCard).join('')}
      </div>` : '');
}

function saveGradeSkip() {
  const id   = Number(document.getElementById('grade-exam-id').value);
  const exam = exams.find(e => e.id === id);
  if (!exam) return;
  exam.completed = true;
  if (typeof gamification !== 'undefined') gamification.onExamCompleted(exam);
  saveData();
  render();
  document.getElementById('grade-modal').classList.add('hidden');
  notifications.showInAppNotification('✅ המבחן סומן כהסתיים', 'success');
}

// =============== אתחול ===============

// חשיפת פונקציות ל-window עבור onclick ב-HTML
window.deleteHomework = deleteHomework;
window.toggleComplete = toggleComplete;
window.openEditHomeworkModal = openEditHomeworkModal;
window.saveEditHomework = saveEditHomework;
window.addHomework = addHomework;
window.toggleTagEditor = toggleTagEditor;
window.addTag = addTag;
window.removeTag = removeTag;
window.downloadFile = downloadFile;
// מבחנים
window.deleteExam = deleteExam;
window.toggleExamDone = toggleExamDone;
window.toggleExamTopic = toggleExamTopic;
window.openExamEditModal = openExamEditModal;
window.saveGrade = saveGrade;
window.saveGradeSkip = saveGradeSkip;
window.recalcGradeModal = recalcGradeModal;
window.updateTempTopic = updateTempTopic;
window.removeTempTopic = removeTempTopic;
window.onExamTermChange = onExamTermChange;
window.onExamTypeChange = onExamTypeChange;

window.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 APPLICATION STARTING');
  try {
    await loadData();
    initializeEventListeners();
    console.log('🎉 APPLICATION STARTED SUCCESSFULLY');
  } catch (error) {
    console.error('❌ APPLICATION START FAILED:', error);
  }
});
// ─── העלאת שכבה אוטומטית ב-1 בספטמבר ───
const GRADE_LEVELS = ['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ז׳','ח׳','ט׳','י׳','י״א','י״ב'];

async function autoAdvanceGradeLevel() {
  const now = new Date();
  const isSept1 = now.getMonth() === 8 && now.getDate() === 1; // ספטמבר = 8 (0-based)
  if (!isSept1) return;

  const lastAdvanceYear = settings.gradeAutoAdvanceYear;
  if (lastAdvanceYear === now.getFullYear()) return; // כבר בוצע השנה

  const current = (settings.defaultGradeLevel || '').trim();
  const idx = GRADE_LEVELS.indexOf(current);
  if (idx === -1 || idx >= GRADE_LEVELS.length - 1) return; // לא נמצא או כבר י״ב

  settings.defaultGradeLevel = GRADE_LEVELS[idx + 1];
  settings.gradeAutoAdvanceYear = now.getFullYear();
  await storage.set('homework-settings', settings);

  // עדכן את שדה הקלט אם פתוח
  const el = document.getElementById('default-grade-level');
  if (el) el.value = settings.defaultGradeLevel;

  console.log(`📈 שכבה עודכנה אוטומטית ל-${settings.defaultGradeLevel}`);
}