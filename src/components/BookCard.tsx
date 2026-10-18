import React, { useState } from 'react';
import { Book } from '../types';
import { VoraLogo } from './VoraLogo';
import {
  FileText,
  Camera,
  Trash2,
  AlertCircle,
  MoreVertical,
  X,
  Info,
  BookOpen,
  Smartphone,
  Cpu,
  Share2,
  Check,
} from 'lucide-react';

interface BookCardProps {
  book: Book;
  onOpen: (book: Book) => void;
  onDelete: (bookId: string) => void;
  onOpenPdf?: (book: Book) => void;
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
      default:
        return 'PDF';
    }
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
        className="bg-black hover:bg-zinc-950 active:bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex items-center justify-between gap-3 transition-colors cursor-pointer group select-none"
        aria-labelledby={`book-title-${book.book_id}`}
      >
        {/* Left: Acrobat Red Badge + Title & White Details */}
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          {/* Vora Signature Icon Badge - Bianco con Cerchio Bianco */}
          <div
            className="w-10 h-10 rounded-full bg-black border border-white flex flex-col items-center justify-center shrink-0 shadow-xs group-hover:border-white transition-colors"
            title={`Tipo file: ${getFileTypeLabel()}`}
            aria-label={`Tipo file: ${getFileTypeLabel()}`}
          >
            {book.file_type === 'scan' ? (
              <Camera size={18} className="text-white" />
            ) : (
              <VoraLogo size={20} variant="white" showCircle={false} className="w-5 h-5 text-white" />
            )}
            <span className="text-[7px] font-black tracking-tight text-white -mt-0.5 leading-none">
              {getFileTypeLabel()}
            </span>
          </div>

          {/* Book Info Column */}
          <div className="flex-1 min-w-0">
            {/* Title: Pure Bold White Text (stile Adobe Acrobat) */}
            <h3
              id={`book-title-${book.book_id}`}
              className="text-sm sm:text-base font-bold text-white truncate leading-snug tracking-tight group-hover:text-zinc-300 transition-colors"
            >
              {book.title}
            </h3>

            {/* Subtitle / Details: Icona Google Drive / Device + Colori Puri Bianchi e separatori dot • */}
            <div className="flex items-center gap-1.5 text-xs text-white font-medium truncate mt-0.5">
              {book.source === 'scan' ? (
                <Smartphone size={13} className="text-white shrink-0 inline mr-0.5" />
              ) : (
                <svg
                  className="w-3.5 h-3.5 shrink-0 inline mr-0.5"
                  viewBox="0 0 87.3 78"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5z" fill="#FFFFFF"/>
                  <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#FFFFFF"/>
                  <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.5l5.85 10.15z" fill="#FFFFFF"/>
                  <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#FFFFFF"/>
                  <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#FFFFFF"/>
                  <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#FFFFFF"/>
                </svg>
              )}

              {/* Formato in bianco puro */}
              <span className="font-bold text-white uppercase tracking-wider">
                {getFileTypeLabel()}
              </span>

              <span className="text-white/70">•</span>

              {/* Data in bianco puro */}
              <span className="text-white font-semibold">
                {formatDate(book.created_at)}
              </span>

              <span className="text-white/70">•</span>

              {/* Dimensione file in bianco puro */}
              <span className="text-white font-semibold">
                {formatSize(book.size)}
              </span>

              {/* Se in lettura */}
              {book.currentPage !== undefined && book.currentPage > 0 && (
                <>
                  <span className="text-white/70">•</span>
                  <span className="text-white font-bold bg-white/15 px-1.5 py-0.5 rounded">
                    Pag. {book.currentPage + 1}/{book.pages.length}
                  </span>
                </>
              )}
            </div>
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
          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors text-white hover:bg-zinc-800 active:scale-95 ${
            showOptions ? 'bg-zinc-800' : ''
          }`}
        >
          <MoreVertical size={18} className="text-white" />
        </button>
      </article>

      {/* Toast Feedback */}
      {toastMsg && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-60 bg-zinc-800 text-white font-bold px-4 py-2 rounded-xl border border-zinc-700 shadow-2xl text-xs animate-fade-in flex items-center gap-2">
          <Check size={16} className="text-white" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Menu a comparsa quando si clicca sui tre puntini (Elenco di opzioni con testo bianco) */}
      {showOptions && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Opzioni per ${book.title}`}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 sm:p-4 animate-fade-in select-none"
          onClick={() => {
            setShowOptions(false);
            setConfirmDelete(false);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-black border border-white/20 rounded-3xl max-w-sm w-full p-4 sm:p-5 shadow-2xl flex flex-col gap-3 text-white mb-20 sm:mb-0 animate-slide-up"
          >
            {/* Intestazione opzioni */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-black border border-zinc-700 text-white flex items-center justify-center shrink-0">
                  <FileText size={20} className="text-white" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-black text-white truncate">
                    {book.title}
                  </h4>
                  <span className="text-xs text-white/70 font-semibold block truncate">
                    {getFileTypeLabel()} · {book.pages.length} {book.pages.length === 1 ? 'pagina' : 'pagine'} · {formatSize(book.size)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowOptions(false);
                  setConfirmDelete(false);
                }}
                className="w-8 h-8 rounded-full bg-black border border-white/20 text-white hover:bg-white hover:text-black flex items-center justify-center transition-colors shrink-0"
                aria-label="Chiudi opzioni"
              >
                <X size={16} className="text-white" />
              </button>
            </div>

            {/* Elenco di opzioni con testo bianco */}
            {confirmDelete ? (
              <div className="flex flex-col gap-3 p-3 bg-zinc-900 border border-zinc-700 rounded-2xl">
                <div className="flex items-center gap-2 text-white">
                  <AlertCircle size={18} className="text-white shrink-0" />
                  <span className="text-sm font-bold text-white">
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
                    className="flex-1 py-2.5 bg-white hover:bg-zinc-200 active:scale-95 text-black font-black text-xs rounded-xl transition-all"
                  >
                    Sì, elimina
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 active:scale-95 text-white font-bold text-xs rounded-xl transition-all"
                  >
                    Annulla
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-zinc-800">
                {/* 1. Apri in PDF */}
                {onOpenPdf && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowOptions(false);
                      onOpenPdf(book);
                    }}
                    className="w-full flex items-center gap-3.5 py-3 px-2 text-left hover:bg-zinc-900 rounded-xl transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-black border border-white/20 flex items-center justify-center shrink-0 text-white group-hover:scale-105 transition-transform">
                      <FileText size={18} className="text-white" />
                    </div>
                    <span className="text-sm font-bold text-white">
                      Apri in PDF
                    </span>
                  </button>
                )}

                {/* 2. Leggi libro */}
                {onOpenReader && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowOptions(false);
                      onOpenReader(book);
                    }}
                    className="w-full flex items-center gap-3.5 py-3 px-2 text-left hover:bg-zinc-900 rounded-xl transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-black border border-white/20 flex items-center justify-center shrink-0 text-white group-hover:scale-105 transition-transform">
                      <BookOpen size={18} className="text-white" />
                    </div>
                    <span className="text-sm font-bold text-white">
                      Leggi libro
                    </span>
                  </button>
                )}

                {/* 3. Dettagli */}
                <button
                  type="button"
                  onClick={() => {
                    setShowOptions(false);
                    setShowDetailsModal(true);
                  }}
                  className="w-full flex items-center gap-3.5 py-3 px-2 text-left hover:bg-zinc-900 rounded-xl transition-colors group"
                >
                  <div className="w-9 h-9 rounded-xl bg-black border border-white/20 flex items-center justify-center shrink-0 text-white group-hover:scale-105 transition-transform">
                    <Info size={18} className="text-white" />
                  </div>
                  <span className="text-sm font-bold text-white">
                    Dettagli
                  </span>
                </button>

                {/* 4. Condividi */}
                <button
                  type="button"
                  onClick={async () => {
                    const text = book.pages.join('\n\n');
                    if (navigator.share) {
                      try {
                        await navigator.share({
                          title: book.title,
                          text: text.slice(0, 500),
                        });
                      } catch {}
                    } else if (navigator.clipboard) {
                      await navigator.clipboard.writeText(text.slice(0, 5000));
                      setToastMsg('Testo copiato negli appunti!');
                      setTimeout(() => setToastMsg(null), 2000);
                    }
                    setShowOptions(false);
                  }}
                  className="w-full flex items-center gap-3.5 py-3 px-2 text-left hover:bg-zinc-900 rounded-xl transition-colors group"
                >
                  <div className="w-9 h-9 rounded-xl bg-black border border-white/20 flex items-center justify-center shrink-0 text-white group-hover:scale-105 transition-transform">
                    <Share2 size={18} className="text-white" />
                  </div>
                  <span className="text-sm font-bold text-white">
                    Condividi
                  </span>
                </button>

                {/* 5. Elimina */}
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="w-full flex items-center gap-3.5 py-3 px-2 text-left hover:bg-zinc-900 rounded-xl transition-colors group"
                >
                  <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 text-white group-hover:scale-105 transition-transform">
                    <Trash2 size={18} className="text-white" />
                  </div>
                  <span className="text-sm font-bold text-white">
                    Elimina
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================== MODAL: DETTAGLI LIBRO (DARK MODE GOOGLE DRIVE) ===================== */}
      {showDetailsModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={`book-details-title-${book.book_id}`}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowDetailsModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-black border border-zinc-800 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl flex flex-col gap-5 text-gray-100 select-text"
          >
            {/* Header del modale Dettagli - Stile Google Drive Dark */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-700 flex items-center justify-center shrink-0 shadow-2xs">
                  {/* Google Drive white icon */}
                  <svg
                    className="w-6 h-6 shrink-0"
                    viewBox="0 0 87.3 78"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5z" fill="#FFFFFF"/>
                    <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#FFFFFF"/>
                    <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.5l5.85 10.15z" fill="#FFFFFF"/>
                    <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#FFFFFF"/>
                    <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#FFFFFF"/>
                    <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#FFFFFF"/>
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3
                      id={`book-details-title-${book.book_id}`}
                      className="text-lg font-black text-white leading-snug truncate"
                    >
                      Dettagli libro
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-900 text-white border border-zinc-700 shrink-0">
                      Google Drive
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 font-medium truncate">
                    Proprietà del documento e metadati file
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowDetailsModal(false)}
                className="w-9 h-9 rounded-full bg-zinc-900 text-gray-400 hover:text-white hover:bg-zinc-800 border border-zinc-800 flex items-center justify-center transition-colors shrink-0"
                aria-label="Chiudi dettagli libro"
              >
                <X size={18} />
              </button>
            </div>

            {/* Griglia Dettagli in Stile Dark Google Drive */}
            <div className="flex flex-col gap-2.5">
              {/* Titolo */}
              <div className="bg-black border border-white/20 rounded-2xl p-3.5 shadow-2xs">
                <span className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  Titolo documento
                </span>
                <span className="block text-sm font-black text-white leading-snug break-words">
                  {book.title}
                </span>
              </div>

              {/* Autore se disponibile */}
              {book.author && (
                <div className="bg-black border border-white/20 rounded-2xl p-3.5 shadow-2xs">
                  <span className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5">
                    Autore
                  </span>
                  <span className="block text-sm font-bold text-white">
                    {book.author}
                  </span>
                </div>
              )}

              {/* Formato, Pagine e Dimensione - Box Dark Google Drive */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="bg-black border border-white/20 rounded-2xl p-3 text-center shadow-2xs">
                  <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    Formato
                  </span>
                  <span className="inline-block text-xs font-black px-2.5 py-0.5 rounded-full bg-black border border-white/30 text-white">
                    {getFileTypeLabel()}
                  </span>
                </div>

                <div className="bg-black border border-zinc-800 rounded-2xl p-3 text-center shadow-2xs">
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Pagine
                  </span>
                  <span className="block text-sm font-black text-white">
                    {book.pages.length}
                  </span>
                </div>

                <div className="bg-black border border-zinc-800 rounded-2xl p-3 text-center shadow-2xs">
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Dimensione
                  </span>
                  <span className="block text-xs font-bold text-white">
                    {formatSize(book.size)}
                  </span>
                </div>
              </div>

              {/* Posizione del file (Stile Google Drive Dark) */}
              <div className="bg-black border border-zinc-800 rounded-2xl p-3.5 flex items-center justify-between shadow-2xs">
                <div>
                  <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    Posizione archiviazione
                  </span>
                  <span className="block text-xs font-bold text-white mt-0.5">
                    I miei file · Google Drive & Locale
                  </span>
                </div>
                <div className="w-8 h-8 rounded-full bg-zinc-900 text-white border border-zinc-800 flex items-center justify-center shrink-0">
                  <FileText size={16} />
                </div>
              </div>

              {/* Motore OCR / Elaborazione */}
              {book.ocr_engine && (
                <div className="bg-black border border-zinc-800 rounded-2xl p-3.5 flex items-center justify-between shadow-2xs">
                  <div>
                    <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      Motore di Elaborazione
                    </span>
                    <span className="block text-xs font-bold text-white mt-0.5">
                      {book.ocr_engine}
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-zinc-900 text-white border border-zinc-800 flex items-center justify-center shrink-0">
                    <Cpu size={16} />
                  </div>
                </div>
              )}

              {/* Data di Aggiunta */}
              <div className="bg-black border border-zinc-800 rounded-2xl p-3.5 flex items-center justify-between text-xs shadow-2xs">
                <span className="font-bold text-gray-400">Data documento</span>
                <span className="font-bold text-white">
                  {formatDate(book.created_at)}
                </span>
              </div>
            </div>

            {/* Azioni in Stile Google Drive Dark */}
            <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setShowDetailsModal(false)}
                className="min-h-[46px] rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-gray-200 hover:text-white text-xs font-bold transition-all active:scale-95"
              >
                Chiudi
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowDetailsModal(false);
                  onOpen(book);
                }}
                className="min-h-[46px] rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-black flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md"
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
