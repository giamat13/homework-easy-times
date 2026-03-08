// 🗑️ Delete Account Functionality
// ===================================
// מחיקה מלאה של משתמש וכל הנתונים שלו

console.log('🗑️ Loading delete account functionality...');

/**
 * פונקציה למחיקת חשבון משתמש מלאה
 * מוחקת:
 * - את כל הנתונים מ-Firestore
 * - את כל הנתונים מ-localStorage
 * - את כל ה-cookies
 * - את החשבון עצמו מ-Firebase Authentication
 */
async function deleteUserAccount() {
  console.log('🗑️ deleteUserAccount: Starting account deletion process...');
  
  try {
    const user = firebase.auth().currentUser;
    
    if (!user) {
      console.warn('⚠️ deleteUserAccount: No user logged in');
      if (notifications && notifications.showInAppNotification) {
        notifications.showInAppNotification('אין משתמש מחובר', 'error');
      }
      return;
    }
    
    // בקשת אישור סופי מהמשתמש
    const confirmed = confirm(
      '⚠️ אזהרה! פעולה זו תמחק לצמיתות:\n\n' +
      '❌ את החשבון שלך\n' +
      '❌ את כל הנתונים שלך (מקצועות, משימות, סטטיסטיקות)\n' +
      '❌ מה-Firebase, מהמחשב המקומי ומכל מכשיר\n\n' +
      '⚠️ לא ניתן לשחזר את הנתונים!\n\n' +
      'האם אתה בטוח שברצונך להמשיך?'
    );
    
    if (!confirmed) {
      console.log('ℹ️ User cancelled account deletion');
      if (notifications && notifications.showInAppNotification) {
        notifications.showInAppNotification('המחיקה בוטלה', 'info');
      }
      return;
    }
    
    // אישור נוסף עם הקלדת טקסט
    const confirmText = prompt(
      '⚠️ אישור סופי!\n\n' +
      'כדי לאשר את מחיקת החשבון,\n' +
      'הקלד את המילה: מחק\n\n' +
      '(באותיות עבריות)'
    );
    
    if (confirmText !== 'מחק') {
      console.log('ℹ️ User failed confirmation text');
      if (notifications && notifications.showInAppNotification) {
        notifications.showInAppNotification('המחיקה בוטלה - טקסט אישור שגוי', 'info');
      }
      return;
    }
    
    console.log('✅ User confirmed deletion, proceeding...');
    
    if (notifications && notifications.showInAppNotification) {
      notifications.showInAppNotification('מוחק חשבון ונתונים...', 'info');
    }
    
    const userId = user.uid;
    const userEmail = user.email;
    
    console.log(`🗑️ Deleting all data for user: ${userId} (${userEmail})`);
    
    // שלב 1: מחיקת כל הנתונים מ-Firestore
    console.log('🗑️ Step 1: Deleting Firestore data...');
    try {
      const db = firebase.firestore();
      const userDoc = db.collection('users').doc(userId);
      
      // מחיקת כל ה-subcollections
      const collections = ['subjects', 'homework', 'gamification', 'settings'];
      
      for (const collectionName of collections) {
        console.log(`🗑️ Deleting ${collectionName} collection...`);
        const snapshot = await userDoc.collection(collectionName).get();
        
        const batch = db.batch();
        snapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });
        
        await batch.commit();
        console.log(`✅ Deleted ${snapshot.docs.length} documents from ${collectionName}`);
      }
      
      // מחיקת ה-document הראשי של המשתמש
      await userDoc.delete();
      console.log('✅ Deleted main user document from Firestore');
      
    } catch (firestoreError) {
      console.error('❌ Error deleting Firestore data:', firestoreError);
      // ממשיכים למרות השגיאה
    }
    
    // שלב 2: מחיקת כל הנתונים מ-localStorage
    console.log('🗑️ Step 2: Clearing localStorage...');
    try {
      // שמירת רשימה של כל המפתחות לפני המחיקה (לצורך לוג)
      const localStorageKeys = Object.keys(localStorage);
      console.log(`🗑️ Found ${localStorageKeys.length} items in localStorage:`, localStorageKeys);
      
      // מחיקת הכל
      localStorage.clear();
      console.log('✅ localStorage cleared');
      
    } catch (localStorageError) {
      console.error('❌ Error clearing localStorage:', localStorageError);
    }
    
    // שלב 3: מחיקת כל ה-cookies
    console.log('🗑️ Step 3: Clearing cookies...');
    try {
      // מחיקת כל ה-cookies
      const cookies = document.cookie.split(';');
      
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i];
        const eqPos = cookie.indexOf('=');
        const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
        
        // מחיקת ה-cookie עם כל האפשרויות
        document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
        document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=' + window.location.hostname;
        document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.' + window.location.hostname;
      }
      
      console.log(`✅ Cleared ${cookies.length} cookies`);
      
    } catch (cookieError) {
      console.error('❌ Error clearing cookies:', cookieError);
    }
    
    // שלב 4: מחיקת החשבון מ-Firebase Authentication
    console.log('🗑️ Step 4: Deleting Firebase Authentication account...');
    try {
      await user.delete();
      console.log('✅ Firebase Authentication account deleted');
      
    } catch (authError) {
      console.error('❌ Error deleting Firebase auth account:', authError);
      
      // אם יש שגיאה של צורך באימות מחדש
      if (authError.code === 'auth/requires-recent-login') {
        if (notifications && notifications.showInAppNotification) {
          notifications.showInAppNotification(
            '⚠️ צריך להתחבר מחדש כדי למחוק גם את החשבון בענן',
            'error'
          );
        }
        
        alert(
          '⚠️ מחיקה חלקית הושלמה\n\n' +
          '✅ הנתונים המקומיים נמחקו (localStorage + cookies)\n' +
          '❌ החשבון והנתונים בענן עדיין קיימים\n\n' +
          'כדי למחוק גם את החשבון והנתונים מהענן:\n' +
          '1. התחבר שוב לחשבון\n' +
          '2. לך להגדרות\n' +
          '3. לחץ שוב על "מחק חשבון"\n\n' +
          'או:\n' +
          '• אם אתה רוצה להשאיר את החשבון בענן - פשוט אל תתחבר שוב\n' +
          '• הנתונים המקומיים כבר נמחקו מהמכשיר הזה'
        );
        
        // התנתקות
        await firebase.auth().signOut();
        
        // רענון הדף
        window.location.reload();
        return;
      }
      
      throw authError;
    }
    
    // שלב 5: הודעת הצלחה והפניה מחדש
    console.log('✅ Account deletion completed successfully!');
    
    alert(
      '✅ החשבון נמחק בהצלחה!\n\n' +
      '✓ כל הנתונים נמחקו מהשרת\n' +
      '✓ כל הנתונים נמחקו מהמחשב\n' +
      '✓ החשבון נמחק לצמיתות\n\n' +
      'להתראות! 👋'
    );
    
    // רענון הדף כדי לחזור למסך ההתחברות
    window.location.reload();
    
  } catch (error) {
    console.error('❌ deleteUserAccount: Critical error during deletion:', error);
    
    let errorMessage = 'שגיאה במחיקת החשבון: ' + error.message;
    
    // הודעות שגיאה ספציפיות
    if (error.code === 'auth/requires-recent-login') {
      errorMessage = 'נדרשת התחברות מחדש. אנא התחבר שוב ונסה למחוק את החשבון.';
    }
    
    if (notifications && notifications.showInAppNotification) {
      notifications.showInAppNotification(errorMessage, 'error');
    }
    
    alert('❌ שגיאה במחיקת החשבון:\n\n' + error.message);
  }
}

// הפיכת הפונקציה לגלובלית
window.deleteUserAccount = deleteUserAccount;

console.log('✅ Delete account function is ready: window.deleteUserAccount()');
console.log('');
console.log('⚠️ WARNING: This function will permanently delete:');
console.log('  • User account from Firebase Authentication');
console.log('  • All user data from Firestore');
console.log('  • All data from localStorage');
console.log('  • All cookies');
console.log('  • THIS CANNOT BE UNDONE!');