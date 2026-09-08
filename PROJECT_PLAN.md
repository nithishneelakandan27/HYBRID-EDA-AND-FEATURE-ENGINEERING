# Project Implementation Plan

## Phase 1: Foundation & Architecture
- [x] Design architecture and technology stack
- [x] Create directory structure and documentation (`README.md`, `ARCHITECTURE.md`, `PROJECT_PLAN.md`)
- [x] Create `.gitignore` and `.env.example`
- [x] Setup minimal backend (FastAPI) with health-check endpoint (`/api/health`)
- [x] Setup minimal frontend (React + Vite)
- [x] Verify application startup and test execution

## Phase 2: Data Ingestion, Validation & Profiling (Current)
- [x] Implement dataset ingestion with encoding fallback and file validation
- [x] Implement dataset structure validation (empty files, malformed CSVs, size limits)
- [x] Implement statistical profiling module (`DatasetProfiler`) for numeric and categorical statistics
- [x] Implement profile flag generator (`completely missing`, `high missingness`, `low cardinality`, `high cardinality`, `highly skewed`, `outlier-heavy`, `constant/near-constant`, `potential identifier`)
- [x] Implement target profile candidate analysis (`Late_delivery_risk`)
- [x] Implement target leakage reviewer for supply chain datasets
- [x] Integrate backend REST API endpoints (`/upload`, `/summary`, `/profiles`, `/target`, `/leakage`)
- [x] Build interactive React UI dashboard with search/filters and profile tabs
- [x] Add comprehensive backend unit test suite and DataCo independent validation module

## Phase 3: Automated EDA & Hybrid Decision Engine
- [ ] Implement automated EDA summary generation
- [ ] Implement hybrid decision engine rules:
  - Skewness calculation on training data (`|skew| < 1` → mean, `|skew| >= 1` → median)
  - IQR outlier proportion calculation (`> 2%` → RobustScaler, else StandardScaler)
  - Conditional log transformation (`|skew| > 1` and `min >= 0` → `log1p`)
  - Cardinality-aware encoding (`<= 15` → one-hot, `> 15` → label encoding)
- [ ] Unit test decision engine rules

## Phase 4: Preprocessing & Conditional Feature Engineering
- [ ] Implement missing value imputation pipeline
- [ ] Implement scaling and log transformation modules
- [ ] Implement conditional domain feature engineering (`profit_to_revenue_ratio`) avoiding leakage columns (`Delivery Status`, `Days for shipping (real)`, `shipping date (DateOrders)`)
- [ ] Ensure strict train-set-only fitting protocol

## Phase 5: Feature Selection & Experimental Pipelines
- [ ] Implement variance threshold filter (`1e-4`)
- [ ] Implement correlation filter (`|correlation| > 0.95`)
- [ ] Implement Pipeline A (Minimal), Pipeline B (Fixed), and Pipeline C (Proposed Hybrid)
- [ ] Setup 80:20 stratified train/test split (`random_state=42`) with `LogisticRegression(max_iter=1000, random_state=42)`

## Phase 6: Evaluation, Visualization & Reporting
- [ ] Execute evaluation and compute Accuracy, Precision, Recall, F1, and ROC-AUC
- [ ] Validate results against target paper metrics
- [ ] Implement visualization module for before/after comparisons
- [ ] Implement report generation module
- [ ] Final system integration testing and user interface polish
