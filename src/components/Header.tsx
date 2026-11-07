import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, User as UserIcon, X, Moon, Sun } from 'lucide-react';
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
    <header className="sticky top-0 z-30 bg-[#1E8C86] dark:bg-black/95 text-white border-b-2 border-[#166E69] dark:border-none px-4 py-3 select-none shadow-teal-glow dark:shadow-none transition-colors">
      <div className="max-w-2xl mx-auto flex flex-col gap-2.5">
        {/* Top bar: Flip7 Vintage Vora Logo on left, Search / Bell / User on right */}
        <div className="flex items-center justify-between">
          {/* Logo e Titolo dell'Applicazione Vora (Flip7 Style) */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-transparent border border-white flex items-center justify-center shadow-sm">
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
              <span className="w-2 h-2 rounded-full bg-[#FFD23F] dark:bg-white inline-block shadow-accent-glow" />
            </div>
          </div>

          {/* Right Icons: Search, Dark Mode, Stats, Notifications, Profile Avatar */}
          <div className="flex items-center gap-2.5 text-white">
            <button
              onClick={toggleSearch}
              aria-label={isSearchOpen ? 'Chiudi ricerca' : 'Cerca nei file'}
              className={`w-9 h-9 rounded-full transition-all flex items-center justify-center active:scale-95 shadow-sm ${
                isDarkMode
                  ? 'bg-white/10 text-white hover:bg-white/20'
                  : 'bg-[#2BA8A2]/60 hover:bg-[#2BA8A2] text-white hover:text-[#FFE47A]'
              }`}
            >
              <Search size={19} className="text-white" />
            </button>

            {/* Toggle Dark Mode */}
            {onToggleDarkMode && (
              <button
                onClick={onToggleDarkMode}
                aria-label={isDarkMode ? 'Disattiva modalità scura' : 'Attiva modalità scura'}
                title={isDarkMode ? 'Passa alla modalità chiara' : 'Passa alla modalità scura (Dark Mode)'}
                className={`w-9 h-9 rounded-full transition-all flex items-center justify-center active:scale-95 shadow-sm ${
                  isDarkMode
                    ? 'bg-white/10 text-white hover:bg-white/20'
                    : 'bg-[#2BA8A2]/60 hover:bg-[#2BA8A2] text-white hover:text-[#FFD23F]'
                }`}
              >
                {isDarkMode ? <Sun size={18} className="text-white fill-white" /> : <Moon size={18} />}
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
              className={`w-9 h-9 rounded-full transition-all flex items-center justify-center active:scale-95 relative shadow-sm ${
                isDarkMode
                  ? 'bg-white/10 text-white hover:bg-white/20'
                  : 'bg-[#2BA8A2]/60 hover:bg-[#2BA8A2] text-white hover:text-[#FFD23F]'
              }`}
            >
              <Bell size={19} className="text-white" />
              {unreadNotificationsCount > 0 && (
                <span className={`absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-black ${
                  isDarkMode ? 'bg-white text-black' : 'bg-[#FFD23F] text-[#1E8C86] ring-2 ring-[#1E8C86]'
                } shadow-xs`}>
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </span>
              )}
            </button>

            <button
              onClick={onOpenProfile}
              aria-label="Profilo utente mariano"
              className={`w-9 h-9 rounded-full transition-all overflow-hidden active:scale-95 flex items-center justify-center ${
                isDarkMode
                  ? 'bg-white/10 text-white hover:bg-white/20'
                  : 'border-2 border-[#FFD23F] bg-[#2BA8A2] text-white hover:bg-[#3CC4BD] shadow-accent-glow'
              }`}
            >
              <UserIcon size={18} className="text-white" />
            </button>
          </div>
        </div>

        {/* Expandable Search Input (Transparent with No Borders) */}
        {isSearchOpen && (
          <div className="relative animate-fade-in pt-1">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white"
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
              className="w-full bg-white/10 text-white font-bold placeholder-white/70 rounded-full pl-10 pr-10 py-2.5 text-sm outline-none transition-all shadow-sm border-none"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  onSearchChange('');
                  inputRef.current?.focus();
                }}
                aria-label="Cancella testo"
                className="absolute right-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#EF6C4A] hover:bg-[#D45233] text-white flex items-center justify-center text-xs active:scale-90 shadow-sm transition-colors"
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
