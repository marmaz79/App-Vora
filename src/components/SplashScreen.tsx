import React, { useEffect } from 'react';

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
        {/* Logo ufficiale circolare Vora con bagliore rosso */}
        <div className="relative flex items-center justify-center">
          {/* Soft red ambient glow */}
          <div className="absolute w-48 h-48 rounded-full bg-[#ED2224]/20 blur-2xl pointer-events-none" />

          <div className="relative w-44 h-44 sm:w-52 sm:h-52 rounded-full border-2 border-[#ED2224]/50 bg-[#140608] flex items-center justify-center shadow-2xl shadow-red-950/60">
            <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full border border-[#ED2224] bg-[#260A0D] flex flex-col items-center justify-center gap-2 shadow-inner">
              {/* Logo Ufficiale Vora */}
              <svg
                className="w-20 h-20 sm:w-24 sm:h-24 text-[#ED2224] filter drop-shadow-md transition-transform duration-300 hover:scale-105"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-label="Logo ufficiale Vora"
              >
                <path d="M13.983 0C10.748 0 7.828 1.488 5.895 3.82L0 19.344h5.666l3.355-8.243c.96-2.358 2.684-4.098 4.962-4.098 2.376 0 4.148 1.83 4.148 4.298 0 2.215-1.464 4.398-3.791 5.656l-3.23 1.748c-3.155 1.706-5.077 4.707-5.077 8.295h5.666c0-2.308 1.258-4.325 3.32-5.438l3.23-1.747c3.674-1.986 5.922-5.467 5.922-9.283C24.17 4.636 19.534 0 13.983 0z" />
              </svg>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-2 h-2 rounded-full bg-[#ED2224]" />
                <span className="w-2.5 h-2.5 rounded-full bg-white/70" />
                <span className="w-2 h-2 rounded-full bg-[#ED2224]" />
              </div>
            </div>
          </div>
        </div>

        {/* Titolo e Slogan con Testo Bianco */}
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-6xl sm:text-7xl font-black tracking-tight text-white">
            VORA<span className="text-[#ED2224]">.</span>
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
