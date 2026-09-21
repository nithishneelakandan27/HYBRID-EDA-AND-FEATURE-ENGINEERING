"""
evaluation/metrics.py

Unified metrics computation for all experimental pipelines.
Dynamically supports both binary and multiclass classification targets.
"""
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix
)


def evaluate_classification_metrics(
    y_true,
    y_pred,
    y_prob=None,
    labels: Optional[List[Any]] = None
) -> Dict[str, Any]:
    """
    Dynamically computes classification metrics for binary or multiclass targets.

    Parameters
    ----------
    y_true : array-like of true labels
    y_pred : array-like of predicted labels
    y_prob : array-like of predicted probabilities (1D or 2D).
             If None or incompatible, ROC-AUC will be safely omitted.
    labels : optional list of class labels in fixed order

    Returns
    -------
    dict with standard keys (accuracy, precision, recall, f1, roc_auc)
    plus extended multiclass breakdown (macro, weighted) and confusion matrix.
    """
    y_true_ser = pd.Series(y_true)
    classes = sorted(list(y_true_ser.dropna().unique()))
    n_classes = len(classes)
    classification_type = "binary" if n_classes == 2 else "multiclass"

    acc = round(float(accuracy_score(y_true, y_pred)), 4)

    # Confusion matrix
    try:
        cm_class_labels = labels if labels is not None else classes
        cm = confusion_matrix(y_true, y_pred, labels=cm_class_labels).tolist()
        cm_labels = [str(c) for c in cm_class_labels]
    except Exception:
        cm = []
        cm_labels = []

    # Unweighted Macro metrics
    prec_macro = round(float(precision_score(y_true, y_pred, average="macro", zero_division=0)), 4)
    rec_macro = round(float(recall_score(y_true, y_pred, average="macro", zero_division=0)), 4)
    f1_macro = round(float(f1_score(y_true, y_pred, average="macro", zero_division=0)), 4)

    # Sample/Frequency Weighted metrics
    prec_weighted = round(float(precision_score(y_true, y_pred, average="weighted", zero_division=0)), 4)
    rec_weighted = round(float(recall_score(y_true, y_pred, average="weighted", zero_division=0)), 4)
    f1_weighted = round(float(f1_score(y_true, y_pred, average="weighted", zero_division=0)), 4)

    roc_auc = None
    roc_auc_note = None

    if classification_type == "binary":
        # For binary targets, preserve exact binary metric calculations
        prec = round(float(precision_score(y_true, y_pred, average="binary", zero_division=0)), 4)
        rec = round(float(recall_score(y_true, y_pred, average="binary", zero_division=0)), 4)
        f1 = round(float(f1_score(y_true, y_pred, average="binary", zero_division=0)), 4)

        if y_prob is not None:
            try:
                prob_arr = np.asarray(y_prob)
                if prob_arr.ndim == 2:
                    # If 2D probability matrix, positive class is index 1
                    prob_pos = prob_arr[:, 1] if prob_arr.shape[1] >= 2 else prob_arr[:, 0]
                else:
                    prob_pos = prob_arr
                roc_auc = round(float(roc_auc_score(y_true, prob_pos)), 4)
            except Exception as e:
                roc_auc = None
                roc_auc_note = f"Binary ROC-AUC omitted: {str(e)}"
    else:
        # For multiclass targets, standard precision/recall/f1 default to macro for consistency
        prec = prec_macro
        rec = rec_macro
        f1 = f1_macro

        if y_prob is not None:
            try:
                prob_arr = np.asarray(y_prob)
                eval_labels = labels if labels is not None else classes
                if prob_arr.ndim == 2 and prob_arr.shape[1] >= n_classes:
                    roc_auc = round(float(roc_auc_score(
                        y_true,
                        prob_arr,
                        multi_class="ovr",
                        average="macro",
                        labels=eval_labels
                    )), 4)
                else:
                    roc_auc = None
                    roc_auc_note = "Multiclass ROC-AUC omitted: probability distribution dimensions do not match class count."
            except Exception as e:
                roc_auc = None
                roc_auc_note = f"Multiclass ROC-AUC omitted: {str(e)}"
        else:
            roc_auc_note = "Multiclass ROC-AUC omitted: probability estimates not provided."

    import math
    if roc_auc is not None and (math.isnan(roc_auc) or math.isinf(roc_auc)):
        roc_auc = None

    return {
        "classification_type": classification_type,
        "n_classes": n_classes,
        "classes": [str(c) for c in classes],
        "accuracy": acc,
        "precision": prec,
        "recall": rec,
        "f1": f1,
        "precision_macro": prec_macro,
        "recall_macro": rec_macro,
        "f1_macro": f1_macro,
        "precision_weighted": prec_weighted,
        "recall_weighted": rec_weighted,
        "f1_weighted": f1_weighted,
        "roc_auc": roc_auc,
        "roc_auc_note": roc_auc_note,
        "confusion_matrix": cm,
        "confusion_matrix_labels": cm_labels
    }


def compute_metrics(
    y_true,
    y_pred,
    y_prob=None,
    labels: Optional[List[Any]] = None
) -> Dict[str, Any]:
    """
    Backward-compatible entry point for all existing pipeline metric computations.
    """
    return evaluate_classification_metrics(y_true, y_pred, y_prob=y_prob, labels=labels)
