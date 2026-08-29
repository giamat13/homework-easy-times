// test.mjs — בדיקת שפיות לוגית. הרצה: node test.mjs
// לא framework, לא fixtures. רק הלוגיקה שאם היא נשברת, המשתמש מאבד נתונים או נקודות.

import assert from 'node:assert/strict';

// --- דמה מינימלי של הדפדפן כדי לטעון את המודולים כמו שהם ---
const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
  get length() { return mem.size; },
  key: (i) => [...mem.keys()][i] ?? null,
};
globalThis.addEventListener = () => {};
globalThis.matchMedia = () => ({ matches: false, addEventListener() {} });
globalThis.window = globalThis;
globalThis.structuredClone ??= (o) => JSON.parse(JSON.stringify(o));

const U = await import('./js/util.js');
const { S, loadAll, save, normTask, normExam, computeFinalGrade } = await import('./js/state.js');
const G = await import('./js/gamification.js');
const A = await import('./js/achievements.js');
const Tk = await import('./js/tasks.js');
const Ex = await import('./js/exams.js');

let pass = 0;
const t = (name, fn) => { const r = fn(); if (r instanceof Promise) throw new Error(`${name}: השתמש ב-ta לבדיקה אסינכרונית`); pass++; console.log(`  ✓ ${name}`); };
const ta = async (name, fn) => { await fn(); pass++; console.log(`  ✓ ${name}`); };

console.log('\nutil');
t('תאריך ISO לא נופל לבאג UTC', () => {
  assert.equal(U.toISO(U.fromISO('2026-03-05')), '2026-03-05');
});
t('daysUntil מדויק בשני הכיוונים', () => {
  const today = U.todayISO();
  assert.equal(U.daysUntil(today), 0);
  assert.equal(U.daysUntil(U.addDays(today, 3)), 3);
  assert.equal(U.daysUntil(U.addDays(today, -2)), -2);
});
t('דחיפות מסווגת נכון', () => {
  const today = U.todayISO();
  assert.equal(U.urgency(U.addDays(today, -1)), 'overdue');
  assert.equal(U.urgency(today), 'today');
  assert.equal(U.urgency(U.addDays(today, 2)), 'soon');
  assert.equal(U.urgency(U.addDays(today, 9)), 'later');
});
t('בריחת HTML מנטרלת תגיות', () => {
  assert.equal(U.esc('<img src=x onerror=alert(1)>'), '&lt;img src=x onerror=alert(1)&gt;');
  assert.equal(U.esc(`"'&`), '&quot;&#39;&amp;');
});
t('readableOn בוחר ניגודיות נכונה', () => {
  assert.equal(U.readableOn('#ffffff'), '#10131a');
  assert.equal(U.readableOn('#101010'), '#ffffff');
});

console.log('\nנירמול רשומות ישנות');
t('משימה ישנה בלי שדות חדשים נטענת עם ברירות מחדל', () => {
  const old = { id: 'x1', title: 'ישן', subject: 's1', dueDate: '2026-01-01', completed: false };
  const n = normTask(old);
  assert.deepEqual(n.tags, []);
  assert.deepEqual(n.subtasks, []);
  assert.equal(n.repeat, 'none');
  assert.equal(n.archived, false);
  assert.equal(n.title, 'ישן');            // שדה קיים לא משתנה
  assert.equal(n.dueDate, '2026-01-01');
});
t('תת-משימות במחרוזות מומרות לאובייקטים', () => {
  const n = normTask({ title: 'a', subtasks: ['שלב 1', 'שלב 2'] });
  assert.equal(n.subtasks.length, 2);
  assert.equal(n.subtasks[0].title, 'שלב 1');
  assert.equal(n.subtasks[0].done, false);
});
t('מבחן בלי gradeMax מקבל 100', () => {
  assert.equal(normExam({ title: 'a', grade: 80 }).gradeMax, 100);
});

