from fastapi import APIRouter, HTTPException, status, Query
from typing import Dict, Any, List, Optional

from services.ingestion import ingestion_service
from decision_engine.engine import HybridDecisionEngine

router = APIRouter(prefix="/api/decision", tags=["Hybrid Decision Engine"])

@router.get("/plan")
async def get_decision_plan(
    skewness_threshold: float = Query(1.0, description="Skewness threshold for mean vs median imputation & log1p"),
    outlier_threshold: float = Query(0.02, description="Outlier percentage threshold for RobustScaler vs StandardScaler"),
    cardinality_threshold: int = Query(15, description="Cardinality threshold for One-Hot vs Label encoding")
):
    """
    Executes the Hybrid Decision Engine on the active ingested dataset and returns
    the deterministic, rule-based preprocessing plan with human-readable explanations.
    """
    df = ingestion_service.get_active_dataframe()
    if df is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active dataset ingested. Please upload a dataset first."
        )

    try:
        plan = HybridDecisionEngine.generate_plan(
            df=df,
            skewness_threshold=skewness_threshold,
            outlier_threshold=outlier_threshold,
            cardinality_threshold=cardinality_threshold
        )
        return {
            "filename": ingestion_service.get_filename(),
            "status": "success",
            "decision_plan": plan,
            "decision_trace": plan.get("decision_trace", [])
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating decision plan: {str(e)}"
        )

@router.get("/trace")
async def get_decision_trace(
    skewness_threshold: float = Query(1.0, description="Skewness threshold for mean vs median imputation & log1p"),
    outlier_threshold: float = Query(0.02, description="Outlier percentage threshold for RobustScaler vs StandardScaler"),
    cardinality_threshold: int = Query(15, description="Cardinality threshold for One-Hot vs Label encoding")
):
    """
    Returns the linear, audit-ready decision trace of all rule evaluations and threshold checks.
    """
    df = ingestion_service.get_active_dataframe()
    if df is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active dataset ingested. Please upload a dataset first."
        )

    try:
        plan = HybridDecisionEngine.generate_plan(
            df=df,
            skewness_threshold=skewness_threshold,
            outlier_threshold=outlier_threshold,
            cardinality_threshold=cardinality_threshold
        )
        return {
            "filename": ingestion_service.get_filename(),
            "status": "success",
            "decision_trace": plan.get("decision_trace", []),
            "total_decisions": len(plan.get("decision_trace", []))
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating decision trace: {str(e)}"
        )
