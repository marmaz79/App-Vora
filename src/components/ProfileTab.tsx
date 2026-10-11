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
}

export const ProfileTab: React.FC<ProfileTabProps> = ({
  user,
  books,
  onUpdateUser,
  onResetSampleBooks,
  onShowSplash,
  onBack,
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
            className="w-11 h-11 rounded-xl border border-gray-200 hover:border-gray-300 bg-white flex items-center justify-center shrink-0 text-gray-700 hover:bg-gray-50 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black shadow-xs"
            title="Torna indietro"
          >
            <ArrowLeft size={22} className="text-gray-800" />
          </button>
        )}
        <div className="min-w-0">
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <UserIcon size={24} className="text-red-600" aria-hidden="true" />
            Profilo Utente
          </h2>
          <p className="text-xs font-semibold text-gray-500">Le tue statistiche di lettura e preferenze</p>
        </div>
      </div>

      {/* User Info Card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col gap-3 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-full bg-red-50 text-red-600 font-bold text-xl flex items-center justify-center border border-red-200 shrink-0">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-gray-900 truncate">{user.name}</h3>
            <p className="text-xs font-medium text-gray-500 truncate">{user.email}</p>
            <span className="inline-block mt-0.5 text-[10px] font-bold uppercase bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">
              Account Attivo
            </span>
          </div>
        </div>

        {saveSuccess && (
          <div className="bg-green-50 border border-green-200 text-green-800 text-xs font-semibold p-2.5 rounded-xl flex items-center gap-2">
            <Check size={16} className="text-green-600" /> Profilo aggiornato con successo!
          </div>
        )}

        {isEditing ? (
          <form onSubmit={handleSave} className="flex flex-col gap-3 pt-2 border-t border-gray-100">
            <div>
              <label htmlFor="user-name-input" className="text-xs font-bold text-gray-700 block mb-1">
                Nome completo
              </label>
              <input
                id="user-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 focus:border-black focus:bg-white rounded-xl p-3 text-gray-900 font-medium text-sm focus:outline-none focus:ring-1 focus:ring-black"
                required
              />
            </div>
            <div>
              <label htmlFor="user-email-input" className="text-xs font-bold text-gray-700 block mb-1">
                Email
              </label>
              <input
                id="user-email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 focus:border-black focus:bg-white rounded-xl p-3 text-gray-900 font-medium text-sm focus:outline-none focus:ring-1 focus:ring-black"
                required
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                className="flex-1 min-h-[46px] bg-gray-900 text-white font-bold text-sm rounded-xl hover:bg-black"
              >
                Salva modifiche
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="min-h-[46px] px-4 bg-gray-100 text-gray-700 font-semibold text-sm rounded-xl hover:bg-gray-200"
              >
                Annulla
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="min-h-[44px] bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-800 font-bold text-sm rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
          >
            Modifica dati profilo
          </button>
        )}
      </div>

      {/* Reading Statistics */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col justify-between min-h-[96px] shadow-sm">
          <div className="flex items-center gap-2 text-red-600">
            <BookOpen size={20} />
            <span className="text-[11px] font-bold uppercase text-gray-500">Libri in libreria</span>
          </div>
          <p className="text-2xl font-black text-gray-900 mt-1">{books.length}</p>
          <span className="text-[11px] font-medium text-gray-500">{totalPages} pagine totali</span>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col justify-between min-h-[96px] shadow-sm">
          <div className="flex items-center gap-2 text-blue-600">
            <Clock size={20} />
            <span className="text-[11px] font-bold uppercase text-gray-500">Tempo ascolto</span>
          </div>
          <p className="text-2xl font-black text-gray-900 mt-1">{user.totalReadingMinutes} m</p>
          <span className="text-[11px] font-medium text-gray-500">Sessioni completate</span>
        </div>
      </div>

      {/* Quick accessibility instructions */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col gap-2.5 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <Sparkles size={16} className="text-red-600" />
          Scorciatoie da tastiera e comandi
        </h3>
        <ul className="text-xs font-medium text-gray-600 space-y-1.5 list-disc list-inside">
          <li><strong className="text-gray-900">Tab / Shift+Tab:</strong> Spostati tra i pulsanti e gli elementi interattivi</li>
          <li><strong className="text-gray-900">Spazio / Invio:</strong> Attiva la lettura o apri il libro selezionato</li>
          <li><strong className="text-gray-900">Esc:</strong> Chiudi le finestre o torna indietro dal lettore</li>
        </ul>
      </div>

      {/* Reset data & splash screen */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col gap-2.5 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900">Opzioni libreria e aspetto</h3>
        {onShowSplash && (
          <button
            onClick={onShowSplash}
            className="min-h-[44px] bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-800 font-bold text-xs rounded-xl flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
            aria-label="Mostra schermata iniziale di benvenuto con logo e titolo"
          >
            <Sparkles size={16} className="text-red-600" />
            Mostra schermata iniziale (Splash screen)
          </button>
        )}
        <button
          onClick={onResetSampleBooks}
          className="min-h-[44px] bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-800 font-bold text-xs rounded-xl flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
          aria-label="Ripristina i libri di esempio della letteratura italiana"
        >
          <RotateCcw size={16} className="text-gray-600" />
          Ripristina libri classici di esempio (Pinocchio, Manzoni, Rodari)
        </button>
      </div>
    </section>
  );
};
