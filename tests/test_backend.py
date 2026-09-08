import sys
import os
import io
import pandas as pd
from fastapi.testclient import TestClient

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../backend')))

from main import app
from data_processing.ingestion import DatasetIngestionService
from data_processing.validator import DatasetValidator
from profiling.profiler import DatasetProfiler

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "hybrid-eda-backend"

def test_valid_csv_upload_and_profiling():
    csv_data = (
        "col_num,col_cat,Late_delivery_risk,Delivery Status\n"
        "10.0,A,1,Shipping Complete\n"
        "20.0,B,0,Advance Shipping\n"
        "30.0,A,1,Late delivery\n"
        "10.0,C,0,Shipping Complete\n"
        "1000.0,B,1,Late delivery\n"
        ",A,0,Shipping Complete\n"
        "20.0,,1,Late delivery\n"
    )
    file_bytes = csv_data.encode("utf-8")
    response = client.post(
        "/api/datasets/upload",
        files={"file": ("test_supply_chain.csv", file_bytes, "text/csv")}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["filename"] == "test_supply_chain.csv"
    assert data["status"] == "success"
    
    # Check Summary
    summary = data["summary"]
    assert summary["num_rows"] == 7
    assert summary["num_cols"] == 4
    assert summary["numeric_column_count"] == 2
    assert summary["categorical_column_count"] == 2
    assert summary["missing_value_count"] == 2

    # Check Target Profile
    target = data["target_profile"]
    assert target is not None
    assert target["target_column"] == "Late_delivery_risk"
    assert target["missing_target_values"] == 0
    assert "1" in target["class_counts"]
    assert "0" in target["class_counts"]

    # Check Leakage Review
    leakage = data["leakage_review"]
    assert len(leakage) >= 1
    leakage_cols = [item["column_name"] for item in leakage]
    assert "Delivery Status" in leakage_cols

    # Check Endpoints
    sum_res = client.get("/api/datasets/summary")
    assert sum_res.status_code == 200

    prof_res = client.get("/api/datasets/profiles")
    assert prof_res.status_code == 200

    target_res = client.get("/api/datasets/target")
    assert target_res.status_code == 200

    leak_res = client.get("/api/datasets/leakage")
    assert leak_res.status_code == 200

def test_invalid_file_extension():
    response = client.post(
        "/api/datasets/upload",
        files={"file": ("test.txt", b"some text content", "text/plain")}
    )
    assert response.status_code == 400

def test_empty_csv():
    response = client.post(
        "/api/datasets/upload",
        files={"file": ("empty.csv", b"", "text/csv")}
    )
    assert response.status_code == 400

def test_malformed_csv():
    response = client.post(
        "/api/datasets/upload",
        files={"file": ("malformed.csv", b"\x00\x00\x00\x00\x00", "text/csv")}
    )
    assert response.status_code == 400

def test_numeric_and_categorical_profiling_details():
    df = pd.DataFrame({
        "num": [10.0, 12.0, 14.0, 13.0, 15.0, 100.0, 11.0, 16.0, 17.0, 18.0],
        "cat": ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"],
        "const": [5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
        "empty_col": [None] * 10
    })

    summary = DatasetProfiler.generate_summary(df)
    assert summary["num_rows"] == 10
    assert summary["num_cols"] == 4
    assert summary["duplicate_row_count"] == 0

    profiles = DatasetProfiler.generate_column_profiles(df)
    
    num_prof = next(p for p in profiles if p["column_name"] == "num")
    assert num_prof["min"] == 10.0
    assert num_prof["max"] == 100.0
    assert num_prof["mean"] is not None
    assert num_prof["median"] is not None
    assert num_prof["std"] is not None
    assert num_prof["variance"] is not None
    assert num_prof["skewness"] > 1.0  # highly skewed due to 100.0
    assert num_prof["iqr"] is not None
    assert num_prof["outlier_count"] >= 1
    assert "highly skewed" in num_prof["data_quality_flags"]

    cat_prof = next(p for p in profiles if p["column_name"] == "cat")
    assert cat_prof["unique_count"] == 10
    assert "low cardinality" in cat_prof["data_quality_flags"]

    const_prof = next(p for p in profiles if p["column_name"] == "const")
    assert "constant/near-constant" in const_prof["data_quality_flags"]

    empty_prof = next(p for p in profiles if p["column_name"] == "empty_col")
    assert "completely missing" in empty_prof["data_quality_flags"]

def test_duplicate_row_detection():
    df = pd.DataFrame({
        "a": [1, 2, 1, 2, 5],
        "b": ["x", "y", "x", "y", "z"]
    })
    summary = DatasetProfiler.generate_summary(df)
    assert summary["duplicate_row_count"] == 2

def test_api_404_when_no_dataset():
    service = DatasetIngestionService()
    service.clear()
    
    ingestion_service_ref = sys.modules["services.ingestion"].ingestion_service
    ingestion_service_ref.clear()

    res = client.get("/api/datasets/summary")
    assert res.status_code == 404
