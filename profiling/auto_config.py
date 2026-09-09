"""
profiling/auto_config.py

Fully automatic, dataset-agnostic configuration engine:
- Automatic Target Detection (High / Medium / Low confidence)
- Automatic Target Leakage Detection (correlation, categorical association, post-event indicators)
- Automatic Pipeline Configuration (numeric, categorical, imputation, encoding, feature engineering)
"""
import re
import math
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple

TARGET_KEYWORDS = [
    r"target", r"label", r"class", r"churn", r"fraud", r"risk",
    r"default", r"status", r"outcome", r"survived", r"approved",
    r"bought", r"late", r"flag", r"response", r"clicked", r"converted",
    r"is_", r"has_", r"result"
]

ID_KEYWORDS = [
    r"id$", r"_id$", r"identifier", r"guid", r"uuid", r"key$",
    r"code$", r"number$", r"num$", r"url", r"image", r"street", r"address"
]

DOMAIN_LEAKAGE_COLUMNS = {
    "delivery status": "Post-event target leakage: contains outcome delivery status recorded after shipment.",
    "days for shipping (real)": "Post-event leakage: actual shipping duration measured after order delivery.",
    "shipping date (dateorders)": "Post-event leakage: actual shipping timestamp occurs after prediction event.",
    "days for shipment (scheduled)": "Review for dependency with real shipping days."
}


