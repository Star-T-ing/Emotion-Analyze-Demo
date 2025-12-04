from sqlalchemy import Column, Integer, String, INT, JSON, FLOAT, TIMESTAMP, func, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base

class Message(Base):
    __tablename__ = "messages"
    message_id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(String, ForeignKey("conversations.conversation_id"), nullable=False, index=True) # 重命名
    user_id = Column(String, ForeignKey("users.user_id"), nullable=False, index=True)
    sequence = Column(INT, nullable=False)
    emotion_scores = Column(JSON, nullable=False)
    primary_emotion = Column(String, nullable=False)
    valence = Column(FLOAT, nullable=False)
    arousal = Column(FLOAT, nullable=False)
    dominance = Column(FLOAT, nullable=False)
    confidence_score = Column(FLOAT, nullable=False)
    analysis_model = Column(String, nullable=False)
    timestamp = Column(TIMESTAMP, server_default=func.now(), nullable=False) # 字段名简化
    
    conversation = relationship("Conversation", back_populates="messages")