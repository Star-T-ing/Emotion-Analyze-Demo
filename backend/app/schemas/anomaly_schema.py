from .base_schema import BaseSchema
from datetime import datetime
from app.models.anomaly_model import AnomalyType, SeverityLevel, AnomalyStatus

class AnomalySchema(BaseSchema):
    detection_id: int
    message_id: int
    anomaly_type: AnomalyType
    anomaly_score: float
    severity_level: SeverityLevel
    timestamp: datetime