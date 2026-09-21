"""
modeling/domain_profiles.py

Domain profiles configuration for Phase II ML Modeling.
Supports generic datasets as well as supply-chain-specific defaults.
"""
import pandas as pd
from typing import Dict, Any, List, Optional

DOMAIN_PROFILES: Dict[str, Dict[str, Any]] = {
    "general": {
        "key": "general",
        "label": "General (Auto-Detect)",
        "target_hints": [],
        "leakage_hints": [],
        "class_labels": {},
        "description": "Generic profile for any tabular dataset."
    },
    "supply_chain": {
        "key": "supply_chain",
        "label": "Supply Chain Analytics",
        "target_hints": ["Late_delivery_risk", "late_delivery_risk"],
        "leakage_hints": [
            "Delivery Status",
            "Days for shipping (real)",
            "shipping date (DateOrders)",
            "Product Description",
            "Order Zipcode"
        ],
        "class_labels": {
            "Late_delivery_risk": {0: "On-Time Delivery", 1: "Late Delivery Risk"},
            "late_delivery_risk": {0: "On-Time Delivery", 1: "Late Delivery Risk"},
            "0": "On-Time Delivery",
            "1": "Late Delivery Risk"
        },
        "description": "Optimized for supply chain research datasets (DataCo)."
    }
}


def detect_domain_profile(df: Optional[pd.DataFrame]) -> str:
    """
    Auto-detects whether the dataset matches the supply chain domain profile.
    Returns 'supply_chain' if key supply chain columns are present, else 'general'.
    """
    if df is None or df.empty:
        return "general"

    # Normalize column names: remove underscores, lower case
    cols_norm = set(str(c).strip().lower().replace("_", " ") for c in df.columns)
    sc_indicators = {
        "late delivery risk",
        "delivery status",
        "days for shipping (real)",
        "days for shipping real",
        "days for shipment scheduled",
        "order item quantity",
        "sales per customer",
        "shipping mode"
    }

    matches = cols_norm.intersection(sc_indicators)
    if len(matches) >= 2:
        return "supply_chain"
    return "general"


def get_domain_profile(profile_key: Optional[str], df: Optional[pd.DataFrame] = None) -> Dict[str, Any]:
    """
    Returns domain profile configuration by key. If key is None or 'auto',
    auto-detects from the DataFrame.
    """
    if not profile_key or profile_key == "auto":
        profile_key = detect_domain_profile(df)
    
    return DOMAIN_PROFILES.get(profile_key, DOMAIN_PROFILES["general"])


def get_class_labels(
    profile_key: Optional[str],
    target_column: Optional[str],
    classes: List[Any],
    df: Optional[pd.DataFrame] = None
) -> Dict[Any, str]:
    """
    Returns a dictionary mapping class values to display labels.
    """
    profile = get_domain_profile(profile_key, df)
    mapped_labels = {}

    target_labels = {}
    if target_column and target_column in profile.get("class_labels", {}):
        target_labels = profile["class_labels"][target_column]
    elif profile.get("class_labels"):
        target_labels = profile["class_labels"]

    for cls in classes:
        cls_key = cls
        if cls_key in target_labels:
            mapped_labels[cls] = str(target_labels[cls_key])
        elif str(cls) in target_labels:
            mapped_labels[cls] = str(target_labels[str(cls)])
        elif isinstance(cls, (int, float)) and int(cls) in target_labels:
            mapped_labels[cls] = str(target_labels[int(cls)])
        else:
            mapped_labels[cls] = str(cls)

    return mapped_labels
