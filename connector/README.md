# מחבר Claude ל-Homework Easy Times

שרת MCP (Cloudflare Worker) שמאפשר ל-Claude לקרוא ולנהל משימות, מקצועות ומבחנים, עם כרטיסי UI בתוך השיחה.
הכניסה אישית: הקישור נושא את ה-refresh token של המשתמש, וכל הקריאות ל-Firestore רצות בשמו, כך ש-`firestore.rules` נשארים גבול האבטחה.

## כלים

| כלי | מה הוא עושה |
|---|---|
| `get_overview` | סקירה: מספרים, הקרובות, מבחנים קרובים |
| `list_tasks` | רשימת משימות לפי דחיפות, עם סינון |
| `get_task` | פרטי משימה ותתי-משימות |
| `add_task` / `update_task` | יצירה ועריכה |
| `complete_task` | סימון/ביטול, כולל יצירת מופע הבא למשימה חוזרת |
| `toggle_subtask` | סימון תת-משימה |
| `delete_task` | מחיקה |
| `list_subjects` / `add_subject` | מקצועות |
| `list_exams` / `add_exam` / `update_exam` / `delete_exam` | מבחנים וציונים |

הערה: XP והישגים מחושבים רק באפליקציה עצמה.

## פיתוח

```
npm install
HOMEWORK_MOCK=1 PORT=3457 npm run dev     # מאגר בזיכרון, בלי Firebase
npm test -- http://localhost:3457/mcp
```

## פריסה

```
npx wrangler login
npx wrangler deploy --var FIREBASE_API_KEY:<apiKey> --var FIREBASE_PROJECT_ID:<projectId>
```

הערכים נמצאים ב-`config.js` (`firebaseConfig`). אחר כך מכניסים את כתובת ה-Worker ל-`claudeConnectorUrl` ב-`config.js` של האתר.
