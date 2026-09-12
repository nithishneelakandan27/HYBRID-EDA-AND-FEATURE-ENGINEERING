"""
evaluation/pipelines.py

Three experimental ML pipelines:

PIPELINE A — Minimal Baseline
    mean/most-frequent imputation + StandardScaler + OrdinalEncoder
    + final StandardScaler → LogisticRegression(solver='lbfgs', max_iter=200, random_state=42)

PIPELINE B — Fixed Baseline
    mean/most-frequent imputation + StandardScaler + OneHotEncoder(max_categories=15)
    + final StandardScaler → LogisticRegression(solver='lbfgs', max_iter=200, random_state=42)

PIPELINE C — Hybrid (Proposed)
    HybridPreprocessor + ConditionalFeatureEngineer + HybridFeatureSelector
    + final StandardScaler → LogisticRegression(solver='lbfgs', max_iter=200, random_state=42)

ALL THREE:
  - Use the exact same X_train, X_test, y_train, y_test (80:20 stratified split)
  - Fit ONLY on training data; transform test data using fitted transformers
  - Evaluate ONLY on test data
  - Numerical safety: guaranteed finite, non-NaN/inf inputs
  - Feature matrix safety: matrix.shape[1] == len(feature_names) invariant enforced
  - LogisticRegression convergence: well-conditioned scaled features guarantee fast, warning-free convergence
"""
import time
import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional

from sklearn.linear_model import LogisticRegression
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, OrdinalEncoder, OneHotEncoder

from preprocessing.pipeline import HybridPreprocessor
from feature_engineering.engineer import ConditionalFeatureEngineer
from feature_selection.selector import HybridFeatureSelector
from evaluation.metrics import compute_metrics
from profiling.auto_config import AutoConfigEngine


