// ============================================
// 🔧 AUTH ENHANCEMENTS - Delete Account + Better Login UI
// ============================================

console.log('🔧 Auth Enhancements: Loading...');

// המתן עד שה-AuthManager יהיה מוכן
const waitForAuthManager = setInterval(() => {
  if (typeof window.authManager !== 'undefined') {
    clearInterval(waitForAuthManager);
    initializeEnhancements();
  }
}, 100);

function initializeEnhancements() {
  console.log('✅ Auth Enhancements: AuthManager ready, adding enhancements...');

  // ============================================
  // 1️⃣ ADD DELETE ACCOUNT FUNCTIONALITY
  // ============================================
  
  /**
   * מחיקת משתמש מהמערכת
   */
  window.authManager.deleteAccount = async function() {
    console.log('🗑️ DeleteAccount: Starting account deletion...');

    const user = firebase.auth().currentUser;
    if (!user) {
      console.error('❌ DeleteAccount: No user logged in');
      window.notificationsManager?.showInAppNotification(
        'שגיאה: אין משתמש מחובר',
        'error'
      );
      return;
    }

    // אישור מהמשתמש
    const confirmed = confirm(
      '⚠️ האם אתה בטוח שברצונך למחוק את החשבון?\n\n' +
      'פעולה זו תמחק:\n' +
      '✗ את כל הנתונים שלך\n' +
      '✗ את המשתמש מהמערכת\n' +
      '✗ את כל ההגדרות\n\n' +
      'פעולה זו בלתי הפיכה!'
    );

    if (!confirmed) {
      console.log('⏸️ DeleteAccount: User cancelled');
      return;
    }

    // אישור כפול
    const finalConfirm = confirm(
      '🛑 אישור אחרון!\n\n' +
      'האם אתה באמת בטוח? פעולה זו לא ניתנת לביטול!'
    );

    if (!finalConfirm) {
      console.log('⏸️ DeleteAccount: User cancelled final confirmation');
      return;
    }

    try {
      // שלב 1: מחק את כל הנתונים מ-Firestore
      console.log('🗑️ Step 1: Deleting Firestore data...');
      try {
        const db = firebase.firestore();
        const batch = db.batch();
        
        // מחק את כל תת-הקולקציות של המשתמש
        const collections = ['data', 'settings', 'preferences'];
        
        for (const collectionName of collections) {
          const snapshot = await db.collection('users').doc(user.uid).collection(collectionName).get();
          snapshot.forEach(doc => {
            batch.delete(doc.ref);
          });
        }
        
        // מחק את מסמך המשתמש
        batch.delete(db.collection('users').doc(user.uid));
        
        await batch.commit();
        console.log('✅ Step 1: Firestore data deleted');
      } catch (firestoreError) {
        console.warn('⚠️ Step 1: Firestore deletion failed (may not have permissions):', firestoreError.message);
      }

      // שלב 2: מחק את כל הנתונים המקומיים
      console.log('🗑️ Step 2: Deleting local data...');
      localStorage.clear();
      sessionStorage.clear();
      console.log('✅ Step 2: Local data deleted');

      // שלב 3: מחק את המשתמש מ-Firebase Auth
      console.log('🗑️ Step 3: Deleting Firebase Auth user...');
      await user.delete();
      console.log('✅ Step 3: User deleted from Firebase Auth');

      // הצלחה!
      console.log('🎉 DeleteAccount: Account deleted successfully');
      
      // הצג הודעה והפנה לדף ההתחברות
      alert('✅ החשבון נמחק בהצלחה!\n\nתועבר לדף ההתחברות.');
      
      // רענן את הדף
      window.location.reload();
      
    } catch (error) {
      console.error('❌ DeleteAccount: Error deleting account:', error);
      
      // בדיקת סוג השגיאה
      if (error.code === 'auth/requires-recent-login') {
        alert(
          '⚠️ מסיבות אבטחה, יש להתחבר מחדש לפני מחיקת החשבון.\n\n' +
          'אנא התנתק והתחבר שוב, ואז נסה למחוק את החשבון.'
        );
      } else {
        alert('❌ שגיאה במחיקת החשבון: ' + error.message);
      }
      
      window.notificationsManager?.showInAppNotification(
        'שגיאה במחיקת החשבון',
        'error'
      );
    }
  };

  // ============================================
  // 2️⃣ ENHANCE LOGIN UI - Add Google/Phone to Login Tab
  // ============================================
  
  // שמור את הפונקציה המקורית
  const originalRenderAuthUI = window.authManager.renderAuthUI;
  
  // החלף בגרסה משופרת
  window.authManager.renderAuthUI = function() {
    // קרא לפונקציה המקורית
    originalRenderAuthUI.call(this);
    
    // הוסף כפתורי Google/Phone לטאב התחברות
    setTimeout(() => {
      const loginForm = document.querySelector('#login-form');
      if (loginForm) {
        // בדוק אם כבר הוספנו את הכפתורים
        if (loginForm.querySelector('.social-login-divider-enhanced')) {
          return; // כבר הוספנו
        }
        
        // מצא את כפתור ההתחברות
        const loginButton = loginForm.querySelector('button[type="submit"]');
        if (loginButton) {
          // הוסף מפריד וכפתורים אחרי כפתור ההתחברות
          const socialLoginHTML = `
            <div class="social-login-divider-enhanced" style="margin: 1.5rem 0; text-align: center;">
              <span style="color: #666; font-size: 0.9rem;">או התחבר עם</span>
            </div>
            
            <button type="button" class="btn-google-enhanced" onclick="authManager.signInWithGoogle()" style="width: 100%; margin-bottom: 0.75rem; padding: 0.75rem; background: white; color: #333; border: 1px solid #ddd; border-radius: 0.5rem; font-size: 1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; transition: all 0.2s;">
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Google</span>
            </button>
            
            <button type="button" class="btn-phone-enhanced" onclick="document.querySelector('.auth-tab[data-tab=\\'phone\\']').click()" style="width: 100%; padding: 0.75rem; background: white; color: #333; border: 1px solid #ddd; border-radius: 0.5rem; font-size: 1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; transition: all 0.2s;">
              <span style="font-size: 1.5rem;">📱</span>
              <span>טלפון</span>
            </button>
          `;
          
          loginButton.insertAdjacentHTML('afterend', socialLoginHTML);
          
          // הוסף hover effects
          const style = document.createElement('style');
          style.textContent = `
            .btn-google-enhanced:hover, .btn-phone-enhanced:hover {
              background: #f5f5f5 !important;
              transform: translateY(-2px);
              box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            }
          `;
          document.head.appendChild(style);
          
          console.log('✅ Added Google/Phone buttons to login tab');
        }
      }
    }, 100);
  };

  // ============================================
  // 3️⃣ ADD DELETE ACCOUNT BUTTON TO USER MENU
  // ============================================
  
  // האזן לשינויי DOM להוסיף כפתור מחיקה לתפריט המשתמש
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1 && node.classList && node.classList.contains('user-menu-content')) {
          // מצאנו את תפריט המשתמש - הוסף כפתור מחיקה
          if (!node.querySelector('.delete-account-btn')) {
            const deleteButton = document.createElement('button');
            deleteButton.className = 'user-menu-item delete-account-btn';
            deleteButton.style.cssText = 'color: #ef4444; border-top: 1px solid #ddd; margin-top: 0.5rem; padding-top: 0.75rem;';
            deleteButton.innerHTML = '🗑️ מחק חשבון';
            deleteButton.onclick = () => {
              // סגור את התפריט
              const menu = document.querySelector('.user-menu-content');
              if (menu) menu.style.display = 'none';
              // קרא לפונקציית המחיקה
              window.authManager.deleteAccount();
            };
            
            node.appendChild(deleteButton);
            console.log('✅ Added delete account button to user menu');
          }
        }
      });
    });
  });

  // התחל להאזין
  observer.observe(document.body, { childList: true, subtree: true });

  // ============================================
  // 4️⃣ RENDER THE ENHANCED UI
  // ============================================
  
  // רנדר את הUI המשופר
  if (firebase.auth().currentUser) {
    console.log('✅ User already logged in, no need to render auth UI');
  } else {
    console.log('🎨 Rendering enhanced auth UI...');
    window.authManager.renderAuthUI();
  }

  console.log('✅ Auth Enhancements: All enhancements loaded successfully');
}
