// Store for the app's data. The site keeps each list as ONE document: users/{uid}/data/{key} = { value, updatedAt }.
// firestore.rules only allow exactly those two fields and require updatedAt == request.time (REQUEST_TIME transform).
import { currentKey, sessionFromRefreshToken } from "./session.js";

export class ConflictError extends Error {}
export class AuthError extends Error {}

export const KEYS = {
  tasks: "homework-list",
  subjects: "homework-subjects",
  tags: "homework-tags",
  exams: "exams-list",
} as const;

export interface Store {
  /** Returns the stored value (or `fallback`) and an opaque version for optimistic concurrency. */
  read(key: string, fallback: any): Promise<{ value: any; version: string | null }>;
  write(key: string, value: any, version: string | null): Promise<void>;
}

// ---------- Firestore value codec ----------

export function enc(v: any): any {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === "string") return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: v.length ? { values: v.map(enc) } : {} };
  const fields: Record<string, any> = {};
  for (const [k, x] of Object.entries(v)) if (x !== undefined) fields[k] = enc(x);
  return { mapValue: { fields } };
}

export function dec(v: any): any {
  if (!v || "nullValue" in v) return null;
  if ("booleanValue" in v) return v.booleanValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("stringValue" in v) return v.stringValue;
  if ("timestampValue" in v) return v.timestampValue;
  if ("arrayValue" in v) return (v.arrayValue.values ?? []).map(dec);
  if ("mapValue" in v) {
    const o: Record<string, any> = {};
    for (const [k, x] of Object.entries(v.mapValue.fields ?? {})) o[k] = dec(x);
    return o;
  }
  return null;
}

// ---------- REST store ----------

const env = (k: string): string => (globalThis as any).process?.env?.[k] ?? "";

class RestStore implements Store {
  private async ctx() {
    const apiKey = env("FIREBASE_API_KEY");
    const project = env("FIREBASE_PROJECT_ID");
    if (!apiKey || !project) throw new Error("השרת לא מוגדר: חסרים FIREBASE_API_KEY / FIREBASE_PROJECT_ID.");
    const key = currentKey();
    if (!key) throw new AuthError("חסר קישור אישי. פתח את האפליקציה → הגדרות → חבר את Claude, והעתק את הקישור.");
    const s = await sessionFromRefreshToken(key, apiKey);
    const root = `projects/${project}/databases/(default)/documents`;
    return { s, root, base: `https://firestore.googleapis.com/v1/${root}` };
  }

  async read(key: string, fallback: any) {
    const { s, base } = await this.ctx();
    const res = await fetch(`${base}/users/${s.uid}/data/${encodeURIComponent(key)}`, {
      headers: { authorization: `Bearer ${s.idToken}` },
      signal: AbortSignal.timeout(15000),
    });
    if (res.status === 404) return { value: fallback, version: null };
    const body: any = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Firestore (${res.status}): ${body?.error?.message ?? "שגיאה בקריאה"}`);
    const raw = body.fields?.value;
    return { value: raw === undefined ? fallback : dec(raw), version: String(body.updateTime) };
  }

  async write(key: string, value: any, version: string | null) {
    const { s, root, base } = await this.ctx();
    const name = `${root}/users/${s.uid}/data/${key}`;
    const res = await fetch(`${base}:commit`, {
      method: "POST",
      headers: { authorization: `Bearer ${s.idToken}`, "content-type": "application/json" },
      body: JSON.stringify({
        writes: [
          {
            update: { name, fields: { value: enc(value) } },
            updateMask: { fieldPaths: ["value"] },
            updateTransforms: [{ fieldPath: "updatedAt", setToServerValue: "REQUEST_TIME" }],
            currentDocument: version ? { updateTime: version } : { exists: false },
          },
        ],
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (res.ok) return;
    const body: any = await res.json().catch(() => ({}));
    const status = body?.error?.status;
    if (res.status === 409 || status === "ABORTED" || status === "FAILED_PRECONDITION" || status === "ALREADY_EXISTS")
      throw new ConflictError("הנתונים השתנו בינתיים (מכשיר אחר).");
    if (res.status === 403) throw new Error("Firestore דחה את הכתיבה (firestore.rules). ודא שהקישור שייך למשתמש הנכון.");
    throw new Error(`Firestore (${res.status}): ${body?.error?.message ?? "שגיאה בכתיבה"}`);
  }
}

// ---------- in-memory mock (tests, local dev without Firebase) ----------

class MockStore implements Store {
  private docs = new Map<string, { value: any; version: number }>();
  async read(key: string, fallback: any) {
    const d = this.docs.get(key);
    return d ? { value: structuredClone(d.value), version: String(d.version) } : { value: fallback, version: null };
  }
  async write(key: string, value: any, version: string | null) {
    const d = this.docs.get(key);
    if ((d ? String(d.version) : null) !== version) throw new ConflictError("הנתונים השתנו בינתיים.");
    this.docs.set(key, { value: structuredClone(value), version: (d?.version ?? 0) + 1 });
  }
}

let mock: MockStore | null = null;
export const isMock = () => env("HOMEWORK_MOCK") === "1";

export function getStore(): Store {
  if (isMock()) return (mock ??= new MockStore());
  return new RestStore();
}

/** Read-modify-write with optimistic concurrency; retries when another device wrote in between. */
export async function mutate<T>(key: string, fallback: any, fn: (value: any) => T): Promise<T> {
  const store = getStore();
  for (let attempt = 0; ; attempt++) {
    const { value, version } = await store.read(key, fallback);
    const result = fn(value);
    try {
      await store.write(key, value, version);
      return result;
    } catch (e) {
      if (e instanceof ConflictError && attempt < 2) continue;
      throw e;
    }
  }
}
