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
      coverColor: '#0284C7',
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
      className="fixed inset-0 z-50 bg-white text-gray-900 flex flex-col overflow-hidden font-sans select-text"
      role="region"
      aria-label="Pagina Risultati Scansione OCR"
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-60 bg-white text-gray-900 font-bold px-5 py-2.5 rounded-2xl shadow-2xl border border-gray-200 text-xs sm:text-sm animate-bounce"
        >
          {toastMessage}
        </div>
      )}

      {/* ===================== TOP HEADER ===================== */}
      <header className="border-b border-gray-200 bg-white px-3 sm:px-5 py-2.5 flex items-center justify-between gap-3 shrink-0 shadow-xs z-20">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <button
            onClick={() => {
              ttsService.stop();
              onBack();
            }}
            className="min-h-[46px] min-w-[46px] rounded-xl border border-gray-200 hover:border-gray-400 bg-white hover:bg-gray-50 flex items-center justify-center shrink-0 text-gray-800 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
            aria-label="Torna indietro"
            title="Torna indietro"
          >
            <ArrowLeft size={20} />
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
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1 text-sm font-bold text-gray-900 focus:outline-none focus:border-black"
                />
                <button
                  onClick={() => setIsEditingTitle(false)}
                  className="p-1 rounded-lg text-emerald-600 hover:bg-emerald-50"
                  aria-label="Conferma titolo"
                >
                  <Check size={18} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 group cursor-pointer" onClick={() => setIsEditingTitle(true)}>
                <h1 className="text-base sm:text-lg font-black text-gray-900 truncate leading-tight">
                  {title}
                </h1>
                <Edit3
                  size={14}
                  className="text-gray-400 group-hover:text-black shrink-0 transition-colors"
                  aria-hidden="true"
                />
              </div>
            )}
            <div className="flex items-center gap-1.5 mt-1 text-[11px] font-semibold text-gray-700 flex-wrap">
              <span className="inline-flex items-center gap-1 bg-white text-gray-900 px-2.5 py-0.5 rounded-md border border-gray-200 font-bold shadow-2xs">
                <Bot size={11} className="text-purple-600" />
                {session.engine || 'Gemini 3.8 Flash Vision'}
              </span>
              <span className="inline-flex items-center bg-white text-gray-700 px-2 py-0.5 rounded-md border border-gray-200 shadow-2xs">
                {session.confidence || 98}% confidenza
              </span>
              <span className="inline-flex items-center bg-white text-gray-700 px-2 py-0.5 rounded-md border border-gray-200 shadow-2xs">
                Pagina {activePageIndex + 1} di {pages.length}
              </span>
            </div>
          </div>
        </div>

        {/* Top Action Buttons: Salva & Apri nel Lettore */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleSaveBook}
            className="min-h-[44px] px-3 sm:px-4 rounded-xl border border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50 text-gray-900 font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black shadow-xs"
            aria-label="Salva libro nella libreria"
          >
            <Save size={16} className="text-gray-700" />
            <span className="hidden sm:inline">Salva nella Libreria</span>
            <span className="sm:hidden">Salva</span>
          </button>

          <button
            onClick={handleOpenReader}
            className="min-h-[44px] px-3.5 sm:px-5 rounded-xl bg-black hover:bg-gray-900 text-white font-black text-xs sm:text-sm flex items-center gap-2 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black shadow-md"
            aria-label="Apri nel Lettore Vora"
          >
            <BookOpen size={16} />
            <span>Leggi nel Lettore</span>
          </button>
        </div>
      </header>

      {/* ===================== CONTROLS TOOLBAR & AUDIO BAR ===================== */}
      <div className="bg-white border-b border-gray-200 px-3 sm:px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-xs z-10">
        {/* Playback Button with Audio status */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleTogglePlay}
            className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-black hover:bg-gray-800 text-white flex items-center justify-center transition-all active:scale-95 hover:scale-105 shadow-xl hover:shadow-2xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black shrink-0"
            aria-label={isLoadingAudio ? 'Caricamento audio...' : isPlaying ? 'Pausa ascolto' : 'Ascolta testo della pagina'}
            title={isPlaying ? 'Pausa' : 'Ascolta questa pagina'}
          >
            {isLoadingAudio ? (
              <Loader2 size={32} className="animate-spin text-white" />
            ) : isPlaying ? (
              <Pause size={32} className="fill-current" />
            ) : (
              <Play size={32} className="fill-current translate-x-1" />
            )}
          </button>

          <div>
            <span className="block text-sm font-black text-gray-900">
              {isLoadingAudio ? 'Sintesi vocale in corso...' : isPlaying ? 'In ascolto con voce AI' : 'Ascolta questa pagina'}
            </span>
            <span className="block text-xs text-gray-500 font-semibold">
              Voce: {settings.voiceName || 'Kore AI'} · {wordCount} parole
            </span>
          </div>
        </div>

        {/* View Mode Switcher (Testo / Foto / Affiancato) */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200">
          <button
            onClick={() => setViewMode('text')}
            className={`min-h-[36px] px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              viewMode === 'text'
                ? 'bg-white text-gray-900 shadow-xs font-extrabold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            aria-label="Mostra solo testo"
          >
            <FileText size={15} />
            <span>Testo</span>
          </button>

          {currentImageUrl && (
            <button
              onClick={() => setViewMode('photo')}
              className={`min-h-[36px] px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'photo'
                  ? 'bg-white text-gray-900 shadow-xs font-extrabold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              aria-label="Mostra foto originale della pagina"
            >
              <ImageIcon size={15} />
              <span>Foto Originale</span>
            </button>
          )}

          {currentImageUrl && (
            <button
              onClick={() => setViewMode('split')}
              className={`min-h-[36px] px-3 rounded-lg text-xs font-bold hidden sm:flex items-center gap-1.5 transition-all ${
                viewMode === 'split'
                  ? 'bg-white text-gray-900 shadow-xs font-extrabold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              aria-label="Mostra vista affiancata"
            >
              <Columns size={15} />
              <span>Affiancato</span>
            </button>
          )}
        </div>
      </div>

      {/* ===================== AI REFINEMENT ACTIONS TOOLBAR ===================== */}
      <div className="bg-white border-b border-gray-100 px-3 sm:px-5 py-2 flex items-center gap-2 overflow-x-auto shrink-0 scrollbar-none">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider shrink-0 flex items-center gap-1 mr-1">
          <Sparkles size={13} className="text-purple-600" />
          AI:
        </span>

        <button
          onClick={() => handleEnhanceWithAi('comprehensive')}
          disabled={isEnhancingAi || !currentText.trim()}
          className="min-h-[36px] px-3 rounded-full border border-purple-200 bg-white hover:bg-purple-50 text-purple-900 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shrink-0 shadow-2xs disabled:opacity-50"
          title="Corregge refusi, congiunge parole spezzate e ripristina la formattazione dei paragrafi con Gemini AI"
        >
          {isEnhancingAi && activeAiMode === 'comprehensive' ? (
            <Loader2 size={13} className="animate-spin text-purple-600" />
          ) : (
            <Wand2 size={13} className="text-purple-600" />
          )}
          <span>Ottimizza con Gemini AI</span>
        </button>

        <button
          onClick={() => handleEnhanceWithAi('speech_tts')}
          disabled={isEnhancingAi || !currentText.trim()}
          className="min-h-[36px] px-3 rounded-full border border-blue-200 bg-white hover:bg-blue-50 text-blue-900 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shrink-0 shadow-2xs disabled:opacity-50"
          title="Formatta ed espande abbreviazioni per una sintesi vocale naturale e fluida"
        >
          {isEnhancingAi && activeAiMode === 'speech_tts' ? (
            <Loader2 size={13} className="animate-spin text-blue-600" />
          ) : (
            <Volume2 size={13} className="text-blue-600" />
          )}
          <span>Formatta per Voce (TTS)</span>
        </button>

        <button
          onClick={() => handleEnhanceWithAi('typos')}
          disabled={isEnhancingAi || !currentText.trim()}
          className="min-h-[36px] px-3 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shrink-0 shadow-2xs disabled:opacity-50"
          title="Corregge i soli caratteri errati mantenendo il layout originale"
        >
          {isEnhancingAi && activeAiMode === 'typos' ? (
            <Loader2 size={13} className="animate-spin text-gray-700" />
          ) : (
            <SpellCheck size={13} className="text-gray-700" />
          )}
          <span>Correggi Refusi</span>
        </button>

        {currentRawText && currentRawText !== currentText && (
          <button
            onClick={handleRestoreRawText}
            disabled={isEnhancingAi}
            className="min-h-[36px] px-3 rounded-full border border-gray-200 bg-white hover:bg-gray-100 text-gray-600 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shrink-0 shadow-2xs"
            title="Annulla modifiche AI e ripristina la trascrizione grezza originale"
          >
            <RotateCcw size={13} />
            <span>Testo Originale</span>
          </button>
        )}
      </div>

      {/* Progress banner during new page capture */}
      {isCapturingNextPage && ocrProgress && (
        <div className="bg-purple-50 border-b border-purple-200 px-4 py-2 flex items-center justify-between text-xs font-bold text-purple-900 shrink-0">
          <div className="flex items-center gap-2">
            <Loader2 size={15} className="animate-spin text-purple-700" />
            <span>{ocrProgress.message}</span>
          </div>
          <span>{Math.round(ocrProgress.progress * 100)}%</span>
        </div>
      )}

      {captureError && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 flex items-center justify-between text-xs font-semibold text-red-800 shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} className="text-red-600" />
            <span>{captureError}</span>
          </div>
          <button onClick={() => setCaptureError(null)} className="text-xs underline font-bold">
            Chiudi
          </button>
        </div>
      )}

      {/* ===================== MAIN CONTENT CANVAS ===================== */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50 flex flex-col">
        <div className="max-w-5xl w-full mx-auto flex-1 flex flex-col gap-4">
          {/* VIEW: TEXT ONLY */}
          {viewMode === 'text' && (
            <div className="bg-white border border-gray-200 rounded-3xl p-5 sm:p-8 shadow-sm flex-1 flex flex-col gap-3 min-h-[380px]">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <span className="text-xs font-black uppercase tracking-wider text-gray-500">
                  Trascrizione Pagina {activePageIndex + 1}
                </span>
                <span className="text-xs font-semibold text-gray-400">
                  Modifica libera attiva
                </span>
              </div>
              <textarea
                value={currentText}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder="Nessun testo presente in questa pagina. Modifica o scansiona nuovamente..."
                className="w-full flex-1 min-h-[320px] bg-white text-gray-900 font-serif text-base sm:text-lg leading-relaxed sm:leading-loose p-2 border-0 focus:outline-none resize-none"
              />
            </div>
          )}

          {/* VIEW: PHOTO ONLY */}
          {viewMode === 'photo' && currentImageUrl && (
            <div className="bg-white border border-gray-200 rounded-3xl p-4 sm:p-6 shadow-sm flex-1 flex flex-col items-center justify-center min-h-[380px]">
              <div className="w-full flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                <span className="text-xs font-black uppercase tracking-wider text-gray-500">
                  Fotografia Originale · Pagina {activePageIndex + 1}
                </span>
                <button
                  onClick={() => setViewMode('text')}
                  className="text-xs text-blue-600 font-bold hover:underline"
                >
                  Torna al Testo
                </button>
              </div>
              <div className="max-h-[65vh] overflow-auto flex items-center justify-center w-full">
                <img
                  src={currentImageUrl}
                  alt={`Pagina ${activePageIndex + 1} originale`}
                  className="max-h-[60vh] max-w-full object-contain rounded-xl border border-gray-200 shadow-md"
                />
              </div>
            </div>
          )}

          {/* VIEW: SPLIT VIEW (Side by side) */}
          {viewMode === 'split' && currentImageUrl && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
              {/* Left: Original Photograph */}
              <div className="bg-white border border-gray-200 rounded-3xl p-4 shadow-sm flex flex-col">
                <span className="text-xs font-black uppercase tracking-wider text-gray-500 mb-2 border-b border-gray-100 pb-2">
                  Fotografia Originale
                </span>
                <div className="flex-1 flex items-center justify-center overflow-auto max-h-[65vh]">
                  <img
                    src={currentImageUrl}
                    alt="Foto originale"
                    className="max-h-[58vh] max-w-full object-contain rounded-xl border border-gray-200"
                  />
                </div>
              </div>

              {/* Right: Editable Text */}
              <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm flex flex-col">
                <span className="text-xs font-black uppercase tracking-wider text-gray-500 mb-2 border-b border-gray-100 pb-2">
                  Testo Trascritto (Modificabile)
                </span>
                <textarea
                  value={currentText}
                  onChange={(e) => handleTextChange(e.target.value)}
                  className="w-full flex-1 min-h-[300px] bg-white text-gray-900 font-serif text-base leading-relaxed p-2 border-0 focus:outline-none resize-none"
                />
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ===================== BOTTOM PAGES STRIP & NEW PAGE BUTTON ===================== */}
      <footer className="border-t border-gray-200 bg-white px-3 sm:px-5 py-2.5 flex items-center justify-between gap-3 shrink-0 shadow-lg z-20">
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
              className={`min-h-[40px] px-3.5 rounded-xl border text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                idx === activePageIndex
                  ? 'bg-black text-white border-black shadow-xs font-extrabold'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
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
            className="min-h-[40px] px-3.5 rounded-xl border border-dashed border-gray-400 hover:border-black bg-white hover:bg-gray-50 text-gray-900 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shrink-0"
            aria-label="Aggiungi un'altra pagina"
            title="Scatta foto per aggiungere la pagina successiva al libro"
          >
            <Plus size={15} />
            <Camera size={14} className="text-blue-600" />
            <span className="hidden sm:inline">Aggiungi Pagina</span>
            <span className="sm:hidden">+ Pagina</span>
          </button>
        </div>

        {/* Delete current page if multi-page */}
        {pages.length > 1 && (
          <button
            onClick={handleRemoveCurrentPage}
            className="w-10 h-10 rounded-xl border border-gray-200 hover:border-red-300 text-gray-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center shrink-0 transition-colors"
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
