"""
tests/test_modeling.py

Phase II: ML Modeling - Test Suite

Tests:
  1. Model catalog is complete and well-formed
  2. Training with all 4 model types on synthetic data
  3. Leakage column exclusion (target + leakage not in feature matrix)
  4. Missing dataset → 404 error
  5. Untrained model → 404 on results
  6. Prediction before training → 404
  7. Single-record prediction consistency (probabilities sum to 1.0)
  8. Feature importance extraction format
  9. Model comparison table
  10. API endpoints (config, train, results, comparison, predict)
"""
import sys
import os
import time
import numpy as np
import pandas as pd
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from starlette.testclient import TestClient
from backend.main import app
from modeling.trainer import train_model, predict_record, get_model_catalog
from backend.services.modeling_service import ModelingService

client = TestClient(app)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def small_df():
    """Minimal synthetic supply-chain-like dataset for fast unit tests."""
    np.random.seed(42)
    n = 400
    df = pd.DataFrame({
        "Order_Priority": np.random.choice(["Low", "Medium", "High", "Critical"], n),
        "Shipping_Mode": np.random.choice(["Standard", "Second Class", "First Class"], n),
        "Days_for_shipment_scheduled": np.random.randint(1, 7, n).astype(float),
        "Order_Item_Quantity": np.random.randint(1, 20, n).astype(float),
        "Sales": np.random.uniform(50, 5000, n),
        "Order_Profit_Per_Order": np.random.uniform(-500, 2000, n),
        "Customer_Segment": np.random.choice(["Consumer", "Corporate", "Home Office"], n),
        # Leakage columns (should be excluded)
        "Delivery_Status": np.random.choice(["Late delivery", "Advance shipping", "Shipping on time"], n),
        "Days_for_shipping_real": np.random.randint(1, 10, n).astype(float),
        # Target
        "Late_delivery_risk": np.random.choice([0, 1], n, p=[0.4, 0.6]),
    })
    return df


@pytest.fixture
def trained_result(small_df):
    """Pre-train a Random Forest result for reuse in prediction tests."""
    result = train_model(
        df=small_df,
        model_type="random_forest",
        target_column="Late_delivery_risk",
        leakage_columns=["Delivery_Status", "Days_for_shipping_real"],
        test_size=0.20,
        random_state=42,
    )
    return result


# ---------------------------------------------------------------------------
# 1. Model Catalog
# ---------------------------------------------------------------------------

def test_model_catalog_completeness():
    catalog = get_model_catalog()
    types = {m["model_type"] for m in catalog}
    assert "logistic_regression" in types
    assert "decision_tree" in types
    assert "random_forest" in types
    assert "gradient_boosting" in types
    for entry in catalog:
        assert "label" in entry
        assert "description" in entry
        assert "explainability" in entry
        assert "supports_feature_importance" in entry


# ---------------------------------------------------------------------------
# 2. Training on all 4 model types
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("model_type", [
    "logistic_regression",
    "decision_tree",
    "random_forest",
    "gradient_boosting",
])
def test_train_all_models(small_df, model_type):
    result = train_model(
        df=small_df,
        model_type=model_type,
        target_column="Late_delivery_risk",
        leakage_columns=["Delivery_Status", "Days_for_shipping_real"],
        test_size=0.20,
        random_state=42,
    )
    assert result["status"] == "success"
    assert result["model_type"] == model_type
    metrics = result["metrics"]
    assert 0.0 <= metrics["accuracy"] <= 1.0
    assert 0.0 <= metrics["precision"] <= 1.0
    assert 0.0 <= metrics["recall"] <= 1.0
    assert 0.0 <= metrics["f1"] <= 1.0
    assert metrics["confusion_matrix"] is not None
    assert len(metrics["confusion_matrix"]) == 2


# ---------------------------------------------------------------------------
# 3. Leakage column exclusion
# ---------------------------------------------------------------------------

def test_leakage_exclusion(trained_result):
    """Target and declared leakage columns must not appear in the feature set."""
    selected = trained_result["feature_info"]["selected_features"]
    assert "Late_delivery_risk" not in selected
    assert "Delivery_Status" not in selected
    assert "Days_for_shipping_real" not in selected


