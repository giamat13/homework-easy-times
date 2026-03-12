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
