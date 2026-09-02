// timer.js — פומודורו מלא: מיקוד, הפסקה קצרה/ארוכה, מעקב זמן מצטבר, וחיבור ל-XP.
// שורד רענון דף: המצב נשמר עם חותמת זמן ומחושב מחדש מהשעון האמיתי.

import * as store from './storage.js';
import { KEYS } from './keys.js';
import { S } from './state.js';
import { awardStudy } from './gamification.js';
import { todayISO, fmtTime } from './util.js';

const RUN_KEY = '__timer-run'; // מצב ריצה — מקומי למכשיר, לא מסתנכרן

export const PHASES = {
  focus: { name: 'מיקוד', icon: '📚' },
  short: { name: 'הפסקה קצרה', icon: '☕' },
  long: { name: 'הפסקה ארוכה', icon: '🌿' },
};

const subs = new Set();
let tick = null;
let run = null; // { phase, endsAt, pausedLeft, round, taskId }

export function onTimer(fn) { subs.add(fn); fn(getState()); return () => subs.delete(fn); }
function emit() { const s = getState(); for (const f of subs) { try { f(s); } catch (e) { console.error(e); } } }

function cfg() {
  const p = S.settings.pomodoro || {};
  return { focus: p.focus || 25, short: p.short || 5, long: p.long || 15, rounds: p.rounds || 4, autoStart: !!p.autoStart };
}

function loadRun() { try { return JSON.parse(localStorage.getItem(RUN_KEY) || 'null'); } catch { return null; } }
function saveRun() { try { run ? localStorage.setItem(RUN_KEY, JSON.stringify(run)) : localStorage.removeItem(RUN_KEY); } catch { /* noop */ } }

export function getState() {
  const c = cfg();
  if (!run) return { running: false, paused: false, phase: 'focus', left: c.focus * 60, total: c.focus * 60, round: 0, config: c };
  const total = c[run.phase] * 60;
  const left = run.pausedLeft !== null && run.pausedLeft !== undefined
    ? run.pausedLeft
    : Math.max(0, Math.round((run.endsAt - Date.now()) / 1000));
  return { running: run.pausedLeft === null || run.pausedLeft === undefined, paused: run.pausedLeft != null, phase: run.phase, left, total, round: run.round, taskId: run.taskId, config: c };
}

export function start(phase = 'focus', { taskId = null, round } = {}) {
  const c = cfg();
  run = {
    phase, endsAt: Date.now() + c[phase] * 60000, pausedLeft: null,
    round: round ?? (run?.round || 0), taskId: taskId ?? run?.taskId ?? null,
  };
  saveRun(); startTick(); emit();
}

export function pause() {
  if (!run || run.pausedLeft != null) return;
  run.pausedLeft = Math.max(0, Math.round((run.endsAt - Date.now()) / 1000));
  saveRun(); stopTick(); emit();
}

export function resume() {
  if (!run || run.pausedLeft == null) return;
  run.endsAt = Date.now() + run.pausedLeft * 1000;
  run.pausedLeft = null;
  saveRun(); startTick(); emit();
}

/** עצירה מוקדמת. זמן מיקוד שכבר נצבר נזקף לזכות המשתמש. */
export function stop({ credit = true } = {}) {
  if (!run) return;
  const st = getState();
  const elapsedMin = Math.floor((st.total - st.left) / 60);
  if (credit && run.phase === 'focus' && elapsedMin >= 1) {
    logSession(elapsedMin, 'focus', run.taskId);
    awardStudy(elapsedMin, { pomodoro: false });
  }
  run = null; saveRun(); stopTick(); emit();
}

export function reset() { run = null; saveRun(); stopTick(); emit(); }

export function setTask(taskId) { if (run) { run.taskId = taskId; saveRun(); } emit(); }

function startTick() { stopTick(); tick = setInterval(onTick, 250); }
function stopTick() { clearInterval(tick); tick = null; }

function onTick() {
  if (!run || run.pausedLeft != null) return;
  if (Date.now() < run.endsAt) { emit(); return; }
  complete();
}

/** סיום טבעי של שלב. */
function complete() {
  const c = cfg();
  const finished = run.phase;
  const taskId = run.taskId;
  let round = run.round;
  let result = null;

  if (finished === 'focus') {
    round += 1;
    logSession(c.focus, 'focus', taskId);
    result = awardStudy(c.focus, { pomodoro: true });
  }
  const next = finished === 'focus' ? (round % c.rounds === 0 ? 'long' : 'short') : 'focus';

  run = null; stopTick();
  notify(finished, next);

  if (c.autoStart) start(next, { taskId, round });
  else { run = { phase: next, endsAt: Date.now() + c[next] * 60000, pausedLeft: c[next] * 60, round, taskId }; saveRun(); }
  emit();

  for (const f of subs) { try { f(getState(), { completed: finished, next, achievements: result?.newAchievements || [] }); } catch (e) { console.error(e); } }
}

function notify(finished, next) {
  const msg = finished === 'focus'
    ? `סיימת ${cfg().focus} דקות מיקוד. זמן ל${PHASES[next].name}.`
    : 'ההפסקה נגמרה — חוזרים למיקוד.';
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('⏱️ הטיימר סיים', { body: msg, tag: 'pomodoro' });
    }
  } catch { /* noop */ }
  beep();
}

function beep() {
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    const o = ac.createOscillator(), g = ac.createGain();
    o.connect(g); g.connect(ac.destination);
    o.frequency.value = 660; o.type = 'sine';
    g.gain.setValueAtTime(0.0001, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.25, ac.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.9);
    o.start(); o.stop(ac.currentTime + 0.95);
    setTimeout(() => ac.close(), 1200);
  } catch { /* דפדפן חסם אודיו — לא קריטי */ }
}

// ---------- יומן סשנים ----------

function logSession(minutes, phase, taskId) {
  const today = todayISO();
  const list = (store.get(KEYS.studyToday) || []).filter((s) => s.date === today);
  list.push({ date: today, minutes, phase, taskId: taskId || null, at: new Date().toISOString() });
  store.set(KEYS.studyToday, list);
}

export function todaySessions() {
  const today = todayISO();
  return (store.get(KEYS.studyToday) || []).filter((s) => s.date === today);
}

export function todayMinutes() { return todaySessions().reduce((a, s) => a + (s.minutes || 0), 0); }

export function todaySummary() {
  const s = todaySessions();
  return { sessions: s.length, minutes: s.reduce((a, x) => a + (x.minutes || 0), 0), label: fmtTime(s.reduce((a, x) => a + (x.minutes || 0), 0)) };
}

// ---------- אתחול ----------

export function initTimer() {
  run = loadRun();
  if (run) {
    // אם הדף היה סגור כשהטיימר נגמר — סוגרים את השלב מיד
    if (run.pausedLeft == null && Date.now() >= run.endsAt) complete();
    else if (run.pausedLeft == null) startTick();
  }
  // ניקוי סשנים של ימים קודמים
  const today = todayISO();
  const list = store.get(KEYS.studyToday) || [];
  if (list.some((s) => s.date !== today)) store.set(KEYS.studyToday, list.filter((s) => s.date === today));
  emit();
}
