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

          {message.isAudioMessage && message.audioUrl && (
            <div className={`w-64 ${message.text ? 'mt-3' : ''}`}>
               <audio controls src={message.audioUrl} className="w-full h-10" />
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