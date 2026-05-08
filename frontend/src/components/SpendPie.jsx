import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { fmt } from "../utils";

const PALETTE = [
  "#E8703A","#3A7BD5","#2ECC71","#F39C12","#9B59B6",
  "#1ABC9C","#E74C3C","#3498DB","#F1C40F","#16A085",
  "#D35400","#2980B9","#27AE60","#8E44AD","#C0392B",
  "#2C3E50","#7F8C8D","#BDC3C7",
];

export default function SpendPie({ categoryTotals, onSelect, selected }) {
  const data = Object.entries(categoryTotals).map(([name, value]) => ({ name, value }));
  if (!data.length) return null;

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="pie-section">
      <div className="section-header">
        <h2 className="section-title">Spending breakdown</h2>
        <span className="total-badge">Total debits: {fmt(total)}</span>
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={80}
            outerRadius={130}
            paddingAngle={2}
            dataKey="value"
            onClick={(entry) => onSelect(entry.name === selected ? null : entry.name)}
          >
            {data.map((entry, idx) => (
              <Cell
                key={entry.name}
                fill={PALETTE[idx % PALETTE.length]}
                opacity={selected && selected !== entry.name ? 0.35 : 1}
                style={{ cursor: "pointer", outline: "none" }}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(v) => fmt(v)}
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              color: "var(--text)",
              fontSize: "13px",
            }}
          />
          <Legend
            formatter={(value) => (
              <span
                style={{
                  color: selected && selected !== value ? "var(--text-muted)" : "var(--text)",
                  cursor: "pointer",
                  fontSize: "13px",
                }}
                onClick={() => onSelect(value === selected ? null : value)}
              >
                {value}
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
