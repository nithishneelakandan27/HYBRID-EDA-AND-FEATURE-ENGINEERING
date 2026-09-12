"""
feature_engineering/engineer.py

ConditionalFeatureEngineer: Generic, configurable feature engineering stage.
Accepts a list of feature specs at construction time — no DataCo-specific logic
is hardcoded inside this class.

Feature spec format:
    {
        "name": str,               # output column name
        "numerator_col": str,      # source column for numerator
        "denominator_col": str,    # source column for denominator
        "leakage_risk": bool       # if True, reject automatically
    }

Only ratio-type features are supported in Phase 6. Extensible for more types.
"""
import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional
from sklearn.base import BaseEstimator, TransformerMixin


class ConditionalFeatureEngineer(BaseEstimator, TransformerMixin):
    """
    Generates derived features conditionally — only when source columns
    exist, are usable (non-leakage), and produce valid numeric output.

    fit(X_train) determines which specs are accepted.
    transform(X) applies only accepted specs.
    """

    def __init__(
        self,
        feature_specs: Optional[List[Dict[str, Any]]] = None,
        leakage_columns: Optional[List[str]] = None,
        target_column: Optional[str] = None,
        variance_threshold: float = 1e-4,
        max_missing_ratio: float = 0.50,
        max_redundancy_correlation: float = 0.98,
        min_nonzero_denominator_ratio: float = 0.01
    ):
        """
        Parameters
        ----------
        feature_specs : list of dicts, each with keys:
            name, numerator_col, denominator_col, leakage_risk
        leakage_columns : list of column names to treat as leakage
        target_column : target column name to protect from leakage
        variance_threshold : minimum variance required for candidate feature
        max_missing_ratio : maximum allowable missingness in source columns (default: 0.50)
        max_redundancy_correlation : maximum Pearson |r| with source columns before considered redundant (default: 0.98)
        min_nonzero_denominator_ratio : minimum ratio of non-zero denominator entries (default: 0.01)
        """
        self.feature_specs = feature_specs or []
        self.leakage_columns = leakage_columns or []
        self.target_column = target_column
        self.variance_threshold = variance_threshold
        self.max_missing_ratio = max_missing_ratio
        self.max_redundancy_correlation = max_redundancy_correlation
        self.min_nonzero_denominator_ratio = min_nonzero_denominator_ratio

        # Fitted state
        self.accepted_specs_: List[Dict[str, Any]] = []
        self.rejected_specs_: List[Dict[str, Any]] = []
        self.decision_trace_: List[Dict[str, Any]] = []
        self.is_fitted_: bool = False

    def fit(self, X: pd.DataFrame, y=None):
        """
        Validates each candidate spec against the training DataFrame.
        Enforces 7 statistical & structural checks:
          1. Explicit leakage flag
          2. Target column isolation
          3. Leakage column list isolation
          4. Source column existence
          5. Numeric data type validity
          6. Name collision prevention
          7. Denominator validity (non-zero entries)
          8. Missing-value impact (< 50% missing)
          9. Variance viability (variance >= 1e-4)
         10. Collinear redundancy (|r| <= 0.98 with source features)
        Records accepted and rejected specs with structured decision traces.
        """
        if not isinstance(X, pd.DataFrame):
            X = pd.DataFrame(X)

        self.accepted_specs_ = []
        self.rejected_specs_ = []
        self.decision_trace_ = []
        leakage_set = set(str(c).strip().lower() for c in (self.leakage_columns or []))
        norm_target = str(self.target_column).strip().lower() if self.target_column else None

        for spec in self.feature_specs:
            name = spec.get("name", "unknown")
            num_col = spec.get("numerator_col")
            den_col = spec.get("denominator_col")
            is_leakage = bool(spec.get("leakage_risk", False))

            norm_num = str(num_col).strip().lower() if num_col else ""
            norm_den = str(den_col).strip().lower() if den_col else ""

            reject_reason = None
            rule_id = None
            detected_stat = {}
            threshold_cond = ""

            # Check 1: explicit leakage flag
            if is_leakage:
                rule_id = "RULE_FE_EXPLICIT_LEAKAGE"
                reject_reason = "Feature spec marked as leakage risk"
                detected_stat = {"leakage_risk": True}
                threshold_cond = "spec.leakage_risk == False"

            # Check 2: target column check
            elif norm_target and (norm_num == norm_target or norm_den == norm_target):
                rule_id = "RULE_FE_TARGET_LEAKAGE"
                reject_reason = f"Source column involves target column '{self.target_column}'"
                detected_stat = {"target_column": self.target_column}
                threshold_cond = "source_col != target_column"

            # Check 3: source columns in explicit leakage list
            elif norm_num in leakage_set or norm_den in leakage_set:
                rule_id = "RULE_FE_SOURCE_LEAKAGE"
                leaky_src = num_col if norm_num in leakage_set else den_col
                reject_reason = f"Source column '{leaky_src}' is in leakage list"
                detected_stat = {"leakage_source": leaky_src}
                threshold_cond = "source_col not in leakage_columns"

            # Check 4: numerator column must exist
            elif num_col not in X.columns:
                rule_id = "RULE_FE_MISSING_NUMERATOR"
                reject_reason = f"Numerator column '{num_col}' not found in dataset"
                detected_stat = {"missing_column": num_col}
                threshold_cond = f"'{num_col}' in dataset.columns"

            # Check 5: denominator column must exist
            elif den_col not in X.columns:
                rule_id = "RULE_FE_MISSING_DENOMINATOR"
                reject_reason = f"Denominator column '{den_col}' not found in dataset"
                detected_stat = {"missing_column": den_col}
                threshold_cond = f"'{den_col}' in dataset.columns"

            # Check 6: both must be numeric
            elif not pd.api.types.is_numeric_dtype(X[num_col]):
                rule_id = "RULE_FE_NON_NUMERIC_NUMERATOR"
                reject_reason = f"Numerator column '{num_col}' is not numeric"
                detected_stat = {"dtype": str(X[num_col].dtype)}
                threshold_cond = "is_numeric_dtype(numerator)"

            elif not pd.api.types.is_numeric_dtype(X[den_col]):
                rule_id = "RULE_FE_NON_NUMERIC_DENOMINATOR"
                reject_reason = f"Denominator column '{den_col}' is not numeric"
                detected_stat = {"dtype": str(X[den_col].dtype)}
                threshold_cond = "is_numeric_dtype(denominator)"

            # Check 7: output name must not already be a column (avoid collision)
            elif name in X.columns:
                rule_id = "RULE_FE_NAME_COLLISION"
                reject_reason = f"Feature name '{name}' already exists in dataset"
                detected_stat = {"existing_column": name}
                threshold_cond = f"'{name}' not in dataset.columns"

            # Check 8: denominator validity (at least min_nonzero_denominator_ratio non-zero values)
            else:
                den_clean = X[den_col].dropna()
                non_zero_count = int((den_clean != 0).sum())
                non_zero_ratio = (non_zero_count / len(X)) if len(X) > 0 else 0.0
                if len(den_clean) == 0 or non_zero_ratio < self.min_nonzero_denominator_ratio:
                    rule_id = "RULE_FE_INVALID_DENOMINATOR"
                    reject_reason = (
                        f"Denominator column '{den_col}' lacks usable non-zero values "
                        f"({non_zero_count}/{len(X)} non-zero, ratio {non_zero_ratio:.4f} < {self.min_nonzero_denominator_ratio})"
                    )
                    detected_stat = {"non_zero_count": non_zero_count, "non_zero_ratio": round(non_zero_ratio, 4)}
                    threshold_cond = f"non_zero_denominator_ratio >= {self.min_nonzero_denominator_ratio}"

                # Check 9: missing-value impact
                else:
                    num_missing_ratio = float(X[num_col].isnull().mean())
                    den_missing_ratio = float(X[den_col].isnull().mean())
                    if num_missing_ratio > self.max_missing_ratio or den_missing_ratio > self.max_missing_ratio:
                        rule_id = "RULE_FE_EXCESSIVE_MISSINGNESS"
                        reject_reason = (
                            f"Source column has excessive missingness (num: {num_missing_ratio*100:.1f}%, "
                            f"den: {den_missing_ratio*100:.1f}% > {self.max_missing_ratio*100:.0f}%)"
                        )
                        detected_stat = {
                            "numerator_missing_ratio": round(num_missing_ratio, 4),
                            "denominator_missing_ratio": round(den_missing_ratio, 4)
                        }
                        threshold_cond = f"missing_ratio <= {self.max_missing_ratio}"

                    # Check 10: variance check of candidate feature on training data
                    else:
                        num_vals = X[num_col].astype(float)
                        den_vals = X[den_col].astype(float)
                        safe_den = np.where((den_vals == 0) | den_vals.isna(), np.nan, den_vals)
                        cand_ratio = np.where(np.isnan(safe_den), 0.0, num_vals.values / safe_den)
                        cand_var = float(np.nanvar(cand_ratio)) if len(cand_ratio) > 1 else 0.0

                        if np.isnan(cand_var) or cand_var < self.variance_threshold:
                            rule_id = "RULE_FE_NEAR_ZERO_VARIANCE"
                            reject_reason = f"Candidate feature exhibits near-zero variance ({cand_var:.6f} < {self.variance_threshold})"
                            detected_stat = {"variance": round(cand_var, 6)}
                            threshold_cond = f"variance >= {self.variance_threshold}"

                        # Check 11: collinear redundancy with source columns
                        else:
                            corr_with_num = 0.0
                            valid_num_mask = ~np.isnan(num_vals.values) & ~np.isnan(cand_ratio)
                            if valid_num_mask.sum() > 5:
                                num_std = float(np.std(num_vals.values[valid_num_mask]))
                                cand_std = float(np.std(cand_ratio[valid_num_mask]))
                                if num_std > 1e-7 and cand_std > 1e-7:
                                    c_val = float(np.corrcoef(num_vals.values[valid_num_mask], cand_ratio[valid_num_mask])[0, 1])
                                    corr_with_num = abs(c_val) if not np.isnan(c_val) else 0.0

                            corr_with_den = 0.0
                            valid_den_mask = ~np.isnan(den_vals.values) & ~np.isnan(cand_ratio)
                            if valid_den_mask.sum() > 5:
                                den_std = float(np.std(den_vals.values[valid_den_mask]))
                                cand_std = float(np.std(cand_ratio[valid_den_mask]))
                                if den_std > 1e-7 and cand_std > 1e-7:
                                    c_val = float(np.corrcoef(den_vals.values[valid_den_mask], cand_ratio[valid_den_mask])[0, 1])
                                    corr_with_den = abs(c_val) if not np.isnan(c_val) else 0.0

                            max_source_corr = max(corr_with_num, corr_with_den)
                            if max_source_corr > self.max_redundancy_correlation:
                                rule_id = "RULE_FE_COLLINEAR_REDUNDANCY"
                                reject_reason = (
                                    f"Candidate feature is collinear duplicate of source column "
                                    f"(|r| = {max_source_corr:.4f} > {self.max_redundancy_correlation})"
                                )
                                detected_stat = {
                                    "max_source_correlation": round(max_source_corr, 4),
                                    "corr_numerator": round(corr_with_num, 4),
                                    "corr_denominator": round(corr_with_den, 4)
                                }
                                threshold_cond = f"|r| <= {self.max_redundancy_correlation}"
                            else:
                                detected_stat = {
                                    "variance": round(cand_var, 6),
                                    "max_source_correlation": round(max_source_corr, 4),
                                    "corr_numerator": round(corr_with_num, 4),
                                    "corr_denominator": round(corr_with_den, 4)
                                }

            if reject_reason:
                rej_entry = {
                    "name": name,
                    "feature": name,
                    "numerator_col": num_col,
                    "denominator_col": den_col,
                    "leakage_risk": is_leakage,
                    "status": "rejected",
                    "action": "reject_candidate",
                    "selected_action": "reject_candidate",
                    "rule_id": rule_id or "RULE_FE_REJECT",
                    "rule_triggered": rule_id or "RULE_FE_REJECT",
                    "detected_statistic": detected_stat,
                    "threshold_condition": threshold_cond,
                    "reason": reject_reason,
                    "resulting_feature_change": "Candidate feature dropped from candidate pool"
                }
                self.rejected_specs_.append(rej_entry)
                self.decision_trace_.append({
                    "stage": "feature_engineering",
                    "column_name": name,
                    "feature": name,
                    "rule_id": rej_entry["rule_id"],
                    "rule_triggered": rej_entry["rule_id"],
                    "detected_statistic": detected_stat,
                    "threshold_condition": threshold_cond,
                    "selected_action": "reject_candidate",
                    "reason": reject_reason,
                    "resulting_feature_change": rej_entry["resulting_feature_change"]
                })
            else:
                acc_entry = {
                    "name": name,
                    "feature": name,
                    "numerator_col": num_col,
                    "denominator_col": den_col,
                    "leakage_risk": False,
                    "status": "accepted",
                    "action": "accept_and_engineer",
                    "selected_action": "accept_and_engineer",
                    "rule_id": "RULE_FE_ACCEPTED_VALID_SIGNAL",
                    "rule_triggered": "RULE_FE_ACCEPTED_VALID_SIGNAL",
                    "detected_statistic": detected_stat,
                    "threshold_condition": "All structural, leakage, denominator, missingness, variance, and redundancy checks passed",
                    "reason": "All source columns found, numeric, non-leakage with significant variance and non-redundant signal",
                    "resulting_feature_change": f"Engineered ratio feature '{name}' appended to dataset"
                }
                self.accepted_specs_.append(acc_entry)
                self.decision_trace_.append({
                    "stage": "feature_engineering",
                    "column_name": name,
                    "feature": name,
                    "rule_id": acc_entry["rule_id"],
                    "rule_triggered": acc_entry["rule_id"],
                    "detected_statistic": detected_stat,
                    "threshold_condition": acc_entry["threshold_condition"],
                    "selected_action": "accept_and_engineer",
                    "reason": acc_entry["reason"],
                    "resulting_feature_change": acc_entry["resulting_feature_change"]
                })

        self.is_fitted_ = True
        return self

    def transform(self, X: pd.DataFrame) -> pd.DataFrame:
        """
        Applies only accepted feature specs.
        Handles zero/NaN denominators safely using np.where.
        Returns X with new features appended.
        """
        if not self.is_fitted_:
            raise RuntimeError("ConditionalFeatureEngineer is not fitted. Call fit() first.")

        if not isinstance(X, pd.DataFrame):
            X = pd.DataFrame(X)

        result = X.copy()

        for spec in self.accepted_specs_:
            name = spec["name"]
            num_col = spec["numerator_col"]
            den_col = spec["denominator_col"]

            # Skip if source columns somehow missing at transform time
            if num_col not in result.columns or den_col not in result.columns:
                continue

            numerator = result[num_col].astype(float)
            denominator = result[den_col].astype(float)

            # Safe division: where denominator is 0 or NaN → set output to 0.0
            safe_denominator = np.where(
                (denominator == 0) | denominator.isna(),
                np.nan,
                denominator
            )
            ratio = np.where(
                np.isnan(safe_denominator),
                0.0,
                numerator.values / safe_denominator
            )
            result[name] = ratio.astype(float)

        return result

    def fit_transform(self, X: pd.DataFrame, y=None) -> pd.DataFrame:
        return self.fit(X, y).transform(X)

    def get_feature_names_out(self) -> List[str]:
        """Returns list of accepted (generated) feature names."""
        return [s["name"] for s in self.accepted_specs_]

    def get_decision_trace(self) -> List[Dict[str, Any]]:
        """Returns structured trace of all feature engineering candidate evaluations."""
        return self.decision_trace_

    def get_report(self) -> Dict[str, Any]:
        """Full report of accepted and rejected feature specs."""
        return {
            "accepted_count": len(self.accepted_specs_),
            "rejected_count": len(self.rejected_specs_),
            "accepted": self.accepted_specs_,
            "rejected": self.rejected_specs_,
            "decision_trace": self.decision_trace_
        }
