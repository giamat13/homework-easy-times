import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { VIEW_CSP, VIEW_HTML, VIEW_MIME, VIEW_URI } from "./view.js";
import { AuthError, ConflictError, KEYS, getStore, mutate } from "./lib/firestore.js";
import {
  REPEAT_NAMES, addDays, daysUntil, findBy, fmtDate, isISO, normExam, normSubject, normTask,
  prioIcon, prioName, prioRank, relativeDay, shiftMonth, todayISO, uid, norm,
} from "./lib/model.js";

const READ = { readOnlyHint: true, idempotentHint: true, destructiveHint: false, openWorldHint: false } as const;
const WRITE = { readOnlyHint: false, idempotentHint: false, destructiveHint: false, openWorldHint: false } as const;
const DELETE = { readOnlyHint: false, idempotentHint: true, destructiveHint: true, openWorldHint: false } as const;

type Out = { content: { type: "text"; text: string }[]; structuredContent?: Record<string, unknown>; isError?: boolean };
const card = (t: string, data: Record<string, unknown>): Out => ({ content: [{ type: "text", text: t }], structuredContent: data });
const fail = (t: string): Out => ({ content: [{ type: "text", text: t }], isError: true });
const UI_META = { ui: { resourceUri: VIEW_URI }, "ui/resourceUri": VIEW_URI };

class UserError extends Error {}

function safe<A>(fn: (a: A) => Promise<Out>) {
  return async (a: A): Promise<Out> => {
    try {
      return await fn(a);
    } catch (e) {
      if (e instanceof UserError || e instanceof AuthError || e instanceof ConflictError) return fail(`⚠️ ${e.message}`);
      return fail(`⚠️ שגיאה: ${e instanceof Error ? e.message : String(e)}`);
    }
  };
}

// ---------- data access ----------

const loadTasks = async (): Promise<any[]> => ((await getStore().read(KEYS.tasks, [])).value as any[]).map(normTask);
const loadSubjects = async (): Promise<any[]> => ((await getStore().read(KEYS.subjects, [])).value as any[]).map(normSubject);
const loadExams = async (): Promise<any[]> => ((await getStore().read(KEYS.exams, [])).value as any[]).map(normExam);

const subjName = (subjects: any[], id: string) => subjects.find((s) => s.id === id)?.name ?? "";

function resolveSubject(subjects: any[], q: string): string {
  const r = findBy(subjects.filter((s) => !s.archived), q, (s) => s.name, "מקצוע");
  if ("error" in r) throw new UserError(`${r.error}\nאפשר ליצור מקצוע חדש עם add_subject.`);
  return r.item.id;
}

// ---------- page builders ----------

const taskSub = (t: any, subjects: any[]) =>
  [subjName(subjects, t.subject), t.dueDate ? relativeDay(t.dueDate) : "", t.subtasks.length ? `${t.subtasks.filter((s: any) => s.done).length}/${t.subtasks.length} תתי-משימות` : ""]
    .filter(Boolean).join(" · ");

const taskItem = (t: any, subjects: any[]) => ({
  check: t.completed,
  title: t.title,
  sub: taskSub(t, subjects),
  badge: t.priority === "normal" ? "" : prioName(t.priority),
  call: { name: "get_task", arguments: { task: t.id } },
  checkCall: { name: "complete_task", arguments: { task: t.id } },
});

const taskLine = (t: any, subjects: any[]) =>
  `- [${t.completed ? "x" : " "}] ${t.title}${taskSub(t, subjects) ? ` — ${taskSub(t, subjects)}` : ""}${t.priority !== "normal" ? ` (${prioName(t.priority)})` : ""} (id: ${t.id})`;

