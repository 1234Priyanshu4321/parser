"""
Excel unlock + smart reading with header detection.
"""

import io

import msoffcrypto
import pandas as pd

from parser.normalize import _COLUMN_HINTS


def is_encrypted_excel(file_bytes: bytes) -> bool:
    try:
        f = io.BytesIO(file_bytes)
        office_file = msoffcrypto.OfficeFile(f)
        return office_file.is_encrypted()
    except Exception:
        return False


def unlock_excel(file_bytes: bytes, password: str) -> io.BytesIO:
    try:
        f = io.BytesIO(file_bytes)
        office_file = msoffcrypto.OfficeFile(f)
        office_file.load_key(password=password)
        out = io.BytesIO()
        office_file.decrypt(out)
        out.seek(0)
        return out
    except Exception:
        raise ValueError("Wrong password or file could not be decrypted.")


def find_header_row(file_bytes: io.BytesIO, engine: str, max_scan: int = 50) -> int:
    """
    Scan up to max_scan rows to find the row that looks like transaction headers.
    Returns 0-indexed row number for pd.read_excel header= param.
    """
    all_hints: set[str] = set()
    for hints in _COLUMN_HINTS.values():
        all_hints.update(hints)

    file_bytes.seek(0)
    raw = pd.read_excel(file_bytes, header=None, nrows=max_scan, engine=engine)

    best_row, best_score = 0, 0
    for i, row in raw.iterrows():
        row_vals = [str(v).strip().lower() for v in row if pd.notna(v) and str(v).strip()]
        score = sum(
            any(hint in val or val in hint for hint in all_hints)
            for val in row_vals
        )
        if score > best_score:
            best_score = score
            best_row = int(i)

    return best_row if best_score >= 2 else 0


def read_excel_smart(file_bytes: io.BytesIO, engine: str) -> pd.DataFrame:
    header_row = find_header_row(file_bytes, engine)
    file_bytes.seek(0)
    df = pd.read_excel(file_bytes, header=header_row, engine=engine)

    # Fix merged/unnamed columns: forward-fill column names
    cols = []
    last_named = None
    for col in df.columns:
        col_str = str(col).strip()
        if col_str.startswith("Unnamed:") or col_str == "nan":
            if last_named:
                cols.append(f"{last_named}_2")
            else:
                cols.append(col_str)
        else:
            cols.append(col_str)
            last_named = col_str
    df.columns = cols

    df = df.dropna(how="all").dropna(axis=1, how="all").reset_index(drop=True)
    return df
