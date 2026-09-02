// googleview.js — מסכי האינטגרציות: חיבור, ייבוא Classroom עם טבלת מיפוי, ומיזוג Tasks.

import { h, openModal, toast, mount } from './ui.js';
import { S, save } from './state.js';
import { createTask } from './tasks.js';
import * as G from './google.js';
import { fmtDate, relativeDay } from './util.js';

function err(e) { toast(e.message || 'הפעולה נכשלה', { type: 'error', timeout: 7000 }); }

/** כפתור חיבור/ניתוק גנרי לשירות. */
export function connectButton(scopeKey, label, onDone = () => {}) {
  const btn = h('button', { class: 'btn btn--sm', type: 'button' });
  function paint() {
    const on = G.isConnected(scopeKey);
    btn.textContent = on ? `נתק ${label}` : `חבר ${label}`;
    btn.className = `btn btn--sm ${on ? '' : 'btn--primary'}`;
  }
  btn.addEventListener('click', async () => {
    try {
      if (G.isConnected(scopeKey)) { G.disconnect(); toast(`${label} נותק`, { type: 'info' }); }
      else { await G.connect([scopeKey]); toast(`${label} חובר ✓`, { type: 'success' }); }
      paint(); onDone();
    } catch (e) { err(e); }
  });
  paint();
  return btn;
}

// ---------- Calendar ----------

/** ווידג׳ט אירועים קרובים. נטען רק אם מחוברים. */
export async function calendarWidget(container) {
  if (!(await G.googleConfigured())) { mount(container, note('אינטגרציית Google לא מוגדרת.')); return; }
  if (!G.isConnected('calendar')) {
    mount(container, h('div', { class: 'stack' },
      note('חבר את יומן Google כדי לראות אירועים קרובים לצד המשימות.'),
      connectButton('calendar', 'יומן', () => calendarWidget(container))));
    return;
  }
  mount(container, note('טוען אירועים…'));
  try {
    const events = await G.listCalendarEvents({ days: 14 });
    if (!events.length) { mount(container, note('אין אירועים בשבועיים הקרובים.')); return; }
    mount(container, h('div', { class: 'stack' }, ...events.slice(0, 8).map((e) => h('div', { class: 'row row--between' },
      h('a', { href: e.link, target: '_blank', rel: 'noopener noreferrer', class: 'grow truncate', text: e.title }),
      h('span', { class: 'xsmall dim nowrap', text: `${relativeDay(e.date)}${e.time ? ` · ${e.time}` : ''}` }),
    ))));
  } catch (e) { mount(container, note(e.message)); }
}

function note(text) { return h('p', { class: 'small muted', text }); }

// ---------- Google Tasks ----------

/**
 * מיזוג Google Tasks לרשימה הראשית. משימה מיובאת מסומנת ב-externalId,
 * וסימון בצד שלנו נדחף חזרה ל-Google (דו־כיווני).
 */
export async function openTasksMerge(onDone = () => {}) {
  try {
    if (!G.isConnected('tasks')) await G.connect(['tasks']);
    const lists = await G.listGoogleTaskLists();
    if (!lists.length) { toast('לא נמצאו רשימות ב-Google Tasks.', { type: 'warn' }); return; }

    let listId = lists[0].id;
    const box = h('div', { class: 'stack' });
    const select = h('select', { 'aria-label': 'רשימה', on: { change: (e) => { listId = e.target.value; load(); } } },
      ...lists.map((l) => h('option', { value: l.id }, l.title)));
    let items = [];
    const chosen = new Set();

    async function load() {
      mount(box, note('טוען…'));
      items = await G.listGoogleTasks(listId);
      const existing = new Set(S.tasks.map((t) => t.externalId).filter(Boolean));
      const fresh = items.filter((t) => !existing.has(`gtask:${t.id}`));
      chosen.clear(); fresh.forEach((t) => chosen.add(t.id));
      if (!fresh.length) { mount(box, note('כל המשימות מהרשימה הזו כבר קיימות אצלך.')); return; }
      mount(box, ...fresh.map((t) => h('label', { class: 'row' },
        h('input', { type: 'checkbox', checked: true, 'aria-label': `ייבוא ${t.title}`, on: { change: (e) => (e.target.checked ? chosen.add(t.id) : chosen.delete(t.id)) } }),
        h('span', { class: 'grow', text: t.title }),
        t.due ? h('span', { class: 'xsmall dim', text: fmtDate(t.due) }) : null,
      )));
    }
    await load();

    openModal({
      title: 'ייבוא מ-Google Tasks',
      body: h('div', { class: 'stack' }, select, box,
        note('משימה שתסמן כהושלמה כאן תסומן גם ב-Google.')),
      actions: [
        { label: 'ביטול', onClick: (c) => c() },
        { label: 'ייבא', variant: 'primary', onClick: (c) => {
          let n = 0;
          for (const t of items) {
            if (!chosen.has(t.id)) continue;
            createTask({
              title: t.title, description: t.notes, dueDate: t.due,
              completed: t.completed, externalId: `gtask:${t.id}`, externalList: t.listId,
            });
            n++;
          }
          c(); toast(`${n} משימות יובאו`, { type: 'success' }); onDone();
        } },
      ],
    });
  } catch (e) { err(e); }
}

