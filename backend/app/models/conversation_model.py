from sqlalchemy import Column, String, INT, FLOAT, JSON, TIMESTAMP, func, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base

class Conversation(Base):
    __tablename__ = "conversations"
    conversation_id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.user_id"), nullable=False, index=True)
    start_time = Column(TIMESTAMP, nullable=False) 
    duration_minutes = Column(INT, nullable=False)
    total_messages = Column(INT, nullable=False)
    dominant_emotion = Column(String, nullable=False)
    sentiment_stability = Column(FLOAT, nullable=False)
    valence_trend = Column(String, nullable=False)
    emotion_trajectory = Column(JSON, nullable=False)
    peak_sentiment = Column(JSON, nullable=False)
    last_updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now(), nullable=False) # 字段名重命名，更清晰

    messages = relationship("Message", back_populates="conversation")