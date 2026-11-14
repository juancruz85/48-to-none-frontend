import { Txn, THRESHOLD } from "@/lib/types";

export default function TransactionsTable({ data }: { data: Txn[] }) {
  return (
    <section className="panel">
      <h2 className="panelTitle">Recent transactions</h2>
      <div className="tableScroll">
        <table>
          <thead>
            <tr><th>ID</th><th>Time</th><th>Merchant</th><th>Country</th><th className="num">Amount</th><th className="num">Score</th><th>Status</th></tr>
          </thead>
          <tbody>
            {data.map((t) => {
              const high = t.score >= THRESHOLD;
              return (
                <tr key={t.id}>
                  <td>{t.id}</td>
                  <td>{new Date(t.time).toLocaleString()}</td>
                  <td>{t.merchant}</td>
                  <td>{t.country}</td>
                  <td className="num">${t.amount.toFixed(2)}</td>
                  <td className="num">{t.score.toFixed(2)}</td>
                  <td><span className={`badge ${high ? "high" : "low"}`}>{high ? "Flagged" : "OK"}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
