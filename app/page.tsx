"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Report, Session, SheetReport } from "@/lib/types";
import StatCard from "@/components/StatCard";
import SpendChart from "@/components/SpendChart";
import TransactionsTable, { FraudTable, PatternsTable } from "@/components/TransactionsTable";
import AccountsPanel from "@/components/AccountsPanel";

const money = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const SHEET_STATUS: Record<SheetReport["status"], string> = {
  checking: "being checked",
  done: "checked",
  failed: "failed",
  needs_fixing: "needs fixing",
};

export default function Dashboard() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [profileError, setProfileError] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [reportError, setReportError] = useState("");
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState("");
  const signedIn = useRef(false);

  const loadSession = useCallback(async () => {
    try {
      const res = await fetch("/api/profile", { cache: "no-store" });
      if (res.status === 401) {
        router.replace("/login");
        return false;
      }
      const body = await res.json();
      if (!res.ok) {
        setProfileError(body?.error?.message ?? "Could not load your profile.");
        return true;
      }
      setProfileError("");
      setSession(body);
    } catch {
      setProfileError("Could not load your profile.");
    }
    return true;
  }, [router]);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/report", { cache: "no-store" });
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      const body = await res.json();
      if (!res.ok) {
        setReportError(body?.error?.message ?? "Could not load the fraud report.");
        return;
      }
      setReportError("");
      setReport(body);
    } catch {
      setReportError("Could not load the fraud report.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadSession().then((ok) => {
      signedIn.current = ok;
      if (ok) loadReport();
    });
  }, [loadSession, loadReport]);

  const waiting = !report || report.busy || reportError !== "";
  useEffect(() => {
    const timer = setInterval(() => {
      if (signedIn.current) loadReport();
    }, waiting ? 4000 : 30000);
    return () => clearInterval(timer);
  }, [waiting, loadReport]);

  const signOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  };

  const profile = session?.profile;
  const sheets = report?.sheets ?? [];
  const sheet = sheets.find((s) => s.sheet_id === picked) ?? sheets[0];
  const label = (s: SheetReport) => {
    const account = profile?.accounts.find((a) => a.account_id === s.account_id);
    return account ? `${account.name} / ${s.name}` : s.name;
  };
  const totals = sheet?.totals;
  const unchecked = totals ? totals.irregular - totals.sent_to_model : 0;

  let status = "Loading…";
  if (reportError) status = reportError;
  else if (report?.gave_up) status = "The backend stopped after an error it could not fix";
  else if (report?.state === "starting") status = "Loading the AI model…";
  else if (report && sheets.length === 0) status = "No files uploaded yet";
  else if (report?.busy) status = "The AI is checking purchases…";
  else if (report) status = `${sheets.length} sheet${sheets.length === 1 ? "" : "s"} checked, updated ${report.generated_at.slice(11)}`;

  return (
    <div className="desktop">
      <main className="window">
        <header className="titlebar">
          <div className="lights" aria-hidden>
            <span className="light close" />
            <span className="light minimize" />
            <span className="light zoom" />
          </div>
          <h1 className="title">
            <span className={`statusDot ${loading || report?.busy ? "busy" : ""}`} aria-hidden />
            Fraud Detection Dashboard
          </h1>
        </header>

        <div className="toolbar">
          <label className="filter">
            Sheet
            <select value={sheet?.sheet_id ?? ""} onChange={(e) => setPicked(e.target.value)} disabled={sheets.length === 0}>
              {sheets.length === 0 && <option value="">No sheets</option>}
              {sheets.map((s) => (
                <option key={s.sheet_id} value={s.sheet_id}>
                  {label(s)} ({s.status === "done" ? `${s.totals.fraud} flagged, ${s.totals.suspicious} suspicious` : SHEET_STATUS[s.status]})
                </option>
              ))}
            </select>
          </label>
          <div className="toolbarActions">
            {session?.email && <span className="who">{session.email}</span>}
            <button className="aquaButton" onClick={loadReport} disabled={loading}>
              {loading ? "Loading…" : "Refresh"}
            </button>
            <button className="aquaButton" onClick={signOut}>Sign Out</button>
          </div>
        </div>

        <div className="content">
          {reportError && <p className="notice error" role="alert">{reportError}</p>}
          {report?.gave_up && (
            <p className="notice error" role="alert">
              The backend hit an error it could not fix and stopped checking. Restart it to try again.
              {report.last_error ? ` Last error: ${report.last_error}` : ""}
            </p>
          )}
          {report && !report.gave_up && report.busy && (
            <p className="notice" role="status">
              {report.state === "starting" || report.state === "waiting"
                ? "The backend is starting and loading the AI model. Results appear here as each file is checked."
                : "The AI is still checking purchases. Results appear here as each file is finished."}
            </p>
          )}
          {profileError ? (
            <p className="notice error" role="alert">{profileError}</p>
          ) : !profile ? (
            <p className="notice" role="status">Loading your profile…</p>
          ) : (
            <AccountsPanel
              profile={profile}
              sheets={sheets}
              onChanged={async () => { await Promise.all([loadSession(), loadReport()]); }}
              onView={setPicked}
            />
          )}

          {report && sheets.length === 0 && !reportError && (
            <p className="notice" role="status">
              Nothing to check yet. Add an account above and upload a CSV of its purchases.
            </p>
          )}

          {sheet && totals && (
            <>
              {sheet.status === "failed" && (
                <p className="notice error" role="alert">
                  {label(sheet)} could not be checked{sheet.stuck ? " (the AI got stuck on it)" : ""}: {sheet.error ?? "unknown error"}
                </p>
              )}
              {sheet.status === "needs_fixing" && (
                <div className="notice error" role="alert">
                  {label(sheet)} was not checked. Fix the data first:
                  <ul>{sheet.vet.map((problem) => <li key={problem}>{problem}</li>)}</ul>
                </div>
              )}
              {sheet.status === "checking" && (
                <p className="notice" role="status">{label(sheet)} is still being checked, so nothing is flagged yet.</p>
              )}
              {unchecked > 0 && (
                <p className="notice" role="status">
                  {totals.irregular} purchases looked irregular. Only the {totals.sent_to_model} strongest were sent to the AI;
                  the other {unchecked} were not checked.
                </p>
              )}

              <div className="grid">
                <StatCard label="Transactions" value={totals.transactions.toString()} />
                <StatCard label="Looked irregular" value={totals.irregular.toString()} />
                <StatCard label="Possible fraud" value={totals.fraud.toString()} tone="danger" />
                <StatCard label="Amount at risk" value={money(totals.at_risk)} tone="danger" />
                <StatCard label="Suspicious" value={totals.suspicious.toString()} tone="warn" />
                <StatCard label="Suspicious amount" value={money(totals.suspicious_amount)} tone="warn" />
                <StatCard label="Total spent" value={money(totals.spent)} tone="ok" />
              </div>

              <PatternsTable patterns={sheet.patterns} />
              <FraudTable data={sheet.transactions} />
              <SpendChart data={sheet.transactions} />
              <TransactionsTable data={sheet.transactions} />

              {sheet.analysis && (
                <details className="panel">
                  <summary className="panelTitle">Spending analysis</summary>
                  <pre className="analysis">{sheet.analysis}</pre>
                </details>
              )}
            </>
          )}
        </div>

        <footer className="statusbar" aria-live="polite">
          {status}
        </footer>
      </main>

      <p className="credit">&copy; 2026 48 to None</p>
    </div>
  );
}
