import pandas as pd
from typing import Dict, Any, List

class OutlierAnalyzer:
    @staticmethod
    def analyze(df: pd.DataFrame, outlier_pct_threshold: float = 1.0) -> Dict[str, Any]:
        """
        Analyzes IQR-based outliers across numeric columns without modifying data.
        """
        numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
        num_rows = len(df)

        if not numeric_cols or num_rows == 0:
            return {
                "has_outliers": False,
                "total_outlier_instances": 0,
                "outlier_columns_count": 0,
                "outlier_columns": []
            }

        outlier_columns = []
        total_outlier_instances = 0

        for col in numeric_cols:
            series = df[col].dropna()
            if series.empty:
                continue

            q1 = float(series.quantile(0.25))
            q3 = float(series.quantile(0.75))
            iqr = q3 - q1
            lower_bound = q1 - 1.5 * iqr
            upper_bound = q3 + 1.5 * iqr

            outliers = series[(series < lower_bound) | (series > upper_bound)]
            o_count = int(len(outliers))
            o_pct = float((o_count / num_rows * 100) if num_rows > 0 else 0.0)

            if o_count > 0:
                total_outlier_instances += o_count
                outlier_columns.append({
                    "column_name": str(col),
                    "outlier_count": o_count,
                    "outlier_percentage": round(o_pct, 2),
                    "lower_bound": round(lower_bound, 4),
                    "upper_bound": round(upper_bound, 4),
                    "min": round(float(series.min()), 4),
                    "max": round(float(series.max()), 4),
                    "q1": round(q1, 4),
                    "median": round(float(series.median()), 4),
                    "q3": round(q3, 4),
                    "iqr": round(iqr, 4)
                })

        # Rank columns by outlier count descending
        outlier_columns.sort(key=lambda x: x["outlier_count"], reverse=True)

        return {
            "has_outliers": len(outlier_columns) > 0,
            "total_outlier_instances": total_outlier_instances,
            "outlier_columns_count": len(outlier_columns),
            "outlier_columns": outlier_columns
        }
