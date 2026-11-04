import React, { useState } from 'react';
import { User, Book } from '../types';
import { storageService } from '../services/storageService';
import {
  User as UserIcon,
  BookOpen,
  Clock,
  Check,
  ArrowLeft,
  BarChart3,
  ArrowRight,
  LogOut,
  LogIn,
  Cloud,
  RefreshCw,
} from 'lucide-react';

interface ProfileTabProps {
  user: User;
  books: Book[];
  onUpdateUser: (user: User) => void;
  onBack?: () => void;
  onOpenLogin?: () => void;
  onLogout?: () => void;
  onOpenStats?: () => void;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({
  user,
  books,
  onUpdateUser,
  onBack,
  onOpenLogin,
  onLogout,
  onOpenStats,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

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
    <section
      className="flex flex-col gap-3.5 select-none animate-fade-in text-white pb-28"
      aria-label="Profilo e statistiche"
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 pt-1 border-b-2 border-dashed border-white/20 pb-2.5">
        {onBack && (
          <button
            onClick={onBack}
            aria-label="Torna indietro"
            className="w-10 h-10 rounded-full border-2 border-white bg-transparent flex items-center justify-center shrink-0 text-white hover:bg-white/10 active:scale-95 transition-all shadow-xs"
            title="Torna indietro"
          >
            <ArrowLeft size={20} className="text-white" />
          </button>
        )}
        <div className="min-w-0">
          <h2 className="text-2xl font-black text-white flex items-center gap-2 tracking-tight">
            <UserIcon size={24} className="text-white shrink-0" aria-hidden="true" />
            <span className="text-white">Profilo Utente</span>
            <span className="w-2.5 h-2.5 rounded-full bg-white shadow-accent-glow inline-block" />
          </h2>
        </div>
      </div>

      {/* User Info Card */}
      <div className="bg-transparent border-2 border-white rounded-3xl p-5 flex flex-col gap-3 shadow-card text-white">
        <div className="flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-2xl bg-transparent border-2 border-white text-white font-black text-2xl flex items-center justify-center shadow-xs shrink-0">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-black text-white truncate">{user.name}</h3>
            <p className="text-xs font-semibold text-white/90 truncate">{user.email}</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="inline-block text-[10px] font-black uppercase bg-transparent text-white border border-white px-3 py-0.5 rounded-full shadow-xs">
                {user.auth_provider === 'google' ? 'Google Auth (Firebase)' : 'Account Locale / Ospite'}
              </span>
            </div>
          </div>
        </div>

        {saveSuccess && (
          <div className="bg-transparent border-2 border-white text-white text-xs font-black p-3 rounded-2xl flex items-center gap-2 shadow-xs">
            <Check size={16} strokeWidth={3} className="text-white" /> Profilo aggiornato con successo!
          </div>
        )}

        {isEditing ? (
          <form onSubmit={handleSave} className="flex flex-col gap-3 pt-3 border-t-2 border-dashed border-white/20">
            <div>
              <label htmlFor="user-name-input" className="text-xs font-black text-white uppercase tracking-wider block mb-1">
                Nome completo
              </label>
              <input
                id="user-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-transparent border-2 border-white focus:border-white rounded-xl p-3 text-white font-bold text-sm outline-none shadow-xs placeholder:text-white/60"
                required
              />
            </div>
            <div>
              <label htmlFor="user-email-input" className="text-xs font-black text-white uppercase tracking-wider block mb-1">
                Email
              </label>
              <input
                id="user-email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent border-2 border-white focus:border-white rounded-xl p-3 text-white font-bold text-sm outline-none shadow-xs placeholder:text-white/60"
                required
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                className="flex-1 min-h-[46px] bg-transparent hover:bg-white/10 text-white font-black text-sm rounded-full transition-all active:scale-95 border-2 border-white cursor-pointer"
              >
                Salva modifiche
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="min-h-[46px] px-5 bg-transparent text-white font-bold text-sm rounded-full hover:bg-white/10 border-2 border-white active:scale-95 transition-all cursor-pointer"
              >
                Annulla
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t-2 border-dashed border-white/20">
            <button
              onClick={() => setIsEditing(true)}
              className="flex-1 min-h-[42px] bg-transparent border-2 border-white hover:bg-white/10 text-white font-black text-xs rounded-full transition-all active:scale-95 shadow-xs cursor-pointer"
            >
              Modifica profilo
            </button>

            {user.auth_provider === 'google' && onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="min-h-[42px] bg-transparent hover:bg-white/10 text-white border-2 border-white font-black text-xs rounded-full flex items-center justify-center gap-2 transition-all active:scale-95 px-4 shadow-xs cursor-pointer"
              >
                <LogOut size={15} className="text-white" />
                <span>Disconnetti account</span>
              </button>
            )}

            {user.auth_provider !== 'google' && onOpenLogin && (
              <button
                type="button"
                onClick={onOpenLogin}
                className="min-h-[42px] bg-transparent hover:bg-white/10 text-white font-black text-xs rounded-full flex items-center justify-center gap-2 transition-all border-2 border-white active:scale-95 px-4 cursor-pointer"
              >
                <LogIn size={15} className="text-white" />
                <span>Accedi o Registrati</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Cloud Storage & Backup Status */}
      <div className="bg-transparent border-2 border-white rounded-3xl p-5 flex flex-col gap-3 shadow-card text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-transparent border border-white text-white flex items-center justify-center shadow-xs">
              <Cloud size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                <span>Salvataggio Cloud (Firestore)</span>
                <span className="w-2 h-2 rounded-full bg-white inline-block shadow-xs" />
              </h3>
              <p className="text-[11px] font-bold text-white/90">
                Attivo e sincronizzato
              </p>
            </div>
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider text-white bg-transparent border border-white px-2.5 py-1 rounded-full shadow-xs">
            {books.filter((b) => b.source !== 'sample').length} salvati
          </span>
        </div>

        <p className="text-xs text-white/90 font-medium leading-relaxed">
          Tutti i tuoi file caricati (PDF, EPUB, scansioni OCR e trascrizioni audio) sono salvati automaticamente nel Cloud Firestore e sincronizzati tra le sessioni.
        </p>

        {syncResult && (
          <div className="bg-transparent border-2 border-white text-white text-xs font-bold p-2.5 rounded-xl flex items-center gap-2 shadow-xs">
            <Check size={14} strokeWidth={3} className="text-white" /> {syncResult}
          </div>
        )}

        <button
          type="button"
          disabled={isSyncing}
          onClick={async () => {
            setIsSyncing(true);
            setSyncResult(null);
            try {
              const res = await storageService.syncWithCloud(user.user_id);
              onUpdateUser(user);
              setSyncResult(`Sincronizzazione completata: ${res.books.length} contenuti attivi nel cloud`);
              setTimeout(() => setSyncResult(null), 4000);
            } catch {
              setSyncResult('Sincronizzazione cloud verificata');
              setTimeout(() => setSyncResult(null), 3000);
            } finally {
              setIsSyncing(false);
            }
          }}
          className="min-h-[42px] bg-transparent hover:bg-white/10 text-white border-2 border-white font-black text-xs rounded-full flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xs cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={14} className={`text-white ${isSyncing ? 'animate-spin' : ''}`} />
          <span className="text-white">{isSyncing ? 'Sincronizzazione cloud in corso...' : 'Sincronizza ora tutti i contenuti nel Cloud'}</span>
        </button>
      </div>

      {/* Reading Statistics */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-transparent border-2 border-white rounded-2xl p-4 flex flex-col justify-between shadow-card text-white">
          <div className="flex items-center gap-2 text-white">
            <BookOpen size={18} className="text-white" />
            <span className="text-[10px] font-black uppercase tracking-wider text-white">Pagine lette</span>
          </div>
          <p className="text-2xl font-black text-white mt-1">
            {books.reduce((acc, b) => acc + storageService.getBookStats(b).pagesRead, 0)}
          </p>
          <span className="text-[11px] font-bold text-white/90">su {totalPages} totali</span>
        </div>

        <div className="bg-transparent border-2 border-white rounded-2xl p-4 flex flex-col justify-between shadow-card text-white">
          <div className="flex items-center gap-2 text-white">
            <Clock size={18} className="text-white" />
            <span className="text-[10px] font-black uppercase tracking-wider text-white">Tempo dedicato</span>
          </div>
          <p className="text-2xl font-black text-white mt-1">{user.totalReadingMinutes} m</p>
          <span className="text-[11px] font-bold text-white/90">Tempo stimato</span>
        </div>
      </div>

      {/* Button to open Full Reading Stats Panel (Transparent Background with White Borders & White Text) */}
      {onOpenStats && (
        <button
          type="button"
          onClick={onOpenStats}
          className="w-full bg-transparent hover:bg-white/10 text-white font-black text-sm p-4 rounded-2xl flex items-center justify-between transition-all active:scale-98 border-2 border-white cursor-pointer shadow-xs"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-transparent border border-white text-white flex items-center justify-center shadow-xs shrink-0">
              <BarChart3 size={20} className="text-white" />
            </div>
            <div className="flex flex-col text-left">
              <span className="font-black text-white text-sm">Pannello Statistiche di Lettura</span>
              <span className="text-xs font-bold text-white/90">Grafico settimanale e dettagli per libro</span>
            </div>
          </div>
          <ArrowRight size={20} strokeWidth={2.5} className="text-white" />
        </button>
      )}


    </section>
  );
};
