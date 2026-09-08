import sys
import os
import pandas as pd
import pytest

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../')))

from decision_engine.rules import DecisionRules
from decision_engine.engine import HybridDecisionEngine

def test_1_numeric_missing_low_skew_mean_imputation():
    # Symmetric / normally distributed data with missing values (|skew| < 1.0)
    series = pd.Series([10.0, 11.0, 12.0, 10.0, 11.0, 12.0, 11.0, None, 10.5, None])
    decision = DecisionRules.evaluate_imputation(series, is_numeric=True)
    assert decision["operation"] == "mean_imputation"
    assert decision["method"] == "mean_imputation"
    assert decision["abs_skewness"] < 1.0
    assert "Mean imputation selected" in decision["reason"]

def test_2_numeric_missing_high_skew_median_imputation():
    # Heavily right-skewed data with missing values (|skew| >= 1.0)
    series = pd.Series([1.0, 1.2, 1.1, 1.3, 1.0, 1.2, 1000.0, 2500.0, None, None])
    decision = DecisionRules.evaluate_imputation(series, is_numeric=True)
    assert decision["operation"] == "median_imputation"
    assert decision["method"] == "median_imputation"
    assert decision["abs_skewness"] >= 1.0
    assert "Median imputation selected" in decision["reason"]

def test_3_outlier_proportion_greater_than_2_percent_robust_scaler():
    # 10 items, 1 severe outlier = 10% outliers (> 2%)
    series = pd.Series([10.0, 11.0, 10.5, 11.2, 10.8, 11.0, 10.2, 10.9, 11.1, 100.0])
    decision = DecisionRules.evaluate_scaling(series, is_numeric=True, outlier_proportion_threshold=0.02)
    assert decision["scaler"] == "RobustScaler"
    assert decision["operation"] == "robust_scaling"
    assert decision["outlier_percentage"] > 2.0
    assert "RobustScaler selected" in decision["reason"]

def test_4_outlier_proportion_less_than_equal_2_percent_standard_scaler():
    # 100 items evenly distributed, 0 outliers (<= 2%)
    series = pd.Series(list(range(100)))
    decision = DecisionRules.evaluate_scaling(series, is_numeric=True, outlier_proportion_threshold=0.02)
    assert decision["scaler"] == "StandardScaler"
    assert decision["operation"] == "standard_scaling"
    assert decision["outlier_percentage"] <= 2.0
    assert "StandardScaler selected" in decision["reason"]

def test_5_high_skew_and_non_negative_log1p_recommended():
    # Right skewed with min >= 0
    series = pd.Series([1.0, 1.2, 1.1, 1.3, 1.0, 1.2, 50.0, 200.0, 500.0])
    decision = DecisionRules.evaluate_log_transformation(series, is_numeric=True)
    assert decision["applied"] is True
    assert decision["operation"] == "log1p_transformation"
    assert decision["min_value"] >= 0
    assert decision["abs_skewness"] > 1.0
    assert "log1p transformation recommended" in decision["reason"]

def test_6_high_skew_with_negative_values_no_log1p():
    # Highly skewed but contains negative value (min < 0)
    series = pd.Series([-50.0, 1.0, 1.2, 1.1, 1.3, 1.0, 1.2, 100.0, 500.0])
    decision = DecisionRules.evaluate_log_transformation(series, is_numeric=True)
    assert decision["applied"] is False
    assert decision["operation"] == "none"
    assert decision["min_value"] < 0
    assert "negative values" in decision["reason"]

def test_7_cardinality_less_than_equal_15_one_hot_encoding():
    # 5 unique categories (<= 15)
    series = pd.Series(["Standard Class", "First Class", "Second Class", "Same Day", "Standard Class"])
    decision = DecisionRules.evaluate_encoding(series, is_categorical=True, cardinality_threshold=15)
    assert decision["operation"] == "one_hot_encoding"
    assert decision["encoding"] == "OneHotEncoder"
    assert decision["cardinality"] <= 15
    assert "One-hot encoding selected" in decision["reason"]

