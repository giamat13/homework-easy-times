// Enhanced Main Application Logic
const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
let subjects = [];
let homework = [];
let settings = {
  enableNotifications: false,
  notificationDays: 1,
  notificationTime: '09:00',
  autoBackup: false,
  darkMode: false,
  recentColors: []
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
let viewMode = 'list'; // 'list' or 'calendar'

// =============== טעינה ושמירה ===============

async function loadData() {
  console.log('🔄 loadData: Starting data load...');
  try {
    console.log('📊 loadData: Loading subjects...');
    subjects = await storage.get('homework-subjects') || [];
    console.log('✅ loadData: Subjects loaded:', subjects.length, 'items', subjects);
    
    console.log('📚 loadData: Loading homework...');
    homework = await storage.get('homework-list') || [];
    console.log('✅ loadData: Homework loaded:', homework.length, 'items', homework);
    
    console.log('🏷️ loadData: Loading tags...');
    availableTags = await storage.get('homework-tags') || [];
    console.log('✅ loadData: Tags loaded:', availableTags.length, 'items', availableTags);
    
    console.log('⚙️ loadData: Loading settings...');
    settings = await storage.get('homework-settings') || {
      enableNotifications: false,
      notificationDays: 1,
      notificationTime: '09:00',
      autoBackup: false,
      darkMode: false,
      recentColors: []
    };
    console.log('✅ loadData: Settings loaded:', settings);
    
    // החל מצב לילה אם נבחר
    if (settings.darkMode) {
      console.log('🌙 loadData: Applying dark mode...');
      document.body.classList.add('dark-mode');
      console.log('✅ loadData: Dark mode applied');
    }
    
    console.log('🎨 loadData: Starting render...');
    render();
    console.log('✅ loadData: Render complete');
    
    // התחל בדיקת התראות אם מופעל
    if (settings.enableNotifications && notifications.permission === 'granted') {
      console.log('🔔 loadData: Starting periodic notification check...');
      await notifications.startPeriodicCheck(homework, settings);
      console.log('✅ loadData: Notification check started');
    } else {
      console.log('⏸️ loadData: Notifications not enabled or permission not granted');
    }
    
    // בדיקת גיבוי אוטומטי
    if (settings.autoBackup) {
      console.log('💾 loadData: Running auto backup...');
      await storage.autoBackup();
      console.log('✅ loadData: Auto backup complete');
    } else {
      console.log('⏸️ loadData: Auto backup not enabled');
    }
    
    console.log('✅✅✅ loadData: הנתונים נטעמו בהצלחה');
  } catch (error) {
    console.error('❌❌❌ loadData: שגיאה בטעינת נתונים:', error);
    console.error('❌ loadData: Error stack:', error.stack);
    if (notifications && notifications.showInAppNotification) {
      notifications.showInAppNotification('שגיאה בטעינת הנתונים', 'error');
    }
  }
}

async function saveData() {
  console.log('💾 saveData: Starting data save...');
  try {
    console.log('📊 saveData: Saving subjects...', subjects);
    await storage.set('homework-subjects', subjects);
    console.log('✅ saveData: Subjects saved');
    
    console.log('📚 saveData: Saving homework...', homework);
    await storage.set('homework-list', homework);
    console.log('✅ saveData: Homework saved');
    
    console.log('⚙️ saveData: Saving settings...', settings);
    await storage.set('homework-settings', settings);
    console.log('✅ saveData: Settings saved');
    
    console.log('🏷️ saveData: Saving tags...', availableTags);
    await storage.set('homework-tags', availableTags);
    console.log('✅ saveData: Tags saved');
    
    console.log('✅✅✅ saveData: הנתונים נשמרו בהצלחה');
  } catch (error) {
    console.error('❌❌❌ saveData: שגיאה בשמירת נתונים:', error);
    console.error('❌ saveData: Error stack:', error.stack);
    if (notifications && notifications.showInAppNotification) {
      notifications.showInAppNotification('⚠️ שגיאה בשמירת הנתונים - ייתכן שהשינויים לא נשמרו', 'error');
    }
  }
}

// =============== חישובים ועזרים ===============

function getDaysUntilDue(dueDate) {
  console.log('📅 getDaysUntilDue: Calculating days for:', dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + 'T00:00:00');
  const days = Math.round((due - today) / (1000 * 60 * 60 * 24));
  console.log('📅 getDaysUntilDue: Result:', days, 'days');
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
  const customInput = document.getElementById('custom-color-input');
  
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
  console.log('🎨 selectColor: Color selected:', color);
  selectedColor = color;
  addToRecentColors(color);
  renderColorPicker();
  console.log('✅ selectColor: Color picker updated');
}

function selectCustomColor(color) {
  console.log('🎨 selectCustomColor: Custom color selected:', color);
  selectedColor = color;
  addToRecentColors(color);
  renderColorPicker();
  console.log('✅ selectCustomColor: Color picker updated');
}

function addToRecentColors(color) {
  console.log('🎨 addToRecentColors: Adding color to recent:', color);
  if (!settings.recentColors) settings.recentColors = [];
  
  // הסר אם כבר קיים
  settings.recentColors = settings.recentColors.filter(c => c !== color);
  console.log('🎨 addToRecentColors: Removed duplicates');
  
  // הוסף בתחילה
  settings.recentColors.unshift(color);
  console.log('🎨 addToRecentColors: Added to beginning');
  
  // שמור רק 12 אחרונים
  settings.recentColors = settings.recentColors.slice(0, 12);
  console.log('🎨 addToRecentColors: Recent colors array:', settings.recentColors);
  
  saveData();
  console.log('✅ addToRecentColors: Saved to storage');
}

// =============== מצב לילה ===============

function toggleDarkMode() {
  console.log('🌙 toggleDarkMode: Current dark mode state:', settings.darkMode);
  settings.darkMode = !settings.darkMode;
  console.log('🌙 toggleDarkMode: New dark mode state:', settings.darkMode);
  
  document.body.classList.toggle('dark-mode');
  console.log('🌙 toggleDarkMode: Body classList:', document.body.classList.toString());
  
  saveData();
  
  const icon = settings.darkMode ? '🌙' : '☀️';
  const message = `מצב ${settings.darkMode ? 'לילה' : 'יום'} הופעל ${icon}`;
  console.log('🌙 toggleDarkMode: Showing notification:', message);
  notifications.showInAppNotification(message, 'success');
  console.log('✅ toggleDarkMode: Dark mode toggle complete');
}

// =============== סינון משימות ===============

function applyFilters() {
  console.log('🔍 applyFilters: Applying filters:', filters);
  render();
  console.log('✅ applyFilters: Filters applied and rendered');
}

function setFilter(type, value) {
  console.log('🔍 setFilter: Setting filter -', type, ':', value);
  filters[type] = value;
  console.log('🔍 setFilter: Current filters:', filters);
  applyFilters();
}

function toggleTagFilter(tag) {
  console.log('🏷️ toggleTagFilter: Toggling tag filter:', tag);
  const index = filters.tags.indexOf(tag);
  console.log('🏷️ toggleTagFilter: Current index:', index);
  
  if (index > -1) {
    filters.tags.splice(index, 1);
    console.log('🏷️ toggleTagFilter: Tag removed from filters');
  } else {
    filters.tags.push(tag);
    console.log('🏷️ toggleTagFilter: Tag added to filters');
  }
  
  console.log('🏷️ toggleTagFilter: Current tag filters:', filters.tags);
  applyFilters();
}

function getFilteredHomework(homeworkList) {
  console.log('🔍 getFilteredHomework: Filtering', homeworkList.length, 'homework items');
  console.log('🔍 getFilteredHomework: Current filters:', filters);
  
  const filtered = homeworkList.filter(hw => {
    // סינון לפי מקצוע
    if (filters.subject !== 'all' && hw.subject != filters.subject) {
      console.log('🔍 getFilteredHomework: Filtered out by subject:', hw.id, hw.title);
      return false;
    }
    
    // סינון לפי סטטוס
    if (filters.status === 'completed' && !hw.completed) {
      console.log('🔍 getFilteredHomework: Filtered out - not completed:', hw.id, hw.title);
      return false;
    }
    if (filters.status === 'pending' && hw.completed) {
      console.log('🔍 getFilteredHomework: Filtered out - is completed:', hw.id, hw.title);
      return false;
    }
    
    // סינון לפי דחיפות
    if (filters.urgency !== 'all') {
      const daysLeft = getDaysUntilDue(hw.dueDate);
      if (filters.urgency === 'urgent' && (daysLeft > 2 || hw.completed)) {
        console.log('🔍 getFilteredHomework: Filtered out - not urgent:', hw.id, hw.title, 'days left:', daysLeft);
        return false;
      }
      if (filters.urgency === 'overdue' && (daysLeft >= 0 || hw.completed)) {
        console.log('🔍 getFilteredHomework: Filtered out - not overdue:', hw.id, hw.title, 'days left:', daysLeft);
        return false;
      }
    }
    
    // סינון לפי תגיות
    if (filters.tags.length > 0) {
      if (!hw.tags || !hw.tags.some(tag => filters.tags.includes(tag))) {
        console.log('🔍 getFilteredHomework: Filtered out by tags:', hw.id, hw.title);
        return false;
      }
    }
    
    return true;
  });
  
  console.log('✅ getFilteredHomework: Filtered result:', filtered.length, 'items');
  return filtered;
}

// =============== תגיות ===============

function addTag() {
  console.log('🏷️ addTag: Adding new tag...');
  const input = document.getElementById('new-tag-input');
  const tag = input.value.trim();
  console.log('🏷️ addTag: Tag value:', tag);
  
  if (!tag) {
    console.log('⚠️ addTag: Empty tag, aborting');
    return;
  }
  
  if (availableTags.includes(tag)) {
    console.log('⚠️ addTag: Tag already exists:', tag);
    notifications.showInAppNotification('תגית זו כבר קיימת', 'error');
    return;
  }
  
  availableTags.push(tag);
  console.log('✅ addTag: Tag added, available tags:', availableTags);
  
  input.value = '';
  saveData();
  renderTagSelector();
  notifications.showInAppNotification(`התגית "${tag}" נוספה`, 'success');
  console.log('✅ addTag: Tag addition complete');
}

function removeTag(tag) {
  console.log('🗑️ removeTag: Attempting to remove tag:', tag);
  if (!confirm(`האם למחוק את התגית "${tag}"? היא תוסר מכל המשימות`)) {
    console.log('⏸️ removeTag: User cancelled tag removal');
    return;
  }
  
  console.log('🗑️ removeTag: Removing tag from available tags...');
  availableTags = availableTags.filter(t => t !== tag);
  console.log('✅ removeTag: Tag removed, remaining tags:', availableTags);
  
  // הסר מכל המשימות
  console.log('🗑️ removeTag: Removing tag from all homework items...');
  let removedCount = 0;
  homework.forEach(hw => {
    if (hw.tags) {
      const beforeLength = hw.tags.length;
      hw.tags = hw.tags.filter(t => t !== tag);
      if (hw.tags.length < beforeLength) {
        removedCount++;
        console.log('🗑️ removeTag: Removed from homework:', hw.id, hw.title);
      }
    }
  });
  console.log('✅ removeTag: Tag removed from', removedCount, 'homework items');
  
  saveData();
  render();
  notifications.showInAppNotification(`התגית "${tag}" נמחקה`, 'success');
  console.log('✅ removeTag: Tag removal complete');
}

function toggleHomeworkTag(homeworkId, tag) {
  console.log('🏷️ toggleHomeworkTag: Toggling tag for homework:', homeworkId, 'tag:', tag);
  const hw = homework.find(h => h.id === homeworkId);
  if (!hw) {
    console.error('❌ toggleHomeworkTag: Homework not found:', homeworkId);
    return;
  }
  
  if (!hw.tags) hw.tags = [];
  console.log('🏷️ toggleHomeworkTag: Current tags:', hw.tags);
  
  const index = hw.tags.indexOf(tag);
  if (index > -1) {
    hw.tags.splice(index, 1);
    console.log('✅ toggleHomeworkTag: Tag removed');
  } else {
    hw.tags.push(tag);
    console.log('✅ toggleHomeworkTag: Tag added');
  }
  
  console.log('🏷️ toggleHomeworkTag: New tags:', hw.tags);
  saveData();
  render();
  console.log('✅ toggleHomeworkTag: Toggle complete');
}

// =============== רינדור ===============

function renderSubjects() {
  console.log('🎨 renderSubjects: Starting subject render...');
  console.log('📊 renderSubjects: Total subjects:', subjects.length);
  
  const list = document.getElementById('subject-list');
  const select = document.getElementById('hw-subject');
  const filterSelect = document.getElementById('filter-subject');
  
  console.log('🎨 renderSubjects: DOM elements found:', {list: !!list, select: !!select, filterSelect: !!filterSelect});
  
  if (subjects.length === 0) {
    console.log('⚠️ renderSubjects: No subjects found, showing empty state');
    list.innerHTML = '<p class="empty-state">טרם הוספו מקצועות</p>';
  } else {
    console.log('🎨 renderSubjects: Rendering', subjects.length, 'subjects');
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
  
  if (select) {
    select.innerHTML = subjectOptions;
    console.log('✅ renderSubjects: Updated homework subject select');
  }
  
  if (filterSelect) {
    filterSelect.innerHTML = '<option value="all">כל המקצועות</option>' + 
      subjects.map(s => `<option value="${s.id}" ${filters.subject == s.id ? 'selected' : ''}>${s.name}</option>`).join('');
    console.log('✅ renderSubjects: Updated filter subject select');
  }
  
  console.log('✅ renderSubjects: Subject render complete');
}

function renderFilters() {
  console.log('🔍 renderFilters: Starting filters render...');
  console.log('🔍 renderFilters: Current filters:', filters);
  
  const container = document.getElementById('filters-container');
  if (!container) {
    console.warn('⚠️ renderFilters: filters-container not found');
    return;
  }
  
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
  renderSubjects(); // עדכון select של מקצועות
  console.log('✅ renderFilters: Filters render complete');
}

function clearFilters() {
  console.log('🔍 clearFilters: Clearing all filters...');
  console.log('🔍 clearFilters: Previous filters:', filters);
  
  filters = {
    subject: 'all',
    status: 'all',
    urgency: 'all',
    tags: []
  };
  
  console.log('✅ clearFilters: Filters cleared:', filters);
  renderFilters();
  render();
}

function renderTagSelector() {
  console.log('🏷️ renderTagSelector: Starting tag selector render...');
  console.log('🏷️ renderTagSelector: Available tags:', availableTags);
  
  const container = document.getElementById('tag-management');
  if (!container) {
    console.warn('⚠️ renderTagSelector: tag-management container not found');
    return;
  }
  
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
  console.log('✅ renderTagSelector: Tag selector render complete');
}

function renderHomework() {
  console.log('📚 renderHomework: Starting homework render...');
  console.log('📚 renderHomework: Total homework items:', homework.length);
  console.log('📚 renderHomework: Show archive mode:', showArchive);
  
  const list = document.getElementById('homework-list');
  const archiveBtn = document.getElementById('archive-toggle');

  const activeHomework = homework.filter(h => {
    if (!h.completed) return true;
    return getDaysUntilDue(h.dueDate) >= 0;
  });
  console.log('📚 renderHomework: Active homework items:', activeHomework.length);

  const archivedHomework = homework.filter(h => {
    if (!h.completed) return false;
    return getDaysUntilDue(h.dueDate) < 0;
  });
  console.log('📚 renderHomework: Archived homework items:', archivedHomework.length);

  if (archivedHomework.length > 0) {
    archiveBtn.classList.remove('hidden');
    archiveBtn.textContent = showArchive ? 'הסתר ארכיון' : `ארכיון (${archivedHomework.length})`;
    console.log('📚 renderHomework: Archive button shown with', archivedHomework.length, 'items');
  } else {
    archiveBtn.classList.add('hidden');
    console.log('📚 renderHomework: Archive button hidden (no archived items)');
  }

  let displayList = showArchive ? archivedHomework : activeHomework;
  console.log('📚 renderHomework: Display list before filter:', displayList.length);
  
  // החל סינון
  displayList = getFilteredHomework(displayList);
  console.log('📚 renderHomework: Display list after filter:', displayList.length);

  if (displayList.length === 0) {
    const message = showArchive ? 'אין פריטים בארכיון' : 'אין שיעורי בית להצגה';
    console.log('⚠️ renderHomework: No items to display:', message);
    list.innerHTML = `<p class="empty-state">${message}</p>`;
    return;
  }

  const sorted = [...displayList].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return new Date(a.dueDate) - new Date(b.dueDate);
  });
  console.log('📚 renderHomework: Items sorted, rendering', sorted.length, 'items');

  list.innerHTML = sorted.map(hw => {
    const subject = subjects.find(s => s.id == hw.subject);
    const daysLeft = getDaysUntilDue(hw.dueDate);
    const isUrgent = daysLeft <= 2 && !hw.completed;
    const isOverdue = daysLeft < 0 && !hw.completed;
    
    console.log('📚 renderHomework: Rendering item:', hw.id, hw.title, 'days left:', daysLeft, 'urgent:', isUrgent, 'overdue:', isOverdue);

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
  
  console.log('✅ renderHomework: Homework render complete');
}

function toggleTagEditor(homeworkId) {
  console.log('🏷️ toggleTagEditor: Toggling tag editor for homework:', homeworkId);
  const editor = document.getElementById(`tags-editor-${homeworkId}`);
  if (editor) {
    editor.classList.toggle('hidden');
    console.log('✅ toggleTagEditor: Tag editor toggled, hidden:', editor.classList.contains('hidden'));
  } else {
    console.error('❌ toggleTagEditor: Editor element not found for homework:', homeworkId);
  }
}

function updateStats() {
  console.log('📊 updateStats: Updating statistics...');
  
  const total = homework.length;
  const completed = homework.filter(h => h.completed).length;
  const pending = homework.filter(h => !h.completed).length;
  const urgent = homework.filter(h => !h.completed && getDaysUntilDue(h.dueDate) <= 2).length;
  
  console.log('📊 updateStats: Stats calculated:', {total, completed, pending, urgent});
  
  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-completed').textContent = completed;
  document.getElementById('stat-pending').textContent = pending;
  document.getElementById('stat-urgent').textContent = urgent;
  
  console.log('✅ updateStats: Stats DOM updated');
  
  // עדכון גרפים אם קיימים
  if (typeof updateCharts === 'function') {
    console.log('📈 updateStats: Updating charts...');
    updateCharts();
    console.log('✅ updateStats: Charts updated');
  } else {
    console.log('⚠️ updateStats: updateCharts function not available');
  }
}

function render() {
  console.log('🎨🎨🎨 render: STARTING FULL RENDER');
  console.log('🎨 render: Current state:', {
    subjects: subjects.length,
    homework: homework.length,
    tags: availableTags.length,
    filters: filters
  });
  
  renderSubjects();
  renderHomework();
  renderFilters();
  renderTagSelector();
  updateStats();
  
  console.log('✅✅✅ render: FULL RENDER COMPLETE');
}

// =============== פעולות על מקצועות ===============

function addSubject() {
  console.log('📚 addSubject: Adding new subject...');
  const name = document.getElementById('subject-name').value.trim();
  console.log('📚 addSubject: Subject name:', name);
  console.log('📚 addSubject: Selected color:', selectedColor);
  
  if (!name) {
    console.warn('⚠️ addSubject: No subject name provided');
    notifications.showInAppNotification('נא להזין שם מקצוע', 'error');
    return;
  }
  
  const newSubject = { id: Date.now(), name, color: selectedColor };
  console.log('📚 addSubject: Creating new subject:', newSubject);
  
  subjects.push(newSubject);
  console.log('✅ addSubject: Subject added, total subjects:', subjects.length);
  
  document.getElementById('subject-name').value = '';
  selectedColor = '#3b82f6';
  console.log('📚 addSubject: Reset form, color reset to default');
  
  document.getElementById('add-subject-form').classList.add('hidden');
  document.getElementById('show-add-subject').classList.remove('hidden');
  console.log('📚 addSubject: Form hidden');
  
  saveData();
  render();
  notifications.showInAppNotification(`המקצוע "${name}" נוסף בהצלחה`, 'success');
  console.log('✅ addSubject: Subject addition complete');
}

function deleteSubject(id) {
  console.log('🗑️ deleteSubject: Attempting to delete subject:', id);
  const subject = subjects.find(s => s.id === id);
  
  if (!subject) {
    console.error('❌ deleteSubject: Subject not found:', id);
    return;
  }
  
  console.log('🗑️ deleteSubject: Found subject:', subject);
  
  const relatedHomework = homework.filter(h => h.subject == id).length;
  console.log('🗑️ deleteSubject: Related homework count:', relatedHomework);
  
  let confirmMsg = `האם אתה בטוח שברצונך למחוק את המקצוע "${subject.name}"?`;
  
  if (relatedHomework > 0) {
    confirmMsg += `\n\n⚠️ פעולה זו תמחק גם ${relatedHomework} משימות הקשורות למקצוע זה!`;
    console.warn('⚠️ deleteSubject: Will delete', relatedHomework, 'related homework items');
  }
  
  if (!confirm(confirmMsg)) {
    console.log('⏸️ deleteSubject: User cancelled deletion');
    return;
  }
  
  console.log('🗑️ deleteSubject: Deleting subject and related homework...');
  subjects = subjects.filter(s => s.id !== id);
  homework = homework.filter(h => h.subject != id);
  console.log('✅ deleteSubject: Subject deleted, remaining subjects:', subjects.length);
  console.log('✅ deleteSubject: Homework filtered, remaining homework:', homework.length);
  
  saveData();
  render();
  notifications.showInAppNotification(`המקצוע "${subject.name}" נמחק`, 'success');
  console.log('✅ deleteSubject: Subject deletion complete');
}

// =============== פעולות על משימות ===============

function addHomework() {
  console.log('📝 addHomework: Adding new homework...');
  
  const subject = document.getElementById('hw-subject').value;
  const title = document.getElementById('hw-title').value.trim();
  const description = document.getElementById('hw-desc').value.trim();
  const dueDate = document.getElementById('hw-date').value;
  const priority = document.getElementById('hw-priority').value;
  const fileInput = document.getElementById('hw-files');

  console.log('📝 addHomework: Form data:', {subject, title, description, dueDate, priority, filesCount: fileInput.files.length});

  if (!subject || !title || !dueDate) {
    console.warn('⚠️ addHomework: Missing required fields');
    notifications.showInAppNotification('נא למלא את כל השדות החובה (מקצוע, כותרת, תאריך)', 'error');
    return;
  }

  const files = Array.from(fileInput.files);
  const hwFiles = [];
  console.log('📝 addHomework: Processing', files.length, 'files...');

  if (files.length === 0) {
    console.log('📝 addHomework: No files, saving homework directly');
    saveHomework([]);
  } else {
    let loadedCount = 0;
    files.forEach((file, index) => {
      console.log('📝 addHomework: Loading file', index + 1, ':', file.name);
      const reader = new FileReader();
      reader.onload = function(e) {
        hwFiles.push({
          name: file.name,
          type: file.type,
          data: e.target.result
        });
        loadedCount++;
        console.log('📝 addHomework: File loaded', loadedCount, '/', files.length);
        
        if (loadedCount === files.length) {
          console.log('✅ addHomework: All files loaded');
          saveHomework(hwFiles);
        }
      };
      reader.onerror = function(error) {
        console.error('❌ addHomework: Error loading file', file.name, error);
      };
      reader.readAsDataURL(file);
    });
  }

  function saveHomework(hwFiles) {
    console.log('💾 saveHomework: Saving homework with', hwFiles.length, 'files');
    
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
    
    console.log('📝 saveHomework: New homework object:', newHomework);
    homework.push(newHomework);
    console.log('✅ saveHomework: Homework added, total homework:', homework.length);

    document.getElementById('hw-subject').value = '';
    document.getElementById('hw-title').value = '';
    document.getElementById('hw-desc').value = '';
    document.getElementById('hw-date').value = '';
    document.getElementById('hw-priority').value = 'medium';
    document.getElementById('hw-files').value = '';
    console.log('📝 saveHomework: Form cleared');

    saveData();
    render();
    notifications.showInAppNotification(`המשימה "${title}" נוספה בהצלחה`, 'success');
    console.log('✅ saveHomework: Homework save complete');
  }
}

function toggleComplete(id) {
  console.log('✅ toggleComplete: Toggling completion for homework:', id);
  const hw = homework.find(h => h.id === id);
  
  if (!hw) {
    console.error('❌ toggleComplete: Homework not found:', id);
    return;
  }
  
  console.log('✅ toggleComplete: Current completed state:', hw.completed);
  hw.completed = !hw.completed;
  console.log('✅ toggleComplete: New completed state:', hw.completed);
  
  saveData();
  render();
  
  if (hw.completed) {
    console.log('🎉 toggleComplete: Homework completed!');
    notifications.showInAppNotification(`כל הכבוד! סיימת את "${hw.title}"`, 'success');
  } else {
    console.log('⏸️ toggleComplete: Homework uncompleted');
  }
  
  console.log('✅ toggleComplete: Toggle complete');
}

function deleteHomework(id) {
  console.log('🗑️ deleteHomework: Attempting to delete homework:', id);
  const hw = homework.find(h => h.id === id);
  
  if (!hw) {
    console.error('❌ deleteHomework: Homework not found:', id);
    return;
  }
  
  console.log('🗑️ deleteHomework: Found homework:', hw);
  
  if (confirm(`האם אתה בטוח שברצונך למחוק את המשימה "${hw.title}"?\n\n⚠️ פעולה זו לא ניתנת לביטול!`)) {
    console.log('🗑️ deleteHomework: User confirmed, deleting...');
    homework = homework.filter(h => h.id !== id);
    console.log('✅ deleteHomework: Homework deleted, remaining homework:', homework.length);
    
    saveData();
    render();
    notifications.showInAppNotification('המשימה נמחקה', 'success');
    console.log('✅ deleteHomework: Homework deletion complete');
  } else {
    console.log('⏸️ deleteHomework: User cancelled deletion');
  }
}

// =============== הגדרות ===============

function openSettings() {
  console.log('⚙️ openSettings: Opening settings modal...');
  const modal = document.getElementById('settings-modal');
  if (!modal) {
    console.error('❌ openSettings: Settings modal not found');
    return;
  }
  
  modal.classList.remove('hidden');
  console.log('⚙️ openSettings: Modal opened');
  loadSettingsUI();
  console.log('✅ openSettings: Settings opened');
}

function closeSettings() {
  console.log('⚙️ closeSettings: Closing settings modal...');
  const modal = document.getElementById('settings-modal');
  if (!modal) {
    console.error('❌ closeSettings: Settings modal not found');
    return;
  }
  
  modal.classList.add('hidden');
  console.log('✅ closeSettings: Settings closed');
}

async function loadSettingsUI() {
  console.log('⚙️ loadSettingsUI: Loading settings UI...');
  console.log('⚙️ loadSettingsUI: Current settings:', settings);
  
  document.getElementById('enable-notifications').checked = settings.enableNotifications;
  document.getElementById('notification-days').value = settings.notificationDays;
  document.getElementById('notification-time').value = settings.notificationTime;
  document.getElementById('auto-backup').checked = settings.autoBackup;
  document.getElementById('dark-mode-toggle').checked = settings.darkMode;
  console.log('⚙️ loadSettingsUI: Form fields populated');
  
  const lastBackup = await storage.getLastBackupDate();
  console.log('⚙️ loadSettingsUI: Last backup date:', lastBackup);
  
  const lastBackupInfo = document.getElementById('last-backup-info');
  if (lastBackup) {
    lastBackupInfo.textContent = `גיבוי אחרון: ${lastBackup.toLocaleDateString('he-IL')} בשעה ${lastBackup.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`;
  } else {
    lastBackupInfo.textContent = 'גיבוי אחרון: אף פעם';
  }
  
  console.log('✅ loadSettingsUI: Settings UI loaded');
}

async function saveSettings() {
  console.log('💾 saveSettings: Saving settings...');
  
  settings.enableNotifications = document.getElementById('enable-notifications').checked;
  settings.notificationDays = parseInt(document.getElementById('notification-days').value);
  settings.notificationTime = document.getElementById('notification-time').value;
  settings.autoBackup = document.getElementById('auto-backup').checked;
  
  console.log('💾 saveSettings: New settings:', settings);
  
  await storage.set('homework-settings', settings);
  console.log('✅ saveSettings: Settings saved to storage');
  
  if (settings.enableNotifications) {
    console.log('🔔 saveSettings: Notifications enabled, requesting permission...');
    const granted = await notifications.requestPermission();
    console.log('🔔 saveSettings: Permission granted:', granted);
    
    if (granted) {
      await notifications.startPeriodicCheck(homework, settings);
      notifications.showInAppNotification('התראות הופעלו בהצלחה', 'success');
      console.log('✅ saveSettings: Notifications started');
    } else {
      console.warn('⚠️ saveSettings: Permission denied, disabling notifications');
      notifications.showInAppNotification('לא ניתן להפעיל התראות - ההרשאה נדחתה', 'error');
      settings.enableNotifications = false;
      document.getElementById('enable-notifications').checked = false;
    }
  } else {
    console.log('⏸️ saveSettings: Notifications disabled, stopping periodic check');
    notifications.stopPeriodicCheck();
  }
  
  notifications.showInAppNotification('ההגדרות נשמרו', 'success');
  console.log('✅ saveSettings: Settings save complete');
}

// =============== ייבוא/ייצוא ===============

async function exportData() {
  console.log('📤 exportData: Starting data export...');
  const success = await storage.exportData();
  console.log('📤 exportData: Export result:', success);
  
  if (success) {
    notifications.showInAppNotification('הנתונים יוצאו בהצלחה', 'success');
    loadSettingsUI();
    console.log('✅ exportData: Export complete');
  } else {
    console.error('❌ exportData: Export failed');
    notifications.showInAppNotification('שגיאה בייצוא הנתונים', 'error');
  }
}

async function exportToPDF() {
  console.log('📄 exportToPDF: PDF export not yet implemented');
  notifications.showInAppNotification('ייצוא ל-PDF בפיתוח...', 'info');
  // TODO: להוסיף ייצוא PDF בעתיד
}

async function exportToExcel() {
  console.log('📊 exportToExcel: Excel export not yet implemented');
  notifications.showInAppNotification('ייצוא ל-Excel בפיתוח...', 'info');
  // TODO: להוסיף ייצוא Excel בעתיד
}

function importData() {
  console.log('📥 importData: Triggering file input...');
  document.getElementById('import-file').click();
  console.log('✅ importData: File dialog opened');
}

async function handleImportFile(event) {
  console.log('📥 handleImportFile: Handling import file...');
  const file = event.target.files[0];
  
  if (!file) {
    console.warn('⚠️ handleImportFile: No file selected');
    return;
  }
  
  console.log('📥 handleImportFile: File selected:', file.name, file.size, 'bytes');

  try {
    console.log('📥 handleImportFile: Starting import...');
    const result = await storage.importData(file);
    console.log('📥 handleImportFile: Import result:', result);
    
    if (result.success) {
      console.log('✅ handleImportFile: Import successful');
      console.log('📊 handleImportFile: Importing', result.data.subjects.length, 'subjects');
      console.log('📚 handleImportFile: Importing', result.data.homework.length, 'homework items');
      
      subjects = result.data.subjects;
      homework = result.data.homework;
      
      if (result.data.settings) {
        console.log('⚙️ handleImportFile: Importing settings');
        settings = result.data.settings;
      }
      if (result.data.tags) {
        console.log('🏷️ handleImportFile: Importing', result.data.tags.length, 'tags');
        availableTags = result.data.tags;
      }
      
      render();
      loadSettingsUI();
      notifications.showInAppNotification(result.message, 'success');
      console.log('✅ handleImportFile: Import complete');
    } else {
      console.error('❌ handleImportFile: Import failed:', result.message);
      notifications.showInAppNotification(result.message, 'error');
    }
  } catch (error) {
    console.error('❌ handleImportFile: Error during import:', error);
    console.error('❌ handleImportFile: Error stack:', error.stack);
    notifications.showInAppNotification(error.message || 'שגיאה בייבוא הנתונים', 'error');
  }
  
  event.target.value = '';
  console.log('📥 handleImportFile: File input cleared');
}

async function clearAllData() {
  console.log('🗑️ clearAllData: Starting data clear...');
  console.log('🗑️ clearAllData: Current data:', {
    subjects: subjects.length,
    homework: homework.length,
    tags: availableTags.length
  });
  
  const confirmMsg = '⚠️ אזהרה!\n\n' +
                    'פעולה זו תמחק את כל הנתונים במערכת:\n' +
                    `- ${subjects.length} מקצועות\n` +
                    `- ${homework.length} משימות\n` +
                    `- ${availableTags.length} תגיות\n` +
                    '- כל ההגדרות\n\n' +
                    '❌ פעולה זו לא ניתנת לשחזור!\n\n' +
                    'האם אתה בטוח לחלוטין?';
  
  if (!confirm(confirmMsg)) {
    console.log('⏸️ clearAllData: User cancelled first confirmation');
    return;
  }
  
  const doubleConfirm = prompt('כדי לאשר, הקלד "מחק הכל":');
  console.log('🗑️ clearAllData: User input:', doubleConfirm);
  
  if (doubleConfirm !== 'מחק הכל') {
    console.log('⏸️ clearAllData: User cancelled second confirmation');
    notifications.showInAppNotification('המחיקה בוטלה', 'success');
    return;
  }
  
  console.log('🗑️ clearAllData: User confirmed, clearing all data...');
  const success = await storage.clearAll();
  console.log('🗑️ clearAllData: Clear result:', success);
  
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
    
    console.log('✅ clearAllData: All data cleared');
    render();
    closeSettings();
    notifications.showInAppNotification('כל הנתונים נמחקו', 'success');
    console.log('✅ clearAllData: Clear complete');
  } else {
    console.error('❌ clearAllData: Clear failed');
    notifications.showInAppNotification('שגיאה במחיקת הנתונים', 'error');
  }
}

// =============== Event Listeners ===============

function initializeEventListeners() {
  console.log('🎧 initializeEventListeners: Starting event listener initialization...');
  
  // ארכיון
  const archiveToggle = document.getElementById('archive-toggle');
  if (archiveToggle) {
    archiveToggle.addEventListener('click', () => {
      console.log('📦 Archive toggle clicked, current state:', showArchive);
      showArchive = !showArchive;
      console.log('📦 New archive state:', showArchive);
      renderHomework();
    });
    console.log('✅ Archive toggle listener attached');
  } else {
    console.warn('⚠️ archive-toggle element not found');
  }

  // הוספת מקצוע
  const showAddSubject = document.getElementById('show-add-subject');
  if (showAddSubject) {
    showAddSubject.addEventListener('click', () => {
      console.log('➕ Show add subject button clicked');
      document.getElementById('add-subject-form').classList.remove('hidden');
      document.getElementById('show-add-subject').classList.add('hidden');
      renderColorPicker();
    });
    console.log('✅ Show add subject listener attached');
  } else {
    console.warn('⚠️ show-add-subject element not found');
  }

  const cancelSubject = document.getElementById('cancel-subject');
  if (cancelSubject) {
    cancelSubject.addEventListener('click', () => {
      console.log('❌ Cancel subject button clicked');
      document.getElementById('add-subject-form').classList.add('hidden');
      document.getElementById('show-add-subject').classList.remove('hidden');
    });
    console.log('✅ Cancel subject listener attached');
  } else {
    console.warn('⚠️ cancel-subject element not found');
  }

  const saveSubject = document.getElementById('save-subject');
  if (saveSubject) {
    saveSubject.addEventListener('click', addSubject);
    console.log('✅ Save subject listener attached');
  } else {
    console.warn('⚠️ save-subject element not found');
  }

  const addHomeworkBtn = document.getElementById('add-homework');
  if (addHomeworkBtn) {
    addHomeworkBtn.addEventListener('click', addHomework);
    console.log('✅ Add homework listener attached');
  } else {
    console.warn('⚠️ add-homework element not found');
  }

  // הגדרות
  const openSettingsBtn = document.getElementById('open-settings');
  if (openSettingsBtn) {
    openSettingsBtn.addEventListener('click', openSettings);
    console.log('✅ Open settings listener attached');
  } else {
    console.warn('⚠️ open-settings element not found');
  }

  const closeSettingsBtn = document.getElementById('close-settings');
  if (closeSettingsBtn) {
    closeSettingsBtn.addEventListener('click', closeSettings);
    console.log('✅ Close settings listener attached');
  } else {
    console.warn('⚠️ close-settings element not found');
  }

  const settingsModal = document.getElementById('settings-modal');
  if (settingsModal) {
    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) {
        console.log('⚙️ Settings modal background clicked, closing...');
        closeSettings();
      }
    });
    console.log('✅ Settings modal listener attached');
  } else {
    console.warn('⚠️ settings-modal element not found');
  }
  
  // מצב לילה
  const darkModeToggle = document.getElementById('dark-mode-toggle');
  if (darkModeToggle) {
    darkModeToggle.addEventListener('change', toggleDarkMode);
    console.log('✅ Dark mode toggle listener attached');
  } else {
    console.warn('⚠️ dark-mode-toggle element not found');
  }
  
  // שמירת הגדרות
  const enableNotifications = document.getElementById('enable-notifications');
  if (enableNotifications) {
    enableNotifications.addEventListener('change', saveSettings);
    console.log('✅ Enable notifications listener attached');
  } else {
    console.warn('⚠️ enable-notifications element not found');
  }

  const notificationDays = document.getElementById('notification-days');
  if (notificationDays) {
    notificationDays.addEventListener('change', saveSettings);
    console.log('✅ Notification days listener attached');
  } else {
    console.warn('⚠️ notification-days element not found');
  }

  const notificationTime = document.getElementById('notification-time');
  if (notificationTime) {
    notificationTime.addEventListener('change', saveSettings);
    console.log('✅ Notification time listener attached');
  } else {
    console.warn('⚠️ notification-time element not found');
  }

  const autoBackup = document.getElementById('auto-backup');
  if (autoBackup) {
    autoBackup.addEventListener('change', saveSettings);
    console.log('✅ Auto backup listener attached');
  } else {
    console.warn('⚠️ auto-backup element not found');
  }

  // ייבוא/ייצוא
  const exportDataBtn = document.getElementById('export-data');
  if (exportDataBtn) {
    exportDataBtn.addEventListener('click', exportData);
    console.log('✅ Export data listener attached');
  } else {
    console.warn('⚠️ export-data element not found');
  }

  const importDataBtn = document.getElementById('import-data');
  if (importDataBtn) {
    importDataBtn.addEventListener('click', importData);
    console.log('✅ Import data listener attached');
  } else {
    console.warn('⚠️ import-data element not found');
  }

  const importFile = document.getElementById('import-file');
  if (importFile) {
    importFile.addEventListener('change', handleImportFile);
    console.log('✅ Import file listener attached');
  } else {
    console.warn('⚠️ import-file element not found');
  }

  const clearAllDataBtn = document.getElementById('clear-all-data');
  if (clearAllDataBtn) {
    clearAllDataBtn.addEventListener('click', clearAllData);
    console.log('✅ Clear all data listener attached');
  } else {
    console.warn('⚠️ clear-all-data element not found');
  }
  
  console.log('✅✅✅ initializeEventListeners: All event listeners initialized');
}

