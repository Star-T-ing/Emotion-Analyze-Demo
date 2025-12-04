from sqlalchemy import Column, String, INT, BIGINT, FLOAT, JSON, TIMESTAMP, func
from app.db.session import Base

class EmotionProfile(Base):
    __tablename__ = "emotion_profiles"
    user_id = Column(String, primary_key=True, index=True)
    last_updated_at = Column(TIMESTAMP, nullable=False) 
    total_conversations = Column(INT, nullable=False) 
    total_messages = Column(BIGINT, nullable=False) 
    emotion_distribution = Column(JSON, nullable=False)
    sentiment_baseline = Column(JSON, nullable=False)
    stability_baseline = Column(FLOAT, nullable=False)
    emotional_transitions = Column(JSON, nullable=False)
    engagement_index = Column(FLOAT, nullable=False)
    frustration_index = Column(FLOAT, nullable=False)
    anomaly_frequency = Column(FLOAT, nullable=False)
    common_anomaly_types = Column(JSON, nullable=False)
    profile_confidence = Column(FLOAT, nullable=False)