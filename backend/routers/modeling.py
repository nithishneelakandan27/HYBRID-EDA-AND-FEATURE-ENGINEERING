"""
backend/routers/modeling.py

REST API for Phase II ML Modeling.

Endpoints
---------
GET  /api/modeling/config
     Returns model catalog, dataset info, and current training status.

POST /api/modeling/train
     Trains a selected model on the active dataset via the Phase I pipeline.

GET  /api/modeling/results/{model_type}
     Returns full evaluation results for a specific trained model.

GET  /api/modeling/comparison
     Returns a side-by-side comparison table of all trained models.

GET  /api/modeling/feature-importance/{model_type}
     Returns ranked feature importances for a trained model.

GET  /api/modeling/sample-records/{model_type}
     Returns sample test records for the Prediction Explorer.

POST /api/modeling/predict/{model_type}
     Runs inference on a user-supplied or sample-index record.
"""
import logging
import numpy as np
from fastapi import APIRouter, HTTPException, status, Body
from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional
from starlette.concurrency import run_in_threadpool

from services.ingestion import ingestion_service
from services.modeling_service import modeling_service
from modeling.trainer import train_model, predict_record, get_model_catalog

logger = logging.getLogger("backend.routers.modeling")

router = APIRouter(prefix="/api/modeling", tags=["ML Modeling"])


# ── Request / Response Schemas ────────────────────────────────────────────────

class TrainRequest(BaseModel):
    model_type: str = Field("random_forest", description="Model identifier from the catalog")
    target_column: Optional[str] = Field(None)
    domain_profile: Optional[str] = Field(None)
    leakage_columns: Optional[List[str]] = Field(None)
    test_size: float = Field(0.20, ge=0.05, le=0.5)
    random_state: int = Field(42)
    class_weight: str = Field("balanced")
    skewness_threshold: float = Field(1.0)
    outlier_threshold: float = Field(0.02)
    cardinality_threshold: int = Field(15)


class PredictRequest(BaseModel):
    record: Optional[Dict[str, Any]] = Field(None, description="Raw feature dict for prediction")
    sample_index: Optional[int] = Field(None, description="Index into the sample_records list")


import math

def clean_nans(obj: Any) -> Any:
    """Recursively replaces NaN, +inf, -inf, and numpy types with JSON-compliant Python types."""
    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    elif isinstance(obj, (np.floating, np.integer)):
        val = obj.item()
        if isinstance(val, float) and (math.isnan(val) or math.isinf(val)):
            return None
        return val
    elif isinstance(obj, np.ndarray):
        return [clean_nans(x) for x in obj.tolist()]
    elif isinstance(obj, dict):
        return {str(k): clean_nans(v) for k, v in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [clean_nans(v) for v in obj]
    return obj


def _serializable_result(result: Dict[str, Any]) -> Dict[str, Any]:
    """Strip non-JSON-serialisable pipeline artifacts and replace NaNs before returning to client."""
    if result is None:
        return {}
    clean_dict = {k: v for k, v in result.items() if k != "pipeline_artifacts"}
    return clean_nans(clean_dict)


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/config")
async def get_modeling_config():
    """
    Returns model catalog plus dataset, target candidate, domain profile, and session info.
    No dataset required to call this endpoint.
    """
    from profiling.auto_config import AutoConfigEngine
    from modeling.domain_profiles import DOMAIN_PROFILES, detect_domain_profile

    df = ingestion_service.get_active_dataframe()
    dataset_info = None
    columns_list = []
    target_candidates = None
    detected_domain = "general"

    if df is not None:
        columns_list = [str(c) for c in df.columns]
        target_candidates = AutoConfigEngine.detect_target(df)
        detected_domain = detect_domain_profile(df)

        dataset_info = {
            "filename": ingestion_service.get_filename(),
            "rows": len(df),
            "columns": len(df.columns),
            "has_dataset": True,
        }
    else:
        dataset_info = {"has_dataset": False}

    trained = modeling_service.list_trained_models()
    training_status = {
        m: {
            "trained": m in trained,
            "training_in_progress": modeling_service.is_training(m),
        }
        for m in [cfg["model_type"] for cfg in get_model_catalog()]
    }

    domain_profiles_list = [
        {"key": k, "label": v["label"], "description": v["description"]}
        for k, v in DOMAIN_PROFILES.items()
    ]

    return {
        "models": get_model_catalog(),
        "dataset": dataset_info,
        "columns": columns_list,
        "target_candidates": target_candidates,
        "detected_domain": detected_domain,
        "domain_profiles": domain_profiles_list,
        "training_status": training_status,
        "trained_models": trained,
    }


@router.post("/train")
async def train_ml_model(request: TrainRequest = Body(default_factory=TrainRequest)):
    """
    Triggers full Phase I → Phase II training pipeline for the requested model.
    Re-trains if the same model type is submitted again.
    """
    df = ingestion_service.get_active_dataframe()
    if df is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active dataset ingested. Please upload a dataset first.",
        )

    if modeling_service.is_training(request.model_type):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Model '{request.model_type}' is already training. Please wait.",
        )

    modeling_service.set_training(request.model_type, True)
    try:
        result = await run_in_threadpool(
            train_model,
            df=df,
            model_type=request.model_type,
            target_column=request.target_column,
            domain_profile=request.domain_profile,
            leakage_columns=request.leakage_columns,
            feature_specs=None,
            test_size=request.test_size,
            random_state=request.random_state,
            class_weight=request.class_weight,
            skewness_threshold=request.skewness_threshold,
            outlier_threshold=request.outlier_threshold,
            cardinality_threshold=request.cardinality_threshold,
        )
        modeling_service.store_result(request.model_type, result)
        return _serializable_result(result)

    except ValueError as ve:
        logger.warning("Training validation error for %s: %s", request.model_type, ve)
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(ve))
    except Exception as e:
        logger.error("Unexpected training failure for %s: %s", request.model_type, e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Training failed: {str(e)}",
        )
    finally:
        modeling_service.set_training(request.model_type, False)


