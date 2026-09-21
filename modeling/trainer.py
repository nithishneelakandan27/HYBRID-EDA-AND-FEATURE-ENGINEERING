"""
modeling/trainer.py

Phase II: ML Modeling Pipeline
================================
Reuses the Phase I preprocessing chain:
  HybridPreprocessor → ConditionalFeatureEngineer → HybridFeatureSelector → StandardScaler

Then trains configurable Scikit-learn classifiers:
  - logistic_regression  (baseline, highly explainable)
  - decision_tree        (visual, intuitive splits)
  - random_forest        (ensemble, strong performance)
  - gradient_boosting    (boosting, strong precision)

Design principles:
  - Dataset-agnostic target detection & selection (binary & multiclass support)
  - All transformers fitted strictly on X_train (no test-set contamination)
  - Leakage columns and target excluded before splitting
  - Stratified train/test split
  - class_weight='balanced' where supported
  - Feature importances extracted for tree-based models; abs(coefficients) for LR
  - Single-record inference uses the exact same fitted pipeline
"""

import time
import re
import logging
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple

from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score,
    f1_score, roc_auc_score, confusion_matrix, classification_report
)

from preprocessing.pipeline import HybridPreprocessor
from feature_engineering.engineer import ConditionalFeatureEngineer
from feature_selection.selector import HybridFeatureSelector
from profiling.auto_config import AutoConfigEngine
from evaluation.pipelines import ensure_finite_dataframe
from evaluation.metrics import evaluate_classification_metrics
from modeling.domain_profiles import get_domain_profile, get_class_labels, detect_domain_profile

logger = logging.getLogger("modeling.trainer")

GEOGRAPHIC_COLUMNS = {
    "state", "city", "warehouse", "country", "region", "zipcode", "zip_code",
    "postal_code", "latitude", "longitude", "street", "address", "market",
    "territory", "store", "department"
}


def resolve_and_validate_target(
    df: pd.DataFrame,
    target_column: Optional[str] = None,
    domain_profile: Optional[str] = None,
) -> Tuple[str, pd.Series, Dict[str, Any]]:
    """
    Generic, dataset-agnostic target resolution and validation.
    
    Returns
    -------
    (resolved_target_name, target_series, target_meta_dict)
    """
    resolved_target = None
    target_clean = str(target_column).strip() if target_column else ""
    profile = get_domain_profile(domain_profile, df)

    if target_clean and target_clean.lower() != "auto":
        for col in df.columns:
            if str(col).strip().lower() == target_clean.lower():
                resolved_target = str(col)
                break
        if not resolved_target:
            raise ValueError(
                f"Specified target column '{target_column}' was not found in dataset columns: {list(df.columns[:10])}..."
            )
    else:
        # Auto-detect target:
        # 1. Check profile target hints first
        for hint in profile.get("target_hints", []):
            for col in df.columns:
                if str(col).strip().lower() == str(hint).strip().lower():
                    resolved_target = str(col)
                    break
            if resolved_target:
                break

        # 2. Fallback to generic AutoConfigEngine target detection
        if not resolved_target:
            detected_info = AutoConfigEngine.detect_target(df)
            resolved_target = detected_info.get("column") or detected_info.get("detected_column")

        if not resolved_target:
            raise ValueError(
                "Target column could not be determined automatically. "
                "Please select a target column explicitly. "
                f"Available candidate columns: {list(df.columns[:10])}..."
            )

    # Rejection check for geographical columns
    target_lower = resolved_target.lower()
    for geo_kw in GEOGRAPHIC_COLUMNS:
        if re.search(r'\b' + re.escape(geo_kw) + r'\b', target_lower) or target_lower == geo_kw:
            raise ValueError(
                f"Invalid target column '{resolved_target}'. Geographical and spatial columns "
                f"(such as State, City, Warehouse, Country, Region) cannot be used as the classification target. "
                f"Please select a non-geographical classification column."
            )

    y_raw = df[resolved_target].copy()
    if y_raw.isnull().all():
        raise ValueError(f"Target column '{resolved_target}' contains only null/missing values.")

    unique_vals = list(y_raw.dropna().unique())
    n_classes = len(unique_vals)
    if n_classes < 2:
        raise ValueError(
            f"Target column '{resolved_target}' contains only {n_classes} distinct class(es): {unique_vals}. "
            f"Supervised classification requires at least 2 distinct classes."
        )

    classification_type = "binary" if n_classes == 2 else "multiclass"

    target_meta = {
        "target_column": resolved_target,
        "classification_type": classification_type,
        "n_classes": n_classes,
        "unique_values": unique_vals,
        "domain_profile": profile["key"],
    }

    return resolved_target, y_raw, target_meta


