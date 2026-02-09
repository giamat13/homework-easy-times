// Advanced Settings Manager - מנהל הגדרות מתקדם
// =======================================================

console.log('⚙️ advanced-settings.js: Loading...');

class AdvancedSettingsManager {
  constructor() {
    this.settings = {
      // הגדרות תצוגה
      visibility: {
        headerStats: true,
        headerXpBar: true,
        timerPanel: true,
        subjectsPanel: true,
        filtersPanel: true,
        addHomeworkPanel: true,
        homeworkListPanel: true,
        gamificationPanel: true,
        analyticsPanel: true,
        statisticsPanel: true,
        
        // כפתורים
        quickSearchBtn: true,
        themeSelectorBtn: true,
        darkModeBtn: true,
        viewModeBtn: true,
        helpBtn: true,
        settingsBtn: true,
        archiveBtn: true
      },
      
      // סידור פאנלים (מספר מייצג את הסדר)
      panelOrder: {
        'timer-panel': 1,
        'subjects-panel': 2,
        'filters-panel': 3,
        'add-homework-panel': 4,
        'homework-panel': 5,
        'gamification-panel': 6,
        'analytics-panel': 7,
        'statistics-panel': 8
      },
      
      // הגדרות רצף
      streakSettings: {
        allowOneDayGap: true, // אפשר פער של יום אחד
        weekendDoesntBreakStreak: false // סופ"ש לא שובר רצף
      },
      
      // הגדרות תוכנית ארגון
      studyPlan: {
        enabled: false,
        sessions: [
          { type: 'work', duration: 25, label: 'עבודה' },
          { type: 'short-break', duration: 5, label: 'הפסקה קצרה' },
          { type: 'work', duration: 25, label: 'עבודה' },
          { type: 'short-break', duration: 5, label: 'הפסקה קצרה' },
          { type: 'work', duration: 25, label: 'עבודה' },
          { type: 'long-break', duration: 15, label: 'הפסקה ארוכה' }
        ],
        currentSessionIndex: 0,
        autoAdvance: true
      }
    };
    
    console.log('✅ AdvancedSettingsManager: Initialized');
  }

  // ==================== טעינה ושמירה ====================

  async loadSettings() {
    console.log('📥 loadSettings: Loading advanced settings...');
    try {
      const saved = await storage.get('advanced-settings');
      if (saved) {
        this.settings = this.mergeSettings(this.settings, saved);
        console.log('✅ loadSettings: Settings loaded:', this.settings);
      }
      
      this.applySettings();
    } catch (error) {
      console.error('❌ loadSettings: Error loading settings:', error);
    }
  }

  async saveSettings() {
    console.log('💾 saveSettings: Saving advanced settings...');
    try {
      await storage.set('advanced-settings', this.settings);
      console.log('✅ saveSettings: Settings saved');
      
      notifications.showInAppNotification('ההגדרות נשמרו בהצלחה', 'success');
    } catch (error) {
      console.error('❌ saveSettings: Error saving settings:', error);
      notifications.showInAppNotification('שגיאה בשמירת ההגדרות', 'error');
    }
  }

  mergeSettings(defaultSettings, savedSettings) {
    const merged = JSON.parse(JSON.stringify(defaultSettings));
    
    for (const key in savedSettings) {
      if (typeof savedSettings[key] === 'object' && !Array.isArray(savedSettings[key])) {
        merged[key] = this.mergeSettings(merged[key] || {}, savedSettings[key]);
      } else {
        merged[key] = savedSettings[key];
      }
    }
    
    return merged;
  }

  // ==================== החלת הגדרות ====================

  applySettings() {
    console.log('🎨 applySettings: Applying settings to UI...');
    
    this.applyVisibility();
    this.applyPanelOrder();
    
    console.log('✅ applySettings: Settings applied');
  }

