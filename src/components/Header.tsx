import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, User as UserIcon, X } from 'lucide-react';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  title?: string;
  onOpenProfile?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  title = 'Vora',
  onOpenProfile,
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
    <header className="sticky top-0 z-30 bg-black border-b border-[#181A22] px-4 py-3 select-none">
      <div className="max-w-2xl mx-auto flex flex-col gap-2.5">
        {/* Top bar: Red Acrobat logo on left, Search / Bell / User on right */}
        <div className="flex items-center justify-between">
          {/* Logo e Titolo dell'Applicazione Vora */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#260A0D] border border-[#ED2224] flex items-center justify-center shrink-0 shadow-xs">
              <svg
                className="w-5 h-5 text-[#ED2224] shrink-0"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-label="Logo Vora"
              >
                <path d="M13.983 0C10.748 0 7.828 1.488 5.895 3.82L0 19.344h5.666l3.355-8.243c.96-2.358 2.684-4.098 4.962-4.098 2.376 0 4.148 1.83 4.148 4.298 0 2.215-1.464 4.398-3.791 5.656l-3.23 1.748c-3.155 1.706-5.077 4.707-5.077 8.295h5.666c0-2.308 1.258-4.325 3.32-5.438l3.23-1.747c3.674-1.986 5.922-5.467 5.922-9.283C24.17 4.636 19.534 0 13.983 0z" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black text-white tracking-tight leading-none">
                {title}
              </span>
              <span className="text-[10px] text-gray-400 font-semibold tracking-wider uppercase leading-none mt-0.5">
                Lettore Libri
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
              aria-label="Notifiche"
              className="text-white hover:text-gray-300 transition-colors p-1 rounded-full active:scale-95 relative"
            >
              <Bell size={22} />
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
              className="w-full bg-[#16181F] border border-[#2B2E38] focus:border-white rounded-xl pl-10 pr-10 py-2.5 text-white placeholder-gray-400 font-medium text-sm focus:outline-none"
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
