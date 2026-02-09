// Patch לטעינת הישגים מ-JSON
// הוסף את הקוד הזה ל-gamification.js

// החלף את initializeAchievements() בפונקציה הזו:

async initializeAchievements() {
  console.log('🏆 initializeAchievements: Loading achievements from JSON...');
  
  try {
    console.log('📄 initializeAchievements: Fetching achievements-config.json...');
    const response = await fetch('achievements-config.json');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const config = await response.json();
    console.log('✅ initializeAchievements: JSON loaded successfully');
    console.log('📊 initializeAchievements: Config:', config);
    
    this.achievements = config.achievements.map(ach => {
      console.log(`🎯 initializeAchievements: Processing achievement "${ach.id}"`);
      
      return {
        id: ach.id,
        name: ach.name,
        description: ach.description,
        icon: ach.icon,
        xp: ach.xp,
        category: ach.category,
        condition: (stats) => {
          console.log(`🔍 Checking condition for ${ach.id}: type=${ach.condition_type}, value=${ach.condition_value}`);
          
          switch(ach.condition_type) {
            case 'tasks_completed':
              const tasksResult = stats.totalTasksCompleted >= ach.condition_value;
              console.log(`📊 ${ach.id}: totalTasksCompleted=${stats.totalTasksCompleted}, required=${ach.condition_value}, result=${tasksResult}`);
              return tasksResult;
              
            case 'streak':
              const streakResult = stats.streak >= ach.condition_value;
              console.log(`🔥 ${ach.id}: streak=${stats.streak}, required=${ach.condition_value}, result=${streakResult}`);
              return streakResult;
              
            case 'study_time':
              const studyResult = stats.totalStudyTime >= ach.condition_value;
              console.log(`⏰ ${ach.id}: totalStudyTime=${stats.totalStudyTime}, required=${ach.condition_value}, result=${studyResult}`);
              return studyResult;
              
            case 'perfect_days':
              const perfectResult = stats.perfectDays >= ach.condition_value;
              console.log(`✨ ${ach.id}: perfectDays=${stats.perfectDays}, required=${ach.condition_value}, result=${perfectResult}`);
              return perfectResult;
              
            case 'exams_practiced':
              const examsResult = (stats.examsPracticed || 0) >= ach.condition_value;
              console.log(`📝 ${ach.id}: examsPracticed=${stats.examsPracticed || 0}, required=${ach.condition_value}, result=${examsResult}`);
              return examsResult;
              
            case 'special':
              console.log(`🌟 ${ach.id}: Special condition: ${ach.condition_value}`);
              return this.checkSpecialCondition(ach.condition_value, stats);
              
            default:
              console.warn(`⚠️ ${ach.id}: Unknown condition type: ${ach.condition_type}`);
              return false;
          }
        }
      };
    });
    
    console.log(`✅ initializeAchievements: Successfully loaded ${this.achievements.length} achievements from JSON`);
    
  } catch (error) {
    console.error('❌ initializeAchievements: Error loading JSON:', error);
    console.error('❌ initializeAchievements: Error details:', error.message, error.stack);
    console.log('🔄 initializeAchievements: Falling back to default achievements');
    this.initializeDefaultAchievements();
  }
}

// פונקציה חדשה לבדיקת תנאים מיוחדים:

checkSpecialCondition(condition, stats) {
  console.log(`🌟 checkSpecialCondition: Checking "${condition}"`);
  
  switch(condition) {
    case 'early_completion':
      // מימוש בפונקציה נפרדת שתקרא כשמשימה מושלמת מוקדם
      console.log('🌅 checkSpecialCondition: early_completion - checked elsewhere');
      return false;
      
    case 'late_completion':
      // מימוש בפונקציה נפרדת שתקרא כשמשימה מושלמת מאוחר
      console.log('🦉 checkSpecialCondition: late_completion - checked elsewhere');
      return false;
      
    case 'daily_tasks_5':
      // מימוש בפונקציה נפרדת שתקרא אחרי כל משימה
      console.log('⚡ checkSpecialCondition: daily_tasks_5 - checked elsewhere');
      return false;
      
    case 'daily_tasks_10':
      console.log('🏃 checkSpecialCondition: daily_tasks_10 - checked elsewhere');
      return false;
      
    case 'colors_10':
      // בדיקת מספר צבעים ייחודיים שבשימוש
      if (typeof subjects !== 'undefined') {
        const uniqueColors = new Set(subjects.map(s => s.color));
        const result = uniqueColors.size >= 10;
        console.log(`🎨 checkSpecialCondition: colors_10 - unique colors=${uniqueColors.size}, result=${result}`);
        return result;
      }
      return false;
      
    case 'tags_5':
      // בדיקת מספר תגיות
      if (typeof availableTags !== 'undefined') {
        const result = availableTags.length >= 5;
        console.log(`🏷️ checkSpecialCondition: tags_5 - tags=${availableTags.length}, result=${result}`);
        return result;
      }
      return false;
      
    case 'comeback':
      console.log('💪 checkSpecialCondition: comeback - checked on login');
      return false;
      
    case 'zero_pending':
      if (typeof homework !== 'undefined') {
        const pending = homework.filter(h => !h.completed).length;
        const result = pending === 0 && homework.length > 0;
        console.log(`🎊 checkSpecialCondition: zero_pending - pending=${pending}, total=${homework.length}, result=${result}`);
        return result;
      }
      return false;
      
    default:
      console.warn(`⚠️ checkSpecialCondition: Unknown special condition: ${condition}`);
      return false;
  }
}

