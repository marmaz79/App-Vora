import React, { useState } from 'react';
import { Book, ScanSessionData } from '../types';
import { BookCard } from './BookCard';
import { UploadModal } from './UploadModal';
import { ScanModal } from './ScanModal';
import { GoogleDriveModal } from './GoogleDriveModal';
import { fileParser } from '../services/fileParser';
import { pdfOcrService } from '../services/pdfOcrService';
import {
  Upload,
  Camera,
  Shield,
  FileText,
  Plus,
  Layers,
  Volume2,
  Crown,
  MoreVertical,
  Check,
  X,
  Sparkles,
  Clock,
  Star,
  Smartphone,
} from 'lucide-react';

interface HomeTabProps {
  books?: Book[];
  searchQuery?: string;
  userName?: string;
  onOpenBook?: (book: Book) => void;
  onDeleteBook?: (bookId: string) => void;
  onAddBook: (book: Book) => void;
  onScanResultsReady?: (session: ScanSessionData) => void;
  hideFab?: boolean;
  onOpenPdf?: (book: Book) => void;
  onOpenReader?: (book: Book) => void;
  onOpenScan?: () => void;
}

export const HomeTab: React.FC<HomeTabProps> = ({
  books = [],
  searchQuery = '',
  userName = 'mariano',
  onOpenBook,
  onDeleteBook,
  onAddBook,
  onScanResultsReady,
  hideFab = false,
  onOpenPdf,
  onOpenReader,
  onOpenScan,
}) => {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isScanOpen, setIsScanOpen] = useState(false);
  const [isDriveOpen, setIsDriveOpen] = useState(false);
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const [activeTabFilter, setActiveTabFilter] = useState<'recenti' | 'stella' | 'dispositivo'>('recenti');
  const [showSortMenu, setShowSortMenu] = useState(false);

  const handleDriveFileDownloaded = async (file: File) => {
    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'pdf') {
        const inspection = await pdfOcrService.inspectPdf(file);
        if (inspection.isScanned && onScanResultsReady) {
          const scanSession = await pdfOcrService.convertScannedPdf(file, {
            engine: 'ai-vision',
            language: 'ita',
            autoOptimizeAi: true,
          });
          onScanResultsReady(scanSession);
          return;
        }
      }
      const parsed = await fileParser.parseFile(file);
      const newBook: Book = {
        ...parsed,
        book_id: `book-${Date.now()}`,
        owner_id: 'user-default-1',
        created_at: new Date().toISOString(),
        coverColor: '#FFFFFF',
        currentPage: 0,
      };
      onAddBook(newBook);
    } catch (err: any) {
      console.error('Error importing from Drive in HomeTab:', err);
    }
  };

  // Filter and deduplicate books based on search query and active tab
  const filteredBooks = React.useMemo(() => {
    const seen = new Set<string>();
    return books.filter((b) => {
      if (!b || !b.book_id || seen.has(b.book_id)) return false;
      seen.add(b.book_id);

      const matchesQuery =
        !searchQuery.trim() ||
        b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.author && b.author.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesQuery) return false;

      if (activeTabFilter === 'stella') {
        return (b.size || 0) > 100000 || b.title.toLowerCase().includes('rep') || b.file_type === 'scan';
      }

      return true;
    });
  }, [books, searchQuery, activeTabFilter]);

  return (
    <div className="flex flex-col text-white select-none animate-fade-in pb-28">
      {/* 1. HERO GREETING (Stile Adobe Acrobat) */}
      <div className="pt-2 pb-1.5 px-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Benvenuto, {userName}
        </h1>
      </div>

      {/* 2. TABS BAR (Recenti, Con stella, Sul dispositivo + menu ⋮) */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-2 pt-2 pb-1 relative">
        <div className="flex items-center gap-6 text-sm font-bold">
          {/* Tab Recenti */}
          <button
            onClick={() => setActiveTabFilter('recenti')}
            className={`pb-2.5 relative transition-colors ${
              activeTabFilter === 'recenti'
                ? 'text-white'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <span>Recenti</span>
            {activeTabFilter === 'recenti' && (
              <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-white rounded-full" />
            )}
          </button>

          {/* Tab Con stella */}
          <button
            onClick={() => setActiveTabFilter('stella')}
            className={`pb-2.5 relative transition-colors ${
              activeTabFilter === 'stella'
                ? 'text-white'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <span>Con stella</span>
            {activeTabFilter === 'stella' && (
              <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-white rounded-full" />
            )}
          </button>

          {/* Tab Sul dispositivo */}
          <button
            onClick={() => setActiveTabFilter('dispositivo')}
            className={`pb-2.5 relative transition-colors ${
              activeTabFilter === 'dispositivo'
                ? 'text-white'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <span>Sul dispositivo</span>
            {activeTabFilter === 'dispositivo' && (
              <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-white rounded-full" />
            )}
          </button>
        </div>

        {/* Tre puntini verticali per opzioni ed elenco */}
        <div className="relative">
          <button
            onClick={() => setShowSortMenu((prev) => !prev)}
            aria-label="Opzioni visualizzazione elenco"
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
              showSortMenu
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800 active:scale-95'
            }`}
          >
            <MoreVertical size={18} />
          </button>

          {showSortMenu && (
            <>
              {/* Backdrop to close on click outside */}
              <div
                className="fixed inset-0 z-20"
                onClick={() => setShowSortMenu(false)}
              />

              <div className="absolute right-0 top-11 bg-black border border-white/20 rounded-2xl p-2 z-30 shadow-2xl flex flex-col gap-1 min-w-[210px] animate-fade-in select-none">
                <div className="px-2.5 py-1.5 border-b border-zinc-800 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white">
                    Opzioni visualizzazione
                  </span>
                </div>

                <button
                  onClick={() => {
                    setActiveTabFilter('recenti');
                    setShowSortMenu(false);
                  }}
                  className="flex items-center justify-between w-full px-3 py-2.5 text-left text-xs font-bold text-white hover:bg-zinc-900 rounded-xl transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <Clock size={15} className="text-white" />
                    <span className="text-white">Ordina per data recente</span>
                  </div>
                  {activeTabFilter === 'recenti' && (
                    <Check size={14} className="text-white" />
                  )}
                </button>

                <button
                  onClick={() => {
                    setActiveTabFilter('stella');
                    setShowSortMenu(false);
                  }}
                  className="flex items-center justify-between w-full px-3 py-2.5 text-left text-xs font-bold text-white hover:bg-zinc-900 rounded-xl transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <Star size={15} className="text-white" />
                    <span className="text-white">Mostra solo con stella</span>
                  </div>
                  {activeTabFilter === 'stella' && (
                    <Check size={14} className="text-white" />
                  )}
                </button>

                <button
                  onClick={() => {
                    setActiveTabFilter('dispositivo');
                    setShowSortMenu(false);
                  }}
                  className="flex items-center justify-between w-full px-3 py-2.5 text-left text-xs font-bold text-white hover:bg-zinc-900 rounded-xl transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <Smartphone size={15} className="text-white" />
                    <span className="text-white">Sul dispositivo</span>
                  </div>
                  {activeTabFilter === 'dispositivo' && (
                    <Check size={14} className="text-white" />
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 4. DOCUMENT LIST (Stile Adobe Acrobat) */}
      <div className="flex flex-col divide-y divide-zinc-800 mt-1">
        {filteredBooks.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-2 text-gray-400">
            <FileText size={38} className="text-zinc-600 mb-2" />
            <p className="text-sm font-bold text-white">Nessun file trovato</p>
          </div>
        ) : (
          filteredBooks.map((book) => (
            <BookCard
              key={book.book_id}
              book={book}
              onOpen={onOpenBook ? onOpenBook : () => {}}
              onDelete={onDeleteBook ? onDeleteBook : () => {}}
              onOpenPdf={onOpenPdf}
              onOpenReader={onOpenReader}
            />
          ))
        )}
      </div>

      {/* 5. FLOATING ACTION BUTTON (FAB) - Stile Bianco su Nero con + */}
      {!hideFab && (
        <button
          onClick={() => setIsQuickActionsOpen((prev) => !prev)}
          aria-label={isQuickActionsOpen ? "Chiudi menu azioni" : "Apri tutte le azioni rapide"}
          aria-expanded={isQuickActionsOpen}
          className={`fixed bottom-24 right-5 z-40 w-14 h-14 rounded-full bg-white hover:bg-zinc-200 active:scale-95 text-black flex items-center justify-center shadow-2xl transition-all duration-300 border-2 border-white ${
            isQuickActionsOpen ? 'rotate-45 bg-white text-black z-50' : ''
          }`}
          title={isQuickActionsOpen ? "Chiudi" : "Tutte le azioni rapide (Voci sotto Benvenuto)"}
        >
          <Plus size={28} strokeWidth={2.6} className="transition-transform duration-300" />
        </button>
      )}

      {/* ===================== MODALE AZIONI RAPIDE (TUTTE LE VOCI SOTTO BENVENUTO) ===================== */}
      {isQuickActionsOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="quick-actions-title"
          className="fixed inset-0 z-40 bg-black/85 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 sm:p-4 animate-fade-in"
          onClick={() => setIsQuickActionsOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-black border border-zinc-800 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl flex flex-col gap-4 text-white mb-20 sm:mb-0 max-h-[85vh] overflow-y-auto"
          >
            {/* Header del modale Azioni Rapide */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-zinc-900 border border-white flex items-center justify-center shrink-0">
                  <Sparkles size={22} className="text-white" />
                </div>
                <div>
                  <h3 id="quick-actions-title" className="text-lg font-black text-white leading-snug">
                    Cosa vorresti fare?
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setIsQuickActionsOpen(false)}
                className="w-9 h-9 rounded-xl bg-zinc-900 text-gray-300 border border-zinc-800 flex items-center justify-center hover:bg-zinc-800 hover:text-white transition-colors"
                aria-label="Chiudi azioni"
              >
                <X size={18} />
              </button>
            </div>

            {/* Griglia di tutte le voci presenti sotto Benvenuto */}
            <div className="flex flex-col gap-2.5">
              {/* Voce 1: Carica File */}
              <button
                type="button"
                onClick={() => {
                  setIsQuickActionsOpen(false);
                  setIsUploadOpen(true);
                }}
                className="bg-black hover:bg-zinc-900 border border-zinc-800 hover:border-white rounded-2xl p-3.5 flex items-center justify-between text-left transition-all active:scale-[0.98] group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-zinc-900 border border-zinc-700 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                    <Upload size={22} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white transition-colors">
                        Carica file
                      </span>
                      <span className="w-4 h-4 rounded-full bg-white text-black font-black flex items-center justify-center text-[9px] shadow-xs">
                        👑
                      </span>
                    </div>
                  </div>
                </div>
                <span className="text-xs font-bold text-white shrink-0 ml-2">
                  Apri →
                </span>
              </button>

              {/* Voce 2: Scansiona OCR */}
              <button
                type="button"
                onClick={() => {
                  setIsQuickActionsOpen(false);
                  if (onOpenScan) {
                    onOpenScan();
                  } else {
                    setIsScanOpen(true);
                  }
                }}
                className="bg-black hover:bg-zinc-900 border border-zinc-800 hover:border-white rounded-2xl p-3.5 flex items-center justify-between text-left transition-all active:scale-[0.98] group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-zinc-900 border border-zinc-700 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                    <Camera size={22} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white transition-colors">
                        Scansiona OCR
                      </span>
                      <span className="w-4 h-4 rounded-full bg-white text-black font-black flex items-center justify-center text-[9px] shadow-xs">
                        👑
                      </span>
                    </div>
                  </div>
                </div>
                <span className="text-xs font-bold text-white shrink-0 ml-2">
                  Scansiona →
                </span>
              </button>

              {/* Voce 3: Crea con AI */}
              <button
                type="button"
                onClick={() => {
                  setIsQuickActionsOpen(false);
                  setIsScanOpen(true);
                }}
                className="bg-black hover:bg-zinc-900 border border-zinc-800 hover:border-white rounded-2xl p-3.5 flex items-center justify-between text-left transition-all active:scale-[0.98] group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-zinc-900 border border-zinc-700 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                    <FileText size={22} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white transition-colors">
                        Crea con AI
                      </span>
                      <span className="w-4 h-4 rounded-full bg-white text-black font-black flex items-center justify-center text-[9px] shadow-xs">
                        👑
                      </span>
                    </div>
                  </div>
                </div>
                <span className="text-xs font-bold text-white shrink-0 ml-2">
                  Crea →
                </span>
              </button>

              {/* Voce 4: Ascolta audio */}
              <button
                type="button"
                onClick={() => {
                  setIsQuickActionsOpen(false);
                  if (books.length > 0 && onOpenBook) {
                    onOpenBook(books[0]);
                  }
                }}
                className="bg-black hover:bg-zinc-900 border border-zinc-800 hover:border-white rounded-2xl p-3.5 flex items-center justify-between text-left transition-all active:scale-[0.98] group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-zinc-900 border border-zinc-700 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                    <Volume2 size={22} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white transition-colors">
                        Ascolta audio
                      </span>
                    </div>
                  </div>
                </div>
                <span className="text-xs font-bold text-white shrink-0 ml-2">
                  Ascolta →
                </span>
              </button>

              {/* Voce 5: Combina file */}
              <button
                type="button"
                onClick={() => {
                  setIsQuickActionsOpen(false);
                  setIsUploadOpen(true);
                }}
                className="bg-black hover:bg-zinc-900 border border-zinc-800 hover:border-white rounded-2xl p-3.5 flex items-center justify-between text-left transition-all active:scale-[0.98] group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-zinc-900 border border-zinc-700 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                    <Layers size={22} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white transition-colors">
                        Combina file
                      </span>
                      <span className="w-4 h-4 rounded-full bg-white text-black font-black flex items-center justify-center text-[9px] shadow-xs">
                        👑
                      </span>
                    </div>
                  </div>
                </div>
                <span className="text-xs font-bold text-white shrink-0 ml-2">
                  Combina →
                </span>
              </button>

              {/* Voce 6: Google Drive */}
              <button
                type="button"
                onClick={() => {
                  setIsQuickActionsOpen(false);
                  setIsDriveOpen(true);
                }}
                className="bg-black hover:bg-zinc-900 border border-zinc-800 hover:border-white rounded-2xl p-3.5 flex items-center justify-between text-left transition-all active:scale-[0.98] group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-zinc-900 border border-zinc-700 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                    <svg className="w-6 h-6 text-white" viewBox="0 0 87.3 78" fill="none">
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
                      <span className="text-sm font-bold text-white transition-colors">
                        Google Drive
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-white/30 text-white font-extrabold text-[9px] uppercase">
                        Cloud
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 truncate">
                      Sfoglia e carica file PDF e libri da Drive
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold text-white shrink-0 ml-2">
                  Sfoglia →
                </span>
              </button>
            </div>

            {/* Pulsante Chiudi */}
            <button
              type="button"
              onClick={() => setIsQuickActionsOpen(false)}
              className="w-full py-3 rounded-2xl bg-white hover:bg-zinc-200 text-black font-black text-xs transition-colors active:scale-98 mt-1"
            >
              Chiudi
            </button>
          </div>
        </div>
      )}

      {/* Modali */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onBookAdded={onAddBook}
        onScanResultsReady={onScanResultsReady}
      />
      <ScanModal
        isOpen={isScanOpen}
        initialOpenLiveCamera={true}
        onClose={() => setIsScanOpen(false)}
        onBookAdded={onAddBook}
        onScanResultsReady={onScanResultsReady}
      />
      <GoogleDriveModal
        isOpen={isDriveOpen}
        onClose={() => setIsDriveOpen(false)}
        onFileDownloaded={handleDriveFileDownloaded}
      />
    </div>
  );
};
