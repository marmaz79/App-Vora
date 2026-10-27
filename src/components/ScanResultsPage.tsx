import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Play,
  Pause,
  Loader2,
  Sparkles,
  BookOpen,
  Save,
  Camera,
  Image as ImageIcon,
  Wand2,
  Volume2,
  RotateCcw,
  SpellCheck,
  Trash2,
  Plus,
  Check,
  Columns,
  FileText,
  AlertCircle,
  Edit3,
  Bot,
  Sliders,
  CheckCircle,
} from 'lucide-react';
import { Book, TtsSettings } from '../types';
import { ttsService } from '../services/ttsService';
import { tesseractOcr, AiOptimizationMode, OcrProgress } from '../services/tesseractOcr';
import { fileParser } from '../services/fileParser';
import { ScanProgressCircle } from './ScanProgressCircle';

export interface ScanSessionData {
  bookId: string;
  title: string;
  pages: string[];
  imageUrls: (string | null)[];
  rawPages: string[];
  engine: string;
  confidence: number;
  isAiOptimized: boolean;
  currentPageIndex: number;
}

interface ScanResultsPageProps {
  session: ScanSessionData;
  settings: TtsSettings;
  onBack: () => void;
  onOpenInReader: (book: Book) => void;
  onSaveToLibrary: (book: Book) => void;
}

