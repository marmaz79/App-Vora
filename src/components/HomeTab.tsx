import React, { useState } from 'react';
import { Book, ScanSessionData } from '../types';
import { BookCard } from './BookCard';
import { UploadModal } from './UploadModal';
import { ScanModal } from './ScanModal';
import { GoogleDriveModal } from './GoogleDriveModal';
import { PasteAudioModal } from './PasteAudioModal';
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
  AlertCircle,
  Loader2,
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
  const [isPasteAudioOpen, setIsPasteAudioOpen] = useState(false);
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const [activeTabFilter, setActiveTabFilter] = useState<'recenti' | 'stella' | 'dispositivo'>('recenti');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const handleDriveFileDownloaded = async (file: File) => {
    try {
      setImportStatus(`Importazione di "${file.name}" nella libreria in corso...`);
      setImportError(null);

      const title = file.name.replace(/\.[^/.]+$/, '').trim() || 'Documento Google Drive';
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      const file_type: 'pdf' | 'epub' | 'txt' | 'scan' =
        ext === 'pdf' ? 'pdf' : ext === 'epub' ? 'epub' : 'txt';

      let parsed: any = null;
      try {
        parsed = await fileParser.parseFile(file);
      } catch (parseErr) {
        console.warn('fileParser.parseFile in HomeTab error:', parseErr);
      }

      let pages: string[] = [];
      if (parsed?.pages && Array.isArray(parsed.pages) && parsed.pages.length > 0) {
        pages = parsed.pages.filter((p: string) => typeof p === 'string' && p.trim().length > 0);
      }

      if (pages.length === 0) {
        try {
          const directText = await file.text();
          if (directText && directText.trim().length > 0) {
            pages = fileParser.splitIntoPages(directText);
          }
        } catch {
          // ignore
        }
      }

      if (pages.length === 0) {
        pages = [
          `Documento Google Drive: ${file.name}\n\nFile importato con successo dal tuo account Google Drive. Pronto per la lettura visiva e l'ascolto con sintesi vocale naturale.`
        ];
      }

      const newBook: Book = {
        book_id: `drive-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        owner_id: 'user-default-1',
        title: parsed?.title?.trim() || title,
        author: parsed?.author?.trim() || 'Google Drive',
        file_type: (parsed?.file_type as any) || file_type || 'pdf',
        size: file.size || parsed?.size || 1024,
        pages,
        source: 'upload',
        created_at: new Date().toISOString(),
        coverColor: '#FFFFFF',
        currentPage: 0,
        ocr_engine: parsed?.ocr_engine,
      };

      // Aggiunge direttamente il libro alla libreria e aggiorna lo stato visibile
      onAddBook(newBook);
      setImportStatus(null);
    } catch (err: any) {
      console.error('Error importing from Drive in HomeTab:', err);
      setImportError(err?.message || 'Errore durante l\'importazione del file da Google Drive');
      setImportStatus(null);
      throw err;
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
      {/* Import status toast */}
      {importStatus && (
        <div className="mb-2 mx-2 p-3 rounded-xl bg-black border border-white flex items-center gap-2.5 text-xs font-bold text-white shadow-lg animate-pulse">
          <Loader2 size={16} className="animate-spin shrink-0 text-white" />
          <span>{importStatus}</span>
        </div>
      )}
      {importError && (
        <div className="mb-2 mx-2 p-3 rounded-xl bg-black border border-white/50 flex items-center justify-between gap-2.5 text-xs font-semibold text-white shadow-lg">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle size={16} className="shrink-0 text-white" />
            <span className="truncate">{importError}</span>
          </div>
          <button
            onClick={() => setImportError(null)}
            className="text-zinc-400 hover:text-white shrink-0 p-1"
          >
            <X size={14} />
          </button>
        </div>
      )}
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

        {/* Tre puntini verticali per opzioni ed elenco in bianco */}
        <div className="relative">
          <button
            onClick={() => setShowSortMenu((prev) => !prev)}
            aria-label="Opzioni visualizzazione elenco"
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors text-white hover:bg-zinc-800 active:scale-95 ${
              showSortMenu ? 'bg-zinc-800' : ''
            }`}
          >
            <MoreVertical size={18} className="text-white" />
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

      {/* 5. FLOATING ACTION BUTTON (FAB) - Sfondo trasparente con bordo bianco */}
      {!hideFab && (
        <button
          onClick={() => setIsQuickActionsOpen((prev) => !prev)}
          aria-label={isQuickActionsOpen ? "Chiudi menu azioni" : "Apri tutte le azioni rapide"}
          aria-expanded={isQuickActionsOpen}
          className={`fixed bottom-24 right-5 z-40 w-14 h-14 rounded-full bg-black/50 backdrop-blur-md hover:bg-white/15 active:scale-95 text-white flex items-center justify-center shadow-2xl transition-all duration-300 border-2 border-white ${
            isQuickActionsOpen ? 'rotate-45 z-50' : ''
          }`}
          title={isQuickActionsOpen ? "Chiudi" : "Tutte le azioni rapide"}
        >
          <Plus size={28} strokeWidth={2.6} className="text-white transition-transform duration-300" />
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
                className="w-9 h-9 rounded-xl bg-transparent text-white border border-white flex items-center justify-center hover:bg-white/15 transition-colors"
                aria-label="Chiudi azioni"
              >
                <X size={18} />
              </button>
            </div>

            {/* Griglia delle azioni rapide come icone con sfondo trasparente e bordi bianchi */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5 py-1">
              {/* Voce 1: Carica File */}
              <button
                type="button"
                onClick={() => {
                  setIsQuickActionsOpen(false);
                  setIsUploadOpen(true);
                }}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-transparent hover:bg-white/10 border border-white transition-all active:scale-95 group text-center focus:outline-none"
              >
                <div className="relative w-14 h-14 rounded-2xl bg-transparent border border-white text-white flex items-center justify-center shadow-md mb-2 group-hover:scale-105 transition-transform">
                  <Upload size={24} />
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-white text-black font-black flex items-center justify-center text-[9px] shadow-xs">
                    👑
                  </span>
                </div>
                <span className="text-xs font-bold text-white leading-tight">
                  Carica file
                </span>
                <span className="text-[10px] text-zinc-400 mt-1 leading-none">
                  PDF / Libri
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
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-transparent hover:bg-white/10 border border-white transition-all active:scale-95 group text-center focus:outline-none"
              >
                <div className="relative w-14 h-14 rounded-2xl bg-transparent border border-white text-white flex items-center justify-center shadow-md mb-2 group-hover:scale-105 transition-transform">
                  <Camera size={24} />
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-white text-black font-black flex items-center justify-center text-[9px] shadow-xs">
                    👑
                  </span>
                </div>
                <span className="text-xs font-bold text-white leading-tight">
                  Scansiona OCR
                </span>
                <span className="text-[10px] text-zinc-400 mt-1 leading-none">
                  Fotocamera
                </span>
              </button>

              {/* Voce 3: Crea con AI */}
              <button
                type="button"
                onClick={() => {
                  setIsQuickActionsOpen(false);
                  setIsScanOpen(true);
                }}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-transparent hover:bg-white/10 border border-white transition-all active:scale-95 group text-center focus:outline-none"
              >
                <div className="relative w-14 h-14 rounded-2xl bg-transparent border border-white text-white flex items-center justify-center shadow-md mb-2 group-hover:scale-105 transition-transform">
                  <FileText size={24} />
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-white text-black font-black flex items-center justify-center text-[9px] shadow-xs">
                    👑
                  </span>
                </div>
                <span className="text-xs font-bold text-white leading-tight">
                  Crea con AI
                </span>
                <span className="text-[10px] text-zinc-400 mt-1 leading-none">
                  Genera testo
                </span>
              </button>

              {/* Voce 4: Ascolta audio */}
              <button
                type="button"
                onClick={() => {
                  setIsQuickActionsOpen(false);
                  setIsPasteAudioOpen(true);
                }}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-transparent hover:bg-white/10 border border-white transition-all active:scale-95 group text-center focus:outline-none"
              >
                <div className="relative w-14 h-14 rounded-2xl bg-transparent border border-white text-white flex items-center justify-center shadow-md mb-2 group-hover:scale-105 transition-transform">
                  <Volume2 size={24} />
                </div>
                <span className="text-xs font-bold text-white leading-tight">
                  Ascolta audio
                </span>
                <span className="text-[10px] text-zinc-400 mt-1 leading-none">
                  Incolla testo
                </span>
              </button>

              {/* Voce 5: Combina file */}
              <button
                type="button"
                onClick={() => {
                  setIsQuickActionsOpen(false);
                  setIsUploadOpen(true);
                }}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-transparent hover:bg-white/10 border border-white transition-all active:scale-95 group text-center focus:outline-none"
              >
                <div className="relative w-14 h-14 rounded-2xl bg-transparent border border-white text-white flex items-center justify-center shadow-md mb-2 group-hover:scale-105 transition-transform">
                  <Layers size={24} />
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-white text-black font-black flex items-center justify-center text-[9px] shadow-xs">
                    👑
                  </span>
                </div>
                <span className="text-xs font-bold text-white leading-tight">
                  Combina file
                </span>
                <span className="text-[10px] text-zinc-400 mt-1 leading-none">
                  Unisci pagine
                </span>
              </button>

              {/* Voce 6: Google Drive */}
              <button
                type="button"
                onClick={() => {
                  setIsQuickActionsOpen(false);
                  setIsDriveOpen(true);
                }}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-transparent hover:bg-white/10 border border-white transition-all active:scale-95 group text-center focus:outline-none"
              >
                <div className="relative w-14 h-14 rounded-2xl bg-transparent border border-white text-white flex items-center justify-center shadow-md mb-2 group-hover:scale-105 transition-transform">
                  <svg className="w-6 h-6 text-white" viewBox="0 0 87.3 78" fill="none">
                    <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5z" fill="#FFFFFF"/>
                    <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#FFFFFF"/>
                    <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.5l5.85 10.15z" fill="#FFFFFF"/>
                    <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#FFFFFF"/>
                    <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#FFFFFF"/>
                    <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#FFFFFF"/>
                  </svg>
                  <span className="absolute -top-1.5 -right-1.5 px-1 py-0.2 rounded-full bg-white text-black font-extrabold text-[8px] uppercase">
                    ☁
                  </span>
                </div>
                <span className="text-xs font-bold text-white leading-tight">
                  Google Drive
                </span>
                <span className="text-[10px] text-zinc-400 mt-1 leading-none">
                  Cloud storage
                </span>
              </button>
            </div>

            {/* Pulsante Chiudi con sfondo trasparente e bordo bianco */}
            <button
              type="button"
              onClick={() => setIsQuickActionsOpen(false)}
              className="w-full py-3 rounded-2xl bg-transparent border border-white hover:bg-white/15 text-white font-bold text-xs transition-colors active:scale-98 mt-1"
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
      <PasteAudioModal
        isOpen={isPasteAudioOpen}
        onClose={() => setIsPasteAudioOpen(false)}
        onOpenReader={(book) => {
          if (onOpenReader) {
            onOpenReader(book);
          } else if (onOpenBook) {
            onOpenBook(book);
          }
        }}
        onAddBook={onAddBook}
        existingBooks={books}
      />
    </div>
  );
};
