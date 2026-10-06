import React, { useState, useRef } from 'react';
import { Upload, X, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { fileParser } from '../services/fileParser';
import { Book } from '../types';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookAdded: (book: Book) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onBookAdded }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFile = async (file: File) => {
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const parsed = await fileParser.parseFile(file);
      const newBook: Book = {
        ...parsed,
        book_id: `book-${Date.now()}`,
        owner_id: 'user-default-1',
        created_at: new Date().toISOString(),
        coverColor: parsed.file_type === 'pdf' ? '#FFD600' : '#00E676',
        currentPage: 0,
      };

      onBookAdded(newBook);
      setSuccess(`Libro "${newBook.title}" caricato con successo (${newBook.pages.length} pagine)!`);
      setTimeout(() => {
        setSuccess(null);
        onClose();
      }, 1500);
    } catch (e: any) {
      setError(e?.message || 'Errore durante la lettura del file. Prova con un file di testo, PDF o EPUB.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
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
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-[#1A1A1A] border-4 border-[#FFD600] rounded-3xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-5">
        <div className="flex items-center justify-between border-b-2 border-[#333333] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#FFD600] text-black flex items-center justify-center">
              <Upload size={28} />
            </div>
            <div>
              <h2 id="upload-modal-title" className="text-xl font-black text-white">
                Carica Libro
              </h2>
              <p className="text-sm font-bold text-[#B8B8B8]">Formati: PDF, EPUB, TXT</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Chiudi finestra di caricamento"
            className="w-12 h-12 rounded-xl bg-[#333333] text-white flex items-center justify-center hover:bg-neutral-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FFD600]"
          >
            <X size={24} />
          </button>
        </div>

        {error && (
          <div className="bg-[#FF3B30]/20 border-2 border-[#FF3B30] p-4 rounded-xl flex items-center gap-3 text-white">
            <AlertCircle className="text-[#FF3B30] shrink-0" size={24} />
            <p className="text-sm font-bold">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-[#00E676]/20 border-2 border-[#00E676] p-4 rounded-xl flex items-center gap-3 text-white">
            <CheckCircle className="text-[#00E676] shrink-0" size={24} />
            <p className="text-sm font-bold">{success}</p>
          </div>
        )}

        {/* Drop zone / Upload trigger */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-4 border-dashed border-white/40 hover:border-[#FFD600] bg-black/50 rounded-2xl p-8 flex flex-col items-center justify-center gap-4 cursor-pointer transition-colors text-center group min-h-[160px]"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              fileInputRef.current?.click();
            }
          }}
          aria-label="Seleziona un file PDF, EPUB o TXT dal tuo computer"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.epub,.txt,text/plain,application/pdf"
            onChange={handleInputChange}
            className="hidden"
          />

          <FileText
            size={56}
            className="text-white group-hover:text-[#FFD600] transition-colors"
          />

          <div>
            <p className="text-lg font-black text-white group-hover:text-[#FFD600]">
              {loading ? 'Lettura e suddivisione pagine in corso...' : 'Tocca o trascina qui il tuo file'}
            </p>
            <p className="text-sm text-[#B8B8B8] font-bold mt-1">
              Suddividiamo automaticamente il testo in pagine per la sintesi vocale
            </p>
          </div>

          <div className="mt-2 bg-[#FFD600] text-black font-black px-6 py-3 rounded-xl border-2 border-white hover:bg-[#FFEA00] active:scale-95 transition-all text-base">
            Scegli file dal dispositivo
          </div>
        </div>

        <div className="text-xs text-[#B8B8B8] font-semibold text-center">
          Suggerimento: I libri caricati vengono salvati localmente sul tuo browser per l'accesso immediato anche offline.
        </div>
      </div>
    </div>
  );
};
