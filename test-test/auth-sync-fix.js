// ============================================
// 🔄 AUTH SYNC FIX - Auto-sync on login/logout
// ============================================

console.log('🔄 Auth Sync Fix: Initializing...');

// ============================================
// 🎨 CSS FOR SYNC ANIMATION
// ============================================
const syncAnimationCSS = `
  @keyframes syncPulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.1); opacity: 0.8; }
  }
  
  @keyframes syncRotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  .sync-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    backdrop-filter: blur(5px);
    animation: fadeIn 0.3s ease;
  }
  
  .sync-container {
    background: white;
    padding: 40px;
    border-radius: 20px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.3);
    text-align: center;
    max-width: 400px;
    animation: slideUp 0.4s ease;
  }
  
  .sync-icon {
    font-size: 64px;
    margin-bottom: 20px;
    animation: syncRotate 2s linear infinite;
  }
  
  .sync-title {
    font-size: 24px;
    font-weight: bold;
    color: #333;
    margin-bottom: 10px;
  }
  
  .sync-message {
    font-size: 16px;
    color: #666;
    margin-bottom: 20px;
  }
  
  .sync-progress {
    width: 100%;
    height: 8px;
    background: #e0e0e0;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 15px;
  }
  
  .sync-progress-bar {
    height: 100%;
    background: linear-gradient(90deg, #4CAF50, #8BC34A);
    border-radius: 4px;
    transition: width 0.3s ease;
    animation: syncPulse 1.5s ease infinite;
  }
  
  .sync-steps {
    text-align: right;
    font-size: 14px;
    color: #888;
  }
  
  .sync-step {
    padding: 8px 0;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  
  .sync-step-icon {
    font-size: 18px;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes slideUp {
    from { 
      opacity: 0;
      transform: translateY(30px);
    }
    to { 
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes checkmark {
    from { 
      transform: scale(0) rotate(-45deg);
    }
    to { 
      transform: scale(1) rotate(0deg);
    }
  }
  
  .sync-complete {
    color: #4CAF50;
    font-size: 72px;
    animation: checkmark 0.5s ease;
  }
`;

// הוסף CSS לדף
const styleElement = document.createElement('style');
styleElement.textContent = syncAnimationCSS;
document.head.appendChild(styleElement);
console.log('✅ Sync animation CSS added');

// ============================================
// 🎨 SYNC UI FUNCTIONS
// ============================================
function showSyncOverlay() {
  const overlay = document.createElement('div');
  overlay.className = 'sync-overlay';
  overlay.id = 'sync-overlay';
  
  overlay.innerHTML = `
    <div class="sync-container">
      <div class="sync-icon">🔄</div>
      <div class="sync-title">מסנכרן נתונים</div>
      <div class="sync-message">אנא המתן, הנתונים שלך מסתנכרנים...</div>
      <div class="sync-progress">
        <div class="sync-progress-bar" id="sync-progress-bar" style="width: 0%"></div>
      </div>
      <div class="sync-steps" id="sync-steps">
        <div class="sync-step">
          <span class="sync-step-icon">⏳</span>
          <span>מכין לסנכרון...</span>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(overlay);
  return overlay;
}

function updateSyncProgress(progress, message) {
  const progressBar = document.getElementById('sync-progress-bar');
  const steps = document.getElementById('sync-steps');
  
  if (progressBar) {
    progressBar.style.width = `${progress}%`;
  }
  
  if (steps && message) {
    const step = document.createElement('div');
    step.className = 'sync-step';
    step.innerHTML = `
      <span class="sync-step-icon">✅</span>
      <span>${message}</span>
    `;
    steps.appendChild(step);
  }
}

function showSyncComplete() {
  const overlay = document.getElementById('sync-overlay');
  if (!overlay) return;
  
  const container = overlay.querySelector('.sync-container');
  container.innerHTML = `
    <div class="sync-complete">✅</div>
    <div class="sync-title">סונכרן בהצלחה!</div>
    <div class="sync-message">כל הנתונים שלך מעודכנים</div>
  `;
  
  setTimeout(() => {
    overlay.style.animation = 'fadeIn 0.3s ease reverse';
    setTimeout(() => overlay.remove(), 300);
  }, 1500);
}

function hideSyncOverlay() {
  const overlay = document.getElementById('sync-overlay');
  if (overlay) {
    overlay.style.animation = 'fadeIn 0.3s ease reverse';
    setTimeout(() => overlay.remove(), 300);
  }
}

// ============================================
// 🔄 SYNC LOGIC
// ============================================

// המתן ל-Firebase וה-StorageManager להיות מוכנים
if (typeof firebase !== 'undefined' && window.storageManager) {
  console.log('✅ Firebase and StorageManager ready');

  // האזן לשינויים במצב ההתחברות
  firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
      console.log('🔄 Auth Sync: User logged in, syncing data...');
      
      // הצג אנימציית סנכרון
      const overlay = showSyncOverlay();
      
      try {
        // שלב 1: העלה נתונים מקומיים ל-Firestore (אם יש)
        updateSyncProgress(25, 'מעלה נתונים מקומיים...');
        await window.storageManager.syncAllToFirestore();
        console.log('✅ Step 1: Local data uploaded to Firestore');

        // שלב 2: הורד נתונים מ-Firestore ל-localStorage
        updateSyncProgress(50, 'מוריד נתונים מהשרת...');
        await window.storageManager.syncAllFromFirestore();
        console.log('✅ Step 2: Firestore data downloaded to localStorage');

        // שלב 3: טען מחדש את האפליקציה
        updateSyncProgress(75, 'טוען את הנתונים...');
        if (typeof loadData === 'function') {
          console.log('🔄 Step 3: Reloading app data...');
          await loadData();
          console.log('✅ Step 3: App data reloaded');
        }

        // סיום
        updateSyncProgress(100, 'הסנכרון הושלם!');
        console.log('🎉 Auth Sync: Sync completed successfully!');
        
        // הצג הודעת הצלחה
        setTimeout(() => {
          showSyncComplete();
        }, 500);
        
      } catch (error) {
        console.error('❌ Auth Sync: Sync failed:', error);
        hideSyncOverlay();
        
        if (window.notificationsManager) {
          window.notificationsManager.showInAppNotification(
            'שגיאה בסנכרון נתונים - משתמש בנתונים מקומיים',
            'warning'
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
