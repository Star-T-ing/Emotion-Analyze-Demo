import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, MessageRole, DemoScenario } from './types';
import { DEMO_SCENARIOS } from './constants';
import { getEmotionalAnalysis, streamEmpathyResponse } from './services/qwenService';
import { isAudioSilent } from './services/audioService';
import AudioRecorder from './components/AudioRecorder';
import ChatMessageBubble from './components/ChatMessageBubble';
import ThinkingProcessSidebar from './components/ThinkingProcessSidebar';

const App: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModality, setSelectedModality] = useState<string | null>(null);
  const [currentAnalysis, setCurrentAnalysis] = useState<string | undefined>(undefined);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (params: { text?: string, audioBlob?: Blob }) => {
    const { text, audioBlob } = params;
    if ((!text || !text.trim()) && !audioBlob) return;
    
    setIsLoading(true);
    setInputVal('');

    // **FIX**: The definitive fix for the TypeScript type error.
    // We add an explicit type annotation to the 'role' constant.
    const history = messages
      .filter(msg => msg.role === MessageRole.USER || msg.role === MessageRole.MODEL)
      .map(msg => {
        const role: 'user' | 'assistant' = msg.role === MessageRole.MODEL ? 'assistant' : 'user';
        const content = msg.text || '(用户发送了一段语音)';
        return { role, content };
      });

    // User audio is already in a playable format (WebM, WAV, etc.), so we can use it directly
    const audioUrl = audioBlob ? URL.createObjectURL(audioBlob) : undefined;

    const newUserMsg: ChatMessage = {
      id: Date.now().toString(),
      role: MessageRole.USER,
      text: text || '',
      audioUrl: audioUrl,
      isAudioMessage: !!audioBlob,
      timestamp: Date.now()
    };
    
    console.log('[DEBUG] User message created:', {
      hasText: !!text,
      hasAudioBlob: !!audioBlob,
      audioUrl: audioUrl,
      audioBlobType: audioBlob?.type,
      audioBlobSize: audioBlob?.size
    });
    
    setMessages(prev => [...prev, newUserMsg]);

    try {
      const analysis = await getEmotionalAnalysis({ text, audio: audioBlob }, []);
      
      console.log('[App] Received analysis from API:', {
        length: analysis.length,
        preview: analysis.substring(0, 200),
        full: analysis
      });

      const modelMsgId = (Date.now() + 1).toString();
      const newModelMsg: ChatMessage = {
        id: modelMsgId,
        role: MessageRole.MODEL,
        text: '',
        analysis: analysis,
        isAudioGenerating: true,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, newModelMsg]);
      setCurrentAnalysis(analysis);
      
      console.log('[App] Set currentAnalysis state:', {
        length: analysis.length,
        preview: analysis.substring(0, 100)
      });

      const userInputText = [text, audioBlob ? '（用户通过语音表达了他们的感受）' : ''].filter(Boolean).join('\n');
      
      await streamEmpathyResponse(
        userInputText,
        analysis,
        history, 
        (chunk) => {
          setMessages(prev => prev.map(msg =>
            msg.id === modelMsgId ? { ...msg, text: msg.text + chunk } : msg
          ));
        },
        (audioUrl) => { 
          setMessages(prev => prev.map(msg =>
            msg.id === modelMsgId ? { ...msg, audioUrl, isAudioGenerating: false } : msg
          ));
          setIsLoading(false); 
        },
        (error) => {
          console.error(error);
          setMessages(prev => prev.map(msg =>
            msg.id === modelMsgId ? { ...msg, text: `抱歉，生成回复时出错: ${error.message}` } : msg
          ));
          setIsLoading(false);
        }
      );

    } catch (error) {
      console.error(error);
      const errorText = error instanceof Error ? error.message : "未知错误";
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: MessageRole.SYSTEM,
        text: `处理时出错: ${errorText}`,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMsg]);
      setIsLoading(false);
    }
  };

  const loadDemo = async (scenario: DemoScenario) => {
    if (isLoading) return;
    setMessages([]);

    if (scenario.demoAudioUrl) {
      try {
        setIsLoading(true);
        const response = await fetch(scenario.demoAudioUrl);
        if (!response.ok) throw new Error(`无法加载音频文件: ${response.statusText}`);
        const audioBlob = await response.blob();
        handleSend({ text: scenario.initialInput, audioBlob });
      } catch (error) {
        console.error("加载演示音频失败:", error);
        setIsLoading(false);
      }
    } else {
      setInputVal(scenario.initialInput || '');
      handleSend({ text: scenario.initialInput });
    }
  };

  const handleModalityClick = (modalityType: string) => {
    if (isLoading) return;
    setMessages([]);
    setSelectedModality(modalityType);
  };

  const getModalityScenarios = (modalityType: string) => {
    return DEMO_SCENARIOS.filter((s) => s.title === modalityType);
  };
  
  const handleRecordingComplete = async (blob: Blob) => {
    setIsLoading(true);
    const isSilent = await isAudioSilent(blob);
    
    if (isSilent) {
        const errorMsg: ChatMessage = {
            id: Date.now().toString(),
            role: MessageRole.SYSTEM,
            text: "未检测到您的声音，请重试。",
            timestamp: Date.now()
        };
        setMessages(prev => [...prev, errorMsg]);
        setIsLoading(false);
        return;
    }

    handleSend({ text: inputVal, audioBlob: blob });
  };
  
  const handleTextSend = () => {
    handleSend({ text: inputVal });
  };

  const handleNewConversation = () => {
    if (isLoading) return;
    setMessages([]);
    setInputVal('');
    setSelectedModality(null);
    setCurrentAnalysis(undefined);
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      <aside className="w-64 bg-gradient-to-b from-white to-slate-50/30 border-r border-slate-200 flex flex-col z-10 shadow-lg flex-shrink-0">
        <div className="p-6 border-b border-slate-100/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-rose-400 via-pink-400 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-pink-200/50 group-hover:shadow-pink-300/60 transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 drop-shadow-sm">
                <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383-.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
              </svg>
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent"></div>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent tracking-tight">听见 · HearU</h1>
              <p className="text-xs text-slate-500 mt-0.5">倾听你的声音·理解你的情绪</p>
            </div>
          </div>
          <p className="text-base text-slate-600 leading-relaxed">在这里，你的每一份情绪都值得被看见和理解</p>
        </div>
        {messages.length > 0 && (
          <div className="px-4 pt-4">
            <button
              onClick={handleNewConversation}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:hover:shadow-md group font-medium"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 group-hover:rotate-90 transition-transform">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span>开启新对话</span>
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-4">
          <h2 className="text-xs font-semibold text-slate-500 mb-3 px-2">💭 选择输入模态</h2>
          <div className="space-y-2.5">
            {['文本模态', '音频模态', '混合模态'].map((modalityType, idx) => {
              const icon = ['📝', '🎙️', '🔀'][idx];
              const description = [
                '纯文字表达情绪和想法',
                '通过语音传达真实感受',
                '文本与语音结合表达',
              ][idx];
              const isSelected = selectedModality === modalityType;

              return (
                <button
                  key={modalityType}
                  onClick={() => handleModalityClick(modalityType)}
                  disabled={isLoading}
                  className={`w-full text-left p-3 rounded-xl hover:bg-white hover:shadow-md border transition-all group disabled:opacity-50 disabled:hover:shadow-none ${
                    isSelected
                      ? 'bg-white shadow-md border-pink-300'
                      : 'border-slate-100 hover:border-pink-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl group-hover:scale-110 transition-transform">
                      {icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-800 text-sm mb-0.5">
                        {modalityType}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        <div className="p-5 border-t border-slate-100/50 bg-gradient-to-t from-slate-50/50 to-transparent">
          <div className="text-sm text-slate-400 text-center leading-relaxed">
            <span className="inline-block">✨ 多模态情感理解助手</span>
          </div>
        </div>
      </aside>
      <main className="flex-1 flex flex-col h-full relative">
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50/50">
          {messages.length === 0 && !selectedModality ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <div className="w-28 h-28 bg-gradient-to-br from-pink-100 via-rose-100 to-indigo-100 rounded-full flex items-center justify-center mb-8 shadow-lg shadow-pink-100/50">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-12 h-12 text-pink-500"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
                  />
                </svg>
              </div>
              <h2 className="text-3xl font-semibold text-slate-800 mb-3">
                今天过得怎么样？
              </h2>
              <p className="max-w-lg text-base text-slate-600 leading-relaxed mb-2">
                无论是开心、难过、焦虑还是困惑
              </p>
              <p className="max-w-lg text-base text-slate-600 leading-relaxed">
                我都在这里，用心倾听你的每一个字、每一句话
              </p>
              <div className="mt-8 flex items-center gap-2 text-sm text-slate-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-5 h-5"
                >
                  <path d="M3.505 2.365A41.369 41.369 0 019 2c1.863 0 3.697.124 5.495.365 1.247.167 2.18 1.108 2.435 2.268a4.45 4.45 0 00-.577-.069 43.141 43.141 0 00-4.706 0C9.229 4.696 7.5 6.727 7.5 8.998v2.24c0 1.413.67 2.735 1.76 3.562l-2.98 2.98A.75.75 0 015 17.25v-3.443c-.501-.048-1-.106-1.495-.172C2.033 13.438 1 12.162 1 10.72V5.28c0-1.441 1.033-2.717 2.505-2.914z" />
                  <path d="M14 6c-.762 0-1.52.02-2.271.062C10.157 6.148 9 7.472 9 8.998v2.24c0 1.519 1.147 2.839 2.71 2.935.214.013.428.024.642.034.2.009.385.09.518.224l2.35 2.35a.75.75 0 001.28-.531v-2.07c1.453-.195 2.5-1.463 2.5-2.915V8.998c0-1.526-1.157-2.85-2.729-2.936A41.645 41.645 0 0014 6z" />
                </svg>
                <span>你可以打字，也可以用语音</span>
              </div>
            </div>
          ) : messages.length === 0 && selectedModality ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <div className="max-w-2xl w-full">
                <div className="mb-8">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-100 to-indigo-100 rounded-full mb-4">
                    <span className="text-2xl">
                      {selectedModality === '文本模态'
                        ? '📝'
                        : selectedModality === '音频模态'
                          ? '🎙️'
                          : '🔀'}
                    </span>
                    <span className="font-semibold text-slate-700">
                      {selectedModality}
                    </span>
                  </div>
                  <h2 className="text-2xl font-semibold text-slate-800 mb-3">
                    选择一个场景开始
                  </h2>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {getModalityScenarios(selectedModality).map((scenario) => (
                    <button
                      key={scenario.id}
                      onClick={() => loadDemo(scenario)}
                      disabled={isLoading}
                      className="group p-6 bg-white rounded-2xl border-2 border-slate-100 hover:border-pink-300 hover:shadow-lg transition-all text-left disabled:opacity-50 disabled:hover:border-slate-100 disabled:hover:shadow-none"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-100 to-indigo-100 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                          <span className="text-xl">
                            {scenario.id.includes('text')
                              ? '📝'
                              : scenario.id.includes('audio')
                                ? '🎙️'
                                : '🔀'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-800 text-lg mb-1">
                            {scenario.exampleTitle}
                          </h3>
                          {scenario.initialInput && (
                            <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">
                              {scenario.initialInput}
                            </p>
                          )}
                          {scenario.demoAudioUrl && !scenario.initialInput && (
                            <p className="text-sm text-slate-500 italic">
                              点击播放语音示例
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-pink-600 font-medium">
                        <span>开始对话</span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                        >
                          <path
                            fillRule="evenodd"
                            d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setSelectedModality(null)}
                  className="mt-6 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                >
                  ← 返回选择模态
                </button>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto">
              {messages.map(msg => (<ChatMessageBubble key={msg.id} message={msg} />))}
              {isLoading && messages[messages.length - 1]?.role !== MessageRole.MODEL && (
                <div className="flex justify-start mb-6">
                  <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-none border border-slate-100 shadow-sm flex items-center gap-2">
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms'}}></div>
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms'}}></div>
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms'}}></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        <div className="p-4 bg-white border-t border-slate-200">
          <div className="max-w-3xl mx-auto">
            <div className="relative flex items-end gap-3 bg-slate-100 p-2 rounded-3xl border border-transparent focus-within:border-indigo-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-100 transition-all">
              <div className="shrink-0 pb-1 pl-1"><AudioRecorder onRecordingComplete={handleRecordingComplete} disabled={isLoading} /></div>
              <textarea value={inputVal} onChange={(e) => setInputVal(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTextSend(); } }} placeholder="输入文字或录制语音..." disabled={isLoading} className="w-full bg-transparent border-none focus:ring-0 text-slate-800 placeholder-slate-400 resize-none py-3 max-h-32 min-h-[48px]" rows={1}/>
              <button onClick={handleTextSend} disabled={!inputVal.trim() || isLoading} className="shrink-0 mb-1 w-10 h-10 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-full flex items-center justify-center transition-colors shadow-sm"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 ml-0.5"><path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" /></svg></button>
            </div>
            <div className="text-center mt-2"><p className="text-sm text-slate-400">💡 听见 · HearU 会用心倾听和理解你，但请记得在需要时寻求专业帮助</p></div>
          </div>
        </div>
      </main>
      <ThinkingProcessSidebar analysis={currentAnalysis} />
    </div>
  );
};
export default App;