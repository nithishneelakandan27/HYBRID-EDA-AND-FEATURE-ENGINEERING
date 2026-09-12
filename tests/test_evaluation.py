"""
tests/test_evaluation.py

14 tests for Phase 6: Feature Engineering, Feature Selection, Evaluation Pipelines.

Covers:
 1. profit_to_revenue_ratio generation
 2. Zero Sales denominator safe handling
 3. Leakage feature rejection
 4. Variance threshold 1e-4 removes constants
 5. Correlation threshold >0.95 removes one of pair
 6. Correlated feature removal logs correct removed column
 7. Feature selection fit on training only
 8. Train/test consistency after transform
 9. Arbitrary dataset compatibility (no DataCo-specific columns assumed)
10. All three pipeline execution without error
11. Metric keys present in output
12. API POST /api/evaluation/run returns 404 without dataset
13. No target leakage (target not in X)
14. Reproducibility with random_state=42
"""
import sys
import os
import pytest
import numpy as np
import pandas as pd

# Allow importing from root packages and backend routers
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../backend')))

from feature_engineering.engineer import ConditionalFeatureEngineer
from feature_selection.selector import HybridFeatureSelector
from evaluation.metrics import compute_metrics
from evaluation.pipelines import run_all_pipelines, run_minimal_pipeline, run_fixed_pipeline, run_hybrid_pipeline
from sklearn.model_selection import train_test_split

# ── Helpers ─────────────────────────────────────────────────────────────────

def make_generic_df(n=200, random_state=42):
    """
    Synthetic dataset with no DataCo column names.
    Has numeric, categorical, missing, skewed, correlated, and constant features.
    """
    rng = np.random.default_rng(random_state)
    df = pd.DataFrame({
        "num_a": rng.normal(10, 2, n),
        "num_b": rng.exponential(5, n),             # skewed
        "num_c": np.ones(n) * 3.14,                  # near-constant
        "num_profit": rng.normal(50, 10, n),          # numerator
        "num_revenue": rng.uniform(100, 500, n),      # denominator
        "cat_low": rng.choice(["X", "Y", "Z"], n),   # low cardinality
        "cat_high": [f"id_{i}" for i in range(n)],   # high cardinality
        "target": rng.integers(0, 2, n),
    })
    # Introduce some missing values
    mask = rng.random(n) < 0.05
    df.loc[mask, "num_a"] = np.nan
    # Make num_d highly correlated with num_a
    df["num_d"] = df["num_a"].fillna(df["num_a"].mean()) + rng.normal(0, 0.001, n)
    return df


def make_split(df, target="target", test_size=0.2, rs=42):
    y = df[target]
    X = df.drop(columns=[target])
    return train_test_split(X, y, test_size=test_size, random_state=rs, stratify=y)


# ── Test 1: profit_to_revenue_ratio generation ───────────────────────────────

def test_1_profit_to_revenue_ratio_generated():
    df = make_generic_df()
    spec = [{"name": "profit_ratio", "numerator_col": "num_profit", "denominator_col": "num_revenue", "leakage_risk": False}]
    eng = ConditionalFeatureEngineer(feature_specs=spec)
    eng.fit(df)
    result = eng.transform(df)
    assert "profit_ratio" in result.columns, "Expected engineered feature 'profit_ratio' in output"
    assert len(eng.get_feature_names_out()) == 1
    assert eng.accepted_specs_[0]["name"] == "profit_ratio"


# ── Test 2: Zero denominator handled safely ───────────────────────────────────