# ---------------------------------------------------------------------------
# 4. Missing dataset → 404
# ---------------------------------------------------------------------------

def test_train_no_dataset():
    """POST /api/modeling/train without an uploaded dataset returns 404."""
    # Ensure ingestion_service has no active dataframe
    from services.ingestion import ingestion_service
    original_df = ingestion_service.get_active_dataframe()
    # Temporarily clear
    ingestion_service._active_df = None
    response = client.post("/api/modeling/train", json={"model_type": "random_forest"})
    assert response.status_code == 404
    # Restore
    ingestion_service._active_df = original_df


# ---------------------------------------------------------------------------
# 5. Untrained model → 404 on results
# ---------------------------------------------------------------------------

def test_results_untrained_model():
    response = client.get("/api/modeling/results/nonexistent_model_xyz")
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# 6. Prediction before training → 404
# ---------------------------------------------------------------------------

def test_predict_before_training():
    response = client.post("/api/modeling/predict/untrained_model_abc", json={"sample_index": 0})
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# 7. Single-record prediction consistency
# ---------------------------------------------------------------------------

def test_prediction_probabilities_sum_to_one(trained_result):
    artifacts = trained_result["pipeline_artifacts"]
    sample = trained_result["sample_records"][0]["features"]
    pred = predict_record(artifacts, sample)
    assert "predicted_class" in pred
    assert pred["predicted_class"] in (0, 1)
    if pred["probability_late"] is not None and pred["probability_ontime"] is not None:
        total = pred["probability_late"] + pred["probability_ontime"]
        assert abs(total - 1.0) < 0.01, f"Probabilities do not sum to 1: {total}"


def test_prediction_label_matches_class(trained_result):
    artifacts = trained_result["pipeline_artifacts"]
    for sample_rec in trained_result["sample_records"][:3]:
        pred = predict_record(artifacts, sample_rec["features"])
        if pred["predicted_class"] == 1:
            assert pred["predicted_label"] == "Late Delivery Risk"
        else:
            assert pred["predicted_label"] == "On-Time Delivery"


# ---------------------------------------------------------------------------
# 8. Feature Importance Format
# ---------------------------------------------------------------------------

def test_feature_importance_format(trained_result):
    importances = trained_result["feature_importance"]
    assert isinstance(importances, list)
    if len(importances) > 0:
        first = importances[0]
        assert "feature" in first
        assert "importance" in first
        assert "importance_pct" in first
        assert first["importance"] >= 0
        assert first["importance_pct"] >= 0


def test_feature_importance_sorted_descending(trained_result):
    importances = trained_result["feature_importance"]
    if len(importances) > 1:
        for i in range(len(importances) - 1):
            assert importances[i]["importance"] >= importances[i + 1]["importance"]


# ---------------------------------------------------------------------------
# 9. Model comparison
# ---------------------------------------------------------------------------

def test_model_comparison_service():
    svc = ModelingService()
    # Simulate storing two fake results
    svc.store_result("logistic_regression", {
        "model_label": "Logistic Regression",
        "metrics": {"accuracy": 0.70, "precision": 0.72, "recall": 0.65, "f1": 0.68, "roc_auc": 0.75},
        "timing": {"model_training_sec": 0.5, "total_pipeline_sec": 1.2},
        "feature_info": {"post_selection": 15},
    })
    svc.store_result("random_forest", {
        "model_label": "Random Forest",
        "metrics": {"accuracy": 0.73, "precision": 0.88, "recall": 0.57, "f1": 0.70, "roc_auc": 0.83},
        "timing": {"model_training_sec": 2.1, "total_pipeline_sec": 9.0},
        "feature_info": {"post_selection": 20},
    })
    comparison = svc.get_comparison()
    assert len(comparison) == 2
    types = {r["model_type"] for r in comparison}
    assert "logistic_regression" in types
    assert "random_forest" in types


# ---------------------------------------------------------------------------
# 10. API Endpoint Tests
# ---------------------------------------------------------------------------

def test_config_endpoint_without_dataset():
    response = client.get("/api/modeling/config")
    assert response.status_code == 200
    data = response.json()
    assert "models" in data
    assert "training_status" in data
    assert len(data["models"]) == 4


def test_comparison_without_models():
    response = client.get("/api/modeling/comparison")
    assert response.status_code == 404


