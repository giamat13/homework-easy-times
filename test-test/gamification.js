// Gamification & Achievements Manager - מנהל הישגים וגיימיפיקציה
class GamificationManager {
  constructor() {
    this.achievements = this.loadAchievements();
    this.userLevel = this.calculateLevel();
    this.userPoints = this.calculatePoints();
    console.log('🏆 GamificationManager: Initialized');
  }

  // טעינת הישגים
  loadAchievements() {
    return {
      // הישגי השלמה
      firstComplete: { id: 'first_complete', name: 'צעד ראשון', desc: 'השלם את המשימה הראשונה שלך', icon: '🎯', points: 10, unlocked: false },
      complete10: { id: 'complete_10', name: 'מתמיד', desc: 'השלם 10 משימות', icon: '⭐', points: 50, unlocked: false },
      complete50: { id: 'complete_50', name: 'אלוף ההשלמות', desc: 'השלם 50 משימות', icon: '🌟', points: 200, unlocked: false },
      complete100: { id: 'complete_100', name: 'מאסטר', desc: 'השלם 100 משימות', icon: '👑', points: 500, unlocked: false },
      
      // הישגי רצף
      streak7: { id: 'streak_7', name: 'שבוע מושלם', desc: '7 ימים ברצף של השלמות', icon: '🔥', points: 100, unlocked: false },
      streak30: { id: 'streak_30', name: 'חודש זהב', desc: '30 ימים ברצף', icon: '💎', points: 300, unlocked: false },
      
      // הישגי זמן
      onTime10: { id: 'ontime_10', name: 'מדויק', desc: 'הגש 10 משימות בזמן', icon: '⏰', points: 75, unlocked: false },
      earlyBird: { id: 'early_bird', name: 'ציפור מוקדמת', desc: 'הגש 5 משימות יום לפני', icon: '🐦', points: 100, unlocked: false },
      
      // הישגי איכות
      perfectWeek: { id: 'perfect_week', name: 'שבוע ללא רבב', desc: 'השלם את כל המשימות בשבוע', icon: '💯', points: 150, unlocked: false },
      noOverdue: { id: 'no_overdue', name: 'אף פעם לא מאחר', desc: 'חודש ללא איחורים', icon: '✨', points: 200, unlocked: false },
      
      // הישגי מגוון
      allSubjects: { id: 'all_subjects', name: 'רב תחומי', desc: 'השלם משימות בכל המקצועות', icon: '🎨', points: 120, unlocked: false },
      speedRunner: { id: 'speed_runner', name: 'מהיר כברק', desc: 'השלם 5 משימות ביום אחד', icon: '⚡', points: 80, unlocked: false }
    };
  }

  // חישוב רמה
  calculateLevel() {
    const points = this.calculatePoints();
    return Math.floor(points / 100) + 1;
  }

  // חישוב נקודות
  calculatePoints() {
    let points = 0;
    
    // נקודות בסיסיות על השלמות
    const completed = homework.filter(h => h.completed).length;
    points += completed * 10;
    
    // בונוס על הגשה בזמן
    const onTime = homework.filter(h => h.completed && getDaysUntilDue(h.dueDate) >= 0).length;
    points += onTime * 5;
    
    // בונוס על הישגים שנפתחו
    Object.values(this.achievements).forEach(ach => {
      if (ach.unlocked) points += ach.points;
    });
    
    return points;
  }

  // בדיקת הישגים חדשים
  checkAchievements() {
    const completed = homework.filter(h => h.completed).length;
    const newAchievements = [];
    
    // הישגי השלמה
    if (completed >= 1 && !this.achievements.firstComplete.unlocked) {
      this.achievements.firstComplete.unlocked = true;
      newAchievements.push(this.achievements.firstComplete);
    }
    if (completed >= 10 && !this.achievements.complete10.unlocked) {
      this.achievements.complete10.unlocked = true;
      newAchievements.push(this.achievements.complete10);
    }
    if (completed >= 50 && !this.achievements.complete50.unlocked) {
      this.achievements.complete50.unlocked = true;
      newAchievements.push(this.achievements.complete50);
    }
    if (completed >= 100 && !this.achievements.complete100.unlocked) {
      this.achievements.complete100.unlocked = true;
      newAchievements.push(this.achievements.complete100);
    }
    
    // הישגי זמן
    const onTime = homework.filter(h => h.completed && getDaysUntilDue(h.dueDate) >= 0).length;
    if (onTime >= 10 && !this.achievements.onTime10.unlocked) {
      this.achievements.onTime10.unlocked = true;
      newAchievements.push(this.achievements.onTime10);
    }
    
    // הישג כל המקצועות
    const subjectsWithCompleted = [...new Set(homework.filter(h => h.completed).map(h => h.subject))];
    if (subjectsWithCompleted.length === subjects.length && subjects.length > 0 && !this.achievements.allSubjects.unlocked) {
      this.achievements.allSubjects.unlocked = true;
      newAchievements.push(this.achievements.allSubjects);
    }
    
    // שמירה
    this.saveProgress();
    
    // הצגת הישגים חדשים
    newAchievements.forEach(ach => this.showAchievementUnlocked(ach));
    
    return newAchievements;
  }

