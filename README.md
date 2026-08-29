# המשימות שלי — מנהל משימות ומבחנים

אפליקציית ווב בעברית, RTL מלא, מובייל־first, לניהול משימות ומבחנים.
HTML + CSS + JavaScript נטו. בלי React, בלי build step, בלי `npm install`.

## הרצה

```bash
./start.sh          # macOS / Linux
start.cmd           # Windows
python serve.py     # ישירות
```

הדפדפן ייפתח על `http://localhost:8000/index.html`.

> **למה צריך שרת ולא סתם דאבל־קליק על `index.html`?**
> הדפדפן חוסם `import` בין מודולים מעל פרוטוקול `file://` (מדיניות CORS) — זה כלל
> של הדפדפן, לא בחירת תכנון. גם Firebase v10 מסופק כ-ESM בלבד. לכן המפרט של
> "מודולי ES נפרדים" ושל "פתיחה ישירה מהדיסק" אינם יכולים להתקיים יחד; בחרנו
> במודולים (כפי שנדרש במפורש) והוספנו משגר בשורה אחת. אין שלב build ואין תלויות.

## הגדרות אופציונליות

```bash
cp config.example.js config.js   # ואז מלא ערכים
```

`config.js` אינו נכנס לגיט. **בלעדיו האפליקציה עובדת במלואה** — מצב אורח, כל
המשימות, המבחנים, הגיימיפיקציה, הסטטיסטיקה, הייצוא והייבוא. מה שנפתח איתו:

| שדה | מה זה מפעיל |
|---|---|
| `firebaseConfig` | חשבונות משתמש וסנכרון בין מכשירים |
| `googleClientId` | Calendar, Tasks ו-Classroom |

חוקי האבטחה של Firestore נמצאים ב-`firestore.rules` — משתמש ניגש רק ל-`users/{uid}`
שלו, וכל השאר חסום. פרוס אותם לפני שמפעילים חשבונות.

### מה להגדיר בקונסולה

הפרויקט הוא `homework-easy-times` — **אותו פרויקט של גרסה 1.0**. כלומר החשבונות,
ספקי ההתחברות, מסד הנתונים, הדומיינים המאושרים וה-scopes כבר מוגדרים, ונתוני הענן
של משתמשים קיימים כבר יושבים בנתיב הנכון. מה שכן צריך תשומת לב:

| מה | למה | חובה? |
|---|---|---|
| **OAuth client → Authorized JavaScript origins:** הוסף `http://localhost:8000` | שרת הפיתוח כאן רץ על פורט 8000, ו-Google Identity Services בודק את המקור כולל הפורט | רק לפיתוח מקומי מול Calendar/Tasks/Classroom |
| **פריסת `firestore.rules`** — `firebase deploy --only firestore:rules` | החוקים החדשים אוכפים שכל מסמך הוא בדיוק `{ value, updatedAt }` עם זמן שרת | לא — החוקים הישנים מקבלים את מה שהאפליקציה כותבת. זה חיזוק, לא תנאי |

שום דבר אחר לא צריך שינוי: *Email/Password* ו-*Google* כבר מופעלים, `localhost`
ודומיין הפרודקשן כבר ברשימת ה-Authorized domains, וה-scopes של Calendar, Tasks
ו-Classroom הם אותם scopes שגרסה 1.0 כבר אושרה עליהם.

## בדיקות

```bash
node test.mjs       # 37 בדיקות: ציונים, היפוך XP, סינון, חוזה האחסון, מיגרציה מ-1.0
```

## מבנה

```
index.html  login.html  exams.html  stats.html  achievements.html  settings.html
css/    themes.css (טוקנים)  base.css  components.css  views.css
js/     keys.js storage.js cloud.js migrate.js state.js auth.js theme.js ui.js
        tasks.js taskview.js taskform.js subjects.js calendar.js
        exams.js examview.js examform.js
        gamification.js achievements.js timer.js timerview.js
        notifications.js search.js shortcuts.js google.js googleview.js
        charts.js insights.js exportimport.js nav.js boot.js
        app.js examspage.js statspage.js achievementspage.js settingspage.js loginpage.js
data/   achievements.js
```

כל קובץ מתחת ל-340 שורות. `storage.js` הוא הגבול היחיד מול האחסון — שאר הקוד
לא יודע אם הנתונים יושבים ב-localStorage או ב-Firestore.

## חוזה הנתונים

שמות המפתחות והשדות מוגדרים ב-`js/keys.js` ומיושמים מילה במילה לפי נספח א׳.
הנתונים הפעילים תמיד יושבים ב-localStorage תחת שם המפתח **המדויק**; ריבוי
פרופילים מיושם בתמונות מצב נפרדות (`__ns:…`) שלא נוגעות בשמות שבחוזה.
רשומה ישנה שחסרים בה שדות חדשים נטענת עם ברירות מחדל ולא קורסת — יש על זה בדיקות.

### מעבר מגרסה 1.0

`js/migrate.js` רץ פעם אחת בטעינה הראשונה, לפני האתחול, ואינו הרסני — אף מפתח של
1.0 לא נמחק ולא משתנה. מה עובר, ומאיפה:

| מקור ב-1.0 | מה קורה |
|---|---|
| `users/{uid}/data/{key}` בענן | אותו נתיב ואותו מבנה `{ value, updatedAt }` — עובר מעצמו, בלי המרה |
| המפתחות הנקיים (`homework-list`…) | הם גם מיקום החוזה בגרסה הזו — נטענים כמו שהם |
| `guest_profile_{id}` | תמונות המצב של שאר פרופילי האורח, כולל פענוח הקידוד הכפול של 1.0 |
| `user-cache:{uid}:{key}` | ה-cache המקומי של משתמש מחובר, לעבודה בלי רשת |
| `homework-achievements` | ממוזג לתוך `gamification-achievements` (מערכת הישגים אחת) |

בסיום מוצג למשתמש טוסט עם מה שיובא. הרצה שנייה לא עושה דבר ולא דורסת נתון חדש.

## קיצורי מקלדת

`N` משימה חדשה · `E` מבחן חדש · `/` חיפוש · `Ctrl+K` לוח פקודות ·
`V` החלפת תצוגה · `T` טיימר · `?` עזרה · `Esc` סגירה.
ניתנים לשינוי ולכיבוי בהגדרות.