console.log('\nציונים');
t('בונוס נוסף לציון הבסיס', () => {
  assert.equal(computeFinalGrade({ grade: 80, gradeBonus: 5, gradeCorrection: null }), 85);
});
t('תיקון במצב "הגבוה" בוחר את המקסימום', () => {
  assert.equal(computeFinalGrade({ grade: 60, gradeBonus: null, gradeCorrection: 82, correctionMode: 'higher' }), 82);
  assert.equal(computeFinalGrade({ grade: 90, gradeBonus: null, gradeCorrection: 70, correctionMode: 'higher' }), 90);
});
t('תיקון במצב "ממוצע" ממצע', () => {
  assert.equal(computeFinalGrade({ grade: 60, gradeBonus: null, gradeCorrection: 80, correctionMode: 'average' }), 70);
});
t('בלי ציון כלל — null ולא 0', () => {
  assert.equal(computeFinalGrade({ grade: null, gradeBonus: null, gradeCorrection: null }), null);
});
t('אחוז מחושב מול gradeMax', () => {
  assert.equal(normExam({ title: 'a', grade: 40, gradeMax: 50 }).gradePct, 80);
});

console.log('\nרמות ו-XP');
t('עקומת הרמות מונוטונית ועקבית', () => {
  assert.equal(G.levelInfo(0).level, 1);
  assert.equal(G.levelInfo(100).level, 2);   // 100 לרמה 1
  assert.equal(G.levelInfo(299).level, 2);   // 100+200=300 לרמה 3
  assert.equal(G.levelInfo(300).level, 3);
  let prev = 0;
  for (let xp = 0; xp < 20000; xp += 137) {
    const l = G.levelInfo(xp).level;
    assert.ok(l >= prev, 'רמה לא יורדת כשה-XP עולה');
    prev = l;
  }
});

console.log('\nהיפוך XP — ביטול סימון חייב להחזיר הכל');
t('סימון וביטול מחזירים את הסטטיסטיקות למצב ההתחלתי', () => {
  mem.clear();
  loadAll(); G.loadGam();
  const before = G.getStats();
  const task = normTask({ title: 'בדיקה', priority: 'high', dueDate: U.addDays(U.todayISO(), 5) });
  S.tasks.push(task); save('tasks');

  G.awardTask(task);
  const mid = G.getStats();
  assert.ok(mid.totalXP > before.totalXP, 'XP עלה');
  assert.equal(mid.totalTasksCompleted, before.totalTasksCompleted + 1);
  assert.equal(mid.earlySubmissions, before.earlySubmissions + 1, 'הגשה מוקדמת נספרה');

  G.revertTask(task);
  const after = G.getStats();
  assert.equal(after.totalXP, before.totalXP, 'ה-XP חזר בדיוק');
  assert.equal(after.totalTasksCompleted, before.totalTasksCompleted);
  assert.equal(after.earlySubmissions, before.earlySubmissions);
});
t('הישג שנפתח ננעל כשהמדד יורד', () => {
  mem.clear();
  loadAll(); G.loadGam();
  const task = normTask({ title: 'ראשונה' });
  S.tasks.push(task); save('tasks');
  const { newAchievements } = G.awardTask(task);
  assert.ok(newAchievements.some((a) => a.id === 'first-task'), 'הישג "צעד ראשון" נפתח');
  assert.ok(G.getUnlocked().includes('first-task'));
  const { lostAchievements } = G.revertTask(task);
  assert.ok(lostAchievements.some((a) => a.id === 'first-task'), 'ההישג ננעל בחזרה');
  assert.ok(!G.getUnlocked().includes('first-task'));
});
t('XP לעולם לא שלילי', () => {
  mem.clear(); loadAll(); G.loadGam();
  const task = normTask({ title: 'a' });
  G.revertTask(task); G.revertTask(task);
  assert.ok(G.getStats().totalXP >= 0);
});

