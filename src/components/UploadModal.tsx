import React, { useState, useRef } from 'react';
import { Upload, X, FileText, AlertCircle, Loader2, Sparkles, BookOpen, Camera } from 'lucide-react';
import { fileParser } from '../services/fileParser';
import { Book, ScanSessionData } from '../types';
import { ScanProgressCircle } from './ScanProgressCircle';
import { OcrProgress } from '../services/tesseractOcr';
import { pdfOcrService } from '../services/pdfOcrService';

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
        coverColor: parsed.file_type === 'pdf' ? '#FFD600' : '#00E676',
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-modal-title"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
    >
      <div className="bg-[#12141C] border border-[#232736] rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl flex flex-col gap-5 text-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#232736] pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#260E12] text-red-500 flex items-center justify-center border border-red-900/60 shadow-xs">
              <Upload size={24} />
            </div>
            <div>
              <h2 id="upload-modal-title" className="text-xl font-black text-white">
                Carica Libro
              </h2>
              <p className="text-xs font-semibold text-gray-400">
                PDF digitali, PDF scansionati (OCR), EPUB e TXT
              </p>
            </div>
          </div>
          {!loading && (
            <button
              onClick={onClose}
              aria-label="Chiudi finestra di caricamento"
              className="w-10 h-10 rounded-xl bg-[#1C202F] text-gray-400 flex items-center justify-center hover:bg-[#252B3E] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white transition-colors"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {error && (
          <div className="bg-[#260E12] border border-red-900/70 p-3.5 rounded-xl flex items-center gap-3 text-red-300">
            <AlertCircle className="text-red-500 shrink-0" size={22} />
            <p className="text-xs font-semibold leading-relaxed">{error}</p>
          </div>
        )}

        {/* LOADING CIRCLE (Cerchio Loading) */}
        {loading ? (
          isOcrLoading ? (
            <ScanProgressCircle
              progress={ocrProgress.progress}
              message={ocrProgress.message || 'Scansione OCR del libro PDF in corso...'}
              engine="Gemini AI Vision"
              fileName={loadingFileName}
              subtitle="Trascrizione ad alta precisione e conversione in testo modificabile"
              onCancel={() => {
                setLoading(false);
                setIsOcrLoading(false);
              }}
            />
          ) : (
            <div
              className="py-12 px-4 flex flex-col items-center justify-center text-center gap-6"
              role="status"
              aria-live="polite"
            >
              <div className="relative flex items-center justify-center">
                <div className="w-24 h-24 rounded-full border-4 border-zinc-800 border-t-red-600 animate-spin" />
                <Loader2 className="absolute text-red-600 animate-spin" size={36} />
              </div>

              <div className="flex flex-col gap-2 max-w-sm">
                <h3 className="text-2xl font-black text-white">
                  Caricamento in corso...
                </h3>
                <p className="text-base font-bold text-gray-200 truncate">
                  {loadingFileName}
                </p>
                <p className="text-sm font-medium text-gray-400 leading-relaxed">
                  Stiamo leggendo ed estraendo le pagine del libro per la sintesi vocale.
                </p>
              </div>
            </div>
          )
        ) : (
          /* Normal Controls */
          <div className="flex flex-col gap-4">
            {/* Quick Option for Scanned PDF */}
            <div className="bg-[#161824] border border-[#2B3042] rounded-2xl p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#24153B] border border-purple-500/40 text-purple-400 flex items-center justify-center shrink-0">
                  <Sparkles size={20} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-white truncate">
                      Libro PDF Scansionato?
                    </span>
                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-purple-900/80 text-purple-200 border border-purple-500/40">
                      OCR AI
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 font-medium truncate mt-0.5">
                    Rileva automaticamente o esegui OCR su tutte le pagine
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => scannedPdfInputRef.current?.click()}
                className="bg-purple-600 hover:bg-purple-500 active:scale-95 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all shrink-0 flex items-center gap-1.5 shadow-md shadow-purple-950/40"
              >
                <Sparkles size={14} />
                <span>Carica PDF OCR</span>
              </button>
            </div>

            {/* Hidden Input specifically for Scanned PDF */}
            <input
              ref={scannedPdfInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleScannedPdfInputChange}
              className="hidden"
            />

            {/* Normal Drop Zone / File Picker */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#2B3042] hover:border-red-500 bg-[#161824]/60 rounded-2xl p-7 flex flex-col items-center justify-center gap-3.5 cursor-pointer transition-colors text-center group min-h-[170px]"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  fileInputRef.current?.click();
                }
              }}
              aria-label="Seleziona un file PDF, PDF scansionato, EPUB o TXT dal tuo dispositivo"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.epub,.txt,.jpg,.jpeg,.png,.webp,text/plain,application/pdf,image/*"
                onChange={handleInputChange}
                className="hidden"
              />

              <FileText
                size={46}
                className="text-gray-500 group-hover:text-red-500 transition-colors"
              />

              <div>
                <p className="text-base font-bold text-white group-hover:text-red-400">
                  Tocca o trascina qui il tuo file
                </p>
                <p className="text-xs text-gray-400 font-medium mt-1">
                  Se il PDF è scansionato, aprirà automaticamente l'OCR per trasformarlo in testo
                </p>
              </div>

              <div className="mt-1 bg-red-600 hover:bg-red-500 text-white font-bold px-5 py-2.5 rounded-xl active:scale-95 transition-all text-xs min-h-[42px] flex items-center justify-center shadow-md shadow-red-900/30">
                <span>Scegli file dal dispositivo</span>
              </div>
            </div>
          </div>
        )}

        {!loading && (
          <div className="text-[11px] text-gray-400 font-medium text-center">
            Suggerimento: I libri caricati vengono convertiti in testo leggibile e pronti per l'ascolto vocale.
          </div>
        )}
      </div>
    </div>
  );
};

