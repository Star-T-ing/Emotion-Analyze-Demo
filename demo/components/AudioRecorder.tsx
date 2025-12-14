import React, { useState, useRef, useEffect } from 'react';

const MIN_RECORDING_TIME_MS = 1000; // 1 second

interface AudioRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  disabled?: boolean;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ onRecordingComplete, disabled }) => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingStartTimeRef = useRef<number>(0);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        // **FIX**: Check recording duration.
        const duration = Date.now() - recordingStartTimeRef.current;
        if (duration < MIN_RECORDING_TIME_MS) {
            alert(`录音时间太短，请至少录制 ${MIN_RECORDING_TIME_MS / 1000} 秒。`);
            stream.getTracks().forEach(track => track.stop());
            return;
        }

        const audioBlob = new Blob(chunksRef.current, { type: mediaRecorderRef.current?.mimeType || 'audio/webm' });
        
        if (audioBlob.size === 0) {
          alert("录音失败，未录制到任何音频。请检查麦克风权限。");
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        onRecordingComplete(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      recordingStartTimeRef.current = Date.now(); // Start timer
      setIsRecording(true);
    } catch (err: any) {
      console.error("Error accessing microphone:", err);
      alert("无法访问麦克风。请确保您的设备有正常工作的麦克风并已授予权限。");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={isRecording ? stopRecording : startRecording} disabled={disabled} className={`relative flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-200 text-gray-400' : ''} ${isRecording ? 'bg-red-500 text-white recording-pulse' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}`} aria-label={isRecording ? "停止录音" : "开始录音"}>
        {isRecording ? (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" /></svg>) : (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" /></svg>)}
      </button>
    </div>
  );
};
export default AudioRecorder;