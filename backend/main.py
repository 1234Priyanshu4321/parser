"""
FinWise Bank Statement Parser — FastAPI Backend

POST /upload  → parse + normalize + categorize → JSON
GET  /health  → { status: "ok" }
"""

import io
import os
import tempfile
from typing import Any
import math
import pandas as pd
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from parser.categorize import categorize
from parser.excel import is_encrypted_excel, read_excel_smart, unlock_excel
from parser.normalize import normalize_table
from parser.pdf import extract_tables_textract, is_encrypted, unlock_pdf

app = FastAPI(title="FinWise Parser API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in prod
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── helpers ──────────────────────────────────────────────────────────────────

def _df_to_payload(df: pd.DataFrame) -> dict[str, Any]:
    """
    Normalize one raw DataFrame → categorized transaction list + category summary.
    Returns None in the `error` key if normalization fails.
    """
    normalized, warn = normalize_table(df)
    if warn:
        return {"error": warn, "transactions": [], "category_totals": {}}

    normalized["Category"] = normalized["Description"].apply(categorize)

    # Coerce Debit/Credit/Balance to float where possible
    for col in ["Debit", "Credit", "Balance"]:
        normalized[col] = pd.to_numeric(normalized[col], errors="coerce")

    

    def _safe(v):
        if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
            return None
        return v

    transactions = [
        {k: _safe(v) for k, v in row.items()}
        for row in normalized.to_dict(orient="records")
    ]

    # Category totals (debits only)
    debit_df = normalized[normalized["Debit"].notna() & (normalized["Debit"] > 0)]
    category_totals = (
        debit_df.groupby("Category")["Debit"]
        .sum()
        .sort_values(ascending=False)
        .round(2)
        .to_dict()
    )

    return {
        "error": None,
        "transactions": transactions,
        "category_totals": category_totals,
    }


# ─── routes ───────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/upload")
async def upload(
    file: UploadFile = File(...),
    password: str = Form(default=""),
):
    filename = file.filename or ""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    raw_bytes = await file.read()

    # ── CSV ──────────────────────────────────────────────────────────────────
    if ext == "csv":
        try:
            df = pd.read_csv(io.BytesIO(raw_bytes))
        except Exception as e:
            raise HTTPException(400, f"CSV parse error: {e}")
        return {"tables": [_df_to_payload(df)]}

    # ── Excel ─────────────────────────────────────────────────────────────────
    if ext in ("xlsx", "xls"):
        file_io: io.BytesIO
        if is_encrypted_excel(raw_bytes):
            if not password:
                raise HTTPException(422, "Excel is password-protected. Provide password field.")
            try:
                file_io = unlock_excel(raw_bytes, password)
            except ValueError as e:
                raise HTTPException(401, str(e))
        else:
            file_io = io.BytesIO(raw_bytes)

        engine = "xlrd" if ext == "xls" else "openpyxl"
        try:
            df = read_excel_smart(file_io, engine)
        except Exception as e:
            raise HTTPException(400, f"Excel read error: {e}")

        return {"tables": [_df_to_payload(df)]}

    # ── PDF ───────────────────────────────────────────────────────────────────
    if ext == "pdf":
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            tmp.write(raw_bytes)
            tmp_path = tmp.name

        if is_encrypted(tmp_path):
            if not password:
                os.unlink(tmp_path)
                raise HTTPException(422, "PDF is password-protected. Provide password field.")

        try:
            usable_path = unlock_pdf(tmp_path, password or None)
        except ValueError as e:
            os.unlink(tmp_path)
            raise HTTPException(401, str(e))

        try:
            raw_tables = extract_tables_textract(usable_path)
        except Exception as e:
            raise HTTPException(500, f"Textract error: {e}")
        finally:
            os.unlink(tmp_path)
            if usable_path != tmp_path and os.path.exists(usable_path):
                os.unlink(usable_path)

        return {"tables": [_df_to_payload(df) for df in raw_tables]}

    raise HTTPException(400, f"Unsupported file type: .{ext}. Use PDF, CSV, XLSX, or XLS.")
