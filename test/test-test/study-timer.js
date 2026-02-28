// Study Timer & Pomodoro Manager - מנהל טיימר לימוד ופומודורו

// ── Fallback: ודא ש-storage זמין ──────────────────────────────
if (typeof storage === 'undefined') {
  /* eslint-disable no-var */
  var storage = window.storage || window.storageManager;
}

class StudyTimerManager {
  constructor() {
    this.isRunning = false;
    this.isPaused = false;
    this.currentMode = 'pomodoro'; // pomodoro, shortBreak, longBreak, custom
    this.currentTime = 25 * 60; // 25 minutes in seconds
    this.intervalId = null;
    this.pomodoroCount = 0;
    this.totalStudyTime = 0;
    this.sessionsToday = [];
    
    // הגדרות ברירת מחדל
    this.settings = {
      pomodoroDuration: 25,
      shortBreakDuration: 5,
      longBreakDuration: 15,
      pomodorosUntilLongBreak: 4,
      autoStartBreaks: false,
      autoStartPomodoros: false,
      soundEnabled: true,
      notificationsEnabled: true,
      tickingSound: false
    };
    
    console.log('⏰ StudyTimerManager: Initialized');
  }

  // ==================== טעינה ושמירה ====================
  
  async loadSettings() {
    console.log('⏰ loadSettings: Loading timer settings...');
    try {
      const saved = await storage.get('study-timer-settings');
      if (saved) {
        this.settings = { ...this.settings, ...saved };
        console.log('✅ loadSettings: Settings loaded:', this.settings);
      }
      
      const sessions = await storage.get('study-sessions-today');
      if (sessions) {
        const today = new Date().toDateString();
        if (sessions.date === today) {
          this.sessionsToday = sessions.sessions;
          this.totalStudyTime = sessions.totalTime;
          this.pomodoroCount = sessions.pomodoroCount;
          console.log('✅ loadSettings: Today\'s sessions loaded:', this.sessionsToday.length);
        }
      }
    } catch (error) {
      console.error('❌ loadSettings: Error loading settings:', error);
    }
  }

  async saveSettings() {
    console.log('💾 saveSettings: Saving timer settings...');
    try {
      await storage.set('study-timer-settings', this.settings);
      console.log('✅ saveSettings: Settings saved');
    } catch (error) {
      console.error('❌ saveSettings: Error saving settings:', error);
    }
  }

  async saveTodaySessions() {
    console.log('💾 saveTodaySessions: Saving today\'s sessions...');
    try {
      await storage.set('study-sessions-today', {
        date: new Date().toDateString(),
        sessions: this.sessionsToday,
        totalTime: this.totalStudyTime,
        pomodoroCount: this.pomodoroCount
      });
      console.log('✅ saveTodaySessions: Sessions saved');
    } catch (error) {
      console.error('❌ saveTodaySessions: Error saving sessions:', error);
    }
  }

  // ==================== טיימר ====================

  startTimer(mode = 'pomodoro', customTime = null) {
    console.log('▶️ startTimer: Starting timer...', { mode, customTime });
    
    if (this.isRunning && !this.isPaused) {
      console.warn('⚠️ startTimer: Timer already running');
      return;
    }

    if (!this.isPaused) {
      this.currentMode = mode;
      
      switch (mode) {
        case 'pomodoro':
          this.currentTime = this.settings.pomodoroDuration * 60;
          break;
        case 'shortBreak':
          this.currentTime = this.settings.shortBreakDuration * 60;
          break;
        case 'longBreak':
          this.currentTime = this.settings.longBreakDuration * 60;
          break;
        case 'custom':
          this.currentTime = customTime || 10 * 60;
          break;
      }
      console.log(`⏰ startTimer: Set time to ${this.currentTime} seconds`);
    }

    this.isRunning = true;
    this.isPaused = false;

    this.intervalId = setInterval(() => {
      this.tick();
    }, 1000);

    this.updateUI();
    console.log('✅ startTimer: Timer started');
  }

  pauseTimer() {
    console.log('⏸️ pauseTimer: Pausing timer...');
    this.isPaused = true;
    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.updateUI();
    console.log('✅ pauseTimer: Timer paused');
  }

  resumeTimer() {
    console.log('▶️ resumeTimer: Resuming timer...');
    if (!this.isPaused) {
      console.warn('⚠️ resumeTimer: Timer not paused');
      return;
    }
    
    this.startTimer(); // יתחיל מהזמן הנוכחי
  }

  stopTimer() {
    console.log('⏹️ stopTimer: Stopping timer...');
    this.isRunning = false;
    this.isPaused = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.currentTime = this.settings.pomodoroDuration * 60;
    this.updateUI();
    console.log('✅ stopTimer: Timer stopped');
  }

