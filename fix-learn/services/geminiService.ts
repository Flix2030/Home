import { GoogleGenAI, Type, LiveServerMessage, Modality } from "@google/genai";
import { FileInput, Flashcard } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// Helper to sanitize JSON string if needed
const cleanJson = (text: string) => {
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

export const generateFlashcardsFromContent = async (
  content: string,
  files: FileInput[] = []
): Promise<Omit<Flashcard, 'id' | 'status'>[]> => {
  
  const parts: any[] = [];
  
  if (content) {
    parts.push({ text: content });
  }

  files.forEach(file => {
    parts.push({
      inlineData: {
        mimeType: file.mimeType,
        data: file.data
      }
    });
  });

  // Prompt translated to German to ensure output is in German
  // Enhanced to describe image processing better and handle verb forms
  const prompt = `
    Analysiere den bereitgestellten Inhalt (Text, Bilder oder Dokumente).
    
    WICHTIG FÜR BILDER:
    Wenn Bilder enthalten sind, führe eine detaillierte visuelle Analyse durch. Beschreibe die Szene, identifiziere Objekte, Handlungen, Farben und sichtbaren Text. Nutze diese detaillierte Beschreibung, um relevante Vokabeln abzuleiten, die genau beschreiben, was auf dem Bild zu sehen ist.
    
    Identifiziere wichtige Vokabeln, Fachbegriffe oder wichtige Konzepte, die sich zum Lernen eignen.
    Erstelle für jeden identifizierten Begriff:
    1. Den Begriff selbst (term). 
       ACHTUNG BEI VERBEN/LATEIN: Wenn es sich um Verben (insbesondere Latein) handelt, gib ALLE Stammformen im Feld "term" an (z.B. "ducere, duco, duxi, ductum"), nicht nur den Infinitiv. Die Hauptbedeutung kommt in das Feld "definition".
    2. Eine klare, prägnante Definition auf Deutsch (definition).
    3. Einen Beispielsatz, der den Begriff im Kontext verwendet (exampleSentence).
    
    Gib ein reines JSON-Array von Objekten zurück. Verwende keine Markdown-Codeblöcke.
  `;
  parts.push({ text: prompt });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              term: { type: Type.STRING },
              definition: { type: Type.STRING },
              exampleSentence: { type: Type.STRING }
            },
            required: ["term", "definition", "exampleSentence"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    
    return JSON.parse(cleanJson(text));
  } catch (error) {
    console.error("Fehler beim Erstellen der Karteikarten:", error);
    throw error;
  }
};

export const transcribeAudio = async (audioBase64: string, mimeType: string = 'audio/webm'): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: audioBase64
            }
          },
          { text: "Transkribiere dieses Audio genau in Text. Gib nur den Text zurück, keine Erklärungen." }
        ]
      }
    });
    return response.text || "";
  } catch (error) {
    console.error("Transcription error:", error);
    throw error;
  }
};

export const chatWithAi = async (message: string, history: { role: string, parts: { text: string }[] }[]): Promise<string> => {
  try {
    const chat = ai.chats.create({
      model: 'gemini-3-pro-preview',
      history: history.map(h => ({
        role: h.role,
        parts: h.parts
      })),
      config: {
        // System instruction in German
        systemInstruction: "Du bist ein hilfreicher Sprachlehrer-Assistent. Hilf dem Benutzer, Vokabeln, Grammatik und Nuancen der deutschen Sprache zu verstehen. Antworte immer auf Deutsch.",
      }
    });

    const result = await chat.sendMessage({ message });
    return result.text || "Ich konnte keine Antwort generieren.";
  } catch (error) {
    console.error("Chat Fehler:", error);
    return "Entschuldigung, ich habe einen Fehler bei der Verbindung zur KI festgestellt.";
  }
};

export const searchDefinition = async (term: string): Promise<{ text: string, sources: string[] }> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Finde eine detaillierte Definition, Etymologie und Anwendungsbeispiele für das Wort: "${term}". Antworte auf Deutsch.`,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const text = response.text || "Keine Definition gefunden.";
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = chunks
      .map((c: any) => c.web?.uri)
      .filter((uri: string | undefined) => uri) as string[];

    return { text, sources };
  } catch (error) {
    console.error("Suchfehler:", error);
    return { text: "Suche konnte nicht durchgeführt werden.", sources: [] };
  }
};

// Text-to-Speech Implementation
export const generateSpeech = async (text: string): Promise<ArrayBuffer | null> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) return null;

    // Decode Base64 string to ArrayBuffer (Raw PCM usually needs more handling, 
    // but the TTS endpoint might return formatted audio inside the container depending on client config, 
    // however usually it is raw PCM as per docs. We will use the existing audioUtils decoder on the frontend).
    const binaryString = atob(base64Audio);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  } catch (error) {
    console.error("TTS Fehler:", error);
    return null;
  }
}

// Live API Implementation
export type LiveConnectionCallbacks = {
  onOpen: () => void;
  onAudioData: (base64Audio: string) => void;
  onClose: () => void;
  onError: (error: any) => void;
  ontranscription?: (userText: string, modelText: string) => void;
};

export class LiveSession {
  private sessionPromise: Promise<any> | null = null;
  
  constructor(private callbacks: LiveConnectionCallbacks) {}

  async connect(inputAudioContext: AudioContext) {
    // Microphone stream setup
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    this.sessionPromise = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      callbacks: {
        onopen: () => {
          this.callbacks.onOpen();
          // Stream audio from mic
          const source = inputAudioContext.createMediaStreamSource(stream);
          const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
          
          scriptProcessor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            const pcmBlob = this.createBlob(inputData);
            
            if (this.sessionPromise) {
              this.sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            }
          };
          
          source.connect(scriptProcessor);
          scriptProcessor.connect(inputAudioContext.destination);
        },
        onmessage: (message: LiveServerMessage) => {
          const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (base64Audio) {
            this.callbacks.onAudioData(base64Audio);
          }
          
          if (message.serverContent?.turnComplete) {
            // Can handle turn complete logic here
          }
        },
        onclose: (e) => this.callbacks.onClose(),
        onerror: (e) => this.callbacks.onError(e),
      },
      config: {
        responseModalities: [Modality.AUDIO],
        // German System Instruction
        systemInstruction: "Du bist ein freundlicher Gesprächspartner, der dem Benutzer hilft, Deutsch zu üben. Halte die Antworten kurz und ermutigend.",
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
        }
      }
    });
    
    return this.sessionPromise;
  }

  private createBlob(data: Float32Array) {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = data[i] * 32768;
    }
    
    // Simple naive encoding
    let binary = '';
    const bytes = new Uint8Array(int16.buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const b64 = btoa(binary);

    return {
      data: b64,
      mimeType: 'audio/pcm;rate=16000'
    };
  }
}