class AutoConfigEngine:
    """
    Analyzes any tabular CSV dataset and infers:
    - The most probable supervised classification target column
    - Potential target leakage / post-event columns
    - Preprocessing and feature engineering specifications
    """

    @staticmethod
    def detect_target(df: pd.DataFrame) -> Dict[str, Any]:
        """
        Infers the target column automatically using dataset characteristics.
        Rules:
        - High confidence: automatically select.
        - Medium confidence: select with warning.
        - Low confidence: ask user (target is null, candidates returned).
        - Never blindly select IDs or obvious identifier columns as target.
        """
        if df is None or df.empty or df.shape[1] == 0:
            return {
                "column": None,
                "confidence": 0.0,
                "confidence_level": "Low",
                "reason": "Dataset is empty.",
                "candidate_columns": []
            }

        num_rows = len(df)
        num_cols = df.shape[1]
        scores: List[Tuple[str, float, str, int]] = []

        for idx, col in enumerate(df.columns):
            series = df[col]
            clean_series = series.dropna()
            col_name_str = str(col).strip()
            col_lower = col_name_str.lower()

            if clean_series.empty:
                continue

            unique_count = int(clean_series.nunique())
            if unique_count <= 1:
                continue  # Constant column

            # Check if obvious ID
            cardinality_ratio = unique_count / num_rows if num_rows > 0 else 0
            is_likely_id = False
            for pat in ID_KEYWORDS:
                if re.search(pat, col_lower):
                    if cardinality_ratio > 0.3 or unique_count > 100:
                        is_likely_id = True
                        break

            if cardinality_ratio > 0.8 and num_rows > 20:
                is_likely_id = True

            if is_likely_id:
                continue  # Never select ID column as target

            # Score this column as target candidate
            score = 0.0
            reasons = []

            # Factor 1: Cardinality
            if unique_count == 2:
                score += 55.0
                reasons.append("binary classification target (2 classes)")
            elif 3 <= unique_count <= 6:
                score += 35.0
                reasons.append(f"multi-class classification candidate ({unique_count} classes)")
            elif 7 <= unique_count <= 15 and not pd.api.types.is_numeric_dtype(clean_series):
                score += 15.0
                reasons.append(f"discrete categorical candidate ({unique_count} classes)")
            else:
                # Continuous or high cardinality
                continue

            # Factor 2: Class Balance (avoid ultra-sparse single anomalies)
            val_counts = clean_series.value_counts(normalize=True).values
            min_class_prop = float(val_counts.min())
            if min_class_prop >= 0.05:
                score += 15.0
            elif min_class_prop >= 0.01:
                score += 5.0
            else:
                score -= 10.0

            # Factor 3: Name match with target keywords
            keyword_match = False
            for kw in TARGET_KEYWORDS:
                if re.search(kw, col_lower):
                    score += 30.0
                    keyword_match = True
                    reasons.append(f"column name matches pattern '{kw}'")
                    break

            # Factor 4: Column position (last column is conventionally target in ML datasets)
            if idx == num_cols - 1:
                score += 10.0
                reasons.append("positioned as final column")

            # Binary numeric 0/1 gets extra confidence
            if unique_count == 2:
                unique_vals = set(clean_series.unique())
                if unique_vals.issubset({0, 1, "0", "1", True, False, "true", "false", "yes", "no", "Y", "N"}):
                    score += 15.0
                    reasons.append("standard boolean/binary encoding (0/1 or True/False)")

            reason_str = "; ".join(reasons)
            scores.append((col_name_str, score, reason_str, unique_count))

        if not scores:
            return {
                "column": None,
                "confidence": 0.0,
                "confidence_level": "Low",
                "reason": "Target column could not be determined automatically. No suitable low-cardinality classification candidate found.",
                "candidate_columns": list(df.columns[:10])
            }

        # Sort by score descending
        scores.sort(key=lambda x: x[1], reverse=True)
        top_col, top_score, top_reason, top_unique = scores[0]

        # Determine confidence level
        if top_score >= 70.0:
            confidence_level = "High"
            confidence = min(0.99, round(top_score / 110.0, 2))
        elif top_score >= 45.0:
            confidence_level = "Medium"
            confidence = min(0.84, round(top_score / 100.0, 2))
        else:
            confidence_level = "Low"
            confidence = max(0.1, round(top_score / 100.0, 2))

        # Low confidence -> target column set to None for user to pick, unless user opts in
        selected_col = top_col if confidence_level in ("High", "Medium") else None
        
        all_candidates = [s[0] for s in scores[:8]]

        return {
            "column": selected_col,
            "detected_column": top_col,
            "confidence": confidence,
            "confidence_level": confidence_level,
            "reason": f"{top_reason.capitalize()} (classes: {top_unique}).",
            "candidate_columns": all_candidates
        }

    @staticmethod
    def detect_leakage(
        df: pd.DataFrame,
        target_col: Optional[str] = None,
        max_rows_sample: int = 50000
    ) -> List[Dict[str, Any]]:
        """
        Generic, dataset-agnostic target leakage detector:
        1. 100% missing columns (cannot be used for prediction).
        2. Extremely high correlation (|r| >= 0.90) with target.
        3. Near-perfect categorical association with target (Cramér's V >= 0.90 or pure mapping).
        4. Generic post-event keywords (e.g. real/actual vs scheduled).
        5. Known domain supply chain leakage knowledge (as optional augmentation).
        """
        if df is None or df.empty:
            return []

        leakage_results: List[Dict[str, Any]] = []
        seen_cols = set()

        num_rows = len(df)
        # Efficient sampling for large datasets like DataCo (180k rows)
        sample_df = df.sample(n=min(num_rows, max_rows_sample), random_state=42) if num_rows > max_rows_sample else df

        # Step 1: Detect 100% missing columns and near-constant columns
        for col in df.columns:
            if col == target_col:
                continue
            series = df[col]
            missing_pct = (series.isnull().sum() / num_rows) * 100
            if missing_pct >= 99.9:
                leakage_results.append({
                    "column": str(col),
                    "reason": f"Column is 100% missing (0 valid entries). Excluded from feature set.",
                    "severity": "high",
                    "type": "all_missing"
                })
                seen_cols.add(str(col))

        # Step 2: Domain knowledge check (optional domain enhancement)
        for col in df.columns:
            col_str = str(col)
            if col_str in seen_cols or col_str == target_col:
                continue
            normalized_col = col_str.strip().lower()
            if normalized_col in DOMAIN_LEAKAGE_COLUMNS:
                leakage_results.append({
                    "column": col_str,
                    "reason": DOMAIN_LEAKAGE_COLUMNS[normalized_col],
                    "severity": "high",
                    "type": "domain_knowledge"
                })
                seen_cols.add(col_str)

        # Step 3: Generic Target Relationship Leakage (if target provided and valid)
        if target_col and target_col in df.columns:
            y_sample = sample_df[target_col]
            is_y_numeric = pd.api.types.is_numeric_dtype(y_sample)

            for col in sample_df.columns:
                col_str = str(col)
                if col_str in seen_cols or col_str == target_col:
                    continue

                x_series = sample_df[col]

                # Check 3A: Numeric correlation with target
                if is_y_numeric and pd.api.types.is_numeric_dtype(x_series):
                    valid_mask = x_series.notna() & y_sample.notna()
                    if valid_mask.sum() > 30:
                        try:
                            x_vals = x_series[valid_mask].to_numpy(dtype=np.float64)
                            y_vals = y_sample[valid_mask].to_numpy(dtype=np.float64)
                            x_std = float(np.std(x_vals))
                            y_std = float(np.std(y_vals))
                            if x_std > 1e-7 and y_std > 1e-7:
                                corr = float(np.corrcoef(x_vals, y_vals)[0, 1])
                                if not math.isnan(corr) and abs(corr) >= 0.90:
                                    leakage_results.append({
                                        "column": col_str,
                                        "reason": f"Extremely high correlation (|r| = {abs(corr):.3f} >= 0.90) with target '{target_col}'. Severe leakage proxy.",
                                        "severity": "high",
                                        "type": "high_correlation"
                                    })
                                    seen_cols.add(col_str)
                                    continue
                        except Exception:
                            pass

                # Check 3B: Categorical association / purity with target
                if not pd.api.types.is_numeric_dtype(x_series) or x_series.nunique() <= 20:
                    try:
                        contingency = pd.crosstab(x_series, y_sample)
                        if contingency.shape[0] > 1 and contingency.shape[1] > 1:
                            # Check conditional row purity: does knowing category determine target with >=99% accuracy?
                            row_max = contingency.max(axis=1)
                            row_sum = contingency.sum(axis=1)
                            purity = float((row_max / row_sum).mean())
                            if purity >= 0.98 and contingency.shape[0] <= 20:
                                leakage_results.append({
                                    "column": col_str,
                                    "reason": f"Category almost perfectly determines target '{target_col}' (average class purity: {purity*100:.1f}%). Outcome leakage proxy.",
                                    "severity": "high",
                                    "type": "categorical_proxy"
                                })
                                seen_cols.add(col_str)
                                continue
                    except Exception:
                        pass

                # Check 3C: Semantic post-event indicators
                col_lower = col_str.lower()
                if any(kw in col_lower for kw in ["(real)", "actual", "post_", "outcome", "after_event"]):
                    leakage_results.append({
                        "column": col_str,
                        "reason": f"Column name contains post-event indicator keyword ('{col_str}'). Likely recorded after outcome.",
                        "severity": "medium",
                        "type": "post_event_semantic"
                    })
                    seen_cols.add(col_str)

        return leakage_results

    @classmethod
    def generate_auto_config(cls, df: pd.DataFrame) -> Dict[str, Any]:
        """
        Produces a complete zero-configuration pipeline plan for any tabular CSV.
        """
        target_info = cls.detect_target(df)
        detected_target = target_info.get("column") or target_info.get("detected_column")

        leakage_info = cls.detect_leakage(df, target_col=detected_target)
        leakage_col_names = [item["column"] for item in leakage_info]

        num_cols = [
            str(c) for c in df.select_dtypes(include=[np.number]).columns
            if str(c) != detected_target and str(c) not in leakage_col_names
        ]
        cat_cols = [
            str(c) for c in df.select_dtypes(exclude=[np.number]).columns
            if str(c) != detected_target and str(c) not in leakage_col_names
        ]

        # Automatic feature engineering specs (e.g. ratio features if suitable columns exist)
        feature_specs = []
        lower_map = {str(c).lower().replace("_", " "): str(c) for c in num_cols}
        
        # Look for profit/revenue or cost/sales ratios
        num_pairs = [
            ("order profit per order", "sales", "profit_to_revenue_ratio"),
            ("profit", "revenue", "profit_to_revenue_ratio"),
            ("profit", "sales", "profit_to_sales_ratio"),
            ("cost", "price", "cost_to_price_ratio")
        ]
        for num_k, den_k, ratio_name in num_pairs:
            matched_num = next((orig for k, orig in lower_map.items() if num_k in k), None)
            matched_den = next((orig for k, orig in lower_map.items() if den_k in k and orig != matched_num), None)
            if matched_num and matched_den:
                feature_specs.append({
                    "name": ratio_name,
                    "numerator_col": matched_num,
                    "denominator_col": matched_den,
                    "leakage_risk": False
                })
                break

        return {
            "target": target_info,
            "leakage_columns": leakage_info,
            "leakage_column_names": leakage_col_names,
            "numeric_columns": num_cols,
            "categorical_columns": cat_cols,
            "feature_specs": feature_specs,
            "defaults": {
                "test_size": 0.20,
                "random_state": 42,
                "skewness_threshold": 1.0,
                "outlier_threshold": 0.02,
                "cardinality_threshold": 15
            },
            "pipeline_ready": target_info.get("confidence_level") in ("High", "Medium")
        }
