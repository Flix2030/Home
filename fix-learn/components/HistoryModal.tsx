import React from 'react';
import { HistoryEntry } from '../types';
import { X, Calendar, PlusCircle, Download, Clock } from 'lucide-react';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryEntry[];
}

const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, history }) => {
  if (!isOpen) return null;

  // Group history by date
  const groupedHistory: { [key: string]: HistoryEntry[] } = {};
  history.forEach(entry => {
    const date = new Date(entry.timestamp).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    if (!groupedHistory[date]) {
      groupedHistory[date] = [];
    }
    groupedHistory[date].push(entry);
  });

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end transition-opacity">
      <div className="bg-white dark:bg-gray-900 w-full max-w-md h-full shadow-2xl p-6 overflow-hidden flex flex-col border-l border-gray-200 dark:border-gray-800 animate-slide-in-right">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Clock className="text-blue-600" />
            Verlauf
          </h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition text-gray-500 dark:text-gray-400"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-8">
          {history.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500">
              <Calendar size={48} className="mx-auto mb-3 opacity-50" />
              <p>Noch keine Aktivitäten.</p>
              <p className="text-sm">Erstellte Sets erscheinen hier.</p>
            </div>
          ) : (
            Object.keys(groupedHistory).map(date => (
              <div key={date}>
                <div className="sticky top-0 bg-white dark:bg-gray-900 z-10 py-2 mb-4 border-b border-gray-100 dark:border-gray-800">
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">{date}</h3>
                </div>
                <div className="space-y-4 pl-4 border-l-2 border-gray-100 dark:border-gray-800 ml-2">
                  {groupedHistory[date].map(entry => (
                    <div key={entry.id} className="relative pl-6 py-1 group">
                      {/* Timeline Dot */}
                      <div className={`absolute -left-[21px] top-2 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 ${
                        entry.action === 'created' ? 'bg-blue-500' : 'bg-green-500'
                      }`}></div>
                      
                      <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:shadow-sm transition">
                        <div className="flex justify-between items-start">
                          <span className="font-semibold text-gray-800 dark:text-gray-200 block mb-1">
                            {entry.deckName}
                          </span>
                          <span className="text-xs text-gray-400 whitespace-nowrap">
                            {new Date(entry.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          {entry.action === 'created' ? (
                            <><PlusCircle size={12} /> Set erstellt</>
                          ) : (
                            <><Download size={12} /> Set importiert</>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryModal;