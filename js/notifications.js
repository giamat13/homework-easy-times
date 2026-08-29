// notifications.js — התראות דפדפן X ימים מראש בשעה קבועה, וטוסטים in-app.
// notified / todayNotified נשמרים על המשימה עצמה כדי שלא נציק פעמיים.

import { S, save } from './state.js';
import { toast } from './ui.js';
import { todayISO, daysUntil, relativeDay } from './util.js';
import { nextDate } from './exams.js';

const CHECK_MS = 60_000;
let timer = null;

export function supported() { return 'Notification' in window; }
export function permission() { return supported() ? Notification.permission : 'unsupported'; }

/** מבקש הרשאה. חייב להיקרא מתוך אינטראקציה של המשתמש. */
export async function requestPermission() {
  if (!supported()) { toast('הדפדפן הזה לא תומך בהתראות.', { type: 'warn' }); return 'unsupported'; }
  const p = await Notification.requestPermission();
  if (p === 'granted') toast('התראות הופעלו ✓', { type: 'success' });
  else if (p === 'denied') toast('ההתראות נחסמו. אפשר לשנות בהגדרות הדפדפן.', { type: 'warn', timeout: 7000 });
  return p;
}

function show(title, body, tag) {
  if (permission() !== 'granted') return false;
  try { new Notification(title, { body, tag, dir: 'rtl', lang: 'he' }); return true; }
  catch { return false; }
}

/** האם הגיעה שעת ההתראה היומית (בטווח של עד שעה אחרי). */
function isNotifyTime() {
  const [hh, mm] = String(S.settings.notificationTime || '08:00').split(':').map(Number);
  const now = new Date();
  const target = new Date(); target.setHours(hh || 8, mm || 0, 0, 0);
  const diff = now - target;
  return diff >= 0 && diff < 3600_000;
}

/**
 * בדיקה אחת. מחזיר כמה התראות נשלחו.
 * force=true מדלג על בדיקת השעה (לכפתור "שלח בדיקה").
 */
export function check({ force = false } = {}) {
  if (!S.settings.enableNotifications) return 0;
  if (!force && !isNotifyTime()) return 0;

  const days = Number(S.settings.notificationDays) || 2;
  const today = todayISO();
  let sent = 0, dirty = false;

  for (const t of S.tasks) {
    if (t.completed || t.archived || !t.dueDate) continue;
    const d = daysUntil(t.dueDate);
    if (d === null) continue;

    if (d === 0 && !t.todayNotified) {
      if (show('📌 להגשה היום', t.title, `task-today-${t.id}`)) sent++;
      t.todayNotified = true; dirty = true;
    } else if (d > 0 && d <= days && !t.notified) {
      if (show('⏳ מתקרב מועד ההגשה', `${t.title} — ${relativeDay(t.dueDate)}`, `task-${t.id}`)) sent++;
      t.notified = true; dirty = true;
    } else if (d < 0 && !t.todayNotified) {
      if (show('⚠️ משימה באיחור', `${t.title} — ${relativeDay(t.dueDate)}`, `task-late-${t.id}`)) sent++;
      t.todayNotified = true; dirty = true;
    }
  }

  for (const e of S.exams) {
    if (e.completed || e.archived) continue;
    const nd = nextDate(e); if (!nd) continue;
    const d = daysUntil(nd);
    const lead = e.reminderDays ?? Math.max(days, 3);
    if (d !== null && d >= 0 && d <= lead && e.lastNotified !== today) {
      const left = e.topics?.filter((t) => !t.done).length || 0;
      const body = left ? `${relativeDay(nd)} · נותרו ${left} נושאים ללמוד` : relativeDay(nd);
      if (show('📝 מבחן מתקרב', `${e.title} — ${body}`, `exam-${e.id}`)) sent++;
      e.lastNotified = today; dirty = true;
    }
  }

  if (dirty) { save('tasks'); save('exams'); }
  return sent;
}

/** תקציר in-app שמופיע פעם ביום בפתיחת האפליקציה. */
export function dailyBriefing() {
  const today = todayISO();
  if (localStorage.getItem('__briefed') === today) return;
  localStorage.setItem('__briefed', today);

  const open = S.tasks.filter((t) => !t.completed && !t.archived);
  const dueToday = open.filter((t) => t.dueDate === today).length;
  const late = open.filter((t) => t.dueDate && t.dueDate < today).length;
  const exams = S.exams.filter((e) => !e.completed && !e.archived)
    .filter((e) => { const d = daysUntil(nextDate(e)); return d !== null && d >= 0 && d <= 7; }).length;

  const parts = [];
  if (late) parts.push(`${late} באיחור`);
  if (dueToday) parts.push(`${dueToday} להיום`);
  if (exams) parts.push(`${exams} מבחנים השבוע`);
  if (!parts.length) return;
  toast(`בוקר טוב! ${parts.join(' · ')}`, { type: late ? 'warn' : 'info', timeout: 8000 });
}

export function startNotificationLoop() {
  stopNotificationLoop();
  check();
  timer = setInterval(check, CHECK_MS);
  // איפוס דגלי "היום" בחצות
  const t = setTimeout(resetDailyFlags, msUntilMidnight());
  return () => { clearInterval(timer); clearTimeout(t); };
}
export function stopNotificationLoop() { clearInterval(timer); timer = null; }

function msUntilMidnight() {
  const n = new Date(), m = new Date(n); m.setHours(24, 0, 5, 0);
  return m - n;
}
function resetDailyFlags() {
  for (const t of S.tasks) t.todayNotified = false;
  save('tasks');
  setTimeout(resetDailyFlags, msUntilMidnight());
}
