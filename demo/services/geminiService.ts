import { GoogleGenAI, Modality } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../constants";
import { GeminiResponse } from "../types";

// Helper: Convert Blob to Base64
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data url prefix (e.g., "data:audio/wav;base64,")
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Helper: Decode base64 to Uint8Array
const base64ToBytes = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

// Helper: Encode ArrayBuffer to base64
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

// Helper: Add WAV header to raw PCM data
// Gemini 2.5 Flash TTS usually returns 24kHz mono 16-bit PCM
const addWavHeader = (pcmData: Uint8Array, sampleRate: number = 24000, numChannels: number = 1): ArrayBuffer => {
  const headerLength = 44;
  const byteLength = pcmData.length + headerLength;
  const buffer = new ArrayBuffer(byteLength);
  const view = new DataView(buffer);

  // Helper to write string to DataView
  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, byteLength - 8, true);
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * numChannels * 2, true); // ByteRate
  view.setUint16(32, numChannels * 2, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, pcmData.length, true); // Subchunk2Size

  // Write PCM data
  const pcmBytes = new Uint8Array(buffer, headerLength);
  pcmBytes.set(pcmData);

  return buffer;
};

export const generateEmpathyResponse = async (
  input: string | Blob
): Promise<GeminiResponse> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // 1. First Step: Get the Textual Response & Analysis
  const modelId = "gemini-2.5-flash";
  
  const parts: any[] = [];
  
  if (typeof input === 'string') {
    parts.push({ text: input });
  } else {
    // It's an audio blob
    const audioBase64 = await blobToBase64(input);
    parts.push({
      inlineData: {
        mimeType: input.type || 'audio/wav',
        data: audioBase64
      }
    });
  }

  const textResponse = await ai.models.generateContent({
    model: modelId,
    contents: {
      role: 'user',
      parts: parts
    },
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.7,
    }
  });

  const generatedText = textResponse.text || "我理解你的感受。";

  // 2. Second Step: Convert the generated text to Speech
  let audioBase64: string | undefined = undefined;

  try {
    const ttsResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: {
        parts: [{ text: generatedText }]
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    // Extract audio data
    const candidate = ttsResponse.candidates?.[0];
    const part = candidate?.content?.parts?.[0];
    if (part && part.inlineData && part.inlineData.data) {
      // The API returns raw PCM. We must convert it to WAV for the browser to play it.
      const rawPcm = base64ToBytes(part.inlineData.data);
      const wavBuffer = addWavHeader(rawPcm, 24000); // 24kHz is standard for this model
      audioBase64 = arrayBufferToBase64(wavBuffer);
    }
  } catch (error) {
    console.error("TTS Generation failed, falling back to text only:", error);
  }

  return {
    text: generatedText,
    audioBase64: audioBase64
  };
};