@router.get("/results/{model_type}")
async def get_model_results(model_type: str):
    """Return full evaluation results for a specific trained model."""
    result = modeling_service.get_result(model_type)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Model '{model_type}' has not been trained yet.",
        )
    return _serializable_result(result)


@router.get("/comparison")
async def get_model_comparison():
    """Returns a comparison table of all trained models."""
    if not modeling_service.has_any_model():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No models have been trained yet.",
        )
    return {
        "comparison": modeling_service.get_comparison(),
        "trained_models": modeling_service.list_trained_models(),
    }


@router.get("/feature-importance/{model_type}")
async def get_feature_importance(model_type: str, top_n: int = 15):
    """Returns ranked feature importances for a trained model."""
    result = modeling_service.get_result(model_type)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Model '{model_type}' has not been trained yet.",
        )
    importances = result.get("feature_importance", [])
    return {
        "model_type": model_type,
        "model_label": result.get("model_label"),
        "importance_type": next(
            (m["importance_type"] for m in get_model_catalog() if m["model_type"] == model_type),
            "unknown",
        ),
        "features": importances[:top_n],
        "disclaimer": (
            "Feature importance represents each feature's contribution to the model's "
            "predictive decisions based on training data patterns. "
            "It reflects statistical associations, not causal relationships."
        ),
    }


@router.get("/sample-records/{model_type}")
async def get_sample_records(model_type: str):
    """Returns sample test records for the Prediction Explorer."""
    result = modeling_service.get_result(model_type)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Model '{model_type}' has not been trained yet.",
        )
    return {
        "model_type": model_type,
        "records": result.get("sample_records", []),
    }


@router.post("/predict/{model_type}")
async def predict_single(model_type: str, request: PredictRequest = Body(...)):
    """
    Runs single-record inference.
    Accepts either a raw feature dict or a sample_index into the stored sample_records.
    """
    artifacts = modeling_service.get_pipeline_artifacts(model_type)
    if artifacts is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Model '{model_type}' has not been trained yet.",
        )

    record = request.record

    # If a sample_index is provided, use the stored raw feature dict
    if record is None and request.sample_index is not None:
        result = modeling_service.get_result(model_type)
        samples = result.get("sample_records", [])
        idx = request.sample_index
        if idx < 0 or idx >= len(samples):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"sample_index {idx} is out of range (0–{len(samples) - 1}).",
            )
        record = samples[idx]["features"]

    if record is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Provide either 'record' (feature dict) or 'sample_index'.",
        )

    try:
        prediction = await run_in_threadpool(predict_record, artifacts, record)
        prediction["model_type"] = model_type
        prediction["model_label"] = next(
            (m["label"] for m in get_model_catalog() if m["model_type"] == model_type), model_type
        )
        return prediction
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction failed: {str(e)}",
        )
