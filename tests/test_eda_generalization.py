import sys
import os
import pandas as pd
import pytest

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../')))

from eda.engine import AutomatedEDAEngine

def test_dataset_a_mostly_numeric_no_missing():
    """
    Dataset A: Mostly numeric, no missing values.
    Verifies that missingness visualization is skipped/flagged as no missing,
    numeric analysis and correlation matrix work smoothly.
    """
    df = pd.DataFrame({
        "n1": [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0],
        "n2": [10.0, 20.0, 30.0, 40.0, 50.0, 60.0, 70.0, 80.0],
        "n3": [100.0, 90.0, 80.0, 70.0, 60.0, 50.0, 40.0, 30.0]
    })
    res = AutomatedEDAEngine.run_eda(df)
    
    assert res["missing_analysis"]["has_missing_values"] is False
    assert res["analysis_flags"]["missing_charts_generated"] is False
    assert res["numeric_analysis"]["numeric_column_count"] == 3
    assert res["correlation_analysis"]["can_compute_correlation"] is True
    assert len(res["correlation_analysis"]["high_correlation_pairs"]) >= 1

def test_dataset_b_numeric_and_categorical_with_missing():
    """
    Dataset B: Numeric + categorical with missing values.
    Verifies missing value ranking and analysis flags.
    """
    df = pd.DataFrame({
        "num1": [10.0, None, 30.0, 40.0, 50.0],
        "num2": [5.0, 15.0, None, None, 25.0],
        "cat1": ["A", "B", None, "A", "B"]
    })
    res = AutomatedEDAEngine.run_eda(df)
    
    assert res["missing_analysis"]["has_missing_values"] is True
    assert res["analysis_flags"]["missing_charts_generated"] is True
    assert len(res["missing_analysis"]["columns_with_missing"]) == 3

def test_dataset_c_high_cardinality_categoricals():
    """
    Dataset C: High-cardinality categorical columns.
    Verifies that high-cardinality columns are summarized statistically
    without failing or generating huge unreadable bar charts.
    """
    df = pd.DataFrame({
        "id_col": [f"ID_{i}" for i in range(50)],
        "cat_col": [f"Category_{i}" for i in range(50)]
    })
    res = AutomatedEDAEngine.run_eda(df)
    
    assert res["categorical_analysis"]["categorical_column_count"] == 2
    summaries = res["categorical_analysis"]["column_summaries"]
    for s in summaries:
        assert s["is_high_cardinality"] is True
    assert len(res["categorical_analysis"]["visualizations"]) == 0

def test_dataset_d_only_categorical_columns():
    """
    Dataset D: Only categorical columns (0 numeric columns).
    Verifies that numeric analysis and correlation matrix are skipped safely.
    """
    df = pd.DataFrame({
        "c1": ["Red", "Blue", "Green", "Red", "Blue"],
        "c2": ["Small", "Medium", "Large", "Small", "Medium"]
    })
    res = AutomatedEDAEngine.run_eda(df)
    
    assert res["numeric_analysis"]["numeric_column_count"] == 0
    assert res["correlation_analysis"]["can_compute_correlation"] is False
    assert res["analysis_flags"]["numeric_analysis_performed"] is False
    assert res["analysis_flags"]["correlation_analysis_performed"] is False

def test_dataset_e_only_one_numeric_column():
    """
    Dataset E: Only one numeric column.
    Verifies that numeric distribution runs, but correlation matrix is skipped safely.
    """
    df = pd.DataFrame({
        "single_num": [10.0, 20.0, 30.0, 40.0, 50.0],
        "cat": ["X", "Y", "X", "Y", "Z"]
    })
    res = AutomatedEDAEngine.run_eda(df)
    
    assert res["numeric_analysis"]["numeric_column_count"] == 1
    assert res["correlation_analysis"]["can_compute_correlation"] is False
    assert "At least 2 numeric columns" in res["correlation_analysis"]["reason"]

def test_dataset_f_highly_skewed_and_outliers():
    """
    Dataset F: Highly skewed numeric data + outliers.
    Verifies skewness calculation, outlier detection, and dynamic finding generation.
    """
    df = pd.DataFrame({
        "skewed_col": [1.0, 2.0, 1.5, 2.5, 1.8, 2.2, 1.9, 1000.0, 2000.0],
        "normal_col": [10, 11, 12, 11, 10, 12, 11, 10, 12]
    })
    res = AutomatedEDAEngine.run_eda(df)
    
    assert res["outlier_analysis"]["has_outliers"] is True
    out_cols = res["outlier_analysis"]["outlier_columns"]
    assert any(c["column_name"] == "skewed_col" for c in out_cols)
    
    skew_findings = [f for f in res["findings"] if f["category"] == "Distribution / Skewness"]
    assert len(skew_findings) >= 1
