export default function StatCard({ label, value, tone }: { label: string; value: string; tone?: "danger" | "ok" }) {
  return (
    <div className="card">
      <div className="label">{label}</div>
      <div className={`value ${tone ?? ""}`}>{value}</div>
    </div>
  );
}
