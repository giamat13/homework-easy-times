// cloud.js — טעינה עצלה של Firebase מה-CDN. שום קובץ אחר לא מדבר עם Firebase ישירות.
// אם config.js חסר או שאין רשת — האפליקציה עובדת במלואה מקומית. זה לא מצב שגיאה.

const CDN = 'https://www.gstatic.com/firebasejs/10.12.5';

let _cfg;          // undefined = טרם נבדק, null = אין
let _fb = null;    // המופע הטעון
let _loading = null;

/** טוען את config.js אם הוא קיים. לא זורק אם אינו קיים. */
export async function config() {
  if (_cfg !== undefined) return _cfg;
  try {
    const m = await import('../config.js');
    const c = m.firebaseConfig || m.default?.firebaseConfig || null;
    _cfg = c && c.apiKey && c.projectId ? { ...m, firebaseConfig: c } : null;
  } catch {
    _cfg = null;
  }
  return _cfg;
}

/** האם ענן זמין בכלל (יש קונפיג). */
export async function available() { return !!(await config()); }

/** טוען ומאתחל את Firebase. מחזיר null אם אין קונפיג או שהטעינה נכשלה. */
export function loadFirebase() {
  if (_fb) return Promise.resolve(_fb);
  if (_loading) return _loading;
  _loading = (async () => {
    const cfg = await config();
    if (!cfg) return null;
    try {
      const [appM, authM, fsM] = await Promise.all([
        import(`${CDN}/firebase-app.js`),
        import(`${CDN}/firebase-auth.js`),
        import(`${CDN}/firebase-firestore.js`),
      ]);
      const app = appM.getApps?.().length ? appM.getApp() : appM.initializeApp(cfg.firebaseConfig);
      const auth = authM.getAuth(app);
      auth.languageCode = 'he';
      const db = fsM.getFirestore(app);
      try { await fsM.enableIndexedDbPersistence(db); } catch { /* טאב מרובה / דפדפן ללא תמיכה */ }
      _fb = { app, auth, db, authM, fsM, cfg };
      return _fb;
    } catch (e) {
      console.warn('[cloud] Firebase לא נטען, ממשיכים מקומית:', e.message);
      return null;
    }
  })();
  return _loading;
}

// ---------- Firestore: users/{uid}/data/{key} = { value, updatedAt } ----------

function docRef(fb, uid, key) {
  return fb.fsM.doc(fb.db, 'users', uid, 'data', key);
}

export async function cloudGet(uid, key) {
  const fb = await loadFirebase(); if (!fb || !uid) return undefined;
  const snap = await fb.fsM.getDoc(docRef(fb, uid, key));
  if (!snap.exists()) return undefined;
  const d = snap.data();
  return d && 'value' in d ? d.value : undefined;
}

export async function cloudSet(uid, key, value) {
  const fb = await loadFirebase(); if (!fb || !uid) return false;
  await fb.fsM.setDoc(docRef(fb, uid, key), {
    value, updatedAt: fb.fsM.serverTimestamp(),
  });
  return true;
}

export async function cloudRemove(uid, key) {
  const fb = await loadFirebase(); if (!fb || !uid) return false;
  await fb.fsM.deleteDoc(docRef(fb, uid, key));
  return true;
}

/** מוריד את כל המסמכים של המשתמש בקריאה אחת. מחזיר Map(key -> value). */
export async function cloudGetAll(uid) {
  const fb = await loadFirebase(); if (!fb || !uid) return new Map();
  const snap = await fb.fsM.getDocs(fb.fsM.collection(fb.db, 'users', uid, 'data'));
  const out = new Map();
  snap.forEach((d) => { const v = d.data(); if (v && 'value' in v) out.set(d.id, v.value); });
  return out;
}

/** חותמות זמן לכל מפתח — לפתרון קונפליקטים בסנכרון. */
export async function cloudStamps(uid) {
  const fb = await loadFirebase(); if (!fb || !uid) return new Map();
  const snap = await fb.fsM.getDocs(fb.fsM.collection(fb.db, 'users', uid, 'data'));
  const out = new Map();
  snap.forEach((d) => { const t = d.data()?.updatedAt; if (t?.toMillis) out.set(d.id, t.toMillis()); });
  return out;
}

/** מוחק את כל נתוני המשתמש בענן (למחיקת חשבון). */
export async function cloudWipe(uid) {
  const fb = await loadFirebase(); if (!fb || !uid) return false;
  const col = fb.fsM.collection(fb.db, 'users', uid, 'data');
  const snap = await fb.fsM.getDocs(col);
  const batch = fb.fsM.writeBatch(fb.db);
  snap.forEach((d) => batch.delete(d.ref));
  batch.delete(fb.fsM.doc(fb.db, 'users', uid));
  await batch.commit();
  return true;
}

/** האזנה חיה לשינויים בענן (מכשיר אחר). מחזיר unsubscribe. */
export async function cloudWatch(uid, onChange) {
  const fb = await loadFirebase(); if (!fb || !uid) return () => {};
  return fb.fsM.onSnapshot(
    fb.fsM.collection(fb.db, 'users', uid, 'data'),
    { includeMetadataChanges: false },
    (snap) => {
      if (snap.metadata.hasPendingWrites) return; // כתיבה שלנו — לא אירוע נכנס
      for (const ch of snap.docChanges()) {
        if (ch.type === 'removed') { onChange(ch.doc.id, undefined); continue; }
        const v = ch.doc.data();
        if (v && 'value' in v) onChange(ch.doc.id, v.value);
      }
    },
    (e) => console.warn('[cloud] watch:', e.message),
  );
}
