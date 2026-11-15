import { cookies } from "next/headers";
import { AuthResult, refresh } from "./cognito";

const ACCESS = "ftn_access";
const REFRESH = "ftn_refresh";
const EMAIL = "ftn_email";
const REFRESH_MAX_AGE = 60 * 60 * 24 * 30;

const base = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export async function setSession(tokens: AuthResult, email?: string) {
  const jar = await cookies();
  jar.set(ACCESS, tokens.AccessToken, { ...base, maxAge: Math.max(tokens.ExpiresIn - 60, 60) });
  if (tokens.RefreshToken) jar.set(REFRESH, tokens.RefreshToken, { ...base, maxAge: REFRESH_MAX_AGE });
  if (email) jar.set(EMAIL, email, { ...base, maxAge: REFRESH_MAX_AGE });
}

export async function clearSession() {
  const jar = await cookies();
  const refreshToken = jar.get(REFRESH)?.value;
  jar.delete(ACCESS);
  jar.delete(REFRESH);
  jar.delete(EMAIL);
  return refreshToken;
}

export async function sessionEmail() {
  return (await cookies()).get(EMAIL)?.value ?? null;
}

export async function accessToken(): Promise<string | null> {
  const jar = await cookies();
  const current = jar.get(ACCESS)?.value;
  if (current) return current;

  const refreshToken = jar.get(REFRESH)?.value;
  if (!refreshToken) return null;
  try {
    const tokens = await refresh(refreshToken);
    await setSession(tokens);
    return tokens.AccessToken;
  } catch {
    await clearSession();
    return null;
  }
}
