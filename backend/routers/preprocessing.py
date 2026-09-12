from fastapi import APIRouter, HTTPException, status, Body
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split

from services.ingestion import ingestion_service
from preprocessing.pipeline import HybridPreprocessor

router = APIRouter(prefix="/api/preprocessing", tags=["Hybrid Preprocessing"])

class PreprocessingRequest(BaseModel):
    test_size: float = Field(0.20, ge=0.05, le=0.5, description="Test split proportion (default: 0.20)")
    random_state: int = Field(42, description="Random seed for reproducibility")
    target_column: Optional[str] = Field(None, description="Target column name (e.g. Late_delivery_risk)")
    leakage_columns: Optional[List[str]] = Field(None, description="Custom leakage column names to exclude")
    skewness_threshold: float = Field(1.0, description="Skewness threshold for mean vs median and log1p")
    outlier_threshold: float = Field(0.02, description="Outlier percentage threshold for RobustScaler")
    cardinality_threshold: int = Field(15, description="Cardinality threshold for OneHot vs Ordinal encoding")

# In-memory storage for active preprocessing session
_latest_preprocessed_session: Optional[Dict[str, Any]] = None

@router.post("/execute")
async def execute_preprocessing(request: PreprocessingRequest = Body(default_factory=PreprocessingRequest)):
    """
    Executes the actual Hybrid Preprocessing Pipeline:
    1. Splits active dataset into train & test (80:20 stratified if target exists).
    2. Fits preprocessing parameters STRICTLY on training data only.
    3. Transforms both train and test sets.
    4. Returns structured metadata, feature names, and execution summary.
    """
    global _latest_preprocessed_session

    df = ingestion_service.get_active_dataframe()
    if df is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active dataset ingested. Please upload a dataset first."
        )

    try:
        total_rows = len(df)
        total_cols = len(df.columns)

        # 1. Identify Target Column
        target_col = request.target_column
        if not target_col:
            for col in df.columns:
                if str(col).strip().lower() == "late_delivery_risk":
                    target_col = str(col)
                    break

        # 2. Train / Test Split
        if target_col and target_col in df.columns:
            y = df[target_col].copy()
            X = df.drop(columns=[target_col]).copy()
            
            # Use stratified split if classes have at least 2 instances
            stratify_opt = None
            val_counts = y.value_counts()
            if len(val_counts) >= 2 and val_counts.min() >= 2:
                stratify_opt = y

            X_train, X_test, y_train, y_test = train_test_split(
                X, y,
                test_size=request.test_size,
                random_state=request.random_state,
                stratify=stratify_opt
            )
            train_target_counts = {str(k): int(v) for k, v in y_train.value_counts().items()}
            test_target_counts = {str(k): int(v) for k, v in y_test.value_counts().items()}
        else:
            X = df.copy()
            X_train, X_test = train_test_split(
                X,
                test_size=request.test_size,
                random_state=request.random_state
            )
            y_train = None
            y_test = None
            train_target_counts = None
            test_target_counts = None

        # 3. Fit Preprocessing ONLY on Training Data
        preprocessor = HybridPreprocessor(
            leakage_columns=request.leakage_columns,
            skewness_threshold=request.skewness_threshold,
            outlier_threshold=request.outlier_threshold,
            cardinality_threshold=request.cardinality_threshold
        )

        preprocessor.fit(X_train)

        # 4. Transform Train & Test
        X_train_trans = preprocessor.transform(X_train)
        X_test_trans = preprocessor.transform(X_test)

        meta = preprocessor.get_metadata()

        # Preview of first 5 rows (rounded)
        preview_data = X_train_trans.head(5).round(4).to_dict(orient="records")

        session_result = {
            "filename": ingestion_service.get_filename(),
            "status": "success",
            "split_info": {
                "total_rows": total_rows,
                "train_rows": len(X_train),
                "test_rows": len(X_test),
                "test_percentage": round(request.test_size * 100, 1),
                "random_state": request.random_state
            },
            "target_info": {
                "target_column": target_col,
                "has_target": target_col is not None,
                "train_class_distribution": train_target_counts,
                "test_class_distribution": test_target_counts
            },
            "features_summary": {
                "original_column_count": total_cols,
                "retained_columns_before_encoding": meta["retained_features_count_before_encoding"],
                "transformed_feature_count": meta["transformed_features_count"],
                "excluded_column_count": len(meta["excluded_columns"]),
                "leakage_column_count": len(meta["leakage_columns"])
            },
            "metadata": meta,
            "feature_names": meta["feature_names"],
            "decision_trace": meta.get("decision_trace", []),
            "preview": preview_data
        }

        _latest_preprocessed_session = session_result
        return session_result

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error executing hybrid preprocessing pipeline: {str(e)}"
        )

@router.get("/session")
async def get_latest_preprocessing_session():
    """
    Returns the latest fitted preprocessing session metadata and status.
    """
    if _latest_preprocessed_session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No preprocessing pipeline has been executed yet."
        )
    return _latest_preprocessed_session