  // הצגת הישג חדש
  showAchievementUnlocked(achievement) {
    const notification = document.createElement('div');
    notification.className = 'achievement-notification';
    notification.innerHTML = `
      <div class="achievement-badge pulse">
        <div class="achievement-icon">${achievement.icon}</div>
        <div class="achievement-info">
          <h3>🏆 הישג חדש נפתח!</h3>
          <h4>${achievement.name}</h4>
          <p>${achievement.desc}</p>
          <span class="achievement-points">+${achievement.points} נקודות</span>
        </div>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // אפקט קול (אופציונלי)
    this.playUnlockSound();
    
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.5s ease-out';
      setTimeout(() => notification.remove(), 500);
    }, 5000);
  }

  // פתיחת חלון הישגים
  openAchievementsPanel() {
    const modal = document.createElement('div');
    modal.className = 'modal achievements-modal';
    modal.id = 'achievements-modal';
    
    const unlockedCount = Object.values(this.achievements).filter(a => a.unlocked).length;
    const totalCount = Object.values(this.achievements).length;
    const progressPercent = Math.round((unlockedCount / totalCount) * 100);
    
    modal.innerHTML = `
      <div class="modal-content achievements-content">
        <div class="modal-header">
          <h2>🏆 הישגים וגיימיפיקציה</h2>
          <button class="close-modal-btn" onclick="gamification.closeAchievementsPanel()">
            <svg width="24" height="24"><use href="#x"></use></svg>
          </button>
        </div>
        
        <div class="modal-body achievements-body">
          <!-- סטטוס משתמש -->
          <div class="user-status-card">
            <div class="user-level">
              <div class="level-badge">רמה ${this.userLevel}</div>
              <div class="level-progress">
                <div class="level-bar">
                  <div class="level-fill" style="width: ${(this.userPoints % 100)}%"></div>
                </div>
                <span class="level-text">${this.userPoints % 100}/100 עד הרמה הבאה</span>
              </div>
            </div>
            <div class="user-points">
              <span class="points-value">${this.userPoints}</span>
              <span class="points-label">נקודות כוללות</span>
            </div>
          </div>

          <!-- התקדמות הישגים -->
          <div class="achievements-progress">
            <h3>התקדמות הישגים</h3>
            <div class="progress-bar-container">
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${progressPercent}%"></div>
              </div>
              <span class="progress-text">${unlockedCount}/${totalCount} הישגים (${progressPercent}%)</span>
            </div>
          </div>

          <!-- רשימת הישגים -->
          <div class="achievements-grid">
            ${Object.values(this.achievements).map(ach => `
              <div class="achievement-card ${ach.unlocked ? 'unlocked' : 'locked'}">
                <div class="achievement-icon-large">${ach.icon}</div>
                <h4>${ach.name}</h4>
                <p>${ach.desc}</p>
                <div class="achievement-points-badge">${ach.points} נקודות</div>
                ${ach.unlocked ? '<div class="unlocked-badge">✅ נפתח</div>' : '<div class="locked-badge">🔒 נעול</div>'}
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.closeAchievementsPanel();
    });
  }

  closeAchievementsPanel() {
    const modal = document.getElementById('achievements-modal');
    if (modal) modal.remove();
  }

  // שמירת התקדמות
  async saveProgress() {
    await storage.set('gamification-data', {
      achievements: this.achievements,
      points: this.userPoints,
      level: this.userLevel
    });
  }

  // טעינת התקדמות
  async loadProgress() {
    const data = await storage.get('gamification-data');
    if (data) {
      this.achievements = data.achievements || this.achievements;
      this.userPoints = data.points || this.userPoints;
      this.userLevel = data.level || this.userLevel;
    }
  }

  // אפקט קול (placeholder)
  playUnlockSound() {
    // ניתן להוסיף Audio API כאן
  }
}

console.log('🏆 Creating global gamification manager...');
const gamification = new GamificationManager();
console.log('✅ Global gamification manager created');
