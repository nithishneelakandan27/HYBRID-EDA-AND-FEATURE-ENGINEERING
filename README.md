# Hybrid Rule-Based and Statistical Framework for Automated Exploratory Data Analysis and Feature Engineering in Supply Chain Data Preprocessing

Final-year project implementing an automated, hybrid rule-based and statistical framework for supply chain data preprocessing, feature engineering, feature selection, and classification evaluation, validated on the DataCo Smart Supply Chain dataset.

## Project Pipeline

1. **Dataset Upload & Validation**
2. **Dataset Profiling**
3. **Automated EDA**
4. **Hybrid Rule + Statistical Decision Engine**
5. **Preprocessing (Skew-aware imputation, Outlier-aware scaling, Log transformation, Cardinality-aware encoding)**
6. **Conditional Feature Engineering**
7. **Feature Selection (Variance threshold, Correlation filtering)**
8. **Before/After Visualization**
9. **ML-Ready Dataset Export**
10. **Classification Evaluation (Pipelines A, B, C)**
11. **Report Generation**

## Technology Stack

- **Backend**: Python 3.10+, FastAPI, Uvicorn, Pandas, NumPy, Scikit-learn, SciPy, Pydantic, Pytest
- **Frontend**: React, Vite, Tailwind CSS / Modern Dashboard UI
- **Architecture**: Modular separation of concerns across dedicated packages.

## Directory Structure

```
frontend/                  # React + Vite frontend dashboard
backend/                   # FastAPI backend application
data_processing/           # Data ingestion, validation, and cleaning
profiling/                 # Statistical profiling modules
eda/                       # Automated Exploratory Data Analysis
decision_engine/           # Hybrid rule + statistical decision engine
preprocessing/             # Imputation, scaling, transformation, encoding
feature_engineering/       # Conditional domain feature generation
feature_selection/         # Variance and correlation filters
evaluation/                # Stratified train/test split & LogisticRegression evaluation
visualization/             # Before/after comparison plots and charts
reporting/                 # Final evaluation & summary report generation
tests/                     # Unit and integration test suite
```

## Getting Started

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## License
Academic Research & Educational Project.
