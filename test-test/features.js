// =============== STUDY TIMER & POMODORO ===============
class StudyTimer {
  constructor() {
    this.duration = 25 * 60; // 25 minutes in seconds
    this.remainingTime = this.duration;
    this.isRunning = false;
    this.interval = null;
    this.mode = 'work'; // 'work' or 'break'
    this.sessionsCompleted = 0;
    console.log('⏱️ StudyTimer: Initialized');
  }

  start() {
    if (this.isRunning) return;
    
    console.log('▶️ StudyTimer: Starting timer...');
    this.isRunning = true;
    
    this.interval = setInterval(() => {
      this.remainingTime--;
      this.updateDisplay();
      
      if (this.remainingTime <= 0) {
        this.complete();
      }
    }, 1000);
    
    this.updateControls();
  }

  pause() {
    if (!this.isRunning) return;
    
    console.log('⏸️ StudyTimer: Pausing timer...');
    this.isRunning = false;
    clearInterval(this.interval);
    this.updateControls();
  }

  reset() {
    console.log('🔄 StudyTimer: Resetting timer...');
    this.pause();
    this.remainingTime = this.duration;
    this.updateDisplay();
  }

  complete() {
    console.log('✅ StudyTimer: Timer completed!');
    this.pause();
    
    if (this.mode === 'work') {
      this.sessionsCompleted++;
      notifications.sendNotification('⏱️ זמן הפסקה!', {
        body: 'סיימת סשן לימוד! קח הפסקה של 5 דקות.',
        requireInteraction: true
      });
      
      // Add achievement points
      if (typeof achievements !== 'undefined') {
        achievements.addPoints(10, 'השלמת סשן לימוד');
      }
      
      this.switchToBreak();
    } else {
      notifications.sendNotification('📚 חזרה ללימודים!', {
        body: 'ההפסקה הסתיימה. בהצלחה!',
        requireInteraction: true
      });
      this.switchToWork();
    }
    
    this.updateStats();
  }

  switchToWork() {
    this.mode = 'work';
    this.duration = 25 * 60;
    this.remainingTime = this.duration;
    this.updateDisplay();
    notifications.showInAppNotification('📚 מצב לימוד - 25 דקות', 'info');
  }

  switchToBreak() {
    this.mode = 'break';
    this.duration = 5 * 60;
    this.remainingTime = this.duration;
    this.updateDisplay();
    notifications.showInAppNotification('☕ מצב הפסקה - 5 דקות', 'success');
  }

  updateDisplay() {
    const minutes = Math.floor(this.remainingTime / 60);
    const seconds = this.remainingTime % 60;
    const display = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    const timerDisplay = document.getElementById('timer-display');
    if (timerDisplay) {
      timerDisplay.textContent = display;
    }
    
    // Update progress circle
    const progress = ((this.duration - this.remainingTime) / this.duration) * 100;
    const progressCircle = document.getElementById('timer-progress-circle');
    if (progressCircle) {
      const circumference = 2 * Math.PI * 45; // radius = 45
      const offset = circumference - (progress / 100) * circumference;
      progressCircle.style.strokeDashoffset = offset;
    }
  }

  updateControls() {
    const startBtn = document.getElementById('timer-start');
    const pauseBtn = document.getElementById('timer-pause');
    
    if (startBtn && pauseBtn) {
      if (this.isRunning) {
        startBtn.classList.add('hidden');
        pauseBtn.classList.remove('hidden');
      } else {
        startBtn.classList.remove('hidden');
        pauseBtn.classList.add('hidden');
      }
    }
  }

