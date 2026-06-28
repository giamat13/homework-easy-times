// ========================================
// Google Analytics Configuration
// ========================================
// החלף את ה-ID למטה עם ה-Measurement ID שלך מ-Google Analytics
const GA_MEASUREMENT_ID = 'G-3P7J53MD27'; // 👈 החלף כאן!

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.GA_MEASUREMENT_ID = GA_MEASUREMENT_ID;
}

// ========================================
// Google Classroom Integration
// ========================================
// כדי להפעיל סנכרון עם Google Classroom:
// 1. היכנס ל-console.cloud.google.com
// 2. צור פרויקט חדש (או בחר קיים)
// 3. הפעל את "Google Classroom API"
// 4. צור OAuth 2.0 Client ID (Web application)
// 5. הוסף את הדומיין שלך ל-Authorized JavaScript origins
// 6. הדבק את ה-Client ID כאן:
const GOOGLE_CLIENT_ID = '344316429906-ieeddq7bufco57vg80hnq06p3v38u3ac.apps.googleusercontent.com';

if (typeof window !== 'undefined') {
  window.GOOGLE_CLIENT_ID = GOOGLE_CLIENT_ID;
}

// ========================================
// Beta Banner Configuration
// ========================================
// הגדר true אם יש עדכון גדול, false אם לא
const isBigUpdate = true;

// Export for beta footer
if (typeof window !== 'undefined') {
  window.isBigUpdate = isBigUpdate;
}

console.log('✅ Config loaded:', {
  analyticsConfigured: GA_MEASUREMENT_ID !== 'G-XXXXXXXXXX',
  measurementId: GA_MEASUREMENT_ID,
  bigUpdate: isBigUpdate
});
// Firebase Configuration with Guest Mode Support
// ==============================================

const firebaseConfig = {
  apiKey: "AIzaSyCbHTfv0U0DdVRbKc4FSPQi-VF4zrdX0QQ",
  authDomain: "homework-easy-times.firebaseapp.com",
  projectId: "homework-easy-times",
  storageBucket: "homework-easy-times.firebasestorage.app",
  messagingSenderId: "344316429906",
  appId: "1:344316429906:web:853d2c96b6d0500128c18b",
  measurementId: "G-J3F285WRQM"
};

// ========================================
// Guest Mode Configuration
// ========================================
const GUEST_MODE = {
  enabled: true,
  // Guest users will use localStorage only (no cloud sync)
  // Their data is temporary and local to their browser
  localStoragePrefix: 'guest_',
  // Guest UID will be generated and stored locally
  guestUidKey: 'guest_user_id'
};

// ========================================
// אתחול Firebase
// ========================================
let app, auth, db;

function initializeFirebase() {
  console.log('🔥 Firebase: Initializing...');
  
  try {
    // בדיקה אם Firebase SDK נטען
    if (typeof firebase === 'undefined') {
      console.error('❌ Firebase SDK not loaded!');
      throw new Error('Firebase SDK לא נטען. ודא שהוספת את הסקריפטים ל-HTML');
    }
    
    // אתחול Firebase
    app = firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
    
    console.log('✅ Firebase initialized successfully');
    console.log('📊 Analytics enabled:', firebaseConfig.measurementId ? 'Yes' : 'No');
    console.log('👤 Guest mode enabled:', GUEST_MODE.enabled ? 'Yes' : 'No');
    
    // הגדרות נוספות
    auth.languageCode = 'he'; // עברית
    
    return { app, auth, db, guestMode: GUEST_MODE };
  } catch (error) {
    console.error('❌ Firebase initialization error:', error);
    throw error;
  }
}

// ========================================
// Guest Mode Helper Functions
// ========================================

function isGuestMode() {
  // בודק אם משתמש נמצא במצב אורח
  return localStorage.getItem(GUEST_MODE.guestUidKey) !== null;
}

function getGuestUID() {
  // מחזיר או יוצר UID לאורח
  let guestUID = localStorage.getItem(GUEST_MODE.guestUidKey);
  if (!guestUID) {
    guestUID = 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem(GUEST_MODE.guestUidKey, guestUID);
    console.log('👤 New guest UID created:', guestUID);
  }
  return guestUID;
}

function clearGuestData() {
  // מנקה את כל הנתונים של האורח
  console.log('🗑️ Clearing guest data...');
  
  // מחיקת כל המפתחות שמתחילים ב-guest_
  const keysToDelete = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith(GUEST_MODE.localStoragePrefix)) {
      keysToDelete.push(key);
    }
  }
  
  keysToDelete.forEach(key => localStorage.removeItem(key));
  localStorage.removeItem(GUEST_MODE.guestUidKey);
  
  console.log('✅ Guest data cleared:', keysToDelete.length, 'keys removed');
}

// ייצוא
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { 
    firebaseConfig, 
    initializeFirebase, 
    GUEST_MODE,
    isGuestMode,
    getGuestUID,
    clearGuestData
  };
}

console.log('✅ Firebase config loaded with Guest Mode support');
// ============================================
// 💾 STORAGE MANAGER - LOCAL & FIRESTORE SYNC
// ============================================

class StorageManager {
  constructor() {
    console.log('💾 StorageManager: Initialized, using Claude storage: false');
    this.localOnlyKeys = new Set(['last-backup-date']);
  }

  // ── פונקציית עזר: האם Firebase מוכן? ──────
  _getFirebaseUser() {
    try {
      return firebase.auth().currentUser;
    } catch (e) {
      return null; // Firebase עדיין לא אותחל
    }
  }

  _getCacheKey(key, user = this._getFirebaseUser()) {
    if (this.localOnlyKeys.has(key)) return key;
    if (user && user.uid) return `user-cache:${user.uid}:${key}`;
    return key;
  }

  _readCache(key, user = this._getFirebaseUser()) {
    const raw = localStorage.getItem(this._getCacheKey(key, user));
    return raw ? JSON.parse(raw) : null;
  }

  _writeCache(key, value, user = this._getFirebaseUser()) {
    localStorage.setItem(this._getCacheKey(key, user), JSON.stringify(value));
  }

  _removeCache(key, user = this._getFirebaseUser()) {
    localStorage.removeItem(this._getCacheKey(key, user));
    if (!this.localOnlyKeys.has(key)) localStorage.removeItem(key);
  }

  clearUserCache(uid) {
    if (!uid) return;
    const prefix = `user-cache:${uid}:`;
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) keysToRemove.push(key);
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log(`🧹 Cleared cache for user ${uid}: ${keysToRemove.length} keys`);
  }

  /**
   * 📥 GET - Load data from Firestore (if logged in) or localStorage (if guest)
   */
  async get(key) {
    console.log(`📥 StorageManager.get: Loading key "${key}"...`);

    try {
      const user = this._getFirebaseUser();

      if (user) {
        // 🔥 משתמש מחובר - טען מ-Firestore
        console.log(`🔥 StorageManager.get: User logged in, loading "${key}" from Firestore`);

        try {
          const db = firebase.firestore();
          const docRef = db.collection('users').doc(user.uid).collection('data').doc(key);
          const doc = await docRef.get();

          if (doc.exists) {
            const data = doc.data().value;
            console.log(`✅ StorageManager.get: Successfully loaded "${key}" from Firestore:`, data);

            // שמור גם ב-localStorage כ-cache
            try {
              this._writeCache(key, data, user);
            } catch (e) {
              console.warn(`⚠️ StorageManager.get: Failed to cache "${key}":`, e.message);
            }

            return data;
          } else {
            console.log(`⚠️ StorageManager.get: No data found for "${key}" in Firestore`);

            // נסה לטעון מ-localStorage כ-fallback
            const localData = this._readCache(key, user);
            if (localData !== null) return localData;

            return null;
          }
        } catch (firestoreError) {
          console.error(`❌ StorageManager.get: Firestore error for "${key}":`, firestoreError.message);

          // נסה לטעון מ-localStorage כ-fallback
          const localData = this._readCache(key, user);
          if (localData !== null) return localData;

          return null;
        }
      } else {
        // 👤 אין משתמש / Firebase לא מוכן - טען מ-localStorage
        console.log(`📥 StorageManager.get: No user / Firebase not ready, using localStorage for "${key}"`);
        const data = this._readCache(key, null);

        if (data !== null) {
          console.log(`✅ StorageManager.get: Loaded "${key}" from localStorage:`, data);
          return data;
        } else {
          console.log(`⚠️ StorageManager.get: No data found for "${key}" in localStorage`);
          return null;
        }
      }
    } catch (error) {
      console.error(`❌ StorageManager.get: Error loading "${key}":`, error);
      return null;
    }
  }

  /**
   * 💾 SET - Save data to Firestore (if logged in) or localStorage (if guest)
   */
  async set(key, value) {
    console.log(`💾 StorageManager.set: Saving key "${key}"...`);

    try {
      const user = this._getFirebaseUser();

      if (user) {
        // 🔥 משתמש מחובר - שמור ב-Firestore
        console.log(`🔥 StorageManager.set: User logged in, saving "${key}" to Firestore`);

        try {
          const db = firebase.firestore();
          const docRef = db.collection('users').doc(user.uid).collection('data').doc(key);

          await docRef.set({
            value: value,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          }, { merge: true });

          console.log(`✅ StorageManager.set: Successfully saved "${key}" to Firestore`);

          // שמור גם ב-localStorage כ-cache
          try {
            this._writeCache(key, value, user);
          } catch (e) {
            console.warn(`⚠️ StorageManager.set: Failed to cache "${key}":`, e.message);
          }

          return true;
        } catch (firestoreError) {
          console.error(`❌ StorageManager.set: Firestore error for "${key}":`, firestoreError.message);

          // שמור ב-localStorage כ-fallback
          this._writeCache(key, value, user);
          console.log(`💾 StorageManager.set: Saved "${key}" to localStorage as fallback`);

          return false;
        }
      } else {
        // 👤 אין משתמש / Firebase לא מוכן - שמור ב-localStorage
        console.log(`💾 StorageManager.set: No user / Firebase not ready, saving "${key}" to localStorage`);
        this._writeCache(key, value, null);
        console.log(`✅ StorageManager.set: Successfully saved "${key}" to localStorage`);
        return true;
      }
    } catch (error) {
      console.error(`❌ StorageManager.set: Error saving "${key}":`, error);
      return false;
    }
  }

  /**
   * 🗑️ REMOVE - Delete data from both Firestore and localStorage
   */
  async remove(key) {
    console.log(`🗑️ StorageManager.remove: Removing key "${key}"...`);

    try {
      const user = this._getFirebaseUser();

      if (user) {
        try {
          const db = firebase.firestore();
          await db.collection('users').doc(user.uid).collection('data').doc(key).delete();
          console.log(`✅ StorageManager.remove: Removed "${key}" from Firestore`);
        } catch (firestoreError) {
          console.warn(`⚠️ StorageManager.remove: Firestore error for "${key}":`, firestoreError.message);
        }
      }

      // מחק גם מ-localStorage
      this._removeCache(key, user);
      console.log(`✅ StorageManager.remove: Removed "${key}" from localStorage`);

      return true;
    } catch (error) {
      console.error(`❌ StorageManager.remove: Error removing "${key}":`, error);
      return false;
    }
  }

  /**
   * 🔄 SYNC ALL TO FIRESTORE - Upload all localStorage data to Firestore
   */
  async syncAllToFirestore() {
    console.log('🔄 StorageManager.syncAllToFirestore: Starting sync...');

    const user = this._getFirebaseUser();
    if (!user) {
      console.log('⚠️ StorageManager.syncAllToFirestore: No user logged in');
      return;
    }

    const keysToSync = [
      'homework-list',
      'homework-subjects',
      'group-members',
      'homework-tags',
      'homework-custom-fields',
      'homework-settings',
      'exams-list',
      'gamification-stats',
      'gamification-achievements',
      'study-timer-settings',
      'study-sessions-today',
      'theme-settings',
      'quick-actions-settings'
    ];

    let syncCount = 0;

    for (const key of keysToSync) {
      try {
        const parsed = this._readCache(key, user);
        if (parsed !== null) {
          await this.set(key, parsed);
          syncCount++;
          console.log(`✅ Synced "${key}" to Firestore`);
        }
      } catch (error) {
        console.error(`❌ Failed to sync "${key}":`, error.message);
      }
    }

    console.log(`✅ StorageManager.syncAllToFirestore: Synced ${syncCount}/${keysToSync.length} items`);
  }

  /**
   * 📥 SYNC ALL FROM FIRESTORE - Download all Firestore data to localStorage
   */
  async syncAllFromFirestore() {
    console.log('📥 StorageManager.syncAllFromFirestore: Starting download...');

    const user = this._getFirebaseUser();
    if (!user) {
      console.log('⚠️ StorageManager.syncAllFromFirestore: No user logged in');
      return;
    }

    try {
      const db = firebase.firestore();
      const snapshot = await db.collection('users').doc(user.uid).collection('data').get();

      let downloadCount = 0;

      snapshot.forEach(doc => {
        try {
          const key = doc.id;
          const value = doc.data().value;
          this._writeCache(key, value, user);
          downloadCount++;
          console.log(`✅ Downloaded "${key}" from Firestore to localStorage`);
        } catch (error) {
          console.error(`❌ Failed to download "${doc.id}":`, error.message);
        }
      });

      console.log(`✅ StorageManager.syncAllFromFirestore: Downloaded ${downloadCount} items`);
      return true;
    } catch (error) {
      console.error('❌ StorageManager.syncAllFromFirestore: Error:', error.message);
      return false;
    }
  }

  /**
   * 🗑️ CLEAR ALL - Clear all data from both Firestore and localStorage
   */
  async clearAll() {
    console.log('🗑️ StorageManager.clearAll: Clearing all data...');

    const user = this._getFirebaseUser();

    if (user) {
      try {
        const db = firebase.firestore();
        const snapshot = await db.collection('users').doc(user.uid).collection('data').get();

        const batch = db.batch();
        snapshot.forEach(doc => {
          batch.delete(doc.ref);
        });

        await batch.commit();
        console.log('✅ Cleared all Firestore data');
      } catch (error) {
        console.error('❌ Failed to clear Firestore:', error.message);
      }
    }

    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !this.localOnlyKeys.has(key)) keysToRemove.push(key);
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log('✅ Cleared app localStorage data');
  }

  /**
   * 💾 AUTO BACKUP - שמירת timestamp של גיבוי
   */
  async autoBackup() {
    console.log('🔄 StorageManager.autoBackup: Checking auto backup...');
    try {
      const now = new Date();
      localStorage.setItem('last-backup-date', now.toISOString());
      console.log('✅ autoBackup: Backup timestamp saved');
    } catch (e) {
      console.warn('⚠️ autoBackup: Error:', e.message);
    }
  }

  /**
   * 📅 GET LAST BACKUP DATE - קבלת תאריך הגיבוי האחרון
   */
  async getLastBackupDate() {
    console.log('📅 StorageManager.getLastBackupDate: Getting last backup date...');
    try {
      const saved = localStorage.getItem('last-backup-date');
      return saved ? new Date(saved) : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * 📤 EXPORT DATA - ייצוא נתונים ל-JSON
   */
  async exportData() {
    try {
      const subjects = await this.get('homework-subjects') || [];
      const groupMembers = await this.get('group-members') || [];
      const homework = await this.get('homework-list') || [];
      const settings = await this.get('homework-settings') || {};
      const tags = await this.get('homework-tags') || [];
      const customTaskFields = await this.get('homework-custom-fields') || [];
      const exams = await this.get('exams-list') || [];
      const achievements = await this.get('homework-achievements') || null;
      const gamificationStats = await this.get('gamification-stats') || null;
      const gamificationAchievements = await this.get('gamification-achievements') || null;

      const data = { subjects, groupMembers, homework, settings, tags, customTaskFields, exams, achievements, gamificationStats, gamificationAchievements, exportDate: new Date().toISOString() };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `homework-backup-${new Date().toLocaleDateString('he-IL').replace(/\//g, '-')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      console.log('✅ exportData: Data exported successfully');
      return true;
    } catch (e) {
      console.error('❌ exportData: Error:', e.message);
      return false;
    }
  }

  /**
   * 📥 IMPORT DATA - ייבוא נתונים מ-JSON
   */
  async importData(file) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (data.subjects) await this.set('homework-subjects', data.subjects);
      if (data.groupMembers) await this.set('group-members', data.groupMembers);
      if (data.homework) await this.set('homework-list', data.homework);
      if (data.settings) await this.set('homework-settings', data.settings);
      if (data.tags) await this.set('homework-tags', data.tags);
      if (data.customTaskFields) await this.set('homework-custom-fields', data.customTaskFields);
      if (data.exams) await this.set('exams-list', data.exams);
      if (data.achievements) await this.set('homework-achievements', data.achievements);
      if (data.gamificationStats) await this.set('gamification-stats', data.gamificationStats);
      if (data.gamificationAchievements) await this.set('gamification-achievements', data.gamificationAchievements);

      console.log('✅ importData: Data imported successfully');
      return { success: true, data, message: 'הנתונים יובאו בהצלחה' };
    } catch (e) {
      console.error('❌ importData: Error:', e.message);
      return { success: false, error: e.message, message: e.message };
    }
  }
}

// ============================================
// 🌍 GLOBAL INSTANCE
// ============================================
console.log('💾 Creating global storage manager...');
const storageManagerInstance = new StorageManager();
window.storageManager = storageManagerInstance;
window.storage = storageManagerInstance; // Backward compatibility
console.log('✅ Global storage manager created');
// Authentication Manager with Guest Mode Support
// ===============================================

class AuthManager {
  constructor() {
    this.currentUser = null;
    this.auth = null;
    this.db = null;
    this.authStateListener = null;
    this.isGuestMode = false;
    
    console.log('🔐 AuthManager: Initialized with Guest Mode support');
  }

  // ==================== אתחול ====================
  
  async initialize() {
    console.log('🔐 AuthManager: Starting initialization...');
    
    try {
      // אתחול Firebase
      const firebase = initializeFirebase();
      this.auth = firebase.auth;
      this.db = firebase.db;
      
      // בדיקה אם יש משתמש אורח קיים
      if (isGuestMode()) {
        console.log('👤 AuthManager: Found existing guest session');
        await this.continueAsGuest();
      } else {
        // האזנה לשינויים בסטטוס האימות (משתמשים רגילים)
        this.setupAuthStateListener();
      }
      
      console.log('✅ AuthManager: Initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ AuthManager: Initialization failed:', error);
      this.showError('שגיאה באתחול מערכת האימות');
      return false;
    }
  }

  setupAuthStateListener() {
    console.log('👂 AuthManager: Setting up auth state listener...');
    
    this.authStateListener = this.auth.onAuthStateChanged(async (user) => {
      console.log('🔐 Auth state changed:', user ? user.email : 'null');
      
      if (user) {
        // משתמש מחובר (לא אורח)
        this.isGuestMode = false;
        this.currentUser = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email.split('@')[0],
          emailVerified: user.emailVerified,
          photoURL: user.photoURL,
          createdAt: user.metadata.creationTime,
          lastLogin: user.metadata.lastSignInTime,
          isGuest: false
        };
        
        console.log('✅ User logged in:', this.currentUser.email);
        
        // טעינת נתוני המשתמש מ-Firestore
        await this.loadUserData();
        
        // הסתרת מסך התחברות והצגת האפליקציה
        this.hideAuthUI();
        this.showApp();
        
        // עדכון UI
        this.updateUserUI();
        
        // אירוע custom
        window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: this.currentUser }));
        
      } else {
        // משתמש מנותק
        console.log('⏸️ User logged out');
        this.currentUser = null;
        
        // הצגת מסך התחברות (אם לא במצב אורח)
        if (!this.isGuestMode) {
          this.showAuthUI();
          this.hideApp();
        }
        
        // אירוע custom
        window.dispatchEvent(new CustomEvent('userLoggedOut'));
      }
    });
  }

  // ==================== מצב אורח ====================
  
  async continueAsGuest() {
    console.log('👤 continueAsGuest: Entering guest mode...');
    
    this.isGuestMode = true;
    const guestUID = getGuestUID();
    
    this.currentUser = {
      uid: guestUID,
      displayName: 'אורח',
      email: null,
      emailVerified: false,
      photoURL: null,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      isGuest: true
    };
    
    console.log('✅ Guest session started:', guestUID);
    
    // טעינת נתוני אורח מ-localStorage
    await this.loadGuestData();
    
    // הסתרת מסך התחברות והצגת האפליקציה
    this.hideAuthUI();
    this.showApp();
    
    // עדכון UI
    this.updateUserUI();
    
    // אירוע custom
    window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: this.currentUser }));
  }

  async loadGuestData() {
    console.log('📥 loadGuestData: Loading guest data from localStorage...');
    
    try {
      // טעינת נתונים מ-localStorage עם prefix של אורח
      const guestPrefix = GUEST_MODE.localStoragePrefix;
      
      // טעינת מקצועות
      const subjectsData = localStorage.getItem(guestPrefix + 'homework-subjects');
      if (subjectsData) {
        subjects = JSON.parse(subjectsData);
        console.log('✅ Loaded subjects:', subjects.length);
      }
      
      // טעינת משימות
      const homeworkData = localStorage.getItem(guestPrefix + 'homework-list');
      if (homeworkData) {
        homework = JSON.parse(homeworkData);
        console.log('✅ Loaded homework:', homework.length);
      }
      
      // עדכון UI
      if (typeof render === 'function') {
        render();
      }
      
      console.log('✅ Guest data loaded successfully');
    } catch (error) {
      console.error('❌ Error loading guest data:', error);
    }
  }

  async saveGuestData() {
    console.log('💾 saveGuestData: Saving guest data to localStorage...');
    
    try {
      const guestPrefix = GUEST_MODE.localStoragePrefix;
      
      // שמירת מקצועות
      localStorage.setItem(guestPrefix + 'homework-subjects', JSON.stringify(subjects));
      
      // שמירת משימות
      localStorage.setItem(guestPrefix + 'homework-list', JSON.stringify(homework));
      
      console.log('✅ Guest data saved successfully');
    } catch (error) {
      console.error('❌ Error saving guest data:', error);
    }
  }

  async convertGuestToUser(email, password, displayName) {
    console.log('🔄 convertGuestToUser: Converting guest to registered user...');
    
    if (!this.isGuestMode) {
      console.warn('⚠️ Not in guest mode, cannot convert');
      return false;
    }
    
    try {
      // שמירת נתוני האורח
      const guestData = {
        subjects: subjects.slice(),
        homework: homework.slice()
      };
      
      // יצירת משתמש חדש
      const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;
      
      // עדכון שם תצוגה
      if (displayName) {
        await user.updateProfile({ displayName });
      }
      
      // העברת הנתונים ל-Firestore
      await this.createUserDocument(user.uid, {
        email: user.email,
        displayName: displayName || user.email.split('@')[0],
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        emailVerified: false,
        convertedFromGuest: true
      });
      
      // שמירת נתוני האורח ל-Firestore
      const batch = this.db.batch();
      
      // שמירת מקצועות
      guestData.subjects.forEach(subject => {
        const docRef = this.db.collection('subjects').doc(user.uid).collection('items').doc(subject.id.toString());
        batch.set(docRef, subject);
      });
      
      // שמירת משימות
      guestData.homework.forEach(hw => {
        const docRef = this.db.collection('homework').doc(user.uid).collection('items').doc(hw.id.toString());
        batch.set(docRef, hw);
      });
      
      await batch.commit();
      
      // מחיקת נתוני אורח
      clearGuestData();
      this.isGuestMode = false;
      
      // שליחת אימות אימייל
      await user.sendEmailVerification();
      
      this.showSuccess('החשבון נוצר בהצלחה! הנתונים שלך הועברו. נשלח אימייל אימות.');
      console.log('✅ Guest converted to user successfully');
      
      return true;
    } catch (error) {
      console.error('❌ Error converting guest to user:', error);
      this.handleAuthError(error);
      return false;
    }
  }

  // ==================== רישום ====================
  
  async signup(email, password, displayName) {
    console.log('📝 Signup: Attempting signup for', email);
    
    try {
      // וולידציה
      if (!this.validateEmail(email)) {
        throw new Error('כתובת אימייל לא תקינה');
      }
      
      if (password.length < 6) {
        throw new Error('הסיסמה חייבת להכיל לפחות 6 תווים');
      }
      
      // יצירת משתמש
      const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;
      
      console.log('✅ Signup: User created:', user.uid);
      
      // עדכון שם תצוגה
      if (displayName) {
        await user.updateProfile({ displayName });
        console.log('✅ Signup: Display name updated');
      }
      
      // שליחת אימות אימייל
      await this.sendVerificationEmail();
      
      // יצירת מסמך משתמש ב-Firestore
      await this.createUserDocument(user.uid, {
        email: user.email,
        displayName: displayName || user.email.split('@')[0],
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        emailVerified: false
      });
      
      this.showSuccess('החשבון נוצר בהצלחה! נשלח אימייל אימות.');
      console.log('✅ Signup: Complete');
      
      return user;
    } catch (error) {
      console.error('❌ Signup error:', error);
      this.handleAuthError(error);
      throw error;
    }
  }

  // ==================== התחברות ====================
  
  async login(email, password) {
    console.log('🔑 Login: Attempting login for', email);
    
    try {
      // וולידציה
      if (!this.validateEmail(email)) {
        throw new Error('כתובת אימייל לא תקינה');
      }
      
      if (!password) {
        throw new Error('נא להזין סיסמה');
      }
      
      // התחברות
      const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
      const user = userCredential.user;
      
      console.log('✅ Login: Success for', user.email);
      
      // עדכון זמן התחברות אחרון
      await this.updateUserDocument(user.uid, {
        lastLogin: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      this.showSuccess(`ברוך הבא, ${user.displayName || user.email}!`);
      
      return user;
    } catch (error) {
      console.error('❌ Login error:', error);
      this.handleAuthError(error);
      throw error;
    }
  }

  // ==================== התנתקות ====================
  
  async logout() {
    console.log('👋 Logout: Logging out user...');
    
    try {
      if (this.isGuestMode) {
        // התנתקות אורח
        console.log('👋 Logging out guest...');
        this.isGuestMode = false;
        this.currentUser = null;
        
        // הצגת מסך התחברות
        this.showAuthUI();
        this.hideApp();
        
        this.showSuccess('התנתקת בהצלחה');
      } else {
        // התנתקות משתמש רגיל
        const uidToClear = this.currentUser?.uid;
        if (typeof storage !== 'undefined' && storage.clearUserCache && uidToClear) {
          storage.clearUserCache(uidToClear);
        }
        await this.auth.signOut();
        console.log('✅ Logout: Success');
        this.showSuccess('התנתקת בהצלחה');
      }
    } catch (error) {
      console.error('❌ Logout error:', error);
      this.showError('שגיאה בהתנתקות');
      throw error;
    }
  }

  // ==================== החלפת משתמש ====================

  async switchUser() {
    console.log('🔄 switchUser: Switching user...');
    try {
      // שמירת הנתונים הנוכחיים לפני ההחלפה
      if (typeof saveData === 'function') await saveData();

      if (this.isGuestMode) {
        // במצב אורח - הצג מסך בחירת פרופיל
        this.showSwitchProfileModal();
      } else {
        // משתמש מחובר - התנתק ואפשר כניסה מחדש
        const uidToClear = this.currentUser?.uid;
        if (typeof storage !== 'undefined' && storage.clearUserCache && uidToClear) {
          storage.clearUserCache(uidToClear);
        }
        await this.auth.signOut();
        this.showSuccess('התנתקת - התחבר עם משתמש אחר');
      }
    } catch (error) {
      console.error('❌ switchUser error:', error);
      this.showError('שגיאה בהחלפת משתמש');
    }
  }

  showSwitchProfileModal() {
    // קבלת פרופילים שמורים
    let profiles = [];
    try {
      profiles = JSON.parse(localStorage.getItem('guest_profiles') || '[]');
    } catch {}
    const currentId = localStorage.getItem('guest_active_profile');

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'switch-profile-modal';

    const profilesHTML = profiles
      .filter(p => p.id !== currentId)
      .map(p => `
        <button class="btn btn-secondary" onclick="authManager.loadGuestProfile('${p.id}'); document.getElementById('switch-profile-modal').remove();">
          👤 ${p.name}
        </button>
      `).join('');

    modal.innerHTML = `
      <div class="modal-content" style="max-width: 400px;">
        <div class="modal-header">
          <h2>🔄 החלף פרופיל</h2>
          <button class="close-modal-btn" onclick="document.getElementById('switch-profile-modal').remove()">
            <svg width="24" height="24"><use href="#x"></use></svg>
          </button>
        </div>
        <div class="modal-body" style="display:flex;flex-direction:column;gap:0.75rem;">
          ${profilesHTML || '<p style="color:var(--text-secondary)">אין פרופילים נוספים שמורים.</p>'}
          <hr style="margin:0.5rem 0;">
          <button class="btn btn-primary" onclick="authManager.createNewGuestProfile(); document.getElementById('switch-profile-modal').remove();">
            ➕ צור פרופיל חדש
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  }

  saveCurrentGuestProfile() {
    const currentId = localStorage.getItem('guest_active_profile');
    if (!currentId) return;
    const keys = ['homework-subjects', 'homework-list', 'homework-settings', 'homework-tags', 'exams-list', 'homework-achievements', 'gamification-stats', 'gamification-achievements'];
    const profileData = {};
    keys.forEach(key => {
      const val = localStorage.getItem(key);
      if (val) profileData[key] = val;
    });
    localStorage.setItem(`guest_profile_${currentId}`, JSON.stringify(profileData));
  }

  loadGuestProfile(profileId) {
    // שמור פרופיל נוכחי
    this.saveCurrentGuestProfile();

    // טען פרופיל חדש
    const profileData = JSON.parse(localStorage.getItem(`guest_profile_${profileId}`) || '{}');
    const keys = ['homework-subjects', 'homework-list', 'homework-settings', 'homework-tags', 'exams-list', 'homework-achievements', 'gamification-stats', 'gamification-achievements'];
    keys.forEach(key => {
      if (profileData[key]) {
        localStorage.setItem(key, profileData[key]);
      } else {
        localStorage.removeItem(key);
      }
    });

    localStorage.setItem('guest_active_profile', profileId);
    const profiles = JSON.parse(localStorage.getItem('guest_profiles') || '[]');
    const profile = profiles.find(p => p.id === profileId);
    this.showSuccess(`עברת לפרופיל: ${profile?.name || profileId}`);
    setTimeout(() => location.reload(), 1000);
  }

  createNewGuestProfile() {
    const name = prompt('שם הפרופיל החדש:');
    if (!name) return;

    // שמור פרופיל נוכחי
    this.saveCurrentGuestProfile();

    // צור פרופיל חדש
    const newId = 'guest_' + Date.now();
    const profiles = JSON.parse(localStorage.getItem('guest_profiles') || '[]');
    const currentId = localStorage.getItem('guest_active_profile');

    // הוסף פרופיל נוכחי לרשימה אם אין לו שם
    if (currentId && !profiles.find(p => p.id === currentId)) {
      profiles.push({ id: currentId, name: 'פרופיל ראשי', createdAt: new Date().toISOString() });
    }
    profiles.push({ id: newId, name, createdAt: new Date().toISOString() });
    localStorage.setItem('guest_profiles', JSON.stringify(profiles));

    // נקה נתונים לפרופיל חדש
    const keys = ['homework-subjects', 'homework-list', 'homework-settings', 'homework-tags', 'exams-list', 'homework-achievements', 'gamification-stats', 'gamification-achievements'];
    keys.forEach(key => localStorage.removeItem(key));
    localStorage.setItem('guest_active_profile', newId);

    this.showSuccess(`פרופיל חדש "${name}" נוצר`);
    setTimeout(() => location.reload(), 1000);
  }

  // ==================== Google Sign-In ====================

  async loginWithGoogle() {
    console.log('🔑 Google Login: Attempting...');
    
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      const result = await this.auth.signInWithPopup(provider);
      const user = result.user;
      
      console.log('✅ Google Login: Success');
      
      // בדיקה אם זה משתמש חדש - צור מסמך
      if (result.additionalUserInfo.isNewUser) {
        await this.createUserDocument(user.uid, {
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          emailVerified: user.emailVerified,
          provider: 'google'
        });
      }
      
      return user;
    } catch (error) {
      console.error('❌ Google Login error:', error);
      this.handleAuthError(error);
      throw error;
    }
  }

  // ==================== שכחתי סיסמה ====================
  
  async resetPassword(email) {
    console.log('🔐 Password Reset: Sending email to', email);
    
    try {
      if (!this.validateEmail(email)) {
        throw new Error('כתובת אימייל לא תקינה');
      }
      
      await this.auth.sendPasswordResetEmail(email);
      
      console.log('✅ Password Reset: Email sent');
      this.showSuccess('נשלח אימייל לאיפוס סיסמה');
      
      return true;
    } catch (error) {
      console.error('❌ Password Reset error:', error);
      this.handleAuthError(error);
      throw error;
    }
  }

  // ==================== אימות אימייל ====================
  
  async sendVerificationEmail() {
    console.log('📧 Verification: Sending email...');
    
    try {
      const user = this.auth.currentUser;
      if (!user) {
        throw new Error('אין משתמש מחובר');
      }
      
      await user.sendEmailVerification();
      console.log('✅ Verification: Email sent');
      this.showSuccess('נשלח אימייל אימות');
      
      return true;
    } catch (error) {
      console.error('❌ Verification error:', error);
      this.handleAuthError(error);
      throw error;
    }
  }

  // ==================== Firestore ====================
  
  async createUserDocument(uid, data) {
    console.log('📝 Firestore: Creating user document for', uid);
    
    try {
      await this.db.collection('users').doc(uid).set(data);
      console.log('✅ Firestore: User document created');
    } catch (error) {
      console.error('❌ Firestore: Error creating user document:', error);
    }
  }

  async updateUserDocument(uid, data) {
    console.log('📝 Firestore: Updating user document for', uid);
    
    try {
      await this.db.collection('users').doc(uid).update(data);
      console.log('✅ Firestore: User document updated');
    } catch (error) {
      console.error('❌ Firestore: Error updating user document:', error);
    }
  }

  async loadUserData() {
    console.log('📥 Firestore: Loading user data...');
    
    try {
      const uid = this.currentUser.uid;
      
      // טעינת מקצועות
      const subjectsSnapshot = await this.db
        .collection('subjects')
        .doc(uid)
        .collection('items')
        .get();
      
      if (!subjectsSnapshot.empty) {
        subjects = subjectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log('✅ Loaded subjects:', subjects.length);
      }
      
      // טעינת משימות
      const homeworkSnapshot = await this.db
        .collection('homework')
        .doc(uid)
        .collection('items')
        .get();
      
      if (!homeworkSnapshot.empty) {
        homework = homeworkSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log('✅ Loaded homework:', homework.length);
      }
      
      // עדכון UI
      if (typeof render === 'function') {
        render();
      }
      
      console.log('✅ User data loaded successfully');
    } catch (error) {
      console.error('❌ Error loading user data:', error);
      this.showError('שגיאה בטעינת נתונים');
    }
  }

  async saveUserData() {
    console.log('💾 Firestore: Saving user data...');
    
    // אם במצב אורח - שמור ב-localStorage
    if (this.isGuestMode) {
      return this.saveGuestData();
    }
    
    try {
      const uid = this.currentUser.uid;
      const batch = this.db.batch();
      
      // שמירת מקצועות
      const subjectsRef = this.db.collection('subjects').doc(uid).collection('items');
      subjects.forEach(subject => {
        const docRef = subjectsRef.doc(subject.id.toString());
        batch.set(docRef, subject);
      });
      
      // שמירת משימות
      const homeworkRef = this.db.collection('homework').doc(uid).collection('items');
      homework.forEach(hw => {
        const docRef = homeworkRef.doc(hw.id.toString());
        batch.set(docRef, hw);
      });
      
      await batch.commit();
      console.log('✅ User data saved successfully');
    } catch (error) {
      console.error('❌ Error saving user data:', error);
      this.showError('שגיאה בשמירת נתונים');
    }
  }

  // ==================== UI ====================
  
  showAuthUI() {
    console.log('🎨 UI: Showing auth screen');
    
    let authContainer = document.getElementById('auth-container');
    if (!authContainer) {
      authContainer = document.createElement('div');
      authContainer.id = 'auth-container';
      document.body.appendChild(authContainer);
    }
    
    authContainer.classList.remove('hidden');
    authContainer.innerHTML = this.getAuthHTML();
    
    // הסתרת האפליקציה
    const appContainer = document.querySelector('.container');
    if (appContainer) {
      appContainer.style.display = 'none';
    }
    
    this.attachAuthEventListeners();
  }

  hideAuthUI() {
    console.log('🎨 UI: Hiding auth screen');
    
    const authContainer = document.getElementById('auth-container');
    if (authContainer) {
      authContainer.classList.add('hidden');
    }
  }

  showApp() {
    console.log('🎨 UI: Showing app');
    
    const appContainer = document.querySelector('.container');
    if (appContainer) {
      appContainer.style.display = 'block';
    }
  }

  hideApp() {
    console.log('🎨 UI: Hiding app');
    
    const appContainer = document.querySelector('.container');
    if (appContainer) {
      appContainer.style.display = 'none';
    }
  }

  updateUserUI() {
    console.log('🎨 UI: Updating user info');
    
    // עדכון כפתור משתמש בכותרת
    const headerActions = document.querySelector('.header-actions');
    if (headerActions && this.currentUser) {
      let userBtn = document.getElementById('user-menu-btn');
      if (!userBtn) {
        userBtn = document.createElement('button');
        userBtn.id = 'user-menu-btn';
        userBtn.className = 'settings-btn';
        userBtn.title = this.currentUser.isGuest ? 'אורח' : this.currentUser.email;
        userBtn.innerHTML = this.currentUser.isGuest ? '👤' : `
          <svg width="24" height="24" fill="currentColor">
            <circle cx="12" cy="8" r="4"/>
            <path d="M12 14c-5 0-9 2-9 5v2h18v-2c0-3-4-5-9-5z"/>
          </svg>
        `;
        userBtn.onclick = () => this.showUserMenu();
        
        headerActions.insertBefore(userBtn, headerActions.firstChild);
      }
    }
  }

  showUserMenu() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'user-menu-modal';
    
    let menuContent = '';
    
    if (this.isGuestMode) {
      // תפריט אורח
      menuContent = `
        <div style="text-align: center; margin-bottom: 1.5rem;">
          <div style="width: 80px; height: 80px; border-radius: 50%; background: #3b82f6; color: white; display: flex; align-items: center; justify-content: center; font-size: 2rem; margin: 0 auto 1rem;">
            👤
          </div>
          <h3 style="margin: 0.5rem 0;">אורח</h3>
          <p style="color: var(--text-secondary); font-size: 0.875rem;">הנתונים שלך שמורים מקומית</p>
        </div>
        
        <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 0.5rem; padding: 1rem; margin-bottom: 1.5rem;">
          <p style="margin: 0; font-size: 0.875rem; color: #856404;">
            <strong>💡 רוצה לשמור את הנתונים בענן?</strong><br>
            צור חשבון וכל הנתונים שלך יועברו אוטומטית!
          </p>
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
          <button class="btn btn-primary" onclick="authManager.showConvertGuestModal(); document.getElementById('user-menu-modal').remove();">
            🔒 צור חשבון והעבר נתונים
          </button>
          <button class="btn btn-secondary" onclick="if(confirm('האם אתה בטוח? הנתונים שלך יימחקו!')) { authManager.clearGuestAndLogout(); document.getElementById('user-menu-modal').remove(); }">
            🗑️ מחק נתונים והתנתק
          </button>
          <button class="btn btn-secondary" onclick="authManager.logout(); document.getElementById('user-menu-modal').remove();">
            👋 התנתק (שמור נתונים)
          </button>
        </div>
      `;
    } else {
      // תפריט משתמש רגיל
      menuContent = `
        <div style="text-align: center; margin-bottom: 1.5rem;">
          ${this.currentUser.photoURL 
            ? `<img src="${this.currentUser.photoURL}" alt="Profile" style="width: 80px; height: 80px; border-radius: 50%; margin-bottom: 1rem;">` 
            : '<div style="width: 80px; height: 80px; border-radius: 50%; background: #3b82f6; color: white; display: flex; align-items: center; justify-content: center; font-size: 2rem; margin: 0 auto 1rem;">' + this.currentUser.displayName.charAt(0).toUpperCase() + '</div>'}
          <h3 style="margin: 0.5rem 0;">${this.currentUser.displayName}</h3>
          <p style="color: var(--text-secondary); font-size: 0.875rem;">${this.currentUser.email}</p>
          ${!this.currentUser.emailVerified ? '<p style="color: #f59e0b; font-size: 0.875rem;">⚠️ אימייל לא מאומת</p>' : ''}
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
          ${!this.currentUser.emailVerified ? `
            <button class="btn btn-secondary" onclick="authManager.sendVerificationEmail()">
              📧 שלח אימייל אימות מחדש
            </button>
          ` : ''}
          <button class="btn btn-secondary" onclick="authManager.showResetPasswordModal()">
            🔐 שנה סיסמה
          </button>
          <button class="btn btn-secondary" onclick="authManager.switchUser(); document.getElementById('user-menu-modal').remove();">
            🔄 החלף משתמש
          </button>
          <button class="btn btn-danger" onclick="authManager.logout(); document.getElementById('user-menu-modal').remove();">
            👋 התנתק
          </button>
        </div>

        <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--border-color); font-size: 0.75rem; color: var(--text-secondary);">
          <p>נוצר: ${new Date(this.currentUser.createdAt).toLocaleDateString('he-IL')}</p>
          <p>התחברות אחרונה: ${new Date(this.currentUser.lastLogin).toLocaleDateString('he-IL')}</p>
        </div>
      `;
    }
    
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 400px;">
        <div class="modal-header">
          <h2>👤 חשבון משתמש</h2>
          <button class="close-modal-btn" onclick="document.getElementById('user-menu-modal').remove()">
            <svg width="24" height="24"><use href="#x"></use></svg>
          </button>
        </div>
        <div class="modal-body">
          ${menuContent}
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }

  showConvertGuestModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'convert-guest-modal';
    
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 450px;">
        <div class="modal-header">
          <h2>🔒 צור חשבון</h2>
          <button class="close-modal-btn" onclick="document.getElementById('convert-guest-modal').remove()">
            <svg width="24" height="24"><use href="#x"></use></svg>
          </button>
        </div>
        <div class="modal-body">
          <div style="background: #d1fae5; border: 1px solid #10b981; border-radius: 0.5rem; padding: 1rem; margin-bottom: 1.5rem;">
            <p style="margin: 0; font-size: 0.875rem; color: #065f46;">
              <strong>✨ כל הנתונים שלך יישמרו!</strong><br>
              המקצועות והמשימות שיצרת יועברו אוטומטית לחשבון החדש.
            </p>
          </div>
          
          <div class="form-group">
            <label>שם מלא</label>
            <input type="text" class="input" id="convert-name" placeholder="השם שלך">
          </div>
          <div class="form-group">
            <label>אימייל</label>
            <input type="email" class="input" id="convert-email" placeholder="your@email.com">
          </div>
          <div class="form-group">
            <label>סיסמה</label>
            <input type="password" class="input" id="convert-password" placeholder="לפחות 6 תווים">
          </div>
          <div class="form-group">
            <label>אימות סיסמה</label>
            <input type="password" class="input" id="convert-password-confirm" placeholder="הזן סיסמה שוב">
          </div>
          
          <button class="btn btn-primary" id="convert-guest-btn">
            🔒 צור חשבון והעבר נתונים
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    const convertBtn = document.getElementById('convert-guest-btn');
    convertBtn.addEventListener('click', async () => {
      const name = document.getElementById('convert-name').value;
      const email = document.getElementById('convert-email').value;
      const password = document.getElementById('convert-password').value;
      const passwordConfirm = document.getElementById('convert-password-confirm').value;
      
      if (password !== passwordConfirm) {
        this.showError('הסיסמאות לא תואמות');
        return;
      }
      
      convertBtn.disabled = true;
      convertBtn.textContent = '⏳ יוצר חשבון...';
      
      const success = await this.convertGuestToUser(email, password, name);
      
      if (success) {
        modal.remove();
      } else {
        convertBtn.disabled = false;
        convertBtn.innerHTML = '🔒 צור חשבון והעבר נתונים';
      }
    });
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }

  clearGuestAndLogout() {
    clearGuestData();
    this.logout();
  }

  showResetPasswordModal() {
    document.getElementById('user-menu-modal')?.remove();
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'reset-password-modal';
    
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 400px;">
        <div class="modal-header">
          <h2>🔐 שנה סיסמה</h2>
          <button class="close-modal-btn" onclick="document.getElementById('reset-password-modal').remove()">
            <svg width="24" height="24"><use href="#x"></use></svg>
          </button>
        </div>
        <div class="modal-body">
          <p style="margin-bottom: 1rem; color: var(--text-secondary);">
            נשלח אליך אימייל עם קישור לאיפוס הסיסמה
          </p>
          <button class="btn btn-primary" onclick="authManager.resetPassword('${this.currentUser.email}'); document.getElementById('reset-password-modal').remove();">
            שלח אימייל איפוס
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }

  getAuthHTML() {
    return `
      <div class="auth-screen">
        <div class="auth-card">
          <div class="auth-header">
            <svg width="48" height="48" style="color: #3b82f6;">
              <use href="#book-open"></use>
            </svg>
            <h1>ניהול משימות</h1>
            <p>התחבר כדי לגשת למשימות שלך</p>
          </div>

          <!-- Guest Mode Button -->
          <div style="padding: 1.5rem; text-align: center; border-bottom: 2px solid var(--border-color);">
            <button class="btn btn-primary" onclick="authManager.continueAsGuest(); document.getElementById('auth-container').classList.add('hidden');" style="width: 100%; background: linear-gradient(135deg, #10b981, #059669);">
              👤 המשך כאורח
            </button>
            <p style="margin-top: 0.75rem; font-size: 0.875rem; color: var(--text-secondary);">
              ניתן להתחיל מייד ללא הרשמה. הנתונים יישמרו מקומית.
            </p>
          </div>

          <!-- Login Form -->
          <div id="login-form" class="auth-form">
            <h2>התחברות</h2>
            <div class="form-group">
              <label>אימייל</label>
              <input type="email" class="input" id="login-email" placeholder="your@email.com" autocomplete="email">
            </div>
            <div class="form-group">
              <label>סיסמה</label>
              <input type="password" class="input" id="login-password" placeholder="••••••••" autocomplete="current-password">
            </div>
            <button class="btn btn-primary" id="login-btn">
              🔑 התחבר
            </button>
            <div class="auth-links">
              <a href="#" id="show-signup">אין לך חשבון? הירשם</a>
              <a href="#" id="show-reset">שכחת סיסמה?</a>
            </div>
          </div>

          <!-- Signup Form -->
          <div id="signup-form" class="auth-form hidden">
            <h2>הרשמה</h2>
            <div class="form-group">
              <label>שם מלא</label>
              <input type="text" class="input" id="signup-name" placeholder="השם שלך" autocomplete="name">
            </div>
            <div class="form-group">
              <label>אימייל</label>
              <input type="email" class="input" id="signup-email" placeholder="your@email.com" autocomplete="email">
            </div>
            <div class="form-group">
              <label>סיסמה</label>
              <input type="password" class="input" id="signup-password" placeholder="לפחות 6 תווים" autocomplete="new-password">
            </div>
            <div class="form-group">
              <label>אימות סיסמה</label>
              <input type="password" class="input" id="signup-password-confirm" placeholder="הזן סיסמה שוב" autocomplete="new-password">
            </div>
            <button class="btn btn-primary" id="signup-btn">
              📝 צור חשבון
            </button>
            <div class="auth-links">
              <a href="#" id="show-login">כבר יש לך חשבון? התחבר</a>
            </div>
          </div>

          <!-- Reset Password Form -->
          <div id="reset-form" class="auth-form hidden">
            <h2>איפוס סיסמה</h2>
            <p style="margin-bottom: 1rem; color: var(--text-secondary); font-size: 0.875rem;">
              הזן את כתובת האימייל שלך ונשלח לך קישור לאיפוס הסיסמה
            </p>
            <div class="form-group">
              <label>אימייל</label>
              <input type="email" class="input" id="reset-email" placeholder="your@email.com" autocomplete="email">
            </div>
            <button class="btn btn-primary" id="reset-btn">
              📧 שלח אימייל
            </button>
            <div class="auth-links">
              <a href="#" id="back-to-login">חזור להתחברות</a>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  attachAuthEventListeners() {
    console.log('🎧 AuthManager: Attaching event listeners...');
    
    // Login
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
      loginBtn.addEventListener('click', async () => {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        loginBtn.disabled = true;
        loginBtn.textContent = '⏳ מתחבר...';
        
        try {
          await this.login(email, password);
        } catch (error) {
          loginBtn.disabled = false;
          loginBtn.innerHTML = '🔑 התחבר';
        }
      });
    }
    
    // Signup
    const signupBtn = document.getElementById('signup-btn');
    if (signupBtn) {
      signupBtn.addEventListener('click', async () => {
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const passwordConfirm = document.getElementById('signup-password-confirm').value;
        
        if (password !== passwordConfirm) {
          this.showError('הסיסמאות לא תואמות');
          return;
        }
        
        signupBtn.disabled = true;
        signupBtn.textContent = '⏳ יוצר חשבון...';
        
        try {
          await this.signup(email, password, name);
        } catch (error) {
          signupBtn.disabled = false;
          signupBtn.innerHTML = '📝 צור חשבון';
        }
      });
    }
    
    // Reset Password
    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', async () => {
        const email = document.getElementById('reset-email').value;
        
        resetBtn.disabled = true;
        resetBtn.textContent = '⏳ שולח...';
        
        try {
          await this.resetPassword(email);
          resetBtn.textContent = '✅ נשלח!';
          setTimeout(() => {
            document.getElementById('back-to-login').click();
          }, 2000);
        } catch (error) {
          resetBtn.disabled = false;
          resetBtn.innerHTML = '📧 שלח אימייל';
        }
      });
    }
    
    // Form Switching
    document.getElementById('show-signup')?.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('login-form').classList.add('hidden');
      document.getElementById('signup-form').classList.remove('hidden');
    });
    
    document.getElementById('show-login')?.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('signup-form').classList.add('hidden');
      document.getElementById('login-form').classList.remove('hidden');
    });
    
    document.getElementById('show-reset')?.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('login-form').classList.add('hidden');
      document.getElementById('reset-form').classList.remove('hidden');
    });
    
    document.getElementById('back-to-login')?.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('reset-form').classList.add('hidden');
      document.getElementById('login-form').classList.remove('hidden');
    });
    
    // Enter key support
    ['login-email', 'login-password', 'signup-email', 'signup-password', 'signup-password-confirm', 'reset-email'].forEach(id => {
      document.getElementById(id)?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          if (id.startsWith('login')) loginBtn?.click();
          else if (id.startsWith('signup')) signupBtn?.click();
          else if (id.startsWith('reset')) resetBtn?.click();
        }
      });
    });
  }

  // ==================== Utilities ====================
  
  validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  handleAuthError(error) {
    console.error('🔥 Auth Error:', error.code, error.message);
    
    const errorMessages = {
      'auth/email-already-in-use': 'האימייל כבר קיים במערכת',
      'auth/invalid-email': 'כתובת אימייל לא תקינה',
      'auth/operation-not-allowed': 'פעולה זו לא מורשית',
      'auth/weak-password': 'הסיסמה חלשה מדי',
      'auth/user-disabled': 'המשתמש חסום',
      'auth/user-not-found': 'המשתמש לא קיים',
      'auth/wrong-password': 'סיסמה שגויה',
      'auth/too-many-requests': 'יותר מדי ניסיונות. נסה שוב מאוחר יותר',
      'auth/network-request-failed': 'שגיאת רשת. בדוק את החיבור לאינטרנט'
    };
    
    const message = errorMessages[error.code] || error.message;
    this.showError(message);
  }

  showSuccess(message) {
    if (typeof notifications !== 'undefined' && notifications.showInAppNotification) {
      notifications.showInAppNotification(message, 'success');
    } else {
      alert(message);
    }
  }

  showError(message) {
    if (typeof notifications !== 'undefined' && notifications.showInAppNotification) {
      notifications.showInAppNotification(message, 'error');
    } else {
      alert(message);
    }
  }
}

// יצירת אובייקט גלובלי
console.log('🔐 Creating global auth manager...');
const authManager = new AuthManager();
console.log('✅ Global auth manager created with Guest Mode');

// אתחול אוטומטי
window.addEventListener('DOMContentLoaded', async () => {
  console.log('🔐 auth.js: Initializing...');
  await authManager.initialize();
  console.log('✅ auth.js: Initialized');
});
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
// Notifications Manager - מנהל התראות
class NotificationsManager {
  constructor() {
    this.permission = 'default';
    this.checkInterval = null;
    console.log('🔔 NotificationsManager: Initialized');
    console.log('🔔 NotificationsManager: Notification support:', 'Notification' in window);
    if ('Notification' in window) {
      console.log('🔔 NotificationsManager: Current permission:', Notification.permission);
      this.permission = Notification.permission;
    }
  }

  // בקשת הרשאות להתראות
  async requestPermission() {
    console.log('🔔 requestPermission: Requesting notification permission...');
    
    if (!('Notification' in window)) {
      console.error('❌ requestPermission: Browser does not support notifications');
      return false;
    }

    console.log('🔔 requestPermission: Current permission status:', Notification.permission);
    
    if (Notification.permission === 'granted') {
      console.log('✅ requestPermission: Permission already granted');
      this.permission = 'granted';
      return true;
    }

    if (Notification.permission !== 'denied') {
      console.log('🔔 requestPermission: Requesting permission from user...');
      const permission = await Notification.requestPermission();
      console.log('🔔 requestPermission: User response:', permission);
      this.permission = permission;
      return permission === 'granted';
    }

    console.warn('⚠️ requestPermission: Permission denied');
    return false;
  }

  // שליחת התראה
  async sendNotification(title, options = {}) {
    console.log('🔔 sendNotification: Sending notification...');
    console.log('🔔 sendNotification: Title:', title);
    console.log('🔔 sendNotification: Options:', options);
    
    if (this.permission !== 'granted') {
      console.warn('⚠️ sendNotification: Permission not granted, cannot send notification');
      return false;
    }

    try {
      const notification = new Notification(title, {
        icon: '📚',
        badge: '📚',
        ...options
      });
      
      console.log('✅ sendNotification: Notification created:', notification);

      notification.onclick = () => {
        console.log('👆 sendNotification: Notification clicked');
        window.focus();
        notification.close();
      };

      console.log('✅ sendNotification: Notification sent successfully');
      return true;
    } catch (error) {
      console.error('❌ sendNotification: Error sending notification:', error);
      console.error('❌ sendNotification: Error stack:', error.stack);
      return false;
    }
  }

  // בדיקת משימות שצריכות התראה
  async checkHomeworkNotifications(homework, settings) {
    console.log('🔍 checkHomeworkNotifications: Checking homework for notifications...');
    console.log('🔍 checkHomeworkNotifications: Homework count:', homework.length);
    console.log('🔍 checkHomeworkNotifications: Settings:', settings);
    
    if (!settings.enableNotifications) {
      console.log('⏸️ checkHomeworkNotifications: Notifications disabled in settings');
      return;
    }

    const notificationDays = settings.notificationDays || 1;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    console.log('🔍 checkHomeworkNotifications: Current date:', now.toISOString());
    console.log('🔍 checkHomeworkNotifications: Notification days threshold:', notificationDays);

    let notificationsSent = 0;
    for (const hw of homework) {
      if (hw.completed) {
        console.log('⏭️ checkHomeworkNotifications: Skipping completed homework:', hw.id, hw.title);
        continue;
      }

      const dueDate = new Date(hw.dueDate + 'T00:00:00');
      const daysUntil = Math.floor((dueDate - now) / (1000 * 60 * 60 * 24));
      console.log(`🔍 checkHomeworkNotifications: Homework "${hw.title}" - Days until due: ${daysUntil}`);

      // התראה עבור משימות שמתקרבות
      if (daysUntil === notificationDays && !hw.notified) {
        console.log(`🔔 checkHomeworkNotifications: Sending approaching notification for "${hw.title}"`);
        const subject = await this.getSubjectName(hw.subject);
        await this.sendNotification(`תזכורת: ${hw.title}`, {
          body: `עוד ${daysUntil} ימים להגשה${subject ? ` ב${subject}` : ''}`,
          tag: `homework-${hw.id}`
        });
        hw.notified = true;
        notificationsSent++;
        console.log(`✅ checkHomeworkNotifications: Notification sent for "${hw.title}"`);
      }

      // התראה עבור משימות שעוברות את המועד היום
      if (daysUntil === 0 && !hw.todayNotified) {
        console.log(`🔔 checkHomeworkNotifications: Sending urgent notification for "${hw.title}"`);
        const subject = await this.getSubjectName(hw.subject);
        await this.sendNotification(`⚠️ דחוף: ${hw.title}`, {
          body: `ההגשה היא היום!${subject ? ` (${subject})` : ''}`,
          tag: `homework-urgent-${hw.id}`,
          requireInteraction: true
        });
        hw.todayNotified = true;
        notificationsSent++;
        console.log(`✅ checkHomeworkNotifications: Urgent notification sent for "${hw.title}"`);
      }
    }
    
    console.log(`✅ checkHomeworkNotifications: Check complete, ${notificationsSent} notifications sent`);
  }

  // קבלת שם מקצוע
  async getSubjectName(subjectId) {
    console.log('📚 getSubjectName: Getting subject name for ID:', subjectId);
    try {
      const subjects = await storage.get('homework-subjects') || [];
      console.log('📚 getSubjectName: Subjects loaded:', subjects.length);
      const subject = subjects.find(s => s.id == subjectId);
      if (subject) {
        console.log('✅ getSubjectName: Subject found:', subject.name);
        return subject.name;
      } else {
        console.warn('⚠️ getSubjectName: Subject not found for ID:', subjectId);
        return null;
      }
    } catch (error) {
      console.error('❌ getSubjectName: Error getting subject name:', error);
      return null;
    }
  }

  // התחלת בדיקה תקופתית
  async startPeriodicCheck(homework, settings) {
    console.log('🔄 startPeriodicCheck: Starting periodic notification check...');
    console.log('🔄 startPeriodicCheck: Homework count:', homework.length);
    console.log('🔄 startPeriodicCheck: Settings:', settings);
    
    // בדיקה כל שעה
    this.checkInterval = setInterval(async () => {
      console.log('⏰ startPeriodicCheck: Periodic check triggered');
      const currentHomework = await storage.get('homework-list') || [];
      const currentSettings = await storage.get('homework-settings') || {};
      console.log('⏰ startPeriodicCheck: Current homework count:', currentHomework.length);
      
      await this.checkHomeworkNotifications(currentHomework, currentSettings);
      
      // שמירת המצב המעודכן
      await storage.set('homework-list', currentHomework);
      console.log('✅ startPeriodicCheck: Periodic check complete, data saved');
    }, 60 * 60 * 1000); // כל שעה
    
    console.log('✅ startPeriodicCheck: Interval set (every hour)');

    // בדיקה מיידית
    console.log('🔄 startPeriodicCheck: Running immediate check...');
    await this.checkHomeworkNotifications(homework, settings);
    console.log('✅ startPeriodicCheck: Periodic check started successfully');
  }

  // עצירת בדיקה תקופתית
  stopPeriodicCheck() {
    console.log('⏸️ stopPeriodicCheck: Stopping periodic check...');
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('✅ stopPeriodicCheck: Periodic check stopped');
    } else {
      console.log('⚠️ stopPeriodicCheck: No active periodic check to stop');
    }
  }

  // חישוב ימים עד המועד
  getDaysUntilDue(dueDate) {
    console.log('📅 getDaysUntilDue: Calculating days for:', dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate + 'T00:00:00');
    const days = Math.round((due - today) / (1000 * 60 * 60 * 24));
    console.log('📅 getDaysUntilDue: Result:', days, 'days');
    return days;
  }

  // הצגת התראה ויזואלית במערכת
  showInAppNotification(message, type = 'info') {
    console.log('💬 showInAppNotification: Showing in-app notification');
    console.log('💬 showInAppNotification: Message:', message);
    console.log('💬 showInAppNotification: Type:', type);
    
    const notification = document.createElement('div');
    notification.className = `notification-badge ${type}`;
    
    notification.innerHTML = `
      <svg width="24" height="24"><use href="#bell"></use></svg>
      <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    console.log('💬 showInAppNotification: Notification element added to DOM');

    setTimeout(() => {
      console.log('💬 showInAppNotification: Starting fadeout animation...');
      notification.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
          console.log('✅ showInAppNotification: Notification removed from DOM');
        }
      }, 300);
    }, 5000);
  }
}

// יצירת אובייקט גלובלי
console.log('🔔 Creating global notifications manager...');
const notifications = new NotificationsManager();
console.log('✅ Global notifications manager created');

// הוספת אנימציית יציאה ל-CSS (נעשה דינמית)
console.log('🎨 Adding slideOut animation CSS...');
const style = document.createElement('style');
style.textContent = `
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(-100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);
console.log('✅ slideOut animation CSS added');
// Calendar View Manager - מנהל תצוגת לוח שנה
class CalendarManager {
  constructor() {
    this.currentDate = new Date();
    this.selectedDate = null;
    console.log('📅 CalendarManager: Initialized');
  }

  // יצירת תצוגת לוח השנה - תמיד מציג את כל המשימות
  renderCalendar(showArchive = false) {
    console.log('📅 renderCalendar: Rendering calendar for', this.currentDate);
    
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    
    // חישוב ימים בחודש
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    console.log('📅 renderCalendar: Month info:', { year, month, daysInMonth, startingDayOfWeek });
    
    // קבלת כל המשימות לחודש (ללא סינון ארכיון)
    const monthHomework = this.getHomeworkForMonth(year, month);
    console.log('📅 renderCalendar: Homework for month:', monthHomework.length);
    
    // יצירת HTML של לוח השנה
    let html = `
      <div class="calendar-view">
        <div class="calendar-header">
          <button class="calendar-nav-btn" onclick="calendar.previousMonth()">
            <svg width="20" height="20"><use href="#chevron-right"></use></svg>
          </button>
          <h2 class="calendar-month-title">${this.getHebrewMonthName(month)} ${year}</h2>
          <button class="calendar-nav-btn" onclick="calendar.nextMonth()">
            <svg width="20" height="20"><use href="#chevron-left"></use></svg>
          </button>
          <button class="btn btn-secondary calendar-today-btn" onclick="calendar.goToToday()">
            היום
          </button>
        </div>
        
        <div class="calendar-weekdays">
          <div class="calendar-weekday">ראשון</div>
          <div class="calendar-weekday">שני</div>
          <div class="calendar-weekday">שלישי</div>
          <div class="calendar-weekday">רביעי</div>
          <div class="calendar-weekday">חמישי</div>
          <div class="calendar-weekday">שישי</div>
          <div class="calendar-weekday">שבת</div>
        </div>
        
        <div class="calendar-grid">
    `;
    
    // ימים ריקים לפני תחילת החודש
    for (let i = 0; i < startingDayOfWeek; i++) {
      html += '<div class="calendar-day empty"></div>';
    }
    
    // ימי החודש
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month, day);
      currentDate.setHours(0, 0, 0, 0);
      
      const isToday = currentDate.getTime() === today.getTime();
      const isPast = currentDate < today;
      const homeworkForDay = this.getHomeworkForDate(monthHomework, currentDate);
      
      let dayClasses = 'calendar-day';
      if (isToday) dayClasses += ' today';
      if (isPast) dayClasses += ' past';
      if (homeworkForDay.length > 0) dayClasses += ' has-homework';
      
      html += `
        <div class="${dayClasses}" onclick="calendar.selectDate('${currentDate.toISOString()}')">
          <div class="calendar-day-number">${day}</div>
          ${homeworkForDay.length > 0 ? `
            <div class="calendar-day-indicators">
              ${homeworkForDay.slice(0, 3).map(hw => {
                const subject = subjects.find(s => s.id == hw.subject);
                const color = subject ? subject.color : '#6b7280';
                return `<div class="calendar-indicator" style="background-color: ${color};" title="${hw.title}"></div>`;
              }).join('')}
              ${homeworkForDay.length > 3 ? `<div class="calendar-more">+${homeworkForDay.length - 3}</div>` : ''}
            </div>
          ` : ''}
        </div>
      `;
    }
    
    html += `
        </div>
      </div>
    `;
    
    // עדכון התצוגה
    const homeworkList = document.getElementById('homework-list');
    if (homeworkList) {
      homeworkList.innerHTML = html;
    }
    
    console.log('✅ renderCalendar: Calendar rendered');
  }

  // קבלת משימות לחודש מסוים - בלוח שנה תמיד מציג הכל
  getHomeworkForMonth(year, month, showArchive = false) {
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    
    // ⭐ בלוח שנה - תמיד הצג את כל המשימות של החודש
    return homework.filter(hw => {
      const dueDate = new Date(hw.dueDate + 'T00:00:00');
      return dueDate >= monthStart && dueDate <= monthEnd;
    });
  }

  // קבלת משימות לתאריך מסוים
  getHomeworkForDate(monthHomework, date) {
    const dateStr = date.toISOString().split('T')[0];
    return monthHomework.filter(hw => hw.dueDate === dateStr);
  }

  // שם חודש בעברית
  getHebrewMonthName(month) {
    const months = [
      'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
      'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
    ];
    return months[month];
  }

  // מעבר לחודש הבא
  nextMonth() {
    console.log('📅 nextMonth: Moving to next month');
    this.currentDate.setMonth(this.currentDate.getMonth() + 1);
    this.renderCalendar();
  }

  // מעבר לחודש הקודם
  previousMonth() {
    console.log('📅 previousMonth: Moving to previous month');
    this.currentDate.setMonth(this.currentDate.getMonth() - 1);
    this.renderCalendar();
  }

  // חזרה להיום
  goToToday() {
    console.log('📅 goToToday: Going back to today');
    this.currentDate = new Date();
    this.renderCalendar();
  }

  // בחירת תאריך
  selectDate(dateStr) {
    console.log('📅 selectDate: Date selected:', dateStr);
    const date = new Date(dateStr);
    this.selectedDate = date;
    
    // הצגת משימות ליום זה
    this.showDayHomework(date);
  }

  // הצגת משימות ליום מסוים
  showDayHomework(date) {
    const dateStr = date.toISOString().split('T')[0];
    const dayHomework = homework.filter(hw => hw.dueDate === dateStr);
    
    console.log('📅 showDayHomework: Homework for', dateStr, ':', dayHomework.length);
    
    if (dayHomework.length === 0) {
      notifications.showInAppNotification(
        `אין משימות ליום ${date.toLocaleDateString('he-IL')}`,
        'info'
      );
      return;
    }

    // יצירת מודאל עם משימות היום
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 500px;">
        <div class="modal-header">
          <h2>משימות ל-${date.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</h2>
          <button class="close-modal-btn" onclick="this.closest('.modal').remove()">
            <svg width="24" height="24"><use href="#x"></use></svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="day-homework-list">
            ${dayHomework.map(hw => {
              const subject = subjects.find(s => s.id == hw.subject);
              const isCompleted = hw.completed;
              
              return `
                <div class="day-homework-item ${isCompleted ? 'completed' : ''}">
                  <input type="checkbox" class="checkbox" ${isCompleted ? 'checked' : ''} 
                         onchange="toggleComplete(${hw.id}); this.closest('.modal').remove(); render();">
                  <div class="day-homework-content">
                    ${subject ? `<span class="badge" style="background-color: ${subject.color};">${subject.name}</span>` : ''}
                    <h4 class="${isCompleted ? 'completed' : ''}">${hw.title}</h4>
                    ${hw.description ? `<p>${hw.description}</p>` : ''}
                    ${hw.tags && hw.tags.length > 0 ? `
                      <div class="homework-badges">
                        ${hw.tags.map(tag => `<span class="badge tag-badge">${tag}</span>`).join('')}
                      </div>
                    ` : ''}
                  </div>
                  <button class="icon-btn" onclick="deleteHomework(${hw.id}); this.closest('.modal').remove(); render();">
                    <svg width="20" height="20"><use href="#trash"></use></svg>
                  </button>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // סגירה בלחיצה על הרקע
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }
}

// יצירת אובייקט גלובלי
console.log('📅 Creating global calendar manager...');
const calendar = new CalendarManager();
console.log('✅ Global calendar manager created');
// Utilities: Theme Customizer, Quick Actions, Smart Search
// ==========================================================

// ── Fallback: ודא ש-storage זמין ──────────────────────────────
if (typeof storage === 'undefined') {
  /* eslint-disable no-var */
  var storage = window.storage || window.storageManager;
}

// ============ Theme Customizer ============
class ThemeCustomizer {
  constructor() {
    this.themes = {
      default: {
        name: 'ברירת מחדל',
        primary: '#3b82f6',
        secondary: '#8b5cf6',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        bgGradient: 'linear-gradient(135deg, #e0f2fe 0%, #ddd6fe 100%)'
      },
      ocean: {
        name: 'אוקיינוס',
        primary: '#0ea5e9',
        secondary: '#06b6d4',
        success: '#14b8a6',
        warning: '#f59e0b',
        danger: '#f43f5e',
        bgGradient: 'linear-gradient(135deg, #cffafe 0%, #ddd6fe 100%)'
      },
      forest: {
        name: 'יער',
        primary: '#10b981',
        secondary: '#059669',
        success: '#22c55e',
        warning: '#f59e0b',
        danger: '#ef4444',
        bgGradient: 'linear-gradient(135deg, #d1fae5 0%, #dcfce7 100%)'
      },
      sunset: {
        name: 'שקיעה',
        primary: '#f59e0b',
        secondary: '#f97316',
        success: '#10b981',
        warning: '#eab308',
        danger: '#dc2626',
        bgGradient: 'linear-gradient(135deg, #fed7aa 0%, #fecaca 100%)'
      },
      purple: {
        name: 'סגול',
        primary: '#8b5cf6',
        secondary: '#a78bfa',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        bgGradient: 'linear-gradient(135deg, #ddd6fe 0%, #e9d5ff 100%)'
      },
      dark: {
        name: 'כהה',
        primary: '#60a5fa',
        secondary: '#818cf8',
        success: '#34d399',
        warning: '#fbbf24',
        danger: '#f87171',
        bgGradient: 'linear-gradient(135deg, #1e293b 0%, #312e81 100%)'
      }
    };

    this.currentTheme = 'default';
    console.log('🎨 ThemeCustomizer: Initialized');
  }

  async loadTheme() {
    console.log('🎨 loadTheme: Loading saved theme...');
    try {
      const saved = await storage.get('theme-settings');
      if (saved && saved.theme) {
        this.currentTheme = saved.theme;
        this.applyTheme(this.currentTheme);
        console.log('✅ loadTheme: Theme loaded:', this.currentTheme);
      }
    } catch (error) {
      console.error('❌ loadTheme: Error loading theme:', error);
    }
  }

  async saveTheme() {
    console.log('💾 saveTheme: Saving theme...');
    try {
      await storage.set('theme-settings', { theme: this.currentTheme });
      console.log('✅ saveTheme: Theme saved');
    } catch (error) {
      console.error('❌ saveTheme: Error saving theme:', error);
    }
  }

  applyTheme(themeName) {
    console.log('🎨 applyTheme: Applying theme:', themeName);
    
    const theme = this.themes[themeName];
    if (!theme) {
      console.warn('⚠️ applyTheme: Theme not found:', themeName);
      return;
    }

    const root = document.documentElement;
    
    // עדכון משתני CSS
    root.style.setProperty('--color-primary', theme.primary);
    root.style.setProperty('--color-secondary', theme.secondary);
    root.style.setProperty('--color-success', theme.success);
    root.style.setProperty('--color-warning', theme.warning);
    root.style.setProperty('--color-danger', theme.danger);
    
    // עדכון רקע
    const body = document.body;
    if (!body.classList.contains('dark-mode')) {
      body.style.background = theme.bgGradient;
    }

    this.currentTheme = themeName;
    this.saveTheme();
    
    notifications.showInAppNotification(`נושא "${theme.name}" הוחל`, 'success');
    console.log('✅ applyTheme: Theme applied');
  }

  openThemeSelector() {
    console.log('🎨 openThemeSelector: Opening theme selector...');
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'theme-selector-modal';
    
    let themesHTML = '';
    Object.keys(this.themes).forEach(key => {
      const theme = this.themes[key];
      const isActive = key === this.currentTheme;
      
      themesHTML += `
        <div class="theme-option ${isActive ? 'active' : ''}" 
             onclick="themeCustomizer.applyTheme('${key}'); document.getElementById('theme-selector-modal').remove();">
          <div class="theme-preview" style="background: ${theme.bgGradient};">
            <div class="theme-colors">
              <div class="theme-color" style="background: ${theme.primary};"></div>
              <div class="theme-color" style="background: ${theme.secondary};"></div>
              <div class="theme-color" style="background: ${theme.success};"></div>
            </div>
          </div>
          <div class="theme-name">${theme.name}</div>
          ${isActive ? '<div class="theme-active">✓</div>' : ''}
        </div>
      `;
    });
    
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>🎨 בחר נושא</h2>
          <button class="close-modal-btn" onclick="document.getElementById('theme-selector-modal').remove()">
            <svg width="24" height="24"><use href="#x"></use></svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="themes-grid">
            ${themesHTML}
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }
}

// ============ Quick Actions ============
class QuickActionsManager {
  constructor() {
    this.defaultShortcuts = {
      'n': { action: 'newTask', description: 'משימה חדשה', ctrl: true },
      's': { action: 'newSubject', description: 'נושא/מקצוע חדש', ctrl: true },
      'f': { action: 'search', description: 'חיפוש', ctrl: true },
      't': { action: 'toggleTimer', description: 'התחל/עצור טיימר', ctrl: true },
      'f1': { action: 'showHelp', description: 'עזרה' },
      'a': { action: 'showAchievements', description: 'הישגים', ctrl: true },
      'd': { action: 'toggleDarkMode', description: 'מצב לילה', ctrl: true },
      'e': { action: 'export', description: 'ייצוא', ctrl: true, shift: true },
    };
    this.shortcuts = { ...this.defaultShortcuts };

    this.isEnabled = true;
    console.log('⚡ QuickActionsManager: Initialized');
  }

  async loadSettings() {
    console.log('⚡ loadSettings: Loading quick actions settings...');
    try {
      const saved = await storage.get('quick-actions-settings');
      if (saved) {
        this.isEnabled = saved.enabled !== false;
        // טען קיצורים מותאמים אישית
        if (saved.customShortcuts) {
          Object.assign(this.shortcuts, saved.customShortcuts);
        }
        console.log('✅ loadSettings: Settings loaded');
      }
    } catch (error) {
      console.error('❌ loadSettings: Error loading settings:', error);
    }
  }

  async saveCustomShortcuts(customShortcuts) {
    try {
      const saved = await storage.get('quick-actions-settings') || {};
      saved.customShortcuts = customShortcuts;
      await storage.set('quick-actions-settings', saved);
      // עדכון הקיצורים הפעילים
      this.shortcuts = { ...this.defaultShortcuts, ...customShortcuts };
      console.log('✅ saveCustomShortcuts: Saved');
    } catch (error) {
      console.error('❌ saveCustomShortcuts: Error:', error);
    }
  }

  initializeListeners() {
    console.log('⚡ initializeListeners: Setting up keyboard listeners...');
    
    document.addEventListener('keydown', (e) => {
      if (!this.isEnabled) return;

      const key = e.key.toLowerCase();
      const shortcut = this.shortcuts[key];
      
      // אל תפעל בתוך שדות קלט
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        if (shortcut && shortcut.action === 'showHelp') {
          e.preventDefault();
          this.executeAction(shortcut.action);
        }
        // אבל אפשר Ctrl+F לחיפוש
        if (e.ctrlKey && e.key === 'f') {
          e.preventDefault();
          this.executeAction('search');
        }
        return;
      }

      if (shortcut) {
        const ctrlMatch = shortcut.ctrl ? e.ctrlKey : !e.ctrlKey;
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;

        if (ctrlMatch && shiftMatch) {
          e.preventDefault();
          this.executeAction(shortcut.action);
        }
      }
    });

    console.log('✅ initializeListeners: Listeners initialized');
  }

  executeAction(action) {
    console.log('⚡ executeAction: Executing', action);

    const actions = {
      newTask: () => {
        const titleInput = document.getElementById('hw-title');
        if (titleInput) {
          titleInput.focus();
          titleInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      },
      newSubject: () => {
        const showBtn = document.getElementById('show-add-subject');
        if (showBtn && !showBtn.classList.contains('hidden')) {
          showBtn.click();
        }
        const nameInput = document.getElementById('subject-name');
        if (nameInput) {
          nameInput.focus();
        }
      },
      search: () => {
        smartSearch.openSearchPanel();
      },
      toggleTimer: () => {
        if (typeof studyTimer !== 'undefined') {
          if (studyTimer.isRunning) {
            studyTimer.pauseTimer();
          } else if (studyTimer.isPaused) {
            studyTimer.resumeTimer();
          } else {
            studyTimer.startTimer('pomodoro');
          }
        }
      },
      showHelp: () => {
        this.showHelpModal();
      },
      showAchievements: () => {
        if (typeof gamification !== 'undefined') {
          const panel = document.getElementById('gamification-panel');
          if (panel) {
            panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      },
      toggleDarkMode: () => {
        if (typeof toggleDarkMode === 'function') {
          toggleDarkMode();
        }
      },
      export: () => {
        if (typeof exportData === 'function') {
          exportData();
        }
      }
    };

    if (actions[action]) {
      actions[action]();
    }
  }

  showHelpModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'help-modal';
    
    let shortcutsHTML = '';
    Object.keys(this.shortcuts).forEach(key => {
      const sc = this.shortcuts[key];
      const modifiers = [];
      if (sc.ctrl) modifiers.push('Ctrl');
      if (sc.shift) modifiers.push('Shift');
      modifiers.push(key.toUpperCase());
      
      shortcutsHTML += `
        <div class="shortcut-item">
          <div class="shortcut-keys">
            ${modifiers.map(m => `<kbd>${m}</kbd>`).join(' + ')}
          </div>
          <div class="shortcut-desc">${sc.description}</div>
        </div>
      `;
    });
    
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>⚡ קיצורי דרך</h2>
          <button class="close-modal-btn" onclick="document.getElementById('help-modal').remove()">
            <svg width="24" height="24"><use href="#x"></use></svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="shortcuts-list">
            ${shortcutsHTML}
          </div>
          <div class="help-tip">
            💡 טיפ: לחץ <kbd>F1</kbd> בכל עת כדי לראות רשימה זו
          </div>
          <button class="btn btn-secondary" style="margin-top:1rem;width:100%;" onclick="quickActions.showCustomizeModal(); document.getElementById('help-modal').remove();">
            ✏️ התאם קיצורי דרך
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }
  showCustomizeModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'customize-shortcuts-modal';

    const rows = Object.entries(this.shortcuts).map(([key, sc]) => `
      <div class="shortcut-item" style="align-items:center;">
        <div class="shortcut-desc" style="flex:1;">${sc.description}</div>
        <div style="display:flex;align-items:center;gap:0.5rem;">
          ${sc.ctrl ? '<kbd>Ctrl</kbd>' : ''}
          ${sc.shift ? '<kbd>Shift</kbd>' : ''}
          <input type="text" maxlength="4" value="${key}" data-action="${sc.action}"
            style="width:60px;text-align:center;border:1px solid var(--border-color);border-radius:4px;padding:4px;font-family:monospace;"
            placeholder="מקש">
        </div>
      </div>
    `).join('');

    modal.innerHTML = `
      <div class="modal-content" style="max-width:500px;">
        <div class="modal-header">
          <h2>✏️ התאמת קיצורי דרך</h2>
          <button class="close-modal-btn" onclick="document.getElementById('customize-shortcuts-modal').remove()">
            <svg width="24" height="24"><use href="#x"></use></svg>
          </button>
        </div>
        <div class="modal-body">
          <p style="color:var(--text-secondary);font-size:0.875rem;margin-bottom:1rem;">שנה את המקש לכל פעולה. Ctrl/Shift נשארים כפי שהם.</p>
          <div class="shortcuts-list" id="custom-shortcuts-rows" style="gap:0.75rem;">
            ${rows}
          </div>
          <div style="display:flex;gap:0.75rem;margin-top:1rem;">
            <button class="btn btn-primary" style="flex:1;" onclick="quickActions.applyCustomShortcuts()">💾 שמור</button>
            <button class="btn btn-secondary" style="flex:1;" onclick="quickActions.resetShortcuts(); document.getElementById('customize-shortcuts-modal').remove();">↩️ איפוס</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  }

  async applyCustomShortcuts() {
    const rows = document.querySelectorAll('#custom-shortcuts-rows input[data-action]');
    const customShortcuts = {};
    const existingByAction = {};
    Object.entries(this.defaultShortcuts).forEach(([k, v]) => { existingByAction[v.action] = v; });

    rows.forEach(input => {
      const action = input.dataset.action;
      const newKey = input.value.trim().toLowerCase() || Object.keys(this.defaultShortcuts).find(k => this.defaultShortcuts[k]?.action === action);
      const base = existingByAction[action] || {};
      customShortcuts[newKey] = { ...base, action };
    });

    await this.saveCustomShortcuts(customShortcuts);
    document.getElementById('customize-shortcuts-modal')?.remove();
    if (typeof notifications !== 'undefined') {
      notifications.showInAppNotification('✅ קיצורי דרך נשמרו!', 'success');
    }
  }

  async resetShortcuts() {
    this.shortcuts = { ...this.defaultShortcuts };
    try {
      const saved = await storage.get('quick-actions-settings') || {};
      delete saved.customShortcuts;
      await storage.set('quick-actions-settings', saved);
    } catch {}
    if (typeof notifications !== 'undefined') {
      notifications.showInAppNotification('↩️ קיצורי דרך אופסו לברירת המחדל', 'info');
    }
  }
}

// ============ Smart Search ============
class SmartSearchManager {
  constructor() {
    this.searchIndex = [];
    this.searchResults = [];
    console.log('🔍 SmartSearchManager: Initialized');
  }

  async buildSearchIndex() {
    console.log('🔍 buildSearchIndex: Building search index...');
    
    try {
      const subjectTerm = (window.getSubjectTerm && typeof window.getSubjectTerm === 'function') ? window.getSubjectTerm() : 'מקצוע';
      const homework = await storage.get('homework-list') || [];
      const subjects = await storage.get('homework-subjects') || [];
      const tags = await storage.get('homework-tags') || [];
      
      this.searchIndex = [];
      
      // הוספת משימות לאינדקס
      homework.forEach(hw => {
        const subject = subjects.find(s => s.id == hw.subject);
        const assignees = Array.isArray(hw.assignees) && Array.isArray(window.groupMembers)
          ? hw.assignees
              .map(id => window.groupMembers.find(member => member.id === id)?.name)
              .filter(Boolean)
          : [];
        
        this.searchIndex.push({
          type: 'homework',
          id: hw.id,
          title: hw.title,
          description: hw.description || '',
          subject: subject ? subject.name : '',
          assignees,
          tags: hw.tags || [],
          dueDate: hw.dueDate,
          completed: hw.completed,
          searchText: [
            hw.title,
            hw.description,
            subject ? subject.name : '',
            ...assignees,
            ...(hw.tags || [])
          ].join(' ').toLowerCase()
        });
      });
      
      // הוספת נושאים/מקצועות לאינדקס
      subjects.forEach(s => {
        this.searchIndex.push({
          type: 'subject',
          id: s.id,
          name: s.name,
          color: s.color,
          searchText: s.name.toLowerCase()
        });
      });
      
      console.log('✅ buildSearchIndex: Index built with', this.searchIndex.length, 'items');
    } catch (error) {
      console.error('❌ buildSearchIndex: Error building index:', error);
    }
  }

  search(query) {
    console.log('🔍 search: Searching for:', query);
    
    if (!query || query.length < 2) {
      this.searchResults = [];
      return [];
    }

    const searchTerm = query.toLowerCase();
    
    this.searchResults = this.searchIndex.filter(item => {
      return item.searchText.includes(searchTerm);
    });
    
    // מיון לפי רלוונטיות
    this.searchResults.sort((a, b) => {
      const aStarts = a.searchText.startsWith(searchTerm);
      const bStarts = b.searchText.startsWith(searchTerm);
      
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      
      return 0;
    });
    
    console.log('✅ search: Found', this.searchResults.length, 'results');
    return this.searchResults;
  }

  openSearchPanel() {
    console.log('🔍 openSearchPanel: Opening search panel...');
    
    this.buildSearchIndex();
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'search-modal';
    
    modal.innerHTML = `
      <div class="modal-content search-modal-content">
        <div class="search-header">
          <input type="text" 
                 class="search-input" 
                 id="smart-search-input" 
                 placeholder="🔍 חפש משימות, נושאים, תגיות..."
                 autofocus>
          <button class="close-modal-btn" onclick="document.getElementById('search-modal').remove()">
            <svg width="24" height="24"><use href="#x"></use></svg>
          </button>
        </div>
        <div class="search-results" id="search-results">
          <div class="search-placeholder">
            התחל להקליד לחיפוש...
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    const input = document.getElementById('smart-search-input');
    const resultsContainer = document.getElementById('search-results');
    
    input.addEventListener('input', (e) => {
      const query = e.target.value;
      const results = this.search(query);
      this.renderResults(results, resultsContainer);
    });
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
    
    input.focus();
  }

  renderResults(results, container) {
    const subjectTerm = (window.getSubjectTerm && typeof window.getSubjectTerm === 'function') ? window.getSubjectTerm() : 'מקצוע';
    if (results.length === 0) {
      container.innerHTML = '<div class="search-placeholder">לא נמצאו תוצאות</div>';
      return;
    }

    let html = `<div class="search-results-count">נמצאו ${results.length} תוצאות</div>`;
    
    results.forEach(result => {
      if (result.type === 'homework') {
        const statusIcon = result.completed ? '✅' : '⏳';
        const statusClass = result.completed ? 'completed' : 'pending';
        
        html += `
          <div class="search-result-item ${statusClass}" onclick="smartSearch.navigateToHomework(${result.id})">
            <div class="search-result-icon">${statusIcon}</div>
            <div class="search-result-content">
              <div class="search-result-title">${result.title}</div>
              <div class="search-result-meta">
                ${result.subject ? `<span class="search-meta-item">📚 ${result.subject}</span>` : ''}
                <span class="search-meta-item">📅 ${new Date(result.dueDate).toLocaleDateString('he-IL')}</span>
                ${result.tags.length > 0 ? `<span class="search-meta-item">🏷️ ${result.tags.join(', ')}</span>` : ''}
              </div>
            </div>
          </div>
        `;
      } else if (result.type === 'subject') {
        html += `
          <div class="search-result-item" onclick="smartSearch.navigateToSubject(${result.id})">
            <div class="search-result-icon" style="background: ${result.color};">📚</div>
            <div class="search-result-content">
              <div class="search-result-title">${result.name}</div>
              <div class="search-result-meta">
                <span class="search-meta-item">${subjectTerm}</span>
              </div>
            </div>
          </div>
        `;
      }
    });
    
    container.innerHTML = html;
  }

  navigateToHomework(id) {
    console.log('🔍 navigateToHomework: Navigating to homework', id);
    
    document.getElementById('search-modal').remove();
    
    // גלילה למשימה
    const homeworkList = document.getElementById('homework-list');
    if (homeworkList) {
      homeworkList.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    notifications.showInAppNotification('גלילה למשימה...', 'info');
  }

  navigateToSubject(id) {
    console.log('🔍 navigateToSubject: Navigating to subject', id);
    
    document.getElementById('search-modal').remove();
    
    // גלילה לנושא/מקצוע
    const subjectList = document.getElementById('subject-list');
    if (subjectList) {
      subjectList.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    const subjectTerm = (window.getSubjectTerm && typeof window.getSubjectTerm === 'function') ? window.getSubjectTerm() : 'מקצוע';
    notifications.showInAppNotification(`גלילה ל${subjectTerm}...`, 'info');
  }
}

// ============ יצירת אובייקטים גלובליים ============
console.log('🎨 Creating global theme customizer...');
const themeCustomizer = new ThemeCustomizer();

console.log('⚡ Creating global quick actions manager...');
const quickActions = new QuickActionsManager();

console.log('🔍 Creating global smart search manager...');
const smartSearch = new SmartSearchManager();

console.log('✅ All utilities initialized');

// ============ אתחול ============
window.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 utilities.js: Initializing...');
  
  await themeCustomizer.loadTheme();
  await quickActions.loadSettings();
  quickActions.initializeListeners();
  await smartSearch.buildSearchIndex();
  
  console.log('✅ utilities.js: Initialized');
});
// Enhanced Main Application Logic

// ── Fallback: ודא שמשתנה storage זמין ──────────────────────────
// storage.js מגדיר window.storage, אבל אם הוא נטען לפני Firebase
// הוא עדיין עובד (fallback ל-localStorage). אם מסיבה כלשהי לא הוגדר -
// ניצור כאן stub בסיסי כדי למנוע ReferenceError.
if (typeof storage === 'undefined') {
  /* eslint-disable no-var */
  var storage = window.storage || window.storageManager || {
    get: async (key) => {
      try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; }
    },
    set: async (key, value) => {
      try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
    },
    remove: async (key) => { localStorage.removeItem(key); },
    clearAll: async () => { localStorage.clear(); },
    exportData: async () => false,
    importData: async () => ({ success: false }),
    autoBackup: async () => {},
    getLastBackupDate: async () => null,
    syncAllToFirestore: async () => {},
    syncAllFromFirestore: async () => {}
  };
}

const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
let subjects = [];
let homework = [];
let settings = {
  enableNotifications: false,
  notificationDays: 1,
  notificationTime: '09:00',
  autoBackup: false,
  darkMode: false,
  recentColors: [],
  viewMode: 'list',
  studentMode: true,
  usageMode: 'student'
};
let selectedColor = '#3b82f6';
let showArchive = false;
let filters = {
  subject: 'all',
  status: 'all',
  urgency: 'all',
  tags: []
};
let availableTags = [];
let exams = [];
let customTaskFields = [];
let groupMembers = [];

// =============== טעינה ושמירה ===============


// ── Add Task Modal ────────────────────────────
function initEditHomeworkModal() {
  const modal    = document.getElementById('edit-hw-modal');
  const closeBtn = document.getElementById('close-edit-hw-modal');
  if (!modal) return;
  closeBtn && closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });
}

function initAddTaskModal() {
  const openBtn  = document.getElementById('open-add-task-modal');
  const modal    = document.getElementById('add-task-modal');
  const closeBtn = document.getElementById('close-add-task-modal');

  if (!openBtn || !modal) return;

  openBtn.addEventListener('click', () => {
    modal.classList.remove('hidden');
  });

  closeBtn && closeBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.add('hidden');
  });

  // סגירה אחרי הוספת משימה
  const addBtn = document.getElementById('add-homework');
  if (addBtn) {
    const origClick = addBtn.onclick;
    addBtn.addEventListener('click', () => {
      setTimeout(() => {
        // רק אם הטופס התנקה (משמעות שהמשימה נשמרה)
        const title = document.getElementById('hw-title');
        if (title && title.value === '') modal.classList.add('hidden');
      }, 100);
    });
  }
}

async function loadData() {
  console.log('🔄 loadData: Starting data load...');
  try {
    console.log('📊 loadData: Loading subjects...');
    subjects = await storage.get('homework-subjects') || [];
    console.log('✅ loadData: Subjects loaded:', subjects.length, 'items');

    console.log('👥 loadData: Loading group members...');
    groupMembers = await storage.get('group-members') || [];
    console.log('✅ loadData: Group members loaded:', groupMembers.length, 'items');
    
    console.log('📚 loadData: Loading homework...');
    homework = await storage.get('homework-list') || [];
    homework = homework.map(hw => ({
      ...hw,
      customFields: hw && typeof hw.customFields === 'object' && hw.customFields !== null ? hw.customFields : {},
      assignees: Array.isArray(hw?.assignees) ? hw.assignees : []
    }));
    console.log('✅ loadData: Homework loaded:', homework.length, 'items');
    
    console.log('🏷️ loadData: Loading tags...');
    availableTags = await storage.get('homework-tags') || [];
    console.log('✅ loadData: Tags loaded:', availableTags.length, 'items');

    console.log('🧩 loadData: Loading custom task fields...');
    customTaskFields = await storage.get('homework-custom-fields') || [];
    customTaskFields = customTaskFields.map((field, index) => normalizeCustomTaskField(field, index)).filter(Boolean);
    console.log('✅ loadData: Custom task fields loaded:', customTaskFields.length, 'items');

    exams = await storage.get('exams-list') || [];
    console.log('✅ loadData: Exams loaded:', exams.length, 'items');
    
    console.log('⚙️ loadData: Loading settings...');
    settings = await storage.get('homework-settings') || {
      enableNotifications: false,
      notificationDays: 1,
      notificationTime: '09:00',
      autoBackup: false,
      darkMode: false,
      systemTheme: true,
      recentColors: [],
      viewMode: 'list',
      usageMode: 'student'
    };
    if (!settings.usageMode) settings.usageMode = settings.studentMode !== false ? 'student' : 'general';
    console.log('✅ loadData: Settings loaded:', settings);
    await autoAdvanceGradeLevel();
    
    // החל מצב לילה: העדפת מערכת כברירת מחדל, אלא אם המשתמש בחר ידנית
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldDark = settings.systemTheme !== false ? prefersDark : settings.darkMode;
    settings.darkMode = shouldDark;
    if (shouldDark) {
      console.log('🌙 loadData: Applying dark mode...');
      document.body.classList.add('dark-mode');
      const toggleBtn = document.getElementById('toggle-dark-mode');
      if (toggleBtn) {
        const svg = toggleBtn.querySelector('svg use');
        if (svg) svg.setAttribute('href', '#sun');
      }
      console.log('✅ loadData: Dark mode applied');
    }
    // האזנה לשינויי ערכת צבעים של המכשיר
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (settings.systemTheme !== false) {
        settings.darkMode = e.matches;
        document.body.classList.toggle('dark-mode', e.matches);
        const toggleBtn = document.getElementById('toggle-dark-mode');
        if (toggleBtn) {
          const svg = toggleBtn.querySelector('svg use');
          if (svg) svg.setAttribute('href', e.matches ? '#sun' : '#moon');
        }
      }
    });
    
    // החל תצוגה שמורה (רשימה או לוח שנה)
    if (settings.viewMode) {
      console.log('📅 loadData: Applying saved view mode:', settings.viewMode);
      const toggleViewBtn = document.getElementById('toggle-view-mode');
      if (toggleViewBtn) {
        const svg = toggleViewBtn.querySelector('svg use');
        if (svg) {
          // עדכון האייקון לפי המצב השמור
          svg.setAttribute('href', settings.viewMode === 'list' ? '#calendar' : '#list');
          console.log('📅 loadData: View mode icon updated to', settings.viewMode === 'list' ? 'calendar' : 'list');
        }
      }
    }
    
    console.log('🎨 loadData: Starting render...');
    
    // נקה צבעים כפולים
    if (deduplicateColors()) {
      console.log('✅ loadData: Removed duplicate colors');
    }
    
    render();
    console.log('✅ loadData: Render complete');
    
    // אתחול מודל הוספת משימה
    initAddTaskModal();
    initExamModal();
    initEditHomeworkModal();
    applyMode();

    // התחל בדיקת התראות אם מופעל
    if (settings.enableNotifications && notifications.permission === 'granted') {
      console.log('🔔 loadData: Starting periodic notification check...');
      await notifications.startPeriodicCheck(homework, settings);
      console.log('✅ loadData: Notification check started');
    }
    
    // בדיקת גיבוי אוטומטי
    if (settings.autoBackup) {
      console.log('💾 loadData: Running auto backup...');
      await storage.autoBackup();
      console.log('✅ loadData: Auto backup complete');
    }
    
    console.log('✅✅✅ loadData: הנתונים נטענו בהצלחה');
  } catch (error) {
    console.error('❌❌❌ loadData: שגיאה בטעינת נתונים:', error);
    if (notifications && notifications.showInAppNotification) {
      notifications.showInAppNotification('שגיאה בטעינת הנתונים', 'error');
    }
  }
}

async function saveData() {
  console.log('💾 saveData: Starting data save...');
  try {
    await storage.set('homework-subjects', subjects);
    await storage.set('group-members', groupMembers);
    await storage.set('homework-list', homework);
    await storage.set('homework-settings', settings);
    await storage.set('homework-tags', availableTags);
    await storage.set('homework-custom-fields', customTaskFields);
    await storage.set('exams-list', exams);
    console.log('✅✅✅ saveData: הנתונים נשמרו בהצלחה');
  } catch (error) {
    console.error('❌❌❌ saveData: שגיאה בשמירת נתונים:', error);
    if (notifications && notifications.showInAppNotification) {
      notifications.showInAppNotification('⚠️ שגיאה בשמירת הנתונים', 'error');
    }
  }
}

// =============== חישובים ועזרים ===============

function getDaysUntilDue(dueDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + 'T00:00:00');
  const days = Math.round((due - today) / (1000 * 60 * 60 * 24));
  return days;
}

function getUsageMode() {
  const mode = settings.usageMode;
  if (mode === 'student' || mode === 'general' || mode === 'group') return mode;
  return settings.studentMode !== false ? 'student' : 'general';
}

function isStudentMode() {
  return getUsageMode() === 'student';
}

function isGroupMode() {
  return getUsageMode() === 'group';
}

function getSubjectTerm() {
  return isStudentMode() ? 'מקצוע' : 'נושא';
}

function getSubjectsTerm() {
  return isStudentMode() ? 'מקצועות' : 'נושאים';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function slugifyCustomFieldLabel(label) {
  return label
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\u0590-\u05ff_-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeCustomTaskField(field, index = 0) {
  if (!field || !field.label) return null;
  const type = ['text', 'number', 'date', 'select'].includes(field.type) ? field.type : 'text';
  return {
    id: field.id || `${slugifyCustomFieldLabel(field.label) || 'custom-field'}-${index}`,
    label: field.label.trim(),
    type,
    options: type === 'select' ? (Array.isArray(field.options) ? field.options.filter(Boolean) : []) : []
  };
}

function renderTaskCustomFields(containerId, fieldValues = {}, idPrefix = 'hw') {
  const container = document.getElementById(containerId);
  const group = document.getElementById(`${containerId}-group`) || document.getElementById(`${idPrefix}-custom-fields-group`);
  if (!container) return;

  if (!customTaskFields.length) {
    container.innerHTML = '<p class="custom-fields-empty">אין עדיין שדות מותאמים. אפשר להוסיף אותם בהגדרות.</p>';
    if (group) group.classList.add('hidden');
    return;
  }

  if (group) group.classList.remove('hidden');

  container.innerHTML = customTaskFields.map(field => {
    const inputId = `${idPrefix}-custom-field-${field.id}`;
    const currentValue = fieldValues[field.id] ?? '';

    if (field.type === 'select') {
      return `
        <div class="custom-field-input">
          <label for="${inputId}">${escapeHtml(field.label)}</label>
          <select class="select" id="${inputId}" data-custom-field-id="${escapeHtml(field.id)}">
            <option value="">בחר</option>
            ${field.options.map(option => `
              <option value="${escapeHtml(option)}" ${option === currentValue ? 'selected' : ''}>${escapeHtml(option)}</option>
            `).join('')}
          </select>
        </div>
      `;
    }

    return `
      <div class="custom-field-input">
        <label for="${inputId}">${escapeHtml(field.label)}</label>
        <input
          type="${field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}"
          class="input"
          id="${inputId}"
          data-custom-field-id="${escapeHtml(field.id)}"
          value="${escapeHtml(currentValue)}"
        >
      </div>
    `;
  }).join('');
}

function collectTaskCustomFieldValues(idPrefix = 'hw') {
  return customTaskFields.reduce((acc, field) => {
    const input = document.getElementById(`${idPrefix}-custom-field-${field.id}`);
    if (!input) return acc;
    const value = input.value.trim();
    if (value !== '') acc[field.id] = value;
    return acc;
  }, {});
}

function formatCustomFieldValue(field, value) {
  if (value === null || value === undefined || value === '') return '';
  if (field.type === 'date') {
    const parsed = new Date(`${value}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) return parsed.toLocaleDateString('he-IL');
  }
  return String(value);
}

function renderCustomTaskFieldsManager() {
  const container = document.getElementById('custom-task-fields-management');
  if (!container) return;

  container.innerHTML = `
    <div class="custom-fields-manager">
      <div class="add-tag-form custom-fields-form">
        <input type="text" class="input" id="new-custom-field-label" placeholder="שם השדה">
        <select class="select" id="new-custom-field-type">
          <option value="text">טקסט</option>
          <option value="number">מספר</option>
          <option value="date">תאריך</option>
          <option value="select">רשימת בחירה</option>
        </select>
        <button class="btn btn-primary" onclick="addCustomTaskField()">
          <svg width="16" height="16"><use href="#plus"></use></svg>
          הוסף
        </button>
      </div>
      <input type="text" class="input custom-field-options-input" id="new-custom-field-options" placeholder="אפשרויות מופרדות בפסיקים" style="display:none;">
      <div class="tags-list custom-fields-list">
        ${customTaskFields.length ? customTaskFields.map(field => `
          <div class="tag-item custom-field-item">
            <div>
              <strong>${escapeHtml(field.label)}</strong>
              <span class="custom-field-type">${field.type === 'text' ? 'טקסט' : field.type === 'number' ? 'מספר' : field.type === 'date' ? 'תאריך' : 'רשימה'}</span>
              ${field.type === 'select' && field.options.length ? `<div class="custom-field-options-preview">${escapeHtml(field.options.join(', '))}</div>` : ''}
            </div>
            <button class="icon-btn" onclick="removeCustomTaskField('${escapeHtml(field.id)}')" title="מחק שדה">
              <svg width="14" height="14"><use href="#x"></use></svg>
            </button>
          </div>
        `).join('') : '<p class="custom-fields-empty">עוד לא הוגדרו שדות מותאמים.</p>'}
      </div>
    </div>
  `;

  const typeSelect = document.getElementById('new-custom-field-type');
  const optionsInput = document.getElementById('new-custom-field-options');
  if (typeSelect && optionsInput) {
    typeSelect.addEventListener('change', () => {
      optionsInput.style.display = typeSelect.value === 'select' ? '' : 'none';
      if (typeSelect.value !== 'select') optionsInput.value = '';
    });
  }
}

function resetAppDataState() {
  subjects = [];
  groupMembers = [];
  homework = [];
  availableTags = [];
  exams = [];
  customTaskFields = [];
  filters = {
    subject: 'all',
    status: 'all',
    urgency: 'all',
    tags: []
  };
  settings = {
    enableNotifications: false,
    notificationDays: 1,
    notificationTime: '09:00',
    autoBackup: false,
    darkMode: false,
    recentColors: [],
    viewMode: 'list',
    studentMode: true,
    usageMode: 'student'
  };
}

async function addCustomTaskField() {
  const labelInput = document.getElementById('new-custom-field-label');
  const typeInput = document.getElementById('new-custom-field-type');
  const optionsInput = document.getElementById('new-custom-field-options');
  if (!labelInput || !typeInput || !optionsInput) return;

  const label = labelInput.value.trim();
  const type = typeInput.value;
  if (!label) {
    notifications.showInAppNotification('נא להזין שם לשדה המותאם', 'error');
    return;
  }

  if (customTaskFields.some(field => field.label === label)) {
    notifications.showInAppNotification('כבר קיים שדה עם אותו שם', 'error');
    return;
  }

  const newField = normalizeCustomTaskField({
    id: `${slugifyCustomFieldLabel(label) || 'custom-field'}-${Date.now()}`,
    label,
    type,
    options: type === 'select'
      ? optionsInput.value.split(',').map(option => option.trim()).filter(Boolean)
      : []
  }, customTaskFields.length);

  if (type === 'select' && !newField.options.length) {
    notifications.showInAppNotification('לשדה מסוג רשימה צריך להזין לפחות אפשרות אחת', 'error');
    return;
  }

  customTaskFields.push(newField);
  await saveData();
  renderCustomTaskFieldsManager();
  renderTaskCustomFields('hw-custom-fields');
  renderTaskCustomFields('edit-hw-custom-fields', {}, 'edit-hw');

  labelInput.value = '';
  typeInput.value = 'text';
  optionsInput.value = '';
  optionsInput.style.display = 'none';
  notifications.showInAppNotification(`השדה "${label}" נוסף`, 'success');
}

async function removeCustomTaskField(fieldId) {
  const field = customTaskFields.find(item => item.id === fieldId);
  if (!field) return;
  if (!confirm(`למחוק את השדה "${field.label}" מכל המשימות?`)) return;

  customTaskFields = customTaskFields.filter(item => item.id !== fieldId);
  homework.forEach(hw => {
    if (hw.customFields) delete hw.customFields[fieldId];
  });

  await saveData();
  render();
  renderTaskCustomFields('hw-custom-fields');
  renderTaskCustomFields('edit-hw-custom-fields', {}, 'edit-hw');
  notifications.showInAppNotification(`השדה "${field.label}" נמחק`, 'success');
}

function renderGroupMembersManager() {
  const container = document.getElementById('group-members-management');
  if (!container) return;

  container.innerHTML = `
    <div class="custom-fields-manager">
      <div class="add-tag-form custom-fields-form">
        <input type="text" class="input" id="new-group-member-name" placeholder="שם האדם">
        <input type="text" class="input" id="new-group-member-role" placeholder="תפקיד / הערה">
        <button class="btn btn-primary" onclick="addGroupMember()">
          <svg width="16" height="16"><use href="#plus"></use></svg>
          הוסף
        </button>
      </div>
      <div class="tags-list custom-fields-list">
        ${groupMembers.length ? groupMembers.map(member => `
          <div class="tag-item group-member-item">
            <div>
              <strong>${escapeHtml(member.name)}</strong>
              ${member.role ? `<div class="custom-field-options-preview">${escapeHtml(member.role)}</div>` : ''}
            </div>
            <button class="icon-btn" onclick="removeGroupMember('${escapeHtml(member.id)}')" title="מחק אדם">
              <svg width="14" height="14"><use href="#x"></use></svg>
            </button>
          </div>
        `).join('') : '<p class="custom-fields-empty">עוד לא הוגדרו אנשים בקבוצה.</p>'}
      </div>
    </div>
  `;
}

async function addGroupMember() {
  const nameInput = document.getElementById('new-group-member-name');
  const roleInput = document.getElementById('new-group-member-role');
  if (!nameInput || !roleInput) return;

  const name = nameInput.value.trim();
  const role = roleInput.value.trim();
  if (!name) {
    notifications.showInAppNotification('נא להזין שם לאדם בקבוצה', 'error');
    return;
  }

  if (groupMembers.some(member => member.name === name)) {
    notifications.showInAppNotification('האדם הזה כבר קיים בקבוצה', 'error');
    return;
  }

  groupMembers.push({
    id: `member-${Date.now()}`,
    name,
    role
  });

  await saveData();
  renderGroupMembersManager();
  renderAssigneeSelector('hw-assignees', [], 'hw');
  renderAssigneeSelector('edit-hw-assignees', [], 'edit-hw');
  nameInput.value = '';
  roleInput.value = '';
  notifications.showInAppNotification(`"${name}" נוסף לקבוצה`, 'success');
}

async function removeGroupMember(memberId) {
  const member = groupMembers.find(item => item.id === memberId);
  if (!member) return;
  if (!confirm(`למחוק את "${member.name}" מהקבוצה ומכל ההקצאות?`)) return;

  groupMembers = groupMembers.filter(item => item.id !== memberId);
  homework.forEach(hw => {
    if (Array.isArray(hw.assignees)) {
      hw.assignees = hw.assignees.filter(id => id !== memberId);
    }
  });

  await saveData();
  render();
  notifications.showInAppNotification(`"${member.name}" הוסר מהקבוצה`, 'success');
}

function renderAssigneeSelector(containerId, selectedIds = [], idPrefix = 'hw') {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!groupMembers.length) {
    container.innerHTML = '<p class="custom-fields-empty">אין עדיין חברי קבוצה. הוסף אותם בהגדרות.</p>';
    return;
  }

  const selectedSet = new Set(selectedIds);
  container.innerHTML = `
    <div class="assignee-grid">
      ${groupMembers.map(member => `
        <label class="tag-checkbox assignee-checkbox">
          <input
            type="checkbox"
            id="${idPrefix}-assignee-${escapeHtml(member.id)}"
            ${selectedSet.has(member.id) ? 'checked' : ''}
          >
          <span>
            ${escapeHtml(member.name)}
            ${member.role ? `<small>${escapeHtml(member.role)}</small>` : ''}
          </span>
        </label>
      `).join('')}
    </div>
  `;
}

function collectAssignees(idPrefix = 'hw') {
  return groupMembers
    .filter(member => document.getElementById(`${idPrefix}-assignee-${member.id}`)?.checked)
    .map(member => member.id);
}

function getAssigneeNames(hw) {
  if (!Array.isArray(hw.assignees) || !hw.assignees.length) return [];
  return hw.assignees
    .map(id => groupMembers.find(member => member.id === id)?.name)
    .filter(Boolean);
}

function downloadFile(filename, dataUrl) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// =============== Color Picker מתקדם ===============

function renderColorPicker() {
  const picker = document.getElementById('color-picker');
  
  let html = '<div class="color-grid">';
  
  // צבעים קבועים
  colors.forEach(color => {
    html += `
      <div class="color-option ${color === selectedColor ? 'selected' : ''}" 
           style="background-color: ${color};"
           onclick="selectColor('${color}')"></div>
    `;
  });
  
  // צבעים אחרונים
  if (settings.recentColors && settings.recentColors.length > 0) {
    html += '<div class="color-divider"></div>';
    settings.recentColors.slice(0, 6).forEach(color => {
      html += `
        <div class="color-option ${color === selectedColor ? 'selected' : ''}" 
             style="background-color: ${color};"
             onclick="selectColor('${color}')"></div>
      `;
    });
  }
  
  html += '</div>';
  
  // Custom color picker
  html += `
    <div class="custom-color-section">
      <input type="color" id="custom-color-input" value="${selectedColor}" 
             onchange="selectCustomColor(this.value)">
      <label for="custom-color-input">צבע מותאם אישית</label>
    </div>
  `;
  
  picker.innerHTML = html;
}

function selectColor(color) {
  selectedColor = color;
  if (!colors.includes(color)) {
    addToRecentColors(color);
  }
  renderColorPicker();
}

function selectCustomColor(color) {
  selectedColor = color;
  if (!colors.includes(color)) {
    addToRecentColors(color);
  }
  renderColorPicker();
}

function addToRecentColors(color) {
  if (colors.includes(color)) return;
  if (!settings.recentColors) settings.recentColors = [];
  settings.recentColors = settings.recentColors.filter(c => c !== color);
  settings.recentColors.unshift(color);
  if (settings.recentColors.length > 12) {
    settings.recentColors = settings.recentColors.slice(0, 12);
  }
  saveData();
}

// פונקציה לניקוי צבעים כפולים
function deduplicateColors() {
  console.log('🎨 deduplicateColors: Starting color deduplication...');
  
  if (!settings.recentColors || settings.recentColors.length === 0) {
    console.log('⏸️ deduplicateColors: No recent colors to deduplicate');
    return false;
  }
  
  const originalLength = settings.recentColors.length;
  console.log('🎨 deduplicateColors: Original colors:', settings.recentColors);
  
  // הסר צבעים שזהים לצבעי ברירת המחדל
  settings.recentColors = settings.recentColors.filter(color => !colors.includes(color));
  
  // הסר כפילויות
  settings.recentColors = [...new Set(settings.recentColors)];
  
  const newLength = settings.recentColors.length;
  console.log('🎨 deduplicateColors: Cleaned colors:', settings.recentColors);
  console.log('🎨 deduplicateColors: Removed', originalLength - newLength, 'duplicate colors');
  
  if (originalLength !== newLength) {
    saveData();
    return true;
  }
  
  return false;
}

// =============== מצב לילה ===============

function toggleDarkMode() {
  console.log('🌙 toggleDarkMode: Toggling dark mode...');
  settings.darkMode = !settings.darkMode;
  settings.systemTheme = false; // המשתמש בחר ידנית - לא לעקוב אחרי המכשיר

  document.body.classList.toggle('dark-mode');
  
  // עדכון האייקון של הכפתור
  const toggleBtn = document.getElementById('toggle-dark-mode');
  if (toggleBtn) {
    const svg = toggleBtn.querySelector('svg use');
    if (svg) {
      svg.setAttribute('href', settings.darkMode ? '#sun' : '#moon');
    }
  }
  
  saveData();
  
  // עדכון צבעי הגרפים
  if (typeof updateChartColors === 'function') {
    setTimeout(() => updateChartColors(), 100);
  }
  
  const icon = settings.darkMode ? '🌙' : '☀️';
  const message = `מצב ${settings.darkMode ? 'לילה' : 'יום'} הופעל ${icon}`;
  notifications.showInAppNotification(message, 'success');
}

function toggleViewMode() {
  settings.viewMode = settings.viewMode === 'list' ? 'calendar' : 'list';
  
  // עדכון האייקון
  const toggleBtn = document.getElementById('toggle-view-mode');
  if (toggleBtn) {
    const svg = toggleBtn.querySelector('svg use');
    if (svg) {
      svg.setAttribute('href', settings.viewMode === 'list' ? '#calendar' : '#list');
    }
  }
  
  // שמירת ההגדרה
  saveData();
  
  const message = `תצוגת ${settings.viewMode === 'list' ? 'רשימה' : 'לוח שנה'}`;
  notifications.showInAppNotification(message, 'info');
  
  // החלפת התצוגה בפועל
  if (settings.viewMode === 'calendar') {
    console.log('📅 toggleViewMode: Switching to calendar view');
    if (typeof calendar !== 'undefined' && calendar.renderCalendar) {
      calendar.renderCalendar(showArchive);
    } else {
      console.error('❌ toggleViewMode: Calendar manager not found');
      notifications.showInAppNotification('שגיאה בטעינת לוח השנה', 'error');
    }
  } else {
    console.log('📋 toggleViewMode: Switching to list view');
    renderHomework();
  }
}

// =============== סינון משימות ===============

function applyFilters() {
  render();
}

function setFilter(type, value) {
  filters[type] = value;
  applyFilters();
}

function toggleTagFilter(tag) {
  const index = filters.tags.indexOf(tag);
  if (index > -1) {
    filters.tags.splice(index, 1);
  } else {
    filters.tags.push(tag);
  }
  applyFilters();
}

function getFilteredHomework(homeworkList) {
  return homeworkList.filter(hw => {
    if (filters.subject !== 'all' && hw.subject != filters.subject) return false;
    if (filters.status === 'completed' && !hw.completed) return false;
    if (filters.status === 'pending' && hw.completed) return false;
    
    if (filters.urgency !== 'all') {
      if (!hw.dueDate) return false; // ללא תאריך - לא נכלל בסינון דחיפות
      const daysLeft = getDaysUntilDue(hw.dueDate);
      if (filters.urgency === 'urgent' && (daysLeft > 2 || hw.completed)) return false;
      if (filters.urgency === 'overdue' && (daysLeft >= 0 || hw.completed)) return false;
    }
    
    if (filters.tags.length > 0) {
      if (!hw.tags || !hw.tags.some(tag => filters.tags.includes(tag))) return false;
    }
    
    return true;
  });
}

// =============== תגיות ===============

function addTag() {
  const input = document.getElementById('new-tag-input');
  const tag = input.value.trim();
  
  if (!tag) return;
  if (availableTags.includes(tag)) {
    notifications.showInAppNotification('תגית זו כבר קיימת', 'error');
    return;
  }
  
  availableTags.push(tag);
  input.value = '';
  saveData();
  renderTagSelector();
  notifications.showInAppNotification(`התגית "${tag}" נוספה`, 'success');
}

function removeTag(tag) {
  if (!confirm(`האם למחוק את התגית "${tag}"? היא תוסר מכל המשימות`)) return;
  
  availableTags = availableTags.filter(t => t !== tag);
  homework.forEach(hw => {
    if (hw.tags) hw.tags = hw.tags.filter(t => t !== tag);
  });
  
  saveData();
  render();
  notifications.showInAppNotification(`התגית "${tag}" נמחקה`, 'success');
}

function toggleHomeworkTag(homeworkId, tag) {
  const hw = homework.find(h => h.id === homeworkId);
  if (!hw) return;
  
  if (!hw.tags) hw.tags = [];
  const index = hw.tags.indexOf(tag);
  
  if (index > -1) {
    hw.tags.splice(index, 1);
  } else {
    hw.tags.push(tag);
  }
  
  saveData();
  render();
}

// =============== רינדור ===============

function renderSubjects() {
  const select       = document.getElementById('hw-subject');
  const filterSelect = document.getElementById('filter-subject');
  const examSelect   = document.getElementById('exam-subject');
  const subjectTerm  = getSubjectTerm();
  const subjectsTerm = getSubjectsTerm();

  const addSubjectLabel = document.getElementById('hw-subject-label');
  if (addSubjectLabel) addSubjectLabel.textContent = subjectTerm;
  const addSubjectPlaceholder = document.querySelector('#hw-subject option[value=""]');
  if (addSubjectPlaceholder) addSubjectPlaceholder.textContent = `בחר ${subjectTerm}`;
  const showAddSubjectBtn = document.getElementById('show-add-subject');
  if (showAddSubjectBtn) showAddSubjectBtn.textContent = `+ ${subjectTerm} חדש`;
  const subjectNameInput = document.getElementById('subject-name');
  if (subjectNameInput) subjectNameInput.placeholder = `שם ה${subjectTerm}`;
  const editSubjectLabel = document.getElementById('edit-hw-subject-label');
  if (editSubjectLabel) editSubjectLabel.textContent = subjectTerm;
  const editSubjectPlaceholder = document.querySelector('#edit-hw-subject option[value=""]');
  if (editSubjectPlaceholder) editSubjectPlaceholder.textContent = `בחר ${subjectTerm}`;
  const filterSubjectOption = document.querySelector('#filter-subject option[value="all"]');
  if (filterSubjectOption) filterSubjectOption.textContent = `כל ה${subjectsTerm}`;
  const filterSubjectSelect = document.getElementById('filter-subject');
  if (filterSubjectSelect) filterSubjectSelect.setAttribute('aria-label', `סינון ${subjectTerm}`);

  const subjectOptions = `<option value="">בחר ${subjectTerm}</option>` +
    subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
  if (select) select.innerHTML = subjectOptions;
  if (examSelect) {
    const prevVal = examSelect.value;
    examSelect.innerHTML = subjectOptions;
    if (prevVal) examSelect.value = prevVal;
  }

  if (filterSelect) {
    filterSelect.innerHTML = `<option value="all">כל ה${subjectsTerm}</option>` +
      subjects.map(s => `<option value="${s.id}" ${filters.subject == s.id ? 'selected' : ''}>${s.name}</option>`).join('');
  }
}

function renderFilters() {
  const statusEl  = document.getElementById('filter-status');
  const urgencyEl = document.getElementById('filter-urgency');
  if (statusEl)  statusEl.value  = filters.status  || 'all';
  if (urgencyEl) urgencyEl.value = filters.urgency || 'all';
  renderSubjects();
}

function clearFilters() {
  filters = {
    subject: 'all',
    status: 'all',
    urgency: 'all',
    tags: []
  };
  renderFilters();
  render();
}

function renderTagSelector() {
  const container = document.getElementById('tag-management');
  if (!container) return;
  
  let html = `
    <div class="tag-management-section">
      <h4>ניהול תגיות</h4>
      <div class="add-tag-form">
        <input type="text" class="input" id="new-tag-input" placeholder="תגית חדשה">
        <button class="btn btn-primary" onclick="addTag()">
          <svg width="16" height="16"><use href="#plus"></use></svg>
          הוסף
        </button>
      </div>
      <div class="tags-list">
        ${availableTags.map(tag => `
          <div class="tag-item">
            <span>${tag}</span>
            <button class="icon-btn" onclick="removeTag('${tag}')">
              <svg width="14" height="14"><use href="#x"></use></svg>
            </button>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  
  container.innerHTML = html;
}

function renderHomework() {
  const list = document.getElementById('homework-list');
  const archiveBtn = document.getElementById('archive-toggle');

  if (settings.viewMode === 'calendar') {
    if (typeof calendar !== 'undefined' && calendar.renderCalendar) {
      calendar.renderCalendar();
      archiveBtn.classList.add('hidden');
      return;
    }
  }

  const today = new Date(); today.setHours(0,0,0,0);
  const activeHomework = homework.filter(h => {
    if (h.startDate && new Date(h.startDate) > today) return false;
    if (!h.completed) return true;
    if (!h.dueDate) return false; // פריטים מושלמים בלי תאריך לא מוצגים ברשימה הפעילה
    return getDaysUntilDue(h.dueDate) >= 0;
  });

  const archivedHomework = homework.filter(h => {
    if (!h.completed) return false;
    if (!h.dueDate) return true; // פריטים בלי תאריך שהושלמו עוברים לארכיון
    return getDaysUntilDue(h.dueDate) < 0;
  });

  // מבחנים בארכיון = הושלמו + (אין תאריך או תאריך עבר)
  const archivedExams = (exams || []).filter(e => {
    if (!e.completed) return false;
    if (!e.date) return true; // מבחן בלי תאריך שהושלם עובר לארכיון
    return getDaysUntilDue(e.date) < 0;
  });
  const totalArchived = archivedHomework.length + archivedExams.length;

  if (totalArchived > 0) {
    archiveBtn.classList.remove('hidden');
    archiveBtn.textContent = showArchive ? 'הסתר ארכיון' : `ארכיון (${totalArchived})`;
  } else {
    archiveBtn.classList.add('hidden');
  }

  let displayList = showArchive ? archivedHomework : activeHomework;
  displayList = getFilteredHomework(displayList);

  // ── Google Tasks — מוסיף לרשימה המאוחדת ──
  const gTasks = (typeof dashboardWidget !== 'undefined' && dashboardWidget.isConnected())
    ? dashboardWidget.getTasks()
    : [];

  if (displayList.length === 0 && gTasks.length === 0 && (!showArchive || archivedExams.length === 0)) {
    const message = showArchive ? 'אין פריטים בארכיון' : 'אין משימות להצגה';
    list.innerHTML = `<p class="empty-state">${message}</p>`;
    return;
  }

  const sorted = [...displayList].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate) - new Date(b.dueDate);
  });

  // בנה HTML ל-Google Tasks
  const today_gtask = new Date(); today_gtask.setHours(0,0,0,0);
  const gTasksHTML = gTasks.map(t => {
    const due  = t.due ? new Date(t.due) : null;
    const days = due ? Math.round((due - today_gtask) / 86400000) : null;
    let daysText = '', itemClass = 'homework-item';
    if (due !== null) {
      if      (days < 0)   { daysText = `באיחור של ${Math.abs(days)} ימים`; itemClass += ' overdue'; }
      else if (days === 0) { daysText = 'היום!';       itemClass += ' urgent'; }
      else if (days === 1) { daysText = 'מחר';         itemClass += ' urgent'; }
      else if (days === 2) { daysText = 'מחרתיים';     itemClass += ' urgent'; }
      else                 { daysText = `עוד ${days} ימים`; }
    }
    const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    return `
      <div class="${itemClass}" id="gtask-${t.id}">
        <div class="homework-header">
          <input type="checkbox" class="checkbox" onchange="completeGTask('${t.id}','${t.listId}',this)">
          <div class="homework-content">
            <div class="homework-badges">
              <span class="badge" style="background:#6366f1">${esc(t.listTitle)}</span>
              <span class="badge" style="background:#0ea5e9">Google Tasks</span>
            </div>
            <h3 class="homework-title">${esc(t.title || 'ללא כותרת')}</h3>
            ${daysText ? `<div class="homework-meta"><span class="days-left ${days !== null && days < 0 ? 'overdue' : days !== null && days <= 2 ? 'urgent' : ''}">${daysText}</span></div>` : ''}
          </div>
        </div>
      </div>`;
  }).join('');

  // מיזוג מבחנים לרשימה המאוחדת
  const examsToShow = showArchive
    ? archivedExams
    : (exams || []).filter(e => {
        if (!e.completed) return true; // מבחנים לא מושלמים תמיד בתצוגה הפעילה
        if (!e.date) return false; // מבחנים מושלמים בלי תאריך לא בתצוגה הפעילה
        return getDaysUntilDue(e.date) >= 0; // מבחנים מושלמים עם תאריך עתידי בתצוגה הפעילה
      });
  const examItems = examsToShow.map(e => ({ ...e, _type: 'exam', dueDate: e.date }));

  const allItems = [...sorted, ...examItems].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return new Date(a.dueDate) - new Date(b.dueDate);
  });

  list.innerHTML = allItems.map(item => {
    if (item._type === 'exam') {
      // ── כרטיס מבחן ──
      const exam = item;
      const subject = subjects.find(s => s.id == exam.subject);
      const daysLeft = getDaysUntilDue(exam.date);
      const isUrgent  = daysLeft <= 3 && daysLeft >= 0 && !exam.completed;
      const isOverdue = daysLeft < 0 && !exam.completed;

      let daysText = '';
      if (!exam.completed) {
        if (isOverdue)       daysText = `עבר לפני ${Math.abs(daysLeft)} ימים`;
        else if (daysLeft === 0) daysText = '⚠️ היום!';
        else if (daysLeft === 1) daysText = '⚠️ מחר!';
        else                 daysText = `עוד ${daysLeft} ימים`;
      }

      let borderColor = subject ? subject.color : '#8b5cf6';
      if (isOverdue) borderColor = '#ef4444';
      if (isUrgent)  borderColor = '#f59e0b';

      const doneCnt  = (exam.topics || []).filter(t => t.done).length;
      const totalCnt = (exam.topics || []).length;
      const pct      = totalCnt ? Math.round((doneCnt / totalCnt) * 100) : null;

      let classes = 'homework-item exam-item';
      if (exam.completed) classes += ' completed exam-done';
      if (isOverdue) classes += ' overdue exam-overdue';
      else if (isUrgent) classes += ' urgent exam-urgent';

      return `
        <div class="${classes}" style="border-color:${borderColor};">
          <div class="homework-header">
            <input type="checkbox" class="checkbox" style="accent-color:#8b5cf6;"
              ${exam.completed ? 'checked' : ''} onchange="toggleExamDone('${exam.id}')">
            <div class="homework-content">
              <div class="homework-badges">
                <span class="badge exam-type-badge">📝 מבחן</span>
                ${subject ? `<span class="badge" style="background:${subject.color};">${subject.name}</span>` : ''}
                ${isOverdue ? '<span class="badge" style="background:#ef4444;">עבר!</span>' : ''}
                ${isUrgent  ? '<span class="badge" style="background:#f59e0b;">קרוב!</span>' : ''}
              </div>
              <h3 class="homework-title ${exam.completed ? 'completed' : ''}">${exam.title}</h3>
              ${exam.notes ? `<p class="homework-desc">${exam.notes}</p>` : ''}

              ${totalCnt ? `
                <div class="exam-topics" style="margin-top:0.6rem;">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.35rem;">
                    <span style="font-size:0.8rem;font-weight:600;color:#6b7280;">נושאים ללימוד</span>
                    <span style="font-size:0.8rem;color:#8b5cf6;font-weight:600;">${doneCnt}/${totalCnt} (${pct}%)</span>
                  </div>
                  <div class="exam-progress-bar"><div class="exam-progress-fill" style="width:${pct}%;"></div></div>
                  <div style="margin-top:0.45rem;">
                    ${(exam.topics || []).map((t, i) => `
                      <label class="exam-topic-check">
                        <input type="checkbox" ${t.done ? 'checked' : ''} onchange="toggleExamTopic('${exam.id}', ${i})">
                        <span style="${t.done ? 'text-decoration:line-through;color:#9ca3af;' : ''}">${t.name}</span>
                      </label>`).join('')}
                  </div>
                </div>
              ` : ''}

              <div class="homework-meta" style="margin-top:0.5rem;">
                <span>
                  <svg width="16" height="16" style="display:inline;vertical-align:middle;"><use href="#calendar"></use></svg>
                  ${new Date(exam.date).toLocaleDateString('he-IL')}
                </span>
                ${daysText ? `<span class="days-left ${isOverdue ? 'overdue' : isUrgent ? 'urgent' : ''}">${daysText}</span>` : ''}
                ${exam.gradeFinal !== null && exam.gradeFinal !== undefined ? `
                  <span class="exam-grade-badge" style="color:${exam.gradePct >= 90 ? '#16a34a' : exam.gradePct >= 75 ? '#2563eb' : exam.gradePct >= 55 ? '#d97706' : '#dc2626'};">
                    🎯 ${exam.gradeFinal}${exam.gradeMax && exam.gradeMax !== 100 ? '/'+exam.gradeMax : ''} (${exam.gradePct}%)
                  </span>` : ''}
              </div>
            </div>
            <div style="display:flex;flex-direction:column;gap:0.35rem;align-items:center;">
              <button class="icon-btn" onclick="openExamEditModal('${exam.id}')" title="עריכה" style="color:#7c3aed;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="icon-btn" onclick="deleteExam('${exam.id}')" title="מחיקה">
                <svg width="18" height="18"><use href="#trash"></use></svg>
              </button>
            </div>
          </div>
        </div>`;
    }

    // ── כרטיס משימה ──
    const hw = item;
    const subject = subjects.find(s => s.id == hw.subject);
    const daysLeft = hw.dueDate ? getDaysUntilDue(hw.dueDate) : null;
    const isUrgent = daysLeft !== null && daysLeft <= 2 && !hw.completed;
    const isOverdue = daysLeft !== null && daysLeft < 0 && !hw.completed;

    let classes = 'homework-item';
    if (hw.completed) classes += ' completed';
    if (isOverdue) classes += ' overdue';
    else if (isUrgent) classes += ' urgent';

    let daysText = '';
    if (!hw.completed && daysLeft !== null) {
      if (isOverdue) daysText = `באיחור של ${Math.abs(daysLeft)} ימים`;
      else if (daysLeft === 0) daysText = 'היום!';
      else if (daysLeft === 1) daysText = 'מחר';
      else if (daysLeft === 2) daysText = 'מחרתיים';
      else daysText = `עוד ${daysLeft} ימים`;
    }

    return `
      <div class="${classes}" ${!hw.completed && !isOverdue && !isUrgent && subject ? `style="border-color: ${subject.color};"` : ''}>
        <div class="homework-header">
          <input type="checkbox" class="checkbox" ${hw.completed ? 'checked' : ''}
                 onchange="toggleComplete(${hw.id})">
          <div class="homework-content">
            <div class="homework-badges">
              ${subject ? `<span class="badge" style="background-color: ${subject.color};">${subject.name}</span>` : ''}
              ${isOverdue ? '<span class="badge" style="background-color: #ef4444;">איחור!</span>' : ''}
              ${isUrgent && !isOverdue ? '<span class="badge" style="background-color: #f59e0b;">דחוף</span>' : ''}
              ${hw.tags && hw.tags.length > 0 ? hw.tags.map(tag => `
                <span class="badge tag-badge">${tag}</span>
              `).join('') : ''}
            </div>
            <h3 class="homework-title ${hw.completed ? 'completed' : ''}">${hw.title}</h3>
            ${hw.description ? `<p class="homework-desc">${hw.description}</p>` : ''}
            ${getAssigneeNames(hw).length ? `
              <div class="custom-field-values assignee-values">
                ${getAssigneeNames(hw).map(name => `
                  <div class="custom-field-value assignee-badge">
                    <span class="custom-field-label">אחראי</span>
                    <span class="custom-field-separator">:</span>
                    <span>${escapeHtml(name)}</span>
                  </div>
                `).join('')}
              </div>
            ` : ''}
            ${customTaskFields.some(field => hw.customFields && hw.customFields[field.id]) ? `
              <div class="custom-field-values">
                ${customTaskFields.map(field => {
                  const value = hw.customFields ? hw.customFields[field.id] : '';
                  if (!value) return '';
                  return `
                    <div class="custom-field-value">
                      <span class="custom-field-label">${escapeHtml(field.label)}</span>
                      <span class="custom-field-separator">:</span>
                      <span>${escapeHtml(formatCustomFieldValue(field, value))}</span>
                    </div>
                  `;
                }).join('')}
              </div>
            ` : ''}

            ${hw.files && hw.files.length ? `
              <div class="homework-files">
                <strong>קבצים מצורפים:</strong>
                <ul>
                  ${hw.files.map(f => `
                    <li>
                      ${f.name}
                      <button onclick="downloadFile('${f.name}', '${f.data}')" class="btn btn-secondary" style="margin-left:0.5rem; padding: 0.25rem 0.5rem; width: auto; font-size: 0.75rem;">הורד</button>
                    </li>
                  `).join('')}
                </ul>
              </div>
            ` : ''}

            ${availableTags.length > 0 ? `
              <div class="homework-tags-selector">
                <button class="btn btn-secondary" onclick="toggleTagEditor('${hw.id}')" style="padding: 0.25rem 0.5rem; width: auto; font-size: 0.75rem;">
                  <svg width="14" height="14"><use href="#tag"></use></svg>
                  ניהול תגיות
                </button>
                <div class="tags-editor hidden" id="tags-editor-${hw.id}">
                  ${availableTags.map(tag => `
                    <label class="tag-checkbox">
                      <input type="checkbox" ${hw.tags && hw.tags.includes(tag) ? 'checked' : ''}
                             onchange="toggleHomeworkTag(${hw.id}, '${tag}')">
                      ${tag}
                    </label>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            <div class="homework-meta">
              ${hw.dueDate ? `<span>
                <svg width="16" height="16" style="display: inline; vertical-align: middle;"><use href="#calendar"></use></svg>
                ${new Date(hw.dueDate).toLocaleDateString('he-IL')}
              </span>` : ''}
              ${daysText ? `<span class="days-left ${isOverdue ? 'overdue' : isUrgent ? 'urgent' : ''}">${daysText}</span>` : ''}
            </div>
          </div>
          <button class="icon-btn" onclick="openEditHomeworkModal('${hw.id}')" title="עריכה" style="color:#7c3aed;">
            <svg width="20" height="20"><use href="#pencil"></use></svg>
          </button>
          <button class="icon-btn" onclick="deleteHomework('${hw.id}')">
            <svg width="20" height="20"><use href="#trash"></use></svg>
          </button>
        </div>
      </div>
    `;
  }).join('') + gTasksHTML;
}

function toggleTagEditor(homeworkId) {
  const editor = document.getElementById(`tags-editor-${homeworkId}`);
  if (editor) editor.classList.toggle('hidden');
}

function updateStats() {
  const total = homework.length;
  const completed = homework.filter(h => h.completed).length;
  const pending = homework.filter(h => !h.completed).length;
  const urgent = homework.filter(h => !h.completed && h.dueDate && getDaysUntilDue(h.dueDate) <= 2).length;

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-completed').textContent = completed;
  document.getElementById('stat-pending').textContent = pending;
  document.getElementById('stat-urgent').textContent = urgent;

  // סטטיסטיקות מבחנים (מצב תלמיד)
  if (isStudentMode()) {
    const examTotal    = (exams || []).length;
    const examUpcoming = (exams || []).filter(e => !e.completed && getDaysUntilDue(e.date) >= 0).length;
    const examSoon     = (exams || []).filter(e => !e.completed && getDaysUntilDue(e.date) >= 0 && getDaysUntilDue(e.date) <= 7).length;
    const examDone     = (exams || []).filter(e => e.completed).length;

    const el = id => document.getElementById(id);
    if (el('stat-exam-total'))    el('stat-exam-total').textContent    = examTotal;
    if (el('stat-exam-upcoming')) el('stat-exam-upcoming').textContent = examUpcoming;
    if (el('stat-exam-soon'))     el('stat-exam-soon').textContent     = examSoon;
    if (el('stat-exam-done'))     el('stat-exam-done').textContent     = examDone;

    const examStatsRow = document.getElementById('exam-stats-row');
    if (examStatsRow) examStatsRow.style.display = '';
  } else {
    const examStatsRow = document.getElementById('exam-stats-row');
    if (examStatsRow) examStatsRow.style.display = 'none';
  }

  if (typeof updateCharts === 'function') {
    updateCharts();
  }
}

function render() {
  window.groupMembers = groupMembers;
  renderSubjects();
  renderHomework();
  renderFilters();
  renderTagSelector();
  renderCustomTaskFieldsManager();
  renderGroupMembersManager();
  renderTaskCustomFields('hw-custom-fields');
  renderTaskCustomFields('edit-hw-custom-fields', {}, 'edit-hw');
  renderAssigneeSelector('hw-assignees', [], 'hw');
  renderAssigneeSelector('edit-hw-assignees', [], 'edit-hw');
  updateStats();
  applyMode();
}

function applyMode() {
  const mode = getUsageMode();
  const isStudent = mode === 'student';
  const isGroup = mode === 'group';
  settings.studentMode = isStudent;
  const subjectTerm = getSubjectTerm();
  const subjectsTerm = getSubjectsTerm();

  // כותרת הרשימה
  const listTitle = document.getElementById('list-panel-title');
  if (listTitle) {
    listTitle.textContent = isStudent ? 'רשימת משימות' : isGroup ? 'משימות קבוצה' : 'רשימת מטלות';
  }

  // כפתור הוסף מבחן
  const examBtn = document.getElementById('open-add-exam-modal');
  if (examBtn) examBtn.style.display = isStudent ? '' : 'none';

  // סינון מקצוע
  const subjectFilter = document.getElementById('filter-subject');
  if (subjectFilter) subjectFilter.style.display = '';

  // שדה מקצוע + כפתור מקצוע חדש במודל
  const subjectFormGroup = document.getElementById('hw-subject-group');
  if (subjectFormGroup) subjectFormGroup.style.display = '';

  const filterLabel = document.querySelector('.list-header');
  if (filterLabel) {
    subjectFilter?.setAttribute('title', `סינון לפי ${subjectTerm}`);
  }

  const assigneesGroup = document.getElementById('hw-assignees-group');
  if (assigneesGroup) assigneesGroup.classList.toggle('hidden', !isGroup);

  const editAssigneesGroup = document.getElementById('edit-hw-assignees-group');
  if (editAssigneesGroup) editAssigneesGroup.classList.toggle('hidden', !isGroup);

  // Google Classroom בכותרת
  const classroomSection = document.querySelector('.settings-section.classroom-section');
  if (classroomSection) classroomSection.style.display = isStudent ? '' : 'none';

  // הוסף/הסר class ל-body
  // שדה שכבה ברירת מחדל בהגדרות
  const defaultGradeSetting = document.getElementById('default-grade-setting');
  if (defaultGradeSetting) defaultGradeSetting.style.display = isStudent ? '' : 'none';

  const groupMembersSetting = document.getElementById('group-members-setting');
  if (groupMembersSetting) groupMembersSetting.classList.toggle('hidden', !isGroup);

  const modeStudentText = document.querySelector('#mode-student-card .mode-toggle-text span');
  if (modeStudentText) modeStudentText.textContent = 'מקצועות, מבחנים, Classroom';
  const modeOtherText = document.querySelector('#mode-other-card .mode-toggle-text span');
  if (modeOtherText) modeOtherText.textContent = `מטלות עם ${subjectsTerm} וללא מבחנים`;
  const modeGroupText = document.querySelector('#mode-group-card .mode-toggle-text span');
  if (modeGroupText) modeGroupText.textContent = `${subjectsTerm}, אנשים והקצאות`;

  document.body.classList.toggle('non-student-mode', !isStudent);
  document.body.classList.toggle('group-mode', isGroup);
}

// =============== פעולות על מקצועות ===============

function addSubject() {
  const name = document.getElementById('subject-name').value.trim();
  const subjectTerm = getSubjectTerm();
  
  if (!name) {
    notifications.showInAppNotification(`נא להזין שם ${subjectTerm}`, 'error');
    return;
  }
  
  const newSubject = { id: Date.now(), name, color: selectedColor };
  subjects.push(newSubject);
  
  document.getElementById('subject-name').value = '';
  selectedColor = '#3b82f6';
  document.getElementById('add-subject-form').classList.add('hidden');
  document.getElementById('show-add-subject').classList.remove('hidden');
  
  saveData();
  render();
  notifications.showInAppNotification(`${subjectTerm} "${name}" נוסף בהצלחה`, 'success');
}

function deleteSubject(id) {
  const subject = subjects.find(s => s.id === id);
  if (!subject) return;
  const subjectTerm = getSubjectTerm();
  
  const relatedHomework = homework.filter(h => h.subject == id).length;
  let confirmMsg = `האם אתה בטוח שברצונך למחוק את ה${subjectTerm} "${subject.name}"?`;
  
  if (relatedHomework > 0) {
    confirmMsg += `\n\n⚠️ פעולה זו תמחק גם ${relatedHomework} משימות הקשורות ל${subjectTerm} הזה!`;
  }
  
  if (!confirm(confirmMsg)) return;
  
  subjects = subjects.filter(s => s.id !== id);
  homework = homework.filter(h => h.subject != id);
  
  saveData();
  render();
  notifications.showInAppNotification(`${subjectTerm} "${subject.name}" נמחק`, 'success');
}

// =============== פעולות על משימות ===============

function addHomework() {
  const subject = document.getElementById('hw-subject').value;
  const title = document.getElementById('hw-title').value.trim();
  const description = document.getElementById('hw-desc').value.trim();
  const startDate = document.getElementById('hw-start-date').value;
  const dueDate = document.getElementById('hw-date').value;
  const priority = document.getElementById('hw-priority').value;
  const fileInput = document.getElementById('hw-files');
  const customFields = collectTaskCustomFieldValues('hw');
  const assignees = collectAssignees('hw');
  const subjectTerm = getSubjectTerm();

  if (!title || !dueDate || !subject) {
    notifications.showInAppNotification(
      `נא למלא את כל השדות החובה (${subjectTerm}, כותרת, תאריך)`,
      'error'
    );
    return;
  }

  const files = Array.from(fileInput.files);
  const hwFiles = [];

  if (files.length === 0) {
    saveHomework([]);
  } else {
    let loadedCount = 0;
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = function(e) {
        hwFiles.push({
          name: file.name,
          type: file.type,
          data: e.target.result
        });
        loadedCount++;
        if (loadedCount === files.length) {
          saveHomework(hwFiles);
        }
      };
      reader.readAsDataURL(file);
    });
  }

  function saveHomework(hwFiles) {
    const newHomework = {
      id: Date.now(),
      subject,
      title,
      description,
      startDate: startDate || null,
      dueDate,
      priority,
      completed: false,
      files: hwFiles,
      tags: [],
      customFields,
      assignees,
      notified: false,
      todayNotified: false
    };
    
    homework.push(newHomework);

    document.getElementById('hw-subject').value = '';
    document.getElementById('hw-title').value = '';
    document.getElementById('hw-desc').value = '';
    document.getElementById('hw-start-date').value = '';
    document.getElementById('hw-date').value = '';
    document.getElementById('hw-priority').value = 'medium';
    document.getElementById('hw-files').value = '';
    renderTaskCustomFields('hw-custom-fields');

    saveData();
    render();
    notifications.showInAppNotification(`המשימה "${title}" נוספה בהצלחה`, 'success');
  }
}

function toggleComplete(id) {
  const hw = homework.find(h => h.id === id);
  if (!hw) return;
  
  hw.completed = !hw.completed;
  saveData();
  render();
  
  if (hw.completed) {
    notifications.showInAppNotification(`כל הכבוד! סיימת את "${hw.title}"`, 'success');
  }
}

async function completeGTask(taskId, listId, checkbox) {
  if (typeof dashboardWidget === 'undefined') return;
  checkbox.disabled = true;
  try {
    await dashboardWidget.completeTask(taskId, listId, checkbox);
    notifications.showInAppNotification('משימה הושלמה!', 'success');
  } catch(e) {
    checkbox.checked  = false;
    checkbox.disabled = false;
  }
}

function openEditHomeworkModal(id) {
  const numId = Number(id);
  const hw = homework.find(h => h.id === numId || h.id === id);
  if (!hw) return;

  // מלא את ה-select של מקצועות
  const subjectSelect = document.getElementById('edit-hw-subject');
  subjectSelect.innerHTML = '<option value="">בחר מקצוע</option>' +
    subjects.map(s => `<option value="${s.id}" ${s.id == hw.subject ? 'selected' : ''}>${s.name}</option>`).join('');

  document.getElementById('edit-hw-title').value = hw.title || '';
  renderAssigneeSelector('edit-hw-assignees', hw.assignees || [], 'edit-hw');
  document.getElementById('edit-hw-desc').value = hw.description || '';
  document.getElementById('edit-hw-date').value = hw.dueDate || '';
  document.getElementById('edit-hw-priority').value = hw.priority || 'medium';
  renderTaskCustomFields('edit-hw-custom-fields', hw.customFields || {}, 'edit-hw');

  document.getElementById('save-edit-hw-btn').onclick = () => saveEditHomework(numId);

  document.getElementById('edit-hw-modal').classList.remove('hidden');
}

function saveEditHomework(id) {
  const numId = Number(id);
  const hw = homework.find(h => h.id === numId || h.id === id);
  if (!hw) return;

  const subject = document.getElementById('edit-hw-subject').value;
  const title   = document.getElementById('edit-hw-title').value.trim();
  const subjectTerm = getSubjectTerm();

  if (!title || !subject) {
    notifications.showInAppNotification(`נא למלא ${subjectTerm} וכותרת`, 'error');
    return;
  }

  hw.subject     = subject;
  hw.title       = title;
  hw.description = document.getElementById('edit-hw-desc').value.trim();
  hw.dueDate     = document.getElementById('edit-hw-date').value || null;
  hw.priority    = document.getElementById('edit-hw-priority').value;
  hw.customFields = collectTaskCustomFieldValues('edit-hw');
  hw.assignees   = collectAssignees('edit-hw');

  saveData();
  render();
  document.getElementById('edit-hw-modal').classList.add('hidden');
  notifications.showInAppNotification('המשימה עודכנה בהצלחה', 'success');
}

function deleteHomework(id) {
  // id can arrive as string from onclick attribute, convert to match stored type
  const numId = Number(id);
  const hw = homework.find(h => h.id === numId || h.id === id);
  if (!hw) return;
  
  if (confirm(`האם אתה בטוח שברצונך למחוק את המשימה "${hw.title}"?\n\n⚠️ פעולה זו לא ניתנת לביטול!`)) {
    homework = homework.filter(h => h.id !== numId && h.id !== id);
    saveData();
    render();
    notifications.showInAppNotification('המשימה נמחקה', 'success');
  }
}

// =============== הגדרות ===============

function openSettings() {
  const modal = document.getElementById('settings-modal');
  if (!modal) return;
  modal.classList.remove('hidden');
  loadSettingsUI();
  // עדכן UI של Classroom
  if (typeof classroomIntegration !== 'undefined') {
    classroomIntegration.refreshSettingsUI();
  }
}

function closeSettings() {
  const modal = document.getElementById('settings-modal');
  if (!modal) return;
  modal.classList.add('hidden');
}

async function loadSettingsUI() {
  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.checked = val; };
  const setInput = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
  
  setVal('enable-notifications', settings.enableNotifications);
  setInput('notification-days', settings.notificationDays);
  setInput('notification-time', settings.notificationTime);
  setVal('auto-backup', settings.autoBackup);
  setVal('dark-mode-toggle', settings.darkMode);
  setVal('view-mode-toggle', settings.viewMode === 'calendar');
  const usageModeInput = document.getElementById('usage-mode');
  if (usageModeInput) usageModeInput.value = getUsageMode();
  if (typeof window.updateModeCards === 'function') window.updateModeCards();
  const defaultGradeEl = document.getElementById('default-grade-level');
  if (defaultGradeEl) defaultGradeEl.value = settings.defaultGradeLevel || '';
  
  try {
    const lastBackup = await storage.getLastBackupDate();
    const lastBackupInfo = document.getElementById('last-backup-info');
    if (lastBackupInfo) {
      if (lastBackup) {
        lastBackupInfo.textContent = `גיבוי אחרון: ${lastBackup.toLocaleDateString('he-IL')} בשעה ${lastBackup.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`;
      } else {
        lastBackupInfo.textContent = 'גיבוי אחרון: אף פעם';
      }
    }
  } catch (e) {
    // storage not available yet
  }
}

async function saveSettings() {
  const getChecked = (id) => { const el = document.getElementById(id); return el ? el.checked : false; };
  const getVal = (id, def) => { const el = document.getElementById(id); return el ? el.value : def; };
  
  settings.enableNotifications = getChecked('enable-notifications');
  settings.notificationDays = parseInt(getVal('notification-days', 1));
  settings.notificationTime = getVal('notification-time', '09:00');
  settings.autoBackup = getChecked('auto-backup');
  settings.usageMode = getVal('usage-mode', getUsageMode());
  settings.studentMode = settings.usageMode === 'student';
  settings.defaultGradeLevel = (document.getElementById('default-grade-level')?.value || '').trim();
  applyMode();
  
  await storage.set('homework-settings', settings);
  
  if (settings.enableNotifications) {
    const granted = await notifications.requestPermission();
    if (granted) {
      await notifications.startPeriodicCheck(homework, settings);
      notifications.showInAppNotification('התראות הופעלו בהצלחה', 'success');
    } else {
      notifications.showInAppNotification('לא ניתן להפעיל התראות - ההרשאה נדחתה', 'error');
      settings.enableNotifications = false;
      document.getElementById('enable-notifications').checked = false;
    }
  } else {
    notifications.stopPeriodicCheck();
  }
  
  notifications.showInAppNotification('ההגדרות נשמרו', 'success');
}

// =============== ייבוא/ייצוא ===============

async function exportData() {
  const success = await storage.exportData();
  if (success) {
    notifications.showInAppNotification('הנתונים יוצאו בהצלחה', 'success');
    loadSettingsUI();
  } else {
    notifications.showInAppNotification('שגיאה בייצוא הנתונים', 'error');
  }
}

async function exportToPDF() {
  console.log('📄 exportToPDF: Starting PDF export...');
  
  try {
    notifications.showInAppNotification('מכין דוח PDF...', 'info');
    
    // יצירת תוכן HTML למסמך
    const pdfContent = document.createElement('div');
    pdfContent.style.fontFamily = 'Arial, sans-serif';
    pdfContent.style.direction = 'rtl';
    pdfContent.style.padding = '20px';
    pdfContent.style.backgroundColor = 'white';
    pdfContent.style.color = '#000';
    
    pdfContent.innerHTML = `
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #3b82f6; font-size: 28px; margin-bottom: 10px;">📚 דוח שיעורי בית</h1>
        <p style="color: #6b7280; font-size: 14px;">
          <strong>תאריך יצירת הדוח:</strong> ${new Date().toLocaleDateString('he-IL', { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
          })}
        </p>
      </div>
      
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px;">
        <div style="background: #dbeafe; padding: 15px; border-radius: 8px; text-align: center;">
          <div style="font-size: 32px; font-weight: bold; color: #2563eb;">${homework.length}</div>
          <div style="color: #6b7280; font-size: 14px; margin-top: 5px;">סך הכל משימות</div>
        </div>
        <div style="background: #dcfce7; padding: 15px; border-radius: 8px; text-align: center;">
          <div style="font-size: 32px; font-weight: bold; color: #16a34a;">${homework.filter(h => h.completed).length}</div>
          <div style="color: #6b7280; font-size: 14px; margin-top: 5px;">הושלמו</div>
        </div>
        <div style="background: #fed7aa; padding: 15px; border-radius: 8px; text-align: center;">
          <div style="font-size: 32px; font-weight: bold; color: #ea580c;">${homework.filter(h => !h.completed).length}</div>
          <div style="color: #6b7280; font-size: 14px; margin-top: 5px;">ממתינים</div>
        </div>
        <div style="background: #fecaca; padding: 15px; border-radius: 8px; text-align: center;">
          <div style="font-size: 32px; font-weight: bold; color: #dc2626;">${homework.filter(h => !h.completed && h.dueDate && getDaysUntilDue(h.dueDate) <= 2).length}</div>
          <div style="color: #6b7280; font-size: 14px; margin-top: 5px;">דחופים</div>
        </div>
      </div>
      
      <h2 style="color: #1f2937; font-size: 20px; margin: 30px 0 15px 0; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">
        רשימת מקצועות (${subjects.length})
      </h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
        <thead>
          <tr style="background: #3b82f6; color: white;">
            <th style="padding: 12px; text-align: right; border: 1px solid #2563eb;">שם המקצוע</th>
            <th style="padding: 12px; text-align: right; border: 1px solid #2563eb;">צבע</th>
            <th style="padding: 12px; text-align: right; border: 1px solid #2563eb;">מספר משימות</th>
          </tr>
        </thead>
        <tbody>
          ${subjects.map((subject, index) => {
            const count = homework.filter(h => h.subject == subject.id).length;
            return `
              <tr style="background: ${index % 2 === 0 ? '#f9fafb' : 'white'};">
                <td style="padding: 10px; border: 1px solid #e5e7eb;">${subject.name}</td>
                <td style="padding: 10px; border: 1px solid #e5e7eb;">
                  <span style="display: inline-block; padding: 4px 12px; background: ${subject.color}; color: white; border-radius: 4px; font-size: 12px;">
                    ${subject.color}
                  </span>
                </td>
                <td style="padding: 10px; border: 1px solid #e5e7eb;">${count}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
      
      <h2 style="color: #1f2937; font-size: 20px; margin: 30px 0 15px 0; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">
        כל המשימות (${homework.length})
      </h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
        <thead>
          <tr style="background: #3b82f6; color: white;">
            <th style="padding: 12px; text-align: right; border: 1px solid #2563eb;">כותרת</th>
            <th style="padding: 12px; text-align: right; border: 1px solid #2563eb;">מקצוע</th>
            <th style="padding: 12px; text-align: right; border: 1px solid #2563eb;">תאריך הגשה</th>
            <th style="padding: 12px; text-align: right; border: 1px solid #2563eb;">סטטוס</th>
            <th style="padding: 12px; text-align: right; border: 1px solid #2563eb;">ימים עד הגשה</th>
          </tr>
        </thead>
        <tbody>
          ${homework.map((hw, index) => {
            const subject = subjects.find(s => s.id == hw.subject);
            const daysLeft = getDaysUntilDue(hw.dueDate);
            const isUrgent = daysLeft <= 2 && !hw.completed;
            const isOverdue = daysLeft < 0 && !hw.completed;
            
            let bgColor = index % 2 === 0 ? '#f9fafb' : 'white';
            if (isOverdue) bgColor = '#fee2e2';
            else if (isUrgent) bgColor = '#fef3c7';
            
            let status = hw.completed ? '✅ הושלם' : '⏳ ממתין';
            if (isOverdue && !hw.completed) status = '⚠️ באיחור';
            else if (isUrgent && !hw.completed) status = '🔥 דחוף';
            
            const titleDecoration = hw.completed ? 'text-decoration: line-through; color: #6b7280;' : '';
            
            return `
              <tr style="background: ${bgColor};">
                <td style="padding: 10px; border: 1px solid #e5e7eb; ${titleDecoration}">${hw.title}</td>
                <td style="padding: 10px; border: 1px solid #e5e7eb;">
                  ${subject ? `<span style="display: inline-block; padding: 4px 8px; background: ${subject.color}; color: white; border-radius: 4px; font-size: 12px;">${subject.name}</span>` : '-'}
                </td>
                <td style="padding: 10px; border: 1px solid #e5e7eb;">${new Date(hw.dueDate).toLocaleDateString('he-IL')}</td>
                <td style="padding: 10px; border: 1px solid #e5e7eb;">${status}</td>
                <td style="padding: 10px; border: 1px solid #e5e7eb;">
                  ${hw.completed ? '-' : (daysLeft < 0 ? `איחור ${Math.abs(daysLeft)} ימים` : `${daysLeft} ימים`)}
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>

      ${(exams && exams.length > 0 && isStudentMode()) ? `
      <h2 style="color: #7c3aed; font-size: 20px; margin: 30px 0 15px 0; border-bottom: 2px solid #ede9fe; padding-bottom: 8px;">
        📝 מבחנים (${exams.length})
      </h2>
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px;">
        <div style="background: #f5f3ff; padding: 12px; border-radius: 8px; text-align: center; border: 1px solid #ede9fe;">
          <div style="font-size: 28px; font-weight: bold; color: #7c3aed;">${exams.length}</div>
          <div style="color: #6b7280; font-size: 13px; margin-top: 4px;">סך הכל</div>
        </div>
        <div style="background: #ecfdf5; padding: 12px; border-radius: 8px; text-align: center; border: 1px solid #bbf7d0;">
          <div style="font-size: 28px; font-weight: bold; color: #059669;">${exams.filter(e => !e.completed && getDaysUntilDue(e.date) >= 0).length}</div>
          <div style="color: #6b7280; font-size: 13px; margin-top: 4px;">קרובים</div>
        </div>
        <div style="background: #fffbeb; padding: 12px; border-radius: 8px; text-align: center; border: 1px solid #fde68a;">
          <div style="font-size: 28px; font-weight: bold; color: #d97706;">${exams.filter(e => !e.completed && getDaysUntilDue(e.date) >= 0 && getDaysUntilDue(e.date) <= 7).length}</div>
          <div style="color: #6b7280; font-size: 13px; margin-top: 4px;">השבוע</div>
        </div>
        <div style="background: #f0fdf4; padding: 12px; border-radius: 8px; text-align: center; border: 1px solid #bbf7d0;">
          <div style="font-size: 28px; font-weight: bold; color: #16a34a;">${exams.filter(e => e.completed).length}</div>
          <div style="color: #6b7280; font-size: 13px; margin-top: 4px;">הסתיימו</div>
        </div>
      </div>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
        <thead>
          <tr style="background: #7c3aed; color: white;">
            <th style="padding: 12px; text-align: right; border: 1px solid #6d28d9;">שם המבחן</th>
            <th style="padding: 12px; text-align: right; border: 1px solid #6d28d9;">מקצוע</th>
            <th style="padding: 12px; text-align: right; border: 1px solid #6d28d9;">תאריך</th>
            <th style="padding: 12px; text-align: right; border: 1px solid #6d28d9;">סטטוס</th>
            <th style="padding: 12px; text-align: right; border: 1px solid #6d28d9;">נושאים</th>
          </tr>
        </thead>
        <tbody>
          ${[...exams].sort((a,b) => new Date(a.date) - new Date(b.date)).map((exam, idx) => {
            const subject = subjects.find(s => s.id == exam.subject);
            const daysLeft = getDaysUntilDue(exam.date);
            const isOverdue = daysLeft < 0 && !exam.completed;
            const isSoon = daysLeft >= 0 && daysLeft <= 7 && !exam.completed;
            let status = exam.completed ? '✅ הסתיים' : (isOverdue ? '⚠️ עבר' : (isSoon ? '🔥 קרוב' : '📅 קרוב'));
            let bg = idx % 2 === 0 ? '#f9fafb' : 'white';
            if (isOverdue) bg = '#fef2f2';
            if (isSoon && !isOverdue) bg = '#fffbeb';
            const doneCnt = (exam.topics || []).filter(t => t.done).length;
            const totalCnt = (exam.topics || []).length;
            return `
              <tr style="background: ${bg};">
                <td style="padding: 10px; border: 1px solid #e5e7eb; ${exam.completed ? 'text-decoration:line-through;color:#9ca3af;' : ''}">${exam.title}</td>
                <td style="padding: 10px; border: 1px solid #e5e7eb;">
                  ${subject ? `<span style="display:inline-block;padding:3px 8px;background:${subject.color};color:white;border-radius:4px;font-size:12px;">${subject.name}</span>` : '-'}
                </td>
                <td style="padding: 10px; border: 1px solid #e5e7eb;">${new Date(exam.date).toLocaleDateString('he-IL')}</td>
                <td style="padding: 10px; border: 1px solid #e5e7eb;">${status}</td>
                <td style="padding: 10px; border: 1px solid #e5e7eb;">${totalCnt ? `${doneCnt}/${totalCnt} נלמדו` : '-'}</td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>` : ''}

      <div style="margin-top: 40px; text-align: center; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
        <p>מערכת ניהול משימות</p>
        <p>© ${new Date().getFullYear()} - נוצר ב-${new Date().toLocaleString('he-IL')}</p>
      </div>
    `;
    
    // הגדרות ייצוא ל-PDF
    const opt = {
      margin: [10, 10, 10, 10],
      filename: `homework-report-${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        letterRendering: true
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait',
        compress: true
      },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };
    
    console.log('📄 exportToPDF: Generating PDF...');
    
    // יצירת ה-PDF
    await html2pdf().set(opt).from(pdfContent).save();
    
    notifications.showInAppNotification('📄 דוח PDF נוצר בהצלחה!', 'success');
    console.log('✅ exportToPDF: PDF export complete');
    
  } catch (error) {
    console.error('❌ exportToPDF: Error:', error);
    notifications.showInAppNotification('שגיאה ביצירת הדוח', 'error');
  }
}

async function exportToExcel() {
  console.log('📊 exportToExcel: Starting Excel export...');
  
  try {
    const subjectTerm = getSubjectTerm();
    const subjectsTerm = getSubjectsTerm();
    // יצירת תוכן CSV (Excel יכול לפתוח את זה)
    let csvContent = '\uFEFF'; // BOM for UTF-8
    
    // כותרת
    csvContent += `דוח שיעורי בית - ${new Date().toLocaleDateString('he-IL')}\n\n`;
    
    // סטטיסטיקות
    csvContent += 'סטטיסטיקות\n';
    csvContent += 'סך הכל,הושלמו,ממתינים,דחופים\n';
    csvContent += `${homework.length},${homework.filter(h => h.completed).length},${homework.filter(h => !h.completed).length},${homework.filter(h => !h.completed && h.dueDate && getDaysUntilDue(h.dueDate) <= 2).length}\n\n`;

    // סטטיסטיקות מבחנים
    if (isStudentMode() && exams && exams.length > 0) {
      csvContent += 'סטטיסטיקות מבחנים\n';
      csvContent += 'סך הכל,קרובים,השבוע,הסתיימו\n';
      csvContent += `${exams.length},${exams.filter(e => !e.completed && getDaysUntilDue(e.date) >= 0).length},${exams.filter(e => !e.completed && getDaysUntilDue(e.date) >= 0 && getDaysUntilDue(e.date) <= 7).length},${exams.filter(e => e.completed).length}\n\n`;
    }
    
    // נושאים/מקצועות
    csvContent += `${subjectsTerm}\n`;
    csvContent += `שם ${subjectTerm},צבע,מספר משימות\n`;
    subjects.forEach(subject => {
      const count = homework.filter(h => h.subject == subject.id).length;
      csvContent += `${subject.name},${subject.color},${count}\n`;
    });
    csvContent += '\n';
    
    // משימות
    csvContent += 'כל המשימות\n';
    csvContent += `כותרת,${subjectTerm},תיאור,תאריך הגשה,עדיפות,סטטוס,ימים עד הגשה,תגיות,אחראים\n`;
    
    const sortedHomework = [...homework].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    
    sortedHomework.forEach(hw => {
      const subject = subjects.find(s => s.id == hw.subject);
      const daysLeft = getDaysUntilDue(hw.dueDate);
      const isUrgent = daysLeft <= 2 && !hw.completed;
      const isOverdue = daysLeft < 0 && !hw.completed;
      
      let status = hw.completed ? 'הושלם' : 'ממתין';
      if (isOverdue && !hw.completed) status = 'באיחור';
      else if (isUrgent && !hw.completed) status = 'דחוף';
      
      const daysText = hw.completed ? '-' : (daysLeft < 0 ? `איחור ${Math.abs(daysLeft)} ימים` : `${daysLeft} ימים`);
      const tags = hw.tags ? hw.tags.join('; ') : '';
      const assignees = getAssigneeNames(hw).join('; ');
      const description = hw.description ? hw.description.replace(/,/g, '،').replace(/\n/g, ' ') : '';
      
      csvContent += `"${hw.title}","${subject ? subject.name : '-'}","${description}",${new Date(hw.dueDate).toLocaleDateString('he-IL')},${hw.priority},${status},${daysText},"${tags}","${assignees}"\n`;
    });
    
    // מבחנים
    if (isStudentMode() && exams && exams.length > 0) {
      csvContent += 'מבחנים\n';
      csvContent += 'שם המבחן,מקצוע,תאריך,סטטוס,נושאים שנלמדו,סה"כ נושאים\n';
      [...exams].sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(exam => {
        const subject = subjects.find(s => s.id == exam.subject);
        const daysLeft = getDaysUntilDue(exam.date);
        let status = exam.completed ? 'הסתיים' : (daysLeft < 0 ? 'עבר' : (daysLeft <= 7 ? 'קרוב' : 'מתוכנן'));
        const doneCnt  = (exam.topics || []).filter(t => t.done).length;
        const totalCnt = (exam.topics || []).length;
        const notes = exam.notes ? exam.notes.replace(/,/g, '،').replace(/\n/g, ' ') : '';
        csvContent += `"${exam.title}","${subject ? subject.name : '-'}",${new Date(exam.date).toLocaleDateString('he-IL')},${status},${doneCnt},${totalCnt},"${notes}"\n`;
      });
      csvContent += '\n';
    }

    // יצירת Blob והורדה
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `homework-report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    notifications.showInAppNotification('📊 קובץ CSV נוצר בהצלחה! (פתח ב-Excel)', 'success');
    console.log('✅ exportToExcel: Excel export complete');
    
  } catch (error) {
    console.error('❌ exportToExcel: Error:', error);
    notifications.showInAppNotification('שגיאה ביצירת הקובץ', 'error');
  }
}

function importData() {
  document.getElementById('import-file').click();
}

async function handleImportFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const result = await storage.importData(file);
    if (result.success) {
      subjects = result.data.subjects || [];
      homework = (result.data.homework || []).map(hw => ({
        ...hw,
        customFields: hw && typeof hw.customFields === 'object' && hw.customFields !== null ? hw.customFields : {}
      }));
      if (result.data.settings) settings = result.data.settings;
      if (result.data.tags) availableTags = result.data.tags;
      customTaskFields = (result.data.customTaskFields || []).map((field, index) => normalizeCustomTaskField(field, index)).filter(Boolean);
      groupMembers = result.data.groupMembers || [];
      if (result.data.exams) exams = result.data.exams;
      
      render();
      loadSettingsUI();
      notifications.showInAppNotification(result.message, 'success');
    } else {
      notifications.showInAppNotification(result.message, 'error');
    }
  } catch (error) {
    notifications.showInAppNotification(error.message || 'שגיאה בייבוא הנתונים', 'error');
  }
  
  event.target.value = '';
}

async function clearAllData() {
  const confirmMsg = '⚠️ אזהרה!\n\n' +
                    'פעולה זו תמחק את כל הנתונים במערכת:\n' +
                    `- ${subjects.length} ${getSubjectsTerm()}\n` +
                    `- ${homework.length} משימות\n` +
                    `- ${availableTags.length} תגיות\n` +
                    '- כל ההגדרות\n\n' +
                    '❌ פעולה זו לא ניתנת לשחזור!\n\n' +
                    'האם אתה בטוח לחלוטין?';
  
  if (!confirm(confirmMsg)) return;
  
  const doubleConfirm = prompt('כדי לאשר, הקלד "מחק הכל":');
  if (doubleConfirm !== 'מחק הכל') {
    notifications.showInAppNotification('המחיקה בוטלה', 'success');
    return;
  }
  
  const success = await storage.clearAll();
  if (success) {
    subjects = [];
    homework = [];
    availableTags = [];
    customTaskFields = [];
    groupMembers = [];
    settings = {
      enableNotifications: false,
      notificationDays: 1,
      notificationTime: '09:00',
      autoBackup: false,
      darkMode: false,
      recentColors: [],
      usageMode: 'student',
      studentMode: true
    };
    
    render();
    closeSettings();
    notifications.showInAppNotification('כל הנתונים נמחקו', 'success');
  } else {
    notifications.showInAppNotification('שגיאה במחיקת הנתונים', 'error');
  }
}

// =============== Event Listeners ===============

function initializeEventListeners() {
  console.log('🎧 initializeEventListeners: Starting...');
  
  // ארכיון
  const archiveToggle = document.getElementById('archive-toggle');
  if (archiveToggle) {
    archiveToggle.addEventListener('click', () => {
      showArchive = !showArchive;
      renderHomework();
    });
  }

  // הוספת מקצוע
  const showAddSubject = document.getElementById('show-add-subject');
  if (showAddSubject) {
    showAddSubject.addEventListener('click', () => {
      document.getElementById('add-subject-form').classList.remove('hidden');
      document.getElementById('show-add-subject').classList.add('hidden');
      renderColorPicker();
    });
  }

  const cancelSubject = document.getElementById('cancel-subject');
  if (cancelSubject) {
    cancelSubject.addEventListener('click', () => {
      document.getElementById('add-subject-form').classList.add('hidden');
      document.getElementById('show-add-subject').classList.remove('hidden');
    });
  }

  const saveSubject = document.getElementById('save-subject');
  if (saveSubject) saveSubject.addEventListener('click', addSubject);

  const addHomeworkBtn = document.getElementById('add-homework');
  if (addHomeworkBtn) addHomeworkBtn.addEventListener('click', addHomework);

  // כפתורים בכותרת
  const toggleDarkModeBtn = document.getElementById('toggle-dark-mode');
  if (toggleDarkModeBtn) toggleDarkModeBtn.addEventListener('click', toggleDarkMode);

  const toggleViewModeBtn = document.getElementById('toggle-view-mode');
  if (toggleViewModeBtn) toggleViewModeBtn.addEventListener('click', toggleViewMode);

  // הגדרות
  const openSettingsBtn = document.getElementById('open-settings');
  if (openSettingsBtn) openSettingsBtn.addEventListener('click', openSettings);

  const closeSettingsBtn = document.getElementById('close-settings');
  if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', closeSettings);

  const settingsModal = document.getElementById('settings-modal');
  if (settingsModal) {
    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) closeSettings();
    });
  }
  
  // מצב לילה
  const darkModeToggle = document.getElementById('dark-mode-toggle');
  if (darkModeToggle) darkModeToggle.addEventListener('change', toggleDarkMode);
  
  // מצב תצוגה
  const viewModeToggle = document.getElementById('view-mode-toggle');
  if (viewModeToggle) {
    viewModeToggle.addEventListener('change', () => {
      console.log('📅 viewModeToggle: Toggle changed in settings');
      const newMode = viewModeToggle.checked ? 'calendar' : 'list';
      if (settings.viewMode !== newMode) {
        toggleViewMode();
      }
    });
  }
  
  // שמירת הגדרות
  const enableNotifications = document.getElementById('enable-notifications');
  if (enableNotifications) enableNotifications.addEventListener('change', saveSettings);

  const notificationDays = document.getElementById('notification-days');
  if (notificationDays) notificationDays.addEventListener('change', saveSettings);

  const notificationTime = document.getElementById('notification-time');
  if (notificationTime) notificationTime.addEventListener('change', saveSettings);

  const autoBackup = document.getElementById('auto-backup');
  if (autoBackup) autoBackup.addEventListener('change', saveSettings);

  const defaultGradeLevelInput = document.getElementById('default-grade-level');
  if (defaultGradeLevelInput) defaultGradeLevelInput.addEventListener('change', saveSettings);

  // כרטיסי מצב שימוש
  const modeStudentCard = document.getElementById('mode-student-card');
  const modeOtherCard   = document.getElementById('mode-other-card');
  const modeGroupCard   = document.getElementById('mode-group-card');
  window.updateModeCards = function() {
    const modeInput = document.getElementById('usage-mode');
    const mode = modeInput ? modeInput.value : 'student';
    if (modeStudentCard) modeStudentCard.classList.toggle('active', mode === 'student');
    if (modeOtherCard)   modeOtherCard.classList.toggle('active', mode === 'general');
    if (modeGroupCard)   modeGroupCard.classList.toggle('active', mode === 'group');
  };
  if (modeStudentCard) modeStudentCard.addEventListener('click', () => {
    const modeInput = document.getElementById('usage-mode');
    if (modeInput) { modeInput.value = 'student'; window.updateModeCards(); saveSettings(); }
  });
  if (modeOtherCard) modeOtherCard.addEventListener('click', () => {
    const modeInput = document.getElementById('usage-mode');
    if (modeInput) { modeInput.value = 'general'; window.updateModeCards(); saveSettings(); }
  });
  if (modeGroupCard) modeGroupCard.addEventListener('click', () => {
    const modeInput = document.getElementById('usage-mode');
    if (modeInput) { modeInput.value = 'group'; window.updateModeCards(); saveSettings(); }
  });
  window.openSettings = function() { origOpenSettings && origOpenSettings(); window.updateModeCards(); };

  // ייבוא/ייצוא
  const exportDataBtn = document.getElementById('export-data');
  if (exportDataBtn) exportDataBtn.addEventListener('click', exportData);
  
  const exportPdfBtn = document.getElementById('export-pdf');
  if (exportPdfBtn) exportPdfBtn.addEventListener('click', exportToPDF);
  
  const exportExcelBtn = document.getElementById('export-excel');
  if (exportExcelBtn) exportExcelBtn.addEventListener('click', exportToExcel);

  const importDataBtn = document.getElementById('import-data');
  if (importDataBtn) importDataBtn.addEventListener('click', importData);

  const importFile = document.getElementById('import-file');
  if (importFile) importFile.addEventListener('change', handleImportFile);

  const clearAllDataBtn = document.getElementById('clear-all-data');
  if (clearAllDataBtn) clearAllDataBtn.addEventListener('click', clearAllData);
  
  console.log('✅ initializeEventListeners: Complete');
}

// =============== מבחנים ===============

function initExamModal() {
  const openBtn  = document.getElementById('open-add-exam-modal');
  const modal    = document.getElementById('add-exam-modal');
  const closeBtn = document.getElementById('close-add-exam-modal');
  if (!openBtn || !modal) return;

  openBtn.addEventListener('click', () => {
    modal.classList.remove('hidden');
    // מלא שכבה ברירת מחדל
    const classEl = document.getElementById('exam-class');
    if (classEl && !classEl.value && settings.defaultGradeLevel) {
      classEl.value = settings.defaultGradeLevel;
    }
    renderExamTopicsEditor();
  });
  closeBtn && closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
  modal.addEventListener('click', e => { if (e.target === modal) modal.classList.add('hidden'); });

  const saveBtn = document.getElementById('save-exam-btn');
  if (saveBtn) saveBtn.onclick = addExam;

  const addTopicBtn = document.getElementById('add-exam-topic-btn');
  if (addTopicBtn) addTopicBtn.addEventListener('click', addExamTopic);

  const topicInput = document.getElementById('new-exam-topic');
  if (topicInput) topicInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addExamTopic(); } });

  // אתחול מודל ציון
  const gradeModal    = document.getElementById('grade-modal');
  const closeGradeBtn = document.getElementById('close-grade-modal');
  if (closeGradeBtn && gradeModal) {
    closeGradeBtn.addEventListener('click', () => gradeModal.classList.add('hidden'));
    gradeModal.addEventListener('click', e => { if (e.target === gradeModal) gradeModal.classList.add('hidden'); });
  }

  // חישוב אוטומטי בטופס עריכה
  function recalcEditGrade() {
    const grade      = parseFloat(document.getElementById('exam-grade')?.value);
    const bonus      = parseFloat(document.getElementById('exam-grade-bonus')?.value) || 0;
    const correction = parseFloat(document.getElementById('exam-grade-correction')?.value);
    const max        = parseFloat(document.getElementById('exam-grade-max')?.value) || 100;
    const finalEl    = document.getElementById('exam-grade-final-display');
    const pctEl      = document.getElementById('exam-grade-pct-display');
    const finalGrade = !isNaN(correction) ? correction : (!isNaN(grade) ? Math.min(grade + bonus, max) : null);
    if (finalEl) {
      finalEl.textContent = finalGrade !== null ? finalGrade : '—';
      finalEl.style.color = finalGrade !== null
        ? (finalGrade/max >= 0.9 ? '#16a34a' : finalGrade/max >= 0.75 ? '#2563eb' : finalGrade/max >= 0.55 ? '#d97706' : '#dc2626')
        : '#7c3aed';
    }
    if (pctEl) pctEl.textContent = finalGrade !== null ? Math.round((finalGrade/max)*100)+'%' : '';
  }
  ['exam-grade','exam-grade-bonus','exam-grade-correction','exam-grade-max'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', recalcEditGrade);
  });
}

function renderExamTopicsEditor(topics) {
  const list = document.getElementById('exam-topics-list');
  if (!list) return;
  const arr = topics || window._examTopicsTemp || [];
  window._examTopicsTemp = arr;
  list.innerHTML = arr.length === 0 ? '<p style="color:#9ca3af;font-size:0.85rem;">טרם הוספת נושאים</p>' :
    arr.map((t, i) => `
      <div class="exam-topic-row" style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.4rem;">
        <input type="checkbox" class="checkbox" style="width:1.2rem;height:1.2rem;margin-top:0;" ${t.done ? 'checked' : ''}
          onchange="updateTempTopic(${i}, 'done', this.checked)">
        <span style="flex:1;${t.done ? 'text-decoration:line-through;color:#9ca3af;' : ''}">${t.name}</span>
        <button onclick="removeTempTopic(${i})" style="background:none;border:none;cursor:pointer;color:#ef4444;font-size:1.1rem;padding:0 0.25rem;">×</button>
      </div>`).join('');
}

function addExamTopic() {
  const input = document.getElementById('new-exam-topic');
  const val = input.value.trim();
  if (!val) return;
  window._examTopicsTemp = window._examTopicsTemp || [];
  window._examTopicsTemp.push({ name: val, done: false });
  input.value = '';
  renderExamTopicsEditor();
}

function removeTempTopic(i) {
  window._examTopicsTemp.splice(i, 1);
  renderExamTopicsEditor();
}

function updateTempTopic(i, key, val) {
  if (window._examTopicsTemp && window._examTopicsTemp[i]) {
    window._examTopicsTemp[i][key] = val;
    renderExamTopicsEditor();
  }
}

function onExamTypeChange() {
  const type = document.getElementById('exam-type')?.value;
  const otherEl = document.getElementById('exam-type-other');
  if (otherEl) otherEl.style.display = (type === 'other') ? '' : 'none';
}

function onExamTermChange() {
  const term = (document.getElementById('exam-term')?.value || '');
  const rowB = document.getElementById('exam-date-b-row');
  const rowC = document.getElementById('exam-date-c-row');
  if (rowB) rowB.style.display = (term === 'ב' || term === 'ג') ? '' : 'none';
  if (rowC) rowC.style.display = (term === 'ג') ? '' : 'none';
}

function calcFinalGrade(grade, bonus, correction, max, mode) {
  const base = grade !== null ? Math.min(grade + (bonus || 0), max) : null;
  if (correction === null) return base;
  if (mode === 'highest') return base !== null ? Math.max(base, correction) : correction;
  return correction; // replace (default)
}

function addExam() {
  const g = id => { const el = document.getElementById(id); return el ? el.value : ''; };
  const gNum = id => { const v = parseFloat(g(id)); return isNaN(v) ? null : v; };

  const subject  = g('exam-subject');
  const title    = g('exam-title').trim();
  const date     = g('exam-date');
  const dateB    = g('exam-date-b');
  const dateC    = g('exam-date-c');

  const termVal = g('exam-term');
  const rowBVisible = document.getElementById('exam-date-b-row')?.style.display !== 'none';
  const rowCVisible = document.getElementById('exam-date-c-row')?.style.display !== 'none';
  if (!subject) {
    notifications.showInAppNotification('נא למלא מקצוע', 'error');
    return;
  }

  const grade         = gNum('exam-grade');
  const gradeBonus    = gNum('exam-grade-bonus') || 0;
  const gradeCorrection = gNum('exam-grade-correction');
  const gradeMax      = gNum('exam-grade-max') || 100;

  const correctionMode = g('exam-correction-mode') || 'replace';
  const gradeFinal = calcFinalGrade(grade, gradeBonus, gradeCorrection, gradeMax, correctionMode);

  const pct = (gradeFinal !== null) ? Math.round((gradeFinal / gradeMax) * 100) : null;

  const newExam = {
    id: Date.now(),
    subject,
    title,
    date,
    class: g('exam-class').trim(),
    type: g('exam-type') || 'exam',
    typeOther: g('exam-type') === 'other' ? (document.getElementById('exam-type-other')?.value.trim() || '') : '',
    term: g('exam-term'),
    semester: g('exam-semester'),
    dateB,
    dateC,
    gradeExpected: gNum('exam-grade-expected'),
    grade,
    gradeBonus,
    gradeCorrection,
    correctionMode,
    gradeFinal,
    gradeMax,
    gradePct: pct,
    weight: gNum('exam-weight'),
    link: g('exam-link').trim(),
    notes: g('exam-notes').trim(),
    topics: window._examTopicsTemp || [],
    completed: false
  };

  exams.push(newExam);
  window._examTopicsTemp = [];

  if (typeof gamification !== 'undefined') gamification.onExamAdded(newExam);

  // ניקוי שדות
  ['exam-subject','exam-title','exam-date','exam-date-b','exam-date-c','exam-class','exam-term','exam-semester','exam-type-other','exam-correction-mode',
   'exam-grade-expected','exam-grade','exam-grade-max','exam-grade-bonus',
   'exam-grade-correction','exam-grade-final','exam-weight','exam-link','exam-notes'
  ].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const pctEl = document.getElementById('exam-pct-text');
  if (pctEl) pctEl.textContent = '—';

  saveData();
  render();
  document.getElementById('add-exam-modal').classList.add('hidden');
  notifications.showInAppNotification(`המבחן "${title}" נוסף בהצלחה 📝`, 'success');
}

function deleteExam(id) {
  const numId = Number(id);
  const exam = exams.find(e => e.id === numId || e.id === id);
  if (!exam) return;
  if (confirm(`למחוק את המבחן "${exam.title}"?`)) {
    exams = exams.filter(e => e.id !== numId && e.id !== id);
    saveData();
    render();
    notifications.showInAppNotification('המבחן נמחק', 'success');
  }
}

function toggleExamDone(id) {
  const numId = Number(id);
  const exam = exams.find(e => e.id === numId || e.id === id);
  if (!exam) return;

  if (!exam.completed) {
    // סימון הסתיים → פתח מודל ציון
    openGradeModal(exam);
  } else {
    // ביטול הסתיים
    exam.completed = false;
    saveData();
    render();
  }
}

function openGradeModal(exam) {
  const modal = document.getElementById('grade-modal');
  if (!modal) return;

  document.getElementById('grade-modal-title').textContent = `🎯 ${exam.title} — הזנת ציון`;
  document.getElementById('grade-exam-id').value = exam.id;

  // מלא ערכים קיימים
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val ?? ''; };
  set('grade-max',        exam.gradeMax || 100);
  set('grade-value',      exam.grade ?? '');
  set('grade-bonus',      exam.gradeBonus || '');
  set('grade-correction',      exam.gradeCorrection ?? '');
  set('grade-correction-mode', exam.correctionMode || 'replace');
  set('grade-expected',   exam.gradeExpected ?? '');

  recalcGradeModal();
  modal.classList.remove('hidden');
}

function recalcGradeModal() {
  const grade      = parseFloat(document.getElementById('grade-value')?.value);
  const bonus      = parseFloat(document.getElementById('grade-bonus')?.value) || 0;
  const correction = parseFloat(document.getElementById('grade-correction')?.value);
  const max        = parseFloat(document.getElementById('grade-max')?.value) || 100;
  const finalEl    = document.getElementById('grade-final-display');
  const pctEl      = document.getElementById('grade-pct-display');

  const corrMode = document.getElementById('grade-correction-mode')?.value || 'replace';
  const gradeVal = !isNaN(grade) ? grade : null;
  const corrVal  = !isNaN(correction) ? correction : null;
  const finalGrade = calcFinalGrade(gradeVal, bonus, corrVal, max, corrMode);

  if (finalEl) {
    finalEl.textContent = finalGrade !== null ? finalGrade : '—';
    finalEl.style.color = finalGrade !== null
      ? (finalGrade/max >= 0.9 ? '#16a34a' : finalGrade/max >= 0.75 ? '#2563eb' : finalGrade/max >= 0.55 ? '#d97706' : '#dc2626')
      : '#9ca3af';
  }
  if (pctEl && finalGrade !== null) {
    const pct = Math.round((finalGrade / max) * 100);
    pctEl.textContent = pct + '%';
    pctEl.style.color = pct >= 90 ? '#16a34a' : pct >= 75 ? '#2563eb' : pct >= 55 ? '#d97706' : '#dc2626';
  } else if (pctEl) {
    pctEl.textContent = '—';
    pctEl.style.color = '#9ca3af';
  }
}

function saveGrade() {
  const id   = Number(document.getElementById('grade-exam-id').value);
  const exam = exams.find(e => e.id === id);
  if (!exam) return;

  const gNum = elId => { const v = parseFloat(document.getElementById(elId)?.value); return isNaN(v) ? null : v; };
  exam.grade           = gNum('grade-value');
  exam.gradeBonus      = gNum('grade-bonus') || 0;
  exam.gradeCorrection = gNum('grade-correction');
  exam.gradeMax        = gNum('grade-max') || 100;
  exam.gradeExpected   = gNum('grade-expected');

  exam.correctionMode = document.getElementById('grade-correction-mode')?.value || 'replace';
  const finalGrade = calcFinalGrade(exam.grade, exam.gradeBonus, exam.gradeCorrection, exam.gradeMax, exam.correctionMode);
  exam.gradeFinal = finalGrade;
  exam.gradePct   = finalGrade !== null ? Math.round((finalGrade / exam.gradeMax) * 100) : null;

  exam.completed = true;
  if (typeof gamification !== 'undefined') gamification.onExamCompleted(exam);

  saveData();
  render();
  document.getElementById('grade-modal').classList.add('hidden');
  notifications.showInAppNotification(
    finalGrade !== null ? `✅ המבחן הסתיים — ציון: ${finalGrade}` : '✅ המבחן סומן כהסתיים',
    'success'
  );
}

function openExamEditModal(id) {
  const numId = Number(id);
  const exam  = exams.find(e => e.id === numId || e.id === id);
  if (!exam) return;

  // עדכן כותרת
  document.getElementById('add-exam-modal').querySelector('h2').textContent = '✏️ עריכת מבחן';
  document.getElementById('save-exam-btn').textContent = 'שמור שינויים';
  document.getElementById('save-exam-btn').onclick = () => saveExamEdit(exam.id);

  const set = (elId, val) => { const el = document.getElementById(elId); if (el) el.value = val ?? ''; };
  set('exam-subject',          exam.subject);
  set('exam-title',            exam.title);
  set('exam-date',             exam.date);
  set('exam-class',            exam.class || '');
  set('exam-type',             exam.type || 'exam');
  const typeOtherEl = document.getElementById('exam-type-other');
  if (typeOtherEl) { typeOtherEl.value = exam.typeOther || ''; typeOtherEl.style.display = exam.type === 'other' ? '' : 'none'; }
  set('exam-term',             exam.term || '');
  set('exam-semester',         exam.semester || '');
  set('exam-date-b',           exam.dateB || '');
  set('exam-date-c',           exam.dateC || '');
  onExamTermChange();
  set('exam-grade-expected',   exam.gradeExpected ?? '');
  set('exam-grade',            exam.grade ?? '');
  set('exam-grade-max',        exam.gradeMax || 100);
  set('exam-grade-bonus',      exam.gradeBonus || '');
  set('exam-grade-correction', exam.gradeCorrection ?? '');
  set('exam-correction-mode',   exam.correctionMode || 'replace');
  set('exam-weight',           exam.weight ?? '');
  set('exam-link',             exam.link || '');
  set('exam-notes',            exam.notes || '');

  window._examTopicsTemp = (exam.topics || []).map(t => ({ ...t }));
  renderExamTopicsEditor();

  // הצג שדות ציון בעריכה
  const gradeSection = document.getElementById('exam-grade-section');
  if (gradeSection) gradeSection.style.display = '';

  document.getElementById('add-exam-modal').classList.remove('hidden');
}

function saveExamEdit(id) {
  const numId = Number(id);
  const exam  = exams.find(e => e.id === numId || e.id === id);
  if (!exam) return;

  const g    = elId => { const el = document.getElementById(elId); return el ? el.value : ''; };
  const gNum = elId => { const v = parseFloat(g(elId)); return isNaN(v) ? null : v; };

  if (!g('exam-subject')) {
    notifications.showInAppNotification('נא למלא מקצוע', 'error');
    return;
  }
  const _rowBVisible = document.getElementById('exam-date-b-row')?.style.display !== 'none';
  const _rowCVisible = document.getElementById('exam-date-c-row')?.style.display !== 'none';
  if (_rowBVisible && !g('exam-date-b')) {
    notifications.showInAppNotification('נא למלא תאריך מועד ב׳', 'error');
    return;
  }
  if (_rowCVisible && !g('exam-date-c')) {
    notifications.showInAppNotification('נא למלא תאריך מועד ג׳', 'error');
    return;
  }

  exam.subject       = g('exam-subject');
  exam.title         = g('exam-title').trim();
  exam.date          = g('exam-date');
  exam.class         = g('exam-class').trim();
  exam.type          = g('exam-type') || 'exam';
  exam.typeOther     = exam.type === 'other' ? (document.getElementById('exam-type-other')?.value.trim() || '') : '';
  exam.term          = g('exam-term');
  exam.semester      = g('exam-semester');
  exam.dateB         = g('exam-date-b');
  exam.dateC         = g('exam-date-c');
  exam.gradeExpected = gNum('exam-grade-expected');
  exam.grade         = gNum('exam-grade');
  exam.gradeBonus    = gNum('exam-grade-bonus') || 0;
  exam.gradeCorrection = gNum('exam-grade-correction');
  exam.gradeMax      = gNum('exam-grade-max') || 100;
  exam.weight        = gNum('exam-weight');
  exam.link          = g('exam-link').trim();
  exam.notes         = g('exam-notes').trim();
  exam.topics        = window._examTopicsTemp || [];

  exam.correctionMode = g('exam-correction-mode') || 'replace';
  const finalGrade = calcFinalGrade(exam.grade, exam.gradeBonus, exam.gradeCorrection, exam.gradeMax, exam.correctionMode);
  exam.gradeFinal = finalGrade;
  exam.gradePct   = finalGrade !== null ? Math.round((finalGrade / exam.gradeMax) * 100) : null;

  window._examTopicsTemp = [];

  // איפוס כפתור לברירת מחדל
  const saveBtn = document.getElementById('save-exam-btn');
  if (saveBtn) { saveBtn.textContent = 'שמור מבחן'; saveBtn.onclick = addExam; }
  document.getElementById('add-exam-modal').querySelector('h2').textContent = '📝 הוסף מבחן חדש';

  saveData();
  render();
  document.getElementById('add-exam-modal').classList.add('hidden');
  notifications.showInAppNotification(`המבחן "${exam.title}" עודכן`, 'success');
}

function toggleExamTopic(examId, topicIndex) {
  const numId = Number(examId);
  const exam = exams.find(e => e.id === numId || e.id === examId);
  if (!exam || !exam.topics[topicIndex]) return;
  const wasDone = exam.topics[topicIndex].done;
  exam.topics[topicIndex].done = !wasDone;
  if (typeof gamification !== 'undefined') {
    if (!wasDone) gamification.onTopicDone(exam);
    else gamification.onTopicUndone();
  }
  saveData();
  render();
}

function renderExams() {
  const container = document.getElementById('exams-section');
  if (!container) return;

  const upcoming = exams
    .filter(e => !e.completed)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const done = exams.filter(e => e.completed);

  if (exams.length === 0) {
    container.innerHTML = '<p style="color:#9ca3af;font-size:0.9rem;text-align:center;padding:1rem 0;">אין מבחנים קרובים</p>';
    return;
  }

  const renderExamCard = (exam) => {
    const subject = subjects.find(s => s.id == exam.subject);
    const daysLeft = getDaysUntilDue(exam.date);
    const isOverdue = daysLeft < 0 && !exam.completed;
    const isUrgent  = daysLeft <= 3 && daysLeft >= 0 && !exam.completed;

    let daysText = '';
    if (!exam.completed) {
      if (isOverdue) daysText = `עבר לפני ${Math.abs(daysLeft)} ימים`;
      else if (daysLeft === 0) daysText = '⚠️ היום!';
      else if (daysLeft === 1) daysText = '⚠️ מחר!';
      else daysText = `עוד ${daysLeft} ימים`;
    }

    const doneCnt  = (exam.topics || []).filter(t => t.done).length;
    const totalCnt = (exam.topics || []).length;
    const pct      = totalCnt ? Math.round((doneCnt / totalCnt) * 100) : null;

    let borderColor = subject ? subject.color : '#8b5cf6';
    if (isOverdue) borderColor = '#ef4444';
    if (isUrgent)  borderColor = '#f59e0b';

    return `
      <div class="exam-card ${exam.completed ? 'exam-done' : ''} ${isOverdue ? 'exam-overdue' : ''} ${isUrgent ? 'exam-urgent' : ''}"
           style="border-left: 4px solid ${borderColor};">
        <div style="display:flex;align-items:start;gap:0.75rem;">
          <input type="checkbox" class="checkbox" style="width:1.3rem;height:1.3rem;accent-color:#8b5cf6;margin-top:0.2rem;"
            ${exam.completed ? 'checked' : ''} onchange="toggleExamDone('${exam.id}')">
          <div style="flex:1;">
            <div class="homework-badges" style="margin-bottom:0.4rem;">
              <span class="badge" style="background:#8b5cf6;">📝 מבחן</span>
              ${subject ? `<span class="badge" style="background:${subject.color};">${subject.name}</span>` : ''}
              ${isOverdue ? '<span class="badge" style="background:#ef4444;">עבר!</span>' : ''}
              ${isUrgent  ? '<span class="badge" style="background:#f59e0b;">קרוב!</span>' : ''}
            </div>
            <h3 class="homework-title ${exam.completed ? 'completed' : ''}" style="margin-bottom:0.35rem;">${exam.title}</h3>
            ${exam.notes ? `<p class="homework-desc">${exam.notes}</p>` : ''}

            <div class="homework-meta" style="margin-bottom:${totalCnt ? '0.75rem' : '0'};">
              <span>📅 ${new Date(exam.date).toLocaleDateString('he-IL')}</span>
              ${daysText ? `<span class="days-left ${isOverdue ? 'overdue' : isUrgent ? 'urgent' : ''}">${daysText}</span>` : ''}
            </div>

            ${totalCnt ? `
              <div class="exam-topics">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.4rem;">
                  <span style="font-size:0.82rem;font-weight:600;color:#6b7280;">נושאים ללימוד</span>
                  <span style="font-size:0.82rem;color:#8b5cf6;font-weight:600;">${doneCnt}/${totalCnt} (${pct}%)</span>
                </div>
                <div class="exam-progress-bar">
                  <div class="exam-progress-fill" style="width:${pct}%;"></div>
                </div>
                <div style="margin-top:0.5rem;">
                  ${(exam.topics || []).map((t, i) => `
                    <label class="exam-topic-check">
                      <input type="checkbox" ${t.done ? 'checked' : ''} onchange="toggleExamTopic('${exam.id}', ${i})">
                      <span style="${t.done ? 'text-decoration:line-through;color:#9ca3af;' : ''}">${t.name}</span>
                    </label>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </div>
          <button class="icon-btn" onclick="deleteExam('${exam.id}')" title="מחק מבחן">
            <svg width="20" height="20"><use href="#trash"></use></svg>
          </button>
        </div>
      </div>`;
  };

  container.innerHTML = upcoming.map(renderExamCard).join('') +
    (done.length ? `
      <div style="margin-top:1rem;">
        <p style="font-size:0.82rem;color:#9ca3af;margin-bottom:0.5rem;">מבחנים שהסתיימו (${done.length})</p>
        ${done.map(renderExamCard).join('')}
      </div>` : '');
}

function saveGradeSkip() {
  const id   = Number(document.getElementById('grade-exam-id').value);
  const exam = exams.find(e => e.id === id);
  if (!exam) return;
  exam.completed = true;
  if (typeof gamification !== 'undefined') gamification.onExamCompleted(exam);
  saveData();
  render();
  document.getElementById('grade-modal').classList.add('hidden');
  notifications.showInAppNotification('✅ המבחן סומן כהסתיים', 'success');
}

// =============== אתחול ===============

// חשיפת פונקציות ל-window עבור onclick ב-HTML
window.deleteHomework = deleteHomework;
window.toggleComplete = toggleComplete;
window.openEditHomeworkModal = openEditHomeworkModal;
window.saveEditHomework = saveEditHomework;
window.addHomework = addHomework;
window.toggleTagEditor = toggleTagEditor;
window.addTag = addTag;
window.removeTag = removeTag;
window.addCustomTaskField = addCustomTaskField;
window.removeCustomTaskField = removeCustomTaskField;
window.addGroupMember = addGroupMember;
window.removeGroupMember = removeGroupMember;
window.downloadFile = downloadFile;
window.getSubjectTerm = getSubjectTerm;
window.deleteSubject = deleteSubject;

// מבחנים
window.deleteExam = deleteExam;
window.toggleExamDone = toggleExamDone;
window.toggleExamTopic = toggleExamTopic;
window.openExamEditModal = openExamEditModal;
window.saveGrade = saveGrade;
window.saveGradeSkip = saveGradeSkip;
window.recalcGradeModal = recalcGradeModal;
window.updateTempTopic = updateTempTopic;
window.removeTempTopic = removeTempTopic;
window.onExamTermChange = onExamTermChange;
window.onExamTypeChange = onExamTypeChange;

window.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 APPLICATION STARTING');
  try {
    await loadData();
    initializeEventListeners();
    window.addEventListener('userLoggedOut', () => {
      resetAppDataState();
      render();
    });
    window.addEventListener('userLoggedIn', async () => {
      await loadData();
    });
    console.log('🎉 APPLICATION STARTED SUCCESSFULLY');
  } catch (error) {
    console.error('❌ APPLICATION START FAILED:', error);
  }
});
// ─── העלאת שכבה אוטומטית ב-1 בספטמבר ───
const GRADE_LEVELS = ['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ז׳','ח׳','ט׳','י׳','י״א','י״ב'];

async function autoAdvanceGradeLevel() {
  const now = new Date();
  const isSept1 = now.getMonth() === 8 && now.getDate() === 1; // ספטמבר = 8 (0-based)
  if (!isSept1) return;

  const lastAdvanceYear = settings.gradeAutoAdvanceYear;
  if (lastAdvanceYear === now.getFullYear()) return; // כבר בוצע השנה

  const current = (settings.defaultGradeLevel || '').trim();
  const idx = GRADE_LEVELS.indexOf(current);
  if (idx === -1 || idx >= GRADE_LEVELS.length - 1) return; // לא נמצא או כבר י״ב

  settings.defaultGradeLevel = GRADE_LEVELS[idx + 1];
  settings.gradeAutoAdvanceYear = now.getFullYear();
  await storage.set('homework-settings', settings);

  // עדכן את שדה הקלט אם פתוח
  const el = document.getElementById('default-grade-level');
  if (el) el.value = settings.defaultGradeLevel;

  console.log(`📈 שכבה עודכנה אוטומטית ל-${settings.defaultGradeLevel}`);
}
// Integration Layer - חיבור בין הפיצ'רים החדשים לקוד המקורי
// ================================================================
// ⭐ מערכת XP דינמית + יום מושלם חכם שבודק מחדש בכל פעם

console.log('🔗 Integration: Starting integration layer...');

// ==================== הרחבת פונקציות קיימות ====================

// הרחבת toggleComplete להוסיף גמיפיקציה דינמית
if (typeof toggleComplete === 'function') {
  const originalToggleComplete = toggleComplete;
  window.toggleComplete = function(id) {
    const hw = homework.find(h => h.id === id);
    const wasCompleted = hw ? hw.completed : false;
    
    originalToggleComplete(id);
    
    // אם המשימה הושלמה עכשיו (ולא הייתה מושלמת קודם)
    if (hw && !wasCompleted && hw.completed) {
      console.log('🔗 Integration: Task completed, awarding XP...');
      
      hw.completedAt = new Date().toISOString();
      
      // בדיקה אם זה מוקדם
      const daysLeft = getDaysUntilDue(hw.dueDate);
      const isEarly = daysLeft > 0;
      
      // שמירת מידע על מהירות
      hw.wasEarly = isEarly;
      
      // ספירת משימות היום
      const today = new Date().toDateString();
      const tasksToday = homework.filter(h => {
        if (!h.completedAt) return false;
        const completedDate = new Date(h.completedAt).toDateString();
        return completedDate === today && h.completed;
      }).length;
      
      // הפעלת גמיפיקציה
      if (typeof gamification !== 'undefined') {
        gamification.onTaskCompleted(isEarly, tasksToday);
      }
      
      // בדיקת יום מושלם - תמיד מחדש!
      checkAndUpdatePerfectDay();
      
      // שמירת הנתונים
      saveData();
    } 
    // ⭐ אם המשימה בוטלה (הייתה מושלמת ועכשיו לא) - מחזירים XP
    else if (hw && wasCompleted && !hw.completed) {
      console.log('⏪ Integration: Task uncompleted - reversing XP...');
      
      if (typeof gamification !== 'undefined') {
        // הסרת XP בסיסי
        gamification.removeXP(10, 'ביטול משימה');
        
        // הסרת בונוס מהירות אם היה
        if (hw.wasEarly) {
          gamification.removeXP(5, 'ביטול בונוס מהירות');
          hw.wasEarly = false;
        }
        
        // עדכון סטטיסטיקות
        if (gamification.userStats.totalTasksCompleted > 0) {
          gamification.userStats.totalTasksCompleted--;
        }
        
        // בדיקה מחדש של הישגים (עשוי לבטל הישגים)
        gamification.recheckAchievements();
        
        gamification.saveStats();
      }
      
      hw.completedAt = null;
      
      // בדיקת יום מושלם - תמיד מחדש!
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
  
  // בדיקת המצב האמיתי כרגע
  const isPerfectNow = todayHomework.length > 0 && todayHomework.every(h => h.completed);
  const completedCount = todayHomework.filter(h => h.completed).length;
  
  console.log(`✨ checkAndUpdatePerfectDay: ${completedCount}/${todayHomework.length} completed. Perfect NOW: ${isPerfectNow}`);
  
  // בדיקת המצב השמור
  const wasPerfectBefore = gamification.userStats.perfectDayToday === today;
  
  console.log(`✨ checkAndUpdatePerfectDay: Was perfect BEFORE: ${wasPerfectBefore}`);
  
  // ⭐ מצב 1: עכשיו מושלם, לא היה מושלם קודם → תן XP והישג!
  if (isPerfectNow && !wasPerfectBefore) {
    console.log('🎉 checkAndUpdatePerfectDay: NEW perfect day achieved!');
    
    gamification.userStats.perfectDays++;
    gamification.userStats.perfectDayToday = today;

    // עדכון רצף ימים מושלמים
    const yesterdayPerfect = new Date();
    yesterdayPerfect.setDate(yesterdayPerfect.getDate() - 1);
    const yesterdayPerfectStr = yesterdayPerfect.toISOString().split('T')[0];
    if (gamification.userStats.lastPerfectDay === yesterdayPerfectStr) {
      gamification.userStats.perfectDayStreak = (gamification.userStats.perfectDayStreak || 0) + 1;
    } else {
      gamification.userStats.perfectDayStreak = 1;
    }
    gamification.userStats.lastPerfectDay = today;
    if (gamification.userStats.perfectDayStreak > (gamification.userStats.maxPerfectDayStreak || 0)) {
      gamification.userStats.maxPerfectDayStreak = gamification.userStats.perfectDayStreak;
    }

    gamification.addXP(50, 'יום מושלם');
    gamification.checkAchievements();
    gamification.saveStats();

    const streakMsg = gamification.userStats.perfectDayStreak > 1 ? ` רצף ${gamification.userStats.perfectDayStreak} ימים! 🔥` : '';
    if (notifications && notifications.showInAppNotification) {
      notifications.showInAppNotification(`🎉 יום מושלם! כל המשימות הושלמו! +50 XP${streakMsg}`, 'success');
    }
  }
  // ⭐ מצב 2: לא מושלם עכשיו, אבל היה מושלם קודם → בטל XP והישג!
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
  // ⭐ מצב 3: עדיין מושלם (היה מושלם וגם עכשיו מושלם)
  else if (isPerfectNow && wasPerfectBefore) {
    console.log('✨ checkAndUpdatePerfectDay: Still perfect - no change needed');
  }
  // ⭐ מצב 4: עדיין לא מושלם (לא היה מושלם וגם עכשיו לא מושלם)
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
    
    // הוספת timestamp אם נוספה משימה
    if (homework.length > beforeLength) {
      const newHomework = homework[homework.length - 1];
      newHomework.createdAt = new Date().toISOString();
      newHomework.completedAt = null;
      newHomework.wasEarly = false;
      
      saveData();
      console.log('🔗 Integration: Added timestamps to new homework');
      
      // בדיקת יום מושלם (אולי הוספת משימה ביטלה יום מושלם!)
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
    
    // עדכון אינדקס חיפוש
    if (typeof smartSearch !== 'undefined') {
      smartSearch.buildSearchIndex();
    }
    
    // בדיקת יום מושלם (אולי מחיקה השלימה יום מושלם!)
    checkAndUpdatePerfectDay();
    
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

// ==================== Event Listeners חדשים ====================

// עדכון כל דקה של XP בכותרת
setInterval(() => {
  updateHeaderXP();
}, 60000);

// עדכון מיידי + בדיקת יום מושלם ראשונית
setTimeout(() => {
  updateHeaderXP();
  // בדיקה ראשונית של יום מושלם כשטוענים את הדף
  checkAndUpdatePerfectDay();
}, 1000);

// ==================== הודעות לקונסול ====================

console.log('✅ Integration: All features integrated successfully!');
console.log('🔄 Integration: Dynamic XP system - XP is reversed when tasks are uncompleted');
console.log('✨ Integration: Smart Perfect Day - always checks actual state');
console.log('🎉 Enhanced Homework System is ready to use!');
console.log('');
console.log('📚 Available features:');
console.log('  ⏰ Study Timer & Pomodoro');
console.log('  🏆 Achievements & Gamification (Dynamic XP!)');
console.log('  ✨ Smart Perfect Day Detection');
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
// Google Classroom Integration
// ================================

const classroomIntegration = (() => {

  const CLIENT_ID = window.GOOGLE_CLIENT_ID || '';
  // feature toggle: set to false to hide/disable all topic-related functionality
  const ENABLE_TOPICS = false;
  const SCOPES = [
    'https://www.googleapis.com/auth/classroom.coursework.me.readonly',
    'https://www.googleapis.com/auth/classroom.courses.readonly',
    'https://www.googleapis.com/auth/classroom.student-submissions.me.readonly',
    // still request topics scope even if disabled so future enabling is easy
    'https://www.googleapis.com/auth/classroom.topics.readonly'
  ].join(' ');

  let tokenClient   = null;
  let accessToken   = null;
  let isSyncing     = false;
  let cachedCourses = [];
  // cachedTopics: { [courseId]: [ {topicId, name}, ... ] }
  let cachedTopics  = {};

  // מיפוי: key → subjectId
  // key יכול להיות:
  //   "course:{courseId}"         — כל הקורס
  //   "topic:{courseId}:{topicId}" — topic ספציפי
  // topic גובר על קורס
  let mapping = {};

  // ==================== אתחול ====================

  function initialize() {
    console.log('📚 Classroom: Initializing...');
    _injectSvgIcons();
    _injectStyles();

    const saved = localStorage.getItem('classroom_token');
    if (saved) {
      try {
        const p = JSON.parse(saved);
        if (p.expires_at && Date.now() < p.expires_at) {
          accessToken = p.token;
          console.log('✅ Classroom: Restored saved token');
        } else { localStorage.removeItem('classroom_token'); }
      } catch(e) { localStorage.removeItem('classroom_token'); }
    }

    const savedMapping = localStorage.getItem('classroom_mapping');
    if (savedMapping) {
      try {
        mapping = JSON.parse(savedMapping) || {};
        // remove topics under any ignored course
        Object.keys(mapping).forEach(k => {
          if (k.startsWith('course:') && mapping[k] === 'ignore') {
            const courseId = k.split(':')[1];
            const prefix = `topic:${courseId}:`;
            Object.keys(mapping).forEach(tk => {
              if (tk.startsWith(prefix)) delete mapping[tk];
            });
          }
        });
      } catch(e) {}
    }
    if (!ENABLE_TOPICS) {
      console.log('📌 Classroom: topic support is currently disabled');
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = () => {
      console.log('✅ Classroom: Google Identity Services loaded');
      _setupTokenClient();
    };
    document.head.appendChild(script);
  }

  function _setupTokenClient() {
    if (!window.google || !window.google.accounts || !CLIENT_ID) return;

    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: async (tokenResponse) => {
        if (tokenResponse.error) {
          console.error('❌ Classroom: OAuth error:', tokenResponse.error);
          _showError('שגיאה בהתחברות ל-Google Classroom');
          _updateSettingsUI();
          return;
        }
        accessToken = tokenResponse.access_token;
        const expires_at = Date.now() + (tokenResponse.expires_in * 1000);
        localStorage.setItem('classroom_token', JSON.stringify({ token: accessToken, expires_at }));
        console.log('✅ Classroom: Got access token');
        await _loadCoursesAndTopics();
        _updateSettingsUI();
      }
    });

    if (accessToken) _loadCoursesAndTopics();
    _updateSettingsUI();
    console.log('✅ Classroom: Token client ready');
  }

  // ==================== חיבור / ניתוק ====================

  function connect() {
    if (!tokenClient) { _showError('Google Classroom לא מאותחל. נסה שוב בעוד רגע.'); return; }
    tokenClient.requestAccessToken({ prompt: 'select_account' });
  }

  function disconnect() {
    if (!confirm('להתנתק מ-Google Classroom?\nהמשימות שיובאו ישארו, אך לא יסונכרנו יותר אוטומטית.')) return;
    if (accessToken && window.google && window.google.accounts) {
      window.google.accounts.oauth2.revoke(accessToken, () => console.log('✅ Classroom: Token revoked'));
    }
    accessToken = null;
    cachedCourses = [];
    cachedTopics = {};
    localStorage.removeItem('classroom_token');
    _updateSettingsUI();
    _showNotification('התנתקת מ-Google Classroom', 'info');
  }

  // ==================== טעינת קורסים + topics ====================

  async function _loadCoursesAndTopics() {
    if (!accessToken) return;

    const mapContainer = document.getElementById('classroom-mapping-container');
    if (mapContainer) mapContainer.innerHTML = `<p style="font-size:0.8rem; color:#6b7280;">טוען קורסים ונושאים...</p>`;

    try {
      const res = await _apiCall('https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE');
      cachedCourses = res.courses || [];

      // טען topics לכל קורס
      for (const course of cachedCourses) {
        try {
          // topics may be paginated; gather all pages
          let allTopics = [];
          let pageToken = '';
          do {
            const url = `https://classroom.googleapis.com/v1/courses/${course.id}/topics?pageSize=100${pageToken ? `&pageToken=${pageToken}` : ''}`;
            const tRes = await _apiCall(url);
            allTopics = allTopics.concat(tRes.topics || []);
            pageToken = tRes.nextPageToken || '';
          } while (pageToken);
          cachedTopics[course.id] = allTopics.map(t => ({ topicId: t.topicId, name: t.name }));
          console.log(`📚 Classroom: Course "${course.name}" has ${cachedTopics[course.id].length} topics`);
        } catch(e) {
          console.warn(`⚠️ Classroom: Could not load topics for ${course.name}:`, e.message);
          cachedTopics[course.id] = [];
        }
      }

      _renderMappingTable();
    } catch(e) {
      console.warn('⚠️ Classroom: Could not load courses/topics', e);
      if (mapContainer) mapContainer.innerHTML = `<p style="font-size:0.8rem; color:#dc2626;">שגיאה בטעינת קורסים. נסה להתנתק ולהתחבר מחדש.</p>`;
    }
  }

  // ==================== שמירת מיפוי ====================

  function _saveMapping() {
    localStorage.setItem('classroom_mapping', JSON.stringify(mapping));
  }

  function setCourseMapping(courseId, subjectId) {
    // if ignoring a course, clear topic mappings underneath to avoid confusion
    if (subjectId === 'ignore') {
      const prefix = `topic:${courseId}:`;
      Object.keys(mapping).forEach(k => {
        if (k.startsWith(prefix)) delete mapping[k];
      });
    }
    mapping['course:' + courseId] = subjectId;
    _saveMapping();
  }

  function setTopicMapping(courseId, topicId, subjectId) {
    if (!ENABLE_TOPICS) return; // feature disabled
    const key = `topic:${courseId}:${topicId}`;
    if (subjectId === 'inherit') {
      delete mapping[key]; // חזור לברירת מחדל של הקורס
    } else {
      mapping[key] = subjectId;
    }
    _saveMapping();
  }

  // ==================== טבלת מיפוי ====================

  function _renderMappingTable() {
    const container = document.getElementById('classroom-mapping-container');
    if (!container || !cachedCourses.length) return;

    const subjectOptions = (selected, includeInherit = false, inheritLabel = '', includeIgnore = false) => {
      let ignoreOpt = '';
      if (includeIgnore) {
        ignoreOpt = `<option value="ignore" ${selected === 'ignore' ? 'selected' : ''}>🚫 התעלם מכיתה זו</option>`;
      }
      const inherit = includeInherit
        ? `<option value="inherit" ${selected === 'inherit' || !selected ? 'selected' : ''}>${inheritLabel}</option>`
        : `<option value="new" ${selected === 'new' || !selected ? 'selected' : ''}>➕ צור מקצוע חדש</option>`;
      return ignoreOpt + inherit + subjects.map(s =>
        `<option value="${s.id}" ${selected === s.id ? 'selected' : ''}>${s.name}</option>`
      ).join('');
    };

    const rows = cachedCourses.map(course => {
      const courseKey    = 'course:' + course.id;
      const courseMapped = mapping[courseKey] || 'new';
      const topics       = cachedTopics[course.id] || [];

      // שורת קורס
      let html = `
        <tr style="background:rgba(59,130,246,0.05);">
          <td style="padding:0.4rem 0.5rem; font-size:0.85rem; font-weight:600;">
            📚 ${course.name}
          </td>
          <td style="padding:0.4rem 0.5rem;">
            <select class="input" style="padding:0.25rem 0.5rem; font-size:0.8rem; width:100%;"
              onchange="classroomIntegration.setCourseMapping('${course.id}', this.value)">
              ${subjectOptions(courseMapped, false, '', true)}
            </select>
          </td>
        </tr>`;

      if (ENABLE_TOPICS) {
        // שורות topics – בדרך כלל, אלא אם משתמש בחר להתעלם מהקורס
        if (courseMapped !== 'ignore') {
          topics.forEach(t => {
            const topicKey    = `topic:${course.id}:${t.topicId}`;
            const topicMapped = mapping[topicKey] || 'inherit';
            const inheritName = subjects.find(s => s.id === courseMapped)?.name || 'כמו הקורס';

            html += `
              <tr>
                <td style="padding:0.3rem 0.5rem 0.3rem 1.5rem; font-size:0.8rem; color:#6b7280;">
                  ↳ ${t.name}
                </td>
                <td style="padding:0.3rem 0.5rem;">
                  <select class="input" style="padding:0.2rem 0.4rem; font-size:0.78rem; width:100%;"
                    onchange="classroomIntegration.setTopicMapping('${course.id}', '${t.topicId}', this.value)">
                    ${subjectOptions(topicMapped, true, `↑ כמו הקורס (${inheritName})`, true)}
                  </select>
                </td>
              </tr>`;
          });
        } else {
          // show a small note row indicating topics are ignored
          html += `
            <tr>
              <td colspan="2" style="padding:0.3rem 0.5rem; font-size:0.75rem; color:#9ca3af;">
                נושאים לא יוצגו כאשר הכיתה מואנשת.
              </td>
            </tr>`;
        }
      }

      return html;
    }).join('');

    container.innerHTML = `
      <p style="font-size:0.8rem; color:#6b7280; margin-bottom:0.5rem;">
        שייך קורסים למקצועות.
      </p>
      <table style="width:100%; border-collapse:collapse;">
        <thead>
          <tr>
            <th style="text-align:right; font-size:0.8rem; color:#6b7280; padding:0.25rem 0.5rem; border-bottom:1px solid #e5e7eb;">קורס</th>
            <th style="text-align:right; font-size:0.8rem; color:#6b7280; padding:0.25rem 0.5rem; border-bottom:1px solid #e5e7eb;">מקצוע</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  // ==================== סנכרון ====================

  async function syncIfConnected() {
    if (!accessToken) return false;
    return await _doSync();
  }

  async function syncHomework() {
    if (isSyncing) return;
    if (!accessToken) { connect(); return; }
    await _doSync();
  }

  async function _doSync() {
    if (isSyncing) return false;
    isSyncing = true;
    console.log('🔄 Classroom: Starting sync...');

    try {
      const courses = await _apiCall('https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE');
      cachedCourses = courses.courses || [];
      if (!cachedCourses.length) {
        _showNotification('לא נמצאו קורסים ב-Google Classroom', 'info');
        return true;
      }

      let totalImported = 0, totalSkipped = 0, totalUpdated = 0;
      for (const course of cachedCourses) {
        // עדכן topics תוך כדי סנכרון
        try {
          // paginate topics during sync as well
          let allTopics = [];
          let pageToken = '';
          do {
            const url = `https://classroom.googleapis.com/v1/courses/${course.id}/topics?pageSize=100${pageToken ? `&pageToken=${pageToken}` : ''}`;
            const tRes = await _apiCall(url);
            allTopics = allTopics.concat(tRes.topics || []);
            pageToken = tRes.nextPageToken || '';
          } while (pageToken);
          cachedTopics[course.id] = allTopics.map(t => ({ topicId: t.topicId, name: t.name }));
        } catch(e) { cachedTopics[course.id] = cachedTopics[course.id] || []; }

        const r = await _syncCourseWork(course);
        totalImported += r.imported;
        totalSkipped  += r.skipped;
        totalUpdated  += r.updated;
      }

      if (totalImported > 0 || totalUpdated > 0) {
        await saveData();
        render();
      }

      const parts = [];
      if (totalImported > 0) parts.push(`${totalImported} חדשות`);
      if (totalUpdated  > 0) parts.push(`${totalUpdated} עודכנו`);
      if (totalSkipped  > 0) parts.push(`${totalSkipped} ללא שינוי`);
      _showNotification(
        `📚 Classroom: ${parts.length ? parts.join(', ') : 'אין שינויים'}`,
        totalImported > 0 ? 'success' : 'info'
      );
      return true;

    } catch(err) {
      console.error('❌ Classroom: Sync failed:', err);
      if (err.status === 401) {
        accessToken = null;
        localStorage.removeItem('classroom_token');
        _updateSettingsUI();
        _showError('פג תוקף ההתחברות ל-Classroom. התחבר מחדש בהגדרות.');
      } else {
        _showError('שגיאה בסנכרון עם Google Classroom');
      }
      return false;
    } finally {
      isSyncing = false;
    }
  }

  async function _syncCourseWork(course) {
    let imported = 0, skipped = 0, updated = 0;

    // if the entire course is ignored, bail out early
    const courseKey = 'course:' + course.id;
    if (mapping[courseKey] === 'ignore') {
      console.log(`🔕 Classroom: skipping ignored course ${course.name}`);
      return { imported: 0, skipped: 0, updated: 0 };
    }

    try {
      const cwRes = await _apiCall(
        `https://classroom.googleapis.com/v1/courses/${course.id}/courseWork?orderBy=dueDate%20desc&pageSize=20`
      );
      const courseWorks = cwRes.courseWork || [];

      // שלוף הגשות לכל מטלה
      let submissions = {};
      for (const cw of courseWorks) {
        try {
          const subRes = await _apiCall(
            `https://classroom.googleapis.com/v1/courses/${course.id}/courseWork/${cw.id}/studentSubmissions`
          );
          (subRes.studentSubmissions || []).forEach(sub => {
            submissions[sub.courseWorkId] = sub.state;
          });
        } catch(e) {}
      }

      for (const cw of courseWorks) {
        const existingIdx = homework.findIndex(h => h.classroomId === cw.id);

        if (existingIdx !== -1) {
          const existing      = homework[existingIdx];
          const isNowCompleted = submissions[cw.id] === 'TURNED_IN';
          if (!existing._manuallyEdited && existing.completed !== isNowCompleted) {
            homework[existingIdx].completed   = isNowCompleted;
            homework[existingIdx].completedAt = isNowCompleted ? new Date().toISOString() : null;
            updated++;
          } else { skipped++; }
          continue;
        }

        const hw = await _courseWorkToHomework(cw, course, submissions[cw.id]);
        if (hw) {
          homework.push(hw);
          imported++;
        } else {
          skipped++;
        }
      }
    } catch(err) {
      console.warn(`⚠️ Classroom: Error syncing course ${course.name}:`, err);
    }

    return { imported, skipped, updated };
  }

  // course: Classroom course resource
  // topicId: id from coursework
  // topicName: optional name guess (e.g. from homework data or fetched single-topic request)
  function _resolveSubject(course, topicId, topicName) {
    console.log('🔍 resolveSubject', { courseId: course.id, topicId, topicName });
    // 0. אם קיבלנו שם גלוי, נסה אותו לפני הכול
    if (topicName) {
      const byTopicName = subjects.find(s =>
        s.name.trim().toLowerCase() === topicName.trim().toLowerCase()
      );
      console.log('🔤 resolveSubject check name fallback', topicName, '->', byTopicName && byTopicName.id);
      if (byTopicName) return byTopicName;
    }

    // 1. נסה topic ספציפי במיפוי (ידולג אם לא מפעילים נושאים)
    if (ENABLE_TOPICS && topicId) {
      const topicKey = `topic:${course.id}:${topicId}`;
      const topicMapped = mapping[topicKey];
      if (topicMapped) {
        if (topicMapped === 'ignore') return null;
        if (topicMapped !== 'inherit') {
          const s = subjects.find(s => s.id === topicMapped);
          if (s) return s;
        }
      }
    }

    // 2. נסה מיפוי קורס
    const courseKey    = 'course:' + course.id;
    const courseMapped = mapping[courseKey];
    if (courseMapped) {
      if (courseMapped === 'ignore') return null;
      if (courseMapped !== 'new') {
        const s = subjects.find(s => s.id === courseMapped);
        if (s) return s;
      }
    }

    // 3. נסה לפי שם קורס
    const byName = subjects.find(s =>
      s.name.trim().toLowerCase() === course.name.trim().toLowerCase()
    );
    if (byName) return byName;

    // 4. נסה לפי שם topic מקוטלג (אם נושאים פעילים)
    if (ENABLE_TOPICS && topicId) {
      const topicData = (cachedTopics[course.id] || []).find(t => t.topicId === topicId);
      if (topicData) {
        const byTopicName2 = subjects.find(s =>
          s.name.trim().toLowerCase() === topicData.name.trim().toLowerCase()
        );
        if (byTopicName2) return byTopicName2;
      }
    }

    // 5. צור חדש — לפי שם topic אם יש, אחרת לפי שם קורס
    const topicData = topicId && (cachedTopics[course.id] || []).find(t => t.topicId === topicId);
    const newName   = topicData ? topicData.name : (topicName || course.name);
    const newId     = topicData ? `classroom_topic_${topicId}` : `classroom_${course.id}`;

    const palette = ['#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6','#ec4899','#06b6d4'];
    const used    = subjects.map(s => s.color);
    const color   = palette.find(c => !used.includes(c)) || palette[subjects.length % palette.length];

    const newSubject = { id: newId, name: newName, color, fromClassroom: true };
    subjects.push(newSubject);

    // שמור מיפוי אוטומטי
    if (topicData) {
      mapping[`topic:${course.id}:${topicId}`] = newId;
    } else {
      mapping['course:' + course.id] = newId;
    }
    _saveMapping();
    console.log(`➕ Classroom: Created new subject: ${newName}`);
    return newSubject;
  }

  async function _courseWorkToHomework(cw, course, submissionState) {
    console.log('🔄 Classroom: converting coursework', cw.id, 'course', course.id, 'topicId', cw.topicId, 'topic', cw.topic);
    // pull any topic name already included in the coursework payload
    const cwTopicName = cw.topic && cw.topic.name ? cw.topic.name : null;
    if (cwTopicName) console.log('🔤 Classroom: coursework provided topic name', cwTopicName);

    // initial resolution; provide cwTopicName if available
    let subject = _resolveSubject(course, cw.topicId, cwTopicName);
    console.log('🧠 Classroom: subject after initial resolve', subject && subject.id);

    // if we couldn't resolve and there is a topicId, try fetching the single topic entry (only when topics enabled)
    if (ENABLE_TOPICS && !subject && cw.topicId) {
      try {
        const tRes = await _apiCall(
          `https://classroom.googleapis.com/v1/courses/${course.id}/topics/${cw.topicId}`
        );
        if (tRes && tRes.name) {
          // cache result
          cachedTopics[course.id] = cachedTopics[course.id] || [];
          if (!cachedTopics[course.id].some(t => t.topicId === cw.topicId)) {
            cachedTopics[course.id].push({ topicId: cw.topicId, name: tRes.name });
          }
          // retry resolution now that we know the name
          subject = _resolveSubject(course, cw.topicId, tRes.name);
        }
      } catch(e) {
        // ignore permission errors or other failures
      }
    }

    // fallback: match subject name to topicId string itself
    if (ENABLE_TOPICS && !subject && cw.topicId) {
      const byIdName = subjects.find(s =>
        s.name.trim().toLowerCase() === cw.topicId.trim().toLowerCase()
      );
      if (byIdName) subject = byIdName;
    }

    if (!subject) return null; // nothing to do (either ignored or unresolvable)

    let dueDate = '';
    if (cw.dueDate) {
      const { year, month, day } = cw.dueDate;
      dueDate = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    }

    const isCompleted = submissionState === 'TURNED_IN';

    return {
      id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      classroomId: cw.id,
      courseId: course.id,
      topicId: cw.topicId || null,
      subject: subject.id,
      title: cw.title || 'מטלה ללא שם',
      description: cw.description || '',
      dueDate,
      completed: isCompleted,
      completedAt: isCompleted ? new Date().toISOString() : null,
      priority: _guessPriority(dueDate),
      tags: ['Classroom'],
      createdAt: cw.creationTime || new Date().toISOString(),
      wasEarly: false,
      classroomLink: cw.alternateLink || '',
      fromClassroom: true,
      _manuallyEdited: false
    };
  }

  function _guessPriority(d) {
    if (!d) return 'medium';
    const days = Math.ceil((new Date(d) - new Date()) / 86400000);
    return days <= 1 ? 'high' : days <= 3 ? 'medium' : 'low';
  }

  async function _apiCall(url) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) { const e = new Error(`API error ${res.status}`); e.status = res.status; throw e; }
    return res.json();
  }

  // ==================== UI ====================

  function _updateSettingsUI() {
    const container = document.getElementById('classroom-settings-container');
    if (!container) return;

    if (accessToken) {
      container.innerHTML = `
        <div class="classroom-status connected">
          <span class="classroom-status-dot"></span>
          מחובר ל-Google Classroom
        </div>
        <div class="setting-item" style="display:flex; gap:0.5rem; flex-wrap:wrap; margin-bottom:1rem;">
          <button class="btn btn-primary" onclick="classroomIntegration.syncHomework()">
            <svg width="18" height="18"><use href="#classroom-icon"></use></svg>
            סנכרן עכשיו
          </button>
          <button class="btn btn-secondary" onclick="classroomIntegration.disconnect()" style="color:#dc2626; border-color:#dc2626;">
            התנתק
          </button>
        </div>
        <div id="classroom-mapping-container"></div>`;

      if (cachedCourses.length) {
        _renderMappingTable();
      } else {
        document.getElementById('classroom-mapping-container').innerHTML =
          `<p style="font-size:0.8rem; color:#6b7280;">טוען קורסים...</p>`;
        _loadCoursesAndTopics();
      }
    } else {
      container.innerHTML = `
        <div class="classroom-status disconnected">
          <span class="classroom-status-dot"></span>
          לא מחובר
        </div>
        <div class="setting-item">
          <button class="btn btn-primary" onclick="classroomIntegration.connect()">
            <svg width="18" height="18"><use href="#classroom-icon"></use></svg>
            התחבר ל-Google Classroom
          </button>
        </div>`;
    }
  }

  function _showNotification(msg, type = 'info') {
    if (typeof notifications !== 'undefined' && notifications.showInAppNotification) {
      notifications.showInAppNotification(msg, type);
    }
  }
  function _showError(msg) { _showNotification('❌ ' + msg, 'error'); }

  function _injectSvgIcons() {
    const svg = document.querySelector('svg');
    if (!svg || document.getElementById('classroom-icon')) return;
    const sym = document.createElementNS('http://www.w3.org/2000/svg', 'symbol');
    sym.setAttribute('id', 'classroom-icon');
    sym.setAttribute('viewBox', '0 0 24 24');
    sym.innerHTML = `<path fill="currentColor" d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z"/>`;
    svg.appendChild(sym);
  }

  function _injectStyles() {
    if (document.getElementById('classroom-styles')) return;
    const s = document.createElement('style');
    s.id = 'classroom-styles';
    s.textContent = `
      .classroom-status { display:flex; align-items:center; gap:0.5rem; font-size:0.875rem; margin-bottom:0.75rem; font-weight:500; }
      .classroom-status-dot { width:10px; height:10px; border-radius:50%; flex-shrink:0; }
      .classroom-status.connected { color:#16a34a; }
      .classroom-status.connected .classroom-status-dot { background:#16a34a; }
      .classroom-status.disconnected { color:#6b7280; }
      .classroom-status.disconnected .classroom-status-dot { background:#9ca3af; }
      .dark-mode .classroom-status.connected { color:#4ade80; }
      .dark-mode .classroom-status.connected .classroom-status-dot { background:#4ade80; }
      #classroom-mapping-container table { font-size:0.82rem; }
      #classroom-mapping-container tbody tr:hover td { background:rgba(0,0,0,0.02); }
      .dark-mode #classroom-mapping-container tbody tr:hover td { background:rgba(255,255,255,0.04); }
    `;
    document.head.appendChild(s);
  }

  return {
    initialize,
    syncHomework,
    syncIfConnected,
    connect,
    disconnect,
    setCourseMapping,
    setTopicMapping,
    refreshSettingsUI: () => {
      _updateSettingsUI();
      if (accessToken && !cachedCourses.length) _loadCoursesAndTopics();
    },
    get isConnected() { return !!accessToken; }
  };

})();

document.addEventListener('DOMContentLoaded', () => classroomIntegration.initialize());
if (document.readyState !== 'loading') classroomIntegration.initialize();

console.log('📚 Google Classroom Integration loaded');
// ============================================
//  DASHBOARD WIDGET
//  Calendar + Google Tasks — משולב ב-homework
//  חיבור מתמשך — נשמר ב-Firestore
// ============================================

const dashboardWidget = (() => {

  // ── State ───────────────────────────────────
  const ds = {
    calConnected:   false,
    tasksConnected: false,
    calToken:       null,
    calEvents:      [],
    tasks:          [],
    taskLists:      [],
  };

  const GOOGLE_SCOPES = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/tasks',
  ].join(' ');

  const STORAGE_KEY = 'google-widget-connection';
  let _tokenClient  = null;

  // ── Init ──────────────────────────────────────
  async function init() {
    _renderShell();
    _initGoogleServices();
  }

  // ── Render shell ─────────────────────────────
  function _renderShell() {
    const el = document.getElementById('dashboard-widget');
    if (!el) return;

    el.innerHTML = `
      <div class="dw-grid" style="grid-template-columns: 1fr;">

        <!-- Calendar -->
        <div class="panel dw-panel">
          <div class="dw-panel-header">
            <h2 class="dw-title">📅 אירועים קרובים</h2>
            <button id="dw-cal-disconnect" class="dw-disconnect hidden" onclick="dashboardWidget.disconnectAll()">התנתק</button>
          </div>
          <div id="dw-cal-content">
            <button class="dw-connect-btn" id="dw-cal-btn">
              התחבר ל-Google Calendar
            </button>
          </div>
        </div>

      </div>`;

    document.getElementById('dw-cal-btn').onclick = () => _requestToken(false);
  }

  // ── Google token ─────────────────────────────
  function _initGoogleServices() {
    if (typeof google === 'undefined' || !google.accounts) {
      setTimeout(_initGoogleServices, 500);
      return;
    }
    const clientId = window.GOOGLE_CLIENT_ID;
    if (!clientId) return;

    _tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: GOOGLE_SCOPES,
      callback: async (resp) => {
        if (resp.error || !resp.access_token) {
          // silent re-auth נכשל — נציג כפתור התחברות
          _updateButtons();
          return;
        }
        ds.calToken       = resp.access_token;
        ds.calConnected   = true;
        ds.tasksConnected = true;
        // שמור ב-Firestore שהמשתמש מחובר
        await _saveConnectionState(true);
        _updateButtons();
        await Promise.all([
          _loadCalendar(resp.access_token),
          _loadTasks(resp.access_token),
        ]);
      },
    });

    // בדוק אם המשתמש היה מחובר קודם — נסה להתחבר בשקט
    _tryAutoReconnect();
  }

  // ── Auto reconnect ────────────────────────────
  async function _tryAutoReconnect() {
    try {
      const saved = await storage.get(STORAGE_KEY);
      if (saved && saved.connected) {
        // הצג skeleton בזמן ניסיון ההתחברות השקטה
        const wrapper = document.getElementById('dw-cal-content');
        if (wrapper) wrapper.innerHTML = _skeletons(3);
        // בקש טוקן בשקט (ללא popup אם האישור כבר ניתן)
        _requestToken(true);
      }
    } catch(e) {
      // אין שמירה — לא מתחברים אוטומטית
    }
  }

  function _requestToken(silent = false) {
    if (!_tokenClient) return;
    _tokenClient.requestAccessToken({ prompt: silent ? '' : 'consent' });
  }

  // ── Save / clear connection in Firestore ─────
  async function _saveConnectionState(connected) {
    try {
      if (connected) {
        await storage.set(STORAGE_KEY, { connected: true, savedAt: new Date().toISOString() });
      } else {
        await storage.remove(STORAGE_KEY);
      }
    } catch(e) { console.warn('Could not save connection state', e); }
  }

  function _updateButtons() {
    _toggle('dw-cal-disconnect', ds.calConnected);
    _toggle('dw-cal-btn',       !ds.calConnected);
    // כפתורי Tasks ב-toolbar רשימת המשימות
    _toggle('hw-tasks-connect-btn',    !ds.tasksConnected);
    _toggle('hw-tasks-disconnect-btn',  ds.tasksConnected);
    // עדכן הגדרות אם פתוח
    if (typeof updateSettingsTasksStatus === 'function') updateSettingsTasksStatus();
    // רנדר מחדש את הרשימה המאוחדת
    if (typeof renderHomework === 'function') renderHomework();
  }

  function _toggle(id, show) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = show ? '' : 'none';
  }

  // ── Disconnect ────────────────────────────────
  async function disconnectAll() {
    ds.calConnected   = false;
    ds.tasksConnected = false;
    ds.calEvents      = [];
    ds.tasks          = [];
    ds.taskLists      = [];
    if (ds.calToken) {
      google.accounts.oauth2.revoke(ds.calToken, () => {});
      ds.calToken = null;
    }
    await _saveConnectionState(false);
    _updateButtons();
    document.getElementById('dw-cal-content').innerHTML =
      `<button class="dw-connect-btn" id="dw-cal-btn" onclick="dashboardWidget._requestToken(false)">התחבר ל-Google Calendar</button>`;
  }

  // שמור תאימות לשמות הישנים
  function disconnectCal()   { return disconnectAll(); }
  function disconnectTasks() {
    ds.tasksConnected = false;
    ds.tasks          = [];
    ds.taskLists      = [];
    _saveConnectionState(false);
    _updateButtons();
    if (typeof renderHomework === 'function') renderHomework();
  }

  // ── Calendar ──────────────────────────────────
  async function _loadCalendar(token) {
    const wrapper = document.getElementById('dw-cal-content');
    if (wrapper) wrapper.innerHTML = _skeletons(3);
    try {
      const now    = new Date().toISOString();
      const future = new Date(Date.now() + 14 * 86400000).toISOString();
      const res    = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(now)}&timeMax=${encodeURIComponent(future)}&maxResults=8&orderBy=startTime&singleEvents=true`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      ds.calEvents = (await res.json()).items || [];
    } catch(e) { console.error(e); ds.calEvents = []; }
    _renderCalendar();
  }

  function _renderCalendar() {
    const wrapper = document.getElementById('dw-cal-content');
    if (!wrapper) return;
    if (!ds.calEvents.length) {
      wrapper.innerHTML = `<div class="empty-state" style="padding:2rem;text-align:center;color:var(--text-secondary)">אין אירועים קרובים</div>`;
      return;
    }
    const months = ['ינו','פבר','מרץ','אפר','מאי','יוני','יול','אוג','ספט','אוק','נוב','דצמ'];
    wrapper.innerHTML = ds.calEvents.map(ev => {
      const d       = new Date(ev.start?.dateTime || ev.start?.date);
      const timeStr = ev.start?.dateTime
        ? d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
        : 'כל היום';
      return `
        <div class="dw-event">
          <div class="dw-date-badge">
            <div class="dw-date-day">${d.getDate()}</div>
            <div class="dw-date-month">${months[d.getMonth()]}</div>
          </div>
          <div class="dw-event-body">
            <div class="dw-event-title">${_esc(ev.summary || 'ללא כותרת')}</div>
            <div class="dw-event-time">${timeStr}</div>
          </div>
        </div>`;
    }).join('');
  }

  // ── Tasks ─────────────────────────────────────
  async function _loadTasks(token) {
    try {
      const listsRes = await fetch(
        'https://tasks.googleapis.com/tasks/v1/users/@me/lists?maxResults=10',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      ds.taskLists = (await listsRes.json()).items || [];

      const allTasks = [];
      await Promise.all(ds.taskLists.map(async (list) => {
        const res  = await fetch(
          `https://tasks.googleapis.com/tasks/v1/lists/${list.id}/tasks?showCompleted=false&maxResults=20`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        (data.items || []).forEach(t => allTasks.push({ ...t, listTitle: list.title, listId: list.id }));
      }));

      ds.tasks = allTasks.sort((a, b) => {
        if (!a.due && !b.due) return 0;
        if (!a.due) return 1;
        if (!b.due) return -1;
        return new Date(a.due) - new Date(b.due);
      });
    } catch(e) { console.error(e); ds.tasks = []; }
    if (typeof renderHomework === 'function') renderHomework();
  }

  async function completeTask(taskId, listId, checkbox) {
    checkbox.disabled = true;
    try {
      await fetch(
        `https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks/${taskId}`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${ds.calToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'completed' }),
        }
      );
      const linkedHw = (window.homework || []).find(h => h.googleTaskId === taskId);
      if (linkedHw) {
        linkedHw.completed   = true;
        linkedHw.completedAt = new Date().toISOString();
        if (typeof saveData === 'function') saveData();
      }
      ds.tasks = ds.tasks.filter(t => t.id !== taskId);
      setTimeout(() => { if (typeof renderHomework === 'function') renderHomework(); }, 400);
    } catch(e) {
      console.error(e);
      checkbox.checked  = false;
      checkbox.disabled = false;
    }
  }

  // ── Utils ─────────────────────────────────────
  function _skeletons(n) {
    return Array.from({ length: n }).map(() => `
      <div style="display:flex;gap:0.75rem;padding:0.75rem;border:2px solid var(--border-color);border-radius:0.75rem;margin-bottom:0.5rem">
        <div style="width:40px;height:40px;border-radius:0.5rem;background:var(--border-color);flex-shrink:0"></div>
        <div style="flex:1;display:flex;flex-direction:column;gap:6px;justify-content:center">
          <div style="height:10px;width:65%;background:var(--border-color);border-radius:4px"></div>
          <div style="height:10px;width:35%;background:var(--border-color);border-radius:4px"></div>
        </div>
      </div>`).join('');
  }

  function _esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return {
    init,
    disconnectAll,
    disconnectCal,
    disconnectTasks,
    completeTask,
    _requestToken,
    getTasks:    () => ds.tasks,
    isConnected: () => ds.tasksConnected,
  };

})();
// Unified Statistics & Analytics Manager - מערכת סטטיסטיקה ואנליטיקה משולבת
// ================================================================================
// 📊 משלב את הסטטיסטיקות הבסיסיות עם האנליטיקה המתקדמת למודול אחד מקיף

class UnifiedStatisticsManager {
  constructor() {
    this.charts = {};
    this.analyticsData = {
      daily: [],
      weekly: [],
      monthly: [],
      subjects: {},
      productivity: [],
      completionRates: [],
      trends: {}
    };
    
    console.log('📊 UnifiedStatisticsManager: Initialized');
  }

  // ==================== איסוף נתונים ====================

  async collectAllData() {
    console.log('📊 collectAllData: Collecting all statistics...');
    
    try {
      // טעינת נתונים
      const homework = await storage.get('homework-list') || [];
      const subjects = await storage.get('homework-subjects') || [];
      const sessions = await storage.get('study-sessions-today') || { sessions: [] };
      
      console.log('📊 collectAllData: Data loaded', {
        homework: homework.length,
        subjects: subjects.length,
        sessions: sessions.sessions.length
      });

      // ניתוחים שונים
      this.analyzeBasicStats(homework);
      this.analyzeDailyData(homework);
      this.analyzeWeeklyData(homework);
      this.analyzeMonthlyData(homework);
      this.analyzeSubjectData(homework, subjects);
      this.analyzeProductivity(homework, sessions.sessions);
      this.analyzeCompletionRates(homework);
      this.analyzeTrends(homework);
      
      console.log('✅ collectAllData: All data collected successfully');
      return {
        homework,
        subjects,
        sessions
      };
    } catch (error) {
      console.error('❌ collectAllData: Error collecting data:', error);
      return null;
    }
  }

  // ניתוח סטטיסטיקות בסיסיות
  analyzeBasicStats(homework) {
    console.log('📊 analyzeBasicStats: Analyzing basic stats...');
    
    const total = homework.length;
    const completed = homework.filter(h => h.completed).length;
    const pending = homework.filter(h => !h.completed).length;
    const urgent = homework.filter(h => !h.completed && this.getDaysUntilDue(h.dueDate) <= 2).length;
    const overdue = homework.filter(h => !h.completed && this.getDaysUntilDue(h.dueDate) < 0).length;
    
    this.analyticsData.basic = {
      total,
      completed,
      pending,
      urgent,
      overdue,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
    };
    
    console.log('✅ analyzeBasicStats: Basic stats analyzed:', this.analyticsData.basic);
  }

  // ניתוח יומי
  analyzeDailyData(homework) {
    console.log('📅 analyzeDailyData: Analyzing daily data...');
    
    const last30Days = [];
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayHomework = homework.filter(hw => hw.dueDate === dateStr);
      const completed = dayHomework.filter(hw => hw.completed).length;
      const pending = dayHomework.length - completed;
      
      last30Days.push({
        date: dateStr,
        total: dayHomework.length,
        completed,
        pending,
        completionRate: dayHomework.length > 0 ? (completed / dayHomework.length * 100) : 0
      });
    }
    
    this.analyticsData.daily = last30Days;
    console.log('✅ analyzeDailyData: Daily data analyzed');
  }

  // ניתוח שבועי
  analyzeWeeklyData(homework) {
    console.log('📅 analyzeWeeklyData: Analyzing weekly data...');
    
    const last12Weeks = [];
    const today = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - (i * 7) - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      
      const weekHomework = homework.filter(hw => {
        const dueDate = new Date(hw.dueDate + 'T00:00:00');
        return dueDate >= weekStart && dueDate <= weekEnd;
      });
      
      const completed = weekHomework.filter(hw => hw.completed).length;
      
      last12Weeks.push({
        weekStart: weekStart.toISOString().split('T')[0],
        weekEnd: weekEnd.toISOString().split('T')[0],
        total: weekHomework.length,
        completed,
        pending: weekHomework.length - completed,
        completionRate: weekHomework.length > 0 ? (completed / weekHomework.length * 100) : 0
      });
    }
    
    this.analyticsData.weekly = last12Weeks;
    console.log('✅ analyzeWeeklyData: Weekly data analyzed');
  }

  // ניתוח חודשי
  analyzeMonthlyData(homework) {
    console.log('📅 analyzeMonthlyData: Analyzing monthly data...');
    
    const last12Months = [];
    const today = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const monthDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
      
      const monthHomework = homework.filter(hw => {
        const dueDate = new Date(hw.dueDate + 'T00:00:00');
        return dueDate >= monthStart && dueDate <= monthEnd;
      });
      
      const completed = monthHomework.filter(hw => hw.completed).length;
      
      last12Months.push({
        month: monthStart.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' }),
        total: monthHomework.length,
        completed,
        pending: monthHomework.length - completed,
        completionRate: monthHomework.length > 0 ? (completed / monthHomework.length * 100) : 0
      });
    }
    
    this.analyticsData.monthly = last12Months;
    console.log('✅ analyzeMonthlyData: Monthly data analyzed');
  }

  // ניתוח לפי מקצועות
  analyzeSubjectData(homework, subjects) {
    console.log('📚 analyzeSubjectData: Analyzing subject data...');
    
    const subjectStats = {};
    
    subjects.forEach(subject => {
      const subjectHomework = homework.filter(hw => hw.subject == subject.id);
      const completed = subjectHomework.filter(hw => hw.completed).length;
      const overdue = subjectHomework.filter(hw => 
        !hw.completed && this.getDaysUntilDue(hw.dueDate) < 0
      ).length;
      
      subjectStats[subject.id] = {
        name: subject.name,
        color: subject.color,
        total: subjectHomework.length,
        completed,
        pending: subjectHomework.length - completed,
        overdue,
        completionRate: subjectHomework.length > 0 ? (completed / subjectHomework.length * 100) : 0,
        avgTimeToComplete: this.calculateAvgTimeToComplete(subjectHomework)
      };
    });
    
    this.analyticsData.subjects = subjectStats;
    console.log('✅ analyzeSubjectData: Subject data analyzed');
  }

  // ניתוח פרודוקטיביות
  analyzeProductivity(homework, sessions) {
    console.log('⏰ analyzeProductivity: Analyzing productivity...');
    
    const hoursOfDay = Array(24).fill(0).map((_, i) => ({ hour: i, tasks: 0, studyTime: 0 }));
    
    // ניתוח לפי שעות ביום
    homework.forEach(hw => {
      if (hw.completed && hw.completedAt) {
        const hour = new Date(hw.completedAt).getHours();
        hoursOfDay[hour].tasks++;
      }
    });
    
    sessions.forEach(session => {
      if (session.timestamp) {
        const hour = new Date(session.timestamp).getHours();
        hoursOfDay[hour].studyTime += session.duration || 0;
      }
    });
    
    this.analyticsData.productivity = hoursOfDay;
    console.log('✅ analyzeProductivity: Productivity analyzed');
  }

  // ניתוח שיעור השלמה
  analyzeCompletionRates(homework) {
    console.log('📈 analyzeCompletionRates: Analyzing completion rates...');
    
    const priorities = {
      low: { total: 0, completed: 0 },
      medium: { total: 0, completed: 0 },
      high: { total: 0, completed: 0 }
    };
    
    homework.forEach(hw => {
      const priority = hw.priority || 'medium';
      priorities[priority].total++;
      if (hw.completed) {
        priorities[priority].completed++;
      }
    });
    
    this.analyticsData.completionRates = Object.keys(priorities).map(p => ({
      priority: p,
      total: priorities[p].total,
      completed: priorities[p].completed,
      rate: priorities[p].total > 0 ? (priorities[p].completed / priorities[p].total * 100) : 0
    }));
    
    console.log('✅ analyzeCompletionRates: Completion rates analyzed');
  }

  // ניתוח מגמות
  analyzeTrends(homework) {
    console.log('📈 analyzeTrends: Analyzing trends...');
    
    const last7Days = this.analyticsData.daily.slice(-7);
    const prev7Days = this.analyticsData.daily.slice(-14, -7);
    
    const currentWeekTotal = last7Days.reduce((sum, day) => sum + day.total, 0);
    const prevWeekTotal = prev7Days.reduce((sum, day) => sum + day.total, 0);
    
    const currentWeekCompleted = last7Days.reduce((sum, day) => sum + day.completed, 0);
    const prevWeekCompleted = prev7Days.reduce((sum, day) => sum + day.completed, 0);
    
    this.analyticsData.trends = {
      tasksChange: prevWeekTotal > 0 ? 
        Math.round(((currentWeekTotal - prevWeekTotal) / prevWeekTotal) * 100) : 0,
      completionChange: prevWeekCompleted > 0 ? 
        Math.round(((currentWeekCompleted - prevWeekCompleted) / prevWeekCompleted) * 100) : 0,
      trend: currentWeekTotal > prevWeekTotal ? 'up' : currentWeekTotal < prevWeekTotal ? 'down' : 'stable'
    };
    
    console.log('✅ analyzeTrends: Trends analyzed:', this.analyticsData.trends);
  }

  // ==================== גרפים ====================

  createCompletionChart() {
    console.log('📊 createCompletionChart: Creating completion doughnut chart...');
    
    const canvas = document.getElementById('completion-chart');
    if (!canvas) {
      console.warn('⚠️ createCompletionChart: Canvas not found');
      return;
    }

    if (this.charts.completion) {
      this.charts.completion.destroy();
    }

    const stats = this.analyticsData.basic;
    
    this.charts.completion = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['הושלמו', 'ממתינים', 'דחוף', 'באיחור'],
        datasets: [{
          data: [stats.completed, stats.pending - stats.urgent - stats.overdue, stats.urgent, stats.overdue],
          backgroundColor: ['#10b981', '#f59e0b', '#ef4444', '#dc2626'],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              font: { family: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif', size: 12 },
              color: getComputedStyle(document.body).getPropertyValue('--text-primary')
            }
          },
          title: {
            display: true,
            text: 'סטטוס משימות',
            font: { size: 16, weight: 'bold' },
            color: getComputedStyle(document.body).getPropertyValue('--text-primary')
          }
        }
      }
    });

    console.log('✅ createCompletionChart: Chart created');
  }

  createSubjectChart() {
    console.log('📊 createSubjectChart: Creating subject bar chart...');
    
    const canvas = document.getElementById('subject-chart');
    if (!canvas) {
      console.warn('⚠️ createSubjectChart: Canvas not found');
      return;
    }

    if (this.charts.subject) {
      this.charts.subject.destroy();
    }

    const subjects = Object.values(this.analyticsData.subjects)
      .filter(s => s.total > 0)
      .sort((a, b) => b.total - a.total);
    
    const labels = subjects.map(s => s.name);
    const data = subjects.map(s => s.total);
    const colors = subjects.map(s => s.color + '80');
    const borderColors = subjects.map(s => s.color);

    this.charts.subject = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'משימות לפי מקצוע',
          data,
          backgroundColor: colors,
          borderColor: borderColors,
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
              color: getComputedStyle(document.body).getPropertyValue('--text-secondary')
            },
            grid: {
              color: getComputedStyle(document.body).getPropertyValue('--border-color')
            }
          },
          x: {
            ticks: {
              color: getComputedStyle(document.body).getPropertyValue('--text-secondary')
            },
            grid: { display: false }
          }
        },
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: 'משימות לפי מקצוע',
            font: { size: 16, weight: 'bold' },
            color: getComputedStyle(document.body).getPropertyValue('--text-primary')
          }
        }
      }
    });

    console.log('✅ createSubjectChart: Chart created');
  }

  createDailyTrendChart() {
    console.log('📊 createDailyTrendChart: Creating daily trend chart...');
    
    const canvas = document.getElementById('daily-trend-chart');
    if (!canvas) return;

    if (this.charts.dailyTrend) {
      this.charts.dailyTrend.destroy();
    }

    const labels = this.analyticsData.daily.map(d => 
      new Date(d.date).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })
    );
    const completed = this.analyticsData.daily.map(d => d.completed);
    const pending = this.analyticsData.daily.map(d => d.pending);

    this.charts.dailyTrend = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'הושלמו',
            data: completed,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            tension: 0.4,
            fill: true
          },
          {
            label: 'ממתינים',
            data: pending,
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            tension: 0.4,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: getComputedStyle(document.body).getPropertyValue('--text-primary')
            }
          },
          title: {
            display: true,
            text: 'מגמה יומית - 30 ימים',
            color: getComputedStyle(document.body).getPropertyValue('--text-primary'),
            font: { size: 16, weight: 'bold' }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
              color: getComputedStyle(document.body).getPropertyValue('--text-secondary')
            },
            grid: {
              color: getComputedStyle(document.body).getPropertyValue('--border-color')
            }
          },
          x: {
            ticks: {
              color: getComputedStyle(document.body).getPropertyValue('--text-secondary')
            },
            grid: { display: false }
          }
        }
      }
    });

    console.log('✅ createDailyTrendChart: Chart created');
  }

  createProductivityChart() {
    console.log('📊 createProductivityChart: Creating productivity chart...');
    
    const canvas = document.getElementById('productivity-chart');
    if (!canvas) return;

    if (this.charts.productivity) {
      this.charts.productivity.destroy();
    }

    const labels = this.analyticsData.productivity.map(h => `${h.hour}:00`);
    const tasks = this.analyticsData.productivity.map(h => h.tasks);

    this.charts.productivity = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'משימות שהושלמו',
          data: tasks,
          backgroundColor: '#3b82f6',
          borderColor: '#2563eb',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: 'פרודוקטיביות לפי שעות',
            color: getComputedStyle(document.body).getPropertyValue('--text-primary'),
            font: { size: 16, weight: 'bold' }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
              color: getComputedStyle(document.body).getPropertyValue('--text-secondary')
            },
            grid: {
              color: getComputedStyle(document.body).getPropertyValue('--border-color')
            }
          },
          x: {
            ticks: {
              color: getComputedStyle(document.body).getPropertyValue('--text-secondary')
            },
            grid: { display: false }
          }
        }
      }
    });

    console.log('✅ createProductivityChart: Chart created');
  }

  // ==================== רינדור ממשק ====================

  async renderUnifiedDashboard() {
    console.log('🎨 renderUnifiedDashboard: Rendering unified dashboard...');
    
    const panel = document.getElementById('statistics-panel');
    if (!panel) {
      console.warn('⚠️ renderUnifiedDashboard: Panel not found');
      return;
    }

    // איסוף נתונים
    await this.collectAllData();
    
    const stats = this.analyticsData.basic;
    const trends = this.analyticsData.trends;
    const subjects = Object.values(this.analyticsData.subjects);
    const topSubject = subjects.sort((a, b) => b.total - a.total)[0];
    const mostProductiveHour = this.getMostProductiveHour();

    // בדיקת מצב תלמיד
    const isStudent = (() => {
      try {
        const s = JSON.parse(localStorage.getItem('homework-settings') || '{}');
        return s.studentMode !== false;
      } catch { return true; }
    })();

    panel.innerHTML = `
      <h2>📊 סטטיסטיקות ואנליטיקה</h2>
      
      <!-- Summary Cards -->
      <div class="analytics-summary">
        <div class="analytics-summary-card">
          <div class="summary-icon">📝</div>
          <div class="summary-value">${stats.total}</div>
          <div class="summary-label">סה"כ משימות</div>
          ${trends.tasksChange !== 0 ? `
            <div class="summary-trend ${trends.tasksChange > 0 ? 'up' : 'down'}">
              ${trends.tasksChange > 0 ? '↑' : '↓'} ${Math.abs(trends.tasksChange)}% השבוע
            </div>
          ` : ''}
        </div>
        
        <div class="analytics-summary-card">
          <div class="summary-icon">✅</div>
          <div class="summary-value">${stats.completionRate}%</div>
          <div class="summary-label">שיעור השלמה</div>
          ${trends.completionChange !== 0 ? `
            <div class="summary-trend ${trends.completionChange > 0 ? 'up' : 'down'}">
              ${trends.completionChange > 0 ? '↑' : '↓'} ${Math.abs(trends.completionChange)}% השבוע
            </div>
          ` : ''}
        </div>
        
        ${isStudent ? `
        <div class="analytics-summary-card">
          <div class="summary-icon">📚</div>
          <div class="summary-value">${topSubject ? topSubject.name : '-'}</div>
          <div class="summary-label">מקצוע מוביל</div>
          ${topSubject ? `<div class="summary-detail">${topSubject.total} משימות</div>` : ''}
        </div>` : ''}
        
        <div class="analytics-summary-card">
          <div class="summary-icon">🌟</div>
          <div class="summary-value">${mostProductiveHour}:00</div>
          <div class="summary-label">שעה פרודוקטיבית</div>
        </div>
      </div>

      <!-- Main Charts Grid -->
      <div class="charts-grid">
        <div class="chart-wrapper">
          <canvas id="completion-chart"></canvas>
        </div>
        ${isStudent ? `
        <div class="chart-wrapper">
          <canvas id="subject-chart"></canvas>
        </div>` : ''}
      </div>

      <!-- Advanced Charts -->
      <div class="advanced-charts">
        <div class="chart-wrapper-large">
          <canvas id="daily-trend-chart"></canvas>
        </div>
        <div class="chart-wrapper">
          <canvas id="productivity-chart"></canvas>
        </div>
      </div>

      <!-- Insights Section -->
      <div class="analytics-insights">
        <h3>💡 תובנות</h3>
        ${this.generateInsights()}
      </div>

    `;

    // יצירת גרפים
    setTimeout(() => {
      this.createCompletionChart();
      if (isStudent) this.createSubjectChart();
      this.createDailyTrendChart();
      this.createProductivityChart();
    }, 100);

    console.log('✅ renderUnifiedDashboard: Dashboard rendered');
  }

  // ==================== עזרים ====================

  getDaysUntilDue(dueDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate + 'T00:00:00');
    return Math.round((due - today) / (1000 * 60 * 60 * 24));
  }

  calculateAvgTimeToComplete(tasks) {
    if (tasks.length === 0) return 0;
    
    let totalTime = 0;
    let count = 0;
    
    tasks.forEach(task => {
      if (task.completed && task.createdAt && task.completedAt) {
        const created = new Date(task.createdAt);
        const completed = new Date(task.completedAt);
        const days = Math.floor((completed - created) / (1000 * 60 * 60 * 24));
        totalTime += days;
        count++;
      }
    });
    
    return count > 0 ? Math.round(totalTime / count) : 0;
  }

  getMostProductiveHour() {
    if (!this.analyticsData.productivity || this.analyticsData.productivity.length === 0) return 0;
    
    let maxTasks = 0;
    let maxHour = 0;
    
    this.analyticsData.productivity.forEach(h => {
      if (h.tasks > maxTasks) {
        maxTasks = h.tasks;
        maxHour = h.hour;
      }
    });
    
    return maxHour;
  }

  generateInsights() {
    const insights = [];
    const stats = this.analyticsData.basic;
    const subjects = Object.values(this.analyticsData.subjects);
    const trends = this.analyticsData.trends;
    
    // תובנה על ביצועים
    if (stats.completionRate >= 80) {
      insights.push(`
        <div class="insight-item success">
          <span class="insight-icon">🎉</span>
          <span>ביצועים מעולים! שיעור השלמה של ${stats.completionRate}%</span>
        </div>
      `);
    } else if (stats.completionRate < 50) {
      insights.push(`
        <div class="insight-item warning">
          <span class="insight-icon">⚠️</span>
          <span>שיעור השלמה נמוך (${stats.completionRate}%) - כדאי להתמקד בסיום משימות</span>
        </div>
      `);
    }
    
    // תובנה על משימות דחופות
    if (stats.urgent > 0) {
      insights.push(`
        <div class="insight-item warning">
          <span class="insight-icon">🔥</span>
          <span>יש ${stats.urgent} משימות דחופות הדורשות תשומת לב מיידית</span>
        </div>
      `);
    }
    
    // תובנה על איחורים
    if (stats.overdue > 0) {
      insights.push(`
        <div class="insight-item danger">
          <span class="insight-icon">⚠️</span>
          <span>${stats.overdue} משימות באיחור - כדאי לטפל בהן בהקדם</span>
        </div>
      `);
    }
    
    // תובנה על מקצוע
    if (subjects.length > 0) {
      const maxSubject = subjects.reduce((max, s) => s.total > max.total ? s : max);
      if (maxSubject.total > 0) {
        insights.push(`
          <div class="insight-item info">
            <span class="insight-icon">📚</span>
            <span>המקצוע עם הכי הרבה משימות הוא <strong>${maxSubject.name}</strong> (${maxSubject.total} משימות)</span>
          </div>
        `);
      }
    }
    
    // תובנה על מגמה
    if (trends.trend === 'up') {
      insights.push(`
        <div class="insight-item info">
          <span class="insight-icon">📈</span>
          <span>מגמת עלייה במספר המשימות - ${Math.abs(trends.tasksChange)}% יותר מהשבוע שעבר</span>
        </div>
      `);
    } else if (trends.trend === 'down') {
      insights.push(`
        <div class="insight-item success">
          <span class="insight-icon">📉</span>
          <span>מגמת ירידה במספר המשימות - ${Math.abs(trends.tasksChange)}% פחות מהשבוע שעבר</span>
        </div>
      `);
    }
    
    // תובנה על פרודוקטיביות
    const mostProductiveHour = this.getMostProductiveHour();
    if (mostProductiveHour > 0) {
      insights.push(`
        <div class="insight-item info">
          <span class="insight-icon">⏰</span>
          <span>השעה הכי פרודוקטיבית שלך היא <strong>${mostProductiveHour}:00</strong></span>
        </div>
      `);
    }
    
    // תובנה על גמיפיקציה
    if (typeof gamification !== 'undefined' && gamification.userStats) {
      const streak = gamification.userStats.streak;
      if (streak > 0) {
        insights.push(`
          <div class="insight-item success">
            <span class="insight-icon">🔥</span>
            <span>אתה ב-streak של <strong>${streak} ימים</strong>! המשך כך!</span>
          </div>
        `);
      }
    }
    
    return insights.length > 0 ? insights.join('') : '<div class="insight-item info"><span class="insight-icon">💡</span><span>המשך לעקוב אחר ההתקדמות שלך לקבלת תובנות נוספות</span></div>';
  }

  // עדכון צבעי גרפים במצב לילה
  updateChartColors() {
    console.log('🎨 updateChartColors: Updating chart colors for dark mode...');
    
    const textColor = getComputedStyle(document.body).getPropertyValue('--text-primary');
    const secondaryColor = getComputedStyle(document.body).getPropertyValue('--text-secondary');
    const borderColor = getComputedStyle(document.body).getPropertyValue('--border-color');
    
    Object.values(this.charts).forEach(chart => {
      if (!chart) return;
      
      // עדכון צבעי טקסט
      if (chart.options.plugins.legend) {
        chart.options.plugins.legend.labels.color = textColor;
      }
      if (chart.options.plugins.title) {
        chart.options.plugins.title.color = textColor;
      }
      
      // עדכון צבעי צירים
      if (chart.options.scales) {
        if (chart.options.scales.y) {
          chart.options.scales.y.ticks.color = secondaryColor;
          chart.options.scales.y.grid.color = borderColor;
        }
        if (chart.options.scales.x) {
          chart.options.scales.x.ticks.color = secondaryColor;
        }
      }
      
      chart.update();
    });
    
    console.log('✅ updateChartColors: Chart colors updated');
  }

  // ייצוא דוח סטטיסטיקות
  async exportStatisticsReport() {
    console.log('📊 exportStatisticsReport: Exporting statistics report...');
    
    try {
      notifications.showInAppNotification('מכין דוח סטטיסטיקות...', 'info');
      
      await this.collectAllData();

      const stats = this.analyticsData.basic;
      const subjects = Object.values(this.analyticsData.subjects);
      const trends = this.analyticsData.trends;
      
      // יצירת תוכן HTML
      const reportContent = document.createElement('div');
      reportContent.style.fontFamily = 'Arial, sans-serif';
      reportContent.style.direction = 'rtl';
      reportContent.style.padding = '20px';
      reportContent.style.backgroundColor = 'white';
      reportContent.style.color = '#000';
      
      reportContent.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #3b82f6;">📊 דוח סטטיסטיקות ואנליטיקה</h1>
          <p style="color: #6b7280;">
            <strong>תאריך:</strong> ${new Date().toLocaleDateString('he-IL', { 
              weekday: 'long', 
              day: 'numeric', 
              month: 'long', 
              year: 'numeric' 
            })}
          </p>
        </div>
        
        <div style="margin-bottom: 30px;">
          <h2 style="color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">סטטיסטיקות כלליות</h2>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
            <div style="background: #dbeafe; padding: 15px; border-radius: 8px;">
              <div style="font-size: 32px; font-weight: bold; color: #2563eb;">${stats.total}</div>
              <div style="color: #6b7280;">סך הכל משימות</div>
            </div>
            <div style="background: #dcfce7; padding: 15px; border-radius: 8px;">
              <div style="font-size: 32px; font-weight: bold; color: #16a34a;">${stats.completed}</div>
              <div style="color: #6b7280;">הושלמו (${stats.completionRate}%)</div>
            </div>
            <div style="background: #fed7aa; padding: 15px; border-radius: 8px;">
              <div style="font-size: 32px; font-weight: bold; color: #ea580c;">${stats.pending}</div>
              <div style="color: #6b7280;">ממתינים</div>
            </div>
            <div style="background: #fecaca; padding: 15px; border-radius: 8px;">
              <div style="font-size: 32px; font-weight: bold; color: #dc2626;">${stats.urgent}</div>
              <div style="color: #6b7280;">דחופים</div>
            </div>
          </div>
        </div>
        
        <div style="margin-bottom: 30px;">
          <h2 style="color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">מגמות</h2>
          <div style="padding: 15px; background: #f9fafb; border-radius: 8px;">
            <p><strong>שינוי במספר המשימות:</strong> ${trends.tasksChange > 0 ? '+' : ''}${trends.tasksChange}% מהשבוע שעבר</p>
            <p><strong>שינוי בשיעור השלמה:</strong> ${trends.completionChange > 0 ? '+' : ''}${trends.completionChange}% מהשבוע שעבר</p>
            <p><strong>מגמה כללית:</strong> ${trends.trend === 'up' ? '📈 עלייה' : trends.trend === 'down' ? '📉 ירידה' : '➡️ יציבות'}</p>
          </div>
        </div>
        
        <div style="margin-bottom: 30px;">
          <h2 style="color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">ביצועים לפי מקצוע</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #3b82f6; color: white;">
                <th style="padding: 12px; text-align: right; border: 1px solid #2563eb;">מקצוע</th>
                <th style="padding: 12px; text-align: center; border: 1px solid #2563eb;">סה"כ</th>
                <th style="padding: 12px; text-align: center; border: 1px solid #2563eb;">הושלמו</th>
                <th style="padding: 12px; text-align: center; border: 1px solid #2563eb;">שיעור השלמה</th>
                <th style="padding: 12px; text-align: center; border: 1px solid #2563eb;">ממוצע ימים</th>
              </tr>
            </thead>
            <tbody>
              ${subjects.map((subject, index) => `
                <tr style="background: ${index % 2 === 0 ? '#f9fafb' : 'white'};">
                  <td style="padding: 10px; border: 1px solid #e5e7eb;">
                    <span style="display: inline-block; width: 12px; height: 12px; background: ${subject.color}; border-radius: 50%; margin-left: 8px;"></span>
                    ${subject.name}
                  </td>
                  <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: center;">${subject.total}</td>
                  <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: center;">${subject.completed}</td>
                  <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: center;">${Math.round(subject.completionRate)}%</td>
                  <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: center;">${subject.avgTimeToComplete}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <div style="margin-top: 40px; text-align: center; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
          <p>מערכת ניהול משימות - דוח סטטיסטיקות</p>
          <p>© ${new Date().getFullYear()} - נוצר ב-${new Date().toLocaleString('he-IL')}</p>
        </div>
      `;
      
      // הגדרות PDF
      const opt = {
        margin: [10, 10, 10, 10],
        filename: `statistics-report-${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };
      
      reportContent.style.position = 'absolute';
      reportContent.style.top = '0';
      reportContent.style.left = '-9999px';
      reportContent.style.width = '794px';
      reportContent.style.zIndex = '-1';
      document.body.appendChild(reportContent);
      await new Promise(r => setTimeout(r, 300));

      try {
        await html2pdf().set(opt).from(reportContent).save();
      } finally {
        document.body.removeChild(reportContent);
      }
      
      notifications.showInAppNotification('📊 דוח סטטיסטיקות נוצר בהצלחה!', 'success');
      console.log('✅ exportStatisticsReport: Report exported successfully');
      
    } catch (error) {
      console.error('❌ exportStatisticsReport: Error:', error);
      notifications.showInAppNotification('שגיאה ביצירת הדוח', 'error');
    }
  }
}

// יצירת אובייקט גלובלי
console.log('📊 Creating global unified statistics manager...');
const statistics = new UnifiedStatisticsManager();
statistics.renderStatisticsPanel = statistics.renderUnifiedDashboard.bind(statistics);
console.log('✅ Global unified statistics manager created');

// אתחול
window.addEventListener('DOMContentLoaded', async () => {
  console.log('📊 statistics.js: Initializing...');
  
  // ממתין לאתחול Auth לפני טעינת סטטיסטיקות
  const panel = document.getElementById('statistics-panel');
  if (panel) {
    try {
      await statistics.renderUnifiedDashboard();
    } catch (e) {
      console.warn('📊 statistics.js: Will retry after auth is ready');
    }
  }
  
  console.log('✅ statistics.js: Initialized');
});

// עדכון אוטומטי
setInterval(async () => {
  const panel = document.getElementById('statistics-panel');
  if (panel && panel.offsetParent !== null) {
    await statistics.collectAllData();
    Object.values(statistics.charts).forEach(chart => {
      if (chart) chart.update();
    });
  }
}, 60000); // עדכון כל דקה
// Achievements & Gamification System - מערכת הישגים וגיימיפיקציה
class AchievementsManager {
  constructor(achievementsData) {
    // load achievements from external JSON data
    if (achievementsData && achievementsData.achievements) {
      // build conditions from JSON definitions
      this.achievements = achievementsData.achievements.map(ach => ({
        ...ach,
        condition: (stats) => this._evaluateCondition(ach, stats)
      }));
      this.levels = achievementsData.levels || [];
    } else {
      this.achievements = [];
      this.levels = [];
      console.warn('⚠️ AchievementsManager: No achievements data provided');
    }

    this.userProgress = {
      points: 0,
      level: 1,
      unlockedAchievements: [],
      achievementDates: {},
      lastCompletionDate: null,
      currentStreak: 0,
      maxStreak: 0,
      earlyCompletions: 0,
      nightCompletions: 0,
      maxDailyCompletions: 0,
      dailyCompletions: {}
    };

    console.log('🏆 AchievementsManager: Initialized with', this.achievements.length, 'achievements');
  }

  // evaluate achievement conditions based on stats
  _evaluateCondition(achievement, stats) {
    const target = achievement.target || 1;
    
    // completion category
    if (achievement.category === 'completion') {
      if (achievement.id === 'first_task') return stats.completed >= target;
      if (achievement.id === 'task_master_10') return stats.completed >= target;
      if (achievement.id === 'task_master_50') return stats.completed >= target;
      if (achievement.id === 'task_master_100') return stats.completed >= target;
    }
    // streak category
    if (achievement.category === 'streak') {
      if (achievement.id === 'streak_3') return stats.currentStreak >= target;
      if (achievement.id === 'streak_7') return stats.currentStreak >= target;
      if (achievement.id === 'streak_30') return stats.currentStreak >= target;
    }
    // urgency category
    if (achievement.category === 'urgency') {
      if (achievement.id === 'no_overdue') return stats.overdue === 0 && stats.total > 0;
      if (achievement.id === 'early_bird') return stats.earlyCompletions >= target;
    }
    // subjects category
    if (achievement.category === 'subjects') {
      if (achievement.id === 'multi_subject') return (stats.subjectsCount || 0) >= target;
      if (achievement.id === 'subject_master') return (stats.maxSubjectTasks || 0) >= target;
    }
    // special category
    if (achievement.category === 'special') {
      if (achievement.id === 'perfectionist') return (stats.completionRate || 0) === 100 && stats.total >= 5;
      if (achievement.id === 'organized') return (stats.tagsUsed || 0) >= target;
      if (achievement.id === 'night_owl') return (stats.nightCompletions || 0) >= target;
      if (achievement.id === 'speed_demon') return (stats.maxDailyCompletions || 0) >= target;
    }
    return false;
  }

  // get progress for an achievement
  _getProgress(achievement, stats) {
    const target = achievement.target || 1;
    
    // completion - based on completed tasks
    if (achievement.category === 'completion') {
      return Math.min(stats.completed, target);
    }
    // streak - based on current streak
    if (achievement.category === 'streak') {
      return Math.min(stats.currentStreak, target);
    }
    // urgency - based on early completions or no overdue tasks
    if (achievement.id === 'early_bird') {
      return Math.min(stats.earlyCompletions, target);
    }
    if (achievement.id === 'no_overdue') {
      return stats.overdue === 0 && stats.total > 0 ? target : 0;
    }
    // subjects - based on count or max tasks per subject
    if (achievement.id === 'multi_subject') {
      return Math.min(stats.subjectsCount || 0, target);
    }
    if (achievement.id === 'subject_master') {
      return Math.min(stats.maxSubjectTasks || 0, target);
    }
    // special achievements
    if (achievement.id === 'perfectionist') {
      return stats.completionRate || 0;
    }
    if (achievement.id === 'organized') {
      return Math.min(stats.tagsUsed || 0, target);
    }
    if (achievement.id === 'night_owl') {
      return Math.min(stats.nightCompletions || 0, target);
    }
    if (achievement.id === 'speed_demon') {
      return Math.min(stats.maxDailyCompletions || 0, target);
    }
    
    return 0;
  }

  // טעינת התקדמות המשתמש
  async loadProgress() {
    console.log('📥 AchievementsManager: Loading user progress...');
    try {
      const savedProgress = await storage.get('homework-achievements');
      if (savedProgress) {
        this.userProgress = { ...this.userProgress, ...savedProgress };
        console.log('✅ AchievementsManager: Progress loaded:', this.userProgress);
      } else {
        console.log('⚠️ AchievementsManager: No saved progress found');
      }
    } catch (error) {
      console.error('❌ AchievementsManager: Error loading progress:', error);
    }
  }

  // שמירת התקדמות המשתמש
  async saveProgress() {
    console.log('💾 AchievementsManager: Saving user progress...');
    try {
      await storage.set('homework-achievements', this.userProgress);
      console.log('✅ AchievementsManager: Progress saved');
    } catch (error) {
      console.error('❌ AchievementsManager: Error saving progress:', error);
    }
  }

  // חישוב סטטיסטיקות למשתמש
  calculateStats(homework, subjects, availableTags) {
    console.log('📊 AchievementsManager: Calculating stats...');
    
    const completed = homework.filter(h => h.completed);
    const overdue = homework.filter(h => !h.completed && getDaysUntilDue(h.dueDate) < 0);
    
    // מניין מקצועות ייחודיים
    const uniqueSubjects = [...new Set(homework.map(h => h.subject))];
    
    // מציאת מקצוע עם הכי הרבה משימות
    const subjectCounts = {};
    homework.forEach(h => {
      subjectCounts[h.subject] = (subjectCounts[h.subject] || 0) + 1;
    });
    const maxSubjectTasks = Math.max(...Object.values(subjectCounts), 0);
    
    // מניין תגיות בשימוש
    const usedTags = new Set();
    homework.forEach(h => {
      if (h.tags) h.tags.forEach(tag => usedTags.add(tag));
    });
    
    // אחוז השלמה
    const completionRate = homework.length > 0 
      ? Math.round((completed.length / homework.length) * 100) 
      : 0;

    const stats = {
      total: homework.length,
      completed: completed.length,
      pending: homework.filter(h => !h.completed).length,
      overdue: overdue.length,
      urgent: homework.filter(h => !h.completed && getDaysUntilDue(h.dueDate) <= 2 && getDaysUntilDue(h.dueDate) >= 0).length,
      subjectsCount: uniqueSubjects.length,
      maxSubjectTasks,
      tagsUsed: usedTags.size,
      completionRate,
      currentStreak: this.userProgress.currentStreak,
      maxStreak: this.userProgress.maxStreak,
      earlyCompletions: this.userProgress.earlyCompletions,
      nightCompletions: this.userProgress.nightCompletions,
      maxDailyCompletions: this.userProgress.maxDailyCompletions
    };
    
    console.log('📊 AchievementsManager: Stats calculated:', stats);
    return stats;
  }

  // בדיקת הישגים חדשים
  async checkAchievements(homework, subjects, availableTags) {
    console.log('🔍 AchievementsManager: Checking for new achievements...');
    
    const stats = this.calculateStats(homework, subjects, availableTags);
    const newAchievements = [];

    for (const achievement of this.achievements) {
      // בדיקה אם ההישג כבר נפתח
      if (this.userProgress.unlockedAchievements.includes(achievement.id)) {
        continue;
      }

      // בדיקת תנאי ההישג
      if (achievement.condition(stats)) {
        console.log('🎉 AchievementsManager: New achievement unlocked:', achievement.name);
        
        this.userProgress.unlockedAchievements.push(achievement.id);
        if (!this.userProgress.achievementDates) this.userProgress.achievementDates = {};
        this.userProgress.achievementDates[achievement.id] = new Date().toISOString();
        this.userProgress.points += achievement.points;
        newAchievements.push(achievement);

        // הצגת התראה
        this.showAchievementNotification(achievement);
      }
    }

    // עדכון רמה
    this.updateLevel();

    // שמירת התקדמות
    await this.saveProgress();

    console.log('✅ AchievementsManager: Check complete,', newAchievements.length, 'new achievements');
    return newAchievements;
  }

  // עדכון רמה
  updateLevel() {
    const oldLevel = this.userProgress.level;
    
    for (let i = this.levels.length - 1; i >= 0; i--) {
      if (this.userProgress.points >= this.levels[i].minPoints) {
        this.userProgress.level = this.levels[i].level;
        break;
      }
    }

    if (this.userProgress.level > oldLevel) {
      console.log('🎊 AchievementsManager: Level up!', oldLevel, '→', this.userProgress.level);
      this.showLevelUpNotification();
    }
  }

  // עדכון רצף (Streak)
  async updateStreak(completedToday) {
    console.log('🔥 AchievementsManager: Updating streak...');
    
    const today = new Date().toDateString();
    const lastCompletion = this.userProgress.lastCompletionDate 
      ? new Date(this.userProgress.lastCompletionDate).toDateString() 
      : null;

    if (completedToday) {
      // עדכון מניין יומי
      const dateKey = new Date().toISOString().split('T')[0];
      this.userProgress.dailyCompletions[dateKey] = (this.userProgress.dailyCompletions[dateKey] || 0) + 1;
      
      // עדכון מקסימום השלמות יומי
      const todayCompletions = this.userProgress.dailyCompletions[dateKey];
      if (todayCompletions > this.userProgress.maxDailyCompletions) {
        this.userProgress.maxDailyCompletions = todayCompletions;
      }

      if (lastCompletion === today) {
        // כבר השלמנו משימה היום
        console.log('📅 AchievementsManager: Already completed task today');
      } else {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toDateString();

        if (lastCompletion === yesterdayStr) {
          // המשך הרצף
          this.userProgress.currentStreak++;
          console.log('🔥 AchievementsManager: Streak continued:', this.userProgress.currentStreak);
        } else {
          // רצף חדש
          this.userProgress.currentStreak = 1;
          console.log('🆕 AchievementsManager: New streak started');
        }

        this.userProgress.lastCompletionDate = new Date().toISOString();
        
        // עדכון מקסימום רצף
        if (this.userProgress.currentStreak > this.userProgress.maxStreak) {
          this.userProgress.maxStreak = this.userProgress.currentStreak;
        }
      }
    }

    await this.saveProgress();
  }

  // עדכון השלמה מוקדמת
  async trackEarlyCompletion(dueDate) {
    const daysLeft = getDaysUntilDue(dueDate);
    if (daysLeft > 0) {
      this.userProgress.earlyCompletions++;
      console.log('🐦 AchievementsManager: Early completion tracked');
      await this.saveProgress();
    }
  }

  // עדכון השלמה לילית
  async trackNightCompletion() {
    const hour = new Date().getHours();
    if (hour >= 22 || hour < 6) {
      this.userProgress.nightCompletions++;
      console.log('🦉 AchievementsManager: Night completion tracked');
      await this.saveProgress();
    }
  }

  // הצגת התראת הישג
  showAchievementNotification(achievement) {
    console.log('🎉 AchievementsManager: Showing achievement notification:', achievement.name);
    
    const notification = document.createElement('div');
    notification.className = 'achievement-notification';
    notification.innerHTML = `
      <div class="achievement-content">
        <div class="achievement-icon">${achievement.icon}</div>
        <div class="achievement-info">
          <div class="achievement-title">הישג חדש!</div>
          <div class="achievement-name">${achievement.name}</div>
          <div class="achievement-desc">${achievement.description}</div>
          <div class="achievement-points">+${achievement.points} נקודות</div>
        </div>
      </div>
    `;

    document.body.appendChild(notification);

    // אנימציה
    setTimeout(() => {
      notification.classList.add('show');
    }, 100);

    // הסרה אחרי 5 שניות
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 500);
    }, 5000);
  }

  // הצגת התראת עליית רמה
  showLevelUpNotification() {
    const levelInfo = this.levels.find(l => l.level === this.userProgress.level);
    if (!levelInfo) return;

    console.log('🎊 AchievementsManager: Showing level up notification');
    
    notifications.showInAppNotification(
      `🎊 עלית לרמה ${levelInfo.level} - ${levelInfo.name} ${levelInfo.icon}`,
      'success'
    );
  }

  // רינדור דף הישגים
  renderAchievementsPage() {
    console.log('🎨 AchievementsManager: Rendering achievements page...');
    
    const levelInfo = this.levels.find(l => l.level === this.userProgress.level);
    const nextLevel = this.levels.find(l => l.level === this.userProgress.level + 1);
    const progressToNext = nextLevel 
      ? ((this.userProgress.points - levelInfo.minPoints) / (nextLevel.minPoints - levelInfo.minPoints)) * 100
      : 100;

    const categories = {
      completion: 'השלמה',
      streak: 'רצף',
      urgency: 'דחיפות',
      subjects: 'מקצועות',
      special: 'מיוחדים'
    };

    let html = `
      <div class="achievements-container">
        <div class="achievements-header">
          <div class="user-level-card">
            <div class="level-icon">${levelInfo.icon}</div>
            <div class="level-info">
              <h2>רמה ${this.userProgress.level} - ${levelInfo.name}</h2>
              <div class="level-points">${this.userProgress.points.toLocaleString()} נקודות</div>
              ${nextLevel ? `
                <div class="level-progress-bar">
                  <div class="level-progress-fill" style="width: ${progressToNext}%"></div>
                </div>
                <div class="level-progress-text">
                  ${Math.round(progressToNext)}% עד רמה ${nextLevel.level} (${(nextLevel.minPoints - this.userProgress.points).toLocaleString()} נקודות)
                </div>
              ` : `
                <div class="max-level">🏆 רמה מקסימלית!</div>
              `}
            </div>
          </div>

          <div class="streak-card">
            <div class="streak-icon">🔥</div>
            <div class="streak-info">
              <div class="streak-current">${this.userProgress.currentStreak} ימים</div>
              <div class="streak-label">רצף נוכחי</div>
              <div class="streak-max">שיא: ${this.userProgress.maxStreak} ימים</div>
            </div>
          </div>
        </div>

        <div class="achievements-stats">
          <div class="stat-badge">
            <div class="stat-value">${this.userProgress.unlockedAchievements.length}</div>
            <div class="stat-label">הישגים</div>
          </div>
          <div class="stat-badge">
            <div class="stat-value">${this.userProgress.earlyCompletions}</div>
            <div class="stat-label">השלמות מוקדמות</div>
          </div>
          <div class="stat-badge">
            <div class="stat-value">${this.userProgress.maxDailyCompletions}</div>
            <div class="stat-label">שיא יומי</div>
          </div>
        </div>

        <div class="achievements-grid">
    `;

    // הישגים לפי קטגוריה
    for (const [catId, catName] of Object.entries(categories)) {
      const catAchievements = this.achievements.filter(a => a.category === catId);
      
      html += `
        <div class="achievement-category">
          <h3>${catName}</h3>
          <div class="achievements-list">
      `;

      for (const achievement of catAchievements) {
        const unlocked = this.userProgress.unlockedAchievements.includes(achievement.id);
        const target = achievement.target || 1;
        const targetLabel = achievement.targetLabel || 'משימות';
        
        // Calculate progress for this achievement
        let progressText = '';
        let progressPercent = 0;
        
        if (achievement.category === 'completion') {
          const progress = Math.min(this.userProgress.points ? Math.floor(this.userProgress.points / 10) : 0, target);
          progressPercent = Math.round((progress / target) * 100);
          progressText = `השלמתי ${progress} מתוך ${target} ${targetLabel}`;
        } else if (achievement.category === 'streak') {
          const progress = this.userProgress.currentStreak;
          progressPercent = Math.round((progress / target) * 100);
          progressText = `${progress}/${target} ${targetLabel}`;
        } else if (achievement.category === 'urgency') {
          if (achievement.id === 'no_overdue') {
            progressPercent = this.userProgress.points ? 100 : 0;
            progressText = `אין משימות באיחור`;
          } else if (achievement.id === 'early_bird') {
            progressPercent = Math.round((this.userProgress.earlyCompletions / target) * 100);
            progressText = `${this.userProgress.earlyCompletions}/${target} ${targetLabel}`;
          }
        } else if (achievement.category === 'subjects') {
          progressPercent = 50; // placeholder
          progressText = `${target} ${targetLabel}`;
        } else if (achievement.category === 'special') {
          if (achievement.id === 'perfectionist') {
            progressPercent = this.userProgress.points ? 100 : 0;
            progressText = `100% השלמה`;
          } else if (achievement.id === 'organized') {
            progressPercent = 50; // placeholder for tags
            progressText = `${target} ${targetLabel}`;
          } else if (achievement.id === 'night_owl') {
            progressPercent = this.userProgress.nightCompletions ? 100 : 0;
            progressText = `${this.userProgress.nightCompletions}/${target} ${targetLabel}`;
          } else if (achievement.id === 'speed_demon') {
            progressPercent = Math.round((this.userProgress.maxDailyCompletions / target) * 100);
            progressText = `${this.userProgress.maxDailyCompletions}/${target} ${targetLabel}`;
          }
        }
        
        html += `
          <div class="achievement-item ${unlocked ? 'unlocked' : 'locked'}">
            <div class="achievement-icon-large">${unlocked ? achievement.icon : '🔒'}</div>
            <div class="achievement-details">
              <div class="achievement-name">${achievement.name}</div>
              <div class="achievement-description">${achievement.description}</div>
              <div class="achievement-progress-section">
                <div class="achievement-progress-text">${progressText}</div>
                <div class="achievement-progress-bar">
                  <div class="achievement-progress-fill" style="width: ${progressPercent}%"></div>
                </div>
                <div class="achievement-progress-percent">${progressPercent}%</div>
              </div>
              <div class="achievement-points-badge">
                <span class="points-icon">⭐</span> ${achievement.points} XP
              </div>
              ${unlocked && this.userProgress.achievementDates?.[achievement.id] ? `<div class="achievement-date">🗓️ נפתח: ${new Date(this.userProgress.achievementDates[achievement.id]).toLocaleDateString('he-IL')}</div>` : ''}
            </div>
            ${unlocked ? '<div class="achievement-check">✓</div>' : ''}
          </div>
        `;
      }

      html += `
          </div>
        </div>
      `;
    }

    html += `
        </div>
      </div>
    `;

    return html;
  }

  // קבלת מידע על רמה נוכחית
  getCurrentLevelInfo() {
    return this.levels.find(l => l.level === this.userProgress.level);
  }

  // קבלת אחוז התקדמות
  getProgressPercentage() {
    const levelInfo = this.levels.find(l => l.level === this.userProgress.level);
    const nextLevel = this.levels.find(l => l.level === this.userProgress.level + 1);
    
    if (!nextLevel) return 100;
    
    return ((this.userProgress.points - levelInfo.minPoints) / (nextLevel.minPoints - levelInfo.minPoints)) * 100;
  }
}

// יצירת אובייקט גלובלי
console.log('🏆 Creating global achievements manager...');
let achievementsManager = null;

// טעינה של נתונים מ-JSON חיצוני
async function initAchievementsManager() {
  try {
    const response = await fetch('./achievements.json');
    if (!response.ok) throw new Error(`Failed to load achievements.json: ${response.statusText}`);
    
    const achievementsData = await response.json();
    achievementsManager = new AchievementsManager(achievementsData);
    console.log('✅ Global achievements manager created with data from achievements.json');
    return achievementsManager;
  } catch (error) {
    console.error('❌ Error loading achievements data:', error);
    // Fallback: create with empty data if JSON fails
    achievementsManager = new AchievementsManager({
      achievements: [],
      levels: []
    });
    console.warn('⚠️ Initialized achievements manager with empty data');
    return achievementsManager;
  }
}

// קריאה אתחול
initAchievementsManager();
// Enhanced Gamification & Achievements Manager - מערכת משחוק והישגים משופרת
// ⭐ כולל מדי התקדמות להישגים כמותיים
// ================================================================================

// ── Fallback: ודא ש-storage זמין ──────────────────────────────
if (typeof storage === 'undefined') {
  /* eslint-disable no-var */
  var storage = window.storage || window.storageManager;
}

class GamificationManager {
  constructor() {
    this.userStats = {
      level: 1,
      xp: 0,
      totalXP: 0,
      streak: 0,
      longestStreak: 0,
      lastActivityDate: null,
      totalTasksCompleted: 0,
      totalStudyTime: 0,
      perfectDays: 0,
      perfectDayToday: null,
      perfectDayStreak: 0,
      maxPerfectDayStreak: 0,
      lastPerfectDay: null,
      // מבחנים
      totalExamsCompleted: 0,
      totalTopicsDone: 0,
      fullyPreparedExams: 0
    };

    this.achievements = [];
    this.unlockedAchievements = [];
    
    this.initializeAchievements();
    console.log('🏆 GamificationManager: Initialized with progress tracking');
  }

  // ==================== אתחול ====================

  initializeAchievements() {
    this.achievements = [
      // 🎯 משימות - כמותיים
      {
        id: 'first-task',
        name: 'צעד ראשון',
        description: 'השלם את המשימה הראשונה שלך',
        icon: '🎯',
        condition: (stats) => stats.totalTasksCompleted >= 1,
        target: 1,
        getProgress: (stats) => stats.totalTasksCompleted,
        xp: 10,
        category: 'tasks',
        quantifiable: true
      },
      {
        id: 'task-master-10',
        name: 'מתחיל מבטיח',
        description: 'השלם 10 משימות',
        icon: '⭐',
        condition: (stats) => stats.totalTasksCompleted >= 10,
        target: 10,
        getProgress: (stats) => stats.totalTasksCompleted,
        xp: 50,
        category: 'tasks',
        quantifiable: true
      },
      {
        id: 'task-master-25',
        name: 'עובד קשה',
        description: 'השלם 25 משימות',
        icon: '🌟',
        condition: (stats) => stats.totalTasksCompleted >= 25,
        target: 25,
        getProgress: (stats) => stats.totalTasksCompleted,
        xp: 100,
        category: 'tasks',
        quantifiable: true
      },
      {
        id: 'task-master-50',
        name: 'מומחה משימות',
        description: 'השלם 50 משימות',
        icon: '🌠',
        condition: (stats) => stats.totalTasksCompleted >= 50,
        target: 50,
        getProgress: (stats) => stats.totalTasksCompleted,
        xp: 200,
        category: 'tasks',
        quantifiable: true
      },
      {
        id: 'task-master-100',
        name: 'אלוף המשימות',
        description: 'השלם 100 משימות',
        icon: '🏅',
        condition: (stats) => stats.totalTasksCompleted >= 100,
        target: 100,
        getProgress: (stats) => stats.totalTasksCompleted,
        xp: 500,
        category: 'tasks',
        quantifiable: true
      },
      {
        id: 'task-master-250',
        name: 'אגדת המשימות',
        description: 'השלם 250 משימות',
        icon: '👑',
        condition: (stats) => stats.totalTasksCompleted >= 250,
        target: 250,
        getProgress: (stats) => stats.totalTasksCompleted,
        xp: 1000,
        category: 'tasks',
        quantifiable: true
      },

      // 🔥 רצפים (Streaks) - כמותיים
      {
        id: 'streak-3',
        name: 'מתחמם',
        description: 'השלם משימות 3 ימים ברצף',
        icon: '🔥',
        condition: (stats) => stats.streak >= 3,
        target: 3,
        getProgress: (stats) => stats.streak,
        xp: 30,
        category: 'streaks',
        quantifiable: true
      },
      {
        id: 'streak-7',
        name: 'שבוע מושלם',
        description: 'השלם משימות 7 ימים ברצף',
        icon: '🔥🔥',
        condition: (stats) => stats.streak >= 7,
        target: 7,
        getProgress: (stats) => stats.streak,
        xp: 100,
        category: 'streaks',
        quantifiable: true
      },
      {
        id: 'streak-14',
        name: 'שבועיים של מחויבות',
        description: 'השלם משימות 14 ימים ברצף',
        icon: '🔥🔥',
        condition: (stats) => stats.streak >= 14,
        target: 14,
        getProgress: (stats) => stats.streak,
        xp: 250,
        category: 'streaks',
        quantifiable: true
      },
      {
        id: 'streak-30',
        name: 'חודש של מצוינות',
        description: 'השלם משימות 30 ימים ברצף',
        icon: '🔥🔥🔥',
        condition: (stats) => stats.streak >= 30,
        target: 30,
        getProgress: (stats) => stats.streak,
        xp: 500,
        category: 'streaks',
        quantifiable: true
      },
      {
        id: 'streak-100',
        name: 'מאסטר רצף',
        description: 'השלם משימות 100 ימים ברצף',
        icon: '🔥🔥🔥🔥',
        condition: (stats) => stats.streak >= 100,
        target: 100,
        getProgress: (stats) => stats.streak,
        xp: 2000,
        category: 'streaks',
        quantifiable: true
      },

      // ⏰ זמן לימוד - כמותיים
      {
        id: 'study-1h',
        name: 'שעה ראשונה',
        description: 'למד שעה אחת',
        icon: '⏰',
        condition: (stats) => stats.totalStudyTime >= 60,
        target: 60,
        getProgress: (stats) => stats.totalStudyTime,
        xp: 20,
        category: 'study',
        quantifiable: true
      },
      {
        id: 'study-5h',
        name: 'לומד מתמיד',
        description: 'למד 5 שעות',
        icon: '📖',
        condition: (stats) => stats.totalStudyTime >= 300,
        target: 300,
        getProgress: (stats) => stats.totalStudyTime,
        xp: 50,
        category: 'study',
        quantifiable: true
      },
      {
        id: 'study-10h',
        name: 'סטודנט מסור',
        description: 'למד 10 שעות',
        icon: '📚',
        condition: (stats) => stats.totalStudyTime >= 600,
        target: 600,
        getProgress: (stats) => stats.totalStudyTime,
        xp: 100,
        category: 'study',
        quantifiable: true
      },
      {
        id: 'study-25h',
        name: 'חובב ידע',
        description: 'למד 25 שעות',
        icon: '📚',
        condition: (stats) => stats.totalStudyTime >= 1500,
        target: 1500,
        getProgress: (stats) => stats.totalStudyTime,
        xp: 200,
        category: 'study',
        quantifiable: true
      },
      {
        id: 'study-50h',
        name: 'מלומד',
        description: 'למד 50 שעות',
        icon: '🎓',
        condition: (stats) => stats.totalStudyTime >= 3000,
        target: 3000,
        getProgress: (stats) => stats.totalStudyTime,
        xp: 300,
        category: 'study',
        quantifiable: true
      },
      {
        id: 'study-100h',
        name: 'חכם על',
        description: 'למד 100 שעות',
        icon: '🧠',
        condition: (stats) => stats.totalStudyTime >= 6000,
        target: 6000,
        getProgress: (stats) => stats.totalStudyTime,
        xp: 1000,
        category: 'study',
        quantifiable: true
      },

      // 🎯 ימים מושלמים - כמותיים
      {
        id: 'perfect-day-1',
        name: 'יום מושלם',
        description: 'השלם את כל המשימות של היום',
        icon: '✨',
        condition: (stats) => stats.perfectDays >= 1,
        target: 1,
        getProgress: (stats) => stats.perfectDays,
        xp: 50,
        category: 'perfect',
        quantifiable: true
      },
      {
        id: 'perfect-day-7',
        name: 'שבוע מצטיין',
        description: '7 ימים מושלמים',
        icon: '⭐✨',
        condition: (stats) => stats.perfectDays >= 7,
        target: 7,
        getProgress: (stats) => stats.perfectDays,
        xp: 200,
        category: 'perfect',
        quantifiable: true
      },
      {
        id: 'perfect-day-30',
        name: 'חודש של שלמות',
        description: '30 ימים מושלמים',
        icon: '🌟✨',
        condition: (stats) => stats.perfectDays >= 30,
        target: 30,
        getProgress: (stats) => stats.perfectDays,
        xp: 1000,
        category: 'perfect',
        quantifiable: true
      },

      // 🏃 מהירות - לא כמותיים
      {
        id: 'early-bird',
        name: 'ציפור מוקדמת',
        description: 'השלם משימה לפני השעה 8:00',
        icon: '🌅',
        condition: () => false,
        xp: 25,
        category: 'special',
        quantifiable: false
      },
      {
        id: 'night-owl',
        name: 'ינשוף לילה',
        description: 'השלם משימה אחרי 22:00',
        icon: '🦉',
        condition: () => false,
        xp: 25,
        category: 'special',
        quantifiable: false
      },
      {
        id: 'speed-demon',
        name: 'שד המהירות',
        description: 'השלם 5 משימות ביום אחד',
        icon: '⚡',
        condition: () => false,
        xp: 75,
        category: 'special',
        quantifiable: false
      },

      // 🎨 יצירתיות - לא כמותיים
      {
        id: 'color-master',
        name: 'אמן הצבעים',
        description: 'השתמש ב-10 צבעים שונים למקצועות',
        icon: '🎨',
        condition: () => false,
        xp: 50,
        category: 'creative',
        quantifiable: false
      },
      {
        id: 'organizer',
        name: 'מאורגן מקצועי',
        description: 'צור 5 תגיות שונות',
        icon: '🏷️',
        condition: () => false,
        xp: 30,
        category: 'creative',
        quantifiable: false
      },

      // 🌟 מיוחדים - לא כמותיים
      {
        id: 'comeback',
        name: 'חזרה מנצחת',
        description: 'חזור למערכת אחרי הפסקה של שבוע',
        icon: '💪',
        condition: () => false,
        xp: 100,
        category: 'special',
        quantifiable: false
      },
      {
        id: 'zero-hero',
        name: 'גיבור האפס',
        description: 'השלם את כל המשימות הממתינות',
        icon: '🎊',
        condition: () => false,
        xp: 150,
        category: 'special',
        quantifiable: false
      },

      // ── 📝 מבחנים (studentOnly) ──────────────────────────
      {
        id: 'exam-first',
        name: 'נכנס לאזור',
        description: 'סמן את המבחן הראשון כהסתיים',
        icon: '📋',
        condition: (stats) => (stats.totalExamsCompleted || 0) >= 1,
        target: 1,
        getProgress: (stats) => stats.totalExamsCompleted || 0,
        xp: 15,
        category: 'exams',
        studentOnly: true,
        quantifiable: true
      },
      {
        id: 'exam-5',
        name: 'ניגש לאתגרים',
        description: 'השלם 5 מבחנים',
        icon: '📝',
        condition: (stats) => (stats.totalExamsCompleted || 0) >= 5,
        target: 5,
        getProgress: (stats) => stats.totalExamsCompleted || 0,
        xp: 50,
        category: 'exams',
        studentOnly: true,
        quantifiable: true
      },
      {
        id: 'exam-20',
        name: 'ותיק הבחינות',
        description: 'השלם 20 מבחנים',
        icon: '🎓',
        condition: (stats) => (stats.totalExamsCompleted || 0) >= 20,
        target: 20,
        getProgress: (stats) => stats.totalExamsCompleted || 0,
        xp: 150,
        category: 'exams',
        studentOnly: true,
        quantifiable: true
      },
      {
        id: 'topics-10',
        name: 'מתחיל ללמוד',
        description: 'סמן 10 נושאים כנלמדו',
        icon: '✏️',
        condition: (stats) => (stats.totalTopicsDone || 0) >= 10,
        target: 10,
        getProgress: (stats) => stats.totalTopicsDone || 0,
        xp: 30,
        category: 'exams',
        studentOnly: true,
        quantifiable: true
      },
      {
        id: 'topics-50',
        name: 'לומד שקדן',
        description: 'סמן 50 נושאים כנלמדו',
        icon: '📖',
        condition: (stats) => (stats.totalTopicsDone || 0) >= 50,
        target: 50,
        getProgress: (stats) => stats.totalTopicsDone || 0,
        xp: 100,
        category: 'exams',
        studentOnly: true,
        quantifiable: true
      },
      {
        id: 'topics-200',
        name: 'אנציקלופדיה חיה',
        description: 'סמן 200 נושאים כנלמדו',
        icon: '🧠',
        condition: (stats) => (stats.totalTopicsDone || 0) >= 200,
        target: 200,
        getProgress: (stats) => stats.totalTopicsDone || 0,
        xp: 300,
        category: 'exams',
        studentOnly: true,
        quantifiable: true
      },
      {
        id: 'fully-prepared-1',
        name: 'מוכן לחלוטין',
        description: 'סיים ללמוד את כל הנושאים למבחן אחד',
        icon: '💪',
        condition: (stats) => (stats.fullyPreparedExams || 0) >= 1,
        target: 1,
        getProgress: (stats) => stats.fullyPreparedExams || 0,
        xp: 40,
        category: 'exams',
        studentOnly: true,
        quantifiable: true
      },
      {
        id: 'fully-prepared-5',
        name: 'מכונת הכנה',
        description: 'סיים ללמוד את כל הנושאים ל-5 מבחנים',
        icon: '🏋️',
        condition: (stats) => (stats.fullyPreparedExams || 0) >= 5,
        target: 5,
        getProgress: (stats) => stats.fullyPreparedExams || 0,
        xp: 120,
        category: 'exams',
        studentOnly: true,
        quantifiable: true
      },
      {
        id: 'exam-week-prep',
        name: 'מתכנן מבריק',
        description: 'הוסף מבחן עם יותר מ-7 נושאים',
        icon: '🗂️',
        condition: (stats) => (stats.maxTopicsInExam || 0) >= 7,
        target: 7,
        getProgress: (stats) => stats.maxTopicsInExam || 0,
        xp: 35,
        category: 'exams',
        studentOnly: true,
        quantifiable: true
      },
      {
        id: 'exam-ahead',
        name: 'מקדים תרופה',
        description: 'סמן מבחן כהסתיים לפני התאריך',
        icon: '⚡',
        condition: (stats) => (stats.earlyExams || 0) >= 1,
        target: 1,
        getProgress: (stats) => stats.earlyExams || 0,
        xp: 25,
        category: 'exams',
        studentOnly: true,
        quantifiable: false
      }
    ];

    console.log('🏆 initializeAchievements: Loaded', this.achievements.length, 'achievements (with progress tracking)');
  }

  // ==================== טעינה ושמירה ====================

  async loadStats() {
    console.log('📥 loadStats: Loading user stats...');
    try {
      const saved = await storage.get('gamification-stats');
      if (saved) {
        this.userStats = { ...this.userStats, ...saved };
        console.log('✅ loadStats: Stats loaded:', this.userStats);
      }

      const achievements = await storage.get('gamification-achievements');
      if (achievements) {
        this.unlockedAchievements = achievements;
        console.log('✅ loadStats: Achievements loaded:', this.unlockedAchievements.length);
      }

      this.updateStreak();
    } catch (error) {
      console.error('❌ loadStats: Error loading stats:', error);
    }
  }

  async saveStats() {
    console.log('💾 saveStats: Saving user stats...');
    try {
      await storage.set('gamification-stats', this.userStats);
      await storage.set('gamification-achievements', this.unlockedAchievements);
      console.log('✅ saveStats: Stats saved');
    } catch (error) {
      console.error('❌ saveStats: Error saving stats:', error);
    }
  }

  // ==================== רצף (Streak) ====================

  updateStreak() {
    console.log('🔥 updateStreak: Checking streak...');
    const today = new Date().toDateString();
    const lastDate = this.userStats.lastActivityDate;

    if (!lastDate) {
      console.log('🔥 updateStreak: No previous activity');
      return;
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    if (lastDate === yesterdayStr) {
      console.log('🔥 updateStreak: Streak continues');
    } else if (lastDate !== today) {
      console.log('💔 updateStreak: Streak broken');
      this.userStats.streak = 0;
    }
  }

  recordActivity() {
    console.log('📝 recordActivity: Recording activity...');
    const today = new Date().toDateString();
    const lastDate = this.userStats.lastActivityDate;

    if (lastDate !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toDateString();

      if (lastDate === yesterdayStr) {
        this.userStats.streak++;
        console.log('🔥 recordActivity: Streak increased to', this.userStats.streak);
      } else {
        this.userStats.streak = 1;
        console.log('🔥 recordActivity: New streak started');
      }

      if (this.userStats.streak > this.userStats.longestStreak) {
        this.userStats.longestStreak = this.userStats.streak;
        console.log('🏆 recordActivity: New longest streak!', this.userStats.longestStreak);
      }

      this.userStats.lastActivityDate = today;
      this.saveStats();
    }
  }

  // ==================== XP ורמות ====================

  addXP(amount, reason = '') {
    console.log(`✨ addXP: Adding ${amount} XP - ${reason}`);
    
    this.userStats.xp += amount;
    this.userStats.totalXP += amount;

    const xpForNextLevel = this.getXPForLevel(this.userStats.level + 1);
    
    if (this.userStats.xp >= xpForNextLevel) {
      this.levelUp();
    }

    this.saveStats();
    this.updateUI();

    if (notifications && notifications.showInAppNotification) {
      notifications.showInAppNotification(`+${amount} XP ${reason ? '- ' + reason : ''}`, 'success');
    }
  }

  removeXP(amount, reason = '') {
    console.log(`⏪ removeXP: Removing ${amount} XP - ${reason}`);
    
    this.userStats.xp -= amount;
    this.userStats.totalXP -= amount;

    if (this.userStats.xp < 0) {
      while (this.userStats.xp < 0 && this.userStats.level > 1) {
        this.levelDown();
      }
      
      if (this.userStats.xp < 0) {
        this.userStats.xp = 0;
      }
    }

    if (this.userStats.totalXP < 0) {
      this.userStats.totalXP = 0;
    }

    this.saveStats();
    this.updateUI();

    if (notifications && notifications.showInAppNotification) {
      notifications.showInAppNotification(`-${amount} XP ${reason ? '- ' + reason : ''}`, 'info');
    }
  }

  levelDown() {
    if (this.userStats.level <= 1) {
      this.userStats.level = 1;
      this.userStats.xp = 0;
      return;
    }

    this.userStats.level--;
    const xpForCurrentLevel = this.getXPForLevel(this.userStats.level + 1);
    this.userStats.xp += xpForCurrentLevel;
    
    console.log('⬇️ levelDown: Level decreased to', this.userStats.level);

    if (notifications && notifications.showInAppNotification) {
      notifications.showInAppNotification(`רמה ${this.userStats.level} 📉`, 'info');
    }

    this.saveStats();
  }

  getXPForLevel(level) {
    return Math.floor(100 * Math.pow(level, 1.5));
  }

  levelUp() {
    this.userStats.level++;
    this.userStats.xp = 0;
    
    console.log('🎉 levelUp: Level up to', this.userStats.level);

    this.showLevelUpAnimation();

    if (notifications && notifications.showInAppNotification) {
      notifications.showInAppNotification(
        `🎉 עלית לרמה ${this.userStats.level}! 🎊`,
        'success'
      );
    }

    this.saveStats();
  }

  showLevelUpAnimation() {
    const animation = document.createElement('div');
    animation.className = 'level-up-animation';
    animation.innerHTML = `
      <div class="level-up-content">
        <h1>🎉 LEVEL UP! 🎉</h1>
        <div class="level-up-number">${this.userStats.level}</div>
        <p>כל הכבוד! המשך כך!</p>
      </div>
    `;
    
    document.body.appendChild(animation);
    
    setTimeout(() => {
      animation.style.animation = 'fadeOut 0.5s ease-out';
      setTimeout(() => {
        if (document.body.contains(animation)) {
          document.body.removeChild(animation);
        }
      }, 500);
    }, 3000);
  }

  // ==================== הישגים ====================

  checkAchievements() {
    console.log('🏆 checkAchievements: Checking for new achievements...');
    
    let newAchievements = 0;
    
    for (const achievement of this.achievements) {
      if (this.unlockedAchievements.find(a => a.id === achievement.id)) {
        continue;
      }

      if (achievement.condition(this.userStats)) {
        this.unlockAchievement(achievement);
        newAchievements++;
      }
    }

    if (newAchievements > 0) {
      console.log(`✅ checkAchievements: Unlocked ${newAchievements} new achievements`);
    }
  }

  recheckAchievements() {
    console.log('🔄 recheckAchievements: Rechecking all achievements...');
    
    const achievementsToRemove = [];
    
    for (const unlockedAchievement of this.unlockedAchievements) {
      const achievement = this.achievements.find(a => a.id === unlockedAchievement.id);
      
      if (!achievement) continue;
      
      if (!achievement.condition(this.userStats)) {
        console.log(`⏪ recheckAchievements: Achievement "${achievement.name}" no longer valid`);
        achievementsToRemove.push(unlockedAchievement.id);
        
        this.removeXP(achievement.xp, `ביטול הישג: ${achievement.name}`);
      }
    }
    
    if (achievementsToRemove.length > 0) {
      this.unlockedAchievements = this.unlockedAchievements.filter(
        a => !achievementsToRemove.includes(a.id)
      );
      
      console.log(`✅ recheckAchievements: Removed ${achievementsToRemove.length} achievements`);
      
      if (notifications && notifications.showInAppNotification) {
        notifications.showInAppNotification(
          `⏪ ${achievementsToRemove.length} הישגים בוטלו`,
          'info'
        );
      }
      
      this.saveStats();
    }
  }

  unlockAchievement(achievement) {
    console.log('🎊 unlockAchievement: Unlocking', achievement.name);
    
    // Only save serializable data (no functions)
    this.unlockedAchievements.push({
      id: achievement.id,
      name: achievement.name,
      description: achievement.description,
      icon: achievement.icon,
      xp: achievement.xp,
      category: achievement.category,
      target: achievement.target,
      quantifiable: achievement.quantifiable,
      unlockedAt: new Date().toISOString()
    });

    this.addXP(achievement.xp, achievement.name);

    this.showAchievementNotification(achievement);

    this.saveStats();
  }

  showAchievementNotification(achievement) {
    const notification = document.createElement('div');
    notification.className = 'achievement-notification';
    notification.innerHTML = `
      <div class="achievement-notification-content">
        <div class="achievement-icon">${achievement.icon}</div>
        <div class="achievement-text">
          <h3>הישג חדש נפתח!</h3>
          <p><strong>${achievement.name}</strong></p>
          <p>${achievement.description}</p>
          <p class="achievement-xp">+${achievement.xp} XP</p>
        </div>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    this.playAchievementSound();
    
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.5s ease-out';
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 500);
    }, 5000);
  }

  playAchievementSound() {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      const notes = [
        { freq: 523.25, time: 0 },
        { freq: 659.25, time: 0.15 },
        { freq: 783.99, time: 0.3 },
        { freq: 1046.50, time: 0.45 }
      ];

      notes.forEach(note => {
        setTimeout(() => {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);

          oscillator.frequency.setValueAtTime(note.freq, audioContext.currentTime);
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.5);
        }, note.time * 1000);
      });
    } catch (error) {
      console.error('❌ playAchievementSound: Error playing sound:', error);
    }
  }

  // ==================== פונקציות עזר להישגים כמותיים ====================

  getAchievementProgress(achievement) {
    if (!achievement.quantifiable || !achievement.getProgress) {
      return null;
    }

    const current = achievement.getProgress(this.userStats);
    const target = achievement.target;
    const percentage = Math.min(100, Math.round((current / target) * 100));

    return {
      current,
      target,
      percentage
    };
  }

  // ==================== אירועים ====================

  onTaskCompleted(isEarly = false, tasksToday = 0) {
    console.log('✅ onTaskCompleted: Task completed');
    
    this.userStats.totalTasksCompleted++;
    this.recordActivity();
    
    this.addXP(10, 'השלמת משימה');

    if (isEarly) {
      this.addXP(5, 'בונוס מהירות');
    }

    const hour = new Date().getHours();
    if (hour < 8 && !this.unlockedAchievements.find(a => a.id === 'early-bird')) {
      this.unlockAchievement(this.achievements.find(a => a.id === 'early-bird'));
    }
    
    if (hour >= 22 && !this.unlockedAchievements.find(a => a.id === 'night-owl')) {
      this.unlockAchievement(this.achievements.find(a => a.id === 'night-owl'));
    }

    if (tasksToday >= 5 && !this.unlockedAchievements.find(a => a.id === 'speed-demon')) {
      this.unlockAchievement(this.achievements.find(a => a.id === 'speed-demon'));
    }

    this.checkAchievements();
    this.updateUI();
  }

  onStudyTimeAdded(minutes) {
    console.log(`⏰ onStudyTimeAdded: ${minutes} minutes of study`);
    
    this.userStats.totalStudyTime += minutes;
    this.addXP(Math.floor(minutes / 5), 'זמן לימוד');
    this.checkAchievements();
  }

  onExamCompleted(exam) {
    if (!exam) return;
    this.userStats.totalExamsCompleted = (this.userStats.totalExamsCompleted || 0) + 1;
    // בדיקה אם לפני המועד
    const daysLeft = (() => {
      const today = new Date(); today.setHours(0,0,0,0);
      const due = new Date(exam.date + 'T00:00:00');
      return Math.round((due - today) / 86400000);
    })();
    if (daysLeft > 0) {
      this.userStats.earlyExams = (this.userStats.earlyExams || 0) + 1;
      this.addXP(15, 'מבחן הושלם לפני הזמן');
    } else {
      this.addXP(20, 'מבחן הושלם');
    }
    this.checkAchievements();
    this.saveStats();
  }

  onTopicDone(exam) {
    this.userStats.totalTopicsDone = (this.userStats.totalTopicsDone || 0) + 1;
    // עדכון fullyPrepared
    if (exam && (exam.topics || []).length > 0 && exam.topics.every(t => t.done)) {
      this.userStats.fullyPreparedExams = (this.userStats.fullyPreparedExams || 0) + 1;
      this.addXP(10, 'מבחן מוכן לחלוטין');
    } else {
      this.addXP(2, 'נושא נלמד');
    }
    this.checkAchievements();
    this.saveStats();
  }

  onTopicUndone() {
    this.userStats.totalTopicsDone = Math.max(0, (this.userStats.totalTopicsDone || 0) - 1);
    this.checkAchievements();
    this.saveStats();
  }

  onExamAdded(exam) {
    const topics = (exam && exam.topics) ? exam.topics.length : 0;
    if (topics > (this.userStats.maxTopicsInExam || 0)) {
      this.userStats.maxTopicsInExam = topics;
    }
    this.checkAchievements();
    this.saveStats();
  }

  // ==================== ממשק משתמש ====================

  updateUI() {
    const levelEl = document.getElementById('user-level');
    if (levelEl) {
      levelEl.textContent = this.userStats.level;
    }

    const xpEl = document.getElementById('user-xp');
    if (xpEl) {
      const xpForNext = this.getXPForLevel(this.userStats.level + 1);
      xpEl.textContent = `${this.userStats.xp} / ${xpForNext}`;
    }

    const progressBar = document.getElementById('xp-progress');
    if (progressBar) {
      const xpForNext = this.getXPForLevel(this.userStats.level + 1);
      const progress = (this.userStats.xp / xpForNext) * 100;
      progressBar.style.width = `${progress}%`;
    }

    const streakEl = document.getElementById('user-streak');
    if (streakEl) {
      streakEl.textContent = this.userStats.streak;
    }
  }

  renderGamificationPanel() {
    console.log('🎨 renderGamificationPanel: Rendering panel with progress bars...');
    
    const panel = document.getElementById('gamification-panel');
    if (!panel) {
      console.warn('⚠️ renderGamificationPanel: Panel not found');
      return;
    }

    const xpForNext = this.getXPForLevel(this.userStats.level + 1);
    const xpProgress = (this.userStats.xp / xpForNext) * 100;

    const categories = {
      tasks: { name: 'משימות', icon: '🎯' },
      streaks: { name: 'רצפים', icon: '🔥' },
      study: { name: 'לימוד', icon: '📚' },
      perfect: { name: 'ימים מושלמים', icon: '✨' },
      special: { name: 'מיוחדים', icon: '🌟' },
      creative: { name: 'יצירתיות', icon: '🎨' },
      exams: { name: 'מבחנים', icon: '📝', studentOnly: true }
    };

    // בדיקת מצב תלמיד
    const isStudent = (() => {
      try {
        const s = JSON.parse(localStorage.getItem('homework-settings') || '{}');
        return s.studentMode !== false;
      } catch { return true; }
    })();

    let achievementsHTML = '';
    
    Object.keys(categories).forEach(catKey => {
      const cat = categories[catKey];
      // הסתר קטגוריות studentOnly אם לא במצב תלמיד
      if (cat.studentOnly && !isStudent) return;

      const catAchievements = this.achievements.filter(a => a.category === catKey);
      const unlocked = catAchievements.filter(a => 
        this.unlockedAchievements.find(u => u.id === a.id)
      ).length;

      achievementsHTML += `
        <div class="achievement-category">
          <h4>${cat.icon} ${cat.name} (${unlocked}/${catAchievements.length})</h4>
          <div class="achievements-grid">
            ${catAchievements.map(achievement => {
              const isUnlocked = this.unlockedAchievements.find(a => a.id === achievement.id);
              const progress = this.getAchievementProgress(achievement);
              
              return `
                <div class="achievement-card ${isUnlocked ? 'unlocked' : 'locked'}" 
                     ${progress ? `title="${progress.current}/${progress.target} (${progress.percentage}%)"` : ''}>
                  <div class="achievement-icon">${achievement.icon}</div>
                  <div class="achievement-name">${achievement.name}</div>
                  <div class="achievement-desc">${achievement.description}</div>
                  
                  ${progress ? `
                    <div class="achievement-progress">
                      <div class="achievement-progress-bar">
                        <div class="achievement-progress-fill" style="width: ${progress.percentage}%"></div>
                      </div>
                      <div class="achievement-progress-text">${progress.current}/${progress.target} (${progress.percentage}%)</div>
                    </div>
                  ` : ''}
                  
                  <div class="achievement-xp">${achievement.xp} XP</div>
                  ${isUnlocked ? `<div class="achievement-unlocked">✓</div>${isUnlocked.unlockedAt ? `<div class="achievement-date">🗓️ ${new Date(isUnlocked.unlockedAt).toLocaleDateString('he-IL')}</div>` : ''}` : ''}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    });

    panel.innerHTML = `
      <h2>🏆 הישגים ומשחוק</h2>
      
      <div class="gamification-stats">
        <div class="gamification-stat">
          <div class="stat-icon">🎯</div>
          <div class="stat-value" id="user-level">${this.userStats.level}</div>
          <div class="stat-label">רמה</div>
        </div>
        <div class="gamification-stat">
          <div class="stat-icon">⚡</div>
          <div class="stat-value" id="user-xp">${this.userStats.xp} / ${xpForNext}</div>
          <div class="stat-label">ניסיון</div>
        </div>
        <div class="gamification-stat">
          <div class="stat-icon">🔥</div>
          <div class="stat-value" id="user-streak">${this.userStats.streak}</div>
          <div class="stat-label">רצף ימים</div>
        </div>
        <div class="gamification-stat">
          <div class="stat-icon">✨</div>
          <div class="stat-value">${this.userStats.perfectDayStreak || 0}</div>
          <div class="stat-label">רצף ימים מושלמים</div>
        </div>
        <div class="gamification-stat">
          <div class="stat-icon">🏅</div>
          <div class="stat-value">${this.unlockedAchievements.length}</div>
          <div class="stat-label">הישגים</div>
        </div>
      </div>

      <div class="xp-progress-container">
        <div class="xp-progress-bar">
          <div class="xp-progress-fill" id="xp-progress" style="width: ${xpProgress}%"></div>
        </div>
        <div class="xp-progress-text">
          ${xpForNext - this.userStats.xp} XP עד רמה ${this.userStats.level + 1}
        </div>
      </div>

      <div class="achievements-container">
        ${achievementsHTML}
      </div>
    `;

    console.log('✅ renderGamificationPanel: Panel rendered with progress tracking');
  }
}

// יצירת אובייקט גלובלי
console.log('🏆 Creating global gamification manager...');
const gamification = new GamificationManager();
console.log('✅ Global gamification manager created');

// אתחול
window.addEventListener('DOMContentLoaded', async () => {
  console.log('🏆 gamification.js: Initializing...');
  await gamification.loadStats();
  
  const panel = document.getElementById('gamification-panel');
  if (panel) {
    gamification.renderGamificationPanel();
  }
  
  gamification.updateUI();
  console.log('✅ gamification.js: Initialized with progress tracking');
});
// ============================================================
// 📝 Exam Analytics Module — סטטיסטיקות ואנליטיקה מבחנים
// ============================================================

class ExamAnalytics {
  constructor() {
    this.charts = {};
    console.log('📝 ExamAnalytics: Initialized');
  }

  // ── נתונים ──────────────────────────────────────────────

  async loadData() {
    const exams    = await storage.get('exams-list')       || [];
    const subjects = await storage.get('homework-subjects') || [];
    const settings = await storage.get('homework-settings') || {};
    return { exams, subjects, settings };
  }

  getDaysUntilDue(dateStr) {
    const today = new Date(); today.setHours(0,0,0,0);
    const due   = new Date(dateStr + 'T00:00:00');
    return Math.round((due - today) / 86400000);
  }

  // ── ניתוחים ─────────────────────────────────────────────

  analyze(exams, subjects) {
    const total     = exams.length;
    const completed = exams.filter(e => e.completed).length;
    const upcoming  = exams.filter(e => !e.completed && this.getDaysUntilDue(e.date) >= 0).length;
    const overdue   = exams.filter(e => !e.completed && this.getDaysUntilDue(e.date) < 0).length;
    const thisWeek  = exams.filter(e => !e.completed && this.getDaysUntilDue(e.date) >= 0 && this.getDaysUntilDue(e.date) <= 7).length;

    // נושאים
    let totalTopics = 0, doneTopics = 0;
    exams.forEach(e => {
      (e.topics || []).forEach(t => { totalTopics++; if (t.done) doneTopics++; });
    });
    const topicPct = totalTopics ? Math.round((doneTopics / totalTopics) * 100) : 0;

    // ציונים — רק מבחנים עם ציון סופי
    const graded = exams.filter(e => e.gradeFinal !== null && e.gradeFinal !== undefined);
    const avgGrade    = graded.length ? Math.round(graded.reduce((s, e) => s + e.gradeFinal, 0) / graded.length) : null;
    const avgExpected = exams.filter(e => e.gradeExpected !== null && e.gradeExpected !== undefined).length
      ? Math.round(exams.filter(e => e.gradeExpected != null).reduce((s,e) => s + e.gradeExpected, 0) / exams.filter(e => e.gradeExpected != null).length) : null;
    const maxGrade    = graded.length ? Math.max(...graded.map(e => e.gradeFinal)) : null;
    const minGrade    = graded.length ? Math.min(...graded.map(e => e.gradeFinal)) : null;
    const avgPct      = graded.length ? Math.round(graded.reduce((s,e) => s + (e.gradePct || Math.round((e.gradeFinal/(e.gradeMax||100))*100)), 0) / graded.length) : null;

    // התפלגות ציונים
    const gradeDist = { '90–100': 0, '80–89': 0, '70–79': 0, '55–69': 0, 'מתחת 55': 0 };
    graded.forEach(e => {
      const p = e.gradePct || Math.round((e.gradeFinal/(e.gradeMax||100))*100);
      if (p >= 90) gradeDist['90–100']++;
      else if (p >= 80) gradeDist['80–89']++;
      else if (p >= 70) gradeDist['70–79']++;
      else if (p >= 55) gradeDist['55–69']++;
      else gradeDist['מתחת 55']++;
    });

    // לפי מקצוע
    const bySubject = {};
    exams.forEach(e => {
      const sub = subjects.find(s => s.id == e.subject);
      const key = sub ? sub.name : 'ללא מקצוע';
      const color = sub ? sub.color : '#9ca3af';
      if (!bySubject[key]) bySubject[key] = { name: key, color, total: 0, completed: 0, topics: 0, topicsDone: 0, grades: [] };
      bySubject[key].total++;
      if (e.completed) bySubject[key].completed++;
      (e.topics || []).forEach(t => { bySubject[key].topics++; if (t.done) bySubject[key].topicsDone++; });
      if (e.gradeFinal !== null && e.gradeFinal !== undefined) bySubject[key].grades.push(e.gradeFinal);
    });
    // ממוצע ציון לפי מקצוע
    Object.values(bySubject).forEach(s => {
      s.avgGrade = s.grades.length ? Math.round(s.grades.reduce((a,b)=>a+b,0)/s.grades.length) : null;
    });

    // לפי חודש
    const byMonth = {};
    exams.forEach(e => {
      const m = e.date ? e.date.slice(0, 7) : null;
      if (!m) return;
      if (!byMonth[m]) byMonth[m] = { label: this.monthLabel(m), total: 0, completed: 0 };
      byMonth[m].total++;
      if (e.completed) byMonth[m].completed++;
    });

    // עומס שבועי
    const loadByWeek = {};
    exams.filter(e => !e.completed).forEach(e => {
      const d = this.getDaysUntilDue(e.date);
      if (d < 0 || d > 56) return;
      const week = Math.floor(d / 7);
      const label = week === 0 ? 'השבוע' : `בעוד ${week} שב'`;
      if (!loadByWeek[label]) loadByWeek[label] = { label, count: 0, week };
      loadByWeek[label].count++;
    });

    // מבחן הכי קרוב
    const nextExam = exams
      .filter(e => !e.completed && this.getDaysUntilDue(e.date) >= 0)
      .sort((a, b) => new Date(a.date) - new Date(b.date))[0] || null;

    const avgTopics = total ? (totalTopics / total).toFixed(1) : 0;
    const fullyPrepared = exams.filter(e => {
      if (e.completed || (e.topics || []).length === 0) return false;
      return e.topics.every(t => t.done);
    }).length;

    return {
      total, completed, upcoming, overdue, thisWeek,
      totalTopics, doneTopics, topicPct,
      avgGrade, avgExpected, maxGrade, minGrade, avgPct, graded: graded.length, gradeDist,
      bySubject: Object.values(bySubject),
      byMonth: Object.values(byMonth).sort((a,b) => a.label < b.label ? -1 : 1),
      loadByWeek: Object.values(loadByWeek).sort((a,b) => a.week - b.week),
      nextExam, avgTopics, fullyPrepared,
      completionRate: total ? Math.round((completed / total) * 100) : 0
    };
  }

  monthLabel(ym) {
    const [y, m] = ym.split('-');
    const names = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
    return `${names[parseInt(m) - 1]} ${y}`;
  }

  generateInsights(data, subjects) {
    const insights = [];
    const { total, completed, upcoming, overdue, thisWeek, topicPct, nextExam, fullyPrepared, completionRate, bySubject, avgTopics } = data;

    if (total === 0) return '<div class="ea-insight info">📝 עדיין אין מבחנים מוגדרים. הוסף מבחנים כדי לראות תובנות!</div>';

    if (thisWeek > 0) insights.push(`<div class="ea-insight danger">🔥 יש לך <strong>${thisWeek} מבחן${thisWeek > 1 ? 'ים' : ''}</strong> השבוע — התחל ללמוד עכשיו!</div>`);
    if (overdue > 0)  insights.push(`<div class="ea-insight warning">⚠️ <strong>${overdue} מבחן${overdue > 1 ? 'ים' : ''}</strong> עברו מבלי שסומנו כהסתיים — בדוק את הסטטוס.</div>`);

    if (nextExam) {
      const d = this.getDaysUntilDue(nextExam.date);
      const sub = subjects.find(s => s.id == nextExam.subject);
      const pct = (nextExam.topics||[]).length ? Math.round((nextExam.topics.filter(t=>t.done).length / nextExam.topics.length)*100) : null;
      const subName = sub ? sub.name : '';
      if (d === 0) insights.push(`<div class="ea-insight danger">📅 המבחן הקרוב ביותר — <strong>${nextExam.title}${subName ? ' ('+subName+')' : ''}</strong> — <strong>היום!</strong>${pct !== null ? ` כיסית ${pct}% מהחומר.` : ''}</div>`);
      else if (d <= 3) insights.push(`<div class="ea-insight warning">📅 המבחן <strong>${nextExam.title}${subName ? ' ('+subName+')' : ''}</strong> בעוד <strong>${d} ימים</strong>.${pct !== null ? ` כיסית ${pct}% מהחומר.` : ''}</div>`);
      else insights.push(`<div class="ea-insight info">📅 המבחן הקרוב: <strong>${nextExam.title}</strong> — עוד ${d} ימים.${pct !== null ? ` כיסית ${pct}% מהחומר.` : ''}</div>`);
    }

    if (topicPct >= 80) insights.push(`<div class="ea-insight success">✅ כיסית <strong>${topicPct}%</strong> מסך הנושאים — הכנה מצוינת!</div>`);
    else if (topicPct > 0 && topicPct < 40) insights.push(`<div class="ea-insight warning">📖 כיסית רק <strong>${topicPct}%</strong> מהנושאים — יש עוד הרבה לעשות.</div>`);

    if (fullyPrepared > 0) insights.push(`<div class="ea-insight success">🏆 <strong>${fullyPrepared} מבחן${fullyPrepared > 1 ? 'ים' : ''}</strong> מוכנים לחלוטין — כל הנושאים סומנו!</div>`);

    if (completionRate >= 70 && completed > 0) insights.push(`<div class="ea-insight success">🎓 סיימת <strong>${completionRate}%</strong> מהמבחנים שלך — עמל משתלם!</div>`);

    if (bySubject.length > 0) {
      const heaviest = [...bySubject].sort((a,b) => b.total - a.total)[0];
      if (heaviest.total >= 2) insights.push(`<div class="ea-insight info">📚 המקצוע עם הכי הרבה מבחנים: <strong>${heaviest.name}</strong> (${heaviest.total} מבחנים).</div>`);
    }

    if (parseFloat(avgTopics) >= 5) insights.push(`<div class="ea-insight info">🗂 ממוצע <strong>${avgTopics} נושאים</strong> למבחן — תוכנית לימוד מפורטת!</div>`);

    return insights.join('') || '<div class="ea-insight info">💡 המשך להוסיף מבחנים ולסמן נושאים כדי לקבל תובנות מותאמות.</div>';
  }

  // ── רינדור ──────────────────────────────────────────────

  async render() {
    const panel = document.getElementById('exam-analytics-panel');
    if (!panel) return;

    const { exams, subjects, settings } = await this.loadData();

    if (settings.studentMode === false) {
      panel.style.display = 'none';
      return;
    }
    panel.style.display = '';

    if (exams.length === 0) {
      panel.innerHTML = `
        <h2>📝 אנליטיקה — מבחנים</h2>
        <div style="text-align:center;padding:3rem 1rem;color:#9ca3af;">
          <div style="font-size:3rem;margin-bottom:1rem;">📋</div>
          <p style="font-size:1.1rem;">עדיין לא הוספת מבחנים.<br>הוסף מבחן מהמסך הראשי כדי לראות סטטיסטיקות.</p>
        </div>`;
      return;
    }

    const d = this.analyze(exams, subjects);

    panel.innerHTML = `
      <h2>📝 אנליטיקה — מבחנים</h2>

      <!-- KPI Row -->
      <div class="ea-kpi-row">
        ${this.kpi('📝', d.total, 'מבחנים', '#7c3aed')}
        ${this.kpi('🗓️', d.upcoming, 'קרובים', '#3b82f6')}
        ${this.kpi('⚡', d.thisWeek, 'השבוע', d.thisWeek > 0 ? '#f59e0b' : '#10b981')}
        ${this.kpi('✅', d.completed, 'הסתיימו', '#10b981')}
        ${this.kpi('⚠️', d.overdue, 'עברו', d.overdue > 0 ? '#ef4444' : '#6b7280')}
        ${this.kpi('🎓', d.completionRate + '%', 'שיעור סיום', '#8b5cf6')}
      </div>

      <!-- Grade Stats -->
      ${d.graded > 0 ? `
      <div class="ea-section">
        <h3>📊 סטטיסטיקות ציונים (${d.graded} מבחנים עם ציון)</h3>
        <div class="ea-grade-kpis">
          ${this.gradeKpi('ממוצע', d.avgGrade, d.avgPct)}
          ${this.gradeKpi('מקסימום', d.maxGrade, null)}
          ${this.gradeKpi('מינימום', d.minGrade, null)}
          ${d.avgExpected !== null ? this.gradeKpi('ממוצע משוער', d.avgExpected, null) : ''}
        </div>
        <div class="ea-chart-wrap-wide" style="height:160px;margin-top:1rem;">
          <canvas id="ea-dist-chart"></canvas>
        </div>
      </div>` : ''}

      <!-- Grade per subject -->
      ${d.bySubject.some(s => s.avgGrade !== null) ? `
      <div class="ea-section">
        <h3>📚 ממוצע ציון לפי מקצוע</h3>
        <div class="ea-chart-wrap-wide" style="height:${Math.max(120, d.bySubject.length * 40)}px;">
          <canvas id="ea-grade-subject-chart"></canvas>
        </div>
      </div>` : ''}

      <!-- Grades table -->
      ${d.graded > 0 ? `
      <div class="ea-section">
        <h3>📋 טבלת ציונים</h3>
        <div style="overflow-x:auto;">
          <table class="ea-grades-table">
            <thead>
              <tr>
                <th>מבחן</th><th>מקצוע</th><th>תאריך</th><th>סוג</th><th>מועד</th>
                <th>ציון</th><th>בונוס</th><th>תיקון</th><th>סופי</th><th>מקס</th><th>%</th><th>משקל</th>
              </tr>
            </thead>
            <tbody>
              ${[...exams].filter(e => e.gradeFinal !== null && e.gradeFinal !== undefined)
                .sort((a,b) => new Date(b.date)-new Date(a.date))
                .map(e => {
                  const sub = subjects.find(s => s.id == e.subject);
                  const pct = e.gradePct ?? (e.gradeFinal !== null ? Math.round((e.gradeFinal/(e.gradeMax||100))*100) : null);
                  const pctColor = pct >= 90 ? '#16a34a' : pct >= 75 ? '#2563eb' : pct >= 55 ? '#d97706' : '#dc2626';
                  const typeLabels = {exam:'מבחן',work:'עבודה',quiz:'בוחן',oral:'בע"פ',project:'פרויקט',other:'אחר'};
                  return `<tr>
                    <td><strong>${e.title}</strong>${e.link ? ` <a href="${e.link}" target="_blank" style="color:#7c3aed;font-size:0.75rem;">🔗</a>` : ''}</td>
                    <td>${sub ? `<span style="display:inline-block;padding:2px 6px;background:${sub.color};color:#fff;border-radius:4px;font-size:0.72rem;">${sub.name}</span>` : '—'}</td>
                    <td style="white-space:nowrap;">${new Date(e.date).toLocaleDateString('he-IL')}</td>
                    <td>${typeLabels[e.type] || '—'}</td>
                    <td>${e.term ? 'מועד '+e.term : '—'}</td>
                    <td>${e.grade ?? '—'}</td>
                    <td>${e.gradeBonus || '—'}</td>
                    <td>${e.gradeCorrection ?? '—'}</td>
                    <td><strong>${e.gradeFinal}</strong></td>
                    <td>${e.gradeMax || 100}</td>
                    <td><strong style="color:${pctColor}">${pct}%</strong></td>
                    <td>${e.weight ? e.weight+'%' : '—'}</td>
                  </tr>`;
                }).join('')}
            </tbody>
          </table>
        </div>
      </div>` : ''}

      <!-- Topic Preparation Bar -->
      <div class="ea-section">
        <h3>📖 הכנה לנושאים</h3>
        <div class="ea-prep-row">
          <div class="ea-prep-labels">
            <span>${d.doneTopics} נושאים נלמדו</span>
            <span style="font-weight:700;color:#7c3aed;">${d.topicPct}%</span>
            <span>${d.totalTopics - d.doneTopics} נשארו</span>
          </div>
          <div class="ea-big-progress">
            <div class="ea-big-progress-fill" style="width:${d.topicPct}%;"></div>
          </div>
          <div class="ea-prep-sub">מתוך ${d.totalTopics} נושאים סה"כ • ממוצע ${d.avgTopics} נושאים למבחן</div>
        </div>
      </div>

      <!-- Charts Row -->
      <div class="ea-charts-row">
        <div class="ea-chart-card">
          <h3>🎯 סטטוס מבחנים</h3>
          <div class="ea-chart-wrap"><canvas id="ea-status-chart"></canvas></div>
        </div>
        <div class="ea-chart-card">
          <h3>📚 מבחנים לפי מקצוע</h3>
          <div class="ea-chart-wrap"><canvas id="ea-subject-chart"></canvas></div>
        </div>
        <div class="ea-chart-card">
          <h3>📖 הכנה לפי מקצוע</h3>
          <div class="ea-chart-wrap"><canvas id="ea-prep-chart"></canvas></div>
        </div>
      </div>

      <!-- Timeline / Load -->
      ${d.loadByWeek.length > 0 ? `
      <div class="ea-section">
        <h3>📅 עומס מבחנים קרובים</h3>
        <div class="ea-chart-wrap-wide"><canvas id="ea-load-chart"></canvas></div>
      </div>` : ''}

      ${d.byMonth.length > 0 ? `
      <div class="ea-section">
        <h3>📆 מבחנים לפי חודש</h3>
        <div class="ea-chart-wrap-wide"><canvas id="ea-month-chart"></canvas></div>
      </div>` : ''}

      <!-- Per-exam preparation breakdown -->
      ${d.upcoming > 0 ? `
      <div class="ea-section">
        <h3>🏋️ פירוט הכנה לפי מבחן</h3>
        <div class="ea-exam-breakdown">
          ${exams
            .filter(e => !e.completed && this.getDaysUntilDue(e.date) >= 0)
            .sort((a,b) => new Date(a.date) - new Date(b.date))
            .map(e => this.examBreakdownCard(e, subjects)).join('')}
        </div>
      </div>` : ''}

      <!-- Insights -->
      <div class="ea-section">
        <h3>💡 תובנות חכמות</h3>
        <div class="ea-insights">${this.generateInsights(d, subjects)}</div>
      </div>
    `;

    // יצירת גרפים
    setTimeout(() => {
      this.createStatusChart(d);
      this.createSubjectChart(d);
      this.createPrepChart(d);
      if (d.loadByWeek.length > 0) this.createLoadChart(d);
      if (d.byMonth.length > 0)   this.createMonthChart(d);
      if (d.graded > 0)           this.createDistChart(d);
      if (d.bySubject.some(s => s.avgGrade !== null)) this.createGradeSubjectChart(d);
    }, 100);
  }

  gradeKpi(label, value, pct) {
    if (value === null || value === undefined) return '';
    const color = pct !== null ? (pct >= 90 ? '#16a34a' : pct >= 75 ? '#2563eb' : pct >= 55 ? '#d97706' : '#dc2626') : '#7c3aed';
    return `<div class="ea-grade-kpi" style="--gk:${color};">
      <div class="ea-grade-kpi-val">${value}</div>
      ${pct !== null ? `<div class="ea-grade-kpi-pct">${pct}%</div>` : ''}
      <div class="ea-grade-kpi-label">${label}</div>
    </div>`;
  }

  kpi(icon, value, label, color) {
    return `
      <div class="ea-kpi" style="--kpi-color:${color};">
        <div class="ea-kpi-icon">${icon}</div>
        <div class="ea-kpi-value">${value}</div>
        <div class="ea-kpi-label">${label}</div>
      </div>`;
  }

  examBreakdownCard(exam, subjects) {
    const sub     = subjects.find(s => s.id == exam.subject);
    const total   = (exam.topics || []).length;
    const done    = (exam.topics || []).filter(t => t.done).length;
    const pct     = total ? Math.round((done / total) * 100) : null;
    const days    = this.getDaysUntilDue(exam.date);
    const urgency = days === 0 ? 'danger' : days <= 3 ? 'warning' : 'ok';
    const daysStr = days === 0 ? 'היום!' : days === 1 ? 'מחר' : `${days} ימים`;
    const color   = sub ? sub.color : '#8b5cf6';

    return `
      <div class="ea-breakdown-card ea-bd-${urgency}" style="border-right:4px solid ${color};">
        <div class="ea-bd-header">
          <span class="ea-bd-title">${exam.title}</span>
          ${sub ? `<span class="ea-bd-sub" style="background:${color};">${sub.name}</span>` : ''}
          <span class="ea-bd-days ea-bd-${urgency}">${daysStr}</span>
        </div>
        ${pct !== null ? `
          <div class="ea-bd-progress-row">
            <div class="ea-bd-bar"><div class="ea-bd-fill" style="width:${pct}%;background:${color};"></div></div>
            <span class="ea-bd-pct">${pct}%</span>
          </div>
          <div class="ea-bd-topics">
            ${(exam.topics || []).map(t => `
              <span class="ea-topic-pill ${t.done ? 'done' : ''}">${t.name}</span>
            `).join('')}
          </div>` : '<div style="color:#9ca3af;font-size:0.8rem;margin-top:0.4rem;">לא הוגדרו נושאים</div>'}
      </div>`;
  }

  // ── גרפים ──────────────────────────────────────────────

  destroyChart(id) { if (this.charts[id]) { this.charts[id].destroy(); delete this.charts[id]; } }

  chartDefaults() {
    const isDark = document.body.classList.contains('dark-mode');
    return {
      text: isDark ? '#e5e7eb' : '#374151',
      grid: isDark ? '#374151' : '#e5e7eb',
    };
  }

  createStatusChart(d) {
    this.destroyChart('status');
    const ctx = document.getElementById('ea-status-chart');
    if (!ctx) return;
    const { text } = this.chartDefaults();
    this.charts.status = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['הסתיימו', 'קרובים', 'עברו'],
        datasets: [{
          data: [d.completed, d.upcoming, d.overdue],
          backgroundColor: ['#10b981', '#7c3aed', '#ef4444'],
          borderWidth: 3,
          borderColor: document.body.classList.contains('dark-mode') ? '#1e293b' : '#fff',
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: true,
        cutout: '65%',
        plugins: {
          legend: { position: 'bottom', labels: { color: text, padding: 12, font: { size: 12 } } },
          tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed}` } }
        }
      }
    });
  }

  createSubjectChart(d) {
    this.destroyChart('subject');
    const ctx = document.getElementById('ea-subject-chart');
    if (!ctx || d.bySubject.length === 0) return;
    const { text, grid } = this.chartDefaults();
    this.charts.subject = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: d.bySubject.map(s => s.name),
        datasets: [{
          label: 'מבחנים',
          data: d.bySubject.map(s => s.total),
          backgroundColor: d.bySubject.map(s => s.color + 'cc'),
          borderColor: d.bySubject.map(s => s.color),
          borderWidth: 2,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: text }, grid: { color: grid } },
          y: { ticks: { color: text, stepSize: 1 }, grid: { color: grid }, beginAtZero: true }
        }
      }
    });
  }

  createPrepChart(d) {
    this.destroyChart('prep');
    const ctx = document.getElementById('ea-prep-chart');
    if (!ctx || d.bySubject.length === 0) return;
    const { text, grid } = this.chartDefaults();
    const prepared = d.bySubject.filter(s => s.topics > 0);
    if (prepared.length === 0) return;
    this.charts.prep = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: prepared.map(s => s.name),
        datasets: [
          { label: 'נלמדו', data: prepared.map(s => s.topicsDone), backgroundColor: '#10b981cc', borderColor: '#10b981', borderWidth: 2, borderRadius: 6 },
          { label: 'נשארו', data: prepared.map(s => s.topics - s.topicsDone), backgroundColor: '#7c3aed33', borderColor: '#7c3aed', borderWidth: 2, borderRadius: 6 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: true,
        plugins: { legend: { position: 'bottom', labels: { color: text } } },
        scales: {
          x: { stacked: true, ticks: { color: text }, grid: { color: grid } },
          y: { stacked: true, ticks: { color: text, stepSize: 1 }, grid: { color: grid }, beginAtZero: true }
        }
      }
    });
  }

  createLoadChart(d) {
    this.destroyChart('load');
    const ctx = document.getElementById('ea-load-chart');
    if (!ctx) return;
    const { text, grid } = this.chartDefaults();
    const colors = d.loadByWeek.map(w => w.count >= 3 ? '#ef444488' : w.count >= 2 ? '#f59e0b88' : '#7c3aed88');
    const borders = d.loadByWeek.map(w => w.count >= 3 ? '#ef4444' : w.count >= 2 ? '#f59e0b' : '#7c3aed');
    this.charts.load = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: d.loadByWeek.map(w => w.label),
        datasets: [{ label: 'מבחנים', data: d.loadByWeek.map(w => w.count), backgroundColor: colors, borderColor: borders, borderWidth: 2, borderRadius: 8 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y} מבחנים` } } },
        scales: {
          x: { ticks: { color: text }, grid: { color: grid } },
          y: { ticks: { color: text, stepSize: 1 }, grid: { color: grid }, beginAtZero: true }
        }
      }
    });
  }

  createMonthChart(d) {
    this.destroyChart('month');
    const ctx = document.getElementById('ea-month-chart');
    if (!ctx) return;
    const { text, grid } = this.chartDefaults();
    this.charts.month = new Chart(ctx, {
      type: 'line',
      data: {
        labels: d.byMonth.map(m => m.label),
        datasets: [
          { label: 'כל המבחנים', data: d.byMonth.map(m => m.total), borderColor: '#7c3aed', backgroundColor: '#7c3aed22', tension: 0.4, fill: true, pointRadius: 5, pointBackgroundColor: '#7c3aed' },
          { label: 'הסתיימו', data: d.byMonth.map(m => m.completed), borderColor: '#10b981', backgroundColor: 'transparent', tension: 0.4, pointRadius: 5, pointBackgroundColor: '#10b981' }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { color: text } } },
        scales: {
          x: { ticks: { color: text }, grid: { color: grid } },
          y: { ticks: { color: text, stepSize: 1 }, grid: { color: grid }, beginAtZero: true }
        }
      }
    });
  }

  createDistChart(d) {
    this.destroyChart('dist');
    const ctx = document.getElementById('ea-dist-chart');
    if (!ctx) return;
    const { text, grid } = this.chartDefaults();
    const labels = Object.keys(d.gradeDist);
    const colors = ['#16a34a','#2563eb','#7c3aed','#d97706','#dc2626'];
    this.charts.dist = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{ label: 'מבחנים', data: labels.map(l => d.gradeDist[l]), backgroundColor: colors.map(c => c+'bb'), borderColor: colors, borderWidth: 2, borderRadius: 8 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y} מבחנים` } } },
        scales: {
          x: { ticks: { color: text }, grid: { color: grid } },
          y: { ticks: { color: text, stepSize: 1 }, grid: { color: grid }, beginAtZero: true }
        }
      }
    });
  }

  createGradeSubjectChart(d) {
    this.destroyChart('gradeSubject');
    const ctx = document.getElementById('ea-grade-subject-chart');
    if (!ctx) return;
    const { text, grid } = this.chartDefaults();
    const filtered = d.bySubject.filter(s => s.avgGrade !== null);
    this.charts.gradeSubject = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: filtered.map(s => s.name),
        datasets: [{
          label: 'ממוצע ציון',
          data: filtered.map(s => s.avgGrade),
          backgroundColor: filtered.map(s => s.color + 'bb'),
          borderColor: filtered.map(s => s.color),
          borderWidth: 2,
          borderRadius: 6
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.x}` } } },
        scales: {
          x: { ticks: { color: text }, grid: { color: grid }, min: 0, max: 100 },
          y: { ticks: { color: text }, grid: { color: grid } }
        }
      }
    });
  }
}

// ── CSS מוטמע ─────────────────────────────────────────────
(function injectCSS() {
  const style = document.createElement('style');
  style.textContent = `
    #exam-analytics-panel { margin-top: 1.5rem; }
    #exam-analytics-panel h2 { font-size: 1.25rem; font-weight: 700; margin-bottom: 1.25rem; color: var(--text-primary); }
    #exam-analytics-panel h3 { font-size: 0.95rem; font-weight: 700; margin-bottom: 0.85rem; color: var(--text-primary); }

    /* KPI */
    .ea-kpi-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 0.75rem; margin-bottom: 1.5rem; }
    .ea-kpi { background: var(--bg-secondary); border: 2px solid var(--border-color); border-radius: 0.75rem; padding: 1rem 0.75rem; text-align: center; transition: transform 0.2s; position: relative; overflow: hidden; }
    .ea-kpi::before { content:''; position:absolute; top:0; left:0; right:0; height:3px; background: var(--kpi-color); }
    .ea-kpi:hover { transform: translateY(-3px); box-shadow: 0 6px 14px rgba(0,0,0,0.1); }
    .ea-kpi-icon { font-size: 1.5rem; margin-bottom: 0.3rem; }
    .ea-kpi-value { font-size: 1.6rem; font-weight: 800; color: var(--kpi-color); line-height: 1; }
    .ea-kpi-label { font-size: 0.72rem; color: var(--text-secondary); margin-top: 0.25rem; font-weight: 600; }

    /* Sections */
    .ea-section { background: var(--bg-secondary); border: 2px solid var(--border-color); border-radius: 0.75rem; padding: 1.25rem; margin-bottom: 1.25rem; }

    /* Prep bar */
    .ea-prep-labels { display:flex; justify-content:space-between; font-size:0.82rem; color:var(--text-secondary); margin-bottom:0.5rem; }
    .ea-big-progress { height: 18px; background: var(--border-color); border-radius: 999px; overflow: hidden; }
    .ea-big-progress-fill { height: 100%; background: linear-gradient(90deg, #7c3aed, #a78bfa); border-radius: 999px; transition: width 0.6s ease; }
    .ea-prep-sub { font-size: 0.78rem; color: var(--text-secondary); margin-top: 0.5rem; text-align: center; }

    /* Charts grid */
    .ea-charts-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; margin-bottom: 1.25rem; }
    .ea-chart-card { background: var(--bg-secondary); border: 2px solid var(--border-color); border-radius: 0.75rem; padding: 1.25rem; }
    .ea-chart-wrap { max-height: 220px; }
    .ea-chart-wrap-wide { height: 180px; }

    /* Exam breakdown */
    .ea-exam-breakdown { display: flex; flex-direction: column; gap: 0.75rem; }
    .ea-breakdown-card { background: var(--bg-secondary); border: 2px solid var(--border-color); border-radius: 0.625rem; padding: 0.9rem 1rem; }
    .ea-bd-ok  { border-color: var(--border-color) !important; }
    .ea-bd-warning { background: #fffbeb !important; border-color: #fde68a !important; }
    .ea-bd-danger  { background: #fef2f2 !important; border-color: #fecaca !important; }
    body.dark-mode .ea-bd-warning { background: #1c1a00 !important; border-color: #854d0e !important; }
    body.dark-mode .ea-bd-danger  { background: #1a0000 !important; border-color: #7f1d1d !important; }

    .ea-bd-header { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.5rem; }
    .ea-bd-title  { font-weight: 700; font-size: 0.95rem; flex: 1; color: var(--text-primary); }
    .ea-bd-sub    { padding: 0.2rem 0.5rem; border-radius: 0.3rem; font-size: 0.72rem; font-weight: 600; color: #fff; }
    .ea-bd-days   { font-size: 0.78rem; font-weight: 700; padding: 0.2rem 0.5rem; border-radius: 0.3rem; }
    .ea-bd-days.ea-bd-danger  { background:#fee2e2; color:#dc2626; }
    .ea-bd-days.ea-bd-warning { background:#fef3c7; color:#d97706; }
    .ea-bd-days.ea-bd-ok      { background:#ede9fe; color:#7c3aed; }

    .ea-bd-progress-row { display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.5rem; }
    .ea-bd-bar  { flex: 1; height: 8px; background: var(--border-color); border-radius: 999px; overflow: hidden; }
    .ea-bd-fill { height: 100%; border-radius: 999px; transition: width 0.4s; }
    .ea-bd-pct  { font-size: 0.78rem; font-weight: 700; color: var(--text-secondary); min-width: 2.5rem; text-align: left; }

    .ea-bd-topics { display: flex; flex-wrap: wrap; gap: 0.35rem; }
    .ea-topic-pill { padding: 0.2rem 0.5rem; border-radius: 0.375rem; font-size: 0.72rem; background: #f3f4f6; color: #6b7280; border: 1px solid #e5e7eb; }
    .ea-topic-pill.done { background: #dcfce7; color: #15803d; border-color: #bbf7d0; text-decoration: line-through; opacity: 0.75; }
    body.dark-mode .ea-topic-pill { background: #374151; color: #9ca3af; border-color: #4b5563; }
    body.dark-mode .ea-topic-pill.done { background: #052e16; color: #4ade80; border-color: #166534; }

    /* Insights */
    .ea-insights { display: flex; flex-direction: column; gap: 0.5rem; }
    .ea-insight { padding: 0.7rem 1rem; border-radius: 0.5rem; font-size: 0.88rem; display: flex; align-items: flex-start; gap: 0.5rem; }
    .ea-insight.success { background:#dcfce7; color:#166534; border-right: 4px solid #22c55e; }
    .ea-insight.info    { background:#eff6ff; color:#1e40af; border-right: 4px solid #3b82f6; }
    .ea-insight.warning { background:#fffbeb; color:#92400e; border-right: 4px solid #f59e0b; }
    .ea-insight.danger  { background:#fef2f2; color:#991b1b; border-right: 4px solid #ef4444; }
    body.dark-mode .ea-insight.success { background:#052e16; color:#86efac; }
    body.dark-mode .ea-insight.info    { background:#1e3a5f; color:#93c5fd; }
    body.dark-mode .ea-insight.warning { background:#1c1a00; color:#fcd34d; }
    body.dark-mode .ea-insight.danger  { background:#1a0000; color:#fca5a5; }

    /* Grade KPIs */
    .ea-grade-kpis { display: flex; gap: 0.75rem; flex-wrap: wrap; }
    .ea-grade-kpi { flex:1; min-width:100px; text-align:center; background:var(--bg-secondary); border:2px solid var(--border-color); border-radius:0.75rem; padding:0.85rem 0.5rem; position:relative; overflow:hidden; }
    .ea-grade-kpi::before { content:''; position:absolute; top:0; left:0; right:0; height:3px; background:var(--gk); }
    .ea-grade-kpi-val { font-size:1.7rem; font-weight:800; color:var(--gk); line-height:1; }
    .ea-grade-kpi-pct { font-size:0.8rem; font-weight:700; color:var(--gk); opacity:0.8; }
    .ea-grade-kpi-label { font-size:0.72rem; color:var(--text-secondary); margin-top:0.2rem; font-weight:600; }

    /* Grades table */
    .ea-grades-table { width:100%; border-collapse:collapse; font-size:0.82rem; }
    .ea-grades-table th { background:#f3f4f6; padding:0.5rem 0.6rem; text-align:right; font-weight:700; color:#374151; border-bottom:2px solid #e5e7eb; white-space:nowrap; }
    .ea-grades-table td { padding:0.45rem 0.6rem; border-bottom:1px solid #e5e7eb; color:var(--text-primary); }
    .ea-grades-table tr:hover td { background:#faf5ff; }
    body.dark-mode .ea-grades-table th { background:#1e293b; color:#e5e7eb; border-color:#374151; }
    body.dark-mode .ea-grades-table td { border-color:#374151; }
    body.dark-mode .ea-grades-table tr:hover td { background:#2e1065; }

    @media (max-width: 600px) {
      .ea-kpi-row { grid-template-columns: repeat(3, 1fr); }
      .ea-charts-row { grid-template-columns: 1fr; }
    }
  `;
  document.head.appendChild(style);
})();

// ── Global instance ─────────────────────────────────────
const examAnalytics = new ExamAnalytics();
console.log('📝 ExamAnalytics: Module loaded');

// ── Bundled legacy extensions: analytics tracking + chart helpers ─────────────────
// Merged from analytics-tracking.js and charts.js to reduce file count.

// Analytics event tracking hooks
(function attachAnalyticsTracking() {
  console.log('📊 Analytics Tracking: Initializing...');

  if (typeof gtag === 'undefined') {
    console.warn('⚠️ Analytics Tracking: gtag not found - Analytics tracking disabled');
    return;
  }

  console.log('✅ Analytics Tracking: gtag found, setting up custom events');

  if (typeof toggleComplete === 'function') {
    const originalToggleComplete = window.toggleComplete;
    window.toggleComplete = function(id) {
      const hw = homework.find(h => h.id === id);
      const wasCompleted = hw ? hw.completed : false;
      originalToggleComplete(id);

      if (hw) {
        if (!wasCompleted && hw.completed) {
          const subject = subjects.find(s => s.id == hw.subject);
          gtag('event', 'task_completed', {
            'event_category': 'Homework',
            'event_label': subject ? subject.name : 'Unknown',
            'value': 1
          });
          console.log('📊 Analytics: Task completed event sent:', hw.title);
        } else if (wasCompleted && !hw.completed) {
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

  if (typeof addHomework === 'function') {
    const originalAddHomework = window.addHomework;
    window.addHomework = function() {
      const beforeLength = homework.length;
      originalAddHomework();
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

  const waitForStudyTimer = setInterval(() => {
    if (typeof studyTimer !== 'undefined' && studyTimer.onTimerComplete) {
      clearInterval(waitForStudyTimer);
      const originalOnComplete = studyTimer.onTimerComplete.bind(studyTimer);
      studyTimer.onTimerComplete = function() {
        originalOnComplete();
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
  setTimeout(() => clearInterval(waitForStudyTimer), 10000);

  const waitForGamification = setInterval(() => {
    if (typeof gamification !== 'undefined' && gamification.unlockAchievement) {
      clearInterval(waitForGamification);
      const originalUnlock = gamification.unlockAchievement.bind(gamification);
      gamification.unlockAchievement = function(achievement) {
        originalUnlock(achievement);
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

  const waitForLevelUp = setInterval(() => {
    if (typeof gamification !== 'undefined' && gamification.levelUp) {
      clearInterval(waitForLevelUp);
      const originalLevelUp = gamification.levelUp.bind(gamification);
      gamification.levelUp = function() {
        const oldLevel = this.userStats.level;
        originalLevelUp();
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

  if (typeof exportData === 'function') {
    const originalExport = window.exportData;
    window.exportData = async function() {
      const result = await originalExport();
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

  if (typeof toggleDarkMode === 'function') {
    const originalToggleDark = window.toggleDarkMode;
    window.toggleDarkMode = function() {
      originalToggleDark();
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

  const waitForSmartSearch = setInterval(() => {
    if (typeof smartSearch !== 'undefined' && smartSearch.search) {
      clearInterval(waitForSmartSearch);
      const originalSearch = smartSearch.search.bind(smartSearch);
      smartSearch.search = function(query) {
        const results = originalSearch(query);
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
})();

// Charts support from charts.js
(function attachLegacyCharts() {
  console.log('📊 Charts: Initializing legacy chart helpers...');

  let completionChart = null;
  let subjectChart = null;

  function initializeCharts() {
    console.log('📊 initializeCharts: Initializing charts...');
    const completionCtx = document.getElementById('completion-chart');
    const subjectCtx = document.getElementById('subject-chart');
    if (!completionCtx || !subjectCtx) {
      console.warn('⚠️ initializeCharts: Chart elements not found', {
        completionCtx: !!completionCtx,
        subjectCtx: !!subjectCtx
      });
      return;
    }

    if (completionChart) {
      completionChart.destroy();
      completionChart = null;
    }
    if (subjectChart) {
      subjectChart.destroy();
      subjectChart = null;
    }

    completionChart = new Chart(completionCtx, {
      type: 'doughnut',
      data: {
        labels: ['הושלמו', 'ממתינים', 'דחוף', 'באיחור'],
        datasets: [{
          data: [0, 0, 0, 0],
          backgroundColor: ['#10b981', '#f59e0b', '#ef4444', '#dc2626'],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              font: {
                family: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                size: 12
              },
              color: getComputedStyle(document.body).getPropertyValue('--text-primary')
            }
          },
          title: {
            display: true,
            text: 'סטטוס משימות',
            font: { size: 16, weight: 'bold' },
            color: getComputedStyle(document.body).getPropertyValue('--text-primary')
          }
        }
      }
    });

    subjectChart = new Chart(subjectCtx, {
      type: 'bar',
      data: {
        labels: [],
        datasets: [{
          label: 'משימות לפי מקצוע',
          data: [],
          backgroundColor: [],
          borderColor: [],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
              color: getComputedStyle(document.body).getPropertyValue('--text-secondary')
            },
            grid: { color: getComputedStyle(document.body).getPropertyValue('--border-color') }
          },
          x: {
            ticks: { color: getComputedStyle(document.body).getPropertyValue('--text-secondary') },
            grid: { display: false }
          }
        },
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: 'משימות לפי מקצוע',
            font: { size: 16, weight: 'bold' },
            color: getComputedStyle(document.body).getPropertyValue('--text-primary')
          }
        }
      }
    });
    console.log('✅ initializeCharts: Charts initialization complete');
  }

  function updateCharts() {
    console.log('📊 updateCharts: Updating charts...');
    if (!completionChart || !subjectChart) {
      console.warn('⚠️ updateCharts: Charts not initialized, initializing now...');
      initializeCharts();
      if (!completionChart || !subjectChart) {
        console.error('❌ updateCharts: Failed to initialize charts');
        return;
      }
    }

    const completed = homework.filter(h => h.completed).length;
    const pending = homework.filter(h => !h.completed && getDaysUntilDue(h.dueDate) > 2).length;
    const urgent = homework.filter(h => !h.completed && getDaysUntilDue(h.dueDate) <= 2 && getDaysUntilDue(h.dueDate) >= 0).length;
    const overdue = homework.filter(h => !h.completed && getDaysUntilDue(h.dueDate) < 0).length;

    completionChart.data.datasets[0].data = [completed, pending, urgent, overdue];
    completionChart.update();

    const subjectStats = {};
    subjects.forEach(s => {
      subjectStats[s.id] = { name: s.name, color: s.color, count: 0 };
    });

    homework.forEach(hw => {
      if (subjectStats[hw.subject]) {
        subjectStats[hw.subject].count++;
      }
    });

    const sortedSubjects = Object.values(subjectStats)
      .filter(s => s.count > 0)
      .sort((a, b) => b.count - a.count);

    subjectChart.data.labels = sortedSubjects.map(s => s.name);
    subjectChart.data.datasets[0].data = sortedSubjects.map(s => s.count);
    subjectChart.data.datasets[0].backgroundColor = sortedSubjects.map(s => s.color + '80');
    subjectChart.data.datasets[0].borderColor = sortedSubjects.map(s => s.color);
    subjectChart.update();
    console.log('✅ updateCharts: Charts update complete');
  }

  function updateChartColors() {
    console.log('🎨 updateChartColors: Updating chart colors for dark mode...');
    if (!completionChart || !subjectChart) {
      console.warn('⚠️ updateChartColors: Charts not initialized');
      return;
    }

    const textColor = getComputedStyle(document.body).getPropertyValue('--text-primary');
    const secondaryColor = getComputedStyle(document.body).getPropertyValue('--text-secondary');
    const borderColor = getComputedStyle(document.body).getPropertyValue('--border-color');

    completionChart.options.plugins.legend.labels.color = textColor;
    completionChart.options.plugins.title.color = textColor;
    subjectChart.options.plugins.title.color = textColor;
    subjectChart.options.scales.y.ticks.color = secondaryColor;
    subjectChart.options.scales.x.ticks.color = secondaryColor;
    subjectChart.options.scales.y.grid.color = borderColor;
    completionChart.update();
    subjectChart.update();
  }

  document.addEventListener('DOMContentLoaded', () => {
    initializeCharts();
    if (typeof updateCharts === 'function') {
      updateCharts();
    }
  });
})();

// ===============================================================
// ניהול מקצועות - Subject Manager Modal
// ===============================================================

let smEditingId = null;
let smSelectedColor = '#3b82f6';
let smEditColor = '#3b82f6';

function openSubjectManager() {
  const modal = document.getElementById('subject-manager-modal');
  if (!modal) return;
  modal.classList.remove('hidden');
  smEditingId = null;
  smSelectedColor = '#3b82f6';
  smRenderColorPicker('sm-color-picker', smSelectedColor, 'smSelectColor');
  smRenderSubjectList();
  document.getElementById('sm-edit-panel').classList.add('hidden');
  document.getElementById('sm-subject-name').value = '';
  document.getElementById('sm-subject-name').focus();
}

function closeSubjectManager() {
  const modal = document.getElementById('subject-manager-modal');
  if (modal) modal.classList.add('hidden');
  smEditingId = null;
}

function smRenderColorPicker(containerId, currentColor, callbackFn) {
  const picker = document.getElementById(containerId);
  if (!picker) return;
  const colorList = typeof colors !== 'undefined' ? colors : [
    '#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6',
    '#ec4899','#06b6d4','#84cc16','#f97316','#6366f1',
    '#14b8a6','#a855f7','#64748b','#0ea5e9','#22c55e'
  ];
  let html = '<div class="color-grid" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:0.5rem;">';
  colorList.forEach(color => {
    html += `<div class="color-option ${color === currentColor ? 'selected' : ''}"
      style="width:28px;height:28px;border-radius:50%;background:${color};cursor:pointer;border:3px solid ${color === currentColor ? '#1e293b' : 'transparent'};transition:border 0.15s;"
      onclick="${callbackFn}('${color}')"></div>`;
  });
  html += '</div>';
  html += `<div style="display:flex;align-items:center;gap:0.5rem;margin-top:0.25rem;">
    <input type="color" value="${currentColor}" style="width:32px;height:28px;border:none;border-radius:6px;cursor:pointer;padding:0;"
      onchange="${callbackFn}(this.value)">
    <span style="font-size:0.8rem;color:var(--text-secondary,#64748b);">צבע מותאם אישית</span>
  </div>`;
  picker.innerHTML = html;
}

function smSelectColor(color) {
  smSelectedColor = color;
  smRenderColorPicker('sm-color-picker', smSelectedColor, 'smSelectColor');
}

function smEditSelectColor(color) {
  smEditColor = color;
  smRenderColorPicker('sm-edit-color-picker', smEditColor, 'smEditSelectColor');
}

function smAddSubject() {
  const nameInput = document.getElementById('sm-subject-name');
  const name = nameInput ? nameInput.value.trim() : '';
  const subjectTerm = (typeof getSubjectTerm === 'function') ? getSubjectTerm() : 'מקצוע';

  if (!name) {
    if (typeof notifications !== 'undefined') {
      notifications.showInAppNotification(`נא להזין שם ${subjectTerm}`, 'error');
    } else {
      alert(`נא להזין שם ${subjectTerm}`);
    }
    return;
  }

  const newSubject = { id: Date.now(), name, color: smSelectedColor };
  subjects.push(newSubject);

  nameInput.value = '';
  smSelectedColor = '#3b82f6';
  smRenderColorPicker('sm-color-picker', smSelectedColor, 'smSelectColor');

  saveData();
  renderSubjects();
  smRenderSubjectList();

  if (typeof notifications !== 'undefined') {
    notifications.showInAppNotification(`${subjectTerm} "${name}" נוסף בהצלחה`, 'success');
  }
}

function smRenderSubjectList() {
  const container = document.getElementById('sm-subject-list');
  if (!container) return;
  const subjectTerm = (typeof getSubjectTerm === 'function') ? getSubjectTerm() : 'מקצוע';

  if (!subjects || subjects.length === 0) {
    container.innerHTML = `<div style="text-align:center;padding:1.5rem;color:var(--text-secondary,#64748b);font-size:0.9rem;">
      אין ${subjectTerm}ות עדיין. הוסף ${subjectTerm} חדש למעלה.
    </div>`;
    return;
  }

  container.innerHTML = subjects.map(s => {
    const taskCount = (typeof homework !== 'undefined') ? homework.filter(h => h.subject == s.id).length : 0;
    return `<div style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem 1rem;background:var(--card-bg,white);border:1px solid var(--border-color,#e2e8f0);border-radius:0.75rem;transition:box-shadow 0.15s;">
      <div style="width:18px;height:18px;border-radius:50%;background:${s.color};flex-shrink:0;"></div>
      <span style="flex:1;font-weight:600;color:var(--text-primary,#1e293b);">${s.name}</span>
      <span style="font-size:0.78rem;color:var(--text-secondary,#64748b);background:var(--bg-secondary,#f1f5f9);padding:0.2rem 0.6rem;border-radius:999px;">${taskCount} משימות</span>
      <button class="icon-btn" title="עריכה" onclick="smStartEdit(${s.id})" style="color:#3b82f6;width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:6px;border:1px solid #bfdbfe;background:#eff6ff;">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      </button>
      <button class="icon-btn" title="מחיקה" onclick="smDeleteSubject(${s.id})" style="color:#ef4444;width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:6px;border:1px solid #fecaca;background:#fef2f2;">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
      </button>
    </div>`;
  }).join('');
}

function smStartEdit(id) {
  const subject = subjects.find(s => s.id === id);
  if (!subject) return;
  smEditingId = id;
  smEditColor = subject.color || '#3b82f6';

  const editPanel = document.getElementById('sm-edit-panel');
  const editName = document.getElementById('sm-edit-name');
  editPanel.classList.remove('hidden');
  editName.value = subject.name;
  smRenderColorPicker('sm-edit-color-picker', smEditColor, 'smEditSelectColor');
  editName.focus();
  editPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function smSaveEdit() {
  if (!smEditingId) return;
  const nameInput = document.getElementById('sm-edit-name');
  const name = nameInput ? nameInput.value.trim() : '';
  const subjectTerm = (typeof getSubjectTerm === 'function') ? getSubjectTerm() : 'מקצוע';

  if (!name) {
    if (typeof notifications !== 'undefined') {
      notifications.showInAppNotification(`נא להזין שם ${subjectTerm}`, 'error');
    }
    return;
  }

  const idx = subjects.findIndex(s => s.id === smEditingId);
  if (idx !== -1) {
    subjects[idx].name = name;
    subjects[idx].color = smEditColor;
  }

  smEditingId = null;
  document.getElementById('sm-edit-panel').classList.add('hidden');

  saveData();
  render();
  smRenderSubjectList();

  if (typeof notifications !== 'undefined') {
    notifications.showInAppNotification(`${subjectTerm} עודכן בהצלחה`, 'success');
  }
}

function smCancelEdit() {
  smEditingId = null;
  document.getElementById('sm-edit-panel').classList.add('hidden');
}

function smDeleteSubject(id) {
  const subject = subjects.find(s => s.id === id);
  if (!subject) return;
  const subjectTerm = (typeof getSubjectTerm === 'function') ? getSubjectTerm() : 'מקצוע';
  const relatedCount = (typeof homework !== 'undefined') ? homework.filter(h => h.subject == id).length : 0;

  let msg = `האם אתה בטוח שברצונך למחוק את ה${subjectTerm} "${subject.name}"?`;
  if (relatedCount > 0) {
    msg += `\n\n⚠️ פעולה זו תמחק גם ${relatedCount} משימות הקשורות ל${subjectTerm} הזה!`;
  }

  if (!confirm(msg)) return;

  subjects = subjects.filter(s => s.id !== id);
  if (typeof homework !== 'undefined') {
    homework = homework.filter(h => h.subject != id);
  }

  if (smEditingId === id) {
    smEditingId = null;
    document.getElementById('sm-edit-panel').classList.add('hidden');
  }

  saveData();
  render();
  smRenderSubjectList();

  if (typeof notifications !== 'undefined') {
    notifications.showInAppNotification(`${subjectTerm} "${subject.name}" נמחק`, 'success');
  }
}

// סגירת ה-modal בלחיצה מחוץ לו
document.addEventListener('click', (e) => {
  const modal = document.getElementById('subject-manager-modal');
  if (modal && !modal.classList.contains('hidden') && e.target === modal) {
    closeSubjectManager();
  }
});

window.openSubjectManager = openSubjectManager;
window.closeSubjectManager = closeSubjectManager;
window.smAddSubject = smAddSubject;
window.smStartEdit = smStartEdit;
window.smSaveEdit = smSaveEdit;
window.smCancelEdit = smCancelEdit;
window.smDeleteSubject = smDeleteSubject;
window.smSelectColor = smSelectColor;
window.smEditSelectColor = smEditSelectColor;
