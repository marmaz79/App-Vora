import { TtsSettings } from '../types';

export interface VoiceOption {
  uri: string;
  name: string;
  lang: string;
  isDefault?: boolean;
}

type UtteranceCallback = (event: 'start' | 'end' | 'error' | 'pause' | 'resume', err?: any) => void;

class TtsService {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isSpeaking: boolean = false;
  private voices: SpeechSynthesisVoice[] = [];
  private callbacks: Set<UtteranceCallback> = new Set();

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.loadVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  private loadVoices() {
    if (!this.synth) return;
    this.voices = this.synth.getVoices();
  }

  public getItalianVoices(): VoiceOption[] {
    if (!this.synth) return [];
    if (this.voices.length === 0) {
      this.voices = this.synth.getVoices();
    }
    // Filter for Italian voices first, then fallbacks
    const itVoices = this.voices.filter(v => v.lang.toLowerCase().startsWith('it'));
    if (itVoices.length > 0) {
      return itVoices.map(v => ({
        uri: v.voiceURI,
        name: v.name,
        lang: v.lang,
        isDefault: v.default,
      }));
    }
    // Fallback: list all system voices
    return this.voices.map(v => ({
      uri: v.voiceURI,
      name: `${v.name} (${v.lang})`,
      lang: v.lang,
      isDefault: v.default,
    }));
  }

  public speak(text: string, settings: TtsSettings, onEvent?: UtteranceCallback) {
    if (!this.synth) {
      onEvent?.('error', new Error('Sintesi vocale non supportata in questo browser.'));
      return;
    }

    this.stop();

    if (!text.trim()) {
      onEvent?.('end');
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    this.currentUtterance = utterance;

    // Set voice if configured
    if (settings.voiceUri) {
      const selected = this.voices.find(v => v.voiceURI === settings.voiceUri);
      if (selected) {
        utterance.voice = selected;
      }
    } else {
      // Default to first Italian voice found
      const defaultIt = this.voices.find(v => v.lang.toLowerCase().startsWith('it'));
      if (defaultIt) {
        utterance.voice = defaultIt;
      }
    }

    utterance.lang = 'it-IT';
    utterance.rate = settings.rate;
    utterance.pitch = settings.pitch;
    utterance.volume = settings.volume;

    utterance.onstart = () => {
      this.isSpeaking = true;
      onEvent?.('start');
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.currentUtterance = null;
      onEvent?.('end');
    };

    utterance.onerror = (e) => {
      this.isSpeaking = false;
      this.currentUtterance = null;
      onEvent?.('error', e);
    };

    utterance.onpause = () => {
      onEvent?.('pause');
    };

    utterance.onresume = () => {
      onEvent?.('resume');
    };

    this.synth.speak(utterance);
  }

  public pause() {
    if (this.synth && this.isSpeaking) {
      this.synth.pause();
    }
  }

  public resume() {
    if (this.synth) {
      this.synth.resume();
    }
  }

  public stop() {
    if (this.synth) {
      this.synth.cancel();
      this.isSpeaking = false;
      this.currentUtterance = null;
    }
  }

  public getSpeakingState(): boolean {
    return this.synth ? this.synth.speaking && !this.synth.paused : false;
  }

  public previewVoice(settings: TtsSettings, sampleText?: string) {
    const text = sampleText || 'Ciao! Questa è la voce con cui leggerò i tuoi libri in Leggimi Vora.';
    this.speak(text, settings);
  }
}

export const ttsService = new TtsService();