  async updateStats() {
    const stats = await storage.get('timer-stats') || {
      totalSessions: 0,
      totalMinutes: 0
    };
    
    stats.totalSessions = this.sessionsCompleted;
    stats.totalMinutes += 25;
    
    await storage.set('timer-stats', stats);
    
    const statsDisplay = document.getElementById('timer-stats');
    if (statsDisplay) {
      statsDisplay.innerHTML = `
        <div class="timer-stat">
          <div class="timer-stat-number">${stats.totalSessions}</div>
          <div class="timer-stat-label">סשנים היום</div>
        </div>
        <div class="timer-stat">
          <div class="timer-stat-number">${stats.totalMinutes}</div>
          <div class="timer-stat-label">דקות היום</div>
        </div>
      `;
    }
  }

  renderTimerUI() {
    const panel = document.createElement('div');
    panel.className = 'panel timer-panel';
    panel.innerHTML = `
      <h2>⏱️ טיימר לימוד</h2>
      <div class="timer-container">
        <svg class="timer-circle" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" class="timer-circle-bg"/>
          <circle cx="50" cy="50" r="45" class="timer-circle-progress" id="timer-progress-circle"
                  transform="rotate(-90 50 50)"/>
        </svg>
        <div class="timer-display" id="timer-display">25:00</div>
        <div class="timer-mode-label">${this.mode === 'work' ? '📚 לימוד' : '☕ הפסקה'}</div>
      </div>
      
      <div class="timer-controls">
        <button class="btn btn-success" id="timer-start" onclick="studyTimer.start()">
          <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
          התחל
        </button>
        <button class="btn btn-secondary hidden" id="timer-pause" onclick="studyTimer.pause()">
          <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="4" width="4" height="16"></rect>
            <rect x="14" y="4" width="4" height="16"></rect>
          </svg>
          השהה
        </button>
        <button class="btn btn-secondary" onclick="studyTimer.reset()">
          <svg width="20" height="20"><use href="#x"></use></svg>
          איפוס
        </button>
      </div>
      
      <div class="timer-mode-switch">
        <button class="mode-btn ${this.mode === 'work' ? 'active' : ''}" onclick="studyTimer.switchToWork()">
          📚 לימוד (25 דק')
        </button>
        <button class="mode-btn ${this.mode === 'break' ? 'active' : ''}" onclick="studyTimer.switchToBreak()">
          ☕ הפסקה (5 דק')
        </button>
      </div>
      
      <div class="timer-stats" id="timer-stats">
        <div class="timer-stat">
          <div class="timer-stat-number">0</div>
          <div class="timer-stat-label">סשנים היום</div>
        </div>
        <div class="timer-stat">
          <div class="timer-stat-number">0</div>
          <div class="timer-stat-label">דקות היום</div>
        </div>
      </div>
    `;
    
    return panel;
  }
}

// =============== ACHIEVEMENTS & GAMIFICATION ===============
class AchievementsSystem {
  constructor() {
    this.points = 0;
    this.level = 1;
    this.achievements = [];
    this.availableAchievements = [
      {
        id: 'first_task',
        name: 'צעדים ראשונים',
        description: 'השלמת את המשימה הראשונה',
        icon: '🎯',
        points: 10,
        condition: (stats) => stats.completedTasks >= 1
      },
      {
        id: 'task_master',
        name: 'מאסטר משימות',
        description: 'השלמת 10 משימות',
        icon: '🏆',
        points: 50,
        condition: (stats) => stats.completedTasks >= 10
      },
      {
        id: 'early_bird',
        name: 'ציפור מוקדמת',
        description: 'השלמת משימה לפני המועד',
        icon: '🌅',
        points: 20,
        condition: (stats) => stats.earlyCompletions >= 1
      },
      {
        id: 'streak_master',
        name: 'רצף מנצח',
        description: '7 ימים רצופים עם השלמת משימות',
        icon: '🔥',
        points: 100,
        condition: (stats) => stats.currentStreak >= 7
      },
      {
        id: 'study_marathon',
        name: 'מרתון לימודים',
        description: '10 סשני פומודורו ביום',
        icon: '⚡',
        points: 75,
        condition: (stats) => stats.pomodoroSessions >= 10
      },
      {
        id: 'organized',
        name: 'מאורגן/ת',
        description: 'יצרת 5 מקצועות',
        icon: '📚',
        points: 30,
        condition: (stats) => stats.subjectsCreated >= 5
      },
      {
        id: 'night_owl',
        name: 'ינשוף לילה',
        description: 'השלמת משימה אחרי 22:00',
        icon: '🦉',
        points: 25,
        condition: (stats) => stats.lateNightCompletions >= 1
      }
    ];
    console.log('🏆 AchievementsSystem: Initialized');
  }

