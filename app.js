// Main Application Logic
const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
let subjects = [];
let homework = [];
let settings = {
  enableNotifications: false,
  notificationDays: 1,
  notificationTime: '09:00',
  autoBackup: false
};
let selectedColor = '#3b82f6';
let showArchive = false;

// =============== טעינה ושמירה ===============

async function loadData() {
  try {
    subjects = await storage.get('homework-subjects') || [];
    homework = await storage.get('homework-list') || [];
    settings = await storage.get('homework-settings') || {
      enableNotifications: false,
      notificationDays: 1,
      notificationTime: '09:00',
      autoBackup: false
    };
    
    render();
    
    // התחל בדיקת התראות אם מופעל
    if (settings.enableNotifications && notifications.permission === 'granted') {
      await notifications.startPeriodicCheck(homework, settings);
    }
    
    // בדיקת גיבוי אוטומטי
    if (settings.autoBackup) {
      await storage.autoBackup();
    }
    
    console.log('✓ הנתונים נטעמו בהצלחה');
  } catch (error) {
    console.error('שגיאה בטעינת נתונים:', error);
    notifications.showInAppNotification('שגיאה בטעינת הנתונים', 'error');
  }
}

async function saveData() {
  try {
    await storage.set('homework-subjects', subjects);
    await storage.set('homework-list', homework);
    await storage.set('homework-settings', settings);
    console.log('✓ הנתונים נשמרו בהצלחה');
  } catch (error) {
    console.error('שגיאה בשמירת נתונים:', error);
    notifications.showInAppNotification('⚠️ שגיאה בשמירת הנתונים - ייתכן שהשינויים לא נשמרו', 'error');
  }
}

// =============== חישובים ועזרים ===============

function getDaysUntilDue(dueDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + 'T00:00:00');
  return Math.round((due - today) / (1000 * 60 * 60 * 24));
}

function downloadFile(filename, dataUrl) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// =============== רינדור ===============

function renderColorPicker() {
  const picker = document.getElementById('color-picker');
  picker.innerHTML = colors.map(color => `
    <div class="color-option ${color === selectedColor ? 'selected' : ''}" 
         style="background-color: ${color};"
         onclick="selectedColor = '${color}'; renderColorPicker();"></div>
  `).join('');
}

function renderSubjects() {
  const list = document.getElementById('subject-list');
  const select = document.getElementById('hw-subject');
  
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
  
  select.innerHTML = '<option value="">בחר מקצוע</option>' + 
    subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
}

