// Enhanced Gamification & Achievements Manager - מערכת משחוק והישגים משופרת
// ====================================================================================

console.log('🏆 gamification-enhanced.js: Loading...');

class EnhancedGamificationManager {
  constructor() {
    this.userStats = {
      level: 1,
      xp: 0,
      totalXP: 0,
      streak: 0,
      longestStreak: 0,
      lastActivityDate: null,
      totalTasksCompleted: 0,
      totalStudyTime: 0,
      perfectDays: 0,
      examQuestions: 0,
      lastLoginDate: null,
      streakGraceUsed: false // האם השתמש בפער יום אחד השבוע
    };

    this.achievements = [];
    this.achievementCategories = {};
    this.unlockedAchievements = [];
    
    console.log('✅ EnhancedGamificationManager: Initialized');
  }

  // ==================== אתחול ====================

  async initialize() {
    console.log('🏆 initialize: Loading achievements from JSON...');
    
    try {
      // טעינת קובץ הישגים
      const response = await fetch('Achievements/achievements-config.json');
      if (!response.ok) {
        throw new Error('Failed to load achievements config');
      }
      
      const config = await response.json();
      console.log('✅ initialize: Config loaded:', config);
      
      this.achievementCategories = config.categories;
      this.achievements = config.achievements;
      
      console.log('✅ initialize: Loaded', this.achievements.length, 'achievements');
      console.log('✅ initialize: Loaded', Object.keys(this.achievementCategories).length, 'categories');
    } catch (error) {
      console.error('❌ initialize: Error loading achievements:', error);
      // טעינת הישגים ברירת מחדל
      this.loadDefaultAchievements();
    }
  }

  loadDefaultAchievements() {
    console.log('⚠️ loadDefaultAchievements: Loading default achievements...');
    
    this.achievementCategories = {
      tasks: { name: 'משימות', icon: '🎯' },
      streaks: { name: 'רצפים', icon: '🔥' },
      study: { name: 'לימוד', icon: '📚' }
    };
    
    this.achievements = [
      {
        id: 'first-task',
        category: 'tasks',
        name: 'צעד ראשון',
        description: 'השלם את המשימה הראשונה שלך',
        icon: '🎯',
        xp: 10,
        condition: { type: 'totalTasksCompleted', operator: '>=', value: 1 }
      }
    ];
    
    console.log('✅ loadDefaultAchievements: Default achievements loaded');
  }

  // ==================== טעינה ושמירה ====================

  async loadStats() {
    console.log('📥 loadStats: Loading user stats...');
    try {
      const saved = await storage.get('gamification-stats');
      if (saved) {
        this.userStats = { ...this.userStats, ...saved };
        console.log('✅ loadStats: Stats loaded:', this.userStats);
      }

      const achievements = await storage.get('gamification-achievements');
      if (achievements) {
        this.unlockedAchievements = achievements;
        console.log('✅ loadStats: Achievements loaded:', this.unlockedAchievements.length);
      }

      // בדיקת רצף עם הגדרות מתקדמות
      await this.updateStreakWithAdvancedSettings();
    } catch (error) {
      console.error('❌ loadStats: Error loading stats:', error);
    }
  }

  async saveStats() {
    console.log('💾 saveStats: Saving user stats...');
    try {
      await storage.set('gamification-stats', this.userStats);
      await storage.set('gamification-achievements', this.unlockedAchievements);
      console.log('✅ saveStats: Stats saved');
    } catch (error) {
      console.error('❌ saveStats: Error saving stats:', error);
    }
  }

  // ==================== רצף משופר (Streak) ====================

