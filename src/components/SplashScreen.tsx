import React, { useEffect } from 'react';
import { VoraLogo } from './VoraLogo';

interface SplashScreenProps {
  onDismiss: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onDismiss }) => {
  useEffect(() => {
    // 2.8s auto-advance timer to enter the app smoothly
    const timer = setTimeout(() => {
      onDismiss();
    }, 2800);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Vora - La voce dei tuoi libri"
      onClick={onDismiss}
      className="fixed inset-0 z-[100] bg-black text-white flex flex-col items-center justify-center p-6 select-none cursor-pointer animate-fade-in"
    >
      <main className="flex flex-col items-center text-center gap-8 max-w-sm">
        {/* Logo Bianco con Cerchio Bianco */}
        <div className="relative flex items-center justify-center">
          {/* Soft ambient white glow */}
          <div className="absolute w-52 h-52 rounded-full bg-white/10 blur-3xl pointer-events-none" />

          {/* Cerchio bianco esterno */}
          <div className="relative w-44 h-44 sm:w-52 sm:h-52 rounded-full border-2 border-white bg-black/60 backdrop-blur-md flex items-center justify-center shadow-2xl shadow-white/5 transition-transform duration-300 hover:scale-105">
            {/* Cerchio bianco interno / Logo bianco */}
            <VoraLogo
              size={130}
              variant="white-circle"
              className="text-white drop-shadow-md"
              alt="Logo ufficiale Vora bianco con cerchio bianco"
            />
          </div>
        </div>

        {/* Titolo e Slogan con Testo Bianco */}
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-6xl sm:text-7xl font-black tracking-tight text-white">
            VORA<span className="text-white">.</span>
          </h1>
          <p className="text-xl sm:text-2xl font-bold text-white tracking-wide mt-1">
            La voce dei tuoi libri
          </p>
          <span className="text-xs font-semibold text-white/70 tracking-widest uppercase mt-4">
            Tocca per entrare
          </span>
        </div>
      </main>
    </div>
  );
};
