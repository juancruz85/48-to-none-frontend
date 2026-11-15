import { Txn } from "@/lib/types";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const money = (n: number) =>
  `${n < 0 ? "+" : ""}$${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const wholeMoney = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const days = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1)} day${n === 1 ? "" : "s"}`;
const ordinal = (n: number) => {
  const tail = n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th";
  return `${n}${tail}`;
};
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthName = (month: string) => `${MONTHS[Number(month.slice(5)) - 1] ?? month.slice(5)} ${month.slice(0, 4)}`;
const median = (values: number[]) => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};
//dates arrive as YYYY-MM-DD. they are read as UTC so the weekday never shifts with the viewer's timezone.
const dayNumber = (date: string) => Date.parse(`${date}T00:00:00Z`) / 86400000;
const gaps = (dates: string[]) => dates.slice(1).map((date, i) => Math.round(dayNumber(date) - dayNumber(dates[i])));

type Bar = { label: string; value: number; text: string; note?: string };

function BarList({ rows }: { rows: Bar[] }) {
  const top = Math.max(...rows.map((row) => row.value), 0) || 1;
  const noted = rows.some((row) => row.note);
  return (
    <div className={`barList ${noted ? "noted" : ""}`}>
      {rows.map((row) => (
        <div className="barRow" key={row.label}>
          <span className="barLabel" title={row.label}>{row.label}</span>
          <span className="barTrack"><span className="barFill" style={{ width: `${Math.max((row.value / top) * 100, 2)}%` }} /></span>
          {noted && <span className="barNote">{row.note}</span>}
          <span className="barValue">{row.text}</span>
        </div>
      ))}
    </div>
  );
}

