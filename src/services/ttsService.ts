import { TtsSettings } from '../types';

export interface VoiceOption {
  uri: string;
  name: string;
  lang: string;
  isDefault?: boolean;
  isAi?: boolean;
  gender?: string;
  description?: string;
}

export const AI_VOICE_LIST: VoiceOption[] = [
  {
    uri: 'gemini:Kore',
    name: 'Kore (Voce AI - Femminile Chiara)',
    lang: 'it-IT',
    isDefault: false,
    isAi: true,
    gender: 'Femminile',
    description: 'Naturale, espressiva ed equilibrata per ogni genere letterario.',
  },
  {
    uri: 'gemini:Puck',
    name: 'Puck (Voce AI - Maschile Dinamica)',
    lang: 'it-IT',
    isAi: true,
    gender: 'Maschile',
    description: 'Brillante e moderna, ideale per dialoghi e narrativa contemporanea.',
  },
  {
    uri: 'gemini:Charon',
    name: 'Charon (Voce AI - Narratore Profondo)',
    lang: 'it-IT',
    isAi: true,
    gender: 'Maschile',
    description: 'Timbro solenne, profondo e autorevole per classici e saggi.',
  },
  {
    uri: 'gemini:Fenrir',
    name: 'Fenrir (Voce AI - Calda e Coinvolgente)',
    lang: 'it-IT',
    isAi: true,
    gender: 'Maschile',
    description: 'Timbro caldo con cadenza morbida ed emozionale.',
  },
  {
    uri: 'gemini:Zephyr',
    name: 'Zephyr (Voce AI - Dolce e Rilassante)',
    lang: 'it-IT',
    isAi: true,
    gender: 'Neutro/Dolce',
    description: 'Tono distensivo e delicato, perfetto prima di dormire.',
  },
  {
    uri: 'gemini:Aoede',
    name: 'Aoede (Voce AI - Armoniosa e Narrante)',
    lang: 'it-IT',
    isAi: true,
    gender: 'Femminile',
    description: 'Cadenza fluida e musicale per lunghe sessioni di lettura.',
  },
];

type UtteranceCallback = (event: 'start' | 'end' | 'error' | 'pause' | 'resume', err?: any) => void;

