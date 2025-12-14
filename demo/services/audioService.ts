// services/audioService.ts

// A threshold to determine if audio is effectively silent.
const SILENCE_THRESHOLD = 0.01; 

/**
 * Detects silence in an audio blob using the Web Audio API.
 * @param audioBlob The audio blob recorded from the browser.
 * @returns A promise that resolves to true if the audio is silent, false otherwise.
 */
export const isAudioSilent = async (audioBlob: Blob): Promise<boolean> => {
  try {
    // Create an AudioContext. The 'any' cast is for older browser compatibility.
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const arrayBuffer = await audioBlob.arrayBuffer();
    
    // The decodeAudioData promise will reject if the audio format is not supported or corrupt.
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Check each channel for any sound above the silence threshold.
    for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
      const channelData = audioBuffer.getChannelData(i);
      for (let j = 0; j < channelData.length; j++) {
        if (Math.abs(channelData[j]) > SILENCE_THRESHOLD) {
          // Found a sample above the threshold, so it's not silent.
          await audioContext.close();
          return false;
        }
      }
    }

    // If we get here, all samples in all channels are below the threshold.
    await audioContext.close();
    return true;
  } catch (error) {
    console.error("Error analyzing audio for silence:", error);
    // If we cannot decode the audio, we assume it's invalid/silent to be safe.
    return true; 
  }
};