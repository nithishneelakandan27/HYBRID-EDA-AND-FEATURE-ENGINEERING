"""
tests/test_auto_config_and_datasets.py

Comprehensive test suite verifying that:
1. Target detection accurately identifies targets on arbitrary datasets.
2. Leakage detection automatically detects leakage without hardcoding.
3. Pipelines run end-to-end on arbitrary datasets (Datasets A - H).
4. Feature matrix safety and finite guarantees hold everywhere.
"""
import sys
import os
import pytest
import numpy as np
import pandas as pd

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../')))

from profiling.auto_config import AutoConfigEngine
from evaluation.pipelines import run_all_pipelines, run_minimal_pipeline, run_fixed_pipeline, run_hybrid_pipeline


def test_dataset_a_pure_numeric_classification():
    """Dataset A: Purely numeric classification dataset."""
    np.random.seed(42)
    n = 200
    df = pd.DataFrame({
        "feature_1": np.random.randn(n),
        "feature_2": np.random.randn(n) * 5,
        "feature_3": np.random.exponential(2, size=n),
        "target_class": np.random.choice([0, 1], size=n)
    })
    
    cfg = AutoConfigEngine.generate_auto_config(df)
    assert cfg["target"]["column"] == "target_class"
    assert cfg["target"]["confidence_level"] == "High"
    assert cfg["pipeline_ready"] is True

    # Run pipelines end-to-end
    res = run_all_pipelines(df, target_column="target_class")
    assert res["status"] == "success"
    assert res["results"]["minimal"]["metrics"]["accuracy"] > 0
    assert res["results"]["fixed"]["metrics"]["accuracy"] > 0
    assert res["results"]["hybrid"]["metrics"]["accuracy"] > 0


def test_dataset_b_mixed_numeric_and_categorical():
    """Dataset B: Mixed numeric + categorical dataset with arbitrary column names."""
    np.random.seed(42)
    n = 300
    df = pd.DataFrame({
        "age": np.random.randint(18, 70, size=n),
        "income": np.random.uniform(20000, 150000, size=n),
        "department": np.random.choice(["Sales", "Engineering", "Marketing", "HR"], size=n),
        "rating_level": np.random.choice(["Tier1", "Tier2", "Tier3"], size=n),
        "churn_label": np.random.choice([0, 1], size=n, p=[0.7, 0.3])
    })

    cfg = AutoConfigEngine.generate_auto_config(df)
    assert cfg["target"]["column"] == "churn_label"
    assert cfg["target"]["confidence_level"] == "High"

    res = run_all_pipelines(df, target_column="churn_label")
    assert res["status"] == "success"
    assert "churn_label" not in res["results"]["hybrid"]["feature_counts"]


def test_dataset_c_with_missing_values():
    """Dataset C: Dataset with widespread missing values across numeric and categorical."""
    np.random.seed(42)
    n = 250
    df = pd.DataFrame({
        "score_a": [np.nan if i % 5 == 0 else float(i) for i in range(n)],
        "score_b": [np.nan if i % 7 == 0 else float(i * 2) for i in range(n)],
        "category_c": [None if i % 4 == 0 else f"cat_{i % 3}" for i in range(n)],
        "response_flag": [i % 2 for i in range(n)]
    })

    res = run_all_pipelines(df, target_column="response_flag")
    assert res["status"] == "success"
    for p in ["minimal", "fixed", "hybrid"]:
        assert res["results"][p]["metrics"]["f1"] is not None


def test_dataset_d_high_cardinality_categoricals():
    """Dataset D: High-cardinality categorical dataset (tests memory safety)."""
    np.random.seed(42)
    n = 500
    df = pd.DataFrame({
        "user_city": [f"city_{i % 80}" for i in range(n)],
        "user_tag": [f"tag_{i % 120}" for i in range(n)],
        "metric_val": np.random.randn(n),
        "conversion_status": [i % 2 for i in range(n)]
    })

    res = run_all_pipelines(df, target_column="conversion_status")
    assert res["status"] == "success"
    # Fixed pipeline should use controlled OHE without exploding
    assert res["results"]["fixed"]["feature_counts"]["final"] < 100


def test_dataset_e_highly_skewed():
    """Dataset E: Highly skewed features with extreme outliers."""
    np.random.seed(42)
    n = 300
    df = pd.DataFrame({
        "skewed_exp": np.random.exponential(10, size=n) ** 2,
        "normal_feat": np.random.randn(n),
        "target_risk": np.random.choice([0, 1], size=n)
    })

    res = run_all_pipelines(df, target_column="target_risk")
    assert res["status"] == "success"
    assert res["results"]["hybrid"]["metrics"]["accuracy"] > 0


def test_dataset_f_obvious_leakage():
    """Dataset F: Dataset with obvious proxy/leakage columns."""
    np.random.seed(42)
    n = 200
    y = np.random.choice([0, 1], size=n)
    df = pd.DataFrame({
        "normal_metric": np.random.randn(n),
        "empty_column": [np.nan] * n,
        "leakage_perfect_proxy": y * 10.0 + np.random.normal(0, 0.001, size=n),  # |r| ~ 1.0
        "actual_outcome_status": [f"outcome_{val}" for val in y],                # perfect categorical proxy
        "is_approved": y
    })

    leakage = AutoConfigEngine.detect_leakage(df, target_col="is_approved")
    leak_cols = {l["column"] for l in leakage}
    
    assert "empty_column" in leak_cols
    assert "leakage_perfect_proxy" in leak_cols
    assert "actual_outcome_status" in leak_cols

    res = run_all_pipelines(df, target_column="is_approved")
    assert res["status"] == "success"
    assert "leakage_perfect_proxy" not in res["results"]["hybrid"]["feature_counts"]


def test_dataset_g_no_obvious_target():
    """Dataset G: Continuous numbers only, no clear classification target."""
    np.random.seed(42)
    n = 100
    df = pd.DataFrame({
        "measurement_1": np.random.randn(n),
        "measurement_2": np.random.randn(n),
        "measurement_3": np.random.randn(n)
    })

    cfg = AutoConfigEngine.generate_auto_config(df)
    assert cfg["target"]["column"] is None
    assert cfg["target"]["confidence_level"] == "Low"
    assert cfg["pipeline_ready"] is False
    assert len(cfg["target"]["candidate_columns"]) > 0


def test_shape_invariant_assertion_protection():
    """Verify that shape invariant assertions protect against mismatched feature names."""
    from evaluation.pipelines import ensure_finite_dataframe
    df = pd.DataFrame({"a": [1.0, 2.0], "b": [3.0, 4.0]})
    # Valid shape
    res = ensure_finite_dataframe(df, feature_names=["a", "b"])
    assert res.shape == (2, 2)
    
    # Mismatched shape must raise AssertionError
    with pytest.raises(AssertionError) as exc:
        ensure_finite_dataframe(df, feature_names=["a", "b", "c"])
    assert "Feature matrix shape mismatch" in str(exc.value)
