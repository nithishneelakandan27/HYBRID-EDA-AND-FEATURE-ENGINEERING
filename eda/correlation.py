import pandas as pd
import numpy as np
from typing import Dict, Any, List

class CorrelationAnalyzer:
    @staticmethod
    def analyze(df: pd.DataFrame, high_corr_threshold: float = 0.70, max_cols_matrix: int = 15) -> Dict[str, Any]:
        """
        Computes Pearson correlation matrix and identifies highly correlated feature pairs.
        """
        numeric_df = df.select_dtypes(include=['number'])
        numeric_cols = numeric_df.columns.tolist()

        if len(numeric_cols) < 2:
            return {
                "can_compute_correlation": False,
                "reason": "At least 2 numeric columns are required to compute correlation.",
                "numeric_column_count": len(numeric_cols),
                "correlation_matrix": None,
                "high_correlation_pairs": []
            }

        # Drop constant columns (std == 0) to avoid NaN correlation matrix
        valid_cols = [col for col in numeric_cols if numeric_df[col].dropna().std() > 0]
        
        if len(valid_cols) < 2:
            return {
                "can_compute_correlation": False,
                "reason": "Fewer than 2 non-constant numeric columns available for correlation.",
                "numeric_column_count": len(numeric_cols),
                "correlation_matrix": None,
                "high_correlation_pairs": []
            }

        # Compute Pearson correlation matrix
        corr_matrix = numeric_df[valid_cols].corr(method='pearson').round(4)
        
        # Extract highly correlated pairs (upper triangle)
        high_corr_pairs = []
        cols = corr_matrix.columns.tolist()
        
        for i in range(len(cols)):
            for j in range(i + 1, len(cols)):
                c1, c2 = cols[i], cols[j]
                r_val = float(corr_matrix.loc[c1, c2])
                if not np.isnan(r_val) and abs(r_val) >= high_corr_threshold:
                    high_corr_pairs.append({
                        "column_1": str(c1),
                        "column_2": str(c2),
                        "correlation": round(r_val, 4),
                        "abs_correlation": round(abs(r_val), 4)
                    })

        # Sort pairs by absolute correlation descending
        high_corr_pairs.sort(key=lambda x: x["abs_correlation"], reverse=True)

        # Prepare correlation matrix object for frontend table/heatmap
        # Cap columns for display matrix if dataset has too many numeric columns
        display_cols = valid_cols[:max_cols_matrix]
        matrix_dict = {
            "columns": [str(c) for c in display_cols],
            "data": [[round(float(corr_matrix.loc[c1, c2]), 4) if not np.isnan(corr_matrix.loc[c1, c2]) else 0.0 for c2 in display_cols] for c1 in display_cols]
        }

        return {
            "can_compute_correlation": True,
            "numeric_column_count": len(numeric_cols),
            "valid_numeric_column_count": len(valid_cols),
            "correlation_matrix": matrix_dict,
            "high_correlation_pairs": high_corr_pairs
        }
