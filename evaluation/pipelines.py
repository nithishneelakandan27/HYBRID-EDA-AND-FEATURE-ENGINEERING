"""
evaluation/pipelines.py

Three experimental ML pipelines from the research paper:

PIPELINE A — Minimal Baseline
    mean imputation + StandardScaler + OrdinalEncoder
    → LogisticRegression

PIPELINE B — Fixed Baseline
    mean imputation + StandardScaler + OneHotEncoder (fixed, not hybrid)
    → LogisticRegression

PIPELINE C — Hybrid (Proposed)
    HybridPreprocessor (Phase 5) + ConditionalFeatureEngineer + HybridFeatureSelector
    → LogisticRegression

ALL THREE:
  - Use the same X_train, X_test, y_train, y_test (passed in)
  - Fit ONLY on training data
  - Evaluate ONLY on test data
  - LogisticRegression(max_iter=1000, random_state=42)
"""
import time
import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional

from sklearn.linear_model import LogisticRegression
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, OrdinalEncoder, OneHotEncoder
from sklearn.pipeline import Pipeline

from preprocessing.pipeline import HybridPreprocessor
from feature_engineering.engineer import ConditionalFeatureEngineer
from feature_selection.selector import HybridFeatureSelector
from evaluation.metrics import compute_metrics


def _safe_json(val):
    """Convert numpy types to Python native for JSON serialization."""
    if isinstance(val, (np.integer,)):
        return int(val)
    if isinstance(val, (np.floating,)):
        return float(val)
    if isinstance(val, np.ndarray):
        return val.tolist()
    return val


# ---------------------------------------------------------------------------
# Pipeline A — Minimal Baseline
# ---------------------------------------------------------------------------

def run_minimal_pipeline(
    X_train: pd.DataFrame,
    X_test: pd.DataFrame,
    y_train: pd.Series,
    y_test: pd.Series
) -> Dict[str, Any]:
    """
    Minimal baseline:
      - All-column mean imputation
      - StandardScaler on numerics
      - OrdinalEncoder(handle_unknown='use_encoded_value', unknown_value=-1) on categoricals
      - LogisticRegression(max_iter=1000, random_state=42)
    """
    t0 = time.perf_counter()
    original_cols = list(X_train.columns)

    # Partition columns
    num_cols = list(X_train.select_dtypes(include=[np.number]).columns)
    cat_cols = list(X_train.select_dtypes(exclude=[np.number]).columns)

    parts_train = []
    parts_test = []
    feature_names = []

    # --- Numeric ---
    if num_cols:
        num_imputer = SimpleImputer(strategy="mean", keep_empty_features=True)
        X_num_tr_arr = num_imputer.fit_transform(X_train[num_cols])
        X_num_te_arr = num_imputer.transform(X_test[num_cols])
        assert X_num_tr_arr.shape[1] == len(num_cols), (
            f"Minimal numeric imputer shape mismatch: matrix has {X_num_tr_arr.shape[1]} cols, "
            f"expected {len(num_cols)}"
        )
        X_num_train = pd.DataFrame(X_num_tr_arr, columns=num_cols, index=X_train.index)
        X_num_test = pd.DataFrame(X_num_te_arr, columns=num_cols, index=X_test.index)
        scaler = StandardScaler()
        X_num_train_s = pd.DataFrame(
            scaler.fit_transform(X_num_train),
            columns=num_cols, index=X_train.index
        )
        X_num_test_s = pd.DataFrame(
            scaler.transform(X_num_test),
            columns=num_cols, index=X_test.index
        )
        parts_train.append(X_num_train_s)
        parts_test.append(X_num_test_s)
        feature_names.extend(num_cols)

    # --- Categorical ---
    if cat_cols:
        cat_imputer = SimpleImputer(strategy="most_frequent", keep_empty_features=True)
        X_cat_train_arr = cat_imputer.fit_transform(X_train[cat_cols])
        X_cat_test_arr = cat_imputer.transform(X_test[cat_cols])
        assert X_cat_train_arr.shape[1] == len(cat_cols), (
            f"Minimal categorical imputer shape mismatch: matrix has {X_cat_train_arr.shape[1]} cols, "
            f"expected {len(cat_cols)}"
        )
        X_cat_train = pd.DataFrame(X_cat_train_arr, columns=cat_cols, index=X_train.index)
        X_cat_test = pd.DataFrame(X_cat_test_arr, columns=cat_cols, index=X_test.index)

        encoder = OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=-1)
        X_cat_train_enc = pd.DataFrame(
            encoder.fit_transform(X_cat_train),
            columns=cat_cols, index=X_train.index
        )
        X_cat_test_enc = pd.DataFrame(
            encoder.transform(X_cat_test),
            columns=cat_cols, index=X_test.index
        )
        parts_train.append(X_cat_train_enc)
        parts_test.append(X_cat_test_enc)
        feature_names.extend(cat_cols)

    X_tr = pd.concat(parts_train, axis=1) if parts_train else pd.DataFrame(index=X_train.index)
    X_te = pd.concat(parts_test, axis=1) if parts_test else pd.DataFrame(index=X_test.index)

    preprocess_time = round(time.perf_counter() - t0, 4)
    post_preprocess_count = len(feature_names)

    # --- Model ---
    t_model = time.perf_counter()
    model = LogisticRegression(max_iter=1000, random_state=42)
    model.fit(X_tr, y_train)
    train_time = round(time.perf_counter() - t_model, 4)

    t_pred = time.perf_counter()
    y_pred = model.predict(X_te)
    y_prob = model.predict_proba(X_te)[:, 1] if hasattr(model, "predict_proba") else None
    predict_time = round(time.perf_counter() - t_pred, 4)

    metrics = compute_metrics(y_test, y_pred, y_prob)

    return {
        "pipeline": "Minimal",
        "description": "Mean imputation + StandardScaler + OrdinalEncoder → LogisticRegression",
        "feature_counts": {
            "original": len(original_cols),
            "post_preprocessing": post_preprocess_count,
            "post_feature_engineering": post_preprocess_count,
            "final": post_preprocess_count
        },
        "timing": {
            "preprocessing_sec": preprocess_time,
            "feature_engineering_sec": 0.0,
            "feature_selection_sec": 0.0,
            "model_training_sec": train_time,
            "prediction_sec": predict_time
        },
        "metrics": metrics,
        "feature_engineering_report": None,
        "feature_selection_report": None
    }


