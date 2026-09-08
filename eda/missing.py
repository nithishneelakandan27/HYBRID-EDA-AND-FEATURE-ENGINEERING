import pandas as pd
from typing import Dict, Any, List

class MissingValueAnalyzer:
    @staticmethod
    def analyze(df: pd.DataFrame) -> Dict[str, Any]:
        """
        Analyzes dataset missingness generically.
        """
        total_rows = len(df)
        total_cols = len(df.columns)
        total_cells = total_rows * total_cols
        
        missing_series = df.isnull().sum()
        total_missing = int(missing_series.sum())
        
        if total_cells == 0 or total_missing == 0:
            return {
                "has_missing_values": False,
                "total_missing_values": 0,
                "overall_missing_percentage": 0.0,
                "columns_with_missing": [],
                "missingness_ranking": [],
                "chart_data": None
            }

        columns_missing = []
        for col in df.columns:
            m_count = int(missing_series[col])
            if m_count > 0:
                m_pct = float((m_count / total_rows * 100) if total_rows > 0 else 0.0)
                columns_missing.append({
                    "column_name": str(col),
                    "missing_count": m_count,
                    "missing_percentage": round(m_pct, 2)
                })

        # Rank by missing count descending
        columns_missing.sort(key=lambda x: x["missing_count"], reverse=True)

        # Prepare chart data for top missing columns (up to 15 columns for visual clarity)
        chart_data = {
            "labels": [item["column_name"] for item in columns_missing[:15]],
            "percentages": [item["missing_percentage"] for item in columns_missing[:15]],
            "counts": [item["missing_count"] for item in columns_missing[:15]]
        }

        overall_pct = float((total_missing / total_cells * 100) if total_cells > 0 else 0.0)

        return {
            "has_missing_values": True,
            "total_missing_values": total_missing,
            "overall_missing_percentage": round(overall_pct, 2),
            "columns_with_missing": columns_missing,
            "missingness_ranking": columns_missing,
            "chart_data": chart_data
        }
