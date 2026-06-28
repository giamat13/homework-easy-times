# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

**Homework Easy Times** — a full-featured homework and exam management system built with React + Vite + Firebase. The app is a Hebrew-language SPA (Single Page Application) for students to manage assignments, track exams, and monitor their academic progress. All data syncs to Firebase with local fallback via localStorage.

**Key modes:** Student mode (subjects/exams), General mode (tasks only), Group mode (shared assignments with people management).

---

## Project Structure

- **Root directory:** Entry points and configuration
  - `main.jsx` — React app entry point
  - `App.jsx` — Top-level React component (auth flow, layout)
  - `vite.config.js` — Vite configuration
  - `package.json` — Dependencies and scripts
  - `index.html` — HTML template (large; contains modals, styles, SVG icons)
  
- **Service layer:**
  - `auth-service.js` — Firebase Authentication (email, Google, phone + linking)
  - `firestore-service.js` — Firestore CRUD and sync logic
  - `firebase.rules` — Firestore security rules
  
- **Bundled logic:**
  - `app.bundle.js` (464KB) — Bundled application logic (DOM manipulation, task management, UI features). This is a minified single file containing most of the app's behavior; it's not organized as separate modules. Direct edits to this file are not practical; prefer editing the source `.jsx`/`.js` files and rebuilding.

- **Assets & Configuration:**
  - `styles.css` — Global styles (themes, variables, layout, dark mode)
  - `App.css` — React component styles
  - `icon.png` — App icon
  - `achievements.json` — Achievement definitions
  - `stats.html` — Standalone statistics page

---

## Development Commands

```bash
# Start dev server (http://localhost:3000, auto-opens in browser)
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview

# Deploy to gh-pages
npm run deploy
```

---

## Architecture & Data Flow

### Authentication Flow
1. User signs up/signs in via `auth-service.js`
2. Firebase Auth manages session (compat SDK)
3. User data (email, profile, providers linked) stored in `users/{uid}` Firestore document
4. Real-time listener (`onAuthStateChanged`) keeps React state in sync

### Data Persistence
- **Local:** localStorage for subjects, tasks, exams, settings (fast offline access)
- **Cloud:** Firestore `users/{uid}/` document structure:
  - Root user doc: email, providers, settings, theme, mode (student/general/group)
  - Sub-collections (if needed): tasks, exams, achievements
- **Sync strategy:** Bi-directional—local changes upload to Firestore; Firestore changes via `onSnapshot` listeners pull to local state

### Key Features & File Location

| Feature | Primary Handler | Notes |
|---------|-----------------|-------|
| Subject management | `App.jsx` (modals) + `app.bundle.js` | Color picker, CRUD in modal; stored in localStorage & Firestore |
| Task/homework CRUD | `app.bundle.js` (DOM + logic) | Modal-driven; filters (subject, status, urgency); file attachments (Base64) |
| Exam tracking | `app.bundle.js` + `App.jsx` (grade modal) | Includes grades, multiple exam dates (A/B/C), topics, corrections |
| Google Tasks/Calendar | `app.bundle.js` (dashboardWidget) | OAuth token flow; syncs upcoming events to dashboard |
| Google Classroom | `app.bundle.js` + auth | Integration for assignment import (UI in settings modal) |
| Achievements & XP | `app.bundle.js` + `achievements.json` | Badge system; progress bar; stored locally + Firestore |
| Dark mode & themes | `App.jsx` + `app.bundle.js` | CSS variables; system preference detection + manual toggle |
| User settings | Settings modal (`index.html`) | Dark mode, notifications, custom fields, tags, import/export |
| Export (PDF, Excel, JSON) | `app.bundle.js` | HTML2PDF, CSV generation; Firestore sync status |

### UI Modals (in `index.html`)
- `#add-task-modal` — Create homework with subject, date, priority, files
- `#edit-hw-modal` — Edit existing task
- `#add-exam-modal` — Create exam with date(s), grade placeholders, topics
- `#grade-modal` — Enter exam score (grade, bonus, correction, expected)
- `#settings-modal` — All user preferences (theme, notifications, data export, account deletion)
- `#subject-manager-modal` — CRUD subjects with color picker
- All modals use vanilla JS event handlers (ids: `close-*-modal`, buttons with `onclick`)

---

## Key Technologies & Constraints

