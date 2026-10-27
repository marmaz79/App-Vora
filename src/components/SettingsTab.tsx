import React, { useState, useEffect } from 'react';
import { TtsSettings, User, ContrastThemeMode } from '../types';
import { ttsService, VoiceOption } from '../services/ttsService';
import {
  ArrowLeft,
  ChevronRight,
  Check,
  Play,
  Square,
  Sparkles,
  Volume2,
  Type,
  Palette,
  User as UserIcon,
  X,
  Gauge,
  Music,
} from 'lucide-react';

interface SettingsTabProps {
  settings: TtsSettings;
  onUpdateSettings: (newSettings: TtsSettings) => void;
  onBack?: () => void;
  user?: User;
  onOpenProfile?: () => void;
  onOpenLogin?: () => void;
  onLogout?: () => void;
}

interface ContrastOption {
  id: ContrastThemeMode;
  title: string;
  badge: string;
  description: string;
  swatchBg: string;
  swatchText: string;
  swatchBorder: string;
  previewBg: string;
  previewText: string;
  previewBorder: string;
  previewAccent: string;
}

const CONTRAST_THEME_OPTIONS: ContrastOption[] = [
  {
    id: 'black-white',
    title: 'Testo Bianco su Sfondo Nero',
    badge: 'Predefinito & Massimo Contrasto',
    description: 'Sfondo nero puro (#000000) e testo bianco brillante (#FFFFFF). Contrasto perfetto per la leggibilità e l\'accessibilità.',
    swatchBg: 'bg-black',
    swatchText: 'text-white',
    swatchBorder: 'border-white',
    previewBg: 'bg-black',
    previewText: 'text-white',
    previewBorder: 'border-white/40',
    previewAccent: 'text-white',
  },
  {
    id: 'dark',
    title: 'Modalità Notte Soft',
    badge: 'Contrasto Morbido',
    description: 'Sfondo antracite profondo con testo bianco nitido e bordi zinc per sessioni di lettura prolungata.',
    swatchBg: 'bg-[#121212]',
    swatchText: 'text-white',
    swatchBorder: 'border-zinc-700',
    previewBg: 'bg-[#121212]',
    previewText: 'text-white',
    previewBorder: 'border-zinc-800',
    previewAccent: 'text-zinc-300',
  },
  {
    id: 'white',
    title: 'Monocromatico Inverso (Nero su Bianco)',
    badge: 'Classico E-Ink',
    description: 'Sfondo bianco puro con testo nero assoluto per una visualizzazione classica ad alta risoluzione.',
    swatchBg: 'bg-white',
    swatchText: 'text-black',
    swatchBorder: 'border-zinc-400',
    previewBg: 'bg-white',
    previewText: 'text-black',
    previewBorder: 'border-zinc-300',
    previewAccent: 'text-black',
  },
];

