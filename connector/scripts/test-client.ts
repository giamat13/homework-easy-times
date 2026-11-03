// Calls EVERY tool through a real MCP client against the mock store.
// Usage: HOMEWORK_MOCK=1 PORT=3331 npm run dev   then   npm test -- http://localhost:3331/mcp
// Fails (exit 1) on errors, empty output, missing cards, or any registered tool missing from `calls`.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const url = process.argv[2] ?? "http://localhost:3000/mcp";
const client = new Client({ name: "homework-test", version: "1.0.0" });
await client.connect(new StreamableHTTPClientTransport(new URL(url)));

const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const nextWeek = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
const longAgo = "2020-01-01";

type Call = [string, Record<string, unknown>, { error?: boolean }?];
const calls: Call[] = [
  ["get_overview", {}],
  ["list_subjects", {}],
  ["add_subject", { name: "פיזיקה", teacher: "דנה" }],
  ["add_subject", { name: "פיזיקה" }, { error: true }], // duplicate
  ["add_task", { title: "תרגיל 5 בפיזיקה", subject: "פיזיקא", due_date: tomorrow, priority: "high", subtasks: ["סעיף א", "סעיף ב"], tags: ["בית"] }, { error: true }], // typo -> suggestions
  ["add_task", { title: "תרגיל 5 בפיזיקה", subject: "פיזיקה", due_date: tomorrow, priority: "high", subtasks: ["סעיף א", "סעיף ב"], tags: ["בית"] }],
  ["add_task", { title: "קריאה יומית", due_date: nextWeek, repeat: "daily" }],
  ["add_task", { title: "משימה ישנה", due_date: longAgo }],
  ["list_tasks", {}],
  ["list_tasks", { urgency: "overdue" }],
  ["list_tasks", { subject: "פיזיקה", query: "תרגיל" }],
  ["get_task", { task: "תרגיל 5" }],
  ["get_task", { task: "לא קיימת בכלל" }, { error: true }],
  ["update_task", { task: "משימה ישנה", due_date: nextWeek, priority: "urgent" }],
  ["toggle_subtask", { task: "תרגיל 5", subtask: "סעיף א" }],
  ["complete_task", { task: "קריאה יומית" }], // repeating -> spawns next
  ["complete_task", { task: "תרגיל 5", done: true }],
  ["list_tasks", { status: "done" }],
  ["add_exam", { title: "מבחן באלגברה", date: nextWeek, subject: "פיזיקה", topics: ["משוואות", "פונקציות"] }],
  ["update_exam", { exam: "אלגברה", grade: 92 }],
  ["list_exams", { scope: "all" }],
  ["delete_exam", { exam: "אלגברה" }],
  ["delete_task", { task: "משימה ישנה" }],
];

const tools = await client.listTools();
console.log(`Connected to ${url}. ${tools.tools.length} tools: ${tools.tools.map((t) => t.name).join(", ")}`);
const untested = tools.tools.filter((t) => !calls.some(([n]) => n === t.name)).map((t) => t.name);
let bad = 0;
for (const [name, args, opt] of calls) {
  const t0 = Date.now();
  const r: any = await client.callTool({ name, arguments: args });
  const txt: string = r.content?.map((c: any) => c.text).join("\n") ?? "";
  const expectErr = !!opt?.error;
  const noCard = !r.isError && r.structuredContent?.kind !== "page";
  const wrong = (!!r.isError !== expectErr) || txt.trim().length < 5 || noCard;
  if (wrong) bad++;
  console.log(`\n=== ${name} ${JSON.stringify(args)} — ${Date.now() - t0}ms ${wrong ? "PROBLEM" : "ok"}${expectErr ? " (expected error)" : ""} ===`);
  console.log(process.env.FULL ? txt : txt.split("\n").slice(0, 8).join("\n"));
}
console.log(`\nUntested tools: ${untested.join(", ") || "none"}. Problems: ${bad}`);
await client.close();
process.exit(bad || untested.length ? 1 : 0);
