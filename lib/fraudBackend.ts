// The fraud backend runs on the user's own computer, so the page calls it straight from the browser.
// The hosted Next.js server cannot: 127.0.0.1 there is the hosting machine, not the user's.
// 127.0.0.1 is used instead of localhost because browsers let an https page call it over plain http.
//
// Safari is the exception: it blocks every plain-http call from an https page, 127.0.0.1 included.
// There the page opens the backend's own /bridge page in a small window (opening an http window is
// allowed) and hands its calls to that window with postMessage. The window makes them and posts the answers back.
export const FRAUD_BACKEND = (process.env.NEXT_PUBLIC_FRAUD_API_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");
const BACKEND_ORIGIN = new URL(FRAUD_BACKEND).origin;

export const BACKEND_DOWN =
  "Could not reach the fraud backend on this computer. Start it with: .venv/bin/python -m src.api " +
  "(and allow this site to reach your local network if the browser asks).";
export const BRIDGE_NEEDED =
  "Safari does not let this site reach the fraud backend on this computer directly. Start the backend " +
  "(.venv/bin/python -m src.api), press Connect to backend, and keep the small window that opens.";

const down = (message: string) => Response.json({ error: { code: "BACKEND_DOWN", message } }, { status: 503 });

/** True in Safari on the hosted (https) dashboard, where the backend can only be reached through the bridge window. */
export function needsBridge(): boolean {
  return typeof window !== "undefined" && window.location.protocol === "https:" && FRAUD_BACKEND.startsWith("http:")
    && /^((?!chrome|chromium|android|crios|fxios|edg).)*safari/i.test(navigator.userAgent);
}

let bridge: Window | null = null;
let nextId = 0;
const answers = new Map<number, (response: Response) => void>();
const readyWaiters = new Set<() => void>();

if (typeof window !== "undefined") {
  window.addEventListener("message", (event) => {
    if (event.origin !== BACKEND_ORIGIN || !event.data) return;
    if (event.data.fraudBridge === "ready") {
      //the bridge window announces itself over and over, so a reloaded dashboard finds it again.
      bridge = event.source as Window;
      readyWaiters.forEach((done) => done());
      readyWaiters.clear();
    } else if (event.data.fraudBridge === "response") {
      const { id, status, text } = event.data;
      answers.get(id)?.(new Response([204, 205, 304].includes(status) ? null : text, {
        status, headers: { "Content-Type": "application/json" },
      }));
      answers.delete(id);
    }
  });
}

const bridgeOpen = () => bridge !== null && !bridge.closed;

function bridgeReady(timeout: number): Promise<boolean> {
  if (bridgeOpen()) return Promise.resolve(true);
  return new Promise((resolve) => {
    const done = () => { clearTimeout(timer); resolve(true); };
    const timer = setTimeout(() => { readyWaiters.delete(done); resolve(false); }, timeout);
    readyWaiters.add(done);
  });
}

/** Open the bridge window. Call it straight from a click, or Safari blocks the window. False when it did not come up. */
export function connectBridge(): Promise<boolean> {
  if (bridgeOpen()) return Promise.resolve(true);
  const opened = window.open(`${FRAUD_BACKEND}/bridge`, "fraudBridge", "popup,width=460,height=240");
  if (!opened) return Promise.resolve(false);
  return bridgeReady(8000).then((ok) => {
    if (!ok) opened.close();
    return ok;
  });
}

function viaBridge(method: string, path: string, body?: BodyInit): Promise<Response> {
  return new Promise((resolve) => {
    const id = ++nextId;
    const timer = setTimeout(() => { answers.delete(id); resolve(down(BRIDGE_NEEDED)); }, 120000);
    answers.set(id, (response) => { clearTimeout(timer); resolve(response); });
    try {
      bridge!.postMessage({ fraudBridge: "request", id, method, path, body }, BACKEND_ORIGIN);
    } catch {
      clearTimeout(timer);
      answers.delete(id);
      resolve(down(BRIDGE_NEEDED));
    }
  });
}

/** Call the local fraud backend. Always resolves: when it cannot be reached the answer is a 503 in the usual error shape. */
export async function fraudBackend(method: string, path: string, body?: BodyInit): Promise<Response> {
  if (bridgeOpen()) return viaBridge(method, path, body);
  try {
    return await fetch(`${FRAUD_BACKEND}${path}`, {
      method, body, cache: "no-store",
      headers: typeof body === "string" ? { "Content-Type": "application/json" } : undefined,
    });
  } catch {
    if (!needsBridge()) return down(BACKEND_DOWN);
    //a bridge window left open from before a reload announces itself within a second or two.
    return (await bridgeReady(2000)) ? viaBridge(method, path, body) : down(BRIDGE_NEEDED);
  }
}
