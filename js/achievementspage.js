// achievementspage.js — הישגים, רמה, רצף ויומן XP. מערכת אחת, מד התקדמות לכל הישג.

import { h, mount, $, progressBar } from './ui.js';
import { boot } from './boot.js';
import { achievementList, getStats, levelInfo, onGam, XP } from './gamification.js';
import { CATEGORIES } from './achievements.js';
import { fmtTime, fmtDate, toISO } from './util.js';

let filterMode = 'all';

boot({ onChange: () => render() }).then(() => {
  onGam(() => render());
  render();
});

function render() {
  const list = achievementList();
  const gs = getStats();
  const li = levelInfo();
  const unlocked = list.filter((a) => a.unlocked).length;

  $('#ach-count').textContent = `${unlocked} מתוך ${list.length} נפתחו`;
  renderFilter(list);

  const shown = list
    .filter((a) => (filterMode === 'all' ? true : filterMode === 'unlocked' ? a.unlocked : !a.unlocked))
    .sort((a, b) => (a.unlocked === b.unlocked ? b.ratio - a.ratio : a.unlocked ? 1 : -1));

  mount($('#view'),
    h('section', { class: 'card level-card' },
      h('div', { class: 'level-badge' }, h('b', { text: String(li.level) }), h('small', { text: 'רמה' })),
      h('div', { class: 'grow stack' },
        // .ltr מבודד את רצף המספרים — בלעדיו "40 / 200 XP" מוצג הפוך בהקשר RTL
        h('div', { class: 'row row--between' },
          h('span', { class: 'strong ltr', text: `${li.xpInLevel} / ${li.xpNeeded} XP` }),
          h('span', { class: 'small muted' }, 'סה״כ ', h('span', { class: 'ltr', text: `${gs.totalXP} XP` })),
        ),
        progressBar(li.ratio, { label: `התקדמות לרמה ${li.level + 1}` }),
        h('div', { class: 'row' },
          h('span', { class: 'badge badge--warn' }, h('span', { class: 'streak-flame', text: '🔥' }), `רצף ${gs.streak}`),
          h('span', { class: 'badge', text: `שיא: ${gs.longestStreak}` }),
          h('span', { class: 'badge badge--ok', text: `🎯 ${gs.perfectDays} ימים מושלמים` }),
        ),
      ),
    ),

    h('section', { class: 'grid grid--kpi', style: { marginBlockStart: 'var(--space-4)' } },
      stat(gs.totalTasksCompleted, 'משימות הושלמו'),
      stat(gs.earlySubmissions || 0, 'הגשות מוקדמות'),
      stat(gs.totalExamsCompleted, 'מבחנים'),
      stat(gs.totalTopicsDone, 'נושאי לימוד'),
      stat(fmtTime(gs.totalStudyTime || 0), 'זמן לימוד'),
      stat(gs.fullyPreparedExams, 'מבחנים בהכנה מלאה'),
    ),

    ...Object.entries(CATEGORIES).map(([catId, cat]) => {
      const items = shown.filter((a) => a.cat === catId);
      if (!items.length) return null;
      return h('section', { style: { marginBlockStart: 'var(--space-5)' } },
        h('h2', { class: 'task-group__label' }, `${cat.icon} ${cat.name}`,
          h('span', { class: 'task-group__count', text: `(${items.filter((a) => a.unlocked).length}/${items.length})` })),
        h('div', { class: 'ach-grid' }, ...items.map(card)),
      );
    }),

    xpLog(gs),
    h('section', { class: 'card', style: { marginBlockStart: 'var(--space-5)' } },
      h('h2', { class: 'card__title', text: 'איך צוברים XP' }),
      h('ul', { class: 'small muted' },
        h('li', { text: `השלמת משימה: ${XP.task} XP (גבוה: ${XP.taskHigh}, דחוף: ${XP.taskUrgent})` }),
        h('li', { text: `הגשה לפני המועד: +${XP.early} XP · השלמה באיחור: ${XP.overdue} XP` }),
        h('li', { text: `יום מושלם (כל משימות היום): ${XP.perfectDay} XP` }),
        h('li', { text: `מבחן שהושלם: ${XP.exam} XP · נושא לימוד: ${XP.topic} XP · הכנה מלאה: ${XP.fullyPrepared} XP` }),
        h('li', { text: `סשן פומודורו: ${XP.pomodoro} XP + ${XP.studyPerMinute} XP לכל דקת לימוד` }),
        h('li', { text: 'ביטול סימון מחזיר את ה-XP ונועל הישגים שנפתחו בגללו.' }),
      ),
    ),
  );
}

function renderFilter(list) {
  const opts = [
    ['all', `הכל (${list.length})`],
    ['unlocked', `נפתחו (${list.filter((a) => a.unlocked).length})`],
    ['locked', `נעולים (${list.filter((a) => !a.unlocked).length})`],
  ];
  mount($('#ach-filter'), ...opts.map(([id, label]) => h('button', {
    type: 'button', 'aria-pressed': String(filterMode === id),
    on: { click: () => { filterMode = id; render(); } },
  }, label)));
}

function stat(val, label) {
  return h('div', { class: 'card kpi' },
    h('span', { class: 'kpi__val', text: String(val) }),
    h('span', { class: 'kpi__label', text: label }));
}

function card(a) {
  return h('article', { class: `ach ${a.unlocked ? 'is-unlocked' : 'is-locked'}` },
    h('span', { class: 'ach__icon', 'aria-hidden': 'true', text: a.icon }),
    h('div', { class: 'ach__body' },
      h('span', { class: 'ach__name' }, a.name, a.unlocked ? ' ✓' : ''),
      h('span', { class: 'ach__desc', text: a.desc }),
      progressBar(a.ratio, { small: true, label: `${a.name}: ${a.progress} מתוך ${a.goal}` }),
      h('span', { class: 'ach__prog ltr', text: `${Math.min(a.progress, a.goal)} / ${a.goal}` }),
    ),
  );
}

function xpLog(gs) {
  const log = (gs.xpLog || []).slice(0, 12);
  if (!log.length) return null;
  const names = {
    task: 'משימה', 'task:undo': 'ביטול משימה', perfectDay: 'יום מושלם',
    'perfectDay:undo': 'ביטול יום מושלם', exam: 'מבחן', 'exam:undo': 'ביטול מבחן',
    topic: 'נושא לימוד', 'topic:undo': 'ביטול נושא', study: 'זמן לימוד',
    pomodoro: 'סשן פומודורו', fullyPrepared: 'הכנה מלאה', 'fullyPrepared:undo': 'ביטול הכנה מלאה',
  };
  return h('section', { class: 'card', style: { marginBlockStart: 'var(--space-5)' } },
    h('h2', { class: 'card__title', text: '📜 יומן נקודות אחרון' }),
    h('div', { class: 'stack' }, ...log.map((e) => h('div', { class: 'row row--between small' },
      h('span', { text: names[e.reason] || e.reason }),
      h('span', { class: 'num', style: { color: e.amount >= 0 ? 'var(--ok)' : 'var(--danger)' }, text: `${e.amount >= 0 ? '+' : ''}${e.amount} XP` }),
      h('span', { class: 'xsmall dim', text: fmtDate(toISO(new Date(e.t))) }),
    ))),
  );
}