  async updateStreakWithAdvancedSettings() {
    console.log('🔥 updateStreakWithAdvancedSettings: Checking streak with advanced settings...');
    
    try {
      const advSettings = await storage.get('advanced-settings');
      const streakSettings = advSettings?.streakSettings || {
        allowOneDayGap: true,
        weekendDoesntBreakStreak: false
      };
      
      console.log('🔥 Streak settings:', streakSettings);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toDateString();
      
      const lastDate = this.userStats.lastActivityDate;
      const lastLogin = this.userStats.lastLoginDate;
      
      console.log('🔥 Today:', todayStr);
      console.log('🔥 Last activity:', lastDate);
      console.log('🔥 Last login:', lastLogin);
      
      if (!lastDate) {
        console.log('🔥 No previous activity');
        return;
      }

      // חישוב ההפרש בימים
      const lastActivityDate = new Date(lastDate);
      lastActivityDate.setHours(0, 0, 0, 0);
      
      const daysDiff = Math.floor((today - lastActivityDate) / (1000 * 60 * 60 * 24));
      console.log('🔥 Days difference:', daysDiff);
      
      // אם התחברנו היום כבר, לא לעשות כלום
      if (lastLogin === todayStr) {
        console.log('🔥 Already logged in today, streak unchanged');
        return;
      }
      
      // עדכון תאריך התחברות אחרון
      this.userStats.lastLoginDate = todayStr;
      
      // בדיקת שבירת רצף
      if (daysDiff === 0) {
        // אותו יום - לא קורה כלום
        console.log('🔥 Same day - no change');
      } else if (daysDiff === 1) {
        // יום אחד עבר - הכל בסדר, הרצף נמשך
        console.log('🔥 One day passed - streak continues');
      } else if (daysDiff === 2 && streakSettings.allowOneDayGap && !this.userStats.streakGraceUsed) {
        // יומיים עברו אבל יש אפשרות לפער של יום אחד
        console.log('🔥 Two days passed but grace period allowed');
        this.userStats.streakGraceUsed = true;
      } else if (streakSettings.weekendDoesntBreakStreak && this.wasWeekendGap(lastActivityDate, today)) {
        // הפער היה בסופ"ש
        console.log('🔥 Gap was over weekend - streak maintained');
      } else {
        // הרצף נשבר
        console.log('💔 Streak broken! Days diff:', daysDiff);
        this.userStats.streak = 0;
        this.userStats.streakGraceUsed = false;
      }
      
      await this.saveStats();
    } catch (error) {
      console.error('❌ updateStreakWithAdvancedSettings: Error:', error);
    }
  }

  wasWeekendGap(lastDate, currentDate) {
    // בדיקה אם הפער היה רק בסופ"ש (שישי-שבת או שבת-ראשון)
    const dayOfWeek = lastDate.getDay(); // 0 = ראשון, 6 = שבת
    const nextDay = new Date(lastDate);
    nextDay.setDate(nextDay.getDate() + 1);
    
    // אם היום האחרון היה שישי (5) והיום הנוכחי הוא ראשון (0)
    if (dayOfWeek === 5 && currentDate.getDay() === 0) {
      return true;
    }
    
    // אם היום האחרון היה שבת (6) והיום הנוכחי הוא ראשון (0)
    if (dayOfWeek === 6 && currentDate.getDay() === 0) {
      return true;
    }
    
    return false;
  }

  recordActivity() {
    console.log('📝 recordActivity: Recording activity...');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toDateString();
    
    const lastDate = this.userStats.lastActivityDate;

    if (lastDate !== todayStr) {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toDateString();

      if (lastDate === yesterdayStr) {
        // המשך רצף
        this.userStats.streak++;
        this.userStats.streakGraceUsed = false; // איפוס השימוש בפער
        console.log('🔥 recordActivity: Streak increased to', this.userStats.streak);
      } else {
        // התחלת רצף חדש
        this.userStats.streak = 1;
        this.userStats.streakGraceUsed = false;
        console.log('🔥 recordActivity: New streak started');
      }

      if (this.userStats.streak > this.userStats.longestStreak) {
        this.userStats.longestStreak = this.userStats.streak;
        console.log('🏆 recordActivity: New longest streak!', this.userStats.longestStreak);
      }

      this.userStats.lastActivityDate = todayStr;
      this.saveStats();
    }
  }

  // ==================== XP ורמות ====================

  addXP(amount, reason = '') {
    console.log(`✨ addXP: Adding ${amount} XP - ${reason}`);
    
    this.userStats.xp += amount;
    this.userStats.totalXP += amount;

    const xpForNextLevel = this.getXPForLevel(this.userStats.level + 1);
    
    if (this.userStats.xp >= xpForNextLevel) {
      this.levelUp();
    }

    this.saveStats();
    this.updateUI();

    notifications.showInAppNotification(`+${amount} XP ${reason ? '- ' + reason : ''}`, 'success');
  }

  getXPForLevel(level) {
    return Math.floor(100 * Math.pow(level, 1.5));
  }

  levelUp() {
    this.userStats.level++;
    this.userStats.xp = 0;
    
    console.log('🎉 levelUp: Level up to', this.userStats.level);

    this.showLevelUpAnimation();

    notifications.showInAppNotification(
      `🎉 עלית לרמה ${this.userStats.level}! 🎊`,
      'success'
    );

    this.saveStats();
  }

  showLevelUpAnimation() {
    const animation = document.createElement('div');
    animation.className = 'level-up-animation';
    animation.innerHTML = `
      <div class="level-up-content">
        <h1>🎉 LEVEL UP! 🎉</h1>
        <div class="level-up-number">${this.userStats.level}</div>
        <p>כל הכבוד! המשך כך!</p>
      </div>
    `;
    
    document.body.appendChild(animation);
    
    setTimeout(() => {
      animation.style.animation = 'fadeOut 0.5s ease-out';
      setTimeout(() => {
        document.body.removeChild(animation);
      }, 500);
    }, 3000);
  }

