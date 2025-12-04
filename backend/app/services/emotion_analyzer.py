from typing import Dict, Any, List, Optional

# ==============================================================================
# 预设的示例对话数据
# ------------------------------------------------------------------------------
# 结构:
#   - user_text (str): 预设的学生问题。
#   - bot_response (str): 预设的机器人回复。
#   - analysis (dict): 针对该 user_text 的预设情感分析结果。
# ==============================================================================
PRESET_CONVERSATIONS: List[Dict[str, Any]] = [
    # --- 对话 1: 物理“浮力” - U型反转 ---
    {
        "user_text": "我们今天学了浮力，但我还是不太明白，为什么大铁船能浮在水上，小铁钉却会沉下去呢？",
        "bot_response": "这是一个非常好的问题！很多人刚学浮力时都有这个困惑。我们一步步来看，你觉得决定一个东西是浮是沉的关键是什么呢？",
        "analysis": {"emotion_scores": {"困惑": 0.85, "好奇": 0.4, "沮丧": 0.1, "兴奋": 0.1, "自信": 0.1, "焦虑": 0.2, "愤怒": 0.1, "厌倦": 0.1}, "primary_emotion": "困惑", "valence": -0.2, "arousal": 0.5, "dominance": 0.3}
    },
    {
        "user_text": "嗯...是重量吗？船那么重，应该会沉啊...",
        "bot_response": "重量确实是其中一个因素，但不是全部。除了向下的重力，物体在水里还会受到一个向上的力，这个力叫什么？",
        "analysis": {"emotion_scores": {"困惑": 0.7, "沮丧": 0.3, "焦虑": 0.2, "兴奋": 0.1, "自信": 0.1, "好奇": 0.1, "愤怒": 0.1, "厌倦": 0.1}, "primary_emotion": "困惑", "valence": -0.4, "arousal": 0.4, "dominance": 0.2}
    },
    {
        "user_text": "啊，是浮力！但我还是没想通，浮力到底是怎么回事...感觉好抽象。",
        "bot_response": "一点没错！我们来把它变具体。想象一下，你把一个皮球按进水里，是不是感觉水在往上推你的手？这个“推力”就是浮力。",
        "analysis": {"emotion_scores": {"沮丧": 0.6, "困惑": 0.5, "焦虑": 0.4, "兴奋": 0.1, "自信": 0.1, "好奇": 0.1, "愤怒": 0.1, "厌倦": 0.1}, "primary_emotion": "沮丧", "valence": -0.6, "arousal": 0.5, "dominance": 0.1}
    },
    {
        "user_text": "好像有点理解了。那这个推力的大小和什么有关呢？",
        "bot_response": "问到点子上了！这个推力的大小，等于物体“排开”的水的重量。这就是阿基米德原理。大船虽然重，但它排开的水更多，获得的浮力也更大！",
        "analysis": {"emotion_scores": {"好奇": 0.8, "困惑": 0.3, "兴奋": 0.2, "沮丧": 0.1, "自信": 0.1, "焦虑": 0.1, "愤怒": 0.1, "厌倦": 0.1}, "primary_emotion": "好奇", "valence": 0.3, "arousal": 0.7, "dominance": 0.4}
    },
    {
        "user_text": "哦！我好像有点明白了！船是空心的，体积很大，所以能排开很多水！铁钉是实心的，体积很小，排开的水就很少！是这个意思吗？！",
        "bot_response": "完全正确！你总结得太棒了！正是因为船的“空心”结构让它的平均密度变得比水小，所以它能排开足够多的水来支撑自身的重量。",
        "analysis": {"emotion_scores": {"兴奋": 0.9, "自信": 0.5, "好奇": 0.3, "困惑": 0.1, "沮丧": 0.1, "焦虑": 0.1, "愤怒": 0.1, "厌倦": 0.1}, "primary_emotion": "兴奋", "valence": 0.8, "arousal": 0.8, "dominance": 0.7}
    },
    {
        "user_text": "哈哈，原来是这样！我彻底懂了！谢谢！",
        "bot_response": "不客气！能靠自己想明白，你非常厉害！以后遇到类似问题，都可以从“受力分析”和“阿基米德原理”这两个角度来思考。",
        "analysis": {"emotion_scores": {"自信": 0.8, "兴奋": 0.6, "好奇": 0.2, "困惑": 0.1, "沮丧": 0.1, "焦虑": 0.1, "愤怒": 0.1, "厌倦": 0.1}, "primary_emotion": "自信", "valence": 0.7, "arousal": 0.6, "dominance": 0.8}
    },
    # --- 对话 2: 代数“因式分解” - 持续挫败 ---
    {
        "user_text": "因式分解好难啊，我看到 x² - 5x + 6 这种就头疼。",
        "bot_response": "别担心，这是十字相乘法的典型应用。我们找两个数，它们相乘等于6，相加等于-5。你觉得是哪两个数呢？",
        "analysis": {"emotion_scores": {"焦虑": 0.7, "困惑": 0.4, "沮丧": 0.2, "兴奋": 0.1, "自信": 0.1, "好奇": 0.1, "愤怒": 0.1, "厌倦": 0.1}, "primary_emotion": "焦虑", "valence": -0.5, "arousal": 0.6, "dominance": 0.2}
    },
    {
        "user_text": "相乘等于6...1和6？2和3？相加等于-5...我想不出来...",
        "bot_response": "提示一下，两个数可以是负数哦。",
        "analysis": {"emotion_scores": {"焦虑": 0.8, "沮丧": 0.5, "困惑": 0.3, "兴奋": 0.1, "自信": 0.1, "好奇": 0.1, "愤怒": 0.1, "厌倦": 0.1}, "primary_emotion": "焦虑", "valence": -0.7, "arousal": 0.7, "dominance": 0.1}
    },
    {
        "user_text": "烦死了！我就是不会！为什么要有这么难的东西！",
        "bot_response": "我理解你的感受。遇到困难时感到烦躁是很正常的。我们换个思路，-2 和 -3 怎么样？它们相乘是6，相加是-5。",
        "analysis": {"emotion_scores": {"愤怒": 0.7, "焦虑": 0.6, "沮丧": 0.3, "兴奋": 0.1, "自信": 0.1, "好奇": 0.1, "困惑": 0.1, "厌倦": 0.1}, "primary_emotion": "愤怒", "valence": -0.8, "arousal": 0.8, "dominance": 0.4}
    },
    {
        "user_text": "...好吧。那 x² - 5x + 6 就等于 (x-2)(x-3)？",
        "bot_response": "正是如此！你已经掌握了最关键的一步。要不要再试一个类似的题目来巩固一下？",
        "analysis": {"emotion_scores": {"厌倦": 0.6, "沮丧": 0.5, "焦虑": 0.2, "兴奋": 0.1, "自信": 0.1, "好奇": 0.1, "愤怒": 0.1, "困惑": 0.1}, "primary_emotion": "厌倦", "valence": -0.6, "arousal": 0.3, "dominance": 0.2}
    },
    {
        "user_text": "不想做了，没意思。",
        "bot_response": "好的，那我们今天就先到这里。有时候休息一下，换个脑子再回来看，思路会更清晰。你已经很努力了。",
        "analysis": {"emotion_scores": {"厌倦": 0.7, "沮丧": 0.4, "焦虑": 0.1, "兴奋": 0.1, "自信": 0.1, "好奇": 0.1, "愤怒": 0.1, "困惑": 0.1}, "primary_emotion": "厌倦", "valence": -0.5, "arousal": 0.2, "dominance": 0.3}
    },
    # --- 对话 3: 探索“黑洞” - 高投入 ---
    {
        "user_text": "我最近看科幻电影，里面总说黑洞，黑洞到底是什么东西呀？",
        "bot_response": "很好的问题！简单来说，黑洞是宇宙中一个引力极强的地方，强到连光都无法逃脱。你对它的哪个方面最感兴趣呢？",
        "analysis": {"emotion_scores": {"好奇": 0.9, "兴奋": 0.4, "自信": 0.2, "困惑": 0.1, "沮丧": 0.1, "焦虑": 0.1, "愤怒": 0.1, "厌倦": 0.1}, "primary_emotion": "好奇", "valence": 0.6, "arousal": 0.7, "dominance": 0.5}
    },
    {
        "user_text": "哇！连光都跑不掉！那它是怎么形成的？",
        "bot_response": "它通常是由非常非常巨大的恒星在生命末期坍缩形成的。想象一下把整个太阳压缩到一个城市那么大，它的引力就会变得无比巨大！",
        "analysis": {"emotion_scores": {"兴奋": 0.8, "好奇": 0.6, "自信": 0.3, "困惑": 0.1, "沮丧": 0.1, "焦虑": 0.1, "愤怒": 0.1, "厌倦": 0.1}, "primary_emotion": "兴奋", "valence": 0.8, "arousal": 0.8, "dominance": 0.6}
    },
    {
        "user_text": "太酷了！那如果我们掉进黑洞会发生什么？",
        "bot_response": "这是一个科学家们也很着迷的问题！你会经历一个叫做“面条化”的过程，因为脚和头感受到的引力差异巨大，身体会被拉得像一根面条。",
        "analysis": {"emotion_scores": {"兴奋": 0.9, "好奇": 0.7, "自信": 0.4, "困惑": 0.1, "沮丧": 0.1, "焦虑": 0.1, "愤怒": 0.1, "厌倦": 0.1}, "primary_emotion": "兴奋", "valence": 0.9, "arousal": 0.9, "dominance": 0.7}
    },
    {
        "user_text": "听起来有点可怕但又很神奇。我好像进入了一个新世界。",
        "bot_response": "的确如此。探索宇宙就是这样，充满了未知和惊喜。我们刚才讨论的内容，其实和爱因斯坦的广义相对论紧密相关。",
        "analysis": {"emotion_scores": {"自信": 0.7, "兴奋": 0.6, "好奇": 0.5, "困惑": 0.1, "沮丧": 0.1, "焦虑": 0.1, "愤怒": 0.1, "厌倦": 0.1}, "primary_emotion": "自信", "valence": 0.7, "arousal": 0.6, "dominance": 0.8}
    },
]

