// Achievements & Gamification System - מערכת הישגים וגיימיפיקציה
class AchievementsManager {
  constructor(achievementsData) {
    // load achievements from external JSON data
    if (achievementsData && achievementsData.achievements) {
      // build conditions from JSON definitions
      this.achievements = achievementsData.achievements.map(ach => ({
        ...ach,
        condition: (stats) => this._evaluateCondition(ach, stats)
      }));
      this.levels = achievementsData.levels || [];
    } else {
      this.achievements = [];
      this.levels = [];
      console.warn('⚠️ AchievementsManager: No achievements data provided');
    }

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

    console.log('🏆 AchievementsManager: Initialized with', this.achievements.length, 'achievements');
  }

  // evaluate achievement conditions based on stats
  _evaluateCondition(achievement, stats) {
    const target = achievement.target || 1;
    
    // completion category
    if (achievement.category === 'completion') {
      if (achievement.id === 'first_task') return stats.completed >= target;
      if (achievement.id === 'task_master_10') return stats.completed >= target;
      if (achievement.id === 'task_master_50') return stats.completed >= target;
      if (achievement.id === 'task_master_100') return stats.completed >= target;
    }
    // streak category
    if (achievement.category === 'streak') {
      if (achievement.id === 'streak_3') return stats.currentStreak >= target;
      if (achievement.id === 'streak_7') return stats.currentStreak >= target;
      if (achievement.id === 'streak_30') return stats.currentStreak >= target;
    }
    // urgency category
    if (achievement.category === 'urgency') {
      if (achievement.id === 'no_overdue') return stats.overdue === 0 && stats.total > 0;
      if (achievement.id === 'early_bird') return stats.earlyCompletions >= target;
    }
    // subjects category
    if (achievement.category === 'subjects') {
      if (achievement.id === 'multi_subject') return (stats.subjectsCount || 0) >= target;
      if (achievement.id === 'subject_master') return (stats.maxSubjectTasks || 0) >= target;
    }
    // special category
    if (achievement.category === 'special') {
      if (achievement.id === 'perfectionist') return (stats.completionRate || 0) === 100 && stats.total >= 5;
      if (achievement.id === 'organized') return (stats.tagsUsed || 0) >= target;
      if (achievement.id === 'night_owl') return (stats.nightCompletions || 0) >= target;
      if (achievement.id === 'speed_demon') return (stats.maxDailyCompletions || 0) >= target;
    }
    return false;
  }

  // get progress for an achievement
  _getProgress(achievement, stats) {
    const target = achievement.target || 1;
    
    // completion - based on completed tasks
    if (achievement.category === 'completion') {
      return Math.min(stats.completed, target);
    }
    // streak - based on current streak
    if (achievement.category === 'streak') {
      return Math.min(stats.currentStreak, target);
    }
    // urgency - based on early completions or no overdue tasks
    if (achievement.id === 'early_bird') {
      return Math.min(stats.earlyCompletions, target);
    }
    if (achievement.id === 'no_overdue') {
      return stats.overdue === 0 && stats.total > 0 ? target : 0;
    }
    // subjects - based on count or max tasks per subject
    if (achievement.id === 'multi_subject') {
      return Math.min(stats.subjectsCount || 0, target);
    }
    if (achievement.id === 'subject_master') {
      return Math.min(stats.maxSubjectTasks || 0, target);
    }
    // special achievements
    if (achievement.id === 'perfectionist') {
      return stats.completionRate || 0;
    }
    if (achievement.id === 'organized') {
      return Math.min(stats.tagsUsed || 0, target);
    }
    if (achievement.id === 'night_owl') {
      return Math.min(stats.nightCompletions || 0, target);
    }
    if (achievement.id === 'speed_demon') {
      return Math.min(stats.maxDailyCompletions || 0, target);
    }
    
    return 0;
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
        const target = achievement.target || 1;
        const targetLabel = achievement.targetLabel || 'משימות';
        
        // Calculate progress for this achievement
        let progressText = '';
        let progressPercent = 0;
        
        if (achievement.category === 'completion') {
          const progress = Math.min(this.userProgress.points ? Math.floor(this.userProgress.points / 10) : 0, target);
          progressPercent = Math.round((progress / target) * 100);
          progressText = `השלמתי ${progress} מתוך ${target} ${targetLabel}`;
        } else if (achievement.category === 'streak') {
          const progress = this.userProgress.currentStreak;
          progressPercent = Math.round((progress / target) * 100);
          progressText = `${progress}/${target} ${targetLabel}`;
        } else if (achievement.category === 'urgency') {
          if (achievement.id === 'no_overdue') {
            progressPercent = this.userProgress.points ? 100 : 0;
            progressText = `אין משימות באיחור`;
          } else if (achievement.id === 'early_bird') {
            progressPercent = Math.round((this.userProgress.earlyCompletions / target) * 100);
            progressText = `${this.userProgress.earlyCompletions}/${target} ${targetLabel}`;
          }
        } else if (achievement.category === 'subjects') {
          progressPercent = 50; // placeholder
          progressText = `${target} ${targetLabel}`;
        } else if (achievement.category === 'special') {
          if (achievement.id === 'perfectionist') {
            progressPercent = this.userProgress.points ? 100 : 0;
            progressText = `100% השלמה`;
          } else if (achievement.id === 'organized') {
            progressPercent = 50; // placeholder for tags
            progressText = `${target} ${targetLabel}`;
          } else if (achievement.id === 'night_owl') {
            progressPercent = this.userProgress.nightCompletions ? 100 : 0;
            progressText = `${this.userProgress.nightCompletions}/${target} ${targetLabel}`;
          } else if (achievement.id === 'speed_demon') {
            progressPercent = Math.round((this.userProgress.maxDailyCompletions / target) * 100);
            progressText = `${this.userProgress.maxDailyCompletions}/${target} ${targetLabel}`;
          }
        }
        
        html += `
          <div class="achievement-item ${unlocked ? 'unlocked' : 'locked'}">
            <div class="achievement-icon-large">${unlocked ? achievement.icon : '🔒'}</div>
            <div class="achievement-details">
              <div class="achievement-name">${achievement.name}</div>
              <div class="achievement-description">${achievement.description}</div>
              <div class="achievement-progress-section">
                <div class="achievement-progress-text">${progressText}</div>
                <div class="achievement-progress-bar">
                  <div class="achievement-progress-fill" style="width: ${progressPercent}%"></div>
                </div>
                <div class="achievement-progress-percent">${progressPercent}%</div>
              </div>
              <div class="achievement-points-badge">
                <span class="points-icon">⭐</span> ${achievement.points} XP
              </div>
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
let achievementsManager = null;

// טעינה של נתונים מ-JSON חיצוני
async function initAchievementsManager() {
  try {
    const response = await fetch('./achievements.json');
    if (!response.ok) throw new Error(`Failed to load achievements.json: ${response.statusText}`);
    
    const achievementsData = await response.json();
    achievementsManager = new AchievementsManager(achievementsData);
    console.log('✅ Global achievements manager created with data from achievements.json');
    return achievementsManager;
  } catch (error) {
    console.error('❌ Error loading achievements data:', error);
    // Fallback: create with empty data if JSON fails
    achievementsManager = new AchievementsManager({
      achievements: [],
      levels: []
    });
    console.warn('⚠️ Initialized achievements manager with empty data');
    return achievementsManager;
  }
}

// קריאה אתחול
initAchievementsManager();