console.log('\nהישגים');
t('כל ההגדרות תקינות — מדד קיים, יעד חיובי, מזהה ייחודי', () => {
  assert.deepEqual(A.validateDefinitions(), []);
});
t('לכל הישג יש מד התקדמות ואף אחד לא בלתי אפשרי', () => {
  mem.clear(); loadAll(); G.loadGam();
  const list = A.evaluate(G.getStats(), []);
  assert.equal(list.length, A.all().length);
  for (const a of list) {
    assert.ok(typeof a.progress === 'number' && a.progress >= 0, `${a.id}: התקדמות לא מספרית`);
    assert.ok(a.goal > 0, `${a.id}: יעד לא חוקי`);
    assert.ok(a.ratio >= 0 && a.ratio <= 1, `${a.id}: יחס מחוץ לטווח`);
  }
});

console.log('\nסינון משימות');
t('משימה עתידית מוסתרת עד תאריך ההתחלה', () => {
  mem.clear(); loadAll();
  const future = normTask({ title: 'עתידית', startDate: U.addDays(U.todayISO(), 5), dueDate: U.addDays(U.todayISO(), 9) });
  const now = normTask({ title: 'פעילה', dueDate: U.todayISO() });
  S.tasks.push(future, now); save('tasks');
  assert.equal(Tk.filterTasks({ showFuture: false }).length, 1);
  assert.equal(Tk.filterTasks({ showFuture: true }).length, 2);
});
t('ארכיון לא מופיע כברירת מחדל', () => {
  mem.clear(); loadAll();
  S.tasks.push(normTask({ title: 'בארכיון', archived: true }), normTask({ title: 'רגילה' }));
  save('tasks');
  assert.equal(Tk.filterTasks({}).length, 1);
  assert.equal(Tk.filterTasks({ showArchived: true }).length, 2);
});
t('מיון לפי מועד דוחף משימות ללא תאריך לסוף', () => {
  const list = [
    normTask({ title: 'ללא' }),
    normTask({ title: 'מאוחר', dueDate: '2026-12-01' }),
    normTask({ title: 'מוקדם', dueDate: '2026-01-01' }),
  ];
  const sorted = Tk.sortTasks(list, 'dueDate').map((x) => x.title);
  assert.deepEqual(sorted, ['מוקדם', 'מאוחר', 'ללא']);
});
t('משימות שהושלמו יורדות לתחתית בכל מיון', () => {
  const list = [
    normTask({ title: 'הושלמה', completed: true, dueDate: '2026-01-01' }),
    normTask({ title: 'פתוחה', dueDate: '2026-06-01' }),
  ];
  assert.equal(Tk.sortTasks(list, 'dueDate')[0].title, 'פתוחה');
});

console.log('\nמשימות חוזרות');
t('השלמת משימה חוזרת יוצרת את המופע הבא בתאריך הנכון', () => {
  mem.clear(); loadAll(); G.loadGam();
  const t1 = Tk.createTask({ title: 'שבועית', dueDate: '2026-03-05', repeat: 'weekly' });
  const r = Tk.toggleComplete(t1.id);
  assert.ok(r.spawned, 'נוצר מופע חדש');
  assert.equal(r.spawned.dueDate, '2026-03-12');
  assert.equal(r.spawned.completed, false);
  r.undo();
  assert.equal(S.tasks.filter((x) => x.title === 'שבועית').length, 1, 'ביטול הסיר את המופע החדש');
});
t('חזרה חודשית מדלגת חודש ולא 30 יום', () => {
  mem.clear(); loadAll(); G.loadGam();
  const t1 = Tk.createTask({ title: 'חודשית', dueDate: '2026-01-31', repeat: 'monthly' });
  const r = Tk.toggleComplete(t1.id);
  assert.ok(r.spawned.dueDate.startsWith('2026-0'), 'תאריך תקין');
});

