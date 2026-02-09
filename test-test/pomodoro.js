// Pomodoro Timer Manager - מנהל טיימר פומודורו ללימוד
class PomodoroManager {
  constructor() {
    this.isRunning = false;
    this.isPaused = false;
    this.currentMode = 'work'; // work, break, longBreak
    this.timeLeft = 25 * 60; // 25 minutes default
    this.sessions = 0;
    this.interval = null;
    this.settings = {
      workTime: 25,
      shortBreak: 5,
      longBreak: 15,
      sessionsUntilLongBreak: 4,
      autoStart: false,
      soundEnabled: true
    };
    console.log('⏱️ PomodoroManager: Initialized');
  }

  // פתיחת חלון הפומודורו
  openPomodoroPanel() {
    const modal = document.createElement('div');
    modal.className = 'modal pomodoro-modal';
    modal.id = 'pomodoro-modal';
    
    modal.innerHTML = `
      <div class="modal-content pomodoro-content">
        <div class="modal-header">
          <h2>⏱️ טיימר פומודורו ללימוד</h2>
          <button class="close-modal-btn" onclick="pomodoro.closePomodoroPanel()">
            <svg width="24" height="24"><use href="#x"></use></svg>
          </button>
        </div>
        
        <div class="modal-body pomodoro-body">
          <!-- סטטוס ומצב -->
          <div class="pomodoro-status">
            <div class="mode-indicator">
              <span class="mode-badge ${this.currentMode}">${this.getModeName()}</span>
              <span class="sessions-count">סבב ${this.sessions + 1}</span>
            </div>
          </div>

          <!-- טיימר -->
          <div class="pomodoro-timer">
            <div class="timer-circle">
              <svg class="timer-svg" viewBox="0 0 200 200">
                <circle class="timer-bg" cx="100" cy="100" r="90"></circle>
                <circle class="timer-progress" cx="100" cy="100" r="90" 
                        style="stroke-dasharray: ${this.getCircumference()}; 
                               stroke-dashoffset: ${this.getProgress()}"></circle>
              </svg>
              <div class="timer-display">
                <span class="timer-time" id="pomodoro-time">${this.formatTime()}</span>
                <span class="timer-label">${this.currentMode === 'work' ? 'זמן עבודה' : 'זמן הפסקה'}</span>
              </div>
            </div>
          </div>

          <!-- כפתורי שליטה -->
          <div class="pomodoro-controls">
            <button class="btn btn-primary pomodoro-btn" id="pomodoro-start" onclick="pomodoro.toggleTimer()">
              ${this.isRunning ? (this.isPaused ? '▶️ המשך' : '⏸️ השהה') : '▶️ התחל'}
            </button>
            <button class="btn btn-secondary pomodoro-btn" onclick="pomodoro.resetTimer()">
              🔄 אתחל
            </button>
            <button class="btn btn-secondary pomodoro-btn" onclick="pomodoro.skipSession()">
              ⏭️ דלג
            </button>
          </div>

          <!-- סטטיסטיקות -->
          <div class="pomodoro-stats">
            <div class="stat-item">
              <span class="stat-icon">✅</span>
              <span class="stat-value">${this.getTodayCompletedSessions()}</span>
              <span class="stat-label">סבבים היום</span>
            </div>
            <div class="stat-item">
              <span class="stat-icon">⏱️</span>
              <span class="stat-value">${this.getTodayFocusTime()}</span>
              <span class="stat-label">דקות ריכוז</span>
            </div>
            <div class="stat-item">
              <span class="stat-icon">🔥</span>
              <span class="stat-value">${this.getStreak()}</span>
              <span class="stat-label">רצף ימים</span>
            </div>
          </div>

          <!-- הגדרות מהירות -->
          <div class="pomodoro-settings-quick">
            <h3>⚙️ הגדרות מהירות</h3>
            <div class="settings-grid">
              <div class="setting-item">
                <label>זמן עבודה (דקות)</label>
                <input type="number" class="input" value="${this.settings.workTime}" 
                       onchange="pomodoro.updateSetting('workTime', this.value)" min="1" max="60">
              </div>
              <div class="setting-item">
                <label>הפסקה קצרה (דקות)</label>
                <input type="number" class="input" value="${this.settings.shortBreak}" 
                       onchange="pomodoro.updateSetting('shortBreak', this.value)" min="1" max="30">
              </div>
              <div class="setting-item">
                <label>הפסקה ארוכה (דקות)</label>
                <input type="number" class="input" value="${this.settings.longBreak}" 
                       onchange="pomodoro.updateSetting('longBreak', this.value)" min="1" max="60">
              </div>
              <div class="setting-item">
                <label>
                  <input type="checkbox" ${this.settings.autoStart ? 'checked' : ''} 
                         onchange="pomodoro.updateSetting('autoStart', this.checked)">
                  התחל אוטומטית
                </label>
              </div>
              <div class="setting-item">
                <label>
                  <input type="checkbox" ${this.settings.soundEnabled ? 'checked' : ''} 
                         onchange="pomodoro.updateSetting('soundEnabled', this.checked)">
                  צלילים
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.closePomodoroPanel();
    });
  }

  closePomodoroPanel() {
    const modal = document.getElementById('pomodoro-modal');
    if (modal) modal.remove();
  }

  // התחלה/השהיה של הטיימר
  toggleTimer() {
    if (!this.isRunning) {
      this.startTimer();
    } else if (this.isPaused) {
      this.resumeTimer();
    } else {
      this.pauseTimer();
    }
  }

  startTimer() {
    this.isRunning = true;
    this.isPaused = false;
    
    this.interval = setInterval(() => {
      this.timeLeft--;
      this.updateDisplay();
      
      if (this.timeLeft <= 0) {
        this.completeSession();
      }
    }, 1000);
    
    this.updateButtons();
  }

  pauseTimer() {
    this.isPaused = true;
    clearInterval(this.interval);
    this.updateButtons();
  }

  resumeTimer() {
    this.isPaused = false;
    this.startTimer();
  }

  resetTimer() {
    this.stopTimer();
    this.timeLeft = this.settings.workTime * 60;
    this.currentMode = 'work';
    this.updateDisplay();
    this.updateButtons();
  }

  stopTimer() {
    this.isRunning = false;
    this.isPaused = false;
    clearInterval(this.interval);
  }

  // השלמת סבב
  completeSession() {
    this.stopTimer();
    
    if (this.currentMode === 'work') {
      this.sessions++;
      this.saveStat();
      
      // בדיקה אם הגיע הזמן להפסקה ארוכה
      if (this.sessions % this.settings.sessionsUntilLongBreak === 0) {
        this.currentMode = 'longBreak';
        this.timeLeft = this.settings.longBreak * 60;
      } else {
        this.currentMode = 'break';
        this.timeLeft = this.settings.shortBreak * 60;
      }
      
      if (this.settings.soundEnabled) this.playSound('complete');
      notifications.showInAppNotification('🎉 סבב הושלם! זמן להפסקה', 'success');
    } else {
      this.currentMode = 'work';
      this.timeLeft = this.settings.workTime * 60;
      
      if (this.settings.soundEnabled) this.playSound('break');
      notifications.showInAppNotification('💪 הפסקה הסתיימה! בחזרה לעבודה', 'info');
    }
    
    if (this.settings.autoStart) {
      this.startTimer();
    }
    
    this.updateDisplay();
    this.updateButtons();
  }

  skipSession() {
    this.completeSession();
  }

  // עדכון תצוגה
  updateDisplay() {
    const timeEl = document.getElementById('pomodoro-time');
    if (timeEl) timeEl.textContent = this.formatTime();
    
    const progress = document.querySelector('.timer-progress');
    if (progress) {
      progress.style.strokeDashoffset = this.getProgress();
    }
  }

  updateButtons() {
    const startBtn = document.getElementById('pomodoro-start');
    if (startBtn) {
      startBtn.textContent = this.isRunning ? (this.isPaused ? '▶️ המשך' : '⏸️ השהה') : '▶️ התחל';
    }
  }

  // פורמט זמן
  formatTime() {
    const minutes = Math.floor(this.timeLeft / 60);
    const seconds = this.timeLeft % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  getModeName() {
    const modes = {
      work: '💼 עבודה',
      break: '☕ הפסקה',
      longBreak: '🌟 הפסקה ארוכה'
    };
    return modes[this.currentMode];
  }

  // חישוב התקדמות עבור מעגל
  getCircumference() {
    return 2 * Math.PI * 90; // r=90
  }

  getProgress() {
    const total = this.currentMode === 'work' ? this.settings.workTime * 60 :
                  this.currentMode === 'break' ? this.settings.shortBreak * 60 :
                  this.settings.longBreak * 60;
    const progress = (this.timeLeft / total);
    return this.getCircumference() * (1 - progress);
  }

  // סטטיסטיקות
  getTodayCompletedSessions() {
    const today = new Date().toDateString();
    const stats = JSON.parse(localStorage.getItem('pomodoro-stats') || '{}');
    return stats[today]?.sessions || 0;
  }

  getTodayFocusTime() {
    const today = new Date().toDateString();
    const stats = JSON.parse(localStorage.getItem('pomodoro-stats') || '{}');
    return stats[today]?.minutes || 0;
  }

  getStreak() {
    const stats = JSON.parse(localStorage.getItem('pomodoro-stats') || '{}');
    let streak = 0;
    let currentDate = new Date();
    
    while (true) {
      const dateStr = currentDate.toDateString();
      if (stats[dateStr]?.sessions > 0) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }
    
    return streak;
  }

  saveStat() {
    const today = new Date().toDateString();
    const stats = JSON.parse(localStorage.getItem('pomodoro-stats') || '{}');
    
    if (!stats[today]) {
      stats[today] = { sessions: 0, minutes: 0 };
    }
    
    stats[today].sessions++;
    stats[today].minutes += this.settings.workTime;
    
    localStorage.setItem('pomodoro-stats', JSON.stringify(stats));
  }

  // עדכון הגדרה
  updateSetting(key, value) {
    this.settings[key] = typeof value === 'boolean' ? value : parseInt(value);
    this.saveSettings();
    
    if (key === 'workTime' && this.currentMode === 'work' && !this.isRunning) {
      this.timeLeft = this.settings.workTime * 60;
      this.updateDisplay();
    }
  }

  saveSettings() {
    localStorage.setItem('pomodoro-settings', JSON.stringify(this.settings));
  }

  loadSettings() {
    const saved = localStorage.getItem('pomodoro-settings');
    if (saved) {
      this.settings = { ...this.settings, ...JSON.parse(saved) };
    }
  }

  // צלילים
  playSound(type) {
    // ניתן להוסיף Web Audio API כאן
    try {
      const audio = new Audio(type === 'complete' ? 'complete.mp3' : 'break.mp3');
      audio.play().catch(() => {}); // ignore if no sound file
    } catch (e) {}
  }
}

console.log('⏱️ Creating global pomodoro manager...');
const pomodoro = new PomodoroManager();
pomodoro.loadSettings();
console.log('✅ Global pomodoro manager created');
