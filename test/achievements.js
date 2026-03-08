// Achievements & Gamification System - מערכת הישגים וגיימיפיקציה
class AchievementsManager {
  constructor() {
    this.achievements = [
      // 🎯 הישגי השלמה
      {
        id: 'first_task',
        name: 'צעד ראשון',
        description: 'השלמת המשימה הראשונה שלך',
        icon: '🎯',
        points: 10,
        category: 'completion',
        condition: (stats) => stats.completed >= 1
      },
      {
        id: 'task_master_10',
        name: 'מאסטר משימות',
        description: 'השלמת 10 משימות',
        icon: '⭐',
        points: 50,
        category: 'completion',
        condition: (stats) => stats.completed >= 10
      },
      {
        id: 'task_master_50',
        name: 'גיבור על',
        description: 'השלמת 50 משימות',
        icon: '🦸',
        points: 200,
        category: 'completion',
        condition: (stats) => stats.completed >= 50
      },
      {
        id: 'task_master_100',
        name: 'אגדה',
        description: 'השלמת 100 משימות',
        icon: '👑',
        points: 500,
        category: 'completion',
        condition: (stats) => stats.completed >= 100
      },

      // 🔥 הישגי רצף (Streak)
      {
        id: 'streak_3',
        name: 'מתחמם',
        description: '3 ימים רצופים של השלמת משימות',
        icon: '🔥',
        points: 30,
        category: 'streak',
        condition: (stats) => stats.currentStreak >= 3
      },
      {
        id: 'streak_7',
        name: 'שבוע מושלם',
        description: '7 ימים רצופים של השלמת משימות',
        icon: '💪',
        points: 100,
        category: 'streak',
        condition: (stats) => stats.currentStreak >= 7
      },
      {
        id: 'streak_30',
        name: 'מכונת הישגים',
        description: '30 ימים רצופים של השלמת משימות',
        icon: '🏆',
        points: 500,
        category: 'streak',
        condition: (stats) => stats.currentStreak >= 30
      },

      // ⏰ הישגי דחיפות
      {
        id: 'no_overdue',
        name: 'לא נופלים מאחור',
        description: 'אין לך משימות באיחור',
        icon: '✅',
        points: 20,
        category: 'urgency',
        condition: (stats) => stats.overdue === 0 && stats.total > 0
      },
      {
        id: 'early_bird',
        name: 'ציפור מוקדמת',
        description: 'השלמת 10 משימות לפני המועד',
        icon: '🐦',
        points: 75,
        category: 'urgency',
        condition: (stats) => stats.earlyCompletions >= 10
      },

      // 📚 הישגי מקצועות
      {
        id: 'multi_subject',
        name: 'רב תחומי',
        description: 'משימות ב-3 מקצועות שונים או יותר',
        icon: '📚',
        points: 40,
        category: 'subjects',
        condition: (stats) => stats.subjectsCount >= 3
      },
      {
        id: 'subject_master',
        name: 'אמן מקצוע',
        description: '20 משימות באותו מקצוע',
        icon: '🎓',
        points: 100,
        category: 'subjects',
        condition: (stats) => stats.maxSubjectTasks >= 20
      },

      // 🌟 הישגי מיוחדים
      {
        id: 'perfectionist',
        name: 'פרפקציוניסט',
        description: '100% השלמה - כל המשימות הושלמו',
        icon: '💯',
        points: 150,
        category: 'special',
        condition: (stats) => stats.completionRate === 100 && stats.total >= 5
      },
      {
        id: 'organized',
        name: 'מאורגן',
        description: 'שימוש ב-5 תגיות שונות',
        icon: '🏷️',
        points: 50,
        category: 'special',
        condition: (stats) => stats.tagsUsed >= 5
      },
      {
        id: 'night_owl',
        name: 'ינשוף לילה',
        description: 'השלמת משימה בשעה 22:00-06:00',
        icon: '🦉',
        points: 25,
        category: 'special',
        condition: (stats) => stats.nightCompletions >= 1
      },
      {
        id: 'speed_demon',
        name: 'שד המהירות',
        description: 'השלמת 5 משימות ביום אחד',
        icon: '⚡',
        points: 75,
        category: 'special',
        condition: (stats) => stats.maxDailyCompletions >= 5
      }
    ];

    this.userProgress = {
      points: 0,
      level: 1,
      unlockedAchievements: [],
      lastCompletionDate: null,
      currentStreak: 0,
      maxStreak: 0,
      earlyCompletions: 0,
      nightCompletions: 0,
      maxDailyCompletions: 0,
      dailyCompletions: {}
    };

    this.levels = [
      { level: 1, name: 'מתחיל', minPoints: 0, icon: '🌱' },
      { level: 2, name: 'תלמיד', minPoints: 100, icon: '📖' },
      { level: 3, name: 'סטודנט', minPoints: 300, icon: '🎓' },
      { level: 4, name: 'חכם', minPoints: 600, icon: '🧠' },
      { level: 5, name: 'מומחה', minPoints: 1000, icon: '⭐' },
      { level: 6, name: 'מאסטר', minPoints: 1500, icon: '🏆' },
      { level: 7, name: 'גאון', minPoints: 2500, icon: '💎' },
      { level: 8, name: 'אגדה', minPoints: 4000, icon: '👑' },
      { level: 9, name: 'מיתוס', minPoints: 6000, icon: '🌟' },
      { level: 10, name: 'אלמוות', minPoints: 10000, icon: '✨' }
    ];

    console.log('🏆 AchievementsManager: Initialized');
  }

