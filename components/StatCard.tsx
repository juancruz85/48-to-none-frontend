export default function StatCard({ label, value, tone }: { label: string; value: string; tone?: "danger" | "ok" }) {
  return (
    <div className={`stat ${tone ?? ""}`}>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  );
}