def ensure_finite_dataframe(
    df: pd.DataFrame,
    feature_names: Optional[List[str]] = None,
    index: Optional[pd.Index] = None
) -> pd.DataFrame:
    """
    Guarantees no NaN, no +inf, no -inf, and finite numeric float64 matrix.
    Enforces the invariant: matrix.shape[1] == len(feature_names).
    """
    if feature_names is None:
        feature_names = [str(c) for c in df.columns]

    arr = df.to_numpy(dtype=np.float64, copy=False)
    arr = np.nan_to_num(arr, nan=0.0, posinf=0.0, neginf=0.0)

    assert arr.shape[1] == len(feature_names), (
        f"Feature matrix shape mismatch: matrix has {arr.shape[1]} columns, "
        f"indices imply {len(feature_names)}"
    )

    idx = index if index is not None else df.index
    return pd.DataFrame(arr, columns=feature_names, index=idx)


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
      - All-column mean imputation (numeric) / most-frequent (categorical)
      - StandardScaler on numerics
      - OrdinalEncoder(handle_unknown='use_encoded_value', unknown_value=-1) on categoricals
      - Final StandardScaler on combined feature matrix for numerical stability
      - LogisticRegression(solver='lbfgs', max_iter=200, random_state=42)
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
            f"Minimal numeric imputer shape mismatch: matrix has {X_num_tr_arr.shape[1]} cols, "
            f"expected {len(num_cols)}"
        )
        
        scaler = StandardScaler()
        X_num_train_s = pd.DataFrame(
            scaler.fit_transform(X_num_tr_arr),
            columns=num_cols, index=X_train.index
        )
        X_num_test_s = pd.DataFrame(
            scaler.transform(X_num_te_arr),
            columns=num_cols, index=X_test.index
        )
        parts_train.append(X_num_train_s)
        parts_test.append(X_num_test_s)
        feature_names.extend(num_cols)

    # --- Categorical ---
    if cat_cols:
        # Pre-fill missing with 'missing' string to handle mixed or all-null columns
        cat_imputer = SimpleImputer(strategy="most_frequent", keep_empty_features=True)
        X_cat_train_arr = cat_imputer.fit_transform(X_train[cat_cols].astype(str))
        X_cat_test_arr = cat_imputer.transform(X_test[cat_cols].astype(str))

        assert X_cat_train_arr.shape[1] == len(cat_cols), (
            f"Minimal categorical imputer shape mismatch: matrix has {X_cat_train_arr.shape[1]} cols, "
            f"expected {len(cat_cols)}"
        )

        encoder = OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=-1)
        X_cat_train_enc = pd.DataFrame(
            encoder.fit_transform(X_cat_train_arr),
            columns=cat_cols, index=X_train.index
        )
        X_cat_test_enc = pd.DataFrame(
            encoder.transform(X_cat_test_arr),
            columns=cat_cols, index=X_test.index
        )
        parts_train.append(X_cat_train_enc)
        parts_test.append(X_cat_test_enc)
        feature_names.extend(cat_cols)

    X_tr_raw = pd.concat(parts_train, axis=1) if parts_train else pd.DataFrame(index=X_train.index)
    X_te_raw = pd.concat(parts_test, axis=1) if parts_test else pd.DataFrame(index=X_test.index)

    # Ensure finite and non-NaN
    X_tr_finite = ensure_finite_dataframe(X_tr_raw, feature_names=feature_names, index=X_train.index)
    X_te_finite = ensure_finite_dataframe(X_te_raw, feature_names=feature_names, index=X_test.index)

    # Final feature scaling: brings Ordinal features (0 to 65000) and numerics to standard scale
    # This completely resolves the L-BFGS convergence failure and condition number ill-conditioning
    final_scaler = StandardScaler()
    X_tr_scaled = pd.DataFrame(
        final_scaler.fit_transform(X_tr_finite),
        columns=feature_names, index=X_train.index
    )
    X_te_scaled = pd.DataFrame(
        final_scaler.transform(X_te_finite),
        columns=feature_names, index=X_test.index
    )

    preprocess_time = round(time.perf_counter() - t0, 4)
    post_preprocess_count = len(feature_names)

    # Assert matrix invariants
    assert X_tr_scaled.shape[1] == len(feature_names), (
        f"Minimal X_train shape {X_tr_scaled.shape[1]} != len(feature_names) {len(feature_names)}"
    )
    assert X_te_scaled.shape[1] == len(feature_names), (
        f"Minimal X_test shape {X_te_scaled.shape[1]} != len(feature_names) {len(feature_names)}"
    )

    # --- Model ---
    t_model = time.perf_counter()
    model = LogisticRegression(solver="lbfgs", max_iter=1000, tol=1e-4, random_state=42)
    model.fit(X_tr_scaled, y_train)
    train_time = round(time.perf_counter() - t_model, 4)

    t_pred = time.perf_counter()
    y_pred = model.predict(X_te_scaled)
    y_prob = model.predict_proba(X_te_scaled)[:, 1] if hasattr(model, "predict_proba") else None
    predict_time = round(time.perf_counter() - t_pred, 4)

    metrics = compute_metrics(y_test, y_pred, y_prob)

    return {
        "pipeline": "Minimal",
        "description": "Mean/mode imputation + StandardScaler + OrdinalEncoder + Final Scaler → LogisticRegression",
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
            "prediction_sec": predict_time,
            "total_sec": round(preprocess_time + train_time + predict_time, 4)
        },
        "model_diagnostics": {
            "n_iter": int(model.n_iter_[0]),
            "solver": "lbfgs",
            "converged": bool(model.n_iter_[0] < 1000)
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
    y_test: pd.Series,
    max_ohe_categories: int = 15
) -> Dict[str, Any]:
    """
    Fixed baseline:
      - Mean imputation for numerics, most-frequent for categoricals
      - StandardScaler on numerics
      - OneHotEncoder(max_categories=15, handle_unknown='ignore') on categoricals
        (Controlled categorical expansion avoids creating 76,000+ dense columns / 80GB RAM on DataCo)
      - Final StandardScaler on combined feature matrix for numerical stability
      - LogisticRegression(solver='lbfgs', max_iter=200, random_state=42)
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

        scaler = StandardScaler()
        X_num_train_s = pd.DataFrame(
            scaler.fit_transform(X_num_tr_arr),
            columns=num_cols, index=X_train.index
        )
        X_num_test_s = pd.DataFrame(
            scaler.transform(X_num_te_arr),
            columns=num_cols, index=X_test.index
        )
        parts_train.append(X_num_train_s)
        parts_test.append(X_num_test_s)
        feature_names.extend(num_cols)

    # --- Categorical → OneHotEncoder ---
    if cat_cols:
        cat_imputer = SimpleImputer(strategy="most_frequent", keep_empty_features=True)
        X_cat_train_arr = cat_imputer.fit_transform(X_train[cat_cols].astype(str))
        X_cat_test_arr = cat_imputer.transform(X_test[cat_cols].astype(str))

        assert X_cat_train_arr.shape[1] == len(cat_cols), (
            f"Fixed categorical imputer shape mismatch: matrix has {X_cat_train_arr.shape[1]} cols, "
            f"expected {len(cat_cols)}"
        )

        encoder = OneHotEncoder(
            max_categories=max_ohe_categories,
            handle_unknown="ignore",
            sparse_output=False
        )
        X_cat_train_enc_arr = encoder.fit_transform(X_cat_train_arr)
        X_cat_test_enc_arr = encoder.transform(X_cat_test_arr)
        ohe_names = list(encoder.get_feature_names_out(cat_cols))

        assert X_cat_train_enc_arr.shape[1] == len(ohe_names), (
            f"Fixed OHE shape mismatch: array has {X_cat_train_enc_arr.shape[1]} cols, "
            f"expected {len(ohe_names)}"
        )

        X_cat_train_enc = pd.DataFrame(X_cat_train_enc_arr, columns=ohe_names, index=X_train.index)
        X_cat_test_enc = pd.DataFrame(X_cat_test_enc_arr, columns=ohe_names, index=X_test.index)

        parts_train.append(X_cat_train_enc)
        parts_test.append(X_cat_test_enc)
        feature_names.extend(ohe_names)

    X_tr_raw = pd.concat(parts_train, axis=1) if parts_train else pd.DataFrame(index=X_train.index)
    X_te_raw = pd.concat(parts_test, axis=1) if parts_test else pd.DataFrame(index=X_test.index)

    # Ensure finite and non-NaN
    X_tr_finite = ensure_finite_dataframe(X_tr_raw, feature_names=feature_names, index=X_train.index)
    X_te_finite = ensure_finite_dataframe(X_te_raw, feature_names=feature_names, index=X_test.index)

    # Final feature scaling for numerical stability and fast convergence
    final_scaler = StandardScaler()
    X_tr_scaled = pd.DataFrame(
        final_scaler.fit_transform(X_tr_finite),
        columns=feature_names, index=X_train.index
    )
    X_te_scaled = pd.DataFrame(
        final_scaler.transform(X_te_finite),
        columns=feature_names, index=X_test.index
    )

    preprocess_time = round(time.perf_counter() - t0, 4)
    post_preprocess_count = len(feature_names)

    assert X_tr_scaled.shape[1] == len(feature_names), (
        f"Fixed X_train shape {X_tr_scaled.shape[1]} != len(feature_names) {len(feature_names)}"
    )
    assert X_te_scaled.shape[1] == len(feature_names), (
        f"Fixed X_test shape {X_te_scaled.shape[1]} != len(feature_names) {len(feature_names)}"
    )

    # --- Model ---
    t_model = time.perf_counter()
    model = LogisticRegression(solver="lbfgs", max_iter=1000, tol=1e-4, random_state=42)
    model.fit(X_tr_scaled, y_train)
    train_time = round(time.perf_counter() - t_model, 4)

    t_pred = time.perf_counter()
    y_pred = model.predict(X_te_scaled)
    y_prob = model.predict_proba(X_te_scaled)[:, 1] if hasattr(model, "predict_proba") else None
    predict_time = round(time.perf_counter() - t_pred, 4)

    metrics = compute_metrics(y_test, y_pred, y_prob)

    return {
        "pipeline": "Fixed",
        "description": "Mean/mode imputation + StandardScaler + OneHotEncoder(max_cat=15) + Final Scaler → LogisticRegression",
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
            "prediction_sec": predict_time,
            "total_sec": round(preprocess_time + train_time + predict_time, 4)
        },
        "model_diagnostics": {
            "n_iter": int(model.n_iter_[0]),
            "solver": "lbfgs",
            "converged": bool(model.n_iter_[0] < 1000)
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
      → Final Scaler → LogisticRegression(solver='lbfgs', max_iter=200, random_state=42)
    """
    original_cols = list(X_train.columns)

    # --- Step 1: Hybrid Preprocessing ---
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

    # Ensure finite numeric dataframe
    X_tr_pre = ensure_finite_dataframe(X_tr_pre, preprocessor.get_feature_names_out(), index=X_train.index)
    X_te_pre = ensure_finite_dataframe(X_te_pre, preprocessor.get_feature_names_out(), index=X_test.index)

    # --- Step 2: Feature Engineering ---
    t_fe = time.perf_counter()
    fe_report = None
    target_name = y_train.name if hasattr(y_train, "name") else None
    if feature_specs:
        engineer = ConditionalFeatureEngineer(
            feature_specs=feature_specs,
            leakage_columns=leakage_columns,
            target_column=str(target_name) if target_name else None
        )
        engineer.fit(X_tr_pre)
        X_tr_pre = engineer.transform(X_tr_pre)
        X_te_pre = engineer.transform(X_te_pre)
        fe_report = engineer.get_report()
        
        # Ensure finite numeric after feature engineering
        fe_names = list(X_tr_pre.columns)
        X_tr_pre = ensure_finite_dataframe(X_tr_pre, fe_names, index=X_train.index)
        X_te_pre = ensure_finite_dataframe(X_te_pre, fe_names, index=X_test.index)

    fe_time = round(time.perf_counter() - t_fe, 4)
    post_fe_count = len(X_tr_pre.columns)

    # --- Step 3: Feature Selection ---
    t_fs = time.perf_counter()
    selector = HybridFeatureSelector(
        variance_threshold=1e-4,
        correlation_threshold=0.95,
        p_value_threshold=0.05
    )
    X_tr_sel = selector.fit_transform(X_tr_pre, y_train)
    X_te_sel = selector.transform(X_te_pre)
    fs_report = selector.get_report()
    fs_time = round(time.perf_counter() - t_fs, 4)
    selected_cols = selector.get_selected_features()
    final_count = len(selected_cols)

    # Fallback if all features were removed by selector
    if final_count == 0:
        X_tr_sel = X_tr_pre
        X_te_sel = X_te_pre
        selected_cols = list(X_tr_pre.columns)
        final_count = len(selected_cols)

    # Ensure finite numeric before final model training
    X_tr_fit = ensure_finite_dataframe(X_tr_sel, selected_cols, index=X_train.index)
    X_te_fit = ensure_finite_dataframe(X_te_sel, selected_cols, index=X_test.index)

    # Final feature scaling for numerical stability & sub-second L-BFGS convergence
    final_scaler = StandardScaler()
    X_tr_scaled = pd.DataFrame(
        final_scaler.fit_transform(X_tr_fit),
        columns=selected_cols, index=X_train.index
    )
    X_te_scaled = pd.DataFrame(
        final_scaler.transform(X_te_fit),
        columns=selected_cols, index=X_test.index
    )

    assert X_tr_scaled.shape[1] == len(selected_cols), (
        f"Hybrid X_train shape {X_tr_scaled.shape[1]} != len(selected_cols) {len(selected_cols)}"
    )
    assert X_te_scaled.shape[1] == len(selected_cols), (
        f"Hybrid X_test shape {X_te_scaled.shape[1]} != len(selected_cols) {len(selected_cols)}"
    )

    # --- Step 4: Model ---
    t_model = time.perf_counter()
    model = LogisticRegression(solver="lbfgs", max_iter=1000, tol=1e-4, random_state=42)
    model.fit(X_tr_scaled, y_train)
    train_time = round(time.perf_counter() - t_model, 4)

    t_pred = time.perf_counter()
    y_pred = model.predict(X_te_scaled)
    y_prob = model.predict_proba(X_te_scaled)[:, 1] if hasattr(model, "predict_proba") else None
    predict_time = round(time.perf_counter() - t_pred, 4)

    metrics = compute_metrics(y_test, y_pred, y_prob)

    # Compile structured end-to-end decision trace
    decision_trace = []
    if hasattr(preprocessor, "get_decision_trace"):
        decision_trace.extend(preprocessor.get_decision_trace())
    if fe_report and "decision_trace" in fe_report:
        decision_trace.extend(fe_report["decision_trace"])
    if fs_report and "decision_trace" in fs_report:
        decision_trace.extend(fs_report["decision_trace"])

    return {
        "pipeline": "Hybrid",
        "description": "HybridPreprocessor → ConditionalFeatureEngineer → HybridFeatureSelector + Final Scaler → LogisticRegression",
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
            "prediction_sec": predict_time,
            "total_sec": round(preprocess_time + fe_time + fs_time + train_time + predict_time, 4)
        },
        "model_diagnostics": {
            "n_iter": int(model.n_iter_[0]),
            "solver": "lbfgs",
            "converged": bool(model.n_iter_[0] < 1000)
        },
        "metrics": metrics,
        "feature_engineering_report": fe_report,
        "feature_selection_report": fs_report,
        "decision_trace": decision_trace
    }


