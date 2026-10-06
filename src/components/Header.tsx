import React from 'react';
import { Search, Volume2 } from 'lucide-react';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  title?: string;
}

export const Header: React.FC<HeaderProps> = ({ searchQuery, onSearchChange, title = 'Vora' }) => {
  return (
    <header className="sticky top-0 z-30 bg-black border-b-2 border-[#333333] px-4 py-3">
      <div className="max-w-2xl mx-auto flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Logo */}
            <div className="w-12 h-12 rounded-full border-2 border-[#FFD600] bg-black flex items-center justify-center">
              <Volume2 className="text-[#FFD600]" size={26} aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                {title}
                <span className="text-xs uppercase bg-[#FFD600] text-black font-extrabold px-2 py-0.5 rounded">
                  Accessibile
                </span>
              </h1>
              <p className="text-xs text-[#B8B8B8] font-bold">Lettore vocale ad alto contrasto</p>
            </div>
          </div>
        </div>

        {/* Search input with high contrast styling */}
        <div className="relative">
          <label htmlFor="search-books" className="sr-only">
            Cerca nei tuoi libri
          </label>
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#B8B8B8]"
            size={20}
            aria-hidden="true"
          />
          <input
            id="search-books"
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cerca libro per titolo o autore..."
            className="w-full bg-[#1A1A1A] border-2 border-[#333333] focus:border-[#FFD600] rounded-xl pl-11 pr-4 py-3 text-white placeholder-neutral-400 font-bold text-base focus:outline-none focus:ring-2 focus:ring-[#FFD600]"
          />
        </div>
      </div>
    </header>
  );
};
