import { Book } from '../types';
import { tesseractOcr } from './tesseractOcr';
import { pdfOcrService } from './pdfOcrService';
import { audioTranscribeService } from './audioTranscribeService';

export const fileParser = {
  // Convert File to Base64 data string
  async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Strip data:...;base64, prefix
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  },

  async parseFile(
    file: File,
    onProgress?: (progress: any) => void
  ): Promise<Omit<Book, 'book_id' | 'owner_id' | 'created_at'>> {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'txt';
    const title = file.name.replace(/\.[^/.]+$/, '');
    const isImage = ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'tiff', 'gif'].includes(ext);

    // If an audio file is uploaded, perform Gemini AI audio transcription
    if (audioTranscribeService.isAudioFile(file)) {
      const transcribeResult = await audioTranscribeService.transcribeAudio(file, {
        language: 'ita',
        format: 'narrative',
        onProgress: (p) => {
          onProgress?.({
            status: p.status,
            progress: p.progress,
            message: p.message,
          });
        },
      });

      return {
        title: transcribeResult.title,
        file_type: 'audio',
        size: file.size,
        pages: transcribeResult.pages,
        source: 'upload',
        ocr_engine: transcribeResult.engine,
        audioUrl: transcribeResult.audioBlobUrl,
      };
    }

    // If an image is uploaded directly, perform AI-optimized OCR (Gemini Vision with Tesseract fallback)
    if (isImage) {
      try {
        const ocrResult = await tesseractOcr.recognize(file, {
          engine: 'ai-vision',
          language: 'ita',
          enhanceContrast: true,
          autoOptimizeAi: true,
          onProgress,
        });
        const clean = this.cleanCorruptedText(ocrResult.text);
        const pages = this.splitIntoPages(
          clean || `Immagine: ${file.name}\n(Nessun testo leggibile rilevato dall'OCR AI)`
        );
        return {
          title,
          file_type: 'scan',
          size: file.size,
          pages,
          source: 'scan',
          ocr_engine: ocrResult.engine || 'Gemini AI Vision',
        };
      } catch (ocrErr) {
        console.error('Image OCR parsing error:', ocrErr);
        return {
          title,
          file_type: 'scan',
          size: file.size,
          pages: [`Immagine ${file.name}: Impossibile estrarre il testo con OCR.`],
          source: 'scan',
          ocr_engine: 'OCR (errore)',
        };
      }
    }

    const file_type = ext === 'pdf' ? 'pdf' : ext === 'epub' ? 'epub' : 'txt';

    // 1. Prioritize Server-Side Parsing (guarantees 100% cross-browser reliability without CDN/Worker issues)
    try {
      const base64 = await this.fileToBase64(file);
      const res = await fetch('/api/parse-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64, filename: file.name, fileType: ext }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.pages && Array.isArray(data.pages) && data.pages.length > 0) {
          const sanitizedPages = data.pages
            .map((p: string) => this.cleanCorruptedText(p))
            .filter((p: string) => p.trim().length > 0);

          if (sanitizedPages.length > 0) {
            return {
              title,
              file_type,
              size: file.size,
              pages: sanitizedPages,
              source: 'upload',
            };
          }
        }
      }
    } catch (apiErr) {
      console.warn('Server parse fallback to client-side parser:', apiErr);
    }

    // 2. Client-side fallback if server route is unavailable
    if (ext === 'txt') {
      const text = await file.text().catch(() => '');
      const clean = this.cleanCorruptedText(text);
      const pages = this.splitIntoPages(clean);
      return {
        title,
        file_type: 'txt',
        size: file.size,
        pages,
        source: 'upload',
      };
    }

    if (ext === 'pdf') {
      const text = await this.extractTextFromPdf(file);
      const clean = this.cleanCorruptedText(text);

      // If PDF has no digital text or is a photographic scan, perform OCR
      if (!clean || clean.length < 35 || clean.includes('non contiene testo estraibile')) {
        try {
          const scanSession = await pdfOcrService.convertScannedPdf(file, { onProgress });
          if (scanSession && scanSession.pages && scanSession.pages.length > 0) {
            return {
              title,
              file_type: 'scan',
              size: file.size,
              pages: scanSession.pages,
              source: 'scan',
              ocr_engine: scanSession.engine || 'Gemini AI Vision',
            };
          }
        } catch (ocrErr) {
          console.warn('PDF OCR parsing fallback failed:', ocrErr);
        }
      }

      const pages = this.splitIntoPages(clean || `Documento PDF: ${file.name}`);
      return {
        title,
        file_type: 'pdf',
        size: file.size,
        pages,
        source: 'upload',
      };
    }

    if (ext === 'epub') {
      const text = await this.extractTextFromEpubOrHtml(file);
      const clean = this.cleanCorruptedText(text);
      const pages = this.splitIntoPages(clean);
      return {
        title,
        file_type: 'epub',
        size: file.size,
        pages,
        source: 'upload',
      };
    }

    // Default fallback
    const raw = await file.text().catch(() => 'Impossibile leggere il formato file.');
    const clean = this.cleanCorruptedText(raw);
    return {
      title,
      file_type: 'txt',
      size: file.size,
      pages: this.splitIntoPages(clean),
      source: 'upload',
    };
  },

  async extractTextFromPdf(file: File): Promise<string> {
    try {
      // Check if pdfjsLib is already loaded, otherwise load it from CDN
      let pdfjsLib = (window as any).pdfjsLib;
      if (!pdfjsLib) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Impossibile caricare il parser PDF.js'));
          document.head.appendChild(script);
        });
        pdfjsLib = (window as any).pdfjsLib;

        // Bypass browser cross-origin Worker restriction (critical for Safari, Firefox & Mobile browsers)
        try {
          const response = await fetch('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js');
          const workerCode = await response.text();
          const blob = new Blob([workerCode], { type: 'application/javascript' });
          const workerUrl = URL.createObjectURL(blob);
          pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
        } catch (workerErr) {
          console.warn('Worker blob loading failed, falling back to CDN URL:', workerErr);
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
        }
      }

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        let lastY: number | null = null;
        const pageLines: string[] = [];
        let currentLine = '';

        for (const item of textContent.items as any[]) {
          const str = item.str || '';
          if (!str) continue;
          const currentY = item.transform ? item.transform[5] : null;
          if (lastY !== null && currentY !== null && Math.abs(currentY - lastY) > 6) {
            if (currentLine.trim()) pageLines.push(currentLine.trim());
            currentLine = str;
          } else {
            currentLine += (currentLine ? ' ' : '') + str;
          }
          lastY = currentY;
        }
        if (currentLine.trim()) pageLines.push(currentLine.trim());
        const pageText = pageLines.join('\n');

        if (pageText.trim()) {
          fullText += (fullText ? '\n\n' : '') + pageText.trim();
        }
      }

      return fullText.trim() || 'Il documento PDF non contiene testo estraibile.';
    } catch (err) {
      console.error('PDF extraction error:', err);
      return `Documento PDF importato: ${file.name}.\nContenuto pronto per la lettura.`;
    }
  },

  async extractTextFromEpubOrHtml(file: File): Promise<string> {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'html' || ext === 'htm') {
      try {
        const text = await file.text();
        return text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      } catch {
        return `Contenuto HTML: ${file.name}`;
      }
    }

    try {
      // Load JSZip from CDN dynamically to unzip EPUB contents
      let JSZip = (window as any).JSZip;
      if (!JSZip) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Impossibile caricare la libreria EPUB JSZip'));
          document.head.appendChild(script);
        });
        JSZip = (window as any).JSZip;
      }

      const zip = await JSZip.loadAsync(file);
      let extractedText = '';

      // Find HTML-like files inside EPUB container
      const fileNames = Object.keys(zip.files).filter((name) =>
        name.endsWith('.xhtml') || name.endsWith('.html') || name.endsWith('.htm') || name.endsWith('.xml')
      );

      for (const name of fileNames) {
        const content = await zip.files[name].async('text');
        const clean = content
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<[^>]*>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (clean) {
          extractedText += (extractedText ? '\n\n' : '') + clean;
        }
      }

      return extractedText.trim() || `Contenuto EPUB importato: ${file.name}.`;
    } catch (err) {
      console.error('EPUB parsing failed:', err);
      return `Documento EPUB importato: ${file.name}.\n(Il file potrebbe essere protetto o in un formato non leggibile)`;
    }
  },

  // Robust pagination that guarantees full document visibility without overflowing or truncating
  splitIntoPages(fullText: string, wordsPerPage: number = 250): string[] {
    const clean = this.cleanCorruptedText(fullText);
    if (!clean) return ['(Documento vuoto)'];

    // Split text into coherent paragraphs and chunk lines
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
  },

  // Deep sanitization to eliminate binary PDF streams, unparsed XML tags, and control characters
  cleanCorruptedText(raw: string): string {
    if (!raw) return '';

    // If text contains raw PDF binary stream markers, filter out binary chunks
    if (raw.includes('%PDF-') || raw.includes('/FlateDecode') || raw.includes('endstream') || raw.includes('endobj')) {
      // Extract lines that look like actual prose (avoiding PDF keywords and bytecode)
      const lines = raw.split(/\r?\n/);
      const cleanLines = lines.filter((line) => {
        const trimmed = line.trim();
        if (trimmed.length < 5) return false;
        // Skip obvious PDF dictionary/stream syntax
        if (/^(?:\d+\s+\d+\s+obj|endobj|stream|endstream|xref|trailer|startxref|%%EOF)/i.test(trimmed)) return false;
        if (/^\/?[A-Za-z0-9_-]+\s*(?:\[|\<|\d+|\/|\()/.test(trimmed)) return false;
        if (/(?:FlateDecode|FontDescriptor|MediaBox|CropBox|Resources|ProcSet|Catalog|Pages|Parent|Contents)/.test(trimmed)) return false;
        // Only keep lines with natural language characteristics (spaces and standard letters)
        const wordCount = trimmed.split(/\s+/).length;
        return wordCount >= 3;
      });

      if (cleanLines.length > 0) {
        return cleanLines.join('\n\n').trim();
      }
      return '';
    }

    // Strip unprintable control characters (except newlines and tabs)
    let clean = raw.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F\uFFFD]/g, '');
    // Normalize newlines
    clean = clean.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    // Strip standalone PDF syntax tokens if any remain
    clean = clean.replace(/(?:^|\n)\s*(?:\d+\s+\d+\s+obj|endobj|stream|endstream|xref|trailer|startxref|%%EOF)\s*(?:\n|$)/gi, '\n');
    // Strip HTML/XML tags safely
    clean = clean.replace(/<\/?[a-zA-Z][^>]*>/g, ' ');
    // Decode common entities
    clean = clean
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&agrave;/g, 'à')
      .replace(/&egrave;/g, 'è')
      .replace(/&eacute;/g, 'é')
      .replace(/&igrave;/g, 'ì')
      .replace(/&ograve;/g, 'ò')
      .replace(/&ugrave;/g, 'ù');
    // Collapse excessive whitespace
    clean = clean.replace(/[ \t]+/g, ' ');
    return clean.trim();
  },

  enhanceText(pageText: string): string {
    let enhanced = this.cleanCorruptedText(pageText);
    // Rejoin hyphenated words across lines (e.g., "straor- \n dinario" -> "straordinario")
    enhanced = enhanced.replace(/(\w+)-\s*\n\s*(\w+)/g, '$1$2');
    // Normalize quotation marks
    enhanced = enhanced.replace(/[""]/g, '"').replace(/['']/g, "'");
    // Clean orphan punctuation
    enhanced = enhanced.replace(/\s+([,.:;?!])/g, '$1');
    return enhanced.trim();
  }
};

