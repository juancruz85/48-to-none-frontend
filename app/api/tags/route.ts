import { profileApi } from "@/lib/server/backend";
import { fields } from "@/lib/server/http";

export async function POST(request: Request) {
  const { name } = await fields(request, "name");
  return profileApi("POST", "/profiles/me/tags", { name });
}
