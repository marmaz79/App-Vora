import React from 'react';
import {
  Sparkles,
  CheckCircle2,
  BookOpen,
} from 'lucide-react';
import { ScanSessionData, Book } from '../types';
import { CameraScanner } from './CameraScanner';

interface ScanTabProps {
  onAddBook: (book: Book) => void;
  onScanResultsReady?: (session: ScanSessionData) => void;
  onOpenScanModal?: () => void;
}

export const ScanTab: React.FC<ScanTabProps> = ({
  onAddBook,
  onScanResultsReady,
  onOpenScanModal,
}) => {
  return (
    <section className="flex flex-col gap-4 animate-fade-in select-none pb-28" aria-label="Funzione Scan OCR">
      {/* Header */}
      <div className="pt-2 px-1 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Scan.ocr
            </h1>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-red-900/80 text-red-200 border border-red-500/50">
              Fotocamera Attiva
            </span>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-900/80 text-purple-200 border border-purple-500/50">
              Gemini Vision
            </span>
          </div>
          <p className="text-xs font-semibold text-gray-400 mt-0.5">
            Inquadra la pagina o scatta una foto per estrarre e ascoltare il testo
          </p>
        </div>
      </div>

      {/* Live Camera Scanner View */}
      <CameraScanner
        autoStart={true}
        onScanResultsReady={(session) => {
          if (onScanResultsReady) onScanResultsReady(session);
        }}
        onAddBook={onAddBook}
      />

      {/* Feature Pills */}
      <div className="bg-[#12141D] border border-[#232736] rounded-2xl p-4 flex flex-col gap-2.5">
        <h4 className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
          <CheckCircle2 size={16} className="text-green-400" />
          <span>Vantaggi di Scan.ocr con Vora:</span>
        </h4>
        <ul className="text-xs text-gray-400 flex flex-col gap-1.5 leading-relaxed pl-1">
          <li className="flex items-start gap-2">
            <span className="text-red-500 font-bold">•</span>
            <span><strong>Confronto affiancato:</strong> visualizza il testo trascritto e la scansione originale spalla a spalla.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-red-500 font-bold">•</span>
            <span><strong>Ascolto immediato:</strong> premi Play per ascoltare qualsiasi scansione con voci neurali italiane.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-red-500 font-bold">•</span>
            <span><strong>Salvataggio in libreria:</strong> aggiungi il testo scansionato alla tua libreria per rileggerlo offline.</span>
          </li>
        </ul>
      </div>
    </section>
  );
};
