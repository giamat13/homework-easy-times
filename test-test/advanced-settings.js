// Advanced Settings Manager - מנהל הגדרות מתקדם
// ============================================================

class AdvancedSettingsManager {
  constructor() {
    console.log('⚙️ AdvancedSettingsManager: Initializing...');
    
    this.settings = {
      // הגדרות תצוגה
      visibility: {
        statsPanel: true,
        chartsPanel: true,
        analyticsPanel: true,
        gamificationPanel: true,
        timerPanel: true,
        quickSearchBtn: true,
        themeSelectorBtn: true,
        toggleDarkBtn: true,
        toggleViewBtn: true,
        helpBtn: true,
        settingsBtn: true,
        xpProgressBar: true
      },
      
      // סדר פאנלים (מספרים נמוכים = גבוה יותר)
      panelOrder: {
        timer: 1,
        subjects: 2,
        filters: 3,
        addHomework: 4,
        homeworkList: 5,
        gamification: 6,
        analytics: 7,
        statistics: 8
      },
      
      // הגדרות רצף
      streakSettings: {
        allowSkipDays: true, // אפשר דילוג על ימים בלי משימות
        gracePeriod: 1, // כמה ימים מותר לדלג
        countExamPractice: true // האם התאמנות למבחן נחשבת
      },
      
      // תוכנית ארגון
      studySchedule: {
        enabled: false,
        selectedPlan: 'pomodoro', // pomodoro, custom, flexible
        plans: {
          pomodoro: {
            name: 'פומודורו קלאסי',
            workTime: 25,
            shortBreak: 5,
            longBreak: 15,
            cyclesUntilLong: 4
          },
          extended: {
            name: 'פומודורו מורחב',
            workTime: 50,
            shortBreak: 10,
            longBreak: 30,
            cyclesUntilLong: 3
          },
          study90: {
            name: 'מושב 90 דקות',
            workTime: 90,
            shortBreak: 20,
            longBreak: 30,
            cyclesUntilLong: 2
          },
          custom: {
            name: 'מותאם אישית',
            workTime: 25,
            shortBreak: 5,
            longBreak: 15,
            cyclesUntilLong: 4
          }
        }
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
        this.settings = this.deepMerge(this.settings, saved);
        console.log('✅ loadSettings: Advanced settings loaded');
        console.log('📊 loadSettings: Settings:', this.settings);
      }
    } catch (error) {
      console.error('❌ loadSettings: Error loading settings:', error);
    }
  }

  async saveSettings() {
    console.log('💾 saveSettings: Saving advanced settings...');
    try {
      await storage.set('advanced-settings', this.settings);
      console.log('✅ saveSettings: Advanced settings saved');
    } catch (error) {
      console.error('❌ saveSettings: Error saving settings:', error);
    }
  }

  // ==================== עזרים ====================
  
