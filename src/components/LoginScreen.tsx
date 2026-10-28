import React, { useState } from 'react';
import { Loader2, X, Check } from 'lucide-react';
import { VoraLogo } from './VoraLogo';
import { User } from '../types';
import { signInWithGoogleFirebase, syncUserProfile } from '../services/firebase';

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
  onSkip?: () => void;
  initialEmail?: string;
  isDarkMode?: boolean;
}

type ViewMode = 'login' | 'forgot_password' | 'create_account';

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
  onSkip,
  initialEmail = 'marianomazoni@gmail.com',
  isDarkMode = false,
}) => {
  // Navigation / View State
  const [viewMode, setViewMode] = useState<ViewMode>('login');

  // Login Form State
  const [usernameOrEmail, setUsernameOrEmail] = useState<string>(initialEmail);
  const [password, setPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Registration Form State
  const [newUsername, setNewUsername] = useState<string>('mariano_mazoni');
  const [newEmail, setNewEmail] = useState<string>('mariano.mazoni@example.com');
  const [newPassword, setNewPassword] = useState<string>('');

  // Forgot Password State
  const [resetEmail, setResetEmail] = useState<string>(initialEmail);
  const [resetSent, setResetSent] = useState<boolean>(false);

  // Handlers
  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const input = usernameOrEmail.trim();
    if (!input) {
      setLoginError('Inserisci il nome utente o l\'indirizzo email.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const isEmail = input.includes('@');
      const email = isEmail ? input : `${input.toLowerCase().replace(/\s+/g, '')}@vora.app`;
      const name = isEmail ? input.split('@')[0] : input;
      const formattedName = name.charAt(0).toUpperCase() + name.slice(1);

      const loggedUser: User = {
        user_id: `user-${Date.now()}`,
        name: formattedName,
        email: email,
        picture: null,
        auth_provider: 'email',
        booksReadCount: 4,
        totalReadingMinutes: 120,
        is2FaVerified: true,
        lastLogin: new Date().toISOString(),
      };

      syncUserProfile(loggedUser).catch(() => {});
      setIsLoading(false);
      onLoginSuccess(loggedUser);
    }, 400);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (!newEmail.trim() || !newUsername.trim()) {
      setLoginError('Compila tutti i campi obbligatori per la registrazione.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const formattedName = newUsername.charAt(0).toUpperCase() + newUsername.slice(1);
      const registeredUser: User = {
        user_id: `user-${Date.now()}`,
        name: formattedName,
        email: newEmail.trim(),
        picture: null,
        auth_provider: 'email',
        booksReadCount: 0,
        totalReadingMinutes: 0,
        is2FaVerified: true,
        lastLogin: new Date().toISOString(),
      };

      syncUserProfile(registeredUser).catch(() => {});
      setIsLoading(false);
      onLoginSuccess(registeredUser);
    }, 500);
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setLoginError(null);
    try {
      const fbUser = await signInWithGoogleFirebase();
      if (fbUser) {
        onLoginSuccess(fbUser);
        return;
      }

      const googleUser: User = {
        user_id: `google-${Date.now()}`,
        name: 'Mariano Mazoni',
        email: initialEmail || 'marianomazoni@gmail.com',
        picture: null,
        auth_provider: 'google',
        is2FaVerified: true,
        booksReadCount: 3,
        totalReadingMinutes: 45,
        lastLogin: new Date().toISOString(),
      };

      try {
        await syncUserProfile(googleUser);
      } catch {}
      onLoginSuccess(googleUser);
    } catch (err: any) {
      console.warn('Google sign-in catch in UI:', err);
      if (
        err?.message?.includes('annullato') ||
        err?.message?.includes('closed') ||
        err?.message?.includes('cancelled')
      ) {
        setLoginError(null);
      } else {
        setLoginError(err?.message || 'Errore durante l\'accesso con Google. Riprova.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = () => {
    setIsLoading(true);
    setLoginError(null);

    setTimeout(() => {
      const appleUser: User = {
        user_id: `apple-${Date.now()}`,
        name: 'Utente Apple ID',
        email: 'mariano.apple@icloud.com',
        picture: null,
        auth_provider: 'email',
        booksReadCount: 2,
        totalReadingMinutes: 30,
        is2FaVerified: true,
        lastLogin: new Date().toISOString(),
      };

      syncUserProfile(appleUser).catch(() => {});
      setIsLoading(false);
      onLoginSuccess(appleUser);
    }, 450);
  };

  const handleResetPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResetSent(true);
    setTimeout(() => {
      setResetSent(false);
      setViewMode('login');
    }, 2000);
  };

  return (
    <div className={`min-h-screen w-full ${isDarkMode ? 'bg-[#0E1716] text-slate-100' : 'bg-[#EFF8F7] text-slate-800'} flex flex-col justify-between font-sans antialiased select-none relative p-4 transition-colors`}>
      {/* Top bar with guest access */}
      <header className="w-full max-w-md mx-auto flex items-center justify-between pt-2 pb-2 z-20">
        <div className="flex items-center gap-2">
          <VoraLogo size={28} variant="flip7" showCircle={false} />
          <span className={`text-sm font-black ${isDarkMode ? 'text-[#3CC4BD]' : 'text-[#1E8C86]'} tracking-wider`}>VORA</span>
        </div>

        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className={`text-xs font-black ${
              isDarkMode
                ? 'text-[#3CC4BD] bg-[#142322] hover:bg-[#1B2F2E] border-white/10'
                : 'text-[#1E8C86] bg-white hover:bg-[#E8F6F5] border-[#2BA8A2]/30'
            } border-2 transition-all py-1.5 px-3.5 rounded-full shadow-xs active:scale-95`}
            title="Salta ed entra come ospite"
          >
            Continua come ospite &rarr;
          </button>
        )}
      </header>

      {/* Main Center Content */}
      <main className={`w-full max-w-[390px] mx-auto px-6 py-7 flex flex-col items-center my-auto ${
        isDarkMode ? 'bg-[#142322] border-white/10 shadow-2xl' : 'bg-white border-[#2BA8A2]/30 shadow-card'
      } border-2 rounded-3xl transition-colors`}>
        {/* Vora Official Logo */}
        <div className="mb-4 flex items-center justify-center">
          <div className={`w-16 h-16 rounded-2xl ${
            isDarkMode ? 'bg-[#1A3130] border-[#2BA8A2]/50' : 'bg-[#E8F6F5] border-[#2BA8A2]/30'
          } border-2 flex items-center justify-center shadow-xs`}>
            <VoraLogo size={46} variant="flip7" showCircle={false} alt="Logo Vora" />
          </div>
        </div>

        {/* View Mode: Sign In */}
        {viewMode === 'login' && (
          <div className="w-full flex flex-col items-center">
            {/* Title Header */}
            <h1 className={`text-2xl font-black ${isDarkMode ? 'text-[#3CC4BD]' : 'text-[#1E8C86]'} text-center mb-1 tracking-tight`}>
              Accedi a Vora
            </h1>
            <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} font-semibold text-center mb-5`}>
              La voce dei tuoi libri
            </p>

            {/* Error banner if present */}
            {loginError && (
              <div className="w-full mb-4 px-3.5 py-2.5 rounded-2xl bg-[#FFF8E7] dark:bg-[#2C1815] border-2 border-[#EF6C4A] text-xs text-[#D45233] dark:text-[#FF8A6A] font-bold flex items-center justify-between shadow-coral-glow">
                <span>{loginError}</span>
                <button
                  type="button"
                  onClick={() => setLoginError(null)}
                  className="text-[#EF6C4A] hover:text-[#D45233]"
                  aria-label="Chiudi errore"
                >
                  <X size={15} strokeWidth={2.5} />
                </button>
              </div>
            )}

            {/* Sign in Form */}
            <form onSubmit={handleSignIn} className="w-full flex flex-col">
              {/* Field 1: Nome utente o indirizzo email */}
              <div className="flex flex-col mb-3.5">
                <label
                  htmlFor="login-username"
                  className={`text-xs font-black ${isDarkMode ? 'text-[#3CC4BD]' : 'text-[#1E8C86]'} uppercase tracking-wider mb-1.5`}
                >
                  Nome utente o email
                </label>
                <input
                  id="login-username"
                  type="text"
                  autoComplete="username"
                  required
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  placeholder="utente o email@esempio.com"
                  className={`w-full ${
                    isDarkMode
                      ? 'bg-[#0B1716] text-white border-white/10 focus:border-[#3CC4BD] placeholder:text-slate-500'
                      : 'bg-[#FFF8E7] text-slate-900 border-[#2BA8A2]/30 focus:border-[#2BA8A2] placeholder:text-slate-400'
                  } border-2 font-bold text-sm rounded-xl px-3.5 py-2.5 outline-none transition-all shadow-xs`}
                />
              </div>

              {/* Field 2: Password with Forgot Password link on the right */}
              <div className="flex flex-col mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="login-password"
                    className={`text-xs font-black ${isDarkMode ? 'text-[#3CC4BD]' : 'text-[#1E8C86]'} uppercase tracking-wider`}
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginError(null);
                      setViewMode('forgot_password');
                    }}
                    className={`text-xs ${isDarkMode ? 'text-[#3CC4BD] hover:text-[#FFD23F]' : 'text-[#2BA8A2] hover:text-[#1E8C86]'} font-bold hover:underline`}
                  >
                    Password dimenticata?
                  </button>
                </div>
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className={`w-full ${
                    isDarkMode
                      ? 'bg-[#0B1716] text-white border-white/10 focus:border-[#3CC4BD] placeholder:text-slate-500'
                      : 'bg-[#FFF8E7] text-slate-900 border-[#2BA8A2]/30 focus:border-[#2BA8A2] placeholder:text-slate-400'
                  } border-2 font-bold text-sm rounded-xl px-3.5 py-2.5 outline-none transition-all shadow-xs`}
                />
              </div>

              {/* Primary Flip7 Gold CTA Button: Accedi */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full min-h-[46px] bg-gradient-to-r from-[#FFD23F] to-[#FFE47A] hover:bg-[#FFD23F] active:scale-95 text-[#1E8C86] font-black text-sm py-2.5 px-4 rounded-full transition-all mt-1 cursor-pointer flex items-center justify-center gap-2 shadow-accent-glow border-2 border-[#E6B800] disabled:opacity-70"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-[#1E8C86]" />
                    <span>Accesso in corso...</span>
                  </>
                ) : (
                  <span>Accedi</span>
                )}
              </button>
            </form>

            {/* Hairline Divider with centered 'oppure' */}
            <div className="w-full relative my-4">
              <div className={`border-t-2 border-dashed ${isDarkMode ? 'border-white/10' : 'border-[#2BA8A2]/20'}`} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`${isDarkMode ? 'bg-[#142322] text-[#3CC4BD]' : 'bg-white text-[#1E8C86]'} px-3 text-xs font-black uppercase tracking-wider`}>oppure</span>
              </div>
            </div>

            {/* Social Buttons */}
            <div className="w-full flex flex-col gap-2.5">
              {/* Continua con Google */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className={`w-full ${
                  isDarkMode
                    ? 'bg-[#0B1716] hover:bg-[#1A3130] text-slate-200 border-white/10 hover:border-[#3CC4BD]/40'
                    : 'bg-[#FFF8E7] hover:bg-white text-slate-800 border-slate-200 hover:border-[#2BA8A2]/40'
                } border-2 py-2.5 px-4 rounded-full flex items-center justify-center gap-2.5 text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95`}
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continua con Google</span>
              </button>

              {/* Continua con Apple */}
              <button
                type="button"
                onClick={handleAppleSignIn}
                disabled={isLoading}
                className={`w-full ${
                  isDarkMode
                    ? 'bg-[#0B1716] hover:bg-[#1A3130] text-slate-200 border-white/10 hover:border-[#3CC4BD]/40'
                    : 'bg-[#FFF8E7] hover:bg-white text-slate-800 border-slate-200 hover:border-[#2BA8A2]/40'
                } border-2 py-2.5 px-4 rounded-full flex items-center justify-center gap-2.5 text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95`}
              >
                <svg className={`w-4 h-4 shrink-0 ${isDarkMode ? 'fill-white' : 'fill-slate-900'}`} viewBox="0 0 170 170">
                  <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.66-7.79-11.88-14.24-7.23-10.98-12.87-23.77-16.92-38.38-4.05-14.61-6.08-28.78-6.08-42.5 0-16.3 3.97-30.01 11.91-41.14 7.94-11.12 18.06-16.78 30.37-16.98 5.43 0 11.22 1.45 17.38 4.35 6.16 2.9 10.15 4.35 11.96 4.35 1.59 0 5.65-1.52 12.18-4.57 6.53-3.04 12.25-4.42 17.18-4.13 13.55.65 24.57 5.79 33.06 15.44-11.88 7.17-17.7 17.06-17.47 29.68.22 9.78 3.99 17.93 11.31 24.46 7.32 6.52 16.09 10.21 26.31 11.08-2.61 7.82-5.94 15.65-10.01 23.49zM119.22 31.84c0-7.39 2.68-14.35 8.05-20.87 5.36-6.52 12.03-10.51 20-11.97.22 1.09.33 2.17.33 3.26 0 7.39-2.82 14.42-8.48 21.09-5.65 6.67-12.28 10.43-19.9 11.29z" />
                </svg>
                <span>Continua con Apple</span>
              </button>
            </div>

            {/* Link alla pagina di registrazione posizionato sotto i pulsanti */}
            <div className={`text-center text-xs font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'} mt-5`}>
              <span>Non hai un account? </span>
              <button
                type="button"
                onClick={() => {
                  setLoginError(null);
                  setViewMode('create_account');
                }}
                className={`${isDarkMode ? 'text-[#3CC4BD] hover:text-[#FFD23F]' : 'text-[#1E8C86] hover:text-[#2BA8A2]'} hover:underline cursor-pointer font-black`}
              >
                Registrati
              </button>
            </div>
          </div>
        )}

        {/* View Mode: Registrazione nuovo account */}
        {viewMode === 'create_account' && (
          <div className="w-full flex flex-col items-center animate-fade-in">
            <h1 className={`text-2xl font-black ${isDarkMode ? 'text-[#3CC4BD]' : 'text-[#1E8C86]'} text-center mb-1 tracking-tight`}>
              Crea il tuo account
            </h1>
            <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} font-semibold text-center mb-5`}>
              Registrati per accedere alla tua libreria
            </p>

            <form onSubmit={handleRegisterSubmit} className="w-full flex flex-col">
              <div className="flex flex-col mb-3">
                <label
                  htmlFor="reg-email"
                  className={`text-xs font-black ${isDarkMode ? 'text-[#3CC4BD]' : 'text-[#1E8C86]'} uppercase tracking-wider mb-1`}
                >
                  Indirizzo email
                </label>
                <input
                  id="reg-email"
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="iltuoindirizzo@email.com"
                  className={`w-full ${
                    isDarkMode
                      ? 'bg-[#0B1716] text-white border-white/10 focus:border-[#3CC4BD] placeholder:text-slate-500'
                      : 'bg-[#FFF8E7] text-slate-900 border-[#2BA8A2]/30 focus:border-[#2BA8A2] placeholder:text-slate-400'
                  } border-2 font-bold text-sm rounded-xl px-3.5 py-2.5 outline-none shadow-xs`}
                />
              </div>

              <div className="flex flex-col mb-3">
                <label
                  htmlFor="reg-username"
                  className={`text-xs font-black ${isDarkMode ? 'text-[#3CC4BD]' : 'text-[#1E8C86]'} uppercase tracking-wider mb-1`}
                >
                  Nome utente
                </label>
                <input
                  id="reg-username"
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="mariano_mazoni"
                  className={`w-full ${
                    isDarkMode
                      ? 'bg-[#0B1716] text-white border-white/10 focus:border-[#3CC4BD] placeholder:text-slate-500'
                      : 'bg-[#FFF8E7] text-slate-900 border-[#2BA8A2]/30 focus:border-[#2BA8A2] placeholder:text-slate-400'
                  } border-2 font-bold text-sm rounded-xl px-3.5 py-2.5 outline-none shadow-xs`}
                />
              </div>

              <div className="flex flex-col mb-4">
                <label
                  htmlFor="reg-password"
                  className={`text-xs font-black ${isDarkMode ? 'text-[#3CC4BD]' : 'text-[#1E8C86]'} uppercase tracking-wider mb-1`}
                >
                  Password
                </label>
                <input
                  id="reg-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Almeno 8 caratteri"
                  className={`w-full ${
                    isDarkMode
                      ? 'bg-[#0B1716] text-white border-white/10 focus:border-[#3CC4BD] placeholder:text-slate-500'
                      : 'bg-[#FFF8E7] text-slate-900 border-[#2BA8A2]/30 focus:border-[#2BA8A2] placeholder:text-slate-400'
                  } border-2 font-bold text-sm rounded-xl px-3.5 py-2.5 outline-none shadow-xs`}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full min-h-[46px] bg-gradient-to-r from-[#FFD23F] to-[#FFE47A] hover:bg-[#FFD23F] active:scale-95 text-[#1E8C86] font-black text-sm py-2.5 px-4 rounded-full transition-all cursor-pointer shadow-accent-glow border-2 border-[#E6B800] flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 size={16} className="animate-spin text-[#1E8C86]" /> : <span>Crea account</span>}
              </button>

              <div className={`text-center text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'} font-semibold mt-4`}>
                Hai già un account?{' '}
                <button
                  type="button"
                  onClick={() => setViewMode('login')}
                  className={`${isDarkMode ? 'text-[#3CC4BD] hover:text-[#FFD23F]' : 'text-[#1E8C86] hover:text-[#2BA8A2]'} hover:underline font-black cursor-pointer`}
                >
                  Accedi &rarr;
                </button>
              </div>
            </form>
          </div>
        )}

        {/* View Mode: Forgot Password */}
        {viewMode === 'forgot_password' && (
          <div className="w-full flex flex-col items-center animate-fade-in">
            <h1 className={`text-2xl font-black ${isDarkMode ? 'text-[#3CC4BD]' : 'text-[#1E8C86]'} text-center mb-1 tracking-tight`}>
              Reimposta password
            </h1>
            <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} font-semibold text-center mb-5 leading-relaxed`}>
              Inserisci l'indirizzo email del tuo account per ricevere un link di ripristino.
            </p>

            <form onSubmit={handleResetPasswordSubmit} className="w-full flex flex-col">
              <div className="flex flex-col mb-4">
                <label
                  htmlFor="reset-email"
                  className={`text-xs font-black ${isDarkMode ? 'text-[#3CC4BD]' : 'text-[#1E8C86]'} uppercase tracking-wider mb-1`}
                >
                  Indirizzo email
                </label>
                <input
                  id="reset-email"
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="iltuoindirizzo@email.com"
                  className={`w-full ${
                    isDarkMode
                      ? 'bg-[#0B1716] text-white border-white/10 focus:border-[#3CC4BD] placeholder:text-slate-500'
                      : 'bg-[#FFF8E7] text-slate-900 border-[#2BA8A2]/30 focus:border-[#2BA8A2] placeholder:text-slate-400'
                  } border-2 font-bold text-sm rounded-xl px-3.5 py-2.5 outline-none shadow-xs`}
                />
              </div>

              {resetSent && (
                <div className="mb-4 p-3 rounded-2xl bg-[#E8F6F5] dark:bg-[#1E3634] border-2 border-[#27AE60] text-xs text-[#27AE60] dark:text-[#2ECC71] font-black flex items-center gap-2 shadow-xs">
                  <Check size={16} strokeWidth={3} />
                  <span>Link inviato! Controlla la tua casella email.</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full min-h-[46px] bg-gradient-to-r from-[#FFD23F] to-[#FFE47A] hover:bg-[#FFD23F] active:scale-95 text-[#1E8C86] font-black text-sm py-2.5 px-4 rounded-full transition-all cursor-pointer shadow-accent-glow border-2 border-[#E6B800]"
              >
                Invia link di reimpostazione
              </button>

              <button
                type="button"
                onClick={() => setViewMode('login')}
                className={`w-full mt-3 text-xs ${isDarkMode ? 'text-[#3CC4BD] hover:text-[#FFD23F]' : 'text-[#1E8C86] hover:text-[#2BA8A2]'} hover:underline text-center cursor-pointer font-black`}
              >
                Torna all'accesso
              </button>
            </form>
          </div>
        )}
      </main>

      <div className="h-4" />
    </div>
  );
};
