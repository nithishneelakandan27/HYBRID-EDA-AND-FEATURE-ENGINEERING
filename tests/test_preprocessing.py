import sys
import os
import pandas as pd
import numpy as np
import pytest
from fastapi.testclient import TestClient

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../')))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../backend')))

from main import app
from preprocessing.transformers import (
    SkewAwareNumericImputer,
    ConditionalLog1pTransformer,
    OutlierAwareScaler,
    SafeCategoricalEncoder
)
from preprocessing.pipeline import HybridPreprocessor
from data_processing.ingestion import DatasetIngestionService

client = TestClient(app)

def test_1_numeric_low_skew_missing_mean_imputation():
    train_df = pd.DataFrame({"num": [10.0, 11.0, 12.0, 10.0, 11.0, 12.0, np.nan, 10.5]})
    imputer = SkewAwareNumericImputer()
    imputer.fit(train_df)
    assert imputer.imputation_methods_["num"] == "mean_imputation"
    trans = imputer.transform(train_df)
    assert not trans["num"].isnull().any()
    expected_mean = float(train_df["num"].dropna().mean())
    assert abs(trans.loc[6, "num"] - expected_mean) < 1e-4

def test_2_numeric_high_skew_missing_median_imputation():
    train_df = pd.DataFrame({"skewed": [1.0, 1.2, 1.1, 1.0, 1.3, 1000.0, 2500.0, np.nan]})
    imputer = SkewAwareNumericImputer()
    imputer.fit(train_df)
    assert imputer.imputation_methods_["skewed"] == "median_imputation"
    trans = imputer.transform(train_df)
    assert not trans["skewed"].isnull().any()
    expected_median = float(train_df["skewed"].dropna().median())
    assert abs(trans.loc[7, "skewed"] - expected_median) < 1e-4

def test_3_high_outlier_proportion_robust_scaler():
    train_df = pd.DataFrame({"vals": [10.0, 11.0, 10.5, 11.2, 10.8, 11.0, 10.2, 10.9, 11.1, 100.0]})
    scaler = OutlierAwareScaler(outlier_threshold=0.02)
    scaler.fit(train_df)
    assert scaler.scaler_types_["vals"] == "RobustScaler"
    trans = scaler.transform(train_df)
    assert trans.shape == train_df.shape

def test_4_low_outlier_proportion_standard_scaler():
    train_df = pd.DataFrame({"vals": list(range(100))})
    scaler = OutlierAwareScaler(outlier_threshold=0.02)
    scaler.fit(train_df)
    assert scaler.scaler_types_["vals"] == "StandardScaler"

def test_5_high_skew_non_negative_log1p():
    train_df = pd.DataFrame({"vals": [1.0, 1.2, 1.1, 1.0, 1.3, 50.0, 200.0, 500.0]})
    log_trans = ConditionalLog1pTransformer()
    log_trans.fit(train_df)
    assert "vals" in log_trans.log_cols_
    trans = log_trans.transform(train_df)
    assert abs(trans.loc[7, "vals"] - np.log1p(500.0)) < 1e-4

def test_6_high_skew_with_negative_values_no_log1p():
    train_df = pd.DataFrame({"vals": [-50.0, 1.0, 1.2, 1.1, 1.0, 1.3, 100.0, 500.0]})
    log_trans = ConditionalLog1pTransformer()
    log_trans.fit(train_df)
    assert "vals" not in log_trans.log_cols_
    trans = log_trans.transform(train_df)
    assert trans.loc[0, "vals"] == -50.0

def test_7_low_cardinality_categorical_one_hot_encoder():
    train_df = pd.DataFrame({"cat": ["A", "B", "C", "A", "B"]})
    encoder = SafeCategoricalEncoder(cardinality_threshold=15)
    encoder.fit(train_df)
    assert encoder.encoder_types_["cat"] == "OneHotEncoder"
    trans = encoder.transform(train_df)
    assert trans.shape[1] == 3
    assert set(encoder.get_feature_names_out()) == {"cat_A", "cat_B", "cat_C"}