  tick() {
    if (this.currentTime > 0) {
      this.currentTime--;
      
      // צליל תיקתוק (אופציונלי)
      if (this.settings.tickingSound && this.currentTime <= 10 && this.currentTime > 0) {
        this.playSound('tick');
      }
      
      this.updateUI();
    } else {
      this.onTimerComplete();
    }
  }

  onTimerComplete() {
    console.log('✅ onTimerComplete: Timer completed!');
    this.stopTimer();
    
    // שמירת סשן
    if (this.currentMode === 'pomodoro') {
      this.pomodoroCount++;
      this.totalStudyTime += this.settings.pomodoroDuration;
      
      this.sessionsToday.push({
        type: 'pomodoro',
        duration: this.settings.pomodoroDuration,
        timestamp: new Date().toISOString()
      });
      
      this.saveTodaySessions();
      console.log(`🎯 onTimerComplete: Pomodoro ${this.pomodoroCount} completed`);
    }

    // צליל והתראה
    this.playSound('complete');
    this.showNotification();

    // התחלה אוטומטית
    if (this.currentMode === 'pomodoro' && this.settings.autoStartBreaks) {
      const nextMode = this.pomodoroCount % this.settings.pomodorosUntilLongBreak === 0 
        ? 'longBreak' 
        : 'shortBreak';
      
      setTimeout(() => {
        this.startTimer(nextMode);
      }, 2000);
    } else if (this.currentMode !== 'pomodoro' && this.settings.autoStartPomodoros) {
      setTimeout(() => {
        this.startTimer('pomodoro');
      }, 2000);
    }

    this.updateUI();
    this.updateStats();
  }

  // ==================== צלילים והתראות ====================

  playSound(type) {
    if (!this.settings.soundEnabled) return;

    console.log('🔊 playSound: Playing sound:', type);
    
    // יצירת צלילים באמצעות Web Audio API
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    if (type === 'complete') {
      // צליל של השלמה - מלודיה נעימה
      oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
      
      // תו שני
      setTimeout(() => {
        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        osc2.connect(gain2);
        gain2.connect(audioContext.destination);
        
        osc2.frequency.setValueAtTime(659.25, audioContext.currentTime); // E5
        gain2.gain.setValueAtTime(0.3, audioContext.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        osc2.start(audioContext.currentTime);
        osc2.stop(audioContext.currentTime + 0.5);
      }, 200);
    } else if (type === 'tick') {
      // צליל תיקתוק
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.05);
    }
  }

  showNotification() {
    if (!this.settings.notificationsEnabled) return;

    console.log('🔔 showNotification: Showing completion notification');

    const messages = {
      pomodoro: {
        title: '🎉 כל הכבוד!',
        body: `סיימת פומודורו ${this.pomodoroCount}! זמן להפסקה.`
      },
      shortBreak: {
        title: '☕ הפסקה הסתיימה',
        body: 'מוכן לפומודורו הבא?'
      },
      longBreak: {
        title: '🌟 הפסקה ארוכה הסתיימה',
        body: 'מצוין! בוא נמשיך!'
      },
      custom: {
        title: '⏰ הטיימר הסתיים',
        body: 'הזמן שהגדרת עבר!'
      }
    };

    const msg = messages[this.currentMode] || messages.custom;

    if (notifications && notifications.sendNotification) {
      notifications.sendNotification(msg.title, {
        body: msg.body,
        icon: '⏰',
        tag: 'study-timer'
      });
    }

    if (notifications && notifications.showInAppNotification) {
      notifications.showInAppNotification(`${msg.title} ${msg.body}`, 'success');
    }
  }

  // ==================== ממשק משתמש ====================

  updateUI() {
    const minutes = Math.floor(this.currentTime / 60);
    const seconds = this.currentTime % 60;
    const timeString = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    // עדכון התצוגה
    const timerDisplay = document.getElementById('timer-display');
    if (timerDisplay) {
      timerDisplay.textContent = timeString;
    }

    const timerMode = document.getElementById('timer-mode');
    if (timerMode) {
      const modeNames = {
        pomodoro: '🍅 פומודורו',
        shortBreak: '☕ הפסקה קצרה',
        longBreak: '🌟 הפסקה ארוכה',
        custom: '⏰ טיימר מותאם'
      };
      timerMode.textContent = modeNames[this.currentMode];
    }

    // כפתורים
    const startBtn = document.getElementById('timer-start');
    const pauseBtn = document.getElementById('timer-pause');
    const stopBtn = document.getElementById('timer-stop');

    if (startBtn && pauseBtn && stopBtn) {
      if (this.isRunning) {
        startBtn.style.display = 'none';
        pauseBtn.style.display = 'flex';
        stopBtn.style.display = 'flex';
      } else if (this.isPaused) {
        startBtn.style.display = 'flex';
        pauseBtn.style.display = 'none';
        stopBtn.style.display = 'flex';
      } else {
        startBtn.style.display = 'flex';
        pauseBtn.style.display = 'none';
        stopBtn.style.display = 'flex';
      }
    }

    // עדכון פרוגרס בר
    this.updateProgressBar();
  }

