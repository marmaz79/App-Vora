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
  totalSegments?: number;
}

/**
 * Format seconds into mm:ss or hh:mm:ss
 */
export function formatAudioTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const totalSecs = Math.floor(seconds);
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Split long transcription text into comfortable book pages
 */
function splitTextIntoPages(text: string, wordsPerPage: number = 250): string[] {
  const clean = text.trim();
  if (!clean) return ['(Trascrizione vuota)'];

  const rawParagraphs = clean.split(/\n+/);
  const chunks: string[] = [];

  for (const p of rawParagraphs) {
    const trimmed = p.trim();
    if (!trimmed) continue;
    const words = trimmed.split(/\s+/);
    if (words.length > wordsPerPage) {
      for (let i = 0; i < words.length; i += wordsPerPage) {
        chunks.push(words.slice(i, i + wordsPerPage).join(' '));
      }
    } else {
      chunks.push(trimmed);
    }
  }

  const pages: string[] = [];
  let curPage = '';
  let curCount = 0;

  for (const chunk of chunks) {
    const chunkWords = chunk.split(/\s+/).length;
    if (curCount + chunkWords > wordsPerPage && curPage.trim()) {
      pages.push(curPage.trim());
      curPage = chunk;
      curCount = chunkWords;
    } else {
      curPage += (curPage ? '\n\n' : '') + chunk;
      curCount += chunkWords;
    }
  }

  if (curPage.trim()) {
    pages.push(curPage.trim());
  }

  return pages.length > 0 ? pages : [clean];
}

class AudioTranscribeService {
  /**
   * Helper to check if a file or MIME type is an audio file
   */
  public isAudioFile(file: File): boolean {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const audioExts = ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'oga', 'webm', 'flac', 'opus', 'wma', 'm4b', 'mp4'];
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
   * Convert an AudioBuffer to a compact 16-bit PCM WAV Blob (16kHz mono)
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
   * Normalize audio MIME type based on extension
   */
  private resolveMimeType(filename: string, mimeType?: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    let clean = mimeType || '';
    if (ext === 'mp3' || clean.includes('mpeg') || clean.includes('mp3')) {
      return 'audio/mp3';
    } else if (ext === 'wav' || clean.includes('wav')) {
      return 'audio/wav';
    } else if (ext === 'm4a' || ext === 'm4b' || clean.includes('m4a') || clean.includes('mp4') || clean.includes('aac')) {
      return 'audio/m4a';
    } else if (ext === 'ogg' || ext === 'oga' || ext === 'opus' || clean.includes('ogg') || clean.includes('opus')) {
      return 'audio/ogg';
    } else if (ext === 'webm' || clean.includes('webm')) {
      return 'audio/webm';
    } else if (ext === 'flac' || clean.includes('flac')) {
      return 'audio/flac';
    }
    return clean || 'audio/mp3';
  }

