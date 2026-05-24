"use client";

export function CompareTable() {
  const rows = [
    { label: "Battery needed", ongrid: "No ❌", offgrid: "Yes (large) ✅", hybrid: "Yes (moderate) ✅" },
    { label: "Works during power cut", ongrid: "No ❌", offgrid: "Yes ✅", hybrid: "Yes ✅" },
    { label: "Exports to grid", ongrid: "Yes ✅", offgrid: "No ❌", hybrid: "Yes ✅" },
    { label: "Net meter needed", ongrid: "Yes", offgrid: "No", hybrid: "Yes" },
    { label: "Cost (7 kWp)", ongrid: "Rs 2–2.6L", offgrid: "Rs 6–7.5L", hybrid: "Rs 5.5–7L" },
    { label: "Mandawar ke liye", ongrid: "No ❌", offgrid: "Partial ⚠️", hybrid: "Yes ✅" },
    { label: "Payback period", ongrid: "4–6 yr", offgrid: "10–14 yr", hybrid: "6–9 yr" },
    { label: "PM Surya Ghar subsidy", ongrid: "Full Rs 78K", offgrid: "No", hybrid: "Partial" },
    { label: "EV charging", ongrid: "Daytime only", offgrid: "Day + battery", hybrid: "Best option ✅" },
  ];

  return (
    <div className="overflow-x-auto rounded-xl border border-surface-stroke">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-surface-elevated">
            <th className="px-4 py-3 text-left text-text-secondary text-xs font-medium">Feature</th>
            <th className="px-4 py-3 text-center text-xs font-semibold" style={{ color: "#3B82F6" }}>
              On-Grid
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold" style={{ color: "#F97316" }}>
              Off-Grid
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold" style={{ color: "#22C55E" }}>
              Hybrid ⭐
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.label}
              className={`border-t border-surface-stroke ${
                row.label === "Mandawar ke liye"
                  ? "bg-solar/5 border-y-2 border-y-solar/30"
                  : i % 2 === 0 ? "bg-surface-dark/50" : "bg-surface-card/50"
              }`}
            >
              <td className="px-4 py-2.5 text-text-secondary text-xs">{row.label}</td>
              <td className="px-4 py-2.5 text-center text-xs text-text-primary">{row.ongrid}</td>
              <td className="px-4 py-2.5 text-center text-xs text-text-primary">{row.offgrid}</td>
              <td className="px-4 py-2.5 text-center text-xs text-text-primary font-medium">{row.hybrid}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
