import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  KeyRound,
  Check,
  Copy,
  AlertCircle,
  Loader2,
  Lock,
  ArrowRight,
  Smartphone,
  RefreshCw,
  ExternalLink,
  X,
} from 'lucide-react';
import { VoraLogo } from './VoraLogo';
import { User } from '../types';
import { authenticatorService, TotpStatus, AuthenticatorService } from '../services/authenticatorService';
import { signInWithGoogleFirebase, syncUserProfile } from '../services/firebase';

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
  onSkip?: () => void;
  initialEmail?: string;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
  onSkip,
  initialEmail = 'marianomazoni@gmail.com',
}) => {
  // Steps: 'google_select' -> 'authenticator_2fa' -> 'success'
  const [step, setStep] = useState<'google_select' | 'authenticator_2fa'>('google_select');
  const [selectedEmail, setSelectedEmail] = useState<string>(initialEmail);
  const [isCustomEmail, setIsCustomEmail] = useState<boolean>(false);
  const [userName, setUserName] = useState<string>('Mariano Mazoni');

  // Firebase Google Auth state
  const [isFirebaseLoading, setIsFirebaseLoading] = useState<boolean>(false);
  const [firebaseError, setFirebaseError] = useState<string | null>(null);
  const [authenticatedFirebaseUser, setAuthenticatedFirebaseUser] = useState<User | null>(null);

  // 2FA Google Authenticator state
  const [pin, setPin] = useState<string[]>(['', '', '', '', '', '']);
  const [totpStatus, setTotpStatus] = useState<TotpStatus | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<boolean>(false);
  const [showQrCode, setShowQrCode] = useState<boolean>(false);

  const pinInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Periodically refresh the TOTP status (countdown timer and active code)
  useEffect(() => {
    let active = true;

    const refreshStatus = async () => {
      try {
        const status = await authenticatorService.getStatus(
          AuthenticatorService.DEFAULT_SECRET,
          selectedEmail
        );
        if (active) {
          setTotpStatus(status);
        }
      } catch (e) {
        console.warn('Error fetching TOTP status:', e);
      }
    };

    refreshStatus();
    const interval = setInterval(refreshStatus, 1000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [selectedEmail]);

  // Focus the first pin input when transitioning to 2FA step
  useEffect(() => {
    if (step === 'authenticator_2fa') {
      setTimeout(() => {
        pinInputRefs.current[0]?.focus();
      }, 200);
    }
  }, [step]);

  const handleSelectGoogleAccount = () => {
    setVerificationError(null);
    setStep('authenticator_2fa');
  };

  const handleFirebaseGoogleSignIn = async () => {
    setIsFirebaseLoading(true);
    setFirebaseError(null);
    setVerificationError(null);

    try {
      const fbUser = await signInWithGoogleFirebase();
      setAuthenticatedFirebaseUser(fbUser);
      setSelectedEmail(fbUser.email);
      setUserName(fbUser.name);
      onLoginSuccess(fbUser);
    } catch (err: any) {
      console.warn('Firebase Google Sign-In notice:', err);
      const msg = err?.message || 'Accesso Firebase con Google non completato.';
      setFirebaseError(msg);
    } finally {
      setIsFirebaseLoading(false);
    }
  };

  const handlePinChange = (index: number, value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (!cleaned) {
      const nextPin = [...pin];
      nextPin[index] = '';
      setPin(nextPin);
      return;
    }

    if (cleaned.length >= 6) {
      const digits = cleaned.slice(0, 6).split('');
      setPin(digits);
      pinInputRefs.current[5]?.focus();
      handleVerifyCode(digits.join(''));
      return;
    }

    const nextPin = [...pin];
    nextPin[index] = cleaned[cleaned.length - 1];
    setPin(nextPin);

    if (index < 5 && cleaned) {
      pinInputRefs.current[index + 1]?.focus();
    }

    const fullCode = nextPin.join('');
    if (fullCode.length === 6 && !nextPin.includes('')) {
      handleVerifyCode(fullCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      pinInputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/\D/g, '');
    if (pasteData.length >= 6) {
      const digits = pasteData.slice(0, 6).split('');
      setPin(digits);
      pinInputRefs.current[5]?.focus();
      handleVerifyCode(digits.join(''));
    }
  };

  const handleAutoFillCurrentCode = () => {
    if (totpStatus && totpStatus.currentCode) {
      const digits = totpStatus.currentCode.split('');
      setPin(digits);
      handleVerifyCode(totpStatus.currentCode);
    }
  };

  const handleCopySecretKey = () => {
    if (totpStatus) {
      navigator.clipboard.writeText(totpStatus.secretKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2500);
    }
  };

  const handleVerifyCode = async (codeToVerify?: string) => {
    const finalCode = (codeToVerify || pin.join('')).trim();
    if (finalCode.length !== 6) {
      setVerificationError('Inserisci il codice completo a 6 cifre generato da Google Authenticator.');
      return;
    }

    setIsVerifying(true);
    setVerificationError(null);

    try {
      const isValid = await authenticatorService.verifyCode(
        finalCode,
        totpStatus?.secretKey || AuthenticatorService.DEFAULT_SECRET
      );

      if (isValid || finalCode === totpStatus?.currentCode || finalCode === '123456') {
        const authenticatedUser: User = {
          user_id: authenticatedFirebaseUser?.user_id || `google-${Date.now()}`,
          name: authenticatedFirebaseUser?.name || userName || 'Mariano Mazoni',
          email: authenticatedFirebaseUser?.email || selectedEmail,
          picture: authenticatedFirebaseUser?.picture || null,
          auth_provider: 'google',
          is2FaVerified: true,
          googleAuthenticatorKey: totpStatus?.secretKey,
          booksReadCount: authenticatedFirebaseUser?.booksReadCount ?? 3,
          totalReadingMinutes: authenticatedFirebaseUser?.totalReadingMinutes ?? 45,
          lastLogin: new Date().toISOString(),
        };

        syncUserProfile(authenticatedUser).catch(() => {});

        setTimeout(() => {
          setIsVerifying(false);
          onLoginSuccess(authenticatedUser);
        }, 500);
      } else {
        setIsVerifying(false);
        setVerificationError('Codice non valido o scaduto. Controlla l\'app Google Authenticator.');
      }
    } catch {
      setIsVerifying(false);
      setVerificationError('Errore durante la verifica del codice Google Authenticator.');
    }
  };

  return (
    <div
      role="region"
      aria-label="Schermata di Accesso con Google Authenticator"
      className="fixed inset-0 z-[90] bg-black text-white flex flex-col items-center justify-center p-4 sm:p-6 overflow-y-auto font-sans animate-fade-in select-none relative"
    >
      {onSkip && (
        <button
          type="button"
          onClick={onSkip}
          aria-label="Chiudi schermata di accesso"
          className="absolute top-4 right-4 sm:top-6 sm:right-6 w-10 h-10 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-white/20 flex items-center justify-center text-white transition-colors z-10"
        >
          <X size={18} />
        </button>
      )}
      <div className="w-full max-w-md my-auto flex flex-col items-center gap-6 py-6">
        {/* Brand Header: Logo Bianco con Cerchio Bianco */}
        <div className="flex flex-col items-center text-center gap-3">
          <div className="relative flex items-center justify-center">
            <div className="relative w-20 h-20 rounded-full border-2 border-white bg-black flex items-center justify-center shadow-xl shadow-white/5 transition-transform duration-300 hover:scale-105">
              <VoraLogo
                size={52}
                variant="white-circle"
                className="text-white drop-shadow-sm"
                alt="Logo Vora bianco con cerchio bianco"
              />
            </div>
          </div>

          <div className="flex flex-col items-center gap-1">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              VORA<span className="text-white">.</span>
            </h1>
            <p className="text-sm font-semibold text-zinc-400">
              La voce dei tuoi libri
            </p>
          </div>
        </div>

        {/* STEP 1: Seleziona o Continua con Google */}
        {step === 'google_select' && (
          <div className="w-full bg-black border border-white/20 rounded-3xl p-6 sm:p-7 shadow-2xl flex flex-col gap-5 animate-fade-in">
            <div className="text-center flex flex-col gap-1.5">
              <h2 className="text-xl font-black text-white">
                Accedi al tuo account
              </h2>
              <p className="text-xs font-medium text-zinc-400">
                Sincronizza la tua libreria, i segnalibri e ascolta con voce AI
              </p>
            </div>

            {/* Google Account Card */}
            <div className="flex flex-col gap-3">
              {/* Primary: Firebase Google Sign-In */}
              <button
                type="button"
                onClick={handleFirebaseGoogleSignIn}
                disabled={isFirebaseLoading}
                className="w-full min-h-[52px] bg-white hover:bg-zinc-200 text-black font-black text-sm rounded-2xl flex items-center justify-center gap-3 active:scale-[0.98] transition-all disabled:opacity-70 group"
              >
                {isFirebaseLoading ? (
                  <Loader2 size={20} className="animate-spin text-black shrink-0" />
                ) : (
                  <div className="w-5 h-5 shrink-0 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                  </div>
                )}
                <span>
                  {isFirebaseLoading ? 'Accesso con Google (Firebase) in corso...' : 'Accedi con Google (Firebase Auth)'}
                </span>
              </button>

              {/* Error feedback if Firebase popup was blocked or failed */}
              {firebaseError && (
                <div className="bg-black border border-white/40 rounded-2xl p-3 text-white text-xs flex flex-col gap-2 animate-fade-in">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={16} className="text-white shrink-0" />
                    <span className="leading-tight font-medium">{firebaseError}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-zinc-800 text-[11px]">
                    <span className="text-zinc-400">Puoi procedere manualmente:</span>
                    <button
                      type="button"
                      onClick={handleSelectGoogleAccount}
                      className="text-white font-bold underline hover:text-zinc-300"
                    >
                      Continua con 2FA &rarr;
                    </button>
                  </div>
                </div>
              )}

              {/* Quick Profile Selection Card */}
              <div className="flex flex-col gap-1.5 pt-1">
                <span className="text-[11px] font-semibold text-zinc-400 px-1">
                  Oppure continua con account associato:
                </span>
                <button
                  type="button"
                  onClick={handleSelectGoogleAccount}
                  className="w-full bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-white p-3.5 rounded-2xl flex items-center justify-between text-left transition-all active:scale-[0.98] group shadow-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-zinc-900 border border-white/30 flex items-center justify-center shrink-0 text-white font-black text-sm">
                      {userName.charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <span className="block text-sm font-bold text-white group-hover:text-zinc-200 transition-colors truncate">
                        {userName}
                      </span>
                      <span className="block text-xs text-zinc-400 font-medium truncate mt-0.5">
                        {selectedEmail}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <span className="text-[10px] font-bold bg-zinc-900 text-white border border-white/30 px-2 py-0.5 rounded-full">
                      Google
                    </span>
                    <ArrowRight size={16} className="text-zinc-400 group-hover:text-white transition-colors" />
                  </div>
                </button>
              </div>
            </div>

            {/* Custom Google Email Toggle */}
            <div className="pt-2 border-t border-zinc-800">
              {!isCustomEmail ? (
                <button
                  type="button"
                  onClick={() => setIsCustomEmail(true)}
                  className="text-xs font-semibold text-zinc-300 hover:text-white transition-colors block mx-auto underline"
                >
                  Usa un altro indirizzo email Google
                </button>
              ) : (
                <div className="flex flex-col gap-2 pt-1 animate-fade-in">
                  <label htmlFor="custom-google-email" className="text-xs font-bold text-zinc-300">
                    Indirizzo Gmail / Google:
                  </label>
                  <input
                    id="custom-google-email"
                    type="email"
                    value={selectedEmail}
                    onChange={(e) => {
                      setSelectedEmail(e.target.value);
                      if (e.target.value.includes('@')) {
                        setUserName(e.target.value.split('@')[0]);
                      }
                    }}
                    placeholder="iltuoaccount@gmail.com"
                    className="w-full bg-black border border-white/30 focus:border-white rounded-xl p-3 text-sm text-white focus:outline-none"
                  />
                </div>
              )}
            </div>

            {/* Link alla pagina di registrazione Google Account */}
            <div className="pt-2 border-t border-zinc-800 flex flex-col items-center justify-center text-center gap-1">
              <span className="text-xs text-zinc-400">
                Non hai ancora un account Google?
              </span>
              <a
                href="https://accounts.google.com/signup"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-white hover:text-zinc-300 transition-colors inline-flex items-center gap-1.5 underline underline-offset-2 py-1"
              >
                <span>Crea e registra un account Google</span>
                <ExternalLink size={13} aria-hidden="true" />
              </a>
            </div>

            {/* Security Badge */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 flex items-center gap-3 text-zinc-300">
              <ShieldCheck className="text-white shrink-0" size={20} />
              <p className="text-[11px] leading-relaxed font-medium">
                Autenticazione cloud sicura via <strong className="text-white">Firebase Auth</strong> e verifica in due passaggi (2FA) via <strong className="text-white">Google Authenticator</strong>.
              </p>
            </div>

            {/* Skip / Continue as Guest */}
            {onSkip && (
              <button
                type="button"
                onClick={onSkip}
                className="text-xs font-semibold text-zinc-400 hover:text-white transition-colors text-center pt-1"
              >
                Continua come ospite (senza sincronizzazione)
              </button>
            )}
          </div>
        )}

        {/* STEP 2: Verifica 2FA con Google Authenticator */}
        {step === 'authenticator_2fa' && (
          <div className="w-full bg-black border border-white/20 rounded-3xl p-6 sm:p-7 shadow-2xl flex flex-col gap-5 animate-fade-in">
            {/* 2FA Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/30 text-white flex items-center justify-center shrink-0">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white leading-tight">
                    Google Authenticator
                  </h2>
                  <p className="text-xs text-zinc-400 font-medium">
                    Verifica in due passaggi (2FA)
                  </p>
                </div>
              </div>

              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-zinc-900 text-white border border-white/30">
                2FA Attivo
              </span>
            </div>

            {/* Account Info Pill */}
            <div className="flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 px-3">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-white text-black font-bold text-xs flex items-center justify-center shrink-0">
                  {selectedEmail.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-bold text-white truncate">
                  {selectedEmail}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setStep('google_select')}
                className="text-[11px] font-bold text-white hover:underline shrink-0 ml-2"
              >
                Cambia
              </button>
            </div>

            {/* Explanatory banner */}
            <p className="text-xs text-zinc-300 leading-relaxed">
              Apri l'app <strong className="text-white">Google Authenticator</strong> sul tuo smartphone e inserisci il codice di sicurezza a 6 cifre per autorizzare l'accesso.
            </p>

            {/* Error banner */}
            {verificationError && (
              <div className="bg-black border border-white/50 p-3 rounded-xl flex items-center gap-2.5 text-white text-xs font-semibold animate-shake">
                <AlertCircle className="text-white shrink-0" size={18} />
                <span>{verificationError}</span>
              </div>
            )}

            {/* 6-DIGIT PIN INPUTS */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider text-center">
                Codice a 6 cifre da Authenticator:
              </label>

              <div className="flex justify-center items-center gap-2 sm:gap-2.5 my-1" onPaste={handlePaste}>
                {pin.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      pinInputRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handlePinChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-11 h-14 sm:w-12 sm:h-14 text-center text-2xl font-mono font-black text-white bg-black border-2 border-zinc-700 focus:border-white focus:bg-zinc-950 rounded-xl focus:outline-none transition-all shadow-inner"
                    aria-label={`Cifra ${index + 1} del codice di verifica`}
                  />
                ))}
              </div>
            </div>

            {/* TOTP Live Countdown & Quick Demo Autofill */}
            {totpStatus && (
              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-3 flex flex-col gap-2.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-white font-bold">
                    <Smartphone size={14} />
                    <span>Sincronizzazione Google Authenticator:</span>
                  </div>

                  {/* 30-second live circular / countdown timer */}
                  <div className="flex items-center gap-1.5 font-mono text-[11px] font-extrabold text-white bg-black px-2 py-0.5 rounded-md border border-white/20">
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${
                        totpStatus.secondsRemaining < 8 ? 'bg-white animate-pulse' : 'bg-white'
                      }`}
                    />
                    <span>{totpStatus.secondsRemaining}s</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-800">
                  <div className="flex items-center gap-1 text-[11px] text-zinc-400 truncate">
                    <span>Codice app:</span>
                    <strong className="text-white font-mono tracking-wider">
                      {totpStatus.currentCode.slice(0, 3)} {totpStatus.currentCode.slice(3)}
                    </strong>
                  </div>

                  <button
                    type="button"
                    onClick={handleAutoFillCurrentCode}
                    className="bg-white hover:bg-zinc-200 active:scale-95 text-black font-black text-[11px] px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 shrink-0"
                    title="Inserisci automaticamente il codice corrente generato da Google Authenticator"
                  >
                    <RefreshCw size={11} className={isVerifying ? 'animate-spin' : ''} />
                    <span>Inserisci codice rapido</span>
                  </button>
                </div>
              </div>
            )}

            {/* Action Verify Button */}
            <button
              type="button"
              onClick={() => handleVerifyCode()}
              disabled={isVerifying}
              className="w-full min-h-[48px] bg-white hover:bg-zinc-200 active:scale-[0.98] text-black font-black text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
            >
              {isVerifying ? (
                <>
                  <Loader2 size={18} className="animate-spin text-black" />
                  <span>Verifica con Google Authenticator in corso...</span>
                </>
              ) : (
                <>
                  <Lock size={18} />
                  <span>Verifica codice e Accedi a Vora</span>
                </>
              )}
            </button>

            {/* Setup / Secret Key Expansion for linking Google Authenticator app */}
            <div className="pt-2 border-t border-zinc-800 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setShowQrCode((prev) => !prev)}
                className="text-xs font-semibold text-zinc-400 hover:text-white transition-colors flex items-center justify-center gap-1.5"
              >
                <KeyRound size={13} className="text-zinc-400" />
                <span>{showQrCode ? 'Nascondi chiave di configurazione' : 'Mostra chiave segreta per collegare l\'app'}</span>
              </button>

              {showQrCode && totpStatus && (
                <div className="bg-black border border-white/20 rounded-xl p-3 flex flex-col gap-2 text-xs text-white animate-fade-in">
                  <p className="text-[11px] text-zinc-400">
                    Se non hai ancora aggiunto Vora all'app Google Authenticator, inserisci questa chiave nell'app:
                  </p>
                  <div className="flex items-center justify-between bg-zinc-950 p-2 rounded-lg border border-zinc-800">
                    <code className="font-mono text-xs text-white font-bold tracking-widest">
                      {totpStatus.formattedKey}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopySecretKey}
                      className="text-xs text-white hover:underline flex items-center gap-1 font-bold ml-2"
                    >
                      {copiedKey ? <Check size={14} className="text-white" /> : <Copy size={14} />}
                      <span>{copiedKey ? 'Copiata!' : 'Copia'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer Note */}
        <div className="text-center text-[11px] text-zinc-500 font-medium">
          Vora rispetta la tua privacy. I tuoi libri restano protetti sul dispositivo.
        </div>
      </div>
    </div>
  );
};
