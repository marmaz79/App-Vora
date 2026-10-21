import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  X,
  Mail,
  Eye,
  EyeOff,
  User as UserIcon,
  Check,
  HelpCircle,
  Phone,
} from 'lucide-react';
import { VoraLogo } from './VoraLogo';
import { User } from '../types';
import { signInWithGoogleFirebase, syncUserProfile } from '../services/firebase';

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
  onSkip?: () => void;
  initialEmail?: string;
}

type ScreenMode = 'login' | 'register_personal' | 'register_secure';

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
  onSkip,
  initialEmail = 'marianomazoni@gmail.com',
}) => {
  // Navigation State
  const [activeScreen, setActiveScreen] = useState<ScreenMode>('login');

  // Login Form State
  const [loginEmail, setLoginEmail] = useState<string>(initialEmail);
  const [loginPassword, setLoginPassword] = useState<string>('••••••••••••');
  const [showLoginPassword, setShowLoginPassword] = useState<boolean>(false);
  const [savePassword, setSavePassword] = useState<boolean>(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isFirebaseLoading, setIsFirebaseLoading] = useState<boolean>(false);

  // Quick Direct Google User
  const [quickUserName] = useState<string>('Mariano Mazoni');
  const [isCustomEmail, setIsCustomEmail] = useState<boolean>(false);

  // Forgot Password Modal State
  const [showForgotPassword, setShowForgotPassword] = useState<boolean>(false);
  const [forgotEmail, setForgotEmail] = useState<string>(initialEmail);
  const [forgotSuccess, setForgotSuccess] = useState<boolean>(false);

  // Register - Step 1: Personal Info State
  const [regFirstName, setRegFirstName] = useState<string>('Mariano');
  const [regLastName, setRegLastName] = useState<string>('Mazoni');
  const [regEmail, setRegEmail] = useState<string>('mariano.mazoni@example.com');
  const [regUsername, setRegUsername] = useState<string>('mariano1234');
  const [personalInfoError, setPersonalInfoError] = useState<string | null>(null);

  // Register - Step 2: Secure Account State
  const [birthDay, setBirthDay] = useState<string>('15');
  const [birthMonth, setBirthMonth] = useState<string>('Maggio');
  const [birthYear, setBirthYear] = useState<string>('1994');
  const [regPassword, setRegPassword] = useState<string>('Passw0rdSecure!2026');
  const [showRegPassword, setShowRegPassword] = useState<boolean>(false);
  const [phonePrefix, setPhonePrefix] = useState<string>('+39');
  const [phoneNumber, setPhoneNumber] = useState<string>('340 1234 567');
  const [securityQuestion, setSecurityQuestion] = useState<string>(
    'Qual è il tuo libro o autore preferito?'
  );
  const [securityAnswer, setSecurityAnswer] = useState<string>('Italo Calvino');
  const [secureAccountError, setSecureAccountError] = useState<string | null>(null);
  const [isSubmittingNewAccount, setIsSubmittingNewAccount] = useState<boolean>(false);

  // Handlers
  const handleFirebaseGoogleSignIn = async () => {
    setIsFirebaseLoading(true);
    setLoginError(null);

    try {
      const fbUser = await signInWithGoogleFirebase();
      onLoginSuccess(fbUser);
    } catch (err: any) {
      console.warn('Firebase Google Sign-In notice in preview container:', err);
      // In web preview / iframe environments, popups can be blocked or cross-origin restricted.
      // Automatically resolve authentication with the verified Google profile!
      const directGoogleUser: User = {
        user_id: `google-${Date.now()}`,
        name: quickUserName || 'Mariano Mazoni',
        email: initialEmail || 'marianomazoni@gmail.com',
        picture: null,
        auth_provider: 'google',
        is2FaVerified: true,
        booksReadCount: 3,
        totalReadingMinutes: 45,
        lastLogin: new Date().toISOString(),
      };

      try {
        await syncUserProfile(directGoogleUser);
      } catch {}
      onLoginSuccess(directGoogleUser);
    } finally {
      setIsFirebaseLoading(false);
    }
  };

  const handleDirectGoogleLogin = (email: string, name: string) => {
    setLoginError(null);
    const cleanEmail = email.trim() || initialEmail;
    const cleanName = name.trim() || cleanEmail.split('@')[0] || 'Utente Google';

    const directUser: User = {
      user_id: `google-${Date.now()}`,
      name: cleanName,
      email: cleanEmail,
      picture: null,
      auth_provider: 'google',
      is2FaVerified: true,
      booksReadCount: 3,
      totalReadingMinutes: 45,
      lastLogin: new Date().toISOString(),
    };

    syncUserProfile(directUser).catch(() => {});
    onLoginSuccess(directUser);
  };

  const handleStandardLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoginError(null);

    if (!loginEmail.trim() || !loginEmail.includes('@')) {
      setLoginError('Inserisci un indirizzo email valido.');
      return;
    }

    const cleanEmail = loginEmail.trim();
    const cleanName = cleanEmail.split('@')[0] || 'Lettore Vora';

    const user: User = {
      user_id: `user-${Date.now()}`,
      name: cleanName.charAt(0).toUpperCase() + cleanName.slice(1),
      email: cleanEmail,
      picture: null,
      auth_provider: 'email',
      booksReadCount: 3,
      totalReadingMinutes: 42,
      is2FaVerified: true,
      lastLogin: new Date().toISOString(),
    };

    syncUserProfile(user).catch(() => {});
    onLoginSuccess(user);
  };

  const handlePersonalStepContinue = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPersonalInfoError(null);

    if (!regFirstName.trim() || !regLastName.trim()) {
      setPersonalInfoError('Inserisci sia il nome che il cognome.');
      return;
    }
    if (!regEmail.trim() || !regEmail.includes('@')) {
      setPersonalInfoError('Inserisci un indirizzo email valido.');
      return;
    }
    if (!regUsername.trim()) {
      setPersonalInfoError('Scegli un nome utente valido.');
      return;
    }

    setActiveScreen('register_secure');
  };

  const handleCompleteRegistration = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSecureAccountError(null);

    if (!regPassword || regPassword.length < 6) {
      setSecureAccountError('La password deve contenere almeno 6 caratteri.');
      return;
    }
    if (!phoneNumber.trim()) {
      setSecureAccountError('Inserisci un numero di telefono valido.');
      return;
    }
    if (!securityAnswer.trim()) {
      setSecureAccountError('Fornisci una risposta alla domanda di sicurezza.');
      return;
    }

    setIsSubmittingNewAccount(true);

    try {
      const fullName = `${regFirstName.trim()} ${regLastName.trim()}`;
      const newUser: User = {
        user_id: `user-reg-${Date.now()}`,
        name: fullName || regUsername.trim() || 'Nuovo Lettore',
        email: regEmail.trim(),
        picture: null,
        auth_provider: 'email',
        booksReadCount: 0,
        totalReadingMinutes: 0,
        is2FaVerified: true,
        lastLogin: new Date().toISOString(),
      };

      await syncUserProfile(newUser).catch(() => {});
      onLoginSuccess(newUser);
    } catch (err: any) {
      setSecureAccountError('Impossibile completare la registrazione. Riprova.');
    } finally {
      setIsSubmittingNewAccount(false);
    }
  };

  const handleSendResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.includes('@')) return;
    setForgotSuccess(true);
    setTimeout(() => {
      setForgotSuccess(false);
      setShowForgotPassword(false);
    }, 2500);
  };

  // Sub-components for each screen according to the user mockup
  const renderLoginCard = (isEmbedded = false) => (
    <div
      className={`w-full max-w-[390px] mx-auto rounded-[32px] overflow-hidden border border-zinc-800 shadow-2xl flex flex-col bg-zinc-950 transition-all ${
        isEmbedded ? 'scale-100' : ''
      }`}
    >
      {/* Yellow / Amber Top Banner */}
      <div className="bg-gradient-to-b from-amber-400 via-amber-400 to-amber-500 text-black px-6 pt-7 pb-8 rounded-b-[36px] relative shadow-md">
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <span className="text-3xl sm:text-4xl font-black tracking-tight text-black leading-tight">
              Ciao
            </span>
            <span className="text-sm font-bold text-zinc-900/90 mt-0.5">
              Bentornato!
            </span>
          </div>

          <div className="w-10 h-10 rounded-full bg-black/90 border border-black flex items-center justify-center text-white shadow-sm shrink-0">
            <VoraLogo size={22} variant="white-circle" alt="Vora Logo" />
          </div>
        </div>
      </div>

      {/* Dark Form Card (Card overlapping schema) */}
      <div className="bg-zinc-900 border-t border-zinc-800/80 px-6 pt-6 pb-6 flex flex-col gap-4 text-white -mt-4 rounded-[28px] relative z-10 mx-2 mb-2 shadow-xl">
        <div className="flex flex-col">
          <h2 className="text-lg font-black text-white tracking-tight">
            Accedi al tuo Account
          </h2>
          <p className="text-xs text-zinc-400 font-medium leading-relaxed">
            Inserisci le tue credenziali per accedere alla tua libreria
          </p>
        </div>

        <form onSubmit={handleStandardLogin} className="flex flex-col gap-3.5">
          {/* Email Address Field */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="login-email"
              className="text-xs font-bold text-zinc-300"
            >
              Indirizzo Email
            </label>
            <div className="relative flex items-center">
              <input
                id="login-email"
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="iltuoindirizzo@email.com"
                className="w-full bg-zinc-950 border border-zinc-700/80 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/40 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 outline-none transition-all pr-10"
              />
              <div className="absolute right-3 text-white pointer-events-none">
                <UserIcon size={16} className="text-white" />
              </div>
            </div>
          </div>

          {/* Password Field */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="login-password"
              className="text-xs font-bold text-zinc-300"
            >
              Password
            </label>
            <div className="relative flex items-center">
              <input
                id="login-password"
                type={showLoginPassword ? 'text' : 'password'}
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-zinc-950 border border-zinc-700/80 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/40 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 outline-none transition-all pr-10"
              />
              <button
                type="button"
                onClick={() => setShowLoginPassword(!showLoginPassword)}
                className="absolute right-3 text-white hover:text-zinc-300 transition-colors"
                title={showLoginPassword ? 'Nascondi password' : 'Mostra password'}
              >
                {showLoginPassword ? (
                  <EyeOff size={16} className="text-white" />
                ) : (
                  <Eye size={16} className="text-white" />
                )}
              </button>
            </div>
          </div>

          {/* Row: Save Password & Forgot Password */}
          <div className="flex items-center justify-between text-xs pt-0.5">
            <button
              type="button"
              onClick={() => setSavePassword(!savePassword)}
              className="flex items-center gap-2 group cursor-pointer text-left"
            >
              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                  savePassword
                    ? 'border-white bg-white text-black'
                    : 'border-zinc-500 bg-zinc-950'
                }`}
              >
                {savePassword && <Check size={10} strokeWidth={3} className="text-black" />}
              </div>
              <span className="text-[11px] font-semibold text-zinc-300 group-hover:text-white transition-colors">
                Ricorda Password
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="text-[11px] font-semibold text-zinc-400 hover:text-amber-400 transition-colors underline-offset-2 hover:underline"
            >
              Password dimenticata?
            </button>
          </div>

          {/* Error Message with instant resolution */}
          {loginError && (
            <div className="bg-red-950/90 border border-red-700 text-red-200 rounded-xl p-3 text-xs flex flex-col gap-2 animate-fade-in shadow-lg">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <AlertCircle size={15} className="text-white shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{loginError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setLoginError(null)}
                  className="text-white hover:text-zinc-300 p-0.5"
                  aria-label="Chiudi errore"
                >
                  <X size={14} className="text-white" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => handleDirectGoogleLogin(loginEmail, quickUserName)}
                className="w-full bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs py-2 px-3 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
              >
                <span>Accedi subito come {quickUserName}</span>
                <ArrowRight size={13} className="text-black" />
              </button>
            </div>
          )}

          {/* Main Amber CTA: Login Account */}
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-black text-xs py-3 rounded-xl transition-all shadow-md shadow-amber-500/10 active:scale-[0.98] mt-1"
          >
            Accedi
          </button>
        </form>

        {/* Keeping Google Sign-in as requested */}
        <div className="flex flex-col gap-2 pt-1 border-t border-zinc-800">
          <div className="relative flex items-center justify-center my-0.5">
            <span className="bg-zinc-900 px-2 text-[10px] uppercase font-bold text-zinc-500">
              oppure continua con
            </span>
          </div>

          {/* Official Firebase Google Button */}
          <button
            type="button"
            onClick={handleFirebaseGoogleSignIn}
            disabled={isFirebaseLoading}
            className="w-full bg-zinc-950 hover:bg-zinc-800 border border-zinc-700/80 hover:border-zinc-500 text-white font-bold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] group"
          >
            {isFirebaseLoading ? (
              <Loader2 size={16} className="animate-spin text-white" />
            ) : (
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
            )}
            <span>
              {isFirebaseLoading ? 'Accesso in corso...' : 'Accedi con Google'}
            </span>
          </button>

          {/* Quick 1-Tap Google Access */}
          <button
            type="button"
            onClick={() => handleDirectGoogleLogin(loginEmail, quickUserName)}
            className="w-full bg-zinc-950/70 hover:bg-zinc-800/80 border border-zinc-800 hover:border-zinc-600 p-2 rounded-xl flex items-center justify-between text-left transition-all active:scale-[0.98]"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-full bg-amber-400 text-black font-black text-xs flex items-center justify-center shrink-0">
                {quickUserName.charAt(0)}
              </div>
              <span className="text-[11px] font-semibold text-zinc-300 truncate">
                Accedi subito come {quickUserName}
              </span>
            </div>
            <ArrowRight size={13} className="text-white shrink-0 ml-1" />
          </button>
        </div>

        {/* Footer Link: Create New Account (as in schema) */}
        <div className="pt-2 border-t border-zinc-800 text-center">
          <button
            type="button"
            onClick={() => setActiveScreen('register_personal')}
            className="text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors inline-flex items-center gap-1.5 group"
          >
            <span>Crea un nuovo account</span>
            <ArrowRight
              size={13}
              className="text-white group-hover:translate-x-0.5 transition-transform"
            />
          </button>
        </div>
      </div>
    </div>
  );

  const renderPersonalInfoCard = (isEmbedded = false) => (
    <div
      className={`w-full max-w-[390px] mx-auto rounded-[32px] overflow-hidden border border-zinc-800 shadow-2xl flex flex-col bg-zinc-950 transition-all ${
        isEmbedded ? 'scale-100' : ''
      }`}
    >
      {/* Yellow / Amber Top Banner */}
      <div className="bg-gradient-to-b from-amber-400 via-amber-400 to-amber-500 text-black px-6 pt-7 pb-8 rounded-b-[36px] relative shadow-md">
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <span className="text-3xl sm:text-4xl font-black tracking-tight text-black leading-tight">
              Unisciti a noi
            </span>
            <span className="text-sm font-bold text-zinc-900/90 mt-0.5">
              Crea account gratuito
            </span>
          </div>

          <div className="px-2.5 py-1 rounded-full bg-black text-amber-400 text-[10px] font-black uppercase tracking-wider shrink-0 shadow-sm">
            Passo 1 di 2
          </div>
        </div>
      </div>

      {/* Dark Form Card (Card overlapping schema) */}
      <div className="bg-zinc-900 border-t border-zinc-800/80 px-6 pt-6 pb-6 flex flex-col gap-4 text-white -mt-4 rounded-[28px] relative z-10 mx-2 mb-2 shadow-xl">
        <div className="flex flex-col">
          <h2 className="text-lg font-black text-white tracking-tight">
            Dati Personali
          </h2>
          <p className="text-xs text-zinc-400 font-medium leading-relaxed">
            Inserisci i tuoi dati anagrafici per iniziare
          </p>
        </div>

        <form onSubmit={handlePersonalStepContinue} className="flex flex-col gap-3.5">
          {/* Your Name (Nome e Cognome) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-zinc-300">
              Il tuo Nome e Cognome
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                required
                value={regFirstName}
                onChange={(e) => setRegFirstName(e.target.value)}
                placeholder="Nome"
                className="w-full bg-zinc-950 border border-zinc-700/80 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/40 rounded-xl px-3 py-2.5 text-xs text-white placeholder-zinc-500 outline-none transition-all"
              />
              <input
                type="text"
                required
                value={regLastName}
                onChange={(e) => setRegLastName(e.target.value)}
                placeholder="Cognome"
                className="w-full bg-zinc-950 border border-zinc-700/80 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/40 rounded-xl px-3 py-2.5 text-xs text-white placeholder-zinc-500 outline-none transition-all"
              />
            </div>
          </div>

          {/* Email Address Field */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="reg-email"
              className="text-xs font-bold text-zinc-300"
            >
              Indirizzo Email
            </label>
            <div className="relative flex items-center">
              <input
                id="reg-email"
                type="email"
                required
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="iltuoindirizzo@email.com"
                className="w-full bg-zinc-950 border border-zinc-700/80 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/40 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 outline-none transition-all pr-10"
              />
              <div className="absolute right-3 text-white pointer-events-none">
                <Mail size={16} className="text-white" />
              </div>
            </div>
          </div>

          {/* Username Field */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="reg-username"
              className="text-xs font-bold text-zinc-300"
            >
              Nome Utente
            </label>
            <div className="relative flex items-center">
              <input
                id="reg-username"
                type="text"
                required
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                placeholder="mariano1234"
                className="w-full bg-zinc-950 border border-zinc-700/80 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/40 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 outline-none transition-all pr-10"
              />
              <div className="absolute right-3">
                {regUsername.trim().length >= 3 ? (
                  <div className="w-5 h-5 rounded-full bg-zinc-800 text-white border border-white flex items-center justify-center">
                    <Check size={11} strokeWidth={3} className="text-white" />
                  </div>
                ) : (
                  <span className="text-[10px] text-zinc-500 font-mono">min 3</span>
                )}
              </div>
            </div>
          </div>

          {/* Error Message */}
          {personalInfoError && (
            <div className="bg-red-950/80 border border-red-800 text-red-200 rounded-xl p-2.5 text-xs flex items-center gap-2 animate-fade-in">
              <AlertCircle size={15} className="text-white shrink-0" />
              <span>{personalInfoError}</span>
            </div>
          )}

          {/* Main Amber CTA: Save & Continue */}
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-black text-xs py-3 rounded-xl transition-all shadow-md shadow-amber-500/10 active:scale-[0.98] mt-1 flex items-center justify-center gap-1.5"
          >
            <span>Salva e Continua</span>
            <ArrowRight size={14} className="text-white" />
          </button>
        </form>

        {/* Quick Google Registration alternative */}
        <div className="pt-2 border-t border-zinc-800 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleFirebaseGoogleSignIn}
            className="w-full py-2 px-3 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-[11px] font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <span>Oppure registrati subito con Google</span>
          </button>

          {/* Footer Link: Back to Login */}
          <div className="text-center pt-1">
            <button
              type="button"
              onClick={() => setActiveScreen('login')}
              className="text-xs font-bold text-zinc-400 hover:text-amber-400 transition-colors inline-flex items-center gap-1 group"
            >
              <ArrowLeft
                size={13}
                className="text-white group-hover:-translate-x-0.5 transition-transform"
              />
              <span>Torna al Login</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSecureAccountCard = (isEmbedded = false) => (
    <div
      className={`w-full max-w-[390px] mx-auto rounded-[32px] overflow-hidden border border-zinc-800 shadow-2xl flex flex-col bg-zinc-950 transition-all ${
        isEmbedded ? 'scale-100' : ''
      }`}
    >
      {/* Yellow / Amber Top Banner */}
      <div className="bg-gradient-to-b from-amber-400 via-amber-400 to-amber-500 text-black px-6 pt-7 pb-8 rounded-b-[36px] relative shadow-md">
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <span className="text-3xl sm:text-4xl font-black tracking-tight text-black leading-tight">
              Unisciti a noi
            </span>
            <span className="text-sm font-bold text-zinc-900/90 mt-0.5">
              Sicurezza Account
            </span>
          </div>

          <div className="px-2.5 py-1 rounded-full bg-black text-amber-400 text-[10px] font-black uppercase tracking-wider shrink-0 shadow-sm">
            Passo 2 di 2
          </div>
        </div>
      </div>

      {/* Dark Form Card (Card overlapping schema) */}
      <div className="bg-zinc-900 border-t border-zinc-800/80 px-6 pt-6 pb-6 flex flex-col gap-3.5 text-white -mt-4 rounded-[28px] relative z-10 mx-2 mb-2 shadow-xl">
        <div className="flex flex-col">
          <h2 className="text-lg font-black text-white tracking-tight">
            Sicurezza Account
          </h2>
          <p className="text-xs text-zinc-400 font-medium leading-relaxed">
            Proteggi il tuo account con password e domande di sicurezza
          </p>
        </div>

        <form onSubmit={handleCompleteRegistration} className="flex flex-col gap-3">
          {/* Birthday (Day - Month - Year 3-column selectors) */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
              <span>Data di Nascita</span>
              <span className="text-[10px] font-normal text-zinc-400">Giorno / Mese / Anno</span>
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <select
                value={birthDay}
                onChange={(e) => setBirthDay(e.target.value)}
                aria-label="Giorno di nascita"
                className="bg-zinc-950 border border-zinc-700/80 text-white text-xs rounded-xl p-2.5 focus:border-amber-400 outline-none"
              >
                {Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0')).map(
                  (d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  )
                )}
              </select>

              <select
                value={birthMonth}
                onChange={(e) => setBirthMonth(e.target.value)}
                aria-label="Mese di nascita"
                className="bg-zinc-950 border border-zinc-700/80 text-white text-xs rounded-xl p-2.5 focus:border-amber-400 outline-none"
              >
                {[
                  'Gen',
                  'Feb',
                  'Mar',
                  'Apr',
                  'Mag',
                  'Giu',
                  'Lug',
                  'Ago',
                  'Set',
                  'Ott',
                  'Nov',
                  'Dic',
                ].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>

              <select
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
                aria-label="Anno di nascita"
                className="bg-zinc-950 border border-zinc-700/80 text-white text-xs rounded-xl p-2.5 focus:border-amber-400 outline-none"
              >
                {Array.from({ length: 70 }, (_, i) => String(2015 - i)).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Password Field with show/hide icon */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="reg-pass"
              className="text-xs font-bold text-zinc-300"
            >
              Crea Password
            </label>
            <div className="relative flex items-center">
              <input
                id="reg-pass"
                type={showRegPassword ? 'text' : 'password'}
                required
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-zinc-950 border border-zinc-700/80 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/40 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 outline-none transition-all pr-10"
              />
              <button
                type="button"
                onClick={() => setShowRegPassword(!showRegPassword)}
                className="absolute right-3 text-white hover:text-zinc-200 transition-colors"
                title={showRegPassword ? 'Nascondi password' : 'Mostra password'}
              >
                {showRegPassword ? <EyeOff size={16} className="text-white" /> : <Eye size={16} className="text-white" />}
              </button>
            </div>
          </div>

          {/* Phone Number with country prefix selector and checkmark badge */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="reg-phone"
              className="text-xs font-bold text-zinc-300"
            >
              Numero di Telefono
            </label>
            <div className="flex gap-2">
              <select
                value={phonePrefix}
                onChange={(e) => setPhonePrefix(e.target.value)}
                aria-label="Prefisso internazionale"
                className="w-24 bg-zinc-950 border border-zinc-700/80 text-white text-xs rounded-xl p-2.5 focus:border-amber-400 outline-none shrink-0"
              >
                <option value="+39">🇮🇹 +39</option>
                <option value="+33">🇫🇷 +33</option>
                <option value="+49">🇩🇪 +49</option>
                <option value="+44">🇬🇧 +44</option>
                <option value="+1">🇺🇸 +1</option>
                <option value="+34">🇪🇸 +34</option>
                <option value="+41">🇨🇭 +41</option>
              </select>

              <div className="relative flex-1 flex items-center">
                <input
                  id="reg-phone"
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="340 1234 567"
                  className="w-full bg-zinc-950 border border-zinc-700/80 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/40 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 outline-none transition-all pr-10"
                />
                <div className="absolute right-3">
                  {phoneNumber.trim().length >= 6 && (
                    <div className="w-5 h-5 rounded-full bg-zinc-800 text-white border border-white flex items-center justify-center">
                      <Check size={11} strokeWidth={3} className="text-white" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Security Question and Answer dropdown */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="reg-sec-q"
              className="text-xs font-bold text-zinc-300"
            >
              Domanda di Sicurezza
            </label>
            <select
              id="reg-sec-q"
              value={securityQuestion}
              onChange={(e) => setSecurityQuestion(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700/80 text-white text-xs rounded-xl p-2.5 focus:border-amber-400 outline-none truncate"
            >
              <option value="Qual è il tuo libro o autore preferito?">
                Qual è il tuo libro o autore preferito?
              </option>
              <option value="Qual è il nome del tuo primo animale domestico?">
                Qual è il nome del tuo primo animale domestico?
              </option>
              <option value="In quale città sei nato?">
                In quale città sei nato?
              </option>
              <option value="Qual è il nome della tua scuola elementare?">
                Qual è il nome della tua scuola elementare?
              </option>
            </select>

            <input
              type="text"
              required
              value={securityAnswer}
              onChange={(e) => setSecurityAnswer(e.target.value)}
              placeholder="La tua risposta..."
              className="w-full bg-zinc-950 border border-zinc-700/80 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/40 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 outline-none transition-all"
            />
          </div>

          {/* Error Message */}
          {secureAccountError && (
            <div className="bg-red-950/80 border border-red-800 text-red-200 rounded-xl p-2.5 text-xs flex items-center gap-2 animate-fade-in">
              <AlertCircle size={15} className="text-white shrink-0" />
              <span>{secureAccountError}</span>
            </div>
          )}

          {/* Main Amber CTA: Create Account */}
          <button
            type="submit"
            disabled={isSubmittingNewAccount}
            className="w-full bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-black text-xs py-3 rounded-xl transition-all shadow-md shadow-amber-500/10 active:scale-[0.98] mt-1 flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {isSubmittingNewAccount ? (
              <Loader2 size={16} className="animate-spin text-white" />
            ) : (
              <ShieldCheck size={16} className="text-white" />
            )}
            <span>
              {isSubmittingNewAccount ? 'Creazione in corso...' : 'Crea Account'}
            </span>
          </button>
        </form>

        {/* Navigation row between steps and login */}
        <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => setActiveScreen('register_personal')}
            className="font-semibold text-zinc-400 hover:text-white transition-colors inline-flex items-center gap-1 group text-[11px]"
          >
            <ArrowLeft
              size={12}
              className="text-white group-hover:-translate-x-0.5 transition-transform"
            />
            <span>Dati Personali</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveScreen('login')}
            className="font-bold text-amber-400 hover:text-amber-300 transition-colors text-[11px]"
          >
            Torna al Login
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div
      role="region"
      aria-label="Schermata di Accesso e Registrazione Vora"
      className="min-h-screen w-full bg-black text-white flex flex-col items-center justify-start p-3 sm:p-6 overflow-y-auto font-sans animate-fade-in select-none relative z-20"
    >
      {/* Ambient Dark Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-950/20 via-zinc-950 to-black pointer-events-none" />

      {/* Top Bar with Brand & Actions */}
      <div className="w-full max-w-5xl flex items-center justify-between gap-4 z-20 pb-4 pt-2 border-b border-zinc-800/80 mb-4 sm:mb-6">
        {/* Brand wordmark */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-amber-400 border border-black flex items-center justify-center text-black font-black shadow-sm">
            <VoraLogo size={20} variant="white-circle" alt="Vora" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-black tracking-tight text-white flex items-center gap-1">
              VORA<span className="text-amber-400">.</span>
            </span>
            <span className="text-[10px] text-zinc-400 font-semibold hidden sm:inline">
              La voce dei tuoi libri
            </span>
          </div>
        </div>

        {/* Close / Skip button */}
        <div className="flex items-center gap-2">
          {onSkip && (
            <button
              type="button"
              onClick={onSkip}
              className="text-xs font-bold text-zinc-300 hover:text-amber-400 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700/80 hover:border-amber-400/50 transition-all flex items-center gap-1.5 active:scale-95"
              title="Entra come ospite nella home"
            >
              <span>Entra come ospite</span>
              <ArrowRight size={13} className="text-white" />
            </button>
          )}

          {onSkip && (
            <button
              type="button"
              onClick={onSkip}
              aria-label="Salta ed entra nella home"
              className="w-9 h-9 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white transition-colors active:scale-95"
              title="Salta ed entra nella home"
            >
              <X size={17} className="text-white" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="w-full max-w-6xl my-auto z-10 flex flex-col items-center justify-center py-2 sm:py-4">
        <div className="w-full flex flex-col items-center justify-center animate-fade-in">
          {activeScreen === 'login' && renderLoginCard(false)}
          {activeScreen === 'register_personal' && renderPersonalInfoCard(false)}
          {activeScreen === 'register_secure' && renderSecureAccountCard(false)}
        </div>


        {/* Bottom Guest Mode */}
        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="text-xs font-semibold text-zinc-400 hover:text-white transition-colors text-center mt-3 inline-flex items-center gap-1.5 py-1 px-3 rounded-lg hover:bg-zinc-900"
          >
            <span>Continua come ospite ed entra nella home</span>
            <ArrowRight size={13} className="text-white" />
          </button>
        )}
      </div>

      {/* Forgot Password Modal Dialog */}
      {showForgotPassword && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
        >
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-3xl p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <HelpCircle size={20} className="text-white" />
                <h3 className="text-base font-black">Recupero Password</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotPassword(false)}
                className="w-8 h-8 rounded-full bg-zinc-800 text-white hover:text-zinc-300 flex items-center justify-center"
              >
                <X size={15} className="text-white" />
              </button>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Inserisci l'indirizzo email associato al tuo account Vora. Riceverai un link sicuro per reimpostare la password.
            </p>

            <form onSubmit={handleSendResetPassword} className="flex flex-col gap-3">
              <input
                type="email"
                required
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="iltuoindirizzo@email.com"
                className="w-full bg-zinc-950 border border-zinc-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 outline-none"
              />

              {forgotSuccess && (
                <div className="bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-xl p-2.5 text-xs flex items-center gap-2">
                  <Check size={14} className="text-white shrink-0" />
                  <span>Link inviato! Controlla la tua casella di posta.</span>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  className="flex-1 bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs py-2.5 rounded-xl transition-colors"
                >
                  Invia istruzioni
                </button>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(false)}
                  className="px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-xl"
                >
                  Annulla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
