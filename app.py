import streamlit as st
import pdfplumber
import pandas as pd
from PyPDF2 import PdfReader, PdfWriter
import tempfile
import os
import msoffcrypto

os.environ["STREAMLIT_ARROW_ENABLED"]="0"

st.set_page_config(page_title="Statement Extractor", layout="wide")
st.title(":page_facing_up: Bank Statement Extractor (PDF + Excel)")

# ---------------- PDF HELPERS ---------------- #

def is_pdf_encrypted(path):
    reader = PdfReader(path)
    return reader.is_encrypted

def decrypt_pdf(input_path, password):
    reader = PdfReader(input_path)

    try:
        if reader.is_encrypted:
            reader.decrypt(password)
    except:
        return None

    writer = PdfWriter()
    for page in reader.pages:
        writer.add_page(page)

    temp_output = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    with open(temp_output.name, "wb") as f:
        writer.write(f)

    return temp_output.name

def extract_pdf_tables(path):
    all_tables = []
    with pdfplumber.open(path) as pdf:
        for page_num, page in enumerate(pdf.pages):
            tables = page.extract_tables()
            for table in tables:
                df = pd.DataFrame(table)
                df["Page"] = page_num + 1
                all_tables.append(df)

    return pd.concat(all_tables, ignore_index=True) if all_tables else None


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
    suffix = os.path.splitext(uploaded_file.name)[1]

    # Save temp file
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
        temp_file.write(uploaded_file.read())
        temp_path = temp_file.name

    final_path = temp_path

    # ----------- PDF FLOW ----------- #
    if suffix == ".pdf":
        encrypted = is_pdf_encrypted(temp_path)

        if encrypted:
            st.warning(":closed_lock_with_key: PDF is password-protected")
            password = st.text_input("Enter PDF Password", type="password")

            if password:
                decrypted = decrypt_pdf(temp_path, password)
                if decrypted:
                    final_path = decrypted
                    st.success(":white_check_mark: PDF decrypted")
                else:
                    st.error(":x: Wrong password")
                    st.stop()
            else:
                st.stop()

        df = extract_pdf_tables(final_path)

    # ----------- EXCEL FLOW ----------- #
    elif suffix == ".xlsx":
        df = try_read_excel(temp_path)

        if df is None:
            st.warning(":closed_lock_with_key: Excel might be password-protected")
            password = st.text_input("Enter Excel Password", type="password")

            if password:
                decrypted = decrypt_excel(temp_path, password)
                if decrypted:
                    df = pd.read_excel(decrypted)
                    st.success(":white_check_mark: Excel decrypted")
                else:
                    st.error(":x: Wrong password")
                    st.stop()
            else:
                st.stop()

    # ----------- OUTPUT ----------- #
    if df is not None:
        st.success(":white_check_mark: Data extracted")
        st.dataframe(df, use_container_width=True)

        csv = df.to_csv(index=False).encode("utf-8")
        st.download_button(
            ":arrow_down: Download CSV",
            data=csv,
            file_name="output.csv",
            mime="text/csv"
        )
    else:
        st.error(":x: Could not extract data")

    os.remove(temp_path)