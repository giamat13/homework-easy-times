// app.js — מסך המשימות. סינון, מיון, מעבר רשימה/לוח שנה, וסרגל מצב יומי.

import { h, mount, $ } from './ui.js';
import { boot } from './boot.js';
import { S, save, terms, usageMode } from './state.js';
import { filterTasks, sortTasks, taskStats, SORTS } from './tasks.js';
import { renderTaskList } from './taskview.js';
import { openTaskForm, openCustomFieldsManager } from './taskform.js';
import { openSubjectsManager, openTagsManager, openMembersManager } from './subjects.js';
import { renderCalendar } from './calendar.js';
import { calendarWidget } from './googleview.js';
import { levelInfo, getStats } from './gamification.js';
import { debounce, todayISO } from './util.js';

const params = new URLSearchParams(location.search);
const filter = {
  q: params.get('q') || '',
  subject: params.get('subject') || '',
  tags: params.get('tag') ? [params.get('tag')] : [],
  assignee: params.get('assignee') || '',
  status: 'open',
  urgency: '',
  showFuture: false,
  showArchived: false,
};
let sortBy = 'dueDate';
let view = 'list';
let cal = null;

boot({ onChange: () => render(), shortcuts: { toggleView: () => setView(view === 'list' ? 'calendar' : 'list') } })
  .then(() => {
    sortBy = S.settings.sortBy || 'dueDate';
    view = S.settings.viewMode || S.settings.defaultView || 'list';
    filter.showFuture = !!S.settings.showFutureTasks;
    filter.status = S.settings.hideCompleted ? 'open' : '';
    render();
    calendarWidget($('#gcal'));
  });

// ---------- רינדור ----------

function render() {
  const T = terms();
  document.title = `${T.tasks} — המשימות שלי 2.0`;
  renderStrip();
  renderFilters();
  renderBody();
}

function renderStrip() {
  const st = taskStats();
  const li = levelInfo();
  const gs = getStats();
  mount($('#strip'), h('div', { class: 'grid grid--kpi' },
    kpi(st.open, 'משימות פתוחות', st.overdue ? `${st.overdue} באיחור` : null, st.overdue ? 'down' : null),
    kpi(st.dueToday, 'להיום', st.dueWeek ? `${st.dueWeek} השבוע` : null),
    kpi(`${st.rate}%`, 'שיעור השלמה', `${st.done}/${st.total}`),
    kpi(`רמה ${li.level}`, `XP ${li.xpInLevel}/${li.xpNeeded}`, gs.streak ? `🔥 רצף ${gs.streak}` : null, gs.streak ? 'up' : null),
  ));
}

function kpi(val, label, delta, dir) {
  return h('div', { class: 'card kpi' },
    h('span', { class: 'kpi__val', text: String(val) }),
    h('span', { class: 'kpi__label', text: label }),
    delta ? h('span', { class: 'kpi__delta', data: dir ? { dir } : {}, text: delta }) : null,
  );
}

