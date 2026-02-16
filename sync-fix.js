// 🔧 FIX: Manual Sync Functionality
// ===================================
// תיקון לבעיית הסנכרון הידני - מוסיף פונקציה גלובלית

console.log('🔧 Loading manual sync fix...');

/**
 * פונקציה לסנכרון ידני של כל הנתונים
 * מעלה את כל הנתונים המקומיים ל-Firestore
 */
async function manualSync() {
  console.log('🔄 manualSync: Starting manual sync...');
  
  try {
    // בדיקה אם משתמש מחובר
    const user = firebase.auth().currentUser;
    
    if (!user) {
      console.warn('⚠️ manualSync: No user logged in');
      if (notifications && notifications.showInAppNotification) {
        notifications.showInAppNotification('אין משתמש מחובר', 'error');
      }
      return;
    }
    
    // הצגת הודעת התחלה
    if (notifications && notifications.showInAppNotification) {
      notifications.showInAppNotification('מתחיל סנכרון...', 'info');
    }
    
    // שימוש ב-storageManager לסנכרון כל הנתונים
    if (typeof storageManager !== 'undefined') {
      console.log('🔄 manualSync: Using storageManager.syncAllToFirestore()');
      await storageManager.syncAllToFirestore();
      
      // הודעת הצלחה
      if (notifications && notifications.showInAppNotification) {
        notifications.showInAppNotification('✅ הנתונים סונכרנו בהצלחה!', 'success');
      }
      
      console.log('✅ manualSync: Sync completed successfully');
    } else {
      console.error('❌ manualSync: storageManager not found');
      if (notifications && notifications.showInAppNotification) {
        notifications.showInAppNotification('שגיאה: מערכת האחסון לא זמינה', 'error');
      }
    }
    
  } catch (error) {
    console.error('❌ manualSync: Error during sync:', error);
    if (notifications && notifications.showInAppNotification) {
      notifications.showInAppNotification('שגיאה בסנכרון: ' + error.message, 'error');
    }
  }
}

// הפיכת הפונקציה לגלובלית
window.manualSync = manualSync;

console.log('✅ Manual sync function is ready: window.manualSync()');

// ===================================
// תיקון נוסף: הוספת כפתור רענון אוטומטי לאחר סנכרון
// ===================================

/**
 * פונקציה לרענון הנתונים מ-Firestore
 */
async function refreshFromFirestore() {
  console.log('🔄 refreshFromFirestore: Refreshing data from Firestore...');
  
  try {
    const user = firebase.auth().currentUser;
    
    if (!user) {
      console.warn('⚠️ refreshFromFirestore: No user logged in');
      return;
    }
    
    if (notifications && notifications.showInAppNotification) {
      notifications.showInAppNotification('מרענן נתונים...', 'info');
    }
    
    // שימוש ב-storageManager להורדת כל הנתונים
    if (typeof storageManager !== 'undefined') {
      console.log('🔄 refreshFromFirestore: Using storageManager.syncAllFromFirestore()');
      await storageManager.syncAllFromFirestore();
      
      // טעינה מחדש של הנתונים לאפליקציה
      if (typeof loadData === 'function') {
        console.log('🔄 refreshFromFirestore: Reloading app data...');
        await loadData();
      }
      
      // רינדור מחדש
      if (typeof render === 'function') {
        console.log('🔄 refreshFromFirestore: Re-rendering UI...');
        render();
      }
      
      if (notifications && notifications.showInAppNotification) {
        notifications.showInAppNotification('✅ הנתונים רועננו בהצלחה!', 'success');
      }
      
      console.log('✅ refreshFromFirestore: Refresh completed successfully');
    } else {
      console.error('❌ refreshFromFirestore: storageManager not found');
    }
    
  } catch (error) {
    console.error('❌ refreshFromFirestore: Error during refresh:', error);
    if (notifications && notifications.showInAppNotification) {
      notifications.showInAppNotification('שגיאה ברענון: ' + error.message, 'error');
    }
  }
}

// הפיכת הפונקציה לגלובלית
window.refreshFromFirestore = refreshFromFirestore;

console.log('✅ Refresh function is ready: window.refreshFromFirestore()');

// ===================================
// תיקון נוסף: הוספת פונקציה משולבת
// ===================================

/**
 * פונקציה משולבת - סנכרון + רענון
 */
async function syncAndRefresh() {
  console.log('🔄 syncAndRefresh: Starting sync and refresh...');
  
  await manualSync(); // העלאה
  
  setTimeout(async () => {
    await refreshFromFirestore(); // הורדה
  }, 1000); // המתנה של שנייה בין ההעלאה להורדה
}

window.syncAndRefresh = syncAndRefresh;

