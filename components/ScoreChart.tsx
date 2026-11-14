import { Txn, THRESHOLD } from "@/lib/types";

// Dependency-free SVG bar chart: fraud score per transaction (oldest -> newest)
export default function ScoreChart({ data }: { data: Txn[] }) {
  const items = [...data].reverse().slice(-40);
  const w = 800, h = 180, bw = w / Math.max(items.length, 1);
  return (
    <div className="card">
      <h2>Fraud score by transaction</h2>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img" aria-label="Fraud score chart">
        <line x1="0" x2={w} y1={h - THRESHOLD * h} y2={h - THRESHOLD * h} stroke="var(--danger)" strokeDasharray="4 4" />
        {items.map((t, i) => (
          <rect key={t.id} x={i * bw + 1} y={h - t.score * h} width={Math.max(bw - 2, 1)} height={t.score * h}
            fill={t.score >= THRESHOLD ? "var(--danger)" : "var(--accent)"} rx="2" />
        ))}
      </svg>
    </div>
  );
}
