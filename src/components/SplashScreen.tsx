import React, { useEffect } from 'react';
import { VoraLogo } from './VoraLogo';
import { Sparkles, Play } from 'lucide-react';

interface SplashScreenProps {
  onDismiss: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onDismiss }) => {
  useEffect(() => {
    // 3.2s auto-advance timer to enter smoothly
    const timer = setTimeout(() => {
      onDismiss();
    }, 3200);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Vora - Flip7 Design System"
      onClick={onDismiss}
      className="fixed inset-0 z-[100] bg-gradient-to-b from-[#1E8C86] via-[#2BA8A2] to-[#166E69] text-white flex flex-col items-center justify-center p-6 select-none cursor-pointer animate-fade-in overflow-hidden"
    >
      {/* Background ambient warm glows */}
      <div className="absolute w-80 h-80 rounded-full bg-[#FFD23F]/20 blur-3xl pointer-events-none -top-10 -right-10" />
      <div className="absolute w-80 h-80 rounded-full bg-[#EF6C4A]/20 blur-3xl pointer-events-none -bottom-10 -left-10" />

      <main className="flex flex-col items-center text-center gap-7 max-w-sm relative z-10">
        {/* Flip7 Inspired 3-Layer Logo (Fan Cards + Parallelogram + Ribbon) */}
        <div className="relative flex items-center justify-center pt-8 pb-4">
          {/* Layer 1: 5 Fanned Colored Cards */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {/* Card 1: Coral */}
            <div
              className="absolute w-20 h-28 rounded-xl bg-[#EF6C4A] border-2 border-white/60 shadow-coral-glow"
              style={{ transform: 'rotate(-24deg) translateY(-8px)' }}
            />
            {/* Card 2: Sky Blue */}
            <div
              className="absolute w-20 h-28 rounded-xl bg-[#5DADE2] border-2 border-white/60 shadow-sky-glow"
              style={{ transform: 'rotate(-12deg) translateY(-14px)' }}
            />
            {/* Card 3: Accent Gold */}
            <div
              className="absolute w-20 h-28 rounded-xl bg-[#FFD23F] border-2 border-white/80 shadow-accent-glow"
              style={{ transform: 'rotate(0deg) translateY(-18px)' }}
            />
            {/* Card 4: Primary Teal */}
            <div
              className="absolute w-20 h-28 rounded-xl bg-[#2BA8A2] border-2 border-white/60 shadow-teal-glow"
              style={{ transform: 'rotate(12deg) translateY(-14px)' }}
            />
            {/* Card 5: Warm Cream */}
            <div
              className="absolute w-20 h-28 rounded-xl bg-[#FFF8E7] border-2 border-white/60 shadow-sm"
              style={{ transform: 'rotate(24deg) translateY(-8px)' }}
            />
          </div>

          {/* Central Vora Icon Badge */}
          <div className="relative w-36 h-36 rounded-3xl bg-[#FFF8E7] border-4 border-[#FFD23F] shadow-2xl flex items-center justify-center z-10 transition-transform duration-300 hover:scale-105">
            <VoraLogo
              size={84}
              variant="flip7"
              showCircle={false}
              showBottomBar={false}
              className="drop-shadow-sm"
              alt="Logo ufficiale Vora Flip7"
            />
          </div>
        </div>

        {/* Layer 2: FLIP7 Style Parallelogram VORA Title */}
        <div className="flex flex-col items-center gap-2 relative z-10">
          <div className="bg-[#FFF8E7] border-3 border-[#1E8C86] rounded-2xl px-8 py-2.5 shadow-2xl transform -skew-x-6 rotate-[-2deg]">
            <h1 className="text-5xl sm:text-6xl font-black tracking-wider text-[#1E8C86] transform skew-x-6">
              VORA<span className="text-[#FFD23F] drop-shadow-xs">.</span>
            </h1>
          </div>

          {/* Layer 3: Classic Retro Folded Ribbon Banner */}
          <div className="relative mt-2">
            <div className="bg-[#FFF8E7] border-2 border-[#1E8C86] px-5 py-1.5 rounded-full shadow-card">
              <span className="text-xs sm:text-sm font-black text-[#1E8C86] tracking-widest uppercase">
                La voce dei tuoi libri
              </span>
            </div>
          </div>
        </div>

        {/* Start CTA Button */}
        <div className="flex flex-col items-center gap-2 pt-2">
          <button
            type="button"
            onClick={onDismiss}
            className="px-8 py-3 rounded-full bg-gradient-to-r from-[#FFD23F] to-[#FFE47A] hover:bg-[#FFD23F] text-[#1E8C86] font-black text-sm border-2 border-[#E6B800] shadow-accent-glow active:scale-95 transition-all flex items-center gap-2"
          >
            <Play size={16} className="fill-[#1E8C86]" />
            <span>Tocca per entrare</span>
          </button>
          <span className="text-[11px] font-bold text-white/80 tracking-wide mt-1">
            Lettura e Ascolto Intelligente
          </span>
        </div>
      </main>
    </div>
  );
};
