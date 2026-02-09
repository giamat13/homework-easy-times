// =============== קובץ app.js מעודכן עם אינטגרציה של הפיצ'רים החדשים ===============

// השינויים הנדרשים ב-render():
function render() {
  renderSubjects();
  renderHomework();
  renderFilters();
  renderTagSelector();
  updateStats();
  
  // NEW: Render new features
  renderNewFeatures();
}

// NEW: רינדור הפיצ'רים החדשים
function renderNewFeatures() {
  // Render Search Bar
  const searchBarContainer = document.getElementById('search-bar-container');
  if (searchBarContainer && typeof smartSearch !== 'undefined') {
    searchBarContainer.innerHTML = smartSearch.renderSearchBar();
  }
  
  // Render Study Timer
  const timerContainer = document.getElementById('timer-panel-container');
  if (timerContainer && typeof studyTimer !== 'undefined') {
    if (!document.querySelector('.timer-panel')) {
      const timerPanel = studyTimer.renderTimerUI();
      timerContainer.appendChild(timerPanel);
      studyTimer.updateStats();
    }
  }
  
  // Render Achievements Panel
  const achievementsContainer = document.getElementById('achievements-panel-container');
  if (achievementsContainer && typeof achievements !== 'undefined') {
    achievementsContainer.innerHTML = achievements.renderAchievementsPanel();
    achievements.updateDisplay();
  }
  
  // Render Quick Actions Button
  const quickActionsContainer = document.getElementById('quick-actions-container');
  if (quickActionsContainer && typeof quickActions !== 'undefined') {
    quickActionsContainer.innerHTML = quickActions.renderQuickActionsButton();
  }
}

// עדכון toggleComplete כדי להוסיף נקודות הישגים:
const originalToggleComplete = toggleComplete;
toggleComplete = async function(id) {
  const hw = homework.find(h => h.id === id);
  if (!hw) return;
  
  const wasCompleted = hw.completed;
  originalToggleComplete(id);
  
  if (!wasCompleted && hw.completed) {
    // NEW: Add achievement points for completing task
    if (typeof achievements !== 'undefined') {
      await achievements.addPoints(5, `השלמת "${hw.title}"`);
      
      // Check if it was early completion
      const daysLeft = getDaysUntilDue(hw.dueDate);
      if (daysLeft > 0) {
        await achievements.addPoints(5, 'השלמה מוקדמת');
      }
      
      // Update achievement statistics
      const stats = await getAchievementStats();
      await achievements.checkAchievements(stats);
    }
  }
};

// NEW: חישוב סטטיסטיקות להישגים
async function getAchievementStats() {
  const completedTasks = homework.filter(h => h.completed).length;
  const earlyCompletions = homework.filter(h => {
    if (!h.completed) return false;
    const daysLeft = getDaysUntilDue(h.dueDate);
    return daysLeft > 0;
  }).length;
  
  const timerStats = await storage.get('timer-stats') || { totalSessions: 0 };
  const subjectsCreated = subjects.length;
  
  // Check for late night completions (example - would need actual completion time tracking)
  const lateNightCompletions = 0;
  
  // Simple streak calculation (would need proper implementation)
  const currentStreak = 0;
  
  return {
    completedTasks,
    earlyCompletions,
    pomodoroSessions: timerStats.totalSessions,
    subjectsCreated,
    lateNightCompletions,
    currentStreak
  };
}

// אתחול בטעינה:
window.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 APPLICATION STARTING (WITH NEW FEATURES)');
  try {
    await loadData();
    
    // NEW: Initialize new features
    if (typeof achievements !== 'undefined') {
      await achievements.load();
    }
    
    if (typeof quickActions !== 'undefined') {
      quickActions.init();
    }
    
    initializeEventListeners();
    
    console.log('🎉 APPLICATION STARTED SUCCESSFULLY (WITH NEW FEATURES)');
  } catch (error) {
    console.error('❌ APPLICATION START FAILED:', error);
  }
});
