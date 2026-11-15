import { signIn } from "@/lib/server/cognito";
import { cognitoFailure, fail, fields } from "@/lib/server/http";
import { setSession } from "@/lib/server/session";

export async function POST(request: Request) {
  const { email, password } = await fields(request, "email", "password");
  if (!email || !password) return fail(400, "INVALID_REQUEST", "Email and password are required.");
  try {
    await setSession(await signIn(email, password), email);
    return Response.json({ ok: true });
  } catch (error) {
    return cognitoFailure(error);
  }
}
