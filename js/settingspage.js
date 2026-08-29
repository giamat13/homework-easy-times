// settingspage.js — מסך ההגדרות. כל שינוי נשמר מיד; אין כפתור "שמור" גלובלי.

import { h, mount, $, toast, confirmDialog, formModal } from './ui.js';
import { boot } from './boot.js';
import { S, save, terms, usageMode } from './state.js';
import * as store from './storage.js';
import { KEYS } from './keys.js';
import { THEMES, DENSITIES, getTheme, saveTheme } from './theme.js';
import { getSession, isGuest, listProfiles, renameProfile, deleteProfile, createProfile, switchProfile, signOutUser, deleteAccount, authError, cloudAvailable } from './auth.js';
import * as N from './notifications.js';
import { getShortcuts, setEnabled, openShortcutsEditor } from './shortcuts.js';
import { exportJSON, importJSON, exportTasksCSV, exportExamsCSV, exportPDF, undoLastImport } from './exportimport.js';
import { openSubjectsManager, openTagsManager, openMembersManager } from './subjects.js';
import { openCustomFieldsManager } from './taskform.js';
import { connectButton, openClassroomImport, openTasksMerge } from './googleview.js';
import { googleConfigured, isConnected, disconnect } from './google.js';
import { resetGamification } from './gamification.js';
import { fmtDate } from './util.js';

boot({ onChange: () => render() }).then(render);

const MODES = [
  { id: 'student', icon: '🎓', name: 'תלמיד', desc: 'מקצועות, מבחנים, ציונים ושכבת לימוד' },
  { id: 'general', icon: '💼', name: 'כללי', desc: 'מטלות ונושאים בלבד, בלי מבחנים' },
  { id: 'group', icon: '👥', name: 'קבוצה', desc: 'חברי קבוצה ושיוך אחראים למשימות' },
];

async function render() {
  const s = getSession();
  const th = getTheme();
  const cloud = await cloudAvailable();
  const gOk = await googleConfigured();

  mount($('#view'),
    card('👤 חשבון', accountSection(s, cloud)),
    card('🎯 מצב שימוש', modeSection()),
    card('🎨 מראה', appearanceSection(th)),
    card('🔔 התראות', notificationsSection()),
    card('☁️ סנכרון וגיבוי', syncSection(cloud)),
    card('🔗 שילוב עם Google', googleSection(gOk)),
    card('⌨️ קיצורי מקלדת', shortcutsSection()),
    card('🗂️ נתונים', dataSection()),
    card('⚠️ אזור מסוכן', dangerSection(s, cloud)),
  );
}

function card(title, body) {
  return h('section', { class: 'card', style: { marginBlockEnd: 'var(--space-4)' } },
    h('div', { class: 'card__head' }, h('h2', { class: 'card__title', text: title })),
    h('div', { class: 'stack' }, body));
}
function row(label, control, hint) {
  return h('div', { class: 'row row--between', style: { alignItems: 'flex-start' } },
    h('div', { class: 'grow' }, h('div', { text: label }), hint ? h('div', { class: 'xsmall dim', text: hint }) : null),
    // .set-ctl מונע מ-select/input למתוח את עצמו על כל רוחב השורה
    h('div', { class: 'set-ctl' }, control));
}
function switchRow(label, checked, onChange, hint) {
  return row(label, h('input', { type: 'checkbox', checked, 'aria-label': label, on: { change: (e) => onChange(e.target.checked) } }), hint);
}

// ---------- חשבון ----------

function accountSection(s, cloud) {
  const guest = isGuest();
  return h('div', { class: 'stack' },
    h('div', { class: 'row' },
      h('span', { class: 'avatar', text: (s.name || '?').slice(0, 2) }),
      h('div', { class: 'grow' },
        h('div', { class: 'strong', text: s.name }),
        h('div', { class: 'xsmall dim', text: guest ? 'מצב אורח — הנתונים שמורים במכשיר הזה בלבד' : s.email }),
      ),
      guest
        ? h('a', { class: 'btn btn--primary btn--sm', href: 'login.html?upgrade=1' }, 'שמור בענן')
        : h('button', { class: 'btn btn--sm', type: 'button', on: { click: async () => { await signOutUser(); location.href = 'login.html'; } } }, 'יציאה'),
    ),
    !cloud ? h('p', { class: 'small muted', text: 'התחברות לענן אינה מוגדרת (חסר config.js). האפליקציה עובדת במלואה מקומית.' }) : null,
    guest ? profilesBlock() : null,
  );
}

