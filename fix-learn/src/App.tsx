import React, { useState, useEffect, useRef } from 'react';
import { Deck, SwipeDirection, User, Course, HistoryEntry } from '@/types';
import DeckCreator from '@/components/DeckCreator';
import FlashcardView from '@/components/FlashcardView';
import LiveConversation from '@/components/LiveConversation';
import ChatBot from '@/components/ChatBot';
import LoginScreen from '@/components/LoginScreen';
import DeckDetail from '@/components/DeckDetail';
import CourseDetail from '@/components/CourseDetail';
import HistoryModal from '@/components/HistoryModal';
import { Plus, MessageCircle, Mic, BookOpen, GraduationCap, Home, Sun, Moon, Download, Upload, LogOut, Users, Clock, Cloud, CloudCog, X } from 'lucide-react';

// --- PERSISTENCE HELPERS ---
const loadData = <T,>(key: string, defaultValue: T): T => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : defaultValue;
  } catch (e) {
    console.error(`Failed to load ${key}`, e);
    return defaultValue;
  }
};

const saveData = <T,>(key: string, data: T) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// --- APP COMPONENT ---
const App: React.FC = () => {
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(() => loadData<User | null>('vocabflow_user', null));

  // Data State (Global Storage)
  const [decks, setDecks] = useState<Deck[]>(() => loadData<Deck[]>('vocabflow_decks', []));
  const [courses, setCourses] = useState<Course[]>(() => loadData<Course[]>('vocabflow_courses', []));
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadData<HistoryEntry[]>('vocabflow_history', []));
  
  // Navigation/View State
  const [view, setView] = useState<string>('dashboard');
  const [activeDeckId, setActiveDeckId] = useState<string | null>(null);
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);

  // UI State
  const [showLive, setShowLive] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [isNewCourseModalOpen, setIsNewCourseModalOpen] = useState(false);
  const [newCourseName, setNewCourseName] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const profileInputRef = useRef<HTMLInputElement>(null);
  
  // Dark Mode
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vocabflow_theme');
      if (saved) return saved === 'dark';
      return true;
    }
    return true;
  });

  // --- DERIVED STATE (Data Isolation) ---
  // Only show data belonging to the current user
  const userDecks = currentUser ? decks.filter(d => d.authorId === currentUser.id) : [];
  const userCourses = currentUser ? courses.filter(c => c.authorId === currentUser.id || c.memberIds.includes(currentUser.id)) : [];
  const userHistory = currentUser ? history.filter(h => h.userId === currentUser.id) : [];

  const activeDeck = userDecks.find(d => d.id === activeDeckId);
  const activeCourse = userCourses.find(c => c.id === activeCourseId);

  // --- EFFECTS ---
  useEffect(() => { saveData('vocabflow_decks', decks); }, [decks]);
  useEffect(() => { saveData('vocabflow_courses', courses); }, [courses]);
  useEffect(() => { saveData('vocabflow_history', history); }, [history]);
  useEffect(() => { 
    if (currentUser) {
        saveData('vocabflow_user', currentUser); 
    } else {
        localStorage.removeItem('vocabflow_user');
    }
  }, [currentUser]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('vocabflow_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('vocabflow_theme', 'light');
    }
  }, [isDarkMode]);

  // --- ACTIONS ---

  const addToHistory = (deckName: string, deckId: string, action: 'created' | 'imported') => {
    if (!currentUser) return;
    const newEntry: HistoryEntry = {
      id: crypto.randomUUID(),
      userId: currentUser.id,
      deckName,
      deckId,
      timestamp: Date.now(),
      action
    };
    setHistory(prev => [newEntry, ...prev]);
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setView('dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setView('dashboard');
  };

  const handleCreateDeck = (newDeck: Deck) => {
    if (currentUser) {
        newDeck.authorId = currentUser.id;
    }
    setDecks([...decks, newDeck]);
    addToHistory(newDeck.name, newDeck.id, 'created');
    setView('dashboard');
  };

  const handleDeleteDeck = (deckId: string) => {
    setDecks(decks.filter(d => d.id !== deckId));
    setCourses(prev => prev.map(c => ({
        ...c,
        deckIds: c.deckIds.filter(id => id !== deckId)
    })));
    setView('dashboard');
  };

  const handleCreateCourse = () => {
    if(!newCourseName.trim() || !currentUser) return;
    const newCourse: Course = {
        id: crypto.randomUUID(),
        name: newCourseName,
        description: 'Gemeinsames Lernen',
        authorId: currentUser.id,
        memberIds: [],
        deckIds: [],
        createdAt: Date.now()
    };
    setCourses([...courses, newCourse]);
    setNewCourseName('');
    setIsNewCourseModalOpen(false);
  };

  const handleAddToCourse = (courseId: string) => {
      if(!activeDeckId) return;
      setCourses(prev => prev.map(c => {
          if (c.id === courseId && !c.deckIds.includes(activeDeckId)) {
              return { ...c, deckIds: [...c.deckIds, activeDeckId] };
          }
          return c;
      }));
      alert('Zum Kurs hinzugefügt!');
  };

  const openDeckDetail = (deckId: string) => {
    setActiveDeckId(deckId);
    setView('deck-detail');
  };

  const openCourseDetail = (courseId: string) => {
    setActiveCourseId(courseId);
    setView('course-detail');
  };

  const startStudy = () => {
    setView('study');
  };

  const handleSwipe = (direction: SwipeDirection, deckId: string, cardId: string) => {
    setDecks(prevDecks => prevDecks.map(d => {
      if (d.id !== deckId) return d;
      return {
        ...d,
        cards: d.cards.map(c => {
          if (c.id !== cardId) return c;
          let newStatus = c.status;
          if (direction === SwipeDirection.RIGHT) newStatus = 'known';
          if (direction === SwipeDirection.LEFT) newStatus = 'unknown';
          if (direction === SwipeDirection.UP) newStatus = 'half-known';
          return { ...c, status: newStatus as any };
        })
      };
    }));
  };

  // --- SYNC / EXPORT IMPORT PROFILE ---
  const exportFullProfile = () => {
    if (!currentUser) return;
    
    // Create a bundle of all data belonging to this user
    const profileData = {
        user: currentUser,
        decks: userDecks,
        courses: userCourses,
        history: userHistory,
        exportDate: Date.now(),
        appVersion: '1.0'
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(profileData));
    const dl = document.createElement('a');
    dl.setAttribute("href", dataStr);
    dl.setAttribute("download", `fixlearn_backup_${currentUser.name}_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(dl);
    dl.click();
    dl.remove();
  };

  const triggerProfileImport = () => profileInputRef.current?.click();
  
  // Generic handler for loading a profile from a file object
  const processProfileFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.user && Array.isArray(data.decks)) {
            // If logged out (Login Screen), we set user and data
            // If logged in (Sync Modal), we merge data
            const isRestore = !currentUser;

            const confirmMsg = isRestore 
                ? `Konto "${data.user.name}" wiederherstellen?` 
                : `Profil "${data.user.name}" zusammenführen?`;

            if (window.confirm(confirmMsg)) {
                // Merge strategies:
                const newDecks = [...decks];
                data.decks.forEach((d: Deck) => {
                    if (!newDecks.find(existing => existing.id === d.id)) newDecks.push(d);
                });
                setDecks(newDecks);

                const newCourses = [...courses];
                data.courses.forEach((c: Course) => {
                    if (!newCourses.find(existing => existing.id === c.id)) newCourses.push(c);
                });
                setCourses(newCourses);

                const newHistory = [...history];
                data.history.forEach((h: HistoryEntry) => {
                    if (!newHistory.find(existing => existing.id === h.id)) newHistory.push(h);
                });
                setHistory(newHistory);
                
                // If restoring at login, set the user
                if (isRestore) {
                    setCurrentUser(data.user);
                    setView('dashboard');
                } else {
                    alert('Profil erfolgreich synchronisiert!');
                    setShowSyncModal(false);
                }
            }
        } else {
            alert('Ungültige Backup-Datei.');
        }
      } catch (err) { alert('Fehler beim Importieren des Profils.'); }
    };
    reader.readAsText(file);
  };

  const handleImportProfile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processProfileFile(file);
    e.target.value = '';
  };


  // --- DECK IMPORT (Single) ---
  const exportDeck = (deck: Deck, e: React.MouseEvent) => {
    e.stopPropagation();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(deck));
    const dl = document.createElement('a');
    dl.setAttribute("href", dataStr);
    dl.setAttribute("download", `${deck.name.replace(/\s+/g, '_')}.json`);
    document.body.appendChild(dl);
    dl.click();
    dl.remove();
  };
  const triggerImport = () => fileInputRef.current?.click();
  const handleImportDeck = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedDeck = JSON.parse(event.target?.result as string);
        if (importedDeck.id && importedDeck.name) {
            if (decks.some(d => d.id === importedDeck.id)) importedDeck.id = crypto.randomUUID();
            if (currentUser) importedDeck.authorId = currentUser.id; 
            setDecks(prev => [...prev, importedDeck]);
            addToHistory(importedDeck.name, importedDeck.id, 'imported');
            alert('Import erfolgreich!');
        }
      } catch (err) { alert('Fehler beim Import.'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };


  // --- RENDER ---
  
  if (!currentUser) {
    return (
        <div className={isDarkMode ? 'dark' : ''}>
            <LoginScreen 
                onLogin={handleLogin} 
                onRestore={processProfileFile}
            />
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 font-sans transition-colors duration-300">
      <input type="file" ref={fileInputRef} onChange={handleImportDeck} accept=".json" style={{ display: 'none' }} />
      <input type="file" ref={profileInputRef} onChange={handleImportProfile} accept=".json" style={{ display: 'none' }} />

      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-30 border-b border-gray-200 dark:border-gray-700 transition-colors">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="../" className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition" title="Zur Home-Seite">
              <Home size={20} />
            </a>
            <button className="flex items-center gap-2" onClick={() => setView('dashboard')}>
              <div className="bg-blue-600 p-1.5 rounded-lg">
                <GraduationCap className="text-white w-6 h-6" />
              </div>
              <span className="font-bold text-xl tracking-tight text-gray-900 dark:text-white">Fix Learn</span>
            </button>
          </div>
          
          <div className="flex items-center gap-3">
             <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition">
               {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
             </button>
             
             <button 
                onClick={() => setShowSyncModal(true)}
                className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition"
                title="Synchronisieren / Backup"
             >
                <CloudCog size={20} />
             </button>

             <button onClick={() => setShowLive(true)} className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-full text-sm font-medium border border-transparent dark:border-indigo-800 hidden sm:flex">
               <Mic size={16} /> Sprechen
             </button>
             
             {/* User Profile */}
             <div className="flex items-center gap-2 ml-2 pl-2 border-l border-gray-200 dark:border-gray-700">
                <img src={currentUser.avatar} alt="Profile" className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-600" />
                <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 transition" title="Abmelden">
                    <LogOut size={18} />
                </button>
             </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        
        {view === 'dashboard' && (
          <div className="space-y-10">
            {/* Courses Section */}
            <div>
                 <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><Users size={20} /> Meine Kurse & Boards</h2>
                    <button onClick={() => setIsNewCourseModalOpen(true)} className="text-blue-600 dark:text-blue-400 text-sm font-medium hover:underline flex items-center gap-1">
                        <Plus size={16} /> Kurs erstellen
                    </button>
                 </div>
                 {userCourses.length === 0 ? (
                     <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 text-center text-gray-500 text-sm">
                         Du bist noch in keinem Kurs. Erstelle einen, um Sets mit anderen zu teilen.
                     </div>
                 ) : (
                     <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                         {userCourses.map(course => (
                             <div key={course.id} onClick={() => openCourseDetail(course.id)} className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-5 rounded-xl shadow-sm cursor-pointer hover:shadow-md hover:scale-[1.02] transition">
                                 <h3 className="font-bold text-lg mb-1">{course.name}</h3>
                                 <div className="flex items-center gap-4 text-xs opacity-90">
                                     <span className="flex items-center gap-1"><BookOpen size={12} /> {course.deckIds.length} Sets</span>
                                     <span className="flex items-center gap-1"><Users size={12} /> {course.memberIds.length + 1}</span>
                                 </div>
                             </div>
                         ))}
                     </div>
                 )}
            </div>

            {/* Decks Section */}
            <div>
                <div className="flex justify-between items-center flex-wrap gap-4 mb-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><BookOpen size={20} /> Meine Lernsets</h2>
                  
                  <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setShowHistory(true)}
                        className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition flex items-center gap-1"
                      >
                         <Clock size={16} /> Verlauf
                      </button>

                      <button onClick={triggerImport} className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition flex items-center gap-1">
                        <Upload size={16} /> Import
                      </button>

                      <button onClick={() => setView('create')} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition shadow-sm text-sm font-medium">
                        <Plus size={16} /> Neues Set
                      </button>
                  </div>
                </div>

                {userDecks.length === 0 ? (
                  <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <BookOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <h3 className="text-md font-medium text-gray-900 dark:text-white">Keine Sets vorhanden</h3>
                    <p className="text-sm text-gray-500 mb-4">Erstelle Karten aus Texten oder Bildern.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {userDecks.map(deck => (
                      <div key={deck.id} onClick={() => openDeckDetail(deck.id)} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition cursor-pointer group relative">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-lg group-hover:text-blue-600 dark:group-hover:text-blue-400 transition truncate text-gray-900 dark:text-white pr-8">{deck.name}</h3>
                            <button onClick={(e) => exportDeck(deck, e)} className="text-gray-400 hover:text-blue-600 transition p-1"><Download size={16} /></button>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-4">
                          <span>{deck.cards.length} Karten</span>
                          <span>{new Date(deck.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
                           <div className="bg-green-500 h-full" style={{ width: `${(deck.cards.filter(c => c.status === 'known').length / deck.cards.length) * 100}%`}}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          </div>
        )}

        {/* --- VIEW ROUTING --- */}

        {view === 'create' && (
          <DeckCreator 
            authorId={currentUser.id}
            onDeckCreated={handleCreateDeck} 
            onCancel={() => setView('dashboard')} 
          />
        )}

        {view === 'deck-detail' && activeDeck && (
            <DeckDetail 
                deck={activeDeck} 
                availableCourses={userCourses}
                onStartStudy={startStudy}
                onEdit={() => alert('Bearbeitungsmodus würde hier starten.')}
                onAddToCourse={handleAddToCourse}
                onBack={() => setView('dashboard')}
                onDelete={() => handleDeleteDeck(activeDeck.id)}
            />
        )}

        {view === 'course-detail' && activeCourse && (
            <CourseDetail 
                course={activeCourse}
                decks={userDecks.filter(d => activeCourse.deckIds.includes(d.id))}
                currentUser={currentUser}
                onOpenDeck={openDeckDetail}
                onBack={() => setView('dashboard')}
            />
        )}

        {view === 'study' && activeDeck && (
          <StudySession deck={activeDeck} onSwipe={handleSwipe} onBack={() => openDeckDetail(activeDeck.id)} />
        )}
      </main>

      {/* Modals */}
      <HistoryModal isOpen={showHistory} onClose={() => setShowHistory(false)} history={userHistory} />

      {/* Sync Modal */}
      {showSyncModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100 dark:border-gray-700">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <CloudCog className="text-blue-600" />
                Synchronisierung
              </h3>
              <button onClick={() => setShowSyncModal(false)} className="text-gray-400 hover:text-gray-600"><CloudCog size={0} className="hidden" /><X size={24} className="hover:text-gray-900 dark:hover:text-white" /></button>
            </div>
            
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
              Um deine Daten auf einem anderen Gerät zu nutzen, erstelle ein Backup und importiere es dort.
            </p>

            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                <h4 className="font-bold text-blue-700 dark:text-blue-300 mb-2 flex items-center gap-2">
                  <Download size={16} /> Backup erstellen
                </h4>
                <p className="text-xs text-blue-600 dark:text-blue-400 mb-3">
                  Speichere dein komplettes Profil (Kurse, Sets, Verlauf) als Datei.
                </p>
                <button onClick={exportFullProfile} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition text-sm">
                  Profil herunterladen
                </button>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                <h4 className="font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <Upload size={16} /> Backup wiederherstellen
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Lade eine Backup-Datei hoch, um Daten auf diesem Gerät zu synchronisieren.
                </p>
                <button onClick={triggerProfileImport} className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 font-semibold py-2 rounded-lg transition text-sm">
                  Datei auswählen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isNewCourseModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-xl w-full max-w-sm">
                  <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Neuer Kurs / Board</h3>
                  <input 
                    autoFocus
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 mb-4 bg-transparent text-gray-900 dark:text-white"
                    placeholder="Name des Kurses (z.B. Englisch Klasse 10)"
                    value={newCourseName}
                    onChange={(e) => setNewCourseName(e.target.value)}
                  />
                  <div className="flex justify-end gap-2">
                      <button onClick={() => setIsNewCourseModalOpen(false)} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Abbrechen</button>
                      <button onClick={handleCreateCourse} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Erstellen</button>
                  </div>
              </div>
          </div>
      )}

      {/* Footer / Floating Elements */}
      <button onClick={() => setShowChat(!showChat)} className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-700 transition z-40 hover:scale-105">
        <MessageCircle size={28} />
      </button>
      <ChatBot isOpen={showChat} onClose={() => setShowChat(false)} />
      {showLive && <LiveConversation onClose={() => setShowLive(false)} />}
    </div>
  );
};

// Simplified StudySession sub-component (Same logic as before)
const StudySession: React.FC<{ deck: Deck; onSwipe: (dir: SwipeDirection, deckId: string, cardId: string) => void; onBack: () => void; }> = ({ deck, onSwipe, onBack }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [finished, setFinished] = useState(false);
  const handleCardSwipe = (dir: SwipeDirection) => {
    onSwipe(dir, deck.id, deck.cards[currentIndex].id);
    if (currentIndex < deck.cards.length - 1) setCurrentIndex(p => p + 1); else setFinished(true);
  };
  if (finished) return (
      <div className="max-w-md mx-auto text-center pt-20">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Fertig! 🎉</h2>
          <button onClick={onBack} className="bg-blue-600 text-white px-6 py-3 rounded-lg w-full">Zurück zur Übersicht</button>
        </div>
      </div>
  );
  return (
    <div className="flex flex-col items-center max-w-lg mx-auto">
      <div className="w-full flex items-center justify-between mb-8">
        <button onClick={onBack} className="text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center gap-1"><Home size={18} /> Beenden</button>
        <span className="text-gray-400 font-medium">{currentIndex + 1} / {deck.cards.length}</span>
      </div>
      <div className="w-full flex justify-center mb-8">
        <FlashcardView key={deck.cards[currentIndex].id} card={deck.cards[currentIndex]} onSwipe={handleCardSwipe} />
      </div>
      <p className="text-center text-gray-400 text-sm mt-8">Wischen: Rechts (Gewusst) • Links (Nicht)</p>
    </div>
  );
};

export default App;