import { confirmSignUp } from "@/lib/server/cognito";
import { cognitoFailure, fail, fields } from "@/lib/server/http";

export async function POST(request: Request) {
  const { email, code } = await fields(request, "email", "code");
  if (!email || !code) return fail(400, "INVALID_REQUEST", "Email and code are required.");
  try {
    await confirmSignUp(email, code);
    return Response.json({ ok: true });
  } catch (error) {
    return cognitoFailure(error);
  }
}
