// firebase-config.js - Modern Modular SDK (v10+)
// ================================================
// ✨ This file initializes Firebase with the new modular SDK

console.log('🔥 Firebase Config: Starting initialization...');

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCbHTfv0U0DdVRbKc4FSPQi-VF4zrdX0QQ",
  authDomain: "homework-easy-times.firebaseapp.com",
  projectId: "homework-easy-times",
  storageBucket: "homework-easy-times.firebasestorage.app",
  messagingSenderId: "344316429906",
  appId: "1:344316429906:web:853d2c96b6d0500128c18b",
  measurementId: "G-J3F285WRQM"
};

// Global Firebase objects (for compatibility with existing code)
let firebase = {
  auth: null,
  db: null,
  app: null
};

// Initialize Firebase function
function initializeFirebase() {
  console.log('🔥 initializeFirebase: Checking for Firebase imports...');
  
  // Wait for imports to be available
  if (typeof window.firebaseImports === 'undefined') {
    console.warn('⚠️ Firebase imports not ready yet, retrying...');
    setTimeout(initializeFirebase, 100);
    return null;
  }

  try {
    const { initializeApp, getAuth, getFirestore } = window.firebaseImports;
    
    console.log('🔥 initializeFirebase: Initializing Firebase app...');
    const app = initializeApp(firebaseConfig);
    
    console.log('🔥 initializeFirebase: Getting Auth instance...');
    const auth = getAuth(app);
    
    console.log('🔥 initializeFirebase: Getting Firestore instance...');
    const db = getFirestore(app);
    
    // Set global objects
    firebase.app = app;
    firebase.auth = auth;
    firebase.db = db;
    
    // For backward compatibility with existing code
    window.firebase = firebase;
    
    console.log('✅ Firebase initialized successfully!');
    console.log('✅ Auth:', !!auth);
    console.log('✅ Firestore:', !!db);
    
    // Dispatch custom event to signal Firebase is ready
    window.dispatchEvent(new CustomEvent('firebaseReady', { 
      detail: { auth, db, app } 
    }));
    
    return firebase;
    
  } catch (error) {
    console.error('❌ initializeFirebase: Error initializing Firebase:', error);
    console.error('❌ Error details:', error.message, error.stack);
    return null;
  }
}

// For older code that expects firebase.firestore.FieldValue
function setupFirestoreCompatibility() {
  if (window.firebaseImports) {
    // Import Firestore functions we need
    import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js')
      .then(({ serverTimestamp, arrayUnion, arrayRemove, increment, deleteField }) => {
        // Create compatibility layer
        if (!firebase.firestore) {
          firebase.firestore = {
            FieldValue: {
              serverTimestamp: serverTimestamp,
              arrayUnion: arrayUnion,
              arrayRemove: arrayRemove,
              increment: increment,
              delete: deleteField
            }
          };
        }
        console.log('✅ Firestore compatibility layer created');
      })
      .catch(error => {
        console.error('❌ Error setting up Firestore compatibility:', error);
      });
  }
}

// Guest Mode Configuration
const GUEST_MODE = {
  enabled: true,
  localStoragePrefix: 'guest_',
  maxDataSize: 5 * 1024 * 1024 // 5MB limit for guest data
};

// Guest Mode Functions
function isGuestMode() {
  return localStorage.getItem(GUEST_MODE.localStoragePrefix + 'active') === 'true';
}

function getGuestUID() {
  let guestUID = localStorage.getItem(GUEST_MODE.localStoragePrefix + 'uid');
  if (!guestUID) {
    guestUID = 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem(GUEST_MODE.localStoragePrefix + 'uid', guestUID);
  }
  return guestUID;
}

function clearGuestData() {
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.startsWith(GUEST_MODE.localStoragePrefix)) {
      localStorage.removeItem(key);
    }
  });
  console.log('✅ Guest data cleared');
}

// Export to global scope
window.GUEST_MODE = GUEST_MODE;
window.isGuestMode = isGuestMode;
window.getGuestUID = getGuestUID;
window.clearGuestData = clearGuestData;
window.initializeFirebase = initializeFirebase;

// Try to initialize immediately if imports are ready
if (typeof window.firebaseImports !== 'undefined') {
  initializeFirebase();
  setupFirestoreCompatibility();
} else {
  // Otherwise wait for imports to load
  console.log('⏳ Waiting for Firebase imports to load...');
  let attempts = 0;
  const checkInterval = setInterval(() => {
    attempts++;
    if (typeof window.firebaseImports !== 'undefined') {
      clearInterval(checkInterval);
      initializeFirebase();
      setupFirestoreCompatibility();
    } else if (attempts > 50) { // 5 seconds max wait
      clearInterval(checkInterval);
      console.error('❌ Firebase imports failed to load after 5 seconds');
    }
  }, 100);
}

console.log('✅ Firebase config script loaded');
