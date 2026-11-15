
export class CognitoError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

export type AuthResult = {
  AccessToken: string;
  IdToken?: string;
  RefreshToken?: string;
  ExpiresIn: number;
};

function config() {
  const region = process.env.COGNITO_REGION;
  const clientId = process.env.COGNITO_CLIENT_ID;
  if (!region || !clientId) {
    throw new CognitoError("NOT_CONFIGURED", "COGNITO_REGION and COGNITO_CLIENT_ID must be set in .env.local.");
  }
  return { region, clientId };
}

async function call<T>(target: string, body: Record<string, unknown>): Promise<T> {
  const { region } = config();
  const res = await fetch(`https://cognito-idp.${region}.amazonaws.com/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-amz-json-1.1",
      "X-Amz-Target": `AWSCognitoIdentityProviderService.${target}`,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const code = String(data.__type ?? "UnknownError").split("#").pop() as string;
    throw new CognitoError(code, data.message ?? "Sign-in service error.");
  }
  return data as T;
}

export async function signUp(email: string, password: string) {
  const out = await call<{ UserConfirmed: boolean }>("SignUp", {
    ClientId: config().clientId,
    Username: email,
    Password: password,
    UserAttributes: [{ Name: "email", Value: email }],
  });
  return { confirmed: out.UserConfirmed };
}

export function confirmSignUp(email: string, code: string) {
  return call("ConfirmSignUp", { ClientId: config().clientId, Username: email, ConfirmationCode: code });
}

export function resendCode(email: string) {
  return call("ResendConfirmationCode", { ClientId: config().clientId, Username: email });
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const out = await call<{ AuthenticationResult?: AuthResult }>("InitiateAuth", {
    ClientId: config().clientId,
    AuthFlow: "USER_PASSWORD_AUTH",
    AuthParameters: { USERNAME: email, PASSWORD: password },
  });
  if (!out.AuthenticationResult) {
    throw new CognitoError("ChallengeNotSupported", "This account needs an extra sign-in step that the app does not support yet.");
  }
  return out.AuthenticationResult;
}

export async function refresh(refreshToken: string): Promise<AuthResult> {
  const out = await call<{ AuthenticationResult?: AuthResult }>("InitiateAuth", {
    ClientId: config().clientId,
    AuthFlow: "REFRESH_TOKEN_AUTH",
    AuthParameters: { REFRESH_TOKEN: refreshToken },
  });
  if (!out.AuthenticationResult) throw new CognitoError("NotAuthorizedException", "Session expired.");
  return out.AuthenticationResult;
}

export function revoke(refreshToken: string) {
  return call("RevokeToken", { ClientId: config().clientId, Token: refreshToken });
}
