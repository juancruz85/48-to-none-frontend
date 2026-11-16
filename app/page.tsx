"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FeedbackLabel, FeedbackRecord, LocalFeedbackRecord, Report, Session, SheetReport } from "@/lib/types";
import StatCard from "@/components/StatCard";
import SpendChart from "@/components/SpendChart";
import SpendingAnalysis from "@/components/SpendingAnalysis";
import TransactionsTable, { FraudTable, PatternsTable } from "@/components/TransactionsTable";
import AccountsPanel from "@/components/AccountsPanel";
import { api } from "@/lib/basePath";
import { connectBridge, fraudBackend, needsBridge } from "@/lib/fraudBackend";

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
  const [feedback, setFeedback] = useState<LocalFeedbackRecord[]>([]);
  const [manualLabeling, setManualLabeling] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState("");
  const signedIn = useRef(false);
  const profileId = useRef("");

  const loadSession = useCallback(async () => {
    try {
      const res = await fetch(api("/api/profile"), { cache: "no-store" });
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
      profileId.current = body.profile.profile_id;
      setSession(body);
    } catch {
      setProfileError("Could not load your profile.");
    }
    return true;
  }, [router]);

  const loadReport = useCallback(async () => {
    //the report comes from the backend on the user's own computer, and it needs to know whose sheets to show.
    if (!profileId.current) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fraudBackend("GET", `/report?profile=${encodeURIComponent(profileId.current)}`);
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
  }, []);

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
    await fetch(api("/api/auth/logout"), { method: "POST" });
    router.replace("/login");
  };

  const profile = session?.profile;
  const myId = profile?.profile_id ?? "";
  const feedbackStorageKey = myId ? `48-to-none:feedback:${myId}` : "";
  useEffect(() => {
    if (!feedbackStorageKey) return;
    try {
      const cached = JSON.parse(localStorage.getItem(feedbackStorageKey) ?? "[]") as LocalFeedbackRecord[];
      setFeedback(cached);
      fraudBackend("GET", `/feedback?profile=${encodeURIComponent(myId)}`).then(async (res) => {
        if (!res.ok) throw new Error();
        const body = await res.json();
        const server = (body.feedback ?? []) as FeedbackRecord[];
        const merged = new Map<string, LocalFeedbackRecord>();
        for (const item of server) merged.set(`${item.sheet_id}:${item.upload_version}:${item.row}`, { ...item, synced_label: item.label });
        for (const item of cached) {
          const key = `${item.sheet_id}:${item.upload_version}:${item.row}`;
          if (item.pending || !merged.has(key)) merged.set(key, { ...item, synced_label: item.synced_label ?? (!item.pending ? item.label : undefined) });
        }
        const result = [...merged.values()];
        setFeedback(result);
        localStorage.setItem(feedbackStorageKey, JSON.stringify(result));
        setFeedbackNotice("");
      }).catch(() => setFeedbackNotice("Could not load saved labels from the system. Press Refresh to retry."));
    } catch {
      setFeedback([]);
    }
  }, [feedbackStorageKey, myId]);

  const saveLabel = (sheet: SheetReport, row: number, label: FeedbackLabel) => {
    if (!profile || !sheet.account_id || !sheet.upload_version) return;
    const key = `${sheet.sheet_id}:${sheet.upload_version}:${row}`;
    const previous = feedback.find((item) => `${item.sheet_id}:${item.upload_version}:${item.row}` === key);
    const record: LocalFeedbackRecord = {
      profile_id: profile.profile_id, account_id: sheet.account_id, sheet_id: sheet.sheet_id,
      upload_version: sheet.upload_version, row, label, updated_at: new Date().toISOString(), pending: true,
      synced_label: previous?.synced_label ?? (!previous?.pending ? previous?.label : undefined),
    };
    const next = [...feedback.filter((item) => `${item.sheet_id}:${item.upload_version}:${item.row}` !== key), record];
    setFeedback(next);
    localStorage.setItem(feedbackStorageKey, JSON.stringify(next));
    setFeedbackNotice("Label saved in this browser. Press Refresh to send it to the system.");
  };

  const refreshDashboard = async () => {
    if (!profile || !feedbackStorageKey) return loadReport();
    setLoading(true);
    setFeedbackNotice("");
    let queued: LocalFeedbackRecord[] = feedback;
    try { queued = JSON.parse(localStorage.getItem(feedbackStorageKey) ?? "[]") as LocalFeedbackRecord[]; } catch { /* use current state */ }
    let failed = false;
    for (const item of queued.filter((record) => record.pending)) {
      try {
        const { pending: _pending, synced_label: _synced, ...payload } = item;
        const res = await fraudBackend("POST", "/feedback", JSON.stringify(payload));
        if (res.ok) {
          item.pending = false;
          item.synced_label = item.label;
        } else failed = true;
      } catch { failed = true; }
    }
    setFeedback(queued);
    localStorage.setItem(feedbackStorageKey, JSON.stringify(queued));
    if (failed) setFeedbackNotice("Some labels could not sync and remain queued. Press Refresh to retry.");
    await loadReport();
  };

  const connectToBackend = async () => {
    //safari only: opens the backend's helper window. window.open has to run inside the click itself.
    if (await connectBridge()) return refreshDashboard();
    setReportError("The helper window did not connect. Check that the backend is running and that Safari allows pop-ups for this site, then press Connect to backend again.");
  };

  const sheets = report?.sheets ?? [];
  const sheet =
    sheets.find((s) => s.sheet_id === picked)
    ?? sheets.find((s) => s.name.toLowerCase() === "evildata.csv")
    ?? sheets[0];
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
          <div className="lights">
            <a className="light close" href="https://lafluke.com" aria-label="Close and go to lafluke.com" title="Back to lafluke.com" />
            <span className="light minimize" aria-hidden />
            <span className="light zoom" aria-hidden />
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
            <label className="filter"><input type="checkbox" checked={manualLabeling} onChange={(e) => setManualLabeling(e.target.checked)} /> Label all transactions</label>
            {session?.email && <span className="who">{session.email}</span>}
            <button className="aquaButton" onClick={refreshDashboard} disabled={loading}>
              {loading ? "Loading…" : "Refresh"}
            </button>
            <button className="aquaButton" onClick={signOut}>Sign Out</button>
          </div>
        </div>

        <div className="content">
          {feedbackNotice && <p className="notice" role="status">{feedbackNotice}</p>}
          {reportError && (
            <p className="notice error" role="alert">
              {reportError}
              {needsBridge() && (
                <>
                  {" "}
                  <button className="aquaButton" onClick={connectToBackend}>Connect to backend</button>
                </>
              )}
            </p>
          )}
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
              <TransactionsTable data={sheet.transactions} uploadVersion={sheet.upload_version} feedback={feedback.filter((item) => item.sheet_id === sheet.sheet_id)} manualLabeling={manualLabeling} labelsDisabled={loading} onLabel={(row, value) => saveLabel(sheet, row, value)} />

              <SpendingAnalysis data={sheet.transactions} />
            </>
          )}
        </div>

        <footer className="statusbar" aria-live="polite">
          {status}
        </footer>
      </main>

      <p className="credit">48toNone</p>
    </div>
  );
}
