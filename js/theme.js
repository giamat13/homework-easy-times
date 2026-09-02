// theme.js — ערכות נושא ומצב לילה. מחיל על <html> כדי שלא יהיה הבזק לפני הרנדור.

import * as store from './storage.js';
import { KEYS, defaultFor } from './keys.js';
import { withDefaults } from './util.js';

export const THEMES = [
  { id: 'indigo', name: 'אינדיגו', swatch: '#5b5bd6' },
  { id: 'teal', name: 'טורקיז', swatch: '#0f9b8e' },
  { id: 'sunset', name: 'שקיעה', swatch: '#e2683c' },
  { id: 'rose', name: 'ורוד', swatch: '#d6336c' },
  { id: 'forest', name: 'יער', swatch: '#2f855a' },
  { id: 'grape', name: 'ענבים', swatch: '#7c3aed' },
  { id: 'mono', name: 'מונוכרום', swatch: '#4a5568' },
];

export const DENSITIES = [
  { id: 'comfy', name: 'מרווח' },
  { id: 'compact', name: 'צפוף' },
];

const mq = matchMedia('(prefers-color-scheme: dark)');
let cfg = defaultFor(KEYS.theme);

export function getTheme() { return { ...cfg }; }

export function applyTheme(patch = {}) {
  cfg = withDefaults({ ...cfg, ...patch }, defaultFor(KEYS.theme));
  const dark = cfg.followSystem ? mq.matches : !!cfg.dark;
  const root = document.documentElement;
  root.dataset.theme = cfg.name;
  root.dataset.mode = dark ? 'dark' : 'light';
  root.dataset.density = cfg.density;
  root.style.colorScheme = dark ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', dark ? '#12141a' : '#ffffff');
  return cfg;
}

export function saveTheme(patch) {
  applyTheme(patch);
  store.set(KEYS.theme, cfg);
  // שמירת תאימות עם השדה הישן בהגדרות
  const s = store.get(KEYS.settings);
  if (s && typeof s === 'object') {
    s.darkMode = cfg.followSystem ? mq.matches : !!cfg.dark;
    store.set(KEYS.settings, s);
  }
  return cfg;
}

/** החלפה מהירה בין בהיר לכהה — מבטלת "עקוב אחרי המערכת". */
export function toggleDark() {
  const nowDark = document.documentElement.dataset.mode === 'dark';
  return saveTheme({ dark: !nowDark, followSystem: false });
}

export function initTheme() {
  const saved = store.get(KEYS.theme);
  const settings = store.get(KEYS.settings);
  cfg = withDefaults(saved, defaultFor(KEYS.theme));
  // אם אין theme-settings אבל יש darkMode ישן בהגדרות — מכבדים אותו
  if (!saved && settings && typeof settings.darkMode === 'boolean') {
    cfg.dark = settings.darkMode; cfg.followSystem = false;
  }
  applyTheme();
  mq.addEventListener('change', () => { if (cfg.followSystem) applyTheme(); });
  store.on('change', (k) => { if (k === KEYS.theme || k === '*') { cfg = withDefaults(store.get(KEYS.theme), cfg); applyTheme(); } });
  return cfg;
}
