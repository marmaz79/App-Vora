import React, { useState } from 'react';
import { Book } from '../types';
import { PlayCircle, Trash2, BookOpen, FileText, Camera, AlertCircle } from 'lucide-react';

interface BookCardProps {
  book: Book;
  onOpen: (book: Book) => void;
  onDelete: (bookId: string) => void;
}

export const BookCard: React.FC<BookCardProps> = ({ book, onOpen, onDelete }) => {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const formatIcon = () => {
    switch (book.file_type) {
      case 'pdf':
        return <FileText size={28} className="text-black" aria-hidden="true" />;
      case 'scan':
        return <Camera size={28} className="text-black" aria-hidden="true" />;
      default:
        return <BookOpen size={28} className="text-black" aria-hidden="true" />;
    }
  };

  return (
    <article
      className="bg-[#1A1A1A] border-2 border-[#333333] hover:border-neutral-400 focus-within:border-[#FFD600] rounded-2xl p-4 flex flex-col gap-3 min-h-[76px] transition-all"
      aria-labelledby={`book-title-${book.book_id}`}
    >
      <div className="flex items-center gap-3">
        {/* Format Badge */}
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 shadow-inner"
          style={{ backgroundColor: book.coverColor || '#FFD600' }}
        >
          {formatIcon()}
        </div>

        {/* Title and details */}
        <div className="flex-1 min-w-0">
          <h3
            id={`book-title-${book.book_id}`}
            className="text-lg font-black text-white truncate leading-snug"
          >
            {book.title}
          </h3>
          <p className="text-sm font-bold text-[#B8B8B8] mt-0.5">
            {book.author ? `${book.author} · ` : ''}
            {book.file_type.toUpperCase()} · {book.pages.length} {book.pages.length === 1 ? 'pagina' : 'pagine'}
          </p>
          {book.currentPage !== undefined && book.currentPage > 0 && (
            <p className="text-xs font-extrabold text-[#FFD600] mt-1">
              In lettura: pag. {book.currentPage + 1} di {book.pages.length}
            </p>
          )}
        </div>

        {/* Big play button */}
        <button
          onClick={() => onOpen(book)}
          aria-label={`Ascolta ${book.title}, ${book.pages.length} pagine`}
          className="w-16 h-16 rounded-2xl bg-[#FFD600] hover:bg-[#FFEA00] text-black flex items-center justify-center shrink-0 active:scale-95 transition-transform border-2 border-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FFD600]"
        >
          <PlayCircle size={38} className="fill-black text-[#FFD600]" aria-hidden="true" />
        </button>
      </div>

      {/* Delete / Actions row */}
      <div className="flex items-center justify-between border-t border-[#333333] pt-2 mt-1">
        <button
          onClick={() => onOpen(book)}
          className="text-sm font-extrabold text-white hover:text-[#FFD600] flex items-center gap-1.5 py-1 px-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD600]"
        >
          <span>Apri nel lettore</span>
        </button>

        {confirmDelete ? (
          <div className="flex items-center gap-2" role="alert">
            <span className="text-xs text-[#FF3B30] font-bold flex items-center gap-1">
              <AlertCircle size={14} /> Eliminare?
            </span>
            <button
              onClick={() => onDelete(book.book_id)}
              className="bg-[#FF3B30] text-white text-xs font-black px-3 py-1.5 rounded-lg border border-white hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD600]"
              aria-label={`Conferma eliminazione del libro ${book.title}`}
            >
              Sì, elimina
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="bg-[#333333] text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-neutral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD600]"
            >
              Annulla
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            aria-label={`Elimina libro ${book.title}`}
            className="text-neutral-400 hover:text-[#FF3B30] p-2 rounded-lg flex items-center gap-1 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD600]"
          >
            <Trash2 size={16} aria-hidden="true" />
            <span>Elimina</span>
          </button>
        )}
      </div>
    </article>
  );
};
