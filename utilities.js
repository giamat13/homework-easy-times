// Utilities: Theme Customizer, Quick Actions, Smart Search
// ==========================================================

// ── Fallback: ודא ש-storage זמין ──────────────────────────────
if (typeof storage === 'undefined') {
  /* eslint-disable no-var */
  var storage = window.storage || window.storageManager;
}

// ============ Theme Customizer ============
class ThemeCustomizer {
  constructor() {
    this.themes = {
      default: {
        name: 'ברירת מחדל',
        primary: '#3b82f6',
        secondary: '#8b5cf6',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        bgGradient: 'linear-gradient(135deg, #e0f2fe 0%, #ddd6fe 100%)'
      },
      ocean: {
        name: 'אוקיינוס',
        primary: '#0ea5e9',
        secondary: '#06b6d4',
        success: '#14b8a6',
        warning: '#f59e0b',
        danger: '#f43f5e',
        bgGradient: 'linear-gradient(135deg, #cffafe 0%, #ddd6fe 100%)'
      },
      forest: {
        name: 'יער',
        primary: '#10b981',
        secondary: '#059669',
        success: '#22c55e',
        warning: '#f59e0b',
        danger: '#ef4444',
        bgGradient: 'linear-gradient(135deg, #d1fae5 0%, #dcfce7 100%)'
      },
      sunset: {
        name: 'שקיעה',
        primary: '#f59e0b',
        secondary: '#f97316',
        success: '#10b981',
        warning: '#eab308',
        danger: '#dc2626',
        bgGradient: 'linear-gradient(135deg, #fed7aa 0%, #fecaca 100%)'
      },
      purple: {
        name: 'סגול',
        primary: '#8b5cf6',
        secondary: '#a78bfa',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        bgGradient: 'linear-gradient(135deg, #ddd6fe 0%, #e9d5ff 100%)'
      },
      dark: {
        name: 'כהה',
        primary: '#60a5fa',
        secondary: '#818cf8',
        success: '#34d399',
        warning: '#fbbf24',
        danger: '#f87171',
        bgGradient: 'linear-gradient(135deg, #1e293b 0%, #312e81 100%)'
      }
    };

    this.currentTheme = 'default';
    console.log('🎨 ThemeCustomizer: Initialized');
  }

  async loadTheme() {
    console.log('🎨 loadTheme: Loading saved theme...');
    try {
      const saved = await storage.get('theme-settings');
      if (saved && saved.theme) {
        this.currentTheme = saved.theme;
        this.applyTheme(this.currentTheme);
        console.log('✅ loadTheme: Theme loaded:', this.currentTheme);
      }
    } catch (error) {
      console.error('❌ loadTheme: Error loading theme:', error);
    }
  }

  async saveTheme() {
    console.log('💾 saveTheme: Saving theme...');
    try {
      await storage.set('theme-settings', { theme: this.currentTheme });
      console.log('✅ saveTheme: Theme saved');
    } catch (error) {
      console.error('❌ saveTheme: Error saving theme:', error);
    }
  }

  applyTheme(themeName) {
    console.log('🎨 applyTheme: Applying theme:', themeName);
    
    const theme = this.themes[themeName];
    if (!theme) {
      console.warn('⚠️ applyTheme: Theme not found:', themeName);
      return;
    }

    const root = document.documentElement;
    
    // עדכון משתני CSS
    root.style.setProperty('--color-primary', theme.primary);
    root.style.setProperty('--color-secondary', theme.secondary);
    root.style.setProperty('--color-success', theme.success);
    root.style.setProperty('--color-warning', theme.warning);
    root.style.setProperty('--color-danger', theme.danger);
    
    // עדכון רקע
    const body = document.body;
    if (!body.classList.contains('dark-mode')) {
      body.style.background = theme.bgGradient;
    }

    this.currentTheme = themeName;
    this.saveTheme();
    
    notifications.showInAppNotification(`נושא "${theme.name}" הוחל`, 'success');
    console.log('✅ applyTheme: Theme applied');
  }

