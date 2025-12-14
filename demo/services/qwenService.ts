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
 * 第二步: 流式生成共情回复
 * **MODIFIED**: Now accepts a history array.
 */
export const streamEmpathyResponse = async (
  userInput: string,
  analysis: string,
  history: MessageHistory[],
  onChunk: (text: string) => void,
  onComplete: () => void,
  onError: (error: Error) => void
) => {
  const payload = {
    model: "qwen3-omni-flash-2025-12-01",
    messages: [
      { role: 'system', content: PROMPT_SYSTEM_EMPATHY_GENERATION },
      ...history, // Include conversation history
      { role: 'user', content: getPromptUserEmpathyGeneration(userInput, analysis) }
    ],
    stream: true,
  };
  
  let fullEmpathyResponse = '';

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
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        console.log("--- [DEBUG] Final Model Response (Empathy Step) ---");
        console.log(fullEmpathyResponse);
        console.log("-------------------------------------------------");
        onComplete();
        break;
      }
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data:')) {
          const jsonStr = line.substring(5).trim();
          if (jsonStr && jsonStr !== '[DONE]') {
            try {
              const parsed = JSON.parse(jsonStr);
              if (parsed.choices?.[0]?.delta?.content) {
                const textChunk = parsed.choices[0].delta.content;
                fullEmpathyResponse += textChunk;
                onChunk(textChunk);
              }
            } catch (e) { /* Silently ignore */ }
          }
        }
      }
    }
  } catch (error) {
    onError(error as Error);
  }
};