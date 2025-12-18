import React, { useState, useEffect, useRef } from 'react';
import { Deck, SwipeDirection, User, Course, HistoryEntry, Flashcard, Folder } from './types';
import DeckCreator from './components/DeckCreator';
import FlashcardView from './components/FlashcardView';
import LiveConversation from './components/LiveConversation';
import ChatBot from './components/ChatBot';
import LoginScreen from './components/LoginScreen';
import DeckDetail from './components/DeckDetail';
import CourseDetail from './components/CourseDetail';
import HistoryModal from './components/HistoryModal';
import { Plus, MessageCircle, Mic, BookOpen, GraduationCap, Home, Sun, Moon, Download, Upload, LogOut, Users, Clock, Cloud, CloudCog, X, RotateCcw, Settings, Shuffle, Repeat, RefreshCw, Save, Edit2, Folder as FolderIcon, Trash2 } from 'lucide-react';

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
  const [folders, setFolders] = useState<Folder[]>(() => loadData<Folder[]>('vocabflow_folders', []));
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadData<HistoryEntry[]>('vocabflow_history', []));
  
  // Navigation/View State
  const [view, setView] = useState<string>('dashboard');
  const [activeDeckId, setActiveDeckId] = useState<string | null>(null);
  const [studyCardIds, setStudyCardIds] = useState<string[] | undefined>(undefined); // New: Track which cards to study
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null); // To view folder details if needed, or just filter

  // UI State
  const [showLive, setShowLive] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  
  const [isNewCourseModalOpen, setIsNewCourseModalOpen] = useState(false);
  const [newCourseName, setNewCourseName] = useState('');
  
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  
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
  const userFolders = currentUser ? folders.filter(f => f.authorId === currentUser.id) : [];
  const userHistory = currentUser ? history.filter(h => h.userId === currentUser.id) : [];

  const activeDeck = userDecks.find(d => d.id === activeDeckId);
  const activeCourse = userCourses.find(c => c.id === activeCourseId);

  // --- EFFECTS ---
  useEffect(() => { saveData('vocabflow_decks', decks); }, [decks]);
  useEffect(() => { saveData('vocabflow_courses', courses); }, [courses]);
  useEffect(() => { saveData('vocabflow_folders', folders); }, [folders]);
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
    // Remove from courses
    setCourses(prev => prev.map(c => ({
        ...c,
        deckIds: c.deckIds.filter(id => id !== deckId)
    })));
    // Remove from folders
    setFolders(prev => prev.map(f => ({
        ...f,
        deckIds: f.deckIds.filter(id => id !== deckId)
    })));
    if (activeDeckId === deckId) {
        setView('dashboard');
        setActiveDeckId(null);
    }
  };

  const handleRenameDeck = (deckId: string, newName: string) => {
      setDecks(prev => prev.map(d => d.id === deckId ? { ...d, name: newName } : d));
  };

  // GLOBAL CARD ACTIONS
  const handleUpdateCard = (updatedCard: Flashcard) => {
      setDecks(prevDecks => prevDecks.map(d => {
          // Find the deck containing this card
          if (d.cards.some(c => c.id === updatedCard.id)) {
              return {
                  ...d,
                  cards: d.cards.map(c => c.id === updatedCard.id ? updatedCard : c)
              };
          }
          return d;
      }));
  };

  const handleDeleteCard = (cardId: string) => {
      setDecks(prevDecks => prevDecks.map(d => {
          if (d.cards.some(c => c.id === cardId)) {
              return {
                  ...d,
                  cards: d.cards.filter(c => c.id !== cardId)
              };
          }
          return d;
      }));
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

  const handleCreateFolder = () => {
    if(!newFolderName.trim() || !currentUser) return;
    const newFolder: Folder = {
        id: crypto.randomUUID(),
        name: newFolderName,
        authorId: currentUser.id,
        deckIds: [],
        createdAt: Date.now()
    };
    setFolders([...folders, newFolder]);
    setNewFolderName('');
    setIsNewFolderModalOpen(false);
  };

  const handleDeleteFolder = (folderId: string) => {
      if(window.confirm('Möchtest du diesen Ordner wirklich löschen?')) {
          setFolders(folders.filter(f => f.id !== folderId));
      }
  };

  // --- COURSE MANAGEMENT ACTIONS ---

  const handleDeleteCourse = (courseId: string) => {
      if(window.confirm('Möchtest du diesen Kurs wirklich löschen?')) {
          setCourses(courses.filter(c => c.id !== courseId));
          if(activeCourseId === courseId) {
              setView('dashboard');
              setActiveCourseId(null);
          }
      }
  };

  const handleAddMemberToCourse = (courseId: string, name: string) => {
      const memberId = name.toLowerCase().replace(/\s+/g, '_');
      setCourses(prev => prev.map(c => {
          if (c.id === courseId && !c.memberIds.includes(memberId)) {
              return { ...c, memberIds: [...c.memberIds, memberId] };
          }
          return c;
      }));
  };

  const handleRemoveDeckFromCourse = (courseId: string, deckId: string) => {
      setCourses(prev => prev.map(c => {
          if (c.id === courseId) {
              return { ...c, deckIds: c.deckIds.filter(id => id !== deckId) };
          }
          return c;
      }));
  };

  const handleAddDeckToCourse = (courseId: string, deckId: string) => {
      setCourses(prev => prev.map(c => {
          if (c.id === courseId && !c.deckIds.includes(deckId)) {
              return { ...c, deckIds: [...c.deckIds, deckId] };
          }
          return c;
      }));
  };

  const handleAddToCourse = (courseId: string) => {
      if(!activeDeckId) return;
      handleAddDeckToCourse(courseId, activeDeckId);
      alert('Zum Kurs hinzugefügt!');
  };

  const handleAddToFolder = (folderId: string) => {
      if(!activeDeckId) return;
      setFolders(prev => prev.map(f => {
          if (f.id === folderId && !f.deckIds.includes(activeDeckId)) {
              return { ...f, deckIds: [...f.deckIds, activeDeckId] };
          }
          return f;
      }));
      alert('Zum Ordner hinzugefügt!');
  };

  // --- NAVIGATION ---

  const openDeckDetail = (deckId: string) => {
    setActiveDeckId(deckId);
    setView('deck-detail');
  };

  const openCourseDetail = (courseId: string) => {
    setActiveCourseId(courseId);
    setView('course-detail');
  };

  const startStudy = (cardIds?: string[]) => {
    setStudyCardIds(cardIds); // Set the filtered list (or undefined for all)
    setView('study');
  };

  // --- SYNC / EXPORT IMPORT PROFILE ---
  const exportFullProfile = () => {
    if (!currentUser) return;
    
    // Create a bundle of all data belonging to this user
    const profileData = {
        user: currentUser,
        decks: userDecks,
        courses: userCourses,
        folders: userFolders,
        history: userHistory,
        exportDate: Date.now(),
        appVersion: '1.0'
    };
    downloadJson(profileData, `fixlearn_backup_${currentUser.name}_${new Date().toISOString().slice(0,10)}.json`);
  };

  const handleExportCourse = (course: Course) => {
      const courseDecks = decks.filter(d => course.deckIds.includes(d.id));
      const shareData = {
          type: 'course_share',
          course,
          decks: courseDecks,
          exportedBy: currentUser?.name
      };
      downloadJson(shareData, `Kurs_${course.name.replace(/\s+/g, '_')}.json`);
  };

  const downloadJson = (data: any, filename: string) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
    const dl = document.createElement('a');
    dl.setAttribute("href", dataStr);
    dl.setAttribute("download", filename);
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
        
        // --- CASE 1: FULL PROFILE BACKUP ---
        if (data.user && Array.isArray(data.decks) && !data.type) {
            const isRestore = !currentUser;

            const confirmMsg = isRestore 
                ? `Konto "${data.user.name}" wiederherstellen?` 
                : `Profil "${data.user.name}" zusammenführen?`;

            if (window.confirm(confirmMsg)) {
                mergeData(data.decks, data.courses, data.history, data.folders || []);
                if (isRestore) {
                    setCurrentUser(data.user);
                    setView('dashboard');
                } else {
                    alert('Profil erfolgreich synchronisiert!');
                    setShowSyncModal(false);
                }
            }
        } 
        // --- CASE 2: SHARED COURSE ---
        else if (data.type === 'course_share' && data.course && Array.isArray(data.decks)) {
            if(window.confirm(`Kurs "${data.course.name}" und ${data.decks.length} Lernsets importieren?`)) {
                const courseToImport = { ...data.course };
                if (currentUser && !courseToImport.memberIds.includes(currentUser.id) && courseToImport.authorId !== currentUser.id) {
                     courseToImport.memberIds.push(currentUser.id);
                }
                
                mergeData(data.decks, [courseToImport], [], []);
                alert(`Kurs "${data.course.name}" erfolgreich importiert!`);
            }
        }
        else {
            alert('Ungültige Datei.');
        }
      } catch (err) { alert('Fehler beim Importieren.'); console.error(err); }
    };
    reader.readAsText(file);
  };

  const mergeData = (newDecks: Deck[], newCourses: Course[], newHistory: HistoryEntry[], newFolders: Folder[]) => {
        // Merge Decks
        const mergedDecks = [...decks];
        newDecks.forEach((d: Deck) => {
            if (!mergedDecks.find(existing => existing.id === d.id)) mergedDecks.push(d);
        });
        setDecks(mergedDecks);

        // Merge Courses
        const mergedCourses = [...courses];
        newCourses.forEach((c: Course) => {
            const existingIndex = mergedCourses.findIndex(existing => existing.id === c.id);
            if (existingIndex === -1) {
                mergedCourses.push(c);
            } else {
                 mergedCourses[existingIndex] = c;
            }
        });
        setCourses(mergedCourses);
        
        // Merge Folders
        const mergedFolders = [...folders];
        newFolders.forEach((f: Folder) => {
            if (!mergedFolders.find(existing => existing.id === f.id)) mergedFolders.push(f);
        });
        setFolders(mergedFolders);

        // Merge History
        const mergedHistory = [...history];
        newHistory.forEach((h: HistoryEntry) => {
            if (!mergedHistory.find(existing => existing.id === h.id)) mergedHistory.push(h);
        });
        setHistory(mergedHistory);
  };

  const handleImportProfile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processProfileFile(file);
    e.target.value = '';
  };


  // --- DECK IMPORT (Single) ---
  const exportDeck = (deck: Deck, e: React.MouseEvent) => {
    e.stopPropagation();
    downloadJson(deck, `${deck.name.replace(/\s+/g, '_')}.json`);
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
            // Check if it's a deck or a course share (handled by same input for convenience?)
            if(importedDeck.type === 'course_share') {
                alert('Dies ist eine Kurs-Datei. Bitte benutze den Profil-Import Button (unten/Cloud Icon).');
                return;
            }

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
          <button className="flex items-center gap-2" onClick={() => setView('dashboard')}>
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <GraduationCap className="text-white w-6 h-6" />
            </div>
            <span className="font-bold text-xl tracking-tight text-gray-900 dark:text-white">Fix Learn</span>
          </button>
          
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
            {/* Folders & Courses Section */}
            <div>
                 <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><Users size={20} /> Kurse & Ordner</h2>
                    <div className="flex gap-2">
                         <button onClick={() => setIsNewFolderModalOpen(true)} className="text-gray-600 dark:text-gray-400 text-sm font-medium hover:underline flex items-center gap-1">
                            <Plus size={16} /> Ordner
                        </button>
                        <button onClick={() => setIsNewCourseModalOpen(true)} className="text-blue-600 dark:text-blue-400 text-sm font-medium hover:underline flex items-center gap-1">
                            <Plus size={16} /> Kurs
                        </button>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                     {/* Render Folders */}
                     {userFolders.map(folder => (
                         <div key={folder.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-5 rounded-xl shadow-sm hover:shadow-md transition relative group">
                             <div className="flex items-start gap-3 mb-2">
                                 <FolderIcon className="text-yellow-500" size={24} />
                                 <h3 className="font-bold text-lg text-gray-900 dark:text-white">{folder.name}</h3>
                             </div>
                             <p className="text-xs text-gray-500 dark:text-gray-400 ml-9">{folder.deckIds.length} Sets</p>
                             <button 
                                onClick={() => handleDeleteFolder(folder.id)}
                                className="absolute top-4 right-4 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                             >
                                 <Trash2 size={16} />
                             </button>
                         </div>
                     ))}

                     {/* Render Courses */}
                     {userCourses.map(course => (
                         <div key={course.id} onClick={() => openCourseDetail(course.id)} className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-5 rounded-xl shadow-sm cursor-pointer hover:shadow-md hover:scale-[1.02] transition">
                             <h3 className="font-bold text-lg mb-1">{course.name}</h3>
                             <div className="flex items-center gap-4 text-xs opacity-90">
                                 <span className="flex items-center gap-1"><BookOpen size={12} /> {course.deckIds.length} Sets</span>
                                 <span className="flex items-center gap-1"><Users size={12} /> {course.memberIds.length + 1}</span>
                             </div>
                         </div>
                     ))}
                     
                     {userCourses.length === 0 && userFolders.length === 0 && (
                        <div className="col-span-full text-center py-8 text-gray-500 text-sm bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                             Erstelle Ordner oder Kurse, um deine Sets zu organisieren.
                        </div>
                     )}
                 </div>
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
                availableFolders={userFolders}
                onStartStudy={startStudy}
                onEdit={() => {/* handled inside component via modal or updated prop */}}
                onRenameDeck={(newName) => handleRenameDeck(activeDeck.id, newName)}
                onAddToCourse={handleAddToCourse}
                onAddToFolder={handleAddToFolder}
                onBack={() => setView('dashboard')}
                onDelete={() => handleDeleteDeck(activeDeck.id)}
                onUpdateCard={handleUpdateCard}
                onDeleteCard={handleDeleteCard}
            />
        )}

        {view === 'course-detail' && activeCourse && (
            <CourseDetail 
                course={activeCourse}
                decks={userDecks.filter(d => activeCourse.deckIds.includes(d.id))}
                allDecks={userDecks}
                currentUser={currentUser}
                onOpenDeck={openDeckDetail}
                onBack={() => setView('dashboard')}
                onDeleteCourse={handleDeleteCourse}
                onAddMember={handleAddMemberToCourse}
                onRemoveDeck={handleRemoveDeckFromCourse}
                onAddDeckToCourse={handleAddDeckToCourse}
                onExportCourse={handleExportCourse}
            />
        )}

        {view === 'study' && activeDeck && (
          <StudySession 
            deck={activeDeck} 
            initialCardIds={studyCardIds} 
            onBack={() => openDeckDetail(activeDeck.id)} 
            onUpdateGlobalDeck={handleUpdateCard}
          />
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
                    placeholder="Name des Kurses"
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
      
      {isNewFolderModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-xl w-full max-w-sm">
                  <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Neuer Ordner</h3>
                  <input 
                    autoFocus
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 mb-4 bg-transparent text-gray-900 dark:text-white"
                    placeholder="Name des Ordners"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                  />
                  <div className="flex justify-end gap-2">
                      <button onClick={() => setIsNewFolderModalOpen(false)} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Abbrechen</button>
                      <button onClick={handleCreateFolder} className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600">Erstellen</button>
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

// --- STUDY SESSION COMPONENT WITH SETTINGS ---

type StudyCard = Flashcard & { isRetry?: boolean };

const StudySession: React.FC<{ deck: Deck; initialCardIds?: string[]; onBack: () => void; onUpdateGlobalDeck: (card: Flashcard) => void }> = ({ deck, initialCardIds, onBack, onUpdateGlobalDeck }) => {
  const SESSION_KEY = `vocabflow_session_${deck.id}`;

  // Session Settings
  const [isShuffle, setIsShuffle] = useState(true);
  const [swapSides, setSwapSides] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editTerm, setEditTerm] = useState('');
  const [editDef, setEditDef] = useState('');

  // Initialize Queue
  const [studyQueue, setStudyQueue] = useState<StudyCard[]>(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.deckId === deck.id && Array.isArray(parsed.queue) && parsed.queue.length > 0) return parsed.queue;
      }
    } catch(e) {}
    
    let cardsToLearn = deck.cards;
    if (initialCardIds && initialCardIds.length > 0) {
      cardsToLearn = deck.cards.filter(c => initialCardIds.includes(c.id));
    }
    
    // Default random on start
    return [...cardsToLearn].sort(() => Math.random() - 0.5);
  });

  const [sessionHistory, setSessionHistory] = useState<{ card: StudyCard, action: SwipeDirection, insertedAt?: number }[]>(() => {
    try {
        const saved = localStorage.getItem(SESSION_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.deckId === deck.id) return parsed.history || [];
        }
    } catch(e) {}
    return [];
  });

  const [correctCount, setCorrectCount] = useState(() => {
    try {
        const saved = localStorage.getItem(SESSION_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.deckId === deck.id) return parsed.correctCount || 0;
        }
    } catch(e) {}
    return 0;
  });

  const wrongCount = studyQueue.slice(1).filter(c => c.isRetry).length;
  
  const [totalSessionCards] = useState(() => {
      try {
        const saved = localStorage.getItem(SESSION_KEY);
        if (saved) {
           const parsed = JSON.parse(saved);
           if (parsed.totalSessionCards) return parsed.totalSessionCards;
        }
      } catch(e) {}
      return studyQueue.length;
  });

  useEffect(() => {
    const data = {
      deckId: deck.id,
      queue: studyQueue,
      history: sessionHistory,
      correctCount,
      totalSessionCards
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(data));
  }, [studyQueue, sessionHistory, correctCount, deck.id, totalSessionCards]);

  const handleExit = () => {
    localStorage.removeItem(SESSION_KEY);
    onBack();
  };

  const handleRestart = () => {
      // Re-initialize queue
      let cardsToLearn = deck.cards;
      if (initialCardIds && initialCardIds.length > 0) {
        cardsToLearn = deck.cards.filter(c => initialCardIds.includes(c.id));
      }
      
      const newQueue = isShuffle 
        ? [...cardsToLearn].sort(() => Math.random() - 0.5)
        : [...cardsToLearn];
      
      setStudyQueue(newQueue);
      setSessionHistory([]);
      setCorrectCount(0);
      setShowSettings(false);
  };

  const handleToggleShuffle = () => {
      const newShuffleState = !isShuffle;
      setIsShuffle(newShuffleState);
      
      // Re-order current queue excluding the current active card (index 0)
      if (studyQueue.length > 1) {
          const current = studyQueue[0];
          const remaining = studyQueue.slice(1);
          const reordered = newShuffleState 
            ? remaining.sort(() => Math.random() - 0.5)
            : remaining.sort((a, b) => a.term.localeCompare(b.term)); // Simple alphanumeric sort if un-shuffling
          
          setStudyQueue([current, ...reordered]);
      }
  };

  const openEditModal = () => {
      if(studyQueue.length > 0) {
          setEditTerm(studyQueue[0].term);
          setEditDef(studyQueue[0].definition);
          setShowEdit(true);
          setShowSettings(false);
      }
  };

  const saveEdit = () => {
      if(studyQueue.length > 0) {
          const current = studyQueue[0];
          const updatedCard = { ...current, term: editTerm, definition: editDef };
          
          // Update Local Queue
          const newQueue = [...studyQueue];
          newQueue[0] = updatedCard;
          setStudyQueue(newQueue);

          // Update Global State
          onUpdateGlobalDeck(updatedCard);
          
          setShowEdit(false);
      }
  };

  const handleCardSwipe = (dir: SwipeDirection) => {
    if (studyQueue.length === 0) return;

    const currentCard = studyQueue[0];
    const remainingQueue = studyQueue.slice(1);
    let newQueue = [...remainingQueue];
    let insertedAt: number | undefined = undefined;

    if (dir === SwipeDirection.LEFT) {
      const retryCard = { ...currentCard, isRetry: true };
      const offset = 5 + Math.floor(Math.random() * 11);
      insertedAt = Math.min(newQueue.length, offset);
      newQueue.splice(insertedAt, 0, retryCard);

    } else if (dir === SwipeDirection.UP) {
      const retryCard = { ...currentCard, isRetry: true };
      const offset = 20; 
      insertedAt = Math.min(newQueue.length, offset);
      newQueue.splice(insertedAt, 0, retryCard);

    } else {
      setCorrectCount(prev => prev + 1);
    }

    setStudyQueue(newQueue);
    setSessionHistory(prev => [...prev, { card: currentCard, action: dir, insertedAt }]);
  };

  const handleUndo = () => {
    if (sessionHistory.length === 0) return;

    const lastAction = sessionHistory[sessionHistory.length - 1];
    const newHistory = sessionHistory.slice(0, -1);
    setSessionHistory(newHistory);

    if (lastAction.action === SwipeDirection.RIGHT) {
      setCorrectCount(prev => Math.max(0, prev - 1));
    }

    let newQueue = [...studyQueue];
    if (lastAction.insertedAt !== undefined) {
       const indexToRemove = newQueue.findIndex(c => c.id === lastAction.card.id);
       if (indexToRemove !== -1) {
         newQueue.splice(indexToRemove, 1);
       }
    }
    newQueue.unshift(lastAction.card);
    setStudyQueue(newQueue);
  };

  if (studyQueue.length === 0 && correctCount > 0) {
     return (
        <div className="max-w-md mx-auto text-center pt-20">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
                <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Fertig! 🎉</h2>
                <div className="flex justify-center gap-6 mb-6">
                    <div className="text-center">
                        <div className="text-3xl font-bold text-green-500">{correctCount}</div>
                        <div className="text-xs text-gray-500">Gewusst</div>
                    </div>
                </div>
                <div className="space-y-3">
                    <button onClick={handleRestart} className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-6 py-3 rounded-lg w-full flex items-center justify-center gap-2">
                         <RefreshCw size={18} /> Von vorne starten
                    </button>
                    <button onClick={handleExit} className="bg-blue-600 text-white px-6 py-3 rounded-lg w-full">Zurück zur Übersicht</button>
                </div>
            </div>
        </div>
     );
  }

  if (studyQueue.length === 0) return <div className="p-8 text-center text-gray-500">Lade Karten...</div>;

  return (
    <div className="flex flex-col items-center max-w-lg mx-auto h-[80vh] relative">
      
      {/* Top Bar */}
      <div className="w-full flex justify-between items-center mb-4 px-2">
         <span className="text-gray-400 font-medium text-sm tabular-nums">
            {Math.min(correctCount + 1, totalSessionCards)} von {totalSessionCards}
         </span>
         <button onClick={() => setShowSettings(true)} className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition">
             <Settings size={20} />
         </button>
      </div>

      <div className="flex-1 w-full flex items-center justify-center">
         <FlashcardView 
            key={`${studyQueue[0].id}-${correctCount}-${studyQueue.length}`} 
            card={studyQueue[0]} 
            onSwipe={handleCardSwipe} 
            swapSides={swapSides}
         />
      </div>
      
      {/* Footer Controls */}
      <div className="w-full flex items-center justify-between mt-8 px-4">
        <div className="flex items-center gap-4">
            <button onClick={handleExit} className="text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center gap-1 font-medium transition text-sm">
                Ende
            </button>
            <button 
                onClick={handleUndo} 
                disabled={sessionHistory.length === 0}
                className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
                title="Zurück (Undo)"
            >
                <RotateCcw size={20} />
            </button>
        </div>
        
        <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-full border border-red-100 dark:border-red-900/30">
                <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-red-600 dark:text-red-400 font-bold text-sm">{wrongCount}</span>
            </div>
            <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-full border border-green-100 dark:border-green-900/30">
                <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-600 dark:text-green-400 font-bold text-sm">{correctCount}</span>
            </div>
        </div>
      </div>
      <p className="text-center text-gray-300 dark:text-gray-600 text-xs mt-4">
         {/* Instruction text removed */}
      </p>

      {/* Settings Modal */}
      {showSettings && (
          <div className="absolute inset-0 bg-white/95 dark:bg-gray-900/95 z-20 flex flex-col items-center justify-center p-6 rounded-2xl backdrop-blur-sm animate-in fade-in zoom-in-95">
             <div className="w-full max-w-xs space-y-6">
                 <h3 className="text-xl font-bold text-center mb-6 text-gray-900 dark:text-white">Einstellungen</h3>
                 
                 <button 
                    onClick={() => setSwapSides(!swapSides)} 
                    className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700"
                 >
                     <div className="flex items-center gap-3">
                         <Repeat size={20} className="text-blue-600" />
                         <span className="font-medium text-gray-700 dark:text-gray-200">Rückseite zuerst</span>
                     </div>
                     <div className={`w-10 h-6 rounded-full p-1 transition-colors ${swapSides ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                         <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${swapSides ? 'translate-x-4' : 'translate-x-0'}`}></div>
                     </div>
                 </button>

                 <button 
                    onClick={handleToggleShuffle} 
                    className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700"
                 >
                     <div className="flex items-center gap-3">
                         <Shuffle size={20} className="text-purple-600" />
                         <span className="font-medium text-gray-700 dark:text-gray-200">Zufällige Reihenfolge</span>
                     </div>
                     <div className={`w-10 h-6 rounded-full p-1 transition-colors ${isShuffle ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                         <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${isShuffle ? 'translate-x-4' : 'translate-x-0'}`}></div>
                     </div>
                 </button>

                 <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                    <button onClick={openEditModal} className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition text-sm font-medium text-gray-700 dark:text-gray-300">
                        <Edit2 size={20} /> Karte bearbeiten
                    </button>
                    <button onClick={handleRestart} className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition text-sm font-medium text-gray-700 dark:text-gray-300">
                        <RefreshCw size={20} /> Neustart
                    </button>
                 </div>

                 <button onClick={() => setShowSettings(false)} className="w-full py-3 text-gray-500 hover:text-gray-900 dark:hover:text-white">
                     Schließen
                 </button>
             </div>
          </div>
      )}

      {/* Edit Modal In-Session */}
      {showEdit && (
        <div className="absolute inset-0 bg-black/50 z-30 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-sm shadow-xl animate-in fade-in zoom-in-95">
                <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Karte bearbeiten</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Begriff</label>
                        <input 
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-transparent text-gray-900 dark:text-white"
                            value={editTerm}
                            onChange={e => setEditTerm(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Definition</label>
                        <textarea 
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-transparent text-gray-900 dark:text-white h-24"
                            value={editDef}
                            onChange={e => setEditDef(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                    <button onClick={() => setShowEdit(false)} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Abbrechen</button>
                    <button onClick={saveEdit} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                        <Save size={16} /> Speichern
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default App;