import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  X,
  Image as ImageIcon,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Loader2,
  Trash2,
  Languages,
  Sliders,
  FileCheck2,
  Wand2,
  Bot,
  Cpu,
  RotateCcw,
  Volume2,
  SpellCheck,
  BookOpen,
  FileText,
} from 'lucide-react';
import { Book, ScanSessionData } from '../types';
import { fileParser } from '../services/fileParser';
import {
  tesseractOcr,
  OcrLanguage,
  OcrEngineMode,
  OcrProgress,
  AiOptimizationMode,
} from '../services/tesseractOcr';
import { ScanProgressCircle } from './ScanProgressCircle';
import { pdfOcrService } from '../services/pdfOcrService';
import { CameraScanner } from './CameraScanner';
import { CamScannerEditor } from './CamScannerEditor';

interface ScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookAdded: (book: Book) => void;
  onScanResultsReady?: (session: ScanSessionData) => void;
  initialOpenLiveCamera?: boolean;
}

export const ScanModal: React.FC<ScanModalProps> = ({
  isOpen,
  onClose,
  onBookAdded,
  onScanResultsReady,
  initialOpenLiveCamera = true,
}) => {
  const [scanTitle, setScanTitle] = useState('');
  const [scannedPages, setScannedPages] = useState<string[]>([]);
  const [currentText, setCurrentText] = useState('');
  const [rawText, setRawText] = useState('');
  const [loading, setLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<OcrProgress>({
    status: '',
    progress: 0,
    message: '',
  });
  const [ocrEngine, setOcrEngine] = useState<OcrEngineMode>('ai-vision');
  const [ocrLanguage, setOcrLanguage] = useState<OcrLanguage>('ita');
  const [autoOptimizeAi, setAutoOptimizeAi] = useState(true);
  const [speechOptimized, setSpeechOptimized] = useState(false);
  const [enhanceContrast, setEnhanceContrast] = useState(true);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [lastConfidence, setLastConfidence] = useState<number | null>(null);
  const [currentEngineLabel, setCurrentEngineLabel] = useState<string>('Gemini AI Vision');
  const [isAiOptimized, setIsAiOptimized] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [activeFileName, setActiveFileName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isEnhancingAi, setIsEnhancingAi] = useState(false);
  const [activeAiMode, setActiveAiMode] = useState<AiOptimizationMode | null>(null);
  const [showLiveCamera, setShowLiveCamera] = useState(true);
  const [rawImageForEditing, setRawImageForEditing] = useState<File | null>(null);

  useEffect(() => {
    if (isOpen) {
      setShowLiveCamera(true);
    }
  }, [isOpen]);

  const fileInputCameraRef = useRef<HTMLInputElement>(null);
  const fileInputGalleryRef = useRef<HTMLInputElement>(null);
  const fileInputPdfRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handlePdfFile = async (file: File) => {
    if (!file) return;

    setError(null);
    setStatus(null);
    setLoading(true);
    setActiveFileName(file.name || 'documento.pdf');
    setLastConfidence(null);
    setIsAiOptimized(false);
    setPreviewImageUrl(null);

    setOcrProgress({
      status: 'init',
      progress: 0.05,
      message: `Inizializzazione scansione OCR del libro PDF "${file.name}"...`,
    });

    try {
      const session = await pdfOcrService.convertScannedPdf(file, {
        engine: ocrEngine,
        language: ocrLanguage,
        autoOptimizeAi,
        speechOptimized,
        onProgress: (prog) => {
          setOcrProgress(prog);
        },
      });

      if (onScanResultsReady) {
        onScanResultsReady(session);
        onClose();
        return;
      }

      if (session.pages && session.pages.length > 0) {
        setScannedPages(session.pages.slice(1));
        setCurrentText(session.pages[0]);
        setRawText(session.rawPages?.[0] || session.pages[0]);
        setStatus(`PDF convertito con successo in testo! (${session.pages.length} pagine elaborate)`);
      }
    } catch (err: any) {
      console.error('Errore scansione PDF OCR:', err);
      setError(err?.message || 'Errore durante la scansione OCR del file PDF.');
    } finally {
      setLoading(false);
    }
  };

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handlePdfFile(files[0]);
    }
    e.target.value = '';
  };

  const handleImageFile = async (file: File, preProcessedUrl?: string) => {
    if (!file) return;

    setError(null);
    setStatus(null);
    setLoading(true);
    setActiveFileName(file.name || 'foto-scansione.jpg');
    setLastConfidence(null);
    setIsAiOptimized(false);

    // Create local object URL for preview or use preProcessedUrl
    const objectUrl = preProcessedUrl || URL.createObjectURL(file);
    setPreviewImageUrl(objectUrl);

    setOcrProgress({
      status: 'init',
      progress: 0.05,
      message:
        ocrEngine === 'ai-vision'
          ? 'Inizializzazione scansione con Gemini AI Vision...'
          : 'Inizializzazione motore Tesseract OCR...',
    });

    try {
      const result = await tesseractOcr.recognize(file, {
        engine: ocrEngine,
        language: ocrLanguage,
        enhanceContrast,
        autoOptimizeAi,
        speechOptimized,
        onProgress: (prog) => {
          setOcrProgress(prog);
        },
      });

      if (!result.text || result.text.trim().length === 0) {
        setCurrentText('');
        setRawText('');
        setError(
          'Nessun testo leggibile rilevato nella foto. Assicurati che la pagina sia ben illuminata, a fuoco e senza riflessi.'
        );
      } else {
        const text = result.text;
        const raw = result.rawText || result.text;
        setCurrentText(text);
        setRawText(raw);
        setLastConfidence(result.confidence);
        setCurrentEngineLabel(result.engine);
        setIsAiOptimized(result.isAiOptimized);

        if (onScanResultsReady) {
          const autoTitle =
            scanTitle.trim() ||
            `Scansione ${result.engine || 'OCR'} ${new Date().toLocaleDateString('it-IT')}`;
          onScanResultsReady({
            bookId: `scan-${Date.now()}`,
            title: autoTitle,
            pages: [text],
            rawPages: [raw],
            imageUrls: [objectUrl],
            engine: result.engine,
            confidence: result.confidence,
            isAiOptimized: result.isAiOptimized,
            currentPageIndex: 0,
          });
          onClose();
          return;
        }

        const aiTag = result.isAiOptimized ? ' (Ottimizzato con AI)' : '';
        setStatus(
          `Scansione completata con ${result.engine}${aiTag}! Estratte ${result.wordsCount} parole (${result.confidence}% confidenza).`
        );
      }
    } catch (err: any) {
      console.error('Errore scansione OCR:', err);
      setError(err?.message || 'Errore durante il riconoscimento del testo nella foto.');
    } finally {
      setLoading(false);
    }
  };

  const handleCameraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setRawImageForEditing(files[0]);
    }
    e.target.value = '';
  };

  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setRawImageForEditing(files[0]);
    }
    e.target.value = '';
  };

  // AI-powered text enhancement with specific modes
  const handleEnhanceWithAi = async (mode: AiOptimizationMode = 'comprehensive') => {
    if (!currentText.trim()) return;

    setIsEnhancingAi(true);
    setActiveAiMode(mode);
    setError(null);
    try {
      const res = await tesseractOcr.optimizeTextWithAi(currentText, mode);
      if (res.text) {
        setCurrentText(res.text);
        setIsAiOptimized(true);

        let modeDesc = 'ottimizzato con AI (refusi e formattazione)';
        if (mode === 'speech_tts') {
          modeDesc = 'adattato per la lettura vocale (TTS fluido ed espansione sigle)';
        } else if (mode === 'typos') {
          modeDesc = 'corretto nei soli refusi OCR ortografici';
        }

        setStatus(`Testo ${modeDesc} con successo! (${res.engine})`);
      }
    } catch (aiErr: any) {
      console.warn('AI enhancement error, fallback locale:', aiErr);
      const enhanced = fileParser.enhanceText(currentText);
      setCurrentText(enhanced);
      setStatus('Testo ripulito localmente con filtri tipografici.');
    } finally {
      setIsEnhancingAi(false);
      setActiveAiMode(null);
    }
  };

  // Restore raw OCR text
  const handleRestoreRawText = () => {
    if (rawText && rawText !== currentText) {
      setCurrentText(rawText);
      setIsAiOptimized(false);
      setStatus('Ripristinato il testo grezzo originale della scansione.');
    }
  };

  const handleAddPage = () => {
    if (!currentText.trim()) {
      setError('Inserisci o scansiona del testo per questa pagina prima di aggiungerla.');
      return;
    }
    const clean = fileParser.enhanceText(currentText);
    setScannedPages([...scannedPages, clean]);
    setCurrentText('');
    setRawText('');
    setPreviewImageUrl(null);
    setLastConfidence(null);
    setIsAiOptimized(false);
    setStatus(`Pagina ${scannedPages.length + 1} aggiunta! Puoi scansionare la pagina successiva.`);
  };

  const handleRemovePage = (indexToRemove: number) => {
    setScannedPages(scannedPages.filter((_, idx) => idx !== indexToRemove));
    setStatus(`Pagina ${indexToRemove + 1} rimossa.`);
  };

  const handleSaveBook = () => {
    const finalPages = [...scannedPages];
    if (currentText.trim()) {
      finalPages.push(fileParser.enhanceText(currentText));
    }

    if (finalPages.length === 0) {
      setError('Aggiungi almeno una pagina scansionata prima di salvare il libro.');
      return;
    }

    const title =
      scanTitle.trim() ||
      `Scansione ${currentEngineLabel || 'OCR'} ${new Date().toLocaleDateString('it-IT')}`;
    const newBook: Book = {
      book_id: `scan-pdf-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      owner_id: 'user-default-1',
      title,
      file_type: 'pdf',
      size: finalPages.join(' ').length,
      pages: finalPages,
      source: 'scan',
      ocr_engine: currentEngineLabel || 'OCR Ottimizzato',
      created_at: new Date().toISOString(),
      coverColor: '#FFFFFF',
      currentPage: 0,
      imageUrls: previewImageUrl ? [previewImageUrl] : [],
    };

    onBookAdded(newBook);
    onClose();
  };

  const handleOpenInResultsPage = () => {
    if (!onScanResultsReady) return;
    const finalPages = [...scannedPages];
    const finalRaw = [...scannedPages];
    if (currentText.trim()) {
      finalPages.push(fileParser.enhanceText(currentText));
      finalRaw.push(rawText || currentText);
    }

    if (finalPages.length === 0) {
      setError('Aggiungi o scansiona almeno una pagina prima di aprire i risultati.');
      return;
    }

    const title =
      scanTitle.trim() ||
      `Scansione ${currentEngineLabel || 'OCR'} ${new Date().toLocaleDateString('it-IT')}`;

    onScanResultsReady({
      bookId: `scan-${Date.now()}`,
      title,
      pages: finalPages,
      rawPages: finalRaw,
      imageUrls: [previewImageUrl],
      engine: currentEngineLabel || 'Gemini AI Vision',
      confidence: lastConfidence || 98,
      isAiOptimized,
      currentPageIndex: 0,
    });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="scan-modal-title"
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div className="bg-black border border-white/20 rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl flex flex-col gap-4 my-8 text-white max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/20 text-white flex items-center justify-center shadow-xs">
              <Camera size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 id="scan-modal-title" className="text-xl font-black text-white">
                  Scansione OCR con AI
                </h2>
                <span className="bg-zinc-900 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full inline-flex items-center gap-1 border border-white/30">
                  <Sparkles size={11} />
                  AI Ottimizzato
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Chiudi finestra di scansione"
            className="w-10 h-10 rounded-xl bg-black border border-white/30 text-white flex items-center justify-center hover:bg-white hover:text-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* OCR Engine Selector Tabs */}
        <div>
          <label className="block text-xs font-bold text-gray-300 mb-1.5">
            Motore di Riconoscimento OCR:
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setOcrEngine('ai-vision')}
              className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                ocrEngine === 'ai-vision'
                  ? 'bg-white text-black border-white shadow-xs'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black flex items-center gap-1">
                  <Bot size={14} />
                  Gemini AI Vision
                </span>
                <span className={`text-[9px] font-extrabold px-1 rounded ${ocrEngine === 'ai-vision' ? 'bg-black text-white' : 'bg-zinc-800 text-white'}`}>
                  Top
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setOcrEngine('tesseract-ai')}
              className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                ocrEngine === 'tesseract-ai'
                  ? 'bg-white text-black border-white shadow-xs'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black flex items-center gap-1">
                  <Sparkles size={14} />
                  Tesseract + AI
                </span>
                <span className={`text-[9px] font-bold px-1 rounded ${ocrEngine === 'tesseract-ai' ? 'bg-black text-white' : 'bg-zinc-800 text-white'}`}>
                  Ibrido
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setOcrEngine('tesseract')}
              className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                ocrEngine === 'tesseract'
                  ? 'bg-white text-black border-white shadow-xs'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black flex items-center gap-1">
                  <Cpu size={14} />
                  Tesseract Solo
                </span>
                <span className={`text-[9px] font-bold px-1 rounded ${ocrEngine === 'tesseract' ? 'bg-black text-white' : 'bg-zinc-800 text-white'}`}>
                  Locale
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* OCR Options Bar */}
        <div className="bg-black border border-white/20 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-white">
          <div className="flex items-center gap-2">
            <Languages size={16} className="text-white shrink-0" />
            <label htmlFor="ocr-lang-select" className="text-white">
              Lingua:
            </label>
            <select
              id="ocr-lang-select"
              value={ocrLanguage}
              onChange={(e) => setOcrLanguage(e.target.value as OcrLanguage)}
              disabled={loading}
              className="bg-black border border-white/20 text-white rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none focus:border-white"
            >
              <option value="ita">Italiano (ita)</option>
              <option value="eng">Inglese (eng)</option>
              <option value="ita+eng">Italiano + Inglese</option>
            </select>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoOptimizeAi}
                onChange={(e) => setAutoOptimizeAi(e.target.checked)}
                disabled={loading}
                className="rounded accent-white w-3.5 h-3.5 bg-black border-zinc-700"
              />
              <span className="text-white font-bold">Auto-ottimizzazione AI</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <Sliders size={14} className="text-white" />
              <input
                type="checkbox"
                checked={enhanceContrast}
                onChange={(e) => setEnhanceContrast(e.target.checked)}
                disabled={loading}
                className="rounded accent-white w-3.5 h-3.5 bg-black border-zinc-700"
              />
              <span className="text-white">Contrasto pagina</span>
            </label>
          </div>
        </div>

        {/* Errors & Status notifications */}
        {error && (
          <div className="bg-black border border-white/40 p-3 rounded-xl flex items-start gap-2.5 text-white">
            <AlertCircle className="text-white shrink-0 mt-0.5" size={18} />
            <p className="text-xs font-semibold leading-relaxed">{error}</p>
          </div>
        )}

        {status && (
          <div className="bg-black border border-white/40 p-3 rounded-xl flex items-start gap-2.5 text-white shadow-2xs">
            <CheckCircle className="text-white shrink-0 mt-0.5" size={18} />
            <p className="text-xs font-semibold leading-relaxed">{status}</p>
          </div>
        )}

        {/* Active OCR Circular Progress Indicator */}
        {loading && (
          <div className="py-2 animate-fade-in flex flex-col items-center">
            {previewImageUrl && (
              <div className="mb-2 flex items-center gap-2.5 p-2 px-3 bg-black border border-white/20 rounded-2xl w-full max-w-sm">
                <img
                  src={previewImageUrl}
                  alt="Anteprima immagine in scansione"
                  className="w-11 h-11 object-cover rounded-xl border border-white/20 shrink-0"
                />
                <div className="min-w-0 flex-1 text-left">
                  <span className="block text-xs font-bold text-white truncate">
                    Foto acquisita
                  </span>
                  <span className="block text-[11px] text-gray-400 font-medium truncate">
                    Elaborazione ottica e trascrizione...
                  </span>
                </div>
              </div>
            )}
            <ScanProgressCircle
              progress={ocrProgress.progress}
              message={ocrProgress.message || 'Scansione del documento in corso...'}
              engine={
                ocrEngine === 'ai-vision'
                  ? 'Gemini AI Vision'
                  : ocrEngine === 'tesseract-ai'
                  ? 'Tesseract + AI'
                  : 'Tesseract OCR'
              }
              fileName={activeFileName || 'documento-scansione.jpg'}
              subtitle="Trascrizione e allineamento del testo in corso."
              onCancel={() => setLoading(false)}
            />
          </div>
        )}

        {/* Live Camera View inside Modal */}
        {showLiveCamera ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                <Camera size={14} className="text-white" />
                Fotocamera attiva per scansione OCR
              </span>
              <button
                type="button"
                onClick={() => setShowLiveCamera(false)}
                className="text-xs font-bold text-gray-400 hover:text-white underline underline-offset-2"
              >
                Chiudi fotocamera
              </button>
            </div>
            <CameraScanner
              autoStart={true}
              onAddBook={(book) => {
                setShowLiveCamera(false);
                onBookAdded(book);
                onClose();
              }}
              onScanResultsReady={(session) => {
                setShowLiveCamera(false);
                if (onScanResultsReady) {
                  onScanResultsReady(session);
                  onClose();
                }
              }}
              onClose={() => setShowLiveCamera(false)}
            />
          </div>
        ) : (
          /* Action Buttons to capture from camera, gallery, or scanned PDF */
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => setShowLiveCamera(true)}
              disabled={loading}
              className="min-h-[70px] bg-black border border-white/20 hover:border-white rounded-2xl flex items-center gap-3 p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white shadow-xs active:scale-[0.98] transition-all disabled:opacity-50 group"
            >
              <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/20 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Camera size={22} />
              </div>
              <div className="min-w-0">
                <span className="block text-sm font-bold text-white transition-colors truncate">
                  Scatta foto
                </span>
                <span className="block text-xs text-zinc-400 font-medium truncate">
                  Apri la fotocamera
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => fileInputGalleryRef.current?.click()}
              disabled={loading}
              className="min-h-[70px] bg-black border border-white/20 hover:border-white rounded-2xl flex items-center gap-3 p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white shadow-xs active:scale-[0.98] transition-all disabled:opacity-50"
            >
              <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/20 text-white flex items-center justify-center shrink-0">
                <ImageIcon size={22} />
              </div>
              <div className="min-w-0">
                <span className="block text-sm font-bold text-white truncate">Carica immagine</span>
                <span className="block text-xs text-zinc-400 font-medium truncate">Dalla galleria</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => fileInputPdfRef.current?.click()}
              disabled={loading}
              className="min-h-[70px] bg-black border border-white/20 hover:border-white rounded-2xl flex items-center gap-3 p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white shadow-xs active:scale-[0.98] transition-all disabled:opacity-50 group"
            >
              <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/20 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <FileText size={22} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="block text-sm font-bold text-white truncate transition-colors">PDF scansionato</span>
                  <span className="text-[9px] bg-zinc-900 text-white font-black px-1 rounded border border-white/20">OCR</span>
                </div>
                <span className="block text-xs text-zinc-400 font-medium truncate">Converti in testo</span>
              </div>
            </button>
          </div>
        )}

        {/* Hidden inputs for camera capture, gallery selection and scanned PDF */}
        <input
          ref={fileInputCameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleCameraChange}
          className="hidden"
        />
        <input
          ref={fileInputGalleryRef}
          type="file"
          accept="image/*,.png,.jpg,.jpeg,.webp,.bmp"
          onChange={handleGalleryChange}
          className="hidden"
        />
        <input
          ref={fileInputPdfRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handlePdfChange}
          className="hidden"
        />

        {/* Thumbnail Preview of Scanned Photo if present */}
        {previewImageUrl && (
          <div className="flex items-center gap-3 p-2.5 bg-black border border-white/20 rounded-xl shadow-2xs">
            <img
              src={previewImageUrl}
              alt="Anteprima pagina scansionata"
              className="w-14 h-14 object-cover rounded-lg border border-white/20 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-white truncate">
                  Pagina scansionata
                </p>
                {isAiOptimized && (
                  <span className="bg-zinc-900 text-white font-black text-[9px] px-1.5 py-0.5 rounded border border-white/20">
                    AI Ottimizzato
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400 font-medium">
                {lastConfidence !== null
                  ? `${currentEngineLabel} · Confidenza: ${lastConfidence}%`
                  : 'Immagine in caricamento'}
              </p>
            </div>
            <button
              onClick={() => setPreviewImageUrl(null)}
              className="text-zinc-400 hover:text-white p-1 rounded-md"
              title="Rimuovi anteprima"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Document Title input */}
        <div>
          <label htmlFor="scan-title" className="block text-xs font-bold text-white mb-1">
            Titolo del documento
          </label>
          <input
            id="scan-title"
            type="text"
            value={scanTitle}
            onChange={(e) => setScanTitle(e.target.value)}
            placeholder="Es. Capitolo 1 - Il Piccolo Principe"
            className="w-full bg-black border border-white/20 focus:border-white rounded-xl px-4 py-2.5 text-white placeholder-zinc-500 font-semibold text-sm focus:outline-none"
          />
        </div>

        {/* Extracted Text Area with AI Optimization Toolkit */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
            <label htmlFor="page-text" className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Testo Estratto (Pagina {scannedPages.length + 1})</span>
              {lastConfidence !== null && (
                <span className="text-[10px] bg-zinc-900 text-white border border-white/30 font-bold px-1.5 py-0.5 rounded">
                  {lastConfidence}% confidenza
                </span>
              )}
            </label>

            {/* AI Optimization Toolbar */}
            {currentText.trim() && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleEnhanceWithAi('comprehensive')}
                  disabled={isEnhancingAi}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-zinc-900 hover:bg-zinc-800 border border-white/20 px-2 py-1 rounded-lg transition-colors shadow-2xs"
                  title="Corregge refusi OCR, unisce parole a capo e ripristina la struttura dei paragrafi con Gemini AI"
                >
                  {isEnhancingAi && activeAiMode === 'comprehensive' ? (
                    <Loader2 size={12} className="animate-spin text-white" />
                  ) : (
                    <Wand2 size={12} className="text-white" />
                  )}
                  <span>Ottimizza con AI</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleEnhanceWithAi('speech_tts')}
                  disabled={isEnhancingAi}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-zinc-900 hover:bg-zinc-800 border border-white/20 px-2 py-1 rounded-lg transition-colors shadow-2xs"
                  title="Formatta ed espande abbreviazioni per una lettura vocale espressiva e scorrevole"
                >
                  {isEnhancingAi && activeAiMode === 'speech_tts' ? (
                    <Loader2 size={12} className="animate-spin text-white" />
                  ) : (
                    <Volume2 size={12} className="text-white" />
                  )}
                  <span>Formatta per Voce</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleEnhanceWithAi('typos')}
                  disabled={isEnhancingAi}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-zinc-900 hover:bg-zinc-800 border border-white/20 px-2 py-1 rounded-lg transition-colors shadow-2xs"
                  title="Corregge solo caratteri e lettere scambiate mantenendo l'impaginazione"
                >
                  {isEnhancingAi && activeAiMode === 'typos' ? (
                    <Loader2 size={12} className="animate-spin text-white" />
                  ) : (
                    <SpellCheck size={12} className="text-white" />
                  )}
                  <span>Correggi Refusi</span>
                </button>

                {rawText && rawText !== currentText && (
                  <button
                    type="button"
                    onClick={handleRestoreRawText}
                    disabled={isEnhancingAi}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-zinc-900 hover:bg-zinc-800 border border-white/20 px-2 py-1 rounded-lg transition-colors shadow-2xs"
                    title="Annulla le modifiche AI e ripristina il testo originale grezzo"
                  >
                    <RotateCcw size={12} />
                    <span>Originale</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <textarea
            id="page-text"
            rows={5}
            value={currentText}
            onChange={(e) => setCurrentText(e.target.value)}
            placeholder="Il testo estratto dalla foto apparirà qui. Puoi leggerlo, ascoltarlo, ottimizzarlo con AI o modificarlo direttamente..."
            className="w-full bg-black border border-white/20 focus:border-white rounded-xl p-3 text-white font-medium text-xs leading-relaxed focus:outline-none placeholder-zinc-500"
          />
          <div className="flex justify-between items-center text-[11px] text-zinc-400 mt-1">
            <span className="flex items-center gap-1.5">
              <span>
                {currentText.trim() ? `${currentText.trim().split(/\s+/).length} parole` : '0 parole'}
              </span>
              {isAiOptimized && (
                <span className="text-white font-bold">· Testo perfezionato da AI</span>
              )}
            </span>
            <span className="font-semibold text-zinc-400">
              Pagine salvate: {scannedPages.length}
            </span>
          </div>
        </div>

        {/* Already saved pages list */}
        {scannedPages.length > 0 && (
          <div className="border border-white/20 rounded-2xl p-3 bg-black flex flex-col gap-2 max-h-36 overflow-y-auto">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <FileCheck2 size={14} className="text-white" />
              Pagine pronte nel documento ({scannedPages.length})
            </span>
            <div className="flex flex-col gap-1.5">
              {scannedPages.map((page, idx) => (
                <div
                  key={idx}
                  className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 flex items-center justify-between text-xs gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="bg-zinc-900 border border-white/20 text-white font-black px-1.5 py-0.5 rounded text-[10px]">
                      #{idx + 1}
                    </span>
                    <span className="text-zinc-200 font-medium truncate">
                      {page.slice(0, 48)}...
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemovePage(idx)}
                    className="text-zinc-400 hover:text-white p-1"
                    title="Elimina questa pagina"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex flex-col gap-2 pt-1 border-t border-zinc-800">
          {onScanResultsReady && (scannedPages.length > 0 || currentText.trim()) && (
            <button
              type="button"
              onClick={handleOpenInResultsPage}
              disabled={loading}
              className="w-full min-h-[44px] bg-white text-black hover:bg-zinc-200 font-black py-2.5 px-4 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-xs active:scale-98"
            >
              <BookOpen size={16} />
              <span>Mostra risultati nella pagina dedicata</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleAddPage}
            disabled={!currentText.trim() || loading}
            className="w-full bg-black hover:bg-zinc-900 border border-white/20 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-2xs"
          >
            <Sparkles size={16} />
            <span>Aggiungi questa pagina e fanne un'altra</span>
          </button>

          <button
            type="button"
            onClick={handleSaveBook}
            disabled={loading || (scannedPages.length === 0 && !currentText.trim())}
            className="w-full min-h-[48px] bg-white hover:bg-zinc-200 text-black font-black text-sm py-2.5 px-6 rounded-xl flex items-center justify-center gap-2 active:scale-98 transition-all shadow-sm disabled:opacity-50"
          >
            <span>
              Crea e salva libro ({scannedPages.length + (currentText.trim() ? 1 : 0)}{' '}
              {scannedPages.length + (currentText.trim() ? 1 : 0) === 1 ? 'pagina' : 'pagine'})
            </span>
          </button>
        </div>
      </div>

      {/* CamScanner Editor per Ritaglio e Pulizia Documento */}
      {rawImageForEditing && (
        <CamScannerEditor
          imageFile={rawImageForEditing}
          pageIndex={scannedPages.length}
          totalPages={scannedPages.length + 1}
          onAddPage={(processedFile, processedUrl) => {
            setRawImageForEditing(null);
            handleImageFile(processedFile, processedUrl);
          }}
          onContinueSavePdf={(processedFile, processedUrl) => {
            setRawImageForEditing(null);
            const now = new Date();
            const dateStr = now.toLocaleDateString('it-IT');
            const timeStr = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
            const title =
              scanTitle.trim() ||
              (scannedPages.length > 0
                ? `Libro PDF (${scannedPages.length + 1} pag.) ${dateStr}`
                : `Scansione ${dateStr} ore ${timeStr}`);

            const finalPages = [...scannedPages, currentText.trim() || 'Scansione documento PDF completata.'];

            const uniqueSuffix = Math.random().toString(36).substring(2, 8);
            const newBook: Book = {
              book_id: `scan-pdf-${Date.now()}-${uniqueSuffix}`,
              owner_id: 'user-default-1',
              title,
              author: 'CamScanner Vora',
              file_type: 'pdf', // Salva il libro nella libreria in PDF!
              source: 'scan',
              size: processedFile.size || 180000,
              pages: finalPages,
              currentPage: 0,
              created_at: now.toISOString(),
              ocr_engine: 'CamScanner Vision',
              coverColor: '#FFFFFF',
              imageUrls: [processedUrl],
            };

            onBookAdded(newBook);
            onClose();
          }}
          onConfirm={(processedFile, processedUrl) => {
            setRawImageForEditing(null);
            const now = new Date();
            const dateStr = now.toLocaleDateString('it-IT');
            const timeStr = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
            const title =
              scanTitle.trim() ||
              (scannedPages.length > 0
                ? `Libro PDF (${scannedPages.length + 1} pag.) ${dateStr}`
                : `Scansione ${dateStr} ore ${timeStr}`);

            const finalPages = [...scannedPages, currentText.trim() || 'Scansione documento PDF completata.'];

            const uniqueSuffix = Math.random().toString(36).substring(2, 8);
            const newBook: Book = {
              book_id: `scan-pdf-${Date.now()}-${uniqueSuffix}`,
              owner_id: 'user-default-1',
              title,
              author: 'CamScanner Vora',
              file_type: 'pdf', // Salva il libro nella libreria in PDF!
              source: 'scan',
              size: processedFile.size || 180000,
              pages: finalPages,
              currentPage: 0,
              created_at: now.toISOString(),
              ocr_engine: 'CamScanner Vision',
              coverColor: '#FFFFFF',
              imageUrls: [processedUrl],
            };

            onBookAdded(newBook);
            onClose();
          }}
          onRetake={() => {
            setRawImageForEditing(null);
          }}
          onCancel={() => {
            setRawImageForEditing(null);
          }}
        />
      )}
    </div>
  );
};
