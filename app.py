import streamlit as st
import pdfplumber
import pandas as pd
from pypdf import PdfReader
import tempfile
import os
import msoffcrypto

st.set_page_config(page_title="Statement Extractor", layout="wide")
st.title("📄 Bank Statement Extractor (PDF + Excel)")

# ---------------- PDF HELPERS ---------------- #

def is_pdf_encrypted(path):
    try:
        reader = PdfReader(path)
        return reader.is_encrypted
    except:
        return False


def extract_pdf_tables(path, password=None):
    all_tables = []

    try:
        with pdfplumber.open(path, password=password) as pdf:
            for page_num, page in enumerate(pdf.pages):
                tables = page.extract_tables()

                if not tables:
                    continue
                for t_idx, table in enumerate(tables):
                    try:
                        # ✅ Convert everything to string (avoids pandas issues)
                        table = [
                            [str(cell) if cell is not None else "" for cell in row]
                            for row in table
                        ]
                        df = pd.DataFrame(table)
                        # Add debug info
                        df["__page__"] = page_num + 1
                        df["__table__"] = t_idx + 1
                        all_tables.append(df)

                    except Exception as e:
                        print(f"Table error on page {page_num+1}: {e}")
                        continue
            # 🔁 Fallback: if no tables found → extract raw text
            if not all_tables:
                text_data = []
                for page_num, page in enumerate(pdf.pages):
                    text = page.extract_text()
                    if text:
                        text_data.append({
                            "Page": page_num + 1,
                            "Raw_Text": text
                        })

                if text_data:
                    return pd.DataFrame(text_data)

    except Exception as e:
        print("PDF read error:", e)
        return None
    if not all_tables:
        return None

    # ✅ Safe concat (won’t crash)
    try:
        return pd.concat(all_tables, ignore_index=True, sort=False)
    except Exception as e:
        print("Concat error:", e)
        return all_tables 


# ---------------- EXCEL HELPERS ---------------- #

def try_read_excel(path):
    try:
        return pd.read_excel(path)
    except:
        return None


def decrypt_excel(input_path, password):
    try:
        decrypted_file = tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx")

        with open(input_path, "rb") as f:
            office_file = msoffcrypto.OfficeFile(f)
            office_file.load_key(password=password)

            with open(decrypted_file.name, "wb") as out:
                office_file.decrypt(out)

        return decrypted_file.name
    except:
        return None


# ---------------- UI ---------------- #

uploaded_file = st.file_uploader("Upload PDF or Excel", type=["pdf", "xlsx"])

if uploaded_file:
    suffix = os.path.splitext(uploaded_file.name)[1].lower()

    # Save temp file
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
        temp_file.write(uploaded_file.read())
        temp_path = temp_file.name

    df = None

    # ----------- PDF FLOW ----------- #
    if suffix == ".pdf":
        encrypted = is_pdf_encrypted(temp_path)

        if encrypted:
            st.warning("🔐 PDF is password-protected")
            password = st.text_input("Enter PDF Password", type="password")

            if not password:
                st.stop()
        else:
            password = None

        df = extract_pdf_tables(temp_path, password=password)

        if df is None:
            st.error("❌ Failed to read PDF (wrong password or unsupported format)")
            os.remove(temp_path)
            st.stop()

    # ----------- EXCEL FLOW ----------- #
    elif suffix == ".xlsx":
        df = try_read_excel(temp_path)

        if df is None:
            st.warning("🔐 Excel might be password-protected")
            password = st.text_input("Enter Excel Password", type="password")

            if password:
                decrypted = decrypt_excel(temp_path, password)
                if decrypted:
                    df = pd.read_excel(decrypted)
                    st.success("✅ Excel decrypted")
                    os.remove(decrypted)
                else:
                    st.error("❌ Wrong password")
                    os.remove(temp_path)
                    st.stop()
            else:
                os.remove(temp_path)
                st.stop()

    # ----------- OUTPUT ----------- #
    if df is not None:
        st.success("✅ Data extracted")

        # ✅ Handle both DataFrame and list of tables
        if isinstance(df, list):
            st.warning("⚠️ Showing tables separately (concat failed)")

            for i, table in enumerate(df):
                st.write(f"### Table {i+1}")
                st.dataframe(table, use_container_width=True)
        else:
            st.dataframe(df, use_container_width=True)

            # Download CSV
            csv = df.to_csv(index=False).encode("utf-8")
            st.download_button(
                "⬇️ Download CSV",
                data=csv,
                file_name="output.csv",
                mime="text/csv"
            )
    else:
        st.error("❌ Could not extract data")

    # Cleanup
    os.remove(temp_path)