import { CognitoError } from "./cognito";

export function fail(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status });
}

export async function fields<K extends string>(request: Request, ...names: K[]): Promise<Record<K, string>> {
  const body = await request.json().catch(() => ({}));
  const out = {} as Record<K, string>;
  for (const name of names) {
    const value = body?.[name];
    out[name] = typeof value === "string" ? value.trim() : "";
  }
  return out;
}

const STATUS: Record<string, number> = {
  NotAuthorizedException: 401,
  UserNotFoundException: 401,
  UserNotConfirmedException: 403,
  UsernameExistsException: 409,
  InvalidPasswordException: 400,
  InvalidParameterException: 400,
  CodeMismatchException: 400,
  ExpiredCodeException: 400,
  LimitExceededException: 429,
  TooManyRequestsException: 429,
  NOT_CONFIGURED: 500,
};

export function cognitoFailure(error: unknown) {
  if (error instanceof CognitoError) {
    return fail(STATUS[error.code] ?? 502, error.code, error.message);
  }
  return fail(502, "AUTH_UNAVAILABLE", "Could not reach the sign-in service.");
}
