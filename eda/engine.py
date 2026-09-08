import pandas as pd
from typing import Dict, Any, List, Optional

from eda.missing import MissingValueAnalyzer
from eda.numeric import NumericAnalyzer
from eda.categorical import CategoricalAnalyzer
from eda.correlation import CorrelationAnalyzer
from eda.outliers import OutlierAnalyzer
from eda.findings import FindingsGenerator

class AutomatedEDAEngine:
    @staticmethod
    def run_eda(df: pd.DataFrame) -> Dict[str, Any]:
        """
        Executes generic, dataset-aware automated Exploratory Data Analysis.
        Dynamically adapts analysis modules and visualization selections
        to dataset properties without hardcoded column names or assumptions.
        """
        if df is None or not isinstance(df, pd.DataFrame) or df.empty:
            raise ValueError("Invalid or empty DataFrame provided for EDA.")

        num_rows = int(df.shape[0])
        num_cols = int(df.shape[1])

        numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
        categorical_cols = df.select_dtypes(exclude=['number']).columns.tolist()

        # 1. Missing Value Analysis
        missing_analysis = MissingValueAnalyzer.analyze(df)

        # 2. Dataset-Aware Selection: Numeric Analysis
        has_numeric = len(numeric_cols) > 0
        numeric_analysis = NumericAnalyzer.analyze(df) if has_numeric else {
            "numeric_column_count": 0,
            "column_summaries": [],
            "visualizations": []
        }

        # 3. Dataset-Aware Selection: Categorical Analysis
        has_categorical = len(categorical_cols) > 0
        categorical_analysis = CategoricalAnalyzer.analyze(df) if has_categorical else {
            "categorical_column_count": 0,
            "column_summaries": [],
            "visualizations": []
        }

        # 4. Dataset-Aware Selection: Correlation Analysis (requires >= 2 numeric columns)
        has_correlation = len(numeric_cols) >= 2
        correlation_analysis = CorrelationAnalyzer.analyze(df) if has_correlation else {
            "can_compute_correlation": False,
            "reason": "At least 2 numeric columns are required to compute correlation.",
            "numeric_column_count": len(numeric_cols),
            "correlation_matrix": None,
            "high_correlation_pairs": []
        }

        # 5. Outlier Analysis
        outlier_analysis = OutlierAnalyzer.analyze(df) if has_numeric else {
            "has_outliers": False,
            "total_outlier_instances": 0,
            "outlier_columns_count": 0,
            "outlier_columns": []
        }

        # 6. Dynamic Findings Generation
        findings = FindingsGenerator.generate_findings(
            missing_analysis,
            numeric_analysis,
            categorical_analysis,
            correlation_analysis,
            outlier_analysis
        )

        # 7. Dataset-Aware Execution Summary Flags
        analysis_flags = {
            "missing_analysis_performed": True,
            "missing_charts_generated": missing_analysis.get("has_missing_values", False),
            "numeric_analysis_performed": has_numeric,
            "categorical_analysis_performed": has_categorical,
            "correlation_analysis_performed": has_correlation,
            "outlier_analysis_performed": has_numeric
        }

        return {
            "dataset_info": {
                "num_rows": num_rows,
                "num_cols": num_cols,
                "numeric_column_count": len(numeric_cols),
                "categorical_column_count": len(categorical_cols)
            },
            "analysis_flags": analysis_flags,
            "findings": findings,
            "missing_analysis": missing_analysis,
            "numeric_analysis": numeric_analysis,
            "categorical_analysis": categorical_analysis,
            "correlation_analysis": correlation_analysis,
            "outlier_analysis": outlier_analysis
        }
