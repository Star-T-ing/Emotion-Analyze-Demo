import logging
from datetime import datetime
from typing import Dict, Any, List
import numpy as np
from collections import Counter
from sqlalchemy.orm import Session

from app.crud import crud_profile, crud_message
from app.models.message_model import Message
from app.models.profile_model import EmotionProfile
from app.models.conversation_model import Conversation

logger = logging.getLogger(__name__)

# --- 指标计算相关的权重和定义 ---
# 定义哪些学术情绪对 engagement_index 有正向贡献及其权重
# 权重反映了该情绪与“投入”状态的关联强度
ENGAGEMENT_EMOTIONS = {"兴奋": 1.0, "自信": 0.8, "好奇": 0.6}

# 定义哪些学术情绪对 frustration_index 有正向贡献及其权重
# 权重反映了该情绪与“挫败”状态的关联强度
FRUSTRATION_EMOTIONS = {"沮丧": 1.0, "愤怒": 0.8, "焦虑": 0.6, "厌倦": 0.4}


def update_emotion_profile(db: Session, *, user_id: str, conversation_id: str) -> EmotionProfile:
    """
    核心服务函数：在一个会话结束后，聚合该会话的数据来更新用户的长期情感画像。

    Args:
        db (Session): 数据库会话实例。
        user_id (str): 需要更新画像的用户ID。
        conversation_id (str): 刚刚结束的、用于聚合数据的会话ID。

    Returns:
        EmotionProfile: 更新后的用户画像对象。
    """
    logger.info(f"开始为用户 {user_id} 更新情感画像, 基于会话 {conversation_id[:8]}...")

    # 1. 获取本次会话的所有消息
    messages = crud_message.get_messages_by_conversation_id(db, conversation_id)
    
    # 如果会话没有任何消息，直接返回用户当前的画像（如果存在），不进行任何更新
    if not messages:
        logger.warning(f"会话 {conversation_id[:8]} 没有任何消息，跳过画像更新。")
        existing_profile = crud_profile.get_profile_by_user_id(db, user_id)
        if existing_profile:
            return existing_profile
        # 如果连旧画像都没有，返回一个空的结构，避免前端出错
        return EmotionProfile(user_id=user_id, total_conversations=0, total_messages=0, profile_confidence=0)


    # 2. 获取该用户已有的画像，如果不存在，则创建一个包含默认值的初始画像对象
    old_profile = crud_profile.get_profile_by_user_id(db, user_id)
    if not old_profile:
        logger.info(f"未找到用户 {user_id} 的画像，将创建新的初始画像。")
        old_profile = EmotionProfile(
            user_id=user_id,
            last_updated_at=datetime.utcnow(),
            total_conversations=0,
            total_messages=0,
            emotion_distribution={},
            sentiment_baseline={"avg_valence": 0.0, "avg_arousal": 0.5, "avg_dominance": 0.5},
            emotional_transitions={},
            engagement_index=0.5, # 初始值为中性
            frustration_index=0.5, # 初始值为中性
            stability_baseline=0.5, # 初始值为中性
            anomaly_frequency=0.0,
            common_anomaly_types={},
            profile_confidence=0.0
        )

    # --- 3. 聚合本次会话的数据，并计算新的画像指标 ---
    new_messages_count = len(messages)
    new_total_messages = old_profile.total_messages + new_messages_count
    new_total_conversations = old_profile.total_conversations + 1

    # --- 4. 更新画像核心指标 ---
    
    # a) 更新 Sentiment Baseline (VAD三维情感基线)，采用移动平均法
    old_baseline = old_profile.sentiment_baseline
    old_total_msg = old_profile.total_messages
    new_avg_v = (old_baseline.get('avg_valence', 0) * old_total_msg + sum(m.valence for m in messages)) / new_total_messages
    new_avg_a = (old_baseline.get('avg_arousal', 0) * old_total_msg + sum(m.arousal for m in messages)) / new_total_messages
    new_avg_d = (old_baseline.get('avg_dominance', 0) * old_total_msg + sum(m.dominance for m in messages)) / new_total_messages
    new_baseline = {"avg_valence": new_avg_v, "avg_arousal": new_avg_a, "avg_dominance": new_avg_d}
    logger.info(f"更新情感基线: V={new_avg_v:.2f}, A={new_avg_a:.2f}, D={new_avg_d:.2f}")

    # b) 更新 Engagement Index (学习投入度指数)，采用移动平均法
    engagement_emotion_score = sum(msg.emotion_scores.get(e, 0) * w for msg in messages for e, w in ENGAGEMENT_EMOTIONS.items()) / new_messages_count
    current_engagement = (engagement_emotion_score + np.mean([m.arousal for m in messages]) + np.mean([m.dominance for m in messages])) / 3
    new_engagement_index = (old_profile.engagement_index * old_profile.total_conversations + current_engagement) / new_total_conversations
    logger.info(f"更新投入度指数: 本次会话得分={current_engagement:.2f}, 新的长期指数={new_engagement_index:.2f}")

    # c) 更新 Frustration Index (学习挫败感指数)，采用移动平均法
    frustration_emotion_score = sum(msg.emotion_scores.get(e, 0) * w for msg in messages for e, w in FRUSTRATION_EMOTIONS.items()) / new_messages_count
    current_frustration = (frustration_emotion_score + (1 - np.mean([m.valence for m in messages])) / 2 + (1 - np.mean([m.dominance for m in messages]))) / 2.5
    new_frustration_index = (old_profile.frustration_index * old_profile.total_conversations + current_frustration) / new_total_conversations
    logger.info(f"更新挫败感指数: 本次会话得分={current_frustration:.2f}, 新的长期指数={new_frustration_index:.2f}")

    # d) 更新 Stability Baseline (长期稳定性基线)，采用移动平均法
    current_conversation = db.query(Conversation).filter(Conversation.conversation_id == conversation_id).first()
    current_stability = current_conversation.sentiment_stability if current_conversation else 0.5
    new_stability_baseline = (old_profile.stability_baseline * old_profile.total_conversations + current_stability) / new_total_conversations
    logger.info(f"更新稳定性基线: 本次会话得分={current_stability:.2f}, 新的长期基线={new_stability_baseline:.2f}")

    # e) 更新 Emotion Distribution (情感分布计数)
    new_dist = old_profile.emotion_distribution.copy()
    current_dist = Counter([m.primary_emotion for m in messages])
    for emotion, count in current_dist.items():
        new_dist[emotion] = new_dist.get(emotion, 0) + count
    
    # 5. 准备用于写入数据库的最终数据字典
    profile_data = {
        "last_updated_at": datetime.utcnow(),
        "total_conversations": new_total_conversations,
        "total_messages": new_total_messages,
        "sentiment_baseline": new_baseline,
        "engagement_index": min(max(new_engagement_index, 0), 1),
        "frustration_index": min(max(new_frustration_index, 0), 1),
        "stability_baseline": min(max(new_stability_baseline, 0), 1),
        "profile_confidence": 1 - (1 / (new_total_conversations + 1)),
        "emotion_distribution": new_dist,
        
        # 以下字段在本次迭代中暂时维持原样，作为未来扩展的占位符
        "emotional_transitions": old_profile.emotional_transitions,
        "anomaly_frequency": old_profile.anomaly_frequency,
        "common_anomaly_types": old_profile.common_anomaly_types,
    }

    # 6. 调用 CRUD 函数，将计算出的新画像数据写入数据库
    logger.info(f"正在将更新后的画像数据写入数据库...")
    updated_profile = crud_profile.create_or_update_profile(db, user_id=user_id, profile_data=profile_data)
    logger.info(f"用户 {user_id} 的画像更新成功！")
    
    return updated_profile