function taskPage(t: any, subjects: any[], note?: string) {
  const d = t.dueDate ? daysUntil(t.dueDate) : null;
  return {
    kind: "page",
    title: `${t.completed ? "✅" : prioIcon(t.priority)} ${t.title}`,
    sub: subjName(subjects, t.subject),
    chips: [t.completed ? "הושלמה" : d !== null && d < 0 ? "באיחור" : "פתוחה", t.priority !== "normal" ? prioName(t.priority) : "", t.repeat !== "none" ? REPEAT_NAMES[t.repeat] : ""].filter(Boolean),
    rows: [
      ["מועד הגשה", t.dueDate ? `${fmtDate(t.dueDate)} (${relativeDay(t.dueDate)})` : ""],
      ["תאריך התחלה", t.startDate ? fmtDate(t.startDate) : ""],
      ["תיאור", t.description],
      ["תגיות", t.tags.join(", ")],
      ["הערכת זמן", t.estimateMin ? `${t.estimateMin} דק׳` : ""],
      ["הושלמה ב", t.completedAt ? fmtDate(t.completedAt) : ""],
    ],
    bars: t.progressTarget ? [{ label: "התקדמות", text: `${t.progressCurrent} / ${t.progressTarget} ${t.progressUnit}`, value: t.progressCurrent, max: t.progressTarget, over: false }] : [],
    sections: [
      {
        heading: "תתי-משימות", empty: "אין תתי-משימות.",
        items: t.subtasks.map((s: any) => ({ check: s.done, title: s.title, checkCall: { name: "toggle_subtask", arguments: { task: t.id, subtask: s.id } } })),
      },
      { heading: "פעולות", items: [
        { icon: t.completed ? "↩️" : "✔️", title: t.completed ? "סמן כלא הושלמה" : "סמן כהושלמה", call: { name: "complete_task", arguments: { task: t.id } } },
        { icon: "📋", title: "חזרה לרשימת המשימות", call: { name: "list_tasks", arguments: {} } },
      ] },
    ],
    note,
  };
}

function taskText(t: any, subjects: any[]): string {
  return [
    `${t.completed ? "✅" : prioIcon(t.priority)} ${t.title} (id: ${t.id})`,
    subjName(subjects, t.subject) && `מקצוע: ${subjName(subjects, t.subject)}`,
    t.dueDate && `מועד הגשה: ${fmtDate(t.dueDate)} (${relativeDay(t.dueDate)})`,
    t.startDate && `התחלה: ${fmtDate(t.startDate)}`,
    `עדיפות: ${prioName(t.priority)}`,
    t.repeat !== "none" && `חוזרת: ${REPEAT_NAMES[t.repeat]}`,
    t.description && `תיאור: ${t.description}`,
    t.tags.length && `תגיות: ${t.tags.join(", ")}`,
    t.subtasks.length && `תתי-משימות:\n${t.subtasks.map((s: any) => `  - [${s.done ? "x" : " "}] ${s.title} (id: ${s.id})`).join("\n")}`,
  ].filter(Boolean).join("\n");
}

function listPage(title: string, sub: string, groups: { heading: string; tasks: any[] }[], subjects: any[], empty: string, note?: string) {
  return {
    kind: "page", title, sub,
    sections: groups.map((g) => ({ heading: `${g.heading} (${g.tasks.length})`, empty, items: g.tasks.map((t) => taskItem(t, subjects)) })),
    note,
  };
}

const sortTasks = (list: any[]) =>
  [...list].sort((a, b) =>
    Number(a.completed) - Number(b.completed) ||
    Number(!a.dueDate) - Number(!b.dueDate) ||
    (a.dueDate || "").localeCompare(b.dueDate || "") ||
    prioRank(a.priority) - prioRank(b.priority));

const bucketOf = (t: any): "overdue" | "today" | "week" | "later" | "nodate" | "done" => {
  if (t.completed) return "done";
  if (!t.dueDate) return "nodate";
  const d = daysUntil(t.dueDate)!;
  return d < 0 ? "overdue" : d === 0 ? "today" : d <= 7 ? "week" : "later";
};
const BUCKETS: [string, string][] = [["overdue", "⚠️ באיחור"], ["today", "📌 היום"], ["week", "🗓️ השבוע"], ["later", "📅 בהמשך"], ["nodate", "📄 ללא תאריך"], ["done", "✅ הושלמו"]];

// ---------- server ----------

