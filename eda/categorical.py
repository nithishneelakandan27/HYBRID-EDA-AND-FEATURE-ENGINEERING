import pandas as pd
from typing import Dict, Any, List

class CategoricalAnalyzer:
    @staticmethod
    def analyze(df: pd.DataFrame, max_categories_in_chart: int = 10, max_cardinality_threshold: int = 25) -> Dict[str, Any]:
        """
        Analyzes categorical and text columns. Summarizes high cardinality columns
        statistically and prepares frequency charts for manageable cardinality columns.
        """
        cat_cols = df.select_dtypes(exclude=['number']).columns.tolist()
        num_rows = len(df)

        if not cat_cols:
            return {
                "categorical_column_count": 0,
                "column_summaries": [],
                "visualizations": []
            }

        column_summaries = []
        visualizations = []

        for col in cat_cols:
            series = df[col].dropna()
            missing_count = int(df[col].isnull().sum())
            unique_count = int(series.nunique())
            cardinality = float((unique_count / num_rows) if num_rows > 0 else 0.0)

            mode_val = series.mode()
            top_value = str(mode_val.iloc[0]) if not mode_val.empty else None
            top_freq = int(series.value_counts().iloc[0]) if not series.empty else 0
            top_pct = float((top_freq / num_rows * 100) if num_rows > 0 else 0.0)

            is_high_cardinality = (unique_count > max_cardinality_threshold) or (cardinality > 0.5 and num_rows > 10)

            summary = {
                "column_name": str(col),
                "unique_count": unique_count,
                "cardinality": round(cardinality, 4),
                "missing_count": missing_count,
                "most_frequent_value": top_value,
                "most_frequent_frequency": top_freq,
                "most_frequent_percentage": round(top_pct, 2),
                "is_high_cardinality": is_high_cardinality
            }
            column_summaries.append(summary)

            # Generate chart data only for manageable cardinality columns
            if not is_high_cardinality and unique_count > 0:
                val_counts = series.value_counts().head(max_categories_in_chart)
                chart_data = {
                    "labels": [str(k) for k in val_counts.index],
                    "counts": [int(v) for v in val_counts.values],
                    "percentages": [round(float(v / num_rows * 100), 2) for v in val_counts.values]
                }
                visualizations.append({
                    "column_name": str(col),
                    "chart_data": chart_data
                })

        return {
            "categorical_column_count": len(cat_cols),
            "column_summaries": column_summaries,
            "visualizations": visualizations
        }
