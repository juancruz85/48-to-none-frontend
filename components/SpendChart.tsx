import { Txn } from "@/lib/types";

const money = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export default function SpendChart({ data }: { data: Txn[] }) {
  const months = new Map<string, { spent: number; fraud: number; suspicious: number }>();
  for (const t of data) {
    if (!t.date || t.amount === null || t.amount <= 0) continue;
    const key = t.date.slice(0, 7);
    const month = months.get(key) ?? { spent: 0, fraud: 0, suspicious: 0 };
    month.spent += t.amount;
    if (t.status === "fraud") month.fraud += t.amount;
    if (t.status === "suspicious") month.suspicious += t.amount;
    months.set(key, month);
  }
  const items = [...months.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-24);
  const w = 800, h = 180, pad = 18;
  const bw = w / Math.max(items.length, 1);
  const top = Math.max(...items.map(([, m]) => m.spent), 1);
  const scale = (n: number) => (n / top) * (h - pad);
  const labelEvery = Math.ceil(items.length / 12);

  return (
    <section className="panel">
      <h2 className="panelTitle">Spending by month</h2>
      <div className="panelBody">
        {items.length === 0 ? (
          <p className="empty">No dated purchases to chart.</p>
        ) : (
          <>
            <svg className="chart" viewBox={`0 0 ${w} ${h + 16}`} role="img" aria-label="Spending by month, possible fraud in red, suspicious in amber">
              <defs>
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
                <linearGradient id="gelAmber" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0" stopColor="#ffe9b0" />
                  <stop offset="0.35" stopColor="#f0b63c" />
                  <stop offset="1" stopColor="#b07a08" />
                </linearGradient>
              </defs>
              {[0.25, 0.5, 0.75, 1].map((g) => (
                <line key={g} x1="0" x2={w} y1={h - g * (h - pad)} y2={h - g * (h - pad)} stroke="#e3e3e3" />
              ))}
              <text x="2" y={pad - 5} fontSize="11" fill="#6e6e6e">{money(top)}</text>
              {items.map(([key, m], i) => {
                const x = i * bw + 1, width = Math.max(bw - 2, 1);
                return (
                  <g key={key}>
                    <title>{`${key}: ${money(m.spent)} spent${m.fraud ? `, ${money(m.fraud)} possible fraud` : ""}${m.suspicious ? `, ${money(m.suspicious)} suspicious` : ""}`}</title>
                    <rect x={x} y={h - scale(m.spent)} width={width} height={scale(m.spent)} fill="url(#gelBlue)" rx="2" />
                    {m.suspicious > 0 && (
                      <rect x={x} y={h - scale(m.fraud) - Math.max(scale(m.suspicious), 2)} width={width}
                        height={Math.max(scale(m.suspicious), 2)} fill="url(#gelAmber)" rx="2" />
                    )}
                    {m.fraud > 0 && (
                      <rect x={x} y={h - scale(m.fraud)} width={width} height={scale(m.fraud)} fill="url(#gelRed)" rx="2" />
                    )}
                    {i % labelEvery === 0 && (
                      <text x={x + width / 2} y={h + 12} textAnchor="middle" fontSize="10" fill="#6e6e6e">{key}</text>
                    )}
                  </g>
                );
              })}
              <line x1="0" x2={w} y1={h - 0.5} y2={h - 0.5} stroke="#8c8c8c" />
            </svg>
            <div className="legend">
              <span><i className="swatch blue" />Spent</span>
              <span><i className="swatch red" />Possible fraud</span>
              <span><i className="swatch amber" />Suspicious</span>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
