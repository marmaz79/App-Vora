import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  RotateCw,
  Sparkles,
  Volume2,
  Type,
  List,
  Moon,
  Gauge,
  X,
  Check,
  Clock,
  BookOpen,
  FileText,
  Camera,
  Loader2,
} from 'lucide-react';
import { Book, TtsSettings } from '../types';
import { ttsService } from '../services/ttsService';
import { fileParser } from '../services/fileParser';

interface ReaderViewProps {
  book: Book;
  settings: TtsSettings;
  onBack: () => void;
  onPageChange: (pageIndex: number) => void;
  onUpdateContent: (pages: string[]) => void;
  onUpdateSettings?: (settings: TtsSettings) => void;
  onSwitchToPdf?: (book: Book) => void;
}

type KindleTheme = 'black-white' | 'dark' | 'white' | 'cream-black' | 'black-yellow' | 'sepia' | 'paperwhite';
type SleepTimerOption = 'off' | '15' | '30' | '45' | 'end-of-page';

export const ReaderView: React.FC<ReaderViewProps> = ({
  book,
  settings,
  onBack,
  onPageChange,
  onUpdateContent,
  onUpdateSettings,
  onSwitchToPdf,
}) => {
  const [currentPage, setCurrentPage] = useState(book.currentPage || 0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhanceNotice, setEnhanceNotice] = useState<string | null>(null);

  // Kindle Display Settings (synced with settings.highContrastMode)
  const getInitialTheme = (): KindleTheme => {
    if (settings?.highContrastMode) {
      if (settings.highContrastMode === 'black-white' || settings.highContrastMode === 'black-yellow') return 'black-white';
      if (settings.highContrastMode === 'dark') return 'dark';
      if (settings.highContrastMode === 'cream-black') return 'cream-black';
      if (settings.highContrastMode === 'sepia') return 'sepia';
      if (settings.highContrastMode === 'white') return 'white';
    }
    return 'black-white';
  };

  const [kindleTheme, setKindleTheme] = useState<KindleTheme>(getInitialTheme);

  useEffect(() => {
    if (settings?.highContrastMode) {
      if (settings.highContrastMode === 'black-white' || settings.highContrastMode === 'black-yellow') setKindleTheme('black-white');
      else if (settings.highContrastMode === 'dark') setKindleTheme('dark');
      else if (settings.highContrastMode === 'cream-black') setKindleTheme('cream-black');
      else if (settings.highContrastMode === 'sepia') setKindleTheme('sepia');
      else if (settings.highContrastMode === 'white') setKindleTheme('white');
    }
  }, [settings?.highContrastMode]);
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'huge'>(settings.fontSize || 'normal');
  const [lineHeight, setLineHeight] = useState<'normal' | 'relaxed' | 'loose'>('relaxed');

  // Kindle Audio Menus
  const [showTocModal, setShowTocModal] = useState(false);
  const [showDisplayModal, setShowDisplayModal] = useState(false);
  const [showSpeedModal, setShowSpeedModal] = useState(false);
  const [showSleepModal, setShowSleepModal] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [previewVoiceUri, setPreviewVoiceUri] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);

  // Sleep Timer
  const [sleepTimerOption, setSleepTimerOption] = useState<SleepTimerOption>('off');
  const [sleepSecondsLeft, setSleepSecondsLeft] = useState<number | null>(null);

  // View mode: 'full' (all book content continuously) or 'page' (single page)
  const [viewMode, setViewMode] = useState<'full' | 'page'>('full');
  const pageRefs = useRef<(HTMLElement | null)[]>([]);
  const isProgrammaticScroll = useRef(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const sanitizedPages = React.useMemo(() => {
    return (book.pages || []).map((p) => fileParser.cleanCorruptedText(p));
  }, [book.pages]);
  const totalPages = sanitizedPages.length || 1;
  const currentText = sanitizedPages[currentPage] || '(Nessun testo presente in questa pagina.)';

  const onPageChangeRef = useRef(onPageChange);
  useEffect(() => {
    onPageChangeRef.current = onPageChange;
  }, [onPageChange]);

  // Scroll visibility sync on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage > 0) {
        isProgrammaticScroll.current = true;
        if (viewMode === 'full') {
          pageRefs.current[currentPage]?.scrollIntoView({ block: 'start', behavior: 'smooth' });
        } else {
          scrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
        }
        setTimeout(() => {
          isProgrammaticScroll.current = false;
        }, 600);
      } else {
        scrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [book.book_id]);

  const changePage = (newIdx: number, autoPlay: boolean = false) => {
    const validIdx = Math.max(0, Math.min(totalPages - 1, newIdx));
    setCurrentPage(validIdx);
    onPageChangeRef.current(validIdx);

    isProgrammaticScroll.current = true;
    if (viewMode === 'page') {
      scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      pageRefs.current[validIdx]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    setTimeout(() => {
      isProgrammaticScroll.current = false;
    }, 800);

    if (autoPlay) {
      setTimeout(() => {
        const textToRead = sanitizedPages[validIdx] || '';
        if (textToRead.trim()) {
          setIsPlaying(true);
          ttsService
            .speak(textToRead, settings, (e) => {
              if (e === 'end') handleSpeechEnd();
              else if (e === 'error') setIsPlaying(false);
            })
            .catch(() => setIsPlaying(false));
        }
      }, 200);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (viewMode !== 'full' || isProgrammaticScroll.current || pageRefs.current.length === 0) return;

    const container = e.currentTarget;
    const containerTop = container.getBoundingClientRect().top;

    let closestIndex = currentPage;
    let minDistance = Infinity;

    pageRefs.current.forEach((el, index) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const distance = Math.abs(rect.top - containerTop);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });

    if (closestIndex !== currentPage) {
      setCurrentPage(closestIndex);
      onPageChangeRef.current(closestIndex);
    }
  };

  // Sleep timer countdown ticker
  useEffect(() => {
    if (sleepTimerOption === 'off' || sleepTimerOption === 'end-of-page') {
      setSleepSecondsLeft(null);
      return;
    }

    const interval = setInterval(() => {
      setSleepSecondsLeft((prev) => {
        if (prev === null || prev <= 1) {
          // Timer expired!
          ttsService.stop();
          setIsPlaying(false);
          setSleepTimerOption('off');
          setEnhanceNotice('Timer di spegnimento terminato: lettura messa in pausa.');
          setTimeout(() => setEnhanceNotice(null), 4000);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [sleepTimerOption]);

  const setSleepTimer = (option: SleepTimerOption) => {
    setSleepTimerOption(option);
    setShowSleepModal(false);

    if (option === 'off') {
      setSleepSecondsLeft(null);
    } else if (option === 'end-of-page') {
      setSleepSecondsLeft(null);
      setEnhanceNotice('La lettura si fermerà al termine di questa pagina.');
      setTimeout(() => setEnhanceNotice(null), 3000);
    } else {
      const minutes = parseInt(option, 10);
      setSleepSecondsLeft(minutes * 60);
      setEnhanceNotice(`Timer di spegnimento impostato a ${minutes} minuti.`);
      setTimeout(() => setEnhanceNotice(null), 3000);
    }
  };

  // Clean up speech when component unmounts
  useEffect(() => {
    return () => {
      ttsService.stop();
    };
  }, []);

  const handleSpeechEnd = () => {
    setIsPlaying(false);
    setIsLoadingAudio(false);

    // If sleep timer is set to end of page, stop here!
    if (sleepTimerOption === 'end-of-page') {
      setSleepTimerOption('off');
      setEnhanceNotice('Pagina completata: timer di spegnimento attivato.');
      setTimeout(() => setEnhanceNotice(null), 3000);
      return;
    }

    // Auto-advance to next page if enabled
    if (settings.autoAdvance && currentPage < totalPages - 1) {
      changePage(currentPage + 1, true);
    }
  };

  const handleTogglePlay = () => {
    if (isPlaying || isLoadingAudio) {
      ttsService.stop();
      setIsPlaying(false);
      setIsLoadingAudio(false);
      return;
    }

    setIsLoadingAudio(true);
    ttsService
      .speak(currentText, settings, (event, err) => {
        if (event === 'start') {
          setIsLoadingAudio(false);
          setIsPlaying(true);
        } else if (event === 'end') {
          setIsLoadingAudio(false);
          setIsPlaying(false);
          handleSpeechEnd();
        } else if (event === 'error') {
          setIsLoadingAudio(false);
          setIsPlaying(false);
          console.warn('TTS error', err);
        }
      })
      .catch((err) => {
        setIsLoadingAudio(false);
        setIsPlaying(false);
        if (err?.name !== 'AbortError') {
          console.warn('Errore esecuzione speak:', err);
        }
      });
  };

  // Kindle 30s Rewind: restarts current page or goes back to prev page
  const handleRewind30 = () => {
    ttsService.stop();
    if (currentPage > 0) {
      changePage(currentPage - 1, isPlaying);
    } else {
      changePage(0, isPlaying);
    }
  };

  // Kindle 30s Fast Forward: skips to next page
  const handleForward30 = () => {
    ttsService.stop();
    if (currentPage < totalPages - 1) {
      changePage(currentPage + 1, isPlaying);
    }
  };

  const handlePrevPage = () => {
    ttsService.stop();
    setIsPlaying(false);
    if (currentPage > 0) {
      changePage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    ttsService.stop();
    setIsPlaying(false);
    if (currentPage < totalPages - 1) {
      changePage(currentPage + 1);
    }
  };

  const handleSpeedChange = (newRate: number) => {
    const updated = { ...settings, rate: newRate };
    onUpdateSettings?.(updated);
    setShowSpeedModal(false);

    // If currently speaking, restart smoothly with new rate
    if (isPlaying) {
      ttsService.stop();
      setTimeout(() => {
        setIsPlaying(true);
        ttsService.speak(currentText, updated, (e) => {
          if (e === 'end') handleSpeechEnd();
          else if (e === 'error') setIsPlaying(false);
        });
      }, 150);
    }
  };

  const handleVoiceSelect = (voiceUri: string, voiceName: string) => {
    const updated = { ...settings, voiceUri, voiceName };
    onUpdateSettings?.(updated);
    setShowVoiceModal(false);

    if (isPlaying) {
      ttsService.stop();
      setTimeout(() => {
        setIsPlaying(true);
        ttsService.speak(currentText, updated, (e) => {
          if (e === 'end') handleSpeechEnd();
          else if (e === 'error') setIsPlaying(false);
        });
      }, 150);
    }
  };

  const handleEnhance = async () => {
    ttsService.stop();
    setIsPlaying(false);
    setIsEnhancing(true);
    setEnhanceNotice('Miglioramento del testo con Gemini AI in corso...');

    try {
      const pageToEnhance = sanitizedPages[currentPage];
      const res = await fetch('/api/ai/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: pageToEnhance }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.text) {
          const newPages = [...book.pages];
          newPages[currentPage] = data.text;
          onUpdateContent(newPages);
          setIsEnhancing(false);
          setEnhanceNotice('Pagina migliorata e pulita con AI!');
          setTimeout(() => setEnhanceNotice(null), 3500);
          return;
        }
      }
    } catch (e) {
      console.warn('AI enhance fallback to local:', e);
    }

    const enhancedPages = book.pages.map((p) => fileParser.enhanceText(p));
    onUpdateContent(enhancedPages);
    setIsEnhancing(false);
    setEnhanceNotice('Testo migliorato e normalizzato!');
    setTimeout(() => setEnhanceNotice(null), 3000);
  };

  // Calculate estimated remaining reading time (words / 140wpm * rate)
  const wordsRemaining = sanitizedPages
    .slice(currentPage)
    .reduce((acc, p) => acc + p.split(/\s+/).length, 0);
  const remainingMinutes = Math.max(1, Math.round(wordsRemaining / (140 * settings.rate)));
  const progressPercent = Math.round(((currentPage + 1) / totalPages) * 100);

  // Theme styles (including high contrast black-white and dark)
  const themeClasses = {
    'black-white': {
      bg: 'bg-black text-white',
      card: 'bg-black border-zinc-800 text-white shadow-md',
      pageItemActive: 'border-white bg-zinc-900 shadow-xl ring-2 ring-white text-white',
      pageItemInactive: 'border-zinc-850 bg-black hover:border-zinc-700 text-zinc-300',
      header: 'bg-black/95 border-zinc-850 text-white shadow-md backdrop-blur-md',
      player: 'bg-black border-zinc-850 text-white shadow-xl',
      sliderTrack: 'bg-zinc-800',
      accentText: 'text-white',
      titleText: 'text-white',
      metaText: 'text-zinc-400',
      playBtn: 'bg-white text-black border-4 border-white hover:bg-zinc-200',
      btnSecondary: 'bg-zinc-950 border-zinc-800 hover:border-white text-white shadow-xs',
      highlight: 'bg-white/20 border-l-4 border-white pl-3 py-1 my-2 rounded-r text-white',
    },
    dark: {
      bg: 'bg-[#121212] text-white',
      card: 'bg-[#1A1A1A] border-zinc-800 text-white',
      pageItemActive: 'border-white bg-[#222222] shadow-lg ring-2 ring-white/30 text-white',
      pageItemInactive: 'border-zinc-850 bg-[#101010] hover:border-zinc-700 text-zinc-300',
      header: 'bg-[#121212] border-zinc-800 text-white',
      player: 'bg-[#1A1A1A] border-zinc-800 text-white',
      sliderTrack: 'bg-zinc-800',
      accentText: 'text-white',
      titleText: 'text-white',
      metaText: 'text-zinc-400',
      playBtn: 'bg-white text-black border-4 border-white hover:bg-zinc-200',
      btnSecondary: 'bg-zinc-900 border-zinc-700 hover:border-white text-white',
      highlight: 'bg-white/20 border-l-4 border-white pl-3 py-1 my-2 rounded-r text-white',
    },
    'black-yellow': {
      bg: 'bg-black text-white',
      card: 'bg-black border-zinc-800 text-white shadow-md',
      pageItemActive: 'border-white bg-zinc-900 shadow-xl ring-2 ring-white text-white',
      pageItemInactive: 'border-zinc-850 bg-black hover:border-zinc-700 text-zinc-300',
      header: 'bg-black/95 border-zinc-850 text-white shadow-md backdrop-blur-md',
      player: 'bg-black border-zinc-850 text-white shadow-xl',
      sliderTrack: 'bg-zinc-800',
      accentText: 'text-white',
      titleText: 'text-white',
      metaText: 'text-zinc-400',
      playBtn: 'bg-white text-black border-4 border-white hover:bg-zinc-200',
      btnSecondary: 'bg-zinc-950 border-zinc-800 hover:border-white text-white shadow-xs',
      highlight: 'bg-white/20 border-l-4 border-white pl-3 py-1 my-2 rounded-r text-white',
    },
    'cream-black': {
      bg: 'bg-black text-white',
      card: 'bg-black border-zinc-800 text-white shadow-md',
      pageItemActive: 'border-white bg-zinc-900 shadow-xl ring-2 ring-white text-white',
      pageItemInactive: 'border-zinc-850 bg-black hover:border-zinc-700 text-zinc-300',
      header: 'bg-black/95 border-zinc-850 text-white shadow-md backdrop-blur-md',
      player: 'bg-black border-zinc-850 text-white shadow-xl',
      sliderTrack: 'bg-zinc-800',
      accentText: 'text-white',
      titleText: 'text-white',
      metaText: 'text-zinc-400',
      playBtn: 'bg-white text-black border-4 border-white hover:bg-zinc-200',
      btnSecondary: 'bg-zinc-950 border-zinc-800 hover:border-white text-white shadow-xs',
      highlight: 'bg-white/20 border-l-4 border-white pl-3 py-1 my-2 rounded-r text-white',
    },
    paperwhite: {
      bg: 'bg-black text-white',
      card: 'bg-black border-zinc-800 text-white shadow-md',
      pageItemActive: 'border-white bg-zinc-900 shadow-xl ring-2 ring-white text-white',
      pageItemInactive: 'border-zinc-850 bg-black hover:border-zinc-700 text-zinc-300',
      header: 'bg-black/95 border-zinc-850 text-white shadow-md backdrop-blur-md',
      player: 'bg-black border-zinc-850 text-white shadow-xl',
      sliderTrack: 'bg-zinc-800',
      accentText: 'text-white',
      titleText: 'text-white',
      metaText: 'text-zinc-400',
      playBtn: 'bg-white text-black border-4 border-white hover:bg-zinc-200',
      btnSecondary: 'bg-zinc-950 border-zinc-800 hover:border-white text-white shadow-xs',
      highlight: 'bg-white/20 border-l-4 border-white pl-3 py-1 my-2 rounded-r text-white',
    },
    white: {
      bg: 'bg-white text-black',
      card: 'bg-white border-zinc-300 text-black shadow-sm',
      pageItemActive: 'border-black bg-zinc-200 shadow-md ring-2 ring-black/20 text-black',
      pageItemInactive: 'border-zinc-200 bg-white hover:border-zinc-400 shadow-xs text-zinc-800',
      header: 'bg-white/95 border-zinc-200 text-black shadow-xs backdrop-blur-md',
      player: 'bg-white border-zinc-200 text-black shadow-lg',
      sliderTrack: 'bg-zinc-200',
      accentText: 'text-black',
      titleText: 'text-black',
      metaText: 'text-zinc-600',
      playBtn: 'bg-black text-white border-4 border-black hover:bg-zinc-800',
      btnSecondary: 'bg-white border-zinc-300 hover:bg-zinc-100 text-black shadow-xs',
      highlight: 'bg-black/10 border-l-4 border-black pl-3 py-1 my-2 rounded-r text-black',
    },
    sepia: {
      bg: 'bg-black text-white',
      card: 'bg-black border-zinc-800 text-white shadow-md',
      pageItemActive: 'border-white bg-zinc-900 shadow-xl ring-2 ring-white text-white',
      pageItemInactive: 'border-zinc-850 bg-black hover:border-zinc-700 text-zinc-300',
      header: 'bg-black/95 border-zinc-850 text-white shadow-md backdrop-blur-md',
      player: 'bg-black border-zinc-850 text-white shadow-xl',
      sliderTrack: 'bg-zinc-800',
      accentText: 'text-white',
      titleText: 'text-white',
      metaText: 'text-zinc-400',
      playBtn: 'bg-white text-black border-4 border-white hover:bg-zinc-200',
      btnSecondary: 'bg-zinc-950 border-zinc-800 hover:border-white text-white shadow-xs',
      highlight: 'bg-white/20 border-l-4 border-white pl-3 py-1 my-2 rounded-r text-white',
    },
  }[kindleTheme] || {
    bg: 'bg-black text-white',
    card: 'bg-black border-zinc-800 text-white shadow-md',
    pageItemActive: 'border-white bg-zinc-900 shadow-xl ring-2 ring-white text-white',
    pageItemInactive: 'border-zinc-850 bg-black hover:border-zinc-700 text-zinc-300',
    header: 'bg-black/95 border-zinc-850 text-white shadow-md backdrop-blur-md',
    player: 'bg-black border-zinc-850 text-white shadow-xl',
    sliderTrack: 'bg-zinc-800',
    accentText: 'text-white',
    titleText: 'text-white',
    metaText: 'text-zinc-400',
    playBtn: 'bg-white text-black border-4 border-white hover:bg-zinc-200',
    btnSecondary: 'bg-zinc-950 border-zinc-800 hover:border-white text-white shadow-xs',
    highlight: 'bg-white/20 border-l-4 border-white pl-3 py-1 my-2 rounded-r text-white',
  };

  const fontSizeClass = {
    normal: 'text-base sm:text-lg',
    large: 'text-xl sm:text-2xl',
    huge: 'text-2xl sm:text-3xl',
  }[fontSize];

  const lineHeightClass = {
    normal: 'leading-normal',
    relaxed: 'leading-relaxed',
    loose: 'leading-loose',
  }[lineHeight];

  // Format sleep countdown (e.g. 14:32)
  const formatSleepTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className={`fixed inset-0 h-[100dvh] z-50 flex flex-col justify-between overflow-hidden select-text transition-colors duration-200 ${themeClasses.bg}`}
      role="region"
      aria-label="Lettore Stile Kindle"
    >
      {/* ===================== KINDLE TOP BAR ===================== */}
      <header
        className={`border-b px-3 py-2.5 flex items-center justify-between gap-2 shrink-0 z-10 transition-colors shadow-xs ${themeClasses.header}`}
      >
        <button
          onClick={() => {
            ttsService.stop();
            onBack();
          }}
          className={`min-h-[50px] min-w-[50px] rounded-xl border flex items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black ${themeClasses.btnSecondary}`}
          aria-label="Torna alla libreria"
        >
          <ArrowLeft size={24} />
        </button>

        <div className="flex-1 min-w-0 text-center px-2">
          <h2 className={`text-sm sm:text-base font-bold truncate flex items-center justify-center gap-1.5 ${themeClasses.titleText}`}>
            <span
              className={`${themeClasses.accentText} shrink-0 inline-flex items-center`}
              title={`Tipo file: ${book.file_type.toUpperCase()}`}
            >
              {book.file_type === 'pdf' ? (
                <FileText size={18} aria-hidden="true" />
              ) : book.file_type === 'scan' ? (
                <Camera size={18} aria-hidden="true" />
              ) : (
                <BookOpen size={18} aria-hidden="true" />
              )}
            </span>
            <span className="truncate">{book.title}</span>
          </h2>
          <p className={`text-xs font-semibold truncate ${themeClasses.metaText}`}>
            {book.author ? `${book.author} · ` : ''}
            <span>
              Pagina {currentPage + 1} di {totalPages}
            </span>
            {book.ocr_engine ? ` · ${book.ocr_engine}` : ''}
          </p>
        </div>

        {/* Right Kindle Tools: PDF Mode, View Mode Toggle, Indice, Audio & Aa Display */}
        <div className="flex items-center gap-1.5 shrink-0">
          {onSwitchToPdf && (
            <button
              onClick={() => {
                ttsService.stop();
                onSwitchToPdf(book);
              }}
              className={`min-h-[50px] px-3 rounded-xl border flex items-center gap-1.5 font-bold text-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black ${themeClasses.btnSecondary}`}
              aria-label="Passa alla visualizzazione PDF"
              title="Apri in PDF"
            >
              <FileText size={17} className="text-white" />
              <span className="hidden sm:inline">Apri in PDF</span>
            </button>
          )}

          <button
            onClick={() => setViewMode((prev) => (prev === 'full' ? 'page' : 'full'))}
            className={`min-h-[50px] px-3 rounded-xl border flex items-center gap-1.5 font-bold text-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black ${themeClasses.btnSecondary}`}
            aria-label={viewMode === 'full' ? 'Passa alla visualizzazione per pagina singola' : 'Mostra tutto il contenuto continuo del libro'}
            title={viewMode === 'full' ? 'Visualizzazione: Tutto il contenuto (tocca per pagina singola)' : 'Visualizzazione: Pagina singola (tocca per tutto il testo)'}
          >
            <BookOpen size={17} className={themeClasses.accentText} />
            <span className="hidden sm:inline">
              {viewMode === 'full' ? 'Tutto il testo' : 'Pag. singola'}
            </span>
          </button>

          <button
            onClick={() => setShowTocModal(true)}
            className={`min-h-[50px] min-w-[50px] rounded-xl border flex items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black ${themeClasses.btnSecondary}`}
            aria-label="Indice e navigazione pagine del libro"
            title="Indice Pagine"
          >
            <List size={22} />
          </button>

          <button
            onClick={() => setShowVoiceModal(true)}
            className={`min-h-[50px] px-3 rounded-xl border flex items-center gap-1.5 font-bold text-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black ${themeClasses.btnSecondary}`}
            aria-label={`Voce AI attiva: ${settings.voiceName || 'Kore AI'}. Tocca per impostazioni voce e velocità.`}
            title="Voce e Velocità Audio"
          >
            <Volume2 size={17} className={themeClasses.accentText} />
            <span className="hidden sm:inline">Voce</span>
          </button>

          <button
            onClick={() => setShowDisplayModal(true)}
            className={`min-h-[50px] px-3 rounded-xl border flex items-center gap-1 font-bold text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black ${themeClasses.btnSecondary}`}
            aria-label="Impostazioni di visualizzazione testo e caratteri stile Kindle (Aa)"
            title="Caratteri e Tema (Aa)"
          >
            <Type size={17} className={themeClasses.accentText} />
            <span className="font-extrabold tracking-tight">Aa</span>
          </button>
        </div>
      </header>

      {/* Notice / Status bar */}
      {enhanceNotice && (
        <div
          role="status"
          aria-live="polite"
          className="bg-black border-b border-white text-white text-xs font-bold py-1.5 px-4 text-center shrink-0"
        >
          {enhanceNotice}
        </div>
      )}

      {/* ===================== KINDLE READING CANVAS ===================== */}
      <main
        ref={scrollRef}
        onScroll={handleScroll}
        tabIndex={0}
        aria-label={viewMode === 'full' ? 'Tutto il contenuto del libro' : `Contenuto di pagina ${currentPage + 1}`}
        className="flex-1 min-h-0 overflow-y-auto w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white [-webkit-overflow-scrolling:touch]"
      >
        <div className="max-w-3xl w-full mx-auto px-4 sm:px-8 py-6 pb-36">
          {viewMode === 'full' ? (
            /* ALL CONTENT VIEW (Tutto il contenuto continuo) */
            <div className="flex flex-col gap-5">
              <div className={`flex items-center justify-between px-1 text-xs font-bold border-b pb-2 border-current/15 ${themeClasses.metaText}`}>
                <span className="uppercase tracking-wider">
                  {book.title} · Tutto il contenuto ({totalPages} {totalPages === 1 ? 'pagina' : 'pagine'})
                </span>
                <span>
                  {progressPercent}% completato
                </span>
              </div>

              {sanitizedPages.map((pageText, pIdx) => {
                const isThisPage = pIdx === currentPage;
                return (
                  <article
                    key={pIdx}
                    ref={(el) => {
                      pageRefs.current[pIdx] = el;
                    }}
                    onClick={() => {
                      if (pIdx !== currentPage) {
                        changePage(pIdx, isPlaying);
                      }
                    }}
                    className={`rounded-2xl border p-5 sm:p-7 transition-all cursor-pointer ${
                      isThisPage ? themeClasses.pageItemActive : themeClasses.pageItemInactive
                    }`}
                    aria-label={`Pagina ${pIdx + 1} di ${totalPages}`}
                  >
                    {/* Page Divider / Header */}
                    <div className="border-b pb-2 mb-4 flex justify-between items-center text-xs font-bold border-current/15">
                      <span className="uppercase tracking-wider flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${isThisPage ? 'bg-white' : 'bg-zinc-600'}`} />
                        Pagina {pIdx + 1} di {totalPages}
                      </span>
                      {isThisPage && isPlaying ? (
                        <span className="bg-white text-black text-[11px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-black animate-ping" />
                          In ascolto
                        </span>
                      ) : isThisPage ? (
                        <span className="bg-zinc-900 border border-white/30 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                          Pagina attiva
                        </span>
                      ) : (
                        <span className="opacity-60 text-[11px] font-medium hover:opacity-100">
                          Tocca per leggere
                        </span>
                      )}
                    </div>

                    {/* Text block */}
                    <div
                      className={`font-serif tracking-normal whitespace-pre-line ${themeClasses.titleText} ${fontSizeClass} ${lineHeightClass}`}
                      style={{ wordBreak: 'break-word' }}
                    >
                      {pageText}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            /* SINGLE PAGE VIEW (Pagina per pagina) */
            <div className={`relative rounded-2xl border p-6 sm:p-10 min-h-full transition-colors shadow-sm ${themeClasses.card} group/pagecard`}>
              {/* Left and Right navigation hover buttons on the card for quick page turning */}
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 0}
                className={`absolute left-0 top-0 bottom-0 w-12 sm:w-16 flex items-center justify-start pl-2 sm:pl-3 opacity-0 group-hover/pagecard:opacity-100 disabled:opacity-0 transition-opacity focus-visible:opacity-100 focus-visible:outline-none rounded-l-2xl text-gray-800 bg-gradient-to-r from-black/10 to-transparent cursor-pointer`}
                aria-label="Pagina precedente"
              >
                <div className="w-8 h-8 rounded-full bg-black/80 border border-white/20 shadow-md flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-transform backdrop-blur-sm">
                  <ArrowLeft size={16} />
                </div>
              </button>

              <button
                onClick={handleNextPage}
                disabled={currentPage >= totalPages - 1}
                className={`absolute right-0 top-0 bottom-0 w-12 sm:w-16 flex items-center justify-end pr-2 sm:pr-3 opacity-0 group-hover/pagecard:opacity-100 disabled:opacity-0 transition-opacity focus-visible:opacity-100 focus-visible:outline-none rounded-r-2xl text-white bg-gradient-to-l from-black/20 to-transparent cursor-pointer`}
                aria-label="Pagina successiva"
              >
                <div className="w-8 h-8 rounded-full bg-black/80 border border-white/20 shadow-md flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-transform backdrop-blur-sm">
                  <ArrowRight size={16} />
                </div>
              </button>

              {/* Kindle Chapter / Page Header */}
              <div className="border-b pb-3 mb-6 flex justify-between items-center text-xs font-bold opacity-70 border-current/15">
                <span className="uppercase tracking-wider">
                  {book.file_type.toUpperCase()} · PAGINA {currentPage + 1} DI {totalPages}
                </span>
                <span>
                  {progressPercent}% completato
                </span>
              </div>

              {/* Text block with Kindle Immersion Reading indicator */}
              <div
                className={`font-serif tracking-normal whitespace-pre-line ${themeClasses.titleText} ${fontSizeClass} ${lineHeightClass}`}
                style={{ wordBreak: 'break-word' }}
              >
                {isPlaying ? (
                  <div className={themeClasses.highlight}>
                    <span className="inline-block mr-2 font-sans font-black text-xs uppercase px-1.5 py-0.5 rounded bg-white text-black">
                      In ascolto
                    </span>
                    {currentText}
                  </div>
                ) : (
                  currentText
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ===================== KINDLE AUDIO CONTROLS BAR ===================== */}
      <footer
        className={`border-t pt-3 pb-safe px-4 shrink-0 transition-colors shadow-lg z-20 ${themeClasses.player}`}
        role="region"
        aria-label="Controlli audio stile Kindle"
      >
        <div className="max-w-2xl mx-auto flex flex-col gap-3">
          {/* --- 1. KINDLE PROGRESS SCRUBBER BAR --- */}
          <div className="flex flex-col gap-1.5 px-1">
            <div className={`flex items-center justify-between text-xs font-semibold ${themeClasses.metaText}`}>
              <span>
                Pagina <strong className={`font-bold ${themeClasses.titleText}`}>{currentPage + 1}</strong> di {totalPages}
              </span>
              <span className="tabular-nums">
                ~ {remainingMinutes} min rimanenti ({progressPercent}%)
              </span>
            </div>

            <div className="relative flex items-center">
              <input
                type="range"
                min="0"
                max={totalPages - 1}
                value={currentPage}
                onChange={(e) => changePage(parseInt(e.target.value, 10), isPlaying)}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-white bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label="Barra di avanzamento pagine Kindle"
                aria-valuemin={1}
                aria-valuemax={totalPages}
                aria-valuenow={currentPage + 1}
                aria-valuetext={`Pagina ${currentPage + 1} di ${totalPages}`}
              />
            </div>
          </div>

          {/* --- MAIN KINDLE PLAYBACK CONTROLS CLUSTER --- */}
          <div className="flex items-center justify-between gap-1 sm:gap-3 py-1">
            {/* Prev Page Button */}
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 0}
              className={`w-13 h-13 sm:w-15 sm:h-15 rounded-2xl border flex flex-col items-center justify-center transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black ${
                currentPage === 0 ? 'opacity-25 cursor-not-allowed' : themeClasses.btnSecondary
              }`}
              aria-label="Pagina precedente"
              title="Pagina Precedente"
            >
              <SkipBack size={24} />
            </button>

            {/* Kindle Rewind 30s Button */}
            <button
              onClick={handleRewind30}
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full border flex flex-col items-center justify-center transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black ${themeClasses.btnSecondary}`}
              aria-label="Riavvolgi di 30 secondi stile Kindle"
              title="Riavvolgi 30 secondi"
            >
              <RotateCcw size={22} />
              <span className="text-[10px] font-bold -mt-0.5 tracking-tighter">30s</span>
            </button>

            {/* Huge Center Kindle Play / Pause Button - Enlaraged for maximum accessibility & ergonomics */}
            <button
              onClick={handleTogglePlay}
              className={`w-[84px] h-[84px] sm:w-[96px] sm:h-[96px] md:w-[104px] md:h-[104px] rounded-full border-4 flex items-center justify-center shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black shrink-0 ${themeClasses.playBtn}`}
              aria-label={isLoadingAudio ? 'Caricamento voce AI...' : isPlaying ? 'Pausa lettura' : 'Avvia ascolto audiolibro'}
              title={isLoadingAudio ? 'Caricamento voce...' : isPlaying ? 'Pausa' : 'Riproduci'}
            >
              {isLoadingAudio ? (
                <Loader2 size={44} className="animate-spin text-white sm:w-12 sm:h-12" />
              ) : isPlaying ? (
                <Pause size={44} className="fill-current sm:w-12 sm:h-12" />
              ) : (
                <Play size={44} className="fill-current translate-x-1 sm:w-12 sm:h-12" />
              )}
            </button>

            {/* Kindle Forward 30s Button */}
            <button
              onClick={handleForward30}
              disabled={currentPage >= totalPages - 1}
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full border flex flex-col items-center justify-center transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black ${
                currentPage >= totalPages - 1 ? 'opacity-25 cursor-not-allowed' : themeClasses.btnSecondary
              }`}
              aria-label="Avanza di 30 secondi stile Kindle"
              title="Avanza 30 secondi"
            >
              <RotateCw size={22} />
              <span className="text-[10px] font-bold -mt-0.5 tracking-tighter">30s</span>
            </button>

            {/* Next Page Button */}
            <button
              onClick={handleNextPage}
              disabled={currentPage >= totalPages - 1}
              className={`w-13 h-13 sm:w-15 sm:h-15 rounded-2xl border flex flex-col items-center justify-center transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black ${
                currentPage >= totalPages - 1 ? 'opacity-25 cursor-not-allowed' : themeClasses.btnSecondary
              }`}
              aria-label="Pagina successiva"
              title="Pagina Successiva"
            >
              <SkipForward size={24} />
            </button>
          </div>
        </div>
      </footer>

      {/* ===================== MODAL: INDICE DEI CAPITOLI / PAGINE ===================== */}
      {showTocModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="toc-modal-title"
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div className="bg-black border border-zinc-800 rounded-3xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl text-white">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <BookOpen size={22} className="text-white" />
                <h3 id="toc-modal-title" className="text-lg font-bold text-white">
                  Indice Pagine ({totalPages})
                </h3>
              </div>
              <button
                onClick={() => setShowTocModal(false)}
                className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-700 text-white flex items-center justify-center hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white transition-colors"
                aria-label="Chiudi indice"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 flex flex-col gap-2">
              {sanitizedPages.map((p, idx) => {
                const isCurrent = idx === currentPage;
                const snippet = p.replace(/\s+/g, ' ').slice(0, 90);
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      changePage(idx, isPlaying);
                      setShowTocModal(false);
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition-all flex items-start justify-between gap-3 min-h-[64px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                      isCurrent
                        ? 'border-white bg-zinc-900 shadow-xs'
                        : 'border-zinc-850 bg-black hover:border-zinc-600 hover:bg-zinc-950'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">
                          Pagina {idx + 1}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] font-black uppercase bg-white text-black px-2 py-0.5 rounded-full">
                            In lettura
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 font-medium line-clamp-2 mt-1">
                        {snippet}...
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL: DISPLAY & CARATTERI KINDLE (Aa) ===================== */}
      {showDisplayModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="display-modal-title"
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div className="bg-black border border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-5 text-white">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-2">
                <Type size={22} className="text-white" />
                <h3 id="display-modal-title" className="text-lg font-bold text-white">
                  Impostazioni di Lettura (Aa)
                </h3>
              </div>
              <button
                onClick={() => setShowDisplayModal(false)}
                className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-700 text-white flex items-center justify-center hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white transition-colors"
                aria-label="Chiudi impostazioni schermo"
              >
                <X size={20} />
              </button>
            </div>

            {/* Tema di contrasto e sfondo */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase text-zinc-400 block">
                  Tema di Lettura & Contrasto
                </label>
                <span className="text-[11px] font-bold text-white">
                  {kindleTheme === 'black-white' || kindleTheme === 'black-yellow'
                    ? 'Bianco su Nero'
                    : kindleTheme === 'white'
                    ? 'Inverso'
                    : 'Notte Soft'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    id: 'black-white' as KindleTheme,
                    label: 'Bianco/Nero',
                    bg: 'bg-black text-white border-zinc-700',
                    checkColor: 'text-white',
                  },
                  {
                    id: 'dark' as KindleTheme,
                    label: 'Notte Soft',
                    bg: 'bg-[#18181B] text-white border-zinc-700',
                    checkColor: 'text-white',
                  },
                  {
                    id: 'white' as KindleTheme,
                    label: 'Inverso',
                    bg: 'bg-white text-black border-zinc-300',
                    checkColor: 'text-black',
                  },
                ].map((th) => {
                  const isSelected = kindleTheme === th.id || (th.id === 'black-white' && kindleTheme === 'black-yellow');
                  return (
                    <button
                      key={th.id}
                      onClick={() => {
                        setKindleTheme(th.id);
                        if (onUpdateSettings) {
                          onUpdateSettings({ ...settings, highContrastMode: th.id });
                        }
                      }}
                      className={`min-h-[52px] p-1.5 rounded-xl border font-bold text-[11px] flex flex-col items-center justify-center gap-1 transition-transform active:scale-95 ${th.bg} ${
                        isSelected ? 'ring-2 ring-white shadow-md font-extrabold' : 'opacity-80 hover:opacity-100'
                      }`}
                      title={th.label}
                    >
                      <span className="truncate w-full text-center">{th.label}</span>
                      {isSelected && <Check size={12} className={th.checkColor} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dimensione Carattere */}
            <div>
              <label className="text-xs font-bold uppercase text-zinc-400 block mb-2">
                Dimensione Carattere
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'normal' as const, label: 'Normale (A)' },
                  { id: 'large' as const, label: 'Grande (A+)' },
                  { id: 'huge' as const, label: 'Max (A++)' },
                ].map((fs) => (
                  <button
                    key={fs.id}
                    onClick={() => {
                      setFontSize(fs.id);
                      if (onUpdateSettings) onUpdateSettings({ ...settings, fontSize: fs.id });
                    }}
                    className={`min-h-[44px] rounded-xl border font-bold text-xs transition-colors ${
                      fontSize === fs.id
                        ? 'bg-white text-black border-white shadow-xs'
                        : 'bg-zinc-950 text-white border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900'
                    }`}
                  >
                    <span>{fs.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Interlinea */}
            <div>
              <label className="text-xs font-bold uppercase text-zinc-400 block mb-2">
                Interlinea Paragrafi
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'normal' as const, label: 'Compatta' },
                  { id: 'relaxed' as const, label: 'Standard' },
                  { id: 'loose' as const, label: 'Ampia' },
                ].map((lh) => (
                  <button
                    key={lh.id}
                    onClick={() => setLineHeight(lh.id)}
                    className={`min-h-[44px] rounded-xl border font-bold text-xs transition-colors ${
                      lineHeight === lh.id
                        ? 'bg-white text-black border-white shadow-xs'
                        : 'bg-zinc-950 text-white border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900'
                    }`}
                  >
                    <span>{lh.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL: VELOCITÀ AUDIO KINDLE ===================== */}
      {showSpeedModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="speed-modal-title"
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div className="bg-black border border-zinc-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl flex flex-col gap-4 text-white">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Gauge size={22} className="text-white" />
                <h3 id="speed-modal-title" className="text-lg font-bold text-white">
                  Velocità di Narrazione
                </h3>
              </div>
              <button
                onClick={() => setShowSpeedModal(false)}
                className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-700 text-white flex items-center justify-center hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white transition-colors"
                aria-label="Chiudi velocità"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-xs text-zinc-400 font-medium">
              Seleziona la velocità di riproduzione vocale:
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              {[0.75, 1.0, 1.25, 1.5, 1.75, 2.0].map((rate) => {
                const isSelected = Math.abs(settings.rate - rate) < 0.05;
                return (
                  <button
                    key={rate}
                    onClick={() => handleSpeedChange(rate)}
                    className={`min-h-[50px] rounded-xl border font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 ${
                      isSelected
                        ? 'bg-white text-black border-white shadow-xs'
                        : 'bg-zinc-950 text-white border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900'
                    }`}
                  >
                    <span>{rate}x</span>
                    {isSelected && <Check size={16} className="text-black" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL: SLEEP TIMER KINDLE ===================== */}
      {showSleepModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="sleep-modal-title"
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div className="bg-black border border-zinc-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl flex flex-col gap-4 text-white">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Moon size={22} className="text-white" />
                <h3 id="sleep-modal-title" className="text-lg font-bold text-white">
                  Timer di Sospensione
                </h3>
              </div>
              <button
                onClick={() => setShowSleepModal(false)}
                className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-700 text-white flex items-center justify-center hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white transition-colors"
                aria-label="Chiudi timer"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-xs text-zinc-400 font-medium">
              Ferma automaticamente la lettura dopo l'intervallo scelto:
            </p>

            <div className="flex flex-col gap-2">
              {[
                { id: 'off' as SleepTimerOption, label: 'Disattivato' },
                { id: 'end-of-page' as SleepTimerOption, label: 'Al termine di questa pagina' },
                { id: '15' as SleepTimerOption, label: '15 minuti' },
                { id: '30' as SleepTimerOption, label: '30 minuti' },
                { id: '45' as SleepTimerOption, label: '45 minuti' },
              ].map((opt) => {
                const isSelected = sleepTimerOption === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setSleepTimer(opt.id)}
                    className={`min-h-[48px] px-4 rounded-xl border font-bold text-xs flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-white text-black border-white shadow-xs'
                        : 'bg-zinc-950 text-white border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check size={16} className="text-black" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL: SELEZIONE VOCE AI / SISTEMA ===================== */}
      {showVoiceModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="voice-modal-title"
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-black border border-zinc-800 rounded-3xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl text-white">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles size={22} className="text-white" />
                <h3 id="voice-modal-title" className="text-lg font-bold text-white">
                  Seleziona Voce di Lettura
                </h3>
              </div>
              <button
                onClick={() => {
                  ttsService.stop();
                  setPreviewVoiceUri(null);
                  setShowVoiceModal(false);
                }}
                className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-700 text-white flex items-center justify-center hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white transition-colors"
                aria-label="Chiudi selezione voce"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-300">
                <Sparkles size={14} className="text-white" />
                <span>Voci AI Neurali in Italiano</span>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {ttsService.getAiVoices().map((v) => {
                  const isSelected = settings.voiceUri === v.uri;
                  const isPlayingThis = previewVoiceUri === v.uri;

                  return (
                    <div
                      key={v.uri}
                      onClick={() => handleVoiceSelect(v.uri, v.name)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          handleVoiceSelect(v.uri, v.name);
                        }
                      }}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                        isSelected
                          ? 'border-white bg-zinc-900 shadow-xs'
                          : 'border-zinc-850 bg-black hover:border-zinc-600 hover:bg-zinc-950'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {isSelected ? (
                          <span className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center font-black text-xs shrink-0">
                            <Check size={13} className="stroke-[3]" />
                          </span>
                        ) : (
                          <span className="w-5 h-5 rounded-full border border-zinc-700 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white truncate">
                              {v.name.split(' - ')[0]}
                            </span>
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-300 shrink-0">
                              {v.gender}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400 font-medium truncate mt-0.5">
                            {v.description}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isPlayingThis) {
                            ttsService.stop();
                            setPreviewVoiceUri(null);
                          } else {
                            setPreviewVoiceUri(v.uri);
                            ttsService.previewVoice({ ...settings, voiceUri: v.uri, voiceName: v.name }, undefined, () => {
                              setPreviewVoiceUri(null);
                            });
                          }
                        }}
                        className={`min-h-[38px] px-3 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ${
                          isPlayingThis
                            ? 'bg-white text-black border-white animate-pulse'
                            : 'bg-zinc-900 text-white border-zinc-700 hover:bg-zinc-800'
                        }`}
                        aria-label={`Ascolta anteprima ${v.name}`}
                      >
                        <Play size={13} className="fill-current" />
                        <span>{isPlayingThis ? 'Ferma' : 'Prova'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* System voices accordion / section */}
              {ttsService.getSystemVoices().length > 0 && (
                <>
                  <div className="pt-2 border-t border-zinc-800 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
                    <Volume2 size={14} className="text-white" />
                    <span>Voci di Sistema (Browser Offline)</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {ttsService.getSystemVoices().slice(0, 4).map((v) => {
                      const isSelected = settings.voiceUri === v.uri;
                      return (
                        <div
                          key={v.uri}
                          onClick={() => handleVoiceSelect(v.uri, v.name)}
                          role="button"
                          tabIndex={0}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all cursor-pointer ${
                            isSelected
                              ? 'border-white bg-zinc-900 shadow-xs'
                              : 'border-zinc-850 bg-black hover:border-zinc-600 hover:bg-zinc-950'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {isSelected ? (
                              <span className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center font-black text-xs shrink-0">
                                <Check size={13} className="stroke-[3]" />
                              </span>
                            ) : (
                              <span className="w-5 h-5 rounded-full border border-zinc-700 shrink-0" />
                            )}
                            <span className="text-xs font-semibold text-white truncate">
                              {v.name}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
