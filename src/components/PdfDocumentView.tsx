import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Book, TtsSettings } from '../types';
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
} from 'lucide-react';
import { fileParser } from '../services/fileParser';
import { VoraLogo } from './VoraLogo';

interface PdfDocumentViewProps {
  book: Book;
  settings?: TtsSettings;
  onBack: () => void;
  onSwitchToReader: (book: Book) => void;
  onPageChange?: (pageIndex: number) => void;
}

export const PdfDocumentView: React.FC<PdfDocumentViewProps> = ({
  book,
  onBack,
  onSwitchToReader,
  onPageChange,
}) => {
  const [currentPage, setCurrentPage] = useState<number>(book.currentPage || 0);
  const [zoomLevel, setZoomLevel] = useState<number>(100); // 75, 100, 125, 150
  const [viewMode, setViewMode] = useState<'continuous' | 'single'>('continuous');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);

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
    const q = searchQuery.toLowerCase();
    return sanitizedPages.reduce((acc, p) => {
      const matches = (p.toLowerCase().match(new RegExp(q, 'g')) || []).length;
      return acc + matches;
    }, 0);
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
        <mark key={i} className="bg-white text-black font-bold rounded-xs px-0.5">
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
      {/* ===================== PDF VIEWER HEADER TOOLBAR ===================== */}
      <header className="bg-black border-b border-zinc-800 px-3 py-2.5 flex items-center justify-between gap-2 shrink-0 z-20 shadow-md">
        {/* Left: Back button & Title */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onBack}
            aria-label="Torna indietro"
            className="w-10 h-10 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white transition-all shrink-0 active:scale-95"
            title="Torna indietro"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="min-w-0 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700 text-white flex items-center justify-center shrink-0">
              <FileText size={17} />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-bold text-white truncate max-w-[180px] sm:max-w-xs md:max-w-md">
                {book.title}
              </h2>
              <span className="text-[10px] text-zinc-400 font-semibold block truncate">
                Documento PDF · Pagina {currentPage + 1} di {totalPages}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Search toggle */}
        {showSearch && (
          <div className="hidden md:flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-1 min-w-[200px]">
            <Search size={14} className="text-zinc-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cerca nel PDF..."
              className="bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none w-full"
              autoFocus
            />
            {searchQuery && (
              <span className="text-[10px] text-white font-bold shrink-0">
                {searchMatchesCount} ris.
              </span>
            )}
            <button
              onClick={() => {
                setShowSearch(false);
                setSearchQuery('');
              }}
              className="text-gray-400 hover:text-white"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Switch directly to Reader / AI Voice */}
          <button
            type="button"
            onClick={() => onSwitchToReader(book)}
            className="bg-white hover:bg-zinc-200 text-black font-black text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-xs active:scale-95"
            title="Passa al lettore eBook con voce AI"
          >
            <BookOpen size={16} />
            <span className="hidden sm:inline">Leggi libro</span>
            <Volume2 size={13} className="hidden sm:inline text-black" />
          </button>

          {/* Search toggle (Mobile / Tablet) */}
          <button
            type="button"
            onClick={() => setShowSearch((prev) => !prev)}
            aria-label="Cerca testo nel PDF"
            className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all ${
              showSearch
                ? 'bg-white text-black border-white'
                : 'bg-black hover:bg-zinc-900 border-white/20 text-white'
            }`}
            title="Cerca nel testo"
          >
            <Search size={16} />
          </button>

          {/* Zoom Controls */}
          <div className="hidden sm:flex items-center bg-black border border-white/20 rounded-xl p-0.5">
            <button
              type="button"
              onClick={() => handleZoom(-15)}
              className="w-7 h-7 flex items-center justify-center text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg"
              title="Riduci zoom"
              aria-label="Riduci zoom"
            >
              <ZoomOut size={14} />
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              className="px-2 text-[11px] font-bold text-zinc-300 hover:text-white"
              title="Reimposta zoom 100%"
            >
              {zoomLevel}%
            </button>
            <button
              type="button"
              onClick={() => handleZoom(15)}
              className="w-7 h-7 flex items-center justify-center text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg"
              title="Aumenta zoom"
              aria-label="Aumenta zoom"
            >
              <ZoomIn size={14} />
            </button>
          </div>

          {/* Mode Toggle: Continuous vs Single page */}
          <button
            type="button"
            onClick={() => setViewMode((prev) => (prev === 'continuous' ? 'single' : 'continuous'))}
            className="w-9 h-9 rounded-xl bg-black hover:bg-zinc-900 border border-white/20 text-zinc-300 hover:text-white flex items-center justify-center transition-all"
            title={viewMode === 'continuous' ? 'Modalità: Scorrimento continuo (clicca per pagina singola)' : 'Modalità: Pagina singola (clicca per continuo)'}
            aria-label="Cambia visualizzazione pagine"
          >
            {viewMode === 'continuous' ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
          </button>

          {/* Print / Save as PDF */}
          <button
            type="button"
            onClick={handlePrintPdf}
            className="w-9 h-9 rounded-xl bg-black hover:bg-zinc-900 border border-white/20 text-zinc-300 hover:text-white flex items-center justify-center transition-all"
            title="Stampa o Salva documento in PDF"
            aria-label="Stampa o Salva PDF"
          >
            <Printer size={16} />
          </button>
        </div>
      </header>

      {/* Search Input Bar (when toggled on mobile) */}
      {showSearch && (
        <div className="md:hidden bg-zinc-950 border-b border-zinc-800 p-2.5 flex items-center gap-2 z-10 animate-fade-in">
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
                className="w-full bg-[#FCFCFD] text-[#1A1A1E] rounded-xl sm:rounded-2xl shadow-2xl border border-zinc-200/80 p-8 sm:p-14 min-h-[780px] sm:min-h-[960px] flex flex-col justify-between relative transition-shadow hover:shadow-black/60 print:shadow-none print:border-none print:p-8 print:m-0 print:break-after-page"
                style={{ aspectRatio: '1 / 1.414' }}
              >
                {/* PDF Header Watermark */}
                <div className="border-b border-zinc-200 pb-3 flex items-center justify-between text-[11px] font-semibold text-zinc-500 uppercase tracking-wider select-none">
                  <span className="truncate max-w-[280px]">
                    {book.title} {book.author ? `— ${book.author}` : ''}
                  </span>
                  <span className="shrink-0 text-black font-bold flex items-center gap-1">
                    <FileText size={12} />
                    Documento PDF
                  </span>
                </div>

                {/* PDF Page Body Content */}
                <div className="flex-1 py-4 sm:py-6 flex flex-col justify-center items-center font-serif leading-relaxed text-zinc-900 text-sm sm:text-base select-text">
                  {book.imageUrls && book.imageUrls[index] ? (
                    <div className="w-full flex flex-col items-center gap-3">
                      <img
                        src={book.imageUrls[index]}
                        alt={`Scansione pagina ${index + 1}`}
                        className="max-h-[640px] sm:max-h-[760px] w-auto max-w-full object-contain rounded-lg shadow-sm border border-zinc-200 select-none pointer-events-none"
                      />
                      {pageText && pageText.trim() && !pageText.startsWith('[Pagina') && (
                        <div className="w-full mt-3 p-3 bg-zinc-50 rounded-lg border border-zinc-200 text-xs text-zinc-700 whitespace-pre-wrap select-text">
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
                <div className="border-t border-zinc-200 pt-3 flex items-center justify-between text-[11px] font-medium text-zinc-400 select-none">
                  <span>Vora Document Reader</span>
                  <span className="font-bold text-zinc-600">
                    — Pagina {index + 1} di {totalPages} —
                  </span>
                  <span>{book.file_type.toUpperCase()}</span>
                </div>
              </div>
            ))
          ) : (
            /* Single Page View */
            <div
              className="w-full bg-[#FCFCFD] text-[#1A1A1E] rounded-xl sm:rounded-2xl shadow-2xl border border-zinc-200/80 p-8 sm:p-14 min-h-[780px] sm:min-h-[960px] flex flex-col justify-between relative select-text"
              style={{ aspectRatio: '1 / 1.414' }}
            >
              {/* PDF Header Watermark */}
              <div className="border-b border-zinc-200 pb-3 flex items-center justify-between text-[11px] font-semibold text-zinc-500 uppercase tracking-wider select-none">
                <span className="truncate max-w-[280px]">
                  {book.title} {book.author ? `— ${book.author}` : ''}
                </span>
                <span className="shrink-0 text-zinc-400 font-bold flex items-center gap-1">
                  <FileText size={12} />
                  Documento PDF
                </span>
              </div>

              {/* PDF Page Body Content */}
              <div className="flex-1 py-4 sm:py-6 flex flex-col justify-center items-center font-serif leading-relaxed text-zinc-900 text-sm sm:text-base select-text">
                {book.imageUrls && book.imageUrls[currentPage] ? (
                  <div className="w-full flex flex-col items-center gap-3">
                    <img
                      src={book.imageUrls[currentPage]}
                      alt={`Scansione pagina ${currentPage + 1}`}
                      className="max-h-[640px] sm:max-h-[760px] w-auto max-w-full object-contain rounded-lg shadow-sm border border-zinc-200 select-none pointer-events-none"
                    />
                    {sanitizedPages[currentPage] && sanitizedPages[currentPage].trim() && !sanitizedPages[currentPage].startsWith('[Pagina') && (
                      <div className="w-full mt-3 p-3 bg-zinc-50 rounded-lg border border-zinc-200 text-xs text-zinc-700 whitespace-pre-wrap select-text">
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
              <div className="border-t border-zinc-200 pt-3 flex items-center justify-between text-[11px] font-medium text-zinc-400 select-none">
                <span>Vora Document Reader</span>
                <span className="font-bold text-zinc-600">
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
    </div>
  );
};
