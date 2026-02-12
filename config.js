// ========================================
// Google Analytics Configuration
// ========================================
// החלף את ה-ID למטה עם ה-Measurement ID שלך מ-Google Analytics
const GA_MEASUREMENT_ID = 'G-XXXXXXXXXX'; // 👈 החלף כאן!

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.GA_MEASUREMENT_ID = GA_MEASUREMENT_ID;
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
