import logging
from sqlalchemy.orm import Session
from app.models.message_model import Message
from app.crud import crud_anomaly, crud_profile
import numpy as np

logger = logging.getLogger(__name__)

# --- 阈值定义 ---
SENTIMENT_SHIFT_THRESHOLD = 0.7
SUSTAINED_NEGATIVITY_THRESHOLD = -0.5
SUSTAINED_NEGATIVITY_COUNT = 3
HIGH_INTENSITY_VALENCE_THRESHOLD = -0.7
HIGH_INTENSITY_AROUSAL_THRESHOLD = 0.6
STATE_DEVIATION_THRESHOLD = 0.6

def detect_anomalies(db: Session, messages: list[Message]):
    """在一个会话的消息列表中，针对最新一条消息检测异常。"""
    if not messages:
        return

    last_message = messages[-1]

    # 1. 检测情感突变 (Sentiment_Shift)
    if len(messages) > 1:
        prev_message = messages[-2]
        p1 = np.array([last_message.valence, last_message.arousal, last_message.dominance])
        p2 = np.array([prev_message.valence, prev_message.arousal, prev_message.dominance])
        distance = np.linalg.norm(p1 - p2)
        # VAD空间最大可能距离约为 sqrt(2^2 + 1^2 + 1^2)
        normalized_distance = distance/np.sqrt(4+1+1) 
        if normalized_distance > SENTIMENT_SHIFT_THRESHOLD:
            crud_anomaly.create_anomaly(db, message_obj=last_message, anomaly_type="Sentiment_Shift", score=normalized_distance)
            logger.info(f"检测到情感突变异常！距离: {distance:.2f}, 归一化得分: {normalized_distance:.2f}")

    # 2. 检测高强度痛苦 (High_Intensity_Distress)
    if last_message.valence < HIGH_INTENSITY_VALENCE_THRESHOLD and last_message.arousal > HIGH_INTENSITY_AROUSAL_THRESHOLD:
         score = (abs(last_message.valence) + last_message.arousal) / 2
         crud_anomaly.create_anomaly(db, message_obj=last_message, anomaly_type="High_Intensity_Distress", score=score)
         logger.info(f"检测到高强度痛苦异常！得分: {score:.2f}")

    # 3. 检测持续负面 (Sustained_Negativity)
    if len(messages) >= SUSTAINED_NEGATIVITY_COUNT:
        recent_messages = messages[-SUSTAINED_NEGATIVITY_COUNT:]
        is_sustained_negativity = all(m.valence < SUSTAINED_NEGATIVITY_THRESHOLD for m in recent_messages)
        if is_sustained_negativity:
            avg_neg_valence = np.mean([m.valence for m in recent_messages])
            crud_anomaly.create_anomaly(db, message_obj=last_message, anomaly_type="Sustained_Negativity", score=abs(avg_neg_valence))
            logger.info(f"检测到持续负面异常！得分: {abs(avg_neg_valence):.2f}")

    # 4. 检测状态偏离 (State_Deviation)
    profile = crud_profile.get_profile_by_user_id(db, user_id=last_message.user_id)
    if profile and profile.total_conversations > 2: # 仅在画像有一定可信度时检测
        baseline = profile.sentiment_baseline
        p_current = np.array([last_message.valence, last_message.arousal, last_message.dominance])
        p_baseline = np.array([baseline.get('avg_valence', 0), baseline.get('avg_arousal', 0), baseline.get('avg_dominance', 0)])
        
        distance = np.linalg.norm(p_current - p_baseline)
        # VAD空间最大可能距离约为 sqrt(2^2 + 1^2 + 1^2)
        normalized_distance = distance/np.sqrt(4+1+1) 
        
        if normalized_distance > STATE_DEVIATION_THRESHOLD:
            crud_anomaly.create_anomaly(db, message_obj=last_message, anomaly_type="State_Deviation", score=normalized_distance)
            logger.info(f"检测到状态偏离异常！距离: {distance:.2f}, 归一化得分: {normalized_distance:.2f}")