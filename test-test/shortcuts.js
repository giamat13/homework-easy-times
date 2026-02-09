// Keyboard Shortcuts & Quick Actions - קיצורי דרך ופעולות מהירות
class ShortcutsManager {
  constructor() {
    this.shortcuts = {
      'ctrl+n': () => this.quickAddHomework(),
      'ctrl+f': () => searchManager.openSearchPanel(),
      'ctrl+k': () => this.openCommandPalette(),
      'ctrl+,': () => openSettings(),
      'ctrl+t': () => pomodoro.openPomodoroPanel(),
      'ctrl+a': () => analytics.openDashboard(),
      'ctrl+g': () => gamification.openAchievementsPanel()
    };
    this.registerShortcuts();
    console.log('⚡ ShortcutsManager: Initialized');
  }

  registerShortcuts() {
    document.addEventListener('keydown', (e) => {
      const key = `${e.ctrlKey ? 'ctrl+' : ''}${e.shiftKey ? 'shift+' : ''}${e.key.toLowerCase()}`;
      
      if (this.shortcuts[key]) {
        e.preventDefault();
        this.shortcuts[key]();
      }
    });
  }

  quickAddHomework() {
    const modal = document.createElement('div');
    modal.className = 'modal quick-add-modal';
    modal.id = 'quick-add-modal';
    
    modal.innerHTML = `
      <div class="modal-content quick-add-content">
        <div class="modal-header">
          <h2>⚡ הוסף משימה מהר</h2>
          <button class="close-modal-btn" onclick="shortcuts.closeQuickAdd()">
            <svg width="24" height="24"><use href="#x"></use></svg>
          </button>
        </div>
        
        <div class="modal-body">
          <form id="quick-add-form" onsubmit="shortcuts.submitQuickAdd(event)">
            <input type="text" class="input" id="qa-title" placeholder="כותרת (חובה)" required autofocus>
            <select class="select" id="qa-subject" required>
              <option value="">בחר מקצוע</option>
              ${subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
            </select>
            <input type="date" class="input" id="qa-date" required>
            <button type="submit" class="btn btn-primary">➕ הוסף</button>
          </form>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    document.getElementById('qa-title').focus();
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.closeQuickAdd();
    });
  }

  submitQuickAdd(e) {
    e.preventDefault();
    
    const newHomework = {
      id: Date.now(),
      subject: document.getElementById('qa-subject').value,
      title: document.getElementById('qa-title').value,
      description: '',
      dueDate: document.getElementById('qa-date').value,
      priority: 'medium',
      completed: false,
      files: [],
      tags: [],
      notified: false,
      todayNotified: false
    };
    
    homework.push(newHomework);
    saveData();
    render();
    
    this.closeQuickAdd();
    notifications.showInAppNotification(`✅ "${newHomework.title}" נוספה`, 'success');
  }

  closeQuickAdd() {
    const modal = document.getElementById('quick-add-modal');
    if (modal) modal.remove();
  }

  openCommandPalette() {
    const modal = document.createElement('div');
    modal.className = 'modal command-palette-modal';
    modal.id = 'command-palette';
    
    const commands = [
      { icon: '📝', name: 'הוסף משימה חדשה', action: () => this.quickAddHomework(), shortcut: 'Ctrl+N' },
      { icon: '🔍', name: 'חיפוש', action: () => searchManager.openSearchPanel(), shortcut: 'Ctrl+F' },
      { icon: '⏱️', name: 'טיימר פומודורו', action: () => pomodoro.openPomodoroPanel(), shortcut: 'Ctrl+T' },
      { icon: '📊', name: 'דשבורד אנליטיקה', action: () => analytics.openDashboard(), shortcut: 'Ctrl+A' },
      { icon: '🏆', name: 'הישגים', action: () => gamification.openAchievementsPanel(), shortcut: 'Ctrl+G' },
      { icon: '⚙️', name: 'הגדרות', action: () => openSettings(), shortcut: 'Ctrl+,' },
      { icon: '🎨', name: 'עיצוב אישי', action: () => themeManager.openThemeCustomizer(), shortcut: '' },
      { icon: '🌙', name: 'מצב לילה', action: () => toggleDarkMode(), shortcut: '' },
      { icon: '📅', name: 'החלף תצוגה', action: () => toggleViewMode(), shortcut: '' },
      { icon: '💾', name: 'ייצא נתונים', action: () => exportData(), shortcut: '' }
    ];
    
    modal.innerHTML = `
      <div class="modal-content command-palette-content">
        <div class="command-search">
          <input type="text" class="input" id="command-search" placeholder="הקלד פקודה..." autofocus
                 oninput="shortcuts.filterCommands(this.value)">
        </div>
        
        <div class="commands-list" id="commands-list">
          ${commands.map((cmd, i) => `
            <div class="command-item" data-index="${i}" onclick="shortcuts.executeCommand(${i})">
              <span class="command-icon">${cmd.icon}</span>
              <span class="command-name">${cmd.name}</span>
              ${cmd.shortcut ? `<span class="command-shortcut">${cmd.shortcut}</span>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    this.commands = commands;
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.closeCommandPalette();
    });
    
    document.getElementById('command-search').addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeCommandPalette();
    });
  }

  filterCommands(query) {
    const items = document.querySelectorAll('.command-item');
    query = query.toLowerCase();
    
    items.forEach(item => {
      const name = item.querySelector('.command-name').textContent.toLowerCase();
      item.style.display = name.includes(query) ? 'flex' : 'none';
    });
  }

  executeCommand(index) {
    this.closeCommandPalette();
    if (this.commands[index]) {
      setTimeout(() => this.commands[index].action(), 100);
    }
  }

  closeCommandPalette() {
    const modal = document.getElementById('command-palette');
    if (modal) modal.remove();
  }

  showShortcutsHelp() {
    const modal = document.createElement('div');
    modal.className = 'modal shortcuts-help-modal';
    
    modal.innerHTML = `
      <div class="modal-content shortcuts-help-content">
        <div class="modal-header">
          <h2>⌨️ קיצורי מקלדת</h2>
          <button class="close-modal-btn" onclick="this.closest('.modal').remove()">
            <svg width="24" height="24"><use href="#x"></use></svg>
          </button>
        </div>
        
        <div class="modal-body">
          <div class="shortcuts-grid">
            <div class="shortcut-item">
              <kbd>Ctrl</kbd> + <kbd>N</kbd>
              <span>הוסף משימה מהר</span>
            </div>
            <div class="shortcut-item">
              <kbd>Ctrl</kbd> + <kbd>F</kbd>
              <span>חיפוש</span>
            </div>
            <div class="shortcut-item">
              <kbd>Ctrl</kbd> + <kbd>K</kbd>
              <span>פלטת פקודות</span>
            </div>
            <div class="shortcut-item">
              <kbd>Ctrl</kbd> + <kbd>T</kbd>
              <span>טיימר פומודורו</span>
            </div>
            <div class="shortcut-item">
              <kbd>Ctrl</kbd> + <kbd>A</kbd>
              <span>דשבורד אנליטיקה</span>
            </div>
            <div class="shortcut-item">
              <kbd>Ctrl</kbd> + <kbd>G</kbd>
              <span>הישגים</span>
            </div>
            <div class="shortcut-item">
              <kbd>Ctrl</kbd> + <kbd>,</kbd>
              <span>הגדרות</span>
            </div>
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

console.log('⚡ Creating shortcuts manager...');
const shortcuts = new ShortcutsManager();
console.log('✅ Shortcuts manager created');
