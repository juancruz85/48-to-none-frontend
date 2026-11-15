import { resendCode } from "@/lib/server/cognito";
import { cognitoFailure, fail, fields } from "@/lib/server/http";

export async function POST(request: Request) {
  const { email } = await fields(request, "email");
  if (!email) return fail(400, "INVALID_REQUEST", "Email is required.");
  try {
    await resendCode(email);
    return Response.json({ ok: true });
  } catch (error) {
    return cognitoFailure(error);
  }
}
