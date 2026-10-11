import React, { useState, useRef } from 'react';
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

interface ScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookAdded: (book: Book) => void;
  onScanResultsReady?: (session: ScanSessionData) => void;
}

export const ScanModal: React.FC<ScanModalProps> = ({
  isOpen,
  onClose,
  onBookAdded,
  onScanResultsReady,
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

  const fileInputCameraRef = useRef<HTMLInputElement>(null);
  const fileInputGalleryRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleImageFile = async (file: File) => {
    if (!file) return;

    setError(null);
    setStatus(null);
    setLoading(true);
    setActiveFileName(file.name || 'foto-scansione.jpg');
    setLastConfidence(null);
    setIsAiOptimized(false);

    // Create local object URL for preview
    const objectUrl = URL.createObjectURL(file);
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
      handleImageFile(files[0]);
    }
    e.target.value = '';
  };

  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleImageFile(files[0]);
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
      book_id: `scan-${Date.now()}`,
      owner_id: 'user-default-1',
      title,
      file_type: 'scan',
      size: finalPages.join(' ').length,
      pages: finalPages,
      source: 'scan',
      ocr_engine: currentEngineLabel || 'OCR Ottimizzato',
      created_at: new Date().toISOString(),
      coverColor: '#0284C7',
      currentPage: 0,
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
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div className="bg-white border border-gray-200 rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl flex flex-col gap-4 my-8 text-gray-900 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white border border-gray-200 text-blue-600 flex items-center justify-center shadow-xs">
              <Camera size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 id="scan-modal-title" className="text-xl font-black text-gray-900">
                  Scansione OCR con AI
                </h2>
                <span className="bg-purple-100 text-purple-900 text-[10px] font-black uppercase px-2 py-0.5 rounded-full inline-flex items-center gap-1 border border-purple-200">
                  <Sparkles size={11} />
                  AI Ottimizzato
                </span>
              </div>
              <p className="text-xs font-semibold text-gray-500">
                Riconoscimento caratteri ad alta fedeltà con Gemini 3.8 Flash e Tesseract
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Chiudi finestra di scansione"
            className="w-10 h-10 rounded-xl bg-white border border-gray-200 text-gray-600 flex items-center justify-center hover:bg-gray-100 hover:text-gray-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
          >
            <X size={20} />
          </button>
        </div>

        {/* OCR Engine Selector Tabs */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5">
            Motore di Riconoscimento OCR:
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setOcrEngine('ai-vision')}
              className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                ocrEngine === 'ai-vision'
                  ? 'bg-purple-50/50 border-purple-500 shadow-xs'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-purple-900 flex items-center gap-1">
                  <Bot size={14} className="text-purple-600" />
                  Gemini AI Vision
                </span>
                <span className="text-[9px] bg-purple-200 text-purple-900 font-extrabold px-1 rounded">
                  Top
                </span>
              </div>
              <span className="text-[10px] text-gray-500 font-medium leading-tight">
                Visione multimodale 3.8 Flash ad altissima accuratezza
              </span>
            </button>

            <button
              type="button"
              onClick={() => setOcrEngine('tesseract-ai')}
              className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                ocrEngine === 'tesseract-ai'
                  ? 'bg-blue-50/50 border-blue-500 shadow-xs'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-blue-900 flex items-center gap-1">
                  <Sparkles size={14} className="text-blue-600" />
                  Tesseract + AI
                </span>
                <span className="text-[9px] bg-blue-100 text-blue-800 font-bold px-1 rounded">
                  Ibrido
                </span>
              </div>
              <span className="text-[10px] text-gray-500 font-medium leading-tight">
                OCR Tesseract con post-processing e correzione AI
              </span>
            </button>

            <button
              type="button"
              onClick={() => setOcrEngine('tesseract')}
              className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                ocrEngine === 'tesseract'
                  ? 'bg-gray-100 border-gray-900 shadow-xs'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-gray-900 flex items-center gap-1">
                  <Cpu size={14} className="text-gray-700" />
                  Tesseract Solo
                </span>
                <span className="text-[9px] bg-gray-200 text-gray-700 font-bold px-1 rounded">
                  Locale
                </span>
              </div>
              <span className="text-[10px] text-gray-500 font-medium leading-tight">
                Esecuzione offline nel browser senza cloud
              </span>
            </button>
          </div>
        </div>

        {/* OCR Options Bar */}
        <div className="bg-white border border-gray-200 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-gray-700">
          <div className="flex items-center gap-2">
            <Languages size={16} className="text-blue-600 shrink-0" />
            <label htmlFor="ocr-lang-select" className="text-gray-600">
              Lingua:
            </label>
            <select
              id="ocr-lang-select"
              value={ocrLanguage}
              onChange={(e) => setOcrLanguage(e.target.value as OcrLanguage)}
              disabled={loading}
              className="bg-white border border-gray-300 text-gray-900 rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-black"
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
                className="rounded text-purple-600 focus:ring-purple-500 w-3.5 h-3.5"
              />
              <span className="text-purple-900 font-bold">Auto-ottimizzazione AI</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <Sliders size={14} className="text-gray-500" />
              <input
                type="checkbox"
                checked={enhanceContrast}
                onChange={(e) => setEnhanceContrast(e.target.checked)}
                disabled={loading}
                className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
              />
              <span className="text-gray-600">Contrasto pagina</span>
            </label>
          </div>
        </div>

        {/* Errors & Status notifications */}
        {error && (
          <div className="bg-red-50 border border-red-200 p-3 rounded-xl flex items-start gap-2.5 text-red-800">
            <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={18} />
            <p className="text-xs font-semibold leading-relaxed">{error}</p>
          </div>
        )}

        {status && (
          <div className="bg-white border border-gray-200 p-3 rounded-xl flex items-start gap-2.5 text-gray-900 shadow-2xs">
            <CheckCircle className="text-emerald-600 shrink-0 mt-0.5" size={18} />
            <p className="text-xs font-semibold leading-relaxed">{status}</p>
          </div>
        )}

        {/* Active OCR Circular Progress Indicator */}
        {loading && (
          <div className="py-2 animate-fade-in flex flex-col items-center">
            {previewImageUrl && (
              <div className="mb-2 flex items-center gap-2.5 p-2 px-3 bg-gray-50 border border-gray-200 rounded-2xl w-full max-w-sm">
                <img
                  src={previewImageUrl}
                  alt="Anteprima immagine in scansione"
                  className="w-11 h-11 object-cover rounded-xl border border-gray-300 shrink-0"
                />
                <div className="min-w-0 flex-1 text-left">
                  <span className="block text-xs font-bold text-gray-900 truncate">
                    Foto acquisita
                  </span>
                  <span className="block text-[11px] text-gray-500 font-medium truncate">
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

        {/* Action Buttons to capture from camera or gallery */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => fileInputCameraRef.current?.click()}
            disabled={loading}
            className="min-h-[72px] bg-white border border-gray-200 hover:border-black rounded-2xl flex items-center justify-center gap-3 p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black shadow-xs active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 text-blue-600 flex items-center justify-center shrink-0">
              <Camera size={22} />
            </div>
            <div>
              <span className="block text-sm font-bold text-gray-900">Scatta foto</span>
              <span className="block text-xs text-gray-500 font-medium">Usa la fotocamera</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => fileInputGalleryRef.current?.click()}
            disabled={loading}
            className="min-h-[72px] bg-white border border-gray-200 hover:border-black rounded-2xl flex items-center justify-center gap-3 p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black shadow-xs active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 text-emerald-600 flex items-center justify-center shrink-0">
              <ImageIcon size={22} />
            </div>
            <div>
              <span className="block text-sm font-bold text-gray-900">Carica immagine</span>
              <span className="block text-xs text-gray-500 font-medium">Dalla galleria o PC</span>
            </div>
          </button>
        </div>

        {/* Hidden inputs for camera capture and gallery selection */}
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

        {/* Thumbnail Preview of Scanned Photo if present */}
        {previewImageUrl && (
          <div className="flex items-center gap-3 p-2.5 bg-white border border-gray-200 rounded-xl shadow-2xs">
            <img
              src={previewImageUrl}
              alt="Anteprima pagina scansionata"
              className="w-14 h-14 object-cover rounded-lg border border-gray-300 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-gray-900 truncate">
                  Pagina scansionata
                </p>
                {isAiOptimized && (
                  <span className="bg-purple-100 text-purple-900 font-black text-[9px] px-1.5 py-0.5 rounded border border-purple-200">
                    AI Ottimizzato
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-500 font-medium">
                {lastConfidence !== null
                  ? `${currentEngineLabel} · Confidenza: ${lastConfidence}%`
                  : 'Immagine in caricamento'}
              </p>
            </div>
            <button
              onClick={() => setPreviewImageUrl(null)}
              className="text-gray-400 hover:text-red-600 p-1 rounded-md"
              title="Rimuovi anteprima"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Document Title input */}
        <div>
          <label htmlFor="scan-title" className="block text-xs font-bold text-gray-700 mb-1">
            Titolo del documento
          </label>
          <input
            id="scan-title"
            type="text"
            value={scanTitle}
            onChange={(e) => setScanTitle(e.target.value)}
            placeholder="Es. Capitolo 1 - Il Piccolo Principe"
            className="w-full bg-white border border-gray-300 focus:border-black rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-400 font-semibold text-sm focus:outline-none focus:ring-1 focus:ring-black"
          />
        </div>

        {/* Extracted Text Area with AI Optimization Toolkit */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
            <label htmlFor="page-text" className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
              <span>Testo Estratto (Pagina {scannedPages.length + 1})</span>
              {lastConfidence !== null && (
                <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold px-1.5 py-0.5 rounded">
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
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-800 bg-white hover:bg-purple-50 border border-purple-300 px-2 py-1 rounded-lg transition-colors shadow-2xs"
                  title="Corregge refusi OCR, unisce parole a capo e ripristina la struttura dei paragrafi con Gemini AI"
                >
                  {isEnhancingAi && activeAiMode === 'comprehensive' ? (
                    <Loader2 size={12} className="animate-spin text-purple-700" />
                  ) : (
                    <Wand2 size={12} className="text-purple-700" />
                  )}
                  <span>Ottimizza con AI</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleEnhanceWithAi('speech_tts')}
                  disabled={isEnhancingAi}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-800 bg-white hover:bg-blue-50 border border-blue-300 px-2 py-1 rounded-lg transition-colors shadow-2xs"
                  title="Formatta ed espande abbreviazioni per una lettura vocale espressiva e scorrevole"
                >
                  {isEnhancingAi && activeAiMode === 'speech_tts' ? (
                    <Loader2 size={12} className="animate-spin text-blue-700" />
                  ) : (
                    <Volume2 size={12} className="text-blue-700" />
                  )}
                  <span>Formatta per Voce</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleEnhanceWithAi('typos')}
                  disabled={isEnhancingAi}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 px-2 py-1 rounded-lg transition-colors shadow-2xs"
                  title="Corregge solo caratteri e lettere scambiate mantenendo l'impaginazione"
                >
                  {isEnhancingAi && activeAiMode === 'typos' ? (
                    <Loader2 size={12} className="animate-spin text-gray-700" />
                  ) : (
                    <SpellCheck size={12} className="text-gray-700" />
                  )}
                  <span>Correggi Refusi</span>
                </button>

                {rawText && rawText !== currentText && (
                  <button
                    type="button"
                    onClick={handleRestoreRawText}
                    disabled={isEnhancingAi}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-600 bg-white hover:bg-gray-100 border border-gray-200 px-2 py-1 rounded-lg transition-colors shadow-2xs"
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
            className="w-full bg-white border border-gray-300 focus:border-black rounded-xl p-3 text-gray-900 font-medium text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-black"
          />
          <div className="flex justify-between items-center text-[11px] text-gray-500 mt-1">
            <span className="flex items-center gap-1.5">
              <span>
                {currentText.trim() ? `${currentText.trim().split(/\s+/).length} parole` : '0 parole'}
              </span>
              {isAiOptimized && (
                <span className="text-purple-700 font-bold">· Testo perfezionato da AI</span>
              )}
            </span>
            <span className="font-semibold text-gray-600">
              Pagine salvate: {scannedPages.length}
            </span>
          </div>
        </div>

        {/* Already saved pages list */}
        {scannedPages.length > 0 && (
          <div className="border border-gray-200 rounded-2xl p-3 bg-white flex flex-col gap-2 max-h-36 overflow-y-auto">
            <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
              <FileCheck2 size={14} className="text-blue-600" />
              Pagine pronte nel documento ({scannedPages.length})
            </span>
            <div className="flex flex-col gap-1.5">
              {scannedPages.map((page, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-gray-200 rounded-lg p-2 flex items-center justify-between text-xs gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="bg-gray-100 text-gray-700 font-black px-1.5 py-0.5 rounded text-[10px]">
                      #{idx + 1}
                    </span>
                    <span className="text-gray-700 font-medium truncate">
                      {page.slice(0, 48)}...
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemovePage(idx)}
                    className="text-gray-400 hover:text-red-600 p-1"
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
        <div className="flex flex-col gap-2 pt-1 border-t border-gray-200">
          {onScanResultsReady && (scannedPages.length > 0 || currentText.trim()) && (
            <button
              type="button"
              onClick={handleOpenInResultsPage}
              disabled={loading}
              className="w-full min-h-[44px] bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-900 font-bold py-2.5 px-4 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-xs active:scale-98"
            >
              <BookOpen size={16} className="text-blue-700" />
              <span>Mostra risultati nella pagina dedicata</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleAddPage}
            disabled={!currentText.trim() || loading}
            className="w-full bg-white hover:bg-gray-100 border border-gray-300 text-gray-900 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-2xs"
          >
            <Sparkles size={16} className="text-purple-600" />
            <span>Aggiungi questa pagina e fanne un'altra</span>
          </button>

          <button
            type="button"
            onClick={handleSaveBook}
            disabled={loading || (scannedPages.length === 0 && !currentText.trim())}
            className="w-full min-h-[48px] bg-black hover:bg-gray-900 text-white font-bold text-sm py-2.5 px-6 rounded-xl flex items-center justify-center gap-2 active:scale-98 transition-all shadow-sm disabled:opacity-50"
          >
            <span>
              Crea e salva libro ({scannedPages.length + (currentText.trim() ? 1 : 0)}{' '}
              {scannedPages.length + (currentText.trim() ? 1 : 0) === 1 ? 'pagina' : 'pagine'})
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
