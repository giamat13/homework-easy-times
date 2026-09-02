// boot.js — אתחול משותף לכל המסכים. כל דף קורא ל-boot() ומקבל הקשר מוכן.

import { initTheme } from './theme.js';
import { initAuth, getSession } from './auth.js';
import { loadAll, onData, terms } from './state.js';
import { loadGam, refreshStreak } from './gamification.js';
import { initTimer } from './timer.js';
import { startNotificationLoop, dailyBriefing } from './notifications.js';
import { initShortcuts } from './shortcuts.js';
import { renderNav, navHost } from './nav.js';
import { openPalette } from './search.js';
import { openTimer } from './timerview.js';
import { openTaskForm } from './taskform.js';
import { openExamForm } from './examform.js';
import { installErrorReporting, toast } from './ui.js';
import { maybeRemindBackup } from './exportimport.js';
import { validateDefinitions } from './achievements.js';
import { migrate, migrationMessage } from './migrate.js';

let booted = null;

/**
 * boot({ onChange, shortcuts }) -> { session, refresh }
 * onChange נקרא בכל פעם שהמודל משתנה ממקור חיצוני (סנכרון, טאב אחר).
 */
export function boot({ onChange = () => {}, shortcuts = {} } = {}) {
  if (booted) return booted;
  booted = (async () => {
    installErrorReporting();
    initTheme();

    // לפני initAuth: הפרופילים והסקופים נקבעים שם, וצריך שהתמונות של 1.0 כבר יהיו במקום.
    const migrated = migrate();

    await initAuth();
    loadAll();
    loadGam();
    refreshStreak();
    initTimer();
    initTheme(); // שוב — עכשיו עם ההגדרות של המשתמש הנכון

    const refresh = () => { onChange(); };
    onData(() => refresh());

    renderNav(navHost(), { onChange: refresh });

    initShortcuts({
      palette: () => openPalette({ onChange: refresh }),
      search: () => openPalette({ onChange: refresh }),
      newTask: () => openTaskForm(null, refresh),
      // מבחנים לא רלוונטיים במצב "כללי"/"קבוצה" — אין להם דף, לוח פקודות או ניווט; גם לא קיצור מקלדת.
      ...(terms().hasExams ? { newExam: () => openExamForm(null, refresh) } : {}),
      timer: () => openTimer(),
      ...shortcuts,
    });

    startNotificationLoop();
    setTimeout(() => { dailyBriefing(); maybeRemindBackup(); }, 900);

    const msg = migrationMessage(migrated);
    if (msg) toast(msg, { type: 'success', timeout: 8000 });

    // בדיקת שפיות של הגדרות ההישגים — נכשלת בקול ולא בשקט
    const problems = validateDefinitions();
    if (problems.length) {
      console.error('[achievements] הגדרות שבורות:', problems);
      toast(`אזהרה: ${problems.length} הישגים מוגדרים לא נכון (ראה קונסול).`, { type: 'warn', timeout: 8000 });
    }

    document.body.classList.add('is-ready');
    return { session: getSession(), refresh };
  })();
  return booted;
}

/** עוטף מסך: מציג שגיאה ידידותית במקום דף לבן. */
export async function page(fn) {
  try {
    const ctx = await booted;
    await fn(ctx);
  } catch (e) {
    console.error(e);
    document.querySelector('#view')?.replaceChildren(
      Object.assign(document.createElement('div'), {
        className: 'empty',
        innerHTML: '<div class="empty__icon">😕</div><h3>משהו השתבש בטעינת המסך</h3>',
      }),
    );
    toast(e.message || 'טעינת המסך נכשלה', { type: 'error', timeout: 9000 });
  }
}