  openThemeSelector() {
    console.log('🎨 openThemeSelector: Opening theme selector...');
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'theme-selector-modal';
    
    let themesHTML = '';
    Object.keys(this.themes).forEach(key => {
      const theme = this.themes[key];
      const isActive = key === this.currentTheme;
      
      themesHTML += `
        <div class="theme-option ${isActive ? 'active' : ''}" 
             onclick="themeCustomizer.applyTheme('${key}'); document.getElementById('theme-selector-modal').remove();">
          <div class="theme-preview" style="background: ${theme.bgGradient};">
            <div class="theme-colors">
              <div class="theme-color" style="background: ${theme.primary};"></div>
              <div class="theme-color" style="background: ${theme.secondary};"></div>
              <div class="theme-color" style="background: ${theme.success};"></div>
            </div>
          </div>
          <div class="theme-name">${theme.name}</div>
          ${isActive ? '<div class="theme-active">✓</div>' : ''}
        </div>
      `;
    });
    
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>🎨 בחר נושא</h2>
          <button class="close-modal-btn" onclick="document.getElementById('theme-selector-modal').remove()">
            <svg width="24" height="24"><use href="#x"></use></svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="themes-grid">
            ${themesHTML}
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }
}

// ============ Quick Actions ============
class QuickActionsManager {
  constructor() {
    this.shortcuts = {
      'n': { action: 'newTask', description: 'משימה חדשה', ctrl: true },
      's': { action: 'newSubject', description: 'מקצוע חדש', ctrl: true },
      'f': { action: 'search', description: 'חיפוש', ctrl: true },
      't': { action: 'toggleTimer', description: 'התחל/עצור טיימר', ctrl: true },
      'f1': { action: 'showHelp', description: 'עזרה' },
      'a': { action: 'showAchievements', description: 'הישגים', ctrl: true },
      'd': { action: 'toggleDarkMode', description: 'מצב לילה', ctrl: true },
      'e': { action: 'export', description: 'ייצוא', ctrl: true, shift: true },
    };

    this.isEnabled = true;
    console.log('⚡ QuickActionsManager: Initialized');
  }

  async loadSettings() {
    console.log('⚡ loadSettings: Loading quick actions settings...');
    try {
      const saved = await storage.get('quick-actions-settings');
      if (saved) {
        this.isEnabled = saved.enabled !== false;
        console.log('✅ loadSettings: Settings loaded');
      }
    } catch (error) {
      console.error('❌ loadSettings: Error loading settings:', error);
    }
  }

  initializeListeners() {
    console.log('⚡ initializeListeners: Setting up keyboard listeners...');
    
    document.addEventListener('keydown', (e) => {
      if (!this.isEnabled) return;

      const key = e.key.toLowerCase();
      const shortcut = this.shortcuts[key];
      
      // אל תפעל בתוך שדות קלט
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        if (shortcut && shortcut.action === 'showHelp') {
          e.preventDefault();
          this.executeAction(shortcut.action);
        }
        // אבל אפשר Ctrl+F לחיפוש
        if (e.ctrlKey && e.key === 'f') {
          e.preventDefault();
          this.executeAction('search');
        }
        return;
      }

      if (shortcut) {
        const ctrlMatch = shortcut.ctrl ? e.ctrlKey : !e.ctrlKey;
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;

        if (ctrlMatch && shiftMatch) {
          e.preventDefault();
          this.executeAction(shortcut.action);
        }
      }
    });

