# analyze.py
import sys, os, re, base64, math
import matplotlib
matplotlib.use('Agg')  # headless
import matplotlib.pyplot as plt
import pandas as pd
from io import BytesIO

# -------------------- Helpers --------------------
def clean(s: str) -> str:
    s = (s or "").strip().lower()
    s = re.sub(r'\s+', ' ', s)
    s = re.sub(r'[^a-z0-9]+', '', s)
    return s

def try_read(file_path: str, ext_hint: str | None = None) -> pd.DataFrame:
    # Guided attempts
    if ext_hint == '.csv':
        for enc in (None, 'latin-1'):
            try:
                return pd.read_csv(file_path, encoding=enc) if enc else pd.read_csv(file_path)
            except Exception:
                pass
    if ext_hint in ('.xlsx', '.xlsm', '.xls'):
        # Prefer openpyxl; then generic
        for args in (dict(engine='openpyxl'), dict()):
            try:
                return pd.read_excel(file_path, **args)
            except Exception:
                pass
    # Fallbacks when no/odd extension
    # CSV utf-8, then latin-1
    for enc in (None, 'latin-1'):
        try:
            return pd.read_csv(file_path, encoding=enc) if enc else pd.read_csv(file_path)
        except Exception:
            pass
    # Excel openpyxl, then generic
    for args in (dict(engine='openpyxl'), dict()):
        try:
            return pd.read_excel(file_path, **args)
        except Exception:
            pass
    print("Failed to read file as CSV or Excel (tried utf-8/latin-1 and openpyxl/generic).", file=sys.stderr)
    sys.exit(1)

def numify(series: pd.Series) -> pd.Series:
    return pd.to_numeric(series, errors='coerce')

def to_b64_current_fig() -> str:
    buf = BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight')
    buf.seek(0)
    return base64.b64encode(buf.read()).decode('utf-8')

# -------------------- Load file --------------------
if len(sys.argv) < 2:
    print("No file path provided to analyzer.", file=sys.stderr)
    sys.exit(1)

file_path = sys.argv[1]
ext = os.path.splitext(file_path)[1].lower()
df = try_read(file_path, ext_hint=ext if ext in ('.csv', '.xlsx', '.xlsm', '.xls') else None)

# Basic cleaning
df = df.dropna(how='all', axis=1).dropna(how='all')
if df.empty:
    print("The uploaded file is empty after cleaning.", file=sys.stderr)
    sys.exit(1)

# -------------------- Attempt: Expense-style pipeline --------------------
norm_map = {clean(c): c for c in df.columns if isinstance(c, str)}

DESC_CANDIDATES  = ['description','item','name','expense','category','details','service','title']
MONTH_CANDIDATES = ['costpermonth','monthlycost','permonth','month','monthly','costmonth','amountpermonth']
YEAR_CANDIDATES  = ['costperyear','annualcost','peryear','yearly','year','costyear','amountperyear']
TOTAL_CANDIDATES = ['total','amount','price','cost','fee']

def find_col(candidates):
    for key in candidates:
        if key in norm_map:
            return norm_map[key]
    return None

desc_col  = find_col(DESC_CANDIDATES)
month_col = find_col(MONTH_CANDIDATES)
year_col  = find_col(YEAR_CANDIDATES)
total_col = find_col(TOTAL_CANDIDATES)

