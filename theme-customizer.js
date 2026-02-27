// Theme Customizer - התאמה אישית של צבעים ונושאים
class ThemeCustomizer {
  constructor() {
    this.themes = {
      default: {
        name: 'כחול קלאסי',
        colors: {
          primary: '#3b82f6',
          secondary: '#8b5cf6',
          success: '#10b981',
          warning: '#f59e0b',
          danger: '#ef4444'
        }
      },
      ocean: {
        name: 'אוקיינוס',
        colors: {
          primary: '#0891b2',
          secondary: '#06b6d4',
          success: '#14b8a6',
          warning: '#f97316',
          danger: '#dc2626'
        }
      },
      forest: {
        name: 'יער',
        colors: {
          primary: '#059669',
          secondary: '#10b981',
          success: '#22c55e',
          warning: '#f59e0b',
          danger: '#ef4444'
        }
      },
      sunset: {
        name: 'שקיעה',
        colors: {
          primary: '#f59e0b',
          secondary: '#fb923c',
          success: '#10b981',
          warning: '#fbbf24',
          danger: '#f87171'
        }
      },
      purple: {
        name: 'סגול מלכותי',
        colors: {
          primary: '#7c3aed',
          secondary: '#a78bfa',
          success: '#10b981',
          warning: '#f59e0b',
          danger: '#ef4444'
        }
      },
      pink: {
        name: 'ורוד אביבי',
        colors: {
          primary: '#ec4899',
          secondary: '#f472b6',
          success: '#10b981',
          warning: '#f59e0b',
          danger: '#ef4444'
        }
      }
    };

    this.currentTheme = 'default';
    this.customColors = null;
    
    console.log('🎨 ThemeCustomizer: Initialized');
  }

  // טעינת ערכת נושא
  async loadTheme() {
    console.log('📥 ThemeCustomizer: Loading theme...');
    try {
      const savedTheme = await storage.get('homework-theme');
      if (savedTheme) {
        this.currentTheme = savedTheme.name || 'default';
        this.customColors = savedTheme.customColors || null;
        this.applyTheme(this.currentTheme);
        console.log('✅ ThemeCustomizer: Theme loaded:', this.currentTheme);
      }
    } catch (error) {
      console.error('❌ ThemeCustomizer: Error loading theme:', error);
    }
  }

  // שמירת ערכת נושא
  async saveTheme() {
    console.log('💾 ThemeCustomizer: Saving theme...');
    try {
      await storage.set('homework-theme', {
        name: this.currentTheme,
        customColors: this.customColors
      });
      console.log('✅ ThemeCustomizer: Theme saved');
    } catch (error) {
      console.error('❌ ThemeCustomizer: Error saving theme:', error);
    }
  }

  // החלת ערכת נושא
  applyTheme(themeName) {
    console.log('🎨 ThemeCustomizer: Applying theme:', themeName);
    
    const theme = this.themes[themeName];
    if (!theme) {
      console.error('❌ ThemeCustomizer: Theme not found:', themeName);
      return;
    }

    this.currentTheme = themeName;
    const colors = this.customColors || theme.colors;

    // עדכון משתני CSS
    const root = document.documentElement;
    root.style.setProperty('--color-primary', colors.primary);
    root.style.setProperty('--color-secondary', colors.secondary);
    root.style.setProperty('--color-success', colors.success);
    root.style.setProperty('--color-warning', colors.warning);
    root.style.setProperty('--color-danger', colors.danger);

    this.saveTheme();
    this.updateUI();
    
    notifications.showInAppNotification(`🎨 ערכת נושא "${theme.name}" הופעלה`, 'success');
    console.log('✅ ThemeCustomizer: Theme applied');
  }

  // התאמה אישית של צבעים
  setCustomColor(colorType, value) {
    console.log('🎨 ThemeCustomizer: Setting custom color:', colorType, value);
    
    if (!this.customColors) {
      const currentTheme = this.themes[this.currentTheme];
      this.customColors = { ...currentTheme.colors };
    }

    this.customColors[colorType] = value;
    
    const root = document.documentElement;
    root.style.setProperty(`--color-${colorType}`, value);

    this.saveTheme();
    this.updateUI();
  }

  // איפוס לברירת מחדל
  resetToDefault() {
    console.log('🔄 ThemeCustomizer: Resetting to default theme');
    this.customColors = null;
    this.applyTheme('default');
    notifications.showInAppNotification('🔄 הצבעים אופסו לברירת מחדל', 'info');
  }