console.log('✅ Combined sync function is ready: window.syncAndRefresh()');
console.log('');
console.log('📚 Available sync functions:');
console.log('  • manualSync() - Upload all data to Firestore');
console.log('  • refreshFromFirestore() - Download all data from Firestore');
console.log('  • syncAndRefresh() - Upload + Download (recommended)');

// ===================================
// סנכרון אוטומטי כל 30 שניות
// ===================================

let autoSyncInterval = null;
let isAutoSyncEnabled = localStorage.getItem('autoSyncEnabled') !== 'false'; // ברירת מחדל: מופעל

/**
 * פונקציה להפעלת סנכרון אוטומטי
 */
function startAutoSync() {
  if (autoSyncInterval) {
    console.log('⚠️ Auto-sync is already running');
    return;
  }
  
  console.log('🔄 Starting auto-sync every 30 seconds...');
  
  // סנכרון ראשוני
  setTimeout(() => {
    syncAndRefresh();
  }, 5000); // סנכרון ראשון אחרי 5 שניות
  
  // סנכרון כל 30 שניות
  autoSyncInterval = setInterval(() => {
    console.log('🔄 Auto-sync: Running scheduled sync...');
    syncAndRefresh();
  }, 30000); // 30,000 מילישניות = 30 שניות
  
  isAutoSyncEnabled = true;
  localStorage.setItem('autoSyncEnabled', 'true');
  console.log('✅ Auto-sync enabled');
}

/**
 * פונקציה לעצירת סנכרון אוטומטי
 */
function stopAutoSync() {
  if (autoSyncInterval) {
    clearInterval(autoSyncInterval);
    autoSyncInterval = null;
    isAutoSyncEnabled = false;
    localStorage.setItem('autoSyncEnabled', 'false');
    console.log('⏸️ Auto-sync disabled');
  }
}

/**
 * פונקציה להחלפת מצב הסנכרון האוטומטי
 */
function toggleAutoSync() {
  if (isAutoSyncEnabled) {
    stopAutoSync();
    if (notifications && notifications.showInAppNotification) {
      notifications.showInAppNotification('סנכרון אוטומטי הושבת', 'info');
    }
  } else {
    startAutoSync();
    if (notifications && notifications.showInAppNotification) {
      notifications.showInAppNotification('סנכרון אוטומטי הופעל', 'success');
    }
  }
}

// הפיכת הפונקציות לגלובליות
window.startAutoSync = startAutoSync;
window.stopAutoSync = stopAutoSync;
window.toggleAutoSync = toggleAutoSync;

// הפעלה אוטומטית כשהמשתמש מחובר
if (isAutoSyncEnabled) {
  // המתן עד שהאפליקציה תהיה מוכנה
  window.addEventListener('load', () => {
    setTimeout(() => {
      const user = firebase.auth().currentUser;
      if (user) {
        console.log('🔄 Page loaded with logged-in user, running immediate sync...');
        syncAndRefresh();
        
        // סנכרון נוסף אחרי שנייה
        setTimeout(() => {
          console.log('🔄 Running verification sync (1 second after page load)...');
          syncAndRefresh();
        }, 1000);
        
        // הפעלת סנכרון אוטומטי קבוע
        setTimeout(() => {
          console.log('🔄 Starting auto-sync interval...');
          startAutoSync();
        }, 2000);
      }
    }, 1000); // המתן שנייה אחרי טעינת הדף
  });
}

// הפעלה אוטומטית גם כשמשתמש מתחבר
firebase.auth().onAuthStateChanged((user) => {
  if (user && isAutoSyncEnabled && !autoSyncInterval) {
    // סנכרון מיידי - מיד אחרי התחברות
    console.log('🔄 User logged in, running immediate sync...');
    syncAndRefresh();
    
    // סנכרון נוסף אחרי שנייה אחת - לוודא שהכל מסונכרן
    setTimeout(() => {
      console.log('🔄 Running verification sync (1 second after login)...');
      syncAndRefresh();
    }, 1000);
    
    // הפעלת סנכרון אוטומטי קבוע אחרי 2 שניות
    setTimeout(() => {
      console.log('🔄 Starting auto-sync interval...');
      startAutoSync();
    }, 2000);
  } else if (!user && autoSyncInterval) {
    console.log('⏸️ User logged out, stopping auto-sync...');
    stopAutoSync();
  }
});

console.log('');
console.log('🤖 Auto-sync functions:');
console.log('  • startAutoSync() - Start automatic sync every 30 seconds');
console.log('  • stopAutoSync() - Stop automatic sync');
console.log('  • toggleAutoSync() - Toggle auto-sync on/off');
console.log('  • Current status: ' + (isAutoSyncEnabled ? '✅ ENABLED' : '⏸️ DISABLED'));ג