  // טעינת התקדמות המשתמש
  async loadProgress() {
    console.log('📥 AchievementsManager: Loading user progress...');
    try {
      const savedProgress = await storage.get('homework-achievements');
      if (savedProgress) {
        this.userProgress = { ...this.userProgress, ...savedProgress };
        console.log('✅ AchievementsManager: Progress loaded:', this.userProgress);
      } else {
        console.log('⚠️ AchievementsManager: No saved progress found');
      }
    } catch (error) {
      console.error('❌ AchievementsManager: Error loading progress:', error);
    }
  }

  // שמירת התקדמות המשתמש
  async saveProgress() {
    console.log('💾 AchievementsManager: Saving user progress...');
    try {
      await storage.set('homework-achievements', this.userProgress);
      console.log('✅ AchievementsManager: Progress saved');
    } catch (error) {
      console.error('❌ AchievementsManager: Error saving progress:', error);
    }
  }

  // חישוב סטטיסטיקות למשתמש
  calculateStats(homework, subjects, availableTags) {
    console.log('📊 AchievementsManager: Calculating stats...');
    
    const completed = homework.filter(h => h.completed);
    const overdue = homework.filter(h => !h.completed && getDaysUntilDue(h.dueDate) < 0);
    
    // מניין מקצועות ייחודיים
    const uniqueSubjects = [...new Set(homework.map(h => h.subject))];
    
    // מציאת מקצוע עם הכי הרבה משימות
    const subjectCounts = {};
    homework.forEach(h => {
      subjectCounts[h.subject] = (subjectCounts[h.subject] || 0) + 1;
    });
    const maxSubjectTasks = Math.max(...Object.values(subjectCounts), 0);
    
    // מניין תגיות בשימוש
    const usedTags = new Set();
    homework.forEach(h => {
      if (h.tags) h.tags.forEach(tag => usedTags.add(tag));
    });
    
    // אחוז השלמה
    const completionRate = homework.length > 0 
      ? Math.round((completed.length / homework.length) * 100) 
      : 0;

    const stats = {
      total: homework.length,
      completed: completed.length,
      pending: homework.filter(h => !h.completed).length,
      overdue: overdue.length,
      urgent: homework.filter(h => !h.completed && getDaysUntilDue(h.dueDate) <= 2 && getDaysUntilDue(h.dueDate) >= 0).length,
      subjectsCount: uniqueSubjects.length,
      maxSubjectTasks,
      tagsUsed: usedTags.size,
      completionRate,
      currentStreak: this.userProgress.currentStreak,
      maxStreak: this.userProgress.maxStreak,
      earlyCompletions: this.userProgress.earlyCompletions,
      nightCompletions: this.userProgress.nightCompletions,
      maxDailyCompletions: this.userProgress.maxDailyCompletions
    };
    
    console.log('📊 AchievementsManager: Stats calculated:', stats);
    return stats;
  }

  // בדיקת הישגים חדשים
  async checkAchievements(homework, subjects, availableTags) {
    console.log('🔍 AchievementsManager: Checking for new achievements...');
    
    const stats = this.calculateStats(homework, subjects, availableTags);
    const newAchievements = [];

    for (const achievement of this.achievements) {
      // בדיקה אם ההישג כבר נפתח
      if (this.userProgress.unlockedAchievements.includes(achievement.id)) {
        continue;
      }

      // בדיקת תנאי ההישג
      if (achievement.condition(stats)) {
        console.log('🎉 AchievementsManager: New achievement unlocked:', achievement.name);
        
        this.userProgress.unlockedAchievements.push(achievement.id);
        this.userProgress.points += achievement.points;
        newAchievements.push(achievement);

        // הצגת התראה
        this.showAchievementNotification(achievement);
      }
    }

    // עדכון רמה
    this.updateLevel();

    // שמירת התקדמות
    await this.saveProgress();

    console.log('✅ AchievementsManager: Check complete,', newAchievements.length, 'new achievements');
    return newAchievements;
  }