def validate_purely_numeric(df: pd.DataFrame, stage_name: str = "preprocessed features") -> None:
    """Verifies that all columns in the dataframe are purely numerical with no object/string types."""
    non_numeric_cols = [
        col for col in df.columns
        if not pd.api.types.is_numeric_dtype(df[col])
    ]
    if non_numeric_cols:
        sample_vals = {c: list(df[c].dropna().head(3)) for c in non_numeric_cols[:3]}
        logger.error(
            "Non-numeric columns detected in %s: %s with sample values: %s",
            stage_name, non_numeric_cols, sample_vals
        )
        raise ValueError(
            f"Non-numeric columns detected in {stage_name}: {non_numeric_cols}. "
            f"Sample invalid values: {sample_vals}. "
            f"All features must be converted to numeric representations before model training."
        )


# ---------------------------------------------------------------------------
# Model Registry: configurable, extensible
# ---------------------------------------------------------------------------

MODEL_REGISTRY = {
    "logistic_regression": {
        "label": "Logistic Regression",
        "description": "Linear baseline classifier. Highly interpretable via feature coefficients. Suitable for linearly separable patterns.",
        "explainability": "High",
        "supports_feature_importance": True,
        "importance_type": "coefficients",
        "default_params": {
            "solver": "lbfgs",
            "max_iter": 1000,
            "tol": 1e-4,
            "class_weight": "balanced",
            "random_state": 42,
        },
        "factory": lambda p: LogisticRegression(**p),
    },
    "decision_tree": {
        "label": "Decision Tree",
        "description": "Recursive binary splits on feature thresholds. Fully explainable as a tree of if/else rules. Prone to overfitting without depth constraints.",
        "explainability": "High",
        "supports_feature_importance": True,
        "importance_type": "gini_impurity",
        "default_params": {
            "max_depth": 8,
            "min_samples_split": 20,
            "min_samples_leaf": 10,
            "class_weight": "balanced",
            "random_state": 42,
        },
        "factory": lambda p: DecisionTreeClassifier(**p),
    },
    "random_forest": {
        "label": "Random Forest",
        "description": "Ensemble of decision trees with random feature subsampling. Reduces overfitting and captures complex non-linear patterns.",
        "explainability": "Medium",
        "supports_feature_importance": True,
        "importance_type": "mean_impurity_decrease",
        "default_params": {
            "n_estimators": 100,
            "max_depth": 12,
            "min_samples_split": 10,
            "min_samples_leaf": 5,
            "class_weight": "balanced",
            "n_jobs": -1,
            "random_state": 42,
        },
        "factory": lambda p: RandomForestClassifier(**p),
    },
    "gradient_boosting": {
        "label": "Gradient Boosting",
        "description": "Sequential ensemble: each tree corrects errors of its predecessors. Strong precision on imbalanced datasets. Slower to train than Random Forest.",
        "explainability": "Low",
        "supports_feature_importance": True,
        "importance_type": "mean_impurity_decrease",
        "default_params": {
            "n_estimators": 100,
            "max_depth": 5,
            "learning_rate": 0.1,
            "subsample": 0.8,
            "random_state": 42,
        },
        "factory": lambda p: GradientBoostingClassifier(**p),
    },
}


def get_model_catalog() -> List[Dict[str, Any]]:
    """Return model metadata for the frontend model-selection UI."""
    return [
        {
            "model_type": k,
            "label": v["label"],
            "description": v["description"],
            "explainability": v["explainability"],
            "supports_feature_importance": v["supports_feature_importance"],
            "importance_type": v["importance_type"],
        }
        for k, v in MODEL_REGISTRY.items()
    ]


# ---------------------------------------------------------------------------
# Core Training Function
# ---------------------------------------------------------------------------

