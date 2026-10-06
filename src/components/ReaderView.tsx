import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Play, Pause, SkipBack, SkipForward, Sparkles, Volume2, Type } from 'lucide-react';
import { Book, TtsSettings } from '../types';
import { ttsService } from '../services/ttsService';
import { fileParser } from '../services/fileParser';

interface ReaderViewProps {
  book: Book;
  settings: TtsSettings;
  onBack: () => void;
  onPageChange: (pageIndex: number) => void;
  onUpdateContent: (pages: string[]) => void;
}

export const ReaderView: React.FC<ReaderViewProps> = ({
  book,
  settings,
  onBack,
  onPageChange,
  onUpdateContent,
}) => {
  const [currentPage, setCurrentPage] = useState(book.currentPage || 0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhanceNotice, setEnhanceNotice] = useState<string | null>(null);
  const [localFontSize, setLocalFontSize] = useState<'normal' | 'large' | 'huge'>(settings.fontSize || 'normal');
  const scrollRef = useRef<HTMLDivElement>(null);

  const totalPages = book.pages.length || 1;
  const currentText = book.pages[currentPage] || '(Nessun testo presente in questa pagina.)';

  const onPageChangeRef = useRef(onPageChange);
  useEffect(() => {
    onPageChangeRef.current = onPageChange;
  }, [onPageChange]);

  const changePage = (newIdx: number) => {
    setCurrentPage(newIdx);
    onPageChangeRef.current(newIdx);
  };

  // Clean up speech when component unmounts
  useEffect(() => {
    return () => {
      ttsService.stop();
    };
  }, []);

  const handleSpeakCurrentPage = () => {
    if (isPlaying) {
      ttsService.stop();
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);
    ttsService.speak(currentText, settings, (event, err) => {
      if (event === 'end') {
        setIsPlaying(false);
        // Auto-advance to next page if enabled
        if (settings.autoAdvance && currentPage < totalPages - 1) {
          const next = currentPage + 1;
          changePage(next);
          scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
          // Read next page
          setTimeout(() => {
            const nextText = book.pages[next] || '';
            if (nextText.trim()) {
              setIsPlaying(true);
              ttsService.speak(nextText, settings, (e2) => {
                if (e2 === 'end') setIsPlaying(false);
              });
            }
          }, 300);
        }
      } else if (event === 'error') {
        setIsPlaying(false);
        console.warn('TTS error', err);
      }
    });
  };

  const handlePrevPage = () => {
    ttsService.stop();
    setIsPlaying(false);
    if (currentPage > 0) {
      changePage(currentPage - 1);
      scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNextPage = () => {
    ttsService.stop();
    setIsPlaying(false);
    if (currentPage < totalPages - 1) {
      changePage(currentPage + 1);
      scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleEnhance = () => {
    ttsService.stop();
    setIsPlaying(false);
    setIsEnhancing(true);
    setEnhanceNotice('Miglioramento del testo con AI in corso...');

    setTimeout(() => {
      const enhancedPages = book.pages.map((p) => fileParser.enhanceText(p));
      onUpdateContent(enhancedPages);
      setIsEnhancing(false);
      setEnhanceNotice('Testo migliorato e normalizzato!');
      setTimeout(() => setEnhanceNotice(null), 3000);
    }, 600);
  };

  const toggleFontSize = () => {
    if (localFontSize === 'normal') setLocalFontSize('large');
    else if (localFontSize === 'large') setLocalFontSize('huge');
    else setLocalFontSize('normal');
  };

  const getTextClass = () => {
    switch (localFontSize) {
      case 'huge':
        return 'text-2xl sm:text-3xl leading-relaxed';
      case 'large':
        return 'text-xl sm:text-2xl leading-relaxed';
      default:
        return 'text-lg sm:text-xl leading-relaxed';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex flex-col justify-between select-text" role="region" aria-label="Lettore di libri">
      {/* Top Header */}
      <header className="border-b-2 border-[#333333] bg-[#1A1A1A] p-3 flex items-center justify-between gap-3 shrink-0">
        <button
          onClick={() => {
            ttsService.stop();
            onBack();
          }}
          className="min-h-[56px] min-w-[56px] rounded-xl bg-black border-2 border-white hover:border-[#FFD600] flex items-center justify-center text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FFD600]"
          aria-label="Torna all'elenco dei libri"
        >
          <ArrowLeft size={28} />
        </button>

        <div className="flex-1 min-w-0 text-center">
          <h2 className="text-base font-black truncate text-white">{book.title}</h2>
          <p className="text-xs font-bold text-[#FFD600]">
            Pagina {currentPage + 1} di {totalPages}
          </p>
        </div>

        <button
          onClick={toggleFontSize}
          className="min-h-[56px] px-3 rounded-xl bg-black border-2 border-white hover:border-[#FFD600] flex items-center gap-1.5 text-white font-extrabold text-xs focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FFD600]"
          aria-label={`Dimensione testo: ${localFontSize}. Clicca per cambiare.`}
        >
          <Type size={20} className="text-[#FFD600]" />
          <span>{localFontSize === 'normal' ? 'Normale' : localFontSize === 'large' ? 'Grande' : 'Max'}</span>
        </button>
      </header>

      {/* Sub-bar: Status and AI Enhancement */}
      <div className="bg-black border-b border-[#333333] px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-[#B8B8B8] flex items-center gap-1.5">
            <Volume2 size={16} className={isPlaying ? 'text-[#FFD600] animate-pulse' : 'text-[#B8B8B8]'} />
            {isPlaying ? 'Lettura vocale in corso' : 'Lettura in pausa'}
          </span>
        </div>

        <button
          onClick={handleEnhance}
          disabled={isEnhancing}
          className="text-xs font-extrabold text-white bg-[#1A1A1A] hover:bg-[#333333] border border-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD600]"
          aria-label="Migliora testo con intelligenza artificiale"
        >
          <Sparkles size={14} className="text-[#FFD600]" />
          <span>{isEnhancing ? 'Miglioramento...' : 'Migliora testo AI'}</span>
        </button>
      </div>

      {enhanceNotice && (
        <div
          role="status"
          aria-live="polite"
          className="bg-[#00E676]/20 border border-[#00E676] text-white text-xs font-black p-2 text-center"
        >
          {enhanceNotice}
        </div>
      )}

      {/* Main Reading Page Content */}
      <main
        ref={scrollRef}
        tabIndex={0}
        aria-label={`Contenuto di pagina ${currentPage + 1}`}
        className="flex-1 overflow-y-auto p-6 max-w-3xl w-full mx-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD600]"
      >
        <div className="bg-[#1A1A1A] border-2 border-[#333333] rounded-2xl p-6 sm:p-8 min-h-full">
          <div className="border-b border-[#333333] pb-3 mb-6 flex justify-between items-center text-xs font-black text-[#B8B8B8]">
            <span>PAGINA {currentPage + 1}</span>
            <span>{book.file_type.toUpperCase()}</span>
          </div>

          <p
            className={`font-semibold tracking-wide whitespace-pre-line text-white ${getTextClass()}`}
            style={{ wordBreak: 'break-word' }}
          >
            {currentText}
          </p>
        </div>
      </main>

      {/* Sticky Big Bottom Player Bar */}
      <footer
        className="bg-[#1A1A1A] border-t-4 border-[#FFD600] p-4 shrink-0 shadow-2xl"
        role="region"
        aria-label="Controlli di lettura vocale"
      >
        <div className="max-w-2xl mx-auto flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            {/* Previous Page */}
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 0}
              className={`min-h-[84px] min-w-[84px] rounded-2xl bg-black border-2 border-white flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FFD600] ${
                currentPage === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:border-[#FFD600]'
              }`}
              aria-label="Pagina precedente"
            >
              <SkipBack size={34} className="text-white" />
              <span className="text-[11px] font-black uppercase text-white">Precedente</span>
            </button>

            {/* Huge Play / Pause Button */}
            <button
              onClick={handleSpeakCurrentPage}
              className="flex-1 min-h-[96px] rounded-3xl bg-[#FFD600] hover:bg-[#FFEA00] text-black border-4 border-white flex items-center justify-center gap-3 font-black text-xl shadow-lg active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FFD600]"
              aria-label={isPlaying ? 'Ferma lettura vocale' : 'Avvia lettura vocale della pagina'}
            >
              {isPlaying ? (
                <>
                  <Pause size={48} className="fill-black" />
                  <span>Pausa</span>
                </>
              ) : (
                <>
                  <Play size={48} className="fill-black translate-x-1" />
                  <span>Ascolta</span>
                </>
              )}
            </button>

            {/* Next Page */}
            <button
              onClick={handleNextPage}
              disabled={currentPage >= totalPages - 1}
              className={`min-h-[84px] min-w-[84px] rounded-2xl bg-black border-2 border-white flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FFD600] ${
                currentPage >= totalPages - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:border-[#FFD600]'
              }`}
              aria-label="Pagina successiva"
            >
              <SkipForward size={34} className="text-white" />
              <span className="text-[11px] font-black uppercase text-white">Successiva</span>
            </button>
          </div>

          {/* Voice indicator info */}
          <div className="flex items-center justify-between text-xs font-bold text-[#B8B8B8] px-1">
            <span>
              Velocità: <strong className="text-white">{settings.rate.toFixed(1)}x</strong>
            </span>
            <span aria-live="polite">
              {isPlaying ? 'Voce attiva...' : 'Pronto alla lettura'}
            </span>
            <span>
              Avanzamento auto:{' '}
              <strong className={settings.autoAdvance ? 'text-[#00E676]' : 'text-neutral-400'}>
                {settings.autoAdvance ? 'Sì' : 'No'}
              </strong>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};