export default function SpendingAnalysis({ data }: { data: Txn[] }) {
  const paid = data.filter((t): t is Txn & { amount: number } => t.amount !== null && t.amount > 0);
  if (paid.length === 0) return null;
  const dated = paid
    .filter((t): t is Txn & { amount: number; date: string } => t.date !== null && !Number.isNaN(dayNumber(t.date)))
    .sort((a, b) => a.date.localeCompare(b.date));
  const spent = paid.reduce((sum, t) => sum + t.amount, 0);

  //what each month, weekday and day of the month added up to.
  const months = new Map<string, number>();
  const weekdays = WEEKDAYS.map(() => ({ purchases: 0, total: 0 }));
  const monthDays = Array.from({ length: 31 }, () => 0);
  for (const t of dated) {
    months.set(t.date.slice(0, 7), (months.get(t.date.slice(0, 7)) ?? 0) + t.amount);
    const weekday = weekdays[(new Date(`${t.date}T00:00:00Z`).getUTCDay() + 6) % 7];
    weekday.purchases += 1;
    weekday.total += t.amount;
    monthDays[Number(t.date.slice(8, 10)) - 1] += 1;
  }
  const monthKeys = [...months.keys()].sort();
  const span = monthKeys.length
    ? (Number(monthKeys.at(-1)!.slice(0, 4)) - Number(monthKeys[0].slice(0, 4))) * 12
      + Number(monthKeys.at(-1)!.slice(5)) - Number(monthKeys[0].slice(5)) + 1
    : 0;
  const typicalGap = median(gaps(dated.map((t) => t.date)));
  const typicalCharge = median(paid.map((t) => t.amount)) ?? 0;

  //the same purchase is often written with different capitals or spacing, so those are counted together.
  const items = new Map<string, { name: string; charges: (Txn & { amount: number })[] }>();
  for (const t of paid) {
    const key = t.item.toLowerCase().split(/\s+/).join(" ").trim();
    const item = items.get(key) ?? { name: t.item, charges: [] };
    item.charges.push(t);
    items.set(key, item);
  }
  const byItem = [...items.values()].map((item) => ({
    ...item,
    total: item.charges.reduce((sum, t) => sum + t.amount, 0),
  }));
  const topItems = [...byItem].sort((a, b) => b.total - a.total).slice(0, 8);

  const recurring = byItem
    .map((item) => {
      const dates = item.charges.flatMap((t) => (t.date ? [t.date] : [])).sort();
      const dayCounts = new Map<number, number>();
      for (const date of dates) dayCounts.set(Number(date.slice(8, 10)), (dayCounts.get(Number(date.slice(8, 10))) ?? 0) + 1);
      const usualDay = [...dayCounts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0];
      const prices = [...new Set(item.charges.map((t) => t.amount))].sort((a, b) => a - b);
      return { ...item, dates, usualDay, prices, gap: median(gaps(dates)) };
    })
    .filter((item) => item.dates.length >= 3)
    .sort((a, b) => b.charges.length - a.charges.length || b.total - a.total)
    .slice(0, 8);

  const priceCounts = new Map<number, number>();
  for (const t of paid) priceCounts.set(t.amount, (priceCounts.get(t.amount) ?? 0) + 1);
  const topPrices = [...priceCounts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]).slice(0, 8);

  const topMonths = [...months.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

  const types = new Map<string, { count: number; total: number }>();
  for (const t of data) {
    if (t.amount === null) continue;
    const type = types.get(t.type) ?? { count: 0, total: 0 };
    type.count += 1;
    type.total += t.amount;
    types.set(t.type, type);
  }
  const typeRows = [...types.entries()].sort((a, b) => b[1].total - a[1].total);

  const weekdayTop = Math.max(...weekdays.map((day) => day.total), 1);
  const monthDayTop = Math.max(...monthDays, 1);
  const busiestDays = monthDays
    .map((purchases, i) => ({ day: i + 1, purchases }))
    .filter((day) => day.purchases > 0)
    .sort((a, b) => b.purchases - a.purchases || a.day - b.day)
    .slice(0, 3);

  const facts = [
    { label: "Paid charges", value: paid.length.toLocaleString() },
    { label: "Typical charge", value: money(typicalCharge) },
    { label: "Average month", value: months.size ? money(spent / months.size) : "–" },
    { label: "Charges per month", value: span ? (paid.length / span).toFixed(1) : "–" },
    { label: "Typical gap", value: typicalGap === null ? "–" : days(typicalGap) },
    { label: "Months with a charge", value: span ? `${months.size} of ${span}` : "–" },
  ];

  return (
    <section className="panel">
      <h2 className="panelTitle panelTitleRow">
        Spending analysis
        {dated.length > 0 && <span className="panelNote">{dated[0].date} to {dated.at(-1)!.date}</span>}
      </h2>

      <dl className="facts">
        {facts.map((fact) => (
          <div className="fact" key={fact.label}>
            <dt>{fact.label}</dt>
            <dd>{fact.value}</dd>
          </div>
        ))}
      </dl>

      <div className="panelBody analysisGrid">
        <section className="box">
          <h3 className="boxTitle">Where the money goes</h3>
          <div className="boxBody">
            <BarList rows={topItems.map((item) => ({
              label: item.name, value: item.total, text: money(item.total), note: `${item.charges.length}×`,
            }))} />
          </div>
        </section>

        <section className="box">
          <h3 className="boxTitle">Spending by day of the week</h3>
          <div className="boxBody">
            {dated.length === 0 ? <p className="empty">No dated purchases.</p> : (
              <div className="weekdays" role="img" aria-label={`Spending by day of the week: ${weekdays.map((day, i) => `${WEEKDAY_NAMES[i]} ${money(day.total)}`).join(", ")}`}>
                {weekdays.map((day, i) => (
                  <div className="weekday" key={WEEKDAYS[i]} title={`${WEEKDAY_NAMES[i]}: ${money(day.total)} over ${day.purchases} purchase${day.purchases === 1 ? "" : "s"}`}>
                    <span className="weekdayValue">{day.total ? wholeMoney(day.total) : "–"}</span>
                    <span className="weekdayBar"><span className="weekdayFill" style={{ height: `${(day.total / weekdayTop) * 100}%` }} /></span>
                    <span className="weekdayName">{WEEKDAYS[i]}</span>
                    <span className="weekdayCount">{day.purchases}×</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="box">
          <h3 className="boxTitle">Most common prices</h3>
          <div className="boxBody">
            <BarList rows={topPrices.map(([price, count]) => ({ label: money(price), value: count, text: `${count}×` }))} />
          </div>
        </section>

        <section className="box">
          <h3 className="boxTitle">Purchases by day of the month</h3>
          <div className="boxBody">
            {dated.length === 0 ? <p className="empty">No dated purchases.</p> : (
              <>
                <div className="monthDays">
                  {monthDays.map((purchases, i) => {
                    const strength = purchases / monthDayTop;
                    return (
                      <span
                        key={i}
                        className="monthDay"
                        style={{ background: `rgba(47, 120, 214, ${purchases ? 0.08 + strength * 0.55 : 0})` }}
                        title={`${ordinal(i + 1)}: ${purchases} purchase${purchases === 1 ? "" : "s"}`}
                      >
                        {i + 1}
                      </span>
                    );
                  })}
                </div>
                <p className="hint">
                  Darker days had more purchases. Busiest: {busiestDays.map((day) => `the ${ordinal(day.day)} (${day.purchases})`).join(", ")}.
                </p>
              </>
            )}
          </div>
        </section>

        <section className="box">
          <h3 className="boxTitle">Highest-spend months</h3>
          <div className="boxBody">
            {topMonths.length === 0 ? <p className="empty">No dated purchases.</p> : (
              <BarList rows={topMonths.map(([month, total]) => ({ label: monthName(month), value: total, text: money(total) }))} />
            )}
          </div>
        </section>

        <section className="box">
          <h3 className="boxTitle">Transaction types</h3>
          <div className="tableScroll">
            <table>
              <thead>
                <tr><th>Type</th><th className="num">Transactions</th><th className="num">Total</th></tr>
              </thead>
              <tbody>
                {typeRows.map(([type, row]) => (
                  <tr key={type}>
                    <td>{type}</td>
                    <td className="num">{row.count.toLocaleString()}</td>
                    <td className="num">{money(row.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="box wide">
          <h3 className="boxTitle">Repeat purchases</h3>
          {recurring.length === 0 ? (
            <p className="empty">Nothing was bought three or more times.</p>
          ) : (
            <div className="tableScroll">
              <table>
                <thead>
                  <tr>
                    <th>Purchase</th><th className="num">Charges</th><th className="num">Total</th><th>First</th><th>Last</th>
                    <th className="num">Usual gap</th><th className="num">Usual day</th><th>Prices</th>
                  </tr>
                </thead>
                <tbody>
                  {recurring.map((item) => (
                    <tr key={item.name}>
                      <td>{item.name}</td>
                      <td className="num">{item.charges.length}</td>
                      <td className="num">{money(item.total)}</td>
                      <td>{item.dates[0]}</td>
                      <td>{item.dates.at(-1)}</td>
                      <td className="num">{item.gap === null ? "–" : days(item.gap)}</td>
                      <td className="num">{item.usualDay ? ordinal(item.usualDay) : "–"}</td>
                      <td>
                        {item.prices.slice(0, 3).map(money).join(", ")}
                        {item.prices.length > 3 && `, +${item.prices.length - 3} more`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
