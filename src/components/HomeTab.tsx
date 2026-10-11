import React, { useState } from 'react';
import { Book, ScanSessionData } from '../types';
import { BookCard } from './BookCard';
import { UploadModal } from './UploadModal';
import { ScanModal } from './ScanModal';
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
}) => {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isScanOpen, setIsScanOpen] = useState(false);
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const [activeTabFilter, setActiveTabFilter] = useState<'recenti' | 'stella' | 'dispositivo'>('recenti');
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Filter books based on search query and active tab
  const filteredBooks = books.filter((b) => {
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

  return (
    <div className="flex flex-col text-white select-none animate-fade-in pb-28">
      {/* 1. HERO GREETING (Stile Adobe Acrobat) */}
      <div className="pt-2 pb-1.5 px-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Benvenuto, {userName}
        </h1>
      </div>

      {/* 2. TABS BAR (Recenti, Con stella, Sul dispositivo + menu ⋮) */}
      <div className="flex items-center justify-between border-b border-[#181B22] px-2 pt-2 pb-1 relative">
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

        {/* Tre puntini verticali per ordinamento */}
        <button
          onClick={() => setShowSortMenu((prev) => !prev)}
          aria-label="Opzioni visualizzazione elenco"
          className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white"
        >
          <MoreVertical size={18} />
        </button>

        {showSortMenu && (
          <div className="absolute right-2 top-10 bg-[#161822] border border-zinc-700 rounded-2xl p-2 z-30 shadow-2xl flex flex-col gap-1 min-w-[170px]">
            <button
              onClick={() => {
                setActiveTabFilter('recenti');
                setShowSortMenu(false);
              }}
              className="text-xs font-semibold text-white px-3 py-2 text-left hover:bg-zinc-800 rounded-lg"
            >
              Ordina per data recente
            </button>
            <button
              onClick={() => {
                setActiveTabFilter('stella');
                setShowSortMenu(false);
              }}
              className="text-xs font-semibold text-white px-3 py-2 text-left hover:bg-zinc-800 rounded-lg"
            >
              Mostra solo con stella
            </button>
          </div>
        )}
      </div>

      {/* 4. DOCUMENT LIST (Stile Adobe Acrobat) */}
      <div className="flex flex-col divide-y divide-[#181B22] mt-1">
        {filteredBooks.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-2 text-gray-400">
            <FileText size={38} className="text-zinc-600 mb-2" />
            <p className="text-sm font-bold text-white">Nessun file trovato</p>
            <p className="text-xs text-gray-500">I tuoi documenti PDF ed eBook appariranno qui.</p>
          </div>
        ) : (
          filteredBooks.map((book) => (
            <BookCard
              key={book.book_id}
              book={book}
              onOpen={onOpenBook ? onOpenBook : () => {}}
              onDelete={onDeleteBook ? onDeleteBook : () => {}}
            />
          ))
        )}
      </div>

      {/* 5. FLOATING ACTION BUTTON (FAB) - Stile Azzurro con + che apre tutte le voci sotto Benvenuto */}
      {!hideFab && (
        <button
          onClick={() => setIsQuickActionsOpen((prev) => !prev)}
          aria-label={isQuickActionsOpen ? "Chiudi menu azioni" : "Apri tutte le azioni rapide"}
          aria-expanded={isQuickActionsOpen}
          className={`fixed bottom-24 right-5 z-40 w-14 h-14 rounded-full bg-[#4BA3E3] hover:bg-[#3993D6] active:scale-95 text-black flex items-center justify-center shadow-2xl transition-all duration-300 ${
            isQuickActionsOpen ? 'rotate-45 bg-red-500 hover:bg-red-600 text-white z-50' : ''
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
          className="fixed inset-0 z-40 bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 sm:p-4 animate-fade-in"
          onClick={() => setIsQuickActionsOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#12141C] border border-[#232734] rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl flex flex-col gap-4 text-white mb-20 sm:mb-0 max-h-[85vh] overflow-y-auto"
          >
            {/* Header del modale Azioni Rapide */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#14233D] border border-[#2684FC] flex items-center justify-center shrink-0">
                  <Sparkles size={22} className="text-[#2684FC]" />
                </div>
                <div>
                  <h3 id="quick-actions-title" className="text-lg font-black text-white leading-snug">
                    Cosa vorresti fare?
                  </h3>
                  <p className="text-xs text-gray-400 font-medium">
                    Tutte le voci e le azioni disponibili in Vora
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsQuickActionsOpen(false)}
                className="w-9 h-9 rounded-xl bg-zinc-800 text-gray-400 flex items-center justify-center hover:bg-zinc-700 hover:text-white transition-colors"
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
                className="bg-[#171B32] hover:bg-[#1E2342] border border-[#2B325B] hover:border-[#4B5699] rounded-2xl p-3.5 flex items-center justify-between text-left transition-all active:scale-[0.98] group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-[#242C56] text-[#6E87FF] flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                    <Upload size={22} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white group-hover:text-[#6E87FF] transition-colors">
                        Carica file
                      </span>
                      <span className="w-4 h-4 rounded-full bg-[#8E44AD] text-white flex items-center justify-center text-[9px] shadow-xs">
                        👑
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 font-normal truncate mt-0.5">
                      Importa PDF, EPUB, TXT o immagini con OCR
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold text-[#6E87FF] shrink-0 ml-2">
                  Apri →
                </span>
              </button>

              {/* Voce 2: Scansiona OCR */}
              <button
                type="button"
                onClick={() => {
                  setIsQuickActionsOpen(false);
                  setIsScanOpen(true);
                }}
                className="bg-[#09241B] hover:bg-[#0E3528] border border-[#164836] hover:border-[#226B50] rounded-2xl p-3.5 flex items-center justify-between text-left transition-all active:scale-[0.98] group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-[#143B2D] text-[#2ECC71] flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                    <Camera size={22} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white group-hover:text-[#2ECC71] transition-colors">
                        Scansiona OCR
                      </span>
                      <span className="w-4 h-4 rounded-full bg-[#8E44AD] text-white flex items-center justify-center text-[9px] shadow-xs">
                        👑
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 font-normal truncate mt-0.5">
                      Acquisisci foto e converti testo con Gemini AI Vision
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold text-[#2ECC71] shrink-0 ml-2">
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
                className="bg-[#280D14] hover:bg-[#38131D] border border-[#4E1A27] hover:border-[#73273A] rounded-2xl p-3.5 flex items-center justify-between text-left transition-all active:scale-[0.98] group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-[#401420] text-[#FF4757] flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                    <FileText size={22} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white group-hover:text-[#FF4757] transition-colors">
                        Crea con AI
                      </span>
                      <span className="w-4 h-4 rounded-full bg-[#8E44AD] text-white flex items-center justify-center text-[9px] shadow-xs">
                        👑
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 font-normal truncate mt-0.5">
                      Trascrizione intelligente e pulizia impaginazione AI
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold text-[#FF4757] shrink-0 ml-2">
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
                className="bg-[#28180A] hover:bg-[#38220E] border border-[#522F13] hover:border-[#7A451C] rounded-2xl p-3.5 flex items-center justify-between text-left transition-all active:scale-[0.98] group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-[#442810] text-[#FFA502] flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                    <Volume2 size={22} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white group-hover:text-[#FFA502] transition-colors">
                        Ascolta audio
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 font-normal truncate mt-0.5">
                      {books.length > 0
                        ? `Ascolta subito "${books[0].title}"`
                        : 'Riproduci libri con voce naturale italiana AI'}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold text-[#FFA502] shrink-0 ml-2">
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
                className="bg-[#1C1232] hover:bg-[#271946] border border-[#3A2466] hover:border-[#543594] rounded-2xl p-3.5 flex items-center justify-between text-left transition-all active:scale-[0.98] group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-[#2E1D52] text-[#9B59B6] flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                    <Layers size={22} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white group-hover:text-[#9B59B6] transition-colors">
                        Combina file
                      </span>
                      <span className="w-4 h-4 rounded-full bg-[#8E44AD] text-white flex items-center justify-center text-[9px] shadow-xs">
                        👑
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 font-normal truncate mt-0.5">
                      Unisci documenti multipli in una singola opera
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold text-[#9B59B6] shrink-0 ml-2">
                  Combina →
                </span>
              </button>
            </div>

            {/* Pulsante Chiudi */}
            <button
              type="button"
              onClick={() => setIsQuickActionsOpen(false)}
              className="w-full py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs transition-colors active:scale-98 mt-1"
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
        onClose={() => setIsScanOpen(false)}
        onBookAdded={onAddBook}
        onScanResultsReady={onScanResultsReady}
      />
    </div>
  );
};