def test_2_zero_denominator_safe():
    df = pd.DataFrame({
        "num_profit": [10.0, 20.0, 30.0, 0.0],
        "num_revenue": [100.0, 0.0, 50.0, 0.0],   # two zero denominators
    })
    spec = [{"name": "ratio", "numerator_col": "num_profit", "denominator_col": "num_revenue", "leakage_risk": False}]
    eng = ConditionalFeatureEngineer(feature_specs=spec)
    eng.fit(df)
    result = eng.transform(df)
    assert "ratio" in result.columns
    # Rows where denominator was 0 should be 0.0 (not NaN, not inf)
    ratio_values = result["ratio"].values
    assert np.all(np.isfinite(ratio_values)), "ratio must contain only finite values"
    # Row 1: 10/100 = 0.1
    assert abs(ratio_values[0] - 0.1) < 1e-6
    # Row 1 (zero den): should be 0.0
    assert ratio_values[1] == 0.0
    assert ratio_values[3] == 0.0


# ── Test 3: Leakage feature rejection ────────────────────────────────────────

def test_3_leakage_feature_rejected():
    df = pd.DataFrame({
        "profit": [10.0, 20.0],
        "leaky_col": [100.0, 200.0],
    })
    spec = [{"name": "ratio", "numerator_col": "profit", "denominator_col": "leaky_col", "leakage_risk": False}]
    eng = ConditionalFeatureEngineer(feature_specs=spec, leakage_columns=["leaky_col"])
    eng.fit(df)
    result = eng.transform(df)
    assert "ratio" not in result.columns
    assert len(eng.accepted_specs_) == 0
    assert len(eng.rejected_specs_) == 1
    assert "leakage" in eng.rejected_specs_[0]["reason"].lower()


# ── Test 4: Variance threshold removes constant feature ───────────────────────

def test_4_variance_threshold_removes_constant():
    df = make_generic_df()
    X = df.drop(columns=["target"])
    X_num = X.select_dtypes(include=[np.number])
    selector = HybridFeatureSelector(variance_threshold=1e-4)
    selector.fit(X_num)
    removed_names = [r["feature"] for r in selector.removed_low_variance_]
    assert "num_c" in removed_names, f"Constant column 'num_c' should be removed by variance filter. Got: {removed_names}"


# ── Test 5: Correlation filter removes one of highly correlated pair ──────────

def test_5_correlation_filter_removes_one_of_pair():
    rng = np.random.default_rng(0)
    base = rng.normal(0, 1, 100)
    df = pd.DataFrame({
        "a": base,
        "b": base + rng.normal(0, 0.001, 100),  # |r| >> 0.95
        "c": rng.normal(0, 1, 100)
    })
    selector = HybridFeatureSelector()
    selector.fit(df)
    report = selector.get_report()
    assert report["removed_high_corr_count"] >= 1, "Expected at least one feature removed by correlation filter"
    removed_feats = [r["removed_feature"] for r in report["removed_high_corr"]]
    # Either a or b should be removed
    assert "a" in removed_feats or "b" in removed_feats


# ── Test 6: Correct removed column logged ─────────────────────────────────────

def test_6_corr_removal_log_contains_correct_fields():
    rng = np.random.default_rng(1)
    base = rng.normal(0, 1, 200)
    # high_var has std=100, low_var has std=1 — definitively different variances
    df = pd.DataFrame({
        "high_var": base * 100,
        "low_var": base + rng.normal(0, 0.0001, 200),  # scale=1, so var ≈ 1 vs 10000
    })
    selector = HybridFeatureSelector()
    selector.fit(df)
    removed = selector.removed_high_corr_
    assert len(removed) >= 1
    entry = removed[0]
    assert "removed_feature" in entry
    assert "kept_feature" in entry
    assert "correlation" in entry
    # The lower-variance feature should be removed
    assert entry["removed_feature"] == "low_var", f"Expected 'low_var' to be removed, got: {entry['removed_feature']}"


# ── Test 7: Feature selection fit on training data only ───────────────────────