def test_feature_importance_untrained():
    response = client.get("/api/modeling/feature-importance/zzz_not_trained")
    assert response.status_code == 404


def test_sample_records_untrained():
    response = client.get("/api/modeling/sample-records/zzz_not_trained")
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# 11. Empty dataset error
# ---------------------------------------------------------------------------

def test_empty_dataset_raises():
    empty_df = pd.DataFrame()
    with pytest.raises(ValueError, match="empty"):
        train_model(df=empty_df, model_type="random_forest")


# ---------------------------------------------------------------------------
# 12. Invalid model type
# ---------------------------------------------------------------------------

def test_invalid_model_type(small_df):
    with pytest.raises(ValueError, match="Unknown model type"):
        train_model(
            df=small_df,
            model_type="fake_model_xyz",
            target_column="Late_delivery_risk",
        )


# ---------------------------------------------------------------------------
# 13. Missing target handling
# ---------------------------------------------------------------------------

def test_missing_target_raises(small_df):
    df_no_target = small_df.drop(columns=["Late_delivery_risk"])
    with pytest.raises(ValueError):
        train_model(
            df=df_no_target,
            model_type="random_forest",
            target_column="nonexistent_target_col",
        )


# ---------------------------------------------------------------------------
# 14. Geographical target rejection
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("geo_col", ["State", "City", "Warehouse", "Customer State", "Order Country"])
def test_geographic_target_rejection(small_df, geo_col):
    df = small_df.copy()
    df[geo_col] = np.random.choice(["Region A", "Region B"], len(df))
    with pytest.raises(ValueError, match="Geographical and spatial columns"):
        train_model(
            df=df,
            model_type="random_forest",
            target_column=geo_col,
        )


# ---------------------------------------------------------------------------
# 15. Multiclass target support
# ---------------------------------------------------------------------------

def test_multiclass_target_support(small_df):
    """Multiclass target should be successfully trained without errors."""
    df = small_df.copy()
    df["Custom_Target"] = np.random.choice(["Class_A", "Class_B", "Class_C"], len(df))
    result = train_model(
        df=df,
        model_type="logistic_regression",
        target_column="Custom_Target",
    )
    assert result["status"] == "success"
    assert result["classification_type"] == "multiclass"
    assert result["n_classes"] == 3
    assert len(result["metrics"]["confusion_matrix"]) == 3


# ---------------------------------------------------------------------------
# 16. Generic target auto-detection without Late_delivery_risk
# ---------------------------------------------------------------------------

def test_generic_target_auto_detection(small_df):
    """When Late_delivery_risk is missing, auto-detects another valid target column."""
    df_no_risk = small_df.drop(columns=["Late_delivery_risk"])
    df_no_risk["Target_Flag"] = np.random.choice([0, 1], len(df_no_risk))
    result = train_model(
        df=df_no_risk,
        model_type="random_forest",
        target_column=None,
    )
    assert result["status"] == "success"
    assert result["target_info"]["target_column"] == "Target_Flag"


# ---------------------------------------------------------------------------
# 17. Categorical features with 'Western Australia' train cleanly on all models
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("model_type", [
    "logistic_regression",
    "decision_tree",
    "random_forest",
    "gradient_boosting",
])
def test_categorical_features_with_australian_states(small_df, model_type):
    """
    Direct regression test for: invalid literal for int() with base 10: 'Western Australia'
    Ensures that State with 'Western Australia' is safely encoded as an input feature
    and does NOT crash any model training or sample-record evaluation.
    """
    df = small_df.copy()
    states = ["Western Australia", "New South Wales", "Victoria", "Queensland", "South Australia", "Tasmania"]
    df["State"] = np.random.choice(states, len(df))
    df["City"] = np.random.choice(["Perth", "Sydney", "Melbourne", "Brisbane"], len(df))

    result = train_model(
        df=df,
        model_type=model_type,
        target_column="Late_delivery_risk",
        leakage_columns=["Delivery_Status", "Days_for_shipping_real"],
        test_size=0.20,
        random_state=42,
    )

    assert result["status"] == "success"
    assert result["model_type"] == model_type
    assert result["metrics"]["accuracy"] >= 0.0
    assert len(result["sample_records"]) > 0
    for s in result["sample_records"]:
        assert "State" in s["features"]


