"""
Column hint map + table normalization to [Date, Description, Debit, Credit, Balance].
"""

import re

import pandas as pd


_COLUMN_HINTS: dict[str, list[str]] = {
    "Date": [
        "date", "txn date", "transaction date", "value date",
        "posting date", "trans date", "entry date", "dt",
    ],
    "Description": [
        "description", "narration", "particulars", "details",
        "remarks", "transaction details", "transaction narration",
        "trans description", "memo", "ref", "reference",
    ],
    "Debit": [
        "debit", "withdrawal", "dr", "debit amount",
        "withdrawals", "paid out", "money out",
    ],
    "Credit": [
        "credit", "deposit", "cr", "credit amount",
        "deposits", "paid in", "money in",
    ],
    "Balance": [
        "balance", "closing balance", "running balance",
        "available balance", "ledger balance", "bal",
    ],
}

_DATE_RE = re.compile(r"\d{1,4}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}")


def _match_column(col_name: str) -> str | None:
    cleaned = col_name.strip().lower()
    for standard, hints in _COLUMN_HINTS.items():
        if any(cleaned == h or cleaned.startswith(h) or h in cleaned for h in hints):
            return standard
    return None


def normalize_table(df: pd.DataFrame) -> tuple[pd.DataFrame | None, str | None]:
    """
    Map df columns → [Date, Description, Debit, Credit, Balance].
    Returns (normalized_df, None) on success, (None, error_msg) on failure.
    """
    mapping: dict[str, str] = {}
    for col in df.columns:
        standard = _match_column(str(col))
        if standard and standard not in mapping.values():
            mapping[col] = standard

    matched = set(mapping.values())
    if "Date" not in matched or "Description" not in matched:
        return None, f"Could not identify transaction columns. Found: {list(df.columns)}"

    normalized = df[list(mapping.keys())].rename(columns=mapping)

    for col in ["Date", "Description", "Debit", "Credit", "Balance"]:
        if col not in normalized.columns:
            normalized[col] = pd.NA

    normalized = normalized[["Date", "Description", "Debit", "Credit", "Balance"]]
    normalized = normalized.dropna(how="all").reset_index(drop=True)

    def _is_data_row(row: pd.Series) -> bool:
        date_val = str(row.get("Date", "") or "").strip()
        return bool(_DATE_RE.match(date_val))

    normalized = normalized[normalized.apply(_is_data_row, axis=1)].reset_index(drop=True)

    return normalized, None