function renderHomework() {
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

  const displayList = showArchive ? archivedHomework : activeHomework;

  if (displayList.length === 0) {
    list.innerHTML = `<p class="empty-state">${showArchive ? 'אין פריטים בארכיון' : 'אין שיעורי בית להצגה'}</p>`;
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

function updateStats() {
  document.getElementById('stat-total').textContent = homework.length;
  document.getElementById('stat-completed').textContent = homework.filter(h => h.completed).length;
  document.getElementById('stat-pending').textContent = homework.filter(h => !h.completed).length;
  document.getElementById('stat-urgent').textContent = homework.filter(h => !h.completed && getDaysUntilDue(h.dueDate) <= 2).length;
}

function render() {
  renderSubjects();
  renderHomework();
  updateStats();
}

// =============== פעולות על מקצועות ===============

function addSubject() {
  const name = document.getElementById('subject-name').value.trim();
  if (!name) {
    notifications.showInAppNotification('נא להזין שם מקצוע', 'error');
    return;
  }
  
  subjects.push({ id: Date.now(), name, color: selectedColor });
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
    homework.push({
      id: Date.now(),
      subject,
      title,
      description,
      dueDate,
      priority,
      completed: false,
      files: hwFiles,
      notified: false,
      todayNotified: false
    });

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
  if (hw) {
    hw.completed = !hw.completed;
    saveData();
    render();
    
    if (hw.completed) {
      notifications.showInAppNotification(`כל הכבוד! סיימת את "${hw.title}"`, 'success');
    }
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
  console.log('🔵 פותח הגדרות...');
  const modal = document.getElementById('settings-modal');
  if (!modal) {
    console.error('❌ לא נמצא אלמנט settings-modal');
    return;
  }
  
  // הסרת hidden
  modal.classList.remove('hidden');
  
  // וידוא שה-display מוגדר כראוי
  setTimeout(() => {
    const computedDisplay = window.getComputedStyle(modal).display;
    console.log('✅ ההגדרות נפתחו');
    console.log('📊 classList:', Array.from(modal.classList));
    console.log('📊 computed display:', computedDisplay);
    console.log('📊 inline display:', modal.style.display);
    
    if (computedDisplay === 'none') {
      console.error('❌ המודל עדיין מוסתר! מנסה לתקן...');
      modal.style.display = 'flex';
      modal.style.visibility = 'visible';
      modal.style.opacity = '1';
    }
  }, 50);
  
  loadSettingsUI();
}

function closeSettings() {
  console.log('🔴 סוגר הגדרות...');
  const modal = document.getElementById('settings-modal');
  if (!modal) {
    console.error('❌ לא נמצא אלמנט settings-modal');
    return;
  }
  
  // הוספת hidden
  modal.classList.add('hidden');
  
  console.log('✅ ההגדרות נסגרו');
  console.log('📊 classList:', Array.from(modal.classList));
}

async function loadSettingsUI() {
  // טעינת הגדרות
  document.getElementById('enable-notifications').checked = settings.enableNotifications;
  document.getElementById('notification-days').value = settings.notificationDays;
  document.getElementById('notification-time').value = settings.notificationTime;
  document.getElementById('auto-backup').checked = settings.autoBackup;
  
  // הצגת תאריך גיבוי אחרון
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
  
  // אם התראות הופעלו, בקש הרשאות
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
    loadSettingsUI(); // עדכון תאריך גיבוי
  } else {
    notifications.showInAppNotification('שגיאה בייצוא הנתונים', 'error');
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
      if (result.data.settings) {
        settings = result.data.settings;
      }
      
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
                    '- כל ההגדרות\n\n' +
                    '❌ פעולה זו לא ניתנת לשחזור!\n\n' +
                    'האם אתה בטוח לחלוטין?';
  
  if (!confirm(confirmMsg)) return;
  
  // אישור כפול
  const doubleConfirm = prompt('כדי לאשר, הקלד "מחק הכל":');
  if (doubleConfirm !== 'מחק הכל') {
    notifications.showInAppNotification('המחיקה בוטלה', 'success');
    return;
  }
  
  const success = await storage.clearAll();
  if (success) {
    subjects = [];
    homework = [];
    settings = {
      enableNotifications: false,
      notificationDays: 1,
      notificationTime: '09:00',
      autoBackup: false
    };
    
    render();
    closeSettings();
    notifications.showInAppNotification('כל הנתונים נמחקו', 'success');
  } else {
    notifications.showInAppNotification('שגיאה במחיקת הנתונים', 'error');
  }
}

// =============== Event Listeners ===============

// פונקציה לאתחול Event Listeners
function initializeEventListeners() {
  console.log('🎯 מאתחל Event Listeners...');
  
  // ארכיון
  const archiveToggle = document.getElementById('archive-toggle');
  if (archiveToggle) {
    archiveToggle.addEventListener('click', () => {
      showArchive = !showArchive;
      renderHomework();
    });
    console.log('  ✅ archive-toggle listener');
  }

  // הוספת מקצוע
  const showAddSubject = document.getElementById('show-add-subject');
  if (showAddSubject) {
    showAddSubject.addEventListener('click', () => {
      document.getElementById('add-subject-form').classList.remove('hidden');
      document.getElementById('show-add-subject').classList.add('hidden');
      renderColorPicker();
    });
    console.log('  ✅ show-add-subject listener');
  }

  const cancelSubject = document.getElementById('cancel-subject');
  if (cancelSubject) {
    cancelSubject.addEventListener('click', () => {
      document.getElementById('add-subject-form').classList.add('hidden');
      document.getElementById('show-add-subject').classList.remove('hidden');
    });
    console.log('  ✅ cancel-subject listener');
  }

  const saveSubject = document.getElementById('save-subject');
  if (saveSubject) {
    saveSubject.addEventListener('click', addSubject);
    console.log('  ✅ save-subject listener');
  }

  const addHomeworkBtn = document.getElementById('add-homework');
  if (addHomeworkBtn) {
    addHomeworkBtn.addEventListener('click', addHomework);
    console.log('  ✅ add-homework listener');
  }

  // הגדרות - כפתור פתיחה
  const openSettingsBtn = document.getElementById('open-settings');
  if (openSettingsBtn) {
    openSettingsBtn.addEventListener('click', (e) => {
      console.log('🖱️ לחיצה על כפתור פתיחת הגדרות');
      console.log('📍 Event:', e.type);
      e.preventDefault();
      e.stopPropagation();
      try {
        openSettings();
      } catch (error) {
        console.error('❌ שגיאה בפתיחת הגדרות:', error);
      }
    });
    console.log('  ✅ open-settings listener');
  } else {
    console.error('  ❌ open-settings button לא נמצא!');
  }

  // הגדרות - כפתור סגירה X
  const closeBtn = document.getElementById('close-settings');
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      console.log('🖱️ לחיצה על כפתור X (סגירה)');
      console.log('📍 Event:', e.type);
      console.log('📍 Target:', e.target);
      console.log('📍 CurrentTarget:', e.currentTarget);
      e.preventDefault();
      e.stopPropagation();
      try {
        closeSettings();
      } catch (error) {
        console.error('❌ שגיאה בסגירת הגדרות:', error);
      }
    });
    console.log('  ✅ close-settings listener');
  } else {
    console.error('  ❌ close-settings button לא נמצא!');
  }

  // סגירת מודל בלחיצה על הרקע
  const settingsModal = document.getElementById('settings-modal');
  if (settingsModal) {
    settingsModal.addEventListener('click', (e) => {
      console.log('🖱️ לחיצה על אזור המודל');
      console.log('📍 יעד הלחיצה - ID:', e.target.id);
      console.log('📍 יעד הלחיצה - Class:', e.target.className);
      console.log('📍 יעד נוכחי - ID:', e.currentTarget.id);
      
      if (e.target === settingsModal || e.target.id === 'settings-modal') {
        console.log('✅ לחיצה על הרקע - סוגר מודל');
        try {
          closeSettings();
        } catch (error) {
          console.error('❌ שגיאה בסגירת מודל:', error);
        }
      } else {
        console.log('⏭️ לחיצה על תוכן המודל - לא סוגר');
      }
    });
    console.log('  ✅ settings-modal click listener');
  } else {
    console.error('  ❌ settings-modal לא נמצא!');
  }

  // מניעת סגירה בלחיצה על תוכן המודל
  const modalContent = document.querySelector('.modal-content');
  if (modalContent) {
    modalContent.addEventListener('click', (e) => {
      console.log('🖱️ לחיצה על תוכן המודל - עוצר התפשטות');
      e.stopPropagation();
    });
    console.log('  ✅ modal-content click listener');
  } else {
    console.error('  ❌ modal-content לא נמצא!');
  }

  // שמירת הגדרות אוטומטית
  const enableNotifications = document.getElementById('enable-notifications');
  if (enableNotifications) {
    enableNotifications.addEventListener('change', saveSettings);
    console.log('  ✅ enable-notifications listener');
  }

  const notificationDays = document.getElementById('notification-days');
  if (notificationDays) {
    notificationDays.addEventListener('change', saveSettings);
    console.log('  ✅ notification-days listener');
  }

  const notificationTime = document.getElementById('notification-time');
  if (notificationTime) {
    notificationTime.addEventListener('change', saveSettings);
    console.log('  ✅ notification-time listener');
  }

  const autoBackup = document.getElementById('auto-backup');
  if (autoBackup) {
    autoBackup.addEventListener('change', saveSettings);
    console.log('  ✅ auto-backup listener');
  }

  // ייבוא/ייצוא
  const exportDataBtn = document.getElementById('export-data');
  if (exportDataBtn) {
    exportDataBtn.addEventListener('click', exportData);
    console.log('  ✅ export-data listener');
  }

  const importDataBtn = document.getElementById('import-data');
  if (importDataBtn) {
    importDataBtn.addEventListener('click', importData);
    console.log('  ✅ import-data listener');
  }

  const importFile = document.getElementById('import-file');
  if (importFile) {
    importFile.addEventListener('change', handleImportFile);
    console.log('  ✅ import-file listener');
  }

  const clearAllDataBtn = document.getElementById('clear-all-data');
  if (clearAllDataBtn) {
    clearAllDataBtn.addEventListener('click', clearAllData);
    console.log('  ✅ clear-all-data listener');
  }

  // מקש ESC לסגירת מודל
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || e.key === 'Esc') {
      console.log('⌨️ נלחץ מקש ESC');
      const modal = document.getElementById('settings-modal');
      if (modal) {
        const isHidden = modal.classList.contains('hidden');
        const displayStyle = window.getComputedStyle(modal).display;
        
        console.log('📊 מצב המודל:');
        console.log('  - classList contains hidden:', isHidden);
        console.log('  - display style:', displayStyle);
        
        if (!isHidden && displayStyle !== 'none') {
          console.log('✅ מודל פתוח - סוגר אותו');
          try {
            closeSettings();
          } catch (error) {
            console.error('❌ שגיאה בסגירה:', error);
          }
        } else {
          console.log('⏭️ מודל סגור - לא עושה כלום');
        }
      }
    }
  });
  console.log('  ✅ ESC key listener');
  
  console.log('✅ כל ה-Event Listeners אותחלו בהצלחה');
}