  // ==================== הישגים ====================

  checkAchievements() {
    console.log('🏆 checkAchievements: Checking for new achievements...');
    
    let newAchievements = 0;
    
    for (const achievement of this.achievements) {
      if (this.unlockedAchievements.find(a => a.id === achievement.id)) {
        continue;
      }

      if (this.evaluateCondition(achievement.condition)) {
        this.unlockAchievement(achievement);
        newAchievements++;
      }
    }

    if (newAchievements > 0) {
      console.log(`✅ checkAchievements: Unlocked ${newAchievements} new achievements`);
    }
  }

  evaluateCondition(condition) {
    console.log('🔍 evaluateCondition: Evaluating:', condition);
    
    if (condition.type === 'custom') {
      // מטופל בנפרד
      return false;
    }
    
    const value = this.userStats[condition.type];
    
    switch (condition.operator) {
      case '>=':
        return value >= condition.value;
      case '>':
        return value > condition.value;
      case '==':
        return value == condition.value;
      case '<=':
        return value <= condition.value;
      case '<':
        return value < condition.value;
      default:
        return false;
    }
  }

  unlockAchievement(achievement) {
    console.log('🎊 unlockAchievement: Unlocking', achievement.name);
    
    this.unlockedAchievements.push({
      ...achievement,
      unlockedAt: new Date().toISOString()
    });

    this.addXP(achievement.xp, achievement.name);
    this.showAchievementNotification(achievement);
    this.saveStats();
  }