    console.log('✅ initializeListeners: Listeners initialized');
  }

  executeAction(action) {
    console.log('⚡ executeAction: Executing', action);

    const actions = {
      newTask: () => {
        const titleInput = document.getElementById('hw-title');
        if (titleInput) {
          titleInput.focus();
          titleInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      },
      newSubject: () => {
        const showBtn = document.getElementById('show-add-subject');
        if (showBtn && !showBtn.classList.contains('hidden')) {
          showBtn.click();
        }
        const nameInput = document.getElementById('subject-name');
        if (nameInput) {
          nameInput.focus();
        }
      },
      search: () => {
        smartSearch.openSearchPanel();
      },
      toggleTimer: () => {
        if (typeof studyTimer !== 'undefined') {
          if (studyTimer.isRunning) {
            studyTimer.pauseTimer();
          } else if (studyTimer.isPaused) {
            studyTimer.resumeTimer();
          } else {
            studyTimer.startTimer('pomodoro');
          }
        }
      },
      showHelp: () => {
        this.showHelpModal();
      },
      showAchievements: () => {
        if (typeof gamification !== 'undefined') {
          const panel = document.getElementById('gamification-panel');
          if (panel) {
            panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      },
      toggleDarkMode: () => {
        if (typeof toggleDarkMode === 'function') {
          toggleDarkMode();
        }
      },
      export: () => {
        if (typeof exportData === 'function') {
          exportData();
        }
      }
    };

    if (actions[action]) {
      actions[action]();
    }
  }

  showHelpModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'help-modal';
    
    let shortcutsHTML = '';
    Object.keys(this.shortcuts).forEach(key => {
      const sc = this.shortcuts[key];
      const modifiers = [];
      if (sc.ctrl) modifiers.push('Ctrl');
      if (sc.shift) modifiers.push('Shift');
      modifiers.push(key.toUpperCase());
      
      shortcutsHTML += `
        <div class="shortcut-item">
          <div class="shortcut-keys">
            ${modifiers.map(m => `<kbd>${m}</kbd>`).join(' + ')}
          </div>
          <div class="shortcut-desc">${sc.description}</div>
        </div>
      `;
    });
    
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>⚡ קיצורי דרך</h2>
          <button class="close-modal-btn" onclick="document.getElementById('help-modal').remove()">
            <svg width="24" height="24"><use href="#x"></use></svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="shortcuts-list">
            ${shortcutsHTML}
          </div>
          <div class="help-tip">
            💡 טיפ: לחץ <kbd>F1</kbd> בכל עת כדי לראות רשימה זו
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }
}

// ============ Smart Search ============
class SmartSearchManager {
  constructor() {
    this.searchIndex = [];
    this.searchResults = [];
    console.log('🔍 SmartSearchManager: Initialized');
  }

  async buildSearchIndex() {
    console.log('🔍 buildSearchIndex: Building search index...');
    
    try {
      const homework = await storage.get('homework-list') || [];
      const subjects = await storage.get('homework-subjects') || [];
      const tags = await storage.get('homework-tags') || [];
      
      this.searchIndex = [];
      
      // הוספת משימות לאינדקס
      homework.forEach(hw => {
        const subject = subjects.find(s => s.id == hw.subject);
        const assignees = Array.isArray(hw.assignees) && Array.isArray(window.groupMembers)
          ? hw.assignees
              .map(id => window.groupMembers.find(member => member.id === id)?.name)
              .filter(Boolean)
          : [];
        
        this.searchIndex.push({
          type: 'homework',
          id: hw.id,
          title: hw.title,
          description: hw.description || '',
          subject: subject ? subject.name : '',
          assignees,
          tags: hw.tags || [],
          dueDate: hw.dueDate,
          completed: hw.completed,
          searchText: [
            hw.title,
            hw.description,
            subject ? subject.name : '',
            ...assignees,
            ...(hw.tags || [])
          ].join(' ').toLowerCase()
        });
      });
      
      // הוספת מקצועות לאינדקס
      subjects.forEach(s => {
        this.searchIndex.push({
          type: 'subject',
          id: s.id,
          name: s.name,
          color: s.color,
          searchText: s.name.toLowerCase()
        });
      });
      
      console.log('✅ buildSearchIndex: Index built with', this.searchIndex.length, 'items');
    } catch (error) {
      console.error('❌ buildSearchIndex: Error building index:', error);
    }
  }

  search(query) {
    console.log('🔍 search: Searching for:', query);
    
    if (!query || query.length < 2) {
      this.searchResults = [];
      return [];
    }

    const searchTerm = query.toLowerCase();
    
    this.searchResults = this.searchIndex.filter(item => {
      return item.searchText.includes(searchTerm);
    });
    
    // מיון לפי רלוונטיות
    this.searchResults.sort((a, b) => {
      const aStarts = a.searchText.startsWith(searchTerm);
      const bStarts = b.searchText.startsWith(searchTerm);
      
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      
      return 0;
    });
    
    console.log('✅ search: Found', this.searchResults.length, 'results');
    return this.searchResults;
  }

  openSearchPanel() {
    console.log('🔍 openSearchPanel: Opening search panel...');
    
    this.buildSearchIndex();
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'search-modal';
    
    modal.innerHTML = `
      <div class="modal-content search-modal-content">
        <div class="search-header">
          <input type="text" 
                 class="search-input" 
                 id="smart-search-input" 
                 placeholder="🔍 חפש משימות, מקצועות, תגיות..."
                 autofocus>
          <button class="close-modal-btn" onclick="document.getElementById('search-modal').remove()">
            <svg width="24" height="24"><use href="#x"></use></svg>
          </button>
        </div>
        <div class="search-results" id="search-results">
          <div class="search-placeholder">
            התחל להקליד לחיפוש...
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    const input = document.getElementById('smart-search-input');
    const resultsContainer = document.getElementById('search-results');
    
    input.addEventListener('input', (e) => {
      const query = e.target.value;
      const results = this.search(query);
      this.renderResults(results, resultsContainer);
    });
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
    
    input.focus();
  }

  renderResults(results, container) {
    if (results.length === 0) {
      container.innerHTML = '<div class="search-placeholder">לא נמצאו תוצאות</div>';
      return;
    }

    let html = `<div class="search-results-count">נמצאו ${results.length} תוצאות</div>`;
    
    results.forEach(result => {
      if (result.type === 'homework') {
        const statusIcon = result.completed ? '✅' : '⏳';
        const statusClass = result.completed ? 'completed' : 'pending';
        
        html += `
          <div class="search-result-item ${statusClass}" onclick="smartSearch.navigateToHomework(${result.id})">
            <div class="search-result-icon">${statusIcon}</div>
            <div class="search-result-content">
              <div class="search-result-title">${result.title}</div>
              <div class="search-result-meta">
                ${result.subject ? `<span class="search-meta-item">📚 ${result.subject}</span>` : ''}
                <span class="search-meta-item">📅 ${new Date(result.dueDate).toLocaleDateString('he-IL')}</span>
                ${result.tags.length > 0 ? `<span class="search-meta-item">🏷️ ${result.tags.join(', ')}</span>` : ''}
              </div>
            </div>
          </div>
        `;
      } else if (result.type === 'subject') {
        html += `
          <div class="search-result-item" onclick="smartSearch.navigateToSubject(${result.id})">
            <div class="search-result-icon" style="background: ${result.color};">📚</div>
            <div class="search-result-content">
              <div class="search-result-title">${result.name}</div>
              <div class="search-result-meta">
                <span class="search-meta-item">מקצוע</span>
              </div>
            </div>
          </div>
        `;
      }
    });
    
    container.innerHTML = html;
  }

  navigateToHomework(id) {
    console.log('🔍 navigateToHomework: Navigating to homework', id);
    
    document.getElementById('search-modal').remove();
    
    // גלילה למשימה
    const homeworkList = document.getElementById('homework-list');
    if (homeworkList) {
      homeworkList.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    notifications.showInAppNotification('גלילה למשימה...', 'info');
  }

  navigateToSubject(id) {
    console.log('🔍 navigateToSubject: Navigating to subject', id);
    
    document.getElementById('search-modal').remove();
    
    // גלילה למקצוע
    const subjectList = document.getElementById('subject-list');
    if (subjectList) {
      subjectList.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    notifications.showInAppNotification('גלילה למקצוע...', 'info');
  }
}

// ============ יצירת אובייקטים גלובליים ============
console.log('🎨 Creating global theme customizer...');
const themeCustomizer = new ThemeCustomizer();

console.log('⚡ Creating global quick actions manager...');
const quickActions = new QuickActionsManager();

console.log('🔍 Creating global smart search manager...');
const smartSearch = new SmartSearchManager();

console.log('✅ All utilities initialized');

// ============ אתחול ============
window.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 utilities.js: Initializing...');
  
  await themeCustomizer.loadTheme();
  await quickActions.loadSettings();
  quickActions.initializeListeners();
  await smartSearch.buildSearchIndex();
  
  console.log('✅ utilities.js: Initialized');
});
