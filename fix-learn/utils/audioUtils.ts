export const decodeAudioData = async (
  base64String: string,
  audioContext: AudioContext
): Promise<AudioBuffer> => {
  const binaryString = atob(base64String);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  // Create an Int16Array view (since the model returns PCM 16-bit)
  const int16Data = new Int16Array(bytes.buffer);
  
  const buffer = audioContext.createBuffer(1, int16Data.length, 24000);
  const channelData = buffer.getChannelData(0);
  
  for (let i = 0; i < int16Data.length; i++) {
    // Convert int16 to float32 [-1.0, 1.0]
    channelData[i] = int16Data[i] / 32768.0;
  }
  
  return buffer;
};
