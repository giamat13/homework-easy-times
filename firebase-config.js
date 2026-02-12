// Firebase Configuration
// ======================
// ⚠️ חשוב: API Keys של Firebase Web הם PUBLIC by design
// האבטחה נעשית דרך Firebase Security Rules, לא דרך הסתרת ה-Key
// 
// קרא עוד: https://firebase.google.com/docs/projects/api-keys

// ========================================
// שלב 1: הגדר Domain Restrictions ב-Firebase Console
// ========================================
// 1. לך ל-Firebase Console: https://console.firebase.google.com
// 2. בחר את הפרויקט שלך
// 3. Settings > Project Settings > Web API Key
// 4. הוסף את הדומיינים המורשים:
//    - localhost (לפיתוח)
//    - YOUR-USERNAME.github.io (לפרודקשן)
//    - הדומיין המותאם שלך (אם יש)

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
// שלב 2: הגדר Firebase Security Rules
// ========================================
// העתק את הקוד הזה ל-Firestore Rules ב-Firebase Console:
/*
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // משתמשים - כל אחד רואה רק את עצמו
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // נתוני משתמשים - רק בעל החשבון
    match /userData/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // מקצועות - רק למשתמש מחובר של עצמו
    match /subjects/{userId}/items/{subjectId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // משימות - רק למשתמש מחובר של עצמו
    match /homework/{userId}/items/{homeworkId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
*/

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
    
    // הגדרות נוספות
    auth.languageCode = 'he'; // עברית
    
    return { app, auth, db };
  } catch (error) {
    console.error('❌ Firebase initialization error:', error);
    throw error;
  }
}

// ייצוא
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { firebaseConfig, initializeFirebase };
}

console.log('✅ Firebase config loaded');
