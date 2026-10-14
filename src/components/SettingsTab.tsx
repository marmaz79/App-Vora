import React, { useState, useEffect } from 'react';
import { TtsSettings, User, ContrastThemeMode } from '../types';
import { ttsService, VoiceOption } from '../services/ttsService';
import {
  Volume2,
  Play,
  Sliders,
  CheckCircle,
  ArrowLeft,
  Sparkles,
  Check,
  Square,
  ShieldCheck,
  User as UserIcon,
  KeyRound,
  Palette,
  Eye,
  Type,
  SunMedium,
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
    id: 'black-yellow',
    title: 'Testo Giallo su Sfondo Nero',
    badge: 'Alto Contrasto & Ipovedenti',
    description: 'Sfondo nero puro (#000000) e testo giallo vivo ad altissima luminescenza. Riduce il riflesso ed è ideale per persone ipovedenti o lettura al buio.',
    swatchBg: 'bg-black',
    swatchText: 'text-[#FFE600]',
    swatchBorder: 'border-[#FFE600]',
    previewBg: 'bg-black',
    previewText: 'text-[#FFE600]',
    previewBorder: 'border-[#333333]',
    previewAccent: 'text-[#FFE600]',
  },
  {
    id: 'cream-black',
    title: 'Testo Nero su Sfondo Bianco Crema',
    badge: 'Comfort Visivo & E-Ink',
    description: 'Sfondo crema riposante e naturale con testo nero profondo. Elimina l\'affaticamento da luce blu e simula le pagine di carta pregiata.',
    swatchBg: 'bg-[#FAF7EE]',
    swatchText: 'text-[#111111]',
    swatchBorder: 'border-[#E5DEC9]',
    previewBg: 'bg-[#FAF7EE]',
    previewText: 'text-[#111111]',
    previewBorder: 'border-[#E5DEC9]',
    previewAccent: 'text-[#B45309]',
  },
  {
    id: 'dark',
    title: 'Modalità Notte (Bianco su Scuro)',
    badge: 'Dark Mode Standard',
    description: 'Sfondo antracite scuro con testo bianco nitido. Contrasto elegante per le ore serali e basso consumo energetico.',
    swatchBg: 'bg-[#121212]',
    swatchText: 'text-white',
    swatchBorder: 'border-[#333333]',
    previewBg: 'bg-[#121212]',
    previewText: 'text-white',
    previewBorder: 'border-[#262626]',
    previewAccent: 'text-red-400',
  },
  {
    id: 'white',
    title: 'Bianco Puro (Nero su Bianco)',
    badge: 'Classico Cartaceo',
    description: 'Massimo contrasto solare classico con sfondo bianco brillante e testo nero nitido per lettura in piena luce.',
    swatchBg: 'bg-white',
    swatchText: 'text-gray-900',
    swatchBorder: 'border-gray-300',
    previewBg: 'bg-white',
    previewText: 'text-gray-900',
    previewBorder: 'border-gray-200',
    previewAccent: 'text-red-600',
  },
  {
    id: 'sepia',
    title: 'Seppia Tradizionale (Bruno su Pergamena)',
    badge: 'Pergamena Calda',
    description: 'Calda pergamena ambrata con testo bruno seppia, rilassante per lunghe sessioni di lettura narrativa.',
    swatchBg: 'bg-[#FBF0D9]',
    swatchText: 'text-[#2C2416]',
    swatchBorder: 'border-[#DFCFAB]',
    previewBg: 'bg-[#FBF0D9]',
    previewText: 'text-[#2C2416]',
    previewBorder: 'border-[#DFCFAB]',
    previewAccent: 'text-amber-800',
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

  useEffect(() => {
    const list = ttsService.getItalianVoices();
    setAllVoices(list);
  }, []);

  const aiVoices = allVoices.filter((v) => v.isAi);
  const systemVoices = allVoices.filter((v) => !v.isAi);

  const isCurrentVoiceAi = ttsService.isAiVoice(settings.voiceUri);

  const currentContrast = settings.highContrastMode || 'dark';
  const activeThemeOption =
    CONTRAST_THEME_OPTIONS.find(
      (opt) =>
        opt.id === currentContrast ||
        (opt.id === 'white' && currentContrast === 'black-white')
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

  return (
    <section className="flex flex-col gap-3.5" aria-label="Impostazioni applicazione">
      {/* Top Header with Back Button */}
      <div className="flex items-center gap-3 pt-1">
        {onBack && (
          <button
            onClick={onBack}
            aria-label="Torna indietro"
            className="w-11 h-11 rounded-xl border border-[#262A38] bg-[#141622] flex items-center justify-center shrink-0 text-gray-200 hover:bg-[#1E2235] hover:border-gray-500 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white shadow-xs"
            title="Torna indietro"
          >
            <ArrowLeft size={22} className="text-gray-200" />
          </button>
        )}
        <div className="min-w-0">
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Sliders size={24} className="text-red-500 shrink-0" aria-hidden="true" />
            Impostazioni & Contrasto
          </h2>
        </div>
      </div>

      {/* Account Profile Card */}
      {user && (
        <div className="bg-[#12141C] border border-[#232736] rounded-2xl p-4 flex flex-col gap-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-red-600/20 text-red-400 border border-red-500/40 flex items-center justify-center font-bold text-sm shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <span className="block text-sm font-bold text-white truncate">
                  {user.name}
                </span>
                <span className="block text-xs text-gray-400 truncate">
                  {user.email}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] font-bold uppercase bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                Attivo
              </span>
            </div>
          </div>

          <div className="flex gap-2 pt-1 border-t border-[#1F2436]">
            {onOpenProfile && (
              <button
                type="button"
                onClick={onOpenProfile}
                className="flex-1 min-h-[38px] bg-[#181C2B] hover:bg-[#1E2338] text-gray-200 border border-[#2D344B] font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all"
              >
                <UserIcon size={14} />
                <span>Profilo</span>
              </button>
            )}
            {onLogout && user?.auth_provider === 'google' && (
              <button
                type="button"
                onClick={onLogout}
                className="flex-1 min-h-[38px] bg-red-950/40 hover:bg-red-900/60 text-red-200 border border-red-800/50 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all"
              >
                <span>Disconnetti Google</span>
              </button>
            )}
            {onOpenLogin && user?.auth_provider !== 'google' && (
              <button
                type="button"
                onClick={onOpenLogin}
                className="flex-1 min-h-[38px] bg-white hover:bg-gray-100 text-gray-900 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all"
              >
                <span>Accedi con Google</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tema di Contrasto ReaderView (Accessibilità e Comfort Visivo) */}
      <div className="bg-[#12141C] border border-[#232736] rounded-2xl p-4 sm:p-5 flex flex-col gap-4 shadow-sm">
        <div className="flex items-center justify-between">
          <label className="text-base font-bold text-white flex items-center gap-2">
            <Palette size={20} className="text-amber-400" aria-hidden="true" />
            Tema di Contrasto Lettore (ReaderView)
          </label>
          <span className="text-[11px] font-bold uppercase tracking-wider bg-amber-500/10 border border-amber-500/30 text-amber-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <Eye size={12} className="text-amber-400" />
            Accessibilità
          </span>
        </div>

        {/* Elenco Temi con Anteprima Visiva */}
        <div className="flex flex-col gap-2.5">
          {CONTRAST_THEME_OPTIONS.map((opt) => {
            const isSelected =
              settings.highContrastMode === opt.id ||
              (opt.id === 'white' && settings.highContrastMode === 'black-white');

            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onUpdateSettings({ ...settings, highContrastMode: opt.id })}
                className={`w-full p-3.5 rounded-xl border text-left transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isSelected
                    ? 'border-amber-400 bg-[#191D2C] ring-2 ring-amber-400/30 shadow-md'
                    : 'border-[#232736] bg-[#0E1017] hover:border-gray-500 hover:bg-[#141722]'
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  {/* Swatch quadrato ad alto impatto */}
                  <div
                    className={`w-12 h-12 rounded-xl border flex flex-col items-center justify-center shrink-0 shadow-inner font-black text-sm tracking-tight ${opt.swatchBg} ${opt.swatchText} ${opt.swatchBorder}`}
                  >
                    <span>Aa</span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-gray-200'}`}>
                        {opt.title}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                          opt.id === 'black-yellow'
                            ? 'bg-yellow-950/60 text-yellow-300 border-yellow-500/40'
                            : opt.id === 'cream-black'
                            ? 'bg-amber-950/40 text-amber-200 border-amber-600/40'
                            : 'bg-[#1F2436] text-gray-300 border-[#2E364E]'
                        }`}
                      >
                        {opt.badge}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end shrink-0 sm:self-center">
                  {isSelected ? (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-400/10 border border-amber-400/40 px-3 py-1.5 rounded-lg shadow-xs">
                      <Check size={14} className="text-amber-400" />
                      <span>Attivo</span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 hover:text-white font-semibold px-2 py-1">
                      Attiva
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Anteprima Live del Contrasto ReaderView */}
        <div className="mt-1 pt-3.5 border-t border-[#1F2436] flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <SunMedium size={13} className="text-amber-400" />
              Anteprima ReaderView in Tempo Reale
            </span>
            <span className="text-[11px] font-bold text-amber-300 truncate max-w-[180px]">
              {activeThemeOption.badge}
            </span>
          </div>

          <div
            className={`p-4 rounded-xl border transition-colors duration-200 shadow-sm ${activeThemeOption.previewBg} ${activeThemeOption.previewText} ${activeThemeOption.previewBorder}`}
          >
            <div
              className="flex items-center justify-between border-b pb-2 mb-2.5 opacity-80 text-xs font-bold"
              style={{ borderColor: 'currentColor' }}
            >
              <span className="truncate">Capitolo 1 — L'eco della lettura</span>
              <span className="shrink-0 text-[10px] uppercase font-mono">Pagina 1 di 12</span>
            </div>
            <p
              className={`font-serif leading-relaxed ${
                settings.fontSize === 'huge'
                  ? 'text-lg font-bold'
                  : settings.fontSize === 'large'
                  ? 'text-base font-semibold'
                  : 'text-sm'
              }`}
            >
              "La pagina si adatta alla vista con nitidezza assoluta. I contrasti studiati permettono agli occhi di riposare e assorbire ogni singola riga senza riverberi né fatica visiva."
            </p>
          </div>

          {/* Quick Font Size Toggle in Settings */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
              <Type size={14} className="text-amber-400" />
              Dimensione testo nel Reader:
            </span>
            <div className="flex items-center gap-1.5">
              {[
                { id: 'normal' as const, label: 'Normale (A)' },
                { id: 'large' as const, label: 'Grande (A+)' },
                { id: 'huge' as const, label: 'Max (A++)' },
              ].map((fs) => (
                <button
                  key={fs.id}
                  type="button"
                  onClick={() => onUpdateSettings({ ...settings, fontSize: fs.id })}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                    settings.fontSize === fs.id
                      ? 'bg-white text-black border-white shadow-xs font-black'
                      : 'bg-[#161824] text-gray-300 border-[#262A38] hover:border-gray-500'
                  }`}
                >
                  {fs.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Voice Selection Section */}
      <div className="bg-[#12141C] border border-[#232736] rounded-2xl p-4 flex flex-col gap-3.5 shadow-sm">
        <div className="flex items-center justify-between">
          <label className="text-base font-bold text-white flex items-center gap-2">
            <Volume2 size={20} className="text-red-500" aria-hidden="true" />
            Selezione Voce di Lettura
          </label>
          <span className="text-[11px] font-bold uppercase tracking-wider bg-[#260E12] border border-red-900/60 text-red-400 px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <Sparkles size={12} className="text-red-500" />
            {isCurrentVoiceAi ? 'Voce AI Attiva' : 'Voce Sistema'}
          </span>
        </div>

        {/* Tabs: Voci AI (Gemini) vs Voci di Sistema */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-[#0A0B10] rounded-xl border border-[#232736]">
          <button
            type="button"
            onClick={() => setVoiceTab('ai')}
            className={`min-h-[44px] rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
              voiceTab === 'ai'
                ? 'bg-[#1C2030] text-white border border-[#37405A] shadow-xs'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Sparkles size={16} className="text-red-500" />
            <span>Voci AI Naturali ({aiVoices.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setVoiceTab('system')}
            className={`min-h-[44px] rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
              voiceTab === 'system'
                ? 'bg-[#1C2030] text-white border border-[#37405A] shadow-xs'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Volume2 size={16} className="text-gray-300" />
            <span>Voci di Sistema ({systemVoices.length})</span>
          </button>
        </div>

        {/* AI Voices Grid List */}
        {voiceTab === 'ai' && (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {aiVoices.map((v) => {
                const isSelected = settings.voiceUri === v.uri;
                const isPlayingThis = previewingUri === v.uri;

                return (
                  <div
                    key={v.uri}
                    onClick={() => handleSelectVoice(v)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        handleSelectVoice(v);
                      }
                    }}
                    className={`p-3 rounded-xl border flex flex-col justify-between gap-2.5 transition-all text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                      isSelected
                        ? 'border-red-500 bg-[#250E12] shadow-xs'
                        : 'border-[#232736] bg-[#161824] hover:border-gray-500'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-sm font-bold text-white flex items-center gap-1.5">
                          {isSelected ? (
                            <span className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center font-black text-xs shrink-0">
                              <Check size={13} className="stroke-[3]" />
                            </span>
                          ) : (
                            <span className="w-5 h-5 rounded-full border border-gray-600 shrink-0" />
                          )}
                          <span className="truncate">{v.name.split(' - ')[0]}</span>
                        </span>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#202434] border border-[#2E354B] text-gray-300 shrink-0">
                          {v.gender}
                        </span>
                      </div>
                    </div>

                    {/* Preview button per-voice */}
                    <button
                      type="button"
                      onClick={(e) => handleTestSpecificVoice(v, e)}
                      className={`min-h-[38px] px-3 rounded-lg border flex items-center justify-center gap-2 text-xs font-bold transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                        isPlayingThis
                          ? 'bg-red-600 text-white border-red-600 animate-pulse font-extrabold'
                          : 'bg-[#1C2030] text-gray-200 border-[#2E354B] hover:bg-[#252B40]'
                      }`}
                      aria-label={`Ascolta anteprima della voce ${v.name}`}
                    >
                      {isPlayingThis ? (
                        <>
                          <Square size={14} className="fill-current" />
                          <span>Ferma prova</span>
                        </>
                      ) : (
                        <>
                          <Play size={14} className="fill-current" />
                          <span>Ascolta voce</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* System Voices Selection */}
        {voiceTab === 'system' && (
          <div className="flex flex-col gap-3">
            {systemVoices.length === 0 ? (
              <p className="text-xs font-medium text-gray-400 italic p-3 bg-[#161824] rounded-xl border border-[#232736]">
                Nessuna voce italiana di sistema trovata nel browser. Ti consigliamo di utilizzare le Voci AI.
              </p>
            ) : (
              <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
                {systemVoices.map((v, idx) => {
                  const isSelected = settings.voiceUri === v.uri || (!settings.voiceUri && idx === 0);
                  const isPlayingThis = previewingUri === v.uri;

                  return (
                    <div
                      key={v.uri}
                      onClick={() => handleSelectVoice(v)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          handleSelectVoice(v);
                        }
                      }}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-2 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                        isSelected
                          ? 'border-red-500 bg-[#250E12] shadow-xs'
                          : 'border-[#232736] bg-[#161824] hover:border-gray-500'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {isSelected ? (
                          <span className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center font-black text-xs shrink-0">
                            <Check size={13} className="stroke-[3]" />
                          </span>
                        ) : (
                          <span className="w-5 h-5 rounded-full border border-gray-600 shrink-0" />
                        )}
                        <span className="text-sm font-semibold text-white truncate">
                          {v.name}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleTestSpecificVoice(v, e)}
                        className="min-h-[36px] px-3 rounded-lg border border-[#2E354B] bg-[#1C2030] hover:bg-[#252B40] text-gray-200 text-xs font-bold flex items-center gap-1.5 shrink-0"
                      >
                        {isPlayingThis ? <Square size={13} /> : <Play size={13} />}
                        <span>{isPlayingThis ? 'Ferma' : 'Prova'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Speed Rate Control */}
      <div className="bg-[#12141C] border border-[#232736] rounded-2xl p-4 flex flex-col gap-3 shadow-sm">
        <div className="flex items-center justify-between">
          <label htmlFor="rate-slider" className="text-base font-bold text-white">
            Velocità di Lettura: <span className="text-red-500 font-extrabold">{settings.rate.toFixed(1)}x</span>
          </label>
        </div>

        <input
          id="rate-slider"
          type="range"
          min="0.6"
          max="2.0"
          step="0.1"
          value={settings.rate}
          onChange={(e) => onUpdateSettings({ ...settings, rate: parseFloat(e.target.value) })}
          className="w-full h-2.5 bg-[#262A38] rounded-lg appearance-none cursor-pointer accent-red-600"
          aria-valuemin={0.6}
          aria-valuemax={2.0}
          aria-valuenow={settings.rate}
          aria-valuetext={`${settings.rate.toFixed(1)} per`}
        />

        {/* Presets */}
        <div className="grid grid-cols-4 gap-2 pt-0.5">
          {[
            { label: 'Lenta', value: 0.8 },
            { label: 'Normale', value: 1.0 },
            { label: 'Veloce', value: 1.3 },
            { label: 'Rapida', value: 1.6 },
          ].map((preset) => {
            const isSelected = Math.abs(settings.rate - preset.value) < 0.05;
            return (
              <button
                key={preset.label}
                onClick={() => handleRatePreset(preset.value)}
                className={`min-h-[42px] rounded-xl text-xs font-bold border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                  isSelected
                    ? 'bg-white text-black border-white shadow-xs font-black'
                    : 'bg-[#161824] text-gray-300 border-[#262A38] hover:border-gray-500 hover:bg-[#1E2235]'
                }`}
              >
                <span>{preset.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Pitch Control (for system synthesis) */}
      <div className="bg-[#12141C] border border-[#232736] rounded-2xl p-4 flex flex-col gap-3 shadow-sm">
        <div className="flex items-center justify-between">
          <label htmlFor="pitch-slider" className="text-base font-bold text-white">
            Tonalità (Pitch): <span className="text-red-500 font-extrabold">{settings.pitch.toFixed(1)}</span>
          </label>
        </div>

        <input
          id="pitch-slider"
          type="range"
          min="0.5"
          max="1.5"
          step="0.1"
          value={settings.pitch}
          onChange={(e) => onUpdateSettings({ ...settings, pitch: parseFloat(e.target.value) })}
          className="w-full h-2.5 bg-[#262A38] rounded-lg appearance-none cursor-pointer accent-red-600"
        />
      </div>

      {/* Auto-advance Toggle */}
      <div className="bg-[#12141C] border border-[#232736] rounded-2xl p-4 flex items-center justify-between gap-4 shadow-sm">
        <div>
          <h3 className="text-base font-bold text-white">Avanzamento automatico</h3>
        </div>
        <button
          role="switch"
          aria-checked={settings.autoAdvance}
          onClick={() => onUpdateSettings({ ...settings, autoAdvance: !settings.autoAdvance })}
          className={`w-14 h-8 rounded-full border p-1 transition-colors relative shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
            settings.autoAdvance ? 'bg-red-600 border-red-600' : 'bg-[#262A38] border-[#363C50]'
          }`}
          aria-label="Attiva o disattiva l'avanzamento automatico della pagina"
        >
          <div
            className={`w-6 h-6 rounded-full transition-transform bg-white shadow-xs ${
              settings.autoAdvance
                ? 'translate-x-6'
                : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    </section>
  );
};
