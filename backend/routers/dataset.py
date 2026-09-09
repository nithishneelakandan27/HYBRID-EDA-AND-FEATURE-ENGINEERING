from fastapi import APIRouter, UploadFile, File, HTTPException, status
from typing import Dict, Any, List, Optional
import pandas as pd

from services.ingestion import ingestion_service
from services.profiler import DatasetProfiler

router = APIRouter(prefix="/api/datasets", tags=["Datasets"])

from starlette.concurrency import run_in_threadpool

@router.post("/upload")
async def upload_dataset(file: UploadFile = File(...)):
    """
    Upload CSV dataset, validate, ingest, and generate summary, profiles, target profile, and leakage flags.
    """
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only CSV files (.csv) are supported."
        )

    try:
        content = await file.read()

        def _process_dataset():
            df = ingestion_service.load_csv_bytes(content, file.filename)
            summary = DatasetProfiler.generate_summary(df)
            profiles = DatasetProfiler.generate_column_profiles(df)
            target_profile = DatasetProfiler.generate_target_profile(df)
            leakage_flags = DatasetProfiler.detect_leakage(df)
            from profiling.auto_config import AutoConfigEngine
            auto_config = AutoConfigEngine.generate_auto_config(df)
            return {
                "filename": file.filename,
                "status": "success",
                "summary": summary,
                "column_profiles": profiles,
                "target_profile": target_profile,
                "leakage_review": leakage_flags,
                "auto_config": auto_config
            }

        return await run_in_threadpool(_process_dataset)
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing dataset: {str(e)}"
        )

@router.get("/summary")
async def get_dataset_summary():
    df = ingestion_service.get_active_dataframe()
    if df is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No dataset currently uploaded/ingested."
        )
    return {
        "filename": ingestion_service.get_filename(),
        "summary": DatasetProfiler.generate_summary(df)
    }

@router.get("/profiles")
async def get_column_profiles():
    df = ingestion_service.get_active_dataframe()
    if df is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No dataset currently uploaded/ingested."
        )
    return {
        "filename": ingestion_service.get_filename(),
        "column_profiles": DatasetProfiler.generate_column_profiles(df)
    }

@router.get("/target")
async def get_target_profile():
    df = ingestion_service.get_active_dataframe()
    if df is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No dataset currently uploaded/ingested."
        )
    target_profile = DatasetProfiler.generate_target_profile(df)
    if not target_profile:
        return {"target_found": False, "message": "Target column 'Late_delivery_risk' not found in dataset."}
    return {"target_found": True, **target_profile}

@router.get("/leakage")
async def get_leakage_review():
    df = ingestion_service.get_active_dataframe()
    if df is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No dataset currently uploaded/ingested."
        )
    return {
        "filename": ingestion_service.get_filename(),
        "leakage_review": DatasetProfiler.detect_leakage(df)
    }

@router.get("/auto-config")
async def get_auto_config():
    df = ingestion_service.get_active_dataframe()
    if df is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No dataset currently uploaded/ingested."
        )
    from profiling.auto_config import AutoConfigEngine
    return {
        "filename": ingestion_service.get_filename(),
        "auto_config": AutoConfigEngine.generate_auto_config(df)
    }