def test_7_feature_selection_fit_on_train_only():
    """
    Test set contains new categories / values never in training set.
    Selector must be fitted only on training data.
    """
    rng = np.random.default_rng(42)
    n_train = 200
    X_train_df = pd.DataFrame({
        "f1": rng.normal(0, 1, n_train),
        "f2": rng.normal(0, 1, n_train),
    })
    X_test_df = pd.DataFrame({
        "f1": rng.normal(100, 1, 50),   # completely different distribution
        "f2": rng.normal(100, 1, 50),
    })

    selector = HybridFeatureSelector()
    selector.fit(X_train_df)   # must NOT use X_test_df
    X_test_sel = selector.transform(X_test_df)
    assert set(X_test_sel.columns) == set(selector.get_selected_features())


# ── Test 8: Train/test consistency after transform ────────────────────────────

def test_8_train_test_feature_consistency():
    df = make_generic_df()
    X_train, X_test, y_train, y_test = make_split(df)
    X_num_train = X_train.select_dtypes(include=[np.number])
    X_num_test = X_test.select_dtypes(include=[np.number])

    selector = HybridFeatureSelector()
    selector.fit(X_num_train)
    X_tr_sel = selector.transform(X_num_train)
    X_te_sel = selector.transform(X_num_test)
    assert list(X_tr_sel.columns) == list(X_te_sel.columns), "Train and test must have same columns after selection"


# ── Test 9: Arbitrary dataset compatibility ───────────────────────────────────

def test_9_arbitrary_dataset_no_dataco_assumption():
    """
    Pipeline must run on a dataset with no DataCo column names.
    """
    df = make_generic_df()
    # No DataCo columns — should still run without error
    results = run_all_pipelines(
        df=df,
        target_column="target",
        leakage_columns=[],   # no leakage
        feature_specs=[
            {"name": "profit_ratio", "numerator_col": "num_profit", "denominator_col": "num_revenue", "leakage_risk": False}
        ],
        test_size=0.2,
        random_state=42
    )
    assert results["status"] == "success"
    assert "minimal" in results["results"]
    assert "fixed" in results["results"]
    assert "hybrid" in results["results"]


# ── Test 10: All three pipelines execute without error ────────────────────────

def test_10_all_three_pipelines_execute():
    df = make_generic_df()
    X_train, X_test, y_train, y_test = make_split(df)

    r_min = run_minimal_pipeline(X_train, X_test, y_train, y_test)
    r_fix = run_fixed_pipeline(X_train, X_test, y_train, y_test)
    r_hyb = run_hybrid_pipeline(X_train, X_test, y_train, y_test, leakage_columns=[], feature_specs=[])

    assert r_min["pipeline"] == "Minimal"
    assert r_fix["pipeline"] == "Fixed"
    assert r_hyb["pipeline"] == "Hybrid"


# ── Test 11: Metric keys present ─────────────────────────────────────────────

def test_11_metric_keys_present():
    df = make_generic_df()
    X_train, X_test, y_train, y_test = make_split(df)
    result = run_minimal_pipeline(X_train, X_test, y_train, y_test)
    metrics = result["metrics"]
    for key in ["accuracy", "precision", "recall", "f1", "roc_auc"]:
        assert key in metrics, f"Missing metric key: {key}"
    assert 0.0 <= metrics["accuracy"] <= 1.0


# ── Test 12: API returns 404 without dataset ──────────────────────────────────

def test_12_api_evaluation_returns_404_without_dataset():
    from fastapi.testclient import TestClient
    from main import app
    from services.ingestion import ingestion_service

    # Clear any existing dataset
    ingestion_service._active_df = None
    ingestion_service._active_filename = None

    client = TestClient(app)
    response = client.post("/api/evaluation/run", json={"target_column": "Late_delivery_risk"})
    assert response.status_code == 404


# ── Test 13: No target leakage — target not in X ─────────────────────────────