class TtsService {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private currentAudioUrl: string | null = null;
  private isSpeaking: boolean = false;
  private isPaused: boolean = false;
  private systemVoices: SpeechSynthesisVoice[] = [];
  private audioCache = new Map<string, string>();
  private abortController: AbortController | null = null;
  private sentenceQueue: string[] = [];
  private currentSentenceIdx: number = 0;
  private currentSettings: TtsSettings | null = null;
  private currentCallback?: UtteranceCallback;

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
    const v = this.synth.getVoices();
    if (v && v.length > 0) {
      this.systemVoices = v;
    }
  }

  public isAiVoice(voiceUri?: string): boolean {
    if (!voiceUri) return false;
    return voiceUri.startsWith('gemini:') || AI_VOICE_LIST.some((v) => v.uri === voiceUri);
  }

  public getAiVoices(): VoiceOption[] {
    return AI_VOICE_LIST;
  }

  public getSystemVoices(): VoiceOption[] {
    if (!this.synth) return [];
    if (this.systemVoices.length === 0) {
      this.loadVoices();
    }
    const itVoices = this.systemVoices.filter(
      (v) =>
        v.lang.toLowerCase().startsWith('it') ||
        v.lang.toLowerCase().includes('it') ||
        v.name.toLowerCase().includes('italian')
    );
    if (itVoices.length > 0) {
      return itVoices.map((v) => ({
        uri: v.voiceURI,
        name: `${v.name} (Dispositivo)`,
        lang: v.lang,
        isDefault: v.default,
        isAi: false,
      }));
    }
    return this.systemVoices.map((v) => ({
      uri: v.voiceURI,
      name: `${v.name} (${v.lang}) (Dispositivo)`,
      lang: v.lang,
      isDefault: v.default,
      isAi: false,
    }));
  }

  public getItalianVoices(): VoiceOption[] {
    const sys = this.getSystemVoices();
    return [...sys, ...AI_VOICE_LIST];
  }

  public async speak(text: string, settings: TtsSettings, onEvent?: UtteranceCallback) {
    this.stop();

    const cleanText = text.trim();
    if (!cleanText) {
      onEvent?.('end');
      return;
    }

    const isAi = this.isAiVoice(settings.voiceUri);

    if (isAi) {
      try {
        await this.speakAi(cleanText, settings, onEvent);
      } catch (err: any) {
        // If aborted or user stopped playback deliberately, do not trigger fallback
        if (err?.name === 'AbortError' || (!this.isSpeaking && !this.abortController)) {
          return;
        }
        console.warn('Gemini AI TTS non disponibile, passaggio alla sintesi vocale di sistema:', err);
        this.speakSystem(cleanText, settings, onEvent);
      }
    } else {
      this.speakSystem(cleanText, settings, onEvent);
    }
  }

  private async speakAi(text: string, settings: TtsSettings, onEvent?: UtteranceCallback) {
    const rawVoice = settings.voiceUri || 'gemini:Kore';
    const voiceName = rawVoice.replace(/^gemini:/, '') || 'Kore';

    const cacheKey = `${voiceName}:${text.slice(0, 500)}`;
    let audioUrl = this.audioCache.get(cacheKey);

    if (!audioUrl) {
      this.abortController = new AbortController();
      const res = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voiceName,
          rate: settings.rate,
        }),
        signal: this.abortController.signal,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Errore server TTS (${res.status})`);
      }

      const data = await res.json();
      if (!data.audio || data.fallback) {
        throw new Error(data.error || 'Traccia audio non ricevuta dal server');
      }

      const binaryStr = atob(data.audio);
      const byteArray = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        byteArray[i] = binaryStr.charCodeAt(i);
      }
      const blob = new Blob([byteArray], { type: 'audio/wav' });
      audioUrl = URL.createObjectURL(blob);
      this.audioCache.set(cacheKey, audioUrl);
    }

    const audio = new Audio(audioUrl);
    this.currentAudio = audio;
    this.currentAudioUrl = audioUrl;
    audio.playbackRate = Math.max(0.5, Math.min(2.0, settings.rate || 1.0));
    audio.volume = Math.max(0, Math.min(1.0, settings.volume ?? 1.0));

    audio.onplay = () => {
      this.isSpeaking = true;
      this.isPaused = false;
      onEvent?.('start');
    };

    audio.onended = () => {
      this.isSpeaking = false;
      this.isPaused = false;
      this.currentAudio = null;
      onEvent?.('end');
    };

    audio.onerror = (e) => {
      this.isSpeaking = false;
      this.isPaused = false;
      this.currentAudio = null;
      onEvent?.('error', e);
    };

    audio.onpause = () => {
      if (this.isSpeaking) {
        this.isPaused = true;
        onEvent?.('pause');
      }
    };

    try {
      await audio.play();
    } catch (e: any) {
      if (e.name === 'AbortError') return;
      throw e;
    }
  }

  private splitIntoSentences(text: string): string[] {
    const rawChunks = text
      .replace(/([.?!]+)(\s+)/g, '$1|SPLIT|')
      .replace(/(\n+)/g, '|SPLIT|')
      .split('|SPLIT|');

    const result: string[] = [];
    for (const chunk of rawChunks) {
      const trimmed = chunk.trim();
      if (!trimmed) continue;
      if (trimmed.length > 200) {
        const sub = trimmed.replace(/([,;:]+)(\s+)/g, '$1|SUB|').split('|SUB|');
        for (const s of sub) {
          const st = s.trim();
          if (st) result.push(st);
        }
      } else {
        result.push(trimmed);
      }
    }
    return result.length > 0 ? result : [text];
  }

  private speakSystem(text: string, settings: TtsSettings, onEvent?: UtteranceCallback) {
    if (!this.synth) {
      onEvent?.('error', new Error('Sintesi vocale non supportata in questo browser.'));
      return;
    }

    this.loadVoices();

    const sentences = this.splitIntoSentences(text);
    this.sentenceQueue = sentences;
    this.currentSentenceIdx = 0;
    this.currentSettings = settings;
    this.currentCallback = onEvent;

    this.isSpeaking = true;
    this.isPaused = false;
    onEvent?.('start');

    this.speakNextSentence();
  }

  private speakNextSentence() {
    if (!this.synth || !this.isSpeaking) return;

    if (this.currentSentenceIdx >= this.sentenceQueue.length) {
      this.isSpeaking = false;
      this.isPaused = false;
      this.currentUtterance = null;
      this.currentCallback?.('end');
      return;
    }

    const sentenceText = this.sentenceQueue[this.currentSentenceIdx];
    const settings = this.currentSettings || {
      voiceUri: '',
      voiceName: '',
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0,
      autoAdvance: true,
      fontSize: 'normal',
      highContrastMode: 'black-white',
    };

    const utterance = new SpeechSynthesisUtterance(sentenceText);
    this.currentUtterance = utterance;
    if (typeof window !== 'undefined') {
      (window as any).__voraUtterance = utterance;
    }

    if (settings.voiceUri && !settings.voiceUri.startsWith('gemini:')) {
      const selected = this.systemVoices.find((v) => v.voiceURI === settings.voiceUri);
      if (selected) {
        utterance.voice = selected;
      }
    } else {
      const defaultIt = this.systemVoices.find(
        (v) =>
          v.lang.toLowerCase().startsWith('it') ||
          v.lang.toLowerCase().includes('it') ||
          v.name.toLowerCase().includes('italian')
      );
      if (defaultIt) {
        utterance.voice = defaultIt;
      }
    }

    utterance.lang = 'it-IT';
    utterance.rate = Math.max(0.6, Math.min(2.0, settings.rate || 1.0));
    utterance.pitch = Math.max(0.5, Math.min(1.5, settings.pitch || 1.0));
    utterance.volume = Math.max(0, Math.min(1.0, settings.volume ?? 1.0));

    utterance.onend = () => {
      this.currentSentenceIdx++;
      if (this.isSpeaking && !this.isPaused) {
        this.speakNextSentence();
      }
    };

    utterance.onerror = (e) => {
      if (e.error === 'canceled' || e.error === 'interrupted') return;
      this.currentSentenceIdx++;
      if (this.isSpeaking && !this.isPaused) {
        this.speakNextSentence();
      } else {
        this.isSpeaking = false;
        this.currentCallback?.('error', e);
      }
    };

    try {
      this.synth.speak(utterance);
    } catch (e) {
      console.error('Errore sintesi:', e);
      this.isSpeaking = false;
      this.currentCallback?.('error', e);
    }
  }

  public pause() {
    if (this.currentAudio && !this.currentAudio.paused) {
      this.currentAudio.pause();
      this.isPaused = true;
      return;
    }
    if (this.synth && this.isSpeaking) {
      this.synth.pause();
      this.isPaused = true;
    }
  }

  public resume() {
    if (this.currentAudio && this.currentAudio.paused) {
      this.currentAudio.play();
      this.isPaused = false;
      return;
    }
    if (this.synth && this.synth.paused) {
      this.synth.resume();
      this.isPaused = false;
    } else if (this.synth && this.isPaused && this.sentenceQueue.length > 0) {
      this.isPaused = false;
      this.speakNextSentence();
    }
  }

  public stop() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    if (this.currentAudio) {
      this.currentAudio.onplay = null;
      this.currentAudio.onended = null;
      this.currentAudio.onerror = null;
      this.currentAudio.onpause = null;
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    if (this.synth) {
      this.synth.cancel();
      this.currentUtterance = null;
    }
    this.sentenceQueue = [];
    this.currentSentenceIdx = 0;
    this.isSpeaking = false;
    this.isPaused = false;
  }

  public getSpeakingState(): boolean {
    if (this.currentAudio) {
      return !this.currentAudio.paused && !this.currentAudio.ended;
    }
    return this.synth ? this.synth.speaking && !this.synth.paused : false;
  }

  public previewVoice(settings: TtsSettings, sampleText?: string, onDone?: () => void) {
    const isAi = this.isAiVoice(settings.voiceUri);
    const voiceName = (settings.voiceUri || 'Kore').replace(/^gemini:/, '');

    const text =
      sampleText ||
      (isAi
        ? `Ciao! Sono ${voiceName}, la voce AI per i tuoi libri.`
        : 'Ciao! Questa è la voce con cui leggerò i tuoi libri in Vora.');

    this.speak(text, settings, (event) => {
      if (event === 'end' || event === 'error') {
        onDone?.();
      }
    });
  }
}

export const ttsService = new TtsService();
