import { useState, useCallback, useRef } from "react";

export default function DropZone({ onFile, loading }) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef();

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  }, [onFile]);

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
