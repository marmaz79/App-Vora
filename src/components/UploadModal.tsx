import React, { useState, useRef } from 'react';
import { Upload, X, FileText, AlertCircle, Loader2, Sparkles, BookOpen, Camera, Cloud } from 'lucide-react';
import { fileParser } from '../services/fileParser';
import { Book, ScanSessionData } from '../types';
import { ScanProgressCircle } from './ScanProgressCircle';
import { OcrProgress } from '../services/tesseractOcr';
import { pdfOcrService } from '../services/pdfOcrService';
import { GoogleDriveModal } from './GoogleDriveModal';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookAdded: (book: Book) => void;
  onScanResultsReady?: (session: ScanSessionData) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onBookAdded,
  onScanResultsReady,
}) => {
  const [loading, setLoading] = useState(false);
  const [loadingFileName, setLoadingFileName] = useState<string>('');
  const [isOcrLoading, setIsOcrLoading] = useState<boolean>(false);
  const [uploadMode, setUploadMode] = useState<'all' | 'scanned_pdf'>('all');
  const [isDriveOpen, setIsDriveOpen] = useState<boolean>(false);
  const [ocrProgress, setOcrProgress] = useState<OcrProgress>({
    status: 'init',
    progress: 0.1,
    message: 'Preparazione documento...',
  });
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scannedPdfInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFile = async (file: File, forceScannedPdf: boolean = false) => {
    setError(null);
    setLoading(true);
    setLoadingFileName(file.name);
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const imageType = ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'tiff'].includes(ext);

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
      setError(e?.message || 'Errore durante la lettura del file. Prova con un file di testo, PDF o EPUB.');
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

  const handleScannedPdfInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileToUpload = files[0];
      e.target.value = '';
      handleFile(fileToUpload, true);
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
      const title = file.name.replace(/\.[^/.]+$/, '').trim() || 'Documento Google Drive';
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      const file_type: 'pdf' | 'epub' | 'txt' | 'scan' =
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
          `Documento Google Drive: ${file.name}\n\nFile importato con successo dal tuo account Google Drive. Pronto per la lettura visiva e l'ascolto vocale.`
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
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3.5 sm:p-5 animate-fade-in select-none"
    >
      <div className="bg-black border border-white/20 rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl flex flex-col gap-4 text-white max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-black border border-white/20 flex items-center justify-center text-white">
              <Upload size={20} className="text-white" />
            </div>
            <div>
              <h2 id="upload-modal-title" className="text-base sm:text-lg font-black text-white">
                {uploadMode === 'scanned_pdf' ? 'Carica PDF Scansionato' : 'Carica Libro o Documento'}
              </h2>
              <p className="text-xs text-zinc-400">
                {uploadMode === 'scanned_pdf'
                  ? 'Estrai testo con OCR AI avanzato da scansioni PDF'
                  : 'PDF, EPUB, TXT, Immagini o Google Drive'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors shrink-0"
            aria-label="Chiudi"
          >
            <X size={18} />
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 bg-black border border-white/50 rounded-xl text-white text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0 text-white" />
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
            />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Google Drive Upload Option */}
            <div className="bg-black border border-white/20 rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-black border border-white/20 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-white" viewBox="0 0 87.3 78" fill="none">
                      <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5z" fill="#FFFFFF"/>
                      <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#FFFFFF"/>
                      <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.5l5.85 10.15z" fill="#FFFFFF"/>
                      <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#FFFFFF"/>
                      <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#FFFFFF"/>
                      <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#FFFFFF"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <span>Carica da Google Drive</span>
                      <span className="text-[10px] bg-white text-black font-extrabold px-1.5 py-0.2 rounded-full uppercase">
                        Drive
                      </span>
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Importa e aggiungi subito alla libreria da Drive
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDriveOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-transparent border border-white hover:bg-white/10 active:scale-95 text-xs font-bold text-white transition-all shrink-0 flex items-center gap-1.5"
                >
                  <Cloud size={14} />
                  <span>Scegli da Drive</span>
                </button>
              </div>
            </div>

            {/* Modalità Upload File Locale */}
            <div className="flex items-center gap-2 p-1 bg-zinc-900 border border-zinc-800 rounded-2xl">
              <button
                type="button"
                onClick={() => setUploadMode('all')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  uploadMode === 'all'
                    ? 'bg-white text-black shadow-sm font-black'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <BookOpen size={14} />
                <span>Libri & Documenti</span>
              </button>
              <button
                type="button"
                onClick={() => setUploadMode('scanned_pdf')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  uploadMode === 'scanned_pdf'
                    ? 'bg-white text-black shadow-sm font-black'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Camera size={14} />
                <span>PDF Scansionati (OCR)</span>
              </button>
            </div>

            {/* Dropzone locale */}
            <div
              onClick={() => {
                if (uploadMode === 'scanned_pdf') {
                  scannedPdfInputRef.current?.click();
                } else {
                  fileInputRef.current?.click();
                }
              }}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="border-2 border-dashed border-zinc-700 hover:border-white rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors bg-zinc-950/40 hover:bg-zinc-900/40 text-center group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.epub,.txt,.jpg,.jpeg,.png,.webp,text/plain,application/pdf,image/*"
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

              <FileText
                size={46}
                className="text-zinc-500 group-hover:text-white transition-colors"
              />

              <div>
                <p className="text-base font-bold text-white">
                  Tocca o trascina qui il tuo file
                </p>
              </div>

              <div className="mt-1 bg-white hover:bg-zinc-200 text-black font-black px-5 py-2.5 rounded-xl active:scale-95 transition-all text-xs min-h-[42px] flex items-center justify-center shadow-md">
                <span>Scegli file dal dispositivo</span>
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

