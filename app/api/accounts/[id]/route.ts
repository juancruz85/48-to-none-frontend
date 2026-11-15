import { fraudApi, myProfileId, profileApi } from "@/lib/server/backend";
import { fail, fields } from "@/lib/server/http";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const { id } = await params;
  const { name, tag_id } = await fields(request, "name", "tag_id");
  const change: Record<string, string> = {};
  if (name) change.name = name;
  if (tag_id) change.tag_id = tag_id;
  if (Object.keys(change).length === 0) return fail(400, "INVALID_REQUEST", "Send a name, a tag, or both.");
  return profileApi("PATCH", `/profiles/me/accounts/${encodeURIComponent(id)}`, change);
}

export async function DELETE(_request: Request, { params }: Context) {
  const { id } = await params;
  const mine = await myProfileId();
  if ("failure" in mine) return mine.failure;
  const deleted = await profileApi("DELETE", `/profiles/me/accounts/${encodeURIComponent(id)}`);
  if (!deleted.ok) return deleted;
  const sheets = await fraudApi("DELETE", `/sheets/${mine.profileId}/${encodeURIComponent(id)}`);
  if (!sheets.ok) {
    return fail(502, "SHEETS_NOT_DELETED", "The account was deleted, but its uploaded files could not be removed from the fraud backend.");
  }
  return deleted;
}
