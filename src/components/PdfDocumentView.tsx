import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Book, TtsSettings, Bookmark } from '../types';
import {
  ArrowLeft,
  FileText,
  BookOpen,
  Printer,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Search,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  X,
  Volume2,
  Eye,
  Sliders,
  Bookmark as BookmarkIcon,
  BookmarkCheck,
  Moon,
  Sun,
} from 'lucide-react';
import { fileParser } from '../services/fileParser';
import { storageService } from '../services/storageService';
import { BookmarksModal } from './BookmarksModal';
import { VoraLogo } from './VoraLogo';

interface PdfDocumentViewProps {
  book: Book;
  settings?: TtsSettings;
  onBack: () => void;
  onSwitchToReader: (book: Book) => void;
  onPageChange?: (pageIndex: number) => void;
  initialNightMode?: boolean;
}

export const PdfDocumentView: React.FC<PdfDocumentViewProps> = ({
  book,
  settings,
  onBack,
  onSwitchToReader,
  onPageChange,
  initialNightMode,
}) => {
  const [currentPage, setCurrentPage] = useState<number>(book.currentPage || 0);
  const [zoomLevel, setZoomLevel] = useState<number>(100); // 75, 100, 125, 150
  const [viewMode, setViewMode] = useState<'continuous' | 'single'>('continuous');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(() =>
    storageService.getBookmarks(book.book_id)
  );
  const [showBookmarksModal, setShowBookmarksModal] = useState<boolean>(false);
  const [bookmarkNotice, setBookmarkNotice] = useState<string | null>(null);

  // Night Mode state for the whole PDF book (with persistence)
  const [isNightMode, setIsNightMode] = useState<boolean>(() => {
    if (typeof initialNightMode === 'boolean') {
      try {
        localStorage.setItem('vora_pdf_night_mode', initialNightMode ? 'true' : 'false');
      } catch {}
      return initialNightMode;
    }
    try {
      const stored = localStorage.getItem('vora_pdf_night_mode');
      if (stored !== null) return stored === 'true';
      return settings?.highContrastMode === 'dark' || settings?.highContrastMode === 'black-white';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (typeof initialNightMode === 'boolean') {
      setIsNightMode(initialNightMode);
    }
  }, [initialNightMode]);

  const handleToggleNightMode = () => {
    setIsNightMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('vora_pdf_night_mode', next ? 'true' : 'false');
      } catch {}
      setBookmarkNotice(
        next
          ? '🌙 Modalità notte attivata in tutto il libro'
          : '☀️ Modalità giorno ripristinata'
      );
      setTimeout(() => setBookmarkNotice(null), 3000);
      return next;
    });
  };

  useEffect(() => {
    setBookmarks(storageService.getBookmarks(book.book_id));
  }, [book.book_id]);

  const isCurrentPageBookmarked = bookmarks.some((b) => b.pageIndex === currentPage);

  const handleToggleBookmark = (pageIdx: number = currentPage, note?: string) => {
    const text = sanitizedPages[pageIdx] || `Pagina ${pageIdx + 1}`;
    const res = storageService.toggleBookmark(book.book_id, pageIdx, text, note);
    setBookmarks(res.bookmarks);
    if (res.isBookmarked) {
      setBookmarkNotice(`Segnalibro salvato per Pagina ${pageIdx + 1}`);
    } else {
      setBookmarkNotice(`Segnalibro rimosso da Pagina ${pageIdx + 1}`);
    }
    setTimeout(() => setBookmarkNotice(null), 3000);
  };

  const handleAddBookmark = (pageIdx: number, note?: string) => {
    const text = sanitizedPages[pageIdx] || `Pagina ${pageIdx + 1}`;
    const updated = storageService.addBookmark(book.book_id, pageIdx, text, note);
    setBookmarks(updated);
    setBookmarkNotice(`Segnalibro salvato per Pagina ${pageIdx + 1}`);
    setTimeout(() => setBookmarkNotice(null), 3000);
  };

  const handleRemoveBookmark = (bmId: string) => {
    const updated = storageService.removeBookmark(book.book_id, bmId);
    setBookmarks(updated);
    setBookmarkNotice('Segnalibro eliminato.');
    setTimeout(() => setBookmarkNotice(null), 3000);
  };

  const handleUpdateBookmarkNote = (bmId: string, note: string) => {
    const current = storageService.getBookmarks(book.book_id);
    const updated = current.map((b) => (b.id === bmId ? { ...b, note: note || undefined } : b));
    storageService.saveBookmarks(book.book_id, updated);
    setBookmarks(updated);
    setBookmarkNotice('Nota del segnalibro aggiornata.');
    setTimeout(() => setBookmarkNotice(null), 3000);
  };

  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Sanitize pages to remove any corrupted bytes
  const sanitizedPages = useMemo(() => {
    return (book.pages || []).map((p) => fileParser.cleanCorruptedText(p));
  }, [book.pages]);

  const totalPages = sanitizedPages.length || 1;

  // Sync current page with parent callback
  useEffect(() => {
    if (onPageChange) {
      onPageChange(currentPage);
    }
  }, [currentPage, onPageChange]);

  const handleZoom = (delta: number) => {
    setZoomLevel((prev) => {
      const next = prev + delta;
      if (next < 60) return 60;
      if (next > 180) return 180;
      return next;
    });
  };

  const handleResetZoom = () => {
    setZoomLevel(100);
  };

  const scrollToPage = (pageIndex: number) => {
    const clamped = Math.max(0, Math.min(pageIndex, totalPages - 1));
    setCurrentPage(clamped);

    if (viewMode === 'continuous' && pageRefs.current[clamped]) {
      pageRefs.current[clamped]?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  };

  // Track active page on scroll in continuous mode
  const handleScroll = () => {
    if (viewMode !== 'continuous' || !containerRef.current) return;
    const containerTop = containerRef.current.scrollTop + 100;

    let closestIndex = 0;
    let minDistance = Infinity;

    pageRefs.current.forEach((el, index) => {
      if (!el) return;
      const offsetTop = el.offsetTop;
      const distance = Math.abs(offsetTop - containerTop);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });

    if (closestIndex !== currentPage) {
      setCurrentPage(closestIndex);
    }
  };

  const handlePrintPdf = () => {
    window.print();
  };

  const handleCopyCurrentPage = () => {
    const text = sanitizedPages[currentPage] || '';
    if (text) {
      navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // Search matches count across document
  const searchMatchesCount = useMemo(() => {
    if (!searchQuery.trim()) return 0;
    try {
      const escaped = searchQuery.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const reg = new RegExp(escaped, 'g');
      return sanitizedPages.reduce((acc, p) => {
        const matches = (p.toLowerCase().match(reg) || []).length;
        return acc + matches;
      }, 0);
    } catch {
      return 0;
    }
  }, [searchQuery, sanitizedPages]);

  // Highlight search text helper
  const renderHighlightedContent = (text: string) => {
    if (!searchQuery.trim()) {
      return text;
    }

    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, i) =>
      part.toLowerCase() === searchQuery.toLowerCase() ? (
        <mark
          key={i}
          className={`font-bold rounded-xs px-0.5 ${
            isNightMode ? 'bg-yellow-400 text-black' : 'bg-black text-white'
          }`}
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div
      role="region"
      aria-label={`Visualizzatore PDF del libro ${book.title}`}
      className="fixed inset-0 h-[100dvh] z-50 bg-black text-white flex flex-col justify-between overflow-hidden select-text font-sans"
    >
      {/* ===================== PDF VIEWER HEADER ===================== */}
      <header className="bg-black border-b border-zinc-800 px-3 sm:px-4 py-2.5 flex items-center justify-between gap-3 shrink-0 z-20 shadow-md">
        {/* Left: Back button */}
        <button
          type="button"
          onClick={onBack}
          aria-label="Torna indietro"
          className="min-h-[44px] px-3 rounded-xl border border-white/20 hover:border-white bg-black hover:bg-white hover:text-black text-white flex items-center gap-2 transition-all shrink-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          title="Torna indietro"
        >
          <ArrowLeft size={20} className="shrink-0" />
          <span className="hidden sm:inline font-bold text-xs">Indietro</span>
        </button>

        {/* Center: Titolo completo del documento PDF e dettagli */}
        <div className="flex-1 min-w-0 text-left sm:text-center px-1">
          <h2 className="text-sm sm:text-base font-bold text-white truncate flex items-center gap-1.5 sm:justify-center">
            <FileText size={16} className="text-white shrink-0" aria-hidden="true" />
            <span className="truncate">{book.title}</span>
          </h2>
          <p className="text-xs font-semibold text-zinc-400 truncate flex items-center sm:justify-center gap-1.5">
            {book.author ? `${book.author} · ` : ''}
            <span>
              Documento PDF · Pagina {currentPage + 1} di {totalPages}
            </span>
            {isNightMode && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-zinc-900 text-zinc-200 border border-zinc-700 text-[10px] font-bold shrink-0">
                <Moon size={10} className="fill-zinc-200" />
                Notte attiva
              </span>
            )}
          </p>
        </div>

        {/* Quick Bookmark Toggle Button */}
        <button
          type="button"
          onClick={() => handleToggleBookmark(currentPage)}
          className={`min-h-[44px] px-2.5 sm:px-3 rounded-xl border flex items-center gap-1.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white shrink-0 active:scale-95 ${
            isCurrentPageBookmarked
              ? 'bg-white text-black border-white font-bold shadow-xs'
              : 'bg-black text-white border-white/20 hover:border-white hover:bg-zinc-900'
          }`}
          aria-label={
            isCurrentPageBookmarked
              ? `Pagina ${currentPage + 1} salvata nei segnalibri. Tocca per rimuovere.`
              : `Salva Pagina ${currentPage + 1} nei segnalibri.`
          }
          title={
            isCurrentPageBookmarked
              ? 'Rimuovi segnalibro da questa pagina'
              : 'Aggiungi segnalibro a questa pagina'
          }
        >
          <BookmarkIcon
            size={18}
            className={`shrink-0 ${isCurrentPageBookmarked ? 'fill-black text-black' : 'text-white'}`}
          />
          <span className="hidden sm:inline text-xs font-bold">
            {isCurrentPageBookmarked ? 'Salvata' : 'Segnalibro'}
          </span>
        </button>
      </header>

      {/* ===================== PULSANTI SOTTO LA HEADER CON TESTO BIANCO ===================== */}
      <div className="bg-black border-b border-zinc-800 px-2 sm:px-4 py-2 shrink-0 z-10 select-none">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-1.5 sm:gap-2.5 overflow-x-auto no-scrollbar">
          {/* 1. Passa a Leggi libro (Audio Voce AI) */}
          <button
            type="button"
            onClick={() => onSwitchToReader(book)}
            className="flex-1 min-w-[62px] sm:min-w-0 sm:flex-none flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-2 px-2 sm:px-3 rounded-xl border border-white/20 hover:border-white bg-black hover:bg-zinc-900 text-white transition-all active:scale-95 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            title="Passa al lettore eBook con voce AI"
            aria-label="Leggi libro con voce AI"
          >
            <BookOpen size={17} className="text-white shrink-0 group-hover:scale-105 transition-transform" />
            <span className="text-[11px] sm:text-xs font-bold text-white tracking-tight whitespace-nowrap">
              Leggi libro
            </span>
          </button>

          {/* 2. Modalità visualizzazione: Continuo vs Singola */}
          <button
            type="button"
            onClick={() => setViewMode((prev) => (prev === 'continuous' ? 'single' : 'continuous'))}
            className="flex-1 min-w-[62px] sm:min-w-0 sm:flex-none flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-2 px-2 sm:px-3 rounded-xl border border-white/20 hover:border-white bg-black hover:bg-zinc-900 text-white transition-all active:scale-95 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            title={viewMode === 'continuous' ? 'Modalità: Scorrimento continuo (tocca per pagina singola)' : 'Modalità: Pagina singola (tocca per continuo)'}
            aria-label="Cambia visualizzazione pagine"
          >
            {viewMode === 'continuous' ? (
              <Maximize2 size={17} className="text-white shrink-0 group-hover:scale-105 transition-transform" />
            ) : (
              <Minimize2 size={17} className="text-white shrink-0 group-hover:scale-105 transition-transform" />
            )}
            <span className="text-[11px] sm:text-xs font-bold text-white tracking-tight whitespace-nowrap">
              {viewMode === 'continuous' ? 'Continuo' : 'Pag. singola'}
            </span>
          </button>

          {/* Modalità Notte Toggle per tutto il libro */}
          <button
            type="button"
            onClick={handleToggleNightMode}
            className={`flex-1 min-w-[62px] sm:min-w-0 sm:flex-none flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-2 px-2 sm:px-3 rounded-xl border transition-all active:scale-95 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
              isNightMode
                ? 'bg-white text-black border-white font-black shadow-sm'
                : 'bg-black hover:bg-zinc-900 border-white/20 hover:border-white text-white'
            }`}
            title={
              isNightMode
                ? 'Modalità notte attiva in tutto il libro (tocca per tornare alla modalità standard)'
                : 'Attiva modalità notte in tutto il libro (sfondo scuro ad alto contrasto per non affaticare la vista)'
            }
            aria-label={isNightMode ? 'Disattiva modalità notte' : 'Attiva modalità notte in tutto il libro'}
            aria-pressed={isNightMode}
          >
            {isNightMode ? (
              <Moon size={17} className="fill-black text-black shrink-0 group-hover:scale-105 transition-transform" />
            ) : (
              <Moon size={17} className="text-white shrink-0 group-hover:scale-105 transition-transform" />
            )}
            <span className="text-[11px] sm:text-xs font-bold tracking-tight whitespace-nowrap">
              {isNightMode ? 'Notte Attiva' : 'Mod. Notte'}
            </span>
          </button>

          {/* 3. Cerca nel PDF */}
          <button
            type="button"
            onClick={() => setShowSearch((prev) => !prev)}
            aria-label="Cerca testo nel PDF"
            className={`flex-1 min-w-[62px] sm:min-w-0 sm:flex-none flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-2 px-2 sm:px-3 rounded-xl border transition-all active:scale-95 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
              showSearch
                ? 'bg-white text-black border-white'
                : 'bg-black hover:bg-zinc-900 border-white/20 hover:border-white text-white'
            }`}
            title="Cerca nel testo"
          >
            <Search size={17} className="shrink-0 group-hover:scale-105 transition-transform" />
            <span className="text-[11px] sm:text-xs font-bold tracking-tight whitespace-nowrap">
              Cerca
            </span>
          </button>

          {/* Segnalibri con contatore badge */}
          <button
            type="button"
            onClick={() => setShowBookmarksModal(true)}
            className={`flex-1 min-w-[62px] sm:min-w-0 sm:flex-none flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-2 px-2 sm:px-3 rounded-xl border transition-all active:scale-95 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
              bookmarks.length > 0
                ? 'border-white/40 bg-zinc-950 hover:bg-zinc-900 text-white'
                : 'border-white/20 hover:border-white bg-black hover:bg-zinc-900 text-white'
            }`}
            aria-label={`Lista rapida segnalibri. ${bookmarks.length} salvati.`}
            title="Lista Segnalibri"
          >
            <div className="relative inline-flex items-center justify-center">
              <BookmarkCheck
                size={17}
                className={`text-white shrink-0 group-hover:scale-105 transition-transform ${
                  isCurrentPageBookmarked ? 'fill-white' : ''
                }`}
              />
              {bookmarks.length > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-white text-black font-black text-[9px] min-w-[15px] h-3.5 px-0.5 rounded-full flex items-center justify-center border border-black shadow-xs">
                  {bookmarks.length}
                </span>
              )}
            </div>
            <span className="text-[11px] sm:text-xs font-bold text-white tracking-tight whitespace-nowrap">
              Segnalibri
            </span>
          </button>

          {/* 4. Zoom Controls (Riduci / Ingrandisci / Percentuale) */}
          <div className="flex-1 min-w-[70px] sm:min-w-0 sm:flex-none flex items-center justify-center gap-0.5 sm:gap-1 py-1.5 px-1.5 sm:px-2 rounded-xl border border-white/20 bg-black text-white">
            <button
              type="button"
              onClick={() => handleZoom(-15)}
              className="w-7 h-7 flex items-center justify-center text-white hover:bg-zinc-800 rounded-lg transition-colors active:scale-90"
              title="Riduci zoom"
              aria-label="Riduci zoom"
            >
              <ZoomOut size={15} />
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              className="px-1 text-[11px] sm:text-xs font-bold text-white hover:underline whitespace-nowrap"
              title="Reimposta zoom 100%"
            >
              {zoomLevel}%
            </button>
            <button
              type="button"
              onClick={() => handleZoom(15)}
              className="w-7 h-7 flex items-center justify-center text-white hover:bg-zinc-800 rounded-lg transition-colors active:scale-90"
              title="Aumenta zoom"
              aria-label="Aumenta zoom"
            >
              <ZoomIn size={15} />
            </button>
          </div>

          {/* 5. Stampa o Salva PDF */}
          <button
            type="button"
            onClick={handlePrintPdf}
            className="flex-1 min-w-[62px] sm:min-w-0 sm:flex-none flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-2 px-2 sm:px-3 rounded-xl border border-white/20 hover:border-white bg-black hover:bg-zinc-900 text-white transition-all active:scale-95 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            title="Stampa o Salva documento in PDF"
            aria-label="Stampa o Salva PDF"
          >
            <Printer size={17} className="text-white shrink-0 group-hover:scale-105 transition-transform" />
            <span className="text-[11px] sm:text-xs font-bold text-white tracking-tight whitespace-nowrap">
              Stampa
            </span>
          </button>
        </div>
      </div>

      {/* Notifica rapida azione segnalibro */}
      {bookmarkNotice && (
        <div
          role="status"
          aria-live="polite"
          className="bg-black border-b border-white text-white text-xs font-bold py-1.5 px-4 text-center shrink-0 animate-in fade-in"
        >
          {bookmarkNotice}
        </div>
      )}

      {/* Barra di Ricerca quando attiva */}
      {showSearch && (
        <div className="bg-zinc-950 border-b border-zinc-800 p-2.5 flex items-center gap-2 z-10 animate-fade-in">
          <Search size={16} className="text-zinc-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cerca nel documento PDF..."
            className="bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none flex-1"
            autoFocus
          />
          {searchQuery && (
            <span className="text-xs text-white font-bold shrink-0">
              {searchMatchesCount} trovati
            </span>
          )}
          <button
            onClick={() => {
              setShowSearch(false);
              setSearchQuery('');
            }}
            className="text-zinc-400 hover:text-white p-1"
            title="Chiudi ricerca"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ===================== MAIN PDF CANVAS VIEWPORT ===================== */}
      <main
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overflow-x-auto p-4 sm:p-8 flex flex-col items-center bg-black print:bg-white print:p-0"
      >
        <div
          style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
          className="transition-transform duration-150 flex flex-col items-center gap-8 w-full max-w-3xl print:transform-none print:max-w-none print:w-full"
        >
          {viewMode === 'continuous' ? (
            /* Continuous View: All Pages Stacked */
            sanitizedPages.map((pageText, index) => (
              <div
                key={index}
                ref={(el) => {
                  pageRefs.current[index] = el;
                }}
                id={`pdf-page-${index}`}
                className={`w-full rounded-xl sm:rounded-2xl shadow-2xl p-8 sm:p-14 min-h-[780px] sm:min-h-[960px] flex flex-col justify-between relative transition-all duration-200 print:shadow-none print:border-none print:p-8 print:m-0 print:break-after-page ${
                  isNightMode
                    ? 'bg-[#121214] text-zinc-100 border border-zinc-800 shadow-black/80 ring-1 ring-white/5'
                    : 'bg-[#FCFCFD] text-[#1A1A1E] border border-zinc-200/80 hover:shadow-black/60'
                }`}
                style={{ aspectRatio: '1 / 1.414' }}
              >
                {/* PDF Header Watermark */}
                <div
                  className={`pb-3 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider select-none gap-2 border-b ${
                    isNightMode ? 'border-zinc-800 text-zinc-400' : 'border-zinc-200 text-zinc-500'
                  }`}
                >
                  <span className="truncate max-w-[280px]">
                    {book.title} {book.author ? `— ${book.author}` : ''}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleBookmark(index)}
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 border transition-all active:scale-95 ${
                        bookmarks.some((b) => b.pageIndex === index)
                          ? isNightMode
                            ? 'bg-white text-black border-white shadow-xs'
                            : 'bg-black text-white border-black shadow-xs'
                          : isNightMode
                            ? 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:border-white hover:text-white'
                            : 'bg-zinc-100 text-zinc-700 border-zinc-300 hover:border-black hover:text-black'
                      }`}
                      title={
                        bookmarks.some((b) => b.pageIndex === index)
                          ? 'Rimuovi segnalibro'
                          : 'Salva segnalibro per questa pagina'
                      }
                      aria-label={
                        bookmarks.some((b) => b.pageIndex === index)
                          ? `Rimuovi segnalibro da Pagina ${index + 1}`
                          : `Salva Pagina ${index + 1} nei segnalibri`
                      }
                    >
                      <BookmarkIcon
                        size={11}
                        className={bookmarks.some((b) => b.pageIndex === index) ? 'fill-current' : ''}
                      />
                      <span>{bookmarks.some((b) => b.pageIndex === index) ? 'Segnalibro' : '+ Segnalibro'}</span>
                    </button>
                    <span
                      className={`shrink-0 font-bold flex items-center gap-1 ${
                        isNightMode ? 'text-zinc-300' : 'text-black'
                      }`}
                    >
                      <FileText size={12} />
                      PDF
                    </span>
                  </div>
                </div>

                {/* PDF Page Body Content */}
                <div
                  className={`flex-1 py-4 sm:py-6 flex flex-col justify-center items-center font-serif leading-relaxed text-sm sm:text-base select-text ${
                    isNightMode ? 'text-zinc-100' : 'text-zinc-900'
                  }`}
                >
                  {book.imageUrls && book.imageUrls[index] ? (
                    <div className="w-full flex flex-col items-center gap-3">
                      <img
                        src={book.imageUrls[index]}
                        alt={`Scansione pagina ${index + 1}`}
                        className={`max-h-[640px] sm:max-h-[760px] w-auto max-w-full object-contain rounded-lg shadow-sm border select-none pointer-events-none transition-all ${
                          isNightMode
                            ? 'border-zinc-800 invert brightness-90 contrast-125'
                            : 'border-zinc-200'
                        }`}
                      />
                      {pageText && pageText.trim() && !pageText.startsWith('[Pagina') && (
                        <div
                          className={`w-full mt-3 p-3 rounded-lg border text-xs whitespace-pre-wrap select-text ${
                            isNightMode
                              ? 'bg-zinc-900/90 border-zinc-800 text-zinc-300'
                              : 'bg-zinc-50 border-zinc-200 text-zinc-700'
                          }`}
                        >
                          {renderHighlightedContent(pageText)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full whitespace-pre-wrap">
                      {renderHighlightedContent(pageText)}
                    </div>
                  )}
                </div>

                {/* PDF Footer with Page Number */}
                <div
                  className={`pt-3 flex items-center justify-between text-[11px] font-medium select-none border-t ${
                    isNightMode ? 'border-zinc-800 text-zinc-500' : 'border-zinc-200 text-zinc-400'
                  }`}
                >
                  <span>Vora Document Reader</span>
                  <span className={`font-bold ${isNightMode ? 'text-zinc-300' : 'text-zinc-600'}`}>
                    — Pagina {index + 1} di {totalPages} —
                  </span>
                  <span>{book.file_type.toUpperCase()}</span>
                </div>
              </div>
            ))
          ) : (
            /* Single Page View */
            <div
              className={`w-full rounded-xl sm:rounded-2xl shadow-2xl p-8 sm:p-14 min-h-[780px] sm:min-h-[960px] flex flex-col justify-between relative select-text transition-all duration-200 ${
                isNightMode
                  ? 'bg-[#121214] text-zinc-100 border border-zinc-800 shadow-black/80 ring-1 ring-white/5'
                  : 'bg-[#FCFCFD] text-[#1A1A1E] border border-zinc-200/80 hover:shadow-black/60'
              }`}
              style={{ aspectRatio: '1 / 1.414' }}
            >
              {/* PDF Header Watermark */}
              <div
                className={`pb-3 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider select-none gap-2 border-b ${
                  isNightMode ? 'border-zinc-800 text-zinc-400' : 'border-zinc-200 text-zinc-500'
                }`}
              >
                <span className="truncate max-w-[280px]">
                  {book.title} {book.author ? `— ${book.author}` : ''}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleBookmark(currentPage)}
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 border transition-all active:scale-95 ${
                      isCurrentPageBookmarked
                        ? isNightMode
                          ? 'bg-white text-black border-white shadow-xs'
                          : 'bg-black text-white border-black shadow-xs'
                        : isNightMode
                          ? 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:border-white hover:text-white'
                          : 'bg-zinc-100 text-zinc-700 border-zinc-300 hover:border-black hover:text-black'
                    }`}
                    title={
                      isCurrentPageBookmarked
                        ? 'Rimuovi segnalibro'
                        : 'Salva segnalibro per questa pagina'
                    }
                    aria-label={
                      isCurrentPageBookmarked
                        ? `Rimuovi segnalibro da Pagina ${currentPage + 1}`
                        : `Salva Pagina ${currentPage + 1} nei segnalibri`
                    }
                  >
                    <BookmarkIcon
                      size={11}
                      className={isCurrentPageBookmarked ? 'fill-current' : ''}
                    />
                    <span>{isCurrentPageBookmarked ? 'Segnalibro' : '+ Segnalibro'}</span>
                  </button>
                  <span
                    className={`shrink-0 font-bold flex items-center gap-1 ${
                      isNightMode ? 'text-zinc-300' : 'text-zinc-600'
                    }`}
                  >
                    <FileText size={12} />
                    PDF
                  </span>
                </div>
              </div>

              {/* PDF Page Body Content */}
              <div
                className={`flex-1 py-4 sm:py-6 flex flex-col justify-center items-center font-serif leading-relaxed text-sm sm:text-base select-text ${
                  isNightMode ? 'text-zinc-100' : 'text-zinc-900'
                }`}
              >
                {book.imageUrls && book.imageUrls[currentPage] ? (
                  <div className="w-full flex flex-col items-center gap-3">
                    <img
                      src={book.imageUrls[currentPage]}
                      alt={`Scansione pagina ${currentPage + 1}`}
                      className={`max-h-[640px] sm:max-h-[760px] w-auto max-w-full object-contain rounded-lg shadow-sm border select-none pointer-events-none transition-all ${
                        isNightMode
                          ? 'border-zinc-800 invert brightness-90 contrast-125'
                          : 'border-zinc-200'
                      }`}
                    />
                    {sanitizedPages[currentPage] && sanitizedPages[currentPage].trim() && !sanitizedPages[currentPage].startsWith('[Pagina') && (
                      <div
                        className={`w-full mt-3 p-3 rounded-lg border text-xs whitespace-pre-wrap select-text ${
                          isNightMode
                            ? 'bg-zinc-900/90 border-zinc-800 text-zinc-300'
                            : 'bg-zinc-50 border-zinc-200 text-zinc-700'
                        }`}
                      >
                        {renderHighlightedContent(sanitizedPages[currentPage])}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full whitespace-pre-wrap">
                    {renderHighlightedContent(sanitizedPages[currentPage] || '')}
                  </div>
                )}
              </div>

              {/* PDF Footer with Page Number */}
              <div
                className={`pt-3 flex items-center justify-between text-[11px] font-medium select-none border-t ${
                  isNightMode ? 'border-zinc-800 text-zinc-500' : 'border-zinc-200 text-zinc-400'
                }`}
              >
                <span>Vora Document Reader</span>
                <span className={`font-bold ${isNightMode ? 'text-zinc-300' : 'text-zinc-600'}`}>
                  — Pagina {currentPage + 1} di {totalPages} —
                </span>
                <span>{book.file_type.toUpperCase()}</span>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ===================== FLOATING BOTTOM NAVIGATION BAR ===================== */}
      <footer className="bg-black/95 backdrop-blur-md border-t border-zinc-800 px-4 py-2.5 flex items-center justify-between gap-3 shrink-0 z-20 print:hidden">
        {/* Previous page button */}
        <button
          type="button"
          disabled={currentPage <= 0}
          onClick={() => scrollToPage(currentPage - 1)}
          className="min-h-[42px] px-3 sm:px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 disabled:pointer-events-none border border-zinc-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95"
          aria-label="Pagina precedente"
        >
          <ChevronLeft size={18} />
          <span className="hidden sm:inline">Precedente</span>
        </button>

        {/* Page selector and quick jump */}
        <div className="flex items-center gap-2 text-xs font-bold text-zinc-300">
          <span>Pagina</span>
          <select
            value={currentPage}
            onChange={(e) => scrollToPage(Number(e.target.value))}
            className="bg-zinc-900 border border-zinc-700 text-white rounded-lg px-2.5 py-1 text-xs font-bold focus:outline-none focus:border-white cursor-pointer"
            aria-label="Seleziona pagina del PDF"
          >
            {Array.from({ length: totalPages }).map((_, idx) => (
              <option key={idx} value={idx}>
                {idx + 1}
              </option>
            ))}
          </select>
          <span className="text-zinc-400">di {totalPages}</span>
        </div>

        {/* Copy current page text & Next button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyCurrentPage}
            className="hidden sm:flex min-h-[42px] px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white font-bold text-xs items-center gap-1.5 transition-all"
            title="Copia testo della pagina"
          >
            {isCopied ? <Check size={16} className="text-white" /> : <Copy size={16} />}
            <span>{isCopied ? 'Copiato!' : 'Copia'}</span>
          </button>

          <button
            type="button"
            disabled={currentPage >= totalPages - 1}
            onClick={() => scrollToPage(currentPage + 1)}
            className="min-h-[42px] px-3 sm:px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 disabled:pointer-events-none border border-zinc-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95"
            aria-label="Pagina successiva"
          >
            <span className="hidden sm:inline">Successiva</span>
            <ChevronRight size={18} />
          </button>
        </div>
      </footer>

      {/* ===================== MODAL: SEGNALIBRI ===================== */}
      <BookmarksModal
        isOpen={showBookmarksModal}
        onClose={() => setShowBookmarksModal(false)}
        book={book}
        currentPage={currentPage}
        bookmarks={bookmarks}
        onSelectPage={(pageIdx) => scrollToPage(pageIdx)}
        onAddBookmark={(pageIdx, note) => handleAddBookmark(pageIdx, note)}
        onRemoveBookmark={(bmId) => handleRemoveBookmark(bmId)}
        onUpdateBookmarkNote={(bmId, note) => handleUpdateBookmarkNote(bmId, note)}
      />
    </div>
  );
};
