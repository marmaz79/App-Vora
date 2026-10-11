import React, { useState, useEffect } from 'react';
import { TtsSettings } from '../types';
import { ttsService, VoiceOption } from '../services/ttsService';
import { Volume2, Play, Sliders, CheckCircle, ArrowLeft, Sparkles, Check, Square } from 'lucide-react';

interface SettingsTabProps {
  settings: TtsSettings;
  onUpdateSettings: (newSettings: TtsSettings) => void;
  onBack?: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ settings, onUpdateSettings, onBack }) => {
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
            className="w-11 h-11 rounded-xl border border-gray-200 hover:border-gray-300 bg-white flex items-center justify-center shrink-0 text-gray-700 hover:bg-gray-50 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black shadow-xs"
            title="Torna indietro"
          >
            <ArrowLeft size={22} className="text-gray-800" />
          </button>
        )}
        <div className="min-w-0">
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <Sliders size={24} className="text-red-600 shrink-0" aria-hidden="true" />
            Impostazioni Voce
          </h2>
          <p className="text-xs font-semibold text-gray-500">Scegli la tua voce AI preferita e personalizza la lettura</p>
        </div>
      </div>

      {/* Voice Selection Section */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col gap-3.5 shadow-sm">
        <div className="flex items-center justify-between">
          <label className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Volume2 size={20} className="text-red-600" aria-hidden="true" />
            Selezione Voce di Lettura
          </label>
          <span className="text-[11px] font-bold uppercase tracking-wider bg-red-50 border border-red-200 text-red-700 px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <Sparkles size={12} className="text-red-600" />
            {isCurrentVoiceAi ? 'Voce AI Attiva' : 'Voce Sistema'}
          </span>
        </div>

        {/* Tabs: Voci AI (Gemini) vs Voci di Sistema */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-xl border border-gray-200">
          <button
            type="button"
            onClick={() => setVoiceTab('ai')}
            className={`min-h-[44px] rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black ${
              voiceTab === 'ai'
                ? 'bg-white text-gray-900 border border-gray-200 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Sparkles size={16} className="text-red-600" />
            <span>Voci AI Naturali ({aiVoices.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setVoiceTab('system')}
            className={`min-h-[44px] rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black ${
              voiceTab === 'system'
                ? 'bg-white text-gray-900 border border-gray-200 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Volume2 size={16} className="text-gray-700" />
            <span>Voci di Sistema ({systemVoices.length})</span>
          </button>
        </div>

        {/* AI Voices Grid List */}
        {voiceTab === 'ai' && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-gray-600">
              Le voci AI offrono cadenza umana realistica, espressività e dizione fluida in italiano.
            </p>
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
                    className={`p-3 rounded-xl border flex flex-col justify-between gap-2.5 transition-all text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black ${
                      isSelected
                        ? 'border-red-600 bg-red-50/40 shadow-xs'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                          {isSelected ? (
                            <span className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center font-black text-xs shrink-0">
                              <Check size={13} className="stroke-[3]" />
                            </span>
                          ) : (
                            <span className="w-5 h-5 rounded-full border border-gray-300 shrink-0" />
                          )}
                          <span className="truncate">{v.name.split(' - ')[0]}</span>
                        </span>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-gray-100 border border-gray-200 text-gray-700 shrink-0">
                          {v.gender}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2 pl-6">
                        {v.description}
                      </p>
                    </div>

                    {/* Preview button per-voice */}
                    <button
                      type="button"
                      onClick={(e) => handleTestSpecificVoice(v, e)}
                      className={`min-h-[38px] px-3 rounded-lg border flex items-center justify-center gap-2 text-xs font-bold transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black ${
                        isPlayingThis
                          ? 'bg-red-600 text-white border-red-600 animate-pulse font-extrabold'
                          : 'bg-gray-50 text-gray-800 border-gray-200 hover:bg-gray-100'
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
            <p className="text-xs font-medium text-gray-600">
              Voci sintetiche di sistema (funzionano anche offline).
            </p>
            {systemVoices.length === 0 ? (
              <p className="text-xs font-medium text-gray-500 italic p-3 bg-gray-50 rounded-xl border border-gray-200">
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
                      className={`p-3 rounded-xl border flex items-center justify-between gap-2 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black ${
                        isSelected
                          ? 'border-red-600 bg-red-50/40 shadow-xs'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {isSelected ? (
                          <span className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center font-black text-xs shrink-0">
                            <Check size={13} className="stroke-[3]" />
                          </span>
                        ) : (
                          <span className="w-5 h-5 rounded-full border border-gray-300 shrink-0" />
                        )}
                        <span className="text-sm font-semibold text-gray-900 truncate">
                          {v.name}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleTestSpecificVoice(v, e)}
                        className="min-h-[36px] px-3 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-800 text-xs font-bold flex items-center gap-1.5 shrink-0"
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
      <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col gap-3 shadow-sm">
        <div className="flex items-center justify-between">
          <label htmlFor="rate-slider" className="text-base font-bold text-gray-900">
            Velocità di Lettura: <span className="text-red-600 font-extrabold">{settings.rate.toFixed(1)}x</span>
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
          className="w-full h-2.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-red-600"
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
                className={`min-h-[42px] rounded-xl text-xs font-bold border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black ${
                  isSelected
                    ? 'bg-gray-900 text-white border-gray-900 shadow-xs'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <span>{preset.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Pitch Control (for system synthesis) */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col gap-3 shadow-sm">
        <div className="flex items-center justify-between">
          <label htmlFor="pitch-slider" className="text-base font-bold text-gray-900">
            Tonalità (Pitch): <span className="text-red-600 font-extrabold">{settings.pitch.toFixed(1)}</span>
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
          className="w-full h-2.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-red-600"
        />
      </div>

      {/* Auto-advance Toggle */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-sm">
        <div>
          <h3 className="text-base font-bold text-gray-900">Avanzamento automatico</h3>
          <p className="text-xs font-medium text-gray-500">
            Passa automaticamente alla pagina successiva al termine della lettura
          </p>
        </div>
        <button
          role="switch"
          aria-checked={settings.autoAdvance}
          onClick={() => onUpdateSettings({ ...settings, autoAdvance: !settings.autoAdvance })}
          className={`w-14 h-8 rounded-full border border-gray-300 p-1 transition-colors relative shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black ${
            settings.autoAdvance ? 'bg-red-600 border-red-600' : 'bg-gray-200'
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

      {/* Accessibility details */}
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-gray-900">
          <CheckCircle size={18} className="text-red-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">Garanzia di Accessibilità Vora</h3>
        </div>
        <p className="text-xs font-medium text-gray-600 leading-relaxed">
          Vora unisce sintesi vocale neurale AI in italiano con standard di contrasto e leggibilità elevata, bersagli tattili ampi e navigazione fluida.
        </p>
      </div>
    </section>
  );
};