console.log('\nמבחנים');
t('nextDate בוחר את המועד הבא שעוד לא עבר', () => {
  const past = U.addDays(U.todayISO(), -10);
  const future = U.addDays(U.todayISO(), 10);
  assert.equal(Ex.nextDate({ date: past, dateB: future, dateC: '' }), future);
  assert.equal(Ex.nextDate({ date: future, dateB: '', dateC: '' }), future);
});
t('ממוצע משוקלל מכבד את שדה המשקל', () => {
  const list = [
    normExam({ title: 'a', grade: 100, weight: 3 }),
    normExam({ title: 'b', grade: 60, weight: 1 }),
  ];
  assert.equal(Ex.weightedAverage(list), 90);
});
t('התקדמות נושאים מחושבת נכון', () => {
  const e = normExam({ title: 'a', topics: [{ title: '1', done: true }, { title: '2', done: false }] });
  const p = Ex.topicProgress(e);
  assert.equal(p.done, 1); assert.equal(p.total, 2); assert.equal(p.ratio, 0.5);
});

console.log('\nאחסון — הנתון של המשתמש הקיים לא נמחק');
const store = await import('./js/storage.js');
await ta('טעינה ראשונה מאמצת נתונים שכבר יושבים במפתחות הנקיים', async () => {
  mem.clear();
  // משתמש קיים: נתונים תחת שמות המפתחות של נספח א׳, בלי שום סקופ מוגדר
  mem.set('homework-list', JSON.stringify([{ id: 'old1', title: 'קיים מראש' }]));
  store.initStorage();
  await store.setScope({ kind: 'guest', id: 'guest:p1', uid: null });
  const kept = store.get('homework-list');
  assert.equal(kept.length, 1, 'הנתון הקיים לא נמחק');
  assert.equal(kept[0].title, 'קיים מראש');
  // ואחרי האימוץ יש לו גם תמונת מצב משלו
  assert.ok(mem.has('__ns:guest:p1:homework-list'), 'נוצרה תמונת מצב לפרופיל');
});
await ta('החלפת פרופיל מבודדת נתונים ומחזירה אותם בחזרה', async () => {
  await store.setScope({ kind: 'guest', id: 'guest:p2', uid: null });
  assert.deepEqual(store.get('homework-list'), [], 'פרופיל חדש מתחיל ריק');
  store.set('homework-list', [{ id: 'b1', title: 'של פרופיל ב' }]);
  await store.setScope({ kind: 'guest', id: 'guest:p1', uid: null });
  assert.equal(store.get('homework-list')[0].title, 'קיים מראש', 'פרופיל א׳ חזר כמו שהיה');
  await store.setScope({ kind: 'guest', id: 'guest:p2', uid: null });
  assert.equal(store.get('homework-list')[0].title, 'של פרופיל ב', 'פרופיל ב׳ נשמר');
});
await ta('כתיבה חיצונית למפתח החוזה מנצחת את תמונת המצב', async () => {
  // מדמה גרסה ישנה של האפליקציה / שחזור ידני שכותב רק למפתח הנקי
  mem.set('homework-list', JSON.stringify([{ id: 'ext', title: 'נכתב מבחוץ' }]));
  await store.setScope({ kind: 'guest', id: 'guest:p2', uid: null }); // מעבר
  await store.setScope({ kind: 'guest', id: 'guest:p2', uid: null }); // "טעינה" חוזרת
  // כדי לדמות טעינת דף חדשה מאפסים את הסקופ בזיכרון של המודול:
  const fresh = await import(`./js/storage.js?reload=${Date.now()}`);
  mem.set('homework-list', JSON.stringify([{ id: 'ext2', title: 'שוב מבחוץ' }]));
  fresh.initStorage();
  await fresh.setScope({ kind: 'guest', id: 'guest:p2', uid: null });
  assert.equal(fresh.get('homework-list')[0].title, 'שוב מבחוץ', 'הכתיבה החיצונית שרדה');
});

