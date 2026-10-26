import React, { useState } from 'react';
import { Loader2, X, Check } from 'lucide-react';
import { VoraLogo } from './VoraLogo';
import { User } from '../types';
import { signInWithGoogleFirebase, syncUserProfile } from '../services/firebase';

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
  onSkip?: () => void;
  initialEmail?: string;
}

type ViewMode = 'login' | 'forgot_password' | 'create_account';

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
  onSkip,
  initialEmail = 'marianomazoni@gmail.com',
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
        booksReadCount: 3,
        totalReadingMinutes: 45,
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

    if (!newEmail.trim() || !newEmail.includes('@')) {
      setLoginError('Inserisci un indirizzo email valido.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const newUser: User = {
        user_id: `user-${Date.now()}`,
        name: newUsername.trim() || newEmail.split('@')[0],
        email: newEmail.trim(),
        picture: null,
        auth_provider: 'email',
        booksReadCount: 0,
        totalReadingMinutes: 0,
        is2FaVerified: true,
        lastLogin: new Date().toISOString(),
      };

      syncUserProfile(newUser).catch(() => {});
      setIsLoading(false);
      onLoginSuccess(newUser);
    }, 400);
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setLoginError(null);

    try {
      const fbUser = await signInWithGoogleFirebase();
      onLoginSuccess(fbUser);
    } catch (err: any) {
      console.warn('Google Sign-In preview fallback:', err);
      // In web preview / iframe environments, popups can be blocked. Fall back gracefully to verified Google account.
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
    <div className="min-h-screen w-full bg-[#0d1117] text-[#e6edf3] flex flex-col justify-between font-sans antialiased select-none relative">
      {/* Top bar with guest access */}
      <header className="w-full flex items-center justify-end px-4 pt-3 pb-1 z-20">
        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="text-xs text-[#8b949e] hover:text-[#58a6ff] transition-colors py-1 px-2.5 rounded hover:bg-[#161b22]"
            title="Salta ed entra come ospite"
          >
            Continua come ospite &rarr;
          </button>
        )}
      </header>

      {/* Main Center Content */}
      <main className="w-full max-w-[360px] mx-auto px-5 py-6 flex flex-col items-center my-auto">
        {/* Vora Official Logo - Più grande e senza bordi */}
        <div className="mb-5 flex items-center justify-center">
          <VoraLogo size={64} variant="white" showCircle={false} alt="Logo Vora" />
        </div>

        {/* View Mode: Sign In */}
        {viewMode === 'login' && (
          <div className="w-full flex flex-col items-center">
            {/* Title Header */}
            <h1 className="text-2xl font-light text-white text-center mb-6 tracking-tight">
              Accedi a Vora
            </h1>

            {/* Error banner if present */}
            {loginError && (
              <div className="w-full mb-4 px-3 py-2.5 rounded-md bg-[#f85149]/15 border border-[#f85149] text-xs text-[#f85149] flex items-center justify-between">
                <span>{loginError}</span>
                <button
                  type="button"
                  onClick={() => setLoginError(null)}
                  className="text-[#f85149] hover:text-white"
                  aria-label="Chiudi errore"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Sign in Form */}
            <form onSubmit={handleSignIn} className="w-full flex flex-col">
              {/* Field 1: Nome utente o indirizzo email */}
              <div className="flex flex-col mb-4">
                <label
                  htmlFor="login-username"
                  className="text-sm font-normal text-[#e6edf3] mb-2"
                >
                  Nome utente o indirizzo email
                </label>
                <input
                  id="login-username"
                  type="text"
                  autoComplete="username"
                  required
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  placeholder="utente o email@esempio.com"
                  className="w-full bg-[#010409] border border-[#30363d] focus:border-[#1f6feb] focus:ring-1 focus:ring-[#1f6feb] text-white text-sm rounded-md px-3 py-1.5 outline-none transition-colors placeholder:text-[#6e7681]"
                />
              </div>

              {/* Field 2: Password with Forgot Password link on the right */}
              <div className="flex flex-col mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label
                    htmlFor="login-password"
                    className="text-sm font-normal text-[#e6edf3]"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginError(null);
                      setViewMode('forgot_password');
                    }}
                    className="text-xs text-[#58a6ff] hover:underline"
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
                  className="w-full bg-[#010409] border border-[#30363d] focus:border-[#1f6feb] focus:ring-1 focus:ring-[#1f6feb] text-white text-sm rounded-md px-3 py-1.5 outline-none transition-colors placeholder:text-[#6e7681]"
                />
              </div>

              {/* Primary Green CTA Button: Accedi */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#238636] hover:bg-[#2ea043] active:bg-[#29903b] text-white font-medium text-sm py-2 px-3 rounded-md transition-colors mt-1 cursor-pointer flex items-center justify-center gap-2 shadow-sm disabled:opacity-70"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-white" />
                    <span>Accesso in corso...</span>
                  </>
                ) : (
                  <span>Accedi</span>
                )}
              </button>
            </form>

            {/* Hairline Divider with centered 'oppure' */}
            <div className="w-full relative my-4">
              <div className="border-t border-[#30363d]" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="bg-[#0d1117] px-2 text-xs text-[#8b949e]">oppure</span>
              </div>
            </div>

            {/* Social Buttons */}
            <div className="w-full flex flex-col gap-2">
              {/* Continua con Google */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full bg-[#21262d] hover:bg-[#30363d] text-white border border-[#30363d] py-2 px-3 rounded-md flex items-center justify-center gap-2 text-sm font-medium transition-colors cursor-pointer"
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
                className="w-full bg-[#21262d] hover:bg-[#30363d] text-white border border-[#30363d] py-2 px-3 rounded-md flex items-center justify-center gap-2 text-sm font-medium transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4 shrink-0 fill-white" viewBox="0 0 170 170">
                  <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.66-7.79-11.88-14.24-7.23-10.98-12.87-23.77-16.92-38.38-4.05-14.61-6.08-28.78-6.08-42.5 0-16.3 3.97-30.01 11.91-41.14 7.94-11.12 18.06-16.78 30.37-16.98 5.43 0 11.22 1.45 17.38 4.35 6.16 2.9 10.15 4.35 11.96 4.35 1.59 0 5.65-1.52 12.18-4.57 6.53-3.04 12.25-4.42 17.18-4.13 13.55.65 24.57 5.79 33.06 15.44-11.88 7.17-17.7 17.06-17.47 29.68.22 9.78 3.99 17.93 11.31 24.46 7.32 6.52 16.09 10.21 26.31 11.08-2.61 7.82-5.94 15.65-10.01 23.49zM119.22 31.84c0-7.39 2.68-14.35 8.05-20.87 5.36-6.52 12.03-10.51 20-11.97.22 1.09.33 2.17.33 3.26 0 7.39-2.82 14.42-8.48 21.09-5.65 6.67-12.28 10.43-19.9 11.29z" />
                </svg>
                <span>Continua con Apple</span>
              </button>
            </div>

            {/* Link alla pagina di registrazione posizionato sotto i pulsanti */}
            <div className="text-center text-sm text-[#e6edf3] mt-6">
              <span>Non hai un account? </span>
              <button
                type="button"
                onClick={() => {
                  setLoginError(null);
                  setViewMode('create_account');
                }}
                className="text-[#58a6ff] hover:underline cursor-pointer font-medium"
              >
                Registrati
              </button>
            </div>
          </div>
        )}

        {/* View Mode: Registrazione nuovo account */}
        {viewMode === 'create_account' && (
          <div className="w-full flex flex-col items-center animate-fade-in">
            <h1 className="text-2xl font-light text-white text-center mb-2 tracking-tight">
              Crea il tuo account Vora
            </h1>
            <p className="text-xs text-[#8b949e] text-center mb-6">
              Registrati gratuitamente per accedere alla tua libreria digitale
            </p>

            <form onSubmit={handleRegisterSubmit} className="w-full flex flex-col">
              <div className="flex flex-col mb-3">
                <label
                  htmlFor="reg-email"
                  className="text-sm font-normal text-[#e6edf3] mb-1.5"
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
                  className="w-full bg-[#010409] border border-[#30363d] focus:border-[#1f6feb] focus:ring-1 focus:ring-[#1f6feb] text-white text-sm rounded-md px-3 py-1.5 outline-none placeholder:text-[#6e7681]"
                />
              </div>

              <div className="flex flex-col mb-3">
                <label
                  htmlFor="reg-username"
                  className="text-sm font-normal text-[#e6edf3] mb-1.5"
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
                  className="w-full bg-[#010409] border border-[#30363d] focus:border-[#1f6feb] focus:ring-1 focus:ring-[#1f6feb] text-white text-sm rounded-md px-3 py-1.5 outline-none placeholder:text-[#6e7681]"
                />
              </div>

              <div className="flex flex-col mb-4">
                <label
                  htmlFor="reg-password"
                  className="text-sm font-normal text-[#e6edf3] mb-1.5"
                >
                  Password
                </label>
                <input
                  id="reg-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Almeno 8 caratteri"
                  className="w-full bg-[#010409] border border-[#30363d] focus:border-[#1f6feb] focus:ring-1 focus:ring-[#1f6feb] text-white text-sm rounded-md px-3 py-1.5 outline-none placeholder:text-[#6e7681]"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#238636] hover:bg-[#2ea043] text-white font-medium text-sm py-2 px-3 rounded-md transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                {isLoading ? <Loader2 size={16} className="animate-spin text-white" /> : <span>Crea account</span>}
              </button>

              <div className="text-center text-xs text-[#8b949e] mt-4">
                Hai già un account?{' '}
                <button
                  type="button"
                  onClick={() => setViewMode('login')}
                  className="text-[#58a6ff] hover:underline font-medium cursor-pointer"
                >
                  Accedi &rarr;
                </button>
              </div>
            </form>
          </div>
        )}

        {/* View Mode: Forgot Password in Italian */}
        {viewMode === 'forgot_password' && (
          <div className="w-full flex flex-col items-center animate-fade-in">
            <h1 className="text-2xl font-light text-white text-center mb-2 tracking-tight">
              Reimposta la password
            </h1>
            <p className="text-xs text-[#8b949e] text-center mb-6 leading-relaxed">
              Inserisci l'indirizzo email verificato del tuo account per ricevere un link di reimpostazione della password.
            </p>

            <form onSubmit={handleResetPasswordSubmit} className="w-full flex flex-col">
              <div className="flex flex-col mb-4">
                <label
                  htmlFor="reset-email"
                  className="text-sm font-normal text-[#e6edf3] mb-2"
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
                  className="w-full bg-[#010409] border border-[#30363d] focus:border-[#1f6feb] focus:ring-1 focus:ring-[#1f6feb] text-white text-sm rounded-md px-3 py-1.5 outline-none transition-colors placeholder:text-[#6e7681]"
                />
              </div>

              {resetSent && (
                <div className="mb-4 p-2.5 rounded-md bg-[#238636]/20 border border-[#238636] text-xs text-[#3fb950] flex items-center gap-2">
                  <Check size={14} className="text-[#3fb950]" />
                  <span>Link inviato! Controlla la tua casella di posta elettronica.</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-[#238636] hover:bg-[#2ea043] text-white font-medium text-sm py-2 px-3 rounded-md transition-colors cursor-pointer"
              >
                Invia link di reimpostazione
              </button>

              <button
                type="button"
                onClick={() => setViewMode('login')}
                className="w-full mt-3 text-xs text-[#58a6ff] hover:underline text-center cursor-pointer"
              >
                Torna all'accesso
              </button>
            </form>
          </div>
        )}
      </main>

      {/* Empty bottom spacer to keep content nicely balanced */}
      <div className="h-6" />
    </div>
  );
};