export function createServer(): McpServer {
  const server = new McpServer({ name: "homework-easy-times", title: "Homework Easy Times", version: "1.0.0" } as any);

  server.registerResource("card", VIEW_URI, { title: "Card", description: "Visual cards for tasks, exams and subjects.", mimeType: VIEW_MIME }, async () => ({
    contents: [{ uri: VIEW_URI, mimeType: VIEW_MIME, text: VIEW_HTML, _meta: { ui: { csp: VIEW_CSP, prefersBorder: false } } }],
  }));

  const reg = (name: string, title: string, description: string, inputSchema: any, annotations: any, handler: (a: any) => Promise<Out>) =>
    server.registerTool(name, { title, description, inputSchema, annotations: { title, ...annotations }, _meta: UI_META }, safe(handler) as any);

  const date = (d: string) => z.string().describe(d).refine(isISO, "פורמט תאריך: yyyy-mm-dd");

  // ----- reads -----

  reg("get_overview", "📊 סקירה כללית", "Dashboard of the user's homework: counts of open/overdue/due-today tasks and the nearest items plus upcoming exams. Use first when the user asks 'what do I have to do', 'what's on my plate' or similar.", {}, READ, async () => {
    const [tasks, subjects, exams] = await Promise.all([loadTasks(), loadSubjects(), loadExams()]);
    const active = tasks.filter((t) => !t.archived);
    const open = sortTasks(active.filter((t) => !t.completed));
    const by = (b: string) => open.filter((t) => bucketOf(t) === b);
    const upcoming = exams.filter((e) => !e.archived && !e.completed && e.date && daysUntil(e.date)! >= 0).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);
    const nearest = [...by("overdue"), ...by("today"), ...by("week")].slice(0, 8);
    const text = [
      `📊 ${open.length} משימות פתוחות · ${by("overdue").length} באיחור · ${by("today").length} להיום · ${by("week").length} לשבוע הקרוב · ${active.length - open.length} הושלמו`,
      nearest.length ? `\nהקרובות:\n${nearest.map((t) => taskLine(t, subjects)).join("\n")}` : "\nאין משימות דחופות. 🎉",
      upcoming.length ? `\nמבחנים קרובים:\n${upcoming.map((e) => `- ${e.title} ${subjName(subjects, e.subject) ? `(${subjName(subjects, e.subject)}) ` : ""}— ${fmtDate(e.date)} (${relativeDay(e.date)}) (id: ${e.id})`).join("\n")}` : "",
    ].join("\n");
    return card(text, {
      kind: "page", title: "📚 הסקירה שלי", sub: todayISO().split("-").reverse().join("/"),
      chips: [`${open.length} פתוחות`, `${by("overdue").length} באיחור`, `${by("today").length} להיום`, `${by("week").length} השבוע`],
      bars: [{ label: "הושלמו", text: `${active.length - open.length} / ${active.length}`, value: active.length - open.length, max: active.length, over: false }],
      sections: [
        { heading: "הקרובות", empty: "אין משימות דחופות 🎉", items: nearest.map((t) => taskItem(t, subjects)) },
        { heading: "מבחנים קרובים", empty: "אין מבחנים קרובים.", items: upcoming.map((e) => ({ icon: "📝", title: e.title, sub: `${subjName(subjects, e.subject)} ${relativeDay(e.date)}`.trim(), badge: fmtDate(e.date), call: { name: "list_exams", arguments: {} } })) },
        { heading: "ניווט", items: [{ icon: "📋", title: "כל המשימות הפתוחות", call: { name: "list_tasks", arguments: {} } }, { icon: "🎨", title: "מקצועות", call: { name: "list_subjects", arguments: {} } }] },
      ],
    });
  });

  reg("list_tasks", "📋 רשימת משימות", "Lists homework tasks grouped by urgency (overdue, today, this week, later, no date). Filter by status, subject, urgency or free text. Subject accepts a name (typos tolerated).",
    {
      status: z.enum(["open", "done", "all"]).default("open").describe("open (default), done or all"),
      subject: z.string().trim().max(80).optional().describe("Subject name or id, e.g. 'מתמטיקה'"),
      urgency: z.enum(["overdue", "today", "week", "nodate"]).optional().describe("Only overdue / due today / due within 7 days / no due date"),
      query: z.string().trim().max(100).optional().describe("Free text searched in title, description, tags and subtasks"),
      limit: z.number().int().min(1).max(60).default(30).describe("Max tasks to return"),
    }, READ, async ({ status, subject, urgency, query, limit }) => {
      const [tasks, subjects] = await Promise.all([loadTasks(), loadSubjects()]);
      const sid = subject ? resolveSubject(subjects, subject) : "";
      let list = tasks.filter((t) => !t.archived);
      if (status === "open") list = list.filter((t) => !t.completed);
      if (status === "done") list = list.filter((t) => t.completed);
      if (sid) list = list.filter((t) => t.subject === sid);
      if (urgency) {
        list = list.filter((t) => {
          if (t.completed) return false;
          if (urgency === "nodate") return !t.dueDate;
          const d = t.dueDate ? daysUntil(t.dueDate)! : null;
          if (d === null) return false;
          return urgency === "overdue" ? d < 0 : urgency === "today" ? d === 0 : d >= 0 && d <= 7;
        });
      }
      if (query) { const q = norm(query); list = list.filter((t) => norm([t.title, t.description, subjName(subjects, t.subject), ...t.tags, ...t.subtasks.map((s: any) => s.title)].join(" ")).includes(q)); }
      const sorted = sortTasks(list);
      const shown = sorted.slice(0, limit);
      const groups = BUCKETS.map(([k, label]) => ({ heading: label, tasks: shown.filter((t) => bucketOf(t) === k) })).filter((g) => g.tasks.length);
      const text = shown.length ? `${sorted.length} משימות${sorted.length > shown.length ? ` (מוצגות ${shown.length})` : ""}:\n${groups.map((g) => `\n${g.heading}\n${g.tasks.map((t) => taskLine(t, subjects)).join("\n")}`).join("\n")}` : "לא נמצאו משימות מתאימות.";
      return card(text, listPage("📋 משימות", `${sorted.length} משימות${subject ? ` · ${subjName(subjects, sid)}` : ""}`, groups, subjects, "אין משימות."));
    });

  reg("get_task", "🔎 פרטי משימה", "Shows one task with its subtasks and details. 'task' is the task id or a (partial) title.",
    { task: z.string().trim().min(1).max(200).describe("Task id or title text, e.g. 'חיבור באנגלית'") }, READ, async ({ task }) => {
      const [tasks, subjects] = await Promise.all([loadTasks(), loadSubjects()]);
      const r = findBy(tasks.filter((t) => !t.archived), task, (t) => t.title, "משימה");
      if ("error" in r) throw new UserError(r.error);
      return card(taskText(r.item, subjects), taskPage(r.item, subjects));
    });

  reg("list_subjects", "🎨 מקצועות", "Lists the user's subjects with the number of open tasks in each.", {}, READ, async () => {
    const [tasks, subjects] = await Promise.all([loadTasks(), loadSubjects()]);
    const rows = subjects.filter((s) => !s.archived).map((s) => ({ s, open: tasks.filter((t) => !t.archived && !t.completed && t.subject === s.id).length }));
    const text = rows.length ? `${rows.length} מקצועות:\n${rows.map((r) => `- ${r.s.name}${r.s.teacher ? ` (${r.s.teacher})` : ""} — ${r.open} משימות פתוחות (id: ${r.s.id})`).join("\n")}` : "אין מקצועות עדיין. אפשר ליצור עם add_subject.";
    return card(text, {
      kind: "page", title: "🎨 מקצועות", sub: `${rows.length} מקצועות`,
      sections: [{ heading: "", empty: "אין מקצועות עדיין.", items: rows.map((r) => ({ icon: "📘", title: r.s.name, sub: r.s.teacher, badge: `${r.open} פתוחות`, call: { name: "list_tasks", arguments: { subject: r.s.id } } })) }],
    });
  });

  reg("list_exams", "📝 מבחנים", "Lists exams (upcoming by default) with date, subject and grade. Use for 'when is my next test' or grade questions.",
    {
      scope: z.enum(["upcoming", "past", "all"]).default("upcoming").describe("upcoming (default), past or all"),
      subject: z.string().trim().max(80).optional().describe("Subject name or id"),
      limit: z.number().int().min(1).max(50).default(20),
    }, READ, async ({ scope, subject, limit }) => {
      const [exams, subjects] = await Promise.all([loadExams(), loadSubjects()]);
      const sid = subject ? resolveSubject(subjects, subject) : "";
      let list = exams.filter((e) => !e.archived && (!sid || e.subject === sid));
      const isUp = (e: any) => !e.completed && e.date && daysUntil(e.date)! >= 0;
      if (scope === "upcoming") list = list.filter(isUp);
      if (scope === "past") list = list.filter((e) => !isUp(e));
      list.sort((a, b) => (scope === "past" ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)));
      list = list.slice(0, limit);
      const line = (e: any) => `${e.title}${subjName(subjects, e.subject) ? ` (${subjName(subjects, e.subject)})` : ""} — ${e.date ? `${fmtDate(e.date)}, ${relativeDay(e.date)}` : "ללא תאריך"}${e.gradeFinal !== null ? ` · ציון ${e.gradeFinal}/${e.gradeMax}` : ""}`;
      const text = list.length ? `${list.length} מבחנים:\n${list.map((e) => `- ${line(e)} (id: ${e.id})`).join("\n")}` : "לא נמצאו מבחנים.";
      return card(text, {
        kind: "page", title: "📝 מבחנים", sub: scope === "upcoming" ? "קרובים" : scope === "past" ? "שעברו" : "הכל",
        sections: [{ heading: "", empty: "אין מבחנים.", items: list.map((e) => ({
          icon: e.gradeFinal !== null ? "🎓" : "📝", title: e.title, sub: [subjName(subjects, e.subject), e.date ? relativeDay(e.date) : "", e.topics.length ? `${e.topics.filter((t: any) => t.done).length}/${e.topics.length} נושאים` : ""].filter(Boolean).join(" · "),
          badge: e.gradeFinal !== null ? `${e.gradeFinal}/${e.gradeMax}` : e.date ? fmtDate(e.date) : "",
        })) }],
      });
    });

  // ----- task writes -----

  const taskFields = {
    subject: z.string().trim().max(80).optional().describe("Subject name or id (must exist; create with add_subject)"),
    due_date: date("Due date yyyy-mm-dd, e.g. '2026-11-12'").optional(),
    start_date: date("Start date yyyy-mm-dd").optional(),
    priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
    description: z.string().max(2000).optional(),
    tags: z.array(z.string().trim().min(1).max(40)).max(10).optional(),
    estimate_min: z.number().int().min(1).max(1440).optional().describe("Estimated minutes"),
    repeat: z.enum(["none", "daily", "weekly", "monthly"]).optional(),
  };

  reg("add_task", "➕ הוספת משימה", "Creates a homework task. Only the title is required. Due dates are yyyy-mm-dd; resolve words like 'tomorrow' to a date first (today is given by get_overview).",
    { title: z.string().trim().min(1).max(200).describe("Task title, e.g. 'תרגיל 5 בפיזיקה'"), ...taskFields, subtasks: z.array(z.string().trim().min(1).max(200)).max(30).optional().describe("Subtask titles") },
    WRITE, async (a) => {
      const subjects = await loadSubjects();
      const subject = a.subject ? resolveSubject(subjects, a.subject) : "";
      const t = await mutate(KEYS.tasks, [], (list: any[]) => {
        const nt = normTask({
          title: a.title, subject, dueDate: a.due_date ?? "", startDate: a.start_date ?? "", priority: a.priority ?? "normal", description: a.description ?? "",
          tags: a.tags ?? [], estimateMin: a.estimate_min ?? null, repeat: a.repeat ?? "none", subtasks: a.subtasks ?? [], id: uid("t"), createdAt: todayISO(), order: list.length,
        });
        list.push(nt);
        return nt;
      });
      if (a.tags?.length) await mutate(KEYS.tags, [], (tags: string[]) => { for (const g of a.tags) if (!tags.includes(g)) tags.push(g); });
      return card(`✅ נוספה משימה.\n${taskText(t, subjects)}`, taskPage(t, subjects, "המשימה נוספה"));
    });

  reg("update_task", "✏️ עדכון משימה", "Edits fields of an existing task (title, subject, dates, priority, description, tags, repeat). Only the given fields change. To mark done use complete_task. Pass an empty string for due_date/start_date/subject to clear it.",
    {
      task: z.string().trim().min(1).max(200).describe("Task id or title text"),
      title: z.string().trim().min(1).max(200).optional(),
      ...taskFields,
      due_date: z.union([date("yyyy-mm-dd"), z.literal("")]).optional().describe("yyyy-mm-dd, or '' to clear"),
      start_date: z.union([date("yyyy-mm-dd"), z.literal("")]).optional().describe("yyyy-mm-dd, or '' to clear"),
      subject: z.string().trim().max(80).optional().describe("Subject name or id, or '' to clear"),
    }, WRITE, async (a) => {
      const subjects = await loadSubjects();
      const subject = a.subject === undefined ? undefined : a.subject === "" ? "" : resolveSubject(subjects, a.subject);
      const t = await mutate(KEYS.tasks, [], (list: any[]) => {
        const r = findBy(list.map(normTask).filter((x) => !x.archived), a.task, (x) => x.title, "משימה");
        if ("error" in r) throw new UserError(r.error);
        const i = list.findIndex((x) => x.id === r.item.id);
        const patch: any = {};
        if (a.title !== undefined) patch.title = a.title;
        if (subject !== undefined) patch.subject = subject;
        if (a.due_date !== undefined) patch.dueDate = a.due_date;
        if (a.start_date !== undefined) patch.startDate = a.start_date;
        for (const [k, f] of [["priority", "priority"], ["description", "description"], ["tags", "tags"], ["estimate_min", "estimateMin"], ["repeat", "repeat"]] as const) if (a[k] !== undefined) patch[f] = a[k];
        list[i] = normTask({ ...r.item, ...patch });
        return list[i];
      });
      if (a.tags?.length) await mutate(KEYS.tags, [], (tags: string[]) => { for (const g of a.tags) if (!tags.includes(g)) tags.push(g); });
      return card(`✏️ עודכנה.\n${taskText(t, subjects)}`, taskPage(t, subjects, "המשימה עודכנה"));
    });

  reg("complete_task", "✔️ סימון משימה", "Marks a task done (or not done). Without 'done' it toggles. Completing a repeating task creates the next occurrence, like the app does. Note: XP/achievements are only awarded by the web app itself.",
    { task: z.string().trim().min(1).max(200).describe("Task id or title text"), done: z.boolean().optional().describe("true = done, false = reopen, omitted = toggle") },
    WRITE, async ({ task, done }) => {
      const subjects = await loadSubjects();
      let spawned: any = null;
      const t = await mutate(KEYS.tasks, [], (list: any[]) => {
        const r = findBy(list.map(normTask).filter((x) => !x.archived), task, (x) => x.title, "משימה");
        if ("error" in r) throw new UserError(r.error);
        const i = list.findIndex((x) => x.id === r.item.id);
        const cur = r.item;
        const want = done === undefined ? !cur.completed : done;
        if (want === cur.completed) { list[i] = cur; return cur; }
        const next = normTask({ ...cur, completed: want, completedAt: want ? todayISO() : null, progressCurrent: want && cur.progressTarget !== null ? cur.progressTarget : cur.progressCurrent });
        list[i] = next;
        if (want && cur.repeat !== "none") {
          const base = cur.dueDate || todayISO();
          const nd = cur.repeat === "daily" ? addDays(base, 1) : cur.repeat === "weekly" ? addDays(base, 7) : shiftMonth(base, 1);
          const shift = Math.round((Date.parse(nd) - Date.parse(base)) / 86400000);
          spawned = normTask({
            ...cur, id: uid("t"), createdAt: todayISO(), order: list.length, dueDate: nd, completed: false, completedAt: null, progressCurrent: 0, notified: false, todayNotified: false,
            startDate: cur.startDate ? addDays(cur.startDate, shift) : "", subtasks: cur.subtasks.map((s: any) => ({ ...s, id: uid("s"), done: false })),
          });
          list.push(spawned);
        }
        return next;
      });
      const msg = `${t.completed ? "✅ סומנה כהושלמה" : "↩️ נפתחה מחדש"}: ${t.title}${spawned ? `\n🔁 נוצר המופע הבא ל-${fmtDate(spawned.dueDate)}` : ""}`;
      return card(msg, taskPage(t, subjects, spawned ? `🔁 המופע הבא נוצר ל-${fmtDate(spawned.dueDate)}` : t.completed ? "כל הכבוד! 🎉" : undefined));
    });

  reg("toggle_subtask", "☑️ תת-משימה", "Toggles one subtask of a task between done and not done.",
    { task: z.string().trim().min(1).max(200).describe("Task id or title text"), subtask: z.string().trim().min(1).max(200).describe("Subtask id or title text") },
    WRITE, async ({ task, subtask }) => {
      const subjects = await loadSubjects();
      const t = await mutate(KEYS.tasks, [], (list: any[]) => {
        const r = findBy(list.map(normTask).filter((x) => !x.archived), task, (x) => x.title, "משימה");
        if ("error" in r) throw new UserError(r.error);
        const s = findBy(r.item.subtasks, subtask, (x: any) => x.title, "תת-משימה");
        if ("error" in s) throw new UserError(s.error);
        s.item.done = !s.item.done;
        const i = list.findIndex((x) => x.id === r.item.id);
        list[i] = r.item;
        return r.item;
      });
      return card(`☑️ עודכנה תת-משימה ב-"${t.title}".\n${taskText(t, subjects)}`, taskPage(t, subjects));
    });

  reg("delete_task", "🗑️ מחיקת משימה", "Permanently deletes a task. Ask the user to confirm before calling it.",
    { task: z.string().trim().min(1).max(200).describe("Task id or title text") }, DELETE, async ({ task }) => {
      const subjects = await loadSubjects();
      const removed = await mutate(KEYS.tasks, [], (list: any[]) => {
        const r = findBy(list.map(normTask), task, (x) => x.title, "משימה");
        if ("error" in r) throw new UserError(r.error);
        list.splice(list.findIndex((x) => x.id === r.item.id), 1);
        return r.item;
      });
      return card(`🗑️ נמחקה: ${removed.title}`, { kind: "page", title: "🗑️ המשימה נמחקה", sub: removed.title, sections: [{ heading: "", items: [{ icon: "📋", title: "חזרה לרשימת המשימות", call: { name: "list_tasks", arguments: {} } }] }] });
    });

  // ----- subjects -----

  reg("add_subject", "➕ הוספת מקצוע", "Creates a new subject (school subject / topic) so tasks and exams can be filed under it.",
    { name: z.string().trim().min(1).max(60).describe("Subject name, e.g. 'פיזיקה'"), teacher: z.string().trim().max(60).optional() }, WRITE, async ({ name, teacher }) => {
      const s = await mutate(KEYS.subjects, [], (list: any[]) => {
        const dup = list.find((x) => norm(x.name) === norm(name) && !x.archived);
        if (dup) throw new UserError(`כבר קיים מקצוע בשם "${dup.name}".`);
        const ns = normSubject({ id: uid("sub"), name, teacher: teacher ?? "" });
        list.push(ns);
        return ns;
      });
      return card(`✅ נוסף מקצוע: ${s.name} (id: ${s.id})`, { kind: "page", title: `📘 ${s.name}`, sub: "המקצוע נוסף", sections: [{ heading: "", items: [{ icon: "🎨", title: "כל המקצועות", call: { name: "list_subjects", arguments: {} } }] }] });
    });

  // ----- exams -----

  reg("add_exam", "➕ הוספת מבחן", "Creates an exam with a date, optional subject and study topics.",
    {
      title: z.string().trim().min(1).max(200).describe("Exam title, e.g. 'מבחן באלגברה'"),
      date: date("Exam date yyyy-mm-dd"),
      subject: z.string().trim().max(80).optional().describe("Subject name or id"),
      topics: z.array(z.string().trim().min(1).max(200)).max(40).optional().describe("Topics to study"),
      notes: z.string().max(2000).optional(),
    }, WRITE, async (a) => {
      const subjects = await loadSubjects();
      const subject = a.subject ? resolveSubject(subjects, a.subject) : "";
      const e = await mutate(KEYS.exams, [], (list: any[]) => {
        const ne = normExam({ id: uid("x"), title: a.title, date: a.date, subject, topics: a.topics ?? [], notes: a.notes ?? "", createdAt: todayISO() });
        list.push(ne);
        return ne;
      });
      return card(`✅ נוסף מבחן: ${e.title} — ${fmtDate(e.date)} (${relativeDay(e.date)}) (id: ${e.id})`, {
        kind: "page", title: `📝 ${e.title}`, sub: subjName(subjects, e.subject), chips: [relativeDay(e.date)],
        rows: [["תאריך", fmtDate(e.date)], ["הערות", e.notes]],
        sections: [{ heading: "נושאים", empty: "אין נושאים.", items: e.topics.map((t: any) => ({ icon: "📖", title: t.title })) }, { heading: "", items: [{ icon: "📝", title: "כל המבחנים", call: { name: "list_exams", arguments: {} } }] }],
      });
    });

  reg("update_exam", "✏️ עדכון מבחן", "Edits an exam: title, date, notes, mark completed, or record the grade (grade out of grade_max, default 100).",
    {
      exam: z.string().trim().min(1).max(200).describe("Exam id or title text"),
      title: z.string().trim().min(1).max(200).optional(),
      date: date("yyyy-mm-dd").optional(),
      notes: z.string().max(2000).optional(),
      completed: z.boolean().optional(),
      grade: z.number().min(0).max(1000).optional().describe("The grade received"),
      grade_max: z.number().min(1).max(1000).optional().describe("Maximum grade, default 100"),
    }, WRITE, async (a) => {
      const subjects = await loadSubjects();
      const e = await mutate(KEYS.exams, [], (list: any[]) => {
        const r = findBy(list.map(normExam).filter((x) => !x.archived), a.exam, (x) => x.title, "מבחן");
        if ("error" in r) throw new UserError(r.error);
        const i = list.findIndex((x) => x.id === r.item.id);
        const patch: any = {};
        if (a.title !== undefined) patch.title = a.title;
        if (a.date !== undefined) patch.date = a.date;
        if (a.notes !== undefined) patch.notes = a.notes;
        if (a.completed !== undefined) patch.completed = a.completed;
        if (a.grade !== undefined) { patch.grade = a.grade; patch.completed = a.completed ?? true; }
        if (a.grade_max !== undefined) patch.gradeMax = a.grade_max;
        list[i] = normExam({ ...r.item, ...patch });
        return list[i];
      });
      return card(`✏️ עודכן מבחן: ${e.title}${e.gradeFinal !== null ? ` · ציון ${e.gradeFinal}/${e.gradeMax}` : ""}`, {
        kind: "page", title: `📝 ${e.title}`, sub: subjName(subjects, e.subject), chips: [e.completed ? "הושלם" : relativeDay(e.date)].filter(Boolean),
        rows: [["תאריך", e.date ? fmtDate(e.date) : ""], ["ציון", e.gradeFinal !== null ? `${e.gradeFinal} / ${e.gradeMax} (${e.gradePct}%)` : ""], ["הערות", e.notes]],
        sections: [{ heading: "", items: [{ icon: "📝", title: "כל המבחנים", call: { name: "list_exams", arguments: { scope: "all" } } }] }],
      });
    });

  reg("delete_exam", "🗑️ מחיקת מבחן", "Permanently deletes an exam. Ask the user to confirm before calling it.",
    { exam: z.string().trim().min(1).max(200).describe("Exam id or title text") }, DELETE, async ({ exam }) => {
      const removed = await mutate(KEYS.exams, [], (list: any[]) => {
        const r = findBy(list.map(normExam), exam, (x) => x.title, "מבחן");
        if ("error" in r) throw new UserError(r.error);
        list.splice(list.findIndex((x) => x.id === r.item.id), 1);
        return r.item;
      });
      return card(`🗑️ נמחק מבחן: ${removed.title}`, { kind: "page", title: "🗑️ המבחן נמחק", sub: removed.title, sections: [{ heading: "", items: [{ icon: "📝", title: "כל המבחנים", call: { name: "list_exams", arguments: {} } }] }] });
    });

  return server;
}
