from .base_schema import BaseSchema
from typing import Dict, Any
from datetime import datetime

class ProfileSchema(BaseSchema):
    user_id: str
    last_updated_at: datetime
    total_conversations: int
    total_messages: int
    emotion_distribution: Dict[str, Any]
    sentiment_baseline: Dict[str, Any]
    profile_confidence: float
    engagement_index: float
    frustration_index: float
    stability_baseline: float
    
    # 还可以添加更多未来想展示的字段
    # emotional_transitions: Dict[str, Any]
    # anomaly_frequency: float
    # common_anomaly_types: Dict[str, Any]

