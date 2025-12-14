import logging
from datetime import datetime
from typing import Dict, Any, List
import numpy as np
from sqlalchemy.orm import Session

from app.crud import crud_message, crud_conversation
from app.models.message_model import Message
from app.models.anomaly_model import Anomaly
from app.models.conversation_model import CognitiveState
from app.services import emotion_analyzer, anomaly_detector

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def analyze_and_update(db: Session, *, conversation_id: str, user_id: str, text: str) -> Dict[str, Any]:
    """
    处理新消息的核心服务函数。

    该函数执行以下一系列操作：
    1. 调用情感分析器获取分析结果和机器人回复。
    2. 从数据库获取当前对话的历史消息。
    3. 创建并存储新的消息记录。
    4. 基于完整的消息历史，全量重新计算会话的聚合指标。
    5. 创建或更新会话记录。
    6. 实时检测异常并获取刚刚为本条消息创建的异常
    7. 返回一个包含新消息、更新后会话和机器人回复的统一响应体。
    """
    logger.info(f"开始分析新消息. Conversation ID: {conversation_id[:8]}, User ID: {user_id}")

    # 1. 调用情感分析模拟器，获取分析数据和机器人回复
    scripted_response = emotion_analyzer.get_scripted_response(text)
    analysis_result = scripted_response["analysis"]
    bot_response_text = scripted_response["bot_response"]
    logger.info(f"模拟模型分析完成. 主导情感: {analysis_result['primary_emotion']}")

    # 2. 从数据库获取当前会话的所有历史消息
    messages = crud_message.get_messages_by_conversation_id(db, conversation_id)
    logger.info(f"获取到 {len(messages)} 条历史消息。")

    # 3. 创建新的 Message 记录
    new_sequence = len(messages) + 1
    new_message = crud_message.create_message(
        db,
        analysis_result=analysis_result,
        conversation_id=conversation_id,
        user_id=user_id,
        sequence=new_sequence
    )
    logger.info(f"新消息已创建并存入数据库. Message ID: {new_message.message_id}, Sequence: {new_sequence}")

    # 将新创建的消息加入到消息列表中，以便进行接下来的聚合计算
    messages.append(new_message)

    # 4. 基于完整的消息历史，全量计算会话的聚合指标
    conversation_analysis_data = _calculate_conversation_metrics(messages)
    logger.info(f"会话聚合指标计算完成. 新的总消息数: {conversation_analysis_data['update_data']['total_messages']}")

    # 5. 在数据库中创建或更新 Conversation 记录
    conversation = crud_conversation.create_or_update_conversation(
        db,
        conversation_id=conversation_id,
        user_id=user_id,
        analysis_data=conversation_analysis_data
    )
    logger.info(f"会话数据已更新. 最新更新时间: {conversation.last_updated_at}")

    # 6. 实时检测异常，并获取新消息相关的异常
    anomaly_detector.detect_anomalies(db, messages)
    new_anomalies = db.query(Anomaly).filter(Anomaly.message_id == new_message.message_id).all()
    
    # 7. 返回结果
    return {
        "message": new_message,
        "conversation": conversation,
        "bot_response": bot_response_text,
        "anomalies": new_anomalies 
    }



def _calculate_conversation_metrics(messages: List[Message]) -> Dict[str, Any]:
    """
    一个私有辅助函数，根据一个会话的所有消息，全量计算聚合指标。
    采用全量计算可以保证逻辑的简单性和结果的精确性，适合会话长度有限的场景。
    """
    if not messages:
        # 处理边界情况：如果没有任何消息
        return {
            "start_time": datetime.utcnow(),
            "update_data": {
                "duration_minutes": 0,
                "total_messages": 0,
                "dominant_emotion": "N/A",
                "sentiment_stability": 1.0,
                "valence_trend": "stable",
                "emotion_trajectory": [],
                "peak_sentiment": {"positive": None, "negative": None},
            }
        }
    
    # 提取所有消息的情感数据用于计算
    primary_emotions = [msg.primary_emotion for msg in messages]
    valences = [msg.valence for msg in messages]
    arousals = [msg.arousal for msg in messages]
    dominances = [msg.dominance for msg in messages]

    # dominant_emotion (最频繁出现的主导情感)
    dominant_emotion = max(set(primary_emotions), key=primary_emotions.count)

    # sentiment_stability (基于连续消息VAD向量的欧氏距离)
    stability = 1.0
    if len(messages) > 1:
        distances = []
        for i in range(len(messages) - 1):
            p1 = np.array([valences[i], arousals[i], dominances[i]])
            p2 = np.array([valences[i + 1], arousals[i + 1], dominances[i + 1]])
            distances.append(np.linalg.norm(p1 - p2))
        avg_distance = np.mean(distances) if distances else 0
        stability = 1 / (1 + avg_distance)

    # valence_trend (基于愉悦度值的线性回归斜率)
    trend = "平稳"
    if len(valences) > 2: # 至少需要3个点才能看出趋势
        sequences = np.arange(len(valences))
        slope, _ = np.polyfit(sequences, valences, 1)
        if slope > 0.1: trend = "上升"
        elif slope < -0.1: trend = "下降"
    
    # emotion_trajectory (情感轨迹)
    trajectory = [{"seq": msg.sequence, "emotion": msg.primary_emotion, "score": max(msg.emotion_scores.values())} for msg in messages]

    # peak_sentiment (正负向情感峰值)
    peak_pos_msg = max(messages, key=lambda msg: msg.valence)
    peak_neg_msg = min(messages, key=lambda msg: msg.valence)
    peak_sentiment = {
        "positive": {"message_id": peak_pos_msg.message_id, "valence": peak_pos_msg.valence},
        "negative": {"message_id": peak_neg_msg.message_id, "valence": peak_neg_msg.valence}
    }

    # cognitive_state (认知状态)
    last_message = messages[-1]
    cognitive_state = CognitiveState.exploring # 默认状态为“探索中”

    if last_message.primary_emotion in ["自信", "兴奋"]:
        cognitive_state = CognitiveState.mastered
    elif last_message.primary_emotion in ["沮丧", "愤怒", "厌倦", "焦虑"]:
        cognitive_state = CognitiveState.struggling
    # 如果是 "困惑" 或 "好奇"，则保持 "探索中" 的状态
    
    start_time = messages[0].timestamp
    # 使用最后一条消息的时间戳来计算时长，更精确
    duration = (messages[-1].timestamp - start_time).total_seconds() / 60

    return {
        "start_time": start_time,
        "update_data": {
            "duration_minutes": int(round(duration)),
            "total_messages": len(messages),
            "dominant_emotion": dominant_emotion,
            "sentiment_stability": stability,
            "valence_trend": trend,
            "emotion_trajectory": trajectory,
            "peak_sentiment": peak_sentiment,
            "cognitive_state": cognitive_state
        }
    }