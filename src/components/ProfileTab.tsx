import React, { useState } from 'react';
import { User, Book } from '../types';
import { storageService, DEFAULT_USER } from '../services/storageService';
import { User as UserIcon, BookOpen, Clock, RotateCcw, Check, Sparkles } from 'lucide-react';

interface ProfileTabProps {
  user: User;
  books: Book[];
  onUpdateUser: (user: User) => void;
  onResetSampleBooks: () => void;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({
  user,
  books,
  onUpdateUser,
  onResetSampleBooks,
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
    <section className="flex flex-col gap-6" aria-label="Profilo e statistiche">
      <div>
        <h2 className="text-2xl font-black text-white flex items-center gap-2">
          <UserIcon size={28} className="text-[#FFD600]" aria-hidden="true" />
          Profilo Utente
        </h2>
        <p className="text-sm font-bold text-[#B8B8B8]">Le tue statistiche di lettura e preferenze</p>
      </div>

      {/* User Info Card */}
      <div className="bg-[#1A1A1A] border-2 border-[#333333] rounded-3xl p-6 flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#FFD600] text-black font-black text-2xl flex items-center justify-center border-2 border-white shrink-0">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-black text-white truncate">{user.name}</h3>
            <p className="text-sm font-bold text-[#B8B8B8] truncate">{user.email}</p>
            <span className="inline-block mt-1 text-[11px] font-black uppercase bg-black text-[#FFD600] border border-[#FFD600] px-2.5 py-0.5 rounded-full">
              Account Attivo
            </span>
          </div>
        </div>

        {saveSuccess && (
          <div className="bg-[#00E676]/20 border border-[#00E676] text-white text-xs font-bold p-2 rounded-lg flex items-center gap-2">
            <Check size={16} className="text-[#00E676]" /> Profilo aggiornato con successo!
          </div>
        )}

        {isEditing ? (
          <form onSubmit={handleSave} className="flex flex-col gap-3 pt-2 border-t border-[#333333]">
            <div>
              <label htmlFor="user-name-input" className="text-xs font-bold text-[#B8B8B8] block mb-1">
                Nome completo
              </label>
              <input
                id="user-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-black border-2 border-white focus:border-[#FFD600] rounded-xl p-3 text-white font-bold"
                required
              />
            </div>
            <div>
              <label htmlFor="user-email-input" className="text-xs font-bold text-[#B8B8B8] block mb-1">
                Email
              </label>
              <input
                id="user-email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black border-2 border-white focus:border-[#FFD600] rounded-xl p-3 text-white font-bold"
                required
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                className="flex-1 min-h-[48px] bg-[#FFD600] text-black font-black rounded-xl border border-white hover:bg-[#FFEA00]"
              >
                Salva modifiche
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="min-h-[48px] px-4 bg-[#333333] text-white font-bold rounded-xl"
              >
                Annulla
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="min-h-[48px] bg-black border border-white hover:border-[#FFD600] text-white font-black text-sm rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FFD600]"
          >
            Modifica dati profilo
          </button>
        )}
      </div>

      {/* Reading Statistics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#1A1A1A] border-2 border-[#333333] rounded-3xl p-5 flex flex-col justify-between min-h-[110px]">
          <div className="flex items-center gap-2 text-[#FFD600]">
            <BookOpen size={24} />
            <span className="text-xs font-black uppercase text-white">Libri in libreria</span>
          </div>
          <p className="text-3xl font-black text-white mt-2">{books.length}</p>
          <span className="text-xs font-bold text-[#B8B8B8]">{totalPages} pagine totali</span>
        </div>

        <div className="bg-[#1A1A1A] border-2 border-[#333333] rounded-3xl p-5 flex flex-col justify-between min-h-[110px]">
          <div className="flex items-center gap-2 text-[#FFD600]">
            <Clock size={24} />
            <span className="text-xs font-black uppercase text-white">Tempo ascolto</span>
          </div>
          <p className="text-3xl font-black text-white mt-2">{user.totalReadingMinutes} m</p>
          <span className="text-xs font-bold text-[#B8B8B8]">Sessioni completate</span>
        </div>
      </div>

      {/* Quick accessibility instructions */}
      <div className="bg-[#1A1A1A] border-2 border-[#333333] rounded-3xl p-5 flex flex-col gap-3">
        <h3 className="text-base font-black text-white flex items-center gap-2">
          <Sparkles size={18} className="text-[#FFD600]" />
          Scorciatoie da tastiera e comandi
        </h3>
        <ul className="text-xs font-semibold text-[#B8B8B8] space-y-2 list-disc list-inside">
          <li><strong className="text-white">Tab / Shift+Tab:</strong> Spostati tra i pulsanti ad alto contrasto</li>
          <li><strong className="text-white">Spazio / Invio:</strong> Attiva la lettura o apri il libro selezionato</li>
          <li><strong className="text-white">Esc:</strong> Chiudi le finestre o torna indietro dal lettore</li>
        </ul>
      </div>

      {/* Reset data */}
      <div className="bg-[#1A1A1A] border-2 border-[#333333] rounded-3xl p-5 flex flex-col gap-3">
        <h3 className="text-sm font-black text-white">Opzioni libreria</h3>
        <button
          onClick={onResetSampleBooks}
          className="min-h-[52px] bg-black border border-white hover:border-[#FFD600] text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FFD600]"
          aria-label="Ripristina i libri di esempio della letteratura italiana"
        >
          <RotateCcw size={18} className="text-[#FFD600]" />
          Ripristina libri classici di esempio (Pinocchio, Manzoni, Rodari)
        </button>
      </div>
    </section>
  );
};
