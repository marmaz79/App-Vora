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
            className="w-11 h-11 rounded-xl border border-white/20 bg-black flex items-center justify-center shrink-0 text-white hover:bg-zinc-900 hover:border-white active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            title="Torna indietro"
          >
            <ArrowLeft size={22} className="text-white" />
          </button>
        )}
        <div className="min-w-0">
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <UserIcon size={24} className="text-white shrink-0" aria-hidden="true" />
            Profilo Utente
          </h2>
        </div>
      </div>

      {/* User Info Card */}
      <div className="bg-black border border-white/20 rounded-2xl p-4 flex flex-col gap-3 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-full bg-zinc-900 text-white font-bold text-xl flex items-center justify-center border border-white/30 shrink-0">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-white truncate">{user.name}</h3>
            <p className="text-xs font-medium text-zinc-400 truncate">{user.email}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="inline-block text-[10px] font-bold uppercase bg-zinc-900 text-white border border-white/30 px-2 py-0.5 rounded-full">
                {user.auth_provider === 'google' ? 'Google Auth (Firebase)' : 'Account Ospite'}
              </span>
            </div>
          </div>
        </div>

        {saveSuccess && (
          <div className="bg-black border border-white/30 text-white text-xs font-semibold p-2.5 rounded-xl flex items-center gap-2">
            <Check size={16} className="text-white" /> Profilo aggiornato con successo!
          </div>
        )}

        {isEditing ? (
          <form onSubmit={handleSave} className="flex flex-col gap-3 pt-2 border-t border-zinc-800">
            <div>
              <label htmlFor="user-name-input" className="text-xs font-bold text-zinc-300 block mb-1">
                Nome completo
              </label>
              <input
                id="user-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-black border border-white/20 focus:border-white rounded-xl p-3 text-white font-medium text-sm focus:outline-none"
                required
              />
            </div>
            <div>
              <label htmlFor="user-email-input" className="text-xs font-bold text-zinc-300 block mb-1">
                Email
              </label>
              <input
                id="user-email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black border border-white/20 focus:border-white rounded-xl p-3 text-white font-medium text-sm focus:outline-none"
                required
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                className="flex-1 min-h-[46px] bg-white hover:bg-zinc-200 text-black font-black text-sm rounded-xl transition-colors active:scale-98"
              >
                Salva modifiche
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="min-h-[46px] px-4 bg-zinc-900 text-white font-semibold text-sm rounded-xl hover:bg-zinc-800 border border-zinc-800"
              >
                Annulla
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setIsEditing(true)}
              className="min-h-[44px] bg-black border border-white/20 hover:border-white hover:bg-zinc-950 text-white font-bold text-sm rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Modifica dati profilo
            </button>

            {user.auth_provider === 'google' && onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="min-h-[42px] bg-black hover:bg-zinc-900 text-white border border-white/20 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all active:scale-98"
              >
                <span>Disconnetti account Google</span>
              </button>
            )}

            {user.auth_provider !== 'google' && onOpenLogin && (
              <button
                type="button"
                onClick={onOpenLogin}
                className="min-h-[42px] bg-white hover:bg-zinc-200 text-black font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-98"
              >
                <span>Accedi con Google (Firebase Auth)</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Reading Statistics */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-black border border-white/20 rounded-2xl p-4 flex flex-col justify-between min-h-[96px] shadow-sm">
          <div className="flex items-center gap-2 text-white">
            <BookOpen size={20} />
            <span className="text-[11px] font-bold uppercase text-zinc-400">Libri in libreria</span>
          </div>
          <p className="text-2xl font-black text-white mt-1">{books.length}</p>
          <span className="text-[11px] font-medium text-zinc-400">{totalPages} pagine totali</span>
        </div>

        <div className="bg-black border border-white/20 rounded-2xl p-4 flex flex-col justify-between min-h-[96px] shadow-sm">
          <div className="flex items-center gap-2 text-white">
            <Clock size={20} />
            <span className="text-[11px] font-bold uppercase text-zinc-400">Tempo ascolto</span>
          </div>
          <p className="text-2xl font-black text-white mt-1">{user.totalReadingMinutes} m</p>
          <span className="text-[11px] font-medium text-zinc-400">Sessioni completate</span>
        </div>
      </div>

      {/* Quick accessibility instructions */}
      <div className="bg-black border border-white/20 rounded-2xl p-4 flex flex-col gap-2.5 shadow-sm">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Sparkles size={16} className="text-white" />
          Scorciatoie da tastiera e comandi
        </h3>
        <ul className="text-xs font-medium text-zinc-400 space-y-1.5 list-disc list-inside">
          <li><strong className="text-white">Tab / Shift+Tab:</strong> Spostati tra i pulsanti e gli elementi interattivi</li>
          <li><strong className="text-white">Spazio / Invio:</strong> Attiva la lettura o apri il libro selezionato</li>
          <li><strong className="text-white">Esc:</strong> Chiudi le finestre o torna indietro dal lettore</li>
        </ul>
      </div>

      {/* Reset data, Google Authenticator & splash screen */}
      <div className="bg-black border border-white/20 rounded-2xl p-4 flex flex-col gap-2.5 shadow-sm">
        <h3 className="text-sm font-bold text-white">Opzioni libreria e aspetto</h3>
        {onShowSplash && (
          <button
            onClick={onShowSplash}
            className="min-h-[44px] bg-black border border-white/20 hover:border-white hover:bg-zinc-950 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label="Mostra schermata iniziale di benvenuto con logo e titolo"
          >
            <Sparkles size={16} className="text-white" />
            Mostra schermata iniziale (Splash screen)
          </button>
        )}
        <button
          onClick={onResetSampleBooks}
          className="min-h-[44px] bg-black border border-white/20 hover:border-white hover:bg-zinc-950 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          aria-label="Ripristina i libri di esempio della letteratura italiana"
        >
          <RotateCcw size={16} className="text-white" />
          Ripristina libri classici di esempio (Pinocchio, Manzoni, Rodari)
        </button>
      </div>
    </section>
  );
};