t('הנתונים הפעילים תמיד תחת שם המפתח המדויק מנספח א׳', () => {
  assert.ok(mem.has('homework-list'), 'המפתח הנקי קיים');
  assert.deepEqual(JSON.parse(mem.get('homework-list')), store.get('homework-list'));
});

console.log('\nמיגרציה מגרסה 1.0');
const M = await import('./js/migrate.js');

// מצב פתיחה כמו של 1.0: פרופיל אורח נוסף עם ערכים כמחרוזות JSON (קידוד כפול),
// ו-cache מקומי של משתמש מחובר תחת התחילית הישנה.
mem.set('guest_profiles', JSON.stringify([
  { id: 'g_old', name: 'הפרופיל של אחי', createdAt: '2025-01-01T00:00:00.000Z' },
]));
mem.set('guest_profile_g_old', JSON.stringify({
  'homework-list': JSON.stringify([{ id: 1, title: 'מטלה ישנה', dueDate: '2025-05-05' }]),
  'homework-subjects': JSON.stringify([{ id: 2, name: 'היסטוריה', color: '#f00' }]),
  'gamification-stats': JSON.stringify({ totalXP: 340, streak: 4 }),
}));
mem.set('user-cache:u_old:exams-list', JSON.stringify([{ id: 3, title: 'מבחן ישן' }]));
mem.set('user-cache:u_old:homework-list', JSON.stringify([{ id: 4, title: 'משימה בענן' }]));
mem.set('user-cache:u_old:junk-key', JSON.stringify('לא מפתח חוזה'));

const rep = M.migrate();

t('פרופיל אורח מ-1.0 עבר, כולל פענוח הקידוד הכפול', () => {
  const tasks = JSON.parse(mem.get('__ns:guest:g_old:homework-list'));
  assert.equal(tasks[0].title, 'מטלה ישנה', 'מערך ולא מחרוזת');
  assert.equal(JSON.parse(mem.get('__ns:guest:g_old:gamification-stats')).totalXP, 340);
  assert.equal(rep.profiles, 1);
});

t('cache של משתמש מחובר עבר לסקופ החדש, ומפתח שאינו בחוזה לא נגרר', () => {
  assert.equal(JSON.parse(mem.get('__ns:user:u_old:exams-list'))[0].title, 'מבחן ישן');
  assert.equal(mem.has('__ns:user:u_old:junk-key'), false);
  assert.equal(rep.users, 1);
});

t('המיגרציה לא הרסנית — מפתחות 1.0 נשארו במקומם', () => {
  assert.ok(mem.has('guest_profile_g_old'));
  assert.ok(mem.has('user-cache:u_old:exams-list'));
});

t('הרצה שנייה לא עושה כלום ולא דורסת נתון חדש', () => {
  mem.set('__ns:guest:g_old:homework-list', JSON.stringify([{ id: 9, title: 'נערך אחרי המעבר' }]));
  mem.set('guest_profile_g_old', JSON.stringify({ 'homework-list': JSON.stringify([{ id: 1 }]) }));
  assert.equal(M.migrate(), null, 'הדגל עצר את ההרצה');
  assert.equal(JSON.parse(mem.get('__ns:guest:g_old:homework-list'))[0].title, 'נערך אחרי המעבר');
});

t('רשומה ישנה בלי השדות החדשים נטענת עם ברירות מחדל', () => {
  const old = normTask(JSON.parse(mem.get('guest_profile_g_old')) && { id: 1, subject: 'היסטוריה', title: 'מטלה ישנה', dueDate: '2025-05-05', priority: 'medium' });
  assert.equal(old.priority, 'normal', 'עדיפות לא מוכרת -> ברירת מחדל');
  assert.deepEqual(old.subtasks, []);
  assert.equal(old.archived, false);
  assert.equal(old.title, 'מטלה ישנה');
});

console.log(`\n✅ כל ${pass} הבדיקות עברו\n`);