// פונקציה חדשה - fallback להישגים מקוריים:

initializeDefaultAchievements() {
  console.log('🔄 initializeDefaultAchievements: Using hardcoded achievements as fallback');
  
  // כאן תעתיק את כל ההישגים המקוריים מהקוד שלך
  this.achievements = [
    {
      id: 'first-task',
      name: 'צעד ראשון',
      description: 'השלם את המשימה הראשונה שלך',
      icon: '🎯',
      condition: (stats) => stats.totalTasksCompleted >= 1,
      xp: 10,
      category: 'tasks'
    },
    {
      id: 'task-master-10',
      name: 'מתחיל מבטיח',
      description: 'השלם 10 משימות',
      icon: '⭐',
      condition: (stats) => stats.totalTasksCompleted >= 10,
      xp: 50,
      category: 'tasks'
    },
    {
      id: 'task-master-50',
      name: 'מומחה משימות',
      description: 'השלם 50 משימות',
      icon: '🌟',
      condition: (stats) => stats.totalTasksCompleted >= 50,
      xp: 200,
      category: 'tasks'
    },
    {
      id: 'task-master-100',
      name: 'אלוף המשימות',
      description: 'השלם 100 משימות',
      icon: '🏅',
      condition: (stats) => stats.totalTasksCompleted >= 100,
      xp: 500,
      category: 'tasks'
    },
    {
      id: 'streak-3',
      name: 'מתחמם',
      description: 'השלם משימות 3 ימים ברצף',
      icon: '🔥',
      condition: (stats) => stats.streak >= 3,
      xp: 30,
      category: 'streaks'
    },
    {
      id: 'streak-7',
      name: 'שבוע מושלם',
      description: 'השלם משימות 7 ימים ברצף',
      icon: '🔥🔥',
      condition: (stats) => stats.streak >= 7,
      xp: 100,
      category: 'streaks'
    },
    {
      id: 'streak-30',
      name: 'חודש של מצוינות',
      description: 'השלם משימות 30 ימים ברצף',
      icon: '🔥🔥🔥',
      condition: (stats) => stats.streak >= 30,
      xp: 500,
      category: 'streaks'
    },
    {
      id: 'study-1h',
      name: 'שעה ראשונה',
      description: 'למד שעה אחת',
      icon: '⏰',
      condition: (stats) => stats.totalStudyTime >= 60,
      xp: 20,
      category: 'study'
    },
    {
      id: 'study-10h',
      name: 'סטודנט מסור',
      description: 'למד 10 שעות',
      icon: '📚',
      condition: (stats) => stats.totalStudyTime >= 600,
      xp: 100,
      category: 'study'
    },
    {
      id: 'study-50h',
      name: 'מלומד',
      description: 'למד 50 שעות',
      icon: '🎓',
      condition: (stats) => stats.totalStudyTime >= 3000,
      xp: 300,
      category: 'study'
    },
    {
      id: 'study-100h',
      name: 'חכם על',
      description: 'למד 100 שעות',
      icon: '🧠',
      condition: (stats) => stats.totalStudyTime >= 6000,
      xp: 1000,
      category: 'study'
    },
    {
      id: 'perfect-day-1',
      name: 'יום מושלם',
      description: 'השלם את כל המשימות של היום',
      icon: '✨',
      condition: (stats) => stats.perfectDays >= 1,
      xp: 50,
      category: 'perfect'
    },
    {
      id: 'perfect-day-7',
      name: 'שבוע מצטיין',
      description: '7 ימים מושלמים',
      icon: '⭐✨',
      condition: (stats) => stats.perfectDays >= 7,
      xp: 200,
      category: 'perfect'
    },
    {
      id: 'perfect-day-30',
      name: 'חודש של שלמות',
      description: '30 ימים מושלמים',
      icon: '🌟✨',
      condition: (stats) => stats.perfectDays >= 30,
      xp: 1000,
      category: 'perfect'
    }
    // ... שאר ההישגים המקוריים
  ];
  
  console.log(`✅ initializeDefaultAchievements: Loaded ${this.achievements.length} default achievements`);
}

// אל תשכח להוסיף examsPracticed ל-userStats!
// בקונסטרוקטור של GamificationManager:

constructor() {
  this.userStats = {
    level: 1,
    xp: 0,
    totalXP: 0,
    streak: 0,
    longestStreak: 0,
    lastActivityDate: null,
    totalTasksCompleted: 0,
    totalStudyTime: 0,
    perfectDays: 0,
    examsPracticed: 0  // <-- הוסף שורה זו!
  };
  
  // ... שאר הקוד
}
