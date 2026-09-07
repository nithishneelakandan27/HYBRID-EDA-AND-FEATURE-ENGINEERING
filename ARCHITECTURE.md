# System Architecture

## Overview

The system follows a decoupled architecture with a FastAPI backend providing robust data processing, decision engines, machine learning pipelines, and evaluation endpoints, coupled with a responsive React/Vite frontend dashboard for interactive pipeline execution and visualization.

## Modular Component Breakdown

1. **`backend/`**: FastAPI entry point, API routers, CORS configuration, dependency injection, and health checks.
2. **`data_processing/`**: Handles raw dataset ingestion, schema validation, type inference, and missing value checks against expected DataCo specifications.
3. **`profiling/`**: Computes data statistics, summary metrics, distributions, missing value percentages, and cardinality counts.
4. **`eda/`**: Generates automated exploratory data analysis insights, distribution summaries, and correlation matrices.
5. **`decision_engine/`**: Hybrid rule-based and statistical engine implementing:
   - Skewness calculation (Training data only) for mean vs. median imputation.
   - IQR outlier proportion calculation for RobustScaler vs. StandardScaler.
   - Conditional log transformation (`log1p`) for numeric columns with skew > 1 and min >= 0.
   - Cardinality-aware encoding (One-hot for cardinality <= 15, Label encoding for cardinality > 15).
6. **`preprocessing/`**: Executes missing value imputation, scaling, transformation, and encoding without data leakage (learned on training data, applied to test data).
7. **`feature_engineering/`**: Conditional domain feature generation (e.g., `profit_to_revenue_ratio = Order Profit Per Order / Sales`), strictly avoiding leakage columns (`Delivery Status`, `Days for shipping (real)`, `shipping date (DateOrders)`).
8. **`feature_selection/`**: Implements variance threshold filtering (`1e-4`) and correlation filtering (`|correlation| > 0.95`).
9. **`evaluation/`**: Implements 80:20 stratified train/test split (`random_state=42`) and evaluates Pipelines A, B, and C using `LogisticRegression(max_iter=1000, random_state=42)`.
10. **`visualization/`**: Generates comparative before/after data distributions, feature count flows, and evaluation metric charts.
11. **`reporting/`**: Compiles final metrics, pipeline comparison summaries, and exportable reports.
12. **`tests/`**: Comprehensive test suite covering all modules.

## Data Flow & Pipeline Execution

```
Raw CSV Upload → Validation → Profiling → Automated EDA → Decision Engine
      ↓
Train/Test Split (80:20, Stratified)
      ↓
Pipeline A (Minimal) / Pipeline B (Fixed) / Pipeline C (Proposed Hybrid)
      ↓
Preprocessing & Feature Engineering (Fit on Train, Transform Train/Test)
      ↓
Feature Selection (Variance & Correlation filters)
      ↓
LogisticRegression Evaluation & Metric Computation (Accuracy, Precision, Recall, F1, ROC-AUC)
      ↓
Visualization & Report Generation
```
