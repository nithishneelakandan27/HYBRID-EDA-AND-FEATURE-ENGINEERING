"""
backend/services/modeling_service.py

In-memory singleton holding:
- Trained pipeline artifacts per model type
- Latest training result per model type
- Comparison results across all trained models
- Thread-safe training state
"""
import threading
from typing import Dict, Any, Optional

class ModelingService:
    def __init__(self):
        self._lock = threading.Lock()
        # model_type -> full result dict from trainer.train_model()
        self._trained_models: Dict[str, Dict[str, Any]] = {}
        self._training_in_progress: Dict[str, bool] = {}

    def is_training(self, model_type: str) -> bool:
        return self._training_in_progress.get(model_type, False)

    def set_training(self, model_type: str, flag: bool):
        with self._lock:
            self._training_in_progress[model_type] = flag

    def store_result(self, model_type: str, result: Dict[str, Any]):
        with self._lock:
            self._trained_models[model_type] = result

    def get_result(self, model_type: str) -> Optional[Dict[str, Any]]:
        return self._trained_models.get(model_type)

    def get_pipeline_artifacts(self, model_type: str) -> Optional[Dict[str, Any]]:
        result = self._trained_models.get(model_type)
        return result.get("pipeline_artifacts") if result else None

    def list_trained_models(self) -> list:
        return list(self._trained_models.keys())

    def get_comparison(self) -> list:
        """Build a comparison row for every trained model."""
        rows = []
        for model_type, result in self._trained_models.items():
            metrics = result.get("metrics", {})
            timing = result.get("timing", {})
            rows.append({
                "model_type": model_type,
                "model_label": result.get("model_label", model_type),
                "accuracy": metrics.get("accuracy"),
                "precision": metrics.get("precision"),
                "recall": metrics.get("recall"),
                "f1": metrics.get("f1"),
                "roc_auc": metrics.get("roc_auc"),
                "training_sec": timing.get("model_training_sec"),
                "total_pipeline_sec": timing.get("total_pipeline_sec"),
                "feature_count": result.get("feature_info", {}).get("post_selection"),
            })
        return rows

    def has_any_model(self) -> bool:
        return len(self._trained_models) > 0

    def clear(self):
        with self._lock:
            self._trained_models.clear()
            self._training_in_progress.clear()


# Singleton instance
modeling_service = ModelingService()