def expense_mode():
    # if we can’t find anything numeric that makes sense, return None to trigger generic mode
    # Pick a description column (fallback to first)
    _desc = desc_col
    if _desc is None:
        text_cols = [c for c in df.columns if df[c].dtype == object]
        _desc = text_cols[0] if text_cols else df.columns[0]

    work = pd.DataFrame()
    work['Description'] = df[_desc].astype(str)

    # Prefer explicit monthly/yearly; otherwise derive; else try generic total
    if month_col:
        work['Cost Per Month'] = numify(df[month_col])
    else:
        work['Cost Per Month'] = pd.NA

    if year_col:
        work['Cost Per Year'] = numify(df[year_col])
    else:
        work['Cost Per Year'] = pd.NA

    if work['Cost Per Month'].notna().any() and work['Cost Per Year'].isna().all():
        work['Cost Per Year'] = work['Cost Per Month'] * 12

    if work['Cost Per Year'].notna().any() and work['Cost Per Month'].isna().all():
        work['Cost Per Month'] = work['Cost Per Year'] / 12

    if work['Cost Per Month'].isna().all() and work['Cost Per Year'].isna().all() and total_col:
        total_vals = numify(df[total_col])
        med = float(total_vals.dropna().median()) if total_vals.dropna().size else 0.0
        if med > 10_000:
            work['Cost Per Year'] = total_vals
            work['Cost Per Month'] = total_vals / 12
        else:
            work['Cost Per Month'] = total_vals
            work['Cost Per Year']  = total_vals * 12

    work['Cost Per Month'] = pd.to_numeric(work['Cost Per Month'], errors='coerce').fillna(0.0)
    work['Cost Per Year']  = pd.to_numeric(work['Cost Per Year'],  errors='coerce').fillna(0.0)

    if (work['Cost Per Month'].sum() == 0) and (work['Cost Per Year'].sum() == 0):
        return None  # trigger generic

    # Aggregate & insights
    agg = work.groupby('Description', as_index=False).sum(numeric_only=True)
    top_n = agg.sort_values('Cost Per Month', ascending=False).head(5)
    total_month = float(agg['Cost Per Month'].sum())
    total_year  = float(agg['Cost Per Year'].sum())

    insights = []
    insights.append(f"Total Monthly Cost: ${total_month:,.2f}")
    insights.append(f"Total Yearly Cost:  ${total_year:,.2f}")
    if not top_n.empty:
        insights.append("Top Monthly Expenses:")
        for _, r in top_n.iterrows():
            insights.append(f" - {str(r['Description'])}: ${float(r['Cost Per Month']):,.2f}/mo")

    # Chart: top 10 monthly
    plt.figure(figsize=(8, 4.5), dpi=110)
    plot_data = agg.sort_values('Cost Per Month', ascending=True).tail(10)
    plt.barh(plot_data['Description'], plot_data['Cost Per Month'])
    plt.xlabel('Monthly Cost (USD)')
    plt.ylabel('Expense')
    plt.title('Top Expenses (Monthly)')
    plt.tight_layout()

    chart_b64 = to_b64_current_fig()
    table_html = work.head(200).to_html(index=False, classes='expense-table', border=0)

    return "\n".join(insights), chart_b64, table_html

