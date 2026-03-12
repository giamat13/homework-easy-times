// Smart Search & Quick Actions - חיפוש חכם ופעולות מהירות
class SearchManager {
  constructor() {
    this.searchResults = [];
    this.currentSearchTerm = '';
    this.searchHistory = [];
    console.log('🔍 SearchManager: Initialized');
  }

  // חיפוש חכם
  search(query, homework, subjects, tags) {
    console.log('🔍 SearchManager: Searching for:', query);
    
    if (!query || query.trim().length === 0) {
      this.searchResults = [];
      return [];
    }

    const searchTerm = query.trim().toLowerCase();
    this.currentSearchTerm = searchTerm;

    // שמירת היסטוריית חיפוש
    if (!this.searchHistory.includes(searchTerm)) {
      this.searchHistory.unshift(searchTerm);
      if (this.searchHistory.length > 10) {
        this.searchHistory = this.searchHistory.slice(0, 10);
      }
    }

    const results = homework.filter(hw => {
      const subject = subjects.find(s => s.id == hw.subject);
      const subjectName = subject ? subject.name.toLowerCase() : '';
      
      // חיפוש בכותרת
      if (hw.title.toLowerCase().includes(searchTerm)) return true;
      
      // חיפוש בתיאור
      if (hw.description && hw.description.toLowerCase().includes(searchTerm)) return true;
      
      // חיפוש במקצוע
      if (subjectName.includes(searchTerm)) return true;
      
      // חיפוש בתגיות
      if (hw.tags && hw.tags.some(tag => tag.toLowerCase().includes(searchTerm))) return true;
      
      // חיפוש לפי תאריך
      if (hw.dueDate.includes(searchTerm)) return true;
      
      // חיפוש לפי סטטוס
      if (searchTerm === 'הושלם' || searchTerm === 'completed') {
        return hw.completed;
      }
      if (searchTerm === 'ממתין' || searchTerm === 'pending') {
        return !hw.completed;
      }
      if (searchTerm === 'דחוף' || searchTerm === 'urgent') {
        return !hw.completed && getDaysUntilDue(hw.dueDate) <= 2 && getDaysUntilDue(hw.dueDate) >= 0;
      }
      if (searchTerm === 'איחור' || searchTerm === 'overdue') {
        return !hw.completed && getDaysUntilDue(hw.dueDate) < 0;
      }
      
      return false;
    });

    this.searchResults = results;
    console.log('✅ SearchManager: Found', results.length, 'results');
    return results;
  }

  // הצגת תוצאות חיפוש
  renderSearchResults(results, subjects) {
    console.log('🎨 SearchManager: Rendering', results.length, 'results');
    
    if (results.length === 0) {
      return `
        <div class="search-no-results">
          <div class="no-results-icon">🔍</div>
          <div class="no-results-text">לא נמצאו תוצאות עבור "${this.currentSearchTerm}"</div>
          <div class="search-suggestions">
            <p>נסה:</p>
            <ul>
              <li>לבדוק את האיות</li>
              <li>להשתמש במילים כלליות יותר</li>
              <li>לחפש לפי מקצוע או תגית</li>
            </ul>
          </div>
        </div>
      `;
    }

    let html = `
      <div class="search-results-header">
        <h3>🔍 תוצאות חיפוש: ${results.length} נמצאו</h3>
        <button class="btn btn-secondary" onclick="searchManager.clearSearch()">
          נקה חיפוש
        </button>
      </div>
      <div class="search-results-list">
    `;

    results.forEach(hw => {
      const subject = subjects.find(s => s.id == hw.subject);
      const daysLeft = getDaysUntilDue(hw.dueDate);
      const isUrgent = daysLeft <= 2 && !hw.completed;
      const isOverdue = daysLeft < 0 && !hw.completed;

      let classes = 'homework-item';
      if (hw.completed) classes += ' completed';
      if (isOverdue) classes += ' overdue';
      else if (isUrgent) classes += ' urgent';

      // הדגשת טקסט החיפוש
      const highlightedTitle = this.highlightText(hw.title, this.currentSearchTerm);
      const highlightedDesc = hw.description ? this.highlightText(hw.description, this.currentSearchTerm) : '';

      html += `
        <div class="${classes}">
          <div class="homework-header">
            <input type="checkbox" class="checkbox" ${hw.completed ? 'checked' : ''} 
                   onchange="toggleComplete(${hw.id})">
            <div class="homework-content">
              <div class="homework-badges">
                ${subject ? `<span class="badge" style="background-color: ${subject.color};">${subject.name}</span>` : ''}
                ${isOverdue ? '<span class="badge" style="background-color: #ef4444;">איחור!</span>' : ''}
                ${isUrgent && !isOverdue ? '<span class="badge" style="background-color: #f59e0b;">דחוף</span>' : ''}
              </div>
              <h3 class="homework-title ${hw.completed ? 'completed' : ''}">${highlightedTitle}</h3>
              ${highlightedDesc ? `<p class="homework-desc">${highlightedDesc}</p>` : ''}
              <div class="homework-meta">
                <span>
                  <svg width="16" height="16" style="display: inline; vertical-align: middle;"><use href="#calendar"></use></svg>
                  ${new Date(hw.dueDate).toLocaleDateString('he-IL')}
                </span>
              </div>
            </div>
            <button class="icon-btn" onclick="deleteHomework(${hw.id})">
              <svg width="20" height="20"><use href="#trash"></use></svg>
            </button>
          </div>
        </div>
      `;
    });

    html += '</div>';
    return html;
  }