// =============== אתחול ===============

window.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 מתחיל אתחול המערכת...');
  
  // בדיקת אלמנטים קריטיים
  const criticalElements = {
    'settings-modal': document.getElementById('settings-modal'),
    'open-settings': document.getElementById('open-settings'),
    'close-settings': document.getElementById('close-settings'),
    'modal-content': document.querySelector('.modal-content')
  };
  
  console.log('🔍 בדיקת אלמנטים קריטיים:');
  for (const [name, element] of Object.entries(criticalElements)) {
    if (element) {
      console.log(`  ✅ ${name} - נמצא`);
    } else {
      console.error(`  ❌ ${name} - לא נמצא!`);
    }
  }
  
  // טעינת נתונים
  await loadData();
  
  // אתחול Event Listeners
  initializeEventListeners();
  
  console.log('✅ המערכת נטענה בהצלחה');
  
  const modalElement = criticalElements['settings-modal'];
  if (modalElement) {
    const computedStyle = window.getComputedStyle(modalElement);
    console.log('📊 מצב התחלתי של מודל ההגדרות:');
    console.log('  - classList:', Array.from(modalElement.classList));
    console.log('  - computed display:', computedStyle.display);
    console.log('  - inline display:', modalElement.style.display);
    console.log('  - מצב:', computedStyle.display === 'none' ? 'סגור ✅' : 'פתוח ⚠️');
  }
});

// שמירה אוטומטית לפני סגירת הדף
window.addEventListener('beforeunload', (e) => {
  if (homework.length > 0 || subjects.length > 0) {
    const message = '⚠️ יש לך נתונים שלא נשמרו. האם אתה בטוח שברצונך לעזוב?';
    e.returnValue = message;
    return message;
  }
});
