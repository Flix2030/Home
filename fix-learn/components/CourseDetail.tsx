import React, { useState } from 'react';
import { Course, Deck, User } from '../types';
import { Users, BookOpen, ArrowLeft, Plus, Share2, Trash2, X, UserPlus, FilePlus } from 'lucide-react';

interface CourseDetailProps {
  course: Course;
  decks: Deck[]; // Decks belonging to this course
  allDecks: Deck[]; // All decks available to the user (for adding to course)
  currentUser: User;
  onOpenDeck: (deckId: string) => void;
  onBack: () => void;
  onDeleteCourse: (courseId: string) => void;
  onAddMember: (courseId: string, name: string) => void;
  onRemoveDeck: (courseId: string, deckId: string) => void;
  onAddDeckToCourse: (courseId: string, deckId: string) => void;
  onExportCourse: (course: Course) => void;
}

const CourseDetail: React.FC<CourseDetailProps> = ({ 
    course, 
    decks, 
    allDecks, 
    currentUser, 
    onOpenDeck, 
    onBack,
    onDeleteCourse,
    onAddMember,
    onRemoveDeck,
    onAddDeckToCourse,
    onExportCourse
}) => {
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [showAddDeck, setShowAddDeck] = useState(false);

  const handleAddMember = (e: React.FormEvent) => {
      e.preventDefault();
      if(newMemberName.trim()) {
          onAddMember(course.id, newMemberName.trim());
          setNewMemberName('');
          setShowAddMember(false);
      }
  };

  // Filter decks that are NOT already in the course
  const availableDecks = allDecks.filter(d => !course.deckIds.includes(d.id));

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <div className="flex justify-between items-center mb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition">
            <ArrowLeft size={20} /> Zurück
        </button>
        <div className="flex gap-2">
            <button 
                onClick={() => onExportCourse(course)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition font-medium text-sm"
                title="Kurs teilen (Export)"
            >
                <Share2 size={18} /> Teilen
            </button>
            <button 
                onClick={() => onDeleteCourse(course.id)}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition font-medium text-sm"
                title="Kurs löschen"
            >
                <Trash2 size={18} /> Löschen
            </button>
        </div>
      </div>

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl shadow-lg p-8 mb-8 text-white relative overflow-hidden">
        <div className="relative z-10">
            <h1 className="text-3xl font-bold mb-2">{course.name}</h1>
            <p className="text-indigo-100 max-w-2xl mb-6">{course.description || "Gemeinsamer Lernbereich"}</p>
            
            <div className="flex flex-wrap items-center gap-6 text-sm font-medium">
                <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/10">
                    <Users size={16} />
                    <span>{course.memberIds.length + 1} Mitglieder</span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/10">
                    <BookOpen size={16} />
                    <span>{decks.length} Lernsets</span>
                </div>
            </div>
        </div>
        
        {/* Members Stack */}
        <div className="absolute bottom-8 right-8 flex flex-col items-end gap-2">
           <div className="flex -space-x-2">
                <img src={currentUser.avatar} alt="You" className="w-10 h-10 rounded-full border-2 border-purple-600 shadow-sm" title="Du" />
                {course.memberIds.map((mid, i) => (
                    <img 
                        key={i} 
                        src={`https://api.dicebear.com/7.x/initials/svg?seed=${mid}`} 
                        alt={mid} 
                        className="w-10 h-10 rounded-full border-2 border-purple-600 bg-gray-200 shadow-sm" 
                        title={mid}
                    />
                ))}
                <button 
                    onClick={() => setShowAddMember(true)}
                    className="w-10 h-10 rounded-full border-2 border-dashed border-white/50 bg-white/10 hover:bg-white/30 flex items-center justify-center text-white transition backdrop-blur-sm"
                    title="Mitglied hinzufügen"
                >
                    <UserPlus size={18} />
                </button>
           </div>
        </div>
      </div>

      {/* Add Member Modal / Input Area */}
      {showAddMember && (
          <div className="mb-8 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-indigo-100 dark:border-indigo-900/30 animate-in fade-in slide-in-from-top-4">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Person hinzufügen</h3>
              <form onSubmit={handleAddMember} className="flex gap-2">
                  <input 
                    autoFocus
                    type="text" 
                    placeholder="Name der Person" 
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-transparent text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={newMemberName}
                    onChange={e => setNewMemberName(e.target.value)}
                  />
                  <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium text-sm">Hinzufügen</button>
                  <button type="button" onClick={() => setShowAddMember(false)} className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">Abbrechen</button>
              </form>
          </div>
      )}

      {/* Add Deck Modal */}
      {showAddDeck && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h3 className="font-bold text-gray-900 dark:text-white">Lernset hinzufügen</h3>
                    <button onClick={() => setShowAddDeck(false)}><X className="text-gray-500" /></button>
                </div>
                <div className="p-4 overflow-y-auto flex-1">
                    {availableDecks.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">Keine weiteren Sets verfügbar.</p>
                    ) : (
                        <div className="grid gap-3">
                            {availableDecks.map(deck => (
                                <button 
                                    key={deck.id}
                                    onClick={() => {
                                        onAddDeckToCourse(course.id, deck.id);
                                        setShowAddDeck(false);
                                    }}
                                    className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-left transition group"
                                >
                                    <span className="font-medium text-gray-800 dark:text-gray-200">{deck.name}</span>
                                    <Plus size={18} className="text-indigo-500 opacity-0 group-hover:opacity-100 transition" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BookOpen className="text-indigo-600 dark:text-indigo-400" size={24} />
            Lernsets
        </h2>
        <button 
            onClick={() => setShowAddDeck(true)}
            className="flex items-center gap-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 rounded-lg transition"
        >
            <FilePlus size={16} /> Set hinzufügen
        </button>
      </div>

      {decks.length === 0 ? (
         <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
             <div className="bg-gray-50 dark:bg-gray-700/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="text-gray-400" size={32} />
             </div>
             <p className="text-gray-500 dark:text-gray-400 font-medium">Dieser Kurs ist leer.</p>
             <p className="text-sm text-gray-400 mt-1 mb-6">Füge existierende Sets hinzu, damit Mitglieder lernen können.</p>
             <button onClick={() => setShowAddDeck(true)} className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition">
                 Set hinzufügen
             </button>
         </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {decks.map(deck => (
            <div 
              key={deck.id} 
              className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition group relative"
            >
              <div onClick={() => onOpenDeck(deck.id)} className="cursor-pointer">
                  <h3 className="font-bold text-lg group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition mb-2 truncate text-gray-900 dark:text-white pr-8">{deck.name}</h3>
                  <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-4">
                    <span>{deck.cards.length} Karten</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-indigo-500 h-full" 
                        style={{ width: `${(deck.cards.filter(c => c.status === 'known').length / deck.cards.length) * 100}%`}}
                      ></div>
                  </div>
              </div>
              
              <button 
                onClick={(e) => {
                    e.stopPropagation();
                    if(window.confirm('Set aus diesem Kurs entfernen?')) onRemoveDeck(course.id, deck.id);
                }}
                className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition opacity-0 group-hover:opacity-100"
                title="Aus Kurs entfernen"
              >
                  <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CourseDetail;