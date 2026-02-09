// Enhanced Main Application Logic - גרסה משודרגת עם פיצ'רים חדשים
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
  viewMode: 'list'
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

// =============== טעינה ושמירה ===============

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
    
    if (settings.darkMode) {
      console.log('🌙 loadData: Applying dark mode...');
      document.body.classList.add('dark-mode');
      const toggleBtn = document.getElementById('toggle-dark-mode');
      if (toggleBtn) {
        const svg = toggleBtn.querySelector('svg use');
        if (svg) svg.setAttribute('href', '#sun');
      }
    }
    
    if (settings.viewMode) {
      const toggleViewBtn = document.getElementById('toggle-view-mode');
      if (toggleViewBtn) {
        const svg = toggleViewBtn.querySelector('svg use');
        if (svg) svg.setAttribute('href', settings.viewMode === 'list' ? '#calendar' : '#list');
      }
    }
    
    if (deduplicateColors()) {
      console.log('✅ loadData: Removed duplicate colors');
    }
    
    render();
    
    if (settings.enableNotifications && notifications.permission === 'granted') {
      await notifications.startPeriodicCheck(homework, settings);
    }
    
    if (settings.autoBackup) {
      await storage.autoBackup();
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
  
  colors.forEach(color => {
    html += `
      <div class="color-option ${color === selectedColor ? 'selected' : ''}" 
           style="background-color: ${color};"
           onclick="selectColor('${color}')"></div>
    `;
  });
  
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

function deduplicateColors() {
  if (!settings.recentColors || settings.recentColors.length === 0) return false;
  const originalLength = settings.recentColors.length;
  settings.recentColors = settings.recentColors.filter(color => !colors.includes(color));
  settings.recentColors = [...new Set(settings.recentColors)];
  const newLength = settings.recentColors.length;
  if (originalLength !== newLength) {
    saveData();
    return true;
  }
  return false;
}

// =============== מצב לילה ===============

function toggleDarkMode() {
  settings.darkMode = !settings.darkMode;
  document.body.classList.toggle('dark-mode');
  
  const toggleBtn = document.getElementById('toggle-dark-mode');
  if (toggleBtn) {
    const svg = toggleBtn.querySelector('svg use');
    if (svg) svg.setAttribute('href', settings.darkMode ? '#sun' : '#moon');
  }
  
  saveData();
  
  if (typeof updateChartColors === 'function') {
    setTimeout(() => updateChartColors(), 100);
  }
  
  const icon = settings.darkMode ? '🌙' : '☀️';
  const message = `מצב ${settings.darkMode ? 'לילה' : 'יום'} הופעל ${icon}`;
  notifications.showInAppNotification(message, 'success');
}

function toggleViewMode() {
  settings.viewMode = settings.viewMode === 'list' ? 'calendar' : 'list';
  
  const toggleBtn = document.getElementById('toggle-view-mode');
  if (toggleBtn) {
    const svg = toggleBtn.querySelector('svg use');
    if (svg) svg.setAttribute('href', settings.viewMode === 'list' ? '#calendar' : '#list');
  }
  
  saveData();
  
  const message = `תצוגת ${settings.viewMode === 'list' ? 'רשימה' : 'לוח שנה'}`;
  notifications.showInAppNotification(message, 'info');
  
  if (settings.viewMode === 'calendar') {
    if (typeof calendar !== 'undefined' && calendar.renderCalendar) {
      calendar.renderCalendar();
    }
  } else {
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

// =============== NEW: רינדור הפיצ'רים החדשים ===============

function renderNewFeatures() {
  // Render Search Bar
  const searchBarContainer = document.getElementById('search-bar-container');
  if (searchBarContainer && typeof smartSearch !== 'undefined') {
    searchBarContainer.innerHTML = smartSearch.renderSearchBar();
  }
  
  // Render Study Timer
  const timerContainer = document.getElementById('timer-panel-container');
  if (timerContainer && typeof studyTimer !== 'undefined') {
    if (!document.querySelector('.timer-panel')) {
      const timerPanel = studyTimer.renderTimerUI();
      timerContainer.appendChild(timerPanel);
      studyTimer.updateStats();
    }
  }
  
  // Render Achievements Panel
  const achievementsContainer = document.getElementById('achievements-panel-container');
  if (achievementsContainer && typeof achievements !== 'undefined') {
    achievementsContainer.innerHTML = achievements.renderAchievementsPanel();
    achievements.updateDisplay();
  }
  
  // Render Quick Actions Button
  const quickActionsContainer = document.getElementById('quick-actions-container');
  if (quickActionsContainer && typeof quickActions !== 'undefined') {
    quickActionsContainer.innerHTML = quickActions.renderQuickActionsButton();
  }
}

// =============== NEW: חישוב סטטיסטיקות להישגים ===============

async function getAchievementStats() {
  const completedTasks = homework.filter(h => h.completed).length;
  const earlyCompletions = homework.filter(h => {
    if (!h.completed) return false;
    const daysLeft = getDaysUntilDue(h.dueDate);
    return daysLeft > 0;
  }).length;
  
  const timerStats = await storage.get('timer-stats') || { totalSessions: 0 };
  const subjectsCreated = subjects.length;
  const lateNightCompletions = 0;
  const currentStreak = 0;
  
  return {
    completedTasks,
    earlyCompletions,
    pomodoroSessions: timerStats.totalSessions,
    subjectsCreated,
    lateNightCompletions,
    currentStreak
  };
}

// =============== רינדור ===============

function renderSubjects() {
  const list = document.getElementById('subject-list');
  const select = document.getElementById('hw-subject');
  const filterSelect = document.getElementById('filter-subject');
  
  if (subjects.length === 0) {
    list.innerHTML = '<p class="empty-state">טרם הוספו מקצועות</p>';
  } else {
    list.innerHTML = subjects.map(s => `
      <div class="subject-item" style="border-color: ${s.color};">
        <div class="subject-info">
          <div class="subject-color" style="background-color: ${s.color};"></div>
          <span class="subject-name">${s.name}</span>
        </div>
        <button class="icon-btn" onclick="deleteSubject(${s.id})">
          <svg width="16" height="16"><use href="#trash"></use></svg>
        </button>
      </div>
    `).join('');
  }
  
  const subjectOptions = '<option value="">בחר מקצוע</option>' + 
    subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
  
  if (select) select.innerHTML = subjectOptions;
  
  if (filterSelect) {
    filterSelect.innerHTML = '<option value="all">כל המקצועות</option>' + 
      subjects.map(s => `<option value="${s.id}" ${filters.subject == s.id ? 'selected' : ''}>${s.name}</option>`).join('');
  }
}

function renderFilters() {
  const container = document.getElementById('filters-container');
  if (!container) return;
  
  let html = `
    <div class="filters-panel">
      <h3>סינון משימות</h3>
      
      <div class="filter-group">
        <label>מקצוע:</label>
        <select class="select" id="filter-subject" onchange="setFilter('subject', this.value)">
          <option value="all">כל המקצועות</option>
        </select>
      </div>
      
      <div class="filter-group">
        <label>סטטוס:</label>
        <select class="select" id="filter-status" onchange="setFilter('status', this.value)">
          <option value="all" ${filters.status === 'all' ? 'selected' : ''}>הכל</option>
          <option value="pending" ${filters.status === 'pending' ? 'selected' : ''}>ממתין</option>
          <option value="completed" ${filters.status === 'completed' ? 'selected' : ''}>הושלם</option>
        </select>
      </div>
      
      <div class="filter-group">
        <label>דחיפות:</label>
        <select class="select" id="filter-urgency" onchange="setFilter('urgency', this.value)">
          <option value="all" ${filters.urgency === 'all' ? 'selected' : ''}>הכל</option>
          <option value="urgent" ${filters.urgency === 'urgent' ? 'selected' : ''}>דחוף (2 ימים)</option>
          <option value="overdue" ${filters.urgency === 'overdue' ? 'selected' : ''}>באיחור</option>
        </select>
      </div>
      
      ${availableTags.length > 0 ? `
        <div class="filter-group">
          <label>תגיות:</label>
          <div class="tags-filter">
            ${availableTags.map(tag => `
              <label class="tag-filter-item ${filters.tags.includes(tag) ? 'active' : ''}">
                <input type="checkbox" ${filters.tags.includes(tag) ? 'checked' : ''} 
                       onchange="toggleTagFilter('${tag}')">
                <span>${tag}</span>
              </label>
            `).join('')}
          </div>
        </div>
      ` : ''}
      
      <button class="btn btn-secondary" onclick="clearFilters()" style="margin-top: 1rem;">
        נקה סינון
      </button>
    </div>
  `;
  
  container.innerHTML = html;
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
  if (settings.viewMode === 'calendar') {
    if (typeof calendar !== 'undefined' && calendar.renderCalendar) {
      calendar.renderCalendar();
      return;
    }
  }
  
  const list = document.getElementById('homework-list');
  const archiveBtn = document.getElementById('archive-toggle');

  const activeHomework = homework.filter(h => {
    if (!h.completed) return true;
    return getDaysUntilDue(h.dueDate) >= 0;
  });

  const archivedHomework = homework.filter(h => {
    if (!h.completed) return false;
    return getDaysUntilDue(h.dueDate) < 0;
  });

  if (archivedHomework.length > 0) {
    archiveBtn.classList.remove('hidden');
    archiveBtn.textContent = showArchive ? 'הסתר ארכיון' : `ארכיון (${archivedHomework.length})`;
  } else {
    archiveBtn.classList.add('hidden');
  }

  let displayList = showArchive ? archivedHomework : activeHomework;
  displayList = getFilteredHomework(displayList);

  if (displayList.length === 0) {
    const message = showArchive ? 'אין פריטים בארכיון' : 'אין שיעורי בית להצגה';
    list.innerHTML = `<p class="empty-state">${message}</p>`;
    return;
  }

  const sorted = [...displayList].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return new Date(a.dueDate) - new Date(b.dueDate);
  });

  list.innerHTML = sorted.map(hw => {
    const subject = subjects.find(s => s.id == hw.subject);
    const daysLeft = getDaysUntilDue(hw.dueDate);
    const isUrgent = daysLeft <= 2 && !hw.completed;
    const isOverdue = daysLeft < 0 && !hw.completed;

    let classes = 'homework-item';
    if (hw.completed) classes += ' completed';
    if (isOverdue) classes += ' overdue';
    else if (isUrgent) classes += ' urgent';

    let daysText = '';
    if (!hw.completed) {
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
                <button class="btn btn-secondary" onclick="toggleTagEditor(${hw.id})" style="padding: 0.25rem 0.5rem; width: auto; font-size: 0.75rem;">
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
              <span>
                <svg width="16" height="16" style="display: inline; vertical-align: middle;"><use href="#calendar"></use></svg>
                ${new Date(hw.dueDate).toLocaleDateString('he-IL')}
              </span>
              ${daysText ? `<span class="days-left ${isOverdue ? 'overdue' : isUrgent ? 'urgent' : ''}">${daysText}</span>` : ''}
            </div>
          </div>
          <button class="icon-btn" onclick="deleteHomework(${hw.id})">
            <svg width="20" height="20"><use href="#trash"></use></svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function toggleTagEditor(homeworkId) {
  const editor = document.getElementById(`tags-editor-${homeworkId}`);
  if (editor) editor.classList.toggle('hidden');
}

function updateStats() {
  const total = homework.length;
  const completed = homework.filter(h => h.completed).length;
  const pending = homework.filter(h => !h.completed).length;
  const urgent = homework.filter(h => !h.completed && getDaysUntilDue(h.dueDate) <= 2).length;
  
  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-completed').textContent = completed;
  document.getElementById('stat-pending').textContent = pending;
  document.getElementById('stat-urgent').textContent = urgent;
  
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
  renderNewFeatures(); // NEW: Render new features
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

// =============== פעולות על משימות - UPDATED ===============

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

async function toggleComplete(id) {
  const hw = homework.find(h => h.id === id);
  if (!hw) return;
  
  const wasCompleted = hw.completed;
  hw.completed = !hw.completed;
  
  // NEW: Add achievement points for completing task
  if (!wasCompleted && hw.completed && typeof achievements !== 'undefined') {
    await achievements.addPoints(5, `השלמת "${hw.title}"`);
    
    const daysLeft = getDaysUntilDue(hw.dueDate);
    if (daysLeft > 0) {
      await achievements.addPoints(5, 'השלמה מוקדמת');
    }
    
    const stats = await getAchievementStats();
    await achievements.checkAchievements(stats);
  }
  
  saveData();
  render();
  
  if (hw.completed) {
    notifications.showInAppNotification(`כל הכבוד! סיימת את "${hw.title}"`, 'success');
  }
}

function deleteHomework(id) {
  const hw = homework.find(h => h.id === id);
  if (!hw) return;
  
  if (confirm(`האם אתה בטוח שברצונך למחוק את המשימה "${hw.title}"?\n\n⚠️ פעולה זו לא ניתנת לביטול!`)) {
    homework = homework.filter(h => h.id !== id);
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
}

function closeSettings() {
  const modal = document.getElementById('settings-modal');
  if (!modal) return;
  modal.classList.add('hidden');
}

async function loadSettingsUI() {
  document.getElementById('enable-notifications').checked = settings.enableNotifications;
  document.getElementById('notification-days').value = settings.notificationDays;
  document.getElementById('notification-time').value = settings.notificationTime;
  document.getElementById('auto-backup').checked = settings.autoBackup;
  document.getElementById('dark-mode-toggle').checked = settings.darkMode;
  document.getElementById('view-mode-toggle').checked = settings.viewMode === 'calendar';
  
  const lastBackup = await storage.getLastBackupDate();
  const lastBackupInfo = document.getElementById('last-backup-info');
  if (lastBackup) {
    lastBackupInfo.textContent = `גיבוי אחרון: ${lastBackup.toLocaleDateString('he-IL')} בשעה ${lastBackup.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`;
  } else {
    lastBackupInfo.textContent = 'גיבוי אחרון: אף פעם';
  }
}

async function saveSettings() {
  settings.enableNotifications = document.getElementById('enable-notifications').checked;
  settings.notificationDays = parseInt(document.getElementById('notification-days').value);
  settings.notificationTime = document.getElementById('notification-time').value;
  settings.autoBackup = document.getElementById('auto-backup').checked;
  
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
          <div style="font-size: 32px; font-weight: bold; color: #dc2626;">${homework.filter(h => !h.completed && getDaysUntilDue(h.dueDate) <= 2).length}</div>
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
      
      <div style="margin-top: 40px; text-align: center; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
        <p>מערכת ניהול שיעורי בית</p>
        <p>© ${new Date().getFullYear()} - נוצר ב-${new Date().toLocaleString('he-IL')}</p>
      </div>
    `;
    
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
    
    await html2pdf().set(opt).from(pdfContent).save();
    
    notifications.showInAppNotification('📄 דוח PDF נוצר בהצלחה!', 'success');
    
  } catch (error) {
    console.error('❌ exportToPDF: Error:', error);
    notifications.showInAppNotification('שגיאה ביצירת הדוח', 'error');
  }
}

async function exportToExcel() {
  console.log('📊 exportToExcel: Starting Excel export...');
  
  try {
    let csvContent = '\uFEFF';
    csvContent += `דוח שיעורי בית - ${new Date().toLocaleDateString('he-IL')}\n\n`;
    csvContent += 'סטטיסטיקות\n';
    csvContent += 'סך הכל,הושלמו,ממתינים,דחופים\n';
    csvContent += `${homework.length},${homework.filter(h => h.completed).length},${homework.filter(h => !h.completed).length},${homework.filter(h => !h.completed && getDaysUntilDue(h.dueDate) <= 2).length}\n\n`;
    
    csvContent += 'מקצועות\n';
    csvContent += 'שם המקצוע,צבע,מספר משימות\n';
    subjects.forEach(subject => {
      const count = homework.filter(h => h.subject == subject.id).length;
      csvContent += `${subject.name},${subject.color},${count}\n`;
    });
    csvContent += '\n';
    
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
  
  const archiveToggle = document.getElementById('archive-toggle');
  if (archiveToggle) {
    archiveToggle.addEventListener('click', () => {
      showArchive = !showArchive;
      renderHomework();
    });
  }

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

  const toggleDarkModeBtn = document.getElementById('toggle-dark-mode');
  if (toggleDarkModeBtn) toggleDarkModeBtn.addEventListener('click', toggleDarkMode);

  const toggleViewModeBtn = document.getElementById('toggle-view-mode');
  if (toggleViewModeBtn) toggleViewModeBtn.addEventListener('click', toggleViewMode);

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
  
  const darkModeToggle = document.getElementById('dark-mode-toggle');
  if (darkModeToggle) darkModeToggle.addEventListener('change', toggleDarkMode);
  
  const viewModeToggle = document.getElementById('view-mode-toggle');
  if (viewModeToggle) {
    viewModeToggle.addEventListener('change', () => {
      const newMode = viewModeToggle.checked ? 'calendar' : 'list';
      if (settings.viewMode !== newMode) {
        toggleViewMode();
      }
    });
  }
  
  const enableNotifications = document.getElementById('enable-notifications');
  if (enableNotifications) enableNotifications.addEventListener('change', saveSettings);

  const notificationDays = document.getElementById('notification-days');
  if (notificationDays) notificationDays.addEventListener('change', saveSettings);

  const notificationTime = document.getElementById('notification-time');
  if (notificationTime) notificationTime.addEventListener('change', saveSettings);

  const autoBackup = document.getElementById('auto-backup');
  if (autoBackup) autoBackup.addEventListener('change', saveSettings);

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

// =============== אתחול ===============

window.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 APPLICATION STARTING (WITH NEW FEATURES)');
  try {
    await loadData();
    
    // NEW: Initialize new features
    if (typeof achievements !== 'undefined') {
      await achievements.load();
    }
    
    if (typeof quickActions !== 'undefined') {
      quickActions.init();
    }
    
    initializeEventListeners();
    
    console.log('🎉 APPLICATION STARTED SUCCESSFULLY (WITH NEW FEATURES)');
  } catch (error) {
    console.error('❌ APPLICATION START FAILED:', error);
  }
});
