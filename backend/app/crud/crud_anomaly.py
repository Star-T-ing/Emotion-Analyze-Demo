from sqlalchemy.orm import Session
from app.models.anomaly_model import Anomaly, AnomalyType, SeverityLevel


def create_anomaly(db: Session, *, message_obj, anomaly_type: AnomalyType, score: float) -> Anomaly:
    # 简单的分数到严重等级的映射
    if score > 0.9: level = SeverityLevel.critical
    elif score > 0.7: level = SeverityLevel.high
    elif score > 0.4: level = SeverityLevel.medium
    else: level = SeverityLevel.low

    db_anomaly = Anomaly(
        conversation_id=message_obj.conversation_id,
        user_id=message_obj.user_id,
        message_id=message_obj.message_id,
        anomaly_type=anomaly_type,
        anomaly_score=score,
        severity_level=level
    )
    db.add(db_anomaly)
    db.commit()
    db.refresh(db_anomaly)
    return db_anomaly