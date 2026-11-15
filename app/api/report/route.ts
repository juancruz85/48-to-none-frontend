import { fraudApi, myProfileId } from "@/lib/server/backend";

export async function GET() {
  const mine = await myProfileId();
  if ("failure" in mine) return mine.failure;
  return fraudApi("GET", `/report?profile=${encodeURIComponent(mine.profileId)}`);
}