  showAchievementNotification(achievement) {
    const notification = document.createElement('div');
    notification.className = 'achievement-notification';
    notification.innerHTML = `
      <div class="achievement-notification-content">
        <div class="achievement-icon">${achievement.icon}</div>
        <div class="achievement-text">
          <h3>הישג חדש נפתח!</h3>
          <p><strong>${achievement.name}</strong></p>
          <p>${achievement.description}</p>
          <p class="achievement-xp">+${achievement.xp} XP</p>
        </div>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    this.playAchievementSound();
    
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.5s ease-out';
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 500);
    }, 5000);
  }

  playAchievementSound() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    const notes = [
      { freq: 523.25, time: 0 },
      { freq: 659.25, time: 0.15 },
      { freq: 783.99, time: 0.3 },
      { freq: 1046.50, time: 0.45 }
    ];

    notes.forEach(note => {
      setTimeout(() => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(note.freq, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
      }, note.time * 1000);
    });
  }

  // ==================== אירועים ====================

  onTaskCompleted(isEarly = false, tasksToday = 0) {
    console.log('✅ onTaskCompleted: Task completed');
    
    this.userStats.totalTasksCompleted++;
    this.recordActivity();
    
    this.addXP(10, 'השלמת משימה');

    if (isEarly) {
      this.addXP(5, 'בונוס מהירות');
    }

    // בדיקת הישגים מיוחדים
    const hour = new Date().getHours();
    
    const earlyBird = this.achievements.find(a => a.id === 'early-bird');
    if (hour < 8 && earlyBird && !this.unlockedAchievements.find(a => a.id === 'early-bird')) {
      this.unlockAchievement(earlyBird);
    }
    
    const nightOwl = this.achievements.find(a => a.id === 'night-owl');
    if (hour >= 22 && nightOwl && !this.unlockedAchievements.find(a => a.id === 'night-owl')) {
      this.unlockAchievement(nightOwl);
    }

    const speedDemon = this.achievements.find(a => a.id === 'speed-demon');
    if (tasksToday >= 5 && speedDemon && !this.unlockedAchievements.find(a => a.id === 'speed-demon')) {
      this.unlockAchievement(speedDemon);
    }

    this.checkAchievements();
    this.updateUI();
  }

  onPerfectDay() {
    console.log('✨ onPerfectDay: Perfect day achieved!');
    
    this.userStats.perfectDays++;
    this.addXP(50, 'יום מושלם');
    this.checkAchievements();
  }

  onStudyTimeAdded(minutes) {
    console.log(`⏰ onStudyTimeAdded: ${minutes} minutes of study`);
    
    this.userStats.totalStudyTime += minutes;
    this.addXP(Math.floor(minutes / 5), 'זמן לימוד');
    this.checkAchievements();
  }

  // ==================== ממשק משתמש ====================

  updateUI() {
    const levelEl = document.getElementById('user-level');
    if (levelEl) {
      levelEl.textContent = this.userStats.level;
    }

    const xpEl = document.getElementById('user-xp');
    if (xpEl) {
      const xpForNext = this.getXPForLevel(this.userStats.level + 1);
      xpEl.textContent = `${this.userStats.xp} / ${xpForNext}`;
    }

    const progressBar = document.getElementById('xp-progress');
    if (progressBar) {
      const xpForNext = this.getXPForLevel(this.userStats.level + 1);
      const progress = (this.userStats.xp / xpForNext) * 100;
      progressBar.style.width = `${progress}%`;
    }

    const streakEl = document.getElementById('user-streak');
    if (streakEl) {
      streakEl.textContent = this.userStats.streak;
    }
    
    // עדכון כותרת
    const headerLevel = document.getElementById('header-level');
    if (headerLevel) {
      headerLevel.textContent = this.userStats.level;
    }
    
    const headerXpText = document.getElementById('header-xp-text');
    if (headerXpText) {
      const xpForNext = this.getXPForLevel(this.userStats.level + 1);
      headerXpText.textContent = `${this.userStats.xp} / ${xpForNext} XP`;
    }
    
    const headerXpProgress = document.getElementById('header-xp-progress');
    if (headerXpProgress) {
      const xpForNext = this.getXPForLevel(this.userStats.level + 1);
      const progress = (this.userStats.xp / xpForNext) * 100;
      headerXpProgress.style.width = `${progress}%`;
    }
  }

  renderGamificationPanel() {
    console.log('🎨 renderGamificationPanel: Rendering panel...');
    
    const panel = document.getElementById('gamification-panel');
    if (!panel) {
      console.warn('⚠️ renderGamificationPanel: Panel not found');
      return;
    }

    const xpForNext = this.getXPForLevel(this.userStats.level + 1);
    const xpProgress = (this.userStats.xp / xpForNext) * 100;

    let achievementsHTML = '';
    
    Object.keys(this.achievementCategories).forEach(catKey => {
      const cat = this.achievementCategories[catKey];
      const catAchievements = this.achievements.filter(a => a.category === catKey);
      const unlocked = catAchievements.filter(a => 
        this.unlockedAchievements.find(u => u.id === a.id)
      ).length;

      achievementsHTML += `
        <div class="achievement-category">
          <h4>${cat.icon} ${cat.name} (${unlocked}/${catAchievements.length})</h4>
          <div class="achievements-grid">
            ${catAchievements.map(achievement => {
              const isUnlocked = this.unlockedAchievements.find(a => a.id === achievement.id);
              return `
                <div class="achievement-card ${isUnlocked ? 'unlocked' : 'locked'}">
                  <div class="achievement-icon">${achievement.icon}</div>
                  <div class="achievement-name">${achievement.name}</div>
                  <div class="achievement-desc">${achievement.description}</div>
                  <div class="achievement-xp">${achievement.xp} XP</div>
                  ${isUnlocked ? '<div class="achievement-unlocked">✓</div>' : ''}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    });

    panel.innerHTML = `
      <h2>🏆 הישגים ומשחוק</h2>
      
      <div class="gamification-stats">
        <div class="gamification-stat">
          <div class="stat-icon">🎯</div>
          <div class="stat-value" id="user-level">${this.userStats.level}</div>
          <div class="stat-label">רמה</div>
        </div>
        <div class="gamification-stat">
          <div class="stat-icon">⚡</div>
          <div class="stat-value" id="user-xp">${this.userStats.xp} / ${xpForNext}</div>
          <div class="stat-label">ניסיון</div>
        </div>
        <div class="gamification-stat">
          <div class="stat-icon">🔥</div>
          <div class="stat-value" id="user-streak">${this.userStats.streak}</div>
          <div class="stat-label">רצף ימים</div>
        </div>
        <div class="gamification-stat">
          <div class="stat-icon">🏅</div>
          <div class="stat-value">${this.unlockedAchievements.length}</div>
          <div class="stat-label">הישגים</div>
        </div>
      </div>

      <div class="xp-progress-container">
        <div class="xp-progress-bar">
          <div class="xp-progress-fill" id="xp-progress" style="width: ${xpProgress}%"></div>
        </div>
        <div class="xp-progress-text">
          ${xpForNext - this.userStats.xp} XP עד רמה ${this.userStats.level + 1}
        </div>
      </div>

      <div class="achievements-container">
        ${achievementsHTML}
      </div>
    `;

    console.log('✅ renderGamificationPanel: Panel rendered');
  }
}

// יצירת אובייקט גלובלי
console.log('🏆 Creating enhanced global gamification manager...');
const gamification = new EnhancedGamificationManager();
console.log('✅ Enhanced global gamification manager created');

// אתחול
window.addEventListener('DOMContentLoaded', async () => {
  console.log('🏆 gamification-enhanced.js: Initializing...');
  
  await gamification.initialize();
  await gamification.loadStats();
  
  const panel = document.getElementById('gamification-panel');
  if (panel) {
    gamification.renderGamificationPanel();
  }
  
  gamification.updateUI();
  console.log('✅ gamification-enhanced.js: Initialized');
});

console.log('✅ gamification-enhanced.js: Loaded');
