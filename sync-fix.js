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
    // בדיקה אם Firebase זמין ומאותחל
    let user = null;
    try {
      user = firebase.auth().currentUser;
    } catch (e) {
      console.warn('⚠️ manualSync: Firebase not ready yet');
      if (notifications && notifications.showInAppNotification) {
        notifications.showInAppNotification('Firebase לא מוכן עדיין', 'error');
      }
      return;
    }

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
    const sm = window.storageManager || window.storage;
    if (sm) {
      console.log('🔄 manualSync: Using storageManager.syncAllToFirestore()');
      await sm.syncAllToFirestore();

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

window.manualSync = manualSync;
console.log('✅ Manual sync function is ready: window.manualSync()');

/**
 * פונקציה לרענון הנתונים מ-Firestore
 */
async function refreshFromFirestore() {
  console.log('🔄 refreshFromFirestore: Refreshing data from Firestore...');

  try {
    let user = null;
    try {
      user = firebase.auth().currentUser;
    } catch (e) {
      console.warn('⚠️ refreshFromFirestore: Firebase not ready yet');
      return;
    }

    if (!user) {
      console.warn('⚠️ refreshFromFirestore: No user logged in');
      return;
    }

    if (notifications && notifications.showInAppNotification) {
      notifications.showInAppNotification('מרענן נתונים...', 'info');
    }

    const sm = window.storageManager || window.storage;
    if (sm) {
      console.log('🔄 refreshFromFirestore: Using storageManager.syncAllFromFirestore()');
      await sm.syncAllFromFirestore();

      if (typeof loadData === 'function') {
        console.log('🔄 refreshFromFirestore: Reloading app data...');
        await loadData();
      }

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

window.refreshFromFirestore = refreshFromFirestore;
console.log('✅ Refresh function is ready: window.refreshFromFirestore()');

/**
 * פונקציה משולבת - סנכרון + רענון
 */
async function syncAndRefresh() {
  console.log('🔄 syncAndRefresh: Starting sync and refresh...');

  // 1. סנכרן מ-Google Classroom קודם (אם מחובר)
  if (typeof classroomIntegration !== 'undefined' && classroomIntegration.isConnected) {
    console.log('📚 syncAndRefresh: Syncing Classroom first...');
    await classroomIntegration.syncIfConnected();
  }

  // 2. סנכרן לענן
  await manualSync();
  setTimeout(async () => {
    await refreshFromFirestore();
  }, 1000);
}

window.syncAndRefresh = syncAndRefresh;
console.log('✅ Combined sync function is ready: window.syncAndRefresh()');
console.log('');
console.log('📚 Available sync functions:');
console.log('  • manualSync() - Upload all data to Firestore');
console.log('  • refreshFromFirestore() - Download all data from Firestore');
console.log('  • syncAndRefresh() - Upload + Download (recommended)');

// ===================================
// סנכרון אוטומטי
// ===================================

let autoSyncInterval = null;
let isAutoSyncEnabled = localStorage.getItem('autoSyncEnabled') !== 'false';

function startAutoSync() {
  if (autoSyncInterval) {
    console.log('⚠️ Auto-sync is already running');
    return;
  }

  console.log('🔄 Starting auto-sync every 30 seconds...');

  autoSyncInterval = setInterval(() => {
    console.log('🔄 Auto-sync: Running scheduled sync...');
    syncAndRefresh();
  }, 30000);

  isAutoSyncEnabled = true;
  localStorage.setItem('autoSyncEnabled', 'true');
  console.log('✅ Auto-sync enabled');
}

function stopAutoSync() {
  if (autoSyncInterval) {
    clearInterval(autoSyncInterval);
    autoSyncInterval = null;
    isAutoSyncEnabled = false;
    localStorage.setItem('autoSyncEnabled', 'false');
    console.log('⏸️ Auto-sync disabled');
  }
}

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

window.startAutoSync = startAutoSync;
window.stopAutoSync = stopAutoSync;
window.toggleAutoSync = toggleAutoSync;

// ✅ הפעלה אוטומטית - עטוף ב-DOMContentLoaded כדי שFirebase יהיה מוכן
window.addEventListener('DOMContentLoaded', () => {
  // המתן עד שה-auth יאותחל ואז הגדר listener
  setTimeout(() => {
    try {
      firebase.auth().onAuthStateChanged((user) => {
        if (user && isAutoSyncEnabled && !autoSyncInterval) {
          console.log('🔄 User logged in, running immediate sync...');
          syncAndRefresh();

          setTimeout(() => {
            console.log('🔄 Running verification sync (1 second after login)...');
            syncAndRefresh();
          }, 1000);

          setTimeout(() => {
            console.log('🔄 Starting auto-sync interval...');
            startAutoSync();
          }, 2000);

        } else if (!user && autoSyncInterval) {
          console.log('⏸️ User logged out, stopping auto-sync...');
          stopAutoSync();
        }
      });
    } catch (e) {
      console.warn('⚠️ sync-fix: Could not set up auth listener:', e.message);
    }
  }, 500); // המתן 500ms לאתחול Firebase
});

console.log('');
console.log('🤖 Auto-sync functions:');
console.log('  • startAutoSync() - Start automatic sync every 30 seconds');
console.log('  • stopAutoSync() - Stop automatic sync');
console.log('  • toggleAutoSync() - Toggle auto-sync on/off');