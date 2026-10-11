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

  // SVG Geometry for Google Drive circular ring
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - normalized * circumference;

  // Milestone phases in Google Drive Document Scanner style
  const activeStep =
    percent >= 98 ? 4 : percent >= 68 ? 3 : percent >= 28 ? 2 : 1;

  const content = (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center text-center max-w-md w-full mx-auto select-none p-2 sm:p-4 font-sans"
    >
      {/* --- GOOGLE DRIVE BRAND HEADER --- */}
      <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F8F9FA] border border-[#DADCE0] shadow-2xs mb-4">
        {/* Authentic Google Drive Triangle Icon */}
        <svg
          className="w-4 h-4 shrink-0"
          viewBox="0 0 87.3 78"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5z"
            fill="#0066DA"
          />
          <path
            d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5z"
            fill="#00AC47"
          />
          <path
            d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.5l5.85 10.15z"
            fill="#EA4335"
          />
          <path
            d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z"
            fill="#00832D"
          />
          <path
            d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z"
            fill="#2684FC"
          />
          <path
            d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z"
            fill="#FFBA00"
          />
        </svg>

        <span className="text-xs font-semibold text-[#3C4043] tracking-tight">
          Google Drive Scanner
        </span>

        <span className="text-[10px] bg-[#E8F0FE] text-[#1A73E8] font-bold px-2 py-0.5 rounded-full">
          AI OCR
        </span>
      </div>

      {/* --- GOOGLE DRIVE STYLE CIRCULAR PROGRESS RING --- */}
      <div
        className="relative flex items-center justify-center mb-4"
        style={{ width: size, height: size }}
      >
        {/* Soft Google Blue Halo */}
        <div
          className="absolute inset-0 rounded-full bg-[#1A73E8]/5 blur-lg pointer-events-none"
          style={{ width: size + 16, height: size + 16, left: -8, top: -8 }}
        />

        {/* SVG Circular Ring in Google Drive Material Style */}
        <svg
          width={size}
          height={size}
          className="rotate-[-90deg] transition-all duration-300"
          aria-hidden="true"
        >
          {/* Background Track (Google Drive Neutral Light Gray #E8EAED) */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#E8EAED"
            strokeWidth={strokeWidth}
          />

          {/* Active Progress Ring (Google Drive Primary Blue #1A73E8) */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#1A73E8"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-300 ease-out"
          />
        </svg>

        {/* Center Content: Exact Percentage in Google Sans Bold Style */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="flex items-baseline justify-center">
            <span className="text-4xl sm:text-5xl font-black text-[#202124] tracking-tight leading-none">
              {percent}
            </span>
            <span className="text-xl sm:text-2xl font-bold text-[#1A73E8] ml-0.5">
              %
            </span>
          </div>

          <span className="text-[11px] font-semibold text-[#5F6368] mt-1 tracking-wide">
            {percent >= 100 ? 'Completato' : 'avanzamento'}
          </span>
        </div>
      </div>

      {/* --- FILE NAME & PROGRESS BAR (Google Drive Upload Style) --- */}
      <div className="w-full max-w-sm bg-[#F8F9FA] border border-[#DADCE0] rounded-2xl p-3.5 mb-3.5 shadow-2xs">
        <div className="flex items-center justify-between gap-2 mb-2 text-left">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-[#E8F0FE] text-[#1A73E8] flex items-center justify-center shrink-0">
              <FileText size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-xs font-bold text-[#202124] truncate">
                {fileName || 'Documento scansionato'}
              </span>
              <span className="block text-[11px] text-[#5F6368] truncate">
                {engine} · Riconoscimento caratteri
              </span>
            </div>
          </div>
          <span className="text-xs font-bold text-[#1A73E8] shrink-0">
            {percent}%
          </span>
        </div>

        {/* Google Drive Linear Bar Sync */}
        <div className="w-full bg-[#E8EAED] rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-[#1A73E8] h-1.5 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${Math.max(5, percent)}%` }}
          />
        </div>
      </div>

      {/* --- STATUS MESSAGE --- */}
      <h3 className="text-sm sm:text-base font-bold text-[#202124] mb-1 leading-snug px-2">
        {message}
      </h3>

      <p className="text-xs text-[#5F6368] font-normal mb-4 max-w-xs leading-relaxed">
        {subtitle ||
          'Ottimizzazione dei bordi, rimozione del rumore e trascrizione con AI.'}
      </p>

      {/* --- MATERIAL 3 STEP CHIPS --- */}
      <div className="flex items-center justify-center gap-1.5 flex-wrap mb-2">
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
            activeStep >= 1
              ? 'bg-[#E8F0FE] text-[#1A73E8] font-bold border border-[#D2E3FC]'
              : 'bg-[#F1F3F4] text-[#5F6368]'
          }`}
        >
          {activeStep > 1 ? '✓ ' : ''}1. Immagine
        </span>

        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
            activeStep >= 2
              ? 'bg-[#E8F0FE] text-[#1A73E8] font-bold border border-[#D2E3FC]'
              : 'bg-[#F1F3F4] text-[#5F6368]'
          }`}
        >
          {activeStep > 2 ? '✓ ' : ''}2. OCR
        </span>

        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
            activeStep >= 3
              ? 'bg-[#E8F0FE] text-[#1A73E8] font-bold border border-[#D2E3FC]'
              : 'bg-[#F1F3F4] text-[#5F6368]'
          }`}
        >
          {activeStep > 3 ? '✓ ' : ''}3. Gemini AI
        </span>

        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
            activeStep >= 4
              ? 'bg-[#E6F4EA] text-[#137333] font-bold border border-[#CEEAD6]'
              : 'bg-[#F1F3F4] text-[#5F6368]'
          }`}
        >
          {activeStep >= 4 ? '✓ ' : ''}4. Pronto
        </span>
      </div>

      {/* Google Style Text Action Button (Annulla) */}
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="mt-2 text-xs font-medium text-[#1A73E8] hover:bg-[#E8F0FE] px-4 py-2 rounded-full transition-colors active:scale-95"
        >
          Annulla operazione
        </button>
      )}
    </div>
  );

  if (fullOverlay) {
    return (
      <div
        className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
        role="dialog"
        aria-modal="true"
        aria-label="Avanzamento scansione Google Drive"
      >
        <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-[#DADCE0] flex flex-col items-center">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white border border-[#DADCE0] rounded-3xl p-4 sm:p-5 shadow-sm my-2">
      {content}
    </div>
  );
};
