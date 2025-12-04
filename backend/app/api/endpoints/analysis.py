from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.schemas.message_schema import MessageCreate
from app.schemas.analysis_schema import AnalysisResponse
from app.services import analysis_service
from app.db.session import get_db
import logging
logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/", response_model=AnalysisResponse)
def run_analysis(
    *,
    db: Session = Depends(get_db),
    message_in: MessageCreate
):
    """
    接收新消息，触发完整的情感分析和数据更新流程。
    """
    logger.info(f"收到 API 请求: user='{message_in.user_id}', conv='{message_in.conversation_id[:8]}', text='{message_in.text}'")
    try:
        result = analysis_service.analyze_and_update(
            db=db, 
            conversation_id=message_in.conversation_id,
            user_id=message_in.user_id,
            text=message_in.text
        )
        return result
    except Exception as e:
        logger.error(f"处理请求时发生未捕获的异常: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An internal server error occurred.")