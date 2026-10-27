import React, { useState } from 'react';
import { Book } from '../types';
import { BookCard } from './BookCard';
import { Library, Filter, Search, X, ArrowLeft } from 'lucide-react';

interface LibraryTabProps {
  books: Book[];
  searchQuery: string;
  onSearchChange?: (query: string) => void;
  onOpenBook: (book: Book) => void;
  onDeleteBook: (bookId: string) => void;
  onBack?: () => void;
  onOpenPdf?: (book: Book, nightMode?: boolean) => void;
  onOpenReader?: (book: Book) => void;
}

export const LibraryTab: React.FC<LibraryTabProps> = ({
  books,
  searchQuery,
  onSearchChange,
  onOpenBook,
  onDeleteBook,
  onBack,
  onOpenPdf,
  onOpenReader,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<string>('all');
  const [isSearchOpen, setIsSearchOpen] = useState(Boolean(searchQuery));

  const filtered = React.useMemo(() => {
    const seen = new Set<string>();
    return books.filter((b) => {
      if (!b || !b.book_id || seen.has(b.book_id)) return false;
      seen.add(b.book_id);

      const matchesQuery =
        !searchQuery.trim() ||
        b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.author && b.author.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesFormat =
        selectedFormat === 'all' ||
        (selectedFormat === 'scan'
          ? b.file_type === 'scan'
          : selectedFormat === 'drive'
          ? b.author?.toLowerCase().includes('drive') || b.book_id.startsWith('drive-')
          : b.file_type === selectedFormat);

      return matchesQuery && matchesFormat;
    });
  }, [books, searchQuery, selectedFormat]);

  const formats = [
    { id: 'all', label: 'Tutti' },
    { id: 'pdf', label: 'PDF' },
    { id: 'epub', label: 'EPUB' },
    { id: 'scan', label: 'Scansioni' },
    { id: 'txt', label: 'Testo' },
    { id: 'drive', label: 'Google Drive' },
  ];

  return (
    <section className="flex flex-col gap-3.5 select-none animate-fade-in text-slate-800 pb-28" aria-label="Libreria completa">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pt-1 border-b-2 border-dashed border-[#2BA8A2]/30 pb-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
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
            <h2 className="text-2xl font-black text-[#1E8C86] flex items-center gap-2 tracking-tight truncate">
              <Library size={24} className="text-[#2BA8A2] shrink-0" aria-hidden="true" />
              <span>Libreria</span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#FFD23F] shadow-accent-glow inline-block" />
            </h2>
          </div>
        </div>

        {onSearchChange && (
          <button
            onClick={() => setIsSearchOpen((prev) => !prev)}
            aria-label="Cerca nei libri della libreria"
            className={`min-h-[40px] px-4 rounded-full border-2 flex items-center gap-1.5 font-extrabold text-xs transition-all shrink-0 active:scale-95 ${
              isSearchOpen || searchQuery
                ? 'bg-gradient-to-r from-[#FFD23F] to-[#FFE47A] text-[#1E8C86] border-[#E6B800] shadow-accent-glow'
                : 'bg-white text-slate-700 border-[#2BA8A2]/30 hover:border-[#2BA8A2] shadow-xs'
            }`}
          >
            <Search size={15} className={isSearchOpen || searchQuery ? 'text-[#1E8C86]' : 'text-[#2BA8A2]'} aria-hidden="true" />
            <span>Cerca</span>
          </button>
        )}
      </div>

      {/* Input di ricerca espandibile nella libreria (Flip7 Cream Surface) */}
      {isSearchOpen && onSearchChange && (
        <div className="relative animate-fade-in pt-0.5">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#1E8C86]" size={18} />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cerca libro per titolo o autore..."
            className="w-full bg-[#FFF8E7] border-2 border-[#2BA8A2]/30 focus:border-[#2BA8A2] rounded-full pl-10 pr-10 py-2.5 text-slate-900 font-bold placeholder-[#1E8C86]/60 text-sm focus:outline-none shadow-xs"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#EF6C4A] text-white flex items-center justify-center text-xs active:scale-90 shadow-sm"
            >
              <X size={13} strokeWidth={2.5} />
            </button>
          )}
        </div>
      )}

      {/* Filter pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none" role="group" aria-label="Filtra per formato">
        <Filter size={16} className="text-[#1E8C86] shrink-0 mr-1" aria-hidden="true" />
        {formats.map((f) => {
          const isSelected = selectedFormat === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setSelectedFormat(f.id)}
              aria-pressed={isSelected}
              className={`px-4 py-1.5 rounded-full font-black text-xs transition-all border shrink-0 min-h-[38px] active:scale-95 ${
                isSelected
                  ? 'bg-[#1E8C86] text-white border-[#1E8C86] shadow-teal-glow'
                  : 'bg-white text-slate-600 border-[#2BA8A2]/25 hover:border-[#2BA8A2] hover:text-[#1E8C86] shadow-xs'
              }`}
            >
              <span>{f.label}</span>
            </button>
          );
        })}
      </div>

      {/* Books listing */}
      {filtered.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-[#2BA8A2]/30 rounded-3xl p-8 text-center flex flex-col items-center gap-2 shadow-card my-2">
          <p className="text-base font-black text-slate-800">Nessun libro trovato per questo filtro</p>
          <p className="text-xs text-slate-500 font-medium">Prova a selezionare &quot;Tutti&quot; o rimuovi la ricerca.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filtered.map((book) => (
            <BookCard
              key={book.book_id}
              book={book}
              onOpen={onOpenBook}
              onDelete={onDeleteBook}
              onOpenPdf={onOpenPdf}
              onOpenReader={onOpenReader}
            />
          ))}
        </div>
      )}
    </section>
  );
};
