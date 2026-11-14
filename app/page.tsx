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
    <div className="wrap">
      <header>
        <h1>Fraud Detection Dashboard</h1>
        <button onClick={load} disabled={loading}>{loading ? "Loading…" : "Refresh"}</button>
      </header>
      <div className="grid">
        <StatCard label="Transactions" value={data.length.toString()} />
        <StatCard label="Flagged" value={flagged.length.toString()} tone="danger" />
        <StatCard label="Flag rate" value={data.length ? `${((flagged.length / data.length) * 100).toFixed(1)}%` : "–"} />
        <StatCard label="Amount at risk" value={`$${flaggedAmt.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} tone="danger" />
        <StatCard label="Total volume" value={`$${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} tone="ok" />
      </div>
      <ScoreChart data={data} />
      <div style={{ height: 16 }} />
      <TransactionsTable data={data} />
    </div>
  );
}