  updateProgressBar() {
    const progressBar = document.getElementById('timer-progress');
    if (!progressBar) return;

    let totalTime;
    switch (this.currentMode) {
      case 'pomodoro':
        totalTime = this.settings.pomodoroDuration * 60;
        break;
      case 'shortBreak':
        totalTime = this.settings.shortBreakDuration * 60;
        break;
      case 'longBreak':
        totalTime = this.settings.longBreakDuration * 60;
        break;
      default:
        totalTime = this.currentTime;
    }

    const progress = ((totalTime - this.currentTime) / totalTime) * 100;
    progressBar.style.width = `${progress}%`;
  }

  updateStats() {
    const pomodoroCountEl = document.getElementById('pomodoro-count');
    if (pomodoroCountEl) {
      pomodoroCountEl.textContent = this.pomodoroCount;
    }

    const totalTimeEl = document.getElementById('total-study-time');
    if (totalTimeEl) {
      const hours = Math.floor(this.totalStudyTime / 60);
      const minutes = this.totalStudyTime % 60;
      totalTimeEl.textContent = `${hours}:${String(minutes).padStart(2, '0')}`;
    }
  }

  // ==================== רינדור ====================

  renderTimerPanel() {
    console.log('🎨 renderTimerPanel: Rendering timer panel...');
    
    const panel = document.getElementById('timer-panel');
    if (!panel) {
      console.warn('⚠️ renderTimerPanel: Timer panel not found');
      return;
    }

    const minutes = Math.floor(this.currentTime / 60);
    const seconds = this.currentTime % 60;
    const timeString = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    const modeNames = {
      pomodoro: '🍅 פומודורו',
      shortBreak: '☕ הפסקה קצרה',
      longBreak: '🌟 הפסקה ארוכה',
      custom: '⏰ טיימר מותאם'
    };

    panel.innerHTML = `
      <h2>טיימר לימוד</h2>
      
      <div class="timer-display-container">
        <div class="timer-mode" id="timer-mode">${modeNames[this.currentMode]}</div>
        <div class="timer-display" id="timer-display">${timeString}</div>
        <div class="timer-progress-bar">
          <div class="timer-progress-fill" id="timer-progress"></div>
        </div>
      </div>

      <div class="timer-controls">
        <button class="btn btn-primary" id="timer-start" ${this.isRunning ? 'style="display:none"' : ''}>
          <svg width="20" height="20"><use href="#play"></use></svg>
          ${this.isPaused ? 'המשך' : 'התחל'}
        </button>
        <button class="btn btn-secondary" id="timer-pause" ${!this.isRunning ? 'style="display:none"' : ''}>
          <svg width="20" height="20"><use href="#pause"></use></svg>
          השהה
        </button>
        <button class="btn btn-secondary" id="timer-stop">
          <svg width="20" height="20"><use href="#square"></use></svg>
          עצור
        </button>
      </div>

      <div class="timer-modes">
        <button class="timer-mode-btn ${this.currentMode === 'pomodoro' ? 'active' : ''}" 
                onclick="studyTimer.startTimer('pomodoro')">
          🍅 פומודורו<br>
          <small>${this.settings.pomodoroDuration} דק'</small>
        </button>
        <button class="timer-mode-btn ${this.currentMode === 'shortBreak' ? 'active' : ''}" 
                onclick="studyTimer.startTimer('shortBreak')">
          ☕ הפסקה קצרה<br>
          <small>${this.settings.shortBreakDuration} דק'</small>
        </button>
        <button class="timer-mode-btn ${this.currentMode === 'longBreak' ? 'active' : ''}" 
                onclick="studyTimer.startTimer('longBreak')">
          🌟 הפסקה ארוכה<br>
          <small>${this.settings.longBreakDuration} דק'</small>
        </button>
      </div>

      <div class="timer-stats">
        <div class="timer-stat">
          <div class="timer-stat-value" id="pomodoro-count">${this.pomodoroCount}</div>
          <div class="timer-stat-label">פומודורו היום</div>
        </div>
        <div class="timer-stat">
          <div class="timer-stat-value" id="total-study-time">${Math.floor(this.totalStudyTime / 60)}:${String(this.totalStudyTime % 60).padStart(2, '0')}</div>
          <div class="timer-stat-label">זמן לימוד כולל</div>
        </div>
      </div>

      <button class="btn btn-secondary" onclick="studyTimer.openTimerSettings()" style="margin-top: 1rem;">
        <svg width="20" height="20"><use href="#settings"></use></svg>
        הגדרות טיימר
      </button>
    `;

    this.attachEventListeners();
    console.log('✅ renderTimerPanel: Panel rendered');
  }

