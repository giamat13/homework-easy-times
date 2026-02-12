// Configuration file for the Homework Management System
// ====================================================

// Google Analytics Configuration
// ==============================
// Replace 'G-XXXXXXXXXX' with your actual Google Analytics Measurement ID
// You can find this in your Google Analytics dashboard under Admin > Data Streams

const GA_MEASUREMENT_ID = 'G-N5W4B1DDXP'; // 👈 Replace with your actual GA4 Measurement ID

// Big Update Flag
// ===============
// Set to true when there are major updates to show in the beta footer
const isBigUpdate = true; // Change to false for minor updates

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.GA_MEASUREMENT_ID = GA_MEASUREMENT_ID;
  window.isBigUpdate = isBigUpdate;
}

console.log('⚙️ config.js loaded');
console.log('📊 GA Measurement ID:', GA_MEASUREMENT_ID);
console.log('🚀 Big Update Mode:', isBigUpdate);