"""
PDF unlock + AWS Textract extraction.
"""

import os
import tempfile

import boto3
import pikepdf
import pandas as pd


def is_encrypted(path: str) -> bool:
    try:
        with pikepdf.open(path):
            return False
    except pikepdf.PasswordError:
        return True


def unlock_pdf(path: str, password: str | None) -> str:
    """
    Returns path to unlocked PDF (may be a new temp file).
    Raises ValueError on wrong password.
    """
    try:
        with pikepdf.open(path, password=password or "") as pdf:
            if pdf.is_encrypted:
                out_path = tempfile.mktemp(suffix=".pdf")
                pdf.save(out_path)
                return out_path
            return path
    except pikepdf.PasswordError:
        raise ValueError("Wrong password or PDF requires a password.")


def extract_tables_textract(pdf_path: str) -> list[pd.DataFrame]:
    with open(pdf_path, "rb") as f:
        pdf_bytes = f.read()

    client = boto3.client(
        "textract",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
        region_name=os.environ.get("AWS_REGION", "us-east-1"),
    )

    response = client.analyze_document(
        Document={"Bytes": pdf_bytes},
        FeatureTypes=["TABLES"],
    )

    return _parse_textract_response(response)


def _parse_textract_response(response: dict) -> list[pd.DataFrame]:
    blocks = {b["Id"]: b for b in response["Blocks"]}

    tables = []
    for block in response["Blocks"]:
        if block["BlockType"] != "TABLE":
            continue

        cells = {}
        for rel in block.get("Relationships", []):
            if rel["Type"] == "CHILD":
                for cell_id in rel["Ids"]:
                    cell = blocks[cell_id]
                    if cell["BlockType"] != "CELL":
                        continue
                    row = cell["RowIndex"]
                    col = cell["ColumnIndex"]
                    text = _cell_text(cell, blocks)
                    cells[(row, col)] = text

        if not cells:
            continue

        max_row = max(r for r, c in cells)
        max_col = max(c for r, c in cells)

        data = [
            [cells.get((r, c), "") for c in range(1, max_col + 1)]
            for r in range(1, max_row + 1)
        ]

        if len(data) < 2:
            continue

        header = [str(h).strip() or f"col_{i}" for i, h in enumerate(data[0])]
        seen = {}
        deduped = []
        for h in header:
            seen[h] = seen.get(h, 0) + 1
            deduped.append(f"{h}_{seen[h]}" if seen[h] > 1 else h)

        df = pd.DataFrame(data[1:], columns=deduped)
        df = df.replace("", pd.NA).dropna(how="all").reset_index(drop=True)
        if not df.empty:
            tables.append(df)

    return tables


def _cell_text(cell: dict, blocks: dict) -> str:
    words = []
    for rel in cell.get("Relationships", []):
        if rel["Type"] == "CHILD":
            for word_id in rel["Ids"]:
                word = blocks.get(word_id, {})
                if word.get("BlockType") == "WORD":
                    words.append(word.get("Text", ""))
    return " ".join(words)
