import React, { useState, useRef } from 'react';
import { User } from '../types';
import { GraduationCap, ArrowRight, Upload, HardDriveDownload, Home } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (user: User) => void;
  onRestore: (file: File) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onRestore }) => {
  // Login State - Default to 'Flix'
  const [loginIdentifier, setLoginIdentifier] = useState('Flix');

  // Register State
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');

  const [isLogin, setIsLogin] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isLogin) {
      if (!loginIdentifier.trim()) return;

      // Determine if input is email or username
      const isEmail = loginIdentifier.includes('@');
      const name = isEmail ? loginIdentifier.split('@')[0] : loginIdentifier;
      
      const user: User = {
        id: loginIdentifier.toLowerCase().replace(/[^a-z0-9]/g, ''),
        email: isEmail ? loginIdentifier : `${name.toLowerCase()}@example.com`,
        name: name,
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${name}`
      };

      onLogin(user);
    } else {
      if (!regUsername.trim() || !regEmail.trim()) return;

      const user: User = {
        id: regUsername.toLowerCase().replace(/[^a-z0-9]/g, ''),
        email: regEmail,
        name: regUsername,
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${regUsername}`
      };

      onLogin(user);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onRestore(file);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4 relative">
      <a href="../index.html" className="absolute top-4 left-4 p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition" title="Zurück zur Startseite">
        <Home size={20} />
      </a>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-8 border border-gray-100 dark:border-gray-700">
        <div className="text-center mb-8">
          <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-600/30">
            <GraduationCap className="text-white w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Willkommen bei Fix Learn</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            {isLogin ? 'Melde dich an, um fortzufahren' : 'Erstelle ein neues Konto'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isLogin ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Benutzername oder E-Mail</label>
              <input
                type="text"
                required
                className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none transition text-gray-900 dark:text-white placeholder-gray-400"
                placeholder="Benutzername oder E-Mail"
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
              />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Benutzername</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none transition text-gray-900 dark:text-white placeholder-gray-400"
                  placeholder="Dein Benutzername"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">E-Mail</label>
                <input
                  type="email"
                  required
                  className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none transition text-gray-900 dark:text-white placeholder-gray-400"
                  placeholder="name@beispiel.de"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                />
              </div>
            </>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2 mt-6"
          >
            {isLogin ? 'Anmelden' : 'Registrieren'} <ArrowRight size={20} />
          </button>
        </form>

        <div className="my-6 flex items-center gap-4">
            <div className="h-px bg-gray-200 dark:bg-gray-700 flex-1"></div>
            <span className="text-xs text-gray-400 uppercase">Oder</span>
            <div className="h-px bg-gray-200 dark:bg-gray-700 flex-1"></div>
        </div>

        {/* Restore Section */}
        <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            className="hidden"
        />
        <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2 text-sm"
        >
            <HardDriveDownload size={18} />
            Backup wiederherstellen (Gerätewechsel)
        </button>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            {isLogin ? 'Noch kein Konto? Registrieren' : 'Bereits ein Konto? Anmelden'}
          </button>
        </div>
        
        <p className="mt-8 text-xs text-center text-gray-400">
            Hinweis: Um deine Daten auf einem anderen Gerät zu nutzen, verwende bitte die "Backup wiederherstellen" Funktion mit deiner Backup-Datei.
        </p>
      </div>
    </div>
  );
};

export default LoginScreen;