// data/achievements.js — הגדרות ההישגים. דאטה בלבד: כל הישג הוא { metric, goal }.
// מערכת אחת. לכל הישג מד התקדמות אמיתי ומסלול פתיחה שאפשר להדגים.
//
// הערה: נשמר כ-JS ולא כ-JSON כדי שהקובץ ייטען גם כשפותחים מהדיסק (fetch חסום ב-file://).

export const CATEGORIES = {
  tasks: { name: 'משימות', icon: '✅' },
  streak: { name: 'רצף', icon: '🔥' },
  exams: { name: 'מבחנים', icon: '📝' },
  study: { name: 'זמן לימוד', icon: '⏱️' },
  level: { name: 'התקדמות', icon: '⭐' },
  habits: { name: 'הרגלים', icon: '🎯' },
};

/**
 * metric — שם מדד מתוך המרשם ב-js/achievements.js
 * goal   — הערך שממנו ההישג נפתח
 * unit   — יחידה לתצוגה במד ההתקדמות
 */
export const ACHIEVEMENTS = [
  // --- משימות ---
  { id: 'first-task', name: 'צעד ראשון', desc: 'השלמת המשימה הראשונה', icon: '🌱', cat: 'tasks', metric: 'tasksCompleted', goal: 1 },
  { id: 'tasks-10', name: 'מתחיל', desc: 'השלמת 10 משימות', icon: '📗', cat: 'tasks', metric: 'tasksCompleted', goal: 10 },
  { id: 'tasks-50', name: 'רץ למרחקים', desc: 'השלמת 50 משימות', icon: '📘', cat: 'tasks', metric: 'tasksCompleted', goal: 50 },
  { id: 'tasks-150', name: 'מכונת משימות', desc: 'השלמת 150 משימות', icon: '📚', cat: 'tasks', metric: 'tasksCompleted', goal: 150 },
  { id: 'tasks-400', name: 'אגדה', desc: 'השלמת 400 משימות', icon: '🏆', cat: 'tasks', metric: 'tasksCompleted', goal: 400 },
  { id: 'clean-slate', name: 'שולחן נקי', desc: 'אין אף משימה פתוחה שחלף מועדה', icon: '🧹', cat: 'tasks', metric: 'noOverdue', goal: 1 },
  { id: 'busy-day', name: 'יום עמוס', desc: 'השלמת 5 משימות ביום אחד', icon: '⚡', cat: 'tasks', metric: 'bestDayCount', goal: 5 },
  { id: 'marathon-day', name: 'מרתון', desc: 'השלמת 10 משימות ביום אחד', icon: '🚀', cat: 'tasks', metric: 'bestDayCount', goal: 10 },

  // --- הגשה מוקדמת והרגלים ---
  { id: 'early-1', name: 'מקדים את הזמן', desc: 'הגשת משימה לפני המועד', icon: '⏰', cat: 'habits', metric: 'earlySubmissions', goal: 1 },
  { id: 'early-25', name: 'תמיד מוכן', desc: '25 הגשות לפני המועד', icon: '🎖️', cat: 'habits', metric: 'earlySubmissions', goal: 25 },
  { id: 'organized', name: 'מאורגן', desc: 'הגדרת 5 מקצועות עם צבעים', icon: '🎨', cat: 'habits', metric: 'subjectCount', goal: 5 },
  { id: 'tagger', name: 'תיוג מקצועי', desc: 'שימוש ב-8 תגיות שונות', icon: '🏷️', cat: 'habits', metric: 'tagCount', goal: 8 },
  { id: 'planner', name: 'מתכנן קדימה', desc: '10 משימות עם תאריך התחלה', icon: '🗓️', cat: 'habits', metric: 'scheduledTasks', goal: 10 },
  { id: 'detailed', name: 'יורד לפרטים', desc: '15 משימות עם תת-משימות', icon: '🧩', cat: 'habits', metric: 'tasksWithSubtasks', goal: 15 },

  // --- רצף ---
  { id: 'streak-3', name: 'תופס תאוצה', desc: 'רצף של 3 ימים', icon: '🔥', cat: 'streak', metric: 'longestStreak', goal: 3 },
  { id: 'streak-7', name: 'שבוע רצוף', desc: 'רצף של 7 ימים', icon: '🔥', cat: 'streak', metric: 'longestStreak', goal: 7 },
  { id: 'streak-30', name: 'חודש בלי לפספס', desc: 'רצף של 30 ימים', icon: '🌟', cat: 'streak', metric: 'longestStreak', goal: 30 },
  { id: 'streak-100', name: 'ברזל', desc: 'רצף של 100 ימים', icon: '💎', cat: 'streak', metric: 'longestStreak', goal: 100 },
  { id: 'perfect-1', name: 'יום מושלם', desc: 'סיימת את כל משימות היום', icon: '🎯', cat: 'streak', metric: 'perfectDays', goal: 1 },
  { id: 'perfect-10', name: '10 ימים מושלמים', desc: '10 ימים שבהם סיימת הכל', icon: '💯', cat: 'streak', metric: 'perfectDays', goal: 10 },
  { id: 'perfect-streak-5', name: 'שבוע ללא רבב', desc: '5 ימים מושלמים ברצף', icon: '✨', cat: 'streak', metric: 'maxPerfectDayStreak', goal: 5 },

  // --- מבחנים ---
  { id: 'exam-1', name: 'המבחן הראשון', desc: 'סימנת מבחן ראשון כהושלם', icon: '📝', cat: 'exams', metric: 'examsCompleted', goal: 1 },
  { id: 'exam-15', name: 'ותיק מבחנים', desc: '15 מבחנים מאחוריך', icon: '🎓', cat: 'exams', metric: 'examsCompleted', goal: 15 },
  { id: 'topics-25', name: 'לומד יסודי', desc: 'סימון 25 נושאי לימוד', icon: '📖', cat: 'exams', metric: 'topicsDone', goal: 25 },
  { id: 'topics-120', name: 'כיסוי מלא', desc: 'סימון 120 נושאי לימוד', icon: '🗂️', cat: 'exams', metric: 'topicsDone', goal: 120 },
  { id: 'prepared-1', name: 'מוכן לגמרי', desc: 'מבחן שכל נושאיו סומנו לפני המועד', icon: '🛡️', cat: 'exams', metric: 'fullyPrepared', goal: 1 },
  { id: 'prepared-10', name: 'שיטתי', desc: '10 מבחנים בהכנה מלאה', icon: '🏅', cat: 'exams', metric: 'fullyPrepared', goal: 10 },
  { id: 'grade-90', name: 'הצטיינות', desc: 'ממוצע ציונים 90 ומעלה (לפחות 3 מבחנים)', icon: '🥇', cat: 'exams', metric: 'avgGrade90', goal: 1 },
  { id: 'improver', name: 'משתפר', desc: 'שלושה מבחנים עוקבים במגמת עלייה', icon: '📈', cat: 'exams', metric: 'improvingStreak', goal: 1 },

  // --- זמן לימוד ---
  { id: 'pomo-1', name: 'עגבנייה ראשונה', desc: 'סשן פומודורו אחד', icon: '🍅', cat: 'study', metric: 'pomodoroSessions', goal: 1 },
  { id: 'pomo-50', name: 'ריכוז עמוק', desc: '50 סשנים', icon: '🧠', cat: 'study', metric: 'pomodoroSessions', goal: 50 },
  { id: 'study-10h', name: '10 שעות לימוד', desc: 'זמן לימוד מצטבר של 10 שעות', icon: '⏱️', cat: 'study', metric: 'studyHours', goal: 10 },
  { id: 'study-100h', name: '100 שעות לימוד', desc: 'זמן לימוד מצטבר של 100 שעות', icon: '⌛', cat: 'study', metric: 'studyHours', goal: 100 },

  // --- רמות ---
  { id: 'level-5', name: 'רמה 5', desc: 'הגעת לרמה 5', icon: '⭐', cat: 'level', metric: 'level', goal: 5 },
  { id: 'level-10', name: 'רמה 10', desc: 'הגעת לרמה 10', icon: '🌠', cat: 'level', metric: 'level', goal: 10 },
  { id: 'level-25', name: 'רמה 25', desc: 'הגעת לרמה 25', icon: '👑', cat: 'level', metric: 'level', goal: 25 },
  { id: 'xp-10k', name: '10,000 נקודות', desc: 'צברת 10,000 XP', icon: '💠', cat: 'level', metric: 'totalXP', goal: 10000 },
];
