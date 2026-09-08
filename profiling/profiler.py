import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional
from profiling.leakage import LeakageDetector

class DatasetProfiler:
    @staticmethod
    def generate_summary(df: pd.DataFrame) -> Dict[str, Any]:
        """
        Calculates dataset-level metrics.
        """
        num_rows = int(df.shape[0])
        num_cols = int(df.shape[1])
        numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
        categorical_cols = df.select_dtypes(exclude=['number']).columns.tolist()
        
        duplicate_count = int(df.duplicated().sum())
        missing_count = int(df.isnull().sum().sum())
        total_cells = num_rows * num_cols
        missing_percentage = float((missing_count / total_cells * 100) if total_cells > 0 else 0.0)
        memory_size_bytes = int(df.memory_usage(deep=True).sum())
        memory_size_mb = round(memory_size_bytes / (1024 * 1024), 2)

        return {
            "num_rows": num_rows,
            "num_cols": num_cols,
            "numeric_column_count": len(numeric_cols),
            "categorical_column_count": len(categorical_cols),
            "duplicate_row_count": duplicate_count,
            "missing_value_count": missing_count,
            "missing_value_percentage": round(missing_percentage, 2),
            "memory_size_bytes": memory_size_bytes,
            "memory_size_mb": memory_size_mb
        }

    @staticmethod
    def generate_column_profiles(df: pd.DataFrame) -> List[Dict[str, Any]]:
        """
        Calculates per-column statistics and data quality flags.
        """
        num_rows = df.shape[0]
        profiles = []

        for col in df.columns:
            series = df[col]
            missing_count = int(series.isnull().sum())
            missing_percentage = float((missing_count / num_rows * 100) if num_rows > 0 else 0.0)
            unique_count = int(series.nunique(dropna=True))
            cardinality = float((unique_count / num_rows) if num_rows > 0 else 0.0)
            
            is_numeric = pd.api.types.is_numeric_dtype(series)
            inferred_type = "numeric" if is_numeric else "categorical/text"

            col_profile = {
                "column_name": str(col),
                "inferred_type": inferred_type,
                "missing_count": missing_count,
                "missing_percentage": round(missing_percentage, 2),
                "unique_count": unique_count,
                "cardinality": round(cardinality, 4),
            }

            most_frequent_pct = 0.0

            if is_numeric:
                clean_series = series.dropna()
                if not clean_series.empty:
                    min_val = float(clean_series.min())
                    max_val = float(clean_series.max())
                    mean_val = float(clean_series.mean())
                    median_val = float(clean_series.median())
                    std_val = float(clean_series.std()) if len(clean_series) > 1 else 0.0
                    var_val = float(clean_series.var()) if len(clean_series) > 1 else 0.0
                    skew_val = float(clean_series.skew()) if len(clean_series) > 2 else 0.0
                    
                    q1 = float(clean_series.quantile(0.25))
                    q3 = float(clean_series.quantile(0.75))
                    iqr = q3 - q1

                    lower_bound = q1 - 1.5 * iqr
                    upper_bound = q3 + 1.5 * iqr
                    outliers = clean_series[(clean_series < lower_bound) | (clean_series > upper_bound)]
                    outlier_count = int(len(outliers))
                    outlier_percentage = float((outlier_count / num_rows * 100) if num_rows > 0 else 0.0)

                    col_profile.update({
                        "min": round(min_val, 4),
                        "max": round(max_val, 4),
                        "mean": round(mean_val, 4),
                        "median": round(median_val, 4),
                        "std": round(std_val, 4),
                        "variance": round(var_val, 4),
                        "skewness": round(skew_val, 4),
                        "q1": round(q1, 4),
                        "q3": round(q3, 4),
                        "iqr": round(iqr, 4),
                        "outlier_count": outlier_count,
                        "outlier_percentage": round(outlier_percentage, 2)
                    })

                    top_freq = clean_series.value_counts().iloc[0] if not clean_series.empty else 0
                    most_frequent_pct = float((top_freq / num_rows * 100) if num_rows > 0 else 0.0)
                else:
                    col_profile.update({
                        "min": None, "max": None, "mean": None, "median": None,
                        "std": None, "variance": None, "skewness": None,
                        "q1": None, "q3": None, "iqr": None,
                        "outlier_count": 0, "outlier_percentage": 0.0
                    })
            else:
                clean_series = series.dropna()
                if not clean_series.empty:
                    mode_val = series.mode()
                    most_frequent = str(mode_val.iloc[0]) if not mode_val.empty else None
                    top_freq = int(clean_series.value_counts().iloc[0])
                    most_frequent_pct = float((top_freq / num_rows * 100) if num_rows > 0 else 0.0)
                else:
                    most_frequent = None
                    top_freq = 0
                    most_frequent_pct = 0.0

                col_profile.update({
                    "most_frequent_value": most_frequent,
                    "most_frequent_frequency": top_freq,
                    "most_frequent_percentage": round(most_frequent_pct, 2)
                })

            # Data Quality Flags Generation (Exact flag names matching prompt specs)
            flags = []
            if missing_percentage == 100.0:
                flags.append("completely missing")
            elif missing_percentage > 20.0:
                flags.append("high missingness")

            if inferred_type == "categorical/text":
                if unique_count <= 10:
                    flags.append("low cardinality")
                if unique_count > (num_rows * 0.5) and num_rows > 10:
                    flags.append("high cardinality")
                if unique_count == num_rows or (cardinality > 0.99 and num_rows > 1):
                    flags.append("potential identifier")
            else:
                if col_profile.get("skewness") is not None and abs(col_profile["skewness"]) > 1.0:
                    flags.append("highly skewed")
                if col_profile.get("outlier_percentage", 0.0) > 5.0:
                    flags.append("outlier-heavy")

            if unique_count <= 1 or most_frequent_pct >= 95.0:
                flags.append("constant/near-constant")

            col_profile["data_quality_flags"] = flags
            profiles.append(col_profile)

        return profiles

    @staticmethod
    def generate_target_profile(df: pd.DataFrame) -> Optional[Dict[str, Any]]:
        """
        Generates class breakdown for target column Late_delivery_risk.
        """
        target_col = None
        for col in df.columns:
            if str(col).strip().lower() == "late_delivery_risk":
                target_col = col
                break

        if not target_col:
            return None

        series = df[target_col]
        missing_target = int(series.isnull().sum())
        value_counts = series.value_counts(dropna=False).to_dict()
        
        class_counts = {str(k): int(v) for k, v in value_counts.items()}
        total_valid = int(series.dropna().count())
        class_percentages = {
            str(k): round(float(v / total_valid * 100), 2) if total_valid > 0 else 0.0
            for k, v in value_counts.items()
        }

        return {
            "target_column": target_col,
            "missing_target_values": missing_target,
            "class_counts": class_counts,
            "class_percentages": class_percentages
        }

    @staticmethod
    def detect_leakage(df: pd.DataFrame) -> List[Dict[str, Any]]:
        return LeakageDetector.detect_leakage(df)
