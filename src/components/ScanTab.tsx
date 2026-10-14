import React from 'react';

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
              Scansione
            </h1>
          </div>
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
