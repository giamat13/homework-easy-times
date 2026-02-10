// Integration Layer - חיבור בין הפיצ'רים החדשים לקוד המקורי
// ================================================================
// ⭐ מערכת XP דינמית - XP והישגים חוזרים כשמבטלים משימות

console.log('🔗 Integration: Starting integration layer...');

// ==================== הרחבת פונקציות קיימות ====================

// הרחבת toggleComplete להוסיף גמיפיקציה דינמית
if (typeof toggleComplete === 'function') {
  const originalToggleComplete = toggleComplete;
  window.toggleComplete = function(id) {
    const hw = homework.find(h => h.id === id);
    const wasCompleted = hw ? hw.completed : false;
    
    originalToggleComplete(id);
    
    // אם המשימה הושלמה עכשיו (ולא הייתה מושלמת קודם)
    if (hw && !wasCompleted && hw.completed) {
      console.log('🔗 Integration: Task completed, awarding XP...');
      
      hw.completedAt = new Date().toISOString();
      
      // בדיקה אם זה מוקדם
      const daysLeft = getDaysUntilDue(hw.dueDate);
      const isEarly = daysLeft > 0;
      
      // ספירת משימות היום
      const today = new Date().toDateString();
      const tasksToday = homework.filter(h => {
        if (!h.completedAt) return false;
        const completedDate = new Date(h.completedAt).toDateString();
        return completedDate === today && h.completed;
      }).length;
      
      // הפעלת גמיפיקציה
      if (typeof gamification !== 'undefined') {
        gamification.onTaskCompleted(isEarly, tasksToday);
      }
      
      // בדיקת יום מושלם
      checkPerfectDay();
      
      // שמירת הנתונים
      saveData();
    } 
    // ⭐ אם המשימה בוטלה (הייתה מושלמת ועכשיו לא) - מחזירים XP
    else if (hw && wasCompleted && !hw.completed) {
      console.log('⏪ Integration: Task uncompleted - reversing XP...');
      
      if (typeof gamification !== 'undefined') {
        // הסרת XP בסיסי
        gamification.removeXP(10, 'ביטול משימה');
        
        // הסרת בונוס מהירות אם היה
        if (hw.wasEarly) {
          gamification.removeXP(5, 'ביטול בונוס מהירות');
        }
        
        // עדכון סטטיסטיקות
        if (gamification.userStats.totalTasksCompleted > 0) {
          gamification.userStats.totalTasksCompleted--;
        }
        
        // בדיקה מחדש של הישגים (עשוי לבטל הישגים)
        gamification.recheckAchievements();
        
        gamification.saveStats();
      }
      
      hw.completedAt = null;
      
      // בדיקת יום מושלם שוב
      checkPerfectDay();
      
      saveData();
      
      if (notifications && notifications.showInAppNotification) {
        notifications.showInAppNotification('⏪ המשימה בוטלה וה-XP הוחזר', 'info');
      }
    }
  };
  console.log('✅ Integration: toggleComplete enhanced with dynamic XP');
}

// ⭐ פונקציה לבדיקת יום מושלם
function checkPerfectDay() {
  console.log('✨ checkPerfectDay: Checking for perfect day...');
  
  const today = new Date().toISOString().split('T')[0];
  const todayHomework = homework.filter(h => h.dueDate === today);
  
  console.log(`✨ checkPerfectDay: Found ${todayHomework.length} tasks for today`);
  
  if (todayHomework.length === 0) {
    console.log('⏸️ checkPerfectDay: No tasks for today');
    return;
  }
  
  const allCompleted = todayHomework.every(h => h.completed);
  const completedCount = todayHomework.filter(h => h.completed).length;
  
  console.log(`✨ checkPerfectDay: ${completedCount}/${todayHomework.length} completed. Perfect: ${allCompleted}`);
  
  if (allCompleted && typeof gamification !== 'undefined') {
    console.log('🎉 checkPerfectDay: Perfect day achieved!');
    gamification.onPerfectDay();
  }
}