  async load() {
    const data = await storage.get('achievements-data') || {
      points: 0,
      level: 1,
      achievements: []
    };
    
    this.points = data.points;
    this.level = data.level;
    this.achievements = data.achievements;
    
    console.log('🏆 AchievementsSystem: Loaded', { points: this.points, level: this.level });
  }

  async save() {
    await storage.set('achievements-data', {
      points: this.points,
      level: this.level,
      achievements: this.achievements
    });
  }

  async addPoints(points, reason) {
    console.log(`🏆 AchievementsSystem: Adding ${points} points for: ${reason}`);
    this.points += points;
    
    // Check for level up
    const newLevel = Math.floor(this.points / 100) + 1;
    if (newLevel > this.level) {
      this.level = newLevel;
      notifications.showInAppNotification(`🎉 עלית לרמה ${this.level}!`, 'success');
      await notifications.sendNotification(`🎉 רמה ${this.level}!`, {
        body: `כל הכבוד! עלית לרמה ${this.level}`,
        requireInteraction: true
      });
    }
    
    await this.save();
    this.updateDisplay();
    
    // Show points notification
    notifications.showInAppNotification(`+${points} נקודות - ${reason}`, 'success');
  }

  async checkAchievements(stats) {
    console.log('🏆 AchievementsSystem: Checking achievements...', stats);
    
    for (const achievement of this.availableAchievements) {
      if (this.achievements.includes(achievement.id)) continue;
      
      if (achievement.condition(stats)) {
        console.log(`🏆 AchievementsSystem: Unlocked ${achievement.name}!`);
        this.achievements.push(achievement.id);
        await this.addPoints(achievement.points, `הישג חדש: ${achievement.name}`);
        
        // Show achievement notification
        await this.showAchievementUnlock(achievement);
      }
    }
  }

