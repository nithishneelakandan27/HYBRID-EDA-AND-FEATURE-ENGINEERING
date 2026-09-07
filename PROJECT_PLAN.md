# Project Implementation Plan

## Phase 1: Foundation & Architecture (Current)
- [x] Design architecture and technology stack
- [x] Create directory structure and documentation (`README.md`, `ARCHITECTURE.md`, `PROJECT_PLAN.md`)
- [x] Create `.gitignore` and `.env.example`
- [x] Setup minimal backend (FastAPI) with health-check endpoint (`/api/health`)
- [x] Setup minimal frontend (React + Vite)
- [x] Verify application startup and test execution

## Phase 2: Data Ingestion, Validation & Profiling
- [x] Implement dataset ingestion for DataCo Smart Supply Chain dataset (180,519 rows, 53 columns)
- [x] Implement schema validation and missing value checks (Product Description 100%, Order Zipcode 86.24%, Customer Lname 8, Customer Zipcode 3)
- [x] Implement statistical profiling module
- [x] Add unit tests for ingestion and profiling

## Phase 3: Automated EDA & Hybrid Decision Engine
- [x] Implement automated EDA summary generation
- [x] Implement hybrid decision engine rules:
  - Skewness calculation on training data (`|skew| < 1` → mean, `|skew| >= 1` → median)
  - IQR outlier proportion calculation (`> 2%` → RobustScaler, else StandardScaler)
  - Conditional log transformation (`|skew| > 1` and `min >= 0` → `log1p`)
  - Cardinality-aware encoding (`<= 15` → one-hot, `> 15` → label encoding)
- [x] Unit test decision engine rules

## Phase 4: Preprocessing & Conditional Feature Engineering
- [x] Implement missing value imputation pipeline
- [x] Implement scaling and log transformation modules
- [x] Implement conditional domain feature engineering (`profit_to_revenue_ratio`) avoiding leakage columns (`Delivery Status`, `Days for shipping (real)`, `shipping date (DateOrders)`)
- [x] Ensure strict train-set-only fitting protocol

## Phase 5: Feature Selection & Experimental Pipelines
- [x] Implement variance threshold filter (`1e-4`)
- [x] Implement correlation filter (`|correlation| > 0.95`)
- [x] Implement Pipeline A (Minimal), Pipeline B (Fixed), and Pipeline C (Proposed Hybrid)
- [x] Setup 80:20 stratified train/test split (`random_state=42`) with `LogisticRegression(max_iter=1000, random_state=42)`

## Phase 6: Evaluation, Visualization & Reporting
- [x] Execute evaluation and compute Accuracy, Precision, Recall, F1, and ROC-AUC
- [x] Validate results against target paper metrics
- [x] Implement visualization module for before/after comparisons
- [x] Implement report generation module
- [x] Final system integration testing and user interface polish
