import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional

from decision_engine.rules import DecisionRules, DEFAULT_LEAKAGE_COLUMNS

class HybridDecisionEngine:
    @staticmethod
    def generate_plan(
        df: pd.DataFrame,
        leakage_columns: Optional[List[str]] = None,
        skewness_threshold: float = 1.0,
        outlier_threshold: float = 0.02,
        cardinality_threshold: int = 15
    ) -> Dict[str, Any]:
        """
        Generates a comprehensive, deterministic, and interpretable preprocessing
        decision plan based on statistical characteristics and research methodology.
        
        Designed to be fitted on TRAINING DATA ONLY during downstream ML execution.
        """
        if df is None or not isinstance(df, pd.DataFrame) or df.empty:
            raise ValueError("Invalid or empty DataFrame provided to Decision Engine.")

        total_rows = int(df.shape[0])
        total_cols = int(df.shape[1])
        
        columns_plan = []

        # Aggregate counts
        summary_counts = {
            "mean_imputations": 0,
            "median_imputations": 0,
            "most_frequent_imputations": 0,
            "robust_scalers": 0,
            "standard_scalers": 0,
            "log1p_transformations": 0,
            "one_hot_encodings": 0,
            "label_encodings": 0,
            "usable_numeric_columns": 0,
            "usable_categorical_columns": 0,
            "excluded_columns": 0,
            "leakage_columns": 0
        }

        for col in df.columns:
            series = df[col]
            is_numeric = bool(pd.api.types.is_numeric_dtype(series))
            is_categorical = not is_numeric

            # 1. Evaluate Column Status / Leakage / Exclusions
            status_info = DecisionRules.evaluate_column_status(
                series=series,
                col_name=str(col),
                total_rows=total_rows,
                leakage_columns=leakage_columns
            )

            status = status_info["status"]
            is_usable = status_info["is_usable"]

            col_decisions = []

            # Compute general statistics
            missing_count = int(series.isnull().sum())
            missing_pct = float((missing_count / total_rows * 100) if total_rows > 0 else 0.0)
            unique_count = int(series.nunique(dropna=True))
            cardinality_ratio = float((unique_count / total_rows) if total_rows > 0 else 0.0)

            stats = {
                "missing_count": missing_count,
                "missing_percentage": round(missing_pct, 2),
                "unique_count": unique_count,
                "cardinality": round(cardinality_ratio, 4)
            }

            if is_numeric:
                clean_series = series.dropna()
                if not clean_series.empty:
                    stats["min"] = round(float(clean_series.min()), 4)
                    stats["max"] = round(float(clean_series.max()), 4)
                    stats["mean"] = round(float(clean_series.mean()), 4)
                    stats["median"] = round(float(clean_series.median()), 4)
                    stats["skewness"] = round(float(clean_series.skew()), 4) if len(clean_series) > 2 else 0.0
                else:
                    stats.update({"min": None, "max": None, "mean": None, "median": None, "skewness": None})

            # Handle Excluded / Leakage Columns
            if not is_usable:
                if status == "leakage_candidate":
                    summary_counts["leakage_columns"] += 1
                else:
                    summary_counts["excluded_columns"] += 1

                col_decisions.append({
                    "step": "exclusion",
                    "operation": status_info["action"],
                    "action": status_info["action"],
                    "reason": status_info["reason"]
                })

                columns_plan.append({
                    "column_name": str(col),
                    "data_type": "numeric" if is_numeric else "categorical/text",
                    "status": status,
                    "is_usable": False,
                    "statistics": stats,
                    "decisions": col_decisions,
                    "summary_rationale": status_info["reason"]
                })
                continue

            # --- For Usable Columns: Generate Preprocessing Decisions ---
            if is_numeric:
                summary_counts["usable_numeric_columns"] += 1

                # Step A: Missing-Value Imputation
                imp_decision = DecisionRules.evaluate_imputation(
                    series=series,
                    is_numeric=True,
                    skewness_threshold=skewness_threshold
                )
                if imp_decision["operation"] != "none":
                    if imp_decision["operation"] == "mean_imputation":
                        summary_counts["mean_imputations"] += 1
                    elif imp_decision["operation"] == "median_imputation":
                        summary_counts["median_imputations"] += 1
                col_decisions.append(imp_decision)

                # Step B: Log Transformation
                log_decision = DecisionRules.evaluate_log_transformation(
                    series=series,
                    is_numeric=True,
                    skewness_threshold=skewness_threshold
                )
                if log_decision["applied"]:
                    summary_counts["log1p_transformations"] += 1
                col_decisions.append(log_decision)

                # Step C: Outlier-Aware Scaling
                scale_decision = DecisionRules.evaluate_scaling(
                    series=series,
                    is_numeric=True,
                    outlier_proportion_threshold=outlier_threshold
                )
                if scale_decision["scaler"] == "RobustScaler":
                    summary_counts["robust_scalers"] += 1
                elif scale_decision["scaler"] == "StandardScaler":
                    summary_counts["standard_scalers"] += 1
                col_decisions.append(scale_decision)

                # Summary rationale for numeric column
                summary_rationale = (
                    f"{imp_decision['operation']} -> "
                    f"{'log1p -> ' if log_decision['applied'] else ''}"
                    f"{scale_decision['scaler'] or 'no_scaling'}"
                )

            else:
                summary_counts["usable_categorical_columns"] += 1

                # Step A: Categorical Missing Imputation
                cat_imp = DecisionRules.evaluate_imputation(
                    series=series,
                    is_numeric=False
                )
                if cat_imp["operation"] != "none":
                    summary_counts["most_frequent_imputations"] += 1
                col_decisions.append(cat_imp)

                # Step B: Categorical Encoding
                enc_decision = DecisionRules.evaluate_encoding(
                    series=series,
                    is_categorical=True,
                    cardinality_threshold=cardinality_threshold
                )
                if enc_decision["operation"] == "one_hot_encoding":
                    summary_counts["one_hot_encodings"] += 1
                elif enc_decision["operation"] == "label_encoding":
                    summary_counts["label_encodings"] += 1
                col_decisions.append(enc_decision)

                # Summary rationale for categorical column
                summary_rationale = (
                    f"{cat_imp['operation']} -> {enc_decision['operation']}"
                )

            columns_plan.append({
                "column_name": str(col),
                "data_type": "numeric" if is_numeric else "categorical/text",
                "status": status,
                "is_usable": True,
                "statistics": stats,
                "decisions": col_decisions,
                "summary_rationale": summary_rationale
            })

        return {
            "dataset_summary": {
                "num_rows": total_rows,
                "num_cols": total_cols,
                "usable_numeric_count": summary_counts["usable_numeric_columns"],
                "usable_categorical_count": summary_counts["usable_categorical_columns"],
                "excluded_count": summary_counts["excluded_columns"],
                "leakage_count": summary_counts["leakage_columns"]
            },
            "summary_counts": summary_counts,
            "columns": columns_plan
        }