  attachEventListeners() {
    const startBtn = document.getElementById('timer-start');
    const pauseBtn = document.getElementById('timer-pause');
    const stopBtn = document.getElementById('timer-stop');

    if (startBtn) {
      startBtn.addEventListener('click', () => {
        if (this.isPaused) {
          this.resumeTimer();
        } else {
          this.startTimer(this.currentMode);
        }
      });
    }

    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        this.pauseTimer();
      });
    }

    if (stopBtn) {
      stopBtn.addEventListener('click', () => {
        this.stopTimer();
      });
    }
  }

  openTimerSettings() {
    // ניתן להוסיף מודאל הגדרות מפורט יותר
    console.log('⚙️ openTimerSettings: Opening timer settings...');
    
    const settingsHTML = `
      <div class="modal" id="timer-settings-modal">
        <div class="modal-content">
          <div class="modal-header">
            <h2>הגדרות טיימר</h2>
            <button class="close-modal-btn" onclick="document.getElementById('timer-settings-modal').remove()">
              <svg width="24" height="24"><use href="#x"></use></svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>משך פומודורו (דקות)</label>
              <input type="number" class="input" id="pomodoro-duration" 
                     value="${this.settings.pomodoroDuration}" min="1" max="90">
            </div>
            <div class="form-group">
              <label>משך הפסקה קצרה (דקות)</label>
              <input type="number" class="input" id="short-break-duration" 
                     value="${this.settings.shortBreakDuration}" min="1" max="30">
            </div>
            <div class="form-group">
              <label>משך הפסקה ארוכה (דקות)</label>
              <input type="number" class="input" id="long-break-duration" 
                     value="${this.settings.longBreakDuration}" min="1" max="60">
            </div>
            <div class="form-group">
              <label>פומודורו עד הפסקה ארוכה</label>
              <input type="number" class="input" id="pomodoros-until-long" 
                     value="${this.settings.pomodorosUntilLongBreak}" min="2" max="10">
            </div>
            <div class="setting-item">
              <label>
                <input type="checkbox" id="auto-start-breaks" ${this.settings.autoStartBreaks ? 'checked' : ''}>
                התחל הפסקות אוטומטית
              </label>
            </div>
            <div class="setting-item">
              <label>
                <input type="checkbox" id="auto-start-pomodoros" ${this.settings.autoStartPomodoros ? 'checked' : ''}>
                התחל פומודורו אוטומטית
              </label>
            </div>
            <div class="setting-item">
              <label>
                <input type="checkbox" id="sound-enabled" ${this.settings.soundEnabled ? 'checked' : ''}>
                הפעל צלילים
              </label>
            </div>
            <div class="setting-item">
              <label>
                <input type="checkbox" id="ticking-sound" ${this.settings.tickingSound ? 'checked' : ''}>
                צליל תיקתוק (10 שניות אחרונות)
              </label>
            </div>
            <button class="btn btn-primary" onclick="studyTimer.saveTimerSettings()">
              שמור הגדרות
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', settingsHTML);
  }

  saveTimerSettings() {
    console.log('💾 saveTimerSettings: Saving timer settings from modal...');
    
    this.settings.pomodoroDuration = parseInt(document.getElementById('pomodoro-duration').value);
    this.settings.shortBreakDuration = parseInt(document.getElementById('short-break-duration').value);
    this.settings.longBreakDuration = parseInt(document.getElementById('long-break-duration').value);
    this.settings.pomodorosUntilLongBreak = parseInt(document.getElementById('pomodoros-until-long').value);
    this.settings.autoStartBreaks = document.getElementById('auto-start-breaks').checked;
    this.settings.autoStartPomodoros = document.getElementById('auto-start-pomodoros').checked;
    this.settings.soundEnabled = document.getElementById('sound-enabled').checked;
    this.settings.tickingSound = document.getElementById('ticking-sound').checked;

    this.saveSettings();
    
    document.getElementById('timer-settings-modal').remove();
    this.renderTimerPanel();
    
    notifications.showInAppNotification('הגדרות הטיימר נשמרו', 'success');
  }
}

// יצירת אובייקט גלובלי
console.log('⏰ Creating global study timer manager...');
const studyTimer = new StudyTimerManager();
console.log('✅ Global study timer manager created');

// אתחול
window.addEventListener('DOMContentLoaded', async () => {
  console.log('⏰ study-timer.js: Initializing...');
  await studyTimer.loadSettings();
  
  // רינדור אם יש פאנל
  const timerPanel = document.getElementById('timer-panel');
  if (timerPanel) {
    studyTimer.renderTimerPanel();
  }
  
  console.log('✅ study-timer.js: Initialized');
});
