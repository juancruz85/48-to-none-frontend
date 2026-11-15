import { fraudApi, myProfile } from "@/lib/server/backend";
import { fail } from "@/lib/server/http";
import { FeedbackLabel } from "@/lib/types";

export async function GET(request: Request) {
  const mine = await myProfile();
  if ("failure" in mine) return mine.failure;
  const query = new URLSearchParams({ profile: mine.profile.profile_id });
  return fraudApi("GET", `/feedback?${query}`);
}

export async function POST(request: Request) {
  const mine = await myProfile();
  if ("failure" in mine) return mine.failure;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return fail(400, "INVALID_REQUEST", "A feedback label is required.");
  const { account_id, sheet_id, upload_version, row, label } = body as Record<string, unknown>;
  if (typeof account_id !== "string" || !mine.profile.accounts.some((a) => a.account_id === account_id)) {
    return fail(404, "NOT_FOUND", "That account does not exist in your profile.");
  }
  if (typeof sheet_id !== "string" || typeof upload_version !== "string" || !Number.isInteger(row) || (row as number) < 0 || !["fraud", "not_fraud"].includes(label as string)) {
    return fail(400, "INVALID_REQUEST", "The feedback label is invalid.");
  }
  return fraudApi("POST", "/feedback", JSON.stringify({
    profile_id: mine.profile.profile_id, account_id, sheet_id, upload_version,
    row, label: label as FeedbackLabel,
  }));
}