function renderFilters() {
  const T = terms();
  const mode = usageMode();

  const search = h('input', {
    type: 'search', value: filter.q, placeholder: `חיפוש ב${T.tasks}…`,
    'aria-label': 'חיפוש משימות',
    on: { input: debounce((e) => { filter.q = e.target.value; renderBody(); }, 180) },
  });

  mount($('#filters'),
    h('div', { class: 'filters__row' },
      h('div', { class: 'search-box grow' }, h('span', { class: 'search-box__icon', 'aria-hidden': 'true', text: '🔍' }), search),
      h('div', { class: 'seg', role: 'group', 'aria-label': 'תצוגה' },
        segBtn('רשימה', view === 'list', () => setView('list')),
        segBtn('לוח שנה', view === 'calendar', () => setView('calendar')),
      ),
    ),
    h('div', { class: 'filters__row' },
      select('מקצוע', filter.subject, [{ value: '', label: `כל ה${T.subjects}` }, ...S.subjects.filter((s) => !s.archived).map((s) => ({ value: s.id, label: s.name }))], (v) => { filter.subject = v; renderBody(); }),
      select('סטטוס', filter.status, [
        { value: '', label: 'הכל' }, { value: 'open', label: 'פתוחות' }, { value: 'done', label: 'הושלמו' },
      ], (v) => { filter.status = v; renderBody(); }),
      select('דחיפות', filter.urgency, [
        { value: '', label: 'כל הדחיפויות' }, { value: 'overdue', label: 'באיחור' },
        { value: 'today', label: 'להיום' }, { value: 'week', label: 'השבוע' }, { value: 'nodate', label: 'ללא תאריך' },
      ], (v) => { filter.urgency = v; renderBody(); }),
      mode === 'group' && S.members.length
        ? select('אחראי', filter.assignee, [{ value: '', label: 'כל האחראים' }, ...S.members.map((m) => ({ value: m.id, label: m.name }))], (v) => { filter.assignee = v; renderBody(); })
        : null,
      select('מיון', sortBy, SORTS.map((s) => ({ value: s.id, label: s.name })), (v) => { sortBy = v; S.settings.sortBy = v; save('settings'); renderBody(); }),
      h('div', { class: 'spacer' }),
      manageMenu(),
    ),
    S.tags.length ? h('div', { class: 'chips' }, ...S.tags.map((g) => h('button', {
      class: 'chip', type: 'button', 'aria-pressed': String(filter.tags.includes(g)),
      on: { click: () => { filter.tags = filter.tags.includes(g) ? filter.tags.filter((x) => x !== g) : [...filter.tags, g]; renderFilters(); renderBody(); } },
    }, `#${g}`))) : null,
    h('div', { class: 'filters__row' },
      toggle('הצג משימות עתידיות', filter.showFuture, (v) => { filter.showFuture = v; S.settings.showFutureTasks = v; save('settings'); renderBody(); }),
      toggle('הצג ארכיון', filter.showArchived, (v) => { filter.showArchived = v; renderBody(); }),
    ),
  );
}

function segBtn(label, on, onClick) {
  return h('button', { type: 'button', 'aria-pressed': String(on), on: { click: onClick } }, label);
}
function select(label, value, options, onChange) {
  return h('select', { 'aria-label': label, on: { change: (e) => onChange(e.target.value) } },
    ...options.map((o) => h('option', { value: o.value, selected: String(o.value) === String(value) }, o.label)));
}
function toggle(label, checked, onChange) {
  return h('label', { class: 'row', style: { gap: '6px', fontSize: 'var(--fs-sm)' } },
    h('input', { type: 'checkbox', checked, on: { change: (e) => onChange(e.target.checked) } }),
    h('span', { text: label }));
}

function manageMenu() {
  const T = terms();
  const wrap = h('div', { class: 'menu' });
  const btn = h('button', { class: 'btn btn--sm', type: 'button', 'aria-haspopup': 'true', 'aria-expanded': 'false', on: { click: (e) => { e.stopPropagation(); pop ? close() : open(); } } }, '⚙️ ניהול');
  let pop = null;
  function open() {
    pop = h('div', { class: 'menu__pop', role: 'menu' },
      item(`🎨 ${T.subjects}`, () => openSubjectsManager(render)),
      item('🏷️ תגיות', () => openTagsManager(render)),
      item('🧩 שדות מותאמים', () => openCustomFieldsManager(render)),
      usageMode() === 'group' ? item('👥 חברי קבוצה', () => openMembersManager(render)) : null,
    );
    wrap.append(pop); btn.setAttribute('aria-expanded', 'true');
    setTimeout(() => document.addEventListener('click', close, { once: true }), 0);
  }
  function close() { pop?.remove(); pop = null; btn.setAttribute('aria-expanded', 'false'); }
  function item(label, onClick) {
    return h('button', { class: 'menu__item', type: 'button', role: 'menuitem', on: { click: (e) => { e.stopPropagation(); close(); onClick(); } } }, label);
  }
  wrap.append(btn);
  return wrap;
}

function renderBody() {
  const host = $('#view');
  if (view === 'calendar') {
    cal = renderCalendar(host, { onChange: () => { renderStrip(); } });
    return;
  }
  const list = sortTasks(filterTasks(filter), sortBy);
  renderTaskList(host, list, { onChange: () => { renderStrip(); renderBody(); } });
}

function setView(v) {
  view = v;
  S.settings.viewMode = v;
  save('settings');
  renderFilters();
  renderBody();
}

// FAB
$('#fab')?.addEventListener('click', () => openTaskForm(
  { dueDate: todayISO(), subject: filter.subject || S.subjects[0]?.id || '', title: '', description: '', startDate: '', priority: 'normal', tags: filter.tags, assignees: [], customFields: {}, files: [], subtasks: [], repeat: 'none' },
  () => { renderStrip(); renderBody(); },
));

export { render };
