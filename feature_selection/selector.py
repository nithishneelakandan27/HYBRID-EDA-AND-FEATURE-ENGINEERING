"""
feature_selection/selector.py

HybridFeatureSelector: Research methodology feature selection.

Step 1: Variance filter — VarianceThreshold(threshold=1e-4)
Step 2: Correlation filter — remove one from each pair where |r| > 0.95

CRITICAL: All statistics are computed ONLY on X_train.
X_test is never used during fit().
"""
import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.feature_selection import VarianceThreshold


VARIANCE_THRESHOLD = 1e-4
CORRELATION_THRESHOLD = 0.95


class HybridFeatureSelector(BaseEstimator, TransformerMixin):
    """
    Two-step feature selector fitted strictly on training data.

    Step 1: Remove features with variance < 1e-4 (near-constant features).
    Step 2: For correlated pairs |r| > 0.95, remove the feature with
            lower variance (retain the higher-variance one).
    """

    def __init__(
        self,
        variance_threshold: float = VARIANCE_THRESHOLD,
        correlation_threshold: float = CORRELATION_THRESHOLD
    ):
        self.variance_threshold = variance_threshold
        self.correlation_threshold = correlation_threshold

        # Fitted state
        self.selected_features_: List[str] = []
        self.removed_low_variance_: List[Dict[str, Any]] = []
        self.removed_high_corr_: List[Dict[str, Any]] = []
        self.is_fitted_: bool = False
        self._variance_selector: Optional[VarianceThreshold] = None

    def fit(self, X: pd.DataFrame, y=None):
        """
        Fits the two-step selection pipeline on training data only.
        """
        if not isinstance(X, pd.DataFrame):
            X = pd.DataFrame(X)

        if X.empty or X.shape[1] == 0:
            self.selected_features_ = []
            self.is_fitted_ = True
            return self

        # Ensure all numeric — drop non-numeric columns silently
        X_numeric = X.select_dtypes(include=[np.number])
        all_cols = list(X_numeric.columns)

        # ----- Step 1: Variance Threshold -----
        self.removed_low_variance_ = []

        if X_numeric.shape[0] > 0 and X_numeric.shape[1] > 0:
            self._variance_selector = VarianceThreshold(threshold=self.variance_threshold)
            try:
                self._variance_selector.fit(X_numeric.fillna(0))
                var_mask = self._variance_selector.get_support()
                variances = self._variance_selector.variances_

                after_variance = []
                for i, col in enumerate(all_cols):
                    if var_mask[i]:
                        after_variance.append(col)
                    else:
                        self.removed_low_variance_.append({
                            "feature": col,
                            "variance": float(variances[i]),
                            "reason": f"Variance {variances[i]:.6f} < threshold {self.variance_threshold}"
                        })
            except Exception:
                after_variance = all_cols
        else:
            after_variance = all_cols

        # ----- Step 2: Correlation Filter -----
        self.removed_high_corr_ = []
        removed_set = set()

        if len(after_variance) > 1:
            X_post_var = X_numeric[after_variance].fillna(0)
            corr_matrix = X_post_var.corr().abs()

            # Compute per-column variance for tie-breaking
            col_variances = {col: float(X_post_var[col].var()) for col in after_variance}

            # Upper triangle only (avoid double-counting pairs)
            for i in range(len(after_variance)):
                for j in range(i + 1, len(after_variance)):
                    col_i = after_variance[i]
                    col_j = after_variance[j]

                    if col_i in removed_set or col_j in removed_set:
                        continue

                    r = corr_matrix.loc[col_i, col_j]
                    if pd.isna(r):
                        continue

                    if r > self.correlation_threshold:
                        # Remove the one with lower variance (keep higher variance)
                        if col_variances.get(col_i, 0) <= col_variances.get(col_j, 0):
                            to_remove = col_i
                            to_keep = col_j
                        else:
                            to_remove = col_j
                            to_keep = col_i

                        removed_set.add(to_remove)
                        self.removed_high_corr_.append({
                            "removed_feature": to_remove,
                            "kept_feature": to_keep,
                            "correlation": round(float(r), 6),
                            "reason": f"|r| = {r:.4f} > {self.correlation_threshold} with '{to_keep}'"
                        })

        self.selected_features_ = [
            col for col in after_variance if col not in removed_set
        ]
        self.is_fitted_ = True
        return self

    def transform(self, X: pd.DataFrame) -> pd.DataFrame:
        """
        Applies the fitted feature mask to any DataFrame.
        Returns only selected feature columns present in X.
        """
        if not self.is_fitted_:
            raise RuntimeError("HybridFeatureSelector is not fitted. Call fit() first.")

        if not isinstance(X, pd.DataFrame):
            X = pd.DataFrame(X)

        present = [col for col in self.selected_features_ if col in X.columns]
        return X[present]

    def fit_transform(self, X: pd.DataFrame, y=None) -> pd.DataFrame:
        return self.fit(X, y).transform(X)

    def get_selected_features(self) -> List[str]:
        return self.selected_features_

    def get_report(self) -> Dict[str, Any]:
        return {
            "variance_threshold": self.variance_threshold,
            "correlation_threshold": self.correlation_threshold,
            "selected_count": len(self.selected_features_),
            "removed_low_variance_count": len(self.removed_low_variance_),
            "removed_high_corr_count": len(self.removed_high_corr_),
            "selected_features": self.selected_features_,
            "removed_low_variance": self.removed_low_variance_,
            "removed_high_corr": self.removed_high_corr_
        }
