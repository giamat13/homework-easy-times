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