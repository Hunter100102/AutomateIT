import sys
import os
import pandas as pd
import numpy as np
from scipy.stats import skew, kurtosis
import matplotlib.pyplot as plt

file_path = sys.argv[1]

try:
    if file_path.endswith(".csv"):
        df = pd.read_csv(file_path)
    else:
        df = pd.read_excel(file_path)

    rows, cols = df.shape
    summary = f"📊 File has {rows} rows and {cols} columns.\n\n"
    numeric_df = df.select_dtypes(include=[np.number])

    if numeric_df.empty:
        summary += "No numeric columns to analyze.\n"
    else:
        summary += "🔢 Numeric Insights:\n"
        for col in numeric_df.columns:
            data = numeric_df[col].dropna()
            if data.empty: continue
            summary += f"\n📌 {col}:\n"
            summary += f"  Count: {data.count()}\n"
            summary += f"  Mean: {data.mean():.2f}, Median: {data.median():.2f}, Std: {data.std():.2f}\n"
            summary += f"  Skewness: {skew(data):.2f}, Kurtosis: {kurtosis(data):.2f}\n"

            outliers = data[(data < data.quantile(0.25) - 1.5 * data.std()) | (data > data.quantile(0.75) + 1.5 * data.std())]
            summary += f"  Outliers: {len(outliers)}\n"
            if skew(data) > 1: summary += "  👉 Skewed right (few large values).\n"
            elif skew(data) < -1: summary += "  👉 Skewed left (few small values).\n"
            else: summary += "  ✅ Fairly symmetric distribution.\n"

        # Generate a simple bar chart of mean values
        means = numeric_df.mean()
        plt.figure(figsize=(8, 5))
        means.plot(kind="bar", color="skyblue")
        plt.title("Average Value per Column")
        plt.ylabel("Mean")
        plt.xticks(rotation=45)
        plt.tight_layout()

        os.makedirs("results", exist_ok=True)
        plt.savefig("results/chart.png")

    print(summary)

except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
    sys.exit(1)
finally:
    if os.path.exists(file_path):
        os.remove(file_path)
