import sys
import pandas as pd
import matplotlib.pyplot as plt
import base64
from io import BytesIO

# Load Excel file
file_path = sys.argv[1]
df = pd.read_excel(file_path)

# Clean data
df = df.dropna(how='all', axis=1).dropna(how='all')
df = df[['Description', 'Cost Per Month', 'Cost Per Year']]
df['Cost Per Month'] = pd.to_numeric(df['Cost Per Month'], errors='coerce').fillna(0)
df['Cost Per Year'] = pd.to_numeric(df['Cost Per Year'], errors='coerce').fillna(0)
df['Description'] = df['Description'].astype(str)

# Create insights
total_monthly = df['Cost Per Month'].sum()
total_yearly = df['Cost Per Year'].sum()
insights = f"""
📊 Summary of Expenses
---------------------
Total Monthly Cost: ${total_monthly:.2f}
Total Yearly Cost: ${total_yearly:.2f}
Average Monthly Cost per Item: ${df['Cost Per Month'].mean():.2f}
Average Yearly Cost per Item: ${df['Cost Per Year'].mean():.2f}
Highest Yearly Expense: {df.loc[df['Cost Per Year'].idxmax(), 'Description']} (${df['Cost Per Year'].max():.2f})
"""

# Create chart
plt.figure(figsize=(10, 5))
df_sorted = df.sort_values('Cost Per Year', ascending=False)
plt.bar(df_sorted['Description'], df_sorted['Cost Per Year'])
plt.xticks(rotation=45, ha='right')
plt.title('Yearly Cost by Expense Category')
plt.tight_layout()

# Encode chart
buffer = BytesIO()
plt.savefig(buffer, format='png')
buffer.seek(0)
chart_base64 = base64.b64encode(buffer.read()).decode('utf-8')

# Output
print(insights.strip())
print('---chart---')
print(chart_base64)
print('---table---')
print(df.to_html(index=False, classes='expense-table', border=0))
