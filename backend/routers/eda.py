from fastapi import APIRouter, HTTPException, status
from typing import Dict, Any

from services.ingestion import ingestion_service
from eda.engine import AutomatedEDAEngine

router = APIRouter(prefix="/api/eda", tags=["Automated EDA"])

@router.get("/analysis")
async def run_automated_eda():
    """
    Executes dataset-aware automated Exploratory Data Analysis (EDA) on the currently active dataset.
    """
    df = ingestion_service.get_active_dataframe()
    if df is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active dataset ingested. Please upload a dataset first."
        )

    try:
        results = AutomatedEDAEngine.run_eda(df)
        return {
            "filename": ingestion_service.get_filename(),
            "status": "success",
            "eda": results
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error executing automated EDA: {str(e)}"
        )
