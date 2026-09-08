import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.preprocessing import StandardScaler, RobustScaler, OneHotEncoder, OrdinalEncoder

class SkewAwareNumericImputer(BaseEstimator, TransformerMixin):
    """
    Implements research rule:
    |skewness| < 1.0 -> Mean Imputation
    |skewness| >= 1.0 -> Median Imputation
    Learned strictly from training data.
    """
    def __init__(self, skewness_threshold: float = 1.0):
        self.skewness_threshold = skewness_threshold
        self.statistics_: Dict[str, float] = {}
        self.imputation_methods_: Dict[str, str] = {}
        self.skewness_values_: Dict[str, float] = {}
        self.feature_names_in_: List[str] = []

    def fit(self, X: pd.DataFrame, y=None):
        if not isinstance(X, pd.DataFrame):
            X = pd.DataFrame(X)
        
        self.feature_names_in_ = [str(c) for c in X.columns]
        self.statistics_ = {}
        self.imputation_methods_ = {}
        self.skewness_values_ = {}

        for col in X.columns:
            series = X[col].dropna()
            if series.empty:
                # Fallback to 0.0 if entirely empty
                self.statistics_[str(col)] = 0.0
                self.imputation_methods_[str(col)] = "mean"
                self.skewness_values_[str(col)] = 0.0
                continue

            skew_val = float(series.skew()) if len(series) > 2 else 0.0
            self.skewness_values_[str(col)] = round(skew_val, 4)

            if abs(skew_val) < self.skewness_threshold:
                mean_val = float(series.mean())
                self.statistics_[str(col)] = mean_val
                self.imputation_methods_[str(col)] = "mean_imputation"
            else:
                median_val = float(series.median())
                self.statistics_[str(col)] = median_val
                self.imputation_methods_[str(col)] = "median_imputation"

        return self

    def transform(self, X: pd.DataFrame) -> pd.DataFrame:
        if not isinstance(X, pd.DataFrame):
            X = pd.DataFrame(X, columns=self.feature_names_in_)
        else:
            X = X.copy()

        for col in self.feature_names_in_:
            if col in X.columns and col in self.statistics_:
                fill_val = self.statistics_[col]
                X[col] = X[col].fillna(fill_val)

        return X


class ConditionalLog1pTransformer(BaseEstimator, TransformerMixin):
    """
    Implements research rule:
    IF |skewness| > 1.0 AND min >= 0 -> apply log1p(x)
    Otherwise -> no log transformation
    Decisions learned strictly from training data.
    """
    def __init__(self, skewness_threshold: float = 1.0):
        self.skewness_threshold = skewness_threshold
        self.log_cols_: List[str] = []
        self.min_values_: Dict[str, float] = {}
        self.skewness_values_: Dict[str, float] = {}
        self.feature_names_in_: List[str] = []

    def fit(self, X: pd.DataFrame, y=None):
        if not isinstance(X, pd.DataFrame):
            X = pd.DataFrame(X)
            
        self.feature_names_in_ = [str(c) for c in X.columns]
        self.log_cols_ = []
        self.min_values_ = {}
        self.skewness_values_ = {}

        for col in X.columns:
            series = X[col].dropna()
            if series.empty:
                continue

            skew_val = float(series.skew()) if len(series) > 2 else 0.0
            min_val = float(series.min())
            self.skewness_values_[str(col)] = round(skew_val, 4)
            self.min_values_[str(col)] = round(min_val, 4)

            if abs(skew_val) > self.skewness_threshold and min_val >= 0:
                self.log_cols_.append(str(col))

        return self

    def transform(self, X: pd.DataFrame) -> pd.DataFrame:
        if not isinstance(X, pd.DataFrame):
            X = pd.DataFrame(X, columns=self.feature_names_in_)
        else:
            X = X.copy()

        for col in self.log_cols_:
            if col in X.columns:
                # Ensure non-negative before log1p
                val = np.maximum(X[col].values.astype(float), 0.0)
                X[col] = np.log1p(val)

        return X