  async showAchievementUnlock(achievement) {
    const modal = document.createElement('div');
    modal.className = 'achievement-unlock-modal';
    modal.innerHTML = `
      <div class="achievement-unlock-content">
        <div class="achievement-unlock-icon">${achievement.icon}</div>
        <h3>הישג חדש נפתח!</h3>
        <h2>${achievement.name}</h2>
        <p>${achievement.description}</p>
        <div class="achievement-points">+${achievement.points} נקודות</div>
        <button class="btn btn-primary" onclick="this.closest('.achievement-unlock-modal').remove()">
          מעולה!
        </button>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    await notifications.sendNotification(`🏆 ${achievement.name}`, {
      body: achievement.description,
      icon: achievement.icon
    });
    
    setTimeout(() => {
      if (document.body.contains(modal)) {
        modal.remove();
      }
    }, 10000);
  }

  updateDisplay() {
    const pointsDisplay = document.getElementById('achievements-points');
    const levelDisplay = document.getElementById('achievements-level');
    const progressBar = document.getElementById('achievements-progress');
    
    if (pointsDisplay) {
      pointsDisplay.textContent = this.points;
    }
    
    if (levelDisplay) {
      levelDisplay.textContent = this.level;
    }
    
    if (progressBar) {
      const pointsInLevel = this.points % 100;
      progressBar.style.width = `${pointsInLevel}%`;
    }
  }

  renderAchievementsPanel() {
    const pointsInLevel = this.points % 100;
    const nextLevelPoints = 100;
    
    return `
      <div class="panel achievements-panel">
        <h2>🏆 הישגים ורמה</h2>
        
        <div class="level-display">
          <div class="level-badge">
            <div class="level-number" id="achievements-level">${this.level}</div>
            <div class="level-label">רמה</div>
          </div>
          <div class="points-display">
            <div class="points-number" id="achievements-points">${this.points}</div>
            <div class="points-label">נקודות</div>
          </div>
        </div>
        
        <div class="level-progress">
          <div class="level-progress-bar" id="achievements-progress" style="width: ${pointsInLevel}%"></div>
          <div class="level-progress-label">${pointsInLevel} / ${nextLevelPoints} לרמה הבאה</div>
        </div>
        
        <div class="achievements-grid">
          ${this.availableAchievements.map(achievement => {
            const unlocked = this.achievements.includes(achievement.id);
            return `
              <div class="achievement-card ${unlocked ? 'unlocked' : 'locked'}">
                <div class="achievement-icon">${unlocked ? achievement.icon : '🔒'}</div>
                <div class="achievement-name">${achievement.name}</div>
                <div class="achievement-desc">${achievement.description}</div>
                <div class="achievement-points">${achievement.points} נקודות</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }
}

// =============== QUICK ACTIONS & KEYBOARD SHORTCUTS ===============
class QuickActions {
  constructor() {
    this.shortcuts = {
      'n': () => this.newTask(),
      's': () => this.newSubject(),
      'f': () => this.focusSearch(),
      't': () => this.toggleTimer(),
      'a': () => this.showAchievements(),
      '/': () => this.showShortcuts()
    };
    console.log('⚡ QuickActions: Initialized');
  }

  init() {
    document.addEventListener('keydown', (e) => {
      // Only trigger if not in input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      const key = e.key.toLowerCase();
      if (this.shortcuts[key]) {
        e.preventDefault();
        this.shortcuts[key]();
      }
    });
    
    console.log('⚡ QuickActions: Keyboard shortcuts enabled');
  }

  newTask() {
    console.log('⚡ QuickActions: New task shortcut');
    const titleInput = document.getElementById('hw-title');
    if (titleInput) {
      titleInput.focus();
      titleInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  newSubject() {
    console.log('⚡ QuickActions: New subject shortcut');
    const showBtn = document.getElementById('show-add-subject');
    if (showBtn && !showBtn.classList.contains('hidden')) {
      showBtn.click();
    }
    const nameInput = document.getElementById('subject-name');
    if (nameInput) {
      nameInput.focus();
    }
  }

  focusSearch() {
    console.log('⚡ QuickActions: Focus search shortcut');
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
    }
  }

  toggleTimer() {
    console.log('⚡ QuickActions: Toggle timer shortcut');
    if (typeof studyTimer !== 'undefined') {
      if (studyTimer.isRunning) {
        studyTimer.pause();
      } else {
        studyTimer.start();
      }
    }
  }

  showAchievements() {
    console.log('⚡ QuickActions: Show achievements shortcut');
    const achievementsPanel = document.querySelector('.achievements-panel');
    if (achievementsPanel) {
      achievementsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  showShortcuts() {
    console.log('⚡ QuickActions: Show shortcuts modal');
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content shortcuts-modal">
        <div class="modal-header">
          <h2>⌨️ קיצורי מקלדת</h2>
          <button class="close-modal-btn" onclick="this.closest('.modal').remove()">
            <svg width="24" height="24"><use href="#x"></use></svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="shortcuts-list">
            <div class="shortcut-item">
              <kbd>N</kbd>
              <span>משימה חדשה</span>
            </div>
            <div class="shortcut-item">
              <kbd>S</kbd>
              <span>מקצוע חדש</span>
            </div>
            <div class="shortcut-item">
              <kbd>F</kbd>
              <span>חיפוש</span>
            </div>
            <div class="shortcut-item">
              <kbd>T</kbd>
              <span>הפעל/עצור טיימר</span>
            </div>
            <div class="shortcut-item">
              <kbd>A</kbd>
              <span>הישגים</span>
            </div>
            <div class="shortcut-item">
              <kbd>/</kbd>
              <span>הצג קיצורים</span>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  renderQuickActionsButton() {
    return `
      <button class="quick-actions-btn" onclick="quickActions.showShortcuts()" title="קיצורי מקלדת (/)">
        <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <rect x="2" y="4" width="20" height="16" rx="2"/>
          <path d="M6 8h.01M10 8h.01M14 8h.01M6 12h.01M10 12h.01M14 12h.01M6 16h.01M10 16h.01M14 16h.01M18 8v8"/>
        </svg>
      </button>
    `;
  }
}

// =============== SMART SEARCH ===============
class SmartSearch {
  constructor() {
    this.searchTerm = '';
    console.log('🔍 SmartSearch: Initialized');
  }

  search(term) {
    this.searchTerm = term.toLowerCase().trim();
    console.log('🔍 SmartSearch: Searching for:', this.searchTerm);
    
    if (!this.searchTerm) {
      render();
      return;
    }
    
    const results = homework.filter(hw => {
      const subject = subjects.find(s => s.id == hw.subject);
      const subjectName = subject ? subject.name.toLowerCase() : '';
      
      return hw.title.toLowerCase().includes(this.searchTerm) ||
             (hw.description && hw.description.toLowerCase().includes(this.searchTerm)) ||
             subjectName.includes(this.searchTerm) ||
             (hw.tags && hw.tags.some(tag => tag.toLowerCase().includes(this.searchTerm)));
    });
    
    console.log('🔍 SmartSearch: Found', results.length, 'results');
    
    // Temporarily replace homework list with search results
    const originalHomework = [...homework];
    homework = results;
    renderHomework();
    homework = originalHomework;
    
    // Show search info
    const homeworkList = document.getElementById('homework-list');
    if (homeworkList && results.length > 0) {
      const searchInfo = document.createElement('div');
      searchInfo.className = 'search-info';
      searchInfo.innerHTML = `
        <div class="search-results-header">
          🔍 נמצאו ${results.length} תוצאות עבור "${this.searchTerm}"
          <button class="btn btn-secondary" onclick="smartSearch.clear()" style="padding: 0.25rem 0.75rem; width: auto; font-size: 0.875rem;">
            נקה חיפוש
          </button>
        </div>
      `;
      homeworkList.insertBefore(searchInfo, homeworkList.firstChild);
    } else if (results.length === 0) {
      homeworkList.innerHTML = `
        <div class="empty-state">
          <svg width="64" height="64" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <p>לא נמצאו תוצאות עבור "${this.searchTerm}"</p>
          <button class="btn btn-primary" onclick="smartSearch.clear()">נקה חיפוש</button>
        </div>
      `;
    }
  }

  clear() {
    console.log('🔍 SmartSearch: Clearing search');
    this.searchTerm = '';
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.value = '';
    }
    render();
  }

  renderSearchBar() {
    return `
      <div class="search-bar">
        <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        <input 
          type="text" 
          class="search-input" 
          id="search-input" 
          placeholder="חפש משימות, מקצועות או תגיות... (F)"
          oninput="smartSearch.search(this.value)"
        >
        <button class="search-clear-btn hidden" id="search-clear-btn" onclick="smartSearch.clear()">
          <svg width="20" height="20"><use href="#x"></use></svg>
        </button>
      </div>
    `;
  }
}

// Initialize global instances
console.log('🚀 features.js: Creating global instances...');
const studyTimer = new StudyTimer();
const achievements = new AchievementsSystem();
const quickActions = new QuickActions();
const smartSearch = new SmartSearch();
console.log('✅ features.js: Global instances created');
