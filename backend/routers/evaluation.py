from fastapi import APIRouter, HTTPException, status, Body
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
import pandas as pd

from services.ingestion import ingestion_service
from evaluation.pipelines import run_all_pipelines

router = APIRouter(prefix="/api/evaluation", tags=["Evaluation"])

# Default DataCo leakage columns (pre-populated for convenience; overridable)
DATACO_DEFAULT_LEAKAGE = [
    "Delivery Status",
    "Days for shipping (real)",
    "shipping date (DateOrders)",
    "Product Description",
    "Order Zipcode"
]

# Default DataCo feature spec
DATACO_DEFAULT_FEATURE_SPECS = [
    {
        "name": "profit_to_revenue_ratio",
        "numerator_col": "Order Profit Per Order",
        "denominator_col": "Sales",
        "leakage_risk": False
    }
]


class FeatureSpec(BaseModel):
    name: str
    numerator_col: str
    denominator_col: str
    leakage_risk: bool = False


class EvaluationRequest(BaseModel):
    target_column: str = Field(
        "Late_delivery_risk",
        description="Target column name for classification"
    )
    leakage_columns: Optional[List[str]] = Field(
        None,
        description="Columns to exclude as leakage (defaults to DataCo known leakage list)"
    )
    feature_specs: Optional[List[FeatureSpec]] = Field(
        None,
        description="Conditional feature engineering specs (ratio features)"
    )
    test_size: float = Field(0.20, ge=0.05, le=0.5)
    random_state: int = Field(42)
    skewness_threshold: float = Field(1.0)
    outlier_threshold: float = Field(0.02)
    cardinality_threshold: int = Field(15)
    use_dataco_defaults: bool = Field(
        True,
        description="If True and leakage_columns/feature_specs not provided, use DataCo defaults"
    )


# In-memory session storage
_latest_evaluation_session: Optional[Dict[str, Any]] = None


@router.post("/run")
async def run_evaluation(
    request: EvaluationRequest = Body(default_factory=EvaluationRequest)
):
    """
    Runs all three experimental pipelines (Minimal, Fixed, Hybrid) on the
    currently ingested dataset and returns comparative evaluation results.

    - Uses ONE shared 80:20 stratified train/test split for fairness.
    - All preprocessing/feature-selection fitting is strictly on training data.
    - Returns metrics (Accuracy, Precision, Recall, F1, ROC-AUC) and feature counts.
    """
    global _latest_evaluation_session

    df = ingestion_service.get_active_dataframe()
    if df is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active dataset ingested. Please upload a dataset first."
        )

    # Resolve leakage columns
    leakage_cols = request.leakage_columns
    if leakage_cols is None and request.use_dataco_defaults:
        leakage_cols = DATACO_DEFAULT_LEAKAGE

    # Resolve feature specs
    raw_specs = request.feature_specs
    if raw_specs is None and request.use_dataco_defaults:
        feature_specs_dicts = DATACO_DEFAULT_FEATURE_SPECS
    elif raw_specs is not None:
        feature_specs_dicts = [s.model_dump() for s in raw_specs]
    else:
        feature_specs_dicts = []

    # Validate target column
    if request.target_column not in df.columns:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Target column '{request.target_column}' not found in dataset. "
                   f"Available columns: {list(df.columns[:20])}"
        )

    try:
        results = run_all_pipelines(
            df=df,
            target_column=request.target_column,
            leakage_columns=leakage_cols,
            feature_specs=feature_specs_dicts,
            test_size=request.test_size,
            random_state=request.random_state,
            skewness_threshold=request.skewness_threshold,
            outlier_threshold=request.outlier_threshold,
            cardinality_threshold=request.cardinality_threshold
        )
        results["filename"] = ingestion_service.get_filename()
        _latest_evaluation_session = results
        return results

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Evaluation pipeline error: {str(e)}"
        )


@router.get("/session")
async def get_latest_evaluation_session():
    """Returns the results from the most recent evaluation run."""
    if _latest_evaluation_session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No evaluation has been run yet."
        )
    return _latest_evaluation_session