class OutlierAwareScaler(BaseEstimator, TransformerMixin):
    """
    Implements research rule:
    IQR outlier proportion > 2% -> RobustScaler
    Otherwise -> StandardScaler
    Fitted strictly on training data.
    """
    def __init__(self, outlier_threshold: float = 0.02):
        self.outlier_threshold = outlier_threshold
        self.scalers_: Dict[str, Any] = {}
        self.scaler_types_: Dict[str, str] = {}
        self.outlier_percentages_: Dict[str, float] = {}
        self.feature_names_in_: List[str] = []

    def fit(self, X: pd.DataFrame, y=None):
        if not isinstance(X, pd.DataFrame):
            X = pd.DataFrame(X)

        self.feature_names_in_ = [str(c) for c in X.columns]
        self.scalers_ = {}
        self.scaler_types_ = {}
        self.outlier_percentages_ = {}

        for col in X.columns:
            series = X[col].dropna()
            col_name = str(col)
            if series.empty:
                continue

            q1 = float(series.quantile(0.25))
            q3 = float(series.quantile(0.75))
            iqr = q3 - q1
            lower_bound = q1 - 1.5 * iqr
            upper_bound = q3 + 1.5 * iqr

            outliers = series[(series < lower_bound) | (series > upper_bound)]
            outlier_count = len(outliers)
            total_count = len(series)
            outlier_prop = float(outlier_count / total_count) if total_count > 0 else 0.0
            outlier_pct = round(outlier_prop * 100, 2)
            self.outlier_percentages_[col_name] = outlier_pct

            col_2d = X[[col]].values.astype(float)

            if outlier_prop > self.outlier_threshold:
                scaler = RobustScaler()
                scaler.fit(col_2d)
                self.scalers_[col_name] = scaler
                self.scaler_types_[col_name] = "RobustScaler"
            else:
                scaler = StandardScaler()
                scaler.fit(col_2d)
                self.scalers_[col_name] = scaler
                self.scaler_types_[col_name] = "StandardScaler"

        return self

    def transform(self, X: pd.DataFrame) -> pd.DataFrame:
        if not isinstance(X, pd.DataFrame):
            X = pd.DataFrame(X, columns=self.feature_names_in_)
        else:
            X = X.copy()

        for col in self.feature_names_in_:
            if col in X.columns and col in self.scalers_:
                scaler = self.scalers_[col]
                col_2d = X[[col]].values.astype(float)
                transformed_col = scaler.transform(col_2d)
                X[col] = transformed_col.flatten()

        return X


class SafeCategoricalEncoder(BaseEstimator, TransformerMixin):
    """
    Implements research rule:
    Cardinality <= 15 -> OneHotEncoder(handle_unknown="ignore")
    Cardinality > 15 -> OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=-1)
    Fitted strictly on training data. Never crashes on unseen test categories.
    """
    def __init__(self, cardinality_threshold: int = 15):
        self.cardinality_threshold = cardinality_threshold
        self.encoders_: Dict[str, Any] = {}
        self.encoder_types_: Dict[str, str] = {}
        self.cardinalities_: Dict[str, int] = {}
        self.feature_names_in_: List[str] = []
        self.feature_names_out_: List[str] = []

    def fit(self, X: pd.DataFrame, y=None):
        if not isinstance(X, pd.DataFrame):
            X = pd.DataFrame(X)

        self.feature_names_in_ = [str(c) for c in X.columns]
        self.encoders_ = {}
        self.encoder_types_ = {}
        self.cardinalities_ = {}
        self.feature_names_out_ = []

        for col in X.columns:
            col_name = str(col)
            # Ensure string representation for categories, converting NaNs to 'missing'
            series = X[col].astype(str)
            unique_count = int(X[col].dropna().nunique())
            self.cardinalities_[col_name] = unique_count

            col_2d = series.values.reshape(-1, 1)

            if unique_count <= self.cardinality_threshold:
                encoder = OneHotEncoder(handle_unknown="ignore", sparse_output=False)
                encoder.fit(col_2d)
                self.encoders_[col_name] = encoder
                self.encoder_types_[col_name] = "OneHotEncoder"
                for cat in encoder.categories_[0]:
                    self.feature_names_out_.append(f"{col_name}_{cat}")
            else:
                encoder = OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=-1)
                encoder.fit(col_2d)
                self.encoders_[col_name] = encoder
                self.encoder_types_[col_name] = "OrdinalEncoder"
                self.feature_names_out_.append(f"{col_name}_ordinal")

        return self

    def transform(self, X: pd.DataFrame) -> pd.DataFrame:
        if not isinstance(X, pd.DataFrame):
            X = pd.DataFrame(X, columns=self.feature_names_in_)
        else:
            X = X.copy()

        encoded_dfs = []
        for col in self.feature_names_in_:
            if col in X.columns and col in self.encoders_:
                encoder = self.encoders_[col]
                enc_type = self.encoder_types_[col]
                col_2d = X[col].astype(str).values.reshape(-1, 1)
                encoded_arr = encoder.transform(col_2d)

                if enc_type == "OneHotEncoder":
                    col_names = [f"{col}_{cat}" for cat in encoder.categories_[0]]
                    encoded_sub_df = pd.DataFrame(encoded_arr, columns=col_names, index=X.index)
                    encoded_dfs.append(encoded_sub_df)
                else:
                    col_name = f"{col}_ordinal"
                    encoded_sub_df = pd.DataFrame(encoded_arr, columns=[col_name], index=X.index)
                    encoded_dfs.append(encoded_sub_df)

        if encoded_dfs:
            return pd.concat(encoded_dfs, axis=1)
        else:
            return pd.DataFrame(index=X.index)

    def get_feature_names_out(self) -> List[str]:
        return self.feature_names_out_
