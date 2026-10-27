import React from 'react';
import { Book } from '../types';
import { StatsTab } from './StatsTab';
import { X } from 'lucide-react';

interface ReadingStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  books: Book[];
  onOpenBook?: (book: Book) => void;
}

export const ReadingStatsModal: React.FC<ReadingStatsModalProps> = ({
  isOpen,
  onClose,
  books,
  onOpenBook,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reading-stats-modal-title"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-5 select-none font-sans"
      onClick={onClose}
    >
      <div
        className="bg-[#EFF8F7] border-2 border-[#2BA8A2]/30 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-card text-slate-800 overflow-hidden animate-fade-in relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-4 right-4 z-20">
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white border border-[#2BA8A2]/30 text-[#1E8C86] hover:bg-[#E8F6F5] flex items-center justify-center shadow-xs active:scale-95 transition-all"
            aria-label="Chiudi statistiche"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto p-3 sm:p-6 flex-1">
          <StatsTab
            books={books}
            onOpenBook={(b) => {
              if (onOpenBook) onOpenBook(b);
              onClose();
            }}
            onBack={onClose}
          />
        </div>
      </div>
    </div>
  );
};
