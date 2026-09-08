import io
import os
import pandas as pd
from typing import Tuple, Dict, Any, Optional

MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024  # 500 MB limit

class DatasetValidator:
    @staticmethod
    def validate_file_metadata(filename: str, file_size: Optional[int] = None) -> None:
        """
        Validates file extension and size prior to reading content.
        """
        if not filename or not filename.lower().endswith(".csv"):
            raise ValueError("Invalid file extension. Only CSV files (.csv) are supported.")
            
        if file_size is not None:
            if file_size == 0:
                raise ValueError("Uploaded CSV file is empty (0 bytes).")
            if file_size > MAX_FILE_SIZE_BYTES:
                raise ValueError(f"File size exceeds maximum allowed threshold of {MAX_FILE_SIZE_BYTES / (1024*1024)} MB.")

    @staticmethod
    def validate_dataframe(df: pd.DataFrame) -> None:
        """
        Validates parsed pandas DataFrame structure.
        """
        if df is None or not isinstance(df, pd.DataFrame):
            raise ValueError("Parsed data is not a valid pandas DataFrame.")

        if df.empty:
            raise ValueError("Uploaded CSV dataset contains no data rows.")

        if df.shape[1] == 0:
            raise ValueError("Uploaded CSV dataset contains no columns.")

        # Check for unnamed or blank column names
        unnamed_cols = [c for c in df.columns if str(c).startswith("Unnamed:") or not str(c).strip()]
        if len(unnamed_cols) == df.shape[1]:
            raise ValueError("CSV dataset contains invalid or unreadable column headers.")

class IngestionError(Exception):
    pass