def test_13_target_not_in_X():
    df = make_generic_df()
    target = "target"
    y = df[target]
    X = df.drop(columns=[target])
    assert target not in X.columns, "Target column must be excluded from feature matrix"
    # Run a pipeline and confirm feature names don't include target
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    result = run_minimal_pipeline(X_train, X_test, y_train, y_test)
    # feature_counts original should equal X columns (no target)
    assert result["feature_counts"]["original"] == len(X.columns)


# ── Test 14: Reproducibility with random_state=42 ────────────────────────────

def test_14_reproducibility_random_state():
    df = make_generic_df()
    kwargs = dict(
        df=df, target_column="target", leakage_columns=[],
        feature_specs=[], test_size=0.2, random_state=42
    )
    r1 = run_all_pipelines(**kwargs)
    r2 = run_all_pipelines(**kwargs)

    for pipeline in ["minimal", "fixed", "hybrid"]:
        m1 = r1["results"][pipeline]["metrics"]
        m2 = r2["results"][pipeline]["metrics"]
        assert m1 == m2, f"Pipeline '{pipeline}' results not reproducible: {m1} vs {m2}"


# ── Test 15: Feature Engineer Statistical Validation Guardrails ──────────────

def test_15_feature_engineer_validation_guardrails():
    # 1. Zero-denominator rejection
    df_zero_denom = pd.DataFrame({
        "num": [10.0, 20.0, 30.0, 40.0],
        "denom_zero": [0.0, 0.0, 0.0, 0.0]
    })
    specs_zero = [{"name": "div_zero", "numerator_col": "num", "denominator_col": "denom_zero"}]
    fe_zero = ConditionalFeatureEngineer(feature_specs=specs_zero)
    fe_zero.fit(df_zero_denom)
    rejected_names = [s["name"] for s in fe_zero.rejected_specs_]
    assert "div_zero" in rejected_names
    zero_item = next(s for s in fe_zero.rejected_specs_ if s["name"] == "div_zero")
    assert zero_item["rule_id"] == "RULE_FE_INVALID_DENOMINATOR"

    # 2. High missingness rejection
    df_missing = pd.DataFrame({
        "col_a": [1.0, None, None, None, None, 5.0],
        "col_b": [10.0, 20.0, 30.0, 40.0, 50.0, 60.0]
    })
    specs_missing = [{"name": "miss_feat", "numerator_col": "col_a", "denominator_col": "col_b"}]
    fe_missing = ConditionalFeatureEngineer(feature_specs=specs_missing, max_missing_ratio=0.50)
    fe_missing.fit(df_missing)
    rejected_names = [s["name"] for s in fe_missing.rejected_specs_]
    assert "miss_feat" in rejected_names
    miss_item = next(s for s in fe_missing.rejected_specs_ if s["name"] == "miss_feat")
    assert miss_item["rule_id"] == "RULE_FE_EXCESSIVE_MISSINGNESS"

    # 3. Near-zero variance rejection (constant ratio)
    df_const = pd.DataFrame({
        "feat1": [10.0, 20.0, 30.0, 40.0, 50.0],
        "feat2": [2.0, 4.0, 6.0, 8.0, 10.0]  # feat1 / feat2 is constant 5.0
    })
    specs_const = [{"name": "const_ratio", "numerator_col": "feat1", "denominator_col": "feat2"}]
    fe_const = ConditionalFeatureEngineer(feature_specs=specs_const, variance_threshold=1e-4)
    fe_const.fit(df_const)
    rejected_names = [s["name"] for s in fe_const.rejected_specs_]
    assert "const_ratio" in rejected_names
    const_item = next(s for s in fe_const.rejected_specs_ if s["name"] == "const_ratio")
    assert const_item["rule_id"] == "RULE_FE_NEAR_ZERO_VARIANCE"

    # 4. Decision trace audit
    trace = fe_const.get_decision_trace()
    assert len(trace) > 0
    assert trace[0]["rule_id"] == "RULE_FE_NEAR_ZERO_VARIANCE"
    assert "selected_action" in trace[0]
    assert trace[0]["selected_action"] == "reject_candidate"




