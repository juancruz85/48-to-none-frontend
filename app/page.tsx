"use client";

import { useCallback, useEffect, useState } from "react";
import { Txn, THRESHOLD } from "@/lib/types";
import StatCard from "@/components/StatCard";
import ScoreChart from "@/components/ScoreChart";
import TransactionsTable from "@/components/TransactionsTable";

export default function Dashboard() {
  const [data, setData] = useState<Txn[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/transactions", { cache: "no-store" });
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const flagged = data.filter((t) => t.score >= THRESHOLD);
  const total = data.reduce((s, t) => s + t.amount, 0);
  const flaggedAmt = flagged.reduce((s, t) => s + t.amount, 0);

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
            <span className={`statusDot ${loading ? "busy" : ""}`} aria-hidden />
            Fraud Detection Dashboard
          </h1>
        </header>

        <div className="toolbar">
          <span>Flagging scores at or above {THRESHOLD.toFixed(2)}</span>
          <button className="aquaButton" onClick={load} disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>

        <div className="content">
          <div className="grid">
            <StatCard label="Transactions" value={data.length.toString()} />
            <StatCard label="Flagged" value={flagged.length.toString()} tone="danger" />
            <StatCard label="Flag rate" value={data.length ? `${((flagged.length / data.length) * 100).toFixed(1)}%` : "–"} />
            <StatCard label="Amount at risk" value={`$${flaggedAmt.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} tone="danger" />
            <StatCard label="Total volume" value={`$${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} tone="ok" />
          </div>
          <ScoreChart data={data} />
          <TransactionsTable data={data} />
        </div>

        <footer className="statusbar" aria-live="polite">
          {loading ? "Loading…" : `${data.length} transactions, ${flagged.length} flagged`}
        </footer>
      </main>

      <p className="credit">&copy; 2026 48 to None</p>
    </div>
  );
}
