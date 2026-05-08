import { useState } from "react";
import { fmt } from "../utils";

const COLS = ["Date", "Description", "Debit", "Credit", "Balance", "Category"];
const PAGE_SIZE = 20;

export default function TransactionTable({ transactions, filterCategory }) {
  const [sortCol, setSortCol] = useState("Date");
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(0);

  const rows = filterCategory
    ? transactions.filter((t) => t.Category === filterCategory)
    : transactions;

  const handleSort = (col) => {
    if (col === sortCol) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
    setPage(0);
  };

  const sorted = [...rows].sort((a, b) => {
    let av = a[sortCol] ?? "";
    let bv = b[sortCol] ?? "";
    if (["Debit", "Credit", "Balance"].includes(sortCol)) {
      av = parseFloat(av) || 0;
      bv = parseFloat(bv) || 0;
    } else {
      av = String(av).toLowerCase();
      bv = String(bv).toLowerCase();
    }
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paged = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="table-section">
      <div className="section-header">
        <h2 className="section-title">
          {filterCategory ? `${filterCategory} transactions` : "All transactions"}
        </h2>
        <span className="total-badge">{rows.length} rows</span>
      </div>
      <div className="table-wrap">
        <table className="txn-table" aria-label="Transaction table">
          <thead>
            <tr>
              {COLS.map((col) => (
                <th
                  key={col}
                  onClick={() => handleSort(col)}
                  className={`th ${["Debit","Credit","Balance"].includes(col) ? "th--num" : ""}`}
                  aria-sort={sortCol === col ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && handleSort(col)}
                >
                  {col} <span className={`sort-icon ${sortCol !== col ? "sort-icon--inactive" : ""}`}>
                    {sortCol === col ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((row, i) => (
              <tr key={i} className="txn-row">
                <td className="td td--date">{row.Date ?? "—"}</td>
                <td className="td td--desc" title={row.Description}>{row.Description ?? "—"}</td>
                <td className="td td--num td--debit">{row.Debit != null ? fmt(row.Debit) : "—"}</td>
                <td className="td td--num td--credit">{row.Credit != null ? fmt(row.Credit) : "—"}</td>
                <td className="td td--num">{row.Balance != null ? fmt(row.Balance) : "—"}</td>
                <td className="td"><span className="cat-pill">{row.Category ?? "—"}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="pagination" role="navigation" aria-label="Table pagination">
          <button className="page-btn" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} aria-label="Previous page">←</button>
          <span className="page-info">{page + 1} / {totalPages}</span>
          <button className="page-btn" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1} aria-label="Next page">→</button>
        </div>
      )}
    </div>
  );
}