def test_8_cardinality_greater_than_15_label_encoding():
    # 20 unique categories (> 15)
    series = pd.Series([f"Category_{i}" for i in range(20)])
    decision = DecisionRules.evaluate_encoding(series, is_categorical=True, cardinality_threshold=15)
    assert decision["operation"] == "label_encoding"
    assert decision["encoding"] == "LabelEncoder"
    assert decision["cardinality"] > 15
    assert "Label-style encoding selected" in decision["reason"]

def test_9_completely_missing_column_exclusion():
    series = pd.Series([None, None, None, None])
    status = DecisionRules.evaluate_column_status(series, "empty_col", total_rows=4)
    assert status["status"] == "completely_missing"
    assert status["is_usable"] is False
    assert status["action"] == "exclude"
    assert "100% missing" in status["reason"]

def test_10_leakage_candidate_exclusion():
    series = pd.Series(["Late", "On Time", "Advance", "Late"])
    status = DecisionRules.evaluate_column_status(
        series,
        col_name="Delivery Status",
        total_rows=4,
        leakage_columns=["Delivery Status", "Days for shipping (real)"]
    )
    assert status["status"] == "leakage_candidate"
    assert status["is_usable"] is False
    assert status["action"] == "exclude_from_features"
    assert "leakage candidate" in status["reason"]

def test_11_no_missing_values_no_imputation():
    series = pd.Series([10.0, 20.0, 30.0, 40.0])
    decision = DecisionRules.evaluate_imputation(series, is_numeric=True)
    assert decision["operation"] == "none"
    assert "No missing values detected" in decision["reason"]

def test_12_dataset_no_numeric_columns_graceful_skip():
    df = pd.DataFrame({
        "cat1": ["A", "B", "C", "A"],
        "cat2": ["Low", "High", "Medium", "Low"]
    })
    plan = HybridDecisionEngine.generate_plan(df)
    assert plan["summary_counts"]["usable_numeric_columns"] == 0
    assert plan["summary_counts"]["usable_categorical_columns"] == 2
    assert plan["summary_counts"]["robust_scalers"] == 0
    assert plan["summary_counts"]["standard_scalers"] == 0

def test_13_dataset_no_categorical_columns_graceful_skip():
    df = pd.DataFrame({
        "num1": [1.0, 2.0, 3.0, 4.0],
        "num2": [10.0, 20.0, 30.0, 40.0]
    })
    plan = HybridDecisionEngine.generate_plan(df)
    assert plan["summary_counts"]["usable_numeric_columns"] == 2
    assert plan["summary_counts"]["usable_categorical_columns"] == 0
    assert plan["summary_counts"]["one_hot_encodings"] == 0
    assert plan["summary_counts"]["label_encodings"] == 0

def test_14_generic_datasets_arbitrary_column_names():
    df = pd.DataFrame({
        "arbitrary_feature_alpha": [10, 20, 30, 40, 1000],
        "arbitrary_feature_beta": ["alpha", "beta", "gamma", "alpha", "beta"],
        "arbitrary_feature_gamma": [None, None, None, None, None]
    })
    plan = HybridDecisionEngine.generate_plan(df)
    assert len(plan["columns"]) == 3
    names = [c["column_name"] for c in plan["columns"]]
    assert "arbitrary_feature_alpha" in names
    assert "arbitrary_feature_beta" in names
    assert "arbitrary_feature_gamma" in names
    gamma_col = next(c for c in plan["columns"] if c["column_name"] == "arbitrary_feature_gamma")
    assert gamma_col["status"] == "completely_missing"
    assert gamma_col["is_usable"] is False

def test_15_all_decisions_have_explanations():
    df = pd.DataFrame({
        "feat_num": [1.0, 2.0, 3.0, None, 50.0],
        "feat_cat": ["A", "B", None, "A", "C"]
    })
    plan = HybridDecisionEngine.generate_plan(df)
    for col in plan["columns"]:
        assert len(col["decisions"]) > 0
        for d in col["decisions"]:
            assert "reason" in d
            assert len(d["reason"].strip()) > 0
