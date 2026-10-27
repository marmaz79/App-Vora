import React, { useState } from 'react';
import { Book } from '../types';
import {
  FileText,
  Trash2,
  AlertCircle,
  MoreVertical,
  X,
  Info,
  BookOpen,
  Cpu,
  Share2,
  Check,
  Bookmark as BookmarkIcon,
  Moon,
} from 'lucide-react';

interface BookCardProps {
  book: Book;
  onOpen: (book: Book) => void;
  onDelete: (bookId: string) => void;
  onOpenPdf?: (book: Book, nightMode?: boolean) => void;
  onOpenReader?: (book: Book) => void;
}

export const BookCard: React.FC<BookCardProps> = ({
  book,
  onOpen,
  onDelete,
  onOpenPdf,
  onOpenReader,
}) => {
  const [showOptions, setShowOptions] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const formatSize = (bytes?: number) => {
    if (!bytes) return '450,2 KB';
    if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
    return `${(bytes / 1024).toFixed(1).replace('.', ',')} KB`;
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '9 Ott 2026';
    try {
      const d = new Date(isoString);
      const day = d.getDate();
      const monthNames = [
        'Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu',
        'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'
      ];
      const month = monthNames[d.getMonth()] || 'Ott';
      const year = d.getFullYear();
      return `${day} ${month} ${year}`;
    } catch {
      return '9 Ott 2026';
    }
  };

  const getFileTypeLabel = () => {
    switch (book.file_type) {
      case 'scan':
        return 'SCAN';
      case 'epub':
        return 'EPUB';
      case 'txt':
        return 'TXT';
      case 'audio':
        return 'AUDIO';
      default:
        return 'PDF';
    }
  };

  // Flip7 Card Left Accent Bar Logic
  const getBorderColorClass = () => {
    if (book.file_type === 'scan') return 'border-l-[#EF6C4A]'; // Coral
    if (book.file_type === 'audio') return 'border-l-[#5DADE2]'; // Sky Blue
    if (book.currentPage !== undefined && book.currentPage > 0) return 'border-l-[#FFD23F]'; // Accent Gold for in-progress
    return 'border-l-[#2BA8A2]'; // Primary Teal
  };

  return (
    <>
      <article
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (!target.closest('button')) {
            onOpen(book);
          }
        }}
        className={`bg-white hover:bg-[#F9FDFC] active:scale-[0.99] rounded-2xl mb-2.5 p-3.5 sm:p-4 flex items-center justify-between gap-3.5 transition-all cursor-pointer group select-none shadow-card hover:shadow-card-hover border-l-[6px] border-y border-r border-[#2BA8A2]/10 ${getBorderColorClass()}`}
        aria-labelledby={`book-title-${book.book_id}`}
      >
        {/* Book Info Column */}
        <div className="flex-1 min-w-0">
          {/* Title: Bold Text */}
          <h3
            id={`book-title-${book.book_id}`}
            className="text-sm sm:text-base font-extrabold text-slate-900 truncate leading-snug tracking-tight group-hover:text-[#1E8C86] transition-colors"
          >
            {book.title}
          </h3>

          {/* Subtitle / Details: Clean typographic separators */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium truncate mt-1">
            <span className="font-extrabold text-[#1E8C86] uppercase tracking-wider text-[11px]">
              {getFileTypeLabel()}
            </span>

              <span className="text-slate-400">·</span>

              {/* Data */}
              <span className="text-slate-600 font-semibold">
                {formatDate(book.created_at)}
              </span>

              <span className="text-slate-400">·</span>

              {/* Dimensione file */}
              <span className="text-slate-600 font-semibold">
                {formatSize(book.size)}
              </span>

              {/* Se in lettura: badge oro/crema Flip7 */}
              {book.currentPage !== undefined && book.currentPage > 0 && (
                <>
                  <span className="text-slate-400">·</span>
                  <span className="text-[#1E8C86] font-bold bg-[#FFF8E7] border border-[#FFD23F] px-2 py-0.5 rounded-full text-[10px] shadow-xs">
                    Pag. {book.currentPage + 1}/{book.pages.length}
                  </span>
                </>
              )}

              {/* Segnalibri salvati */}
              {book.bookmarks && book.bookmarks.length > 0 && (
                <>
                  <span className="text-slate-400">·</span>
                  <span
                    className="text-[#1E8C86] font-bold inline-flex items-center gap-1 bg-[#E8F6F5] px-2 py-0.5 rounded-full text-[10px]"
                    title={`${book.bookmarks.length} segnalibri salvati`}
                  >
                    <BookmarkIcon size={10} className="fill-[#1E8C86]" />
                    <span>{book.bookmarks.length}</span>
                  </span>
                </>
              )}
            </div>
        </div>

        {/* Right: Tre puntini verticali ⋮ */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowOptions((prev) => !prev);
            setConfirmDelete(false);
          }}
          aria-label={`Opzioni per ${book.title}`}
          aria-expanded={showOptions}
          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all text-slate-600 hover:text-[#1E8C86] hover:bg-[#E8F6F5] active:scale-95 ${
            showOptions ? 'bg-[#E8F6F5] text-[#1E8C86]' : ''
          }`}
        >
          <MoreVertical size={18} />
        </button>
      </article>

      {/* Toast Feedback */}
      {toastMsg && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-60 bg-[#FFD23F] text-[#1E8C86] font-extrabold px-4 py-2 rounded-full border-2 border-[#E6B800] shadow-accent-glow text-xs animate-fade-in flex items-center gap-2">
          <Check size={16} className="text-[#1E8C86]" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Menu a comparsa quando si clicca sui tre puntini (Flip7 Cream/White Card Modal) */}
      {showOptions && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Opzioni per ${book.title}`}
          className="fixed inset-0 z-50 bg-[#1E8C86]/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 sm:p-4 animate-fade-in select-none"
          onClick={() => {
            setShowOptions(false);
            setConfirmDelete(false);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border-2 border-[#2BA8A2]/30 rounded-3xl max-w-sm w-full p-4 sm:p-5 shadow-2xl flex flex-col gap-3 text-slate-900 mb-20 sm:mb-0 animate-slide-up"
          >
            {/* Intestazione opzioni */}
            <div className="flex items-center justify-between border-b-2 border-dashed border-[#2BA8A2]/20 pb-3">
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-extrabold text-slate-900 truncate">
                  {book.title}
                </h4>
                <span className="text-xs text-slate-500 font-semibold block truncate">
                  {getFileTypeLabel()} · {book.pages.length} {book.pages.length === 1 ? 'pagina' : 'pagine'} · {formatSize(book.size)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowOptions(false);
                  setConfirmDelete(false);
                }}
                className="w-8 h-8 rounded-full bg-[#EFF8F7] text-slate-600 hover:bg-[#EF6C4A] hover:text-white flex items-center justify-center transition-colors shrink-0 active:scale-95"
                aria-label="Chiudi opzioni"
              >
                <X size={16} />
              </button>
            </div>

            {/* Elenco di opzioni */}
            {confirmDelete ? (
              <div className="flex flex-col gap-3 p-3.5 bg-[#FFF8E7] border-2 border-[#EF6C4A] rounded-2xl shadow-coral-glow">
                <div className="flex items-center gap-2 text-[#EF6C4A]">
                  <AlertCircle size={20} className="shrink-0" />
                  <span className="text-sm font-extrabold text-[#D45233]">
                    Eliminare definitivamente questo file?
                  </span>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      onDelete(book.book_id);
                      setShowOptions(false);
                      setConfirmDelete(false);
                    }}
                    className="flex-1 py-2.5 bg-[#EF6C4A] hover:bg-[#D45233] active:scale-95 text-white font-extrabold text-xs rounded-full transition-all shadow-coral-glow"
                  >
                    Sì, elimina
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="flex-1 py-2.5 bg-white hover:bg-slate-100 border border-slate-300 active:scale-95 text-slate-700 font-bold text-xs rounded-full transition-all"
                  >
                    Annulla
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-[#2BA8A2]/10">
                {/* 1. Apri in PDF Standard */}
                {onOpenPdf && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowOptions(false);
                      onOpenPdf(book, false);
                    }}
                    className="w-full flex items-center gap-3.5 py-3 px-2 text-left hover:bg-[#E8F6F5] rounded-xl transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-[#E8F6F5] text-[#1E8C86] border border-[#2BA8A2]/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <FileText size={18} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-900 group-hover:text-[#1E8C86]">
                        Apri in PDF
                      </span>
                      <span className="text-[11px] text-slate-500">Visualizzazione standard</span>
                    </div>
                  </button>
                )}

                {/* 1b. Apri in PDF - Modalità Notte */}
                {onOpenPdf && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowOptions(false);
                      onOpenPdf(book, true);
                    }}
                    className="w-full flex items-center gap-3.5 py-3 px-2 text-left hover:bg-[#E8F6F5] rounded-xl transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-[#1E8C86] text-[#FFD23F] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                      <Moon size={18} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-900 group-hover:text-[#1E8C86]">
                        Apri in PDF (Modalità Notte)
                      </span>
                      <span className="text-[11px] text-slate-500">Sfondo scuro ad alto contrasto</span>
                    </div>
                  </button>
                )}

                {/* 2. Leggi nel Lettore eBook (ReaderView con audio TTS) */}
                {onOpenReader && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowOptions(false);
                      onOpenReader(book);
                    }}
                    className="w-full flex items-center gap-3.5 py-3 px-2 text-left hover:bg-[#E8F6F5] rounded-xl transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-[#FFF8E7] text-[#1E8C86] border border-[#FFD23F] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                      <BookOpen size={18} className="text-[#1E8C86]" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-900 group-hover:text-[#1E8C86]">
                        Leggi libro con voce AI
                      </span>
                      <span className="text-[11px] text-slate-500">Sintesi vocale naturale e testo grande</span>
                    </div>
                  </button>
                )}

                {/* 3. Dettagli file */}
                <button
                  type="button"
                  onClick={() => {
                    setShowOptions(false);
                    setShowDetailsModal(true);
                  }}
                  className="w-full flex items-center gap-3.5 py-3 px-2 text-left hover:bg-[#E8F6F5] rounded-xl transition-colors group"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#E8F6F5] text-[#1E8C86] border border-[#2BA8A2]/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Info size={18} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-900 group-hover:text-[#1E8C86]">
                      Dettagli file
                    </span>
                    <span className="text-[11px] text-slate-500">Pagine, dimensione, motore OCR</span>
                  </div>
                </button>

                {/* 4. Elimina file (Coral Warning Button) */}
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="w-full flex items-center gap-3.5 py-3 px-2 text-left hover:bg-[#FF8A6A]/15 rounded-xl transition-colors group text-[#EF6C4A]"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#FF8A6A]/15 text-[#EF6C4A] border border-[#EF6C4A]/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Trash2 size={18} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-[#EF6C4A]">
                      Elimina dalla libreria
                    </span>
                    <span className="text-[11px] text-slate-400">Rimuove il documento dal dispositivo</span>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modale Dettagli File (Flip7 Style) */}
      {showDetailsModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Dettagli del file"
          className="fixed inset-0 z-50 bg-[#1E8C86]/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in select-none"
          onClick={() => setShowDetailsModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border-2 border-[#2BA8A2]/30 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl flex flex-col gap-4 text-slate-900 max-h-[90vh] overflow-y-auto"
          >
            {/* Header Dettagli */}
            <div className="flex items-center justify-between border-b-2 border-dashed border-[#2BA8A2]/20 pb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#E8F6F5] text-[#1E8C86] border border-[#2BA8A2]/40 flex items-center justify-center shrink-0">
                  <Info size={20} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Dettagli del file
                  </h3>
                  <span className="text-xs text-slate-500 font-medium">Informazioni e metadati</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDetailsModal(false)}
                className="w-8 h-8 rounded-full bg-[#EFF8F7] text-slate-600 hover:bg-[#EF6C4A] hover:text-white flex items-center justify-center transition-colors"
                aria-label="Chiudi dettagli"
              >
                <X size={16} />
              </button>
            </div>

            {/* Schede con Metadati */}
            <div className="flex flex-col gap-3">
              {/* Box Titolo */}
              <div className="bg-[#EFF8F7] border border-[#2BA8A2]/20 rounded-2xl p-3.5">
                <span className="block text-[10px] font-extrabold text-[#1E8C86] uppercase tracking-wider mb-1">
                  Titolo documento
                </span>
                <p className="text-sm font-black text-slate-900 break-words leading-snug">
                  {book.title}
                </p>
                {book.author && (
                  <p className="text-xs text-slate-600 font-semibold mt-1">
                    Autore: {book.author}
                  </p>
                )}
              </div>

              {/* Formato, Pagine e Dimensione - Box Grid */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="bg-white border-2 border-[#2BA8A2]/20 rounded-2xl p-3 text-center shadow-xs">
                  <span className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                    Formato
                  </span>
                  <span className="inline-block text-xs font-black px-2.5 py-0.5 rounded-full bg-[#E8F6F5] border border-[#2BA8A2]/40 text-[#1E8C86]">
                    {getFileTypeLabel()}
                  </span>
                </div>

                <div className="bg-white border-2 border-[#2BA8A2]/20 rounded-2xl p-3 text-center shadow-xs">
                  <span className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                    Pagine
                  </span>
                  <span className="block text-sm font-black text-slate-900">
                    {book.pages.length}
                  </span>
                </div>

                <div className="bg-white border-2 border-[#2BA8A2]/20 rounded-2xl p-3 text-center shadow-xs">
                  <span className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                    Dimensione
                  </span>
                  <span className="block text-xs font-bold text-slate-700">
                    {formatSize(book.size)}
                  </span>
                </div>
              </div>

              {/* Posizione del file */}
              <div className="bg-[#EFF8F7] border border-[#2BA8A2]/20 rounded-2xl p-3.5 flex items-center justify-between shadow-xs">
                <div>
                  <span className="block text-[10px] font-extrabold text-[#1E8C86] uppercase tracking-wider">
                    Posizione archiviazione
                  </span>
                  <span className="block text-xs font-bold text-slate-800 mt-0.5">
                    I miei file · Google Drive & Locale
                  </span>
                </div>
                <div className="w-8 h-8 rounded-full bg-white text-[#1E8C86] border border-[#2BA8A2]/30 flex items-center justify-center shrink-0">
                  <FileText size={16} />
                </div>
              </div>

              {/* Motore OCR / Elaborazione */}
              {book.ocr_engine && (
                <div className="bg-[#EFF8F7] border border-[#2BA8A2]/20 rounded-2xl p-3.5 flex items-center justify-between shadow-xs">
                  <div>
                    <span className="block text-[10px] font-extrabold text-[#1E8C86] uppercase tracking-wider">
                      Motore di Elaborazione
                    </span>
                    <span className="block text-xs font-bold text-slate-800 mt-0.5">
                      {book.ocr_engine}
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-white text-[#1E8C86] border border-[#2BA8A2]/30 flex items-center justify-center shrink-0">
                    <Cpu size={16} />
                  </div>
                </div>
              )}

              {/* Data di Aggiunta */}
              <div className="bg-[#EFF8F7] border border-[#2BA8A2]/20 rounded-2xl p-3.5 flex items-center justify-between text-xs shadow-xs">
                <span className="font-extrabold text-slate-500">Data documento</span>
                <span className="font-extrabold text-slate-900">
                  {formatDate(book.created_at)}
                </span>
              </div>
            </div>

            {/* Azioni Flip7 Pill Buttons */}
            <div className="grid grid-cols-2 gap-2.5 pt-2 border-t-2 border-dashed border-[#2BA8A2]/20">
              <button
                type="button"
                onClick={() => setShowDetailsModal(false)}
                className="min-h-[46px] rounded-full border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-extrabold transition-all active:scale-95 shadow-sm"
              >
                Chiudi
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowDetailsModal(false);
                  onOpen(book);
                }}
                className="min-h-[46px] rounded-full bg-gradient-to-r from-[#FFD23F] to-[#FFE47A] hover:bg-[#FFD23F] text-[#1E8C86] text-xs font-black flex items-center justify-center gap-2 transition-all active:scale-95 shadow-accent-glow border-2 border-[#E6B800]"
              >
                <BookOpen size={16} />
                <span>Apri Documento</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
