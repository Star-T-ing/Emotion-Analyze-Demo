from .base_schema import BaseSchema
from .message_schema import MessageSchema
from .conversation_schema import ConversationSchema
from .anomaly_schema import AnomalySchema
from typing import List

class AnalysisResponse(BaseSchema):
    message: MessageSchema
    conversation: ConversationSchema
    bot_response: str
    anomalies: List[AnomalySchema]