# ---------------------------------------------------------------------------
# 18. String and boolean binary target conversion via LabelEncoder
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("labels,expected_classes", [
    (["0", "1"], {"0", "1"}),
    (["On-Time", "Late"], {"On-Time", "Late"}),
    (["false", "true"], {"false", "true"}),
    ([False, True], {False, True}),
])
def test_convertible_binary_targets(small_df, labels, expected_classes):
    df = small_df.copy()
    df["Late_delivery_risk"] = np.random.choice(labels, len(df))
    result = train_model(
        df=df,
        model_type="decision_tree",
        target_column="Late_delivery_risk",
        leakage_columns=["Delivery_Status", "Days_for_shipping_real"],
    )
    assert result["status"] == "success"
    for s in result["sample_records"]:
        assert s["true_class"] in expected_classes
        assert s["predicted_class"] in expected_classes


# ---------------------------------------------------------------------------
# 19. Unseen categorical values during inference
# ---------------------------------------------------------------------------

def test_unseen_categorical_inference(small_df):
    df = small_df.copy()
    df["State"] = "New South Wales"
    df.loc[df.index[:len(df)//2], "State"] = "Victoria"

    result = train_model(
        df=df,
        model_type="random_forest",
        target_column="Late_delivery_risk",
        leakage_columns=["Delivery_Status", "Days_for_shipping_real"],
    )

    # Test single-record inference with an unseen state
    artifacts = result["pipeline_artifacts"]
    new_record = small_df.iloc[0].to_dict()
    new_record["State"] = "Unseen Northern Territory"

    pred = predict_record(
        pipeline_artifacts=artifacts,
        record=new_record,
    )
    assert "predicted_class" in pred
    assert pred["confidence_level"] in ("Low", "Medium", "High")


# ---------------------------------------------------------------------------
# New Tests for Dataset-Agnostic ML Pipeline
# ---------------------------------------------------------------------------

def test_multiclass_5_classes(small_df):
    """Train with 5 categorical classes."""
    df = small_df.copy()
    df["Segment"] = np.random.choice(["A", "B", "C", "D", "E"], len(df))
    result = train_model(
        df=df,
        model_type="decision_tree",
        target_column="Segment",
    )
    assert result["status"] == "success"
    assert result["n_classes"] == 5
    assert len(result["metrics"]["confusion_matrix"]) == 5


def test_domain_profile_auto_detection(small_df):
    """Verify supply chain domain profile auto-detection when SC columns exist."""
    from modeling.domain_profiles import detect_domain_profile
    assert detect_domain_profile(small_df) == "supply_chain"

    df_generic = pd.DataFrame({
        "Age": [25, 30, 35, 40],
        "Salary": [50000, 60000, 70000, 80000],
        "Purchased": [0, 1, 0, 1]
    })
    assert detect_domain_profile(df_generic) == "general"


def test_predict_multiclass_record(small_df):
    """Predicting on a multiclass model returns probabilities for all classes."""
    df = small_df.copy()
    df["Target_3"] = np.random.choice(["Red", "Green", "Blue"], len(df))
    result = train_model(
        df=df,
        model_type="random_forest",
        target_column="Target_3",
    )
    artifacts = result["pipeline_artifacts"]
    sample_rec = result["sample_records"][0]["features"]
    pred = predict_record(artifacts, sample_rec)

    assert pred["predicted_label"] in ("Red", "Green", "Blue")
    assert len(pred["probabilities"]) == 3
    assert "confidence_level" in pred


def test_config_endpoint_returns_columns_and_candidates():
    """GET /api/modeling/config returns dataset columns and domain profiles."""
    from services.ingestion import ingestion_service
    # Set a dummy active dataframe
    dummy_df = pd.DataFrame({"Feature1": [1, 2], "Feature2": [3, 4], "Target": [0, 1]})
    ingestion_service._active_df = dummy_df
    ingestion_service._filename = "test.csv"

    response = client.get("/api/modeling/config")
    assert response.status_code == 200
    data = response.json()

    assert "columns" in data
    assert "target_candidates" in data
    assert "domain_profiles" in data
    assert len(data["columns"]) == 3

    # Clean up
    ingestion_service._active_df = None


