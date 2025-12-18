import React, { useState, useRef } from 'react';
import { generateFlashcardsFromContent, transcribeAudio } from '../services/geminiService';
import { Deck, Flashcard, FileInput } from '../types';
import { Loader2, Upload, FileText, Image as ImageIcon, Mic, Square } from 'lucide-react';

interface DeckCreatorProps {
  authorId: string;
  onDeckCreated: (deck: Deck) => void;
  onCancel: () => void;
}

const DeckCreator: React.FC<DeckCreatorProps> = ({ authorId, onDeckCreated, onCancel }) => {
  const [deckName, setDeckName] = useState('');
  const [inputText, setInputText] = useState('');
  const [files, setFiles] = useState<FileInput[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles: FileInput[] = [];
      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        const reader = new FileReader();
        
        const filePromise = new Promise<FileInput>((resolve) => {
          reader.onload = (evt) => {
            const base64 = (evt.target?.result as string).split(',')[1];
            resolve({
              data: base64,
              mimeType: file.type,
              name: file.name
            });
          };
          reader.readAsDataURL(file);
        });

        newFiles.push(await filePromise);
      }
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsTranscribing(true);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Convert Blob to Base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
            const base64String = (reader.result as string).split(',')[1];
            try {
                const text = await transcribeAudio(base64String, 'audio/webm');
                setInputText(prev => prev + (prev ? ' ' : '') + text);
            } catch (err) {
                console.error("Transkriptionsfehler", err);
                setError("Fehler bei der Transkription des Audios.");
            } finally {
                setIsTranscribing(false);
            }
        };

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setError(null);
    } catch (err) {
      console.error("Mikrofonfehler", err);
      setError("Zugriff auf das Mikrofon verweigert.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleGenerate = async () => {
    if (!deckName) {
      setError("Bitte gib dem Set einen Namen.");
      return;
    }
    if (!inputText && files.length === 0) {
      setError("Bitte gib Text ein oder lade Dateien hoch.");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const cardsData = await generateFlashcardsFromContent(inputText, files);
      
      const newCards: Flashcard[] = cardsData.map(c => ({
        ...c,
        id: crypto.randomUUID(),
        status: 'new'
      }));

      const newDeck: Deck = {
        id: crypto.randomUUID(),
        authorId,
        name: deckName,
        cards: newCards,
        createdAt: Date.now()
      };

      onDeckCreated(newDeck);
    } catch (err) {
      setError("Fehler beim Generieren. Bitte versuche es erneut.");
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 max-w-2xl mx-auto border border-gray-100 dark:border-gray-700 transition-colors">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Neues Set erstellen</h2>
      
      {/* Deck Name */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Name des Sets</label>
        <input
          type="text"
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
          placeholder="z.B. Spanisch Grundlagen, Biologie 101"
          value={deckName}
          onChange={(e) => setDeckName(e.target.value)}
        />
      </div>

      {/* Text Input with Mic */}
      <div className="mb-6 relative">
        <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Inhalt / Bildbeschreibungen
            </label>
            {isRecording ? (
                <button 
                  onClick={stopRecording}
                  className="flex items-center gap-2 text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-3 py-1 rounded-full animate-pulse"
                >
                  <Square size={12} fill="currentColor" /> Aufnahme stoppen
                </button>
            ) : (
                <button 
                  onClick={startRecording}
                  disabled={isTranscribing}
                  className="flex items-center gap-2 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/40 transition disabled:opacity-50"
                >
                  {isTranscribing ? <Loader2 size={12} className="animate-spin" /> : <Mic size={12} />} 
                  {isTranscribing ? 'Verarbeite...' : 'Diktieren'}
                </button>
            )}
        </div>
        <textarea
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition h-32 resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
          placeholder="Füge hier Text ein oder beschreibe deine Bilder..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
        />
        {isRecording && (
            <div className="absolute bottom-4 right-4 text-red-500 text-xs font-semibold animate-pulse">
                Aufnahme läuft...
            </div>
        )}
      </div>

      {/* File Upload */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Anhänge (Bilder, PDF)</label>
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition cursor-pointer relative">
          <input 
            type="file" 
            multiple 
            accept="image/*,application/pdf"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={handleFileChange}
          />
          <Upload className="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Hier klicken, um Bilder oder PDFs hochzuladen</p>
        </div>
        
        {/* File List */}
        {files.length > 0 && (
          <div className="mt-4 space-y-2">
            {files.map((file, idx) => (
              <div key={idx} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded border border-gray-200 dark:border-gray-600">
                <div className="flex items-center space-x-2">
                  {file.mimeType.includes('pdf') ? <FileText size={16} className="text-gray-500 dark:text-gray-400" /> : <ImageIcon size={16} className="text-gray-500 dark:text-gray-400" />}
                  <span className="text-sm text-gray-700 dark:text-gray-200 truncate max-w-[200px]">{file.name}</span>
                </div>
                <button onClick={() => removeFile(idx)} className="text-red-500 hover:text-red-700 dark:hover:text-red-400 text-xs font-medium">Entfernen</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="flex justify-end space-x-3">
        <button 
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
        >
          Abbrechen
        </button>
        <button
          onClick={handleGenerate}
          disabled={isGenerating || isRecording || isTranscribing}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <>
              <Loader2 className="animate-spin mr-2 h-4 w-4" />
              Generiere...
            </>
          ) : (
            'Karteikarten erstellen'
          )}
        </button>
      </div>
    </div>
  );
};

export default DeckCreator;