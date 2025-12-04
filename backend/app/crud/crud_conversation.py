from sqlalchemy.orm import Session
from app.models.conversation_model import Conversation
from typing import Dict, Any

def get_conversation_by_id(db: Session, conversation_id: str):
    return db.query(Conversation).filter(Conversation.conversation_id == conversation_id).first()

def create_or_update_conversation(db: Session, *, conversation_id: str, user_id: str, analysis_data: Dict[str, Any]) -> Conversation:
    db_conversation = get_conversation_by_id(db, conversation_id)
    
    if not db_conversation:
        # 创建新的 conversation
        db_conversation = Conversation(
            conversation_id=conversation_id,
            user_id=user_id,
            start_time=analysis_data["start_time"],
            **analysis_data["update_data"]
        )
        db.add(db_conversation)
    else:
        # 更新已有的 conversation
        for key, value in analysis_data["update_data"].items():
            setattr(db_conversation, key, value)
    
    db.commit()
    db.refresh(db_conversation)
    return db_conversation