import React from 'react';

interface EmotionScores {
  困惑?: number;
  好奇?: number;
  沮丧?: number;
  兴奋?: number;
  自信?: number;
  焦虑?: number;
  愤怒?: number;
  厌倦?: number;
}

interface VADScores {
  Valence?: number;
  Arousal?: number;
  Dominance?: number;
}

interface ParsedAnalysis {
  emotionalAnalysis: string;
  eightEmotions: EmotionScores;
  vadDimensions: VADScores;
  responseStyle: string;
}

interface Props {
  analysis: string | undefined;
}

const ThinkingProcessSidebar: React.FC<Props> = ({ analysis }) => {
  // Use React.useMemo to prevent infinite re-parsing
  const parseAnalysis = React.useMemo(() => {
    return (text: string): ParsedAnalysis | null => {
      if (!text) {
        console.log('[ThinkingProcessSidebar] No analysis text provided');
        return null;
      }

      console.log('[ThinkingProcessSidebar] Parsing analysis:', text.substring(0, 200) + '...');

      try {
        // Updated regex to handle newlines and indentation after the label
        // Format: "情感分析:\n  content..."
        const emotionalAnalysisMatch = text.match(/情感分析:\s*\n\s*([\s\S]*?)(?=情感量化得分:|$)/);
        const emotionScoresMatch = text.match(/情感量化得分:\s*\n?\s*(\{[\s\S]*?\n\})/);
        const responseStyleMatch = text.match(/共情回复语气:\s*\n\s*([\s\S]*?)$/);

        console.log('[ThinkingProcessSidebar] Regex matches:', {
          hasEmotionalAnalysis: !!emotionalAnalysisMatch,
          hasEmotionScores: !!emotionScoresMatch,
          hasResponseStyle: !!responseStyleMatch,
          emotionalAnalysisPreview: emotionalAnalysisMatch?.[1]?.substring(0, 50),
          emotionScoresPreview: emotionScoresMatch?.[1]?.substring(0, 50)
        });

        let eightEmotions: EmotionScores = {};
        let vadDimensions: VADScores = {};

        if (emotionScoresMatch) {
          const jsonStr = emotionScoresMatch[1].trim();
          console.log('[ThinkingProcessSidebar] JSON string to parse:', jsonStr);
          const parsed = JSON.parse(jsonStr);
          eightEmotions = parsed['八大情绪'] || parsed['eightEmotions'] || {};
          vadDimensions = parsed['VAD情感维度'] || parsed['VAD'] || {};
          console.log('[ThinkingProcessSidebar] Parsed emotions:', { eightEmotions, vadDimensions });
        }

        const result = {
          emotionalAnalysis: emotionalAnalysisMatch?.[1]?.trim() || '',
          eightEmotions,
          vadDimensions,
          responseStyle: responseStyleMatch?.[1]?.trim() || ''
        };

        console.log('[ThinkingProcessSidebar] Parse result:', result);
        return result;
      } catch (error) {
        console.error('[ThinkingProcessSidebar] Failed to parse analysis:', error);
        console.error('[ThinkingProcessSidebar] Raw text:', text);
        return null;
      }
    };
  }, []);

  const parsed = React.useMemo(() => {
    return analysis ? parseAnalysis(analysis) : null;
  }, [analysis, parseAnalysis]);
  
  React.useEffect(() => {
    console.log('[ThinkingProcessSidebar] Render state:', { 
      hasAnalysis: !!analysis, 
      hasParsed: !!parsed,
      analysisLength: analysis?.length 
    });
  }, [analysis, parsed]);

  if (!parsed) {
    return (
      <aside className="w-96 bg-gradient-to-b from-slate-50 to-white border-l border-slate-200 flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <span className="text-xl">🧠</span>
            思考过程
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {analysis ? (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700 mb-3 text-amber-600">
                ⚠️ 解析失败 - 显示原始数据
              </h3>
              <pre className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed overflow-auto max-h-96">
                {analysis}
              </pre>
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center">发送消息后将显示情感分析</p>
          )}
        </div>
      </aside>
    );
  }

  const emotionColors: Record<string, string> = {
    困惑: 'bg-purple-100 text-purple-700 border-purple-200',
    好奇: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    沮丧: 'bg-blue-100 text-blue-700 border-blue-200',
    兴奋: 'bg-orange-100 text-orange-700 border-orange-200',
    自信: 'bg-green-100 text-green-700 border-green-200',
    焦虑: 'bg-red-100 text-red-700 border-red-200',
    愤怒: 'bg-rose-100 text-rose-700 border-rose-200',
    厌倦: 'bg-gray-100 text-gray-700 border-gray-200'
  };

  const getEmotionIcon = (emotion: string): string => {
    const icons: Record<string, string> = {
      困惑: '😕',
      好奇: '🤔',
      沮丧: '😔',
      兴奋: '🤩',
      自信: '😊',
      焦虑: '😰',
      愤怒: '😠',
      厌倦: '😑'
    };
    return icons[emotion] || '💭';
  };

  const getVADColor = (value: number): string => {
    if (value > 0.3) return 'bg-green-500';
    if (value > 0) return 'bg-yellow-500';
    if (value > -0.3) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getVADLabel = (key: string): string => {
    const labels: Record<string, string> = {
      Valence: '愉悦度',
      Arousal: '激活度',
      Dominance: '支配度'
    };
    return labels[key] || key;
  };

  return (
    <aside className="w-96 bg-gradient-to-b from-slate-50 to-white border-l border-slate-200 flex flex-col overflow-hidden">
      <div className="p-6 border-b border-slate-200 bg-white">
        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <span className="text-xl">🧠</span>
          思考过程
        </h2>
        <p className="text-xs text-slate-500 mt-1">大模型情感理解与共情分析</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* 情感分析 */}
        {parsed.emotionalAnalysis && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-gradient-to-br from-pink-400 to-rose-400 rounded-lg flex items-center justify-center text-white text-xs">💡</span>
              情感分析
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">{parsed.emotionalAnalysis}</p>
          </div>
        )}

        {/* 八大情绪 */}
        {Object.keys(parsed.eightEmotions).length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-gradient-to-br from-indigo-400 to-purple-400 rounded-lg flex items-center justify-center text-white text-xs">📊</span>
              情绪量化
            </h3>
            <div className="space-y-2">
              {Object.entries(parsed.eightEmotions)
                .sort(([, a], [, b]) => (b || 0) - (a || 0))
                .map(([emotion, score]) => (
                  <div key={emotion} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 font-medium text-slate-700">
                        <span>{getEmotionIcon(emotion)}</span>
                        {emotion}
                      </span>
                      <span className="font-semibold text-slate-600">{((score || 0) * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          (score || 0) > 0.6 ? 'bg-gradient-to-r from-rose-400 to-pink-500' :
                          (score || 0) > 0.3 ? 'bg-gradient-to-r from-amber-400 to-orange-500' :
                          'bg-gradient-to-r from-slate-300 to-slate-400'
                        }`}
                        style={{ width: `${(score || 0) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* VAD 情感维度 */}
        {Object.keys(parsed.vadDimensions).length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-gradient-to-br from-cyan-400 to-blue-400 rounded-lg flex items-center justify-center text-white text-xs">📈</span>
              VAD 维度
            </h3>
            <div className="space-y-3">
              {Object.entries(parsed.vadDimensions).map(([key, value]) => (
                <div key={key} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">{getVADLabel(key)}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      (value || 0) > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {(value || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-0.5 h-full bg-slate-300" />
                    </div>
                    <div
                      className={`absolute h-full ${getVADColor(value || 0)} transition-all duration-500`}
                      style={{
                        left: (value || 0) < 0 ? `${50 + (value || 0) * 50}%` : '50%',
                        right: (value || 0) > 0 ? `${50 - (value || 0) * 50}%` : '50%'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 回复语气 */}
        {parsed.responseStyle && (
          <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl p-4 border border-pink-100">
            <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <span className="w-6 h-6 bg-gradient-to-br from-pink-400 to-rose-500 rounded-lg flex items-center justify-center text-white text-xs">💬</span>
              回复语气
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">{parsed.responseStyle}</p>
          </div>
        )}
      </div>
    </aside>
  );
};

export default ThinkingProcessSidebar;
