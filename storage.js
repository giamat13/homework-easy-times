// ============================================
// 💾 STORAGE MANAGER - LOCAL & FIRESTORE SYNC
// ============================================

class StorageManager {
  constructor() {
    console.log('💾 StorageManager: Initialized, using Claude storage: false');
  }

  /**
   * 📥 GET - Load data from Firestore (if logged in) or localStorage (if guest)
   */
  async get(key) {
    console.log(`📥 StorageManager.get: Loading key "${key}"...`);

    try {
      // בדיקה אם משתמש מחובר
      const user = firebase.auth().currentUser;

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
              localStorage.setItem(key, JSON.stringify(data));
              console.log(`💾 StorageManager.get: Cached "${key}" to localStorage`);
            } catch (e) {
              console.warn(`⚠️ StorageManager.get: Failed to cache "${key}":`, e.message);
            }
            
            return data;
          } else {
            console.log(`⚠️ StorageManager.get: No data found for "${key}" in Firestore`);
            
            // נסה לטעון מ-localStorage כ-fallback
            const localData = localStorage.getItem(key);
            if (localData) {
              const parsed = JSON.parse(localData);
              console.log(`💾 StorageManager.get: Found "${key}" in localStorage cache:`, parsed);
              return parsed;
            }
            
            return null;
          }
        } catch (firestoreError) {
          console.error(`❌ StorageManager.get: Firestore error for "${key}":`, firestoreError.message);
          
          // נסה לטעון מ-localStorage כ-fallback
          const localData = localStorage.getItem(key);
          if (localData) {
            const parsed = JSON.parse(localData);
            console.log(`💾 StorageManager.get: Using localStorage fallback for "${key}":`, parsed);
            return parsed;
          }
          
          return null;
        }
      } else {
        // 👤 אין משתמש - טען מ-localStorage
        console.log(`📥 StorageManager.get: No user logged in, using localStorage for "${key}"`);
        const data = localStorage.getItem(key);

        if (data) {
          const parsed = JSON.parse(data);
          console.log(`✅ StorageManager.get: Successfully loaded "${key}" from localStorage:`, parsed);
          return parsed;
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
      // בדיקה אם משתמש מחובר
      const user = firebase.auth().currentUser;

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
            localStorage.setItem(key, JSON.stringify(value));
            console.log(`💾 StorageManager.set: Cached "${key}" to localStorage`);
          } catch (e) {
            console.warn(`⚠️ StorageManager.set: Failed to cache "${key}":`, e.message);
          }
          
          return true;
        } catch (firestoreError) {
          console.error(`❌ StorageManager.set: Firestore error for "${key}":`, firestoreError.message);
          
          // שמור ב-localStorage כ-fallback
          localStorage.setItem(key, JSON.stringify(value));
          console.log(`💾 StorageManager.set: Saved "${key}" to localStorage as fallback`);
          
          return false;
        }
      } else {
        // 👤 אין משתמש - שמור ב-localStorage
        console.log(`💾 StorageManager.set: No user logged in, saving "${key}" to localStorage`);
        localStorage.setItem(key, JSON.stringify(value));
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
      const user = firebase.auth().currentUser;

      if (user) {
        // 🔥 משתמש מחובר - מחק מ-Firestore
        try {
          const db = firebase.firestore();
          const docRef = db.collection('users').doc(user.uid).collection('data').doc(key);
          await docRef.delete();
          console.log(`✅ StorageManager.remove: Removed "${key}" from Firestore`);
        } catch (firestoreError) {
          console.error(`❌ StorageManager.remove: Firestore error:`, firestoreError.message);
        }
      }

      // מחק גם מ-localStorage
      localStorage.removeItem(key);
      console.log(`✅ StorageManager.remove: Removed "${key}" from localStorage`);
      
      return true;
    } catch (error) {
      console.error(`❌ StorageManager.remove: Error removing "${key}":`, error);
      return false;
    }
  }

  /**
   * 🔄 SYNC ALL - Sync all localStorage data to Firestore when user logs in
   */
  async syncAllToFirestore() {
    console.log('🔄 StorageManager.syncAllToFirestore: Starting sync...');
    
    const user = firebase.auth().currentUser;
    if (!user) {
      console.log('⚠️ StorageManager.syncAllToFirestore: No user logged in');
      return;
    }

    const keysToSync = [
      'homework-list',
      'homework-subjects',
      'homework-tags',
      'homework-settings',
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
        const localData = localStorage.getItem(key);
        if (localData) {
          const parsed = JSON.parse(localData);
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
    
    const user = firebase.auth().currentUser;
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
          localStorage.setItem(key, JSON.stringify(value));
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
   * 🗑️ CLEAR ALL - Clear all data (both Firestore and localStorage)
   */
  async clearAll() {
    console.log('🗑️ StorageManager.clearAll: Clearing all data...');

    const user = firebase.auth().currentUser;
    
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

    localStorage.clear();
    console.log('✅ Cleared all localStorage data');
  }
}

// ============================================
// 🌍 GLOBAL INSTANCE
// ============================================
console.log('💾 Creating global storage manager...');
window.storageManager = new StorageManager();
console.log('✅ Global storage manager created');