# ---------------------------------------------------------------------------
# Pipeline B — Fixed Baseline
# ---------------------------------------------------------------------------

def run_fixed_pipeline(
    X_train: pd.DataFrame,
    X_test: pd.DataFrame,
    y_train: pd.Series,
    y_test: pd.Series
) -> Dict[str, Any]:
    """
    Fixed baseline:
      - Mean imputation
      - StandardScaler on numerics
      - OneHotEncoder(handle_unknown='ignore', sparse_output=False) on categoricals
      - LogisticRegression(max_iter=1000, random_state=42)
    """
    t0 = time.perf_counter()
    original_cols = list(X_train.columns)

    num_cols = list(X_train.select_dtypes(include=[np.number]).columns)
    cat_cols = list(X_train.select_dtypes(exclude=[np.number]).columns)

    parts_train = []
    parts_test = []
    feature_names = []

    # --- Numeric ---
    if num_cols:
        num_imputer = SimpleImputer(strategy="mean", keep_empty_features=True)
        X_num_tr_arr = num_imputer.fit_transform(X_train[num_cols])
        X_num_te_arr = num_imputer.transform(X_test[num_cols])
        assert X_num_tr_arr.shape[1] == len(num_cols), (
            f"Fixed numeric imputer shape mismatch: matrix has {X_num_tr_arr.shape[1]} cols, "
            f"expected {len(num_cols)}"
        )
        X_num_train = pd.DataFrame(X_num_tr_arr, columns=num_cols, index=X_train.index)
        X_num_test = pd.DataFrame(X_num_te_arr, columns=num_cols, index=X_test.index)
        scaler = StandardScaler()
        X_num_train_s = pd.DataFrame(
            scaler.fit_transform(X_num_train),
            columns=num_cols, index=X_train.index
        )
        X_num_test_s = pd.DataFrame(
            scaler.transform(X_num_test),
            columns=num_cols, index=X_test.index
        )
        parts_train.append(X_num_train_s)
        parts_test.append(X_num_test_s)
        feature_names.extend(num_cols)

    # --- Categorical → OneHotEncoder ---
    if cat_cols:
        cat_imputer = SimpleImputer(strategy="most_frequent", keep_empty_features=True)
        X_cat_train_arr = cat_imputer.fit_transform(X_train[cat_cols])
        X_cat_test_arr = cat_imputer.transform(X_test[cat_cols])
        assert X_cat_train_arr.shape[1] == len(cat_cols), (
            f"Fixed categorical imputer shape mismatch: matrix has {X_cat_train_arr.shape[1]} cols, "
            f"expected {len(cat_cols)}"
        )
        X_cat_train = pd.DataFrame(X_cat_train_arr, columns=cat_cols, index=X_train.index)
        X_cat_test = pd.DataFrame(X_cat_test_arr, columns=cat_cols, index=X_test.index)

        encoder = OneHotEncoder(handle_unknown="ignore", sparse_output=False)
        X_cat_train_enc_arr = encoder.fit_transform(X_cat_train)
        X_cat_test_enc_arr = encoder.transform(X_cat_test)
        ohe_names = list(encoder.get_feature_names_out(cat_cols))

        X_cat_train_enc = pd.DataFrame(X_cat_train_enc_arr, columns=ohe_names, index=X_train.index)
        X_cat_test_enc = pd.DataFrame(X_cat_test_enc_arr, columns=ohe_names, index=X_test.index)

        parts_train.append(X_cat_train_enc)
        parts_test.append(X_cat_test_enc)
        feature_names.extend(ohe_names)

    X_tr = pd.concat(parts_train, axis=1) if parts_train else pd.DataFrame(index=X_train.index)
    X_te = pd.concat(parts_test, axis=1) if parts_test else pd.DataFrame(index=X_test.index)

    preprocess_time = round(time.perf_counter() - t0, 4)
    post_preprocess_count = len(feature_names)

    # --- Model ---
    t_model = time.perf_counter()
    model = LogisticRegression(max_iter=1000, random_state=42)
    model.fit(X_tr, y_train)
    train_time = round(time.perf_counter() - t_model, 4)

    t_pred = time.perf_counter()
    y_pred = model.predict(X_te)
    y_prob = model.predict_proba(X_te)[:, 1] if hasattr(model, "predict_proba") else None
    predict_time = round(time.perf_counter() - t_pred, 4)

    metrics = compute_metrics(y_test, y_pred, y_prob)

    return {
        "pipeline": "Fixed",
        "description": "Mean imputation + StandardScaler + OneHotEncoder → LogisticRegression",
        "feature_counts": {
            "original": len(original_cols),
            "post_preprocessing": post_preprocess_count,
            "post_feature_engineering": post_preprocess_count,
            "final": post_preprocess_count
        },
        "timing": {
            "preprocessing_sec": preprocess_time,
            "feature_engineering_sec": 0.0,
            "feature_selection_sec": 0.0,
            "model_training_sec": train_time,
            "prediction_sec": predict_time
        },
        "metrics": metrics,
        "feature_engineering_report": None,
        "feature_selection_report": None
    }


