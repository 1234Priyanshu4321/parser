import { useState, useCallback, useRef } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// ─── Config ──────────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

// ─── Color palette (chart categories) ────────────────────────────────────────
const PALETTE = [
  "#E8703A", "#3A7BD5", "#2ECC71", "#F39C12", "#9B59B6",
  "#1ABC9C", "#E74C3C", "#3498DB", "#F1C40F", "#16A085",
  "#D35400", "#2980B9", "#27AE60", "#8E44AD", "#C0392B",
  "#2C3E50", "#7F8C8D", "#BDC3C7",
];

// ─── Utility ─────────────────────────────────────────────────────────────────
function fmt(val) {
  if (val == null || val === "") return "—";
  const n = parseFloat(val);
  if (isNaN(n)) return val;
  return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function DropZone({ onFile, loading }) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef();

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDrag(false);
      const f = e.dataTransfer.files[0];
      if (f) onFile(f);
    },
    [onFile]
  );

  return (
    <div
      className={`drop-zone ${drag ? "drag-over" : ""} ${loading ? "loading" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={handleDrop}
      onClick={() => !loading && inputRef.current?.click()}
      role="button"
      tabIndex={0}
      aria-label="Upload bank statement"
      onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.csv,.xlsx,.xls"
        style={{ display: "none" }}
        onChange={(e) => e.target.files[0] && onFile(e.target.files[0])}
      />
      {loading ? (
        <div className="spinner-wrap">
          <div className="spinner" aria-label="Processing" />
          <p className="drop-hint">Extracting transactions…</p>
        </div>
      ) : (
        <>
          <div className="drop-icon" aria-hidden="true">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
          </div>
          <p className="drop-title">Drop your bank statement here</p>
          <p className="drop-hint">PDF · CSV · XLSX · XLS &nbsp;·&nbsp; Password-protected OK</p>
        </>
      )}
    </div>
  );
}

function PasswordModal({ filename, onSubmit, onCancel, error }) {
  const [pw, setPw] = useState("");
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Password required">
      <div className="modal">
        <h2 className="modal-title">Password required</h2>
        <p className="modal-sub">{filename} is protected.</p>
        <input
          className={`pw-input ${error ? "pw-input--error" : ""}`}
          type="password"
          placeholder="Enter password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && pw && onSubmit(pw)}
          autoFocus
          aria-label="File password"
          aria-describedby={error ? "pw-error" : undefined}
        />
        {error && <p id="pw-error" className="pw-error">{error}</p>}
        <div className="modal-actions">
          <button className="btn btn--ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn--primary" onClick={() => onSubmit(pw)} disabled={!pw}>
            Unlock
          </button>
        </div>
      </div>
    </div>
  );
}

function SpendPie({ categoryTotals, onSelect, selected }) {
  const data = Object.entries(categoryTotals).map(([name, value]) => ({ name, value }));
  if (!data.length) return null;

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="pie-section">
      <div className="section-header">
        <h2 className="section-title">Spending breakdown</h2>
        <span className="total-badge">Total debits: {fmt(total)}</span>
      </div>
      <div className="pie-wrap">
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
              formatter={(value, entry) => (
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
    </div>
  );
}

function TransactionTable({ transactions, filterCategory }) {
  const rows = filterCategory
    ? transactions.filter((t) => t.Category === filterCategory)
    : transactions;

  const [sortCol, setSortCol] = useState("Date");
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const handleSort = (col) => {
    if (col === sortCol) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
    setPage(0);
  };

  const sorted = [...rows].sort((a, b) => {
    let av = a[sortCol] ?? "";
    let bv = b[sortCol] ?? "";
    if (sortCol === "Debit" || sortCol === "Credit" || sortCol === "Balance") {
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
  const COLS = ["Date", "Description", "Debit", "Credit", "Balance", "Category"];

  const SortIcon = ({ col }) => {
    if (sortCol !== col) return <span className="sort-icon sort-icon--inactive">↕</span>;
    return <span className="sort-icon">{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

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
                  {col} <SortIcon col={col} />
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
                <td className="td">
                  <span className="cat-pill">{row.Category ?? "—"}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="pagination" role="navigation" aria-label="Table pagination">
          <button
            className="page-btn"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            aria-label="Previous page"
          >
            ←
          </button>
          <span className="page-info">
            {page + 1} / {totalPages}
          </span>
          <button
            className="page-btn"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            aria-label="Next page"
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}

function TableNav({ tables, active, onSelect }) {
  if (tables.length <= 1) return null;
  return (
    <nav className="table-nav" aria-label="Statement tables">
      {tables.map((_, i) => (
        <button
          key={i}
          className={`table-nav-btn ${active === i ? "table-nav-btn--active" : ""}`}
          onClick={() => onSelect(i)}
          aria-current={active === i ? "true" : undefined}
        >
          Table {i + 1}
        </button>
      ))}
    </nav>
  );
}

function DownloadCSV({ transactions }) {
  const handleDownload = () => {
    const cols = ["Date", "Description", "Debit", "Credit", "Balance", "Category"];
    const header = cols.join(",");
    const rows = transactions.map((t) =>
      cols.map((c) => {
        const v = t[c] ?? "";
        return typeof v === "string" && v.includes(",") ? `"${v}"` : v;
      }).join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transactions.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button className="btn btn--outline download-btn" onClick={handleDownload}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      Download CSV
    </button>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [state, setState] = useState("idle"); // idle | pw-prompt | loading | done | error
  const [pendingFile, setPendingFile] = useState(null);
  const [pwError, setPwError] = useState("");
  const [tables, setTables] = useState([]);
  const [activeTable, setActiveTable] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const submitFile = useCallback(async (file, password = "") => {
    setState("loading");
    setPwError("");

    const form = new FormData();
    form.append("file", file);
    form.append("password", password);

    try {
      const res = await fetch(`${API_BASE}/upload`, { method: "POST", body: form });
      const data = await res.json();

      if (res.status === 422 && data.detail?.includes("password")) {
        setState("pw-prompt");
        setPendingFile(file);
        return;
      }
      if (res.status === 401) {
        setState("pw-prompt");
        setPendingFile(file);
        setPwError(data.detail || "Wrong password.");
        return;
      }
      if (!res.ok) {
        throw new Error(data.detail || `Server error ${res.status}`);
      }

      setTables(data.tables || []);
      setActiveTable(0);
      setSelectedCategory(null);
      setState("done");
    } catch (e) {
      setErrorMsg(e.message);
      setState("error");
    }
  }, []);

  const handleFile = useCallback(
    (file) => {
      setPendingFile(file);
      submitFile(file, "");
    },
    [submitFile]
  );

  const handlePasswordSubmit = useCallback(
    (pw) => submitFile(pendingFile, pw),
    [pendingFile, submitFile]
  );

  const reset = () => {
    setState("idle");
    setTables([]);
    setPendingFile(null);
    setSelectedCategory(null);
    setErrorMsg("");
    setPwError("");
  };

  const currentTable = tables[activeTable];

  return (
    <>
      <style>{CSS}</style>
      <a href="#main" className="skip-link">Skip to content</a>

      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" aria-hidden="true">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            <span className="logo-text">FinWise</span>
          </div>
          {state === "done" && (
            <button className="btn btn--ghost btn--sm" onClick={reset}>
              ← New file
            </button>
          )}
        </div>
      </header>

      <main id="main" className="main">
        {state === "idle" && (
          <div className="upload-screen">
            <div className="upload-hero">
              <h1 className="hero-title">Parse your bank statement</h1>
              <p className="hero-sub">
                Upload any PDF, CSV, or Excel statement — password-protected included.
                Transactions are extracted, normalized, and categorized automatically.
              </p>
            </div>
            <DropZone onFile={handleFile} loading={false} />
          </div>
        )}

        {state === "loading" && (
          <div className="upload-screen">
            <DropZone onFile={() => {}} loading={true} />
          </div>
        )}

        {state === "pw-prompt" && (
          <PasswordModal
            filename={pendingFile?.name || "File"}
            onSubmit={handlePasswordSubmit}
            onCancel={reset}
            error={pwError}
          />
        )}

        {state === "error" && (
          <div className="upload-screen">
            <div className="error-card" role="alert">
              <p className="error-title">Extraction failed</p>
              <p className="error-body">{errorMsg}</p>
              <button className="btn btn--primary" onClick={reset}>Try again</button>
            </div>
          </div>
        )}

        {state === "done" && currentTable && (
          <div className="results">
            <TableNav tables={tables} active={activeTable} onSelect={(i) => { setActiveTable(i); setSelectedCategory(null); }} />

            {currentTable.error ? (
              <div className="error-card" role="alert">
                <p className="error-title">Could not parse table</p>
                <p className="error-body">{currentTable.error}</p>
              </div>
            ) : (
              <>
                <div className="results-top">
                  {Object.keys(currentTable.category_totals).length > 0 && (
                    <SpendPie
                      categoryTotals={currentTable.category_totals}
                      onSelect={(cat) => setSelectedCategory(cat)}
                      selected={selectedCategory}
                    />
                  )}
                  <div className="download-row">
                    <DownloadCSV transactions={currentTable.transactions} />
                    {selectedCategory && (
                      <button className="btn btn--ghost btn--sm" onClick={() => setSelectedCategory(null)}>
                        Clear filter
                      </button>
                    )}
                  </div>
                </div>
                <TransactionTable
                  transactions={currentTable.transactions}
                  filterCategory={selectedCategory}
                />
              </>
            )}
          </div>
        )}
      </main>
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@400;600;700;800&display=swap');

  :root {
    --bg: #0e0f11;
    --surface: #16181c;
    --surface-2: #1e2126;
    --border: #2a2d34;
    --border-2: #353840;
    --text: #e8eaf0;
    --text-muted: #7a7f8e;
    --accent: #E8703A;
    --accent-dim: rgba(232,112,58,0.12);
    --green: #2ECC71;
    --red: #E74C3C;
    --radius: 10px;
    --radius-sm: 6px;
    --font-ui: 'Syne', sans-serif;
    --font-mono: 'DM Mono', monospace;
    --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
    font-size: 15px;
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: var(--bg);
    color: var(--text);
    font-family: var(--font-ui);
    min-height: 100dvh;
    -webkit-font-smoothing: antialiased;
  }

  .skip-link {
    position: absolute;
    top: -40px;
    left: 0;
    background: var(--accent);
    color: #fff;
    padding: 8px 16px;
    z-index: 100;
    font-family: var(--font-ui);
  }
  .skip-link:focus { top: 0; }

  /* ── Header ── */
  .header {
    border-bottom: 1px solid var(--border);
    background: rgba(14,15,17,0.85);
    backdrop-filter: blur(12px);
    position: sticky;
    top: 0;
    z-index: 50;
  }
  .header-inner {
    max-width: 1280px;
    margin: 0 auto;
    padding: 14px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .logo {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .logo-text {
    font-size: 17px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--text);
  }

  /* ── Main ── */
  .main {
    max-width: 1280px;
    margin: 0 auto;
    padding: 40px 24px 80px;
  }

  /* ── Upload screen ── */
  .upload-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 40px;
    padding-top: 40px;
  }
  .upload-hero {
    text-align: center;
    max-width: 560px;
  }
  .hero-title {
    font-size: clamp(28px, 5vw, 44px);
    font-weight: 800;
    letter-spacing: -0.03em;
    line-height: 1.1;
    color: var(--text);
  }
  .hero-sub {
    margin-top: 14px;
    color: var(--text-muted);
    font-size: 15px;
    line-height: 1.6;
    max-width: 480px;
  }

  /* ── Drop zone ── */
  .drop-zone {
    width: 100%;
    max-width: 520px;
    background: var(--surface);
    border: 1.5px dashed var(--border-2);
    border-radius: var(--radius);
    padding: 56px 32px;
    text-align: center;
    cursor: pointer;
    transition: border-color 180ms var(--ease-out), background 180ms var(--ease-out);
    outline: none;
  }
  .drop-zone:focus-visible {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-dim);
  }
  .drop-zone.drag-over {
    border-color: var(--accent);
    background: var(--accent-dim);
  }
  .drop-zone:hover:not(.loading) {
    border-color: var(--accent);
  }
  .drop-icon {
    color: var(--accent);
    margin-bottom: 16px;
    display: flex;
    justify-content: center;
  }
  .drop-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--text);
    margin-bottom: 8px;
  }
  .drop-hint {
    font-size: 13px;
    color: var(--text-muted);
    font-family: var(--font-mono);
  }

  /* ── Spinner ── */
  .spinner-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }
  .spinner {
    width: 36px;
    height: 36px;
    border: 3px solid var(--border-2);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── Modal ── */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.7);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 80;
    padding: 24px;
  }
  .modal {
    background: var(--surface);
    border: 1px solid var(--border-2);
    border-radius: var(--radius);
    padding: 32px;
    width: 100%;
    max-width: 380px;
    animation: modal-in 200ms var(--ease-out);
  }
  @keyframes modal-in {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .modal-title {
    font-size: 18px;
    font-weight: 700;
    margin-bottom: 6px;
  }
  .modal-sub {
    font-size: 13px;
    color: var(--text-muted);
    margin-bottom: 20px;
    word-break: break-all;
  }
  .pw-input {
    width: 100%;
    background: var(--surface-2);
    border: 1px solid var(--border-2);
    border-radius: var(--radius-sm);
    padding: 10px 14px;
    color: var(--text);
    font-family: var(--font-mono);
    font-size: 14px;
    outline: none;
    transition: border-color 150ms;
    margin-bottom: 8px;
  }
  .pw-input:focus { border-color: var(--accent); }
  .pw-input--error { border-color: var(--red); }
  .pw-error {
    font-size: 12px;
    color: var(--red);
    margin-bottom: 16px;
  }
  .modal-actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    margin-top: 20px;
  }

  /* ── Buttons ── */
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-family: var(--font-ui);
    font-size: 14px;
    font-weight: 600;
    border-radius: var(--radius-sm);
    padding: 9px 18px;
    cursor: pointer;
    border: none;
    transition: opacity 150ms, transform 100ms;
    outline: none;
    min-height: 44px;
  }
  .btn:focus-visible { box-shadow: 0 0 0 3px var(--accent-dim); }
  .btn:active { transform: scale(0.98); }
  .btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
  .btn--primary { background: var(--accent); color: #fff; }
  .btn--primary:hover:not(:disabled) { opacity: 0.88; }
  .btn--ghost { background: transparent; color: var(--text-muted); }
  .btn--ghost:hover { color: var(--text); }
  .btn--outline {
    background: transparent;
    color: var(--text);
    border: 1px solid var(--border-2);
  }
  .btn--outline:hover { border-color: var(--accent); color: var(--accent); }
  .btn--sm { font-size: 13px; padding: 6px 14px; min-height: 36px; }

  /* ── Results layout ── */
  .results { display: flex; flex-direction: column; gap: 32px; }

  /* ── Table nav ── */
  .table-nav {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .table-nav-btn {
    font-family: var(--font-ui);
    font-size: 13px;
    font-weight: 600;
    padding: 7px 16px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-2);
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    transition: all 150ms;
    min-height: 36px;
  }
  .table-nav-btn:hover { border-color: var(--accent); color: var(--accent); }
  .table-nav-btn--active {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
  }

  /* ── Section header ── */
  .section-header {
    display: flex;
    align-items: baseline;
    gap: 12px;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }
  .section-title {
    font-size: 17px;
    font-weight: 700;
    color: var(--text);
    letter-spacing: -0.01em;
  }
  .total-badge {
    font-size: 13px;
    font-family: var(--font-mono);
    color: var(--text-muted);
  }

  /* ── Pie ── */
  .pie-section {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 24px;
  }
  .pie-wrap { width: 100%; }

  /* ── Download row ── */
  .download-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .download-btn { align-self: flex-start; }

  /* ── Transaction table ── */
  .table-section {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 24px;
  }
  .table-wrap {
    width: 100%;
    overflow-x: auto;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border);
  }
  .txn-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
    table-layout: fixed;
  }
  .th {
    background: var(--surface-2);
    padding: 10px 14px;
    text-align: left;
    font-weight: 600;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
    border-bottom: 1px solid var(--border);
    white-space: nowrap;
    cursor: pointer;
    user-select: none;
    transition: color 150ms;
  }
  .th:hover { color: var(--text); }
  .th--num { text-align: right; }
  .th:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
  .sort-icon { margin-left: 4px; font-size: 11px; opacity: 0.8; }
  .sort-icon--inactive { opacity: 0.3; }

  .txn-row { transition: background 100ms; }
  .txn-row:hover { background: var(--surface-2); }
  .txn-row:not(:last-child) .td { border-bottom: 1px solid var(--border); }

  .td {
    padding: 10px 14px;
    font-family: var(--font-mono);
    font-size: 12.5px;
    vertical-align: middle;
    color: var(--text);
  }
  .td--date { color: var(--text-muted); white-space: nowrap; width: 110px; }
  .td--desc {
    max-width: 260px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: var(--font-ui);
    font-size: 13px;
  }
  .td--num { text-align: right; }
  .td--debit { color: var(--red); }
  .td--credit { color: var(--green); }

  /* ── Category pill ── */
  .cat-pill {
    display: inline-block;
    font-size: 11px;
    font-family: var(--font-ui);
    font-weight: 600;
    padding: 3px 9px;
    border-radius: 99px;
    background: var(--surface-2);
    border: 1px solid var(--border-2);
    color: var(--text-muted);
    white-space: nowrap;
  }

  /* ── Pagination ── */
  .pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    margin-top: 16px;
  }
  .page-btn {
    font-family: var(--font-ui);
    font-weight: 600;
    padding: 7px 14px;
    background: var(--surface-2);
    border: 1px solid var(--border-2);
    border-radius: var(--radius-sm);
    color: var(--text);
    cursor: pointer;
    min-height: 36px;
    transition: border-color 150ms;
  }
  .page-btn:hover:not(:disabled) { border-color: var(--accent); }
  .page-btn:disabled { opacity: 0.3; cursor: not-allowed; }
  .page-info { font-family: var(--font-mono); font-size: 13px; color: var(--text-muted); }

  /* ── Error card ── */
  .error-card {
    background: var(--surface);
    border: 1px solid var(--red);
    border-radius: var(--radius);
    padding: 28px 32px;
    max-width: 480px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }
  .error-title { font-size: 16px; font-weight: 700; color: var(--red); }
  .error-body { font-size: 13px; color: var(--text-muted); line-height: 1.5; }

  /* ── Responsive ── */
  @media (max-width: 640px) {
    .main { padding: 24px 16px 60px; }
    .pie-section, .table-section { padding: 16px; }
    .td--desc { max-width: 140px; }
    .drop-zone { padding: 40px 20px; }
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
  }
`;