function profilesBlock() {
  const s = getSession();
  return h('div', { class: 'stack' },
    h('h3', { class: 'small strong', text: 'פרופילי אורח' }),
    ...listProfiles().map((p) => h('div', { class: `profile-row ${p.id === s.id ? 'is-active' : ''}` },
      h('span', { class: 'avatar', text: p.emoji || '🙂' }),
      h('span', { class: 'grow' }, p.name, p.id === s.id ? h('span', { class: 'badge badge--ok', text: 'פעיל' }) : null),
      h('button', {
        class: 'icon-btn', type: 'button', 'aria-label': `שינוי שם ${p.name}`,
        on: { click: async () => {
          const d = await formModal({ title: 'שינוי שם פרופיל', fields: [{ name: 'name', label: 'שם', value: p.name, required: true }], validate: (x) => (x.name.trim() ? null : 'חובה למלא שם.') });
          if (d) { renameProfile(p.id, d.name.trim()); render(); }
        } },
      }, '✏️'),
      p.id !== s.id ? h('button', { class: 'btn btn--sm', type: 'button', on: { click: async () => { await switchProfile(p.id); location.reload(); } } }, 'מעבר') : null,
      h('button', {
        class: 'icon-btn', type: 'button', 'aria-label': `מחיקת ${p.name}`,
        on: { click: async () => {
          if (!(await confirmDialog(`למחוק את הפרופיל "${p.name}" וכל הנתונים שבו? הפעולה בלתי הפיכה.`, { title: 'מחיקת פרופיל', okLabel: 'מחק', danger: true }))) return;
          try { await deleteProfile(p.id); toast('הפרופיל נמחק', { type: 'success' }); render(); }
          catch (e) { toast(e.message, { type: 'error' }); }
        } },
      }, '🗑️'),
    )),
    h('button', {
      class: 'btn btn--sm', type: 'button',
      on: { click: async () => {
        const d = await formModal({ title: 'פרופיל חדש', fields: [{ name: 'name', label: 'שם הפרופיל', required: true }], okLabel: 'צור', validate: (x) => (x.name.trim() ? null : 'חובה למלא שם.') });
        if (!d) return;
        const p = createProfile(d.name.trim());
        await switchProfile(p.id); location.reload();
      } },
    }, '+ פרופיל חדש'),
  );
}

// ---------- מצב שימוש ----------

function modeSection() {
  const cur = usageMode();
  return h('div', { class: 'stack' }, ...MODES.map((m) => h('button', {
    class: `profile-row ${cur === m.id ? 'is-active' : ''}`, type: 'button',
    'aria-pressed': String(cur === m.id),
    on: { click: () => {
      S.settings.usageMode = m.id;
      S.settings.studentMode = m.id === 'student'; // תאימות לשדה הישן
      save('settings');
      toast(`מצב "${m.name}" הופעל`, { type: 'success' });
      render();
    } },
  },
    h('span', { style: { fontSize: '1.5rem' }, text: m.icon }),
    h('span', { class: 'grow' }, h('div', { class: 'strong', text: m.name }), h('div', { class: 'xsmall dim', text: m.desc })),
    cur === m.id ? h('span', { class: 'badge badge--ok', text: '✓' }) : null,
  )));
}

// ---------- מראה ----------