export const SettingsTab: React.FC<SettingsTabProps> = ({
  settings,
  onUpdateSettings,
  onBack,
  user,
  onOpenProfile,
  onOpenLogin,
  onLogout,
}) => {
  const [allVoices, setAllVoices] = useState<VoiceOption[]>([]);
  const [voiceTab, setVoiceTab] = useState<'ai' | 'system'>('ai');
  const [previewingUri, setPreviewingUri] = useState<string | null>(null);

  // Modals state for detail configuration (NordVPN / iOS clean rows style)
  const [activeModal, setActiveModal] = useState<
    'contrast' | 'voice' | 'speed' | 'fontSize' | 'pitch' | 'account' | null
  >(null);

  useEffect(() => {
    const list = ttsService.getItalianVoices();
    setAllVoices(list);
  }, []);

  const aiVoices = allVoices.filter((v) => v.isAi);
  const systemVoices = allVoices.filter((v) => !v.isAi);

  const isCurrentVoiceAi = ttsService.isAiVoice(settings.voiceUri);

  const currentContrast = settings.highContrastMode || 'black-white';
  const activeThemeOption =
    CONTRAST_THEME_OPTIONS.find(
      (opt) =>
        opt.id === currentContrast ||
        (opt.id === 'black-white' && currentContrast === 'black-yellow')
    ) || CONTRAST_THEME_OPTIONS[0];

  const handleSelectVoice = (voice: VoiceOption) => {
    onUpdateSettings({
      ...settings,
      voiceUri: voice.uri,
      voiceName: voice.name,
    });
  };

  const handleTestSpecificVoice = (voice: VoiceOption, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (previewingUri) {
      ttsService.stop();
      setPreviewingUri(null);
      return;
    }

    setPreviewingUri(voice.uri);
    const tempSettings = { ...settings, voiceUri: voice.uri, voiceName: voice.name };
    ttsService.previewVoice(tempSettings, undefined, () => {
      setPreviewingUri(null);
    });
  };

  const handleRatePreset = (rate: number) => {
    onUpdateSettings({ ...settings, rate });
  };

  const getFontSizeLabel = () => {
    switch (settings.fontSize) {
      case 'huge':
        return 'Massima (A++)';
      case 'large':
        return 'Grande (A+)';
      case 'normal':
      default:
        return 'Normale (A)';
    }
  };

  return (
    <section className="flex flex-col bg-transparent text-slate-800 select-none pb-32 animate-fade-in font-sans" aria-label="Impostazioni applicazione">
      {/* 1. TOP HEADER (Flip7 Style) */}
      <div className="pt-2 pb-3 px-1 sm:px-2 flex items-center gap-3 border-b-2 border-dashed border-[#2BA8A2]/30 mb-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Torna indietro"
            className="w-10 h-10 rounded-full border border-[#2BA8A2]/30 bg-white hover:bg-[#E8F6F5] active:scale-95 flex items-center justify-center text-[#1E8C86] transition-all shrink-0 shadow-xs"
            title="Torna indietro"
          >
            <ArrowLeft size={19} className="stroke-[2.5]" />
          </button>
        )}
        <div className="min-w-0">
          <span className="block text-[11px] font-extrabold text-[#1E8C86] tracking-wider uppercase">
            Lettura & Sintesi Vocale
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-[#1E8C86] tracking-tight flex items-center gap-2">
            <span>Impostazioni</span>
            <span className="w-2.5 h-2.5 rounded-full bg-[#FFD23F] shadow-accent-glow inline-block" />
          </h1>
        </div>
      </div>

      {/* 2. LISTA IMPOSTAZIONI (Flip7 White Card with tactile rows) */}
      <div className="bg-white rounded-3xl p-3 sm:p-5 border-2 border-[#2BA8A2]/20 shadow-card flex flex-col divide-y divide-[#2BA8A2]/10">
        {/* ROW 1: TEMA DI CONTRASTO */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setActiveModal('contrast')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setActiveModal('contrast');
          }}
          className="py-3.5 px-2 flex items-center justify-between gap-4 cursor-pointer hover:bg-[#E8F6F5] rounded-2xl active:scale-[0.99] transition-all group"
        >
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight mb-1 group-hover:text-[#1E8C86] transition-colors">
              Tema di contrasto e visualizzazione
            </h2>
            <p className="text-xs sm:text-[13px] text-slate-500 font-medium leading-relaxed mb-2 max-w-xl">
              Configura il tema monocromatico per il massimo comfort visivo ed eliminazione dei riflessi.
            </p>
            {/* Badge Flip7 */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E8F6F5] border border-[#2BA8A2]/30 text-xs font-black text-[#1E8C86] shadow-xs">
              <span className={`w-2.5 h-2.5 rounded-full ${activeThemeOption.swatchBg} border border-[#2BA8A2]`} />
              <span>{activeThemeOption.title}</span>
            </div>
          </div>
          <ChevronRight size={20} className="text-[#2BA8A2] group-hover:translate-x-0.5 transition-transform shrink-0" />
        </div>

        {/* ROW 2: VOCE DI LETTURA (TTS AI & Sistema) */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setActiveModal('voice')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setActiveModal('voice');
          }}
          className="py-3.5 px-2 flex items-center justify-between gap-4 cursor-pointer hover:bg-[#E8F6F5] rounded-2xl active:scale-[0.99] transition-all group"
        >
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight mb-1 group-hover:text-[#1E8C86] transition-colors">
              Voce di lettura (Sintesi Vocale)
            </h2>
            <p className="text-xs sm:text-[13px] text-slate-500 font-medium leading-relaxed mb-2 max-w-xl">
              Seleziona la voce italiana per la narrazione. Include voci AI Gemini e voci di sistema del dispositivo.
            </p>
            {/* Badge Flip7 */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF8E7] border border-[#FFD23F] text-xs font-black text-[#1E8C86] shadow-xs">
              {isCurrentVoiceAi ? (
                <>
                  <Sparkles size={13} className="text-[#FFD23F] fill-[#FFD23F]" />
                  <span>Voce AI: {settings.voiceName || 'Chiara (Naturale)'}</span>
                </>
              ) : (
                <>
                  <Volume2 size={13} className="text-[#1E8C86]" />
                  <span>{settings.voiceName || 'Voce di Sistema'}</span>
                </>
              )}
            </div>
          </div>
          <ChevronRight size={20} className="text-[#2BA8A2] group-hover:translate-x-0.5 transition-transform shrink-0" />
        </div>

        {/* ROW 3: VELOCITÀ DI RIPRODUZIONE */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setActiveModal('speed')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setActiveModal('speed');
          }}
          className="py-3.5 px-2 flex items-center justify-between gap-4 cursor-pointer hover:bg-[#E8F6F5] rounded-2xl active:scale-[0.99] transition-all group"
        >
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight mb-1 group-hover:text-[#1E8C86] transition-colors">
              Velocità di riproduzione
            </h2>
            <p className="text-xs sm:text-[13px] text-slate-500 font-medium leading-relaxed mb-2 max-w-xl">
              Modifica la cadenza e il ritmo di lettura per adattarla al tuo ritmo di comprensione o ascolto rapido.
            </p>
            {/* Badge Flip7 */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E8F6F5] border border-[#2BA8A2]/30 text-xs font-black text-[#1E8C86] shadow-xs">
              <Gauge size={13} className="text-[#2BA8A2]" />
              <span>{settings.rate.toFixed(1)}x {settings.rate === 1.0 ? '(Normale)' : settings.rate < 1.0 ? '(Lenta)' : '(Veloce)'}</span>
            </div>
          </div>
          <ChevronRight size={20} className="text-[#2BA8A2] group-hover:translate-x-0.5 transition-transform shrink-0" />
        </div>

        {/* ROW 4: DIMENSIONE CARATTERI NEL LETTORE */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setActiveModal('fontSize')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setActiveModal('fontSize');
          }}
          className="py-3.5 px-2 flex items-center justify-between gap-4 cursor-pointer hover:bg-[#E8F6F5] rounded-2xl active:scale-[0.99] transition-all group"
        >
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight mb-1 group-hover:text-[#1E8C86] transition-colors">
              Dimensione testo nel lettore
            </h2>
            <p className="text-xs sm:text-[13px] text-slate-500 font-medium leading-relaxed mb-2 max-w-xl">
              Regola l'ingrandimento dei caratteri nella vista documento per agevolare la lettura visiva.
            </p>
            {/* Badge Flip7 */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E8F6F5] border border-[#2BA8A2]/30 text-xs font-black text-[#1E8C86] shadow-xs">
              <Type size={13} className="text-[#2BA8A2]" />
              <span>{getFontSizeLabel()}</span>
            </div>
          </div>
          <ChevronRight size={20} className="text-[#2BA8A2] group-hover:translate-x-0.5 transition-transform shrink-0" />
        </div>

        {/* ROW 5: AVANZAMENTO AUTOMATICO (Switch Toggle Flip7) */}
        <div className="py-3.5 px-2 flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight mb-1">
              Avanzamento automatico pagina
            </h2>
            <p className="text-xs sm:text-[13px] text-slate-500 font-medium leading-relaxed mb-2 max-w-xl">
              Passa automaticamente alla pagina successiva del libro quando la voce raggiunge la fine del testo.
            </p>
            {settings.autoAdvance ? (
              <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-[#2BA8A2] text-white text-[11px] font-black shadow-xs">
                Attivo
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-slate-100 border border-slate-300 text-slate-500 text-[11px] font-bold">
                Disattivato
              </span>
            )}
          </div>

          {/* Toggle Switch Flip7 */}
          <button
            type="button"
            role="switch"
            aria-checked={settings.autoAdvance}
            onClick={() => onUpdateSettings({ ...settings, autoAdvance: !settings.autoAdvance })}
            className={`w-13 h-7 rounded-full p-0.5 transition-colors relative shrink-0 focus-visible:outline-none cursor-pointer border-2 ${
              settings.autoAdvance ? 'bg-[#2BA8A2] border-[#1E8C86]' : 'bg-slate-200 border-slate-300'
            }`}
            aria-label="Attiva o disattiva l'avanzamento automatico della pagina"
          >
            <div
              className={`w-5.5 h-5.5 rounded-full transition-transform shadow-md ${
                settings.autoAdvance
                  ? 'translate-x-6 bg-[#FFD23F] shadow-accent-glow'
                  : 'translate-x-0.5 bg-white'
              }`}
            />
          </button>
        </div>

        {/* ROW 6: TONALITÀ VOCE (Pitch) */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setActiveModal('pitch')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setActiveModal('pitch');
          }}
          className="py-3.5 px-2 flex items-center justify-between gap-4 cursor-pointer hover:bg-[#E8F6F5] rounded-2xl active:scale-[0.99] transition-all group"
        >
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight mb-1 group-hover:text-[#1E8C86] transition-colors">
              Tonalità della voce (Pitch)
            </h2>
            <p className="text-xs sm:text-[13px] text-slate-500 font-medium leading-relaxed mb-2 max-w-xl">
              Regola l'altezza tonale (grave o acuta) per le voci del sintetizzatore vocale.
            </p>
            {/* Badge Flip7 */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E8F6F5] border border-[#2BA8A2]/30 text-xs font-black text-[#1E8C86] shadow-xs">
              <Music size={13} className="text-[#2BA8A2]" />
              <span>{settings.pitch.toFixed(1)} {settings.pitch === 1.0 ? '(Standard)' : settings.pitch > 1.0 ? '(Acuta)' : '(Grave)'}</span>
            </div>
          </div>
          <ChevronRight size={20} className="text-[#2BA8A2] group-hover:translate-x-0.5 transition-transform shrink-0" />
        </div>

        {/* ROW 7: ACCOUNT & SICUREZZA */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setActiveModal('account')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setActiveModal('account');
          }}
          className="py-3.5 px-2 flex items-center justify-between gap-4 cursor-pointer hover:bg-[#E8F6F5] rounded-2xl active:scale-[0.99] transition-all group"
        >
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight mb-1 group-hover:text-[#1E8C86] transition-colors">
              Account e sincronizzazione
            </h2>
            <p className="text-xs sm:text-[13px] text-slate-500 font-medium leading-relaxed mb-2 max-w-xl">
              {user?.email
                ? `Connesso come ${user.name} (${user.email}). I tuoi libri e progressi sono salvati.`
                : 'Accedi con Google per sincronizzare la libreria e proteggere i tuoi documenti scansionati.'}
            </p>
            {/* Badge Flip7 */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E8F6F5] border border-[#2BA8A2]/30 text-xs font-black text-[#1E8C86] shadow-xs">
              <UserIcon size={13} className="text-[#1E8C86]" />
              <span>{user?.auth_provider === 'google' ? 'Google Account Attivo' : 'Ospite Locale'}</span>
            </div>
          </div>
          <ChevronRight size={20} className="text-[#2BA8A2] group-hover:translate-x-0.5 transition-transform shrink-0" />
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. MODALI DI SELEZIONE DETTAGLIATA (Stile Flip7)              */}
      {/* ============================================================== */}

      {/* MODALE 1: TEMA DI CONTRASTO */}
      {activeModal === 'contrast' && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="w-full max-w-xl bg-white border-2 border-[#2BA8A2]/30 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto shadow-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b-2 border-dashed border-[#2BA8A2]/20 pb-3">
              <div className="flex items-center gap-2">
                <Palette size={20} className="text-[#1E8C86]" />
                <h3 className="text-base font-black text-[#1E8C86]">Scegli tema di contrasto</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-[#E8F6F5] border border-[#2BA8A2]/30 hover:bg-[#2BA8A2]/20 active:scale-95 flex items-center justify-center text-[#1E8C86] transition-all"
              >
                <X size={17} />
              </button>
            </div>

            <div className="flex flex-col gap-2.5">
              {CONTRAST_THEME_OPTIONS.map((opt) => {
                const isSelected =
                  settings.highContrastMode === opt.id ||
                  (opt.id === 'black-white' && settings.highContrastMode === 'black-yellow');

                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      onUpdateSettings({ ...settings, highContrastMode: opt.id });
                      setActiveModal(null);
                    }}
                    className={`w-full p-3.5 rounded-2xl border-2 text-left transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'border-[#2BA8A2] bg-[#E8F6F5] shadow-xs'
                        : 'border-[#2BA8A2]/20 bg-white hover:bg-[#FFF8E7]'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`w-11 h-11 rounded-xl border flex items-center justify-center font-black text-sm shrink-0 shadow-inner ${opt.swatchBg} ${opt.swatchText} ${opt.swatchBorder}`}
                      >
                        Aa
                      </div>
                      <div className="min-w-0">
                        <span className="block text-sm font-black text-slate-900 truncate">
                          {opt.title}
                        </span>
                        <span className="block text-xs text-slate-500 font-medium truncate">
                          {opt.badge}
                        </span>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-[#2BA8A2] text-white flex items-center justify-center shrink-0 shadow-teal-glow">
                        <Check size={14} className="stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Anteprima Live */}
            <div className="pt-2 border-t-2 border-dashed border-[#2BA8A2]/20">
              <span className="text-xs font-black text-[#1E8C86] block mb-2 uppercase tracking-wider">
                Anteprima stile selezionato:
              </span>
              <div
                className={`p-3.5 rounded-2xl border text-sm font-serif leading-relaxed ${activeThemeOption.previewBg} ${activeThemeOption.previewText} ${activeThemeOption.previewBorder}`}
              >
                "La lettura ad alto contrasto garantisce la massima nitidezza visiva, riduce l'affaticamento e rende il testo impeccabile."
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODALE 2: VOCE DI LETTURA */}
      {activeModal === 'voice' && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="w-full max-w-xl bg-white border-2 border-[#2BA8A2]/30 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto shadow-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b-2 border-dashed border-[#2BA8A2]/20 pb-3">
              <div className="flex items-center gap-2">
                <Volume2 size={20} className="text-[#1E8C86]" />
                <h3 className="text-base font-black text-[#1E8C86]">Scegli voce di lettura</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  ttsService.stop();
                  setPreviewingUri(null);
                  setActiveModal(null);
                }}
                className="w-8 h-8 rounded-full bg-[#E8F6F5] border border-[#2BA8A2]/30 hover:bg-[#2BA8A2]/20 active:scale-95 flex items-center justify-center text-[#1E8C86] transition-all"
              >
                <X size={17} />
              </button>
            </div>

            {/* Tabs AI vs Sistema */}
            <div className="grid grid-cols-2 gap-2 p-1.5 bg-[#E8F6F5] rounded-2xl border border-[#2BA8A2]/20">
              <button
                type="button"
                onClick={() => setVoiceTab('ai')}
                className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                  voiceTab === 'ai'
                    ? 'bg-white text-[#1E8C86] font-black shadow-xs'
                    : 'text-slate-600 hover:text-[#1E8C86]'
                }`}
              >
                <Sparkles size={14} className={voiceTab === 'ai' ? 'text-[#FFD23F] fill-[#FFD23F]' : 'text-slate-400'} />
                <span>Voci AI Naturali ({aiVoices.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setVoiceTab('system')}
                className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                  voiceTab === 'system'
                    ? 'bg-white text-[#1E8C86] font-black shadow-xs'
                    : 'text-slate-600 hover:text-[#1E8C86]'
                }`}
              >
                <Volume2 size={14} className={voiceTab === 'system' ? 'text-[#1E8C86]' : 'text-slate-400'} />
                <span>Voci di Sistema ({systemVoices.length})</span>
              </button>
            </div>

            {/* Lista Voci */}
            <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
              {(voiceTab === 'ai' ? aiVoices : systemVoices).map((v) => {
                const isSelected = settings.voiceUri === v.uri;
                const isPlayingThis = previewingUri === v.uri;

                return (
                  <div
                    key={v.uri}
                    onClick={() => handleSelectVoice(v)}
                    className={`p-3 rounded-2xl border-2 flex items-center justify-between gap-3 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#2BA8A2] bg-[#E8F6F5] shadow-xs'
                        : 'border-[#2BA8A2]/15 bg-white hover:bg-[#FFF8E7]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-[#2BA8A2] text-white' : 'border-2 border-slate-300'
                        }`}
                      >
                        {isSelected && <Check size={12} className="stroke-[3]" />}
                      </div>
                      <div className="min-w-0">
                        <span className="block text-sm font-black text-slate-900 truncate">
                          {v.name.split(' - ')[0]}
                        </span>
                        <span className="block text-[11px] text-slate-500 uppercase font-bold">
                          {v.gender} {v.isAi ? '· AI Gemini' : ''}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleTestSpecificVoice(v, e)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-black flex items-center gap-1.5 shrink-0 transition-all ${
                        isPlayingThis
                          ? 'bg-[#EF6C4A] text-white border-[#EF6C4A] animate-pulse shadow-coral-glow'
                          : 'bg-white text-[#1E8C86] border-[#2BA8A2]/30 hover:bg-[#E8F6F5]'
                      }`}
                    >
                      {isPlayingThis ? <Square size={12} /> : <Play size={12} />}
                      <span>{isPlayingThis ? 'Stop' : 'Ascolta'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODALE 3: VELOCITÀ DI RIPRODUZIONE */}
      {activeModal === 'speed' && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="w-full max-w-md bg-white border-2 border-[#2BA8A2]/30 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 flex flex-col gap-4 shadow-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b-2 border-dashed border-[#2BA8A2]/20 pb-3">
              <div className="flex items-center gap-2">
                <Gauge size={20} className="text-[#1E8C86]" />
                <h3 className="text-base font-black text-[#1E8C86]">Velocità di riproduzione</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-[#E8F6F5] border border-[#2BA8A2]/30 hover:bg-[#2BA8A2]/20 active:scale-95 flex items-center justify-center text-[#1E8C86] transition-all"
              >
                <X size={17} />
              </button>
            </div>

            <div className="text-center py-2">
              <span className="text-4xl font-black text-[#1E8C86]">
                {settings.rate.toFixed(1)}x
              </span>
              <p className="text-xs text-slate-500 font-semibold mt-1">
                {settings.rate === 1.0 ? 'Velocità Standard' : settings.rate < 1.0 ? 'Lettura Rallentata' : 'Lettura Accelerata'}
              </p>
            </div>

            <input
              type="range"
              min="0.6"
              max="2.0"
              step="0.1"
              value={settings.rate}
              onChange={(e) => onUpdateSettings({ ...settings, rate: parseFloat(e.target.value) })}
              className="w-full h-2.5 bg-[#E8F6F5] rounded-lg appearance-none cursor-pointer accent-[#2BA8A2]"
            />

            {/* Presets */}
            <div className="grid grid-cols-4 gap-2 pt-2">
              {[
                { label: '0.8x', value: 0.8 },
                { label: '1.0x', value: 1.0 },
                { label: '1.3x', value: 1.3 },
                { label: '1.6x', value: 1.6 },
              ].map((preset) => {
                const isSelected = Math.abs(settings.rate - preset.value) < 0.05;
                return (
                  <button
                    key={preset.label}
                    onClick={() => handleRatePreset(preset.value)}
                    className={`py-2 rounded-xl text-xs font-black border transition-all active:scale-95 ${
                      isSelected
                        ? 'bg-[#2BA8A2] text-white border-[#2BA8A2] shadow-teal-glow'
                        : 'bg-white text-[#1E8C86] border-[#2BA8A2]/30 hover:bg-[#E8F6F5]'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODALE 4: DIMENSIONE CARATTERI */}
      {activeModal === 'fontSize' && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="w-full max-w-md bg-white border-2 border-[#2BA8A2]/30 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 flex flex-col gap-4 shadow-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b-2 border-dashed border-[#2BA8A2]/20 pb-3">
              <div className="flex items-center gap-2">
                <Type size={20} className="text-[#1E8C86]" />
                <h3 className="text-base font-black text-[#1E8C86]">Dimensione del testo</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-[#E8F6F5] border border-[#2BA8A2]/30 hover:bg-[#2BA8A2]/20 active:scale-95 flex items-center justify-center text-[#1E8C86] transition-all"
              >
                <X size={17} />
              </button>
            </div>

            <div className="flex flex-col gap-2.5 pt-1">
              {[
                { id: 'normal' as const, title: 'Normale (A)', desc: 'Dimensione predefinita del testo' },
                { id: 'large' as const, title: 'Grande (A+)', desc: 'Caratteri ingranditi per una lettura comoda' },
                { id: 'huge' as const, title: 'Massima (A++)', desc: 'Caratteri extra-large ad alta visibilità' },
              ].map((fs) => {
                const isSelected = settings.fontSize === fs.id;
                return (
                  <button
                    key={fs.id}
                    type="button"
                    onClick={() => {
                      onUpdateSettings({ ...settings, fontSize: fs.id });
                      setActiveModal(null);
                    }}
                    className={`p-3.5 rounded-2xl border-2 text-left flex items-center justify-between transition-all active:scale-95 ${
                      isSelected
                        ? 'bg-[#E8F6F5] text-[#1E8C86] border-[#2BA8A2] shadow-xs'
                        : 'bg-white text-slate-800 border-[#2BA8A2]/20 hover:bg-[#FFF8E7]'
                    }`}
                  >
                    <div>
                      <span className="block text-sm font-black">{fs.title}</span>
                      <span className="block text-xs text-slate-500 font-medium">
                        {fs.desc}
                      </span>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-[#2BA8A2] text-white flex items-center justify-center shrink-0 shadow-teal-glow">
                        <Check size={14} className="stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODALE 5: TONALITÀ (Pitch) */}
      {activeModal === 'pitch' && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="w-full max-w-md bg-white border-2 border-[#2BA8A2]/30 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 flex flex-col gap-4 shadow-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b-2 border-dashed border-[#2BA8A2]/20 pb-3">
              <div className="flex items-center gap-2">
                <Music size={20} className="text-[#1E8C86]" />
                <h3 className="text-base font-black text-[#1E8C86]">Tonalità della voce (Pitch)</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-[#E8F6F5] border border-[#2BA8A2]/30 hover:bg-[#2BA8A2]/20 active:scale-95 flex items-center justify-center text-[#1E8C86] transition-all"
              >
                <X size={17} />
              </button>
            </div>

            <div className="text-center py-2">
              <span className="text-4xl font-black text-[#1E8C86]">
                {settings.pitch.toFixed(1)}
              </span>
              <p className="text-xs text-slate-500 font-semibold mt-1">
                {settings.pitch === 1.0 ? 'Tono Naturale' : settings.pitch > 1.0 ? 'Tono più Acuto' : 'Tono più Grave'}
              </p>
            </div>

            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.1"
              value={settings.pitch}
              onChange={(e) => onUpdateSettings({ ...settings, pitch: parseFloat(e.target.value) })}
              className="w-full h-2.5 bg-[#E8F6F5] rounded-lg appearance-none cursor-pointer accent-[#2BA8A2]"
            />
          </div>
        </div>
      )}

      {/* MODALE 6: ACCOUNT & PROFILO */}
      {activeModal === 'account' && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="w-full max-w-md bg-white border-2 border-[#2BA8A2]/30 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 flex flex-col gap-4 shadow-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b-2 border-dashed border-[#2BA8A2]/20 pb-3">
              <div className="flex items-center gap-2">
                <UserIcon size={20} className="text-[#1E8C86]" />
                <h3 className="text-base font-black text-[#1E8C86]">Profilo e Accesso</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-[#E8F6F5] border border-[#2BA8A2]/30 hover:bg-[#2BA8A2]/20 active:scale-95 flex items-center justify-center text-[#1E8C86] transition-all"
              >
                <X size={17} />
              </button>
            </div>

            {user ? (
              <div className="flex flex-col gap-3 py-2">
                <div className="flex items-center gap-3 p-3 bg-[#E8F6F5] rounded-2xl border border-[#2BA8A2]/30">
                  <div className="w-12 h-12 rounded-full bg-[#2BA8A2] text-white border-2 border-[#FFD23F] font-black flex items-center justify-center text-lg shrink-0 shadow-xs">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block text-sm font-black text-slate-900 truncate">{user.name}</span>
                    <span className="block text-xs text-slate-500 truncate font-medium">{user.email}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-1">
                  {onOpenProfile && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveModal(null);
                        onOpenProfile();
                      }}
                      className="w-full py-3 rounded-full bg-[#FFD23F] hover:bg-[#FFE47A] active:scale-95 text-slate-900 font-black text-xs transition-all shadow-accent-glow"
                    >
                      Dettagli profilo e statistiche
                    </button>
                  )}
                  {onLogout && user.auth_provider === 'google' && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveModal(null);
                        onLogout();
                      }}
                      className="w-full py-2.5 rounded-full bg-white text-[#EF6C4A] border-2 border-[#EF6C4A]/30 font-black text-xs hover:bg-[#EF6C4A]/10 active:scale-95 transition-colors"
                    >
                      Disconnetti Google
                    </button>
                  )}
                  {onOpenLogin && user.auth_provider !== 'google' && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveModal(null);
                        onOpenLogin();
                      }}
                      className="w-full py-3 rounded-full bg-[#FFD23F] hover:bg-[#FFE47A] active:scale-95 text-slate-900 font-black text-xs transition-all shadow-accent-glow"
                    >
                      Accedi o Registrati
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-3 text-center">
                <p className="text-xs text-slate-500 mb-3 font-medium">Nessun account collegato.</p>
                {onOpenLogin && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveModal(null);
                      onOpenLogin();
                    }}
                    className="w-full py-3 rounded-full bg-[#FFD23F] hover:bg-[#FFE47A] active:scale-95 text-slate-900 font-black text-xs transition-all shadow-accent-glow"
                  >
                    Accedi
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
export default SettingsTab;