// הרחבת addHomework להוסיף timestamp
if (typeof addHomework === 'function') {
  const originalAddHomework = addHomework;
  window.addHomework = function() {
    const beforeLength = homework.length;
    
    originalAddHomework();
    
    // הוספת timestamp אם נוספה משימה
    if (homework.length > beforeLength) {
      const newHomework = homework[homework.length - 1];
      newHomework.createdAt = new Date().toISOString();
      newHomework.completedAt = null;
      
      saveData();
      console.log('🔗 Integration: Added timestamps to new homework');
      
      // בדיקת יום מושלם (אולי ביטלה יום מושלם קיים)
      checkPerfectDay();
    }
  };
  console.log('✅ Integration: addHomework enhanced');
}

// הרחבת deleteHomework לעדכן אינדקס חיפוש
if (typeof deleteHomework === 'function') {
  const originalDeleteHomework = deleteHomework;
  window.deleteHomework = function(id) {
    originalDeleteHomework(id);
    
    // עדכון אינדקס חיפוש
    if (typeof smartSearch !== 'undefined') {
      smartSearch.buildSearchIndex();
    }
    
    // בדיקת יום מושלם (אולי השלמת יום מושלם על ידי מחיקה)
    checkPerfectDay();
    
    console.log('🔗 Integration: Search index updated after deletion');
  };
  console.log('✅ Integration: deleteHomework enhanced');
}

// הרחבת render לעדכן גמיפיקציה
if (typeof render === 'function') {
  const originalRender = render;
  window.render = function() {
    originalRender();
    
    // עדכון גמיפיקציה
    if (typeof gamification !== 'undefined') {
      gamification.updateUI();
    }
    
    // עדכון אינדקס חיפוש
    if (typeof smartSearch !== 'undefined') {
      smartSearch.buildSearchIndex();
    }
    
    console.log('🔗 Integration: UI updated with gamification');
  };
  console.log('✅ Integration: render enhanced');
}

// ==================== פונקציות עזר חדשות ====================

// עדכון פרוגרס בר ה-XP בכותרת
function updateHeaderXP() {
  if (typeof gamification === 'undefined') return;
  
  const level = gamification.userStats.level;
  const xp = gamification.userStats.xp;
  const xpForNext = gamification.getXPForLevel(level + 1);
  const progress = (xp / xpForNext) * 100;
  
  const progressBar = document.getElementById('header-xp-progress');
  if (progressBar) {
    progressBar.style.width = `${progress}%`;
  }
  
  const levelEl = document.getElementById('header-level');
  if (levelEl) {
    levelEl.textContent = level;
  }
  
  const xpText = document.getElementById('header-xp-text');
  if (xpText) {
    xpText.textContent = `${xp} / ${xpForNext} XP`;
  }
}

// חיבור אירועי טיימר לגמיפיקציה
if (typeof studyTimer !== 'undefined') {
  // שמירה על הפונקציה המקורית
  const originalOnTimerComplete = studyTimer.onTimerComplete.bind(studyTimer);
  
  studyTimer.onTimerComplete = function() {
    originalOnTimerComplete();
    
    // הוספת זמן לימוד לגמיפיקציה
    if (this.currentMode === 'pomodoro' && typeof gamification !== 'undefined') {
      gamification.onStudyTimeAdded(this.settings.pomodoroDuration);
    }
  };
  
  console.log('✅ Integration: Timer connected to gamification');
}

// ==================== Event Listeners חדשים ====================

// עדכון כל דקה של XP בכותרת
setInterval(() => {
  updateHeaderXP();
}, 60000);

// עדכון מיידי
setTimeout(() => {
  updateHeaderXP();
}, 1000);

// ==================== הודעות לקונסול ====================

console.log('✅ Integration: All features integrated successfully!');
console.log('🔄 Integration: Dynamic XP system - XP is reversed when tasks are uncompleted');
console.log('🎉 Enhanced Homework System is ready to use!');
console.log('');
console.log('📚 Available features:');
console.log('  ⏰ Study Timer & Pomodoro');
console.log('  🏆 Achievements & Gamification (Dynamic XP!)');
console.log('  📊 Advanced Analytics');
console.log('  🎨 Theme Customizer');
console.log('  ⚡ Quick Actions (Ctrl+H for help)');
console.log('  🔍 Smart Search (Ctrl+F)');
console.log('');
console.log('💡 Tip: Press Shift+H to see all keyboard shortcuts!');
console.log('');
console.log('🔄 XP System: Completing/uncompleting tasks will add/remove XP dynamically');