// =============== אתחול ===============

window.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀🚀🚀 APPLICATION STARTING - DOMContentLoaded event fired');
  console.log('🌐 Browser:', navigator.userAgent);
  console.log('📍 Location:', window.location.href);
  console.log('⏰ Time:', new Date().toLocaleString('he-IL'));
  
  try {
    console.log('📊 Starting data load...');
    await loadData();
    console.log('✅ Data loaded successfully');
    
    console.log('🎧 Initializing event listeners...');
    initializeEventListeners();
    console.log('✅ Event listeners initialized');
    
    console.log('🎉🎉🎉 APPLICATION STARTED SUCCESSFULLY');
  } catch (error) {
    console.error('❌❌❌ APPLICATION START FAILED:', error);
    console.error('❌ Error stack:', error.stack);
  }
});

window.addEventListener('beforeunload', (e) => {
  console.log('⚠️ beforeunload: Window closing...');
  console.log('⚠️ beforeunload: Current data:', {
    subjects: subjects.length,
    homework: homework.length
  });
  
  if (homework.length > 0 || subjects.length > 0) {
    const message = '⚠️ יש לך נתונים שלא נשמרו. האם אתה בטוח שברצונך לעזוב?';
    console.warn('⚠️ beforeunload: Showing warning to user');
    e.returnValue = message;
    return message;
  }
  
  console.log('✅ beforeunload: No data to save, allowing close');
});
