import pandas as pd
import io
import os
from typing import Optional
from data_processing.validator import DatasetValidator

class DatasetIngestionService:
    def __init__(self):
        self._active_df: Optional[pd.DataFrame] = None
        self._filename: Optional[str] = None

    def load_csv_bytes(self, content: bytes, filename: str) -> pd.DataFrame:
        """
        Safely load CSV bytes with encoding fallback (utf-8 -> latin1 -> iso-8859-1 -> cp1252),
        validating structure, empty files, and malformed CSVs.
        """
        DatasetValidator.validate_file_metadata(filename, file_size=len(content))

        df = None
        last_error = None
        
        for encoding in ['utf-8', 'latin1', 'iso-8859-1', 'cp1252']:
            try:
                df = pd.read_csv(io.BytesIO(content), encoding=encoding, low_memory=False)
                break
            except Exception as e:
                last_error = e

        if df is None:
            raise ValueError(f"Failed to parse malformed CSV file: {str(last_error)}")

        DatasetValidator.validate_dataframe(df)

        self._active_df = df
        self._filename = filename
        return df

    def load_csv_path(self, filepath: str) -> pd.DataFrame:
        """
        Safely load CSV from file path with encoding fallback.
        """
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"File not found: {filepath}")

        filename = os.path.basename(filepath)
        file_size = os.path.getsize(filepath)
        DatasetValidator.validate_file_metadata(filename, file_size=file_size)

        df = None
        last_error = None

        for encoding in ['utf-8', 'latin1', 'iso-8859-1', 'cp1252']:
            try:
                df = pd.read_csv(filepath, encoding=encoding, low_memory=False)
                break
            except Exception as e:
                last_error = e

        if df is None:
            raise ValueError(f"Failed to parse malformed CSV file: {str(last_error)}")

        DatasetValidator.validate_dataframe(df)

        self._active_df = df
        self._filename = filename
        return df

    def set_active_dataframe(self, df: pd.DataFrame, filename: str) -> None:
        DatasetValidator.validate_dataframe(df)
        self._active_df = df
        self._filename = filename

    def get_active_dataframe(self) -> Optional[pd.DataFrame]:
        return self._active_df

    def get_filename(self) -> Optional[str]:
        return self._filename

    def clear(self) -> None:
        self._active_df = None
        self._filename = None