  // הדגשת טקסט
  highlightText(text, search) {
    if (!search) return text;
    const regex = new RegExp(`(${search})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  // ניקוי חיפוש
  clearSearch() {
    console.log('🗑️ SearchManager: Clearing search');
    this.searchResults = [];
    this.currentSearchTerm = '';
    const searchInput = document.getElementById('smart-search-input');
    if (searchInput) searchInput.value = '';
    render();
  }

  // רינדור ממשק חיפוש
  renderSearchInterface() {
    return `
      <div class="search-container">
        <div class="search-input-wrapper">
          <svg width="20" height="20" class="search-icon"><use href="#search"></use></svg>
          <input type="text" 
                 class="search-input" 
                 id="smart-search-input"
                 placeholder="חפש משימות... (Ctrl+K)"
                 onkeyup="searchManager.handleSearch(event)">
          <button class="search-clear-btn hidden" id="search-clear-btn" onclick="searchManager.clearSearch()">
            <svg width="16" height="16"><use href="#x"></use></svg>
          </button>
        </div>
        ${this.searchHistory.length > 0 ? `
          <div class="search-history">
            <span class="search-history-label">חיפושים אחרונים:</span>
            ${this.searchHistory.map(term => `
              <button class="search-history-item" onclick="searchManager.selectHistoryItem('${term}')">
                ${term}
              </button>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  // טיפול בחיפוש
  handleSearch(event) {
    const query = event.target.value;
    const clearBtn = document.getElementById('search-clear-btn');
    
    if (clearBtn) {
      clearBtn.classList.toggle('hidden', query.length === 0);
    }

    if (query.length >= 2) {
      const results = this.search(query, homework, subjects, availableTags);
      this.displayResults(results);
    } else if (query.length === 0) {
      this.clearSearch();
    }
  }

  // הצגת תוצאות
  displayResults(results) {
    const resultsContainer = document.getElementById('search-results-container');
    if (resultsContainer) {
      resultsContainer.innerHTML = this.renderSearchResults(results, subjects);
      resultsContainer.classList.remove('hidden');
    }
  }

  // בחירת פריט מהיסטוריה
  selectHistoryItem(term) {
    const searchInput = document.getElementById('smart-search-input');
    if (searchInput) {
      searchInput.value = term;
      searchInput.dispatchEvent(new Event('keyup'));
    }
  }
}

// Quick Actions - קיצורי דרך מקלדת
class QuickActionsManager {
  constructor() {
    this.shortcuts = {
      'ctrl+k': () => this.focusSearch(),
      'ctrl+n': () => this.newTask(),
      'ctrl+s': () => this.saveAll(),
      'ctrl+shift+a': () => this.openAchievements(),
      'ctrl+shift+t': () => this.openTimer(),
      'ctrl+shift+s': () => this.openStats(),
      'ctrl+shift+d': () => toggleDarkMode(),
      'esc': () => this.closeModals()
    };
    
    this.commandPalette = null;
    console.log('⚡ QuickActionsManager: Initialized');
  }

  // אתחול
  initialize() {
    console.log('⚡ QuickActionsManager: Setting up keyboard shortcuts...');
    
    document.addEventListener('keydown', (e) => {
      const key = this.getKeyString(e);
      
      // בדיקה אם אנחנו בתוך שדה קלט (למעט Ctrl+K ו-Esc)
      const isInputField = ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName);
      if (isInputField && key !== 'ctrl+k' && key !== 'esc') {
        return;
      }

      if (this.shortcuts[key]) {
        e.preventDefault();
        this.shortcuts[key]();
      }

      // פתיחת Command Palette עם Ctrl+Shift+P
      if (key === 'ctrl+shift+p') {
        e.preventDefault();
        this.openCommandPalette();
      }
    });

    console.log('✅ QuickActionsManager: Shortcuts initialized');
  }

  // קבלת מחרוזת מקש
  getKeyString(event) {
    const parts = [];
    if (event.ctrlKey) parts.push('ctrl');
    if (event.shiftKey) parts.push('shift');
    if (event.altKey) parts.push('alt');
    parts.push(event.key.toLowerCase());
    return parts.join('+');
  }

  // פוקוס על חיפוש
  focusSearch() {
    console.log('🔍 QuickActionsManager: Focusing search');
    const searchInput = document.getElementById('smart-search-input');
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
    }
  }

  // משימה חדשה
  newTask() {
    console.log('➕ QuickActionsManager: Creating new task');
    const titleInput = document.getElementById('hw-title');
    if (titleInput) {
      titleInput.focus();
      window.scrollTo({ top: titleInput.offsetTop - 100, behavior: 'smooth' });
    }
  }

  // שמירה
  async saveAll() {
    console.log('💾 QuickActionsManager: Saving all data');
    await saveData();
    notifications.showInAppNotification('✅ הנתונים נשמרו', 'success');
  }

  // פתיחת הישגים
  openAchievements() {
    console.log('🏆 QuickActionsManager: Opening achievements');
    this.openModal('achievements');
  }

  // פתיחת טיימר
  openTimer() {
    console.log('⏱️ QuickActionsManager: Opening timer');
    this.openModal('timer');
  }

  // פתיחת סטטיסטיקות
  openStats() {
    console.log('📊 QuickActionsManager: Opening stats');
    this.openModal('analytics');
  }

  // סגירת מודלים
  closeModals() {
    console.log('🚪 QuickActionsManager: Closing modals');
    const modals = document.querySelectorAll('.modal:not(.hidden)');
    modals.forEach(modal => modal.classList.add('hidden'));
    
    if (this.commandPalette) {
      document.body.removeChild(this.commandPalette);
      this.commandPalette = null;
    }
  }

  // פתיחת מודל
  openModal(type) {
    let content = '';
    let title = '';

    switch (type) {
      case 'achievements':
        title = '🏆 הישגים';
        content = achievementsManager.renderAchievementsPage();
        break;
      case 'timer':
        title = '⏱️ טיימר לימוד';
        content = studyTimer.renderTimerInterface();
        break;
      case 'analytics':
        title = '📊 אנליטיקה מתקדמת';
        content = analyticsManager.renderAnalyticsDashboard(homework, subjects);
        setTimeout(() => {
          analyticsManager.createAnalyticsCharts(homework, subjects);
        }, 100);
        break;
    }

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 900px;">
        <div class="modal-header">
          <h2>${title}</h2>
          <button class="close-modal-btn" onclick="quickActions.closeModals()">
            <svg width="24" height="24"><use href="#x"></use></svg>
          </button>
        </div>
        <div class="modal-body">
          ${content}
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.closeModals();
      }
    });
  }

  // פתיחת Command Palette
  openCommandPalette() {
    console.log('⚡ QuickActionsManager: Opening command palette');
    
    if (this.commandPalette) {
      this.commandPalette.remove();
    }

    const commands = [
      { name: 'חיפוש משימות', icon: '🔍', action: () => this.focusSearch(), shortcut: 'Ctrl+K' },
      { name: 'משימה חדשה', icon: '➕', action: () => this.newTask(), shortcut: 'Ctrl+N' },
      { name: 'הישגים', icon: '🏆', action: () => this.openAchievements(), shortcut: 'Ctrl+Shift+A' },
      { name: 'טיימר לימוד', icon: '⏱️', action: () => this.openTimer(), shortcut: 'Ctrl+Shift+T' },
      { name: 'אנליטיקה', icon: '📊', action: () => this.openStats(), shortcut: 'Ctrl+Shift+S' },
      { name: 'מצב לילה', icon: '🌙', action: () => toggleDarkMode(), shortcut: 'Ctrl+Shift+D' },
      { name: 'הגדרות', icon: '⚙️', action: () => openSettings(), shortcut: '' },
      { name: 'ייצוא נתונים', icon: '📤', action: () => exportData(), shortcut: '' },
      { name: 'שמור הכל', icon: '💾', action: () => this.saveAll(), shortcut: 'Ctrl+S' }
    ];

    const palette = document.createElement('div');
    palette.className = 'command-palette';
    palette.innerHTML = `
      <div class="command-palette-content">
        <div class="command-palette-header">
          <input type="text" 
                 class="command-palette-input" 
                 placeholder="חפש פקודה..."
                 id="command-search">
        </div>
        <div class="command-palette-list" id="command-list">
          ${commands.map((cmd, index) => `
            <div class="command-item" data-index="${index}">
              <span class="command-icon">${cmd.icon}</span>
              <span class="command-name">${cmd.name}</span>
              ${cmd.shortcut ? `<span class="command-shortcut">${cmd.shortcut}</span>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;

    document.body.appendChild(palette);
    this.commandPalette = palette;

    // פוקוס על שדה החיפוש
    const input = palette.querySelector('#command-search');
    input.focus();

    // טיפול בלחיצות
    palette.querySelectorAll('.command-item').forEach((item, index) => {
      item.addEventListener('click', () => {
        commands[index].action();
        this.closeModals();
      });
    });

    // טיפול בסגירה
    palette.addEventListener('click', (e) => {
      if (e.target === palette) {
        this.closeModals();
      }
    });

    // חיפוש בפקודות
    input.addEventListener('input', (e) => {
      const search = e.target.value.toLowerCase();
      palette.querySelectorAll('.command-item').forEach((item, index) => {
        const command = commands[index];
        const matches = command.name.toLowerCase().includes(search);
        item.style.display = matches ? 'flex' : 'none';
      });
    });
  }

  // רינדור מדריך קיצורי דרך
  renderShortcutsGuide() {
    return `
      <div class="shortcuts-guide">
        <h3>⌨️ קיצורי מקלדת</h3>
        <div class="shortcuts-list">
          <div class="shortcut-item">
            <kbd>Ctrl</kbd> + <kbd>K</kbd>
            <span>חיפוש משימות</span>
          </div>
          <div class="shortcut-item">
            <kbd>Ctrl</kbd> + <kbd>N</kbd>
            <span>משימה חדשה</span>
          </div>
          <div class="shortcut-item">
            <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd>
            <span>פתיחת לוח פקודות</span>
          </div>
          <div class="shortcut-item">
            <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>A</kbd>
            <span>הישגים</span>
          </div>
          <div class="shortcut-item">
            <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>T</kbd>
            <span>טיימר לימוד</span>
          </div>
          <div class="shortcut-item">
            <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd>
            <span>סטטיסטיקות</span>
          </div>
          <div class="shortcut-item">
            <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>D</kbd>
            <span>מצב לילה</span>
          </div>
          <div class="shortcut-item">
            <kbd>Ctrl</kbd> + <kbd>S</kbd>
            <span>שמור הכל</span>
          </div>
          <div class="shortcut-item">
            <kbd>Esc</kbd>
            <span>סגור חלונות</span>
          </div>
        </div>
      </div>
    `;
  }
}

// יצירת אובייקטים גלובליים
console.log('🔍 Creating global search manager...');
const searchManager = new SearchManager();
console.log('✅ Global search manager created');

console.log('⚡ Creating global quick actions manager...');
const quickActions = new QuickActionsManager();
console.log('✅ Global quick actions manager created');
