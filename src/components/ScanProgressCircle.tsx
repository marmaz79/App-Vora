import React from 'react';
import { CheckCircle2, FileText, Sparkles, Loader2, Bot } from 'lucide-react';

export interface ScanProgressCircleProps {
  progress: number; // 0 to 1 or 0 to 100
  message?: string;
  status?: string;
  engine?: string;
  subtitle?: string;
  fileName?: string;
  size?: number; // diameter in px (default 160)
  strokeWidth?: number; // stroke width in px (default 12)
  onCancel?: () => void;
  fullOverlay?: boolean;
}

export const ScanProgressCircle: React.FC<ScanProgressCircleProps> = ({
  progress,
  message = 'Scansione del documento in corso...',
  status,
  engine = 'Gemini AI Vision',
  subtitle,
  fileName,
  size = 164,
  strokeWidth = 12,
  onCancel,
  fullOverlay = false,
}) => {
  // Normalize progress to 0..1
  const normalized = Math.min(1, Math.max(0.04, progress <= 1 ? progress : progress / 100));
  const percent = Math.round(normalized * 100);

  // SVG Geometry for circular ring
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - normalized * circumference;

  // Milestone phases in Document Scanner style
  const activeStep =
    percent >= 98 ? 4 : percent >= 68 ? 3 : percent >= 28 ? 2 : 1;

  const content = (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center text-center max-w-md w-full mx-auto select-none p-2 sm:p-4 font-sans"
    >
      {/* Brand Header */}
      <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900 border border-white/20 shadow-2xs mb-4">
        {/* White Drive Icon */}
        <svg
          className="w-4 h-4 shrink-0 text-white fill-white"
          viewBox="0 0 87.3 78"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5z"
            fill="currentColor"
          />
          <path
            d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5z"
            fill="currentColor"
          />
          <path
            d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.5l5.85 10.15z"
            fill="currentColor"
          />
          <path
            d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z"
            fill="currentColor"
          />
          <path
            d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z"
            fill="currentColor"
          />
          <path
            d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z"
            fill="currentColor"
          />
        </svg>

        <span className="text-xs font-semibold text-white tracking-tight">
          Scanner Documenti
        </span>

        <span className="text-[10px] bg-black text-white font-bold px-2 py-0.5 rounded-full border border-white/30">
          AI OCR
        </span>
      </div>

      {/* CIRCULAR PROGRESS RING */}
      <div
        className="relative flex items-center justify-center mb-4"
        style={{ width: size, height: size }}
      >
        <svg
          width={size}
          height={size}
          className="rotate-[-90deg] transition-all duration-300"
          aria-hidden="true"
        >
          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#262626"
            strokeWidth={strokeWidth}
          />

          {/* Active Progress Ring in Pure White */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#ffffff"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-300 ease-out"
          />
        </svg>

        {/* Center Content: Exact Percentage in White */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="flex items-baseline justify-center">
            <span className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-none">
              {percent}
            </span>
            <span className="text-xl sm:text-2xl font-bold text-white ml-0.5">
              %
            </span>
          </div>

          <span className="text-[11px] font-semibold text-zinc-400 mt-1 tracking-wide">
            {percent >= 100 ? 'Completato' : 'avanzamento'}
          </span>
        </div>
      </div>

      {/* FILE NAME & PROGRESS BAR */}
      <div className="w-full max-w-sm bg-black border border-white/20 rounded-2xl p-3.5 mb-3.5 shadow-2xs">
        <div className="flex items-center justify-between gap-2 mb-2 text-left">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-white/20 text-white flex items-center justify-center shrink-0">
              <FileText size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-xs font-bold text-white truncate">
                {fileName || 'Documento scansionato'}
              </span>
              <span className="block text-[11px] text-zinc-400 truncate">
                {engine} · Riconoscimento caratteri
              </span>
            </div>
          </div>
          <span className="text-xs font-black text-white shrink-0">
            {percent}%
          </span>
        </div>

        {/* Linear Bar */}
        <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-white h-1.5 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${Math.max(5, percent)}%` }}
          />
        </div>
      </div>

      {/* STATUS MESSAGE */}
      <h3 className="text-sm sm:text-base font-bold text-white mb-1 leading-snug px-2">
        {message}
      </h3>

      <p className="text-xs text-zinc-400 font-normal mb-4 max-w-xs leading-relaxed">
        {subtitle ||
          'Ottimizzazione dei bordi, rimozione del rumore e trascrizione con AI.'}
      </p>

      {/* STEP CHIPS */}
      <div className="flex items-center justify-center gap-1.5 flex-wrap mb-2">
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] transition-all ${
            activeStep >= 1
              ? 'bg-white text-black font-black'
              : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
          }`}
        >
          {activeStep > 1 ? '✓ ' : ''}1. Immagine
        </span>

        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] transition-all ${
            activeStep >= 2
              ? 'bg-white text-black font-black'
              : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
          }`}
        >
          {activeStep > 2 ? '✓ ' : ''}2. OCR
        </span>

        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] transition-all ${
            activeStep >= 3
              ? 'bg-white text-black font-black'
              : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
          }`}
        >
          {activeStep > 3 ? '✓ ' : ''}3. Gemini AI
        </span>

        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] transition-all ${
            activeStep >= 4
              ? 'bg-white text-black font-black'
              : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
          }`}
        >
          {activeStep >= 4 ? '✓ ' : ''}4. Pronto
        </span>
      </div>

      {/* Annulla button */}
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="mt-2 text-xs font-bold text-white hover:bg-zinc-900 border border-white/20 px-4 py-2 rounded-full transition-colors active:scale-95"
        >
          Annulla operazione
        </button>
      )}
    </div>
  );

  if (fullOverlay) {
    return (
      <div
        className="fixed inset-0 z-60 bg-black/90 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
        role="dialog"
        aria-modal="true"
        aria-label="Avanzamento scansione"
      >
        <div className="bg-black rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-white/20 flex flex-col items-center">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-black border border-white/20 rounded-3xl p-4 sm:p-5 shadow-sm my-2">
      {content}
    </div>
  );
};
