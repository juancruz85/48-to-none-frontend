import { Txn, THRESHOLD } from "@/lib/types";

// Dependency-free SVG bar chart: fraud score per transaction (oldest -> newest)
export default function ScoreChart({ data }: { data: Txn[] }) {
  const items = [...data].reverse().slice(-40);
  const w = 800, h = 180, bw = w / Math.max(items.length, 1);
  const ty = h - THRESHOLD * h;
  return (
    <section className="panel">
      <h2 className="panelTitle">Fraud score by transaction</h2>
      <div className="panelBody">
        <svg className="chart" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Fraud score chart">
          <defs>
            {/* Aqua gel: light highlight on the left edge, deep tone on the right */}
            <linearGradient id="gelBlue" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="#bfe0ff" />
              <stop offset="0.35" stopColor="#5aa2ee" />
              <stop offset="1" stopColor="#1f5fbf" />
            </linearGradient>
            <linearGradient id="gelRed" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="#ffc9c1" />
              <stop offset="0.35" stopColor="#e8574c" />
              <stop offset="1" stopColor="#a31c13" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((g) => (
            <line key={g} x1="0" x2={w} y1={h - g * h} y2={h - g * h} stroke="#e3e3e3" />
          ))}
          {items.map((t, i) => (
            <rect key={t.id} x={i * bw + 1} y={h - t.score * h} width={Math.max(bw - 2, 1)} height={t.score * h}
              fill={t.score >= THRESHOLD ? "url(#gelRed)" : "url(#gelBlue)"} rx="2">
              <title>{`${t.id}: ${t.score.toFixed(2)}`}</title>
            </rect>
          ))}
          <line x1="0" x2={w} y1={ty} y2={ty} stroke="#b3261e" strokeDasharray="4 4" />
          <text x={w - 4} y={ty - 5} textAnchor="end" fontSize="11" fill="#b3261e">
            Threshold {THRESHOLD.toFixed(2)}
          </text>
          <line x1="0" x2={w} y1={h - 0.5} y2={h - 0.5} stroke="#8c8c8c" />
        </svg>
      </div>
    </section>
  );
}