- **React 18** with Hooks (useState, useEffect) — minimal functional components in App.jsx
- **Vite** — fast dev server, esbuild bundling
- **Firebase SDK (compat)** — v9.22.0; Auth, Firestore, Recaptcha
- **Lucide Icons** — CDN-loaded (not npm)
- **LocalStorage** — Up to ~5-10MB per domain; used for all local caches
- **RTL/Hebrew:** HTML `dir="rtl"` set; all text/UI labels in Hebrew; dates formatted for Israeli locale
- **No build step for app.bundle.js:** It's a pre-built monolithic file. To modify logic inside it, you must:
  - Find the equivalent logic in source `.jsx`/`.js` files (or identify that it may be dynamically injected)
  - OR edit `index.html` inline `<script>` tags for one-off behaviors
  - Rebuilding the bundle requires understanding how it was originally created (likely Webpack/Rollup with specific config)

---

## Common Tasks

### Adding a New Feature
1. **UI** — Add modal form to `index.html` or wire up button in `App.jsx` component
2. **Logic** — Implement in a new `.js` file or extend existing service (auth-service, firestore-service, or inline `<script>`)
3. **Storage** — Decide: localStorage (instant, no server) or Firestore (cloud, synced). Most features use both: localStorage for UX, Firestore for persistence
4. **Styling** — Update `styles.css` (global) or `App.css` (React component scope); use CSS variables for theming (--text-primary, --bg-secondary, etc.)

### Debugging
- **Local data:** `localStorage` in DevTools → Application tab. Keys follow pattern: `homework_*`, `user_*`, `settings_*`
- **Firebase state:** Check Firestore console; look for user document in `users/{uid}`
- **Real-time sync:** Search logs for "onSnapshot" or "syncUserData" to track listener health
- **App bundle issues:** If logic is in `app.bundle.js`, check `index.html` for inline scripts that may initialize or override behavior

### Modifying Existing Modals
All modals use vanilla JS event handlers. Pattern:
```javascript
// In index.html <script> or linked .js:
document.getElementById('save-btn').addEventListener('click', () => {
  const value = document.getElementById('input-field').value;
  // save logic
  closeModal('modal-id');
});
```
Modal visibility: add/remove `hidden` class to `#modal-id`.

### Adding Dark Mode Styles
- Define light & dark variants of custom properties in `styles.css`:
  ```css
  --text-primary: #1e293b;
  body.dark-mode { --text-primary: #e2e8f0; }
  ```
- Use in components: `color: var(--text-primary);`

---

## Firebase Setup

- **Auth:** Email, Google (via GoogleAuthProvider), Phone (via Recaptcha verifier)
- **Account Linking:** Users can link multiple auth methods to one account
- **Firestore Structure:**
  ```
  users/{uid}/
    ├── email (string)
    ├── emailVerified (boolean)
    ├── providers (array of auth method names)
    ├── theme (string: 'light', 'dark', 'auto')
    ├── usageMode (string: 'student', 'general', 'group')
    ├── lastUpdated (timestamp)
    └── [nested collections: tasks, exams, etc.]
  ```
- **Security Rules:** See `firestore.rules` — data is private per user (requires authentication)

---

## Performance & Known Constraints

1. **app.bundle.js is large (464KB)** — The entire app logic is bundled into one minified file. Splitting/optimizing would require Webpack/Rollup reconfiguration.
2. **localStorage size limit** — Avoid storing very large files (PDF exports, many attachments) locally; prefer Firestore
3. **Real-time listeners cost** — Each `onSnapshot` listener keeps a connection open. Monitor Firebase billing for listeners per user.
4. **Recaptcha:** Required for phone auth; initialized on app load (`initRecaptcha()`). Hidden in production; shown on dev if key not configured.

---

## Testing & Validation

- **No test files present** — Validation is manual or via browser DevTools
- **To test locally:**
  1. `npm run dev` → app starts on http://localhost:3000
  2. Sign up / sign in → check localStorage for data
  3. Create tasks/exams → verify in Firestore console & UI
  4. Dark mode toggle → confirm CSS variables switch
  5. Export → check file download

---

## Deployment

```bash
npm run deploy
```
Builds to `dist/` and pushes to GitHub Pages (via `gh-pages` package). Requires `gh` CLI and proper remote config.

---

## Notes for Future Work

- **Hebrew localization:** All labels, messages, and help text are in Hebrew. Consider i18n library if multi-language support is needed.
- **Accessibility:** App supports RTL and dark mode well; could benefit from ARIA labels and keyboard navigation audit.
- **Mobile responsiveness:** Media queries in `index.html` and `styles.css` handle mobile layouts; test on small viewports.
- **Firebase migration:** If switching providers, prioritize data export (JSON) and schema mapping.
