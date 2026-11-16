"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/basePath";

type Mode = "signin" | "signup" | "confirm";

async function post(path: string, body: Record<string, string>) {
  const res = await fetch(api(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, code: data?.error?.code as string | undefined, message: data?.error?.message as string | undefined, data };
}

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const switchTo = (next: Mode) => {
    setMode(next);
    setError("");
    setNotice("");
  };

  const signIn = async () => {
    const res = await post("/api/auth/login", { email, password });
    if (res.ok) {
      router.replace("/");
      return;
    }
    if (res.code === "UserNotConfirmedException") {
      switchTo("confirm");
      setNotice("Enter the code we emailed you to finish signing up.");
      return;
    }
    setError(res.message ?? "Could not sign in.");
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (mode === "signin") {
        await signIn();
      } else if (mode === "signup") {
        const res = await post("/api/auth/signup", { email, password });
        if (!res.ok) setError(res.message ?? "Could not create the account.");
        else if (res.data.needsConfirmation) {
          switchTo("confirm");
          setNotice(`We emailed a code to ${email}.`);
        } else await signIn();
      } else {
        const res = await post("/api/auth/confirm", { email, code });
        if (!res.ok) setError(res.message ?? "Could not confirm the code.");
        else if (password) await signIn();
        else {
          switchTo("signin");
          setNotice("Email confirmed. Sign in to continue.");
        }
      }
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setError("");
    const res = await post("/api/auth/resend", { email });
    if (res.ok) setNotice(`Sent a new code to ${email}.`);
    else setError(res.message ?? "Could not send a new code.");
  };

  const title = mode === "signin" ? "Sign In" : mode === "signup" ? "Create Account" : "Confirm Email";

  return (
    <div className="desktop">
      <main className="window authWindow">
        <header className="titlebar">
          <div className="lights">
            <a className="light close" href="https://lafluke.com" aria-label="Close and go to lafluke.com" title="Back to lafluke.com" />
            <span className="light minimize" aria-hidden />
            <span className="light zoom" aria-hidden />
          </div>
          <h1 className="title">{title}</h1>
        </header>

        <form className="content authForm" onSubmit={submit}>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          {mode !== "confirm" && (
            <label className="field">
              <span>Password</span>
              <input
                type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {mode === "signup" && (
                <small>At least 8 characters with an uppercase letter, a lowercase letter and a number.</small>
              )}
            </label>
          )}

          {mode === "confirm" && (
            <label className="field">
              <span>Confirmation code</span>
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </label>
          )}

          {error && <p className="formMessage error" role="alert">{error}</p>}
          {notice && <p className="formMessage" role="status">{notice}</p>}

          <div className="authActions">
            {mode === "confirm" ? (
              <button type="button" className="linkButton" onClick={resend} disabled={busy || !email}>
                Send a new code
              </button>
            ) : (
              <button type="button" className="linkButton" onClick={() => switchTo(mode === "signin" ? "signup" : "signin")}>
                {mode === "signin" ? "Create an account" : "I already have an account"}
              </button>
            )}
            <button className="aquaButton" disabled={busy}>
              {busy ? "Working…" : mode === "signin" ? "Sign In" : mode === "signup" ? "Sign Up" : "Confirm"}
            </button>
          </div>
        </form>
      </main>

      <p className="credit">48toNone</p>
    </div>
  );
}
