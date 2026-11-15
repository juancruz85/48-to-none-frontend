"use client";

import { useState } from "react";
import { FeedbackLabel, LocalFeedbackRecord, Pattern, Txn, TxnStatus } from "@/lib/types";

const LABEL: Record<TxnStatus, string> = { fraud: "Possible fraud", suspicious: "Suspicious", cleared: "Cleared by AI", ok: "OK" };
const BADGE: Record<TxnStatus, string> = { fraud: "high", suspicious: "mid", cleared: "info", ok: "low" };
const RANK: Record<TxnStatus, number> = { fraud: 0, suspicious: 1, cleared: 2, ok: 3 };

const amount = (n: number | null) =>
  n === null ? "–" : `${n < 0 ? "+" : ""}$${Math.abs(n).toFixed(2)}`;

export function FraudTable({ data }: { data: Txn[] }) {
  const flagged = data.filter((t) => t.status === "fraud");
  return (
    <section className="panel">
      <h2 className="panelTitle">Possible fraud ({flagged.length})</h2>
      {flagged.length === 0 ? (
        <p className="empty">Nothing flagged in this sheet.</p>
      ) : (
        <div className="tableScroll">
          <table>
            <thead>
              <tr><th>Date</th><th>Purchase</th><th className="num">Amount</th><th>Why the AI flagged it</th><th>What looked irregular</th></tr>
            </thead>
            <tbody>
              {flagged.map((t) => (
                <tr key={t.row}>
                  <td className="nowrap">{t.date ?? "–"}</td>
                  <td>{t.item}</td>
                  <td className="num">{amount(t.amount)}</td>
                  <td className="wrap">{t.reason || "No reason given"}</td>
                  <td className="wrap">{t.signals.join("; ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function PatternsTable({ patterns }: { patterns: Pattern[] }) {
  const suspicious = patterns.filter((p) => p.suspicious);
  if (suspicious.length === 0) return null;
  return (
    <section className="panel">
      <h2 className="panelTitle">Suspicious patterns ({suspicious.length})</h2>
      <div className="tableScroll">
        <table>
          <thead>
            <tr><th>Seller</th><th className="num">Charges</th><th className="num">Total</th><th>Charges per month</th><th>Why the AI says to take a look</th></tr>
          </thead>
          <tbody>
            {suspicious.map((p) => (
              <tr key={p.item}>
                <td>{p.item}</td>
                <td className="num">{p.charges}</td>
                <td className="num">${p.total.toFixed(2)}</td>
                <td className="wrap">{p.months.map((m) => `${m.month.slice(2)}: ${m.charges}`).join(", ")}</td>
                <td className="wrap">{p.reason || "No reason given"}. Rising since {p.rising_since}: {p.rising_charges} charges, ${p.rising_total.toFixed(2)}.</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

type Props = {
  data: Txn[];
  uploadVersion?: string | null;
  feedback?: LocalFeedbackRecord[];
  manualLabeling?: boolean;
  labelsDisabled?: boolean;
  onLabel?: (row: number, label: FeedbackLabel) => void;
};

export default function TransactionsTable({ data, uploadVersion, feedback = [], manualLabeling = false, labelsDisabled = false, onLabel }: Props) {
  const [show, setShow] = useState<"all" | TxnStatus>("all");
  const rows = data
    .filter((t) => show === "all" || t.status === show)
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "") || RANK[a.status] - RANK[b.status]);
  const count = (status: TxnStatus) => data.filter((t) => t.status === status).length;

  return (
    <section className="panel">
      <h2 className="panelTitle panelTitleRow">
        <span>All transactions ({rows.length})</span>
        <label className="filter">
          Show
          <select value={show} onChange={(e) => setShow(e.target.value as "all" | TxnStatus)}>
            <option value="all">All ({data.length})</option>
            <option value="fraud">Possible fraud ({count("fraud")})</option>
            <option value="suspicious">Suspicious ({count("suspicious")})</option>
            <option value="cleared">Cleared by AI ({count("cleared")})</option>
            <option value="ok">OK ({count("ok")})</option>
          </select>
        </label>
      </h2>
      {rows.length === 0 ? (
        <p className="empty">No transactions to show.</p>
      ) : (
        <div className="tableScroll tall">
          <table>
            <thead>
              <tr><th>Date</th><th>Purchase</th><th>Type</th><th className="num">Amount</th><th>Status</th><th>Your label</th></tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.row}>
                  <td className="nowrap">{t.date ?? "–"}</td>
                  <td>{t.item}</td>
                  <td>{t.type}</td>
                  <td className="num">{amount(t.amount)}</td>
                  <td>
                    <div className="statusBadges">
                      <span className={`badge ${BADGE[t.status]}`}>{LABEL[t.status]}</span>
                      {(() => {
                        const item = feedback.find((entry) => entry.row === t.row && entry.upload_version === uploadVersion);
                        if (!item?.synced_label) return null;
                        return <span className={`badge ${item.synced_label === "fraud" ? "high" : "low"}`}>User: {item.synced_label === "fraud" ? "Fraud" : "Not fraud"}</span>;
                      })()}
                    </div>
                  </td>
                  <td>
                    {(() => {
                      const saved = feedback.find((item) => item.row === t.row && item.upload_version === uploadVersion);
                      const canLabel = manualLabeling || t.status === "fraud" || t.status === "suspicious";
                      if (!uploadVersion || !onLabel || !canLabel) return saved ? (saved.label === "fraud" ? "Fraud" : "Not fraud") : "–";
                      return (
                        <div className="feedbackButtons">
                          <button type="button" disabled={labelsDisabled} className={saved?.label === "fraud" ? "selected" : ""} aria-pressed={saved?.label === "fraud"} onClick={() => onLabel(t.row, "fraud")}>Fraud</button>
                          <button type="button" disabled={labelsDisabled} className={saved?.label === "not_fraud" ? "selected" : ""} aria-pressed={saved?.label === "not_fraud"} onClick={() => onLabel(t.row, "not_fraud")}>Not fraud</button>
                        </div>
                      );
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
