import React, { useState } from 'react';
import { Book, ScanSessionData } from '../types';
import { BookCard } from './BookCard';
import { UploadModal, UploadModalMode } from './UploadModal';
import { ScanModal } from './ScanModal';
import { GoogleDriveModal } from './GoogleDriveModal';
import { PasteAudioModal } from './PasteAudioModal';
import { fileParser } from '../services/fileParser';
import {
  Upload,
  Camera,
  FileText,
  Plus,
  Layers,
  Volume2,
  X,
  Sparkles,
  AlertCircle,
  Loader2,
  Headphones,
  Compass,
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
  onOpenPdf?: (book: Book, nightMode?: boolean) => void;
  onOpenReader?: (book: Book) => void;
  onOpenScan?: () => void;
  onOpenStats?: () => void;
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
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadInitialMode, setUploadInitialMode] = useState<UploadModalMode>('all');
  const [isScanOpen, setIsScanOpen] = useState(false);
  const [isDriveOpen, setIsDriveOpen] = useState(false);
  const [isPasteAudioOpen, setIsPasteAudioOpen] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const handleDriveFileImport = async (file: File, title: string, file_type: string) => {
    try {
      setImportStatus(`Importazione in corso: ${title}...`);
      setImportError(null);

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
        coverColor: '#2BA8A2',
        currentPage: 0,
        ocr_engine: parsed?.ocr_engine,
      };

      onAddBook(newBook);
      setImportStatus(null);
    } catch (err: any) {
      console.error('Error importing from Drive in HomeTab:', err);
      setImportError(err?.message || 'Errore durante l\'importazione del file da Google Drive');
      setImportStatus(null);
      throw err;
    }
  };

  // Filter and deduplicate books based on search query
  const filteredBooks = React.useMemo(() => {
    const seen = new Set<string>();
    return books.filter((b) => {
      if (!b || !b.book_id || seen.has(b.book_id)) return false;
      seen.add(b.book_id);

      const matchesQuery =
        !searchQuery.trim() ||
        b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.author && b.author.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesQuery;
    });
  }, [books, searchQuery]);

  return (
    <div className="flex flex-col text-slate-800 select-none animate-fade-in pb-28">
      {/* Import status toast */}
      {importStatus && (
        <div className="mb-3 mx-1 p-3.5 rounded-2xl bg-[#FFD23F] border-2 border-[#E6B800] flex items-center gap-2.5 text-xs font-black text-[#1E8C86] shadow-accent-glow animate-pulse">
          <Loader2 size={18} className="animate-spin shrink-0 text-[#1E8C86]" />
          <span>{importStatus}</span>
        </div>
      )}
      {importError && (
        <div className="mb-3 mx-1 p-3.5 rounded-2xl bg-[#FFF8E7] border-2 border-[#EF6C4A] flex items-center justify-between gap-2.5 text-xs font-bold text-[#D45233] shadow-coral-glow">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle size={18} className="shrink-0 text-[#EF6C4A]" />
            <span className="truncate">{importError}</span>
          </div>
          <button
            onClick={() => setImportError(null)}
            className="text-[#EF6C4A] hover:text-[#D45233] shrink-0 p-1"
          >
            <X size={15} strokeWidth={2.5} />
          </button>
        </div>
      )}

      {/* MESSAGGIO DI BENVENUTO CENTRATO CON MARGINI AUMENTATI */}
      <div className="py-6 px-4 mt-2 mb-6 flex flex-col items-center justify-center text-center border-b-2 border-dashed border-[#2BA8A2]/30 dark:border-[#2BA8A2]/50 bg-white/40 dark:bg-[#162322]/80 rounded-3xl backdrop-blur-xs">
        <h1 className="text-3xl sm:text-4xl font-black text-[#1E8C86] dark:text-[#3CC4BD] tracking-tight flex items-center justify-center gap-2">
          <span>Ciao, {userName}!</span>
          <span className="inline-block animate-bounce text-2xl">👋</span>
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-300 font-bold mt-1.5 max-w-sm">
          Bentornato nella tua libreria vocale
        </p>
      </div>

      {/* ELENCO DEI LIBRI */}
      <div className="flex flex-col gap-2.5">
        {filteredBooks.length === 0 ? (
          <div className="p-10 text-center flex flex-col items-center justify-center gap-2 bg-white dark:bg-[#162322] rounded-3xl border-2 border-dashed border-[#2BA8A2]/30 shadow-card my-2 text-slate-900 dark:text-white">
            <div className="w-14 h-14 rounded-2xl bg-[#E8F6F5] dark:bg-[#1E3634] border-2 border-[#2BA8A2]/30 text-[#1E8C86] dark:text-[#3CC4BD] flex items-center justify-center mb-1">
              <FileText size={28} />
            </div>
            <p className="text-base font-black text-slate-900 dark:text-white">Nessun file trovato</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs font-medium">
              Carica un libro PDF o scansiona una pagina con la fotocamera per iniziare a leggere.
            </p>
            <button
              onClick={() => {
                setUploadInitialMode('all');
                setIsUploadOpen(true);
              }}
              className="mt-2 px-5 py-2 rounded-full bg-gradient-to-r from-[#FFD23F] to-[#FFE47A] text-[#1E8C86] font-black text-xs shadow-accent-glow active:scale-95 transition-all"
            >
              Carica ora
            </button>
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

      {/* 5. FLOATING ACTION BUTTON (FAB) - Flip7 Gold CTA with Glow */}
      {!hideFab && (
        <button
          onClick={() => setIsQuickActionsOpen((prev) => !prev)}
          aria-label={isQuickActionsOpen ? "Chiudi menu azioni" : "Apri tutte le azioni rapide"}
          aria-expanded={isQuickActionsOpen}
          className={`fixed bottom-24 right-5 z-40 w-14 h-14 rounded-full bg-gradient-to-r from-[#FFD23F] to-[#FFE47A] text-[#1E8C86] flex items-center justify-center shadow-accent-glow border-2 border-[#E6B800] active:scale-95 transition-all duration-300 ${
            isQuickActionsOpen ? 'rotate-45 z-50 bg-[#EF6C4A] text-white border-white shadow-coral-glow' : ''
          }`}
          title={isQuickActionsOpen ? "Chiudi" : "Tutte le azioni rapide"}
        >
          <Plus size={28} strokeWidth={3} className="transition-transform duration-300" />
        </button>
      )}

      {/* ===================== MODALE AZIONI RAPIDE (FLIP7 RETRO-PLAYFUL STYLE) ===================== */}
      {isQuickActionsOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="quick-actions-title"
          className="fixed inset-0 z-40 bg-[#1E8C86]/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 sm:p-4 animate-fade-in"
          onClick={() => setIsQuickActionsOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border-2 border-[#2BA8A2]/30 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl flex flex-col gap-4 text-slate-900 mb-20 sm:mb-0 max-h-[85vh] overflow-y-auto animate-slide-up"
          >
            {/* Header del modale Azioni Rapide */}
            <div className="flex items-center justify-between border-b-2 border-dashed border-[#2BA8A2]/20 pb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#E8F6F5] border border-[#2BA8A2]/40 text-[#1E8C86] flex items-center justify-center shrink-0 shadow-xs">
                  <Sparkles size={22} className="text-[#FFD23F] fill-[#FFD23F]" />
                </div>
                <div>
                  <h3 id="quick-actions-title" className="text-lg font-black text-slate-900 leading-snug">
                    Cosa vorresti fare?
                  </h3>
                  <span className="text-xs text-slate-500 font-semibold">
                    Scegli una delle azioni rapide
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsQuickActionsOpen(false)}
                className="w-9 h-9 rounded-full bg-[#EFF8F7] text-slate-600 hover:bg-[#EF6C4A] hover:text-white flex items-center justify-center transition-colors active:scale-95 shadow-xs"
                aria-label="Chiudi azioni"
              >
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>

            {/* Griglia delle azioni rapide Flip7 con glow e bordi sinistri */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5 py-1">
              {/* Voce 1: Carica File */}
              <button
                type="button"
                onClick={() => {
                  setIsQuickActionsOpen(false);
                  setUploadInitialMode('all');
                  setIsUploadOpen(true);
                }}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-gradient-to-b from-[#FFF8E7] to-[#FFE47A]/30 hover:to-[#FFD23F]/40 border-2 border-[#FFD23F] text-[#1E8C86] transition-all active:scale-95 group text-center shadow-card hover:shadow-accent-glow"
              >
                <div className="w-12 h-12 rounded-xl bg-white border border-[#FFD23F] text-[#1E8C86] flex items-center justify-center shadow-xs mb-2 group-hover:scale-105 transition-transform">
                  <Upload size={22} strokeWidth={2.4} />
                </div>
                <span className="text-xs font-black leading-tight text-slate-900">
                  Carica file
                </span>
                <span className="text-[10px] text-slate-500 font-semibold mt-0.5">
                  PDF / Libri
                </span>
              </button>

              {/* Voce 2: Trascrivi Audio (Gemini AI) */}
              <button
                type="button"
                onClick={() => {
                  setIsQuickActionsOpen(false);
                  setUploadInitialMode('audio');
                  setIsUploadOpen(true);
                }}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-gradient-to-b from-[#FFF8E7] to-[#5DADE2]/20 hover:to-[#5DADE2]/35 border-2 border-[#5DADE2] text-[#2980B9] transition-all active:scale-95 group text-center shadow-card hover:shadow-sky-glow"
              >
                <div className="w-12 h-12 rounded-xl bg-[#5DADE2] text-white flex items-center justify-center shadow-xs mb-2 group-hover:scale-105 transition-transform">
                  <Headphones size={22} strokeWidth={2.4} />
                </div>
                <span className="text-xs font-black leading-tight text-slate-900">
                  Trascrivi audio
                </span>
                <span className="text-[10px] text-slate-500 font-semibold mt-0.5">
                  Gemini AI
                </span>
              </button>

              {/* Voce 3: Scansiona OCR */}
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
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-gradient-to-b from-[#FFF8E7] to-[#FF8A6A]/20 hover:to-[#FF8A6A]/35 border-2 border-[#EF6C4A] text-[#D45233] transition-all active:scale-95 group text-center shadow-card hover:shadow-coral-glow"
              >
                <div className="w-12 h-12 rounded-xl bg-[#EF6C4A] text-white flex items-center justify-center shadow-xs mb-2 group-hover:scale-105 transition-transform">
                  <Camera size={22} strokeWidth={2.4} />
                </div>
                <span className="text-xs font-black leading-tight text-slate-900">
                  Scansione OCR
                </span>
                <span className="text-[10px] text-slate-500 font-semibold mt-0.5">
                  Fotocamera
                </span>
              </button>

              {/* Voce 4: Ascolta testo (Incolla) */}
              <button
                type="button"
                onClick={() => {
                  setIsQuickActionsOpen(false);
                  setIsPasteAudioOpen(true);
                }}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-gradient-to-b from-[#FFF8E7] to-[#E8F6F5] hover:to-[#2BA8A2]/25 border-2 border-[#2BA8A2] text-[#1E8C86] transition-all active:scale-95 group text-center shadow-card hover:shadow-teal-glow"
              >
                <div className="w-12 h-12 rounded-xl bg-[#2BA8A2] text-white flex items-center justify-center shadow-xs mb-2 group-hover:scale-105 transition-transform">
                  <Volume2 size={22} strokeWidth={2.4} />
                </div>
                <span className="text-xs font-black leading-tight text-slate-900">
                  Ascolta audio
                </span>
                <span className="text-[10px] text-slate-500 font-semibold mt-0.5">
                  Incolla testo
                </span>
              </button>

              {/* Voce 5: Combina file */}
              <button
                type="button"
                onClick={() => {
                  setIsQuickActionsOpen(false);
                  setUploadInitialMode('all');
                  setIsUploadOpen(true);
                }}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-gradient-to-b from-[#FFF8E7] to-[#FFE47A]/30 hover:to-[#FFD23F]/40 border-2 border-[#FFD23F] text-[#1E8C86] transition-all active:scale-95 group text-center shadow-card hover:shadow-accent-glow"
              >
                <div className="w-12 h-12 rounded-xl bg-white border border-[#FFD23F] text-[#1E8C86] flex items-center justify-center shadow-xs mb-2 group-hover:scale-105 transition-transform">
                  <Layers size={22} strokeWidth={2.4} />
                </div>
                <span className="text-xs font-black leading-tight text-slate-900">
                  Combina file
                </span>
                <span className="text-[10px] text-slate-500 font-semibold mt-0.5">
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
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-gradient-to-b from-[#FFF8E7] to-[#E8F6F5] hover:to-[#2BA8A2]/25 border-2 border-[#2BA8A2] text-[#1E8C86] transition-all active:scale-95 group text-center shadow-card hover:shadow-teal-glow"
              >
                <div className="w-12 h-12 rounded-xl bg-[#2BA8A2] text-white flex items-center justify-center shadow-xs mb-2 group-hover:scale-105 transition-transform">
                  <svg className="w-5 h-5" viewBox="0 0 87.3 78" fill="none">
                    <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5z" fill="#FFFFFF"/>
                    <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#FFFFFF"/>
                    <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.5l5.85 10.15z" fill="#FFFFFF"/>
                  </svg>
                </div>
                <span className="text-xs font-black leading-tight text-slate-900">
                  Google Drive
                </span>
                <span className="text-[10px] text-slate-500 font-semibold mt-0.5">
                  Account Cloud
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modali di sistema */}
      <UploadModal
        isOpen={isUploadOpen}
        initialMode={uploadInitialMode}
        onClose={() => setIsUploadOpen(false)}
        onBookAdded={onAddBook}
      />

      <ScanModal
        isOpen={isScanOpen}
        onClose={() => setIsScanOpen(false)}
        onBookAdded={onAddBook}
        onScanResultsReady={(session) => {
          setIsScanOpen(false);
          if (onScanResultsReady) onScanResultsReady(session);
        }}
      />

      <GoogleDriveModal
        isOpen={isDriveOpen}
        onClose={() => setIsDriveOpen(false)}
        onFileDownloaded={async (file) => handleDriveFileImport(file, file.name, file.name.split('.').pop() || 'pdf')}
      />

      <PasteAudioModal
        isOpen={isPasteAudioOpen}
        onClose={() => setIsPasteAudioOpen(false)}
        onOpenReader={(b) => {
          if (onOpenReader) onOpenReader(b);
          else if (onOpenBook) onOpenBook(b);
        }}
        onAddBook={onAddBook}
      />
    </div>
  );
};