function appearanceSection(th) {
  return h('div', { class: 'stack' },
    h('div', { class: 'chips' }, ...THEMES.map((t) => h('button', {
      class: 'chip', type: 'button', 'aria-pressed': String(th.name === t.id),
      on: { click: () => { saveTheme({ name: t.id }); render(); } },
    }, h('span', { style: { width: '12px', height: '12px', borderRadius: '50%', background: t.swatch, display: 'inline-block' } }), t.name))),
    switchRow('עקוב אחרי הגדרת המערכת', th.followSystem, (v) => { saveTheme({ followSystem: v }); render(); }, 'מצב לילה יתחלף אוטומטית עם המכשיר'),
    !th.followSystem ? switchRow('מצב לילה', th.dark, (v) => { saveTheme({ dark: v }); render(); }) : null,
    row('צפיפות', h('select', { 'aria-label': 'צפיפות', on: { change: (e) => { saveTheme({ density: e.target.value }); render(); } } },
      ...DENSITIES.map((d) => h('option', { value: d.id, selected: th.density === d.id }, d.name)))),
    row('תצוגת ברירת מחדל', h('select', { 'aria-label': 'תצוגת ברירת מחדל', on: { change: (e) => { S.settings.viewMode = e.target.value; save('settings'); } } },
      h('option', { value: 'list', selected: S.settings.viewMode === 'list' }, 'רשימה'),
      h('option', { value: 'calendar', selected: S.settings.viewMode === 'calendar' }, 'לוח שנה'))),
  );
}

// ---------- התראות ----------

function notificationsSection() {
  const perm = N.permission();
  const set = S.settings;
  return h('div', { class: 'stack' },
    switchRow('התראות דפדפן', set.enableNotifications, async (v) => {
      if (v && N.permission() !== 'granted') {
        const p = await N.requestPermission();
        if (p !== 'granted') { render(); return; }
      }
      set.enableNotifications = v; save('settings'); render();
    }, perm === 'denied' ? 'ההתראות חסומות בהגדרות הדפדפן' : perm === 'unsupported' ? 'הדפדפן אינו תומך' : null),
    row('כמה ימים מראש', h('input', {
      type: 'number', min: 0, max: 30, value: set.notificationDays, style: { width: '90px' },
      'aria-label': 'ימים מראש', on: { change: (e) => { set.notificationDays = Math.max(0, Math.min(30, Number(e.target.value) || 0)); save('settings'); } },
    })),
    row('שעת ההתראה', h('input', {
      type: 'time', value: set.notificationTime, style: { width: '130px' },
      'aria-label': 'שעת ההתראה', on: { change: (e) => { set.notificationTime = e.target.value || '08:00'; save('settings'); } },
    })),
    h('button', {
      class: 'btn btn--sm', type: 'button',
      on: { click: () => { const n = N.check({ force: true }); toast(n ? `נשלחו ${n} התראות` : 'אין כרגע משימות שדורשות התראה.', { type: n ? 'success' : 'info' }); } },
    }, '🔔 בדיקת התראות עכשיו'),
  );
}

// ---------- סנכרון ----------

function syncSection(cloud) {
  const st = store.getStatus();
  return h('div', { class: 'stack' },
    row('מצב', h('span', { class: `badge ${st.mode === 'cloud' ? 'badge--ok' : ''}`, text: st.mode === 'cloud' ? 'מסונכרן לענן' : 'מקומי בלבד' }),
      st.lastSync ? `סונכרן לאחרונה: ${new Date(st.lastSync).toLocaleTimeString('he-IL')}` : null),
    st.pending ? h('p', { class: 'small', style: { color: 'var(--warn)' }, text: `${st.pending} שינויים ממתינים לסנכרון.` }) : null,
    switchRow('סנכרון אוטומטי', store.isAutoSync(), (v) => { store.setAutoSync(v); toast(v ? 'סנכרון אוטומטי פועל' : 'סנכרון אוטומטי כבוי', { type: 'info' }); render(); },
      'כשכבוי — השינויים נשמרים מקומית ומסונכרנים רק בלחיצה'),
    cloud && !isGuest() ? h('button', {
      class: 'btn btn--sm', type: 'button',
      on: { click: async () => {
        try { const r = await store.syncNow(); toast(r.skipped ? 'אין למה לסנכרן' : `סונכרן ✓ (${r.pulled} התקבלו, ${r.pushed} נשלחו)`, { type: 'success' }); render(); }
        catch { toast('הסנכרון נכשל — הנתונים בטוחים מקומית.', { type: 'error' }); }
      } },
    }, '🔄 סנכרן עכשיו') : null,
    switchRow('תזכורת גיבוי שבועית', S.settings.autoBackup, (v) => { S.settings.autoBackup = v; save('settings'); }),
    h('p', { class: 'xsmall dim', text: store.get(KEYS.lastBackup) ? `גיבוי אחרון: ${fmtDate(store.get(KEYS.lastBackup))}` : 'עוד לא ביצעת גיבוי.' }),
  );
}