  // עדכון רמה
  updateLevel() {
    const oldLevel = this.userProgress.level;
    
    for (let i = this.levels.length - 1; i >= 0; i--) {
      if (this.userProgress.points >= this.levels[i].minPoints) {
        this.userProgress.level = this.levels[i].level;
        break;
      }
    }

    if (this.userProgress.level > oldLevel) {
      console.log('🎊 AchievementsManager: Level up!', oldLevel, '→', this.userProgress.level);
      this.showLevelUpNotification();
    }
  }

  // עדכון רצף (Streak)
  async updateStreak(completedToday) {
    console.log('🔥 AchievementsManager: Updating streak...');
    
    const today = new Date().toDateString();
    const lastCompletion = this.userProgress.lastCompletionDate 
      ? new Date(this.userProgress.lastCompletionDate).toDateString() 
      : null;

    if (completedToday) {
      // עדכון מניין יומי
      const dateKey = new Date().toISOString().split('T')[0];
      this.userProgress.dailyCompletions[dateKey] = (this.userProgress.dailyCompletions[dateKey] || 0) + 1;
      
      // עדכון מקסימום השלמות יומי
      const todayCompletions = this.userProgress.dailyCompletions[dateKey];
      if (todayCompletions > this.userProgress.maxDailyCompletions) {
        this.userProgress.maxDailyCompletions = todayCompletions;
      }

      if (lastCompletion === today) {
        // כבר השלמנו משימה היום
        console.log('📅 AchievementsManager: Already completed task today');
      } else {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toDateString();

        if (lastCompletion === yesterdayStr) {
          // המשך הרצף
          this.userProgress.currentStreak++;
          console.log('🔥 AchievementsManager: Streak continued:', this.userProgress.currentStreak);
        } else {
          // רצף חדש
          this.userProgress.currentStreak = 1;
          console.log('🆕 AchievementsManager: New streak started');
        }

        this.userProgress.lastCompletionDate = new Date().toISOString();
        
        // עדכון מקסימום רצף
        if (this.userProgress.currentStreak > this.userProgress.maxStreak) {
          this.userProgress.maxStreak = this.userProgress.currentStreak;
        }
      }
    }

    await this.saveProgress();
  }

  // עדכון השלמה מוקדמת
  async trackEarlyCompletion(dueDate) {
    const daysLeft = getDaysUntilDue(dueDate);
    if (daysLeft > 0) {
      this.userProgress.earlyCompletions++;
      console.log('🐦 AchievementsManager: Early completion tracked');
      await this.saveProgress();
    }
  }

  // עדכון השלמה לילית
  async trackNightCompletion() {
    const hour = new Date().getHours();
    if (hour >= 22 || hour < 6) {
      this.userProgress.nightCompletions++;
      console.log('🦉 AchievementsManager: Night completion tracked');
      await this.saveProgress();
    }
  }

