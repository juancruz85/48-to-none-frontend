import { profileApi } from "@/lib/server/backend";
import { fields } from "@/lib/server/http";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const { id } = await params;
  const { name } = await fields(request, "name");
  return profileApi("PATCH", `/profiles/me/tags/${encodeURIComponent(id)}`, { name });
}

export async function DELETE(_request: Request, { params }: Context) {
  const { id } = await params;
  return profileApi("DELETE", `/profiles/me/tags/${encodeURIComponent(id)}`);
}