  applyVisibility() {
    console.log('👁️ applyVisibility: Applying visibility settings...');
    
    const vis = this.settings.visibility;
    
    // סטטיסטיקות כותרת
    const stats = document.querySelector('.stats');
    if (stats) {
      stats.style.display = vis.headerStats ? 'grid' : 'none';
    }
    
    // פס XP כותרת
    const xpBar = document.querySelector('.xp-progress-container');
    if (xpBar) {
      xpBar.style.display = vis.headerXpBar ? 'block' : 'none';
    }
    
    // פאנלים
    const panels = {
      'timer-panel': vis.timerPanel,
      'subjects-panel': vis.subjectsPanel,
      'filters-panel': vis.filtersPanel,
      'add-homework-panel': vis.addHomeworkPanel,
      'homework-panel': vis.homeworkListPanel,
      'gamification-panel': vis.gamificationPanel,
      'analytics-panel': vis.analyticsPanel,
      'statistics-panel': vis.statisticsPanel
    };
    
    for (const [panelId, visible] of Object.entries(panels)) {
      const panel = document.getElementById(panelId);
      if (panel) {
        panel.style.display = visible ? 'block' : 'none';
      }
    }
    
    // כפתורים
    const buttons = {
      'quick-search-btn': vis.quickSearchBtn,
      'theme-selector-btn': vis.themeSelectorBtn,
      'toggle-dark-mode': vis.darkModeBtn,
      'toggle-view-mode': vis.viewModeBtn,
      'quick-help-btn': vis.helpBtn,
      'open-settings': vis.settingsBtn,
      'archive-toggle': vis.archiveBtn
    };
    
    for (const [btnId, visible] of Object.entries(buttons)) {
      const btn = document.getElementById(btnId);
      if (btn) {
        btn.style.display = visible ? 'flex' : 'none';
      }
    }
    
    console.log('✅ applyVisibility: Visibility settings applied');
  }

  applyPanelOrder() {
    console.log('📋 applyPanelOrder: Applying panel order...');
    
    const grid = document.querySelector('.grid');
    if (!grid) {
      console.warn('⚠️ applyPanelOrder: Grid not found');
      return;
    }
    
    const panels = Array.from(grid.children);
    const order = this.settings.panelOrder;
    
    // מיון הפאנלים לפי הסדר
    panels.sort((a, b) => {
      const orderA = order[a.id] || 999;
      const orderB = order[b.id] || 999;
      return orderA - orderB;
    });
    
    // הוספה מחדש לפי הסדר
    panels.forEach(panel => {
      grid.appendChild(panel);
    });
    
    console.log('✅ applyPanelOrder: Panel order applied');
  }

  // ==================== ממשק משתמש ====================

