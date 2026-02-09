// Gamification & Achievements Manager - מערכת משחוק והישגים (גרסה מתוקנת)
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
      perfectDayDate: null // תאריך של יום מושלם אחרון
    };

    this.achievements = [];
    this.unlockedAchievements = []; // פורמט: {id, unlockedAt, timesUnlocked}
    
    this.initializeAchievements();
    console.log('🏆 GamificationManager: Initialized');
  }

  // ==================== אתחול ====================

  async initializeAchievements() {
    console.log('🏆 initializeAchievements: Loading achievements from JSON...');
    
    try {
      // ניסיון לטעון מ-JSON
      const response = await fetch('achievements.json');
      if (response.ok) {
        const data = await response.json();
        this.achievements = data.achievements;
        console.log('✅ initializeAchievements: Loaded from JSON:', this.achievements.length, 'achievements');
        return;
      }
    } catch (error) {
      console.warn('⚠️ initializeAchievements: Could not load JSON, using fallback');
    }
    
    // Fallback - הגדרה ידנית
    this.achievements = [
      // 🎯 משימות
      {
        id: 'first-task',
        name: 'צעד ראשון',
        description: 'השלם את המשימה הראשונה שלך',
        icon: '🎯',
        xp: 10,
        category: 'tasks',
        maxUnlocks: 1,
        condition: { type: 'totalTasksCompleted', value: 1 }
      },
      {
        id: 'task-master-10',
        name: 'מתחיל מבטיח',
        description: 'השלם 10 משימות',
        icon: '⭐',
        xp: 50,
        category: 'tasks',
        maxUnlocks: 1,
        condition: { type: 'totalTasksCompleted', value: 10 }
      },
      {
        id: 'task-master-50',
        name: 'מומחה משימות',
        description: 'השלם 50 משימות',
        icon: '🌟',
        xp: 200,
        category: 'tasks',
        maxUnlocks: 1,
        condition: { type: 'totalTasksCompleted', value: 50 }
      },
      {
        id: 'task-master-100',
        name: 'אלוף המשימות',
        description: 'השלם 100 משימות',
        icon: '🏅',
        xp: 500,
        category: 'tasks',
        maxUnlocks: 1,
        condition: { type: 'totalTasksCompleted', value: 100 }
      },

      // 🔥 רצפים (Streaks) - ניתנים להשגה מרובה
      {
        id: 'streak-3',
        name: 'מתחמם',
        description: 'השלם משימות 3 ימים ברצף',
        icon: '🔥',
        xp: 30,
        category: 'streaks',
        maxUnlocks: 'infinity',
        condition: { type: 'streak', value: 3 }
      },
      {
        id: 'streak-7',
        name: 'שבוע מושלם',
        description: 'השלם משימות 7 ימים ברצף',
        icon: '🔥🔥',
        xp: 100,
        category: 'streaks',
        maxUnlocks: 'infinity',
        condition: { type: 'streak', value: 7 }
      },
      {
        id: 'streak-30',
        name: 'חודש של מצוינות',
        description: 'השלם משימות 30 ימים ברצף',
        icon: '🔥🔥🔥',
        xp: 500,
        category: 'streaks',
        maxUnlocks: 'infinity',
        condition: { type: 'streak', value: 30 }
      },

      // ⏰ זמן לימוד
      {
        id: 'study-1h',
        name: 'שעה ראשונה',
        description: 'למד שעה אחת',
        icon: '⏰',
        xp: 20,
        category: 'study',
        maxUnlocks: 1,
        condition: { type: 'totalStudyTime', value: 60 }
      },
      {
        id: 'study-10h',
        name: 'סטודנט מסור',
        description: 'למד 10 שעות',
        icon: '📚',
        xp: 100,
        category: 'study',
        maxUnlocks: 1,
        condition: { type: 'totalStudyTime', value: 600 }
      },
      {
        id: 'study-50h',
        name: 'מלומד',
        description: 'למד 50 שעות',
        icon: '🎓',
        xp: 300,
        category: 'study',
        maxUnlocks: 1,
        condition: { type: 'totalStudyTime', value: 3000 }
      },
      {
        id: 'study-100h',
        name: 'חכם על',
        description: 'למד 100 שעות',
        icon: '🧠',
        xp: 1000,
        category: 'study',
        maxUnlocks: 1,
        condition: { type: 'totalStudyTime', value: 6000 }
      },

      // 🎯 ימים מושלמים - ניתן להשגה מרובה
      {
        id: 'perfect-day-1',
        name: 'יום מושלם',
        description: 'השלם את כל המשימות של היום',
        icon: '✨',
        xp: 50,
        category: 'perfect',
        maxUnlocks: 'infinity',
        condition: { type: 'perfectDays', value: 1 }
      },
      {
        id: 'perfect-day-7',
        name: 'שבוע מצטיין',
        description: '7 ימים מושלמים',
        icon: '⭐✨',
        xp: 200,
        category: 'perfect',
        maxUnlocks: 1,
        condition: { type: 'perfectDays', value: 7 }
      },
      {
        id: 'perfect-day-30',
        name: 'חודש של שלמות',
        description: '30 ימים מושלמים',
        icon: '🌟✨',
        xp: 1000,
        category: 'perfect',
        maxUnlocks: 1,
        condition: { type: 'perfectDays', value: 30 }
      },

      // 🏃 מיוחדים - ניתנים להשגה מרובה
      {
        id: 'early-bird',
        name: 'ציפור מוקדמת',
        description: 'השלם משימה לפני השעה 8:00',
        icon: '🌅',
        xp: 25,
        category: 'special',
        maxUnlocks: 'infinity',
        condition: { type: 'special', check: 'earlyBird' }
      },
      {
        id: 'night-owl',
        name: 'ינשוף לילה',
        description: 'השלם משימה אחרי 22:00',
        icon: '🦉',
        xp: 25,
        category: 'special',
        maxUnlocks: 'infinity',
        condition: { type: 'special', check: 'nightOwl' }
      },
      {
        id: 'speed-demon',
        name: 'שד המהירות',
        description: 'השלם 5 משימות ביום אחד',
        icon: '⚡',
        xp: 75,
        category: 'special',
        maxUnlocks: 'infinity',
        condition: { type: 'special', check: 'speedDemon' }
      },

      // 🎨 יצירתיות
      {
        id: 'color-master',
        name: 'אמן הצבעים',
        description: 'השתמש ב-10 צבעים שונים למקצועות',
        icon: '🎨',
        xp: 50,
        category: 'creative',
        maxUnlocks: 1,
        condition: { type: 'special', check: 'colorMaster' }
      },
      {
        id: 'organizer',
        name: 'מאורגן מקצועי',
        description: 'צור 5 תגיות שונות',
        icon: '🏷️',
        xp: 30,
        category: 'creative',
        maxUnlocks: 1,
        condition: { type: 'special', check: 'organizer' }
      },

      // 🌟 מיוחדים נוספים
      {
        id: 'comeback',
        name: 'חזרה מנצחת',
        description: 'חזור למערכת אחרי הפסקה של שבוע',
        icon: '💪',
        xp: 100,
        category: 'special',
        maxUnlocks: 'infinity',
        condition: { type: 'special', check: 'comeback' }
      },
      {
        id: 'zero-hero',
        name: 'גיבור האפס',
        description: 'השלם את כל המשימות הממתינות',
        icon: '🎊',
        xp: 150,
        category: 'special',
        maxUnlocks: 'infinity',
        condition: { type: 'special', check: 'zeroHero' }
      }
    ];

    console.log('✅ initializeAchievements: Loaded', this.achievements.length, 'achievements');
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
    notifications.showInAppNotification(`+${amount} XP ${reason ? '- ' + reason : ''}`, 'success');
  }

  removeXP(amount, reason = '') {
    console.log(`⬇️ removeXP: Removing ${amount} XP - ${reason}`);
    
    this.userStats.xp = Math.max(0, this.userStats.xp - amount);
    this.userStats.totalXP = Math.max(0, this.userStats.totalXP - amount);

    this.saveStats();
    this.updateUI();

    notifications.showInAppNotification(`-${amount} XP ${reason ? '- ' + reason : ''}`, 'error');
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
      const unlockedEntry = this.unlockedAchievements.find(a => a.id === achievement.id);
      const timesUnlocked = unlockedEntry ? unlockedEntry.timesUnlocked : 0;
      
      // בדיקה אם ניתן עוד לפתוח
      if (achievement.maxUnlocks !== 'infinity' && timesUnlocked >= achievement.maxUnlocks) {
        continue; // כבר הושג המקסימום
      }

      // בדיקת תנאי
      if (this.checkAchievementCondition(achievement)) {
        this.unlockAchievement(achievement);
        newAchievements++;
      }
    }

    if (newAchievements > 0) {
      console.log(`✅ checkAchievements: Unlocked ${newAchievements} new achievements`);
    }
  }

  checkAchievementCondition(achievement) {
    const condition = achievement.condition;
    
    if (condition.type === 'totalTasksCompleted') {
      return this.userStats.totalTasksCompleted >= condition.value;
    }
    
    if (condition.type === 'streak') {
      return this.userStats.streak >= condition.value;
    }
    
    if (condition.type === 'totalStudyTime') {
      return this.userStats.totalStudyTime >= condition.value;
    }
    
    if (condition.type === 'perfectDays') {
      return this.userStats.perfectDays >= condition.value;
    }
    
    if (condition.type === 'special') {
      // הישגים מיוחדים נבדקים במקומות ספציפיים
      return false;
    }
    
    return false;
  }

  unlockAchievement(achievement) {
    console.log('🎊 unlockAchievement: Unlocking', achievement.name);
    
    // בדיקה אם כבר קיים
    const existingEntry = this.unlockedAchievements.find(a => a.id === achievement.id);
    
    if (existingEntry) {
      // עדכון ספירה
      existingEntry.timesUnlocked++;
      existingEntry.lastUnlockedAt = new Date().toISOString();
    } else {
      // יצירת רשומה חדשה
      this.unlockedAchievements.push({
        id: achievement.id,
        firstUnlockedAt: new Date().toISOString(),
        lastUnlockedAt: new Date().toISOString(),
        timesUnlocked: 1
      });
    }

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
    
    // ציפור מוקדמת
    if (hour < 8) {
      const earlyBird = this.achievements.find(a => a.id === 'early-bird');
      if (earlyBird) {
        this.unlockAchievement(earlyBird);
      }
    }
    
    // ינשוף לילה
    if (hour >= 22) {
      const nightOwl = this.achievements.find(a => a.id === 'night-owl');
      if (nightOwl) {
        this.unlockAchievement(nightOwl);
      }
    }

    // שד המהירות
    if (tasksToday >= 5) {
      const speedDemon = this.achievements.find(a => a.id === 'speed-demon');
      if (speedDemon) {
        this.unlockAchievement(speedDemon);
      }
    }

    this.checkAchievements();
    this.updateUI();
  }

  onTaskDeleted() {
    console.log('🗑️ onTaskDeleted: Task deleted');
    
    // הורדת ספירה
    if (this.userStats.totalTasksCompleted > 0) {
      this.userStats.totalTasksCompleted--;
    }
    
    // הורדת XP
    this.removeXP(10, 'ביטול משימה');
    
    this.saveStats();
    this.updateUI();
  }

  onPerfectDay() {
    console.log('✨ onPerfectDay: Perfect day achieved!');
    
    const today = new Date().toDateString();
    
    // בדיקה אם כבר קיבלנו היום
    if (this.userStats.perfectDayDate === today) {
      console.log('⏸️ onPerfectDay: Already awarded today');
      return;
    }
    
    this.userStats.perfectDays++;
    this.userStats.perfectDayDate = today;
    
    // פתיחת הישג יום מושלם
    const perfectDay = this.achievements.find(a => a.id === 'perfect-day-1');
    if (perfectDay) {
      this.unlockAchievement(perfectDay);
    }
    
    this.checkAchievements();
    this.saveStats();
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

  getAchievementProgress(achievement) {
    const condition = achievement.condition;
    let current = 0;
    let target = 0;
    
    if (condition.type === 'totalTasksCompleted') {
      current = this.userStats.totalTasksCompleted;
      target = condition.value;
    } else if (condition.type === 'streak') {
      current = this.userStats.streak;
      target = condition.value;
    } else if (condition.type === 'totalStudyTime') {
      current = this.userStats.totalStudyTime;
      target = condition.value;
    } else if (condition.type === 'perfectDays') {
      current = this.userStats.perfectDays;
      target = condition.value;
    }
    
    return { current, target };
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
      
      // ספירת הישגים שנפתחו לפחות פעם אחת
      const unlocked = catAchievements.filter(a => {
        const entry = this.unlockedAchievements.find(u => u.id === a.id);
        return entry && entry.timesUnlocked > 0;
      }).length;

      achievementsHTML += `
        <div class="achievement-category">
          <h4>${cat.icon} ${cat.name} (${unlocked}/${catAchievements.length})</h4>
          <div class="achievements-grid">
            ${catAchievements.map(achievement => {
              const unlockedEntry = this.unlockedAchievements.find(a => a.id === achievement.id);
              const isUnlocked = unlockedEntry && unlockedEntry.timesUnlocked > 0;
              const timesUnlocked = unlockedEntry ? unlockedEntry.timesUnlocked : 0;
              const progress = this.getAchievementProgress(achievement);
              
              let progressText = '';
              if (!isUnlocked && progress.target > 0) {
                const percentage = Math.min(100, (progress.current / progress.target) * 100).toFixed(0);
                progressText = `<div class="achievement-progress">${progress.current}/${progress.target} (${percentage}%)</div>`;
              }
              
              let unlockInfo = '';
              if (isUnlocked) {
                if (achievement.maxUnlocks === 'infinity') {
                  unlockInfo = `<div class="achievement-times">×${timesUnlocked}</div>`;
                } else if (achievement.maxUnlocks > 1) {
                  unlockInfo = `<div class="achievement-times">${timesUnlocked}/${achievement.maxUnlocks}</div>`;
                }
              }
              
              return `
                <div class="achievement-card ${isUnlocked ? 'unlocked' : 'locked'}">
                  <div class="achievement-icon">${achievement.icon}</div>
                  <div class="achievement-name">${achievement.name}</div>
                  <div class="achievement-desc">${achievement.description}</div>
                  ${progressText}
                  <div class="achievement-xp">${achievement.xp} XP</div>
                  ${isUnlocked ? '<div class="achievement-unlocked">✓</div>' : ''}
                  ${unlockInfo}
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
          <div class="stat-value">${this.unlockedAchievements.filter(a => a.timesUnlocked > 0).length}</div>
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
  await gamification.initializeAchievements();
  await gamification.loadStats();
  
  const panel = document.getElementById('gamification-panel');
  if (panel) {
    gamification.renderGamificationPanel();
  }
  
  gamification.updateUI();
  console.log('✅ gamification.js: Initialized');
});
