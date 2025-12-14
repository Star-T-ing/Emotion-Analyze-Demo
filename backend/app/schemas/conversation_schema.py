from datetime import datetime
from .base_schema import BaseSchema
from typing import Dict, Any, List
from app.models.conversation_model import CognitiveState


class ConversationSchema(BaseSchema):
    conversation_id: str
    user_id: str
    start_time: datetime
    duration_minutes: int
    total_messages: int
    dominant_emotion: str
    sentiment_stability: float
    valence_trend: str
    emotion_trajectory: List[Dict[str, Any]]
    peak_sentiment: Dict[str, Any]
    cognitive_state: CognitiveState
    last_updated_at: datetime