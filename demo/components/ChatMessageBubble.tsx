import React, { useState } from 'react';
import { ChatMessage, MessageRole } from '../types';
import ReactMarkdown from 'react-markdown';

interface Props {
  message: ChatMessage;
}

const ChatMessageBubble: React.FC<Props> = ({ message }) => {
  const [isAnalysisVisible, setAnalysisVisible] = useState(false);
  const isUser = message.role === MessageRole.USER;
  const isModel = message.role === MessageRole.MODEL;
  
  // Debug logging
  React.useEffect(() => {
    if (message.audioUrl) {
      console.log('[DEBUG] ChatMessageBubble rendering with audio:', {
        role: message.role,
        isUser,
        isModel,
        audioUrl: message.audioUrl,
        hasText: !!message.text,
        isAudioMessage: message.isAudioMessage
      });
    }
  }, [message.audioUrl, message.role, isUser, isModel, message.text, message.isAudioMessage]);

  const renderAnalysis = () => {
    if (!message.analysis) return null;
    return (
      <div className="mt-3 pt-3 border-t border-slate-200/80 text-xs text-slate-700">
        {/* **FIX**: Reverted this part back to a simple div with 'whitespace-pre-wrap'.
            This will render the plain text analysis report exactly as the model formatted it,
            preserving all newlines and spaces. The 'font-mono' class helps with alignment. */}
        <div className="whitespace-pre-wrap font-mono bg-slate-50 p-2 rounded">
            {message.analysis}
        </div>
      </div>
    );
  };

  // Define a wrapper class for the main reply, which might contain markdown.
  const markdownWrapperClasses = isUser 
    ? "prose prose-sm prose-invert max-w-none" 
    : "prose prose-sm max-w-none";

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] md:max-w-[70%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        <span className="text-sm text-slate-400 mb-1.5 px-1 font-medium">{isUser ? '你' : '💝 共情 AI'}</span>
        <div className={`p-4 rounded-2xl text-sm md:text-base shadow-sm ${isUser ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-br-none' : 'bg-white text-slate-800 border border-slate-100 rounded-bl-none shadow-md'}`}>
          
          {/* User audio messages - show first if present */}
          {isUser && message.audioUrl && (
            <div className="w-full not-prose">
               {!message.text?.trim() && (
                 <div className="text-sm opacity-80 mb-2 flex items-center gap-1.5">
                   <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                     <path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z" />
                     <path d="M5.5 9.643a.75.75 0 00-1.5 0V10c0 3.06 2.29 5.585 5.25 5.954V17.5h-1.5a.75.75 0 000 1.5h4.5a.75.75 0 000-1.5h-1.5v-1.546A6.001 6.001 0 0016 10v-.357a.75.75 0 00-1.5 0V10a4.5 4.5 0 01-9 0v-.357z" />
                   </svg>
                   我的语音
                 </div>
               )}
               <audio 
                 controls 
                 src={message.audioUrl}
                 preload="metadata"
               />
            </div>
          )}

          {/* Main message text: Keep using ReactMarkdown as it may contain rich text. */}
          {message.text && message.text.trim() && (
             <div className={`${markdownWrapperClasses} ${isUser && message.audioUrl ? 'mt-3' : ''}`}>
                <ReactMarkdown>{message.text}</ReactMarkdown>
             </div>
          )}

          {/* Audio generation status or player for model responses */}
          {isModel && (message.isAudioGenerating || message.audioUrl) && (
            <div className={`w-full not-prose ${message.text ? 'mt-3' : ''}`}>
              {message.isAudioGenerating && !message.audioUrl ? (
                <div className="flex items-center gap-2 text-sm text-slate-500 bg-gradient-to-r from-pink-50 to-indigo-50 px-4 py-2.5 rounded-lg border border-pink-100">
                  <svg className="animate-spin h-4 w-4 text-pink-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>正在用心准备语音回复...</span>
                </div>
              ) : message.audioUrl ? (
                <audio 
                  controls 
                  src={message.audioUrl}
                  preload="metadata"
                />
              ) : null}
            </div>
          )}
          
          {isModel && message.analysis && (
            <div className="mt-3 pt-3 border-t border-slate-200/80">
              <button onClick={() => setAnalysisVisible(!isAnalysisVisible)} className="text-sm text-slate-500 hover:text-pink-600 transition-colors font-medium flex items-center gap-1">
                <span>{isAnalysisVisible ? '收起' : '💭 查看我的思考过程'}</span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 transition-transform ${isAnalysisVisible ? 'rotate-180' : ''}`}>
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
              </button>
              {isAnalysisVisible && renderAnalysis()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessageBubble;