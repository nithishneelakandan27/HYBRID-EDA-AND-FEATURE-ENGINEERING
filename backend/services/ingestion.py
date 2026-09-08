import sys
import os
# Ensure root workspace is in sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

from data_processing.ingestion import DatasetIngestionService

# Singleton instance for backend session
ingestion_service = DatasetIngestionService()
