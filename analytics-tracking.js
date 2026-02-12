// 📊 Google Analytics - Custom Event Tracking
// ============================================
// מעקב אחרי אירועים מותאמים אישית במערכת

console.log('📊 Analytics Tracking: Initializing...');

// בדיקה ש-gtag קיים
if (typeof gtag === 'undefined') {
  console.warn('⚠️ Analytics Tracking: gtag not found - Analytics tracking disabled');
} else {
  console.log('✅ Analytics Tracking: gtag found, setting up custom events');
  
  // ==================== מעקב אחרי השלמת משימות ====================
  
  if (typeof toggleComplete === 'function') {
    const originalToggleComplete = window.toggleComplete;
    window.toggleComplete = function(id) {
      const hw = homework.find(h => h.id === id);
      const wasCompleted = hw ? hw.completed : false;
      
      // קריאה לפונקציה המקורית
      originalToggleComplete(id);
      
      // שליחת אירוע ל-Analytics
      if (hw) {
        if (!wasCompleted && hw.completed) {
          // משימה הושלמה
          const subject = subjects.find(s => s.id == hw.subject);
          gtag('event', 'task_completed', {
            'event_category': 'Homework',
            'event_label': subject ? subject.name : 'Unknown',
            'value': 1
          });
          console.log('📊 Analytics: Task completed event sent:', hw.title);
        } else if (wasCompleted && !hw.completed) {
          // משימה בוטלה
          gtag('event', 'task_uncompleted', {
            'event_category': 'Homework',
            'value': 1
          });
          console.log('📊 Analytics: Task uncompleted event sent');
        }
      }
    };
    console.log('✅ Analytics: toggleComplete tracking enabled');
  }
  
  // ==================== מעקב אחרי הוספת משימות ====================
  
  if (typeof addHomework === 'function') {
    const originalAddHomework = window.addHomework;
    window.addHomework = function() {
      const beforeLength = homework.length;
      
      // קריאה לפונקציה המקורית
      originalAddHomework();
      
      // בדיקה אם משימה נוספה
      if (homework.length > beforeLength) {
        const newHw = homework[homework.length - 1];
        const subject = subjects.find(s => s.id == newHw.subject);
        
        gtag('event', 'task_added', {
          'event_category': 'Homework',
          'event_label': subject ? subject.name : 'Unknown',
          'value': 1
        });
        console.log('📊 Analytics: Task added event sent');
      }
    };
    console.log('✅ Analytics: addHomework tracking enabled');
  }
  
  // ==================== מעקב אחרי פומודורו ====================
  
  // נחכה לטעינת studyTimer
  const waitForStudyTimer = setInterval(() => {
    if (typeof studyTimer !== 'undefined' && studyTimer.onTimerComplete) {
      clearInterval(waitForStudyTimer);
      
      const originalOnComplete = studyTimer.onTimerComplete.bind(studyTimer);
      studyTimer.onTimerComplete = function() {
        // קריאה לפונקציה המקורית
        originalOnComplete();
        
        // שליחת אירוע
        if (this.currentMode === 'pomodoro') {
          gtag('event', 'pomodoro_completed', {
            'event_category': 'Study',
            'event_label': 'Pomodoro Timer',
            'value': this.settings.pomodoroDuration
          });
          console.log('📊 Analytics: Pomodoro completed event sent');
        }
      };
      console.log('✅ Analytics: Pomodoro tracking enabled');
    }
  }, 500);
  
  // עצירה אחרי 10 שניות אם לא נמצא
  setTimeout(() => clearInterval(waitForStudyTimer), 10000);
  
  // ==================== מעקב אחרי הישגים ====================
  
  const waitForGamification = setInterval(() => {
    if (typeof gamification !== 'undefined' && gamification.unlockAchievement) {
      clearInterval(waitForGamification);
      
      const originalUnlock = gamification.unlockAchievement.bind(gamification);
      gamification.unlockAchievement = function(achievement) {
        // קריאה לפונקציה המקורית
        originalUnlock(achievement);
        
        // שליחת אירוע
        gtag('event', 'achievement_unlocked', {
          'event_category': 'Gamification',
          'event_label': achievement.name,
          'value': achievement.xp
        });
        console.log('📊 Analytics: Achievement unlocked event sent:', achievement.name);
      };
      console.log('✅ Analytics: Achievement tracking enabled');
    }
  }, 500);
  
  setTimeout(() => clearInterval(waitForGamification), 10000);
  
  // ==================== מעקב אחרי עליית רמה ====================
  
  const waitForLevelUp = setInterval(() => {
    if (typeof gamification !== 'undefined' && gamification.levelUp) {
      clearInterval(waitForLevelUp);
      
      const originalLevelUp = gamification.levelUp.bind(gamification);
      gamification.levelUp = function() {
        const oldLevel = this.userStats.level;
        
        // קריאה לפונקציה המקורית
        originalLevelUp();
        
        // שליחת אירוע
        gtag('event', 'level_up', {
          'event_category': 'Gamification',
          'event_label': `Level ${this.userStats.level}`,
          'value': this.userStats.level
        });
        console.log('📊 Analytics: Level up event sent - Level', this.userStats.level);
      };
      console.log('✅ Analytics: Level up tracking enabled');
    }
  }, 500);
  
  setTimeout(() => clearInterval(waitForLevelUp), 10000);
  
  // ==================== מעקב אחרי ייצוא נתונים ====================
  
  if (typeof exportData === 'function') {
    const originalExport = window.exportData;
    window.exportData = async function() {
      // קריאה לפונקציה המקורית
      const result = await originalExport();
      
      // שליחת אירוע
      if (result) {
        gtag('event', 'data_exported', {
          'event_category': 'Data Management',
          'event_label': 'JSON Export',
          'value': 1
        });
        console.log('📊 Analytics: Data export event sent');
      }
      
      return result;
    };
    console.log('✅ Analytics: Export tracking enabled');
  }
  
  // ==================== מעקב אחרי מצב לילה ====================
  
  if (typeof toggleDarkMode === 'function') {
    const originalToggleDark = window.toggleDarkMode;
    window.toggleDarkMode = function() {
      // קריאה לפונקציה המקורית
      originalToggleDark();
      
      // שליחת אירוע
      const isDarkMode = document.body.classList.contains('dark-mode');
      gtag('event', 'theme_changed', {
        'event_category': 'UI',
        'event_label': isDarkMode ? 'Dark Mode' : 'Light Mode',
        'value': isDarkMode ? 1 : 0
      });
      console.log('📊 Analytics: Theme change event sent:', isDarkMode ? 'Dark' : 'Light');
    };
    console.log('✅ Analytics: Dark mode tracking enabled');
  }
  
  // ==================== מעקב אחרי חיפוש ====================
  
  const waitForSmartSearch = setInterval(() => {
    if (typeof smartSearch !== 'undefined' && smartSearch.search) {
      clearInterval(waitForSmartSearch);
      
      const originalSearch = smartSearch.search.bind(smartSearch);
      smartSearch.search = function(query) {
        // קריאה לפונקציה המקורית
        const results = originalSearch(query);
        
        // שליחת אירוע (רק אם יש תוצאות)
        if (query && query.length >= 2) {
          gtag('event', 'search', {
            'search_term': query,
            'event_category': 'Search',
            'value': results.length
          });
          console.log('📊 Analytics: Search event sent:', query, '-', results.length, 'results');
        }
        
        return results;
      };
      console.log('✅ Analytics: Search tracking enabled');
    }
  }, 500);
  
  setTimeout(() => clearInterval(waitForSmartSearch), 10000);
  
  // ==================== מעקב אחרי תצוגות פאנל ====================
  
  // מעקב אחרי מעבר בין תצוגת רשימה ללוח שנה
  if (typeof toggleViewMode === 'function') {
    const originalToggleView = window.toggleViewMode;
    window.toggleViewMode = function() {
      const oldMode = settings.viewMode;
      
      // קריאה לפונקציה המקורית
      originalToggleView();
      
      // שליחת אירוע
      gtag('event', 'view_mode_changed', {
        'event_category': 'UI',
        'event_label': settings.viewMode === 'list' ? 'List View' : 'Calendar View',
        'value': settings.viewMode === 'list' ? 0 : 1
      });
      console.log('📊 Analytics: View mode changed to', settings.viewMode);
    };
    console.log('✅ Analytics: View mode tracking enabled');
  }
  
  // ==================== מעקב אחרי שימוש ב-Quick Actions ====================
  
  const waitForQuickActions = setInterval(() => {
    if (typeof quickActions !== 'undefined' && quickActions.executeAction) {
      clearInterval(waitForQuickActions);
      
      const originalExecute = quickActions.executeAction.bind(quickActions);
      quickActions.executeAction = function(action) {
        // קריאה לפונקציה המקורית
        originalExecute(action);
        
        // שליחת אירוע
        gtag('event', 'quick_action_used', {
          'event_category': 'Shortcuts',
          'event_label': action,
          'value': 1
        });
        console.log('📊 Analytics: Quick action used:', action);
      };
      console.log('✅ Analytics: Quick actions tracking enabled');
    }
  }, 500);
  
  setTimeout(() => clearInterval(waitForQuickActions), 10000);
  
  // ==================== מעקב אחרי שגיאות ====================
  
  window.addEventListener('error', (event) => {
    gtag('event', 'exception', {
      'description': event.message,
      'fatal': false
    });
    console.log('📊 Analytics: Error tracked:', event.message);
  });
  
  console.log('✅ Analytics: Error tracking enabled');
  
  // ==================== אירוע התחלתי - טעינת עמוד ====================
  
  window.addEventListener('DOMContentLoaded', () => {
    gtag('event', 'page_view', {
      'page_title': document.title,
      'page_location': window.location.href,
      'page_path': window.location.pathname
    });
    console.log('📊 Analytics: Page view event sent');
  });
}