def test_8_high_cardinality_categorical_ordinal_encoder():
    train_df = pd.DataFrame({"cat": [f"Cat_{i}" for i in range(20)]})
    encoder = SafeCategoricalEncoder(cardinality_threshold=15)
    encoder.fit(train_df)
    assert encoder.encoder_types_["cat"] == "OrdinalEncoder"
    trans = encoder.transform(train_df)
    assert trans.shape[1] == 1
    assert encoder.get_feature_names_out() == ["cat_ordinal"]

def test_9_unseen_categorical_in_test_does_not_crash():
    train_df = pd.DataFrame({
        "low_cat": ["A", "B", "C"] * 6 + ["A", "B"],
        "high_cat": [f"Item_{i}" for i in range(20)]
    })
    encoder = SafeCategoricalEncoder(cardinality_threshold=15)
    encoder.fit(train_df)

    test_df = pd.DataFrame({
        "low_cat": ["UNKNOWN_X", "A", "UNKNOWN_Y"],
        "high_cat": ["UNKNOWN_Z", "Item_1", "UNKNOWN_W"]
    })
    trans_test = encoder.transform(test_df)
    assert trans_test.shape[0] == 3
    assert trans_test.loc[0, "high_cat_ordinal"] == -1.0

def test_10_completely_missing_column_excluded():
    df = pd.DataFrame({
        "valid_num": [10.0, 20.0, 30.0],
        "empty_col": [np.nan, np.nan, np.nan]
    })
    preprocessor = HybridPreprocessor()
    trans = preprocessor.fit_transform(df)
    assert "empty_col" not in preprocessor.get_feature_names_out()
    assert "empty_col" in preprocessor.excluded_cols_

def test_11_leakage_candidate_excluded():
    df = pd.DataFrame({
        "valid_num": [10.0, 20.0, 30.0],
        "Delivery Status": ["Late", "Advance", "Complete"]
    })
    preprocessor = HybridPreprocessor(leakage_columns=["Delivery Status"])
    trans = preprocessor.fit_transform(df)
    assert "Delivery Status" not in preprocessor.get_feature_names_out()
    assert "Delivery Status" in preprocessor.leakage_cols_

def test_12_constant_column_excluded():
    df = pd.DataFrame({
        "valid_num": [10.0, 20.0, 30.0],
        "const": [5, 5, 5]
    })
    preprocessor = HybridPreprocessor()
    trans = preprocessor.fit_transform(df)
    assert "const" not in preprocessor.get_feature_names_out()
    assert "const" in preprocessor.excluded_cols_

def test_13_no_missing_values_no_imputation_change():
    df = pd.DataFrame({
        "a": [1.0, 2.0, 3.0, 4.0],
        "b": [10.0, 20.0, 30.0, 40.0]
    })
    preprocessor = HybridPreprocessor()
    trans = preprocessor.fit_transform(df)
    assert not trans.isnull().any().any()

def test_14_numeric_only_dataset():
    df = pd.DataFrame({
        "n1": [1.0, 2.0, 3.0, 4.0],
        "n2": [10.0, 20.0, 30.0, 40.0]
    })
    preprocessor = HybridPreprocessor()
    trans = preprocessor.fit_transform(df)
    assert trans.shape == (4, 2)

def test_15_categorical_only_dataset():
    df = pd.DataFrame({
        "c1": ["X", "Y", "Z", "X"],
        "c2": ["Low", "High", "Low", "Medium"]
    })
    preprocessor = HybridPreprocessor()
    trans = preprocessor.fit_transform(df)
    assert trans.shape[0] == 4
    assert len(preprocessor.get_feature_names_out()) > 0

def test_16_mixed_dataset():
    df = pd.DataFrame({
        "num": [10.0, 20.0, 30.0, 40.0],
        "cat": ["A", "B", "A", "C"]
    })
    preprocessor = HybridPreprocessor()
    trans = preprocessor.fit_transform(df)
    assert "num" in trans.columns
    assert any("cat_" in c for c in trans.columns)

def test_17_arbitrary_column_names():
    df = pd.DataFrame({
        "feat_alpha_1": [100.0, 200.0, 300.0],
        "feat_beta_2": ["Red", "Green", "Blue"]
    })
    preprocessor = HybridPreprocessor()
    trans = preprocessor.fit_transform(df)
    assert "feat_alpha_1" in trans.columns

