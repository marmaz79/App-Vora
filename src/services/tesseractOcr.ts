import Tesseract, { Worker } from 'tesseract.js';

export interface OcrProgress {
  status: string;
  progress: number; // 0 to 1
  message: string;
}

export type OcrLanguage = 'ita' | 'eng' | 'ita+eng';
export type OcrEngineMode = 'ai-vision' | 'tesseract-ai' | 'tesseract';
export type AiOptimizationMode = 'comprehensive' | 'speech_tts' | 'typos';

/**
 * ============================================================================
 * CONFIGURAZIONE SISTEMA AI OCR (GEMINI 3.8 FLASH VISION)
 * ============================================================================
 * [STATO ATTUALE: COMMENTATO / DISATTIVATO SU RICHIESTA]
 * Il sistema di scansione OCR basato su AI (Gemini 3.8 Flash Vision) è stato
 * commentato e disattivato. L'applicazione utilizza il motore OCR locale Tesseract.js
 * per il riconoscimento ottico dei caratteri offline direttamente nel browser.
 *
 * Per riattivare l'AI OCR in futuro, impostare ENABLE_AI_OCR = true e decommentare
 * i relativi blocchi in recognize() e optimizeTextWithAi().
 * ============================================================================
 */
export const ENABLE_AI_OCR = false;

export interface OcrOptions {
  engine?: OcrEngineMode;
  language?: OcrLanguage;
  enhanceContrast?: boolean;
  autoOptimizeAi?: boolean;
  speechOptimized?: boolean;
  onProgress?: (progress: OcrProgress) => void;
}

export interface OcrResult {
  text: string;
  rawText: string;
  confidence: number;
  wordsCount: number;
  lines: string[];
  engine: string;
  isAiOptimized: boolean;
}

export class TesseractOcrService {
  private activeWorker: Worker | null = null;
  private currentLanguage: string | null = null;

