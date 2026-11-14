import { Txn, THRESHOLD } from "@/lib/types";

export default function TransactionsTable({ data }: { data: Txn[] }) {
  return (
    <div className="card">
      <h2>Recent transactions</h2>
      <div className="table-scroll">
        <table>
          <thead>
            <tr><th>ID</th><th>Time</th><th>Merchant</th><th>Country</th><th>Amount</th><th>Score</th><th>Status</th></tr>
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
                  <td>${t.amount.toFixed(2)}</td>
                  <td>{t.score.toFixed(2)}</td>
                  <td><span className={`badge ${high ? "high" : "low"}`}>{high ? "Flagged" : "OK"}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
