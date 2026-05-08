export function fmt(val) {
  if (val == null || val === "") return "—";
  const n = parseFloat(val);
  if (isNaN(n)) return val;
  return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