// ---------- Google ----------

function googleSection(gOk) {
  if (!gOk) {
    return h('p', { class: 'small muted', text: 'כדי להפעיל שילוב עם Google, הוסף googleClientId לקובץ config.js. האפליקציה עובדת מצוין בלי זה.' });
  }
  return h('div', { class: 'stack' },
    row('יומן Google', connectButton('calendar', 'יומן', render), 'הצגת אירועים קרובים לצד המשימות'),
    row('Google Tasks', h('div', { class: 'row' },
      connectButton('tasks', 'Tasks', render),
      isConnected('tasks') ? h('button', { class: 'btn btn--sm', type: 'button', on: { click: () => openTasksMerge(render) } }, 'ייבוא') : null,
    ), 'מיזוג לרשימה הראשית וסימון דו־כיווני'),
    row('Google Classroom', h('div', { class: 'row' },
      connectButton('classroom', 'Classroom', render),
      isConnected('classroom') ? h('button', { class: 'btn btn--sm', type: 'button', on: { click: () => openClassroomImport(render) } }, 'ייבוא מטלות') : null,
    ), 'ייבוא מטלות עם מיפוי קורס→מקצוע וזיהוי כפילויות'),
    isConnected() ? h('button', { class: 'btn btn--sm', type: 'button', on: { click: () => { disconnect(); toast('החיבור ל-Google נותק', { type: 'info' }); render(); } } }, 'נתק את כל שירותי Google') : null,
  );
}

// ---------- קיצורים ----------

function shortcutsSection() {
  const sc = getShortcuts();
  return h('div', { class: 'stack' },
    switchRow('הפעל קיצורי מקלדת', sc.enabled, (v) => { setEnabled(v); render(); }),
    h('div', { class: 'chips' }, ...Object.entries(sc.bindings).map(([, k]) => h('kbd', { class: 'ltr', text: k.toUpperCase() }))),
    h('button', { class: 'btn btn--sm', type: 'button', on: { click: () => openShortcutsEditor(render) } }, '⌨️ התאמה אישית'),
  );
}

// ---------- נתונים ----------

