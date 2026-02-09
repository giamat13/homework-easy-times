// Study Timer & Pomodoro - טיימר לימוד וטכניקת פומודורו
class StudyTimerManager {
  constructor() {
    this.isRunning = false;
    this.isPaused = false;
    this.currentMode = 'study'; // 'study', 'shortBreak', 'longBreak'
    this.timeRemaining = 25 * 60; // 25 דקות
    this.interval = null;
    this.pomodorosCompleted = 0;
    this.currentTask = null;
    
    this.settings = {
      studyDuration: 25,
      shortBreakDuration: 5,
      longBreakDuration: 15,
      pomodorosUntilLongBreak: 4,
      autoStartBreaks: false,
      autoStartPomodoros: false,
      soundEnabled: true,
      notificationsEnabled: true
    };

    this.stats = {
      totalStudyTime: 0,
      totalBreakTime: 0,
      pomodorosToday: 0,
      longestStreak: 0,
      currentStreak: 0,
      lastSessionDate: null
    };

    console.log('⏱️ StudyTimerManager: Initialized');
  }

  // טעינת הגדרות
  async loadSettings() {
    console.log('📥 StudyTimerManager: Loading settings...');
    try {
      const saved = await storage.get('homework-timer-settings');
      if (saved) {
        this.settings = { ...this.settings, ...saved };
      }
      
      const savedStats = await storage.get('homework-timer-stats');
      if (savedStats) {
        this.stats = { ...this.stats, ...savedStats };
      }
      
      console.log('✅ StudyTimerManager: Settings loaded');
    } catch (error) {
      console.error('❌ StudyTimerManager: Error loading settings:', error);
    }
  }

  // שמירת הגדרות
  async saveSettings() {
    console.log('💾 StudyTimerManager: Saving settings...');
    try {
      await storage.set('homework-timer-settings', this.settings);
      await storage.set('homework-timer-stats', this.stats);
      console.log('✅ StudyTimerManager: Settings saved');
    } catch (error) {
      console.error('❌ StudyTimerManager: Error saving settings:', error);
    }
  }

  // התחלת טיימר
  start(taskId = null) {
    console.log('▶️ StudyTimerManager: Starting timer...');
    
    if (this.isRunning) {
      console.warn('⚠️ StudyTimerManager: Timer already running');
      return;
    }

    this.currentTask = taskId;
    this.isRunning = true;
    this.isPaused = false;

    // אם זה תחילה חדשה ולא המשך
    if (this.timeRemaining === 0 || this.timeRemaining === this.getCurrentModeDuration() * 60) {
      this.resetTimer();
    }

    this.interval = setInterval(() => {
      this.tick();
    }, 1000);

    this.updateUI();
    console.log('✅ StudyTimerManager: Timer started');
  }

  // עצירה זמנית
  pause() {
    console.log('⏸️ StudyTimerManager: Pausing timer...');
    this.isPaused = true;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.updateUI();
  }

  // המשך
  resume() {
    console.log('▶️ StudyTimerManager: Resuming timer...');
    this.isPaused = false;
    this.interval = setInterval(() => {
      this.tick();
    }, 1000);
    this.updateUI();
  }

  // עצירה מלאה
  stop() {
    console.log('⏹️ StudyTimerManager: Stopping timer...');
    this.isRunning = false;
    this.isPaused = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.resetTimer();
    this.updateUI();
  }

  // איפוס טיימר
  resetTimer() {
    console.log('🔄 StudyTimerManager: Resetting timer...');
    this.timeRemaining = this.getCurrentModeDuration() * 60;
    this.updateUI();
  }

  // קבלת משך זמן נוכחי
  getCurrentModeDuration() {
    switch (this.currentMode) {
      case 'study':
        return this.settings.studyDuration;
      case 'shortBreak':
        return this.settings.shortBreakDuration;
      case 'longBreak':
        return this.settings.longBreakDuration;
      default:
        return this.settings.studyDuration;
    }
  }

  // טיק של הטיימר
  tick() {
    if (!this.isRunning || this.isPaused) return;

    this.timeRemaining--;

    // עדכון סטטיסטיקות
    if (this.currentMode === 'study') {
      this.stats.totalStudyTime++;
    } else {
      this.stats.totalBreakTime++;
    }

    this.updateUI();

    // בדיקה אם הטיימר הסתיים
    if (this.timeRemaining <= 0) {
      this.onTimerComplete();
    }
  }

  // סיום טיימר
  async onTimerComplete() {
    console.log('✅ StudyTimerManager: Timer completed!');

    // עצירת הטיימר
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    // השמעת צליל
    if (this.settings.soundEnabled) {
      this.playSound();
    }

    // התראה
    if (this.settings.notificationsEnabled) {
      this.showNotification();
    }

    // עדכון מצב
    if (this.currentMode === 'study') {
      this.pomodorosCompleted++;
      this.stats.pomodorosToday++;
      this.stats.currentStreak++;
      
      if (this.stats.currentStreak > this.stats.longestStreak) {
        this.stats.longestStreak = this.stats.currentStreak;
      }

      // עבור למצב הפסקה
      if (this.pomodorosCompleted % this.settings.pomodorosUntilLongBreak === 0) {
        this.switchMode('longBreak');
      } else {
        this.switchMode('shortBreak');
      }
    } else {
      // עבור למצב לימוד
      this.switchMode('study');
    }

    await this.saveSettings();
    this.updateUI();
  }

