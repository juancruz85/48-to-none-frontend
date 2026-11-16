// The fraud backend runs on the user's own computer, so the page calls it straight from the browser.
// The hosted Next.js server cannot: 127.0.0.1 there is the hosting machine, not the user's.
// 127.0.0.1 is used instead of localhost because browsers let an https page call it over plain http.
export const FRAUD_BACKEND = (process.env.NEXT_PUBLIC_FRAUD_API_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");

export const BACKEND_DOWN =
  "Could not reach the fraud backend on this computer. Start it with: .venv/bin/python -m src.api " +
  "(and allow this site to reach your local network if the browser asks).";

/** Call the local fraud backend. Always resolves: when it cannot be reached the answer is a 503 in the usual error shape. */
export async function fraudBackend(method: string, path: string, body?: BodyInit): Promise<Response> {
  try {
    return await fetch(`${FRAUD_BACKEND}${path}`, {
      method, body, cache: "no-store",
      headers: typeof body === "string" ? { "Content-Type": "application/json" } : undefined,
    });
  } catch {
    return Response.json({ error: { code: "BACKEND_DOWN", message: BACKEND_DOWN } }, { status: 503 });
  }
}