def train_model(
    df: pd.DataFrame,
    model_type: str = "random_forest",
    target_column: Optional[str] = None,
    domain_profile: Optional[str] = None,
    leakage_columns: Optional[List[str]] = None,
    feature_specs: Optional[List[Dict[str, Any]]] = None,
    test_size: float = 0.20,
    random_state: int = 42,
    class_weight: str = "balanced",
    skewness_threshold: float = 1.0,
    outlier_threshold: float = 0.02,
    cardinality_threshold: int = 15,
) -> Dict[str, Any]:
    """
    Full Phase I → Phase II training pipeline.

    Guarantees:
    - Target and leakage columns removed from X before any splitting.
    - Works with any dataset, binary or multiclass classification.
    - All transformers fitted strictly on X_train.
    - X_test transformed with fitted (not re-fitted) transformers.
    - Metrics computed on unseen X_test only.

    Returns a structured result dict containing metrics, feature importances,
    split info, sample test records for prediction explorer, and the fitted
    pipeline artifacts under 'pipeline_artifacts' for single-record inference.
    """
    t_total = time.perf_counter()

    if df is None or df.empty:
        raise ValueError("Cannot train on an empty or missing dataset.")

    if model_type not in MODEL_REGISTRY:
        raise ValueError(
            f"Unknown model type '{model_type}'. "
            f"Available: {list(MODEL_REGISTRY.keys())}"
        )

    # ── 1. Resolve and validate target column & domain profile ────────────
    target_column, y_raw, target_meta = resolve_and_validate_target(df, target_column, domain_profile)
    domain_key = target_meta["domain_profile"]

    # Filter out missing target rows if any
    valid_target_mask = y_raw.notna()
    if not valid_target_mask.all():
        df = df.loc[valid_target_mask].copy()
        y_raw = y_raw.loc[valid_target_mask]

    # Encode target cleanly using LabelEncoder
    label_encoder = LabelEncoder()
    y_encoded = pd.Series(label_encoder.fit_transform(y_raw), index=y_raw.index, name=target_column)
    raw_classes = list(label_encoder.classes_)

    # Map classes to human-readable display labels using domain profile
    class_labels = get_class_labels(domain_key, target_column, raw_classes, df)

    # ── 2. Resolve leakage columns ────────────────────────────────────────
    if leakage_columns is None:
        auto_leakage = AutoConfigEngine.detect_leakage(df, target_col=target_column)
        leakage_columns = [item["column"] for item in auto_leakage]

    # ── 3. Resolve feature engineering specs ──────────────────────────────
    if feature_specs is None:
        auto_cfg = AutoConfigEngine.generate_auto_config(df)
        feature_specs = auto_cfg.get("feature_specs", [])

    # ── 4. Build feature matrix: drop target + leakage columns ───────────
    leakage_set = set(leakage_columns or [])
    drop_cols = {target_column} | leakage_set
    X = df.drop(columns=[c for c in drop_cols if c in df.columns]).copy()

    if X.shape[1] == 0:
        raise ValueError(
            "No valid input features remain after removing target and leakage columns."
        )

    target_class_distribution = {
        str(k): int(v) for k, v in y_raw.value_counts().items()
    }

    # ── 5. Stratified train/test split ───────────────────────────────────
    stratify_opt = None
    val_counts = y_encoded.value_counts()
    if len(val_counts) >= 2 and val_counts.min() >= 2:
        stratify_opt = y_encoded

    X_train, X_test, y_train, y_test = train_test_split(
        X, y_encoded,
        test_size=test_size,
        random_state=random_state,
        stratify=stratify_opt,
    )

    # ── 6. Phase I: HybridPreprocessor (fit on train only) ───────────────
    t_prep = time.perf_counter()
    preprocessor = HybridPreprocessor(
        leakage_columns=leakage_columns,
        skewness_threshold=skewness_threshold,
        outlier_threshold=outlier_threshold,
        cardinality_threshold=cardinality_threshold,
    )
    preprocessor.fit(X_train)
    prep_names = preprocessor.get_feature_names_out()
    X_tr_pre = ensure_finite_dataframe(preprocessor.transform(X_train), prep_names, index=X_train.index)
    X_te_pre = ensure_finite_dataframe(preprocessor.transform(X_test), prep_names, index=X_test.index)
    preprocess_time = round(time.perf_counter() - t_prep, 4)

    # ── 7. Phase I: ConditionalFeatureEngineer ────────────────────────────
    t_fe = time.perf_counter()
    engineer = None
    fe_report = None
    if feature_specs:
        engineer = ConditionalFeatureEngineer(
            feature_specs=feature_specs,
            leakage_columns=leakage_columns,
            target_column=str(target_column),
        )
        engineer.fit(X_tr_pre)
        X_tr_pre = engineer.transform(X_tr_pre)
        X_te_pre = engineer.transform(X_te_pre)
        fe_names = list(X_tr_pre.columns)
        X_tr_pre = ensure_finite_dataframe(X_tr_pre, fe_names, index=X_train.index)
        X_te_pre = ensure_finite_dataframe(X_te_pre, fe_names, index=X_test.index)
        fe_report = engineer.get_report()
    fe_time = round(time.perf_counter() - t_fe, 4)

    # ── 8. Phase I: HybridFeatureSelector ────────────────────────────────
    t_fs = time.perf_counter()
    selector = HybridFeatureSelector(
        variance_threshold=1e-4,
        correlation_threshold=0.95,
        p_value_threshold=0.05,
    )
    X_tr_sel = selector.fit_transform(X_tr_pre, y_train)
    X_te_sel = selector.transform(X_te_pre)
    selected_features = selector.get_selected_features()
    fs_report = selector.get_report()
    fs_time = round(time.perf_counter() - t_fs, 4)

    # Fallback: if all features removed, use preprocessed output
    if len(selected_features) == 0:
        X_tr_sel = X_tr_pre
        X_te_sel = X_te_pre
        selected_features = list(X_tr_pre.columns)

    X_tr_fit = ensure_finite_dataframe(X_tr_sel, selected_features, index=X_train.index)
    X_te_fit = ensure_finite_dataframe(X_te_sel, selected_features, index=X_test.index)

    # ── 9. Final StandardScaler (fit on train only) ───────────────────────
    final_scaler = StandardScaler()
    X_tr_scaled = pd.DataFrame(
        final_scaler.fit_transform(X_tr_fit),
        columns=selected_features,
        index=X_train.index,
    )
    X_te_scaled = pd.DataFrame(
        final_scaler.transform(X_te_fit),
        columns=selected_features,
        index=X_test.index,
    )

    # ── 10. Model Training ────────────────────────────────────────────────
    validate_purely_numeric(X_tr_scaled, stage_name="training feature matrix")
    validate_purely_numeric(X_te_scaled, stage_name="testing feature matrix")

    meta = MODEL_REGISTRY[model_type]
    model_params = dict(meta["default_params"])
    if "class_weight" in model_params:
        model_params["class_weight"] = class_weight if class_weight else "balanced"

    model = meta["factory"](model_params)

    t_train = time.perf_counter()
    model.fit(X_tr_scaled, y_train)
    train_time = round(time.perf_counter() - t_train, 4)

    # ── 11. Evaluation on unseen test set ────────────────────────────────
    t_pred = time.perf_counter()
    y_pred_encoded = model.predict(X_te_scaled)
    y_prob_all = model.predict_proba(X_te_scaled) if hasattr(model, "predict_proba") else None
    predict_time = round(time.perf_counter() - t_pred, 4)

    # Evaluate metrics on integer-encoded targets to support any class label types seamlessly
    encoded_classes = list(range(len(raw_classes)))
    metrics = evaluate_classification_metrics(y_test, y_pred_encoded, y_prob=y_prob_all, labels=encoded_classes)

    # Replace integer classes with original classes and display labels
    metrics["classes"] = [str(c) for c in raw_classes]
    metrics["confusion_matrix_labels"] = [class_labels.get(c, str(c)) for c in raw_classes]

    # Inverse transform to original labels for classification report & sample records
    y_test_orig = label_encoder.inverse_transform(y_test)
    y_pred_orig = label_encoder.inverse_transform(y_pred_encoded)

    # Per-class metrics
    cr = classification_report(y_test_orig, y_pred_orig, output_dict=True, zero_division=0)
    class_report = {str(k): v for k, v in cr.items()}

    # ── 12. Feature Importance ─────────────────────────────────────────────
    feature_importance = _extract_feature_importance(model, selected_features, meta)

    # ── 13. Sample test records for Prediction Explorer ───────────────────
    sample_records = _build_sample_records(
        X_test.reset_index(drop=True),
        y_test_orig,
        y_pred_orig,
        y_prob_all,
        label_encoder,
        class_labels,
        n=10,
    )

    total_time = round(time.perf_counter() - t_total, 4)

    return {
        "status": "success",
        "model_type": model_type,
        "model_label": meta["label"],
        "classification_type": target_meta["classification_type"],
        "n_classes": target_meta["n_classes"],
        "domain_profile": domain_key,
        "class_labels": class_labels,
        "split_info": {
            "total_rows": len(df),
            "train_rows": len(X_train),
            "test_rows": len(X_test),
            "test_percentage": round(test_size * 100, 1),
            "random_state": random_state,
        },
        "target_info": {
            "target_column": target_column,
            "classification_type": target_meta["classification_type"],
            "n_classes": target_meta["n_classes"],
            "class_distribution": target_class_distribution,
            "train_class_distribution": {
                str(k): int(v) for k, v in y_train.value_counts().items()
            },
            "test_class_distribution": {
                str(k): int(v) for k, v in y_test.value_counts().items()
            },
        },
        "leakage_info": {
            "leakage_columns_excluded": sorted(leakage_columns),
            "leakage_count": len(leakage_columns),
        },
        "feature_info": {
            "raw_input_features": X.shape[1],
            "post_preprocessing": len(prep_names),
            "post_feature_engineering": len(list(X_tr_pre.columns)) if feature_specs else len(prep_names),
            "post_selection": len(selected_features),
            "selected_features": selected_features,
        },
        "timing": {
            "preprocessing_sec": preprocess_time,
            "feature_engineering_sec": fe_time,
            "feature_selection_sec": fs_time,
            "model_training_sec": train_time,
            "prediction_sec": predict_time,
            "total_pipeline_sec": total_time,
        },
        "metrics": metrics,
        "classification_report": class_report,
        "feature_importance": feature_importance,
        "sample_records": sample_records,
        # Pipeline artifacts retained for single-record inference
        "pipeline_artifacts": {
            "preprocessor": preprocessor,
            "engineer": engineer,
            "selector": selector,
            "scaler": final_scaler,
            "model": model,
            "label_encoder": label_encoder,
            "class_labels": class_labels,
            "domain_profile": domain_key,
            "selected_features": selected_features,
            "target_column": target_column,
            "leakage_columns": leakage_columns,
            "feature_specs": feature_specs,
        },
    }


