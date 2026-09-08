from typing import Dict, Any, List

class FindingsGenerator:
    @staticmethod
    def generate_findings(
        missing_res: Dict[str, Any],
        numeric_res: Dict[str, Any],
        categorical_res: Dict[str, Any],
        correlation_res: Dict[str, Any],
        outlier_res: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Dynamically generates interpretable natural language findings from statistical results.
        No hardcoded dataset column names or domain assumptions.
        """
        findings = []

        # 1. Missingness Findings
        if missing_res.get("has_missing_values"):
            total_missing = missing_res["total_missing_values"]
            overall_pct = missing_res["overall_missing_percentage"]
            findings.append({
                "category": "Missingness",
                "severity": "high" if overall_pct > 15.0 else "medium",
                "message": f"Dataset contains {total_missing:,} missing values ({overall_pct}% overall missingness)."
            })
            for col_info in missing_res.get("columns_with_missing", [])[:5]:
                c_name = col_info["column_name"]
                c_pct = col_info["missing_percentage"]
                c_cnt = col_info["missing_count"]
                findings.append({
                    "category": "Missingness",
                    "severity": "high" if c_pct > 50.0 else "medium" if c_pct > 10.0 else "low",
                    "message": f"Column '{c_name}' has {c_pct}% missing values ({c_cnt:,} rows)."
                })
        else:
            findings.append({
                "category": "Missingness",
                "severity": "info",
                "message": "Dataset has 0 missing values across all columns."
            })

        # 2. Skewness Findings
        for col_sum in numeric_res.get("column_summaries", []):
            skew_val = col_sum.get("skewness")
            c_name = col_sum["column_name"]
            if skew_val is not None and abs(skew_val) > 1.0:
                direction = "right-skewed (positive)" if skew_val > 0 else "left-skewed (negative)"
                findings.append({
                    "category": "Distribution / Skewness",
                    "severity": "medium",
                    "message": f"Column '{c_name}' is highly {direction} with skewness of {skew_val}."
                })

        # 3. Outlier Findings
        if outlier_res.get("has_outliers"):
            for out_col in outlier_res.get("outlier_columns", [])[:5]:
                c_name = out_col["column_name"]
                o_cnt = out_col["outlier_count"]
                o_pct = out_col["outlier_percentage"]
                if o_pct > 2.0:
                    findings.append({
                        "category": "Outliers",
                        "severity": "medium" if o_pct > 5.0 else "low",
                        "message": f"Column '{c_name}' contains {o_cnt:,} IQR-based outliers ({o_pct}% of rows)."
                    })

        # 4. Correlation Findings
        if correlation_res.get("can_compute_correlation"):
            high_pairs = correlation_res.get("high_correlation_pairs", [])
            for pair in high_pairs[:5]:
                c1, c2 = pair["column_1"], pair["column_2"]
                r_val = pair["correlation"]
                findings.append({
                    "category": "Correlation",
                    "severity": "info" if abs(r_val) < 0.90 else "medium",
                    "message": f"Strong correlation discovered between '{c1}' and '{c2}' (r = {r_val})."
                })

        # 5. Cardinality Findings
        for cat_sum in categorical_res.get("column_summaries", []):
            c_name = cat_sum["column_name"]
            u_cnt = cat_sum["unique_count"]
            if cat_sum.get("is_high_cardinality"):
                findings.append({
                    "category": "Cardinality",
                    "severity": "info",
                    "message": f"Column '{c_name}' has high cardinality ({u_cnt:,} unique values)."
                })

        return findings
