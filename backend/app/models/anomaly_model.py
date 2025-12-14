from sqlalchemy import Column, Integer, String, FLOAT, TIMESTAMP, func, ForeignKey, Enum
from app.db.session import Base
import enum

class AnomalyType(str, enum.Enum):
    Sentiment_Shift = "Sentiment_Shift"
    Sustained_Negativity = "Sustained_Negativity"
    High_Intensity_Distress = "High_Intensity_Distress"
    State_Deviation = "State_Deviation"

class SeverityLevel(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"

class AnomalyStatus(str, enum.Enum):
    unhandled = "unhandled"
    recorded = "recorded"
    notified = "notified"

class Anomaly(Base):
    __tablename__ = "anomalies"
    detection_id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(String, ForeignKey("conversations.conversation_id"), nullable=False, index=True) # 重命名
    user_id = Column(String, ForeignKey("users.user_id"), nullable=False, index=True)
    message_id = Column(Integer, ForeignKey("messages.message_id"), nullable=False)
    anomaly_type = Column(Enum(AnomalyType), nullable=False)
    anomaly_score = Column(FLOAT, nullable=False)
    severity_level = Column(Enum(SeverityLevel), nullable=False)
    status = Column(Enum(AnomalyStatus), nullable=False, default=AnomalyStatus.unhandled)
    timestamp = Column(TIMESTAMP, server_default=func.now(), nullable=False)