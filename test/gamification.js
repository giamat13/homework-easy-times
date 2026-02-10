// Gamification & Achievements Manager - מערכת משחוק והישגים
// ⭐ מערכת דינמית - תומכת בהסרת XP והישגים + יום מושלם חכם
class GamificationManager {
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
      perfectDayToday: null // ⭐ מעקב אחרי יום מושלם של היום
    };

    this.achievements = [];
    this.unlockedAchievements = [];
    
    this.initializeAchievements();
    console.log('🏆 GamificationManager: Initialized');
  }

  // ==================== אתחול ====================

  initializeAchievements() {
    this.achievements = [
      // 🎯 משימות
      {
        id: 'first-task',
        name: 'צעד ראשון',
        description: 'השלם את המשימה הראשונה שלך',
        icon: '🎯',
        condition: (stats) => stats.totalTasksCompleted >= 1,
        xp: 10,
        category: 'tasks'
      },
      {
        id: 'task-master-10',
        name: 'מתחיל מבטיח',
        description: 'השלם 10 משימות',
        icon: '⭐',
        condition: (stats) => stats.totalTasksCompleted >= 10,
        xp: 50,
        category: 'tasks'
      },
      {
        id: 'task-master-50',
        name: 'מומחה משימות',
        description: 'השלם 50 משימות',
        icon: '🌟',
        condition: (stats) => stats.totalTasksCompleted >= 50,
        xp: 200,
        category: 'tasks'
      },
      {
        id: 'task-master-100',
        name: 'אלוף המשימות',
        description: 'השלם 100 משימות',
        icon: '🏅',
        condition: (stats) => stats.totalTasksCompleted >= 100,
        xp: 500,
        category: 'tasks'
      },

      // 🔥 רצפים (Streaks)
      {
        id: 'streak-3',
        name: 'מתחמם',
        description: 'השלם משימות 3 ימים ברצף',
        icon: '🔥',
        condition: (stats) => stats.streak >= 3,
        xp: 30,
        category: 'streaks'
      },
      {
        id: 'streak-7',
        name: 'שבוע מושלם',
        description: 'השלם משימות 7 ימים ברצף',
        icon: '🔥🔥',
        condition: (stats) => stats.streak >= 7,
        xp: 100,
        category: 'streaks'
      },
      {
        id: 'streak-30',
        name: 'חודש של מצוינות',
        description: 'השלם משימות 30 ימים ברצף',
        icon: '🔥🔥🔥',
        condition: (stats) => stats.streak >= 30,
        xp: 500,
        category: 'streaks'
      },

      // ⏰ זמן לימוד
      {
        id: 'study-1h',
        name: 'שעה ראשונה',
        description: 'למד שעה אחת',
        icon: '⏰',
        condition: (stats) => stats.totalStudyTime >= 60,
        xp: 20,
        category: 'study'
      },
      {
        id: 'study-10h',
        name: 'סטודנט מסור',
        description: 'למד 10 שעות',
        icon: '📚',
        condition: (stats) => stats.totalStudyTime >= 600,
        xp: 100,
        category: 'study'
      },
      {
        id: 'study-50h',
        name: 'מלומד',
        description: 'למד 50 שעות',
        icon: '🎓',
        condition: (stats) => stats.totalStudyTime >= 3000,
        xp: 300,
        category: 'study'
      },
      {
        id: 'study-100h',
        name: 'חכם על',
        description: 'למד 100 שעות',
        icon: '🧠',
        condition: (stats) => stats.totalStudyTime >= 6000,
        xp: 1000,
        category: 'study'
      },

      // 🎯 ימים מושלמים
      {
        id: 'perfect-day-1',
        name: 'יום מושלם',
        description: 'השלם את כל המשימות של היום',
        icon: '✨',
        condition: (stats) => stats.perfectDays >= 1,
        xp: 50,
        category: 'perfect'
      },
      {
        id: 'perfect-day-7',
        name: 'שבוע מצטיין',
        description: '7 ימים מושלמים',
        icon: '⭐✨',
        condition: (stats) => stats.perfectDays >= 7,
        xp: 200,
        category: 'perfect'
      },
      {
        id: 'perfect-day-30',
        name: 'חודש של שלמות',
        description: '30 ימים מושלמים',
        icon: '🌟✨',
        condition: (stats) => stats.perfectDays >= 30,
        xp: 1000,
        category: 'perfect'
      },

      // 🏃 מהירות
      {
        id: 'early-bird',
        name: 'ציפור מוקדמת',
        description: 'השלם משימה לפני השעה 8:00',
        icon: '🌅',
        condition: () => false, // מיוחד - נבדק בזמן השלמת משימה
        xp: 25,
        category: 'special'
      },
      {
        id: 'night-owl',
        name: 'ינשוף לילה',
        description: 'השלם משימה אחרי 22:00',
        icon: '🦉',
        condition: () => false,
        xp: 25,
        category: 'special'
      },
      {
        id: 'speed-demon',
        name: 'שד המהירות',
        description: 'השלם 5 משימות ביום אחד',
        icon: '⚡',
        condition: () => false,
        xp: 75,
        category: 'special'
      },

      // 🎨 יצירתיות
      {
        id: 'color-master',
        name: 'אמן הצבעים',
        description: 'השתמש ב-10 צבעים שונים למקצועות',
        icon: '🎨',
        condition: () => false,
        xp: 50,
        category: 'creative'
      },
      {
        id: 'organizer',
        name: 'מאורגן מקצועי',
        description: 'צור 5 תגיות שונות',
        icon: '🏷️',
        condition: () => false,
        xp: 30,
        category: 'creative'
      },

      // 🌟 מיוחדים
      {
        id: 'comeback',
        name: 'חזרה מנצחת',
        description: 'חזור למערכת אחרי הפסקה של שבוע',
        icon: '💪',
        condition: () => false,
        xp: 100,
        category: 'special'
      },
      {
        id: 'zero-hero',
        name: 'גיבור האפס',
        description: 'השלם את כל המשימות הממתינות',
        icon: '🎊',
        condition: () => false,
        xp: 150,
        category: 'special'
      }
    ];

    console.log('🏆 initializeAchievements: Loaded', this.achievements.length, 'achievements');
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

      this.updateStreak();
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

  // ==================== רצף (Streak) ====================

  updateStreak() {
    console.log('🔥 updateStreak: Checking streak...');
    const today = new Date().toDateString();
    const lastDate = this.userStats.lastActivityDate;

    if (!lastDate) {
      console.log('🔥 updateStreak: No previous activity');
      return;
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    if (lastDate === yesterdayStr) {
      // המשך הרצף
      console.log('🔥 updateStreak: Streak continues');
    } else if (lastDate !== today) {
      // הרצף נשבר
      console.log('💔 updateStreak: Streak broken');
      this.userStats.streak = 0;
    }
  }

  recordActivity() {
    console.log('📝 recordActivity: Recording activity...');
    const today = new Date().toDateString();
    const lastDate = this.userStats.lastActivityDate;

    if (lastDate !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toDateString();

      if (lastDate === yesterdayStr) {
        // המשך רצף
        this.userStats.streak++;
        console.log('🔥 recordActivity: Streak increased to', this.userStats.streak);
      } else {
        // התחלת רצף חדש
        this.userStats.streak = 1;
        console.log('🔥 recordActivity: New streak started');
      }

      if (this.userStats.streak > this.userStats.longestStreak) {
        this.userStats.longestStreak = this.userStats.streak;
        console.log('🏆 recordActivity: New longest streak!', this.userStats.longestStreak);
      }

      this.userStats.lastActivityDate = today;
      this.saveStats();
    }
  }

  // ==================== XP ורמות ====================

  addXP(amount, reason = '') {
    console.log(`✨ addXP: Adding ${amount} XP - ${reason}`);
    
    this.userStats.xp += amount;
    this.userStats.totalXP += amount;

    // בדיקת עלייה ברמה
    const xpForNextLevel = this.getXPForLevel(this.userStats.level + 1);
    
    if (this.userStats.xp >= xpForNextLevel) {
      this.levelUp();
    }

    this.saveStats();
    this.updateUI();

    // הודעה
    if (notifications && notifications.showInAppNotification) {
      notifications.showInAppNotification(`+${amount} XP ${reason ? '- ' + reason : ''}`, 'success');
    }
  }

  // ⭐ פונקציה - הסרת XP
  removeXP(amount, reason = '') {
    console.log(`⏪ removeXP: Removing ${amount} XP - ${reason}`);
    
    this.userStats.xp -= amount;
    this.userStats.totalXP -= amount;

    // וידוא שלא נרד מתחת ל-0
    if (this.userStats.xp < 0) {
      // אם ה-XP נעשה שלילי, צריך לרדת ברמה
      while (this.userStats.xp < 0 && this.userStats.level > 1) {
        this.levelDown();
      }
      
      // וידוא שלא נרד מתחת ל-0 גם אחרי ירידה ברמה
      if (this.userStats.xp < 0) {
        this.userStats.xp = 0;
      }
    }

    if (this.userStats.totalXP < 0) {
      this.userStats.totalXP = 0;
    }

    this.saveStats();
    this.updateUI();

    // הודעה
    if (notifications && notifications.showInAppNotification) {
      notifications.showInAppNotification(`-${amount} XP ${reason ? '- ' + reason : ''}`, 'info');
    }
  }

  // ⭐ פונקציה - ירידה ברמה
  levelDown() {
    if (this.userStats.level <= 1) {
      this.userStats.level = 1;
      this.userStats.xp = 0;
      return;
    }

    this.userStats.level--;
    const xpForCurrentLevel = this.getXPForLevel(this.userStats.level + 1);
    this.userStats.xp += xpForCurrentLevel;
    
    console.log('⬇️ levelDown: Level decreased to', this.userStats.level);

    if (notifications && notifications.showInAppNotification) {
      notifications.showInAppNotification(`רמה ${this.userStats.level} 📉`, 'info');
    }

    this.saveStats();
  }

  getXPForLevel(level) {
    // נוסחה: 100 * level^1.5
    return Math.floor(100 * Math.pow(level, 1.5));
  }

  levelUp() {
    this.userStats.level++;
    this.userStats.xp = 0;
    
    console.log('🎉 levelUp: Level up to', this.userStats.level);

    // אפקט ויזואלי
    this.showLevelUpAnimation();

    // פרס
    const reward = this.userStats.level * 10;
    if (notifications && notifications.showInAppNotification) {
      notifications.showInAppNotification(
        `🎉 עלית לרמה ${this.userStats.level}! 🎊`,
        'success'
      );
    }

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
        if (document.body.contains(animation)) {
          document.body.removeChild(animation);
        }
      }, 500);
    }, 3000);
  }

  // ==================== הישגים ====================

  checkAchievements() {
    console.log('🏆 checkAchievements: Checking for new achievements...');
    
    let newAchievements = 0;
    
    for (const achievement of this.achievements) {
      // בדיקה אם כבר נפתח
      if (this.unlockedAchievements.find(a => a.id === achievement.id)) {
        continue;
      }

      // בדיקת תנאי
      if (achievement.condition(this.userStats)) {
        this.unlockAchievement(achievement);
        newAchievements++;
      }
    }

    if (newAchievements > 0) {
      console.log(`✅ checkAchievements: Unlocked ${newAchievements} new achievements`);
    }
  }

  // ⭐ פונקציה - בדיקה מחדש של הישגים (עשויה לבטל הישגים)
  recheckAchievements() {
    console.log('🔄 recheckAchievements: Rechecking all achievements...');
    
    const achievementsToRemove = [];
    
    // עבור על כל ההישגים שנפתחו
    for (const unlockedAchievement of this.unlockedAchievements) {
      const achievement = this.achievements.find(a => a.id === unlockedAchievement.id);
      
      if (!achievement) continue;
      
      // בדיקה אם התנאי עדיין מתקיים
      if (!achievement.condition(this.userStats)) {
        console.log(`⏪ recheckAchievements: Achievement "${achievement.name}" no longer valid`);
        achievementsToRemove.push(unlockedAchievement.id);
        
        // החזרת XP
        this.removeXP(achievement.xp, `ביטול הישג: ${achievement.name}`);
      }
    }
    
    // הסרת הישגים שלא תקפים יותר
    if (achievementsToRemove.length > 0) {
      this.unlockedAchievements = this.unlockedAchievements.filter(
        a => !achievementsToRemove.includes(a.id)
      );
      
      console.log(`✅ recheckAchievements: Removed ${achievementsToRemove.length} achievements`);
      
      if (notifications && notifications.showInAppNotification) {
        notifications.showInAppNotification(
          `⏪ ${achievementsToRemove.length} הישגים בוטלו`,
          'info'
        );
      }
      
      this.saveStats();
    }
  }

  unlockAchievement(achievement) {
    console.log('🎊 unlockAchievement: Unlocking', achievement.name);
    
    this.unlockedAchievements.push({
      ...achievement,
      unlockedAt: new Date().toISOString()
    });

    // הוספת XP
    this.addXP(achievement.xp, achievement.name);

    // הודעה
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
    
    // צליל
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
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // מלודיה של הישג
      const notes = [
        { freq: 523.25, time: 0 },    // C5
        { freq: 659.25, time: 0.15 },  // E5
        { freq: 783.99, time: 0.3 },   // G5
        { freq: 1046.50, time: 0.45 }  // C6
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
    } catch (error) {
      console.error('❌ playAchievementSound: Error playing sound:', error);
    }
  }

  // ==================== אירועים ====================

  onTaskCompleted(isEarly = false, tasksToday = 0) {
    console.log('✅ onTaskCompleted: Task completed');
    
    this.userStats.totalTasksCompleted++;
    this.recordActivity();
    
    // XP בסיסי
    this.addXP(10, 'השלמת משימה');

    // בונוס למשימה מוקדמת
    if (isEarly) {
      this.addXP(5, 'בונוס מהירות');
    }

    // בדיקת הישגים מיוחדים
    const hour = new Date().getHours();
    if (hour < 8 && !this.unlockedAchievements.find(a => a.id === 'early-bird')) {
      this.unlockAchievement(this.achievements.find(a => a.id === 'early-bird'));
    }
    
    if (hour >= 22 && !this.unlockedAchievements.find(a => a.id === 'night-owl')) {
      this.unlockAchievement(this.achievements.find(a => a.id === 'night-owl'));
    }

    if (tasksToday >= 5 && !this.unlockedAchievements.find(a => a.id === 'speed-demon')) {
      this.unlockAchievement(this.achievements.find(a => a.id === 'speed-demon'));
    }

    this.checkAchievements();
    this.updateUI();
  }

  onStudyTimeAdded(minutes) {
    console.log(`⏰ onStudyTimeAdded: ${minutes} minutes of study`);
    
    this.userStats.totalStudyTime += minutes;
    this.addXP(Math.floor(minutes / 5), 'זמן לימוד');
    this.checkAchievements();
  }

  // ==================== ממשק משתמש ====================

  updateUI() {
    // עדכון רמה ו-XP
    const levelEl = document.getElementById('user-level');
    if (levelEl) {
      levelEl.textContent = this.userStats.level;
    }

    const xpEl = document.getElementById('user-xp');
    if (xpEl) {
      const xpForNext = this.getXPForLevel(this.userStats.level + 1);
      xpEl.textContent = `${this.userStats.xp} / ${xpForNext}`;
    }

    // פרוגרס בר
    const progressBar = document.getElementById('xp-progress');
    if (progressBar) {
      const xpForNext = this.getXPForLevel(this.userStats.level + 1);
      const progress = (this.userStats.xp / xpForNext) * 100;
      progressBar.style.width = `${progress}%`;
    }

    // רצף
    const streakEl = document.getElementById('user-streak');
    if (streakEl) {
      streakEl.textContent = this.userStats.streak;
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

    const categories = {
      tasks: { name: 'משימות', icon: '🎯' },
      streaks: { name: 'רצפים', icon: '🔥' },
      study: { name: 'לימוד', icon: '📚' },
      perfect: { name: 'ימים מושלמים', icon: '✨' },
      special: { name: 'מיוחדים', icon: '🌟' },
      creative: { name: 'יצירתיות', icon: '🎨' }
    };

    let achievementsHTML = '';
    
    Object.keys(categories).forEach(catKey => {
      const cat = categories[catKey];
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
console.log('🏆 Creating global gamification manager...');
const gamification = new GamificationManager();
console.log('✅ Global gamification manager created');

// אתחול
window.addEventListener('DOMContentLoaded', async () => {
  console.log('🏆 gamification.js: Initializing...');
  await gamification.loadStats();
  
  const panel = document.getElementById('gamification-panel');
  if (panel) {
    gamification.renderGamificationPanel();
  }
  
  gamification.updateUI();
  console.log('✅ gamification.js: Initialized');
});