  openAdvancedSettings() {
    console.log('⚙️ openAdvancedSettings: Opening advanced settings modal...');
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'advanced-settings-modal';
    
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 800px;">
        <div class="modal-header">
          <h2>⚙️ הגדרות מתקדמות</h2>
          <button class="close-modal-btn" onclick="document.getElementById('advanced-settings-modal').remove()">
            <svg width="24" height="24"><use href="#x"></use></svg>
          </button>
        </div>
        
        <div class="modal-body">
          <!-- תצוגה -->
          <div class="settings-section">
            <h3>👁️ תצוגה</h3>
            
            <h4 style="margin-top: 1rem; margin-bottom: 0.5rem; color: var(--text-secondary);">סטטיסטיקות כותרת</h4>
            <div class="setting-item">
              <label>
                <input type="checkbox" id="vis-header-stats" ${this.settings.visibility.headerStats ? 'checked' : ''}>
                הצג סטטיסטיקות כותרת
              </label>
            </div>
            <div class="setting-item">
              <label>
                <input type="checkbox" id="vis-header-xp" ${this.settings.visibility.headerXpBar ? 'checked' : ''}>
                הצג פס XP בכותרת
              </label>
            </div>
            
            <h4 style="margin-top: 1rem; margin-bottom: 0.5rem; color: var(--text-secondary);">פאנלים</h4>
            <div class="setting-item">
              <label>
                <input type="checkbox" id="vis-timer" ${this.settings.visibility.timerPanel ? 'checked' : ''}>
                טיימר לימוד
              </label>
            </div>
            <div class="setting-item">
              <label>
                <input type="checkbox" id="vis-subjects" ${this.settings.visibility.subjectsPanel ? 'checked' : ''}>
                מקצועות
              </label>
            </div>
            <div class="setting-item">
              <label>
                <input type="checkbox" id="vis-filters" ${this.settings.visibility.filtersPanel ? 'checked' : ''}>
                סינון
              </label>
            </div>
            <div class="setting-item">
              <label>
                <input type="checkbox" id="vis-add-homework" ${this.settings.visibility.addHomeworkPanel ? 'checked' : ''}>
                הוספת שיעורי בית
              </label>
            </div>
            <div class="setting-item">
              <label>
                <input type="checkbox" id="vis-homework-list" ${this.settings.visibility.homeworkListPanel ? 'checked' : ''}>
                רשימת משימות
              </label>
            </div>
            <div class="setting-item">
              <label>
                <input type="checkbox" id="vis-gamification" ${this.settings.visibility.gamificationPanel ? 'checked' : ''}>
                הישגים ומשחוק
              </label>
            </div>
            <div class="setting-item">
              <label>
                <input type="checkbox" id="vis-analytics" ${this.settings.visibility.analyticsPanel ? 'checked' : ''}>
                אנליטיקה מתקדמת
              </label>
            </div>
            <div class="setting-item">
              <label>
                <input type="checkbox" id="vis-statistics" ${this.settings.visibility.statisticsPanel ? 'checked' : ''}>
                סטטיסטיקות (גרפים בסיסיים)
              </label>
            </div>
            
            <h4 style="margin-top: 1rem; margin-bottom: 0.5rem; color: var(--text-secondary);">כפתורים</h4>
            <div class="setting-item">
              <label>
                <input type="checkbox" id="vis-search-btn" ${this.settings.visibility.quickSearchBtn ? 'checked' : ''}>
                חיפוש מהיר
              </label>
            </div>
            <div class="setting-item">
              <label>
                <input type="checkbox" id="vis-theme-btn" ${this.settings.visibility.themeSelectorBtn ? 'checked' : ''}>
                בחירת נושא
              </label>
            </div>
            <div class="setting-item">
              <label>
                <input type="checkbox" id="vis-dark-btn" ${this.settings.visibility.darkModeBtn ? 'checked' : ''}>
                מצב לילה
              </label>
            </div>
            <div class="setting-item">
              <label>
                <input type="checkbox" id="vis-view-btn" ${this.settings.visibility.viewModeBtn ? 'checked' : ''}>
                החלפת תצוגה
              </label>
            </div>
            <div class="setting-item">
              <label>
                <input type="checkbox" id="vis-help-btn" ${this.settings.visibility.helpBtn ? 'checked' : ''}>
                עזרה
              </label>
            </div>
            <div class="setting-item">
              <label>
                <input type="checkbox" id="vis-settings-btn" ${this.settings.visibility.settingsBtn ? 'checked' : ''}>
                הגדרות
              </label>
            </div>
          </div>
          
          <!-- רצפים -->
          <div class="settings-section">
            <h3>🔥 הגדרות רצף</h3>
            <div class="setting-item">
              <label>
                <input type="checkbox" id="streak-one-day-gap" ${this.settings.streakSettings.allowOneDayGap ? 'checked' : ''}>
                אפשר פער של יום אחד (הרצף לא יישבר אם לא השלמת משימות ביום אחד)
              </label>
            </div>
            <div class="setting-item">
              <label>
                <input type="checkbox" id="streak-weekend" ${this.settings.streakSettings.weekendDoesntBreakStreak ? 'checked' : ''}>
                סופי שבוע לא שוברים רצף
              </label>
            </div>
          </div>
          
          <!-- תוכנית ארגון -->
          <div class="settings-section">
            <h3>📅 תוכנית ארגון</h3>
            <div class="setting-item">
              <label>
                <input type="checkbox" id="study-plan-enabled" ${this.settings.studyPlan.enabled ? 'checked' : ''} onchange="advancedSettings.toggleStudyPlan(this.checked)">
                הפעל תוכנית ארגון אוטומטית
              </label>
            </div>
            <div id="study-plan-config" style="display: ${this.settings.studyPlan.enabled ? 'block' : 'none'};">
              <p style="color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 1rem;">
                תוכנית הארגון תנהל אוטומטית את המעבר בין פומודורו להפסקות
              </p>
              <div class="setting-item">
                <label>
                  <input type="checkbox" id="study-plan-auto" ${this.settings.studyPlan.autoAdvance ? 'checked' : ''}>
                  מעבר אוטומטי לשלב הבא
                </label>
              </div>
              <button class="btn btn-secondary" onclick="advancedSettings.editStudyPlan()" style="margin-top: 0.5rem; width: auto;">
                ערוך תוכנית ארגון
              </button>
            </div>
          </div>
          
          <!-- סידור פאנלים -->
          <div class="settings-section">
            <h3>📋 סידור פאנלים</h3>
            <p style="color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 1rem;">
              גרור פאנלים כדי לשנות את סדרם בעמוד
            </p>
            <div id="panel-order-list" class="panel-order-list">
              ${this.renderPanelOrderList()}
            </div>
          </div>
          
          <div style="margin-top: 2rem; display: flex; gap: 1rem;">
            <button class="btn btn-primary" onclick="advancedSettings.saveAdvancedSettings()">
              שמור הגדרות
            </button>
            <button class="btn btn-secondary" onclick="advancedSettings.resetToDefaults()">
              איפוס לברירת מחדל
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
    
    this.initPanelOrderDragAndDrop();
  }

