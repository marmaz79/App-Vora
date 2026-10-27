import React, { useState } from 'react';
import { User, Book } from '../types';
import { storageService } from '../services/storageService';
import { User as UserIcon, BookOpen, Clock, RotateCcw, Check, Sparkles, ArrowLeft, BarChart3, ArrowRight, LogOut, LogIn } from 'lucide-react';

interface ProfileTabProps {
  user: User;
  books: Book[];
  onUpdateUser: (user: User) => void;
  onResetSampleBooks: () => void;
  onShowSplash?: () => void;
  onBack?: () => void;
  onOpenLogin?: () => void;
  onLogout?: () => void;
  onOpenStats?: () => void;
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
  onOpenStats,
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
    <section className="flex flex-col gap-3.5 select-none animate-fade-in text-slate-800 pb-28" aria-label="Profilo e statistiche">
      {/* Header */}
      <div className="flex items-center gap-2.5 pt-1 border-b-2 border-dashed border-[#2BA8A2]/30 pb-2.5">
        {onBack && (
          <button
            onClick={onBack}
            aria-label="Torna indietro"
            className="w-10 h-10 rounded-full border border-[#2BA8A2]/30 bg-white flex items-center justify-center shrink-0 text-[#1E8C86] hover:bg-[#E8F6F5] active:scale-95 transition-all shadow-xs"
            title="Torna indietro"
          >
            <ArrowLeft size={20} />
          </button>
        )}
        <div className="min-w-0">
          <h2 className="text-2xl font-black text-[#1E8C86] flex items-center gap-2 tracking-tight">
            <UserIcon size={24} className="text-[#2BA8A2] shrink-0" aria-hidden="true" />
            <span>Profilo Utente</span>
            <span className="w-2.5 h-2.5 rounded-full bg-[#FFD23F] shadow-accent-glow inline-block" />
          </h2>
        </div>
      </div>

      {/* User Info Card (Flip7 White Card) */}
      <div className="bg-white border-2 border-[#2BA8A2]/20 rounded-3xl p-5 flex flex-col gap-3 shadow-card">
        <div className="flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-2xl bg-[#2BA8A2] text-white font-black text-2xl flex items-center justify-center border-2 border-[#FFD23F] shadow-accent-glow shrink-0">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-black text-slate-900 truncate">{user.name}</h3>
            <p className="text-xs font-semibold text-slate-500 truncate">{user.email}</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="inline-block text-[10px] font-black uppercase bg-[#E8F6F5] text-[#1E8C86] border border-[#2BA8A2]/30 px-3 py-0.5 rounded-full shadow-xs">
                {user.auth_provider === 'google' ? 'Google Auth (Firebase)' : 'Account Locale / Ospite'}
              </span>
            </div>
          </div>
        </div>

        {saveSuccess && (
          <div className="bg-[#E8F6F5] border-2 border-[#27AE60] text-[#27AE60] text-xs font-black p-3 rounded-2xl flex items-center gap-2 shadow-xs">
            <Check size={16} strokeWidth={3} /> Profilo aggiornato con successo!
          </div>
        )}

