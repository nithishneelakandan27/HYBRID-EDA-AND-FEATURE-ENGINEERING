"""
evaluation/metrics.py

Unified metrics computation for all three pipelines.
"""
import numpy as np
from typing import Dict, Any
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score
)


def compute_metrics(y_true, y_pred, y_prob=None) -> Dict[str, Any]:
    """
    Computes Accuracy, Precision, Recall, F1, and ROC-AUC.

    Parameters
    ----------
    y_true : array-like of true labels
    y_pred : array-like of predicted labels
    y_prob : array-like of predicted probabilities (for ROC-AUC).
             If None, ROC-AUC will be None.

    Returns
    -------
    dict with keys: accuracy, precision, recall, f1, roc_auc
    """
    metrics = {
        "accuracy": round(float(accuracy_score(y_true, y_pred)), 4),
        "precision": round(float(precision_score(y_true, y_pred, average="binary", zero_division=0)), 4),
        "recall": round(float(recall_score(y_true, y_pred, average="binary", zero_division=0)), 4),
        "f1": round(float(f1_score(y_true, y_pred, average="binary", zero_division=0)), 4),
        "roc_auc": None
    }

    if y_prob is not None:
        try:
            unique_classes = np.unique(y_true)
            if len(unique_classes) == 2:
                metrics["roc_auc"] = round(float(roc_auc_score(y_true, y_prob)), 4)
            else:
                metrics["roc_auc"] = None
        except Exception:
            metrics["roc_auc"] = None

    return metrics
