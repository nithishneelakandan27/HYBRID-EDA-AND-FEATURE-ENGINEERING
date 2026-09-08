# Project Implementation Plan

## Phase 1: Foundation & Architecture
- [x] Design architecture and technology stack
- [x] Create directory structure and documentation (`README.md`, `ARCHITECTURE.md`, `PROJECT_PLAN.md`)
- [x] Create `.gitignore` and `.env.example`
- [x] Setup minimal backend (FastAPI) with health-check endpoint (`/api/health`)
- [x] Setup minimal frontend (React + Vite)
- [x] Verify application startup and test execution

## Phase 2: Data Ingestion, Validation & Profiling
- [x] Implement dataset ingestion with encoding fallback and file validation
- [x] Implement dataset structure validation (empty files, malformed CSVs, size limits)
- [x] Implement statistical profiling module (`DatasetProfiler`) for numeric and categorical statistics
- [x] Implement profile flag generator (`completely missing`, `high missingness`, `low cardinality`, `high cardinality`, `highly skewed`, `outlier-heavy`, `constant/near-constant`, `potential identifier`)
- [x] Implement target profile candidate analysis (`Late_delivery_risk`)
- [x] Implement target leakage reviewer for supply chain datasets
- [x] Integrate backend REST API endpoints (`/upload`, `/summary`, `/profiles`, `/target`, `/leakage`)
- [x] Build interactive React UI dashboard with search/filters and profile tabs
- [x] Add comprehensive backend unit test suite and DataCo independent validation module

## Phase 3: Automated EDA
- [x] Implement generic, dataset-aware automated EDA engine in `eda/`
- [x] Implement missing-value analysis and conditional chart generation
- [x] Implement numeric distribution analysis, skewness, histogram binning, and boxplot statistics
- [x] Implement categorical analysis with high-cardinality statistical summaries
- [x] Implement Pearson correlation matrix computation and high correlation pair extraction ($|r| \ge 0.70$)
- [x] Implement IQR outlier breakdown analysis
- [x] Implement dataset-aware analysis selection (handles 0 missing, 0 numeric, 1 numeric, 0 categorical datasets)
- [x] Implement dynamic human-readable findings generator
- [x] Build backend API endpoint (`GET /api/eda/analysis`)
- [x] Integrate Automated EDA section into frontend React dashboard
- [x] Add synthetic dataset generalization test suite (`tests/test_eda_generalization.py` covering Datasets A-F)

## Phase 4: Hybrid Decision Engine (Current)
- [x] Implement core Hybrid Decision Engine in `decision_engine/`
- [x] Implement skew-aware missing value imputation rule ($|skew| < 1 \rightarrow$ mean, $|skew| \ge 1 \rightarrow$ median, categorical $\rightarrow$ most-frequent)
- [x] Implement outlier-aware scaling rule (IQR outlier proportion $> 2\% \rightarrow$ RobustScaler, else StandardScaler)
- [x] Implement conditional log transformation rule ($|skew| > 1 \land min \ge 0 \rightarrow log1p$)
- [x] Implement cardinality-aware encoding rule ($cardinality \le 15 \rightarrow$ One-Hot, $> 15 \rightarrow$ Label Encoding)
- [x] Implement configurable leakage-aware and column status classification without blind deletion
- [x] Implement deterministic, structured Preprocessing Decision Plan with human-readable explanations
- [x] Build backend API endpoint (`GET /api/decision/plan`)
- [x] Integrate Hybrid Decisions dashboard tab in React frontend
- [x] Add comprehensive test suite (`tests/test_decision_engine.py` covering all 16 required rule scenarios)

## Phase 5: Preprocessing & Conditional Feature Engineering ✅ COMPLETE
- [x] Implement missing value imputation pipeline (`SkewAwareNumericImputer`)
- [x] Implement scaling and log transformation execution modules (`OutlierAwareScaler`, `ConditionalLog1pTransformer`)
- [x] Implement categorical encoding execution modules (`SafeCategoricalEncoder`)
- [x] Implement `HybridPreprocessor` pipeline orchestrating fit/transform with train-only protocol
- [x] Setup 80:20 stratified train/test split (`random_state=42`) via API parameter
- [x] Ensure strict train-set-only fitting protocol (23 tests — all pass)
- [x] Build backend API (`POST /api/preprocessing/execute`, `GET /api/preprocessing/session`)
- [x] Add Preprocessing Pipeline tab to React frontend (Tab 5)

## Phase 6: Feature Engineering + Feature Selection + ML Evaluation ✅ COMPLETE
- [x] Implement `ConditionalFeatureEngineer` (configurable ratio-type feature specs, leakage-aware, zero-safe)
- [x] Implement `profit_to_revenue_ratio` as a configurable DataCo feature spec
- [x] Implement `HybridFeatureSelector` — VarianceThreshold(1e-4) + pairwise |r|>0.95 filter (train-only)
- [x] Implement Pipeline A (Minimal), Pipeline B (Fixed), and Pipeline C (Proposed Hybrid)
- [x] `run_all_pipelines()` orchestrator — ONE shared 80/20 stratified split, all three run on same data
- [x] `LogisticRegression(max_iter=1000, random_state=42)` — fit on train, evaluate on test
- [x] Compute Accuracy, Precision, Recall, F1, ROC-AUC
- [x] Record feature counts at each stage and timing per pipeline
- [x] Build backend API (`POST /api/evaluation/run`, `GET /api/evaluation/session`)
- [x] Add ML Evaluation tab (Tab 7) to React frontend with comparison table, feature reduction, timing, FE/FS details, JSON/CSV export
- [x] Add 14 tests (`tests/test_evaluation.py`) — all pass
- [x] Full suite: **66 passed** — frontend build: ✅ success
- [ ] DataCo end-to-end validation — **PENDING** (dataset not present in workspace)