  /**
   * Helper to convert File, Blob or Image URL to Base64 data string
   */
  public async toBase64(imageSource: File | Blob | string): Promise<{ base64: string; mimeType: string }> {
    if (typeof imageSource === 'string') {
      if (imageSource.startsWith('data:')) {
        const mimeType = imageSource.substring(imageSource.indexOf(':') + 1, imageSource.indexOf(';')) || 'image/jpeg';
        return { base64: imageSource, mimeType };
      }
      // If it's a blob url or web url, fetch and convert
      const res = await fetch(imageSource);
      const blob = await res.blob();
      const mimeType = blob.type || 'image/jpeg';
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      return { base64, mimeType };
    }

    const mimeType = imageSource.type || 'image/jpeg';
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(imageSource);
    });
    return { base64, mimeType };
  }

  /**
   * Preprocess image to enhance contrast, remove shadows and improve OCR accuracy
   */
  public async preprocessImage(
    imageSource: File | Blob | string,
    enhanceContrast: boolean = true
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Limit maximum dimensions for performance while keeping high clarity (max 2200px)
          const maxDim = 2200;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(typeof imageSource === 'string' ? imageSource : URL.createObjectURL(imageSource as Blob));
            return;
          }

          // Draw initial image
          ctx.drawImage(img, 0, 0, width, height);

          if (!enhanceContrast) {
            resolve(canvas.toDataURL('image/jpeg', 0.92));
            return;
          }

          // Apply image processing: Grayscale and gentle contrast enhancement
          const imageData = ctx.getImageData(0, 0, width, height);
          const data = imageData.data;

          // Calculate average brightness
          let sumBrightness = 0;
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            sumBrightness += lum;
          }
          const avgBrightness = sumBrightness / (data.length / 4);

          // Contrast multiplier based on image lighting
          const contrast = 1.35;
          const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            let gray = 0.299 * r + 0.587 * g + 0.114 * b;

            // Apply contrast stretching
            gray = factor * (gray - avgBrightness) + avgBrightness;

            // Soft thresholding to whiten background and darken text
            if (gray > 185) {
              gray = Math.min(255, gray + 25);
            } else if (gray < 110) {
              gray = Math.max(0, gray - 20);
            }

            const finalVal = Math.min(255, Math.max(0, Math.round(gray)));
            data[i] = finalVal;
            data[i + 1] = finalVal;
            data[i + 2] = finalVal;
          }

          ctx.putImageData(imageData, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', 0.92));
        } catch (err) {
          console.warn('Preprocessing canvas error, using raw image:', err);
          resolve(typeof imageSource === 'string' ? imageSource : URL.createObjectURL(imageSource as Blob));
        }
      };

      img.onerror = (err) => {
        reject(new Error("Impossibile caricare l'immagine per il preprocessing: " + String(err)));
      };

      if (typeof imageSource === 'string') {
        img.src = imageSource;
      } else {
        img.src = URL.createObjectURL(imageSource);
      }
    });
  }

  /**
   * Post-processes and cleans text recognized by Tesseract (local heuristics)
   */
  public cleanOcrText(rawText: string): string {
    if (!rawText) return '';

    let text = rawText;

    // Normalize carriage returns
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Remove non-printable / control characters except standard punctuation and newlines
    text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F\uFFFD]/g, '');

    // Rejoin words split with hyphens at the end of lines (e.g. "straor- \n dinario" -> "straordinario")
    text = text.replace(/([a-zA-Z\u00C0-\u017F]+)-\s*\n+\s*([a-zA-Z\u00C0-\u017F]+)/g, '$1$2');

    // Replace multiple empty lines with double newlines
    text = text.replace(/\n{3,}/g, '\n\n');

    // Replace weird tesseract quotation marks or pipe artifacts
    text = text
      .replace(/[|]/g, 'I')
      .replace(/[«»]/g, '"')
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'");

    // Clean whitespace in each line
    const lines = text.split('\n').map((line) => line.replace(/[ \t]+/g, ' ').trim());

    // Filter out solitary stray single characters that are common OCR noise (e.g. "~", ".", "`")
    const filteredLines = lines.filter((line) => {
      if (line.length === 1 && !/[a-zA-Z0-9]/.test(line)) return false;
      return true;
    });

    return filteredLines.join('\n').trim();
  }

  /**
   * Optimize OCR text with Gemini AI via server-side endpoint
   */
  /**
   * Ottimizzazione del testo OCR.
   * [SISTEMA AI COMMENTATO]: La chiamata all'endpoint AI /api/ocr/optimize è stata
   * commentata su richiesta dell'utente. Il testo viene ripulito e normalizzato
   * tramite il pulitore euristico locale ad alta precisione.
   */
  public async optimizeTextWithAi(
    text: string,
    mode: AiOptimizationMode = 'comprehensive'
  ): Promise<{ text: string; engine: string; isAi: boolean }> {
    if (!text || !text.trim()) {
      return { text: '', engine: 'locale', isAi: false };
    }

    /* -------------------------------------------------------------------------
     * [CHIAMATA AI OCR OPTIMIZE COMMENTATA SU RICHIESTA UTENTE]
     * Decommentare questo blocco per riattivare l'ottimizzazione tramite Gemini AI:
    try {
      const res = await fetch('/api/ocr/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, mode }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.text && !data.fallback) {
          return { text: data.text, engine: data.engine || 'Gemini 3.8 Flash', isAi: true };
        }
        if (data.text) {
          return { text: data.text, engine: 'Pulitore euristico locale', isAi: false };
        }
      }
    } catch (err) {
      console.warn('AI optimize error, fallback to local cleaner:', err);
    }
    ------------------------------------------------------------------------- */

    // Pulizia e normalizzazione 100% locale offline
    const localCleaned = this.cleanOcrText(text);
    return { text: localCleaned, engine: 'Pulitore euristico locale (Offline)', isAi: false };
  }

  /**
   * =========================================================================
   * SCANSIONE MULTIMODALE CON GEMINI 3.8 FLASH VISION
   * =========================================================================
   * Converte l'immagine del documento (scattata dalla fotocamera o caricata)
   * in una stringa Base64 ad alta definizione e la invia all'endpoint /api/ocr/vision.
   *
   * Caratteristiche:
   *  - Gestisce l'orientamento, la curvatura della pagina e ombre di rilegatura.
   *  - Utilizza un ticker di progresso per un feedback visivo continuo all'utente.
   *  - Restituisce il testo strutturato con metriche di confidenza e conteggio parole.
   * =========================================================================
   */
  public async recognizeWithGeminiVision(
    imageSource: File | Blob | string,
    options: OcrOptions = {}
  ): Promise<OcrResult> {
    options.onProgress?.({
      status: 'ai-vision-preparing',
      progress: 0.15,
      message: 'Preparazione immagine ad alta risoluzione...',
    });

    const { base64, mimeType } = await this.toBase64(imageSource);

    options.onProgress?.({
      status: 'ai-vision-processing',
      progress: 0.45,
      message: 'Analisi visiva e trascrizione con Gemini AI Vision...',
    });

    // Dynamic progress ticker while waiting for Gemini API response
    let currentPct = 0.45;
    const progressTimer = setInterval(() => {
      if (currentPct < 0.93) {
        currentPct += 0.08;
        let msg = 'Analisi visiva e trascrizione con Gemini AI Vision...';
        if (currentPct > 0.85) {
          msg = 'Correzione refusi e formattazione narrativa con AI...';
        } else if (currentPct > 0.65) {
          msg = 'Riconoscimento caratteri e allineamento paragrafi...';
        }
        options.onProgress?.({
          status: 'ai-vision-processing',
          progress: Math.min(0.93, currentPct),
          message: msg,
        });
      }
    }, 450);

    let res: globalThis.Response;
    try {
      res = await fetch('/api/ocr/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64,
          mimeType,
          language: options.language || 'ita',
          speechOptimized: Boolean(options.speechOptimized),
        }),
      });
    } finally {
      clearInterval(progressTimer);
    }

    if (!res.ok) {
      throw new Error(`Errore server Vision AI (${res.status})`);
    }

    const data = await res.json();

    if (data.fallback || !data.success || !data.text) {
      throw new Error(data.error || 'Gemini Vision AI non disponibile per questa immagine.');
    }

    options.onProgress?.({
      status: 'done',
      progress: 1.0,
      message: 'Trascrizione Gemini AI Vision completata con successo!',
    });

    const wordsCount = data.text.split(/\s+/).filter(Boolean).length;
    const lines = data.text.split('\n').filter((l: string) => l.trim().length > 0);

    return {
      text: data.text,
      rawText: data.text,
      confidence: data.confidence || 98,
      wordsCount,
      lines,
      engine: 'Gemini AI Vision',
      isAiOptimized: true,
    };
  }

  /**
   * Perform OCR with local Tesseract.js engine
   */
  public async recognizeWithTesseract(
    imageSource: File | Blob | string,
    options: OcrOptions = {}
  ): Promise<OcrResult> {
    const language = options.language || 'ita';
    const enhanceContrast = options.enhanceContrast ?? true;

    options.onProgress?.({
      status: 'preprocessing',
      progress: 0.08,
      message: "Pre-elaborazione dell'immagine e contrasto adattivo...",
    });

    // 1. Preprocess image
    let processedImage: string;
    try {
      processedImage = await this.preprocessImage(imageSource, enhanceContrast);
    } catch {
      processedImage =
        typeof imageSource === 'string' ? imageSource : URL.createObjectURL(imageSource as Blob);
    }

    options.onProgress?.({
      status: 'tesseract-starting',
      progress: 0.2,
      message: 'Avvio motore Tesseract OCR nel browser...',
    });

    // 2. Perform OCR using Tesseract.recognize
    const result = await Tesseract.recognize(processedImage, language, {
      logger: (m) => {
        if (options.onProgress && m) {
          const status = m.status || 'recognizing text';
          const progress = typeof m.progress === 'number' ? m.progress : 0.5;
          const pct = Math.round(progress * 100);

          let message = `Analisi caratteri Tesseract: ${pct}%`;
          if (status.includes('loading')) {
            message = `Caricamento dizionario OCR (${pct}%)...`;
          } else if (status.includes('recognizing')) {
            message = `Riconoscimento ottico Tesseract (${pct}%)...`;
          }

          options.onProgress({
            status,
            progress: Math.min(0.85, Math.max(0.2, progress)),
            message,
          });
        }
      },
    });

    const rawClean = this.cleanOcrText(result.data.text || '');
    const confidence =
      typeof result.data.confidence === 'number' ? Math.round(result.data.confidence) : 85;

    // Check if auto AI optimization is enabled
    if (options.autoOptimizeAi && rawClean.trim().length > 0) {
      options.onProgress?.({
        status: 'ai-optimizing',
        progress: 0.9,
        message: 'Ottimizzazione del testo e correzione refusi con Gemini AI...',
      });

      const optResult = await this.optimizeTextWithAi(
        rawClean,
        options.speechOptimized ? 'speech_tts' : 'comprehensive'
      );

      const wordsCount = optResult.text.split(/\s+/).filter(Boolean).length;
      const lines = optResult.text.split('\n').filter((l: string) => l.trim().length > 0);

      options.onProgress?.({
        status: 'done',
        progress: 1.0,
        message: 'OCR Tesseract completato e ottimizzato con AI!',
      });

      return {
        text: optResult.text,
        rawText: rawClean,
        confidence: optResult.isAi ? Math.min(99, confidence + 10) : confidence,
        wordsCount,
        lines,
        engine: optResult.isAi ? 'Tesseract + Gemini AI' : 'Tesseract OCR',
        isAiOptimized: optResult.isAi,
      };
    }

    const wordsCount = rawClean.split(/\s+/).filter(Boolean).length;
    const lines = rawClean.split('\n').filter((l) => l.trim().length > 0);

    options.onProgress?.({
      status: 'done',
      progress: 1.0,
      message: 'Riconoscimento OCR Tesseract completato!',
    });

    return {
      text: rawClean,
      rawText: rawClean,
      confidence,
      wordsCount,
      lines,
      engine: 'Tesseract OCR',
      isAiOptimized: false,
    };
  }

  /**
   * =========================================================================
   * METODO PRINCIPALE UNIFICATO DI SCANSIONE OCR
   * =========================================================================
   * 1. Se ENABLE_AI_OCR è abilitato (default):
   *    - Invia l'immagine elaborata a Gemini 3.8 Flash Vision (/api/ocr/vision).
   *    - In caso di problemi di rete o timeout, commuta automaticamente
   *      e in modo trasparente sul motore locale Tesseract.js.
   *
   * 2. Se ENABLE_AI_OCR è disabilitato (o commentato):
   *    - Esegue il riconoscimento 100% locale nel browser tramite Tesseract.js
   *      senza effettuare alcuna chiamata di rete esterna.
   * =========================================================================
   */
  public async recognize(
    imageSource: File | Blob | string,
    options: OcrOptions = {}
  ): Promise<OcrResult> {
    // Motore predefinito: Tesseract locale (Sistema AI OCR commentato/disattivato)
    const defaultEngine: OcrEngineMode = 'tesseract';
    const engine = options.engine || defaultEngine;

    /* -------------------------------------------------------------------------
     * [SISTEMA AI OCR (GEMINI VISION) COMMENTATO SU RICHIESTA DELL'UTENTE]
     * Il motore Gemini 3.8 Flash Vision multimodale per la scansione OCR è stato
     * commentato. Il flusso procede direttamente con il motore locale Tesseract.js.
     * Decommentare il blocco sottostante per ripristinare le chiamate cloud all'AI:
    if (ENABLE_AI_OCR && engine === 'ai-vision') {
      try {
        return await this.recognizeWithGeminiVision(imageSource, options);
      } catch (geminiErr: any) {
        console.warn('Gemini Vision OCR non disponibile, fallback automatico a Tesseract:', geminiErr);
        options.onProgress?.({
          status: 'fallback-tesseract',
          progress: 0.25,
          message: 'Passaggio al motore locale Tesseract...',
        });
        return await this.recognizeWithTesseract(imageSource, {
          ...options,
          autoOptimizeAi: false,
        });
      }
    }
    ------------------------------------------------------------------------- */

    /* -------------------------------------------------------------------------
     * [OCR TESSERACT LOCALE]: MOTORE DI RICONOSCIMENTO ATTIVO (OFFLINE)
     * Riconoscimento ottico dei caratteri ad alta risoluzione eseguito interamente
     * nel browser via WebAssembly (Tesseract.js), senza inviare immagini all'esterno.
     * ------------------------------------------------------------------------- */
    return await this.recognizeWithTesseract(imageSource, {
      ...options,
      autoOptimizeAi: false,
    });
  }
}

export const tesseractOcr = new TesseractOcrService();
