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
        leakage_columns: Optional[List[str]] = None
    ):
        """
        Parameters
        ----------
        feature_specs : list of dicts, each with keys:
            name, numerator_col, denominator_col, leakage_risk
        leakage_columns : list of column names to treat as leakage
        """
        self.feature_specs = feature_specs or []
        self.leakage_columns = leakage_columns or []

        # Fitted state
        self.accepted_specs_: List[Dict[str, Any]] = []
        self.rejected_specs_: List[Dict[str, Any]] = []
        self.is_fitted_: bool = False

    def fit(self, X: pd.DataFrame, y=None):
        """
        Validates each spec against the training DataFrame.
        Records accepted and rejected specs with reasons.
        """
        if not isinstance(X, pd.DataFrame):
            X = pd.DataFrame(X)

        self.accepted_specs_ = []
        self.rejected_specs_ = []
        leakage_set = set(str(c) for c in (self.leakage_columns or []))

        for spec in self.feature_specs:
            name = spec.get("name", "unknown")
            num_col = spec.get("numerator_col")
            den_col = spec.get("denominator_col")
            is_leakage = bool(spec.get("leakage_risk", False))

            reject_reason = None

            # Check 1: explicit leakage flag
            if is_leakage:
                reject_reason = "Feature spec marked as leakage risk"

            # Check 2: source columns in explicit leakage list
            elif num_col in leakage_set or den_col in leakage_set:
                reject_reason = f"Source column(s) are in leakage list"

            # Check 3: numerator column must exist
            elif num_col not in X.columns:
                reject_reason = f"Numerator column '{num_col}' not found in dataset"

            # Check 4: denominator column must exist
            elif den_col not in X.columns:
                reject_reason = f"Denominator column '{den_col}' not found in dataset"

            # Check 5: both must be numeric
            elif not pd.api.types.is_numeric_dtype(X[num_col]):
                reject_reason = f"Numerator column '{num_col}' is not numeric"

            elif not pd.api.types.is_numeric_dtype(X[den_col]):
                reject_reason = f"Denominator column '{den_col}' is not numeric"

            # Check 6: output name must not already be a column (avoid collision)
            elif name in X.columns:
                reject_reason = f"Feature name '{name}' already exists in dataset"

            if reject_reason:
                self.rejected_specs_.append({
                    "name": name,
                    "numerator_col": num_col,
                    "denominator_col": den_col,
                    "leakage_risk": is_leakage,
                    "status": "rejected",
                    "reason": reject_reason
                })
            else:
                self.accepted_specs_.append({
                    "name": name,
                    "numerator_col": num_col,
                    "denominator_col": den_col,
                    "leakage_risk": False,
                    "status": "accepted",
                    "reason": "All source columns found, numeric, non-leakage"
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

    def get_report(self) -> Dict[str, Any]:
        """Full report of accepted and rejected feature specs."""
        return {
            "accepted_count": len(self.accepted_specs_),
            "rejected_count": len(self.rejected_specs_),
            "accepted": self.accepted_specs_,
            "rejected": self.rejected_specs_
        }
