import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional

DEFAULT_LEAKAGE_COLUMNS = [
    "delivery status",
    "days for shipping (real)",
    "shipping date (dateorders)",
    "days for shipment (scheduled)",
]

class DecisionRules:
    @staticmethod
    def evaluate_column_status(
        series: pd.Series,
        col_name: str,
        total_rows: int,
        leakage_columns: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Determines the classification and handling status of a column.
        Columns are NOT deleted blindly; an explicit status and reason are produced.
        """
        leakage_set = set(
            [c.strip().lower() for c in (leakage_columns or DEFAULT_LEAKAGE_COLUMNS)]
        )
        normalized_name = str(col_name).strip().lower()
        
        missing_count = int(series.isnull().sum())
        missing_pct = float((missing_count / total_rows * 100) if total_rows > 0 else 0.0)
        unique_count = int(series.nunique(dropna=True))
        is_numeric = pd.api.types.is_numeric_dtype(series)

        # 1. 100% Completely Missing
        if missing_pct >= 100.0 or unique_count == 0:
            return {
                "status": "completely_missing",
                "is_usable": False,
                "action": "exclude",
                "reason": "Column is 100% missing (0 valid entries). Excluded from preprocessing."
            }

        # 2. Known Target Leakage Candidate
        if normalized_name in leakage_set:
            return {
                "status": "leakage_candidate",
                "is_usable": False,
                "action": "exclude_from_features",
                "reason": f"Column '{col_name}' is a known post-event leakage candidate. Excluded from predictive feature set."
            }

        # 3. Constant Column (Zero Variance / Single Value)
        if unique_count <= 1:
            return {
                "status": "constant",
                "is_usable": False,
                "action": "exclude",
                "reason": f"Column '{col_name}' is constant with only {unique_count} unique value. Zero variance provides no discriminative power."
            }

        # 4. Potential Identifier (e.g. unique per row for non-numeric/identifier columns)
        if not is_numeric and unique_count == total_rows and total_rows > 1:
            return {
                "status": "potential_identifier",
                "is_usable": False,
                "action": "exclude",
                "reason": f"Column '{col_name}' has 100% unique categorical values ({unique_count}/{total_rows}). Likely an identifier."
            }

        # 5. Usable Columns
        if is_numeric:
            return {
                "status": "usable_numeric",
                "is_usable": True,
                "action": "retain",
                "reason": "Valid numeric column with usable variance."
            }
        else:
            return {
                "status": "usable_categorical",
                "is_usable": True,
                "action": "retain",
                "reason": "Valid categorical column with usable categories."
            }

    @staticmethod
    def evaluate_imputation(
        series: pd.Series,
        is_numeric: bool,
        skewness_threshold: float = 1.0
    ) -> Dict[str, Any]:
        """
        Missing-value imputation rule:
        - Numeric: |skewness| < 1 -> Mean Imputation; |skewness| >= 1 -> Median Imputation
        - Categorical: Most-Frequent Imputation
        - No missing: No imputation needed
        """
        missing_count = int(series.isnull().sum())
        total_rows = len(series)
        missing_pct = float((missing_count / total_rows * 100) if total_rows > 0 else 0.0)

        if missing_count == 0:
            return {
                "step": "imputation",
                "operation": "none",
                "method": None,
                "missing_count": 0,
                "missing_percentage": 0.0,
                "skewness": None,
                "threshold": skewness_threshold,
                "reason": "No missing values detected in column."
            }

        if is_numeric:
            clean_series = series.dropna()
            skew_val = float(clean_series.skew()) if len(clean_series) > 2 else 0.0
            abs_skew = abs(skew_val)

            if abs_skew < skewness_threshold:
                method = "mean_imputation"
                explanation = (
                    f"Mean imputation selected because absolute skewness ({round(abs_skew, 4)}) "
                    f"is less than the threshold of {skewness_threshold}."
                )
            else:
                method = "median_imputation"
                explanation = (
                    f"Median imputation selected because absolute skewness ({round(abs_skew, 4)}) "
                    f"is >= the threshold of {skewness_threshold} (resilient to skewed distributions)."
                )

            return {
                "step": "imputation",
                "operation": method,
                "method": method,
                "missing_count": missing_count,
                "missing_percentage": round(missing_pct, 2),
                "skewness": round(skew_val, 4),
                "abs_skewness": round(abs_skew, 4),
                "threshold": skewness_threshold,
                "reason": explanation
            }
        else:
            return {
                "step": "imputation",
                "operation": "most_frequent_imputation",
                "method": "most_frequent_imputation",
                "missing_count": missing_count,
                "missing_percentage": round(missing_pct, 2),
                "skewness": None,
                "threshold": None,
                "reason": "Most-frequent mode imputation selected for categorical column containing missing values."
            }

    @staticmethod
    def evaluate_scaling(
        series: pd.Series,
        is_numeric: bool,
        outlier_proportion_threshold: float = 0.02
    ) -> Dict[str, Any]:
        """
        Outlier-aware scaling rule:
        - Outlier proportion > 2% -> RobustScaler
        - Otherwise -> StandardScaler
        """
        if not is_numeric:
            return {
                "step": "scaling",
                "operation": "none",
                "scaler": None,
                "outlier_count": 0,
                "outlier_percentage": 0.0,
                "threshold": outlier_proportion_threshold,
                "reason": "Scaling is only applicable to numeric columns."
            }

        clean_series = series.dropna()
        if clean_series.empty:
            return {
                "step": "scaling",
                "operation": "none",
                "scaler": None,
                "outlier_count": 0,
                "outlier_percentage": 0.0,
                "threshold": outlier_proportion_threshold,
                "reason": "Empty numeric series; cannot compute scaling statistics."
            }

        total_rows = len(series)
        q1 = float(clean_series.quantile(0.25))
        q3 = float(clean_series.quantile(0.75))
        iqr = q3 - q1
        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr

        outliers = clean_series[(clean_series < lower_bound) | (clean_series > upper_bound)]
        outlier_count = int(len(outliers))
        outlier_proportion = float(outlier_count / total_rows) if total_rows > 0 else 0.0
        outlier_pct = round(outlier_proportion * 100, 2)
        threshold_pct = round(outlier_proportion_threshold * 100, 1)

        if outlier_proportion > outlier_proportion_threshold:
            scaler = "RobustScaler"
            operation = "robust_scaling"
            explanation = (
                f"RobustScaler selected because {outlier_pct}% of values are IQR outliers, "
                f"exceeding the {threshold_pct}% threshold."
            )
        else:
            scaler = "StandardScaler"
            operation = "standard_scaling"
            explanation = (
                f"StandardScaler selected because outlier proportion ({outlier_pct}%) "
                f"is within the {threshold_pct}% threshold."
            )

        return {
            "step": "scaling",
            "operation": operation,
            "scaler": scaler,
            "outlier_count": outlier_count,
            "outlier_percentage": outlier_pct,
            "q1": round(q1, 4),
            "q3": round(q3, 4),
            "iqr": round(iqr, 4),
            "threshold": outlier_proportion_threshold,
            "reason": explanation
        }

    @staticmethod
    def evaluate_log_transformation(
        series: pd.Series,
        is_numeric: bool,
        skewness_threshold: float = 1.0
    ) -> Dict[str, Any]:
        """
        Conditional log transformation rule:
        IF |skewness| > 1 AND min >= 0 -> recommend log1p
        Otherwise -> no log transformation
        """
        if not is_numeric:
            return {
                "step": "log_transformation",
                "operation": "none",
                "applied": False,
                "skewness": None,
                "min_value": None,
                "reason": "Log transformation applies only to numeric columns."
            }

        clean_series = series.dropna()
        if clean_series.empty:
            return {
                "step": "log_transformation",
                "operation": "none",
                "applied": False,
                "skewness": None,
                "min_value": None,
                "reason": "Empty numeric series; cannot compute log transformation criteria."
            }

        skew_val = float(clean_series.skew()) if len(clean_series) > 2 else 0.0
        abs_skew = abs(skew_val)
        min_val = float(clean_series.min())

        if abs_skew > skewness_threshold and min_val >= 0:
            return {
                "step": "log_transformation",
                "operation": "log1p_transformation",
                "applied": True,
                "skewness": round(skew_val, 4),
                "abs_skewness": round(abs_skew, 4),
                "min_value": round(min_val, 4),
                "reason": (
                    f"log1p transformation recommended: absolute skewness ({round(abs_skew, 4)}) "
                    f"> {skewness_threshold} and all values are non-negative (min = {round(min_val, 4)})."
                )
            }
        elif abs_skew > skewness_threshold and min_val < 0:
            return {
                "step": "log_transformation",
                "operation": "none",
                "applied": False,
                "skewness": round(skew_val, 4),
                "abs_skewness": round(abs_skew, 4),
                "min_value": round(min_val, 4),
                "reason": (
                    f"No log transformation because the column contains negative values (min = {round(min_val, 4)}), "
                    f"even though skewness ({round(abs_skew, 4)}) > {skewness_threshold}."
                )
            }
        else:
            return {
                "step": "log_transformation",
                "operation": "none",
                "applied": False,
                "skewness": round(skew_val, 4),
                "abs_skewness": round(abs_skew, 4),
                "min_value": round(min_val, 4),
                "reason": (
                    f"No log transformation because absolute skewness ({round(abs_skew, 4)}) "
                    f"is within the normal threshold (<= {skewness_threshold})."
                )
            }

    @staticmethod
    def evaluate_encoding(
        series: pd.Series,
        is_categorical: bool,
        cardinality_threshold: int = 15
    ) -> Dict[str, Any]:
        """
        Cardinality-aware categorical encoding rule:
        cardinality <= 15 -> One-Hot Encoding
        cardinality > 15 -> Label-style Encoding
        """
        if not is_categorical:
            return {
                "step": "encoding",
                "operation": "none",
                "encoding": None,
                "cardinality": 0,
                "threshold": cardinality_threshold,
                "reason": "Encoding applies only to categorical columns."
            }

        unique_count = int(series.nunique(dropna=True))

        if unique_count <= cardinality_threshold:
            return {
                "step": "encoding",
                "operation": "one_hot_encoding",
                "encoding": "OneHotEncoder",
                "cardinality": unique_count,
                "threshold": cardinality_threshold,
                "reason": (
                    f"One-hot encoding selected because cardinality is {unique_count}, "
                    f"which is within the threshold of {cardinality_threshold}."
                )
            }
        else:
            return {
                "step": "encoding",
                "operation": "label_encoding",
                "encoding": "LabelEncoder",
                "cardinality": unique_count,
                "threshold": cardinality_threshold,
                "reason": (
                    f"Label-style encoding selected because cardinality is {unique_count}, "
                    f"exceeding the high-cardinality threshold of {cardinality_threshold}."
                )
            }
