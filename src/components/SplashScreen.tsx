import React, { useEffect } from 'react';
import { VoraLogo } from './VoraLogo';

interface SplashScreenProps {
  onDismiss: () => void;
  isDarkMode?: boolean;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onDismiss, isDarkMode = false }) => {
  useEffect(() => {
    // 2.8s auto-advance timer to enter smoothly
    const timer = setTimeout(() => {
      onDismiss();
    }, 2800);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Vora"
      onClick={onDismiss}
      className="fixed inset-0 z-[100] bg-black text-white flex flex-col items-center justify-center p-6 select-none cursor-pointer animate-fade-in overflow-hidden transition-colors"
    >
      {/* Background ambient warm glows */}
      <div className="absolute w-80 h-80 rounded-full bg-white/5 blur-3xl pointer-events-none -top-10 -right-10" />
      <div className="absolute w-80 h-80 rounded-full bg-white/5 blur-3xl pointer-events-none -bottom-10 -left-10" />

      <main className="flex flex-col items-center text-center gap-7 max-w-sm relative z-10">
        {/* Logo Vora con carte sfalsate */}
        <div className="relative flex items-center justify-center pt-8 pb-4">
          {/* 5 Fanned Colored Cards */}
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
            {/* Card 5: Warm Cream / Deep Teal */}
            <div
              className="absolute w-20 h-28 rounded-xl bg-[#162E2C] border-2 border-white/30 shadow-sm"
              style={{ transform: 'rotate(24deg) translateY(-8px)' }}
            />
          </div>

          {/* Central Vora Icon Badge - Bordo tondo e BIANCO */}
          <div className="relative w-36 h-36 rounded-full bg-black/95 border-4 border-white shadow-2xl flex items-center justify-center z-10 transition-transform duration-300 hover:scale-105">
            <VoraLogo
              size={84}
              variant="flip7"
              showCircle={false}
              showBottomBar={false}
              className="drop-shadow-sm"
              alt="Logo ufficiale Vora"
            />
          </div>
        </div>

        {/* Titolo VORA - Bordo rimosso dal titolo della app */}
        <div className="flex flex-col items-center relative z-10">
          <h1 className="text-5xl sm:text-6xl font-black tracking-wider text-white leading-none drop-shadow-md">
            VORA<span className="text-white drop-shadow-xs">.</span>
          </h1>
        </div>
      </main>
    </div>
  );
};
