import { myProfile } from "@/lib/server/backend";
import { sessionEmail } from "@/lib/server/session";

export async function GET() {
  const mine = await myProfile();
  if ("failure" in mine) return mine.failure;
  return Response.json({ email: await sessionEmail(), profile: mine.profile });
}
