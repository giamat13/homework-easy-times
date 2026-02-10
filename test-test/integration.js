// Integration Layer - חיבור בין הפיצ'רים החדשים לקוד המקורי
// ================================================================
// ⭐ FIX: תיקון באג XP אינסופי - משימות מקבלות XP רק פעם אחת

console.log('🔗 Integration: Starting integration layer...');

// ==================== הרחבת פונקציות קיימות ====================

// הרחבת toggleComplete להוסיף גמיפיקציה + FIX לבאג XP
if (typeof toggleComplete === 'function') {
  const originalToggleComplete = toggleComplete;
  window.toggleComplete = function(id) {
    const hw = homework.find(h => h.id === id);
    const wasCompleted = hw ? hw.completed : false;
    
    originalToggleComplete(id);
    
    // אם המשימה הושלמה עכשיו (ולא הייתה מושלמת קודם)
    if (hw && !wasCompleted && hw.completed) {
      console.log('🔗 Integration: Task completed, checking XP eligibility...');
      
      // ⭐ FIX: בדיקה אם המשימה כבר קיבלה XP בעבר
      if (!hw.xpAwarded) {
        console.log('✅ Integration: First time completing - awarding XP');
        hw.xpAwarded = true;
        hw.completedAt = new Date().toISOString();
        
        // בדיקה אם זה מוקדם
        const daysLeft = getDaysUntilDue(hw.dueDate);
        const isEarly = daysLeft > 0;
        
        // ספירת משימות היום
        const today = new Date().toDateString();
        const tasksToday = homework.filter(h => {
          if (!h.completedAt) return false;
          const completedDate = new Date(h.completedAt).toDateString();
          return completedDate === today;
        }).length;
        
        // הפעלת גמיפיקציה
        if (typeof gamification !== 'undefined') {
          gamification.onTaskCompleted(isEarly, tasksToday);
        }
        
        // בדיקת יום מושלם
        const todayHomework = homework.filter(h => h.dueDate === new Date().toISOString().split('T')[0]);
        const allCompleted = todayHomework.every(h => h.completed);
        
        if (allCompleted && todayHomework.length > 0 && typeof gamification !== 'undefined') {
          gamification.onPerfectDay();
        }
        
        // שמירת הנתונים
        saveData();
      } else {
        console.log('⚠️ Integration: Task already awarded XP - skipping to prevent exploit');
        if (notifications && notifications.showInAppNotification) {
          notifications.showInAppNotification('המשימה כבר קיבלה XP בעבר', 'info');
        }
      }
    } 
    // אם המשימה בוטלה (הייתה מושלמת ועכשיו לא)
    else if (hw && wasCompleted && !hw.completed) {
      console.log('⚠️ Integration: Task uncompleted - XP remains (cannot be reversed)');
      if (notifications && notifications.showInAppNotification) {
        notifications.showInAppNotification('⚠️ המשימה בוטלה. שים לב: ה-XP כבר נזקף ולא ניתן להחזרה', 'info');
      }
    }
  };
  console.log('✅ Integration: toggleComplete enhanced with XP fix');
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
      newHomework.xpAwarded = false; // ⭐ FIX: אתחול דגל XP
      
      saveData();
      console.log('🔗 Integration: Added timestamps to new homework');
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

// ⭐ FIX: פונקציית תיקון למשימות ישנות שלא היה להן את דגל xpAwarded
function fixOldHomeworkData() {
  console.log('🔧 fixOldHomeworkData: Checking for old homework without xpAwarded flag...');
  
  if (typeof homework === 'undefined' || !homework.length) {
    console.log('⏸️ fixOldHomeworkData: No homework data to fix');
    return;
  }
  
  let fixedCount = 0;
  homework.forEach(hw => {
    if (typeof hw.xpAwarded === 'undefined') {
      // אם המשימה מושלמת, נניח שכבר קיבלה XP
      hw.xpAwarded = hw.completed || false;
      fixedCount++;
    }
  });
  
  if (fixedCount > 0) {
    console.log(`✅ fixOldHomeworkData: Fixed ${fixedCount} homework items`);
    if (typeof saveData === 'function') {
      saveData();
    }
  } else {
    console.log('✅ fixOldHomeworkData: All homework data is up to date');
  }
}

// ==================== Event Listeners חדשים ====================

// עדכון כל דקה של XP בכותרת
setInterval(() => {
  updateHeaderXP();
}, 60000);

// עדכון מיידי + תיקון נתונים ישנים
setTimeout(() => {
  updateHeaderXP();
  fixOldHomeworkData();
}, 1000);

// ==================== הודעות לקונסול ====================

console.log('✅ Integration: All features integrated successfully!');
console.log('🔧 Integration: XP exploit bug FIXED - tasks can only award XP once');
console.log('🎉 Enhanced Homework System is ready to use!');
console.log('');
console.log('📚 Available features:');
console.log('  ⏰ Study Timer & Pomodoro');
console.log('  🏆 Achievements & Gamification (XP exploit fixed!)');
console.log('  📊 Advanced Analytics');
console.log('  🎨 Theme Customizer');
console.log('  ⚡ Quick Actions (Ctrl+H for help)');
console.log('  🔍 Smart Search (Ctrl+F)');
console.log('');
console.log('💡 Tip: Press Shift+H to see all keyboard shortcuts!');
console.log('');
console.log('🛡️ Security: XP can only be awarded once per task');
