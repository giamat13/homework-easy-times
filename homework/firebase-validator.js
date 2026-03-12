// 🔍 Firebase Setup Validator - בודק תקינות הגדרות Firebase
// ============================================================

console.log('🔍 מתחיל בדיקת הגדרות Firebase...\n');

// ============================================
// בדיקה 1: Firebase SDK נטען
// ============================================
console.log('1️⃣ בודק טעינת Firebase SDK...');
if (typeof firebase !== 'undefined') {
  console.log('✅ Firebase SDK נטען בהצלחה');
  console.log('   גרסה:', firebase.SDK_VERSION || 'לא זמין');
} else {
  console.error('❌ Firebase SDK לא נטען!');
  console.log('   💡 פתרון: וודא שהוספת את הסקריפטים ל-HTML');
}

// ============================================
// בדיקה 2: Firebase מאותחל
// ============================================
console.log('\n2️⃣ בודק אתחול Firebase...');
try {
  const app = firebase.app();
  console.log('✅ Firebase מאותחל בהצלחה');
  console.log('   שם הפרויקט:', app.options.projectId);
  console.log('   Auth Domain:', app.options.authDomain);
} catch (error) {
  console.error('❌ Firebase לא מאותחל!');
  console.log('   💡 פתרון: קרא את firebase-config.js');
}

// ============================================
// בדיקה 3: Authentication
// ============================================
console.log('\n3️⃣ בודק Authentication...');
if (typeof firebase.auth !== 'undefined') {
  const auth = firebase.auth();
  console.log('✅ Firebase Auth זמין');
  
  // בדיקת משתמש מחובר
  const currentUser = auth.currentUser;
  if (currentUser) {
    console.log('✅ משתמש מחובר:');
    console.log('   UID:', currentUser.uid);
    console.log('   Email:', currentUser.email || 'לא הוגדר');
    console.log('   Phone:', currentUser.phoneNumber || 'לא הוגדר');
    console.log('   Email Verified:', currentUser.emailVerified ? '✅ כן' : '❌ לא');
  } else {
    console.log('⚠️ אין משתמש מחובר');
    console.log('   💡 התחבר כדי לבדוק הרשאות Firestore');
  }
} else {
  console.error('❌ Firebase Auth לא זמין!');
}

// ============================================
// בדיקה 4: Firestore
// ============================================
console.log('\n4️⃣ בודק Firestore...');
if (typeof firebase.firestore !== 'undefined') {
  const db = firebase.firestore();
  console.log('✅ Firestore זמין');
  
  // בדיקת הרשאות (רק אם יש משתמש מחובר)
  const currentUser = firebase.auth().currentUser;
  if (currentUser) {
    console.log('🔍 בודק הרשאות Firestore...');
    
    // נסיון לקרוא נתונים
    db.collection('users').doc(currentUser.uid).get()
      .then((doc) => {
        console.log('✅ הרשאות קריאה: תקינות');
        if (doc.exists) {
          console.log('   יש נתונים במסמך');
        } else {
          console.log('   אין עדיין נתונים במסמך (זה בסדר)');
        }
      })
      .catch((error) => {
        console.error('❌ הרשאות קריאה: כשלון');
        console.error('   שגיאה:', error.message);
        console.log('\n💡 פתרון:');
        console.log('   1. עדכן את Firestore Rules ב-Firebase Console');
        console.log('   2. השתמש בקובץ firestore.rules שנוצר');
        console.log('   3. לחץ Publish בעמוד Rules');
      });
    
    // נסיון לכתוב נתונים
    db.collection('users').doc(currentUser.uid).set({
      testField: 'test-value',
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true })
      .then(() => {
        console.log('✅ הרשאות כתיבה: תקינות');
      })
      .catch((error) => {
        console.error('❌ הרשאות כתיבה: כשלון');
        console.error('   שגיאה:', error.message);
        console.log('\n💡 פתרון: עדכן Firestore Rules');
      });
  } else {
    console.log('⚠️ לא ניתן לבדוק הרשאות ללא משתמש מחובר');
    console.log('   💡 התחבר תחילה');
  }
} else {
  console.error('❌ Firestore לא זמין!');
}

// ============================================
// בדיקה 5: Guest Mode
// ============================================
console.log('\n5️⃣ בודק Guest Mode...');
if (typeof GUEST_MODE !== 'undefined' && GUEST_MODE.enabled) {
  console.log('✅ Guest Mode מופעל');
  
  const guestUID = localStorage.getItem(GUEST_MODE.guestUidKey);
  if (guestUID) {
    console.log('✅ יש Guest UID:', guestUID);
    console.log('   💡 במצב אורח, הנתונים נשמרים ב-localStorage');
  } else {
    console.log('⚠️ אין Guest UID');
    console.log('   💡 Guest UID ייווצר בפעם הראשונה שתשתמש במצב אורח');
  }
} else {
  console.log('⚠️ Guest Mode לא מופעל');
}

// ============================================
// סיכום
// ============================================
console.log('\n' + '='.repeat(50));
console.log('📊 סיכום הבדיקה');
console.log('='.repeat(50));

const checks = {
  'Firebase SDK': typeof firebase !== 'undefined',
  'Firebase App': typeof firebase !== 'undefined' && firebase.apps.length > 0,
  'Firebase Auth': typeof firebase !== 'undefined' && typeof firebase.auth !== 'undefined',
  'Firebase Firestore': typeof firebase !== 'undefined' && typeof firebase.firestore !== 'undefined',
  'User Logged In': typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser !== null,
  'Guest Mode': typeof GUEST_MODE !== 'undefined' && GUEST_MODE.enabled
};

Object.keys(checks).forEach(key => {
  const status = checks[key] ? '✅' : '❌';
  console.log(`${status} ${key}`);
});

console.log('='.repeat(50));

// הוראות נוספות
if (firebase.auth && !firebase.auth().currentUser) {
  console.log('\n💡 הוראות:');
  console.log('   1. התחבר דרך מסך ההתחברות');
  console.log('   2. הרץ שוב את הסקריפט הזה (F5)');
  console.log('   3. בדוק את הרשאות Firestore');
}

console.log('\n✅ בדיקה הושלמה!');
console.log('📚 לעזרה נוספת, ראה: FIX-PERMISSIONS.md');
