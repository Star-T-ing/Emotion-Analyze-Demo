from sqlalchemy.orm import Session
from app.models.message_model import Message
from typing import Dict, Any


def create_message(db: Session, *, analysis_result: Dict[str, Any], conversation_id: str, user_id: str, sequence: int) -> Message:
    db_message = Message(
        conversation_id=conversation_id,
        user_id=user_id,
        sequence=sequence,
        emotion_scores=analysis_result["emotion_scores"],
        primary_emotion=analysis_result["primary_emotion"],
        valence=analysis_result["valence"],
        arousal=analysis_result["arousal"],
        dominance=analysis_result["dominance"],
        confidence_score=analysis_result["confidence_score"],
        analysis_model=analysis_result["analysis_model"]
    )
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    return db_message


def get_messages_by_conversation_id(db: Session, conversation_id: str):
    return db.query(Message).filter(Message.conversation_id == conversation_id).order_by(Message.sequence).all()