  renderPanelOrderList() {
    const panelNames = {
      'timer-panel': 'טיימר לימוד',
      'subjects-panel': 'מקצועות',
      'filters-panel': 'סינון',
      'add-homework-panel': 'הוספת שיעורי בית',
      'homework-panel': 'רשימת משימות',
      'gamification-panel': 'הישגים ומשחוק',
      'analytics-panel': 'אנליטיקה מתקדמת',
      'statistics-panel': 'סטטיסטיקות'
    };
    
    const sorted = Object.entries(this.settings.panelOrder)
      .sort((a, b) => a[1] - b[1]);
    
    return sorted.map(([id, order]) => `
      <div class="panel-order-item" data-panel-id="${id}" draggable="true">
        <div class="drag-handle">☰</div>
        <div class="panel-order-name">${panelNames[id] || id}</div>
        <div class="panel-order-number">${order}</div>
      </div>
    `).join('');
  }

  initPanelOrderDragAndDrop() {
    const list = document.getElementById('panel-order-list');
    if (!list) return;
    
    let draggedItem = null;
    
    list.addEventListener('dragstart', (e) => {
      if (e.target.classList.contains('panel-order-item')) {
        draggedItem = e.target;
        e.target.style.opacity = '0.5';
      }
    });
    
    list.addEventListener('dragend', (e) => {
      if (e.target.classList.contains('panel-order-item')) {
        e.target.style.opacity = '1';
      }
    });
    
    list.addEventListener('dragover', (e) => {
      e.preventDefault();
      const afterElement = this.getDragAfterElement(list, e.clientY);
      if (afterElement == null) {
        list.appendChild(draggedItem);
      } else {
        list.insertBefore(draggedItem, afterElement);
      }
    });
  }

  getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.panel-order-item:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  toggleStudyPlan(enabled) {
    const config = document.getElementById('study-plan-config');
    if (config) {
      config.style.display = enabled ? 'block' : 'none';
    }
  }

