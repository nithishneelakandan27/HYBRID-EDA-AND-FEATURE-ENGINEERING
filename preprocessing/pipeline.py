import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.impute import SimpleImputer

from decision_engine.engine import HybridDecisionEngine
from preprocessing.transformers import (
    SkewAwareNumericImputer,
    ConditionalLog1pTransformer,
    OutlierAwareScaler,
    SafeCategoricalEncoder
)

class HybridPreprocessor(BaseEstimator, TransformerMixin):
    """
    Executes the Phase 4 Decision Plan strictly on training data.
    Provides fit(X_train), transform(X), fit_transform(X_train), and get_feature_names_out().
    Guarantees no data leakage from test data.
    """
    def __init__(
        self,
        leakage_columns: Optional[List[str]] = None,
        skewness_threshold: float = 1.0,
        outlier_threshold: float = 0.02,
        cardinality_threshold: int = 15
    ):
        self.leakage_columns = leakage_columns
        self.skewness_threshold = skewness_threshold
        self.outlier_threshold = outlier_threshold
        self.cardinality_threshold = cardinality_threshold

        # Fitted artifacts
        self.decision_plan_: Optional[Dict[str, Any]] = None
        self.usable_numeric_cols_: List[str] = []
        self.usable_categorical_cols_: List[str] = []
        self.excluded_cols_: List[str] = []
        self.leakage_cols_: List[str] = []

        # Transformers
        self.numeric_imputer_: Optional[SkewAwareNumericImputer] = None
        self.numeric_log_: Optional[ConditionalLog1pTransformer] = None
        self.numeric_scaler_: Optional[OutlierAwareScaler] = None

        self.categorical_imputer_: Optional[SimpleImputer] = None
        self.categorical_encoder_: Optional[SafeCategoricalEncoder] = None

        self.feature_names_out_: List[str] = []
        self.is_fitted_: bool = False

    def fit(self, X: pd.DataFrame, y=None):
        if not isinstance(X, pd.DataFrame):
            X = pd.DataFrame(X)

        # 1. Generate Decision Plan strictly on X (which must be training data)
        self.decision_plan_ = HybridDecisionEngine.generate_plan(
            df=X,
            leakage_columns=self.leakage_columns,
            skewness_threshold=self.skewness_threshold,
            outlier_threshold=self.outlier_threshold,
            cardinality_threshold=self.cardinality_threshold
        )

        # 2. Partition columns by status
        self.usable_numeric_cols_ = []
        self.usable_categorical_cols_ = []
        self.excluded_cols_ = []
        self.leakage_cols_ = []

        for col_info in self.decision_plan_["columns"]:
            c_name = col_info["column_name"]
            c_status = col_info["status"]
            if c_status == "usable_numeric":
                self.usable_numeric_cols_.append(c_name)
            elif c_status == "usable_categorical":
                self.usable_categorical_cols_.append(c_name)
            elif c_status == "leakage_candidate":
                self.leakage_cols_.append(c_name)
                self.excluded_cols_.append(c_name)
            else:
                self.excluded_cols_.append(c_name)

        # 3. Fit Numeric Pipeline on training data
        if self.usable_numeric_cols_:
            X_num = X[self.usable_numeric_cols_].copy()

            # A: Skew-aware Imputation
            self.numeric_imputer_ = SkewAwareNumericImputer(skewness_threshold=self.skewness_threshold)
            X_num_imp = self.numeric_imputer_.fit_transform(X_num)

            # B: Conditional log1p
            self.numeric_log_ = ConditionalLog1pTransformer(skewness_threshold=self.skewness_threshold)
            X_num_log = self.numeric_log_.fit_transform(X_num_imp)

            # C: Outlier-aware Scaling
            self.numeric_scaler_ = OutlierAwareScaler(outlier_threshold=self.outlier_threshold)
            self.numeric_scaler_.fit(X_num_log)

        # 4. Fit Categorical Pipeline on training data
        if self.usable_categorical_cols_:
            X_cat = X[self.usable_categorical_cols_].copy()

            # A: Most-frequent Imputation
            self.categorical_imputer_ = SimpleImputer(strategy="most_frequent", keep_empty_features=True)
            X_cat_imp_arr = self.categorical_imputer_.fit_transform(X_cat)
            assert X_cat_imp_arr.shape[1] == len(self.usable_categorical_cols_), (
                f"Categorical imputer shape mismatch: matrix has {X_cat_imp_arr.shape[1]} cols, "
                f"expected {len(self.usable_categorical_cols_)}"
            )
            X_cat_imp = pd.DataFrame(X_cat_imp_arr, columns=self.usable_categorical_cols_, index=X_cat.index)

            # B: Cardinality-aware Encoding
            self.categorical_encoder_ = SafeCategoricalEncoder(cardinality_threshold=self.cardinality_threshold)
            self.categorical_encoder_.fit(X_cat_imp)

        # 5. Compute Feature Names Out
        names = []
        if self.usable_numeric_cols_:
            names.extend(self.usable_numeric_cols_)
        if self.categorical_encoder_:
            names.extend(self.categorical_encoder_.get_feature_names_out())
        self.feature_names_out_ = names

        self.is_fitted_ = True
        return self

    def transform(self, X: pd.DataFrame) -> pd.DataFrame:
        if not self.is_fitted_:
            raise RuntimeError("HybridPreprocessor instance is not fitted yet. Call 'fit' before 'transform'.")

        if not isinstance(X, pd.DataFrame):
            X = pd.DataFrame(X)

        transformed_parts = []

        # 1. Transform Numeric Columns
        if self.usable_numeric_cols_:
            # Take only numeric columns present
            present_num = [c for c in self.usable_numeric_cols_ if c in X.columns]
            X_num = X[present_num].copy()
            
            # Fill missing columns with NaN if any were omitted in test
            for c in self.usable_numeric_cols_:
                if c not in X_num.columns:
                    X_num[c] = np.nan

            X_num = X_num[self.usable_numeric_cols_]
            X_num_imp = self.numeric_imputer_.transform(X_num)
            X_num_log = self.numeric_log_.transform(X_num_imp)
            X_num_scaled = self.numeric_scaler_.transform(X_num_log)
            transformed_parts.append(pd.DataFrame(X_num_scaled, columns=self.usable_numeric_cols_, index=X.index))

        # 2. Transform Categorical Columns
        if self.usable_categorical_cols_:
            present_cat = [c for c in self.usable_categorical_cols_ if c in X.columns]
            X_cat = X[present_cat].copy()

            for c in self.usable_categorical_cols_:
                if c not in X_cat.columns:
                    X_cat[c] = "missing"

            X_cat = X_cat[self.usable_categorical_cols_]
            X_cat_imp_arr = self.categorical_imputer_.transform(X_cat)
            X_cat_imp = pd.DataFrame(X_cat_imp_arr, columns=self.usable_categorical_cols_, index=X.index)
            X_cat_encoded = self.categorical_encoder_.transform(X_cat_imp)
            transformed_parts.append(X_cat_encoded)

        if transformed_parts:
            result_df = pd.concat(transformed_parts, axis=1)
            # Align column order with feature_names_out_
            for col in self.feature_names_out_:
                if col not in result_df.columns:
                    result_df[col] = 0.0
            aligned_df = result_df[self.feature_names_out_].copy()
            arr = np.nan_to_num(aligned_df.to_numpy(dtype=np.float64, copy=False), nan=0.0, posinf=0.0, neginf=0.0)
            assert arr.shape[1] == len(self.feature_names_out_), (
                f"HybridPreprocessor shape mismatch: matrix has {arr.shape[1]} cols, expected {len(self.feature_names_out_)}"
            )
            return pd.DataFrame(arr, columns=self.feature_names_out_, index=X.index)
        else:
            return pd.DataFrame(index=X.index)

    def fit_transform(self, X: pd.DataFrame, y=None) -> pd.DataFrame:
        return self.fit(X, y).transform(X)

    def get_feature_names_out(self) -> List[str]:
        return self.feature_names_out_

    def get_metadata(self) -> Dict[str, Any]:
        """
        Returns comprehensive metadata describing the fitted preprocessing operations.
        """
        if not self.is_fitted_:
            return {"is_fitted": False}

        numeric_meta = {}
        if self.numeric_imputer_:
            for col in self.usable_numeric_cols_:
                numeric_meta[col] = {
                    "imputation_method": self.numeric_imputer_.imputation_methods_.get(col),
                    "imputed_value": round(float(self.numeric_imputer_.statistics_.get(col, 0.0)), 4),
                    "skewness": self.numeric_imputer_.skewness_values_.get(col),
                    "log1p_applied": col in (self.numeric_log_.log_cols_ if self.numeric_log_ else []),
                    "scaler_type": self.numeric_scaler_.scaler_types_.get(col) if self.numeric_scaler_ else None,
                    "outlier_percentage": self.numeric_scaler_.outlier_percentages_.get(col) if self.numeric_scaler_ else 0.0
                }

        categorical_meta = {}
        if self.categorical_encoder_:
            for col in self.usable_categorical_cols_:
                categorical_meta[col] = {
                    "encoder_type": self.categorical_encoder_.encoder_types_.get(col),
                    "cardinality": self.categorical_encoder_.cardinalities_.get(col)
                }

        return {
            "is_fitted": True,
            "retained_features_count_before_encoding": len(self.usable_numeric_cols_) + len(self.usable_categorical_cols_),
            "transformed_features_count": len(self.feature_names_out_),
            "usable_numeric_columns": self.usable_numeric_cols_,
            "usable_categorical_columns": self.usable_categorical_cols_,
            "excluded_columns": self.excluded_cols_,
            "leakage_columns": self.leakage_cols_,
            "numeric_operations": numeric_meta,
            "categorical_operations": categorical_meta,
            "feature_names": self.feature_names_out_
        }