# ── Test 16: Feature Selection Stage 3 ANOVA Statistical Relevance ───────────

def test_16_feature_selection_stage3_anova_relevance():
    rng = np.random.default_rng(42)
    n = 300
    y = pd.Series(rng.integers(0, 2, n))
    # informative feature: strong correlation with y
    informative = y * 5.0 + rng.normal(0, 1, n)
    # pure noise feature: completely uninformative
    pure_noise = rng.normal(0, 1, n)
    # constant feature: filtered at Stage 1
    constant = np.ones(n)

    X = pd.DataFrame({
        "informative": informative,
        "pure_noise": pure_noise,
        "constant": constant
    })

    selector = HybridFeatureSelector(p_value_threshold=0.01)
    X_sel = selector.fit_transform(X, y)

    # Constant removed at Stage 1
    removed_var_names = [x["feature"] for x in selector.removed_low_variance_]
    assert "constant" in removed_var_names

    # Pure noise removed at Stage 3 due to p > 0.01
    removed_rel_names = [x["feature"] for x in selector.removed_low_relevance_]
    assert "pure_noise" in removed_rel_names

    # Informative feature retained
    assert "informative" in selector.selected_features_
    assert "informative" in X_sel.columns
    assert "pure_noise" not in X_sel.columns

    # Verify relevance scores structure
    assert "informative" in selector.relevance_scores_
    assert selector.relevance_scores_["informative"]["p_value"] < 0.01
    assert selector.relevance_scores_["pure_noise"]["p_value"] > 0.01

    # Verify decision trace items
    trace = selector.get_decision_trace()
    assert len(trace) >= 2
    rule_ids = [t["rule_id"] for t in trace]
    assert "RULE_FS_LOW_VARIANCE_FILTER" in rule_ids
    assert "RULE_FS_STATISTICAL_RELEVANCE_FILTER" in rule_ids


# ── Test 17: Hybrid Pipeline Decision Trace Output ───────────────────────────

def test_17_hybrid_decision_trace_in_evaluation():
    df = make_generic_df(n=100)
    X_train, X_test, y_train, y_test = make_split(df)
    res = run_hybrid_pipeline(X_train, X_test, y_train, y_test)
    assert "decision_trace" in res
    assert isinstance(res["decision_trace"], list)
    assert len(res["decision_trace"]) > 0
    # Every trace element must have required audit fields
    for item in res["decision_trace"]:
        assert "rule_id" in item
        assert "selected_action" in item
        assert "resulting_feature_change" in item


# ── Test 18: Leakage Isolation in Feature Selection fit_transform ────────────

def test_18_leakage_isolation_feature_selection():
    rng = np.random.default_rng(42)
    n_train, n_test = 200, 50
    y_train = pd.Series(rng.integers(0, 2, n_train))
    y_test = pd.Series(rng.integers(0, 2, n_test))

    X_train = pd.DataFrame({
        "feat_a": rng.normal(0, 1, n_train),
        "feat_b": rng.normal(0, 1, n_train),
        "feat_const_tr": np.zeros(n_train), # constant in train only
    })
    X_test = pd.DataFrame({
        "feat_a": rng.normal(0, 1, n_test),
        "feat_b": rng.normal(0, 1, n_test),
        "feat_const_tr": rng.normal(0, 1, n_test), # NOT constant in test!
    })

    selector = HybridFeatureSelector()
    X_tr_out = selector.fit_transform(X_train, y_train)
    # Test set transform must strictly use decisions learned from train set
    X_te_out = selector.transform(X_test)

    removed_var_names = [x["feature"] for x in selector.removed_low_variance_]
    assert "feat_const_tr" in removed_var_names
    assert "feat_const_tr" not in X_tr_out.columns
    assert "feat_const_tr" not in X_te_out.columns
    assert list(X_tr_out.columns) == list(X_te_out.columns)