  deepMerge(target, source) {
    const output = Object.assign({}, target);
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target))
            Object.assign(output, { [key]: source[key] });
          else
            output[key] = this.deepMerge(target[key], source[key]);
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    return output;
  }

  isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
  }

  // ==================== ניהול תצוגה ====================
  
  applyVisibilitySettings() {
    console.log('👁️ applyVisibilitySettings: Applying visibility settings...');
    
    const mappings = {
      quickSearchBtn: 'quick-search-btn',
      themeSelectorBtn: 'theme-selector-btn',
      toggleDarkBtn: 'toggle-dark-mode',
      toggleViewBtn: 'toggle-view-mode',
      helpBtn: 'quick-help-btn',
      settingsBtn: 'open-settings',
      xpProgressBar: 'header-xp-progress',
      timerPanel: 'timer-panel',
      gamificationPanel: 'gamification-panel',
      analyticsPanel: 'analytics-panel'
    };
    
    Object.keys(this.settings.visibility).forEach(key => {
      const elementId = mappings[key];
      if (elementId) {
        const element = document.getElementById(elementId);
        if (element) {
          if (this.settings.visibility[key]) {
            element.style.display = '';
            console.log(`✅ applyVisibilitySettings: Showing ${key}`);
          } else {
            element.style.display = 'none';
            console.log(`🚫 applyVisibilitySettings: Hiding ${key}`);
          }
        }
      }
    });
    
    // XP Progress Bar (parent container)
    const xpContainer = document.querySelector('.xp-progress-container');
    if (xpContainer) {
      if (this.settings.visibility.xpProgressBar) {
        xpContainer.style.display = '';
      } else {
        xpContainer.style.display = 'none';
      }
    }
    
    console.log('✅ applyVisibilitySettings: Visibility settings applied');
  }

  applyPanelOrder() {
    console.log('🔄 applyPanelOrder: Applying panel order...');
    
    const grid = document.querySelector('.grid');
    if (!grid) {
      console.warn('⚠️ applyPanelOrder: Grid not found');
      return;
    }
    
    const panels = Array.from(grid.children);
    const orderedPanels = panels.sort((a, b) => {
      const aId = a.id || '';
      const bId = b.id || '';
      
      const aOrder = this.getPanelOrder(aId);
      const bOrder = this.getPanelOrder(bId);
      
      return aOrder - bOrder;
    });
    
    orderedPanels.forEach(panel => {
      grid.appendChild(panel);
    });
    
    console.log('✅ applyPanelOrder: Panel order applied');
  }

  getPanelOrder(panelId) {
    const orderMap = {
      'timer-panel': this.settings.panelOrder.timer,
      'gamification-panel': this.settings.panelOrder.gamification,
      'analytics-panel': this.settings.panelOrder.analytics
    };
    
    // בדיקת טקסט בפאנל
    const panel = document.getElementById(panelId);
    if (panel) {
      const text = panel.textContent;
      if (text.includes('מקצועות')) return this.settings.panelOrder.subjects;
      if (text.includes('סינון')) return this.settings.panelOrder.filters;
      if (text.includes('הוסף שיעורי בית')) return this.settings.panelOrder.addHomework;
      if (text.includes('רשימת משימות')) return this.settings.panelOrder.homeworkList;
      if (text.includes('סטטיסטיקות') && !text.includes('דשבורד')) return this.settings.panelOrder.statistics;
    }
    
    return orderMap[panelId] || 999;
  }

  // ==================== UI ====================
  
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
            <h3>👁️ תצוגה - בחר מה להציג</h3>
            <div class="visibility-grid">
              ${this.renderVisibilityToggles()}
            </div>
          </div>
          
          <!-- סדר פאנלים -->
          <div class="settings-section">
            <h3>🔄 סדר פאנלים</h3>
            <p class="help-text">גרור כדי לשנות את הסדר (מספרים נמוכים = גבוה יותר)</p>
            <div class="panel-order-grid">
              ${this.renderPanelOrderControls()}
            </div>
          </div>
          
          <!-- הגדרות רצף -->
          <div class="settings-section">
            <h3>🔥 הגדרות רצף</h3>
            <div class="setting-item">
              <label>
                <input type="checkbox" id="streak-allow-skip" 
                       ${this.settings.streakSettings.allowSkipDays ? 'checked' : ''}
                       onchange="advancedSettings.settings.streakSettings.allowSkipDays = this.checked">
                אפשר שמירת רצף גם כשאין משימות
              </label>
              <p class="help-text">✨ אם ביום מסוים אין לך שום משימה או מבחן, הרצף לא ישבר</p>
            </div>
            <div class="setting-item">
              <label>
                ימי חסד מותרים:
                <input type="number" id="streak-grace" 
                       value="${this.settings.streakSettings.gracePeriod}" 
                       min="0" max="7" class="input" style="width: 80px; display: inline-block; margin-right: 0.5rem;"
                       onchange="advancedSettings.settings.streakSettings.gracePeriod = parseInt(this.value)">
              </label>
              <p class="help-text">כמה ימים רצופים בלי משימות מותר לדלג</p>
            </div>
            <div class="setting-item">
              <label>
                <input type="checkbox" id="streak-count-exam" 
                       ${this.settings.streakSettings.countExamPractice ? 'checked' : ''}
                       onchange="advancedSettings.settings.streakSettings.countExamPractice = this.checked">
                ספור התאמנות למבחן כפעילות יומית
              </label>
              <p class="help-text">גם תרגול למבחן שומר על הרצף</p>
            </div>
          </div>
          
          <!-- תוכנית ארגון -->
          <div class="settings-section">
            <h3>📅 תוכנית ארגון ולימוד</h3>
            <div class="setting-item">
              <label>
                <input type="checkbox" id="schedule-enabled" 
                       ${this.settings.studySchedule.enabled ? 'checked' : ''}
                       onchange="advancedSettings.toggleSchedule(this.checked)">
                הפעל תוכנית ארגון אוטומטית
              </label>
            </div>
            
            <div id="schedule-options" style="display: ${this.settings.studySchedule.enabled ? 'block' : 'none'};">
              <label>בחר תוכנית:</label>
              <select class="select" id="schedule-plan" onchange="advancedSettings.selectPlan(this.value)">
                ${Object.keys(this.settings.studySchedule.plans).map(key => `
                  <option value="${key}" ${this.settings.studySchedule.selectedPlan === key ? 'selected' : ''}>
                    ${this.settings.studySchedule.plans[key].name}
                  </option>
                `).join('')}
              </select>
              
              <div id="plan-details" style="margin-top: 1rem;">
                ${this.renderPlanDetails()}
              </div>
            </div>
          </div>
          
          <div class="btn-group">
            <button class="btn btn-primary" onclick="advancedSettings.saveAndApply()">
              💾 שמור והחל
            </button>
            <button class="btn btn-secondary" onclick="advancedSettings.resetToDefaults()">
              🔄 איפוס לברירת מחדל
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }

  renderVisibilityToggles() {
    const labels = {
      statsPanel: '📊 פאנל סטטיסטיקות',
      chartsPanel: '📈 גרפים',
      analyticsPanel: '📊 דשבורד אנליטיקה',
      gamificationPanel: '🏆 פאנל משחוק',
      timerPanel: '⏰ טיימר לימוד',
      quickSearchBtn: '🔍 כפתור חיפוש מהיר',
      themeSelectorBtn: '🎨 בוחר ערכות נושא',
      toggleDarkBtn: '🌙 כפתור מצב לילה',
      toggleViewBtn: '📅 כפתור החלפת תצוגה',
      helpBtn: '❓ כפתור עזרה',
      settingsBtn: '⚙️ כפתור הגדרות',
      xpProgressBar: '⚡ פס התקדמות XP'
    };
    
    return Object.keys(this.settings.visibility).map(key => `
      <div class="visibility-toggle">
        <label>
          <input type="checkbox" 
                 ${this.settings.visibility[key] ? 'checked' : ''}
                 onchange="advancedSettings.settings.visibility.${key} = this.checked">
          ${labels[key] || key}
        </label>
      </div>
    `).join('');
  }

  renderPanelOrderControls() {
    const labels = {
      timer: '⏰ טיימר לימוד',
      subjects: '📚 מקצועות',
      filters: '🔍 סינון',
      addHomework: '➕ הוסף משימה',
      homeworkList: '📝 רשימת משימות',
      gamification: '🏆 משחוק',
      analytics: '📊 אנליטיקה',
      statistics: '📈 סטטיסטיקות'
    };
    
    return Object.keys(this.settings.panelOrder).map(key => `
      <div class="panel-order-item">
        <label>${labels[key] || key}</label>
        <input type="number" 
               value="${this.settings.panelOrder[key]}" 
               min="1" max="20" 
               class="input" style="width: 80px;"
               onchange="advancedSettings.settings.panelOrder.${key} = parseInt(this.value)">
      </div>
    `).join('');
  }

  renderPlanDetails() {
    const plan = this.settings.studySchedule.plans[this.settings.studySchedule.selectedPlan];
    const isCustom = this.settings.studySchedule.selectedPlan === 'custom';
    
    return `
      <div class="plan-details-grid">
        <div class="form-group">
          <label>זמן עבודה (דקות)</label>
          <input type="number" class="input" 
                 value="${plan.workTime}" 
                 ${!isCustom ? 'disabled' : ''}
                 onchange="advancedSettings.updatePlanValue('workTime', this.value)">
        </div>
        <div class="form-group">
          <label>הפסקה קצרה (דקות)</label>
          <input type="number" class="input" 
                 value="${plan.shortBreak}" 
                 ${!isCustom ? 'disabled' : ''}
                 onchange="advancedSettings.updatePlanValue('shortBreak', this.value)">
        </div>
        <div class="form-group">
          <label>הפסקה ארוכה (דקות)</label>
          <input type="number" class="input" 
                 value="${plan.longBreak}" 
                 ${!isCustom ? 'disabled' : ''}
                 onchange="advancedSettings.updatePlanValue('longBreak', this.value)">
        </div>
        <div class="form-group">
          <label>מחזורים עד הפסקה ארוכה</label>
          <input type="number" class="input" 
                 value="${plan.cyclesUntilLong}" 
                 ${!isCustom ? 'disabled' : ''}
                 onchange="advancedSettings.updatePlanValue('cyclesUntilLong', this.value)">
        </div>
      </div>
      <div class="plan-preview">
        <h4>📋 תצוגה מקדימה:</h4>
        <p>${this.generatePlanPreview(plan)}</p>
      </div>
    `;
  }

  generatePlanPreview(plan) {
    let preview = '';
    for (let i = 1; i <= plan.cyclesUntilLong; i++) {
      preview += `<strong>מחזור ${i}:</strong> ${plan.workTime} דק' עבודה → `;
      if (i < plan.cyclesUntilLong) {
        preview += `${plan.shortBreak} דק' הפסקה<br>`;
      } else {
        preview += `${plan.longBreak} דק' הפסקה ארוכה<br>`;
      }
    }
    return preview;
  }

  // ==================== פעולות ====================
  
  toggleSchedule(enabled) {
    console.log('📅 toggleSchedule:', enabled);
    this.settings.studySchedule.enabled = enabled;
    
    const options = document.getElementById('schedule-options');
    if (options) {
      options.style.display = enabled ? 'block' : 'none';
    }
  }

  selectPlan(planKey) {
    console.log('📅 selectPlan:', planKey);
    this.settings.studySchedule.selectedPlan = planKey;
    
    const details = document.getElementById('plan-details');
    if (details) {
      details.innerHTML = this.renderPlanDetails();
    }
  }

  updatePlanValue(field, value) {
    console.log(`📅 updatePlanValue: ${field} = ${value}`);
    const planKey = this.settings.studySchedule.selectedPlan;
    this.settings.studySchedule.plans[planKey][field] = parseInt(value);
    
    // עדכון תצוגה מקדימה
    const preview = document.querySelector('.plan-preview p');
    if (preview) {
      preview.innerHTML = this.generatePlanPreview(this.settings.studySchedule.plans[planKey]);
    }
  }

  async saveAndApply() {
    console.log('💾 saveAndApply: Saving and applying settings...');
    
    await this.saveSettings();
    this.applyVisibilitySettings();
    this.applyPanelOrder();
    
    // עדכון טיימר אם יש תוכנית
    if (this.settings.studySchedule.enabled && typeof studyTimer !== 'undefined') {
      const plan = this.settings.studySchedule.plans[this.settings.studySchedule.selectedPlan];
      studyTimer.settings.pomodoroDuration = plan.workTime;
      studyTimer.settings.shortBreakDuration = plan.shortBreak;
      studyTimer.settings.longBreakDuration = plan.longBreak;
      studyTimer.settings.pomodorosUntilLongBreak = plan.cyclesUntilLong;
      await studyTimer.saveSettings();
      studyTimer.renderTimerPanel();
    }
    
    document.getElementById('advanced-settings-modal').remove();
    notifications.showInAppNotification('✅ ההגדרות נשמרו והוחלו', 'success');
  }

  async resetToDefaults() {
    console.log('🔄 resetToDefaults: Resetting to defaults...');
    
    if (!confirm('האם אתה בטוח שברצונך לאפס את כל ההגדרות המתקדמות?')) {
      return;
    }
    
    // מחיקת ההגדרות השמורות
    await storage.delete('advanced-settings');
    
    // טעינה מחדש של הדף
    location.reload();
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
  
  // המתן רגע שהדף נטען לפני החלת הגדרות
  setTimeout(() => {
    advancedSettings.applyVisibilitySettings();
    advancedSettings.applyPanelOrder();
  }, 500);
  
  console.log('✅ advanced-settings.js: Initialized');
});