def test_18_train_test_preprocessing_consistency():
    train_df = pd.DataFrame({
        "num": [10.0, 20.0, 30.0, 40.0, 50.0],
        "cat": ["A", "B", "A", "B", "A"]
    })
    test_df = pd.DataFrame({
        "num": [15.0, 25.0],
        "cat": ["A", "B"]
    })
    preprocessor = HybridPreprocessor()
    X_train_trans = preprocessor.fit_transform(train_df)
    X_test_trans = preprocessor.transform(test_df)
    assert list(X_train_trans.columns) == list(X_test_trans.columns)
    assert X_train_trans.shape[1] == X_test_trans.shape[1]

def test_19_strict_leakage_test_train_only_fitting():
    train_df = pd.DataFrame({"num": [8.0, 9.0, 10.0, 11.0, 12.0]})
    test_df = pd.DataFrame({"num": [10000.0, 50000.0, np.nan]})

    preprocessor = HybridPreprocessor()
    preprocessor.fit(train_df)

    assert abs(preprocessor.numeric_imputer_.statistics_["num"] - 10.0) < 1e-4

    scaler = preprocessor.numeric_scaler_.scalers_["num"]
    if hasattr(scaler, "mean_"):
        assert abs(float(scaler.mean_[0]) - 10.0) < 1e-4

    test_trans = preprocessor.transform(test_df)
    assert not test_trans.isnull().any().any()
    assert abs(preprocessor.numeric_imputer_.statistics_["num"] - 10.0) < 1e-4

def test_20_original_raw_dataframe_remains_unchanged():
    raw_df = pd.DataFrame({
        "num": [1.0, 2.0, np.nan, 4.0],
        "cat": ["X", "Y", "Z", "X"]
    })
    raw_copy = raw_df.copy(deep=True)
    preprocessor = HybridPreprocessor()
    _ = preprocessor.fit_transform(raw_df)
    pd.testing.assert_frame_equal(raw_df, raw_copy)

def test_21_transformed_feature_names_available():
    df = pd.DataFrame({
        "val": [10.0, 20.0, 30.0],
        "category": ["A", "B", "A"]
    })
    preprocessor = HybridPreprocessor()
    preprocessor.fit(df)
    names = preprocessor.get_feature_names_out()
    assert isinstance(names, list)
    assert len(names) > 0
    assert "val" in names

def test_22_empty_or_invalid_dataset_handling():
    preprocessor = HybridPreprocessor()
    with pytest.raises(ValueError):
        preprocessor.fit(pd.DataFrame())

def test_23_api_preprocessing_execution_endpoint():
    csv_data = (
        "col_num,col_cat,Late_delivery_risk,Delivery Status\n"
        "10.0,A,1,Shipping Complete\n"
        "20.0,B,0,Advance Shipping\n"
        "30.0,A,1,Late delivery\n"
        "10.0,C,0,Shipping Complete\n"
        "1000.0,B,1,Late delivery\n"
        ",A,0,Shipping Complete\n"
        "20.0,,1,Late delivery\n"
        "15.0,B,0,Shipping Complete\n"
        "25.0,C,1,Late delivery\n"
        "35.0,A,0,Advance Shipping\n"
    )
    res_upload = client.post(
        "/api/datasets/upload",
        files={"file": ("synth_sc.csv", csv_data.encode("utf-8"), "text/csv")}
    )
    assert res_upload.status_code == 200

    res_prep = client.post("/api/preprocessing/execute", json={
        "test_size": 0.20,
        "random_state": 42
    })
    assert res_prep.status_code == 200
    data = res_prep.json()
    assert data["status"] == "success"
    assert "split_info" in data
    assert data["split_info"]["train_rows"] == 8
    assert data["split_info"]["test_rows"] == 2
    assert "metadata" in data
    assert len(data["feature_names"]) > 0
    assert "Delivery Status" not in data["feature_names"]

    res_session = client.get("/api/preprocessing/session")
    assert res_session.status_code == 200