  editStudyPlan() {
    console.log('📅 editStudyPlan: Opening study plan editor...');
    
    // יצירת מודאל עריכת תוכנית
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'study-plan-editor-modal';
    
    let sessionsHTML = '';
    this.settings.studyPlan.sessions.forEach((session, index) => {
      sessionsHTML += `
        <div class="study-plan-session" data-index="${index}">
          <div class="session-type">
            <select class="select" onchange="advancedSettings.updateSessionType(${index}, this.value)">
              <option value="work" ${session.type === 'work' ? 'selected' : ''}>עבודה</option>
              <option value="short-break" ${session.type === 'short-break' ? 'selected' : ''}>הפסקה קצרה</option>
              <option value="long-break" ${session.type === 'long-break' ? 'selected' : ''}>הפסקה ארוכה</option>
            </select>
          </div>
          <div class="session-duration">
            <input type="number" class="input" value="${session.duration}" min="1" max="120" 
                   onchange="advancedSettings.updateSessionDuration(${index}, this.value)" style="width: 80px;">
            <span style="margin-right: 0.5rem;">דקות</span>
          </div>
          <button class="icon-btn" onclick="advancedSettings.removeSession(${index})">
            <svg width="16" height="16"><use href="#trash"></use></svg>
          </button>
        </div>
      `;
    });
    
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>📅 עריכת תוכנית ארגון</h2>
          <button class="close-modal-btn" onclick="document.getElementById('study-plan-editor-modal').remove()">
            <svg width="24" height="24"><use href="#x"></use></svg>
          </button>
        </div>
        <div class="modal-body">
          <p style="color: var(--text-secondary); margin-bottom: 1rem;">
            הגדר את רצף השלבים של תוכנית הארגון שלך
          </p>
          <div class="study-plan-sessions">
            ${sessionsHTML}
          </div>
          <button class="btn btn-primary" onclick="advancedSettings.addSession()" style="margin-top: 1rem; width: auto;">
            <svg width="20" height="20"><use href="#plus"></use></svg>
            הוסף שלב
          </button>
          <div style="margin-top: 2rem;">
            <button class="btn btn-success" onclick="advancedSettings.saveStudyPlan()">
              שמור תוכנית
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
  }

  updateSessionType(index, type) {
    console.log(`📅 updateSessionType: Session ${index} type changed to ${type}`);
    this.settings.studyPlan.sessions[index].type = type;
  }

  updateSessionDuration(index, duration) {
    console.log(`⏰ updateSessionDuration: Session ${index} duration changed to ${duration}`);
    this.settings.studyPlan.sessions[index].duration = parseInt(duration);
  }

  addSession() {
    console.log('➕ addSession: Adding new session to study plan');
    this.settings.studyPlan.sessions.push({
      type: 'work',
      duration: 25,
      label: 'עבודה'
    });
    
    // רענון התצוגה
    const modal = document.getElementById('study-plan-editor-modal');
    if (modal) {
      modal.remove();
    }
    this.editStudyPlan();
  }

  removeSession(index) {
    console.log(`🗑️ removeSession: Removing session ${index}`);
    this.settings.studyPlan.sessions.splice(index, 1);
    
    // רענון התצוגה
    const modal = document.getElementById('study-plan-editor-modal');
    if (modal) {
      modal.remove();
    }
    this.editStudyPlan();
  }

  saveStudyPlan() {
    console.log('💾 saveStudyPlan: Saving study plan');
    
    document.getElementById('study-plan-editor-modal').remove();
    
    // חזרה למודאל ההגדרות
    const mainModal = document.getElementById('advanced-settings-modal');
    if (mainModal) {
      mainModal.remove();
    }
    this.openAdvancedSettings();
    
    notifications.showInAppNotification('תוכנית הארגון נשמרה', 'success');
  }