export const ScanResultsPage: React.FC<ScanResultsPageProps> = ({
  session,
  settings,
  onBack,
  onOpenInReader,
  onSaveToLibrary,
}) => {
  const [title, setTitle] = useState(session.title || 'Nuova Scansione');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [pages, setPages] = useState<string[]>(
    session.pages && session.pages.length > 0 ? session.pages : ['']
  );
  const [rawPages, setRawPages] = useState<string[]>(
    session.rawPages && session.rawPages.length > 0 ? session.rawPages : session.pages
  );
  const [imageUrls, setImageUrls] = useState<(string | null)[]>(
    session.imageUrls && session.imageUrls.length > 0 ? session.imageUrls : [null]
  );
  const [activePageIndex, setActivePageIndex] = useState(session.currentPageIndex || 0);

  // View mode: 'text' (only text), 'photo' (only image), 'split' (side by side)
  const [viewMode, setViewMode] = useState<'text' | 'photo' | 'split'>('text');

  // Audio Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);

  // AI Enhancement state
  const [isEnhancingAi, setIsEnhancingAi] = useState(false);
  const [activeAiMode, setActiveAiMode] = useState<AiOptimizationMode | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Multi-page capture state
  const [isCapturingNextPage, setIsCapturingNextPage] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<OcrProgress | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);

  const fileInputCameraRef = useRef<HTMLInputElement>(null);
  const fileInputGalleryRef = useRef<HTMLInputElement>(null);

  const currentText = pages[activePageIndex] || '';
  const currentRawText = rawPages[activePageIndex] || '';
  const currentImageUrl = imageUrls[activePageIndex] || null;

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      ttsService.stop();
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Text changes on current page
  const handleTextChange = (newText: string) => {
    const updated = [...pages];
    updated[activePageIndex] = newText;
    setPages(updated);
  };

  // Audio Play / Pause
  const handleTogglePlay = () => {
    if (isPlaying || isLoadingAudio) {
      ttsService.stop();
      setIsPlaying(false);
      setIsLoadingAudio(false);
      return;
    }

    if (!currentText.trim()) {
      showToast('Nessun testo presente in questa pagina da ascoltare.');
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
        } else if (event === 'error') {
          setIsLoadingAudio(false);
          setIsPlaying(false);
          console.warn('TTS playback error', err);
        }
      })
      .catch((err) => {
        setIsLoadingAudio(false);
        setIsPlaying(false);
        if (err?.name !== 'AbortError') {
          console.warn('Errore sintesi:', err);
        }
      });
  };

  // AI Text Enhancement on current page
  const handleEnhanceWithAi = async (mode: AiOptimizationMode = 'comprehensive') => {
    if (!currentText.trim() || isEnhancingAi) return;

    setIsEnhancingAi(true);
    setActiveAiMode(mode);

    try {
      const res = await tesseractOcr.optimizeTextWithAi(currentText, mode);
      if (res.text) {
        handleTextChange(res.text);

        let desc = 'Testo ottimizzato con Gemini AI';
        if (mode === 'speech_tts') desc = 'Testo formattato per la lettura vocale (TTS)';
        else if (mode === 'typos') desc = 'Refusi corretti mantenendo la formattazione';

        showToast(`${desc} (${res.engine})`);
      }
    } catch (err: any) {
      console.warn('AI enhancement fallback:', err);
      const enhanced = fileParser.enhanceText(currentText);
      handleTextChange(enhanced);
      showToast('Testo ripulito con filtri tipografici locali.');
    } finally {
      setIsEnhancingAi(false);
      setActiveAiMode(null);
    }
  };

  // Restore raw original text
  const handleRestoreRawText = () => {
    if (currentRawText && currentRawText !== currentText) {
      handleTextChange(currentRawText);
      showToast('Ripristinato il testo grezzo originale della scansione.');
    }
  };

  // Add a new page to the book
  const handleAddNewPageFile = async (file: File) => {
    if (!file) return;

    setIsCapturingNextPage(true);
    setCaptureError(null);

    const objectUrl = URL.createObjectURL(file);

    try {
      setOcrProgress({
        status: 'init',
        progress: 0.1,
        message: 'Elaborazione della nuova pagina...',
      });

      const result = await tesseractOcr.recognize(file, {
        engine: 'ai-vision',
        language: 'ita',
        enhanceContrast: true,
        autoOptimizeAi: true,
        onProgress: (prog) => setOcrProgress(prog),
      });

      const extracted = result.text.trim() || `(Pagina ${pages.length + 1} - Nessun testo rilevato)`;
      const newPages = [...pages, extracted];
      const newRawPages = [...rawPages, result.rawText || extracted];
      const newImageUrls = [...imageUrls, objectUrl];

      setPages(newPages);
      setRawPages(newRawPages);
      setImageUrls(newImageUrls);
      setActivePageIndex(newPages.length - 1);

      showToast(`Pagina ${newPages.length} scansionata e aggiunta con successo!`);
    } catch (err: any) {
      console.error('Errore aggiunta pagina:', err);
      setCaptureError(err?.message || 'Errore durante la scansione della nuova pagina.');
    } finally {
      setIsCapturingNextPage(false);
      setOcrProgress(null);
    }
  };

  // Remove current page
  const handleRemoveCurrentPage = () => {
    if (pages.length <= 1) {
      showToast('Il documento deve contenere almeno una pagina.');
      return;
    }

    const nextPages = pages.filter((_, idx) => idx !== activePageIndex);
    const nextRawPages = rawPages.filter((_, idx) => idx !== activePageIndex);
    const nextImageUrls = imageUrls.filter((_, idx) => idx !== activePageIndex);

    setPages(nextPages);
    setRawPages(nextRawPages);
    setImageUrls(nextImageUrls);
    setActivePageIndex((prev) => Math.max(0, Math.min(nextPages.length - 1, prev - 1)));
    showToast('Pagina eliminata.');
  };

  // Construct Book object
  const constructBook = (): Book => {
    const finalPages = pages.map((p) => fileParser.enhanceText(p)).filter((p) => p.trim().length > 0);
    const fallbackPages = finalPages.length > 0 ? finalPages : ['(Documento vuoto)'];

    return {
      book_id: session.bookId || `scan-${Date.now()}`,
      owner_id: 'user-default-1',
      title: title.trim() || `Scansione OCR ${new Date().toLocaleDateString('it-IT')}`,
      file_type: 'scan',
      size: fallbackPages.join(' ').length,
      pages: fallbackPages,
      source: 'scan',
      ocr_engine: session.engine || 'Gemini AI Vision',
      created_at: new Date().toISOString(),
      coverColor: '#FFFFFF',
      currentPage: 0,
    };
  };

  // Open in ReaderView
  const handleOpenReader = () => {
    ttsService.stop();
    const book = constructBook();
    onOpenInReader(book);
  };

  // Save to library
  const handleSaveBook = () => {
    ttsService.stop();
    const book = constructBook();
    onSaveToLibrary(book);
  };

  const wordCount = currentText.trim() ? currentText.trim().split(/\s+/).length : 0;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#EFF8F7] text-slate-800 flex flex-col overflow-hidden font-sans select-text"
      role="region"
      aria-label="Pagina Risultati Scansione OCR"
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-60 bg-[#FFD23F] text-slate-900 font-black px-5 py-2.5 rounded-full shadow-accent-glow border border-[#1E8C86]/20 text-xs sm:text-sm animate-bounce"
        >
          {toastMessage}
        </div>
      )}

      {/* ===================== TOP HEADER (Flip7 Deep Teal) ===================== */}
      <header className="border-b border-[#2BA8A2]/30 bg-[#1E8C86] text-white px-3 sm:px-5 py-3 flex items-center justify-between gap-3 shrink-0 shadow-md z-20">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <button
            onClick={() => {
              ttsService.stop();
              onBack();
            }}
            className="w-10 h-10 rounded-full border border-white/30 hover:bg-white/15 bg-transparent flex items-center justify-center shrink-0 text-white transition-all active:scale-95"
            aria-label="Torna indietro"
            title="Torna indietro"
          >
            <ArrowLeft size={19} className="stroke-[2.5]" />
          </button>

          {/* Title Editor */}
          <div className="min-w-0 flex-1">
            {isEditingTitle ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={() => setIsEditingTitle(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') setIsEditingTitle(false);
                  }}
                  autoFocus
                  className="w-full bg-[#FFF8E7] border-2 border-[#FFD23F] rounded-xl px-2.5 py-1 text-sm font-black text-slate-900 focus:outline-none"
                />
                <button
                  onClick={() => setIsEditingTitle(false)}
                  className="p-1 rounded-full text-white hover:bg-white/20"
                  aria-label="Conferma titolo"
                >
                  <Check size={18} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 group cursor-pointer" onClick={() => setIsEditingTitle(true)}>
                <h1 className="text-base sm:text-lg font-black text-white truncate leading-tight">
                  {title}
                </h1>
                <Edit3
                  size={14}
                  className="text-white/70 group-hover:text-white shrink-0 transition-colors"
                  aria-hidden="true"
                />
              </div>
            )}
            <div className="flex items-center gap-1.5 mt-1 text-[11px] font-bold text-white/80 flex-wrap">
              <span className="inline-flex items-center gap-1 bg-white/15 text-white px-2 py-0.5 rounded-full border border-white/20 shadow-2xs font-bold">
                <Bot size={11} className="text-[#FFD23F]" />
                {session.engine || 'Gemini 3.8 Flash Vision'}
              </span>
              <span className="inline-flex items-center bg-white/15 text-white px-2 py-0.5 rounded-full border border-white/20 shadow-2xs">
                {session.confidence || 98}% confidenza
              </span>
              <span className="inline-flex items-center bg-white/15 text-white px-2 py-0.5 rounded-full border border-white/20 shadow-2xs">
                Pagina {activePageIndex + 1} di {pages.length}
              </span>
            </div>
          </div>
        </div>

        {/* Top Action Buttons: Salva & Apri nel Lettore */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleSaveBook}
            className="min-h-[40px] px-3.5 sm:px-4 rounded-full border border-white/40 bg-white/10 hover:bg-white/20 text-white font-black text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-xs"
            aria-label="Salva libro nella libreria"
          >
            <Save size={15} />
            <span className="hidden sm:inline">Salva nella Libreria</span>
            <span className="sm:hidden">Salva</span>
          </button>

          <button
            onClick={handleOpenReader}
            className="min-h-[40px] px-4 sm:px-5 rounded-full bg-[#FFD23F] hover:bg-[#FFE47A] text-slate-900 font-black text-xs sm:text-sm flex items-center gap-1.5 transition-all active:scale-95 shadow-accent-glow"
            aria-label="Apri nel Lettore Vora"
          >
            <BookOpen size={16} />
            <span>Leggi nel Lettore</span>
          </button>
        </div>
      </header>

      {/* ===================== CONTROLS TOOLBAR & AUDIO BAR ===================== */}
      <div className="bg-white border-b-2 border-dashed border-[#2BA8A2]/20 px-3 sm:px-5 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-xs z-10">
        {/* Playback Button with Audio status */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleTogglePlay}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#FFD23F] hover:bg-[#FFE47A] text-slate-900 flex items-center justify-center transition-all active:scale-95 shadow-accent-glow shrink-0"
            aria-label={isLoadingAudio ? 'Caricamento audio...' : isPlaying ? 'Pausa ascolto' : 'Ascolta testo della pagina'}
            title={isPlaying ? 'Pausa' : 'Ascolta questa pagina'}
          >
            {isLoadingAudio ? (
              <Loader2 size={28} className="animate-spin text-slate-900" />
            ) : isPlaying ? (
              <Pause size={28} className="fill-current text-slate-900" />
            ) : (
              <Play size={28} className="fill-current text-slate-900 translate-x-0.5" />
            )}
          </button>

          <div>
            <span className="block text-sm font-black text-[#1E8C86]">
              {isLoadingAudio ? 'Sintesi vocale in corso...' : isPlaying ? 'In ascolto con voce AI' : 'Ascolta questa pagina'}
            </span>
            <span className="block text-xs text-slate-500 font-bold">
              Voce: {settings.voiceName || 'Chiara (AI)'} · {wordCount} parole
            </span>
          </div>
        </div>

        {/* View Mode Switcher (Testo / Foto / Affiancato) */}
        <div className="flex items-center gap-1 bg-[#E8F6F5] p-1 rounded-full border border-[#2BA8A2]/30">
          <button
            onClick={() => setViewMode('text')}
            className={`min-h-[34px] px-3.5 rounded-full text-xs font-black flex items-center gap-1.5 transition-all active:scale-95 ${
              viewMode === 'text'
                ? 'bg-[#2BA8A2] text-white shadow-teal-glow'
                : 'text-slate-600 hover:text-[#1E8C86]'
            }`}
            aria-label="Mostra solo testo"
          >
            <FileText size={14} />
            <span>Testo</span>
          </button>

          {currentImageUrl && (
            <button
              onClick={() => setViewMode('photo')}
              className={`min-h-[34px] px-3.5 rounded-full text-xs font-black flex items-center gap-1.5 transition-all active:scale-95 ${
                viewMode === 'photo'
                  ? 'bg-[#2BA8A2] text-white shadow-teal-glow'
                  : 'text-slate-600 hover:text-[#1E8C86]'
              }`}
              aria-label="Mostra foto originale della pagina"
            >
              <ImageIcon size={14} />
              <span>Foto Originale</span>
            </button>
          )}

          {currentImageUrl && (
            <button
              onClick={() => setViewMode('split')}
              className={`min-h-[34px] px-3.5 rounded-full text-xs font-black hidden sm:flex items-center gap-1.5 transition-all active:scale-95 ${
                viewMode === 'split'
                  ? 'bg-[#2BA8A2] text-white shadow-teal-glow'
                  : 'text-slate-600 hover:text-[#1E8C86]'
              }`}
              aria-label="Mostra vista affiancata"
            >
              <Columns size={14} />
              <span>Affiancato</span>
            </button>
          )}
        </div>
      </div>

      {/* ===================== AI REFINEMENT ACTIONS TOOLBAR ===================== */}
      <div className="bg-[#EFF8F7] border-b-2 border-dashed border-[#2BA8A2]/20 px-3 sm:px-5 py-2 flex items-center gap-2 overflow-x-auto shrink-0 scrollbar-none">
        <span className="text-xs font-black text-[#1E8C86] uppercase tracking-wider shrink-0 flex items-center gap-1 mr-1">
          <Sparkles size={13} className="text-[#FFD23F] fill-[#FFD23F]" />
          AI:
        </span>

        <button
          onClick={() => handleEnhanceWithAi('comprehensive')}
          disabled={isEnhancingAi || !currentText.trim()}
          className="min-h-[34px] px-3.5 rounded-full border border-[#2BA8A2]/30 bg-white hover:bg-[#E8F6F5] text-[#1E8C86] text-xs font-black flex items-center gap-1.5 transition-all active:scale-95 shrink-0 shadow-xs disabled:opacity-50"
          title="Corregge refusi, congiunge parole spezzate e ripristina la formattazione dei paragrafi con Gemini AI"
        >
          {isEnhancingAi && activeAiMode === 'comprehensive' ? (
            <Loader2 size={13} className="animate-spin text-[#1E8C86]" />
          ) : (
            <Wand2 size={13} className="text-[#1E8C86]" />
          )}
          <span>Ottimizza con Gemini AI</span>
        </button>

        <button
          onClick={() => handleEnhanceWithAi('speech_tts')}
          disabled={isEnhancingAi || !currentText.trim()}
          className="min-h-[34px] px-3.5 rounded-full border border-[#2BA8A2]/30 bg-white hover:bg-[#E8F6F5] text-[#1E8C86] text-xs font-black flex items-center gap-1.5 transition-all active:scale-95 shrink-0 shadow-xs disabled:opacity-50"
          title="Formatta ed espande abbreviazioni per una sintesi vocale naturale e fluida"
        >
          {isEnhancingAi && activeAiMode === 'speech_tts' ? (
            <Loader2 size={13} className="animate-spin text-[#1E8C86]" />
          ) : (
            <Volume2 size={13} className="text-[#5DADE2]" />
          )}
          <span>Formatta per Voce (TTS)</span>
        </button>

        <button
          onClick={() => handleEnhanceWithAi('typos')}
          disabled={isEnhancingAi || !currentText.trim()}
          className="min-h-[34px] px-3.5 rounded-full border border-[#2BA8A2]/30 bg-white hover:bg-[#E8F6F5] text-[#1E8C86] text-xs font-black flex items-center gap-1.5 transition-all active:scale-95 shrink-0 shadow-xs disabled:opacity-50"
          title="Corregge i soli caratteri errati mantenendo il layout originale"
        >
          {isEnhancingAi && activeAiMode === 'typos' ? (
            <Loader2 size={13} className="animate-spin text-[#1E8C86]" />
          ) : (
            <SpellCheck size={13} className="text-[#EF6C4A]" />
          )}
          <span>Correggi Refusi</span>
        </button>

        {currentRawText && currentRawText !== currentText && (
          <button
            onClick={handleRestoreRawText}
            disabled={isEnhancingAi}
            className="min-h-[34px] px-3.5 rounded-full border border-[#2BA8A2]/30 bg-white hover:bg-[#E8F6F5] text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shrink-0 shadow-xs"
            title="Annulla modifiche AI e ripristina la trascrizione grezza originale"
          >
            <RotateCcw size={13} />
            <span>Testo Originale</span>
          </button>
        )}
      </div>

      {/* Progress banner during new page capture */}
      {isCapturingNextPage && ocrProgress && (
        <div className="bg-[#E8F6F5] border-b-2 border-[#2BA8A2]/30 px-4 py-2.5 flex items-center justify-between text-xs font-black text-[#1E8C86] shrink-0">
          <div className="flex items-center gap-2">
            <Loader2 size={15} className="animate-spin text-[#2BA8A2]" />
            <span>{ocrProgress.message}</span>
          </div>
          <span>{Math.round(ocrProgress.progress * 100)}%</span>
        </div>
      )}

      {captureError && (
        <div className="bg-[#EF6C4A]/10 border-b-2 border-[#EF6C4A]/30 px-4 py-2.5 flex items-center justify-between text-xs font-bold text-[#D45233] shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} className="text-[#EF6C4A]" />
            <span>{captureError}</span>
          </div>
          <button onClick={() => setCaptureError(null)} className="text-xs underline font-black">
            Chiudi
          </button>
        </div>
      )}

      {/* ===================== MAIN CONTENT CANVAS ===================== */}
      <main className="flex-1 overflow-y-auto p-3 sm:p-5 bg-[#EFF8F7] flex flex-col">
        <div className="max-w-5xl w-full mx-auto flex-1 flex flex-col gap-4">
          {/* VIEW: TEXT ONLY */}
          {viewMode === 'text' && (
            <div className="bg-white border-2 border-[#2BA8A2]/20 rounded-3xl p-5 sm:p-7 shadow-card flex-1 flex flex-col gap-3 min-h-[380px]">
              <div className="flex items-center justify-between border-b-2 border-dashed border-[#2BA8A2]/20 pb-3">
                <span className="text-xs font-black uppercase tracking-wider text-[#1E8C86]">
                  Trascrizione Pagina {activePageIndex + 1}
                </span>
                <span className="text-xs font-bold text-slate-500">
                  Modifica libera attiva
                </span>
              </div>
              <textarea
                value={currentText}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder="Nessun testo presente in questa pagina. Modifica o scansiona nuovamente..."
                className="w-full flex-1 min-h-[320px] bg-[#FFF8E7]/40 text-slate-900 font-serif text-base sm:text-lg leading-relaxed sm:leading-loose p-4 rounded-2xl border-2 border-[#2BA8A2]/15 focus:border-[#2BA8A2] focus:outline-none resize-none placeholder-slate-400 transition-all"
              />
            </div>
          )}

          {/* VIEW: PHOTO ONLY */}
          {viewMode === 'photo' && currentImageUrl && (
            <div className="bg-white border-2 border-[#2BA8A2]/20 rounded-3xl p-4 sm:p-6 shadow-card flex-1 flex flex-col items-center justify-center min-h-[380px]">
              <div className="w-full flex items-center justify-between border-b-2 border-dashed border-[#2BA8A2]/20 pb-3 mb-4">
                <span className="text-xs font-black uppercase tracking-wider text-[#1E8C86]">
                  Fotografia Originale · Pagina {activePageIndex + 1}
                </span>
                <button
                  onClick={() => setViewMode('text')}
                  className="text-xs text-[#1E8C86] font-black underline"
                >
                  Torna al Testo
                </button>
              </div>
              <div className="max-h-[65vh] overflow-auto flex items-center justify-center w-full">
                <img
                  src={currentImageUrl}
                  alt={`Pagina ${activePageIndex + 1} originale`}
                  className="max-h-[60vh] max-w-full object-contain rounded-2xl border-2 border-[#2BA8A2]/30 shadow-card"
                />
              </div>
            </div>
          )}

          {/* VIEW: SPLIT VIEW (Side by side) */}
          {viewMode === 'split' && currentImageUrl && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
              {/* Left: Original Photograph */}
              <div className="bg-white border-2 border-[#2BA8A2]/20 rounded-3xl p-4 shadow-card flex flex-col">
                <span className="text-xs font-black uppercase tracking-wider text-[#1E8C86] mb-2 border-b-2 border-dashed border-[#2BA8A2]/20 pb-2">
                  Fotografia Originale
                </span>
                <div className="flex-1 flex items-center justify-center overflow-auto max-h-[65vh]">
                  <img
                    src={currentImageUrl}
                    alt="Foto originale"
                    className="max-h-[58vh] max-w-full object-contain rounded-2xl border border-[#2BA8A2]/30"
                  />
                </div>
              </div>

              {/* Right: Editable Text */}
              <div className="bg-white border-2 border-[#2BA8A2]/20 rounded-3xl p-4 sm:p-5 shadow-card flex flex-col">
                <span className="text-xs font-black uppercase tracking-wider text-[#1E8C86] mb-2 border-b-2 border-dashed border-[#2BA8A2]/20 pb-2">
                  Testo Trascritto (Modificabile)
                </span>
                <textarea
                  value={currentText}
                  onChange={(e) => handleTextChange(e.target.value)}
                  className="w-full flex-1 min-h-[300px] bg-[#FFF8E7]/40 text-slate-900 font-serif text-base leading-relaxed p-3.5 rounded-2xl border-2 border-[#2BA8A2]/15 focus:border-[#2BA8A2] focus:outline-none resize-none placeholder-slate-400"
                />
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ===================== BOTTOM PAGES STRIP & NEW PAGE BUTTON ===================== */}
      <footer className="border-t-2 border-dashed border-[#2BA8A2]/20 bg-white px-3 sm:px-5 py-2.5 flex items-center justify-between gap-3 shrink-0 shadow-lg z-20">
        {/* Pages Pagination Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto min-w-0 flex-1 py-1">
          {pages.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                if (isPlaying) ttsService.stop();
                setIsPlaying(false);
                setActivePageIndex(idx);
              }}
              className={`min-h-[38px] px-4 rounded-full border text-xs font-black transition-all shrink-0 flex items-center gap-1.5 active:scale-95 ${
                idx === activePageIndex
                  ? 'bg-[#2BA8A2] text-white border-[#2BA8A2] shadow-teal-glow'
                  : 'bg-[#E8F6F5] text-[#1E8C86] border-[#2BA8A2]/30 hover:bg-[#3CC4BD]/20'
              }`}
              aria-label={`Vai a Pagina ${idx + 1}`}
            >
              <span>Pagina {idx + 1}</span>
            </button>
          ))}

          {/* Add Page Button */}
          <button
            onClick={() => fileInputCameraRef.current?.click()}
            disabled={isCapturingNextPage}
            className="min-h-[38px] px-4 rounded-full border-2 border-dashed border-[#FFD23F] bg-[#FFF8E7] hover:bg-[#FFE47A]/30 text-[#E6B800] text-xs font-black flex items-center gap-1.5 transition-all active:scale-95 shrink-0 shadow-xs"
            aria-label="Aggiungi un'altra pagina"
            title="Scatta foto per aggiungere la pagina successiva al libro"
          >
            <Plus size={15} />
            <Camera size={14} className="text-[#EF6C4A]" />
            <span className="hidden sm:inline">Aggiungi Pagina</span>
            <span className="sm:hidden">+ Pagina</span>
          </button>
        </div>

        {/* Delete current page if multi-page */}
        {pages.length > 1 && (
          <button
            onClick={handleRemoveCurrentPage}
            className="w-10 h-10 rounded-full border border-[#EF6C4A]/30 text-[#EF6C4A] hover:bg-[#EF6C4A]/10 flex items-center justify-center shrink-0 transition-colors active:scale-95"
            aria-label="Elimina questa pagina"
            title="Elimina questa pagina dal libro"
          >
            <Trash2 size={16} />
          </button>
        )}
      </footer>

      {/* Scanning Circular Progress Overlay for New Page - Google Drive Style */}
      {isCapturingNextPage && (
        <ScanProgressCircle
          fullOverlay={true}
          progress={ocrProgress?.progress || 0.1}
          message={ocrProgress?.message || 'Scansione della nuova pagina in corso...'}
          engine="Gemini AI Vision"
          fileName={`Pagina-${pages.length + 1}-scansione.jpg`}
          subtitle="Acquisizione ottica, rimozione riflessi e unione della nuova pagina al libro"
          onCancel={() => setIsCapturingNextPage(false)}
        />
      )}

      {/* Hidden file inputs for camera / gallery next-page captures */}
      <input
        ref={fileInputCameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleAddNewPageFile(e.target.files[0]);
          }
          e.target.value = '';
        }}
        className="hidden"
      />
      <input
        ref={fileInputGalleryRef}
        type="file"
        accept="image/*,.png,.jpg,.jpeg,.webp,.bmp"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleAddNewPageFile(e.target.files[0]);
          }
          e.target.value = '';
        }}
        className="hidden"
      />
    </div>
  );
};
