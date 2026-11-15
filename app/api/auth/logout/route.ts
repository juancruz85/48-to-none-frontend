import { revoke } from "@/lib/server/cognito";
import { clearSession } from "@/lib/server/session";

export async function POST() {
  const refreshToken = await clearSession();
  if (refreshToken) await revoke(refreshToken).catch(() => {});
  return Response.json({ ok: true });
}