function dataSection() {
  const T = terms();
  const fileInput = h('input', { type: 'file', accept: '.json,application/json', style: { display: 'none' }, 'aria-hidden': 'true' });
  let mode = 'merge';
  fileInput.addEventListener('change', async () => {
    const f = fileInput.files?.[0]; if (!f) return;
    try { await importJSON(f, { mode }); render(); }
    catch (e) { toast(e.message, { type: 'error', timeout: 8000 }); }
    fileInput.value = '';
  });

  return h('div', { class: 'stack' },
    h('div', { class: 'row' },
      h('button', { class: 'btn btn--sm', type: 'button', on: { click: () => openSubjectsManager(render) } }, `🎨 ${T.subjects}`),
      h('button', { class: 'btn btn--sm', type: 'button', on: { click: () => openTagsManager(render) } }, '🏷️ תגיות'),
      h('button', { class: 'btn btn--sm', type: 'button', on: { click: () => openCustomFieldsManager(render) } }, '🧩 שדות מותאמים'),
      usageMode() === 'group' ? h('button', { class: 'btn btn--sm', type: 'button', on: { click: () => openMembersManager(render) } }, '👥 חברי קבוצה') : null,
    ),
    h('div', { class: 'menu__sep' }),
    h('h3', { class: 'small strong', text: 'ייצוא' }),
    h('div', { class: 'row' },
      h('button', { class: 'btn btn--sm', type: 'button', on: { click: () => exportJSON() } }, '💾 גיבוי JSON'),
      h('button', { class: 'btn btn--sm', type: 'button', on: { click: () => exportTasksCSV() } }, '📊 משימות לאקסל'),
      terms().hasExams ? h('button', { class: 'btn btn--sm', type: 'button', on: { click: () => exportExamsCSV() } }, '📊 מבחנים לאקסל') : null,
      h('button', { class: 'btn btn--sm', type: 'button', on: { click: () => exportPDF() } }, '📄 דוח PDF'),
    ),
    h('h3', { class: 'small strong', text: 'ייבוא' }),
    h('div', { class: 'row' },
      h('select', { 'aria-label': 'אופן הייבוא', on: { change: (e) => { mode = e.target.value; } } },
        h('option', { value: 'merge' }, 'מיזוג עם הקיים'),
        h('option', { value: 'replace' }, 'החלפה מלאה')),
      h('button', { class: 'btn btn--sm', type: 'button', on: { click: () => fileInput.click() } }, '📂 בחר קובץ גיבוי'),
      h('button', { class: 'btn btn--sm btn--ghost', type: 'button', on: { click: () => { undoLastImport(); render(); } } }, '↩︎ בטל ייבוא אחרון'),
      fileInput,
    ),
  );
}

// ---------- אזור מסוכן ----------

function dangerSection(s, cloud) {
  return h('div', { class: 'stack' },
    h('button', {
      class: 'btn btn--sm', type: 'button',
      on: { click: async () => {
        if (!(await confirmDialog('לאפס את כל ה-XP, הרמות וההישגים? המשימות והמבחנים יישארו.', { title: 'איפוס גיימיפיקציה', okLabel: 'אפס', danger: true }))) return;
        resetGamification(); toast('הגיימיפיקציה אופסה', { type: 'success' }); render();
      } },
    }, '🔄 איפוס XP והישגים'),

    h('button', {
      class: 'btn btn--sm btn--danger', type: 'button',
      on: { click: async () => {
        if (!(await confirmDialog('למחוק את כל המשימות, המבחנים והמקצועות בפרופיל הזה? מומלץ לייצא גיבוי קודם.', { title: 'מחיקת כל הנתונים', okLabel: 'מחק הכל', danger: true }))) return;
        exportJSON();
        await store.clearAll();
        toast('הנתונים נמחקו. גיבוי הורד למחשב.', { type: 'warn', timeout: 8000 });
        setTimeout(() => location.reload(), 1200);
      } },
    }, '🗑️ מחיקת כל הנתונים'),

    !isGuest() && cloud ? h('button', {
      class: 'btn btn--sm btn--danger', type: 'button',
      on: { click: () => deleteAccountFlow(s) },
    }, '⚠️ מחיקת החשבון לצמיתות') : null,
  );
}

async function deleteAccountFlow(s) {
  const ok = await confirmDialog(
    `מחיקת החשבון ${s.email} תמחק לצמיתות את כל הנתונים בענן ואת החשבון עצמו. הפעולה בלתי הפיכה.`,
    { title: 'מחיקת חשבון', okLabel: 'המשך', danger: true },
  );
  if (!ok) return;
  const d = await formModal({
    title: 'אימות זהות',
    fields: [{ name: 'password', label: 'הסיסמה שלך', type: 'password', hint: 'משתמשי Google — השאירו ריק ולחצו המשך' }],
    okLabel: 'מחק את החשבון',
  });
  if (d === null) return;
  try {
    exportJSON();
    await deleteAccount(d.password || null);
    toast('החשבון נמחק. גיבוי הורד למחשב.', { type: 'warn', timeout: 9000 });
    setTimeout(() => { location.href = 'login.html'; }, 1500);
  } catch (e) {
    toast(authError(e), { type: 'error', timeout: 9000 });
  }
}
