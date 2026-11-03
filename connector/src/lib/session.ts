// Per-request sign-in from a personal link. The link carries the user's Firebase refresh token (`?key=...`).
// Each request trades it for a short-lived ID token, so Firestore sees the real user and firestore.rules
// stay the security boundary. Nothing is stored. Needs `nodejs_compat` on Cloudflare Workers.
import { AsyncLocalStorage } from "node:async_hooks";

export type Session = { idToken: string; uid: string; email: string; expires: number };

const TOKEN_URL = "https://securetoken.googleapis.com/v1/token";

const als = new AsyncLocalStorage<{ key: string }>();
const cache = new Map<string, Session>(); // best effort, per isolate; entries expire with the ID token

/** Runs `fn` with the personal key of this request in scope. */
export const withKey = <T>(key: string, fn: () => Promise<T>): Promise<T> => als.run({ key }, fn);
export const currentKey = (): string => als.getStore()?.key ?? "";

function payload(jwt: string): Record<string, unknown> {
  try {
    const b64 = jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(b64));
  } catch {
    return {};
  }
}

/** Trades a refresh token for an ID token. Throws a readable error when the link is no longer valid. */
export async function sessionFromRefreshToken(refreshToken: string, apiKey: string): Promise<Session> {
  const hit = cache.get(refreshToken);
  if (hit && hit.expires > Date.now() + 60_000) return hit;
  let res: Response;
  try {
    res = await fetch(`${TOKEN_URL}?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`,
      signal: AbortSignal.timeout(12000),
    });
  } catch (e) {
    throw new Error(`Firebase is unreachable (${e instanceof Error ? e.message : String(e)}).`);
  }
  const body: any = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new Error(
      "הקישור שלך ל-Claude כבר לא תקף (התנתקת מכל המכשירים, שינית סיסמה, או שהקישור שגוי). פתח את האפליקציה → הגדרות → חבר את Claude, וצור קישור חדש.",
    );
  const idToken: string = body.id_token ?? body.idToken;
  const claims = payload(idToken);
  const session: Session = {
    idToken,
    uid: String(body.user_id ?? claims.user_id ?? claims.sub ?? ""),
    email: String(claims.email ?? ""),
    expires: Date.now() + Number(body.expires_in ?? 3600) * 1000,
  };
  if (cache.size > 200) cache.clear();
  cache.set(refreshToken, session);
  return session;
}
