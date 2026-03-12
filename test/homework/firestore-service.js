// firestore-service.js
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  collection,
  query,
  where,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase-config';

// ============================================
// 1. שמירת נתוני משתמש
// ============================================
export const saveUserData = async (userId, data) => {
  try {
    const userRef = doc(db, 'users', userId);
    
    await setDoc(userRef, {
      ...data,
      lastUpdated: serverTimestamp()
    }, { merge: true }); // merge: true = עדכון חלקי, לא מחיקה של השאר

    console.log('נתונים נשמרו בהצלחה:', userId);
    return { success: true };
  } catch (error) {
    console.error('שגיאה בשמירת נתונים:', error);
    return { success: false, error: error.message };
  }
};

// ============================================
// 2. קריאת נתוני משתמש
// ============================================
export const getUserData = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return userSnap.data();
    } else {
      console.log('משתמש לא נמצא ב-Firestore');
      return null;
    }
  } catch (error) {
    console.error('שגיאה בקריאת נתונים:', error);
    return null;
  }
};

// ============================================
// 3. עדכון נתוני משתמש
// ============================================
export const updateUserData = async (userId, updates) => {
  try {
    const userRef = doc(db, 'users', userId);
    
    await updateDoc(userRef, {
      ...updates,
      lastUpdated: serverTimestamp()
    });

    console.log('נתונים עודכנו בהצלחה');
    return { success: true };
  } catch (error) {
    console.error('שגיאה בעדכון נתונים:', error);
    return { success: false, error: error.message };
  }
};

// ============================================
// 4. סנכרון אוטומטי - האזנה לשינויים בזמן אמת
// ============================================
export const syncUserData = (userId, callback) => {
  const userRef = doc(db, 'users', userId);
  
  // האזנה לשינויים בזמן אמת
  const unsubscribe = onSnapshot(userRef, (doc) => {
    if (doc.exists()) {
      console.log('נתונים עודכנו מהשרת:', doc.data());
      callback({ success: true, data: doc.data() });
    } else {
      console.log('המסמך לא קיים');
      callback({ success: false, data: null });
    }
  }, (error) => {
    console.error('שגיאה בהאזנה לשינויים:', error);
    callback({ success: false, error: error.message });
  });

  // החזר פונקציה לביטול ההאזנה
  return unsubscribe;
};

// ============================================
// 5. שמירת נתונים נוספים (דוגמאות)
// ============================================

// שמירת הגדרות משתמש
export const saveUserSettings = async (userId, settings) => {
  try {
    const settingsRef = doc(db, 'users', userId, 'settings', 'preferences');
    await setDoc(settingsRef, {
      ...settings,
      lastUpdated: serverTimestamp()
    }, { merge: true });

    return { success: true };
  } catch (error) {
    console.error('שגיאה בשמירת הגדרות:', error);
    return { success: false, error: error.message };
  }
};

// שמירת משימות
export const saveTask = async (userId, taskData) => {
  try {
    const tasksRef = collection(db, 'users', userId, 'tasks');
    const taskRef = doc(tasksRef); // יוצר ID אוטומטי
    
    await setDoc(taskRef, {
      ...taskData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return { success: true, taskId: taskRef.id };
  } catch (error) {
    console.error('שגיאה בשמירת משימה:', error);
    return { success: false, error: error.message };
  }
};

// קריאת כל המשימות
export const getUserTasks = async (userId) => {
  try {
    const tasksRef = collection(db, 'users', userId, 'tasks');
    const q = query(tasksRef);
    
    const querySnapshot = await getDocs(q);
    const tasks = [];
    
    querySnapshot.forEach((doc) => {
      tasks.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return { success: true, tasks };
  } catch (error) {
    console.error('שגיאה בקריאת משימות:', error);
    return { success: false, tasks: [] };
  }
};

// ============================================
// 6. סנכרון מלא - בדיקה ועדכון
// ============================================
export const fullSync = async (userId, localData) => {
  try {
    // קרא נתונים מהשרת
    const serverData = await getUserData(userId);
    
    if (!serverData) {
      // אם אין נתונים בשרת - שמור את הנתונים המקומיים
      await saveUserData(userId, localData);
      return { success: true, data: localData, source: 'local' };
    }

    // השווה תאריכי עדכון
    const serverTime = serverData.lastUpdated?.toMillis() || 0;
    const localTime = localData.lastUpdated?.toMillis() || 0;

    if (serverTime > localTime) {
      // הנתונים בשרת חדשים יותר
      console.log('משתמש בנתונים מהשרת');
      return { success: true, data: serverData, source: 'server' };
    } else if (localTime > serverTime) {
      // הנתונים המקומיים חדשים יותר
      console.log('מעדכן שרת עם נתונים מקומיים');
      await saveUserData(userId, localData);
      return { success: true, data: localData, source: 'local' };
    } else {
      // זהים
      return { success: true, data: serverData, source: 'synced' };
    }
  } catch (error) {
    console.error('שגיאה בסנכרון מלא:', error);
    return { success: false, error: error.message };
  }
};

// ============================================
// 7. ניקוי והתנתקות
// ============================================
export const cleanupUserData = async (userId) => {
  try {
    // ניקוי cache מקומי או פעולות נוספות
    console.log('ניקוי נתונים מקומיים למשתמש:', userId);
    return { success: true };
  } catch (error) {
    console.error('שגיאה בניקוי:', error);
    return { success: false };
  }
};
