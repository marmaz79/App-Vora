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
  const [ocrEngine, setOcrEngine] = useState<OcrEngineMode>('tesseract');
  const [ocrLanguage, setOcrLanguage] = useState<OcrLanguage>('ita');
  const [autoOptimizeAi, setAutoOptimizeAi] = useState(false);
  const [speechOptimized, setSpeechOptimized] = useState(false);
  const [enhanceContrast, setEnhanceContrast] = useState(true);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [lastConfidence, setLastConfidence] = useState<number | null>(null);
  const [currentEngineLabel, setCurrentEngineLabel] = useState<string>('Tesseract OCR (Locale)');
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
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto font-sans select-none"
    >
      <div className="bg-white border-2 border-[#2BA8A2]/30 rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-card flex flex-col gap-4 my-8 text-slate-800 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-dashed border-[#2BA8A2]/20 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#E8F6F5] border-2 border-[#2BA8A2]/30 text-[#EF6C4A] flex items-center justify-center shadow-xs">
              <Camera size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 id="scan-modal-title" className="text-xl font-black text-[#1E8C86]">
                  Scansione OCR
                </h2>
                <span className="bg-[#E8F6F5] text-[#1E8C86] text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 border border-[#2BA8A2]/30">
                  <Cpu size={11} />
                  Motore Locale (Tesseract)
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Chiudi finestra di scansione"
            className="w-9 h-9 rounded-full bg-[#E8F6F5] border border-[#2BA8A2]/30 text-[#1E8C86] flex items-center justify-center hover:bg-[#2BA8A2]/20 transition-all active:scale-95"
          >
            <X size={18} />
          </button>
        </div>

        {/* OCR Engine Info */}
        <div>
          <label className="block text-xs font-black text-[#1E8C86] mb-1.5">
            Motore di Riconoscimento OCR:
          </label>
          <div className="p-3.5 rounded-2xl border-2 border-[#2BA8A2]/20 bg-[#E8F6F5] text-slate-800 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <Cpu size={18} className="text-[#1E8C86]" />
              <div>
                <span className="text-xs font-black block text-slate-900">Tesseract OCR (Locale WebAssembly)</span>
                <span className="text-[11px] text-slate-600 font-medium">Riconoscimento ottico offline direttamente nel browser</span>
              </div>
            </div>
            <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-[#2BA8A2] text-white shadow-teal-glow">
              Attivo
            </span>
          </div>
        </div>

        {/* OCR Options Bar */}
        <div className="bg-[#FFF8E7] border-2 border-[#FFD23F] rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-slate-800 shadow-xs">
          <div className="flex items-center gap-2">
            <Languages size={16} className="text-[#1E8C86] shrink-0" />
            <label htmlFor="ocr-lang-select" className="text-slate-800 font-bold">
              Lingua:
            </label>
            <select
              id="ocr-lang-select"
              value={ocrLanguage}
              onChange={(e) => setOcrLanguage(e.target.value as OcrLanguage)}
              disabled={loading}
              className="bg-white border-2 border-[#FFD23F]/60 text-slate-900 rounded-xl px-2.5 py-1 text-xs font-bold focus:outline-none focus:border-[#2BA8A2]"
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
                className="rounded accent-[#2BA8A2] w-3.5 h-3.5"
              />
              <span className="text-slate-800 font-black">Auto-ottimizzazione AI</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <Sliders size={14} className="text-[#1E8C86]" />
              <input
                type="checkbox"
                checked={enhanceContrast}
                onChange={(e) => setEnhanceContrast(e.target.checked)}
                disabled={loading}
                className="rounded accent-[#2BA8A2] w-3.5 h-3.5"
              />
              <span className="text-slate-700 font-bold">Contrasto pagina</span>
            </label>
          </div>
        </div>

        {/* Errors & Status notifications */}
        {error && (
          <div className="bg-[#EF6C4A]/10 border-2 border-[#EF6C4A]/30 p-3 rounded-2xl flex items-start gap-2.5 text-[#D45233]">
            <AlertCircle className="text-[#EF6C4A] shrink-0 mt-0.5" size={18} />
            <p className="text-xs font-bold leading-relaxed">{error}</p>
          </div>
        )}

        {status && (
          <div className="bg-[#E8F6F5] border-2 border-[#2BA8A2]/30 p-3 rounded-2xl flex items-start gap-2.5 text-[#1E8C86] shadow-xs">
            <CheckCircle className="text-[#2BA8A2] shrink-0 mt-0.5" size={18} />
            <p className="text-xs font-black leading-relaxed">{status}</p>
          </div>
        )}

        {/* Active OCR Circular Progress Indicator */}
        {loading && (
          <div className="py-2 animate-fade-in flex flex-col items-center">
            {previewImageUrl && (
              <div className="mb-2 flex items-center gap-2.5 p-2 px-3 bg-[#E8F6F5] border border-[#2BA8A2]/30 rounded-2xl w-full max-w-sm">
                <img
                  src={previewImageUrl}
                  alt="Anteprima immagine in scansione"
                  className="w-11 h-11 object-cover rounded-xl border border-[#2BA8A2]/30 shrink-0"
                />
                <div className="min-w-0 flex-1 text-left">
                  <span className="block text-xs font-black text-slate-900 truncate">
                    Foto acquisita
                  </span>
                  <span className="block text-[11px] text-slate-500 font-medium truncate">
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
              <span className="text-xs font-black text-[#1E8C86] flex items-center gap-1.5">
                <Camera size={14} className="text-[#EF6C4A]" />
                Fotocamera attiva per scansione OCR
              </span>
              <button
                type="button"
                onClick={() => setShowLiveCamera(false)}
                className="text-xs font-black text-slate-500 hover:text-[#1E8C86] underline underline-offset-2"
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
              className="min-h-[70px] bg-white border-2 border-[#2BA8A2]/20 hover:border-[#2BA8A2] hover:bg-[#EFF8F7]/50 rounded-2xl flex items-center gap-3 p-3 text-left shadow-xs active:scale-95 transition-all disabled:opacity-50 group"
            >
              <div className="w-10 h-10 rounded-xl bg-[#E8F6F5] border border-[#2BA8A2]/30 text-[#EF6C4A] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Camera size={22} />
              </div>
              <div className="min-w-0">
                <span className="block text-sm font-black text-slate-900 transition-colors truncate">
                  Scatta foto
                </span>
                <span className="block text-xs text-slate-500 font-medium truncate">
                  Apri fotocamera
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => fileInputGalleryRef.current?.click()}
              disabled={loading}
              className="min-h-[70px] bg-white border-2 border-[#2BA8A2]/20 hover:border-[#2BA8A2] hover:bg-[#EFF8F7]/50 rounded-2xl flex items-center gap-3 p-3 text-left shadow-xs active:scale-95 transition-all disabled:opacity-50 group"
            >
              <div className="w-10 h-10 rounded-xl bg-[#E8F6F5] border border-[#2BA8A2]/30 text-[#5DADE2] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <ImageIcon size={22} />
              </div>
              <div className="min-w-0">
                <span className="block text-sm font-black text-slate-900 truncate">Carica foto</span>
                <span className="block text-xs text-slate-500 font-medium truncate">Dalla galleria</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => fileInputPdfRef.current?.click()}
              disabled={loading}
              className="min-h-[70px] bg-white border-2 border-[#2BA8A2]/20 hover:border-[#2BA8A2] hover:bg-[#EFF8F7]/50 rounded-2xl flex items-center gap-3 p-3 text-left shadow-xs active:scale-95 transition-all disabled:opacity-50 group"
            >
              <div className="w-10 h-10 rounded-xl bg-[#E8F6F5] border border-[#2BA8A2]/30 text-[#1E8C86] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <FileText size={22} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="block text-sm font-black text-slate-900 truncate transition-colors">PDF scansione</span>
                  <span className="text-[9px] bg-[#2BA8A2] text-white font-black px-1.5 py-0.2 rounded-full">OCR</span>
                </div>
                <span className="block text-xs text-slate-500 font-medium truncate">Converti in testo</span>
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
          <div className="flex items-center gap-3 p-2.5 bg-[#E8F6F5] border-2 border-[#2BA8A2]/30 rounded-2xl shadow-xs">
            <img
              src={previewImageUrl}
              alt="Anteprima pagina scansionata"
              className="w-14 h-14 object-cover rounded-xl border border-[#2BA8A2]/30 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-xs font-black text-slate-900 truncate">
                  Pagina scansionata
                </p>
                {isAiOptimized && (
                  <span className="bg-[#FFD23F] text-slate-900 font-black text-[9px] px-1.5 py-0.5 rounded-full shadow-xs">
                    AI Ottimizzato
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                {lastConfidence !== null
                  ? `${currentEngineLabel} · Confidenza: ${lastConfidence}%`
                  : 'Immagine in caricamento'}
              </p>
            </div>
            <button
              onClick={() => setPreviewImageUrl(null)}
              className="text-slate-400 hover:text-[#EF6C4A] p-1 rounded-full transition-colors"
              title="Rimuovi anteprima"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Document Title input */}
        <div>
          <label htmlFor="scan-title" className="block text-xs font-black text-[#1E8C86] mb-1">
            Titolo del documento
          </label>
          <input
            id="scan-title"
            type="text"
            value={scanTitle}
            onChange={(e) => setScanTitle(e.target.value)}
            placeholder="Es. Capitolo 1 - Il Piccolo Principe"
            className="w-full bg-[#FFF8E7]/50 border-2 border-[#2BA8A2]/20 focus:border-[#2BA8A2] rounded-xl px-4 py-2.5 text-slate-900 placeholder-slate-400 font-bold text-sm focus:outline-none transition-all"
          />
        </div>

        {/* Extracted Text Area with AI Optimization Toolkit */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
            <label htmlFor="page-text" className="text-xs font-black text-[#1E8C86] flex items-center gap-1.5">
              <span>Testo Estratto (Pagina {scannedPages.length + 1})</span>
              {lastConfidence !== null && (
                <span className="text-[10px] bg-[#E8F6F5] text-[#1E8C86] border border-[#2BA8A2]/30 font-black px-2 py-0.5 rounded-full">
                  {lastConfidence}% confidenza
                </span>
              )}
            </label>

            {rawText && rawText !== currentText && (
              <button
                type="button"
                onClick={handleRestoreRawText}
                disabled={isEnhancingAi}
                className="inline-flex items-center gap-1 text-[11px] font-black text-[#1E8C86] bg-[#E8F6F5] hover:bg-[#2BA8A2]/20 border border-[#2BA8A2]/30 px-2.5 py-1 rounded-full transition-all active:scale-95 shadow-xs"
                title="Annulla le modifiche e ripristina il testo originale grezzo"
              >
                <RotateCcw size={12} />
                <span>Originale</span>
              </button>
            )}
          </div>

          <textarea
            id="page-text"
            rows={5}
            value={currentText}
            onChange={(e) => setCurrentText(e.target.value)}
            placeholder="Il testo estratto dalla foto apparirà qui. Puoi leggerlo, ascoltarlo, ottimizzarlo con AI o modificarlo direttamente..."
            className="w-full bg-[#FFF8E7]/50 border-2 border-[#2BA8A2]/20 focus:border-[#2BA8A2] rounded-2xl p-3.5 text-slate-900 font-medium text-xs leading-relaxed focus:outline-none placeholder-slate-400 transition-all resize-none"
          />
          <div className="flex justify-between items-center text-[11px] text-slate-500 mt-1 font-medium">
            <span className="flex items-center gap-1.5">
              <span>
                {currentText.trim() ? `${currentText.trim().split(/\s+/).length} parole` : '0 parole'}
              </span>
              {isAiOptimized && (
                <span className="text-[#1E8C86] font-black">· Testo perfezionato da AI</span>
              )}
            </span>
            <span className="font-bold text-slate-600">
              Pagine salvate: {scannedPages.length}
            </span>
          </div>
        </div>

        {/* Already saved pages list */}
        {scannedPages.length > 0 && (
          <div className="border-2 border-[#2BA8A2]/20 rounded-2xl p-3 bg-[#E8F6F5]/40 flex flex-col gap-2 max-h-36 overflow-y-auto">
            <span className="text-xs font-black text-[#1E8C86] flex items-center gap-1.5">
              <FileCheck2 size={14} className="text-[#1E8C86]" />
              Pagine pronte nel documento ({scannedPages.length})
            </span>
            <div className="flex flex-col gap-1.5">
              {scannedPages.map((page, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-[#2BA8A2]/20 rounded-xl p-2.5 flex items-center justify-between text-xs gap-2 shadow-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="bg-[#E8F6F5] border border-[#2BA8A2]/30 text-[#1E8C86] font-black px-2 py-0.5 rounded-full text-[10px]">
                      #{idx + 1}
                    </span>
                    <span className="text-slate-800 font-medium truncate">
                      {page.slice(0, 48)}...
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemovePage(idx)}
                    className="text-slate-400 hover:text-[#EF6C4A] p-1 transition-colors"
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
        <div className="flex flex-col gap-2.5 pt-2 border-t-2 border-dashed border-[#2BA8A2]/20">
          {onScanResultsReady && (scannedPages.length > 0 || currentText.trim()) && (
            <button
              type="button"
              onClick={handleOpenInResultsPage}
              disabled={loading}
              className="w-full min-h-[44px] bg-[#E8F6F5] text-[#1E8C86] border-2 border-[#2BA8A2]/30 hover:bg-[#2BA8A2]/20 font-black py-2.5 px-4 rounded-full text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-xs active:scale-95"
            >
              <BookOpen size={16} />
              <span>Mostra risultati nella pagina dedicata</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleAddPage}
            disabled={!currentText.trim() || loading}
            className="w-full bg-white hover:bg-[#E8F6F5] border-2 border-[#2BA8A2]/40 text-[#1E8C86] font-black py-2.5 px-4 rounded-full text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-xs active:scale-95"
          >
            <Sparkles size={16} />
            <span>Aggiungi questa pagina e fanne un'altra</span>
          </button>

          <button
            type="button"
            onClick={handleSaveBook}
            disabled={loading || (scannedPages.length === 0 && !currentText.trim())}
            className="w-full min-h-[48px] bg-[#FFD23F] hover:bg-[#FFE47A] text-slate-900 font-black text-sm py-2.5 px-6 rounded-full flex items-center justify-center gap-2 active:scale-95 transition-all shadow-accent-glow disabled:opacity-50"
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
