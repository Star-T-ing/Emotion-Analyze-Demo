import {
  PROMPT_ANALYZE_EMOTION,
  PROMPT_SYSTEM_EMPATHY_GENERATION,
  getPromptUserEmpathyGeneration
} from './prompts';

// The history format expected by the service
type MessageHistory = { role: 'user' | 'assistant', content: any };

// 辅助函数：将Blob对象转换为Base64字符串 (无变化)
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        const base64String = reader.result;
        const base64Data = base64String.split(',')[1] || ''; 
        resolve(base64Data);
      } else {
        resolve('');
      }
    };
    reader.onerror = (error) => { reject(error); };
    reader.readAsDataURL(blob);
  });
};

/**
 * 第一步: 调用Qwen API进行情感分析
 * **MODIFIED**: Now accepts a history array.
 */
export const getEmotionalAnalysis = async (
    input: { text?: string, audio?: Blob },
    history: MessageHistory[]
): Promise<string> => {
  const userContent: any[] = [];

  if (input.audio) {
    const audioBase64 = await blobToBase64(input.audio);
    if (!audioBase64) throw new Error("录制的音频为空或处理失败，请重试。");
    const dataUri = `data:;base64,${audioBase64}`;
    const format = input.audio.type?.split('/')[1]?.split(';')[0] || 'webm';
    userContent.push(
      { "type": "input_audio", "input_audio": { "data": dataUri, "format": format } },
      { "type": "text", "text": "请分析这段音频中的情绪和内容。" }
    );
  }

  if (input.text) {
    userContent.push({ "type": "text", "text": input.text });
  }

  const payload = {
    model: "qwen3-omni-flash",
    messages: [
      { role: 'system', content: PROMPT_ANALYZE_EMOTION },
      ...history, // Include conversation history
      { role: 'user', content: userContent }
    ],
    stream: true,
  };

  const response = await fetch('/api/compatible-mode/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok || !response.body) {
    const errorBody = await response.json();
    throw new Error(`API request for analysis failed: ${errorBody.error?.message || 'Unknown error'}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullResponse = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n');
    for (const line of lines) {
      if (line.startsWith('data:')) {
        const jsonStr = line.substring(5).trim();
        if (jsonStr && jsonStr !== '[DONE]') {
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.choices?.[0]?.delta?.content) {
              fullResponse += parsed.choices[0].delta.content;
            }
          } catch (e) { /* Silently ignore */ }
        }
      }
    }
  }
  
  console.log("--- [DEBUG] Final Model Response (Analysis Step) ---");
  console.log(fullResponse.trim());
  console.log("---------------------------------------------------");

  return fullResponse.trim();
};

/**
 * 辅助函数：为音频数据添加WAV文件头
 */
const addWavHeader = (audioData: Uint8Array, sampleRate: number = 24000, numChannels: number = 1, bitsPerSample: number = 16): Blob => {
  const dataSize = audioData.length;
  const header = new ArrayBuffer(44);
  const view = new DataView(header);

  // "RIFF" chunk descriptor
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + dataSize, true); // File size - 8
  view.setUint32(8, 0x57415645, false); // "WAVE"

  // "fmt " sub-chunk
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * numChannels * bitsPerSample / 8, true); // ByteRate
  view.setUint16(32, numChannels * bitsPerSample / 8, true); // BlockAlign
  view.setUint16(34, bitsPerSample, true); // BitsPerSample

  // "data" sub-chunk
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, dataSize, true); // Subchunk2Size

  // Combine header and audio data
  const wavFile = new Uint8Array(header.byteLength + audioData.length);
  wavFile.set(new Uint8Array(header), 0);
  wavFile.set(audioData, header.byteLength);

  return new Blob([wavFile], { type: 'audio/wav' });
};

/**
 * 第二步: 流式生成共情回复（包含文本和语音）
 * **MODIFIED**: Now accepts a history array and generates both text and audio.
 */
export const streamEmpathyResponse = async (
  userInput: string,
  analysis: string,
  history: MessageHistory[],
  onChunk: (text: string) => void,
  onComplete: (audioUrl?: string) => void,
  onError: (error: Error) => void
) => {
  const payload = {
    model: "qwen3-omni-flash",
    messages: [
      { role: 'system', content: PROMPT_SYSTEM_EMPATHY_GENERATION },
      ...history, // Include conversation history
      { role: 'user', content: getPromptUserEmpathyGeneration(userInput, analysis) }
    ],
    modalities: ["text", "audio"],
    audio: {
      voice: "Cherry",
      format: "pcm"
    },
    stream: true,
    stream_options: {
      include_usage: true
    }
  };
  
  let fullEmpathyResponse = '';
  let audioChunks: Uint8Array[] = [];

  try {
    const response = await fetch('/api/compatible-mode/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok || !response.body) {
      const errorBody = await response.json();
      throw new Error(`API request for empathy failed: ${errorBody.error?.message || 'Unknown error'}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = ''; // Buffer for incomplete lines
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        console.log("--- [DEBUG] Final Model Response (Empathy Step) ---");
        console.log(fullEmpathyResponse);
        console.log("-------------------------------------------------");
        
        // Process MODEL audio chunks and create WAV file
        // Note: Model audio comes as raw PCM data and needs WAV header added
        // This is different from user audio which is already in a playable format
        let audioUrl: string | undefined;
        if (audioChunks.length > 0) {
          const totalLength = audioChunks.reduce((acc, chunk) => acc + chunk.length, 0);
          const combinedAudio = new Uint8Array(totalLength);
          let offset = 0;
          for (const chunk of audioChunks) {
            combinedAudio.set(chunk, offset);
            offset += chunk.length;
          }
          
          // Add WAV header to raw PCM data and create blob URL
          const wavBlob = addWavHeader(combinedAudio, 24000, 1, 16);
          audioUrl = URL.createObjectURL(wavBlob);
          console.log("--- [DEBUG] Model audio generated successfully ---", {
            totalPCMBytes: totalLength,
            wavBlobSize: wavBlob.size,
            wavBlobType: wavBlob.type
          });
        }
        
        onComplete(audioUrl);
        break;
      }
      
      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;
      
      // Split by newlines but keep the last incomplete line in buffer
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep the last incomplete line
      
      for (const line of lines) {
        if (line.startsWith('data:')) {
          const jsonStr = line.substring(5).trim();
          if (jsonStr && jsonStr !== '[DONE]') {
            try {
              const parsed = JSON.parse(jsonStr);
              
              // Handle text content
              if (parsed.choices?.[0]?.delta?.content) {
                const textChunk = parsed.choices[0].delta.content;
                fullEmpathyResponse += textChunk;
                onChunk(textChunk);
              }
              
              // Handle audio content
              if (parsed.choices?.[0]?.delta?.audio) {
                const audioData = parsed.choices[0].delta.audio.data;
                if (audioData) {
                  // Decode base64 audio data
                  const binaryString = atob(audioData);
                  const bytes = new Uint8Array(binaryString.length);
                  for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                  }
                  audioChunks.push(bytes);
                }
              }
            } catch (e) { 
              console.error("Error parsing chunk:", e, "Line:", line);
            }
          }
        }
      }
    }
  } catch (error) {
    onError(error as Error);
  }
};