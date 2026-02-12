// Integration Layer - חיבור בין הפיצ'רים החדשים לקוד המקורי
// ================================================================
// ⭐ מערכת XP דינמית + יום מושלם חכם + מעקב צבעים ותגיות

console.log('🔗 Integration: Starting integration layer...');

// ==================== הרחבת פונקציות קיימות ====================

// הרחבת toggleComplete להוסיף גמיפיקציה דינמית
if (typeof toggleComplete === 'function') {
  const originalToggleComplete = toggleComplete;
  window.toggleComplete = function(id) {
    const hw = homework.find(h => h.id === id);
    const wasCompleted = hw ? hw.completed : false;
    
    originalToggleComplete(id);
    
    if (hw && !wasCompleted && hw.completed) {
      console.log('🔗 Integration: Task completed, awarding XP...');
      
      hw.completedAt = new Date().toISOString();
      const daysLeft = getDaysUntilDue(hw.dueDate);
      const isEarly = daysLeft > 0;
      hw.wasEarly = isEarly;
      
      const today = new Date().toDateString();
      const tasksToday = homework.filter(h => {
        if (!h.completedAt) return false;
        const completedDate = new Date(h.completedAt).toDateString();
        return completedDate === today && h.completed;
      }).length;
      
      if (typeof gamification !== 'undefined') {
        gamification.onTaskCompleted(isEarly, tasksToday);
      }
      
      checkAndUpdatePerfectDay();
      saveData();
    } 
    else if (hw && wasCompleted && !hw.completed) {
      console.log('⏪ Integration: Task uncompleted - reversing XP...');
      
      if (typeof gamification !== 'undefined') {
        gamification.removeXP(10, 'ביטול משימה');
        
        if (hw.wasEarly) {
          gamification.removeXP(5, 'ביטול בונוס מהירות');
          hw.wasEarly = false;
        }
        
        if (gamification.userStats.totalTasksCompleted > 0) {
          gamification.userStats.totalTasksCompleted--;
        }
        
        gamification.recheckAchievements();
        gamification.saveStats();
      }
      
      hw.completedAt = null;
      checkAndUpdatePerfectDay();
      saveData();
      
      if (notifications && notifications.showInAppNotification) {
        notifications.showInAppNotification('⏪ המשימה בוטלה וה-XP הוחזר', 'info');
      }
    }
  };
  console.log('✅ Integration: toggleComplete enhanced with dynamic XP');
}

// ⭐ פונקציה מרכזית שבודקת ומעדכנת יום מושלם
function checkAndUpdatePerfectDay() {
  console.log('✨ checkAndUpdatePerfectDay: Starting perfect day check...');
  
  if (typeof gamification === 'undefined') {
    console.log('⏸️ checkAndUpdatePerfectDay: Gamification not loaded');
    return;
  }
  
  const today = new Date().toISOString().split('T')[0];
  const todayHomework = homework.filter(h => h.dueDate === today);
  
  console.log(`✨ checkAndUpdatePerfectDay: Found ${todayHomework.length} tasks for today`);
  
  const isPerfectNow = todayHomework.length > 0 && todayHomework.every(h => h.completed);
  const completedCount = todayHomework.filter(h => h.completed).length;
  
  console.log(`✨ checkAndUpdatePerfectDay: ${completedCount}/${todayHomework.length} completed. Perfect NOW: ${isPerfectNow}`);
  
  const wasPerfectBefore = gamification.userStats.perfectDayToday === today;
  
  console.log(`✨ checkAndUpdatePerfectDay: Was perfect BEFORE: ${wasPerfectBefore}`);
  
  if (isPerfectNow && !wasPerfectBefore) {
    console.log('🎉 checkAndUpdatePerfectDay: NEW perfect day achieved!');
    
    gamification.userStats.perfectDays++;
    gamification.userStats.perfectDayToday = today;
    gamification.addXP(50, 'יום מושלם');
    gamification.checkAchievements();
    gamification.saveStats();
    
    if (notifications && notifications.showInAppNotification) {
      notifications.showInAppNotification('🎉 יום מושלם! כל המשימות הושלמו! +50 XP', 'success');
    }
  }
  else if (!isPerfectNow && wasPerfectBefore) {
    console.log('⏪ checkAndUpdatePerfectDay: Perfect day LOST!');
    
    if (gamification.userStats.perfectDays > 0) {
      gamification.userStats.perfectDays--;
    }
    gamification.userStats.perfectDayToday = null;
    gamification.removeXP(50, 'ביטול יום מושלם');
    gamification.recheckAchievements();
    gamification.saveStats();
    
    if (notifications && notifications.showInAppNotification) {
      notifications.showInAppNotification('⏪ יום מושלם בוטל - יש משימות שלא הושלמו', 'info');
    }
  }
  else if (isPerfectNow && wasPerfectBefore) {
    console.log('✨ checkAndUpdatePerfectDay: Still perfect - no change needed');
  }
  else if (!isPerfectNow && !wasPerfectBefore) {
    console.log('⏸️ checkAndUpdatePerfectDay: Still not perfect - no change needed');
  }
}

// הרחבת addHomework להוסיף timestamp
if (typeof addHomework === 'function') {
  const originalAddHomework = addHomework;
  window.addHomework = function() {
    const beforeLength = homework.length;
    
    originalAddHomework();
    
    if (homework.length > beforeLength) {
      const newHomework = homework[homework.length - 1];
      newHomework.createdAt = new Date().toISOString();
      newHomework.completedAt = null;
      newHomework.wasEarly = false;
      
      saveData();
      console.log('🔗 Integration: Added timestamps to new homework');
      
      checkAndUpdatePerfectDay();
    }
  };
  console.log('✅ Integration: addHomework enhanced');
}

// הרחבת deleteHomework לעדכן אינדקס חיפוש
if (typeof deleteHomework === 'function') {
  const originalDeleteHomework = deleteHomework;
  window.deleteHomework = function(id) {
    originalDeleteHomework(id);
    
    if (typeof smartSearch !== 'undefined') {
      smartSearch.buildSearchIndex();
    }
    
    checkAndUpdatePerfectDay();
    
    console.log('🔗 Integration: Search index updated after deletion');
  };
  console.log('✅ Integration: deleteHomework enhanced');
}

// ⭐ הרחבת addSubject - עדכון צבעים
if (typeof addSubject === 'function') {
  const originalAddSubject = addSubject;
  window.addSubject = function() {
    originalAddSubject();
    
    // עדכון סטטיסטיקות צבעים
    if (typeof gamification !== 'undefined') {
      console.log('🎨 Integration: Subject added, updating color stats...');
      gamification.onSubjectsOrTagsChanged();
    }
  };
  console.log('✅ Integration: addSubject enhanced with color tracking');
}

// ⭐ הרחבת deleteSubject - עדכון צבעים
if (typeof deleteSubject === 'function') {
  const originalDeleteSubject = deleteSubject;
  window.deleteSubject = function(id) {
    originalDeleteSubject(id);
    
    // עדכון סטטיסטיקות צבעים
    if (typeof gamification !== 'undefined') {
      console.log('🎨 Integration: Subject deleted, updating color stats...');
      gamification.onSubjectsOrTagsChanged();
    }
  };
  console.log('✅ Integration: deleteSubject enhanced with color tracking');
}

// ⭐ הרחבת addTag - עדכון תגיות
if (typeof addTag === 'function') {
  const originalAddTag = addTag;
  window.addTag = function() {
    originalAddTag();
    
    // עדכון סטטיסטיקות תגיות
    if (typeof gamification !== 'undefined') {
      console.log('🏷️ Integration: Tag added, updating tag stats...');
      gamification.onSubjectsOrTagsChanged();
    }
  };
  console.log('✅ Integration: addTag enhanced with tag tracking');
}

// ⭐ הרחבת removeTag - עדכון תגיות
if (typeof removeTag === 'function') {
  const originalRemoveTag = removeTag;
  window.removeTag = function(tag) {
    originalRemoveTag(tag);
    
    // עדכון סטטיסטיקות תגיות
    if (typeof gamification !== 'undefined') {
      console.log('🏷️ Integration: Tag removed, updating tag stats...');
      gamification.onSubjectsOrTagsChanged();
    }
  };
  console.log('✅ Integration: removeTag enhanced with tag tracking');
}

// הרחבת render לעדכן גמיפיקציה
if (typeof render === 'function') {
  const originalRender = render;
  window.render = function() {
    originalRender();
    
    if (typeof gamification !== 'undefined') {
      gamification.updateUI();
    }
    
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
  const originalOnTimerComplete = studyTimer.onTimerComplete.bind(studyTimer);
  
  studyTimer.onTimerComplete = function() {
    originalOnTimerComplete();
    
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

// עדכון מיידי + בדיקת יום מושלם ראשונית
setTimeout(() => {
  updateHeaderXP();
  checkAndUpdatePerfectDay();
  
  // ⭐ עדכון ראשוני של צבעים ותגיות
  if (typeof gamification !== 'undefined') {
    gamification.onSubjectsOrTagsChanged();
  }
}, 1000);

// ==================== הודעות לקונסול ====================

console.log('✅ Integration: All features integrated successfully!');
console.log('🔄 Integration: Dynamic XP system - XP is reversed when tasks are uncompleted');
console.log('✨ Integration: Smart Perfect Day - always checks actual state');
console.log('🎨 Integration: Creative tracking - colors and tags are monitored');
console.log('🎉 Enhanced Homework System is ready to use!');
console.log('');
console.log('📚 Available features:');
console.log('  ⏰ Study Timer & Pomodoro');
console.log('  🏆 Achievements & Gamification (Dynamic XP!)');
console.log('  ✨ Smart Perfect Day Detection');
console.log('  🎨 Creative Achievement Tracking (Colors & Tags)');
console.log('  📊 Advanced Analytics');
console.log('  🎨 Theme Customizer');
console.log('  ⚡ Quick Actions (Ctrl+H for help)');
console.log('  🔍 Smart Search (Ctrl+F)');
console.log('');
console.log('💡 Tip: Press Shift+H to see all keyboard shortcuts!');
console.log('');
console.log('🔄 Perfect Day System:');
console.log('  ✅ Checks actual state every time');
console.log('  ✅ Awards/removes XP based on real status');
console.log('  ✅ Updates on: complete, uncomplete, add, delete');
console.log('');
console.log('🎨 Creative Achievement System:');
console.log('  ✅ Tracks unique colors used in subjects');
console.log('  ✅ Tracks total number of tags created');
console.log('  ✅ Updates on: subject add/delete, tag add/remove');
