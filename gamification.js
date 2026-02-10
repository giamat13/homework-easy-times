// Gamification & Achievements Manager - מערכת משחוק והישגים
// ⭐ מערכת דינמית - תומכת בהסרת XP והישגים + יום מושלם דינמי!
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
      perfectDaysHistory: [] // ⭐ היסטוריית ימים מושלמים
    };

    this.achievements = [];
    this.unlockedAchievements = [];
    
    this.initializeAchievements();
    console.log('🏆 GamificationManager: Initialized');
  }

  // קוד ה-achievements והפונקציות האחרות נשארים כמו שהם...
  // (ממשיך מכאן)
  
  initializeAchievements() {
    this.achievements = [
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
        id: 'perfect-day-1',
        name: 'יום מושלם',
        description: 'השלם את כל המשימות של היום',
        icon: '✨',
        condition: (stats) => stats.perfectDays >= 1,
        xp: 50,
        category: 'perfect'
      }
      // ... שאר ההישגים
    ];
  }

  async loadStats() {
    console.log('📥 loadStats: Loading user stats...');
    try {
      const saved = await storage.get('gamification-stats');
      if (saved) {
        this.userStats = { ...this.userStats, ...saved };
        if (!this.userStats.perfectDaysHistory) {
          this.userStats.perfectDaysHistory = [];
        }
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

    if (notifications && notifications.showInAppNotification) {
      notifications.showInAppNotification(`+${amount} XP ${reason ? '- ' + reason : ''}`, 'success');
    }
  }

  removeXP(amount, reason = '') {
    console.log(`⏪ removeXP: Removing ${amount} XP - ${reason}`);
    
    this.userStats.xp -= amount;
    this.userStats.totalXP -= amount;

    if (this.userStats.xp < 0) {
      while (this.userStats.xp < 0 && this.userStats.level > 1) {
        this.levelDown();
      }
      
      if (this.userStats.xp < 0) {
        this.userStats.xp = 0;
      }
    }

    if (this.userStats.totalXP < 0) {
      this.userStats.totalXP = 0;
    }

    this.saveStats();
    this.updateUI();

    if (notifications && notifications.showInAppNotification) {
      notifications.showInAppNotification(`-${amount} XP ${reason ? '- ' + reason : ''}`, 'info');
    }
  }

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
    return Math.floor(100 * Math.pow(level, 1.5));
  }

  levelUp() {
    this.userStats.level++;
    this.userStats.xp = 0;
    
    console.log('🎉 levelUp: Level up to', this.userStats.level);

    this.showLevelUpAnimation();

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
        document.body.removeChild(animation);
      }, 500);
    }, 3000);
  }

  checkAchievements() {
    console.log('🏆 checkAchievements: Checking for new achievements...');
    
    let newAchievements = 0;
    
    for (const achievement of this.achievements) {
      if (this.unlockedAchievements.find(a => a.id === achievement.id)) {
        continue;
      }

      if (achievement.condition(this.userStats)) {
        this.unlockAchievement(achievement);
        newAchievements++;
      }
    }

    if (newAchievements > 0) {
      console.log(`✅ checkAchievements: Unlocked ${newAchievements} new achievements`);
    }
  }

  recheckAchievements() {
    console.log('🔄 recheckAchievements: Rechecking all achievements...');
    
    const achievementsToRemove = [];
    
    for (const unlockedAchievement of this.unlockedAchievements) {
      const achievement = this.achievements.find(a => a.id === unlockedAchievement.id);
      
      if (!achievement) continue;
      
      if (!achievement.condition(this.userStats)) {
        console.log(`⏪ recheckAchievements: Achievement "${achievement.name}" no longer valid`);
        achievementsToRemove.push(unlockedAchievement.id);
        
        this.removeXP(achievement.xp, `ביטול הישג: ${achievement.name}`);
      }
    }
    
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
    try {
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
    } catch (error) {
      console.error('❌ playAchievementSound: Error playing sound:', error);
    }
  }

  onTaskCompleted(isEarly = false, tasksToday = 0) {
    console.log('✅ onTaskCompleted: Task completed');
    
    this.userStats.totalTasksCompleted++;
    this.recordActivity();
    
    this.addXP(10, 'השלמת משימה');

    if (isEarly) {
      this.addXP(5, 'בונוס מהירות');
    }

    const hour = new Date().getHours();
    if (hour < 8 && !this.unlockedAchievements.find(a => a.id === 'early-bird')) {
      const achievement = this.achievements.find(a => a.id === 'early-bird');
      if (achievement) this.unlockAchievement(achievement);
    }
    
    if (hour >= 22 && !this.unlockedAchievements.find(a => a.id === 'night-owl')) {
      const achievement = this.achievements.find(a => a.id === 'night-owl');
      if (achievement) this.unlockAchievement(achievement);
    }

    if (tasksToday >= 5 && !this.unlockedAchievements.find(a => a.id === 'speed-demon')) {
      const achievement = this.achievements.find(a => a.id === 'speed-demon');
      if (achievement) this.unlockAchievement(achievement);
    }

    this.checkAchievements();
    this.updateUI();
  }

  // ⭐ הפונקציה החשובה - בדיקת יום מושלם דינמית!
  checkPerfectDay(isPerfect) {
    console.log('✨ checkPerfectDay: Checking perfect day status...', isPerfect);
    
    const today = new Date().toISOString().split('T')[0];
    const wasPerfectToday = this.userStats.perfectDaysHistory && 
                           this.userStats.perfectDaysHistory.includes(today);
    
    console.log(`✨ checkPerfectDay: Today: ${today}, Was perfect: ${wasPerfectToday}, Is perfect now: ${isPerfect}`);
    
    if (!this.userStats.perfectDaysHistory) {
      this.userStats.perfectDaysHistory = [];
    }
    
    // אם היום מושלם עכשיו ולא היה מושלם לפני כן
    if (isPerfect && !wasPerfectToday) {
      console.log('🎉 checkPerfectDay: NEW perfect day!');
      this.userStats.perfectDays++;
      this.userStats.perfectDaysHistory.push(today);
      this.addXP(50, 'יום מושלם');
      this.checkAchievements();
      this.saveStats();
      
      if (notifications && notifications.showInAppNotification) {
        notifications.showInAppNotification('🎉 יום מושלם! +50 XP', 'success');
      }
    }
    // אם היום היה מושלם ועכשיו הוא לא מושלם
    else if (!isPerfect && wasPerfectToday) {
      console.log('⏪ checkPerfectDay: Perfect day LOST!');
      this.userStats.perfectDays--;
      this.userStats.perfectDaysHistory = this.userStats.perfectDaysHistory.filter(d => d !== today);
      this.removeXP(50, 'ביטול יום מושלם');
      this.recheckAchievements();
      this.saveStats();
      
      if (notifications && notifications.showInAppNotification) {
        notifications.showInAppNotification('⏪ יום מושלם בוטל, -50 XP', 'info');
      }
    }
    else if (isPerfect && wasPerfectToday) {
      console.log('✅ checkPerfectDay: Still perfect (no change)');
    }
    else {
      console.log('⏸️ checkPerfectDay: Not perfect (no change)');
    }
  }

  onStudyTimeAdded(minutes) {
    console.log(`⏰ onStudyTimeAdded: ${minutes} minutes of study`);
    
    this.userStats.totalStudyTime += minutes;
    this.addXP(Math.floor(minutes / 5), 'זמן לימוד');
    this.checkAchievements();
  }

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

  renderGamificationPanel() {
    console.log('🎨 renderGamificationPanel: Rendering panel...');
    
    const panel = document.getElementById('gamification-panel');
    if (!panel) return;

    const xpForNext = this.getXPForLevel(this.userStats.level + 1);
    const xpProgress = (this.userStats.xp / xpForNext) * 100;

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
    `;
  }
}

console.log('🏆 Creating global gamification manager...');
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
