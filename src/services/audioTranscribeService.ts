export interface AudioTranscriptionProgress {
  status: 'reading' | 'uploading' | 'transcribing' | 'formatting' | 'completed' | 'error';
  progress: number; // 0 to 1
  message: string;
}

export interface AudioTranscriptionOptions {
  language?: string; // 'ita' | 'eng' | 'fra' | 'esp' | 'deu' | 'auto'
  format?: 'narrative' | 'dialogue' | 'summary';
  onProgress?: (progress: AudioTranscriptionProgress) => void;
}

export interface AudioTranscriptionResult {
  success: boolean;
  title: string;
  text: string;
  pages: string[];
  wordsCount: number;
  duration?: number;
  engine: string;
  language?: string;
  audioBlobUrl?: string;
  noSpeechDetected?: boolean;
}

class AudioTranscribeService {
  /**
   * Helper to check if a file or MIME type is an audio file
   */
  public isAudioFile(file: File): boolean {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const audioExts = ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'oga', 'webm', 'flac', 'opus', 'wma'];
    return audioExts.includes(ext) || file.type.startsWith('audio/');
  }

  /**
   * Get audio file duration in seconds using HTMLAudioElement
   */
  public async getAudioDuration(file: File): Promise<number> {
    return new Promise((resolve) => {
      try {
        const url = URL.createObjectURL(file);
        const audio = new Audio();
        audio.preload = 'metadata';
        audio.onloadedmetadata = () => {
          const duration = audio.duration || 0;
          URL.revokeObjectURL(url);
          resolve(duration);
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          resolve(0);
        };
        audio.src = url;
      } catch {
        resolve(0);
      }
    });
  }

  /**
   * Helper to convert an AudioBuffer to a compact 16-bit PCM WAV Blob (16kHz mono)
   */
  private audioBufferToWav(buffer: AudioBuffer): Blob {
    const numChannels = 1;
    const sampleRate = buffer.sampleRate;
    const bitDepth = 16;
    const channelData = buffer.getChannelData(0);
    const dataLength = channelData.length * 2;
    const headerLength = 44;
    const totalLength = headerLength + dataLength;

    const arrayBuffer = new ArrayBuffer(totalLength);
    const view = new DataView(arrayBuffer);

    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * 2, true);
    view.setUint16(32, numChannels * 2, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, dataLength, true);

    let offset = 44;
    for (let i = 0; i < channelData.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }

    return new Blob([view], { type: 'audio/wav' });
  }

  /**
   * Downsample or optimize large audio files in the browser to 16kHz mono WAV
   * to ensure they fit well within reverse proxy and payload limits (< 20MB)
   */
  private async optimizeAudioFile(
    file: File,
    onProgress?: (progress: AudioTranscriptionProgress) => void
  ): Promise<{ base64: string; mimeType: string; blobUrl: string }> {
    const sizeMb = file.size / (1024 * 1024);
    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    // If file is already compact (<= 18MB and compressed), use directly
    if (sizeMb <= 18 && ext !== 'wav') {
      const base64 = await this.fileToBase64(file);
      const blobUrl = URL.createObjectURL(file);
      return { base64, mimeType: file.type || 'audio/mp3', blobUrl };
    }

    // If file is large or uncompressed WAV, downsample to 16kHz mono WAV
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        onProgress?.({
          status: 'reading',
          progress: 0.2,
          message: `Ottimizzazione traccia audio (${sizeMb.toFixed(1)} MB) per la trascrizione rapida...`,
        });

        const arrayBuffer = await file.arrayBuffer();
        const audioCtx = new AudioCtx();
        const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        audioCtx.close().catch(() => {});

        // 16kHz mono is the gold standard for speech transcription models
        const targetRate = 16000;
        const targetFrames = Math.ceil(decodedBuffer.duration * targetRate);

        const offlineCtx = new OfflineAudioContext(1, targetFrames, targetRate);
        const source = offlineCtx.createBufferSource();
        source.buffer = decodedBuffer;
        source.connect(offlineCtx.destination);
        source.start(0);

        const rendered = await offlineCtx.startRendering();
        const wavBlob = this.audioBufferToWav(rendered);

        const optimizedFile = new File([wavBlob], `${file.name.replace(/\.[^/.]+$/, '')}_16k.wav`, {
          type: 'audio/wav',
        });
        const base64 = await this.fileToBase64(optimizedFile);
        const blobUrl = URL.createObjectURL(optimizedFile);

        console.info(
          `Audio optimized: ${sizeMb.toFixed(1)} MB -> ${(wavBlob.size / 1024 / 1024).toFixed(1)} MB WAV`
        );
        return { base64, mimeType: 'audio/wav', blobUrl };
      }
    } catch (optErr) {
      console.warn('Browser audio downsampling fallback to original file:', optErr);
    }

    const base64 = await this.fileToBase64(file);
    const blobUrl = URL.createObjectURL(file);
    return { base64, mimeType: file.type || 'audio/mp3', blobUrl };
  }

  /**
   * Convert file or blob to Base64 string
   */
  private async fileToBase64(file: File | Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const res = reader.result as string;
        const base64 = res.includes(',') ? res.split(',')[1] : res;
        resolve(base64);
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }

  /**
   * Transcribe an uploaded audio file using Gemini AI on the server
   */
  public async transcribeAudio(
    file: File,
    options: AudioTranscriptionOptions = {}
  ): Promise<AudioTranscriptionResult> {
    const { language = 'ita', format = 'narrative', onProgress } = options;
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);

    // 1. Reading and preparing audio
    onProgress?.({
      status: 'reading',
      progress: 0.1,
      message: `Lettura file audio in corso (${sizeMb} MB)...`,
    });

    const [optimized, duration] = await Promise.all([
      this.optimizeAudioFile(file, onProgress),
      this.getAudioDuration(file),
    ]);

    // Check payload size safety
    const payloadMb = (optimized.base64.length * 0.75) / (1024 * 1024);
    if (payloadMb > 24) {
      throw new Error(
        `Il file audio (${payloadMb.toFixed(1)} MB) supera il limite massimo consentito dal server (24 MB). Prova a comprimere l'audio o a caricare una traccia più breve.`
      );
    }

    // 2. Uploading to server
    onProgress?.({
      status: 'uploading',
      progress: 0.35,
      message: 'Invio della traccia audio a Gemini AI per la trascrizione...',
    });

    let mimeType = optimized.mimeType || file.type || '';
    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    if (ext === 'mp3' || mimeType.includes('mpeg') || mimeType.includes('mp3')) {
      mimeType = 'audio/mp3';
    } else if (ext === 'wav' || mimeType.includes('wav')) {
      mimeType = 'audio/wav';
    } else if (ext === 'm4a' || mimeType.includes('m4a') || mimeType.includes('mp4') || mimeType.includes('aac')) {
      mimeType = 'audio/m4a';
    } else if (ext === 'ogg' || ext === 'oga' || ext === 'opus' || mimeType.includes('ogg') || mimeType.includes('opus')) {
      mimeType = 'audio/ogg';
    } else if (ext === 'webm' || mimeType.includes('webm')) {
      mimeType = 'audio/webm';
    } else if (ext === 'flac' || mimeType.includes('flac')) {
      mimeType = 'audio/flac';
    } else {
      mimeType = mimeType || 'audio/mp3';
    }

    // 3. Transcribing with Gemini
    onProgress?.({
      status: 'transcribing',
      progress: 0.65,
      message: 'Trascrizione audio con Gemini AI in corso (ascolto profondo e punteggiatura)...',
    });

    let response: Response;
    try {
      response = await fetch('/api/audio/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audio: optimized.base64,
          mimeType,
          filename: file.name,
          language,
          format,
        }),
      });
    } catch (networkErr: any) {
      throw new Error(
        networkErr?.message ||
          'Connessione al server interrotta durante il caricamento audio. Verifica la rete e riprova.'
      );
    }

    // Read response as text first to safely detect HTML errors (Nginx 413, 502, warmup)
    const rawResponseText = await response.text().catch(() => '');
    const trimmed = rawResponseText.trim();

    // Check if the server or reverse proxy returned HTML instead of JSON
    if (
      trimmed.startsWith('<') ||
      trimmed.toLowerCase().includes('<!doctype') ||
      trimmed.toLowerCase().includes('<html')
    ) {
      if (
        response.status === 413 ||
        trimmed.includes('413') ||
        trimmed.includes('too large') ||
        trimmed.includes('PayloadTooLarge')
      ) {
        throw new Error(
          'Il file audio è troppo pesante per il server (limite di caricamento superato). Prova con un file audio compresso o più breve.'
        );
      }
      if (response.status === 504 || trimmed.includes('504') || trimmed.includes('Gateway Timeout')) {
        throw new Error(
          'La trascrizione ha richiesto troppo tempo (timeout del server). Prova con una traccia audio più breve.'
        );
      }
      if (response.status === 502 || response.status === 503 || trimmed.includes('warmup')) {
        throw new Error(
          'Il server era in fase di riavvio o warmup. Riprova ora a caricare la traccia audio.'
        );
      }
      throw new Error(
        `Risposta non valida dal server (HTTP ${response.status}). Riprova tra qualche istante.`
      );
    }

    let data: any;
    try {
      data = JSON.parse(rawResponseText);
    } catch {
      throw new Error(
        'Risposta del server non interpretabile in formato JSON. Riprova tra pochi istanti.'
      );
    }

    if (!response.ok) {
      throw new Error(data?.error || `Errore server durante la trascrizione (${response.status})`);
    }

    if (data.fallback && data.error && !data.success) {
      throw new Error(data.error);
    }

    if (!data.success || !data.text) {
      throw new Error(data.error || 'Trascrizione non riuscita. Nessun testo generato.');
    }

    // 4. Formatting pages
    onProgress?.({
      status: 'formatting',
      progress: 0.9,
      message: 'Organizzazione dei paragrafi e impaginazione per la lettura...',
    });

    // 5. Completed
    onProgress?.({
      status: 'completed',
      progress: 1.0,
      message: data.noSpeechDetected
        ? 'File audio pronto (nessun parlato rilevato).'
        : 'Trascrizione completata con successo!',
    });

    return {
      success: true,
      title: data.title || `Trascrizione: ${file.name.replace(/\.[^/.]+$/, '')}`,
      text: data.text,
      pages: Array.isArray(data.pages) && data.pages.length > 0 ? data.pages : [data.text],
      wordsCount: data.wordsCount || data.text.split(/\s+/).filter(Boolean).length,
      duration,
      engine: data.engine || 'Gemini 3.5 Transcribe',
      language: data.language || language,
      audioBlobUrl: optimized.blobUrl,
      noSpeechDetected: !!data.noSpeechDetected,
    };
  }
}

export const audioTranscribeService = new AudioTranscribeService();
