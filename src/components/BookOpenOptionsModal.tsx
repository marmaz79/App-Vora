import React, { useState } from 'react';
import { Book } from '../types';
import {
  FileText,
  BookOpen,
  X,
  Volume2,
  ArrowRight,
  Moon,
  Sun,
  Check,
} from 'lucide-react';
import { VoraLogo } from './VoraLogo';

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
  const [isNightMode, setIsNightMode] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('vora_pdf_night_mode');
      if (stored !== null) return stored === 'true';
    } catch {}
    return false;
  });

  const handleToggleNightMode = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsNightMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('vora_pdf_night_mode', next ? 'true' : 'false');
      } catch {}
      return next;
    });
  };

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
        className="bg-black border border-white/20 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl flex flex-col gap-5 text-white animate-slide-up"
      >
        {/* Header with Book preview */}
        <div className="flex items-start justify-between gap-3 border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Acrobat style badge */}
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-700 text-white flex flex-col items-center justify-center shrink-0 shadow-md">
              <VoraLogo size={22} variant="white" showCircle={false} className="w-5 h-5 text-white" />
              <span className="text-[7.5px] font-black uppercase text-white mt-0.5 tracking-wider">
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
            className="w-9 h-9 rounded-full bg-zinc-900 text-gray-300 hover:text-white border border-zinc-800 flex items-center justify-center transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* The Two Main Options: Icone e nome sotto */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {/* OPTION 1: APRI IN PDF */}
          <button
            type="button"
            onClick={() => onOpenPdf(book, isNightMode)}
            className="bg-black hover:bg-zinc-900 border border-zinc-800 hover:border-white p-4 sm:p-5 rounded-2xl flex flex-col items-center justify-center gap-2.5 sm:gap-3 text-center transition-all active:scale-[0.97] group shadow-sm relative"
          >
            <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-700 text-white flex items-center justify-center group-hover:scale-105 group-hover:border-white transition-all shadow-inner relative">
              <FileText size={28} />
              {isNightMode && (
                <span
                  title="Modalità notte attiva per il PDF"
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white text-black flex items-center justify-center shadow-md border border-black"
                >
                  <Moon size={11} className="fill-black" />
                </span>
              )}
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-sm sm:text-base font-bold text-white transition-colors">
                Apri in PDF
              </span>
              <span className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1">
                {isNightMode ? (
                  <>
                    <Moon size={11} className="text-white fill-white shrink-0" />
                    <span className="text-white">Mod. Notte</span>
                  </>
                ) : (
                  'Mod. Standard'
                )}
              </span>
            </div>
          </button>

          {/* OPTION 2: LEGGI LIBRO */}
          <button
            type="button"
            onClick={() => onOpenReader(book)}
            className="bg-black hover:bg-zinc-900 border border-zinc-800 hover:border-white p-4 sm:p-5 rounded-2xl flex flex-col items-center justify-center gap-2.5 sm:gap-3 text-center transition-all active:scale-[0.97] group shadow-sm"
          >
            <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-700 text-white flex items-center justify-center group-hover:scale-105 group-hover:border-white transition-all shadow-inner">
              <BookOpen size={28} />
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-sm sm:text-base font-bold text-white transition-colors">
                Leggi libro
              </span>
              <span className="text-[11px] font-semibold text-zinc-400">
                Voce AI & Sintesi
              </span>
            </div>
          </button>
        </div>

        {/* OPZIONE MODALITÀ NOTTE PER TUTTO IL LIBRO PDF */}
        <div
          onClick={handleToggleNightMode}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleToggleNightMode();
            }
          }}
          className={`w-full p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 select-none ${
            isNightMode
              ? 'bg-zinc-900/90 border-white text-white shadow-md'
              : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-300'
          }`}
          aria-label="Attiva modalità notte in tutto il libro PDF"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
                isNightMode
                  ? 'bg-white text-black border-white'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-700'
              }`}
            >
              {isNightMode ? <Moon size={20} className="fill-black" /> : <Sun size={20} />}
            </div>
            <div className="min-w-0 text-left">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-black text-white">
                  Modalità notte in tutto il libro
                </span>
                {isNightMode && (
                  <span className="bg-white text-black font-extrabold text-[9px] uppercase px-1.5 py-0.5 rounded-full">
                    Attiva
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-zinc-400 font-medium leading-tight mt-0.5">
                {isNightMode
                  ? 'Tutte le pagine avranno sfondo scuro e testo ad alto contrasto'
                  : 'Sfondo scuro ad alto contrasto per non affaticare la vista su tutte le pagine'}
              </p>
            </div>
          </div>

          {/* Toggle Switch Accessible */}
          <div
            role="switch"
            aria-checked={isNightMode}
            className={`w-12 h-6.5 rounded-full p-0.5 transition-colors shrink-0 flex items-center border pointer-events-none ${
              isNightMode
                ? 'bg-white border-white justify-end'
                : 'bg-zinc-800 border-zinc-700 justify-start'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full shadow-sm transition-transform ${
                isNightMode ? 'bg-black' : 'bg-zinc-400'
              }`}
            />
          </div>
        </div>

        {/* Footer info & close */}
        <div className="flex items-center justify-between pt-1 border-t border-zinc-800 text-xs text-gray-400">
          <span className="text-[11px] text-zinc-500">
            {isNightMode ? '🌙 Il PDF si aprirà in modalità notte' : '☀️ Visualizzazione predefinita'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-bold text-black bg-white hover:bg-zinc-200 px-4 py-2 rounded-xl transition-colors text-center"
          >
            Annulla
          </button>
        </div>
      </div>
    </div>
  );
};
