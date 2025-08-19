import io, os, base64
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles

from openai import OpenAI

# === Config ===
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
client = OpenAI(api_key=OPENAI_API_KEY)

app = FastAPI()
app.mount("/", StaticFiles(directory=".", html=True), name="static")

# ---------- Helpers ----------
def read_df(filename: str, data: bytes) -> pd.DataFrame:
    name = filename.lower()
    if name.endswith(".csv"):
        return pd.read_csv(io.BytesIO(data))
    elif name.endswith(".xlsx"):
        return pd.read_excel(io.BytesIO(data))
    try:
        return pd.read_csv(io.BytesIO(data))
    except Exception:
        return pd.read_excel(io.BytesIO(data))

def df_html(df: pd.DataFrame, max_rows=200) -> str:
    return df.head(max_rows).to_html(classes="expense-table", border=0, index=False)

def quick_summary(df: pd.DataFrame) -> str:
    rows, cols = df.shape
    summary = [f"Dataset has {rows} rows × {cols} columns."]
    num_cols = df.select_dtypes(include="number").columns.tolist()
    if num_cols:
        c = num_cols[0]
        s = df[c].dropna()
        summary.append(f"Numeric column '{c}': sum={s.sum():,.2f}, mean={s.mean():,.2f}")
    return "\n".join(summary)

def make_chart(df: pd.DataFrame) -> str | None:
    num_cols = df.select_dtypes(include="number").columns.tolist()
    if not num_cols:
        return None
    col = num_cols[0]
    try:
        fig = plt.figure(figsize=(6,4))
        df[col].dropna().plot(kind="hist", bins=20, title=f"Distribution of {col}")
        buf = io.BytesIO()
        plt.savefig(buf, format="png"); plt.close(fig)
        return base64.b64encode(buf.getvalue()).decode("utf-8")
    except Exception:
        return None

def ai_commentary(summary: str) -> str:
    if not client:
        return summary + "\n(OpenAI key not configured.)"
    resp = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": "You are a helpful data analyst. Give clear, practical insights based ONLY on the summary."},
            {"role": "user", "content": summary}
        ],
        temperature=0.4,
    )
    return summary + "\n\nAI Insights:\n" + resp.choices[0].message.content

# ---------- Routes ----------
@app.get("/favicon.ico")
def favicon():
    if os.path.exists("./favicon.ico"):
        return FileResponse("./favicon.ico")
    return JSONResponse(content=None, status_code=204)

@app.post("/api/analyze-data")
async def analyze_data(
    datafile: UploadFile = File(...),
    use_ai: str = Form("0")
):
    try:
        raw = await datafile.read()
        df = read_df(datafile.filename or "upload", raw)
        if df.empty:
            return {"ok": False, "error": "No rows found."}

        df.columns = [str(c).strip() for c in df.columns]
        summary = quick_summary(df)
        table = df_html(df)
        chart_b64 = make_chart(df)

        insights = ai_commentary(summary) if use_ai == "1" else summary

        return {"ok": True, "insights": insights, "chart": chart_b64, "table": table}
    except Exception as e:
        return {"ok": False, "error": str(e)}
