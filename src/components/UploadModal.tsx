import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  X,
  FileText,
  AlertCircle,
  BookOpen,
  Camera,
  Cloud,
  Headphones,
  Volume2,
  Sparkles,
  Languages,
  Sliders,
} from 'lucide-react';
import { fileParser } from '../services/fileParser';
import { Book, ScanSessionData } from '../types';
import { ScanProgressCircle } from './ScanProgressCircle';
import { OcrProgress } from '../services/tesseractOcr';
import { pdfOcrService } from '../services/pdfOcrService';
import { audioTranscribeService } from '../services/audioTranscribeService';
import { GoogleDriveModal } from './GoogleDriveModal';

export type UploadModalMode = 'all' | 'scanned_pdf' | 'audio';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookAdded: (book: Book) => void;
  onScanResultsReady?: (session: ScanSessionData) => void;
  initialMode?: UploadModalMode;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onBookAdded,
  onScanResultsReady,
  initialMode = 'all',
}) => {
  const [loading, setLoading] = useState(false);
  const [loadingFileName, setLoadingFileName] = useState<string>('');
  const [isOcrLoading, setIsOcrLoading] = useState<boolean>(false);
  const [uploadMode, setUploadMode] = useState<UploadModalMode>(initialMode);
  const [audioLanguage, setAudioLanguage] = useState<string>('ita');
  const [audioFormat, setAudioFormat] = useState<'narrative' | 'dialogue' | 'summary'>('narrative');
  const [isDriveOpen, setIsDriveOpen] = useState<boolean>(false);
  const [ocrProgress, setOcrProgress] = useState<OcrProgress>({
    status: 'init',
    progress: 0.1,
    message: 'Preparazione documento...',
  });
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scannedPdfInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setUploadMode(initialMode);
      setError(null);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleFile = async (file: File, forceScannedPdf: boolean = false) => {
    setError(null);
    setLoading(true);
    setLoadingFileName(file.name);
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const imageType = ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'tiff'].includes(ext);
    const isAudio = audioTranscribeService.isAudioFile(file) || uploadMode === 'audio';

    // 0. If an audio file is uploaded (or modal is in audio mode), transcribe with Gemini AI
    if (isAudio) {
      setIsOcrLoading(true);
      try {
        setOcrProgress({
          status: 'reading',
          progress: 0.1,
          message: 'Caricamento traccia audio in corso...',
        });

        const transcribeResult = await audioTranscribeService.transcribeAudio(file, {
          language: audioLanguage,
          format: audioFormat,
          onProgress: (p) => {
            setOcrProgress({
              status: p.status,
              progress: p.progress,
              message: p.message,
            });
          },
        });

        const newBook: Book = {
          book_id: `audio-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          owner_id: 'user-default-1',
          title: transcribeResult.title,
          author: 'Trascrizione Gemini AI',
          file_type: 'audio',
          size: file.size,
          pages: transcribeResult.pages,
          source: 'upload',
          created_at: new Date().toISOString(),
          coverColor: '#FFFFFF',
          currentPage: 0,
          ocr_engine: transcribeResult.engine,
          audioUrl: transcribeResult.audioBlobUrl,
        };

        onBookAdded(newBook);
        onClose();
        return;
      } catch (audioErr: any) {
        console.error('Audio transcription error:', audioErr);
        setError(
          audioErr?.message ||
            'Errore durante la trascrizione audio con Gemini AI. Verifica la connessione o riprova con un altro file audio.'
        );
        setLoading(false);
        setIsOcrLoading(false);
        return;
      }
    }

    // 1. If an image is uploaded directly, perform OCR and open Scan Results
    if (imageType) {
      setIsOcrLoading(true);
      try {
        const parsed = await fileParser.parseFile(file, (prog) => {
          setOcrProgress(prog);
        });

        if (onScanResultsReady) {
          onScanResultsReady({
            bookId: `scan-${Date.now()}`,
            title: parsed.title,
            pages: parsed.pages,
            rawPages: parsed.pages,
            imageUrls: [URL.createObjectURL(file)],
            engine: parsed.ocr_engine || 'Gemini AI Vision',
            confidence: 98,
            isAiOptimized: true,
            currentPageIndex: 0,
          });
          onClose();
          return;
        }
      } catch (err: any) {
        setError(err?.message || 'Errore durante la scansione OCR dell\'immagine.');
        setLoading(false);
        setIsOcrLoading(false);
        return;
      }
    }

    // 2. If a PDF is uploaded, check if it is a SCANNED PDF (contains images / no digital text)
    if (ext === 'pdf') {
      setIsOcrLoading(true);
      setOcrProgress({
        status: 'inspecting-pdf',
        progress: 0.08,
        message: 'Analisi struttura PDF e rilevamento pagine scansionate...',
      });

      try {
        const inspection = await pdfOcrService.inspectPdf(file);
        const shouldRunOcr = forceScannedPdf || inspection.isScanned || uploadMode === 'scanned_pdf';

        if (shouldRunOcr) {
          setOcrProgress({
            status: 'scanned-pdf-detected',
            progress: 0.15,
            message: 'Rilevato libro PDF scansionato! Apertura funzione OCR e conversione in testo...',
          });

          const scanSession = await pdfOcrService.convertScannedPdf(file, {
            engine: 'ai-vision',
            language: 'ita',
            autoOptimizeAi: true,
            onProgress: (prog) => {
              setOcrProgress(prog);
            },
          });

          // Open the OCR function interface (ScanResultsPage) with the converted text
          if (onScanResultsReady) {
            onScanResultsReady(scanSession);
            onClose();
            return;
          }
        }
      } catch (ocrErr: any) {
        console.warn('Errore durante l\'OCR del PDF scansionato:', ocrErr);
        // Fallback to standard parsing if OCR fails
      }
    }

    // 3. Standard document parsing (Digital PDF, EPUB, TXT)
    setIsOcrLoading(false);
    try {
      await new Promise((resolve) => setTimeout(resolve, 200));

      const parsed = await fileParser.parseFile(file, (prog) => {
        setOcrProgress(prog);
      });

      if (parsed.file_type === 'scan' && onScanResultsReady) {
        onScanResultsReady({
          bookId: `scan-${Date.now()}`,
          title: parsed.title,
          pages: parsed.pages,
          rawPages: parsed.pages,
          imageUrls: [URL.createObjectURL(file)],
          engine: parsed.ocr_engine || 'Gemini AI Vision',
          confidence: 98,
          isAiOptimized: true,
          currentPageIndex: 0,
        });
        onClose();
        return;
      }

      const newBook: Book = {
        ...parsed,
        book_id: `book-${Date.now()}`,
        owner_id: 'user-default-1',
        created_at: new Date().toISOString(),
        coverColor: '#FFFFFF',
        currentPage: 0,
      };

      onBookAdded(newBook);
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Errore durante la lettura del file. Prova con un file di testo, PDF, EPUB o audio.');
    } finally {
      setLoading(false);
      setIsOcrLoading(false);
      setLoadingFileName('');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileToUpload = files[0];
      e.target.value = '';
      handleFile(fileToUpload, uploadMode === 'scanned_pdf');
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0], uploadMode === 'scanned_pdf');
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDriveImport = async (file: File) => {
    setError(null);
    setLoading(true);
    setLoadingFileName(file.name);
    try {
      const isAudio = audioTranscribeService.isAudioFile(file);
      if (isAudio) {
        setIsOcrLoading(true);
        setOcrProgress({
          status: 'reading',
          progress: 0.1,
          message: 'Trascrizione traccia audio da Google Drive con Gemini AI...',
        });

        const transcribeResult = await audioTranscribeService.transcribeAudio(file, {
          language: audioLanguage,
          format: audioFormat,
          onProgress: (p) => {
            setOcrProgress({
              status: p.status,
              progress: p.progress,
              message: p.message,
            });
          },
        });

        const newBook: Book = {
          book_id: `audio-drive-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          owner_id: 'user-default-1',
          title: transcribeResult.title,
          author: 'Google Drive / Trascrizione Gemini AI',
          file_type: 'audio',
          size: file.size,
          pages: transcribeResult.pages,
          source: 'upload',
          created_at: new Date().toISOString(),
          coverColor: '#FFFFFF',
          currentPage: 0,
          ocr_engine: transcribeResult.engine,
          audioUrl: transcribeResult.audioBlobUrl,
        };

        onBookAdded(newBook);
        onClose();
        return;
      }

      const title = file.name.replace(/\.[^/.]+$/, '').trim() || 'Documento Google Drive';
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      const file_type: 'pdf' | 'epub' | 'txt' | 'scan' | 'audio' =
        ext === 'pdf' ? 'pdf' : ext === 'epub' ? 'epub' : 'txt';

      let parsed: any = null;
      try {
        parsed = await fileParser.parseFile(file, (prog) => {
          setOcrProgress(prog);
        });
      } catch (err) {
        console.warn('fileParser error in UploadModal Drive import:', err);
      }

      let pages: string[] = [];
      if (parsed?.pages && Array.isArray(parsed.pages) && parsed.pages.length > 0) {
        pages = parsed.pages.filter((p: string) => typeof p === 'string' && p.trim().length > 0);
      }

      if (pages.length === 0) {
        try {
          const text = await file.text();
          if (text && text.trim().length > 0) {
            pages = fileParser.splitIntoPages(text);
          }
        } catch {
          // ignore
        }
      }

      if (pages.length === 0) {
        pages = [
          `Documento Google Drive: ${file.name}\n\nFile importato con successo dal tuo account Google Drive. Pronto per la lettura visiva e l'ascolto vocale.`,
        ];
      }

      const newBook: Book = {
        book_id: `drive-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        owner_id: 'user-default-1',
        title: parsed?.title?.trim() || title,
        author: parsed?.author?.trim() || 'Google Drive',
        file_type: parsed?.file_type || file_type,
        size: file.size || parsed?.size || 1024,
        pages,
        source: 'upload',
        created_at: new Date().toISOString(),
        coverColor: '#FFFFFF',
        currentPage: 0,
        ocr_engine: parsed?.ocr_engine,
        audioUrl: parsed?.audioUrl,
      };

      onBookAdded(newBook);
      setIsDriveOpen(false);
      onClose();
    } catch (err: any) {
      console.error('Error in handleDriveImport in UploadModal:', err);
      setError(err?.message || 'Errore durante l\'importazione del file da Google Drive.');
    } finally {
      setLoading(false);
      setLoadingFileName('');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-modal-title"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3.5 sm:p-5 animate-fade-in select-none font-sans"
    >
      <div className="bg-white border-2 border-[#2BA8A2]/30 rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-card flex flex-col gap-4 text-slate-800 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-dashed border-[#2BA8A2]/20 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#E8F6F5] border-2 border-[#2BA8A2]/30 flex items-center justify-center text-[#1E8C86] shadow-xs">
              {uploadMode === 'audio' ? (
                <Headphones size={20} className="text-[#5DADE2]" />
              ) : uploadMode === 'scanned_pdf' ? (
                <Camera size={20} className="text-[#EF6C4A]" />
              ) : (
                <Upload size={20} className="text-[#1E8C86]" />
              )}
            </div>
            <div>
              <h2 id="upload-modal-title" className="text-base sm:text-lg font-black text-[#1E8C86]">
                {uploadMode === 'audio'
                  ? 'Trascrivi Audio con Gemini AI'
                  : uploadMode === 'scanned_pdf'
                  ? 'Carica PDF Scansionato'
                  : 'Carica Libro o Documento'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {uploadMode === 'audio'
                  ? 'Carica MP3/WAV/M4A e convertilo in testo con Gemini AI'
                  : uploadMode === 'scanned_pdf'
                  ? 'Estrai testo con OCR AI avanzato da scansioni PDF'
                  : 'PDF, EPUB, TXT, Immagini, Audio o Google Drive'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#E8F6F5] border border-[#2BA8A2]/30 text-[#1E8C86] hover:bg-[#2BA8A2]/20 active:scale-95 flex items-center justify-center transition-all shrink-0"
            aria-label="Chiudi"
          >
            <X size={18} />
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 bg-[#EF6C4A]/10 border-2 border-[#EF6C4A]/30 rounded-2xl text-[#D45233] text-xs flex items-center gap-2 font-bold">
            <AlertCircle size={16} className="shrink-0 text-[#EF6C4A]" />
            <span>{error}</span>
          </div>
        )}

        {/* Loading state with ScanProgressCircle */}
        {loading ? (
          <div className="py-6 flex flex-col items-center justify-center">
            <ScanProgressCircle
              progress={ocrProgress.progress}
              status={ocrProgress.status}
              message={ocrProgress.message}
              fileName={loadingFileName}
              engine={uploadMode === 'audio' ? 'Gemini 3.5 Transcribe' : undefined}
              subtitle={
                uploadMode === 'audio'
                  ? 'Ascolto profondo, trascrizione e punteggiatura con Gemini AI'
                  : undefined
              }
            />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Google Drive Upload Option */}
            <div className="bg-[#E8F6F5] border-2 border-[#2BA8A2]/30 rounded-2xl p-4 flex flex-col gap-3 shadow-xs">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-[#2BA8A2]/30 flex items-center justify-center shrink-0 shadow-xs">
                    <svg className="w-5 h-5 text-[#1E8C86]" viewBox="0 0 87.3 78" fill="none">
                      <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5z" fill="#2BA8A2"/>
                      <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#3CC4BD"/>
                      <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.5l5.85 10.15z" fill="#1E8C86"/>
                      <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#FFD23F"/>
                      <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#EF6C4A"/>
                      <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#5DADE2"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                      <span>Carica da Google Drive</span>
                      <span className="text-[10px] bg-[#2BA8A2] text-white font-black px-2 py-0.5 rounded-full uppercase">
                        Drive
                      </span>
                    </h3>
                    <p className="text-xs text-slate-600 font-medium">
                      Importa e aggiungi subito alla libreria da Drive
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDriveOpen(true)}
                  className="px-3.5 py-2 rounded-full bg-white border-2 border-[#2BA8A2]/40 hover:bg-[#E8F6F5] active:scale-95 text-xs font-black text-[#1E8C86] transition-all shrink-0 flex items-center gap-1.5 shadow-xs"
                >
                  <Cloud size={14} />
                  <span>Scegli da Drive</span>
                </button>
              </div>
            </div>

            {/* Modalità Upload File Locale: 3 Tab */}
            <div className="flex items-center gap-1.5 p-1.5 bg-[#EFF8F7] border border-[#2BA8A2]/20 rounded-2xl overflow-x-auto">
              <button
                type="button"
                onClick={() => setUploadMode('all')}
                className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 whitespace-nowrap active:scale-95 ${
                  uploadMode === 'all'
                    ? 'bg-[#2BA8A2] text-white shadow-teal-glow'
                    : 'text-slate-600 hover:text-[#1E8C86]'
                }`}
              >
                <BookOpen size={14} />
                <span>Libri & Documenti</span>
              </button>

              <button
                type="button"
                onClick={() => setUploadMode('scanned_pdf')}
                className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 whitespace-nowrap active:scale-95 ${
                  uploadMode === 'scanned_pdf'
                    ? 'bg-[#2BA8A2] text-white shadow-teal-glow'
                    : 'text-slate-600 hover:text-[#1E8C86]'
                }`}
              >
                <Camera size={14} />
                <span>PDF Scansionati (OCR)</span>
              </button>

              <button
                type="button"
                onClick={() => setUploadMode('audio')}
                className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 whitespace-nowrap active:scale-95 ${
                  uploadMode === 'audio'
                    ? 'bg-[#2BA8A2] text-white shadow-teal-glow'
                    : 'text-slate-600 hover:text-[#1E8C86]'
                }`}
              >
                <Headphones size={14} />
                <span>Audio (Gemini AI)</span>
              </button>
            </div>

            {/* Specific Audio Settings when in Audio Mode */}
            {uploadMode === 'audio' && (
              <div className="bg-[#FFF8E7] border-2 border-[#FFD23F] rounded-2xl p-3.5 flex flex-col gap-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[#1E8C86] flex items-center gap-1.5">
                    <Sparkles size={14} className="text-[#FFD23F] fill-[#FFD23F]" />
                    <span>Impostazioni Trascrizione AI</span>
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-900 bg-[#FFD23F] px-2 py-0.5 rounded-full shadow-xs">
                    Gemini 3.5 Transcribe
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Lingua Audio */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                      <Languages size={12} className="text-[#1E8C86]" />
                      <span>Lingua traccia</span>
                    </label>
                    <select
                      value={audioLanguage}
                      onChange={(e) => setAudioLanguage(e.target.value)}
                      className="bg-white border-2 border-[#FFD23F]/60 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:border-[#2BA8A2] focus:outline-none"
                    >
                      <option value="ita">Italiano (consigliato)</option>
                      <option value="auto">Rilevamento automatico</option>
                      <option value="eng">Inglese</option>
                      <option value="esp">Spagnolo</option>
                      <option value="fra">Francese</option>
                      <option value="deu">Tedesco</option>
                    </select>
                  </div>

                  {/* Formato Trascrizione */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                      <Sliders size={12} className="text-[#1E8C86]" />
                      <span>Stile impaginazione</span>
                    </label>
                    <select
                      value={audioFormat}
                      onChange={(e) => setAudioFormat(e.target.value as any)}
                      className="bg-white border-2 border-[#FFD23F]/60 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:border-[#2BA8A2] focus:outline-none"
                    >
                      <option value="narrative">Narrativa (paragrafi fluidi)</option>
                      <option value="dialogue">Dialoghi / Fedele</option>
                      <option value="summary">Riassunto strutturato</option>
                    </select>
                  </div>
                </div>

                <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                  Supporta MP3, WAV, M4A, AAC, OGG, WebM, FLAC. Gemini AI riconosce la voce, inserisce punteggiatura e genera un libro pronto per la lettura visiva e l'ascolto vocale.
                </p>
              </div>
            )}

            {/* Dropzone locale */}
            <div
              onClick={() => {
                if (uploadMode === 'audio') {
                  audioInputRef.current?.click();
                } else if (uploadMode === 'scanned_pdf') {
                  scannedPdfInputRef.current?.click();
                } else {
                  fileInputRef.current?.click();
                }
              }}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="border-2 border-dashed border-[#2BA8A2]/40 hover:border-[#2BA8A2] rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors bg-[#EFF8F7]/60 hover:bg-[#E8F6F5] text-center group"
            >
              {/* Inputs nascosti */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.epub,.txt,.jpg,.jpeg,.png,.webp,.mp3,.wav,.m4a,.aac,.ogg,.webm,.flac,text/plain,application/pdf,image/*,audio/*"
                onChange={handleInputChange}
                className="hidden"
              />
              <input
                ref={scannedPdfInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file, true);
                }}
                className="hidden"
              />
              <input
                ref={audioInputRef}
                type="file"
                accept=".mp3,.wav,.m4a,.aac,.ogg,.oga,.webm,.flac,.opus,.wma,audio/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file, false);
                }}
                className="hidden"
              />

              <div className="w-16 h-16 rounded-2xl bg-[#E8F6F5] border-2 border-[#2BA8A2]/30 flex items-center justify-center text-[#1E8C86] group-hover:scale-105 group-hover:bg-[#2BA8A2] group-hover:text-white transition-all shadow-xs">
                {uploadMode === 'audio' ? (
                  <Headphones size={32} />
                ) : uploadMode === 'scanned_pdf' ? (
                  <Camera size={32} />
                ) : (
                  <FileText size={32} />
                )}
              </div>

              <div>
                <p className="text-base font-black text-slate-900">
                  {uploadMode === 'audio'
                    ? 'Tocca o trascina qui il tuo file audio'
                    : 'Tocca o trascina qui il tuo file'}
                </p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {uploadMode === 'audio'
                    ? 'MP3, WAV, M4A, AAC, OGG, WebM, FLAC'
                    : uploadMode === 'scanned_pdf'
                    ? 'PDF scansionati o con immagini'
                    : 'PDF, EPUB, TXT, Immagini o tracce Audio'}
                </p>
              </div>

              <div className="mt-1 bg-[#FFD23F] hover:bg-[#FFE47A] text-slate-900 font-black px-6 py-2.5 rounded-full active:scale-95 transition-all text-xs min-h-[42px] flex items-center justify-center shadow-accent-glow">
                <span>
                  {uploadMode === 'audio'
                    ? 'Scegli audio dal dispositivo'
                    : 'Scegli file dal dispositivo'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Google Drive File Explorer Modal */}
      <GoogleDriveModal
        isOpen={isDriveOpen}
        onClose={() => setIsDriveOpen(false)}
        onFileDownloaded={handleDriveImport}
      />
    </div>
  );
};


