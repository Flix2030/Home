import React, { useState } from 'react';
import { Deck, Course, Flashcard, Folder } from '../types';
import { Play, Edit2, FolderPlus, ArrowLeft, Trash2, CheckSquare, Square, Save, X, Book } from 'lucide-react';

interface DeckDetailProps {
  deck: Deck;
  availableCourses: Course[];
  availableFolders: Folder[];
  onStartStudy: (cardIds?: string[]) => void;
  onEdit: () => void; // Legacy or trigger for rename
  onRenameDeck: (newName: string) => void;
  onAddToCourse: (courseId: string) => void;
  onAddToFolder: (folderId: string) => void;
  onBack: () => void;
  onDelete: () => void;
  onUpdateCard: (card: Flashcard) => void;
  onDeleteCard: (cardId: string) => void;
}

const DeckDetail: React.FC<DeckDetailProps> = ({ 
  deck, 
  availableCourses, 
  availableFolders,
  onStartStudy, 
  onRenameDeck,
  onAddToCourse, 
  onAddToFolder,
  onBack,
  onDelete,
  onUpdateCard,
  onDeleteCard
}) => {
  const [showCourseMenu, setShowCourseMenu] = useState(false);
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
  
  // Deck Rename State
  const [isRenaming, setIsRenaming] = useState(false);
  const [newDeckName, setNewDeckName] = useState(deck.name);

  // Edit Card Modal State
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null);
  const [editTerm, setEditTerm] = useState('');
  const [editDef, setEditDef] = useState('');

  // Calculate progress
  const knownCount = deck.cards.filter(c => c.status === 'known').length;
  const progress = Math.round((knownCount / deck.cards.length) * 100) || 0;

  const toggleSelectAll = () => {
    if (selectedCardIds.size === deck.cards.length) {
      setSelectedCardIds(new Set());
    } else {
      setSelectedCardIds(new Set(deck.cards.map(c => c.id)));
    }
  };

  const toggleCard = (id: string) => {
    const newSelection = new Set(selectedCardIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedCardIds(newSelection);
  };

  const handleStartStudy = () => {
    if (selectedCardIds.size > 0) {
      onStartStudy(Array.from(selectedCardIds));
    } else {
      onStartStudy(undefined); // Study all
    }
  };

  const startEditingCard = (card: Flashcard, e: React.MouseEvent) => {
      e.stopPropagation();
      setEditingCard(card);
      setEditTerm(card.term);
      setEditDef(card.definition);
  };

  const saveCardEdit = () => {
      if(editingCard && editTerm && editDef) {
          onUpdateCard({ ...editingCard, term: editTerm, definition: editDef });
          setEditingCard(null);
      }
  };

  const saveDeckName = () => {
      if(newDeckName.trim()) {
          onRenameDeck(newDeckName.trim());
          setIsRenaming(false);
      }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mb-6 transition">
        <ArrowLeft size={20} /> Zurück
      </button>

      {/* Main Card - Removed overflow-hidden and the decorative blob */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 mb-8 relative">
        
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-6">
            <div className="flex-1 mr-4">
              {isRenaming ? (
                  <div className="flex items-center gap-2">
                      <input 
                        className="text-3xl font-bold text-gray-900 dark:text-white bg-transparent border-b-2 border-blue-500 outline-none w-full"
                        value={newDeckName}
                        onChange={(e) => setNewDeckName(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && saveDeckName()}
                      />
                      <button onClick={saveDeckName} className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Save size={20} /></button>
                  </div>
              ) : (
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{deck.name}</h1>
              )}
              <p className="text-gray-500 dark:text-gray-400">{deck.cards.length} Begriffe • Erstellt am {new Date(deck.createdAt).toLocaleDateString()}</p>
            </div>
            
            <div className="flex gap-2">
                <button 
                  onClick={() => {
                      setNewDeckName(deck.name);
                      setIsRenaming(true);
                  }}
                  className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                  title="Titel Bearbeiten"
                >
                    <Edit2 size={20} />
                </button>
                <button 
                  onClick={() => {
                     if(window.confirm('Möchtest du dieses Set wirklich löschen?')) onDelete();
                  }}
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                  title="Set Löschen"
                >
                    <Trash2 size={20} />
                </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 mb-8 items-center">
            <button 
              onClick={handleStartStudy}
              disabled={deck.cards.length === 0}
              className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-600/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play size={20} fill="currentColor" /> 
              {selectedCardIds.size > 0 ? `Lernen (${selectedCardIds.size})` : 'Alles lernen'}
            </button>

            <div className="relative">
              <button 
                onClick={() => setShowCourseMenu(!showCourseMenu)}
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 border border-gray-200 dark:border-gray-600 text-sm"
              >
                <FolderPlus size={16} /> Zu Kurs/Ordner
              </button>
              
              {showCourseMenu && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-600 z-50 overflow-hidden animate-in fade-in zoom-in-95">
                  <div className="max-h-60 overflow-y-auto">
                    {/* Courses */}
                    <div className="p-3 border-b border-gray-100 dark:border-gray-700 text-xs font-semibold text-gray-500 uppercase">
                         Kurse
                    </div>
                    {availableCourses.length > 0 ? (
                      availableCourses.map(course => (
                        <button
                          key={course.id}
                          onClick={() => {
                            onAddToCourse(course.id);
                            setShowCourseMenu(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-200 flex items-center gap-2"
                        >
                          <Book size={14} /> {course.name}
                        </button>
                      ))
                    ) : (
                      <div className="p-3 text-sm text-gray-400 text-center italic">Keine Kurse</div>
                    )}
                    
                    {/* Folders */}
                     <div className="p-3 border-b border-gray-100 dark:border-gray-700 border-t text-xs font-semibold text-gray-500 uppercase">
                         Ordner
                    </div>
                    {availableFolders.length > 0 ? (
                      availableFolders.map(folder => (
                        <button
                          key={folder.id}
                          onClick={() => {
                            onAddToFolder(folder.id);
                            setShowCourseMenu(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-200 flex items-center gap-2"
                        >
                          <FolderPlus size={14} /> {folder.name}
                        </button>
                      ))
                    ) : (
                      <div className="p-3 text-sm text-gray-400 text-center italic">Keine Ordner</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="w-full bg-gray-100 dark:bg-gray-700 h-3 rounded-full overflow-hidden mb-2">
             <div className="bg-green-500 h-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-right">{progress}% beherrscht</p>
        </div>
      </div>

      <div className="grid gap-4">
        <div className="flex justify-between items-center mb-2">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Begriffe in diesem Set ({deck.cards.length})</h3>
            <button 
                onClick={toggleSelectAll} 
                className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
                {selectedCardIds.size === deck.cards.length ? 'Alle abwählen' : 'Alle auswählen'}
            </button>
        </div>
        
        {deck.cards.length === 0 && (
             <div className="text-center py-8 text-gray-400">Keine Karten vorhanden.</div>
        )}

        {deck.cards.map((card, idx) => {
            const isSelected = selectedCardIds.has(card.id);
            return (
              <div 
                key={card.id} 
                className={`bg-white dark:bg-gray-800 p-4 rounded-xl border flex justify-between items-center group cursor-pointer transition-colors ${isSelected ? 'border-blue-500 dark:border-blue-500 ring-1 ring-blue-500' : 'border-gray-100 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'}`}
                onClick={() => toggleCard(card.id)}
              >
                <div className="flex items-center gap-4 flex-1 pr-4">
                   <div className={`flex-shrink-0 text-gray-400 ${isSelected ? 'text-blue-600' : ''}`}>
                       {isSelected ? <CheckSquare size={24} /> : <Square size={24} />}
                   </div>
                   <div className="flex-1">
                       <span className="text-xs font-mono text-gray-400 mb-1 block">{idx + 1}</span>
                       <div className="font-semibold text-gray-900 dark:text-white">{card.term}</div>
                       <div className="text-gray-500 dark:text-gray-400 text-sm mt-1">{card.definition}</div>
                   </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 mr-2 ${
                        card.status === 'known' ? 'bg-green-500' : 
                        card.status === 'half-known' ? 'bg-yellow-400' : 'bg-gray-300 dark:bg-gray-600'
                    }`}></div>
                    
                    {/* Action Buttons */}
                    <button 
                        onClick={(e) => startEditingCard(card, e)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                    >
                        <Edit2 size={16} />
                    </button>
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            if(window.confirm('Karte löschen?')) onDeleteCard(card.id);
                        }}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
              </div>
            );
        })}
      </div>

      {/* Edit Modal */}
      {editingCard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setEditingCard(null)}>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Karte bearbeiten</h3>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Begriff (Vorne)</label>
                        <input 
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-transparent text-gray-900 dark:text-white"
                            value={editTerm}
                            onChange={e => setEditTerm(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Definition (Hinten)</label>
                        <textarea 
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-transparent text-gray-900 dark:text-white h-24"
                            value={editDef}
                            onChange={e => setEditDef(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-2 mt-6">
                    <button onClick={() => setEditingCard(null)} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Abbrechen</button>
                    <button onClick={saveCardEdit} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                        <Save size={16} /> Speichern
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default DeckDetail;