import React, { useState } from 'react';
import { Book } from '../types';
import { BookCard } from './BookCard';
import { UploadModal } from './UploadModal';
import { ScanModal } from './ScanModal';
import { Upload, Camera, BookOpen } from 'lucide-react';

interface HomeTabProps {
  books: Book[];
  searchQuery: string;
  onOpenBook: (book: Book) => void;
  onDeleteBook: (bookId: string) => void;
  onAddBook: (book: Book) => void;
}

export const HomeTab: React.FC<HomeTabProps> = ({
  books,
  searchQuery,
  onOpenBook,
  onDeleteBook,
  onAddBook,
}) => {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isScanOpen, setIsScanOpen] = useState(false);

  const filteredBooks = books.filter((b) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return b.title.toLowerCase().includes(q) || (b.author && b.author.toLowerCase().includes(q));
  });

  return (
    <section className="flex flex-col gap-6" aria-label="Home page libri">
      {/* Big CTAs */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <button
          onClick={() => setIsUploadOpen(true)}
          className="min-h-[110px] bg-black border-2 border-white hover:border-[#FFD600] rounded-3xl p-4 flex flex-col items-center justify-center gap-1 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FFD600]"
          aria-label="Carica un file PDF, EPUB o TXT"
        >
          <Upload size={36} className="text-[#FFD600]" aria-hidden="true" />
          <span className="text-lg font-black text-white mt-1">Carica File</span>
          <span className="text-xs font-bold text-[#B8B8B8]">PDF · EPUB · TXT</span>
        </button>

        <button
          onClick={() => setIsScanOpen(true)}
          className="min-h-[110px] bg-black border-2 border-white hover:border-[#FFD600] rounded-3xl p-4 flex flex-col items-center justify-center gap-1 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FFD600]"
          aria-label="Scansiona le pagine con la fotocamera o immagini"
        >
          <Camera size={36} className="text-[#FFD600]" aria-hidden="true" />
          <span className="text-lg font-black text-white mt-1">Scansiona</span>
          <span className="text-xs font-bold text-[#B8B8B8]">Foto pagine con OCR</span>
        </button>
      </div>

      {/* Book section title */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-white flex items-center gap-2">
          I tuoi libri
          <span className="bg-[#333333] text-[#FFD600] text-xs font-extrabold px-2.5 py-1 rounded-full">
            {filteredBooks.length}
          </span>
        </h2>
      </div>

      {/* Book List */}
      {filteredBooks.length === 0 ? (
        <div className="bg-[#1A1A1A] border-2 border-[#333333] rounded-3xl p-10 text-center flex flex-col items-center justify-center gap-3">
          <BookOpen size={64} className="text-[#B8B8B8]" aria-hidden="true" />
          <h3 className="text-lg font-black text-white">Nessun libro trovato</h3>
          <p className="text-sm font-bold text-[#B8B8B8] max-w-xs">
            {searchQuery
              ? 'Nessun risultato per questa ricerca. Prova con altre parole chiave.'
              : 'Premi su Carica File o Scansiona per aggiungere il tuo primo libro.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredBooks.map((book) => (
            <BookCard
              key={book.book_id}
              book={book}
              onOpen={onOpenBook}
              onDelete={onDeleteBook}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onBookAdded={onAddBook}
      />
      <ScanModal
        isOpen={isScanOpen}
        onClose={() => setIsScanOpen(false)}
        onBookAdded={onAddBook}
      />
    </section>
  );
};
