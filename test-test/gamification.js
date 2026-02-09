// Gamification & Achievements Manager - מערכת משחוק והישגים
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
      lastPerfectDayCheck: null // תיקון באג יום מושלם
    };

    this.achievements = [];
    this.unlockedAchievements = []; // מערך של { id, unlockedAt, count }
    
    this.initializeAchievements();
    console.log('🏆 GamificationManager: Initialized');
  }

  // ==================== אתחול ====================

  initializeAchievements() {
    this.achievements = [
      // 🎯 משימות - חד פעמיות
      {
        id: 'first-task',
        name: 'צעד ראשון',
        description: 'השלם את המשימה הראשונה שלך',
        icon: '🎯',
        condition: (stats) => stats.totalTasksCompleted >= 1,
        target: 1,
        current: (stats) => Math.min(stats.totalTasksCompleted, 1),
        xp: 10,
        category: 'tasks',
        repeatable: false,
        maxUnlocks: 1
      },
      {
        id: 'task-master-10',
        name: 'מתחיל מבטיח',
        description: 'השלם 10 משימות',
        icon: '⭐',
        condition: (stats) => stats.totalTasksCompleted >= 10,
        target: 10,
        current: (stats) => Math.min(stats.totalTasksCompleted, 10),
        xp: 50,
        category: 'tasks',
        repeatable: false,
        maxUnlocks: 1
      },
      {
        id: 'task-master-50',
        name: 'מומחה משימות',
        description: 'השלם 50 משימות',
        icon: '🌟',
        condition: (stats) => stats.totalTasksCompleted >= 50,
        target: 50,
        current: (stats) => Math.min(stats.totalTasksCompleted, 50),
        xp: 200,
        category: 'tasks',
        repeatable: false,
        maxUnlocks: 1
      },
      {
        id: 'task-master-100',
        name: 'אלוף המשימות',
        description: 'השלם 100 משימות',
        icon: '🏅',
        condition: (stats) => stats.totalTasksCompleted >= 100,
        target: 100,
        current: (stats) => Math.min(stats.totalTasksCompleted, 100),
        xp: 500,
        category: 'tasks',
        repeatable: false,
        maxUnlocks: 1
      },

      // 🔥 רצפים
      {
        id: 'streak-3',
        name: 'מתחמם',
        description: 'השלם משימות 3 ימים ברצף',
        icon: '🔥',
        condition: (stats) => stats.streak >= 3,
        target: 3,
        current: (stats) => Math.min(stats.streak, 3),
        xp: 30,
        category: 'streaks',
        repeatable: false,
        maxUnlocks: 1
      },
      {
        id: 'streak-7',
        name: 'שבוע מושלם',
        description: 'השלם משימות 7 ימים ברצף',
        icon: '🔥🔥',
        condition: (stats) => stats.streak >= 7,
        target: 7,
        current: (stats) => Math.min(stats.streak, 7),
        xp: 100,
        category: 'streaks',
        repeatable: false,
        maxUnlocks: 1
      },
      {
        id: 'streak-30',
        name: 'חודש של מצוינות',
        description: 'השלם משימות 30 ימים ברצף',
        icon: '🔥🔥🔥',
        condition: (stats) => stats.streak >= 30,
        target: 30,
        current: (stats) => Math.min(stats.streak, 30),
        xp: 500,
        category: 'streaks',
        repeatable: false,
        maxUnlocks: 1
      },

      // ⏰ זמן לימוד
      {
        id: 'study-1h',
        name: 'שעה ראשונה',
        description: 'למד שעה אחת',
        icon: '⏰',
        condition: (stats) => stats.totalStudyTime >= 60,
        target: 60,
        current: (stats) => Math.min(stats.totalStudyTime, 60),
        xp: 20,
        category: 'study',
        repeatable: false,
        maxUnlocks: 1
      },
      {
        id: 'study-10h',
        name: 'סטודנט מסור',
        description: 'למד 10 שעות',
        icon: '📚',
        condition: (stats) => stats.totalStudyTime >= 600,
        target: 600,
        current: (stats) => Math.min(stats.totalStudyTime, 600),
        xp: 100,
        category: 'study',
        repeatable: false,
        maxUnlocks: 1
      },
      {
        id: 'study-50h',
        name: 'מלומד',
        description: 'למד 50 שעות',
        icon: '🎓',
        condition: (stats) => stats.totalStudyTime >= 3000,
        target: 3000,
        current: (stats) => Math.min(stats.totalStudyTime, 3000),
        xp: 300,
        category: 'study',
        repeatable: false,
        maxUnlocks: 1
      },
      {
        id: 'study-100h',
        name: 'חכם על',
        description: 'למד 100 שעות',
        icon: '🧠',
        condition: (stats) => stats.totalStudyTime >= 6000,
        target: 6000,
        current: (stats) => Math.min(stats.totalStudyTime, 6000),
        xp: 1000,
        category: 'study',
        repeatable: false,
        maxUnlocks: 1
      },

      // 🎯 ימים מושלמים - ניתנים לחזרה!
      {
        id: 'perfect-day',
        name: 'יום מושלם',
        description: 'השלם את כל המשימות של היום',
        icon: '✨',
        condition: (stats) => stats.perfectDays >= 1,
        target: 1,
        current: (stats) => stats.perfectDays,
        xp: 50,
        category: 'perfect',
        repeatable: true,
        maxUnlocks: Infinity // ניתן להשגה אינסוף פעמים
      },
      {
        id: 'perfect-week',
        name: 'שבוע מצטיין',
        description: '7 ימים מושלמים (סה"כ)',
        icon: '⭐✨',
        condition: (stats) => stats.perfectDays >= 7,
        target: 7,
        current: (stats) => Math.min(stats.perfectDays, 7),
        xp: 200,
        category: 'perfect',
        repeatable: false,
        maxUnlocks: 1
      },
      {
        id: 'perfect-month',
        name: 'חודש של שלמות',
        description: '30 ימים מושלמים (סה"כ)',
        icon: '🌟✨',
        condition: (stats) => stats.perfectDays >= 30,
        target: 30,
        current: (stats) => Math.min(stats.perfectDays, 30),
        xp: 1000,
        category: 'perfect',
        repeatable: false,
        maxUnlocks: 1
      },

      // 🏃 מהירות - חד פעמיות
      {
        id: 'early-bird',
        name: 'ציפור מוקדמת',
        description: 'השלם משימה לפני השעה 8:00',
        icon: '🌅',
        condition: () => false,
        target: 1,
        current: () => 0,
        xp: 25,
        category: 'special',
        repeatable: false,
        maxUnlocks: 1
      },
      {
        id: 'night-owl',
        name: 'ינשוף לילה',
        description: 'השלם משימה אחרי 22:00',
        icon: '🦉',
        condition: () => false,
        target: 1,
        current: () => 0,
        xp: 25,
        category: 'special',
        repeatable: false,
        maxUnlocks: 1
      },
      {
        id: 'speed-demon',
        name: 'שד המהירות',
        description: 'השלם 5 משימות ביום אחד',
        icon: '⚡',
        condition: () => false,
        target: 5,
        current: () => 0,
        xp: 75,
        category: 'special',
        repeatable: true,
        maxUnlocks: 10 // מקסימום 10 פעמים
      },

      // 🎨 יצירתיות
      {
        id: 'color-master',
        name: 'אמן הצבעים',
        description: 'השתמש ב-10 צבעים שונים למקצועות',
        icon: '🎨',
        condition: () => false,
        target: 10,
        current: () => 0,
        xp: 50,
        category: 'creative',
        repeatable: false,
        maxUnlocks: 1
      },
      {
        id: 'organizer',
        name: 'מאורגן מקצועי',
        description: 'צור 5 תגיות שונות',
        icon: '🏷️',
        condition: () => false,
        target: 5,
        current: () => 0,
        xp: 30,
        category: 'creative',
        repeatable: false,
        maxUnlocks: 1
      },

      // 🌟 מיוחדים
      {
        id: 'comeback',
        name: 'חזרה מנצחת',
        description: 'חזור למערכת אחרי הפסקה של שבוע',
        icon: '💪',
        condition: () => false,
        target: 1,
        current: () => 0,
        xp: 100,
        category: 'special',
        repeatable: true,
        maxUnlocks: 5 // מקסימום 5 פעמים
      },
      {
        id: 'zero-hero',
        name: 'גיבור האפס',
        description: 'השלם את כל המשימות הממתינות',
        icon: '🎊',
        condition: () => false,
        target: 1,
        current: () => 0,
        xp: 150,
        category: 'special',
        repeatable: true,
        maxUnlocks: Infinity
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
      console.log('🔥 updateStreak: Streak continues');
    } else if (lastDate !== today) {
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
        this.userStats.streak++;
        console.log('🔥 recordActivity: Streak increased to', this.userStats.streak);
      } else {
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

    const xpForNextLevel = this.getXPForLevel(this.userStats.level + 1);
    
    if (this.userStats.xp >= xpForNextLevel) {
      this.levelUp();
    }

    this.saveStats();
    this.updateUI();

    notifications.showInAppNotification(`+${amount} XP ${reason ? '- ' + reason : ''}`, 'success');
  }

  // תיקון באג: הסרת XP כשמבטלים משימה
  removeXP(amount, reason = '') {
    console.log(`➖ removeXP: Removing ${amount} XP - ${reason}`);
    
    this.userStats.xp = Math.max(0, this.userStats.xp - amount);
    this.userStats.totalXP = Math.max(0, this.userStats.totalXP - amount);

    // בדיקה אם צריך לרדת ברמה
    const xpForCurrentLevel = this.getXPForLevel(this.userStats.level);
    if (this.userStats.totalXP < xpForCurrentLevel && this.userStats.level > 1) {
      this.userStats.level--;
      this.userStats.xp = this.userStats.totalXP - this.getXPForLevel(this.userStats.level);
      console.log('📉 removeXP: Level decreased to', this.userStats.level);
    }

    this.saveStats();
    this.updateUI();

    notifications.showInAppNotification(`-${amount} XP ${reason ? '- ' + reason : ''}`, 'info');
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
      // בדיקה כמה פעמים כבר נפתח
      const unlocked = this.unlockedAchievements.filter(a => a.id === achievement.id);
      const unlockCount = unlocked.length;

      // אם הגענו למקסימום, דלג
      if (unlockCount >= achievement.maxUnlocks) {
        continue;
      }

      // בדיקת תנאי
      if (achievement.condition(this.userStats)) {
        // אם זה הישג חוזר, בדוק אם צריך לפתוח שוב
        if (achievement.repeatable) {
          // לדוגמה: יום מושלם - נפתח כל פעם שמשלימים יום
          this.unlockAchievement(achievement);
          newAchievements++;
        } else {
          // הישג חד פעמי - רק אם לא נפתח בכלל
          if (unlockCount === 0) {
            this.unlockAchievement(achievement);
            newAchievements++;
          }
        }
      }
    }

    if (newAchievements > 0) {
      console.log(`✅ checkAchievements: Unlocked ${newAchievements} new achievements`);
    }
  }

  unlockAchievement(achievement) {
    console.log('🎊 unlockAchievement: Unlocking', achievement.name);
    
    const unlockRecord = {
      id: achievement.id,
      name: achievement.name,
      icon: achievement.icon,
      description: achievement.description,
      xp: achievement.xp,
      category: achievement.category,
      unlockedAt: new Date().toISOString()
    };
    
    this.unlockedAchievements.push(unlockRecord);

    this.addXP(achievement.xp, achievement.name);

    this.showAchievementNotification(achievement);

    this.saveStats();
  }

  showAchievementNotification(achievement) {
    const unlockCount = this.unlockedAchievements.filter(a => a.id === achievement.id).length;
    const isRepeatable = achievement.repeatable;
    
    const notification = document.createElement('div');
    notification.className = 'achievement-notification';
    notification.innerHTML = `
      <div class="achievement-notification-content">
        <div class="achievement-icon">${achievement.icon}</div>
        <div class="achievement-text">
          <h3>הישג ${isRepeatable && unlockCount > 1 ? `(פעם ${unlockCount})` : 'חדש'} נפתח!</h3>
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
    if (hour < 8 && !this.unlockedAchievements.find(a => a.id === 'early-bird')) {
      this.unlockAchievement(this.achievements.find(a => a.id === 'early-bird'));
    }
    
    if (hour >= 22 && !this.unlockedAchievements.find(a => a.id === 'night-owl')) {
      this.unlockAchievement(this.achievements.find(a => a.id === 'night-owl'));
    }

    if (tasksToday >= 5) {
      const speedDemonUnlocks = this.unlockedAchievements.filter(a => a.id === 'speed-demon').length;
      const speedDemonAchievement = this.achievements.find(a => a.id === 'speed-demon');
      if (speedDemonUnlocks < speedDemonAchievement.maxUnlocks) {
        this.unlockAchievement(speedDemonAchievement);
      }
    }

    this.checkAchievements();
    this.updateUI();
  }

  // תיקון באג: הסרת XP כשמבטלים משימה
  onTaskUncompleted() {
    console.log('❌ onTaskUncompleted: Task uncompleted');
    
    this.userStats.totalTasksCompleted = Math.max(0, this.userStats.totalTasksCompleted - 1);
    this.removeXP(10, 'ביטול השלמת משימה');
    
    this.saveStats();
    this.updateUI();
  }

  // תיקון באג יום מושלם
  async onPerfectDay() {
    console.log('✨ onPerfectDay: Checking perfect day...');
    
    const today = new Date().toDateString();
    
    // אם כבר בדקנו היום, אל תבדוק שוב
    if (this.userStats.lastPerfectDayCheck === today) {
      console.log('⏸️ onPerfectDay: Already checked today');
      return;
    }

    // קבל את כל המשימות של היום
    const homework = await storage.get('homework-list') || [];
    const todayDate = new Date().toISOString().split('T')[0];
    const todayHomework = homework.filter(h => h.dueDate === todayDate);

    // אם אין משימות להיום, לא יום מושלם
    if (todayHomework.length === 0) {
      console.log('⏸️ onPerfectDay: No tasks for today');
      return;
    }

    // בדוק אם כולן הושלמו
    const allCompleted = todayHomework.every(h => h.completed);

    if (allCompleted) {
      this.userStats.perfectDays++;
      this.userStats.lastPerfectDayCheck = today;
      
      const perfectDayAchievement = this.achievements.find(a => a.id === 'perfect-day');
      this.unlockAchievement(perfectDayAchievement);
      
      this.saveStats();
      console.log('✅ onPerfectDay: Perfect day achieved!', this.userStats.perfectDays);
    } else {
      console.log('⏸️ onPerfectDay: Not all tasks completed');
    }
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
  }

  getAchievementProgress(achievement) {
    const unlockCount = this.unlockedAchievements.filter(a => a.id === achievement.id).length;
    const current = achievement.current(this.userStats);
    const target = achievement.target;
    const percentage = Math.min(100, Math.round((current / target) * 100));
    
    return {
      current,
      target,
      percentage,
      unlockCount,
      maxUnlocks: achievement.maxUnlocks,
      isMaxed: unlockCount >= achievement.maxUnlocks,
      isUnlocked: unlockCount > 0
    };
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
      const unlocked = catAchievements.filter(a => {
        const progress = this.getAchievementProgress(a);
        return progress.isUnlocked;
      }).length;

      achievementsHTML += `
        <div class="achievement-category">
          <h4>${cat.icon} ${cat.name} (${unlocked}/${catAchievements.length})</h4>
          <div class="achievements-grid">
            ${catAchievements.map(achievement => {
              const progress = this.getAchievementProgress(achievement);
              const isLocked = !progress.isUnlocked;
              const isMaxed = progress.isMaxed;
              
              return `
                <div class="achievement-card ${isLocked ? 'locked' : 'unlocked'} ${isMaxed ? 'maxed' : ''}">
                  <div class="achievement-icon">${achievement.icon}</div>
                  <div class="achievement-name">${achievement.name}</div>
                  <div class="achievement-desc">${achievement.description}</div>
                  
                  <!-- מד התקדמות -->
                  <div class="achievement-progress">
                    <div class="achievement-progress-bar">
                      <div class="achievement-progress-fill" style="width: ${progress.percentage}%"></div>
                    </div>
                    <div class="achievement-progress-text">
                      ${progress.current}/${progress.target} (${progress.percentage}%)
                    </div>
                  </div>
                  
                  <div class="achievement-xp">${achievement.xp} XP</div>
                  
                  ${achievement.repeatable ? `
                    <div class="achievement-repeatable">
                      🔄 חוזר: ${progress.unlockCount}/${achievement.maxUnlocks === Infinity ? '∞' : achievement.maxUnlocks}
                    </div>
                  ` : ''}
                  
                  ${progress.isUnlocked ? '<div class="achievement-unlocked">✓</div>' : ''}
                  ${isMaxed && achievement.repeatable ? '<div class="achievement-maxed">MAX</div>' : ''}
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
          <div class="stat-label">הישגים נפתחו</div>
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

const gamification = new GamificationManager();
console.log('✅ Global gamification manager created');

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