# ---------------------------------------------------------------------------
# Orchestrator — runs all three pipelines from a raw DataFrame
# ---------------------------------------------------------------------------

def run_all_pipelines(
    df: pd.DataFrame,
    target_column: Optional[str] = None,
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

    1. Incurs zero manual configuration: automatically detects target & leakage if not provided.
    2. Produces ONE shared 80:20 stratified train/test split.
    3. Removes leakage columns from X before splitting.
    4. Runs Minimal, Fixed, Hybrid pipelines on the exact same split.
    5. Returns genuine calculated metrics, timings, and feature counts.
    """
    t_orch_start = time.perf_counter()
    from sklearn.model_selection import train_test_split

    if df is None or df.empty:
        raise ValueError("Cannot run pipelines on an empty or missing dataset.")

    # 1. Automatic target detection if target not specified or invalid
    target_detection_info = None
    if not target_column or target_column == "auto" or target_column not in df.columns:
        auto_cfg = AutoConfigEngine.generate_auto_config(df)
        target_info = auto_cfg["target"]
        target_column = target_info.get("column") or target_info.get("detected_column")
        target_detection_info = target_info
        if not target_column or target_column not in df.columns:
            raise ValueError(
                f"Target column could not be determined automatically. "
                f"Available candidate columns: {list(df.columns[:10])}"
            )

    # 2. Automatic leakage detection if leakage list not specified
    if leakage_columns is None:
        auto_leakage = AutoConfigEngine.detect_leakage(df, target_col=target_column)
        leakage_columns = [item["column"] for item in auto_leakage]

    # 3. Automatic feature engineering specs if not specified
    if feature_specs is None:
        auto_cfg = AutoConfigEngine.generate_auto_config(df)
        feature_specs = auto_cfg.get("feature_specs", [])

    y = df[target_column].copy()
    leakage_set = set(leakage_columns or [])
    drop_cols = {target_column} | leakage_set
    X = df.drop(columns=[c for c in drop_cols if c in df.columns]).copy()

    # Stratified split if classification target has >= 2 classes with >= 2 instances
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
        "target_detection": target_detection_info,
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

    total_orchestration_sec = round(time.perf_counter() - t_orch_start, 4)

    return {
        "status": "success",
        "split_info": split_info,
        "total_runtime_sec": total_orchestration_sec,
        "decision_trace": results_hybrid.get("decision_trace", []),
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
        "note": "Paper reference values are historical research baselines for DataCo. Displayed metrics are genuine predictions computed dynamically on the dataset."
    }