  /**
   * Send a single audio chunk/segment to the backend API for transcription
   */
  private async transcribeSingleChunk(params: {
    base64Audio: string;
    mimeType: string;
    filename: string;
    language: string;
    format: string;
    segmentIndex?: number;
    totalSegments?: number;
  }): Promise<{
    text: string;
    engine: string;
    noSpeechDetected: boolean;
  }> {
    const { base64Audio, mimeType, filename, language, format, segmentIndex, totalSegments } = params;

    let response: Response;
    try {
      response = await fetch('/api/audio/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audio: base64Audio,
          mimeType,
          filename,
          language,
          format,
          segmentIndex,
          totalSegments,
        }),
      });
    } catch (networkErr: any) {
      throw new Error(
        networkErr?.message ||
          'Connessione al server interrotta durante il caricamento audio. Verifica la rete e riprova.'
      );
    }

    const rawResponseText = await response.text().catch(() => '');
    const trimmed = rawResponseText.trim();

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
          'Il segmento audio ha richiesto un payload elevato. Riprova: il sistema elaborerà la traccia a segmenti più compatti.'
        );
      }
      if (response.status === 504 || trimmed.includes('504') || trimmed.includes('Gateway Timeout')) {
        throw new Error(
          'La trascrizione ha richiesto più tempo del previsto (timeout del gateway). Riprova tra qualche istante.'
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

    if (!data.success && !data.text) {
      throw new Error(data.error || 'Trascrizione non riuscita per questa porzione audio.');
    }

    return {
      text: data.text || '',
      engine: data.engine || 'Gemini 3.5 Transcribe',
      noSpeechDetected: !!data.noSpeechDetected,
    };
  }

  /**
   * Transcribe an uploaded audio file using Gemini AI on the server.
   * Supports ANY audio file size without limits by using automatic intelligent
   * Web Audio segmentation for large/long audio tracks.
   */
  public async transcribeAudio(
    file: File,
    options: AudioTranscriptionOptions = {}
  ): Promise<AudioTranscriptionResult> {
    const { language = 'ita', format = 'narrative', onProgress } = options;
    const sizeMb = file.size / (1024 * 1024);
    const originalBlobUrl = URL.createObjectURL(file);
    const baseTitle = file.name.replace(/\.[^/.]+$/, '').trim() || 'Registrazione Audio';

    // 1. Reading file info
    onProgress?.({
      status: 'reading',
      progress: 0.05,
      message: `Caricamento file audio (${sizeMb.toFixed(1)} MB)...`,
    });

    // Detect duration
    const duration = await this.getAudioDuration(file);

    // Segment configuration:
    // If audio is large (> 16MB) or long (> 5 minutes / 300 seconds), segment into ~5-minute chunks
    // 5 minutes of 16kHz mono 16-bit WAV is ~9.6MB (< 13MB base64), perfectly within Gemini API payload limits
    const CHUNK_DURATION_SEC = 300; // 5 minutes
    const shouldSegment = (sizeMb > 16 || duration > 360) && typeof window !== 'undefined';

    // Attempt intelligent segmentation via Web Audio API if file is large/long
    if (shouldSegment) {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          onProgress?.({
            status: 'reading',
            progress: 0.1,
            message: `Decodifica traccia audio (${sizeMb.toFixed(1)} MB, ${formatAudioTime(duration)}) in corso...`,
          });

          const arrayBuffer = await file.arrayBuffer();
          const audioCtx = new AudioCtx();
          let decodedBuffer: AudioBuffer | null = null;

          try {
            decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);
          } finally {
            audioCtx.close().catch(() => {});
          }

          if (decodedBuffer && decodedBuffer.duration > 0) {
            const actualDuration = decodedBuffer.duration;
            const totalSegments = Math.max(1, Math.ceil(actualDuration / CHUNK_DURATION_SEC));

            console.info(
              `Audio segmentation enabled: duration ${actualDuration.toFixed(1)}s, ${totalSegments} segments of ${CHUNK_DURATION_SEC}s`
            );

            const segmentTexts: string[] = [];
            let detectedEngine = 'Gemini 3.5 Transcribe';
            let allSilent = true;

            for (let i = 0; i < totalSegments; i++) {
              const startSec = i * CHUNK_DURATION_SEC;
              const endSec = Math.min((i + 1) * CHUNK_DURATION_SEC, actualDuration);
              const sliceDuration = endSec - startSec;
              if (sliceDuration <= 0.2) continue;

              const progressRatio = 0.15 + (i / totalSegments) * 0.75;
              onProgress?.({
                status: 'transcribing',
                progress: progressRatio,
                message: `Trascrizione Gemini AI: parte ${i + 1} di ${totalSegments} (${formatAudioTime(startSec)} - ${formatAudioTime(endSec)})...`,
              });

              // Render slice to 16kHz mono WAV using OfflineAudioContext
              const targetRate = 16000;
              const targetFrames = Math.ceil(sliceDuration * targetRate);
              const offlineCtx = new OfflineAudioContext(1, targetFrames, targetRate);
              const source = offlineCtx.createBufferSource();
              source.buffer = decodedBuffer;
              source.connect(offlineCtx.destination);
              source.start(0, startSec, sliceDuration);

              const renderedBuffer = await offlineCtx.startRendering();
              const wavBlob = this.audioBufferToWav(renderedBuffer);
              const base64Wav = await this.fileToBase64(wavBlob);

              // Transcribe this segment
              const result = await this.transcribeSingleChunk({
                base64Audio: base64Wav,
                mimeType: 'audio/wav',
                filename: `${baseTitle}_part${i + 1}.wav`,
                language,
                format,
                segmentIndex: i,
                totalSegments,
              });

              detectedEngine = result.engine;
              if (result.text && !result.noSpeechDetected) {
                allSilent = false;
                // Add header if multiple segments to indicate audio timeline
                const segmentHeader = totalSegments > 1 ? `[${formatAudioTime(startSec)} - ${formatAudioTime(endSec)}]` : '';
                segmentTexts.push(segmentHeader ? `${segmentHeader}\n${result.text}` : result.text);
              }
            }

            // Formatting full unified book
            onProgress?.({
              status: 'formatting',
              progress: 0.95,
              message: 'Unione e formattazione dei paragrafi completata...',
            });

            let combinedText = segmentTexts.join('\n\n').trim();
            let noSpeech = allSilent;

            if (!combinedText) {
              noSpeech = true;
              combinedText = `Trascrizione: ${baseTitle}\n\n(Nessun discorso o parlato nitido rilevato nella traccia audio. Il file è pronto per l'ascolto vocale o per aggiungere note personali.)`;
            }

            const pages = splitTextIntoPages(combinedText);
            const wordsCount = combinedText.split(/\s+/).filter(Boolean).length;

            onProgress?.({
              status: 'completed',
              progress: 1.0,
              message: 'Trascrizione completata con successo!',
            });

            return {
              success: true,
              title: `Trascrizione: ${baseTitle}`,
              text: combinedText,
              pages,
              wordsCount,
              duration: actualDuration,
              engine: detectedEngine,
              language,
              audioBlobUrl: originalBlobUrl,
              noSpeechDetected: noSpeech,
              totalSegments,
            };
          }
        }
      } catch (segmentErr) {
        console.warn('Segmentation attempt fallback to direct upload:', segmentErr);
      }
    }

    // Direct single upload path (for compact audio files or fallback)
    onProgress?.({
      status: 'uploading',
      progress: 0.35,
      message: 'Invio della traccia audio a Gemini AI per la trascrizione...',
    });

    const base64Data = await this.fileToBase64(file);
    const mimeType = this.resolveMimeType(file.name, file.type);

    onProgress?.({
      status: 'transcribing',
      progress: 0.65,
      message: 'Trascrizione audio con Gemini AI in corso (ascolto profondo e punteggiatura)...',
    });

    const result = await this.transcribeSingleChunk({
      base64Audio: base64Data,
      mimeType,
      filename: file.name,
      language,
      format,
    });

    onProgress?.({
      status: 'formatting',
      progress: 0.9,
      message: 'Organizzazione dei paragrafi e impaginazione per la lettura...',
    });

    let cleanedText = result.text.trim();
    let noSpeech = result.noSpeechDetected;

    if (!cleanedText) {
      noSpeech = true;
      cleanedText = `Trascrizione: ${baseTitle}\n\n(Nessun discorso o parlato nitido rilevato nella traccia audio. Il file è pronto per l'ascolto vocale o per aggiungere note personali.)`;
    }

    const pages = splitTextIntoPages(cleanedText);
    const wordsCount = cleanedText.split(/\s+/).filter(Boolean).length;

    onProgress?.({
      status: 'completed',
      progress: 1.0,
      message: 'Trascrizione completata con successo!',
    });

    return {
      success: true,
      title: `Trascrizione: ${baseTitle}`,
      text: cleanedText,
      pages,
      wordsCount,
      duration,
      engine: result.engine,
      language,
      audioBlobUrl: originalBlobUrl,
      noSpeechDetected: noSpeech,
      totalSegments: 1,
    };
  }
}

export const audioTranscribeService = new AudioTranscribeService();