/** נקרא אחרי סימון משימה — דוחף את הסטטוס חזרה ל-Google אם היא הגיעה משם. */
export async function pushTaskStatus(task) {
  if (!task?.externalId?.startsWith('gtask:') || !G.isConnected('tasks')) return;
  try {
    await G.setGoogleTaskStatus(task.externalList || '@default', task.externalId.slice(6), task.completed);
  } catch (e) { console.warn('[google] סנכרון סטטוס נכשל', e.message); }
}

// ---------- Classroom ----------

/** ייבוא מטלות: בוחרים קורסים, ממפים לקורס→מקצוע, ומייבאים בלי כפילויות. */
export async function openClassroomImport(onDone = () => {}) {
  try {
    if (!G.isConnected('classroom')) await G.connect(['classroom']);
    const courses = await G.listCourses();
    if (!courses.length) { toast('לא נמצאו קורסים פעילים ב-Classroom.', { type: 'warn' }); return; }

    let mapping = G.guessMapping(courses, S.subjects);
    const body = h('div', { class: 'stack' });
    const workBox = h('div', { class: 'stack' });
    let work = [];
    const chosen = new Set();

    const table = h('div', { class: 'stack' },
      h('h3', { class: 'small strong', text: 'מיפוי קורס → מקצוע' }),
      ...courses.map((c) => h('div', { class: 'row row--between' },
        h('span', { class: 'grow truncate', text: `${c.name}${c.section ? ` · ${c.section}` : ''}` }),
        h('select', {
          'aria-label': `מקצוע עבור ${c.name}`,
          on: { change: (e) => { mapping[c.id] = e.target.value; } },
        },
        h('option', { value: '' }, '— ללא מקצוע —'),
        ...S.subjects.map((s) => h('option', { value: s.id, selected: mapping[c.id] === s.id }, s.name)),
        h('option', { value: `__new__${c.id}` }, '+ צור מקצוע בשם הקורס')),
      )),
    );

    async function loadWork() {
      mount(workBox, note('טוען מטלות…'));
      const all = [];
      for (const c of courses) {
        try { all.push(...(await G.listCourseWork(c.id)).map((w) => ({ ...w, courseName: c.name }))); }
        catch { /* קורס בלי הרשאות — מדלגים */ }
      }
      work = all.filter((w) => !G.isDuplicate(S.tasks, w));
      const dupes = all.length - work.length;
      chosen.clear(); work.forEach((w) => chosen.add(w.id));
      if (!work.length) {
        mount(workBox, note(dupes ? `כל ${dupes} המטלות כבר קיימות אצלך.` : 'לא נמצאו מטלות.'));
        return;
      }
      mount(workBox,
        h('h3', { class: 'small strong', text: `מטלות לייבוא (${work.length})${dupes ? ` · ${dupes} כפילויות דולגו` : ''}` }),
        ...work.map((w) => h('label', { class: 'row' },
          h('input', { type: 'checkbox', checked: true, 'aria-label': `ייבוא ${w.title}`, on: { change: (e) => (e.target.checked ? chosen.add(w.id) : chosen.delete(w.id)) } }),
          h('span', { class: 'grow truncate', text: w.title }),
          h('span', { class: 'xsmall dim nowrap', text: `${w.courseName}${w.due ? ` · ${fmtDate(w.due)}` : ''}` }),
        )));
    }

    mount(body, table, h('div', { class: 'menu__sep' }), workBox);
    await loadWork();

    openModal({
      title: 'ייבוא מ-Google Classroom', size: 'lg', body,
      actions: [
        { label: 'ביטול', onClick: (c) => c() },
        { label: 'ייבא', variant: 'primary', onClick: (c) => {
          // יצירת מקצועות חדשים שהתבקשו
          for (const [courseId, val] of Object.entries(mapping)) {
            if (!String(val).startsWith('__new__')) continue;
            const course = courses.find((x) => x.id === courseId);
            const created = { id: `sub_${courseId}`, name: course?.name || 'קורס', color: '' };
            S.subjects.push(created); mapping[courseId] = created.id;
          }
          save('subjects');
          G.setMapping(mapping);

          let n = 0;
          for (const w of work) {
            if (!chosen.has(w.id)) continue;
            createTask({
              title: w.title, description: w.description, dueDate: w.due,
              subject: mapping[w.courseId] || '',
              tags: ['Classroom'],
              files: w.link ? [{ name: 'פתיחה ב-Classroom', url: w.link, size: 0 }] : [],
              externalId: `classroom:${w.id}`,
            });
            n++;
          }
          c(); toast(`${n} מטלות יובאו מ-Classroom`, { type: 'success' }); onDone();
        } },
      ],
    });
  } catch (e) { err(e); }
}
