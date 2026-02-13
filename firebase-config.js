// firebase-config.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// תצורת Firebase שלך - החלף עם הנתונים האמיתיים מ-Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyCbHTfv0U0DdVRbKc4FSPQi-VF4zrdX0QQ",
  authDomain: "homework-easy-times.firebaseapp.com",
  projectId: "homework-easy-times",
  storageBucket: "homework-easy-times.firebasestorage.app",
  messagingSenderId: "344316429906",
  appId: "1:344316429906:web:853d2c96b6d0500128c18b",
  measurementId: "G-J3F285WRQM"
};

// אתחול Firebase
const app = initializeApp(firebaseConfig);

// אתחול שירותים
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
