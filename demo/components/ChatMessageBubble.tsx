import React, { useEffect, useRef } from 'react';
import { ChatMessage, MessageRole } from '../types';

interface Props {
  message: ChatMessage;
}

const ChatMessageBubble: React.FC<Props> = ({ message }) => {
  const isUser = message.role === MessageRole.USER;
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    // Auto-play model responses that have audio
    if (!isUser && message.audioUrl && audioRef.current) {
        // We catch the error to prevent console spam if user interaction hasn't happened yet
        audioRef.current.play().catch(() => {
            console.log("Autoplay blocked waiting for user interaction");
        });
    }
  }, [message.audioUrl, isUser]);

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] md:max-w-[70%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        
        {/* Avatar / Name Label */}
        <span className="text-xs text-slate-400 mb-1 px-1">
          {isUser ? '你' : '共情 AI'}
        </span>

        {/* Bubble */}
        <div
          className={`
            p-4 rounded-2xl text-sm md:text-base shadow-sm
            ${isUser 
              ? 'bg-indigo-600 text-white rounded-br-none' 
              : 'bg-white text-slate-800 border border-slate-100 rounded-bl-none'}
          `}
        >
          {message.isAudioMessage && isUser && (
             <div className="flex items-center gap-2 mb-2 pb-2 border-b border-indigo-500/30">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 opacity-70">
                    <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
                    <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 9.375v1.875h3.75a.75.75 0 010 1.5h-9a.75.75 0 010-1.5h3.75v-1.875A6.751 6.751 0 015.25 12.75v-1.5a.75.75 0 01.75-.75z" />
                </svg>
                <span className="italic opacity-80">语音已转录</span>
             </div>
          )}
          
          <div className="whitespace-pre-wrap leading-relaxed">
            {message.text}
          </div>

          {/* Audio Player for Model Response */}
          {message.audioUrl && (
            <div className={`mt-3 pt-3 border-t ${isUser ? 'border-indigo-500/30' : 'border-slate-100'}`}>
              <audio 
                ref={audioRef}
                controls 
                src={message.audioUrl} 
                className="w-full h-8" 
                style={{ borderRadius: '4px' }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessageBubble;