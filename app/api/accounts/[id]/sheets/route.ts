import { fraudApi, myProfile } from "@/lib/server/backend";
import { fail } from "@/lib/server/http";

type Context = { params: Promise<{ id: string }> };

const MAX_BYTES = 5 * 1024 * 1024;

async function ownedAccount(id: string) {
  const mine = await myProfile();
  if ("failure" in mine) return mine;
  if (!mine.profile.accounts.some((account) => account.account_id === id)) {
    return { failure: fail(404, "NOT_FOUND", "That account does not exist in your profile.") };
  }
  return { profileId: mine.profile.profile_id };
}

function sheetName(request: Request) {
  return new URL(request.url).searchParams.get("name")?.trim() ?? "";
}

function feedbackPolicy(request: Request) {
  const value = new URL(request.url).searchParams.get("feedback_policy");
  return value === "keep" || value === "discard" ? value : null;
}

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  const name = sheetName(request);
  if (!name) return fail(400, "INVALID_REQUEST", "The file needs a name.");
  const content = await request.arrayBuffer();
  if (content.byteLength > MAX_BYTES) return fail(400, "INVALID_REQUEST", "The file is larger than 5 MB.");

  const owned = await ownedAccount(id);
  if ("failure" in owned) return owned.failure;
  const policy = feedbackPolicy(request);
  const query = policy ? `?feedback_policy=${policy}` : "";
  return fraudApi("PUT", `/sheets/${owned.profileId}/${encodeURIComponent(id)}/${encodeURIComponent(name)}${query}`, content);
}

export async function DELETE(request: Request, { params }: Context) {
  const { id } = await params;
  const name = sheetName(request);
  if (!name) return fail(400, "INVALID_REQUEST", "The file needs a name.");

  const owned = await ownedAccount(id);
  if ("failure" in owned) return owned.failure;
  return fraudApi("DELETE", `/sheets/${owned.profileId}/${encodeURIComponent(id)}/${encodeURIComponent(name)}`);
}
