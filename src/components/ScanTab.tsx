import React from 'react';
import { ScanSessionData, Book } from '../types';
import { CameraScanner } from './CameraScanner';
import { Camera, Sparkles } from 'lucide-react';

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
    <section className="flex flex-col gap-4 animate-fade-in select-none pb-28 text-slate-800" aria-label="Funzione Scan OCR">
      {/* Header Flip7 Style */}
      <div className="pt-2 px-1 flex items-center justify-between border-b-2 border-dashed border-[#2BA8A2]/30 pb-2.5">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#EF6C4A] text-white flex items-center justify-center shadow-coral-glow">
              <Camera size={20} strokeWidth={2.4} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#1E8C86] tracking-tight flex items-center gap-2">
              <span>Scansione</span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#EF6C4A] shadow-coral-glow inline-block" />
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Inquadra e acquisisci le pagine dei tuoi libri con OCR istantaneo
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF8E7] text-[#D45233] border border-[#EF6C4A]/40 text-xs font-black shadow-xs">
          <Sparkles size={14} className="text-[#EF6C4A]" />
          <span>OCR attivo</span>
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
    </section>
  );
};
