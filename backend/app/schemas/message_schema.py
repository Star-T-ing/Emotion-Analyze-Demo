from datetime import datetime
from .base_schema import BaseSchema
from typing import Dict, Any

class MessageCreate(BaseSchema):
    conversation_id: str
    user_id: str
    text: str

class MessageSchema(BaseSchema):
    message_id: int
    conversation_id: str
    user_id: str
    sequence: int
    emotion_scores: Dict[str, Any]
    primary_emotion: str
    valence: float
    arousal: float
    dominance: float
    confidence_score: float
    analysis_model: str
    timestamp: datetime