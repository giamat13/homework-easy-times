// keys.js — חוזה שמות המפתחות באחסון (נספח א׳). מילה במילה. אל תשנה ערכים כאן.

export const KEYS = Object.freeze({
  tasks: 'homework-list',
  subjects: 'homework-subjects',
  tags: 'homework-tags',
  customFields: 'homework-custom-fields',
  settings: 'homework-settings',
  exams: 'exams-list',
  members: 'group-members',
  gamStats: 'gamification-stats',
  gamAchievements: 'gamification-achievements',
  legacyAchievements: 'homework-achievements', // קריאה בלבד — נקרא, ממוזג, ולא נכתב אליו
  studyToday: 'study-sessions-today',
  theme: 'theme-settings',
  shortcuts: 'quick-actions-settings',
  autoSync: 'autoSyncEnabled',
  lastBackup: 'last-backup-date',
  classroomToken: 'classroom_token',
  classroomMapping: 'classroom_mapping',
  guestProfiles: 'guest_profiles',
  guestActive: 'guest_active_profile',
});

/** מפתחות שמסתנכרנים לענן ומשתייכים למשתמש. */
export const SYNCED = Object.freeze([
  KEYS.tasks, KEYS.subjects, KEYS.tags, KEYS.customFields, KEYS.settings,
  KEYS.exams, KEYS.members, KEYS.gamStats, KEYS.gamAchievements,
  KEYS.studyToday, KEYS.theme, KEYS.shortcuts, KEYS.lastBackup,
  KEYS.classroomMapping,
]);

/**
 * מפתחות גלובליים למכשיר — לא שייכים לפרופיל ולא עולים לענן.
 * classroom_token נשאר מקומי בכוונה: טוקן OAuth לא צריך לשבת ב-Firestore.
 */
export const DEVICE_ONLY = Object.freeze([
  KEYS.guestProfiles, KEYS.guestActive, KEYS.classroomToken, KEYS.autoSync,
]);

/** ברירות מחדל לכל מפתח — כל רשומה חסרה נטענת בלי לקרוס. */
export const DEFAULTS = Object.freeze({
  [KEYS.tasks]: [],
  [KEYS.subjects]: [],
  [KEYS.tags]: [],
  [KEYS.customFields]: [],
  [KEYS.exams]: [],
  [KEYS.members]: [],
  [KEYS.gamAchievements]: [],
  [KEYS.studyToday]: [],
  [KEYS.guestProfiles]: [],
  [KEYS.guestActive]: null,
  [KEYS.classroomMapping]: {},
  [KEYS.autoSync]: true,
  [KEYS.lastBackup]: null,
  [KEYS.settings]: {
    enableNotifications: false,
    notificationDays: 2,
    notificationTime: '08:00',
    autoBackup: false,
    darkMode: false,
    recentColors: [],
    viewMode: 'list',       // 'list' | 'calendar'
    studentMode: true,
    usageMode: 'student',   // 'student' | 'general' | 'group'
    // ↓ תוספות (נספח א׳ מתיר הוספת שדות)
    defaultView: 'list',
    sortBy: 'dueDate',
    hideCompleted: false,
    showFutureTasks: false,
    weekStart: 0,
    pomodoro: { focus: 25, short: 5, long: 15, rounds: 4, autoStart: false },
  },
  [KEYS.gamStats]: {
    level: 1, xp: 0, totalXP: 0, streak: 0, longestStreak: 0,
    lastActivityDate: null, totalTasksCompleted: 0, totalStudyTime: 0,
    perfectDays: 0, perfectDayToday: false, perfectDayStreak: 0,
    maxPerfectDayStreak: 0, lastPerfectDay: null, totalExamsCompleted: 0,
    totalTopicsDone: 0, fullyPreparedExams: 0,
    // ↓ תוספות
    earlySubmissions: 0, pomodoroSessions: 0, xpLog: [],
  },
  [KEYS.theme]: { name: 'indigo', dark: false, followSystem: true, density: 'comfy' },
  [KEYS.shortcuts]: {
    enabled: true,
    bindings: {
      newTask: 'n', search: '/', palette: 'k', toggleView: 'v',
      newExam: 'e', timer: 't', help: '?',
    },
  },
});

export function defaultFor(key) {
  const d = DEFAULTS[key];
  return d === undefined ? null : (typeof d === 'object' && d !== null ? structuredClone(d) : d);
}