def predict_record(pipeline_artifacts: Dict[str, Any], record: Dict[str, Any]) -> Dict[str, Any]:
    """
    Runs single-record inference through the exact same fitted pipeline artifacts.

    Parameters
    ----------
    pipeline_artifacts : dict from the 'pipeline_artifacts' key in train_model() result
    record             : dict mapping raw column names to values (pre-preprocessing)

    Returns
    -------
    dict with predicted_class, predicted_label, probabilities, confidence_level, etc.
    """
    preprocessor = pipeline_artifacts["preprocessor"]
    engineer = pipeline_artifacts["engineer"]
    selector = pipeline_artifacts["selector"]
    scaler = pipeline_artifacts["scaler"]
    model = pipeline_artifacts["model"]
    label_encoder = pipeline_artifacts["label_encoder"]
    class_labels = pipeline_artifacts.get("class_labels", {})
    domain_profile = pipeline_artifacts.get("domain_profile", "general")
    selected_features = pipeline_artifacts["selected_features"]
    target_column = pipeline_artifacts["target_column"]
    leakage_columns = pipeline_artifacts["leakage_columns"] or []

    # Build a single-row DataFrame; exclude target and leakage columns
    record_clean = {
        k: v for k, v in record.items()
        if k != target_column and k not in leakage_columns
    }
    row_df = pd.DataFrame([record_clean])

    # Apply exact fitted pipeline
    X_pre = ensure_finite_dataframe(
        preprocessor.transform(row_df),
        preprocessor.get_feature_names_out(),
        index=row_df.index,
    )
    if engineer is not None:
        X_pre = engineer.transform(X_pre)
        X_pre = ensure_finite_dataframe(X_pre, list(X_pre.columns), index=row_df.index)

    X_sel = selector.transform(X_pre)
    X_sel = ensure_finite_dataframe(X_sel, selected_features, index=row_df.index)
    X_scaled = pd.DataFrame(
        scaler.transform(X_sel),
        columns=selected_features,
        index=row_df.index,
    )

    pred_encoded = model.predict(X_scaled)[0]
    pred_original = label_encoder.inverse_transform([pred_encoded])[0]
    pred_label = class_labels.get(pred_original, str(pred_original))

    probabilities = {}
    max_prob = 1.0
    if hasattr(model, "predict_proba"):
        probs = model.predict_proba(X_scaled)[0]
        max_prob = float(np.max(probs))
        for idx, orig_cls in enumerate(label_encoder.classes_):
            lbl = class_labels.get(orig_cls, str(orig_cls))
            probabilities[str(lbl)] = round(float(probs[idx]), 4)

    confidence_level = "High" if max_prob >= 0.7 else "Medium" if max_prob >= 0.4 else "Low"

    # Legacy supply chain support
    prob_late = None
    prob_ontime = None
    risk_level = None
    if domain_profile == "supply_chain" or len(label_encoder.classes_) == 2:
        # Check if 1 / 0 exist in classes
        prob_map = {orig_cls: p for orig_cls, p in zip(label_encoder.classes_, probs)} if hasattr(model, "predict_proba") else {}
        prob_late = round(float(prob_map.get(1, prob_map.get("1", 0.0))), 4) if prob_map else None
        prob_ontime = round(float(prob_map.get(0, prob_map.get("0", 0.0))), 4) if prob_map else None
        risk_level = (
            "High" if (prob_late or 0) >= 0.7
            else "Medium" if (prob_late or 0) >= 0.5
            else "Low"
        )

    return {
        "predicted_class": pred_original,
        "predicted_label": pred_label,
        "probabilities": probabilities,
        "confidence_level": confidence_level,
        "probability_late": prob_late,
        "probability_ontime": prob_ontime,
        "risk_level": risk_level or confidence_level,
    }


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

