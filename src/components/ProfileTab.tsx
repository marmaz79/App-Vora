import React, { useState } from 'react';
import { User, Book } from '../types';
import { storageService, DEFAULT_USER } from '../services/storageService';
import { User as UserIcon, BookOpen, Clock, RotateCcw, Check, Sparkles, ArrowLeft } from 'lucide-react';

interface ProfileTabProps {
  user: User;
  books: Book[];
  onUpdateUser: (user: User) => void;
  onResetSampleBooks: () => void;
  onShowSplash?: () => void;
  onBack?: () => void;
  onOpenLogin?: () => void;
  onLogout?: () => void;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({
  user,
  books,
  onUpdateUser,
  onResetSampleBooks,
  onShowSplash,
  onBack,
  onOpenLogin,
  onLogout,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const totalPages = books.reduce((acc, b) => acc + b.pages.length, 0);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = { ...user, name, email };
    onUpdateUser(updated);
    setIsEditing(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  return (
    <section className="flex flex-col gap-3.5" aria-label="Profilo e statistiche">
      <div className="flex items-center gap-3 pt-1">
        {onBack && (
          <button
            onClick={onBack}
            aria-label="Torna indietro"
            className="w-11 h-11 rounded-xl border border-[#262A38] bg-[#141622] flex items-center justify-center shrink-0 text-gray-200 hover:bg-[#1E2235] hover:border-gray-500 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white shadow-xs"
            title="Torna indietro"
          >
            <ArrowLeft size={22} className="text-gray-200" />
          </button>
        )}
        <div className="min-w-0">
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <UserIcon size={24} className="text-red-500 shrink-0" aria-hidden="true" />
            Profilo Utente
          </h2>
        </div>
      </div>

      {/* User Info Card */}
      <div className="bg-[#12141C] border border-[#232736] rounded-2xl p-4 flex flex-col gap-3 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-full bg-[#260E12] text-red-500 font-bold text-xl flex items-center justify-center border border-red-900/60 shrink-0">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-white truncate">{user.name}</h3>
            <p className="text-xs font-medium text-gray-400 truncate">{user.email}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="inline-block text-[10px] font-bold uppercase bg-[#0D2418] text-green-400 border border-green-800/60 px-2 py-0.5 rounded-full">
                {user.auth_provider === 'google' ? 'Google Auth (Firebase)' : 'Account Ospite'}
              </span>
            </div>
          </div>
        </div>

        {saveSuccess && (
          <div className="bg-[#0D2418] border border-green-800/60 text-green-300 text-xs font-semibold p-2.5 rounded-xl flex items-center gap-2">
            <Check size={16} className="text-green-400" /> Profilo aggiornato con successo!
          </div>
        )}

        {isEditing ? (
          <form onSubmit={handleSave} className="flex flex-col gap-3 pt-2 border-t border-[#232736]">
            <div>
              <label htmlFor="user-name-input" className="text-xs font-bold text-gray-300 block mb-1">
                Nome completo
              </label>
              <input
                id="user-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#161824] border border-[#2B3042] focus:border-red-500 rounded-xl p-3 text-white font-medium text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                required
              />
            </div>
            <div>
              <label htmlFor="user-email-input" className="text-xs font-bold text-gray-300 block mb-1">
                Email
              </label>
              <input
                id="user-email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#161824] border border-[#2B3042] focus:border-red-500 rounded-xl p-3 text-white font-medium text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                required
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                className="flex-1 min-h-[46px] bg-red-600 hover:bg-red-500 text-white font-bold text-sm rounded-xl transition-colors active:scale-98"
              >
                Salva modifiche
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="min-h-[46px] px-4 bg-[#1C202F] text-gray-300 font-semibold text-sm rounded-xl hover:bg-[#252B3E]"
              >
                Annulla
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setIsEditing(true)}
              className="min-h-[44px] bg-[#161824] border border-[#2B3042] hover:border-gray-500 hover:bg-[#1E2235] text-gray-200 font-bold text-sm rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Modifica dati profilo
            </button>

            {user.auth_provider === 'google' && onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="min-h-[42px] bg-red-950/40 hover:bg-red-900/60 text-red-200 border border-red-800/50 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all active:scale-98"
              >
                <span>Disconnetti account Google</span>
              </button>
            )}

            {user.auth_provider !== 'google' && onOpenLogin && (
              <button
                type="button"
                onClick={onOpenLogin}
                className="min-h-[42px] bg-white hover:bg-gray-100 text-gray-900 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-98"
              >
                <span>Accedi con Google (Firebase Auth)</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Reading Statistics */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-[#12141C] border border-[#232736] rounded-2xl p-4 flex flex-col justify-between min-h-[96px] shadow-sm">
          <div className="flex items-center gap-2 text-red-500">
            <BookOpen size={20} />
            <span className="text-[11px] font-bold uppercase text-gray-400">Libri in libreria</span>
          </div>
          <p className="text-2xl font-black text-white mt-1">{books.length}</p>
          <span className="text-[11px] font-medium text-gray-400">{totalPages} pagine totali</span>
        </div>

        <div className="bg-[#12141C] border border-[#232736] rounded-2xl p-4 flex flex-col justify-between min-h-[96px] shadow-sm">
          <div className="flex items-center gap-2 text-blue-400">
            <Clock size={20} />
            <span className="text-[11px] font-bold uppercase text-gray-400">Tempo ascolto</span>
          </div>
          <p className="text-2xl font-black text-white mt-1">{user.totalReadingMinutes} m</p>
          <span className="text-[11px] font-medium text-gray-400">Sessioni completate</span>
        </div>
      </div>

      {/* Quick accessibility instructions */}
      <div className="bg-[#12141C] border border-[#232736] rounded-2xl p-4 flex flex-col gap-2.5 shadow-sm">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Sparkles size={16} className="text-red-500" />
          Scorciatoie da tastiera e comandi
        </h3>
        <ul className="text-xs font-medium text-gray-400 space-y-1.5 list-disc list-inside">
          <li><strong className="text-white">Tab / Shift+Tab:</strong> Spostati tra i pulsanti e gli elementi interattivi</li>
          <li><strong className="text-white">Spazio / Invio:</strong> Attiva la lettura o apri il libro selezionato</li>
          <li><strong className="text-white">Esc:</strong> Chiudi le finestre o torna indietro dal lettore</li>
        </ul>
      </div>

      {/* Reset data, Google Authenticator & splash screen */}
      <div className="bg-[#12141C] border border-[#232736] rounded-2xl p-4 flex flex-col gap-2.5 shadow-sm">
        <h3 className="text-sm font-bold text-white">Opzioni libreria e aspetto</h3>
        {onShowSplash && (
          <button
            onClick={onShowSplash}
            className="min-h-[44px] bg-[#161824] border border-[#2B3042] hover:border-gray-500 hover:bg-[#1E2235] text-gray-200 font-bold text-xs rounded-xl flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label="Mostra schermata iniziale di benvenuto con logo e titolo"
          >
            <Sparkles size={16} className="text-red-500" />
            Mostra schermata iniziale (Splash screen)
          </button>
        )}
        <button
          onClick={onResetSampleBooks}
          className="min-h-[44px] bg-[#161824] border border-[#2B3042] hover:border-gray-500 hover:bg-[#1E2235] text-gray-200 font-bold text-xs rounded-xl flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          aria-label="Ripristina i libri di esempio della letteratura italiana"
        >
          <RotateCcw size={16} className="text-gray-400" />
          Ripristina libri classici di esempio (Pinocchio, Manzoni, Rodari)
        </button>
      </div>
    </section>
  );
};
