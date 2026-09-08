import pandas as pd
from typing import List, Dict, Any

KNOWN_LEAKAGE_COLUMNS = {
    "delivery status": "Post-event target leakage: contains outcome status of delivery after order placement.",
    "days for shipping (real)": "Post-event leakage: actual shipping duration is measured after order processing.",
    "shipping date (dateorders)": "Post-event leakage: timestamp of actual shipment occurs after order placement.",
    "days for shipment (scheduled)": "Scheduled shipping duration review.",
}

class LeakageDetector:
    @staticmethod
    def detect_leakage(df: pd.DataFrame) -> List[Dict[str, Any]]:
        """
        Identifies supply chain target leakage columns present in the dataset.
        Columns are flagged for review and downstream decision engine handling.
        """
        flagged = []
        for col in df.columns:
            normalized_col = str(col).strip().lower()
            if normalized_col in KNOWN_LEAKAGE_COLUMNS:
                flagged.append({
                    "column_name": str(col),
                    "reason": KNOWN_LEAKAGE_COLUMNS[normalized_col],
                    "recommendation": "Review for target leakage; do NOT drop during profiling."
                })
        return flagged
