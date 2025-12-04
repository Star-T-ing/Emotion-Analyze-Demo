from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.services import profile_service
from app.schemas.profile_schema import ProfileSchema
from app.crud import crud_profile
from app.db.session import get_db
from fastapi import APIRouter, Depends, HTTPException, Body 

router = APIRouter()

# --- 新增的 GET 接口 ---
@router.get("/{user_id}", response_model=ProfileSchema)
def read_user_profile(
    *,
    db: Session = Depends(get_db),
    user_id: str
):
    """
    根据用户ID获取最新的用户情感画像。
    """
    profile = crud_profile.get_profile_by_user_id(db, user_id=user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found for this user")
    return profile

# --- 从 conversations.py 移过来的 POST 接口 ---
@router.post("/{user_id}/finalize_conversation", response_model=ProfileSchema)
def finalize_conversation_and_update_profile(
    *,
    db: Session = Depends(get_db),
    user_id: str,
    # --- 关键修改：使用 Body(...) 来明确指定数据来源 ---
    conversation_id: str = Body(..., embed=True) 
):
    """
    结束一个会话，并触发用户画像的更新。
    """
    profile = profile_service.update_emotion_profile(db=db, user_id=user_id, conversation_id=conversation_id)
    return profile