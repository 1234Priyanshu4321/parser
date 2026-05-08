import { useState } from "react";

export default function PasswordModal({ filename, onSubmit, onCancel, error }) {
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
