import React from 'react';
import { Book } from '../types';
import {
  FileText,
  BookOpen,
  X,
  Volume2,
  ArrowRight,
} from 'lucide-react';
import { VoraLogo } from './VoraLogo';

interface BookOpenOptionsModalProps {
  book: Book;
  onOpenPdf: (book: Book) => void;
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
    if (!bytes) return '450 KB';
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
      default:
        return 'PDF';
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="book-options-title"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-4 animate-fade-in select-none"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#12141D] border border-[#232736] rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl flex flex-col gap-5 text-gray-100 animate-slide-up"
      >
        {/* Header with Book preview */}
        <div className="flex items-start justify-between gap-3 border-b border-[#232736] pb-4">
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Acrobat style badge */}
            <div className="w-12 h-12 rounded-2xl bg-[#1C1418] border border-red-500/40 text-red-500 flex flex-col items-center justify-center shrink-0 shadow-md">
              <VoraLogo size={22} variant="white" showCircle={false} className="w-5 h-5 text-red-400" />
              <span className="text-[7.5px] font-black uppercase text-red-300 mt-0.5 tracking-wider">
                {getFormatBadge()}
              </span>
            </div>

            <div className="min-w-0">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                Scegli modalità di apertura
              </span>
              <h3
                id="book-options-title"
                className="text-base sm:text-lg font-black text-white truncate leading-snug"
              >
                {book.title}
              </h3>
              <p className="text-xs text-gray-400 font-medium truncate mt-0.5">
                {book.author ? `${book.author} · ` : ''}
                {book.pages.length} {book.pages.length === 1 ? 'pagina' : 'pagine'} · {formatSize(book.size)}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Chiudi opzioni apertura libro"
            className="w-9 h-9 rounded-full bg-[#1C202F] text-gray-400 hover:text-white hover:bg-[#252B3E] flex items-center justify-center transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* The Two Main Options: Icone e nome sotto */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {/* OPTION 1: APRI IN PDF */}
          <button
            type="button"
            onClick={() => onOpenPdf(book)}
            className="bg-[#161926] hover:bg-[#1E2338] border border-[#2B3147] hover:border-red-500/80 p-4 sm:p-5 rounded-2xl flex flex-col items-center justify-center gap-2.5 sm:gap-3 text-center transition-all active:scale-[0.97] group shadow-sm"
          >
            <div className="w-14 h-14 rounded-2xl bg-red-950/40 border border-red-600/40 text-red-400 flex items-center justify-center group-hover:scale-105 group-hover:bg-red-900/50 group-hover:text-red-300 transition-all shadow-inner">
              <FileText size={28} />
            </div>
            <span className="text-sm sm:text-base font-bold text-white group-hover:text-red-300 transition-colors">
              Apri in PDF
            </span>
          </button>

          {/* OPTION 2: LEGGI LIBRO */}
          <button
            type="button"
            onClick={() => onOpenReader(book)}
            className="bg-[#161926] hover:bg-[#1E2338] border border-[#2B3147] hover:border-emerald-500/80 p-4 sm:p-5 rounded-2xl flex flex-col items-center justify-center gap-2.5 sm:gap-3 text-center transition-all active:scale-[0.97] group shadow-sm"
          >
            <div className="w-14 h-14 rounded-2xl bg-emerald-950/40 border border-emerald-600/40 text-emerald-400 flex items-center justify-center group-hover:scale-105 group-hover:bg-emerald-900/50 group-hover:text-emerald-300 transition-all shadow-inner">
              <BookOpen size={28} />
            </div>
            <span className="text-sm sm:text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
              Leggi libro
            </span>
          </button>
        </div>

        {/* Footer info & close */}
        <div className="flex items-center justify-end pt-1 border-t border-[#1F2436] text-xs text-gray-400">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto text-xs font-bold text-gray-300 hover:text-white px-4 py-2 rounded-xl bg-[#1C202F] hover:bg-[#252B3E] transition-colors text-center"
          >
            Annulla
          </button>
        </div>
      </div>
    </div>
  );
};
