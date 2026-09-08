"""
backend/main.py

FastAPI application entry point.

Launch from project root:
    venv/bin/uvicorn backend.main:app --reload --port 8000

sys.path setup ensures:
  - 'backend/' is in path → bare 'routers', 'services' imports work
  - project root is in path → 'data_processing', 'eda', 'preprocessing',
    'decision_engine', 'feature_engineering', 'feature_selection', 'evaluation'
    all resolve correctly
"""
import sys
import os

# ── Path bootstrap ──────────────────────────────────────────────────────────
_THIS_DIR = os.path.dirname(os.path.abspath(__file__))          # …/backend/
_ROOT_DIR = os.path.dirname(_THIS_DIR)                          # …/HYBRID-EDA-…/

for _p in [_THIS_DIR, _ROOT_DIR]:
    if _p not in sys.path:
        sys.path.insert(0, _p)
# ────────────────────────────────────────────────────────────────────────────

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from routers import dataset, eda, decision, preprocessing, evaluation

load_dotenv()

app = FastAPI(
    title="Hybrid EDA & Feature Engineering Supply Chain API",
    version="1.0.0",
    description=(
        "Backend API for automated exploratory data analysis, hybrid preprocessing "
        "decisions, execution pipeline, and classification evaluation."
    )
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dataset.router)
app.include_router(eda.router)
app.include_router(decision.router)
app.include_router(preprocessing.router)
app.include_router(evaluation.router)


@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "hybrid-eda-backend",
        "version": "1.0.0"
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port, reload=True)
