import { signUp } from "@/lib/server/cognito";
import { cognitoFailure, fail, fields } from "@/lib/server/http";

export async function POST(request: Request) {
  const { email, password } = await fields(request, "email", "password");
  if (!email || !password) return fail(400, "INVALID_REQUEST", "Email and password are required.");
  try {
    const { confirmed } = await signUp(email, password);
    return Response.json({ needsConfirmation: !confirmed });
  } catch (error) {
    return cognitoFailure(error);
  }
}
