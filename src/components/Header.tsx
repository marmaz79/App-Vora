import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, User as UserIcon, X, BarChart3, Moon, Sun } from 'lucide-react';
import { VoraLogo } from './VoraLogo';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  title?: string;
  onOpenProfile?: () => void;
  onOpenNotifications?: () => void;
  onOpenStats?: () => void;
  unreadNotificationsCount?: number;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  title = 'Vora',
  onOpenProfile,
  onOpenNotifications,
  onOpenStats,
  unreadNotificationsCount = 0,
  isDarkMode = false,
  onToggleDarkMode,
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState(Boolean(searchQuery));
  const inputRef = useRef<HTMLInputElement>(null);

  const toggleSearch = () => {
    setIsSearchOpen((prev) => {
      const next = !prev;
      if (next) {
        setTimeout(() => inputRef.current?.focus(), 100);
      } else {
        onSearchChange('');
      }
      return next;
    });
  };

  useEffect(() => {
    if (searchQuery.trim()) {
      setIsSearchOpen(true);
    }
  }, [searchQuery]);

  return (
    <header className="sticky top-0 z-30 bg-[#1E8C86] dark:bg-[#0D2624] text-white border-b-2 border-[#166E69] dark:border-[#091D1C] px-4 py-3 select-none shadow-teal-glow transition-colors">
      <div className="max-w-2xl mx-auto flex flex-col gap-2.5">
        {/* Top bar: Flip7 Vintage Vora Logo on left, Search / Bell / User on right */}
        <div className="flex items-center justify-between">
          {/* Logo e Titolo dell'Applicazione Vora (Flip7 Style) */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#2BA8A2] dark:bg-[#1E8C86] border border-[#3CC4BD] dark:border-[#2BA8A2]/50 flex items-center justify-center shadow-sm">
              <VoraLogo
                size={26}
                variant="flip7"
                showCircle={false}
                showBottomBar={false}
                className="shrink-0 drop-shadow-xs"
                alt="Logo Vora"
              />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-white tracking-wider leading-none">
                {title.toUpperCase()}
              </span>
              <span className="w-2 h-2 rounded-full bg-[#FFD23F] inline-block shadow-accent-glow" />
            </div>
          </div>

          {/* Right Icons: Search, Dark Mode, Stats, Notifications, Profile Avatar */}
          <div className="flex items-center gap-2.5 text-white">
            <button
              onClick={toggleSearch}
              aria-label={isSearchOpen ? 'Chiudi ricerca' : 'Cerca nei file'}
              className="w-9 h-9 rounded-full bg-[#2BA8A2]/60 hover:bg-[#2BA8A2] dark:bg-white/10 dark:hover:bg-white/20 text-white hover:text-[#FFE47A] transition-all flex items-center justify-center active:scale-95 shadow-sm"
            >
              <Search size={19} />
            </button>

            {/* Toggle Dark Mode */}
            {onToggleDarkMode && (
              <button
                onClick={onToggleDarkMode}
                aria-label={isDarkMode ? 'Disattiva modalità scura' : 'Attiva modalità scura'}
                title={isDarkMode ? 'Passa alla modalità chiara' : 'Passa alla modalità scura (Dark Mode)'}
                className={`w-9 h-9 rounded-full transition-all flex items-center justify-center active:scale-95 shadow-sm ${
                  isDarkMode
                    ? 'bg-[#FFD23F] text-[#1E8C86] shadow-accent-glow'
                    : 'bg-[#2BA8A2]/60 hover:bg-[#2BA8A2] text-white hover:text-[#FFD23F]'
                }`}
              >
                {isDarkMode ? <Sun size={18} className="fill-current" /> : <Moon size={18} />}
              </button>
            )}

            {onOpenStats && (
              <button
                onClick={onOpenStats}
                aria-label="Statistiche di lettura"
                title="Visualizza statistiche di lettura"
                className="w-9 h-9 rounded-full bg-[#2BA8A2]/60 hover:bg-[#2BA8A2] dark:bg-white/10 dark:hover:bg-white/20 text-white hover:text-[#FFD23F] transition-all flex items-center justify-center active:scale-95 shadow-sm"
              >
                <BarChart3 size={19} />
              </button>
            )}

            <button
              onClick={onOpenNotifications}
              aria-label={
                unreadNotificationsCount > 0
                  ? `Notifiche (${unreadNotificationsCount} non lette)`
                  : 'Notifiche'
              }
              title={
                unreadNotificationsCount > 0
                  ? `Apri notifiche (${unreadNotificationsCount} non lette)`
                  : 'Apri notifiche'
              }
              className="w-9 h-9 rounded-full bg-[#2BA8A2]/60 hover:bg-[#2BA8A2] dark:bg-white/10 dark:hover:bg-white/20 text-white hover:text-[#FFD23F] transition-all flex items-center justify-center active:scale-95 relative shadow-sm"
            >
              <Bell size={19} />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#FFD23F] text-[10px] font-black text-[#1E8C86] ring-2 ring-[#1E8C86] shadow-accent-glow animate-pulse">
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </span>
              )}
            </button>

            <button
              onClick={onOpenProfile}
              aria-label="Profilo utente mariano"
              className="w-9 h-9 rounded-full border-2 border-[#FFD23F] bg-[#2BA8A2] text-white flex items-center justify-center hover:bg-[#3CC4BD] transition-all overflow-hidden active:scale-95 shadow-accent-glow"
            >
              <UserIcon size={18} />
            </button>
          </div>
        </div>

        {/* Expandable Search Input (Flip7 Cream Input Surface) */}
        {isSearchOpen && (
          <div className="relative animate-fade-in pt-1">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#1E8C86]"
              size={18}
              aria-hidden="true"
            />
            <input
              ref={inputRef}
              id="search-books"
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Cerca per titolo o autore..."
              className="w-full bg-[#FFF8E7] border-2 border-[#FFD23F] focus:border-[#2BA8A2] text-[#1E8C86] font-bold placeholder-[#1E8C86]/60 rounded-full pl-10 pr-10 py-2.5 text-sm outline-none transition-all shadow-card focus:shadow-focus-teal"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  onSearchChange('');
                  inputRef.current?.focus();
                }}
                aria-label="Cancella testo"
                className="absolute right-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#EF6C4A] text-white flex items-center justify-center text-xs active:scale-90 shadow-sm"
              >
                <X size={13} strokeWidth={3} />
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
