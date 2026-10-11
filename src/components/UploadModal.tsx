import React, { useState, useRef } from 'react';
import { Upload, X, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { fileParser } from '../services/fileParser';
import { Book, ScanSessionData } from '../types';
import { ScanProgressCircle } from './ScanProgressCircle';
import { OcrProgress } from '../services/tesseractOcr';

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
  const [isImageFile, setIsImageFile] = useState<boolean>(false);
  const [ocrProgress, setOcrProgress] = useState<OcrProgress>({
    status: 'init',
    progress: 0.1,
    message: 'Preparazione immagine...',
  });
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFile = async (file: File) => {
    setError(null);
    setLoading(true);
    setLoadingFileName(file.name);
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const imageType = ['png', 'jpg', 'jpeg', 'webp', 'bmp'].includes(ext);
    setIsImageFile(imageType);

    try {
      await new Promise((resolve) => setTimeout(resolve, 300));

      const parsed = await fileParser.parseFile(file, (prog) => {
        setOcrProgress(prog);
      });

      // If an image was uploaded and scanned, present it on the dedicated Scan Results page
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
      setLoadingFileName('');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileToUpload = files[0];
      e.target.value = '';
      handleFile(fileToUpload);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-modal-title"
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-white border border-gray-200 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl flex flex-col gap-6 text-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center border border-red-100 shadow-xs">
              <Upload size={26} />
            </div>
            <div>
              <h2 id="upload-modal-title" className="text-xl font-black text-gray-900">
                Carica Libro
              </h2>
              <p className="text-xs font-semibold text-gray-500">Formati: PDF, EPUB, TXT, Immagini con OCR AI</p>
            </div>
          </div>
          {!loading && (
            <button
              onClick={onClose}
              aria-label="Chiudi finestra di caricamento"
              className="w-10 h-10 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-center gap-3 text-red-800">
            <AlertCircle className="text-red-600 shrink-0" size={24} />
            <p className="text-sm font-semibold">{error}</p>
          </div>
        )}

        {/* LOADING CIRCLE (Cerchio Loading) */}
        {loading ? (
          isImageFile ? (
            <ScanProgressCircle
              progress={ocrProgress.progress}
              message={ocrProgress.message || 'Scansione del documento in corso...'}
              engine="Gemini AI Vision"
              fileName={loadingFileName}
              subtitle="Trascrizione e ottimizzazione in stile Google Drive"
              onCancel={() => setLoading(false)}
            />
          ) : (
            <div
              className="py-12 px-4 flex flex-col items-center justify-center text-center gap-6"
              role="status"
              aria-live="polite"
            >
              {/* Animated Circular Spinner */}
              <div className="relative flex items-center justify-center">
                <div className="w-24 h-24 rounded-full border-4 border-gray-200 border-t-red-600 animate-spin" />
                <Loader2 className="absolute text-red-600 animate-spin" size={36} />
              </div>

              <div className="flex flex-col gap-2 max-w-sm">
                <h3 className="text-2xl font-black text-gray-900">
                  Caricamento in corso...
                </h3>
                <p className="text-base font-bold text-gray-700 truncate">
                  {loadingFileName}
                </p>
                <p className="text-sm font-medium text-gray-500 leading-relaxed">
                  Stiamo leggendo ed estraendo le pagine del libro per la sintesi vocale.
                </p>
              </div>
            </div>
          )
        ) : (
          /* Normal Drop Zone / File Picker */
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 hover:border-black bg-gray-50/70 rounded-2xl p-8 flex flex-col items-center justify-center gap-4 cursor-pointer transition-colors text-center group min-h-[180px]"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                fileInputRef.current?.click();
              }
            }}
            aria-label="Seleziona un file PDF, EPUB, TXT o un'immagine per OCR dal tuo dispositivo"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.epub,.txt,.jpg,.jpeg,.png,.webp,text/plain,application/pdf,image/*"
              onChange={handleInputChange}
              className="hidden"
            />

            <FileText
              size={52}
              className="text-gray-400 group-hover:text-red-600 transition-colors"
            />

            <div>
              <p className="text-lg font-bold text-gray-900 group-hover:text-red-600">
                Tocca o trascina qui il tuo file
              </p>
              <p className="text-xs text-gray-500 font-medium mt-1">
                Supporta PDF, EPUB, TXT e foto di pagine con OCR ottimizzato con AI
              </p>
            </div>

            <div className="mt-2 bg-gray-900 text-white font-bold px-6 py-3 rounded-xl hover:bg-black active:scale-95 transition-all text-sm min-h-[46px] flex items-center justify-center shadow-xs">
              <span>Scegli file dal dispositivo</span>
            </div>
          </div>
        )}

        {!loading && (
          <div className="text-xs text-gray-500 font-medium text-center">
            Suggerimento: I libri caricati vengono memorizzati nel browser per l'accesso immediato anche offline.
          </div>
        )}
      </div>
    </div>
  );
};