def _extract_feature_importance(model, feature_names: List[str], meta: Dict) -> List[Dict]:
    """Extract and normalise feature importances from supported model types."""
    importances = None

    if meta["importance_type"] in ("mean_impurity_decrease", "gini_impurity"):
        if hasattr(model, "feature_importances_"):
            importances = model.feature_importances_
    elif meta["importance_type"] == "coefficients":
        if hasattr(model, "coef_"):
            coef = model.coef_
            if coef.ndim == 2:
                importances = np.abs(coef[0])
            else:
                importances = np.abs(coef)

    if importances is None or len(importances) != len(feature_names):
        return []

    total = float(importances.sum()) or 1.0
    ranked = sorted(
        [
            {
                "feature": fname,
                "importance": round(float(imp), 6),
                "importance_pct": round(float(imp) / total * 100, 2),
            }
            for fname, imp in zip(feature_names, importances)
        ],
        key=lambda x: x["importance"],
        reverse=True,
    )
    return ranked[:20]  # top 20


def _build_sample_records(
    X_test_raw: pd.DataFrame,
    y_test_orig: np.ndarray,
    y_pred_orig: np.ndarray,
    y_prob_all: Optional[np.ndarray],
    label_encoder: LabelEncoder,
    class_labels: Dict[Any, str],
    n: int = 10,
) -> List[Dict[str, Any]]:
    """Collect a curated set of test records for the Prediction Explorer."""
    records = []
    indices = list(range(min(n, len(X_test_raw))))
    for i in indices:
        row = X_test_raw.iloc[i]
        true_orig = y_test_orig[i]
        pred_orig = y_pred_orig[i]
        
        prob_late = None
        if y_prob_all is not None and y_prob_all.ndim == 2:
            # If 2 classes and positive class is index 1
            if y_prob_all.shape[1] >= 2:
                prob_late = round(float(y_prob_all[i, 1]), 4)
            else:
                prob_late = round(float(y_prob_all[i, 0]), 4)

        records.append({
            "index": i,
            "true_class": true_orig,
            "true_label": class_labels.get(true_orig, str(true_orig)),
            "predicted_class": pred_orig,
            "predicted_label": class_labels.get(pred_orig, str(pred_orig)),
            "correct": true_orig == pred_orig,
            "probability_late": prob_late,
            "features": {
                k: (float(v) if isinstance(v, (np.floating, float)) else
                    int(v) if isinstance(v, (np.integer, int)) else str(v))
                for k, v in row.to_dict().items()
            },
        })
    return records
