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
from sklearn.feature_selection import VarianceThreshold, f_classif


VARIANCE_THRESHOLD = 1e-4
CORRELATION_THRESHOLD = 0.95
P_VALUE_THRESHOLD = 0.05


class HybridFeatureSelector(BaseEstimator, TransformerMixin):
    r"""
    Multi-stage feature selector fitted strictly on training data.

    Stage 1: Variance filter — remove features with variance < 1e-4 (near-constant).
    Stage 2: Correlation filter — for pairs with |r| > 0.95, remove the feature with
             lower variance (safeguards linear model conditioning).
    Stage 3: Statistical relevance filter — univariate ANOVA F-test (p < 0.05)
             to filter out noise attributes lacking statistical association with target.
             (Train-only, deterministic, $O(N \cdot D)$, non-wrapper).
    """

    def __init__(
        self,
        variance_threshold: float = VARIANCE_THRESHOLD,
        correlation_threshold: float = CORRELATION_THRESHOLD,
        p_value_threshold: Optional[float] = P_VALUE_THRESHOLD,
        min_features_to_keep: int = 1
    ):
        self.variance_threshold = variance_threshold
        self.correlation_threshold = correlation_threshold
        self.p_value_threshold = p_value_threshold
        self.min_features_to_keep = min_features_to_keep

        # Fitted state
        self.selected_features_: List[str] = []
        self.removed_low_variance_: List[Dict[str, Any]] = []
        self.removed_high_corr_: List[Dict[str, Any]] = []
        self.removed_low_relevance_: List[Dict[str, Any]] = []
        self.relevance_scores_: Dict[str, Dict[str, float]] = {}
        self.decision_trace_: List[Dict[str, Any]] = []
        self.is_fitted_: bool = False
        self._variance_selector: Optional[VarianceThreshold] = None

    def fit(self, X: pd.DataFrame, y=None):
        """
        Fits the multi-stage selection pipeline strictly on training data.
        X_test is NEVER accessed or evaluated during fit.
        """
        if not isinstance(X, pd.DataFrame):
            X = pd.DataFrame(X)

        self.selected_features_ = []
        self.removed_low_variance_ = []
        self.removed_high_corr_ = []
        self.removed_low_relevance_ = []
        self.relevance_scores_ = {}
        self.decision_trace_ = []

        if X.empty or X.shape[1] == 0:
            self.is_fitted_ = True
            return self

        # Ensure all numeric — drop non-numeric columns silently
        X_numeric = X.select_dtypes(include=[np.number])
        all_cols = list(X_numeric.columns)
        self.initial_feature_count_ = int(X_numeric.shape[1])

        # ===== Step 1: Variance Threshold =====
        if X_numeric.shape[0] > 0 and X_numeric.shape[1] > 0:

            self._variance_selector = VarianceThreshold(threshold=self.variance_threshold)
            try:
                self._variance_selector.fit(X_numeric.fillna(0))
                var_mask = self._variance_selector.get_support()
                variances = self._variance_selector.variances_

                after_variance = []
                for i, col in enumerate(all_cols):
                    var_val = float(variances[i])
                    if var_mask[i]:
                        after_variance.append(col)
                    else:
                        rem_item = {
                            "feature": col,
                            "variance": var_val,
                            "threshold": self.variance_threshold,
                            "reason": f"Variance {var_val:.6f} < threshold {self.variance_threshold}"
                        }
                        self.removed_low_variance_.append(rem_item)
                        self.decision_trace_.append({
                            "stage": "feature_selection",
                            "column_name": col,
                            "feature": col,
                            "rule_id": "RULE_FS_LOW_VARIANCE_FILTER",
                            "rule_triggered": "RULE_FS_LOW_VARIANCE_FILTER",
                            "detected_statistic": {"variance": round(var_val, 6)},
                            "threshold_condition": f"variance < {self.variance_threshold}",
                            "selected_action": "remove_feature",
                            "reason": rem_item["reason"],
                            "resulting_feature_change": "Quasi-constant feature pruned"
                        })
            except Exception:
                after_variance = all_cols
        else:
            after_variance = all_cols

        # ===== Step 2: Correlation Filter =====
        removed_corr_set = set()

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

                    if col_i in removed_corr_set or col_j in removed_corr_set:
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

                        removed_corr_set.add(to_remove)
                        corr_item = {
                            "removed_feature": to_remove,
                            "kept_feature": to_keep,
                            "correlation": round(float(r), 6),
                            "threshold": self.correlation_threshold,
                            "reason": f"|r| = {r:.4f} > {self.correlation_threshold} with '{to_keep}'"
                        }
                        self.removed_high_corr_.append(corr_item)
                        self.decision_trace_.append({
                            "stage": "feature_selection",
                            "column_name": to_remove,
                            "feature": to_remove,
                            "rule_id": "RULE_FS_HIGH_CORRELATION_PRUNE",
                            "rule_triggered": "RULE_FS_HIGH_CORRELATION_PRUNE",
                            "detected_statistic": {
                                "correlation": round(float(r), 6),
                                "kept_feature": to_keep,
                                "removed_variance": round(col_variances.get(to_remove, 0), 6),
                                "kept_variance": round(col_variances.get(to_keep, 0), 6)
                            },
                            "threshold_condition": f"|r| > {self.correlation_threshold}",
                            "selected_action": "remove_redundant_feature",
                            "reason": corr_item["reason"],
                            "resulting_feature_change": f"Pruned redundant collinear proxy of '{to_keep}'"
                        })

        after_corr = [col for col in after_variance if col not in removed_corr_set]

        # ===== Step 3: Statistical Relevance Stage (ANOVA F-test) =====
        after_relevance = after_corr
        removed_relevance_set = set()

        if y is not None and self.p_value_threshold is not None and len(after_corr) > 0:
            try:
                y_arr = np.asarray(y)
                # Drop rows where target is null if any
                valid_mask = pd.notna(y_arr)
                if len(np.unique(y_arr[valid_mask])) >= 2:
                    X_post_corr = X_numeric[after_corr].iloc[valid_mask].fillna(0)
                    f_stats, p_values = f_classif(X_post_corr, y_arr[valid_mask])

                    # Clean NaNs or infs
                    f_stats = np.nan_to_num(f_stats, nan=0.0, posinf=0.0, neginf=0.0)
                    p_values = np.nan_to_num(p_values, nan=1.0, posinf=1.0, neginf=1.0)

                    candidate_removals = []
                    for idx, col in enumerate(after_corr):
                        f_val = float(f_stats[idx])
                        p_val = float(p_values[idx])
                        self.relevance_scores_[col] = {
                            "f_statistic": round(f_val, 4),
                            "p_value": round(p_val, 6)
                        }

                        if p_val >= self.p_value_threshold:
                            candidate_removals.append((col, f_val, p_val))

                    # Safeguard: ensure we don't drop all features
                    max_removals = max(0, len(after_corr) - self.min_features_to_keep)
                    # Sort candidates by F-statistic ascending (lowest relevance removed first)
                    candidate_removals.sort(key=lambda x: x[1])
                    actual_removals = candidate_removals[:max_removals]

                    for col, f_val, p_val in actual_removals:
                        removed_relevance_set.add(col)
                        rel_item = {
                            "feature": col,
                            "f_statistic": round(f_val, 4),
                            "p_value": round(p_val, 6),
                            "threshold": self.p_value_threshold,
                            "reason": (
                                f"ANOVA F-statistic {f_val:.4f} (p-value {p_val:.4f} >= {self.p_value_threshold}) "
                                f"indicates no statistically significant association with target"
                            )
                        }
                        self.removed_low_relevance_.append(rel_item)
                        self.decision_trace_.append({
                            "stage": "feature_selection",
                            "column_name": col,
                            "feature": col,
                            "rule_id": "RULE_FS_STATISTICAL_RELEVANCE_FILTER",
                            "rule_triggered": "RULE_FS_STATISTICAL_RELEVANCE_FILTER",
                            "detected_statistic": {"f_statistic": round(f_val, 4), "p_value": round(p_val, 6)},
                            "threshold_condition": f"p_value >= {self.p_value_threshold}",
                            "selected_action": "remove_low_relevance_feature",
                            "reason": rel_item["reason"],
                            "resulting_feature_change": "Feature lacking statistically significant target separation dropped"
                        })

                    after_relevance = [c for c in after_corr if c not in removed_relevance_set]
            except Exception:
                after_relevance = after_corr

        self.selected_features_ = after_relevance

        # Record retained features trace
        for col in self.selected_features_:
            rel_info = self.relevance_scores_.get(col, {})
            self.decision_trace_.append({
                "stage": "feature_selection",
                "column_name": col,
                "feature": col,
                "rule_id": "RULE_FS_FEATURE_RETAINED",
                "rule_triggered": "RULE_FS_FEATURE_RETAINED",
                "detected_statistic": rel_info,
                "threshold_condition": "passed variance, correlation, and relevance filters",
                "selected_action": "retain_for_model",
                "reason": "Feature exhibits significant variance, non-redundancy, and predictive relevance",
                "resulting_feature_change": "Feature selected for final machine learning estimation matrix"
            })

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

        result = X.copy()
        for col in self.selected_features_:
            if col not in result.columns:
                result[col] = 0.0

        aligned = result[self.selected_features_].copy()
        arr = np.nan_to_num(aligned.to_numpy(dtype=np.float64, copy=False), nan=0.0, posinf=0.0, neginf=0.0)
        assert arr.shape[1] == len(self.selected_features_), (
            f"Selector shape mismatch: matrix has {arr.shape[1]} cols, expected {len(self.selected_features_)}"
        )
        return pd.DataFrame(arr, columns=self.selected_features_, index=X.index)

    def fit_transform(self, X: pd.DataFrame, y=None) -> pd.DataFrame:
        return self.fit(X, y).transform(X)

    def get_selected_features(self) -> List[str]:
        return self.selected_features_

    def get_decision_trace(self) -> List[Dict[str, Any]]:
        return self.decision_trace_

    def get_report(self) -> Dict[str, Any]:
        return {
            "initial_feature_count": getattr(self, "initial_feature_count_", len(self.selected_features_)),
            "variance_threshold": self.variance_threshold,
            "correlation_threshold": self.correlation_threshold,
            "p_value_threshold": self.p_value_threshold,
            "selected_count": len(self.selected_features_),
            "removed_low_variance_count": len(self.removed_low_variance_),
            "removed_high_corr_count": len(self.removed_high_corr_),
            "removed_low_relevance_count": len(self.removed_low_relevance_),
            "selected_features": self.selected_features_,
            "removed_low_variance": self.removed_low_variance_,
            "removed_high_corr": self.removed_high_corr_,
            "removed_low_relevance": self.removed_low_relevance_,
            "relevance_scores": self.relevance_scores_,
            "decision_trace": self.decision_trace_
        }

