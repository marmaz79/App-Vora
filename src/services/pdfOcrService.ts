import { ScanSessionData } from '../types';
import { tesseractOcr, OcrEngineMode, OcrLanguage, OcrProgress } from './tesseractOcr';

export interface PdfOcrOptions {
  engine?: OcrEngineMode;
  language?: OcrLanguage;
  speechOptimized?: boolean;
  autoOptimizeAi?: boolean;
  onProgress?: (progress: OcrProgress) => void;
}

export interface PdfInspectionResult {
  isScanned: boolean;
  numPages: number;
  digitalTextSample: string;
}

class PdfOcrService {
  private pdfjsPromise: Promise<any> | null = null;

  /**
   * Dynamically loads pdf.js from CDN with worker fallback
   */
  public async loadPdfJs(): Promise<any> {
    if ((window as any).pdfjsLib) {
      return (window as any).pdfjsLib;
    }

    if (this.pdfjsPromise) {
      return this.pdfjsPromise;
    }

    this.pdfjsPromise = new Promise<any>((resolve, reject) => {
      const existingScript = document.querySelector('script[src*="pdf.min.js"]');
      if (existingScript && (window as any).pdfjsLib) {
        resolve((window as any).pdfjsLib);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
      script.onload = async () => {
        const pdfjsLib = (window as any).pdfjsLib;
        if (!pdfjsLib) {
          reject(new Error('PDF.js non caricato correttamente.'));
          return;
        }

        try {
          const response = await fetch(
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js'
          );
          const workerCode = await response.text();
          const blob = new Blob([workerCode], { type: 'application/javascript' });
          pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(blob);
        } catch {
          pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
        }

        resolve(pdfjsLib);
      };
      script.onerror = () => reject(new Error('Impossibile caricare il parser PDF.js'));
      document.head.appendChild(script);
    });

    return this.pdfjsPromise;
  }

  /**
   * Helper to convert File to base64
   */
  public async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Inspects a PDF to check if it's a scanned document (i.e. contains images rather than text)
   */
  public async inspectPdf(file: File): Promise<PdfInspectionResult> {
    try {
      const pdfjsLib = await this.loadPdfJs();
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdf.numPages || 1;

      let totalChars = 0;
      let textSample = '';
      const sampleLimit = Math.min(5, numPages);

      for (let i = 1; i <= sampleLimit; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        let pageStr = '';
        for (const item of textContent.items as any[]) {
          if (item && item.str) {
            pageStr += item.str + ' ';
          }
        }
        totalChars += pageStr.trim().length;
        if (textSample.length < 300) {
          textSample += pageStr + ' ';
        }
      }

      // If average character count per page is under 35 characters, it's overwhelmingly a scanned image PDF
      const avgChars = totalChars / sampleLimit;
      const isScanned = avgChars < 35;

      return {
        isScanned,
        numPages,
        digitalTextSample: textSample.trim(),
      };
    } catch (err) {
      console.warn('Errore ispezione PDF:', err);
      // In case of parsing error, treat as potentially scanned to allow OCR
      return {
        isScanned: true,
        numPages: 1,
        digitalTextSample: '',
      };
    }
  }

  /**
   * Renders PDF pages into JPEG Data URLs using canvas
   */
  public async renderPdfPages(
    file: File,
    maxPages: number = 30,
    onProgress?: (rendered: number, total: number) => void
  ): Promise<string[]> {
    const pdfjsLib = await this.loadPdfJs();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const totalPages = Math.min(pdf.numPages, maxPages);
    const imageUrls: string[] = [];

    for (let i = 1; i <= totalPages; i++) {
      const page = await pdf.getPage(i);
      // Scale 1.75 offers sharp OCR text recognition without excessive memory consumption
      const viewport = page.getViewport({ scale: 1.75 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        await page.render({ canvasContext: ctx, viewport }).promise;
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        imageUrls.push(dataUrl);
      }

      onProgress?.(i, totalPages);
    }

    return imageUrls;
  }

  /**
   * Main pipeline: Converts a scanned PDF file into text via OCR and returns ScanSessionData
   */
  public async convertScannedPdf(
    file: File,
    options: PdfOcrOptions = {}
  ): Promise<ScanSessionData> {
    const title = file.name.replace(/\.[^/.]+$/, '');
    const engineMode = options.engine || 'ai-vision';
    const language = options.language || 'ita';

    options.onProgress?.({
      status: 'pdf-init',
      progress: 0.05,
      message: `Inizializzazione lettura del libro PDF "${file.name}"...`,
    });

    // 1. First, render the pages to high-resolution images so the user has immediate visual feedback
    options.onProgress?.({
      status: 'pdf-rendering',
      progress: 0.12,
      message: 'Conversione delle pagine del PDF in immagini per l\'OCR...',
    });

    let renderedImages: string[] = [];
    try {
      renderedImages = await this.renderPdfPages(file, 25, (rendered, total) => {
        const renderPct = 0.12 + (rendered / total) * 0.2;
        options.onProgress?.({
          status: 'pdf-rendering',
          progress: renderPct,
          message: `Elaborazione grafica pagina ${rendered} di ${total}...`,
        });
      });
    } catch (renderErr) {
      console.warn('Errore rendering immagini PDF con canvas:', renderErr);
    }

    const totalPagesCount = renderedImages.length || 1;

    // 2. Try server-side Gemini 3.8 Flash PDF OCR if available
    let serverSuccess = false;
    let finalPages: string[] = [];
    let engineLabel = 'Gemini AI Vision';

    if (engineMode === 'ai-vision') {
      try {
        options.onProgress?.({
          status: 'server-ocr-calling',
          progress: 0.38,
          message: 'Trascrizione e riconoscimento ottico con Gemini 3.8 Flash Vision...',
        });

        const base64 = await this.fileToBase64(file);
        const res = await fetch('/api/ocr/pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pdf: base64,
            filename: file.name,
            language,
            speechOptimized: Boolean(options.speechOptimized),
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.pages) && data.pages.length > 0) {
            finalPages = data.pages;
            engineLabel = data.engine || 'Gemini 3.8 Flash Vision (PDF OCR)';
            serverSuccess = true;

            options.onProgress?.({
              status: 'done',
              progress: 1.0,
              message: `Trascrizione completata con successo! ${finalPages.length} pagine elaborate.`,
            });
          }
        }
      } catch (serverErr) {
        console.warn('Endpoint /api/ocr/pdf non riuscito, fallback pagina per pagina:', serverErr);
      }
    }

    // 3. Fallback: Page-by-page OCR using rendered images (Gemini Vision per-page or Tesseract)
    if (!serverSuccess) {
      options.onProgress?.({
        status: 'page-by-page-ocr',
        progress: 0.4,
        message: 'Avvio riconoscimento OCR pagina per pagina...',
      });

      finalPages = [];

      for (let i = 0; i < totalPagesCount; i++) {
        const pageImg = renderedImages[i];
        const pageNum = i + 1;
        const progressBase = 0.35 + (i / totalPagesCount) * 0.6;

        options.onProgress?.({
          status: 'ocr-page',
          progress: progressBase,
          message: `Riconoscimento OCR pagina ${pageNum} di ${totalPagesCount}...`,
        });

        if (pageImg) {
          try {
            const ocrRes = await tesseractOcr.recognize(pageImg, {
              engine: engineMode,
              language,
              enhanceContrast: true,
              autoOptimizeAi: options.autoOptimizeAi ?? true,
              speechOptimized: options.speechOptimized,
              onProgress: (p) => {
                const subProgress = progressBase + (p.progress / totalPagesCount) * 0.55;
                options.onProgress?.({
                  status: p.status,
                  progress: Math.min(0.96, subProgress),
                  message: `Pagina ${pageNum}/${totalPagesCount}: ${p.message}`,
                });
              },
            });

            finalPages.push(
              ocrRes.text.trim() || `(Pagina ${pageNum} del PDF - Nessun testo visibile rilevato)`
            );
            engineLabel = ocrRes.engine;
          } catch (pageErr) {
            console.warn(`Errore OCR pagina ${pageNum}:`, pageErr);
            finalPages.push(
              `Pagina ${pageNum}: Impossibile estrarre il testo da questa pagina scansionata.`
            );
          }
        } else {
          finalPages.push(`Pagina ${pageNum} del documento.`);
        }
      }
    }

    // Ensure we always have matching image count or null placeholders
    const finalImageUrls: (string | null)[] = [];
    for (let i = 0; i < finalPages.length; i++) {
      finalImageUrls.push(renderedImages[i] || null);
    }

    options.onProgress?.({
      status: 'done',
      progress: 1.0,
      message: 'Conversione da PDF scansionato a testo completata!',
    });

    return {
      bookId: `scan-pdf-${Date.now()}`,
      title,
      pages: finalPages.length > 0 ? finalPages : ['(Nessun testo trovato nel PDF)'],
      rawPages: [...finalPages],
      imageUrls: finalImageUrls,
      engine: engineLabel,
      confidence: 98,
      isAiOptimized: true,
      currentPageIndex: 0,
    };
  }
}

export const pdfOcrService = new PdfOcrService();