# -------------------- Generic EDA fallback --------------------
def generic_mode():
    # Infer types
    preview_rows = min(200, len(df))
    df_preview = df.head(preview_rows).copy()

    # Try to detect date columns
    date_cols = []
    for col in df.columns:
        if pd.api.types.is_datetime64_any_dtype(df[col]):
            date_cols.append(col)
        else:
            # soft parse with low error tolerance
            if df[col].dtype == object:
                try:
                    dt = pd.to_datetime(df[col], errors='coerce', infer_datetime_format=True)
                    if dt.notna().mean() > 0.6:  # at least 60% parse success
                        date_cols.append(col)
                        # convert a copy for plotting logic
                        df[col] = dt
                except Exception:
                    pass

    numeric_cols = [c for c in df.columns if pd.api.types.is_numeric_dtype(df[c])]
    cat_cols = [c for c in df.columns if df[c].dtype == object]

    # Build insights
    n_rows, n_cols = df.shape
    missing_counts = df.isna().sum().sort_values(ascending=False)
    missing_top = missing_counts.head(5)
    insights = []
    insights.append(f"Rows: {n_rows:,} | Columns: {n_cols:,}")
    if not numeric_cols:
        insights.append("Numeric columns: 0 (will avoid numeric-only stats)")
    else:
        insights.append(f"Numeric columns: {len(numeric_cols)}")
    if date_cols:
        insights.append(f"Detected date-like column(s): {', '.join(map(str, date_cols[:3]))}"
                        + ("..." if len(date_cols) > 3 else ""))
    if cat_cols:
        insights.append(f"Categorical columns: {len(cat_cols)}")
    if missing_top.any():
        insights.append("Most missing values (top 5 columns):")
        for col, cnt in missing_top.items():
            if cnt > 0:
                pct = (cnt / n_rows) * 100 if n_rows else 0
                insights.append(f" - {col}: {cnt:,} ({pct:.1f}%)")

    # Add simple numeric summary for first few numeric columns
    if numeric_cols:
        desc = df[numeric_cols].describe().T  # count, mean, std, min, 25%, 50%, 75%, max
        # compact insight lines
        for col in numeric_cols[:3]:
            try:
                row = desc.loc[col]
                insights.append(
                    f"{col}: mean={row['mean']:.3g}, median={df[col].median():.3g}, "
                    f"min={row['min']:.3g}, max={row['max']:.3g}"
                )
            except Exception:
                pass

    # Choose a chart strategy:
    chart_title = None
    plt.figure(figsize=(8, 4.5), dpi=110)
    plotted = False

    # 1) If we have a date column and a numeric, plot a time series (sum by date)
    if date_cols and numeric_cols:
        date_col = date_cols[0]
        num_col = numeric_cols[0]
        df_ts = df[[date_col, num_col]].dropna()
        if not df_ts.empty:
            df_ts = df_ts.groupby(pd.to_datetime(df_ts[date_col]).dt.to_period('D')).sum(numeric_only=True)
            df_ts.index = df_ts.index.to_timestamp()
            df_ts = df_ts.sort_index().tail(180)  # last ~6 months if daily
            if not df_ts.empty:
                df_ts[num_col].plot()
                plt.xlabel('Date')
                plt.ylabel(num_col)
                chart_title = f"{num_col} over time"
                plotted = True

    # 2) Else if we have a categorical and a numeric, show top categories by sum
    if not plotted and cat_cols and numeric_cols:
        cat_col = None
        # choose a categorical with reasonable cardinality (2–50 unique)
        for c in cat_cols:
            uniq = df[c].nunique(dropna=True)
            if 2 <= uniq <= 50:
                cat_col = c
                break
        if cat_col is None:
            # fallback: the categorical with the smallest unique set >1
            candidates = [(c, df[c].nunique(dropna=True)) for c in cat_cols if df[c].nunique(dropna=True) > 1]
            if candidates:
                candidates.sort(key=lambda x: x[1])
                cat_col = candidates[0][0]

        if cat_col:
            num_col = numeric_cols[0]
            group = df.groupby(cat_col, dropna=True)[num_col].sum(numeric_only=True).sort_values(ascending=False)
            group = group.head(10)
            if not group.empty:
                group.plot(kind='barh')
                plt.xlabel(f"Sum of {num_col}")
                plt.ylabel(cat_col)
                chart_title = f"Top categories by {num_col}"
                plotted = True

    # 3) Else if we have any numeric, show a histogram
    if not plotted and numeric_cols:
        num_col = numeric_cols[0]
        series = df[num_col].dropna()
        if not series.empty and (series.max() > series.min()):
            # pick a reasonable bins count
            bins = 20
            try:
                bins = min(50, max(10, int(math.sqrt(series.size))))
            except Exception:
                pass
            plt.hist(series, bins=bins)
            plt.xlabel(num_col)
            plt.ylabel('Frequency')
            chart_title = f"Distribution of {num_col}"
            plotted = True

    # 4) Absolute fallback: bar of row count
    if not plotted:
        plt.bar(['Rows'], [len(df)])
        plt.ylabel('Count')
        chart_title = 'Row Count'

    plt.title(chart_title)
    plt.tight_layout()
    chart_b64 = to_b64_current_fig()

    # Build a friendly preview table
    try:
        table_html = df_preview.to_html(index=False, classes='expense-table', border=0)
    except Exception:
        table_html = pd.DataFrame({"preview_error": ["Could not render preview table"]}).to_html(index=False)

    return "\n".join(insights), chart_b64, table_html

# -------------------- Execute modes & print protocol --------------------
expense_result = expense_mode()
if expense_result is not None:
    insights_text, chart_b64, table_html = expense_result
else:
    # Switch to generic profiling
    insights_text, chart_b64, table_html = generic_mode()

print(insights_text.strip())
print('---chart---')
print(chart_b64)
print('---table---')
print(table_html)
