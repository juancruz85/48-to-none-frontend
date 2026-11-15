import { profileApi } from "@/lib/server/backend";
import { fields } from "@/lib/server/http";

export async function POST(request: Request) {
  const { name, tag_id } = await fields(request, "name", "tag_id");
  return profileApi("POST", "/profiles/me/accounts", tag_id ? { name, tag_id } : { name });
}
