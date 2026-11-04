import React from 'react';
import { Book } from '../types';
import {
  FileText,
  BookOpen,
  X,
  Maximize2,
} from 'lucide-react';

interface BookOpenOptionsModalProps {
  book: Book;
  onOpenPdf: (book: Book, nightMode?: boolean) => void;
  onOpenReader: (book: Book) => void;
  onClose: () => void;
}

export const BookOpenOptionsModal: React.FC<BookOpenOptionsModalProps> = ({
  book,
  onOpenPdf,
  onOpenReader,
  onClose,
}) => {
  const formatSize = (bytes?: number) => {
    if (!bytes) return '450,2 KB';
    if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
    return `${(bytes / 1024).toFixed(1).replace('.', ',')} KB`;
  };

  const getFormatBadge = () => {
    switch (book.file_type) {
      case 'scan':
        return 'SCAN.OCR';
      case 'epub':
        return 'EPUB';
      case 'txt':
        return 'TXT';
      case 'audio':
        return 'AUDIO.AI';
      default:
        return 'PDF';
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="book-options-title"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-4 animate-fade-in select-none font-sans"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-black/95 border-2 border-[#2BA8A2]/30 dark:border-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-card flex flex-col gap-5 text-slate-800 dark:text-white animate-slide-up"
      >
        {/* Header with Book preview */}
        <div className="flex items-start justify-between gap-3 border-b-2 border-dashed border-[#2BA8A2]/20 dark:border-white/30 pb-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-[#E8F6F5] dark:bg-transparent text-[#1E8C86] dark:text-white border border-[#2BA8A2]/30 dark:border-white uppercase tracking-wider">
                {getFormatBadge()}
              </span>
              <span className="text-[11px] font-bold text-[#1E8C86] dark:text-white uppercase tracking-wider">
                Scegli modalità di apertura
              </span>
            </div>
              <h3
                id="book-options-title"
                className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate leading-snug"
              >
                {book.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-white/80 font-medium truncate mt-0.5">
                {book.author ? `${book.author} · ` : ''}
                {book.pages.length} {book.pages.length === 1 ? 'pagina' : 'pagine'} · {formatSize(book.size)}
              </p>
            </div>

            <button
              onClick={onClose}
              aria-label="Chiudi opzioni apertura libro"
              className="w-9 h-9 rounded-full bg-[#E8F6F5] dark:bg-transparent text-[#1E8C86] dark:text-white hover:bg-[#2BA8A2]/20 dark:hover:bg-white/10 border border-[#2BA8A2]/30 dark:border-white flex items-center justify-center transition-all active:scale-95 shrink-0 cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

        {/* The Two Main Options */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {/* OPTION 1: APRI IN PDF */}
          <button
            type="button"
            onClick={() => onOpenPdf(book)}
            className="bg-white dark:bg-transparent hover:bg-[#E8F6F5] dark:hover:bg-white/10 border-2 border-[#2BA8A2]/30 dark:border-white p-4 sm:p-5 rounded-2xl flex flex-col items-center justify-center gap-2.5 sm:gap-3 text-center transition-all active:scale-95 group shadow-xs cursor-pointer"
          >
            <div className="w-14 h-14 rounded-2xl bg-[#E8F6F5] dark:bg-transparent border-2 border-[#2BA8A2]/30 dark:border-white text-[#1E8C86] dark:text-white flex items-center justify-center group-hover:scale-105 transition-all shadow-xs">
              <FileText size={28} className="text-current" />
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white transition-colors">
                Apri in PDF
              </span>
              <span className="text-[11px] font-bold text-slate-500 dark:text-white/80 flex items-center justify-center gap-1">
                <Maximize2 size={11} className="text-[#1E8C86] dark:text-white" />
                A pieno schermo
              </span>
            </div>
          </button>

          {/* OPTION 2: LEGGI LIBRO */}
          <button
            type="button"
            onClick={() => onOpenReader(book)}
            className="bg-white dark:bg-transparent hover:bg-[#FFF8E7] dark:hover:bg-white/10 border-2 border-[#FFD23F]/50 dark:border-white p-4 sm:p-5 rounded-2xl flex flex-col items-center justify-center gap-2.5 sm:gap-3 text-center transition-all active:scale-95 group shadow-xs cursor-pointer"
          >
            <div className="w-14 h-14 rounded-2xl bg-[#FFF8E7] dark:bg-transparent border-2 border-[#FFD23F] dark:border-white text-[#E6B800] dark:text-white flex items-center justify-center group-hover:scale-105 transition-all shadow-accent-glow dark:shadow-none">
              <BookOpen size={28} className="text-current" />
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white transition-colors">
                Leggi libro
              </span>
              <span className="text-[11px] font-bold text-[#EF6C4A] dark:text-white/80">
                Voce AI & Sintesi
              </span>
            </div>
          </button>
        </div>

        {/* Footer close */}
        <div className="flex items-center justify-end pt-2 border-t-2 border-dashed border-[#2BA8A2]/20 dark:border-white/30 text-xs">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-black text-[#1E8C86] dark:text-white bg-[#E8F6F5] dark:bg-transparent hover:bg-[#2BA8A2]/20 dark:hover:bg-white/10 border-2 border-[#2BA8A2]/30 dark:border-white px-5 py-2.5 rounded-full transition-all text-center active:scale-95 cursor-pointer"
          >
            Annulla
          </button>
        </div>
      </div>
    </div>
  );
};