  // הצגת התראת הישג
  showAchievementNotification(achievement) {
    console.log('🎉 AchievementsManager: Showing achievement notification:', achievement.name);
    
    const notification = document.createElement('div');
    notification.className = 'achievement-notification';
    notification.innerHTML = `
      <div class="achievement-content">
        <div class="achievement-icon">${achievement.icon}</div>
        <div class="achievement-info">
          <div class="achievement-title">הישג חדש!</div>
          <div class="achievement-name">${achievement.name}</div>
          <div class="achievement-desc">${achievement.description}</div>
          <div class="achievement-points">+${achievement.points} נקודות</div>
        </div>
      </div>
    `;

    document.body.appendChild(notification);

    // אנימציה
    setTimeout(() => {
      notification.classList.add('show');
    }, 100);

    // הסרה אחרי 5 שניות
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 500);
    }, 5000);
  }

  // הצגת התראת עליית רמה
  showLevelUpNotification() {
    const levelInfo = this.levels.find(l => l.level === this.userProgress.level);
    if (!levelInfo) return;

    console.log('🎊 AchievementsManager: Showing level up notification');
    
    notifications.showInAppNotification(
      `🎊 עלית לרמה ${levelInfo.level} - ${levelInfo.name} ${levelInfo.icon}`,
      'success'
    );
  }

  // רינדור דף הישגים
  renderAchievementsPage() {
    console.log('🎨 AchievementsManager: Rendering achievements page...');
    
    const levelInfo = this.levels.find(l => l.level === this.userProgress.level);
    const nextLevel = this.levels.find(l => l.level === this.userProgress.level + 1);
    const progressToNext = nextLevel 
      ? ((this.userProgress.points - levelInfo.minPoints) / (nextLevel.minPoints - levelInfo.minPoints)) * 100
      : 100;

    const categories = {
      completion: 'השלמה',
      streak: 'רצף',
      urgency: 'דחיפות',
      subjects: 'מקצועות',
      special: 'מיוחדים'
    };

    let html = `
      <div class="achievements-container">
        <div class="achievements-header">
          <div class="user-level-card">
            <div class="level-icon">${levelInfo.icon}</div>
            <div class="level-info">
              <h2>רמה ${this.userProgress.level} - ${levelInfo.name}</h2>
              <div class="level-points">${this.userProgress.points.toLocaleString()} נקודות</div>
              ${nextLevel ? `
                <div class="level-progress-bar">
                  <div class="level-progress-fill" style="width: ${progressToNext}%"></div>
                </div>
                <div class="level-progress-text">
                  ${Math.round(progressToNext)}% עד רמה ${nextLevel.level} (${(nextLevel.minPoints - this.userProgress.points).toLocaleString()} נקודות)
                </div>
              ` : `
                <div class="max-level">🏆 רמה מקסימלית!</div>
              `}
            </div>
          </div>

          <div class="streak-card">
            <div class="streak-icon">🔥</div>
            <div class="streak-info">
              <div class="streak-current">${this.userProgress.currentStreak} ימים</div>
              <div class="streak-label">רצף נוכחי</div>
              <div class="streak-max">שיא: ${this.userProgress.maxStreak} ימים</div>
            </div>
          </div>
        </div>

        <div class="achievements-stats">
          <div class="stat-badge">
            <div class="stat-value">${this.userProgress.unlockedAchievements.length}</div>
            <div class="stat-label">הישגים</div>
          </div>
          <div class="stat-badge">
            <div class="stat-value">${this.userProgress.earlyCompletions}</div>
            <div class="stat-label">השלמות מוקדמות</div>
          </div>
          <div class="stat-badge">
            <div class="stat-value">${this.userProgress.maxDailyCompletions}</div>
            <div class="stat-label">שיא יומי</div>
          </div>
        </div>

        <div class="achievements-grid">
    `;

    // הישגים לפי קטגוריה
    for (const [catId, catName] of Object.entries(categories)) {
      const catAchievements = this.achievements.filter(a => a.category === catId);
      
      html += `
        <div class="achievement-category">
          <h3>${catName}</h3>
          <div class="achievements-list">
      `;

      for (const achievement of catAchievements) {
        const unlocked = this.userProgress.unlockedAchievements.includes(achievement.id);
        
        html += `
          <div class="achievement-item ${unlocked ? 'unlocked' : 'locked'}">
            <div class="achievement-icon-large">${unlocked ? achievement.icon : '🔒'}</div>
            <div class="achievement-details">
              <div class="achievement-name">${achievement.name}</div>
              <div class="achievement-description">${achievement.description}</div>
              <div class="achievement-points-badge">${achievement.points} נקודות</div>
            </div>
            ${unlocked ? '<div class="achievement-check">✓</div>' : ''}
          </div>
        `;
      }

      html += `
          </div>
        </div>
      `;
    }

    html += `
        </div>
      </div>
    `;

    return html;
  }

  // קבלת מידע על רמה נוכחית
  getCurrentLevelInfo() {
    return this.levels.find(l => l.level === this.userProgress.level);
  }

  // קבלת אחוז התקדמות
  getProgressPercentage() {
    const levelInfo = this.levels.find(l => l.level === this.userProgress.level);
    const nextLevel = this.levels.find(l => l.level === this.userProgress.level + 1);
    
    if (!nextLevel) return 100;
    
    return ((this.userProgress.points - levelInfo.minPoints) / (nextLevel.minPoints - levelInfo.minPoints)) * 100;
  }
}

// יצירת אובייקט גלובלי
console.log('🏆 Creating global achievements manager...');
const achievementsManager = new AchievementsManager();
console.log('✅ Global achievements manager created');