# ---------------------------------------------------------------------------
# Pipeline C — Hybrid (Proposed Method)
# ---------------------------------------------------------------------------

def run_hybrid_pipeline(
    X_train: pd.DataFrame,
    X_test: pd.DataFrame,
    y_train: pd.Series,
    y_test: pd.Series,
    leakage_columns: Optional[List[str]] = None,
    feature_specs: Optional[List[Dict[str, Any]]] = None,
    skewness_threshold: float = 1.0,
    outlier_threshold: float = 0.02,
    cardinality_threshold: int = 15
) -> Dict[str, Any]:
    """
    Hybrid pipeline (proposed research method):
      Phase 5 HybridPreprocessor → ConditionalFeatureEngineer → HybridFeatureSelector
      → LogisticRegression(max_iter=1000, random_state=42)
    """
    original_cols = list(X_train.columns)

    # --- Step 1: Hybrid Preprocessing (Phase 5) ---
    t0 = time.perf_counter()
    preprocessor = HybridPreprocessor(
        leakage_columns=leakage_columns,
        skewness_threshold=skewness_threshold,
        outlier_threshold=outlier_threshold,
        cardinality_threshold=cardinality_threshold
    )
    preprocessor.fit(X_train)
    X_tr_pre = preprocessor.transform(X_train)
    X_te_pre = preprocessor.transform(X_test)
    preprocess_time = round(time.perf_counter() - t0, 4)
    post_preprocess_count = len(preprocessor.get_feature_names_out())

    # --- Step 2: Feature Engineering ---
    t_fe = time.perf_counter()
    fe_report = None
    if feature_specs:
        engineer = ConditionalFeatureEngineer(
            feature_specs=feature_specs,
            leakage_columns=leakage_columns
        )
        engineer.fit(X_tr_pre)
        X_tr_pre = engineer.transform(X_tr_pre)
        X_te_pre = engineer.transform(X_te_pre)
        fe_report = engineer.get_report()
    fe_time = round(time.perf_counter() - t_fe, 4)
    post_fe_count = len(X_tr_pre.columns)

    # --- Step 3: Feature Selection ---
    t_fs = time.perf_counter()
    selector = HybridFeatureSelector()
    X_tr_sel = selector.fit_transform(X_tr_pre)
    X_te_sel = selector.transform(X_te_pre)
    fs_report = selector.get_report()
    fs_time = round(time.perf_counter() - t_fs, 4)
    final_count = len(selector.get_selected_features())

    # --- Step 4: Model ---
    t_model = time.perf_counter()
    # Fill any residual NaN before fitting
    X_tr_fit = X_tr_sel.fillna(0)
    X_te_fit = X_te_sel.fillna(0)

    model = LogisticRegression(max_iter=1000, random_state=42)
    model.fit(X_tr_fit, y_train)
    train_time = round(time.perf_counter() - t_model, 4)

    t_pred = time.perf_counter()
    y_pred = model.predict(X_te_fit)
    y_prob = model.predict_proba(X_te_fit)[:, 1] if hasattr(model, "predict_proba") else None
    predict_time = round(time.perf_counter() - t_pred, 4)

    metrics = compute_metrics(y_test, y_pred, y_prob)

    return {
        "pipeline": "Hybrid",
        "description": "HybridPreprocessor → ConditionalFeatureEngineer → HybridFeatureSelector → LogisticRegression",
        "feature_counts": {
            "original": len(original_cols),
            "post_preprocessing": post_preprocess_count,
            "post_feature_engineering": post_fe_count,
            "final": final_count
        },
        "timing": {
            "preprocessing_sec": preprocess_time,
            "feature_engineering_sec": fe_time,
            "feature_selection_sec": fs_time,
            "model_training_sec": train_time,
            "prediction_sec": predict_time
        },
        "metrics": metrics,
        "feature_engineering_report": fe_report,
        "feature_selection_report": fs_report
    }