DEFAULT_RESPONSE = {
    "bot_response": "抱歉，我暂时无法理解这个问题。我们可以聊聊关于“浮力”、“因式分解”或者“黑洞”的话题吗？",
    "analysis": {
        "emotion_scores": {"困惑": 0.7, "焦虑": 0.2, "兴奋": 0.1, "自信": 0.1, "好奇": 0.1, "沮丧": 0.1, "愤怒": 0.1, "厌倦": 0.1}, 
        "primary_emotion": "困惑", 
        "valence": -0.1, 
        "arousal": 0.3, 
        "dominance": 0.4
    }
}

def _get_similarity(text1: str, text2: str, prefix_length: int = 10) -> float:
    """
    一个非常简单的模糊匹配函数。
    比较两个字符串前 N 个字符的重合度。
    """
    t1 = text1[:prefix_length]
    t2 = text2[:prefix_length]
    
    # 使用集合计算交集的大小
    set1 = set(t1)
    set2 = set(t2)
    
    intersection_len = len(set1.intersection(set2))
    union_len = len(set1.union(set2))
    
    if union_len == 0:
        return 1.0 if t1 == t2 else 0.0
        
    return intersection_len / union_len


def find_best_match(user_input: str) -> Optional[Dict[str, Any]]:
    """
    在预设的问答列表中，查找与用户输入最匹配的条目。
    """
    best_score = 0.0
    best_match = None
    
    # 设定一个匹配阈值，低于这个分数则认为没有匹配上
    MATCH_THRESHOLD = 0.4 
    
    for qa_pair in PRESET_CONVERSATIONS:
        score = _get_similarity(user_input, qa_pair["user_text"])
        if score > best_score:
            best_score = score
            best_match = qa_pair
            
    if best_score >= MATCH_THRESHOLD:
        return best_match
    
    return None


def get_scripted_response(text: str) -> Dict[str, Any]:
    """
    模拟大模型调用。
    根据用户输入的文本，从预设数据中查找最匹配的回复和情感分析结果。
    """
    # 1. 查找最佳匹配
    matched_qa = find_best_match(text)
    
    if matched_qa:
        response_data = matched_qa
    else:
        # 2. 如果没有找到匹配项，返回默认回复
        response_data = DEFAULT_RESPONSE
        
    # 3. 补充固定的分析元数据
    # 使用 .copy() 以免修改原始的 PRESET_CONVERSATIONS 数据
    final_analysis = response_data["analysis"].copy()
    final_analysis["confidence_score"] = 0.95 if matched_qa else 0.50
    final_analysis["analysis_model"] = "EmotionAnalyzer_v1.0"
    
    return {
        "bot_response": response_data["bot_response"],
        "analysis": final_analysis
    }