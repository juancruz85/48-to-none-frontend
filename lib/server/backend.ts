import { Profile } from "@/lib/types";
import { fail } from "./http";
import { accessToken } from "./session";

const profileUrl = () => process.env.PROFILE_API_URL?.replace(/\/+$/, "");

async function callProfileApi(token: string, method: string, path: string, body?: unknown) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${profileUrl()}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
    if (res.status !== 429 || attempt === 3) return res;
    await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
  }
}

type Signed = { token: string } | { failure: Response };

async function signedIn(): Promise<Signed> {
  if (!profileUrl()) return { failure: fail(500, "NOT_CONFIGURED", "PROFILE_API_URL must be set in .env.local.") };
  const token = await accessToken();
  if (!token) return { failure: fail(401, "UNAUTHENTICATED", "Sign in to continue.") };
  return { token };
}

export async function profileApi(method: string, path: string, body?: unknown): Promise<Response> {
  const user = await signedIn();
  if ("failure" in user) return user.failure;
  try {
    const res = await callProfileApi(user.token, method, path, body);
    if (res.status === 401) return fail(401, "UNAUTHENTICATED", "Sign in to continue.");
    if (res.status === 429) return fail(429, "RATE_LIMITED", "Too many requests. Try again in a moment.");
    const data = await res.json().catch(() => null);
    if (data === null) return fail(502, "PROFILE_API_ERROR", `Profile API returned ${res.status}.`);
    return Response.json(data, { status: res.status });
  } catch {
    return fail(502, "PROFILE_API_UNREACHABLE", "Could not reach the profile API.");
  }
}

export async function myProfile(): Promise<{ profile: Profile } | { failure: Response }> {
  const user = await signedIn();
  if ("failure" in user) return user;
  try {
    let res = await callProfileApi(user.token, "GET", "/profiles/me");
    if (res.status === 404) {
      res = await callProfileApi(user.token, "POST", "/profiles");
      if (res.status === 409) res = await callProfileApi(user.token, "GET", "/profiles/me");
    }
    if (res.status === 401) return { failure: fail(401, "UNAUTHENTICATED", "Sign in to continue.") };
    if (res.status === 429) return { failure: fail(429, "RATE_LIMITED", "Too many requests. Try again in a moment.") };
    if (!res.ok) return { failure: fail(502, "PROFILE_API_ERROR", `Profile API returned ${res.status}.`) };
    return { profile: (await res.json()) as Profile };
  } catch {
    return { failure: fail(502, "PROFILE_API_UNREACHABLE", "Could not reach the profile API.") };
  }
}
