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
                "rule_id": "RULE_COMPLETELY_MISSING_EXCLUSION",
                "status": "completely_missing",
                "is_usable": False,
                "action": "exclude",
                "selected_action": "exclude",
                "detected_statistic": {"missing_count": missing_count, "missing_percentage": missing_pct, "unique_count": unique_count},
                "threshold_condition": "missing_percentage >= 100.0 or unique_count == 0",
                "reason": "Column is 100% missing (0 valid entries). Excluded from preprocessing.",
                "resulting_feature_change": "Column dropped from preprocessing pipeline"
            }

        # 2. Known Target Leakage Candidate
        if normalized_name in leakage_set:
            return {
                "rule_id": "RULE_TARGET_LEAKAGE_EXCLUSION",
                "status": "leakage_candidate",
                "is_usable": False,
                "action": "exclude_from_features",
                "selected_action": "exclude_from_features",
                "detected_statistic": {"column_name": col_name, "is_known_leakage": True},
                "threshold_condition": f"column '{normalized_name}' in domain_leakage_set",
                "reason": f"Column '{col_name}' is a known post-event leakage candidate. Excluded from predictive feature set.",
                "resulting_feature_change": "Post-event column excluded to prevent optimistic bias"
            }

        # 3. Constant Column (Zero Variance / Single Value)
        if unique_count <= 1:
            return {
                "rule_id": "RULE_CONSTANT_COLUMN_EXCLUSION",
                "status": "constant",
                "is_usable": False,
                "action": "exclude",
                "selected_action": "exclude",
                "detected_statistic": {"unique_count": unique_count, "total_rows": total_rows},
                "threshold_condition": "unique_count <= 1",
                "reason": f"Column '{col_name}' is constant with only {unique_count} unique value. Zero variance provides no discriminative power.",
                "resulting_feature_change": "Zero-variance column dropped to eliminate uninformative dimension"
            }

        # 4. Potential Identifier (e.g. unique per row for non-numeric/identifier columns)
        if not is_numeric and unique_count == total_rows and total_rows > 1:
            return {
                "rule_id": "RULE_HIGH_CARDINALITY_IDENTIFIER_EXCLUSION",
                "status": "potential_identifier",
                "is_usable": False,
                "action": "exclude",
                "selected_action": "exclude",
                "detected_statistic": {"unique_count": unique_count, "total_rows": total_rows, "cardinality_ratio": 1.0},
                "threshold_condition": "not is_numeric and unique_count == total_rows",
                "reason": f"Column '{col_name}' has 100% unique categorical values ({unique_count}/{total_rows}). Likely an identifier.",
                "resulting_feature_change": "Identifier column dropped to prevent model memorization"
            }

        # 5. Usable Columns
        if is_numeric:
            return {
                "rule_id": "RULE_USABLE_NUMERIC_RETAIN",
                "status": "usable_numeric",
                "is_usable": True,
                "action": "retain",
                "selected_action": "retain",
                "detected_statistic": {"is_numeric": True, "unique_count": unique_count, "missing_percentage": missing_pct},
                "threshold_condition": "is_numeric and unique_count > 1",
                "reason": "Valid numeric column with usable variance.",
                "resulting_feature_change": "Retained for numeric preprocessing pipeline"
            }
        else:
            return {
                "rule_id": "RULE_USABLE_CATEGORICAL_RETAIN",
                "status": "usable_categorical",
                "is_usable": True,
                "action": "retain",
                "selected_action": "retain",
                "detected_statistic": {"is_numeric": False, "unique_count": unique_count, "missing_percentage": missing_pct},
                "threshold_condition": "not is_numeric and unique_count > 1",
                "reason": "Valid categorical column with usable categories.",
                "resulting_feature_change": "Retained for categorical encoding pipeline"
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
                "rule_id": "RULE_IMPUTATION_NONE",
                "step": "imputation",
                "operation": "none",
                "method": None,
                "selected_action": "none",
                "detected_statistic": {"missing_count": 0, "missing_percentage": 0.0},
                "threshold_condition": "missing_count == 0",
                "missing_count": 0,
                "missing_percentage": 0.0,
                "skewness": None,
                "threshold": skewness_threshold,
                "reason": "No missing values detected in column.",
                "resulting_feature_change": "Feature values preserved as-is without imputation"
            }

        if is_numeric:
            clean_series = series.dropna()
            skew_val = float(clean_series.skew()) if len(clean_series) > 2 else 0.0
            abs_skew = abs(skew_val)

            if abs_skew < skewness_threshold:
                rule_id = "RULE_SKEW_AWARE_IMPUTATION_MEAN"
                method = "mean_imputation"
                threshold_cond = f"|skewness| ({round(abs_skew, 4)}) < {skewness_threshold}"
                explanation = (
                    f"Mean imputation selected because absolute skewness ({round(abs_skew, 4)}) "
                    f"is less than the threshold of {skewness_threshold}."
                )
                feature_change = "Missing entries replaced with training mean"
            else:
                rule_id = "RULE_SKEW_AWARE_IMPUTATION_MEDIAN"
                method = "median_imputation"
                threshold_cond = f"|skewness| ({round(abs_skew, 4)}) >= {skewness_threshold}"
                explanation = (
                    f"Median imputation selected because absolute skewness ({round(abs_skew, 4)}) "
                    f"is >= the threshold of {skewness_threshold} (resilient to skewed distributions)."
                )
                feature_change = "Missing entries replaced with training median to resist outlier skew"

            return {
                "rule_id": rule_id,
                "step": "imputation",
                "operation": method,
                "method": method,
                "selected_action": method,
                "detected_statistic": {
                    "missing_count": missing_count,
                    "missing_percentage": round(missing_pct, 2),
                    "skewness": round(skew_val, 4),
                    "abs_skewness": round(abs_skew, 4)
                },
                "threshold_condition": threshold_cond,
                "missing_count": missing_count,
                "missing_percentage": round(missing_pct, 2),
                "skewness": round(skew_val, 4),
                "abs_skewness": round(abs_skew, 4),
                "threshold": skewness_threshold,
                "reason": explanation,
                "resulting_feature_change": feature_change
            }
        else:
            return {
                "rule_id": "RULE_CATEGORICAL_IMPUTATION_MODE",
                "step": "imputation",
                "operation": "most_frequent_imputation",
                "method": "most_frequent_imputation",
                "selected_action": "most_frequent_imputation",
                "detected_statistic": {"missing_count": missing_count, "missing_percentage": round(missing_pct, 2)},
                "threshold_condition": "is_categorical and missing_count > 0",
                "missing_count": missing_count,
                "missing_percentage": round(missing_pct, 2),
                "skewness": None,
                "threshold": None,
                "reason": "Most-frequent mode imputation selected for categorical column containing missing values.",
                "resulting_feature_change": "Missing entries replaced with training most frequent class"
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
                "rule_id": "RULE_SCALING_NOT_APPLICABLE",
                "step": "scaling",
                "operation": "none",
                "scaler": None,
                "selected_action": "none",
                "detected_statistic": {"is_numeric": False},
                "threshold_condition": "is_numeric == False",
                "outlier_count": 0,
                "outlier_percentage": 0.0,
                "threshold": outlier_proportion_threshold,
                "reason": "Scaling is only applicable to numeric columns.",
                "resulting_feature_change": "No scaling applied to categorical column"
            }

        clean_series = series.dropna()
        if clean_series.empty:
            return {
                "rule_id": "RULE_SCALING_EMPTY_SERIES",
                "step": "scaling",
                "operation": "none",
                "scaler": None,
                "selected_action": "none",
                "detected_statistic": {"is_empty": True},
                "threshold_condition": "clean_series.empty",
                "outlier_count": 0,
                "outlier_percentage": 0.0,
                "threshold": outlier_proportion_threshold,
                "reason": "Empty numeric series; cannot compute scaling statistics.",
                "resulting_feature_change": "No scaling applied"
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
            rule_id = "RULE_OUTLIER_AWARE_SCALING_ROBUST"
            scaler = "RobustScaler"
            operation = "robust_scaling"
            threshold_cond = f"outlier_proportion ({outlier_pct}%) > threshold ({threshold_pct}%)"
            explanation = (
                f"RobustScaler selected because {outlier_pct}% of values are IQR outliers, "
                f"exceeding the {threshold_pct}% threshold."
            )
            feature_change = "Feature centered by median and scaled by IQR to suppress outlier distortion"
        else:
            rule_id = "RULE_OUTLIER_AWARE_SCALING_STANDARD"
            scaler = "StandardScaler"
            operation = "standard_scaling"
            threshold_cond = f"outlier_proportion ({outlier_pct}%) <= threshold ({threshold_pct}%)"
            explanation = (
                f"StandardScaler selected because outlier proportion ({outlier_pct}%) "
                f"is within the {threshold_pct}% threshold."
            )
            feature_change = "Zero-mean, unit-variance z-score standardization applied"

        return {
            "rule_id": rule_id,
            "step": "scaling",
            "operation": operation,
            "scaler": scaler,
            "selected_action": scaler,
            "detected_statistic": {
                "outlier_count": outlier_count,
                "outlier_percentage": outlier_pct,
                "outlier_proportion": round(outlier_proportion, 4),
                "q1": round(q1, 4),
                "q3": round(q3, 4),
                "iqr": round(iqr, 4)
            },
            "threshold_condition": threshold_cond,
            "outlier_count": outlier_count,
            "outlier_percentage": outlier_pct,
            "q1": round(q1, 4),
            "q3": round(q3, 4),
            "iqr": round(iqr, 4),
            "threshold": outlier_proportion_threshold,
            "reason": explanation,
            "resulting_feature_change": feature_change
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
                "rule_id": "RULE_LOG1P_NOT_NUMERIC",
                "step": "log_transformation",
                "operation": "none",
                "applied": False,
                "selected_action": "none",
                "detected_statistic": {"is_numeric": False},
                "threshold_condition": "is_numeric == False",
                "skewness": None,
                "min_value": None,
                "reason": "Log transformation applies only to numeric columns.",
                "resulting_feature_change": "No transformation applied"
            }

        clean_series = series.dropna()
        if clean_series.empty:
            return {
                "rule_id": "RULE_LOG1P_EMPTY_SERIES",
                "step": "log_transformation",
                "operation": "none",
                "applied": False,
                "selected_action": "none",
                "detected_statistic": {"is_empty": True},
                "threshold_condition": "clean_series.empty",
                "skewness": None,
                "min_value": None,
                "reason": "Empty numeric series; cannot compute log transformation criteria.",
                "resulting_feature_change": "No transformation applied"
            }

        skew_val = float(clean_series.skew()) if len(clean_series) > 2 else 0.0
        abs_skew = abs(skew_val)
        min_val = float(clean_series.min())

        if abs_skew > skewness_threshold and min_val >= 0:
            return {
                "rule_id": "RULE_LOG1P_TRANSFORM_APPLY",
                "step": "log_transformation",
                "operation": "log1p_transformation",
                "applied": True,
                "selected_action": "log1p_transformation",
                "detected_statistic": {
                    "skewness": round(skew_val, 4),
                    "abs_skewness": round(abs_skew, 4),
                    "min_value": round(min_val, 4)
                },
                "threshold_condition": f"|skewness| ({round(abs_skew, 4)}) > {skewness_threshold} and min ({round(min_val, 4)}) >= 0",
                "skewness": round(skew_val, 4),
                "abs_skewness": round(abs_skew, 4),
                "min_value": round(min_val, 4),
                "reason": (
                    f"log1p transformation recommended: absolute skewness ({round(abs_skew, 4)}) "
                    f"> {skewness_threshold} and all values are non-negative (min = {round(min_val, 4)})."
                ),
                "resulting_feature_change": "Distribution compressed via log(1 + x) transformation"
            }
        elif abs_skew > skewness_threshold and min_val < 0:
            return {
                "rule_id": "RULE_LOG1P_TRANSFORM_NEGATIVE_BLOCK",
                "step": "log_transformation",
                "operation": "none",
                "applied": False,
                "selected_action": "none",
                "detected_statistic": {
                    "skewness": round(skew_val, 4),
                    "abs_skewness": round(abs_skew, 4),
                    "min_value": round(min_val, 4)
                },
                "threshold_condition": f"|skewness| ({round(abs_skew, 4)}) > {skewness_threshold} but min ({round(min_val, 4)}) < 0",
                "skewness": round(skew_val, 4),
                "abs_skewness": round(abs_skew, 4),
                "min_value": round(min_val, 4),
                "reason": (
                    f"No log transformation because the column contains negative values (min = {round(min_val, 4)}), "
                    f"even though skewness ({round(abs_skew, 4)}) > {skewness_threshold}."
                ),
                "resulting_feature_change": "Log transformation bypassed to prevent undefined values on negative domain"
            }
        else:
            return {
                "rule_id": "RULE_LOG1P_TRANSFORM_NOT_NEEDED",
                "step": "log_transformation",
                "operation": "none",
                "applied": False,
                "selected_action": "none",
                "detected_statistic": {
                    "skewness": round(skew_val, 4),
                    "abs_skewness": round(abs_skew, 4),
                    "min_value": round(min_val, 4)
                },
                "threshold_condition": f"|skewness| ({round(abs_skew, 4)}) <= {skewness_threshold}",
                "skewness": round(skew_val, 4),
                "abs_skewness": round(abs_skew, 4),
                "min_value": round(min_val, 4),
                "reason": (
                    f"No log transformation because absolute skewness ({round(abs_skew, 4)}) "
                    f"is within the normal threshold (<= {skewness_threshold})."
                ),
                "resulting_feature_change": "Feature distribution sufficiently symmetric; linear scale preserved"
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
                "rule_id": "RULE_ENCODING_NOT_APPLICABLE",
                "step": "encoding",
                "operation": "none",
                "encoding": None,
                "selected_action": "none",
                "detected_statistic": {"is_categorical": False},
                "threshold_condition": "is_categorical == False",
                "cardinality": 0,
                "threshold": cardinality_threshold,
                "reason": "Encoding applies only to categorical columns.",
                "resulting_feature_change": "No categorical encoding applied to numeric column"
            }

        unique_count = int(series.nunique(dropna=True))

        if unique_count <= cardinality_threshold:
            return {
                "rule_id": "RULE_CARDINALITY_ENCODING_ONEHOT",
                "step": "encoding",
                "operation": "one_hot_encoding",
                "encoding": "OneHotEncoder",
                "selected_action": "one_hot_encoding",
                "detected_statistic": {"cardinality": unique_count, "threshold": cardinality_threshold},
                "threshold_condition": f"cardinality ({unique_count}) <= {cardinality_threshold}",
                "cardinality": unique_count,
                "threshold": cardinality_threshold,
                "reason": (
                    f"One-hot encoding selected because cardinality is {unique_count}, "
                    f"which is within the threshold of {cardinality_threshold}."
                ),
                "resulting_feature_change": f"Expanded into {unique_count} compact binary indicator columns"
            }
        else:
            return {
                "rule_id": "RULE_CARDINALITY_ENCODING_ORDINAL",
                "step": "encoding",
                "operation": "label_encoding",
                "encoding": "LabelEncoder",
                "selected_action": "label_encoding",
                "detected_statistic": {"cardinality": unique_count, "threshold": cardinality_threshold},
                "threshold_condition": f"cardinality ({unique_count}) > {cardinality_threshold}",
                "cardinality": unique_count,
                "threshold": cardinality_threshold,
                "reason": (
                    f"Label-style encoding selected because cardinality is {unique_count}, "
                    f"exceeding the high-cardinality threshold of {cardinality_threshold}."
                ),
                "resulting_feature_change": "Mapped to 1-dimensional integer scale, preventing high-dimensional memory explosion"
            }