        {isEditing ? (
          <form onSubmit={handleSave} className="flex flex-col gap-3 pt-3 border-t-2 border-dashed border-[#2BA8A2]/20">
            <div>
              <label htmlFor="user-name-input" className="text-xs font-black text-[#1E8C86] uppercase tracking-wider block mb-1">
                Nome completo
              </label>
              <input
                id="user-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#FFF8E7] border-2 border-[#2BA8A2]/30 focus:border-[#2BA8A2] rounded-xl p-3 text-slate-900 font-bold text-sm outline-none shadow-xs"
                required
              />
            </div>
            <div>
              <label htmlFor="user-email-input" className="text-xs font-black text-[#1E8C86] uppercase tracking-wider block mb-1">
                Email
              </label>
              <input
                id="user-email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#FFF8E7] border-2 border-[#2BA8A2]/30 focus:border-[#2BA8A2] rounded-xl p-3 text-slate-900 font-bold text-sm outline-none shadow-xs"
                required
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                className="flex-1 min-h-[46px] bg-gradient-to-r from-[#FFD23F] to-[#FFE47A] hover:bg-[#FFD23F] text-[#1E8C86] font-black text-sm rounded-full transition-all active:scale-95 shadow-accent-glow border-2 border-[#E6B800]"
              >
                Salva modifiche
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="min-h-[46px] px-5 bg-white text-slate-700 font-bold text-sm rounded-full hover:bg-slate-50 border border-slate-300 active:scale-95 transition-all"
              >
                Annulla
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t-2 border-dashed border-[#2BA8A2]/20">
            <button
              onClick={() => setIsEditing(true)}
              className="flex-1 min-h-[42px] bg-white border-2 border-[#2BA8A2]/30 hover:border-[#2BA8A2] text-[#1E8C86] font-black text-xs rounded-full transition-all active:scale-95 shadow-xs"
            >
              Modifica profilo
            </button>

            {user.auth_provider === 'google' && onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="min-h-[42px] bg-[#FFF8E7] hover:bg-white text-[#EF6C4A] border-2 border-[#EF6C4A]/40 font-black text-xs rounded-full flex items-center justify-center gap-2 transition-all active:scale-95 px-4 shadow-xs"
              >
                <LogOut size={15} />
                <span>Disconnetti account</span>
              </button>
            )}

            {user.auth_provider !== 'google' && onOpenLogin && (
              <button
                type="button"
                onClick={onOpenLogin}
                className="min-h-[42px] bg-gradient-to-r from-[#FFD23F] to-[#FFE47A] hover:bg-[#FFD23F] text-[#1E8C86] font-black text-xs rounded-full flex items-center justify-center gap-2 transition-all shadow-accent-glow border-2 border-[#E6B800] active:scale-95 px-4"
              >
                <LogIn size={15} />
                <span>Accedi o Registrati</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Reading Statistics (Flip7 Cards with Left Colored Accent Bars) */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-white border-l-[6px] border-l-[#2BA8A2] border-y border-r border-[#2BA8A2]/15 rounded-2xl p-4 flex flex-col justify-between shadow-card">
          <div className="flex items-center gap-2 text-slate-500">
            <BookOpen size={18} className="text-[#1E8C86]" />
            <span className="text-[10px] font-black uppercase tracking-wider text-[#1E8C86]">Pagine lette</span>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {books.reduce((acc, b) => acc + (storageService.getBookStats(b).pagesRead), 0)}
          </p>
          <span className="text-[11px] font-bold text-slate-400">su {totalPages} totali</span>
        </div>

        <div className="bg-white border-l-[6px] border-l-[#FFD23F] border-y border-r border-[#2BA8A2]/15 rounded-2xl p-4 flex flex-col justify-between shadow-card">
          <div className="flex items-center gap-2 text-slate-500">
            <Clock size={18} className="text-[#FFD23F]" />
            <span className="text-[10px] font-black uppercase tracking-wider text-[#1E8C86]">Tempo dedicato</span>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-1">{user.totalReadingMinutes} m</p>
          <span className="text-[11px] font-bold text-slate-400">Tempo stimato</span>
        </div>
      </div>

      {/* Button to open Full Reading Stats Panel (Flip7 Gold CTA) */}
      {onOpenStats && (
        <button
          type="button"
          onClick={onOpenStats}
          className="w-full bg-gradient-to-r from-[#FFD23F] to-[#FFE47A] hover:bg-[#FFD23F] text-[#1E8C86] font-black text-sm p-4 rounded-2xl flex items-center justify-between transition-all shadow-accent-glow active:scale-98 border-2 border-[#E6B800]"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white text-[#1E8C86] flex items-center justify-center shadow-xs">
              <BarChart3 size={20} />
            </div>
            <div className="flex flex-col text-left">
              <span className="font-black text-slate-900 text-sm">Pannello Statistiche di Lettura</span>
              <span className="text-xs font-bold text-[#1E8C86]/80">Grafico settimanale e dettagli per libro</span>
            </div>
          </div>
          <ArrowRight size={20} strokeWidth={2.5} className="text-[#1E8C86]" />
        </button>
      )}

      {/* Quick accessibility instructions */}
      <div className="bg-white border-2 border-[#2BA8A2]/20 rounded-3xl p-4 sm:p-5 flex flex-col gap-2.5 shadow-card">
        <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
          <Sparkles size={16} className="text-[#FFD23F]" />
          <span>Scorciatoie da tastiera e comandi</span>
        </h3>
        <ul className="text-xs font-semibold text-slate-600 space-y-1.5 list-disc list-inside">
          <li><strong className="text-slate-900">Tab / Shift+Tab:</strong> Spostati tra i pulsanti e gli elementi interattivi</li>
          <li><strong className="text-slate-900">Spazio / Invio:</strong> Attiva la lettura o apri il libro selezionato</li>
          <li><strong className="text-slate-900">Esc:</strong> Chiudi le finestre o torna indietro dal lettore</li>
        </ul>
      </div>

      {/* Reset data & splash screen */}
      <div className="bg-white border-2 border-[#2BA8A2]/20 rounded-3xl p-4 sm:p-5 flex flex-col gap-2.5 shadow-card">
        <h3 className="text-sm font-black text-slate-900">Opzioni aspetto e dati</h3>
        {onShowSplash && (
          <button
            onClick={onShowSplash}
            className="min-h-[44px] bg-[#FFF8E7] hover:bg-white border-2 border-[#2BA8A2]/30 text-[#1E8C86] font-black text-xs rounded-full flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xs"
            aria-label="Mostra schermata iniziale di benvenuto"
          >
            <Sparkles size={16} className="text-[#FFD23F]" />
            <span>Mostra schermata di benvenuto</span>
          </button>
        )}
        <button
          onClick={onResetSampleBooks}
          className="min-h-[44px] bg-white hover:bg-[#E8F6F5] border-2 border-[#2BA8A2]/30 text-slate-700 font-bold text-xs rounded-full flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xs"
          aria-label="Ripristina i libri di esempio della letteratura italiana"
        >
          <RotateCcw size={16} className="text-[#1E8C86]" />
          <span>Ripristina libri classici di esempio (Pinocchio, Manzoni, Rodari)</span>
        </button>
      </div>
    </section>
  );
};
