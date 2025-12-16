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
        <span className="text-xs text-slate-400 mb-1 px-1">{isUser ? '你' : '共情 AI'}</span>
        <div className={`p-4 rounded-2xl text-sm md:text-base shadow-sm ${isUser ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white text-slate-800 border border-slate-100 rounded-bl-none'}`}>
          
          {/* Main message text: Keep using ReactMarkdown as it may contain rich text. */}
          {message.text && (
             <div className={markdownWrapperClasses}>
                <ReactMarkdown>{message.text}</ReactMarkdown>
             </div>
          )}

          {/* Audio generation status or player */}
          {isModel && (message.isAudioGenerating || message.audioUrl) && (
            <div className={`w-full ${message.text ? 'mt-3' : ''}`}>
              {message.isAudioGenerating && !message.audioUrl ? (
                <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-lg">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>语音生成中...</span>
                </div>
              ) : message.audioUrl ? (
                <audio controls src={message.audioUrl} className="w-full h-10 rounded-lg" />
              ) : null}
            </div>
          )}
          
          {/* User audio messages */}
          {isUser && message.audioUrl && (
            <div className={`w-full ${message.text ? 'mt-3' : ''}`}>
               <audio controls src={message.audioUrl} className="w-full h-10 rounded-lg" />
            </div>
          )}
          
          {isModel && message.analysis && (
            <div className="mt-3 pt-2 border-t border-slate-200/80">
              <button onClick={() => setAnalysisVisible(!isAnalysisVisible)} className="text-xs text-slate-500 hover:text-slate-800 transition-colors font-semibold">
                {isAnalysisVisible ? '隐藏思考过程 ▼' : '查看思考过程 ▶'}
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