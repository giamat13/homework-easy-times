// auth-service.js
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithPhoneNumber,
  GoogleAuthProvider,
  linkWithCredential,
  EmailAuthProvider,
  PhoneAuthProvider,
  sendEmailVerification,
  signOut,
  onAuthStateChanged,
  fetchSignInMethodsForEmail,
  RecaptchaVerifier
} from 'firebase/auth';
import { auth } from './firebase-config';
import { saveUserData, getUserData, syncUserData } from './firestore-service';

// ============================================
// 1. יצירת חשבון עם Email & Password
// ============================================
export const signUpWithEmail = async (email, password, userData = {}) => {
  try {
    // צור משתמש חדש
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // שלח אימייל אישור
    await sendEmailVerification(user);
    console.log('אימייל אישור נשלח ל:', email);

    // שמור נתוני משתמש ב-Firestore
    await saveUserData(user.uid, {
      email: user.email,
      createdAt: new Date().toISOString(),
      providers: ['password'],
      emailVerified: false,
      ...userData
    });

    return {
      success: true,
      user: user,
      message: 'חשבון נוצר בהצלחה! בדוק את האימייל שלך לאישור.'
    };
  } catch (error) {
    console.error('שגיאה ביצירת חשבון:', error);
    return handleAuthError(error);
  }
};

// ============================================
// 2. התחברות עם Email & Password
// ============================================
export const signInWithEmail = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // סנכרן נתונים
    await syncUserData(user.uid);

    return {
      success: true,
      user: user,
      message: 'התחברת בהצלחה!'
    };
  } catch (error) {
    console.error('שגיאה בהתחברות:', error);
    return handleAuthError(error);
  }
};

// ============================================
// 3. התחברות עם Google
// ============================================
export const signInWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account'
    });

    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // בדוק אם המשתמש קיים
    let userData = await getUserData(user.uid);
    
    if (!userData) {
      // משתמש חדש - שמור נתונים
      await saveUserData(user.uid, {
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        createdAt: new Date().toISOString(),
        providers: ['google.com'],
        emailVerified: user.emailVerified
      });
    } else {
      // משתמש קיים - עדכן providers אם צריך
      if (!userData.providers.includes('google.com')) {
        userData.providers.push('google.com');
        await saveUserData(user.uid, userData);
      }
      // סנכרן נתונים
      await syncUserData(user.uid);
    }

    return {
      success: true,
      user: user,
      message: 'התחברת בהצלחה עם Google!'
    };
  } catch (error) {
    console.error('שגיאה בהתחברות Google:', error);
    return handleAuthError(error);
  }
};

// ============================================
// 4. התחברות עם Phone
// ============================================
let recaptchaVerifier = null;

export const initRecaptcha = (containerId = 'recaptcha-container') => {
  if (!recaptchaVerifier) {
    recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: (response) => {
        console.log('reCAPTCHA פותר');
      }
    });
  }
  return recaptchaVerifier;
};

export const sendPhoneVerification = async (phoneNumber) => {
  try {
    const appVerifier = initRecaptcha();
    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
    
    return {
      success: true,
      confirmationResult: confirmationResult,
      message: 'קוד אימות נשלח לטלפון שלך'
    };
  } catch (error) {
    console.error('שגיאה בשליחת קוד:', error);
    return handleAuthError(error);
  }
};

export const verifyPhoneCode = async (confirmationResult, code) => {
  try {
    const result = await confirmationResult.confirm(code);
    const user = result.user;

    // בדוק אם המשתמש קיים
    let userData = await getUserData(user.uid);
    
    if (!userData) {
      // משתמש חדש
      await saveUserData(user.uid, {
        phoneNumber: user.phoneNumber,
        createdAt: new Date().toISOString(),
        providers: ['phone'],
        emailVerified: false
      });
    } else {
      // משתמש קיים - עדכן providers
      if (!userData.providers.includes('phone')) {
        userData.providers.push('phone');
        await saveUserData(user.uid, userData);
      }
      await syncUserData(user.uid);
    }

    return {
      success: true,
      user: user,
      message: 'התחברת בהצלחה!'
    };
  } catch (error) {
    console.error('שגיאה באימות קוד:', error);
    return handleAuthError(error);
  }
};

// ============================================
// 5. קישור חשבונות (Account Linking)
// ============================================
export const linkEmailToAccount = async (email, password) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('אין משתמש מחובר');

    const credential = EmailAuthProvider.credential(email, password);
    await linkWithCredential(user, credential);

    // עדכן נתונים
    const userData = await getUserData(user.uid);
    if (!userData.providers.includes('password')) {
      userData.providers.push('password');
      userData.email = email;
      await saveUserData(user.uid, userData);
    }

    return {
      success: true,
      message: 'אימייל וסיסמה נקשרו בהצלחה!'
    };
  } catch (error) {
    console.error('שגיאה בקישור אימייל:', error);
    return handleAuthError(error);
  }
};

export const linkGoogleToAccount = async () => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('אין משתמש מחובר');

    const provider = new GoogleAuthProvider();
    const result = await linkWithPopup(user, provider);

    // עדכן נתונים
    const userData = await getUserData(user.uid);
    if (!userData.providers.includes('google.com')) {
      userData.providers.push('google.com');
      await saveUserData(user.uid, userData);
    }

    return {
      success: true,
      message: 'Google נקשר בהצלחה!'
    };
  } catch (error) {
    console.error('שגיאה בקישור Google:', error);
    return handleAuthError(error);
  }
};

export const linkPhoneToAccount = async (phoneNumber, verificationCode) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('אין משתמש מחובר');

    const credential = PhoneAuthProvider.credential(verificationCode, verificationCode);
    await linkWithCredential(user, credential);

    // עדכן נתונים
    const userData = await getUserData(user.uid);
    if (!userData.providers.includes('phone')) {
      userData.providers.push('phone');
      userData.phoneNumber = phoneNumber;
      await saveUserData(user.uid, userData);
    }

    return {
      success: true,
      message: 'טלפון נקשר בהצלחה!'
    };
  } catch (error) {
    console.error('שגיאה בקישור טלפון:', error);
    return handleAuthError(error);
  }
};

// ============================================
// 6. בדיקת שיטות התחברות קיימות
// ============================================
export const checkExistingMethods = async (email) => {
  try {
    const methods = await fetchSignInMethodsForEmail(auth, email);
    return {
      success: true,
      methods: methods,
      exists: methods.length > 0
    };
  } catch (error) {
    console.error('שגיאה בבדיקת שיטות:', error);
    return { success: false, methods: [], exists: false };
  }
};

// ============================================
// 7. התנתקות
// ============================================
export const logOut = async () => {
  try {
    await signOut(auth);
    return {
      success: true,
      message: 'התנתקת בהצלחה'
    };
  } catch (error) {
    console.error('שגיאה בהתנתקות:', error);
    return handleAuthError(error);
  }
};

// ============================================
// 8. האזנה לשינויים במשתמש
// ============================================
export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      // סנכרן נתונים בכל פעם שהמשתמש מתחבר
      await syncUserData(user.uid);
      const userData = await getUserData(user.uid);
      callback({ user, userData });
    } else {
      callback({ user: null, userData: null });
    }
  });
};

// ============================================
// 9. טיפול בשגיאות
// ============================================
const handleAuthError = (error) => {
  const errorMessages = {
    'auth/email-already-in-use': 'האימייל כבר בשימוש',
    'auth/invalid-email': 'כתובת אימייל לא תקינה',
    'auth/weak-password': 'הסיסמה חלשה מדי (לפחות 6 תווים)',
    'auth/user-not-found': 'משתמש לא נמצא',
    'auth/wrong-password': 'סיסמה שגויה',
    'auth/too-many-requests': 'יותר מדי ניסיונות, נסה שוב מאוחר יותר',
    'auth/network-request-failed': 'בעיית רשת, בדוק את החיבור לאינטרנט',
    'auth/popup-closed-by-user': 'החלון נסגר על ידי המשתמש',
    'auth/account-exists-with-different-credential': 'החשבון קיים עם שיטת התחברות אחרת',
    'auth/invalid-verification-code': 'קוד אימות שגוי',
    'auth/invalid-phone-number': 'מספר טלפון לא תקין'
  };

  return {
    success: false,
    error: error.code,
    message: errorMessages[error.code] || error.message
  };
};

// ============================================
// 10. פונקציות עזר
// ============================================
export const getCurrentUser = () => {
  return auth.currentUser;
};

export const isEmailVerified = () => {
  const user = auth.currentUser;
  return user ? user.emailVerified : false;
};

export const resendVerificationEmail = async () => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('אין משתמש מחובר');
    
    await sendEmailVerification(user);
    return {
      success: true,
      message: 'אימייל אישור נשלח מחדש'
    };
  } catch (error) {
    return handleAuthError(error);
  }
};