  // החלפת מצב
  switchMode(mode) {
    console.log('🔄 StudyTimerManager: Switching to mode:', mode);
    this.currentMode = mode;
    this.isRunning = false;
    this.resetTimer();

    // התחלה אוטומטית אם מופעל
    if ((mode === 'study' && this.settings.autoStartPomodoros) ||
        (mode !== 'study' && this.settings.autoStartBreaks)) {
      setTimeout(() => {
        this.start(this.currentTask);
      }, 1000);
    }
  }

  // השמעת צליל
  playSound() {
    // ניתן להוסיף צליל בעתיד
    console.log('🔔 StudyTimerManager: Playing sound...');
  }

  // הצגת התראה
  showNotification() {
    const message = this.currentMode === 'study' 
      ? '⏰ זמן לימוד הסתיים! קח הפסקה 🎉'
      : '⏰ זמן הפסקה הסתיים! בואו נחזור ללמוד 📚';
    
    notifications.showInAppNotification(message, 'success');

    if (notifications.permission === 'granted') {
      notifications.sendNotification('טיימר לימוד', {
        body: message,
        icon: '⏱️'
      });
    }
  }

  // עדכון UI
  updateUI() {
    const timerDisplay = document.getElementById('timer-display');
    if (timerDisplay) {
      const minutes = Math.floor(this.timeRemaining / 60);
      const seconds = this.timeRemaining % 60;
      timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    const timerMode = document.getElementById('timer-mode');
    if (timerMode) {
      const modeText = this.currentMode === 'study' ? '📚 לימוד' :
                      this.currentMode === 'shortBreak' ? '☕ הפסקה קצרה' :
                      '🌟 הפסקה ארוכה';
      timerMode.textContent = modeText;
    }

    const startBtn = document.getElementById('timer-start');
    const pauseBtn = document.getElementById('timer-pause');
    const resumeBtn = document.getElementById('timer-resume');

    if (startBtn) startBtn.classList.toggle('hidden', this.isRunning);
    if (pauseBtn) pauseBtn.classList.toggle('hidden', !this.isRunning || this.isPaused);
    if (resumeBtn) resumeBtn.classList.toggle('hidden', !this.isPaused);

    // עדכון סטטיסטיקות
    const pomodoroCount = document.getElementById('pomodoro-count');
    if (pomodoroCount) {
      pomodoroCount.textContent = this.pomodorosCompleted;
    }

    const todayPomodoros = document.getElementById('today-pomodoros');
    if (todayPomodoros) {
      todayPomodoros.textContent = this.stats.pomodorosToday;
    }
  }

  // רינדור ממשק טיימר
  renderTimerInterface() {
    console.log('🎨 StudyTimerManager: Rendering timer interface...');

    const totalMinutes = Math.floor(this.stats.totalStudyTime / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `
      <div class="timer-container">
        <div class="timer-header">
          <h2>⏱️ טיימר לימוד - Pomodoro</h2>
        </div>

        <div class="timer-circle">
          <div class="timer-mode" id="timer-mode">📚 לימוד</div>
          <div class="timer-display" id="timer-display">25:00</div>
          <div class="timer-pomodoros">
            🍅 פומודורו ${this.pomodorosCompleted}
          </div>
        </div>

        <div class="timer-controls">
          <button class="btn btn-primary" id="timer-start" onclick="studyTimer.start()">
            <svg width="20" height="20"><use href="#play"></use></svg>
            התחל
          </button>
          <button class="btn btn-secondary hidden" id="timer-pause" onclick="studyTimer.pause()">
            <svg width="20" height="20"><use href="#pause"></use></svg>
            השהה
          </button>
          <button class="btn btn-primary hidden" id="timer-resume" onclick="studyTimer.resume()">
            <svg width="20" height="20"><use href="#play"></use></svg>
            המשך
          </button>
          <button class="btn btn-secondary" id="timer-stop" onclick="studyTimer.stop()">
            <svg width="20" height="20"><use href="#square"></use></svg>
            עצור
          </button>
          <button class="btn btn-secondary" onclick="studyTimer.resetTimer()">
            <svg width="20" height="20"><use href="#refresh-cw"></use></svg>
            אפס
          </button>
        </div>

        <div class="timer-modes">
          <button class="mode-btn ${this.currentMode === 'study' ? 'active' : ''}" 
                  onclick="studyTimer.switchMode('study')">
            📚 לימוד (${this.settings.studyDuration}')
          </button>
          <button class="mode-btn ${this.currentMode === 'shortBreak' ? 'active' : ''}" 
                  onclick="studyTimer.switchMode('shortBreak')">
            ☕ הפסקה קצרה (${this.settings.shortBreakDuration}')
          </button>
          <button class="mode-btn ${this.currentMode === 'longBreak' ? 'active' : ''}" 
                  onclick="studyTimer.switchMode('longBreak')">
            🌟 הפסקה ארוכה (${this.settings.longBreakDuration}')
          </button>
        </div>

        <div class="timer-stats">
          <div class="timer-stat">
            <div class="stat-icon">📊</div>
            <div class="stat-value" id="today-pomodoros">${this.stats.pomodorosToday}</div>
            <div class="stat-label">היום</div>
          </div>
          <div class="timer-stat">
            <div class="stat-icon">⏱️</div>
            <div class="stat-value">${hours}:${String(minutes).padStart(2, '0')}</div>
            <div class="stat-label">סה"כ זמן</div>
          </div>
          <div class="timer-stat">
            <div class="stat-icon">🔥</div>
            <div class="stat-value">${this.stats.currentStreak}</div>
            <div class="stat-label">רצף נוכחי</div>
          </div>
          <div class="timer-stat">
            <div class="stat-icon">🏆</div>
            <div class="stat-value">${this.stats.longestStreak}</div>
            <div class="stat-label">שיא רצף</div>
          </div>
        </div>

        <div class="timer-task-selection">
          <label>📝 בחר משימה (אופציונלי):</label>
          <select class="select" id="timer-task-select" onchange="studyTimer.currentTask = this.value || null">
            <option value="">ללא משימה ספציפית</option>
            ${homework.filter(h => !h.completed).map(h => {
              const subject = subjects.find(s => s.id == h.subject);
              return `<option value="${h.id}">${subject ? subject.name + ' - ' : ''}${h.title}</option>`;
            }).join('')}
          </select>
        </div>
      </div>
    `;
  }

  // רינדור הגדרות טיימר
  renderTimerSettings() {
    return `
      <div class="timer-settings-section">
        <h3>⏱️ הגדרות טיימר</h3>
        
        <div class="setting-item">
          <label>
            משך לימוד (דקות):
            <input type="number" class="input" min="1" max="60" 
                   value="${this.settings.studyDuration}"
                   onchange="studyTimer.settings.studyDuration = parseInt(this.value); studyTimer.saveSettings();"
                   style="width: 80px; display: inline-block; margin-right: 0.5rem;">
          </label>
        </div>

        <div class="setting-item">
          <label>
            משך הפסקה קצרה (דקות):
            <input type="number" class="input" min="1" max="30" 
                   value="${this.settings.shortBreakDuration}"
                   onchange="studyTimer.settings.shortBreakDuration = parseInt(this.value); studyTimer.saveSettings();"
                   style="width: 80px; display: inline-block; margin-right: 0.5rem;">
          </label>
        </div>

        <div class="setting-item">
          <label>
            משך הפסקה ארוכה (דקות):
            <input type="number" class="input" min="1" max="60" 
                   value="${this.settings.longBreakDuration}"
                   onchange="studyTimer.settings.longBreakDuration = parseInt(this.value); studyTimer.saveSettings();"
                   style="width: 80px; display: inline-block; margin-right: 0.5rem;">
          </label>
        </div>

        <div class="setting-item">
          <label>
            פומודורו עד הפסקה ארוכה:
            <input type="number" class="input" min="2" max="10" 
                   value="${this.settings.pomodorosUntilLongBreak}"
                   onchange="studyTimer.settings.pomodorosUntilLongBreak = parseInt(this.value); studyTimer.saveSettings();"
                   style="width: 80px; display: inline-block; margin-right: 0.5rem;">
          </label>
        </div>

        <div class="setting-item">
          <label>
            <input type="checkbox" ${this.settings.autoStartBreaks ? 'checked' : ''}
                   onchange="studyTimer.settings.autoStartBreaks = this.checked; studyTimer.saveSettings();">
            התחלה אוטומטית של הפסקות
          </label>
        </div>

        <div class="setting-item">
          <label>
            <input type="checkbox" ${this.settings.autoStartPomodoros ? 'checked' : ''}
                   onchange="studyTimer.settings.autoStartPomodoros = this.checked; studyTimer.saveSettings();">
            התחלה אוטומטית של פומודורו
          </label>
        </div>

        <div class="setting-item">
          <label>
            <input type="checkbox" ${this.settings.soundEnabled ? 'checked' : ''}
                   onchange="studyTimer.settings.soundEnabled = this.checked; studyTimer.saveSettings();">
            הפעל צליל בסיום
          </label>
        </div>

        <div class="setting-item">
          <label>
            <input type="checkbox" ${this.settings.notificationsEnabled ? 'checked' : ''}
                   onchange="studyTimer.settings.notificationsEnabled = this.checked; studyTimer.saveSettings();">
            הפעל התראות
          </label>
        </div>
      </div>
    `;
  }
}

// יצירת אובייקט גלובלי
console.log('⏱️ Creating global study timer...');
const studyTimer = new StudyTimerManager();
console.log('✅ Global study timer created');
