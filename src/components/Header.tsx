import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, User as UserIcon, X } from 'lucide-react';
import { VoraLogo } from './VoraLogo';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  title?: string;
  onOpenProfile?: () => void;
  onOpenNotifications?: () => void;
  unreadNotificationsCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  title = 'Vora',
  onOpenProfile,
  onOpenNotifications,
  unreadNotificationsCount = 0,
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
    <header className="sticky top-0 z-30 bg-black border-b border-zinc-800 px-4 py-3 select-none">
      <div className="max-w-2xl mx-auto flex flex-col gap-2.5">
        {/* Top bar: Red Acrobat logo on left, Search / Bell / User on right */}
        <div className="flex items-center justify-between">
          {/* Logo e Titolo dell'Applicazione Vora */}
          <div className="flex items-center gap-2.5">
            <VoraLogo
              size={34}
              variant="white-circle"
              className="w-[34px] h-[34px] text-white shrink-0 drop-shadow-xs"
              alt="Logo Vora bianco con cerchio bianco"
            />
            <div className="flex flex-col">
              <span className="text-lg font-black text-white tracking-tight leading-none">
                {title}
              </span>
            </div>
          </div>

          {/* Right Icons: Search, Notifications, Profile Avatar */}
          <div className="flex items-center gap-4 text-white">
            <button
              onClick={toggleSearch}
              aria-label={isSearchOpen ? 'Chiudi ricerca' : 'Cerca nei file'}
              className="text-white hover:text-gray-300 transition-colors p-1 rounded-full active:scale-95"
            >
              <Search size={22} />
            </button>

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
              className="text-white hover:text-gray-300 transition-colors p-1 rounded-full active:scale-95 relative"
            >
              <Bell size={22} />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-black text-black ring-2 ring-black">
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </span>
              )}
            </button>

            <button
              onClick={onOpenProfile}
              aria-label="Profilo utente mariano"
              className="w-8 h-8 rounded-full border border-gray-400 bg-zinc-800 text-white flex items-center justify-center hover:border-white transition-colors overflow-hidden active:scale-95"
            >
              <UserIcon size={18} />
            </button>
          </div>
        </div>

        {/* Expandable Search Input (Dark Theme) */}
        {isSearchOpen && (
          <div className="relative animate-fade-in pt-1">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
              aria-hidden="true"
            />
            <input
              ref={inputRef}
              id="search-books"
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Cerca in tutti i file..."
              className="w-full bg-black border border-white/20 focus:border-white rounded-xl pl-10 pr-10 py-2.5 text-white placeholder-zinc-400 font-medium text-sm focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  onSearchChange('');
                  inputRef.current?.focus();
                }}
                aria-label="Cancella testo"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-zinc-700 text-white flex items-center justify-center text-xs"
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