# ---------------------------------------------------------------------------
# Orchestrator — runs all three pipelines from a raw DataFrame
# ---------------------------------------------------------------------------

def run_all_pipelines(
    df: pd.DataFrame,
    target_column: str,
    leakage_columns: Optional[List[str]] = None,
    feature_specs: Optional[List[Dict[str, Any]]] = None,
    test_size: float = 0.20,
    random_state: int = 42,
    skewness_threshold: float = 1.0,
    outlier_threshold: float = 0.02,
    cardinality_threshold: int = 15
) -> Dict[str, Any]:
    """
    Entry point called by the API router.

    1. Validates target column.
    2. Produces ONE shared 80:20 stratified train/test split.
    3. Removes leakage columns from X (before splitting features).
    4. Runs Minimal, Fixed, Hybrid pipelines on the same split.
    5. Returns structured results.
    """
    from sklearn.model_selection import train_test_split

    if target_column not in df.columns:
        raise ValueError(f"Target column '{target_column}' not found in dataset.")

    y = df[target_column].copy()
    leakage_set = set(leakage_columns or [])
    drop_cols = {target_column} | leakage_set
    X = df.drop(columns=[c for c in drop_cols if c in df.columns]).copy()

    # Stratified split
    stratify_opt = None
    val_counts = y.value_counts()
    if len(val_counts) >= 2 and val_counts.min() >= 2:
        stratify_opt = y

    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=test_size,
        random_state=random_state,
        stratify=stratify_opt
    )

    split_info = {
        "total_rows": len(df),
        "train_rows": len(X_train),
        "test_rows": len(X_test),
        "test_percentage": round(test_size * 100, 1),
        "random_state": random_state,
        "original_feature_count": len(X.columns),
        "target_column": target_column,
        "leakage_columns_excluded": list(leakage_set)
    }

    results_minimal = run_minimal_pipeline(X_train, X_test, y_train, y_test)
    results_fixed = run_fixed_pipeline(X_train, X_test, y_train, y_test)
    results_hybrid = run_hybrid_pipeline(
        X_train, X_test, y_train, y_test,
        leakage_columns=leakage_columns,
        feature_specs=feature_specs,
        skewness_threshold=skewness_threshold,
        outlier_threshold=outlier_threshold,
        cardinality_threshold=cardinality_threshold
    )

    return {
        "status": "success",
        "split_info": split_info,
        "results": {
            "minimal": results_minimal,
            "fixed": results_fixed,
            "hybrid": results_hybrid
        },
        "paper_reference": {
            "minimal": {"accuracy": 0.6062, "precision": 0.6156, "recall": 0.7505, "f1": 0.6764, "roc_auc": 0.6598},
            "fixed":   {"accuracy": 0.7124, "precision": 0.8745, "recall": 0.5553, "f1": 0.6792, "roc_auc": 0.7723},
            "hybrid":  {"accuracy": 0.7116, "precision": 0.8845, "recall": 0.5453, "f1": 0.6747, "roc_auc": 0.7686}
        },
        "note": "Paper reference values are for DataCo dataset only. Actual results are computed from the uploaded dataset."
    }