  saveAdvancedSettings() {
    console.log('💾 saveAdvancedSettings: Collecting and saving settings...');
    
    // תצוגה
    this.settings.visibility.headerStats = document.getElementById('vis-header-stats').checked;
    this.settings.visibility.headerXpBar = document.getElementById('vis-header-xp').checked;
    this.settings.visibility.timerPanel = document.getElementById('vis-timer').checked;
    this.settings.visibility.subjectsPanel = document.getElementById('vis-subjects').checked;
    this.settings.visibility.filtersPanel = document.getElementById('vis-filters').checked;
    this.settings.visibility.addHomeworkPanel = document.getElementById('vis-add-homework').checked;
    this.settings.visibility.homeworkListPanel = document.getElementById('vis-homework-list').checked;
    this.settings.visibility.gamificationPanel = document.getElementById('vis-gamification').checked;
    this.settings.visibility.analyticsPanel = document.getElementById('vis-analytics').checked;
    this.settings.visibility.statisticsPanel = document.getElementById('vis-statistics').checked;
    
    this.settings.visibility.quickSearchBtn = document.getElementById('vis-search-btn').checked;
    this.settings.visibility.themeSelectorBtn = document.getElementById('vis-theme-btn').checked;
    this.settings.visibility.darkModeBtn = document.getElementById('vis-dark-btn').checked;
    this.settings.visibility.viewModeBtn = document.getElementById('vis-view-btn').checked;
    this.settings.visibility.helpBtn = document.getElementById('vis-help-btn').checked;
    this.settings.visibility.settingsBtn = document.getElementById('vis-settings-btn').checked;
    
    // רצפים
    this.settings.streakSettings.allowOneDayGap = document.getElementById('streak-one-day-gap').checked;
    this.settings.streakSettings.weekendDoesntBreakStreak = document.getElementById('streak-weekend').checked;
    
    // תוכנית ארגון
    this.settings.studyPlan.enabled = document.getElementById('study-plan-enabled').checked;
    this.settings.studyPlan.autoAdvance = document.getElementById('study-plan-auto').checked;
    
    // סידור פאנלים
    const orderList = document.getElementById('panel-order-list');
    if (orderList) {
      const items = orderList.querySelectorAll('.panel-order-item');
      items.forEach((item, index) => {
        const panelId = item.dataset.panelId;
        this.settings.panelOrder[panelId] = index + 1;
      });
    }
    
    this.saveSettings();
    this.applySettings();
    
    document.getElementById('advanced-settings-modal').remove();
  }

  async resetToDefaults() {
    console.log('🔄 resetToDefaults: Resetting to default settings...');
    
    if (!confirm('האם אתה בטוח שברצונך לאפס את כל ההגדרות לברירת מחדל?')) {
      return;
    }
    
    // איפוס להגדרות ברירת מחדל
    this.settings = {
      visibility: {
        headerStats: true,
        headerXpBar: true,
        timerPanel: true,
        subjectsPanel: true,
        filtersPanel: true,
        addHomeworkPanel: true,
        homeworkListPanel: true,
        gamificationPanel: true,
        analyticsPanel: true,
        statisticsPanel: true,
        quickSearchBtn: true,
        themeSelectorBtn: true,
        darkModeBtn: true,
        viewModeBtn: true,
        helpBtn: true,
        settingsBtn: true,
        archiveBtn: true
      },
      panelOrder: {
        'timer-panel': 1,
        'subjects-panel': 2,
        'filters-panel': 3,
        'add-homework-panel': 4,
        'homework-panel': 5,
        'gamification-panel': 6,
        'analytics-panel': 7,
        'statistics-panel': 8
      },
      streakSettings: {
        allowOneDayGap: true,
        weekendDoesntBreakStreak: false
      },
      studyPlan: {
        enabled: false,
        sessions: [
          { type: 'work', duration: 25, label: 'עבודה' },
          { type: 'short-break', duration: 5, label: 'הפסקה קצרה' },
          { type: 'work', duration: 25, label: 'עבודה' },
          { type: 'short-break', duration: 5, label: 'הפסקה קצרה' },
          { type: 'work', duration: 25, label: 'עבודה' },
          { type: 'long-break', duration: 15, label: 'הפסקה ארוכה' }
        ],
        currentSessionIndex: 0,
        autoAdvance: true
      }
    };
    
    await this.saveSettings();
    this.applySettings();
    
    document.getElementById('advanced-settings-modal').remove();
    
    notifications.showInAppNotification('ההגדרות אופסו לברירת מחדל', 'success');
  }
}

// יצירת אובייקט גלובלי
console.log('⚙️ Creating global advanced settings manager...');
const advancedSettings = new AdvancedSettingsManager();
console.log('✅ Global advanced settings manager created');

// אתחול
window.addEventListener('DOMContentLoaded', async () => {
  console.log('⚙️ advanced-settings.js: Initializing...');
  await advancedSettings.loadSettings();
  console.log('✅ advanced-settings.js: Initialized');
});

console.log('✅ advanced-settings.js: Loaded');
