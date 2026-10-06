import React, { useState } from 'react';
import { Book } from '../types';
import { BookCard } from './BookCard';
import { Library, Filter } from 'lucide-react';

interface LibraryTabProps {
  books: Book[];
  searchQuery: string;
  onOpenBook: (book: Book) => void;
  onDeleteBook: (bookId: string) => void;
}

export const LibraryTab: React.FC<LibraryTabProps> = ({
  books,
  searchQuery,
  onOpenBook,
  onDeleteBook,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<string>('all');

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
    <section className="flex flex-col gap-6" aria-label="Libreria completa">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <Library size={28} className="text-[#FFD600]" aria-hidden="true" />
            Libreria
          </h2>
          <p className="text-sm font-bold text-[#B8B8B8]">Tutti i documenti e le opere digitali</p>
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1" role="group" aria-label="Filtra per formato">
        <Filter size={18} className="text-[#FFD600] shrink-0 mr-1" aria-hidden="true" />
        {formats.map((f) => {
          const isSelected = selectedFormat === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setSelectedFormat(f.id)}
              aria-pressed={isSelected}
              className={`px-4 py-2.5 rounded-xl font-black text-sm transition-colors border-2 shrink-0 min-h-[48px] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FFD600] ${
                isSelected
                  ? 'bg-[#FFD600] text-black border-white'
                  : 'bg-[#1A1A1A] text-white border-[#333333] hover:border-neutral-400'
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Books listing */}
      {filtered.length === 0 ? (
        <div className="bg-[#1A1A1A] border-2 border-[#333333] rounded-3xl p-8 text-center flex flex-col items-center gap-3">
          <p className="text-lg font-black text-white">Nessun libro trovato per questo filtro</p>
          <p className="text-sm font-bold text-[#B8B8B8]">Prova a selezionare un'altra categoria o azzerare la ricerca.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
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
