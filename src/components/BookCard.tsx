import React, { useState } from 'react';
import { Book } from '../types';
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
} from 'lucide-react';

interface BookCardProps {
  book: Book;
  onOpen: (book: Book) => void;
  onDelete: (bookId: string) => void;
}

export const BookCard: React.FC<BookCardProps> = ({ book, onOpen, onDelete }) => {
  const [showOptions, setShowOptions] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

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
        className="bg-black hover:bg-[#111318] active:bg-[#161820] border-b border-[#181B22] px-4 py-3 flex items-center justify-between gap-3 transition-colors cursor-pointer group select-none"
        aria-labelledby={`book-title-${book.book_id}`}
      >
        {/* Left: Acrobat Red Badge + Title & White Details */}
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          {/* Adobe Acrobat Signature Red Icon Badge */}
          <div
            className="w-10 h-10 rounded-xl bg-[#260A0D] border border-[#ED2224] flex flex-col items-center justify-center shrink-0 shadow-xs group-hover:border-red-400 transition-colors"
            title={`Tipo file: ${getFileTypeLabel()}`}
            aria-label={`Tipo file: ${getFileTypeLabel()}`}
          >
            {book.file_type === 'scan' ? (
              <Camera size={18} className="text-[#ED2224]" />
            ) : (
              <svg className="w-5 h-5 text-[#ED2224]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13.983 0C10.748 0 7.828 1.488 5.895 3.82L0 19.344h5.666l3.355-8.243c.96-2.358 2.684-4.098 4.962-4.098 2.376 0 4.148 1.83 4.148 4.298 0 2.215-1.464 4.398-3.791 5.656l-3.23 1.748c-3.155 1.706-5.077 4.707-5.077 8.295h5.666c0-2.308 1.258-4.325 3.32-5.438l3.23-1.747c3.674-1.986 5.922-5.467 5.922-9.283C24.17 4.636 19.534 0 13.983 0z"/>
              </svg>
            )}
            <span className="text-[8px] font-black tracking-tight text-[#ED2224] -mt-0.5 leading-none">
              {getFileTypeLabel()}
            </span>
          </div>

          {/* Book Info Column */}
          <div className="flex-1 min-w-0">
            {/* Title: Pure Bold White Text (stile Adobe Acrobat) */}
            <h3
              id={`book-title-${book.book_id}`}
              className="text-sm sm:text-base font-bold text-white truncate leading-snug tracking-tight group-hover:text-red-400 transition-colors"
            >
              {book.title}
            </h3>

            {/* Subtitle / Details: Icona Google Drive / Device + Colori Puri Bianchi e separatori dot • */}
            <div className="flex items-center gap-1.5 text-xs text-white font-medium truncate mt-0.5">
              {/* Google Drive Colored Triangle Icon (come nello screenshot di Acrobat) */}
              {book.source === 'scan' ? (
                <Smartphone size={13} className="text-white shrink-0 inline mr-0.5" />
              ) : (
                <svg
                  className="w-3.5 h-3.5 shrink-0 inline mr-0.5"
                  viewBox="0 0 87.3 78"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066DA"/>
                  <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#00AC47"/>
                  <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.5l5.85 10.15z" fill="#EA4335"/>
                  <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832D"/>
                  <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684FC"/>
                  <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#FFBA00"/>
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
          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${
            showOptions
              ? 'bg-zinc-800 text-white'
              : 'text-gray-400 hover:text-white hover:bg-zinc-900 active:scale-95'
          }`}
        >
          <MoreVertical size={18} />
        </button>
      </article>

      {/* Options Panel (Stile Adobe Acrobat Scuro con Dettagli Libro Bianco) */}
      {showOptions && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="bg-[#12141A] border-b border-[#202430] px-4 py-3 flex flex-col gap-2 animate-fade-in"
        >
          {confirmDelete ? (
            <div className="flex items-center justify-between flex-wrap gap-2 text-white" role="alert">
              <span className="text-xs text-white font-semibold flex items-center gap-1.5">
                <AlertCircle size={15} className="text-red-500 shrink-0" />
                Eliminare definitivamente questo file?
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    onDelete(book.book_id);
                    setShowOptions(false);
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg active:scale-95"
                >
                  Sì, elimina
                </button>
                <button
                  onClick={() => {
                    setConfirmDelete(false);
                    setShowOptions(false);
                  }}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg active:scale-95"
                >
                  Annulla
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Opzioni file
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setShowOptions(false);
                    setShowDetailsModal(true);
                  }}
                  className="bg-white hover:bg-gray-100 text-[#1A73E8] border border-gray-200 px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-bold shadow-xs transition-all active:scale-95"
                >
                  <Info size={14} className="text-[#1A73E8]" />
                  <span>Dettagli libro</span>
                </button>
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="bg-zinc-900 hover:bg-red-950/60 text-red-400 border border-red-900/50 px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-semibold transition-all active:scale-95"
                >
                  <Trash2 size={14} className="text-red-500" />
                  <span>Elimina</span>
                </button>
                <button
                  onClick={() => setShowOptions(false)}
                  className="w-7 h-7 rounded-md bg-zinc-800 text-gray-400 flex items-center justify-center hover:bg-zinc-700 hover:text-white"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================== MODAL: DETTAGLI LIBRO (STILE BIANCO GOOGLE DRIVE) ===================== */}
      {showDetailsModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={`book-details-title-${book.book_id}`}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowDetailsModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-[#DADCE0] rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl flex flex-col gap-5 text-[#202124] select-text"
          >
            {/* Header del modale Dettagli - Stile Google Drive */}
            <div className="flex items-center justify-between border-b border-[#E8EAED] pb-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-[#E8F0FE] border border-[#D2E3FC] flex items-center justify-center shrink-0 shadow-2xs">
                  {/* Google Drive colored triangle icon */}
                  <svg
                    className="w-6 h-6 shrink-0"
                    viewBox="0 0 87.3 78"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066DA"/>
                    <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#00AC47"/>
                    <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.5l5.85 10.15z" fill="#EA4335"/>
                    <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832D"/>
                    <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684FC"/>
                    <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#FFBA00"/>
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3
                      id={`book-details-title-${book.book_id}`}
                      className="text-lg font-black text-[#202124] leading-snug truncate"
                    >
                      Dettagli libro
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E8F0FE] text-[#1A73E8] shrink-0">
                      Google Drive
                    </span>
                  </div>
                  <p className="text-xs text-[#5F6368] font-medium truncate">
                    Proprietà del documento e metadati file
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowDetailsModal(false)}
                className="w-9 h-9 rounded-full bg-[#F1F3F4] text-[#5F6368] hover:text-[#202124] hover:bg-[#E8EAED] flex items-center justify-center transition-colors shrink-0"
                aria-label="Chiudi dettagli libro"
              >
                <X size={18} />
              </button>
            </div>

            {/* Griglia Dettagli in Stile Bianco Google Drive */}
            <div className="flex flex-col gap-2.5">
              {/* Titolo */}
              <div className="bg-[#F8F9FA] border border-[#DADCE0] rounded-2xl p-3.5 shadow-2xs">
                <span className="block text-[11px] font-bold text-[#5F6368] uppercase tracking-wider mb-1">
                  Titolo documento
                </span>
                <span className="block text-sm font-black text-[#202124] leading-snug break-words">
                  {book.title}
                </span>
              </div>

              {/* Autore se disponibile */}
              {book.author && (
                <div className="bg-[#F8F9FA] border border-[#DADCE0] rounded-2xl p-3.5 shadow-2xs">
                  <span className="block text-[11px] font-bold text-[#5F6368] uppercase tracking-wider mb-0.5">
                    Autore
                  </span>
                  <span className="block text-sm font-bold text-[#202124]">
                    {book.author}
                  </span>
                </div>
              )}

              {/* Formato, Pagine e Dimensione - Box Bianchi Google Drive */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="bg-[#F8F9FA] border border-[#DADCE0] rounded-2xl p-3 text-center shadow-2xs">
                  <span className="block text-[10px] font-bold text-[#5F6368] uppercase tracking-wider mb-1">
                    Formato
                  </span>
                  <span className="inline-block text-xs font-black px-2.5 py-0.5 rounded-full bg-[#E8F0FE] border border-[#D2E3FC] text-[#1A73E8]">
                    {getFileTypeLabel()}
                  </span>
                </div>

                <div className="bg-[#F8F9FA] border border-[#DADCE0] rounded-2xl p-3 text-center shadow-2xs">
                  <span className="block text-[10px] font-bold text-[#5F6368] uppercase tracking-wider mb-1">
                    Pagine
                  </span>
                  <span className="block text-sm font-black text-[#202124]">
                    {book.pages.length}
                  </span>
                </div>

                <div className="bg-[#F8F9FA] border border-[#DADCE0] rounded-2xl p-3 text-center shadow-2xs">
                  <span className="block text-[10px] font-bold text-[#5F6368] uppercase tracking-wider mb-1">
                    Dimensione
                  </span>
                  <span className="block text-xs font-bold text-[#202124]">
                    {formatSize(book.size)}
                  </span>
                </div>
              </div>

              {/* Posizione del file (Stile Google Drive) */}
              <div className="bg-[#F8F9FA] border border-[#DADCE0] rounded-2xl p-3.5 flex items-center justify-between shadow-2xs">
                <div>
                  <span className="block text-[11px] font-bold text-[#5F6368] uppercase tracking-wider">
                    Posizione archiviazione
                  </span>
                  <span className="block text-xs font-bold text-[#202124] mt-0.5">
                    I miei file · Google Drive & Locale
                  </span>
                </div>
                <div className="w-8 h-8 rounded-full bg-[#E8F0FE] text-[#1A73E8] flex items-center justify-center shrink-0">
                  <FileText size={16} />
                </div>
              </div>

              {/* Motore OCR / Elaborazione */}
              {book.ocr_engine && (
                <div className="bg-[#F8F9FA] border border-[#DADCE0] rounded-2xl p-3.5 flex items-center justify-between shadow-2xs">
                  <div>
                    <span className="block text-[11px] font-bold text-[#5F6368] uppercase tracking-wider">
                      Motore di Elaborazione
                    </span>
                    <span className="block text-xs font-bold text-[#202124] mt-0.5">
                      {book.ocr_engine}
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-[#E8F0FE] text-[#1A73E8] flex items-center justify-center shrink-0">
                    <Cpu size={16} />
                  </div>
                </div>
              )}

              {/* Data di Aggiunta */}
              <div className="bg-[#F8F9FA] border border-[#DADCE0] rounded-2xl p-3.5 flex items-center justify-between text-xs shadow-2xs">
                <span className="font-bold text-[#5F6368]">Data documento</span>
                <span className="font-bold text-[#202124]">
                  {formatDate(book.created_at)}
                </span>
              </div>
            </div>

            {/* Azioni in Stile Google Drive */}
            <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-[#E8EAED]">
              <button
                type="button"
                onClick={() => setShowDetailsModal(false)}
                className="min-h-[46px] rounded-xl border border-[#DADCE0] bg-white hover:bg-[#F1F3F4] text-[#3C4043] hover:text-[#202124] text-xs font-bold transition-all active:scale-95"
              >
                Chiudi
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowDetailsModal(false);
                  onOpen(book);
                }}
                className="min-h-[46px] rounded-xl bg-[#1A73E8] hover:bg-[#1557B0] text-white text-xs font-black flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md shadow-[#1A73E8]/20"
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
