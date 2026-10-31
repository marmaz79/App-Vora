import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Video,
  Sparkles,
  Link as LinkIcon,
  Play,
  FileText,
  Volume2,
  Check,
  AlertCircle,
  Loader2,
  Copy,
  BookOpen,
  Headphones,
  Sliders,
  ListFilter,
  ExternalLink,
  RotateCcw,
  Languages,
} from 'lucide-react';
import { Book } from '../types';
import { videoTranscribeService, VideoProcessResult } from '../services/videoTranscribeService';

interface VideoTranscribeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddBook: (book: Book) => void;
  onOpenReader?: (book: Book) => void;
}

export const VideoTranscribeModal: React.FC<VideoTranscribeModalProps> = ({
  isOpen,
  onClose,
  onAddBook,
  onOpenReader,
}) => {
  const [videoUrl, setVideoUrl] = useState('');
  const [language, setLanguage] = useState<'ita' | 'eng' | 'fra' | 'esp'>('ita');
  const [detailLevel, setDetailLevel] = useState<'concise' | 'standard' | 'detailed'>('standard');
  const [contentMode, setContentMode] = useState<'both' | 'summary' | 'transcription'>('both');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VideoProcessResult | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'transcription'>('summary');
  const [copiedNotice, setCopiedNotice] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setCopiedNotice(null);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    } else {
      setVideoUrl('');
      setResult(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle paste directly from clipboard
  const handlePasteClipboard = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          setVideoUrl(text.trim());
          setError(null);
          return;
        }
      }
    } catch {}

    const cached =
      sessionStorage.getItem('vora_last_copied_text') ||
      localStorage.getItem('vora_last_copied_text');
    if (cached && cached.trim()) {
      setVideoUrl(cached.trim());
      setError(null);
    }
  };

  const handleInsertSample = (url: string) => {
    setVideoUrl(url);
    setError(null);
  };

  const handleProcessVideo = async () => {
    const trimmed = videoUrl.trim();
    if (!trimmed) {
      setError('Inserisci o incolla il link del video o social (es. Instagram Reel, TikTok, YouTube, X, Facebook, MP4).');
      inputRef.current?.focus();
      return;
    }

    if (!videoTranscribeService.isValidVideoUrl(trimmed)) {
      setError('Inserisci un URL valido (es. Instagram Reel, TikTok, YouTube, Facebook, X, Vimeo o file MP4)');
      return;
    }

    setError(null);
    setIsLoading(true);
    setLoadingStep('Connessione al video/reel e rilevamento metadati...');

    try {
      setTimeout(() => {
        setLoadingStep('Analisi audio e trascrizione con Gemini AI...');
      }, 1200);

      setTimeout(() => {
        setLoadingStep('Generazione del riassunto e punti chiave...');
      }, 3500);

      const processRes = await videoTranscribeService.processVideo(trimmed, {
        language,
        detailLevel,
        generateSummary: contentMode === 'both' || contentMode === 'summary',
        generateTranscription: contentMode === 'both' || contentMode === 'transcription',
      });

      setResult(processRes);
      setActiveTab('summary');
    } catch (err: any) {
      console.error('Video processing error:', err);
      setError(err?.message || 'Impossibile elaborare il video. Verifica il link e riprova.');
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const handleSaveToLibrary = (openImmediately: boolean = false) => {
    if (!result) return;

    let pagesToSave: string[] = [];
    if (contentMode === 'summary') {
      pagesToSave = result.summaryPages;
    } else if (contentMode === 'transcription') {
      pagesToSave = result.transcriptionPages;
    } else {
      pagesToSave = result.combinedPages;
    }

    if (pagesToSave.length === 0) {
      pagesToSave = [result.summary || result.transcription || 'Analisi video'];
    }

    const newBook: Book = {
      book_id: `video-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      owner_id: 'user-default-1',
      title: result.title,
      author: result.author || 'Video Web',
      file_type: 'txt',
      size: result.wordsCount * 6,
      pages: pagesToSave,
      source: 'upload',
      created_at: new Date().toISOString(),
      coverColor: '#EF6C4A',
      currentPage: 0,
      ocr_engine: 'Gemini 3.8 Flash Vision',
      imageUrls: result.thumbnailUrl ? [result.thumbnailUrl] : undefined,
    };

    onAddBook(newBook);

    if (openImmediately && onOpenReader) {
      onOpenReader(newBook);
    }

    onClose();
  };

  const handleCopyText = async (textToCopy: string, label: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = textToCopy;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedNotice(`${label} copiato negli appunti!`);
      setTimeout(() => setCopiedNotice(null), 3000);
    } catch {
      setCopiedNotice('Errore nella copia');
      setTimeout(() => setCopiedNotice(null), 2000);
    }
  };

  const renderPlatformBadge = (plat?: string) => {
    switch (plat) {
      case 'instagram':
        return (
          <span className="px-2 py-0.5 rounded-full bg-[#EF6C4A] text-white text-[10px] font-black uppercase tracking-wider shadow-xs">
            Instagram Reel
          </span>
        );
      case 'tiktok':
        return (
          <span className="px-2 py-0.5 rounded-full bg-slate-900 text-[#00f2fe] text-[10px] font-black uppercase tracking-wider border border-slate-700 shadow-xs">
            TikTok
          </span>
        );
      case 'facebook':
        return (
          <span className="px-2 py-0.5 rounded-full bg-[#1877F2] text-white text-[10px] font-black uppercase tracking-wider shadow-xs">
            Facebook
          </span>
        );
      case 'twitter':
        return (
          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-white text-[10px] font-black uppercase tracking-wider shadow-xs">
            X (Twitter)
          </span>
        );
      case 'youtube':
        return (
          <span className="px-2 py-0.5 rounded-full bg-[#EF6C4A] text-white text-[10px] font-black uppercase tracking-wider shadow-xs">
            YouTube
          </span>
        );
      case 'linkedin':
        return (
          <span className="px-2 py-0.5 rounded-full bg-[#0A66C2] text-white text-[10px] font-black uppercase tracking-wider shadow-xs">
            LinkedIn
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full bg-[#1E8C86] text-white text-[10px] font-black uppercase tracking-wider shadow-xs">
            Video Web
          </span>
        );
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="video-transcribe-title"
      className="fixed inset-0 z-50 bg-[#1E8C86]/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-2.5 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-[#162322] border-2 border-[#2BA8A2]/40 rounded-3xl max-w-xl w-full p-4 sm:p-6 shadow-2xl flex flex-col gap-4 text-slate-900 dark:text-white max-h-[92vh] overflow-y-auto animate-slide-up"
      >
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b-2 border-dashed border-[#2BA8A2]/20 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#EF6C4A] text-white flex items-center justify-center shrink-0 shadow-coral-glow">
              <Video size={22} strokeWidth={2.4} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="video-transcribe-title" className="text-lg font-black text-slate-900 dark:text-white leading-snug">
                  Trascrivi Video & Social
                </h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#FFD23F] text-[#1E8C86] border border-[#E6B800] shadow-xs">
                  AI Gemini
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-300 font-semibold mt-0.5">
                Incolla link Instagram Reel, TikTok, YouTube, Facebook, X o web per trascrivere e riassumere con l'AI
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#EFF8F7] dark:bg-white/10 text-slate-600 dark:text-white hover:bg-[#EF6C4A] hover:text-white flex items-center justify-center transition-colors active:scale-95 shadow-xs"
            aria-label="Chiudi"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* Notice Toast */}
        {copiedNotice && (
          <div className="p-3 rounded-2xl bg-[#FFD23F] border border-[#E6B800] text-[#1E8C86] text-xs font-black flex items-center gap-2 shadow-accent-glow animate-fade-in">
            <Check size={16} strokeWidth={3} />
            <span>{copiedNotice}</span>
          </div>
        )}

        {/* Error Banner with Retry button */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-[#FFF8E7] dark:bg-[#2A1D1B] border-2 border-[#EF6C4A] text-[#D45233] dark:text-[#FFA894] text-xs font-bold flex flex-col gap-2 shadow-coral-glow animate-fade-in">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <AlertCircle size={18} className="shrink-0 text-[#EF6C4A] mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-[#EF6C4A] hover:text-[#D45233] shrink-0 p-1"
                aria-label="Chiudi errore"
              >
                <X size={14} strokeWidth={2.5} />
              </button>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#EF6C4A]/25">
              <button
                type="button"
                onClick={handleProcessVideo}
                disabled={isLoading}
                className="px-3 py-1 rounded-xl bg-[#EF6C4A] hover:bg-[#D45233] text-white text-[11px] font-black flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <RotateCcw size={12} />
                <span>Riprova adesso</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 1: Input URL and Options (if not loaded yet) */}
        {!result && (
          <div className="flex flex-col gap-3.5">
            {/* Input URL with Paste button */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="video-url-input" className="text-xs font-black text-slate-700 dark:text-slate-200 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <LinkIcon size={14} className="text-[#EF6C4A]" />
                  <span>Link Video o Social (Instagram, TikTok, YouTube, X, Facebook)</span>
                </span>
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  className="text-[11px] font-bold text-[#1E8C86] dark:text-[#3CC4BD] hover:underline flex items-center gap-1"
                >
                  <span>Incolla dagli appunti</span>
                </button>
              </label>

              <div className="relative">
                <input
                  ref={inputRef}
                  id="video-url-input"
                  type="url"
                  value={videoUrl}
                  onChange={(e) => {
                    setVideoUrl(e.target.value);
                    if (error) setError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isLoading) {
                      handleProcessVideo();
                    }
                  }}
                  disabled={isLoading}
                  placeholder="https://www.instagram.com/reel/... o tiktok.com/@... o youtu.be/..."
                  className="w-full bg-[#FFF8E7] dark:bg-[#1C2C2A] border-2 border-[#FFD23F] focus:border-[#2BA8A2] dark:focus:border-[#3CC4BD] text-slate-900 dark:text-white font-bold placeholder-slate-400 dark:placeholder-slate-500 rounded-2xl pl-3.5 pr-10 py-3 text-sm outline-none transition-all shadow-card"
                />
                {videoUrl && (
                  <button
                    type="button"
                    onClick={() => setVideoUrl('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-200 dark:bg-white/20 text-slate-600 dark:text-white flex items-center justify-center hover:bg-[#EF6C4A] hover:text-white transition-colors"
                  >
                    <X size={12} strokeWidth={2.5} />
                  </button>
                )}
              </div>
            </div>

            {/* Link di Esempio Rapidi */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="text-slate-400 font-bold">Esempi:</span>
              <button
                type="button"
                onClick={() => handleInsertSample('https://www.instagram.com/reel/C8qL_k1t9zK/')}
                className="px-2.5 py-1 rounded-full bg-[#FFF2EE] dark:bg-[#2B1C1A] text-[#EF6C4A] font-bold border border-[#EF6C4A]/40 hover:border-[#EF6C4A] transition-colors"
              >
                Instagram Reel
              </button>
              <button
                type="button"
                onClick={() => handleInsertSample('https://www.tiktok.com/@scienzaesalute/video/7345678901234567890')}
                className="px-2.5 py-1 rounded-full bg-[#E8F6F5] dark:bg-white/10 text-[#1E8C86] dark:text-[#3CC4BD] font-bold border border-[#2BA8A2]/30 hover:border-[#2BA8A2] transition-colors"
              >
                TikTok
              </button>
              <button
                type="button"
                onClick={() => handleInsertSample('https://www.youtube.com/watch?v=dQw4w9WgXcQ')}
                className="px-2.5 py-1 rounded-full bg-[#E8F6F5] dark:bg-white/10 text-[#1E8C86] dark:text-[#3CC4BD] font-bold border border-[#2BA8A2]/30 hover:border-[#2BA8A2] transition-colors"
              >
                YouTube
              </button>
              <button
                type="button"
                onClick={() => handleInsertSample('https://x.com/tech_insider/status/1789012345678901234')}
                className="px-2.5 py-1 rounded-full bg-[#E8F6F5] dark:bg-white/10 text-[#1E8C86] dark:text-[#3CC4BD] font-bold border border-[#2BA8A2]/30 hover:border-[#2BA8A2] transition-colors"
              >
                X (Twitter)
              </button>
              <button
                type="button"
                onClick={() => handleInsertSample('https://www.youtube.com/watch?v=k2pA2q7iO7o')}
                className="px-2.5 py-1 rounded-full bg-[#E8F6F5] dark:bg-white/10 text-[#1E8C86] dark:text-[#3CC4BD] font-bold border border-[#2BA8A2]/30 hover:border-[#2BA8A2] transition-colors"
              >
                Podcast
              </button>
            </div>

            {/* Opzioni di Elaborazione AI */}
            <div className="p-3.5 rounded-2xl bg-[#EFF8F7] dark:bg-[#1A2E2C] border border-[#2BA8A2]/30 flex flex-col gap-3">
              <span className="text-xs font-black text-[#1E8C86] dark:text-[#3CC4BD] flex items-center gap-1.5">
                <Sliders size={14} />
                <span>Preferenze di Analisi e Trascrizione</span>
              </span>

              {/* Dettaglio Riassunto */}
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Stile Riassunto:</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'concise', label: 'Breve', desc: 'Punti chiave' },
                    { id: 'standard', label: 'Bilanciato', desc: 'Consigliato' },
                    { id: 'detailed', label: 'Dettagliato', desc: 'Per capitoli' },
                  ].map((lvl) => (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => setDetailLevel(lvl.id as any)}
                      className={`p-2 rounded-xl text-xs font-bold text-center border-2 transition-all cursor-pointer ${
                        detailLevel === lvl.id
                          ? 'bg-[#FFD23F] text-slate-950 border-[#E6B800] shadow-accent-glow font-black'
                          : 'bg-white dark:bg-[#162322] text-slate-700 dark:text-slate-300 border-[#2BA8A2]/20 hover:border-[#2BA8A2]'
                      }`}
                    >
                      <span className="block leading-tight">{lvl.label}</span>
                      <span className="text-[9px] opacity-75 font-normal block">{lvl.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Lingua Output */}
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 pt-1 border-t border-[#2BA8A2]/20">
                <span className="flex items-center gap-1.5">
                  <Languages size={14} className="text-[#1E8C86]" />
                  <span>Lingua trascrizione e riassunto:</span>
                </span>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as any)}
                  className="bg-white dark:bg-[#162322] border border-[#2BA8A2]/40 rounded-xl px-2.5 py-1 text-xs font-bold text-[#1E8C86] dark:text-[#3CC4BD] outline-none"
                >
                  <option value="ita">Italiano (ITA)</option>
                  <option value="eng">Inglese (ENG)</option>
                  <option value="fra">Francese (FRA)</option>
                  <option value="esp">Spagnolo (ESP)</option>
                </select>
              </div>
            </div>

            {/* Pulsante Avvio Elaborazione */}
            <button
              type="button"
              onClick={handleProcessVideo}
              disabled={isLoading || !videoUrl.trim()}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#FFD23F] hover:bg-[#FFE47A] disabled:opacity-50 text-[#1E8C86] font-black text-sm shadow-accent-glow border-2 border-[#E6B800] active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin text-[#1E8C86]" />
                  <span>{loadingStep || 'Elaborazione video in corso...'}</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} className="text-[#1E8C86]" />
                  <span>Trascrivi e Genera Riassunto con AI</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Step 2: Results Display (Transcription & Summary Tabs) */}
        {result && (
          <div className="flex flex-col gap-3.5">
            {/* Video Preview Card */}
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#FFF8E7] dark:bg-[#162322] border-2 border-[#FFD23F] shadow-xs">
              {result.thumbnailUrl ? (
                <img
                  src={result.thumbnailUrl}
                  alt={result.title}
                  className="w-20 h-14 object-cover rounded-xl shadow-xs shrink-0 border border-white"
                />
              ) : (
                <div className="w-16 h-14 rounded-xl bg-[#EF6C4A] text-white flex items-center justify-center shrink-0">
                  <Video size={24} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-1">
                  {renderPlatformBadge(result.platform)}
                </div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white truncate">
                  {result.title}
                </h4>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                  <span>{result.author}</span>
                  {result.duration && <span>• {result.duration}</span>}
                  <span>• {result.wordsCount} parole</span>
                </div>
              </div>
              <a
                href={result.url}
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 rounded-full bg-white dark:bg-white/10 text-slate-600 dark:text-white flex items-center justify-center hover:bg-[#EF6C4A] hover:text-white transition-colors shrink-0 shadow-xs"
                title="Apri video originale"
              >
                <ExternalLink size={14} />
              </a>
            </div>

            {/* Punti Chiave (se presenti) */}
            {result.keyPoints && result.keyPoints.length > 0 && (
              <div className="p-3 rounded-2xl bg-[#EFF8F7] dark:bg-[#1A2E2C] border border-[#2BA8A2]/30 flex flex-col gap-1.5">
                <span className="text-xs font-black text-[#1E8C86] dark:text-[#3CC4BD] flex items-center gap-1.5">
                  <Sparkles size={13} className="text-[#FFD23F] fill-[#FFD23F]" />
                  <span>Punti Chiave Salienti:</span>
                </span>
                <ul className="flex flex-col gap-1 text-xs text-slate-700 dark:text-slate-200">
                  {result.keyPoints.slice(0, 4).map((pt, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-[#1E8C86] dark:text-[#3CC4BD] font-black">•</span>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tabs Selector: Riassunto vs Trascrizione */}
            <div className="flex items-center justify-between border-b border-[#2BA8A2]/30 pb-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('summary')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'summary'
                      ? 'bg-[#1E8C86] text-white shadow-teal-glow'
                      : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:text-[#1E8C86]'
                  }`}
                >
                  <Sparkles size={14} />
                  <span>Riassunto Strutturato</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('transcription')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'transcription'
                      ? 'bg-[#1E8C86] text-white shadow-teal-glow'
                      : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:text-[#1E8C86]'
                  }`}
                >
                  <FileText size={14} />
                  <span>Trascrizione Completa</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() =>
                  handleCopyText(
                    activeTab === 'summary' ? result.summary : result.transcription,
                    activeTab === 'summary' ? 'Riassunto' : 'Trascrizione'
                  )
                }
                className="text-xs font-bold text-[#1E8C86] dark:text-[#3CC4BD] hover:underline flex items-center gap-1"
                title="Copia testo negli appunti"
              >
                <Copy size={13} />
                <span className="hidden sm:inline">Copia</span>
              </button>
            </div>

            {/* Content Preview Box */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#131F1E] border border-slate-200 dark:border-white/10 max-h-56 overflow-y-auto text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed select-text font-serif">
              {activeTab === 'summary' ? result.summary : result.transcription}
            </div>

            {/* Opzioni di Salvataggio nel Libro */}
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleSaveToLibrary(true)}
                className="w-full sm:flex-1 py-3 px-3 rounded-2xl bg-[#FFD23F] hover:bg-[#FFE47A] text-[#1E8C86] font-black text-xs shadow-accent-glow border-2 border-[#E6B800] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Headphones size={16} />
                <span>Ascolta subito con Voce</span>
              </button>

              <button
                type="button"
                onClick={() => handleSaveToLibrary(false)}
                className="w-full sm:flex-1 py-3 px-3 rounded-2xl bg-[#1E8C86] hover:bg-[#2BA8A2] text-white font-black text-xs shadow-teal-glow active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <BookOpen size={16} />
                <span>Salva nella Libreria</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setResult(null);
                  setVideoUrl('');
                }}
                className="p-3 rounded-2xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 text-slate-700 dark:text-white transition-colors"
                title="Analizza un altro video"
              >
                <RotateCcw size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
