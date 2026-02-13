// ============================================
// 🔄 AUTH SYNC FIX - Auto-sync on login/logout
// ============================================

console.log('🔄 Auth Sync Fix: Initializing...');

// המתן ל-Firebase וה-StorageManager להיות מוכנים
if (typeof firebase !== 'undefined' && window.storageManager) {
  console.log('✅ Firebase and StorageManager ready');

  // האזן לשינויים במצב ההתחברות
  firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
      console.log('🔄 Auth Sync: User logged in, syncing data...');
      
      try {
        // שלב 1: העלה נתונים מקומיים ל-Firestore (אם יש)
        await window.storageManager.syncAllToFirestore();
        console.log('✅ Step 1: Local data uploaded to Firestore');

        // שלב 2: הורד נתונים מ-Firestore ל-localStorage
        await window.storageManager.syncAllFromFirestore();
        console.log('✅ Step 2: Firestore data downloaded to localStorage');

        // שלב 3: טען מחדש את האפליקציה
        if (typeof loadData === 'function') {
          console.log('🔄 Step 3: Reloading app data...');
          await loadData();
          console.log('✅ Step 3: App data reloaded');
        }

        console.log('🎉 Auth Sync: Sync completed successfully!');
        
        // הצג הודעה למשתמש
        if (window.notificationsManager) {
          window.notificationsManager.showInAppNotification(
            'הנתונים סונכרנו בהצלחה! 🎉',
            'success'
          );
        }
      } catch (error) {
        console.error('❌ Auth Sync: Sync failed:', error);
        
        if (window.notificationsManager) {
          window.notificationsManager.showInAppNotification(
            'שגיאה בסנכרון נתונים',
            'error'
          );
        }
      }
    } else {
      console.log('👤 Auth Sync: User logged out, data remains in localStorage');
    }
  });

  console.log('✅ Auth Sync Fix: Initialized successfully');
} else {
  console.error('❌ Auth Sync Fix: Firebase or StorageManager not available');
}
