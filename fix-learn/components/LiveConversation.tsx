import React, { useEffect, useState, useRef } from 'react';
import { Mic, MicOff, Volume2, X } from 'lucide-react';
import { LiveSession } from '../services/geminiService';
import { decodeAudioData } from '../utils/audioUtils';

interface LiveConversationProps {
  onClose: () => void;
}

const LiveConversation: React.FC<LiveConversationProps> = ({ onClose }) => {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [volume, setVolume] = useState(0); // For visualization
  
  const liveSessionRef = useRef<LiveSession | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);

  const startSession = async () => {
    try {
      setStatus('connecting');
      
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass({ sampleRate: 24000 });
      audioContextRef.current = ctx;
      
      outputNodeRef.current = ctx.createGain();
      outputNodeRef.current.connect(ctx.destination);
      nextStartTimeRef.current = ctx.currentTime;

      const session = new LiveSession({
        onOpen: () => {
          setStatus('connected');
          setIsActive(true);
        },
        onAudioData: async (base64Audio) => {
          if (!audioContextRef.current || !outputNodeRef.current) return;
          
          // Visualize volume (fake simple viz based on data arrival)
          setVolume(Math.random() * 0.5 + 0.5); 
          setTimeout(() => setVolume(0), 200);

          // Audio Playback Queue Logic
          const buffer = await decodeAudioData(base64Audio, audioContextRef.current);
          
          const source = audioContextRef.current.createBufferSource();
          source.buffer = buffer;
          source.connect(outputNodeRef.current);
          
          const currentTime = audioContextRef.current.currentTime;
          // Ensure we don't schedule in the past
          const startTime = Math.max(nextStartTimeRef.current, currentTime);
          
          source.start(startTime);
          nextStartTimeRef.current = startTime + buffer.duration;
        },
        onClose: () => {
          setStatus('idle');
          setIsActive(false);
        },
        onError: (e) => {
          console.error("Live session error", e);
          setStatus('error');
          setIsActive(false);
        }
      });

      // Need input context for mic usually separate or same depending on implementation
      // Here we pass a new one for input processing as per `LiveSession` helper requirements
      const inputCtx = new AudioContextClass({ sampleRate: 16000 });
      await session.connect(inputCtx);
      liveSessionRef.current = session;

    } catch (err) {
      console.error("Failed to start live session", err);
      setStatus('error');
    }
  };

  const endSession = () => {
    // In a real app, we'd properly close the WebSocket from the session object
    // Here we just close context and UI state as the simplified Session class 
    // in this example doesn't expose strict abort (would need to keep session object).
    // Reloading or unmounting effectively kills it for this demo scope.
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    setIsActive(false);
    setStatus('idle');
  };

  useEffect(() => {
    return () => {
      endSession();
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col items-center p-8 relative border border-gray-200 dark:border-gray-700 transition-colors">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition">
          <X size={24} />
        </button>

        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Gesprächsübung</h2>
          <p className="text-gray-500 dark:text-gray-400">Sprich natürlich, um deine Aussprache zu üben.</p>
        </div>

        {/* Visualizer Circle */}
        <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 ${isActive ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-gray-100 dark:bg-gray-700'}`}>
          <div 
            className={`rounded-full bg-blue-500 transition-all duration-100 ease-linear shadow-lg shadow-blue-500/30 flex items-center justify-center`}
            style={{ 
              width: isActive ? `${60 + volume * 60}px` : '64px', 
              height: isActive ? `${60 + volume * 60}px` : '64px'
            }}
          >
            {isActive ? <Volume2 className="text-white" size={32} /> : <MicOff className="text-white/50" size={32} />}
          </div>
        </div>

        <div className="mt-8 mb-4">
           {status === 'connecting' && <span className="text-blue-500 animate-pulse font-medium">Verbinde mit Gemini...</span>}
           {status === 'error' && <span className="text-red-500 font-medium">Verbindung fehlgeschlagen. Versuche es erneut.</span>}
           {status === 'connected' && <span className="text-green-500 font-medium">Höre zu...</span>}
           {status === 'idle' && <span className="text-gray-400 dark:text-gray-500">Bereit zum Start</span>}
        </div>

        {!isActive ? (
          <button 
            onClick={startSession}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition flex items-center justify-center gap-2"
          >
            <Mic size={20} /> Gespräch starten
          </button>
        ) : (
          <button 
            onClick={endSession}
            className="w-full bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 font-bold py-3 px-6 rounded-xl transition flex items-center justify-center gap-2"
          >
            <MicOff size={20} /> Sitzung beenden
          </button>
        )}
      </div>
    </div>
  );
};

export default LiveConversation;