  // עדכון UI
  updateUI() {
    // עדכון כל הגרפים
    if (typeof updateChartColors === 'function') {
      updateChartColors();
    }
    if (typeof analyticsManager !== 'undefined' && analyticsManager.updateChartColors) {
      analyticsManager.updateChartColors();
    }
  }

  // רינדור ממשק התאמה אישית
  renderCustomizer() {
    console.log('🎨 ThemeCustomizer: Rendering customizer interface');
    
    const currentColors = this.customColors || this.themes[this.currentTheme].colors;

    return `
      <div class="theme-customizer">
        <h3>🎨 התאמה אישית של צבעים</h3>

        <div class="theme-presets">
          <h4>ערכות נושא מוכנות</h4>
          <div class="theme-grid">
            ${Object.entries(this.themes).map(([key, theme]) => `
              <div class="theme-preset ${this.currentTheme === key ? 'active' : ''}" 
                   onclick="themeCustomizer.applyTheme('${key}')">
                <div class="theme-preview">
                  <div class="theme-color" style="background-color: ${theme.colors.primary};"></div>
                  <div class="theme-color" style="background-color: ${theme.colors.secondary};"></div>
                  <div class="theme-color" style="background-color: ${theme.colors.success};"></div>
                  <div class="theme-color" style="background-color: ${theme.colors.warning};"></div>
                  <div class="theme-color" style="background-color: ${theme.colors.danger};"></div>
                </div>
                <div class="theme-name">${theme.name}</div>
                ${this.currentTheme === key ? '<div class="theme-check">✓</div>' : ''}
              </div>
            `).join('')}
          </div>
        </div>

        <div class="color-customization">
          <h4>התאמה ידנית</h4>
          <div class="color-pickers">
            <div class="color-picker-item">
              <label>צבע ראשי</label>
              <div class="color-picker-wrapper">
                <input type="color" value="${currentColors.primary}" 
                       onchange="themeCustomizer.setCustomColor('primary', this.value)">
                <span class="color-value">${currentColors.primary}</span>
              </div>
            </div>

            <div class="color-picker-item">
              <label>צבע משני</label>
              <div class="color-picker-wrapper">
                <input type="color" value="${currentColors.secondary}" 
                       onchange="themeCustomizer.setCustomColor('secondary', this.value)">
                <span class="color-value">${currentColors.secondary}</span>
              </div>
            </div>

            <div class="color-picker-item">
              <label>הצלחה</label>
              <div class="color-picker-wrapper">
                <input type="color" value="${currentColors.success}" 
                       onchange="themeCustomizer.setCustomColor('success', this.value)">
                <span class="color-value">${currentColors.success}</span>
              </div>
            </div>

            <div class="color-picker-item">
              <label>אזהרה</label>
              <div class="color-picker-wrapper">
                <input type="color" value="${currentColors.warning}" 
                       onchange="themeCustomizer.setCustomColor('warning', this.value)">
                <span class="color-value">${currentColors.warning}</span>
              </div>
            </div>

            <div class="color-picker-item">
              <label>סכנה</label>
              <div class="color-picker-wrapper">
                <input type="color" value="${currentColors.danger}" 
                       onchange="themeCustomizer.setCustomColor('danger', this.value)">
                <span class="color-value">${currentColors.danger}</span>
              </div>
            </div>
          </div>

          <button class="btn btn-secondary" onclick="themeCustomizer.resetToDefault()" style="margin-top: 1rem;">
            🔄 איפוס לברירת מחדל
          </button>
        </div>

        <div class="theme-preview-area">
          <h4>תצוגה מקדימה</h4>
          <div class="preview-items">
            <button class="btn btn-primary" style="background: ${currentColors.primary};">כפתור ראשי</button>
            <button class="btn btn-success" style="background: ${currentColors.success};">הצלחה</button>
            <button class="btn" style="background: ${currentColors.warning}; color: white;">אזהרה</button>
            <button class="btn btn-danger" style="background: ${currentColors.danger};">סכנה</button>
            <div class="badge" style="background: ${currentColors.secondary};">תגית</div>
          </div>
        </div>
      </div>
    `;
  }
}

// יצירת אובייקט גלובלי
console.log('🎨 Creating global theme customizer...');
const themeCustomizer = new ThemeCustomizer();
console.log('✅ Global theme customizer created');
