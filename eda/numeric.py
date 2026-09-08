import pandas as pd
import numpy as np
from typing import Dict, Any, List

class NumericAnalyzer:
    @staticmethod
    def analyze(df: pd.DataFrame, max_visualized_cols: int = 10) -> Dict[str, Any]:
        """
        Analyzes numeric columns, calculates distribution stats, skewness, boxplots,
        and histogram binning data.
        """
        numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
        
        if not numeric_cols:
            return {
                "numeric_column_count": 0,
                "column_summaries": [],
                "visualizations": []
            }

        column_summaries = []
        visualizations = []

        # Sort columns to prioritize interesting ones (highly skewed or high variance)
        col_interest_scores = []

        for col in numeric_cols:
            series = df[col].dropna()
            if series.empty:
                continue

            num_rows = len(df)
            min_val = float(series.min())
            max_val = float(series.max())
            mean_val = float(series.mean())
            median_val = float(series.median())
            std_val = float(series.std()) if len(series) > 1 else 0.0
            var_val = float(series.var()) if len(series) > 1 else 0.0
            skew_val = float(series.skew()) if len(series) > 2 else 0.0

            q1 = float(series.quantile(0.25))
            q3 = float(series.quantile(0.75))
            iqr = q3 - q1
            lower_bound = q1 - 1.5 * iqr
            upper_bound = q3 + 1.5 * iqr
            outliers = series[(series < lower_bound) | (series > upper_bound)]
            outlier_count = int(len(outliers))
            outlier_pct = float((outlier_count / num_rows * 100) if num_rows > 0 else 0.0)

            summary = {
                "column_name": str(col),
                "count": int(len(series)),
                "min": round(min_val, 4),
                "max": round(max_val, 4),
                "mean": round(mean_val, 4),
                "median": round(median_val, 4),
                "std": round(std_val, 4),
                "variance": round(var_val, 4),
                "skewness": round(skew_val, 4),
                "q1": round(q1, 4),
                "q3": round(q3, 4),
                "iqr": round(iqr, 4),
                "outlier_count": outlier_count,
                "outlier_percentage": round(outlier_pct, 2)
            }
            column_summaries.append(summary)

            # Score for visualization priority (higher score = more interesting)
            score = abs(skew_val) + (outlier_pct / 10.0)
            col_interest_scores.append((str(col), score, series, summary))

        # Sort by interest score descending
        col_interest_scores.sort(key=lambda x: x[1], reverse=True)

        # Select top N for histogram/boxplot visualization
        selected_for_viz = col_interest_scores[:max_visualized_cols]

        for col_name, _, series, summary in selected_for_viz:
            # Generate histogram data using numpy
            counts, bin_edges = np.histogram(series, bins=10)
            histogram = {
                "bin_edges": [round(float(b), 2) for b in bin_edges],
                "counts": [int(c) for c in counts]
            }

            boxplot = {
                "min": summary["min"],
                "q1": summary["q1"],
                "median": summary["median"],
                "q3": summary["q3"],
                "max": summary["max"],
                "outliers_sample": [round(float(x), 2) for x in series[(series < summary["q1"] - 1.5*summary["iqr"]) | (series > summary["q3"] + 1.5*summary["iqr"])].head(10).tolist()]
            }

            visualizations.append({
                "column_name": col_name,
                "skewness": summary["skewness"],
                "histogram": histogram,
                "boxplot": boxplot
            })

        return {
            "numeric_column_count": len(numeric_cols),
            "column_summaries": column_summaries,
            "visualizations": visualizations
        }
