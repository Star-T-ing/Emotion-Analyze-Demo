from sqlalchemy.orm import Session
from app.models.profile_model import EmotionProfile
from typing import Dict, Any

def get_profile_by_user_id(db: Session, user_id: str):
    return db.query(EmotionProfile).filter(EmotionProfile.user_id == user_id).first()

def create_or_update_profile(db: Session, *, user_id: str, profile_data: Dict[str, Any]) -> EmotionProfile:
    db_profile = get_profile_by_user_id(db, user_id)
    
    if not db_profile:
        db_profile = EmotionProfile(user_id=user_id, **profile_data)
        db.add(db_profile)
    else:
        for key, value in profile_data.items():
            setattr(db_profile, key, value)
    
    db.commit()
    db.refresh(db_profile)
    return db_profile