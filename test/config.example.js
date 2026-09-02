// config.example.js — העתק לקובץ בשם config.js ומלא את הערכים.
// config.js לא נכנס לגיט (ראה .gitignore). בלעדיו האפליקציה עובדת במלואה במצב מקומי.

export const firebaseConfig = {
  apiKey: '',
  authDomain: 'PROJECT.firebaseapp.com',
  projectId: 'PROJECT',
  storageBucket: 'PROJECT.appspot.com',
  messagingSenderId: '',
  appId: '',
};

// מזהה OAuth ל-Google Calendar / Tasks / Classroom. השאר ריק כדי לכבות את השילוב.
// חשוב: הוסף את מקור האתר (למשל http://localhost:8000) ל-Authorized JavaScript origins.
export const googleClientId = '';

// אופציונלי — מזהה Analytics. השאר ריק כדי לא לטעון כלום.
export const analyticsId = '';
