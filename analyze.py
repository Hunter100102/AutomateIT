# analyze.py
import sys, os, re, base64
import matplotlib
matplotlib.use('Agg')  # headless for servers
import matplotlib.pyplot as plt
import pandas as pd
from io import BytesIO

def clean(s: str) -> str:
    """normalize column names: lowercase, strip, remove non-alphanum"""
    s = (s or "").strip().lower()
    s = re.sub(r'\s+', ' ', s)
    s = re.sub(r'[^a-z0-9]+', '', s)
    return s

# Accept both .xlsx and .csv
file_path = sys.argv[1]
ext = os.path.splitext(file_path)[1].lower()

try:
    if ext in ('.xlsx', '.xls'):
        df = pd.read_excel(file_path, engine='openpyxl')
    elif ext == '.csv':
        df = pd.read_csv(file_path)
    else:
        print(f"Unsupported file type: {ext}", file=sys.stderr)
        sys.exit(1)
except Exception as e:
    print(f"Failed to read file: {e}", file=sys.stderr)
    sys.exit(1)

# Drop fully-empty rows/cols
df = df.dropna(how='all', axis=1).dropna(how='all')

if df.empty:
    print("The uploaded file is empty after cleaning.", file=sys.stderr)
    sys.exit(1)

# Build a lookup of normalized column name -> original
norm_map = {clean(c): c for c in df.columns if isinstance(c, str)}

# Candidate header names (normalized forms)
DESC_CANDIDATES = [
    'description','item','name','expense','category','details','service','title'
]
MONTH_CANDIDATES = [
    'costpermonth','monthlycost','permonth','month','monthly','costmonth','amountpermonth'
]
YEAR_CANDIDATES = [
    'costperyear','annualcost','peryear','yearly','year','costyear','amountperyear'
]
TOTAL_CANDIDATES = [
    'total','amount','price','cost','fee'
]

def find_col(candidates):
    for key in candidates:
        if key in norm_map:
            return norm_map[key]
    return None

desc_col  = find_col(DESC_CANDIDATES)
month_col = find_col(MONTH_CANDIDATES)
year_col  = find_col(YEAR_CANDIDATES)
total_col = find_col(TOTAL_CANDIDATES)

# If we still didn't find description, try any text-like column
if desc_col is None:
    # Pick the first object dtype col with diverse values
    text_cols = [c for c in df.columns if df[c].dtype == object]
    desc_col = text_cols[0] if text_cols else df.columns[0]

# Create working frame with safe names
work = pd.DataFrame()
work['Description'] = df[desc_col].astype(str)

def numify(series):
    return pd.to_numeric(series, errors='coerce')

# Prefer explicit monthly/yearly; otherwise derive from a single "total" if present
if month_col:
    work['Cost Per Month'] = numify(df[month_col])
else:
    work['Cost Per Month'] = pd.NA

if year_col:
    work['Cost Per Year'] = numify(df[year_col])
else:
    work['Cost Per Year'] = pd.NA

# If only month present, compute year
if work['Cost Per Month'].notna().any() and work['Cost Per Year'].isna().all():
    work['Cost Per Year'] = work['Cost Per Month'] * 12

# If only year present, compute month
if work['Cost Per Year'].notna().any() and work['Cost Per Month'].isna().all():
    work['Cost Per Month'] = work['Cost Per Year'] / 12

# If neither present but a generic total exists, treat it as monthly
if work['Cost Per Month'].isna().all() and work['Cost Per Year'].isna().all() and total_col:
    total_vals = numify(df[total_col])
    # Heuristic: assume monthly totals unless the average looks > 10x a typical monthly
    if total_vals.dropna().median() > 10_000:  # arbitrary heuristic; adjust if needed
        work['Cost Per Year'] = total_vals
        work['Cost Per Month'] = total_vals / 12
    else:
        work['Cost Per Month'] = total_vals
        work['Cost Per Year']  = total_vals * 12

# Coerce numerics and fill NaNs with 0 for calculations
work['Cost Per Month'] = pd.to_numeric(work['Cost Per Month'], errors='coerce').fillna(0.0)
work['Cost Per Year']  = pd.to_numeric(work['Cost Per Year'],  errors='coerce').fillna(0.0)

# If after all that we still have all zeros, fail with a friendly error
if (work['Cost Per Month'].sum() == 0) and (work['Cost Per Year'].sum() == 0):
    print(
        "Could not find usable cost columns. "
        "Please include either a monthly or yearly cost column "
        "(e.g., 'Monthly Cost', 'Cost Per Month', 'Annual', or 'Cost Per Year').",
        file=sys.stderr
    )
    sys.exit(1)

# Aggregate duplicates (same description)
agg = work.groupby('Description', as_index=False).sum(numeric_only=True)

# Basic insights
top_n = agg.sort_values('Cost Per Month', ascending=False).head(5)
total_month = agg['Cost Per Month'].sum()
total_year  = agg['Cost Per Year'].sum()

insights = []
insights.append(f"Total Monthly Cost: ${total_month:,.2f}")
insights.append(f"Total Yearly Cost:  ${total_year:,.2f}")
if not top_n.empty:
    insights.append("Top Monthly Expenses:")
    for _, r in top_n.iterrows():
        insights.append(f" - {r['Description']}: ${r['Cost Per Month']:,.2f}/mo")

insights_text = "\n".join(insights)

# Chart
plt.figure(figsize=(8, 4.5), dpi=110)
plot_data = agg.sort_values('Cost Per Month', ascending=True).tail(10)
plt.barh(plot_data['Description'], plot_data['Cost Per Month'])
plt.xlabel('Monthly Cost (USD)')
plt.ylabel('Expense')
plt.title('Top Expenses (Monthly)')
plt.tight_layout()

buf = BytesIO()
plt.savefig(buf, format='png')
buf.seek(0)
chart_b64 = base64.b64encode(buf.read()).decode('utf-8')

# Output protocol expected by server.js
print(insights_text.strip())
print('---chart---')
print(chart_b64)
print('---table---')
print(work.to_html(index=False, classes='expense-table', border=0))
