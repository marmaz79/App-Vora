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
    <section className="flex flex-col bg-black text-white select-none pb-32 animate-fade-in font-sans" aria-label="Impostazioni applicazione">
      {/* 1. TOP HEADER (Stile minimale bianco su sfondo nero) */}
      <div className="pt-2 pb-3 px-1 sm:px-2 flex items-center gap-3 border-b border-zinc-900 mb-2">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Torna indietro"
            className="w-10 h-10 rounded-full border border-white/20 bg-black hover:bg-zinc-900 active:scale-95 flex items-center justify-center text-white transition-all shrink-0"
            title="Torna indietro"
          >
            <ArrowLeft size={19} className="stroke-[2.5]" />
          </button>
        )}
        <div className="min-w-0">
          <span className="block text-[11px] font-medium text-zinc-400 tracking-wider uppercase">
            Lettura & Sintesi Vocale
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Impostazioni
          </h1>
        </div>
      </div>

      {/* 2. LISTA IMPOSTAZIONI (Stile righe piatte con divisore sottile bianco/nero) */}
      <div className="flex flex-col divide-y divide-zinc-900">
        {/* ROW 1: TEMA DI CONTRASTO (Alto Contrasto & Ipovedenti) */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setActiveModal('contrast')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setActiveModal('contrast');
          }}
          className="py-4 px-1 sm:px-2 flex items-center justify-between gap-4 cursor-pointer hover:bg-zinc-950 active:bg-zinc-900 transition-colors group"
        >
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-white tracking-tight mb-1 group-hover:underline transition-all">
              Tema di contrasto e visualizzazione
            </h2>
            <p className="text-xs sm:text-[13px] text-zinc-400 font-normal leading-relaxed mb-2.5 max-w-xl">
              Configura il tema monocromatico per il massimo comfort visivo ed eliminazione dei riflessi.
            </p>
            {/* Badge in basso a sinistra */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-700 text-xs font-bold text-white">
              <span className={`w-2.5 h-2.5 rounded-full ${activeThemeOption.swatchBg} border border-white`} />
              <span>{activeThemeOption.title}</span>
            </div>
          </div>
          <ChevronRight size={20} className="text-zinc-500 group-hover:text-white transition-colors shrink-0" />
        </div>

        {/* ROW 2: VOCE DI LETTURA (TTS AI & Sistema) */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setActiveModal('voice')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setActiveModal('voice');
          }}
          className="py-4 px-1 sm:px-2 flex items-center justify-between gap-4 cursor-pointer hover:bg-zinc-950 active:bg-zinc-900 transition-colors group"
        >
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-white tracking-tight mb-1 group-hover:underline transition-all">
              Voce di lettura (Sintesi Vocale)
            </h2>
            <p className="text-xs sm:text-[13px] text-zinc-400 font-normal leading-relaxed mb-2.5 max-w-xl">
              Seleziona la voce italiana per la narrazione. Include voci AI Gemini e voci di sistema del dispositivo.
            </p>
            {/* Badge in basso a sinistra */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-700 text-xs font-bold text-white">
              {isCurrentVoiceAi ? (
                <>
                  <Sparkles size={13} className="text-white" />
                  <span>Voce AI: {settings.voiceName || 'Chiara (Naturale)'}</span>
                </>
              ) : (
                <>
                  <Volume2 size={13} className="text-white" />
                  <span>{settings.voiceName || 'Voce di Sistema'}</span>
                </>
              )}
            </div>
          </div>
          <ChevronRight size={20} className="text-zinc-500 group-hover:text-white transition-colors shrink-0" />
        </div>

        {/* ROW 3: VELOCITÀ DI RIPRODUZIONE */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setActiveModal('speed')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setActiveModal('speed');
          }}
          className="py-4 px-1 sm:px-2 flex items-center justify-between gap-4 cursor-pointer hover:bg-zinc-950 active:bg-zinc-900 transition-colors group"
        >
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-white tracking-tight mb-1 group-hover:underline transition-all">
              Velocità di riproduzione
            </h2>
            <p className="text-xs sm:text-[13px] text-zinc-400 font-normal leading-relaxed mb-2.5 max-w-xl">
              Modifica la cadenza e il ritmo di lettura per adattarla al tuo ritmo di comprensione o ascolto rapido.
            </p>
            {/* Badge in basso a sinistra */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-700 text-xs font-bold text-white">
              <Gauge size={13} className="text-white" />
              <span>{settings.rate.toFixed(1)}x {settings.rate === 1.0 ? '(Normale)' : settings.rate < 1.0 ? '(Lenta)' : '(Veloce)'}</span>
            </div>
          </div>
          <ChevronRight size={20} className="text-zinc-500 group-hover:text-white transition-colors shrink-0" />
        </div>

        {/* ROW 4: DIMENSIONE CARATTERI NEL LETTORE */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setActiveModal('fontSize')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setActiveModal('fontSize');
          }}
          className="py-4 px-1 sm:px-2 flex items-center justify-between gap-4 cursor-pointer hover:bg-zinc-950 active:bg-zinc-900 transition-colors group"
        >
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-white tracking-tight mb-1 group-hover:underline transition-all">
              Dimensione testo nel lettore
            </h2>
            <p className="text-xs sm:text-[13px] text-zinc-400 font-normal leading-relaxed mb-2.5 max-w-xl">
              Regola l'ingrandimento dei caratteri nella vista documento per agevolare la lettura visiva.
            </p>
            {/* Badge in basso a sinistra */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-700 text-xs font-bold text-white">
              <Type size={13} className="text-white" />
              <span>{getFontSizeLabel()}</span>
            </div>
          </div>
          <ChevronRight size={20} className="text-zinc-500 group-hover:text-white transition-colors shrink-0" />
        </div>

        {/* ROW 5: AVANZAMENTO AUTOMATICO (Switch Toggle) */}
        <div className="py-4 px-1 sm:px-2 flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-white tracking-tight mb-1">
              Avanzamento automatico pagina
            </h2>
            <p className="text-xs sm:text-[13px] text-zinc-400 font-normal leading-relaxed mb-2.5 max-w-xl">
              Passa automaticamente alla pagina successiva del libro quando la voce raggiunge la fine del testo.
            </p>
            {/* Badge Off / On monocromatico */}
            {settings.autoAdvance ? (
              <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-white text-black text-[11px] font-black">
                Attivo
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-400 text-[11px] font-bold">
                Disattivato
              </span>
            )}
          </div>

          {/* Toggle Switch Bianco su Nero */}
          <button
            type="button"
            role="switch"
            aria-checked={settings.autoAdvance}
            onClick={() => onUpdateSettings({ ...settings, autoAdvance: !settings.autoAdvance })}
            className={`w-13 h-7 rounded-full p-0.5 transition-colors relative shrink-0 focus-visible:outline-none cursor-pointer border ${
              settings.autoAdvance ? 'bg-white border-white' : 'bg-zinc-900 border-zinc-700'
            }`}
            aria-label="Attiva o disattiva l'avanzamento automatico della pagina"
          >
            <div
              className={`w-5.5 h-5.5 rounded-full transition-transform shadow-md ${
                settings.autoAdvance
                  ? 'translate-x-6 bg-black'
                  : 'translate-x-0.5 bg-zinc-400'
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
          className="py-4 px-1 sm:px-2 flex items-center justify-between gap-4 cursor-pointer hover:bg-zinc-950 active:bg-zinc-900 transition-colors group"
        >
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-white tracking-tight mb-1 group-hover:underline transition-all">
              Tonalità della voce (Pitch)
            </h2>
            <p className="text-xs sm:text-[13px] text-zinc-400 font-normal leading-relaxed mb-2.5 max-w-xl">
              Regola l'altezza tonale (grave o acuta) per le voci del sintetizzatore vocale.
            </p>
            {/* Badge in basso a sinistra */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-700 text-xs font-bold text-white">
              <Music size={13} className="text-white" />
              <span>{settings.pitch.toFixed(1)} {settings.pitch === 1.0 ? '(Standard)' : settings.pitch > 1.0 ? '(Acuta)' : '(Grave)'}</span>
            </div>
          </div>
          <ChevronRight size={20} className="text-zinc-500 group-hover:text-white transition-colors shrink-0" />
        </div>

        {/* ROW 7: ACCOUNT & SICUREZZA */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setActiveModal('account')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setActiveModal('account');
          }}
          className="py-4 px-1 sm:px-2 flex items-center justify-between gap-4 cursor-pointer hover:bg-zinc-950 active:bg-zinc-900 transition-colors group"
        >
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-white tracking-tight mb-1 group-hover:underline transition-all">
              Account e sincronizzazione
            </h2>
            <p className="text-xs sm:text-[13px] text-zinc-400 font-normal leading-relaxed mb-2.5 max-w-xl">
              {user?.email
                ? `Connesso come ${user.name} (${user.email}). I tuoi libri e progressi sono salvati.`
                : 'Accedi con Google per sincronizzare la libreria e proteggere i tuoi documenti scansionati.'}
            </p>
            {/* Badge in basso a sinistra */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-700 text-xs font-bold text-white">
              <UserIcon size={13} className="text-white" />
              <span>{user?.auth_provider === 'google' ? 'Google Account Attivo' : 'Ospite Locale'}</span>
            </div>
          </div>
          <ChevronRight size={20} className="text-zinc-500 group-hover:text-white transition-colors shrink-0" />
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. MODALI DI SELEZIONE DETTAGLIATA (Stile Bianco su Nero)       */}
      {/* ============================================================== */}

      {/* MODALE 1: TEMA DI CONTRASTO */}
      {activeModal === 'contrast' && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="w-full max-w-xl bg-black border border-zinc-800 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Palette size={20} className="text-white" />
                <h3 className="text-base font-bold text-white">Scegli tema di contrasto</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 flex items-center justify-center text-white transition-colors"
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
                    className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'border-white bg-zinc-900 ring-2 ring-white/50'
                        : 'border-zinc-850 bg-black hover:bg-zinc-950'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`w-11 h-11 rounded-xl border flex items-center justify-center font-black text-sm shrink-0 shadow-inner ${opt.swatchBg} ${opt.swatchText} ${opt.swatchBorder}`}
                      >
                        Aa
                      </div>
                      <div className="min-w-0">
                        <span className="block text-sm font-bold text-white truncate">
                          {opt.title}
                        </span>
                        <span className="block text-xs text-zinc-400 truncate">
                          {opt.badge}
                        </span>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-white text-black flex items-center justify-center shrink-0">
                        <Check size={14} className="stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Anteprima Live */}
            <div className="pt-2 border-t border-zinc-800">
              <span className="text-xs font-bold text-zinc-400 block mb-2 uppercase tracking-wider">
                Anteprima stile selezionato:
              </span>
              <div
                className={`p-3.5 rounded-xl border text-sm font-serif leading-relaxed ${activeThemeOption.previewBg} ${activeThemeOption.previewText} ${activeThemeOption.previewBorder}`}
              >
                "La lettura ad alto contrasto bianco su nero garantisce la massima nitidezza visiva, riduce l'affaticamento e rende il testo impeccabile."
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODALE 2: VOCE DI LETTURA */}
      {activeModal === 'voice' && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="w-full max-w-xl bg-black border border-zinc-800 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Volume2 size={20} className="text-white" />
                <h3 className="text-base font-bold text-white">Scegli voce di lettura</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  ttsService.stop();
                  setPreviewingUri(null);
                  setActiveModal(null);
                }}
                className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 flex items-center justify-center text-white transition-colors"
              >
                <X size={17} />
              </button>
            </div>

            {/* Tabs AI vs Sistema */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-950 rounded-xl border border-zinc-850">
              <button
                type="button"
                onClick={() => setVoiceTab('ai')}
                className={`py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                  voiceTab === 'ai'
                    ? 'bg-white text-black font-black'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Sparkles size={14} className={voiceTab === 'ai' ? 'text-black' : 'text-zinc-400'} />
                <span>Voci AI Naturali ({aiVoices.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setVoiceTab('system')}
                className={`py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                  voiceTab === 'system'
                    ? 'bg-white text-black font-black'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Volume2 size={14} className={voiceTab === 'system' ? 'text-black' : 'text-zinc-400'} />
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
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-white bg-zinc-900'
                        : 'border-zinc-850 bg-black hover:bg-zinc-950'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-white text-black' : 'border border-zinc-600'
                        }`}
                      >
                        {isSelected && <Check size={12} className="stroke-[3]" />}
                      </div>
                      <div className="min-w-0">
                        <span className="block text-sm font-bold text-white truncate">
                          {v.name.split(' - ')[0]}
                        </span>
                        <span className="block text-[11px] text-zinc-400 uppercase font-semibold">
                          {v.gender} {v.isAi ? '· AI Gemini' : ''}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleTestSpecificVoice(v, e)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all ${
                        isPlayingThis
                          ? 'bg-white text-black border-white animate-pulse'
                          : 'bg-zinc-900 text-white border-zinc-700 hover:bg-zinc-800'
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
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="w-full max-w-md bg-black border border-zinc-800 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 flex flex-col gap-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Gauge size={20} className="text-white" />
                <h3 className="text-base font-bold text-white">Velocità di riproduzione</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 flex items-center justify-center text-white transition-colors"
              >
                <X size={17} />
              </button>
            </div>

            <div className="text-center py-2">
              <span className="text-4xl font-black text-white">
                {settings.rate.toFixed(1)}x
              </span>
              <p className="text-xs text-zinc-400 mt-1">
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
              className="w-full h-2.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
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
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      isSelected
                        ? 'bg-white text-black border-white font-black shadow-md'
                        : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-500'
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
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="w-full max-w-md bg-black border border-zinc-800 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 flex flex-col gap-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Type size={20} className="text-white" />
                <h3 className="text-base font-bold text-white">Dimensione del testo</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 flex items-center justify-center text-white transition-colors"
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
                    className={`p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-white text-black border-white shadow-md'
                        : 'bg-zinc-900 text-white border-zinc-800 hover:border-zinc-600'
                    }`}
                  >
                    <div>
                      <span className="block text-sm font-bold">{fs.title}</span>
                      <span className={`block text-xs ${isSelected ? 'text-zinc-800' : 'text-zinc-400'}`}>
                        {fs.desc}
                      </span>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center shrink-0">
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
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="w-full max-w-md bg-black border border-zinc-800 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 flex flex-col gap-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Music size={20} className="text-white" />
                <h3 className="text-base font-bold text-white">Tonalità della voce (Pitch)</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 flex items-center justify-center text-white transition-colors"
              >
                <X size={17} />
              </button>
            </div>

            <div className="text-center py-2">
              <span className="text-3xl font-black text-white">
                {settings.pitch.toFixed(1)}
              </span>
              <p className="text-xs text-zinc-400 mt-1">
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
              className="w-full h-2.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
            />
          </div>
        </div>
      )}

      {/* MODALE 6: ACCOUNT & PROFILO */}
      {activeModal === 'account' && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="w-full max-w-md bg-black border border-zinc-800 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 flex flex-col gap-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <UserIcon size={20} className="text-white" />
                <h3 className="text-base font-bold text-white">Profilo e Accesso</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 flex items-center justify-center text-white transition-colors"
              >
                <X size={17} />
              </button>
            </div>

            {user ? (
              <div className="flex flex-col gap-3 py-2">
                <div className="flex items-center gap-3 p-3 bg-zinc-950 rounded-2xl border border-zinc-800">
                  <div className="w-12 h-12 rounded-full bg-white text-black font-extrabold flex items-center justify-center text-lg shrink-0">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-white truncate">{user.name}</span>
                    <span className="block text-xs text-zinc-400 truncate">{user.email}</span>
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
                      className="w-full py-2.5 rounded-xl bg-white text-black font-bold text-xs hover:bg-zinc-200 transition-colors"
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
                      className="w-full py-2.5 rounded-xl bg-zinc-900 text-white border border-zinc-700 font-bold text-xs hover:bg-zinc-800 transition-colors"
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
                      className="w-full py-2.5 rounded-xl bg-white text-black font-bold text-xs hover:bg-zinc-200 transition-colors"
                    >
                      Accedi con Google
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-3 text-center">
                <p className="text-xs text-zinc-400 mb-3">Nessun account collegato.</p>
                {onOpenLogin && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveModal(null);
                      onOpenLogin();
                    }}
                    className="w-full py-2.5 rounded-xl bg-white text-black font-bold text-xs hover:bg-zinc-200"
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
