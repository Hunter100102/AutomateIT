import sys
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import io
import base64

file_path = sys.argv[1]

if file_path.endswith('.csv'):
    df = pd.read_csv(file_path)
else:
    df = pd.read_excel(file_path)

# Simple summary
summary = df.describe(include='all').to_string()
nulls = df.isnull().sum().to_string()
insights = f"Summary:\n{summary}\n\nMissing Values:\n{nulls}"

# Generate a plot (if numeric data exists)
numeric_cols = df.select_dtypes(include=['number']).columns
chart_base64 = ''
if len(numeric_cols) >= 1:
    plt.figure(figsize=(8, 5))
    sns.histplot(df[numeric_cols[0]].dropna(), kde=True)
    plt.title(f'Distribution of {numeric_cols[0]}')

    buffer = io.BytesIO()
    plt.savefig(buffer, format='png')
    buffer.seek(0)
    chart_base64 = base64.b64encode(buffer.read()).decode('utf-8')
    buffer.close()

print(insights)
print("---chart---")
print(chart_base64)
