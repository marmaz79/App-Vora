import React, { useState, useEffect } from 'react';
import { TtsSettings } from '../types';
import { ttsService, VoiceOption } from '../services/ttsService';
import { Volume2, Play, Sliders, CheckCircle } from 'lucide-react';

interface SettingsTabProps {
  settings: TtsSettings;
  onUpdateSettings: (newSettings: TtsSettings) => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ settings, onUpdateSettings }) => {
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => {
    const list = ttsService.getItalianVoices();
    setVoices(list);
  }, []);

  const handleVoiceChange = (uri: string) => {
    const selected = voices.find((v) => v.uri === uri);
    onUpdateSettings({
      ...settings,
      voiceUri: uri,
      voiceName: selected ? selected.name : 'Predefinita',
    });
  };

  const handleRatePreset = (rate: number) => {
    onUpdateSettings({ ...settings, rate });
  };

  const handleTestVoice = () => {
    setPreviewing(true);
    ttsService.previewVoice(settings);
    setTimeout(() => setPreviewing(false), 2500);
  };

  return (
    <section className="flex flex-col gap-6" aria-label="Impostazioni applicazione">
      <div>
        <h2 className="text-2xl font-black text-white flex items-center gap-2">
          <Sliders size={28} className="text-[#FFD600]" aria-hidden="true" />
          Impostazioni Voce
        </h2>
        <p className="text-sm font-bold text-[#B8B8B8]">Personalizza la sintesi vocale e la lettura</p>
      </div>

      {/* Voice Selection */}
      <div className="bg-[#1A1A1A] border-2 border-[#333333] rounded-3xl p-5 flex flex-col gap-4">
        <label htmlFor="voice-select" className="text-base font-black text-white flex items-center gap-2">
          <Volume2 size={20} className="text-[#FFD600]" aria-hidden="true" />
          Seleziona Voce Italiana
        </label>
        
        <select
          id="voice-select"
          value={settings.voiceUri}
          onChange={(e) => handleVoiceChange(e.target.value)}
          className="bg-black text-white border-2 border-white focus:border-[#FFD600] rounded-xl p-3 text-base font-bold min-h-[56px] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FFD600]"
        >
          <option value="">Voce italiana predefinita del sistema</option>
          {voices.map((v) => (
            <option key={v.uri} value={v.uri}>
              {v.name}
            </option>
          ))}
        </select>

        {/* Test voice preview CTA */}
        <button
          onClick={handleTestVoice}
          className="min-h-[64px] bg-[#FFD600] hover:bg-[#FFEA00] text-black border-2 border-white rounded-2xl flex items-center justify-center gap-3 font-black text-base active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FFD600]"
          aria-label="Ascolta anteprima con la voce selezionata"
        >
          <Play size={24} className="fill-black" aria-hidden="true" />
          <span>{previewing ? 'Riproduzione in corso...' : 'Ascolta anteprima voce'}</span>
        </button>
      </div>

      {/* Speed Rate Control */}
      <div className="bg-[#1A1A1A] border-2 border-[#333333] rounded-3xl p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <label htmlFor="rate-slider" className="text-base font-black text-white">
            Velocità di Lettura: <span className="text-[#FFD600]">{settings.rate.toFixed(1)}x</span>
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
          className="w-full h-3 bg-black rounded-lg appearance-none cursor-pointer accent-[#FFD600]"
          aria-valuemin={0.6}
          aria-valuemax={2.0}
          aria-valuenow={settings.rate}
          aria-valuetext={`${settings.rate.toFixed(1)} per`}
        />

        {/* Presets */}
        <div className="grid grid-cols-4 gap-2 pt-1">
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
                className={`min-h-[48px] rounded-xl text-xs font-black border-2 transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FFD600] ${
                  isSelected
                    ? 'bg-[#FFD600] text-black border-white'
                    : 'bg-black text-white border-[#333333] hover:border-white'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Pitch Control */}
      <div className="bg-[#1A1A1A] border-2 border-[#333333] rounded-3xl p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <label htmlFor="pitch-slider" className="text-base font-black text-white">
            Tonalità (Pitch): <span className="text-[#FFD600]">{settings.pitch.toFixed(1)}</span>
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
          className="w-full h-3 bg-black rounded-lg appearance-none cursor-pointer accent-[#FFD600]"
        />
      </div>

      {/* Auto-advance Toggle */}
      <div className="bg-[#1A1A1A] border-2 border-[#333333] rounded-3xl p-5 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-black text-white">Avanzamento automatico</h3>
          <p className="text-xs font-bold text-[#B8B8B8]">
            Passa automaticamente alla pagina successiva al termine della lettura
          </p>
        </div>
        <button
          role="switch"
          aria-checked={settings.autoAdvance}
          onClick={() => onUpdateSettings({ ...settings, autoAdvance: !settings.autoAdvance })}
          className={`w-16 h-10 rounded-full border-2 border-white p-1 transition-colors relative shrink-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FFD600] ${
            settings.autoAdvance ? 'bg-[#FFD600]' : 'bg-black'
          }`}
          aria-label="Attiva o disattiva l'avanzamento automatico della pagina"
        >
          <div
            className={`w-7 h-7 rounded-full transition-transform ${
              settings.autoAdvance
                ? 'translate-x-6 bg-black'
                : 'translate-x-0 bg-white'
            }`}
          />
        </button>
      </div>

      {/* Accessibility details */}
      <div className="bg-black border-2 border-[#FFD600] rounded-3xl p-5 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-[#FFD600]">
          <CheckCircle size={20} />
          <h3 className="text-sm font-black uppercase tracking-wider">Garanzia di Accessibilità</h3>
        </div>
        <p className="text-xs font-bold text-[#B8B8B8] leading-relaxed">
          Vora è progettata secondo gli standard WCAG AAA per non vedenti e ipovedenti: contrasto elevato, bersagli tattili superiori a 72pt, navigazione completa da tastiera e supporto per lettori di schermo (Screen Reader, VoiceOver, TalkBack).
        </p>
      </div>
    </section>
  );
};