console.log('✅ Analytics Tracking: Setup complete');

// ==================== פונקציות עזר ====================

// פונקציה לשליחת אירוע מותאם מכל מקום בקוד
window.trackEvent = function(eventName, category, label, value) {
  if (typeof gtag !== 'undefined') {
    gtag('event', eventName, {
      'event_category': category,
      'event_label': label,
      'value': value
    });
    console.log('📊 Analytics: Custom event sent:', eventName);
  }
};

// פונקציה לשליחת זמן (timing)
window.trackTiming = function(category, variable, time, label) {
  if (typeof gtag !== 'undefined') {
    gtag('event', 'timing_complete', {
      'event_category': category,
      'name': variable,
      'value': time,
      'event_label': label
    });
    console.log('📊 Analytics: Timing event sent:', category, variable, time);
  }
};

console.log('📊 Analytics Tracking: Helper functions ready');
console.log('');
console.log('📊 Available tracking:');
console.log('  ✅ Task completed/uncompleted');
console.log('  ✅ Task added');
console.log('  ✅ Pomodoro completed');
console.log('  ✅ Achievement unlocked');
console.log('  ✅ Level up');
console.log('  ✅ Data export');
console.log('  ✅ Theme changes');
console.log('  ✅ Search queries');
console.log('  ✅ View mode changes');
console.log('  ✅ Quick actions usage');
console.log('  ✅ Error tracking');
console.log('');
console.log('💡 Tip: Use trackEvent(name, category, label, value) for custom events');
