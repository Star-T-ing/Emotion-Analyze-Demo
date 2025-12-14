import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, MessageRole, DemoScenario } from './types';
import { DEMO_SCENARIOS } from './constants';
import { getEmotionalAnalysis, streamEmpathyResponse } from './services/qwenService';
import { isAudioSilent } from './services/audioService';
import AudioRecorder from './components/AudioRecorder';
import ChatMessageBubble from './components/ChatMessageBubble';

const App: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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

    const audioUrl = audioBlob ? URL.createObjectURL(audioBlob) : undefined;

    const newUserMsg: ChatMessage = {
      id: Date.now().toString(),
      role: MessageRole.USER,
      text: text || '',
      audioUrl: audioUrl,
      isAudioMessage: !!audioBlob,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, newUserMsg]);

    try {
      const analysis = await getEmotionalAnalysis({ text, audio: audioBlob }, []);

      const modelMsgId = (Date.now() + 1).toString();
      const newModelMsg: ChatMessage = {
        id: modelMsgId,
        role: MessageRole.MODEL,
        text: '',
        analysis: analysis,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, newModelMsg]);

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
        () => { setIsLoading(false); },
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

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50 font-sans">
      <aside className="w-full md:w-80 bg-white border-r border-slate-200 flex flex-col z-10 shadow-lg md:shadow-none">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383-.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" /></svg></div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">共情 AI</h1>
          </div>
          <p className="text-xs text-slate-500">多模态情感分析与支持助手</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 px-2">尝试演示场景</h2>
          <div className="space-y-3">
            {DEMO_SCENARIOS.map(scenario => (
              <button key={scenario.id} onClick={() => loadDemo(scenario)} disabled={isLoading} className="w-full text-left p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all group disabled:opacity-50">
                <div className="flex items-center gap-3">
                  <span className="text-2xl group-hover:scale-110 transition-transform">{scenario.icon}</span>
                  <div>
                    <h3 className="font-semibold text-slate-700 text-sm">{scenario.title}</h3>
                    <p className="text-xs text-slate-500 line-clamp-1">{scenario.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="p-4 border-t border-slate-100 bg-slate-50">
          <div className="text-xs text-slate-400 text-center">由 Qwen-Omni-Flash 驱动</div>
        </div>
      </aside>
      <main className="flex-1 flex flex-col h-full relative">
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50/50">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
              <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mb-6"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-indigo-500"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg></div>
              <h2 className="text-2xl font-semibold text-slate-800 mb-2">今天感觉怎么样？</h2>
              <p className="max-w-md text-slate-500">我可以倾听你的声音或阅读你的文字。我会用心感受你的情绪，并给予回应。</p>
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
            <div className="text-center mt-2"><p className="text-[10px] text-slate-400">共情 AI 可能会产生关于人物、地点或事实的不准确信息。</p></div>
          </div>
        </div>
      </main>
    </div>
  );
};
export default App;