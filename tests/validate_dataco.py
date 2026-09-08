import sys
import os
import pandas as pd
import pytest

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../')))

from profiling.profiler import DatasetProfiler
from data_processing.ingestion import DatasetIngestionService

DATACO_EXPECTED_PROPERTIES = {
    "num_rows": 180519,
    "num_cols": 53,
    "numeric_cols_count": 29,
    "categorical_cols_count": 24,
    "duplicate_row_count": 0,
    "target_positive_count": 98977,
    "target_negative_count": 81542,
    "missing_product_description_pct": 100.0,
    "missing_customer_lname_count": 8,
    "missing_customer_zipcode_count": 3,
}

def validate_dataco_dataframe(df: pd.DataFrame) -> dict:
    """
    Independently inspects a DataFrame against expected DataCo Smart Supply Chain research paper metrics.
    Returns a validation results summary dictionary.
    """
    summary = DatasetProfiler.generate_summary(df)
    profiles = DatasetProfiler.generate_column_profiles(df)
    target_prof = DatasetProfiler.generate_target_profile(df)
    leakage = DatasetProfiler.detect_leakage(df)

    validation_results = {
        "summary": summary,
        "is_exact_dataco": False,
        "checks": {}
    }

    # Verify rows & columns
    validation_results["checks"]["rows_match"] = (summary["num_rows"] == DATACO_EXPECTED_PROPERTIES["num_rows"])
    validation_results["checks"]["cols_match"] = (summary["num_cols"] == DATACO_EXPECTED_PROPERTIES["num_cols"])
    validation_results["checks"]["numeric_count_match"] = (summary["numeric_column_count"] == DATACO_EXPECTED_PROPERTIES["numeric_cols_count"])
    validation_results["checks"]["categorical_count_match"] = (summary["categorical_column_count"] == DATACO_EXPECTED_PROPERTIES["categorical_cols_count"])
    validation_results["checks"]["duplicates_zero"] = (summary["duplicate_row_count"] == 0)

    # Target checks
    if target_prof:
        counts = target_prof.get("class_counts", {})
        pos_count = counts.get("1", counts.get(1, 0))
        neg_count = counts.get("0", counts.get(0, 0))
        validation_results["checks"]["target_positive_match"] = (pos_count == DATACO_EXPECTED_PROPERTIES["target_positive_count"])
        validation_results["checks"]["target_negative_match"] = (neg_count == DATACO_EXPECTED_PROPERTIES["target_negative_count"])

    # Specific missingness checks
    col_dict = {p["column_name"]: p for p in profiles}
    if "Product Description" in col_dict:
        validation_results["checks"]["product_desc_100_missing"] = (col_dict["Product Description"]["missing_percentage"] == 100.0)
    if "Customer Lname" in col_dict:
        validation_results["checks"]["customer_lname_8_missing"] = (col_dict["Customer Lname"]["missing_count"] == 8)
    if "Customer Zipcode" in col_dict:
        validation_results["checks"]["customer_zipcode_3_missing"] = (col_dict["Customer Zipcode"]["missing_count"] == 3)

    validation_results["is_exact_dataco"] = all(validation_results["checks"].values())
    return validation_results

def test_dataco_synthetic_schema_validation():
    """
    Test profiling logic on a synthetic representation of the DataCo schema.
    """
    # Create 10-row synthetic test frame mirroring DataCo key column names and types
    data = {
        "Type": ["DEBIT"] * 10,
        "Days for shipping (real)": [3, 5, 2, 4, 6, 3, 5, 2, 4, 6],
        "Days for shipment (scheduled)": [4] * 10,
        "Benefit per order": [10.5, 20.0, -5.0, 15.0, 30.0, 12.0, 22.0, -2.0, 18.0, 25.0],
        "Sales per customer": [100.0] * 10,
        "Delivery Status": ["Advance shipping"] * 10,
        "Late_delivery_risk": [1, 0, 1, 1, 0, 1, 0, 1, 0, 1],
        "Category Name": ["Fitness"] * 10,
        "Customer City": ["Caguas"] * 10,
        "Product Description": [None] * 10,
        "Order Zipcode": [None, 725.0, None, 725.0, None, None, None, 725.0, None, None],
        "Customer Lname": ["Smith", "Doe", "Johnson", None, "Brown", "Davis", "Miller", "Wilson", "Moore", "Taylor"],
        "Customer Zipcode": [725.0, 725.0, None, 725.0, 725.0, 725.0, 725.0, 725.0, 725.0, 725.0]
    }
    df = pd.DataFrame(data)
    results = validate_dataco_dataframe(df)
    assert results["summary"]["num_rows"] == 10
    assert results["summary"]["num_cols"] == 13
    assert len(results["summary"]) > 0
    assert results["checks"]["duplicates_zero"] is True

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        filepath = sys.argv[1]
        print(f"Validating dataset at: {filepath}")
        service = DatasetIngestionService()
        df = service.load_csv_path(filepath)
        results = validate_dataco_dataframe(df)
        print("Validation Results:")
        print(results)
