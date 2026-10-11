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
}

export const LibraryTab: React.FC<LibraryTabProps> = ({
  books,
  searchQuery,
  onSearchChange,
  onOpenBook,
  onDeleteBook,
  onBack,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<string>('all');
  const [isSearchOpen, setIsSearchOpen] = useState(Boolean(searchQuery));

  const filtered = books.filter((b) => {
    const matchesQuery =
      !searchQuery.trim() ||
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.author && b.author.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesFormat =
      selectedFormat === 'all' ||
      (selectedFormat === 'scan' ? b.file_type === 'scan' : b.file_type === selectedFormat);

    return matchesQuery && matchesFormat;
  });

  const formats = [
    { id: 'all', label: 'Tutti' },
    { id: 'epub', label: 'EPUB' },
    { id: 'pdf', label: 'PDF' },
    { id: 'scan', label: 'Scansioni' },
  ];

  return (
    <section className="flex flex-col gap-3.5" aria-label="Libreria completa">
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-3 min-w-0">
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
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-2 truncate">
              <Library size={24} className="text-red-600 shrink-0" aria-hidden="true" />
              Libreria
            </h2>
            <p className="text-xs font-semibold text-gray-500 truncate">Tutti i documenti e le opere digitali</p>
          </div>
        </div>

        {onSearchChange && (
          <button
            onClick={() => setIsSearchOpen((prev) => !prev)}
            aria-label="Cerca nei libri della libreria"
            className={`min-h-[44px] px-3.5 rounded-xl border flex items-center gap-1.5 font-bold text-xs transition-all shrink-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black ${
              isSearchOpen || searchQuery
                ? 'bg-gray-100 text-gray-900 border-gray-400'
                : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Search size={16} className="text-red-600" aria-hidden="true" />
            <span className="text-gray-900">Cerca</span>
          </button>
        )}
      </div>

      {/* Input di ricerca espandibile nella libreria */}
      {isSearchOpen && onSearchChange && (
        <div className="relative animate-fade-in pt-0.5">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cerca libro per titolo o autore..."
            className="w-full bg-gray-50 border border-gray-200 focus:border-black focus:bg-white rounded-xl pl-10 pr-10 py-2.5 text-gray-900 placeholder-gray-400 font-semibold text-sm focus:outline-none focus:ring-1 focus:ring-black"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded bg-gray-200 text-gray-600 flex items-center justify-center text-xs"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {/* Filter pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-0.5" role="group" aria-label="Filtra per formato">
        <Filter size={18} className="text-gray-500 shrink-0 mr-1" aria-hidden="true" />
        {formats.map((f) => {
          const isSelected = selectedFormat === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setSelectedFormat(f.id)}
              aria-pressed={isSelected}
              className={`px-4 py-2 rounded-xl font-bold text-xs transition-colors border shrink-0 min-h-[42px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black ${
                isSelected
                  ? 'bg-gray-900 text-white border-gray-900 shadow-xs'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span>{f.label}</span>
            </button>
          );
        })}
      </div>

      {/* Books listing */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center flex flex-col items-center gap-1.5 shadow-sm">
          <p className="text-base font-bold text-gray-900">Nessun libro trovato per questo filtro</p>
          <p className="text-xs text-gray-500">Prova a selezionare un'altra categoria o azzerare la ricerca.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden divide-y divide-gray-100 shadow-sm">
          {filtered.map((book) => (
            <BookCard
              key={book.book_id}
              book={book}
              onOpen={onOpenBook}
              onDelete={onDeleteBook}
            />
          ))}
        </div>
      )}
    </section>
  );
};
