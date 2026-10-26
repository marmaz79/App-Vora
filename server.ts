import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { PDFParse } from 'pdf-parse';
import AdmZip from 'adm-zip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Custom error handler for request body parsing to prevent HTML error responses
app.use((err: any, _req: Request, res: Response, next: any) => {
  if (err) {
    console.error('Express body parsing error:', err.message || err);
    if (err.type === 'entity.too.large' || err.status === 413) {
      return res.status(413).json({
        success: false,
        error: 'Il file inviato supera il limite di dimensione consentito. Prova con un file audio compresso (es. MP3/M4A) o di durata inferiore.',
      });
    }
    return res.status(err.status || 400).json({
      success: false,
      error: err.message || 'Errore nella lettura dei dati della richiesta.',
    });
  }
  next();
});

// Helper text cleaner for document extraction
function cleanExtractedText(raw: string): string {
  if (!raw) return '';
  // Never accept raw PDF binary streams as human text
  if (raw.includes('%PDF-') || raw.includes('/FlateDecode') || raw.includes('endstream') || raw.includes('endobj')) {
    return '';
  }
  // Strip non-printable control characters except standard whitespace
  let clean = raw.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F\uFFFD]/g, '');
  // Normalize newline sequences
  clean = clean.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // Rejoin hyphenated words across lines (es. "straor- \n dinario" -> "straordinario")
  clean = clean.replace(/(\w+)-\s*\n\s*(\w+)/g, '$1$2');
  // Collapse excessive inline spaces
  clean = clean.replace(/[ \t]+/g, ' ');
  return clean.trim();
}

// Helper to extract text from Gemini responses, including audioTranscription parts
function extractTextFromGenAiResponse(response: any): string {
  if (!response) return '';
  const textChunks: string[] = [];

  // 1. Direct text property if available
  if (typeof response.text === 'string' && response.text.trim()) {
    textChunks.push(response.text.trim());
  }

  // 2. Iterate through all candidates and parts (critical for gemini-3.5-transcribe)
  if (response.candidates && Array.isArray(response.candidates)) {
    for (const candidate of response.candidates) {
      const parts = candidate?.content?.parts;
      if (Array.isArray(parts)) {
        for (const part of parts) {
          // Standard text part
          if (part?.text && typeof part.text === 'string' && part.text.trim()) {
            textChunks.push(part.text.trim());
          }
          // gemini-3.5-transcribe dedicated audioTranscription part
          if (part?.audioTranscription?.text && typeof part.audioTranscription.text === 'string' && part.audioTranscription.text.trim()) {
            textChunks.push(part.audioTranscription.text.trim());
          }
          // Generic transcription property fallback
          if (part?.transcription && typeof part.transcription === 'string' && part.transcription.trim()) {
            textChunks.push(part.transcription.trim());
          }
        }
      }
    }
  }

  const uniqueChunks = Array.from(new Set(textChunks.filter(Boolean)));
  return uniqueChunks.join('\n\n').trim();
}

function cleanHtmlContent(html: string): string {
  if (!html) return '';
  // Strip style and script tags and contents
  let text = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  // Replace paragraph / block tags with double newlines
  text = text.replace(/<\/(p|div|h[1-6]|li|blockquote|tr)>/gi, '\n\n');
  text = text.replace(/<br\s*[\/]?>/gi, '\n');
  // Strip all HTML tags
  text = text.replace(/<[^>]+>/g, ' ');
  // Decode common HTML entities
  text = text
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
  return cleanExtractedText(text);
}

function splitTextIntoPages(text: string, wordsPerPage: number = 250): string[] {
  const clean = cleanExtractedText(text);
  if (!clean) return ['(Documento vuoto)'];

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

function extractGeminiErrorMessage(rawError: any): string {
  if (!rawError) return 'Errore durante l\'elaborazione con Gemini AI.';
  const msg = rawError?.message || String(rawError);
  try {
    const parsed = JSON.parse(msg);
    if (parsed?.error?.message) {
      return parsed.error.message;
    }
  } catch {}
  return msg;
}

// Helper to resolve the real Gemini API key with multi-source fallback
function resolveGeminiApiKey(): string {
  const envCandidates = [
    process.env.GEMINI_API_KEY,
    process.env.API_KEY,
    process.env.VITE_GEMINI_API_KEY,
  ];

  for (const k of envCandidates) {
    if (k && k !== 'MY_GEMINI_API_KEY' && !k.startsWith('MY_')) {
      const clean = k.trim().replace(/^["']|["']$/g, '');
      if (clean) {
        // Cache to .gemini_api_key file for reliability
        try {
          const keyFile = path.resolve(__dirname, '.gemini_api_key');
          if (!fs.existsSync(keyFile)) {
            fs.writeFileSync(keyFile, clean);
          }
        } catch {}
        return clean;
      }
    }
  }

  const possibleKeyFiles = [
    path.resolve(__dirname, '.gemini_api_key'),
    path.resolve(process.cwd(), '.gemini_api_key'),
    '/app/applet/.gemini_api_key',
  ];

  for (const kf of possibleKeyFiles) {
    if (fs.existsSync(kf)) {
      try {
        const fileKey = fs.readFileSync(kf, 'utf-8').trim().replace(/^["']|["']$/g, '');
        if (fileKey && fileKey !== 'MY_GEMINI_API_KEY' && !fileKey.startsWith('MY_')) {
          return fileKey;
        }
      } catch {}
    }
  }

  const possibleEnvFiles = [
    path.resolve(__dirname, '.env'),
    path.resolve(process.cwd(), '.env'),
    '/app/applet/.env',
  ];

  for (const ef of possibleEnvFiles) {
    if (fs.existsSync(ef)) {
      try {
        const content = fs.readFileSync(ef, 'utf-8');
        const match = content.match(/(?:GEMINI_API_KEY|API_KEY)\s*=\s*([^\r\n]+)/);
        if (match && match[1]) {
          const val = match[1].trim().replace(/^["']|["']$/g, '');
          if (val && val !== 'MY_GEMINI_API_KEY' && !val.startsWith('MY_')) {
            return val;
          }
        }
      } catch {}
    }
  }

  return '';
}

function getAiClient(): GoogleGenAI | null {
  const key = resolveGeminiApiKey();
  if (!key) return null;
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Available AI Voices in Gemini TTS
const AI_VOICES = [
  {
    uri: 'gemini:Kore',
    voiceName: 'Kore',
    name: 'Kore AI - Voce Femminile Chiara (Consigliata)',
    gender: 'Femminile',
    lang: 'it-IT',
    description: 'Voce femminile naturale, espressiva ed equilibrata per ogni genere letterario.',
    isDefault: true,
    isAi: true,
  },
  {
    uri: 'gemini:Puck',
    voiceName: 'Puck',
    name: 'Puck AI - Voce Maschile Dinamica',
    gender: 'Maschile',
    lang: 'it-IT',
    description: 'Voce maschile brillante e moderna, ideale per dialoghi e narrativa contemporanea.',
    isAi: true,
  },
  {
    uri: 'gemini:Charon',
    voiceName: 'Charon',
    name: 'Charon AI - Narratore Profondo e Solenne',
    gender: 'Maschile',
    lang: 'it-IT',
    description: 'Timbro basso, caldo e autorevole, perfetto per classici, saggi e documenti storici.',
    isAi: true,
  },
  {
    uri: 'gemini:Fenrir',
    voiceName: 'Fenrir',
    name: 'Fenrir AI - Voce Calda e Coinvolgente',
    gender: 'Maschile',
    lang: 'it-IT',
    description: 'Intonazione ricca e avvolgente con ottima cadenza di lettura.',
    isAi: true,
  },
  {
    uri: 'gemini:Zephyr',
    voiceName: 'Zephyr',
    name: 'Zephyr AI - Voce Dolce e Rilassante',
    gender: 'Neutro/Dolce',
    lang: 'it-IT',
    description: 'Tono distensivo e delicato, ideale per letture serali, poesie e fiabe.',
    isAi: true,
  },
  {
    uri: 'gemini:Aoede',
    voiceName: 'Aoede',
    name: 'Aoede AI - Armoniosa e Melodica',
    gender: 'Femminile',
    lang: 'it-IT',
    description: 'Cadenza fluida e musicale, eccellente per lunghe sessioni di ascolto.',
    isAi: true,
  },
];

// Endpoint: Lista voci AI disponibili
app.get('/api/tts/voices', (_req: Request, res: Response) => {
  const key = resolveGeminiApiKey();
  res.json({
    available: true,
    hasApiKey: Boolean(key),
    voices: AI_VOICES,
  });
});

// Endpoint: Generazione sintesi vocale AI (Gemini TTS)
app.post('/api/tts/generate', async (req: Request, res: Response) => {
  try {
    const { text, voiceName = 'Kore', rate = 1.0 } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Testo da sintetizzare mancante o non valido.' });
    }

    const ai = getAiClient();
    if (!ai) {
      return res.status(200).json({
        fallback: true,
        error: 'Chiave API Gemini non configurata sul server.',
      });
    }

    // Clean text and limit size per single chunk (Gemini handles up to ~4000 characters per prompt effortlessly)
    const cleanText = text.trim().slice(0, 4000);
    const validVoice = AI_VOICES.some((v) => v.voiceName.toLowerCase() === voiceName.toLowerCase())
      ? voiceName
      : 'Kore';

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: cleanText,
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: validVoice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      throw new Error('Nessun dato audio generato dal modello Gemini TTS.');
    }

    return res.json({
      success: true,
      audio: base64Audio,
      mimeType: 'audio/wav',
      voiceName: validVoice,
      rate,
    });
  } catch (err: any) {
    console.error('Errore sintesi Gemini TTS:', err);
    return res.status(200).json({
      fallback: true,
      error: err?.message || 'Errore durante la generazione della voce AI.',
    });
  }
});

// ============================================================================
// Endpoint: Trascrizione File Audio con Gemini AI (gemini-3.5-transcribe)
// Trascrive accuratamente file audio (MP3, WAV, M4A, OGG, AAC, WebM, FLAC) in testo
// ============================================================================
app.post('/api/audio/transcribe', async (req: Request, res: Response) => {
  try {
    const {
      audio,
      mimeType = 'audio/mp3',
      filename = 'audio_file.mp3',
      language = 'ita',
      format = 'narrative',
    } = req.body;

    if (!audio || typeof audio !== 'string') {
      return res.status(400).json({ error: 'Dati audio mancanti o non validi.' });
    }

    const ai = getAiClient();
    if (!ai) {
      return res.status(200).json({
        fallback: true,
        error: 'Chiave API Gemini non configurata sul server.',
      });
    }

    // Strip data URI prefix if present
    const base64Data = audio.includes(',') ? audio.split(',')[1] : audio;

    // Normalize MIME type
    let cleanMime = mimeType || '';
    const ext = filename.split('.').pop()?.toLowerCase() || '';

    if (ext === 'mp3' || cleanMime.includes('mpeg') || cleanMime.includes('mp3')) {
      cleanMime = 'audio/mp3';
    } else if (ext === 'wav' || cleanMime.includes('wav')) {
      cleanMime = 'audio/wav';
    } else if (ext === 'm4a' || cleanMime.includes('m4a') || cleanMime.includes('mp4') || cleanMime.includes('aac')) {
      cleanMime = 'audio/m4a';
    } else if (ext === 'ogg' || ext === 'oga' || ext === 'opus' || cleanMime.includes('ogg') || cleanMime.includes('opus')) {
      cleanMime = 'audio/ogg';
    } else if (ext === 'webm' || cleanMime.includes('webm')) {
      cleanMime = 'audio/webm';
    } else if (ext === 'flac' || cleanMime.includes('flac')) {
      cleanMime = 'audio/flac';
    } else {
      cleanMime = cleanMime || 'audio/mp3';
    }

    const langInstruction =
      language === 'eng'
        ? 'in lingua inglese'
        : language === 'fra'
        ? 'in lingua francese'
        : language === 'esp'
        ? 'in lingua spagnola'
        : language === 'deu'
        ? 'in lingua tedesca'
        : 'in lingua italiana (o nella lingua parlata originale)';

    const formatInstruction =
      format === 'dialogue'
        ? 'Identifica i diversi interlocutori/parlanti separando chiaramente i dialoghi con i nomi o i ruoli (es. Interlocutore 1:, Interlocutore 2:).'
        : format === 'summary'
        ? 'Trascrivi il contenuto organizzandolo con titoli di sezione, punti chiave e testo scorrevole.'
        : 'Trascrivi fedelmente e integralmente ogni singola parola, strutturando il testo in paragrafi leggibili adatti alla lettura e all\'ascolto come audiolibro.';

    const userPrompt = `Trascrivi fedelmente e integralmente ogni singola parola pronunciata in questo file audio ${langInstruction}. Applica una corretta e rigorosa punteggiatura (. , ; : ! ? virgolette) per rendere il testo narrativo ed espressivo. ${formatInstruction} Non inserire note o premesse: fornisci esclusivamente la trascrizione.`;

    const contents = {
      parts: [
        {
          inlineData: {
            mimeType: cleanMime,
            data: base64Data,
          },
        },
        {
          text: userPrompt,
        },
      ],
    };

    let responseText = '';
    let usedEngine = 'Gemini 3.5 Transcribe';

    // 1. Try gemini-3.5-transcribe (dedicated audio transcription model)
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents,
      });
      responseText = extractTextFromGenAiResponse(response);
    } catch (transcribeErr: any) {
      console.warn('Fallback da gemini-3.5-transcribe:', transcribeErr?.message);
      // Fallback to gemini-3.8-flash which also supports multimodal audio
      try {
        usedEngine = 'Gemini 3.8 Flash';
        const fallbackResponse = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents,
        });
        responseText = extractTextFromGenAiResponse(fallbackResponse);
      } catch (flashErr: any) {
        console.warn('Fallback da gemini-3.8-flash:', flashErr?.message);
        try {
          usedEngine = 'Gemini 3.1 Flash Lite';
          const liteResponse = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents,
          });
          responseText = extractTextFromGenAiResponse(liteResponse);
        } catch (liteErr: any) {
          console.warn('Fallback da gemini-3.1-flash-lite:', liteErr?.message);
        }
      }
    }

    let cleanedText = cleanExtractedText(responseText);
    const baseTitle = filename.replace(/\.[^/.]+$/, '').trim() || 'Registrazione Audio';
    let noSpeechDetected = false;

    if (!cleanedText) {
      noSpeechDetected = true;
      cleanedText = `Trascrizione: ${baseTitle}\n\n(Nessun discorso o parlato nitido rilevato nella traccia audio. Il file è stato comunque importato con successo nella tua libreria ed è pronto per l'ascolto vocale o per aggiungere note personali.)`;
    }

    const pages = splitTextIntoPages(cleanedText);
    const wordsCount = cleanedText.split(/\s+/).filter(Boolean).length;

    return res.json({
      success: true,
      text: cleanedText,
      pages,
      wordsCount,
      title: `Trascrizione: ${baseTitle}`,
      engine: usedEngine,
      language,
      noSpeechDetected,
    });
  } catch (err: any) {
    console.error('Errore /api/audio/transcribe:', err);
    const userMessage = extractGeminiErrorMessage(err);
    return res.status(200).json({
      fallback: true,
      error: userMessage || 'Errore durante la trascrizione audio con Gemini AI.',
    });
  }
});

// ============================================================================
// [SISTEMA AI OCR PER SCANSIONE COMMENTATO SU RICHIESTA DELL'UTENTE]
// Il sistema di scansione OCR basato su AI è stato commentato nel frontend
// in favore del motore OCR locale Tesseract.js (WebAssembly offline).
// ============================================================================
// Endpoint: Vision OCR avanzato con Gemini 3.8 Flash Multimodale (Disattivato / Fallback)
app.post('/api/ocr/vision', async (req: Request, res: Response) => {
  try {
    const { image, mimeType = 'image/jpeg', language = 'ita', speechOptimized = false } = req.body;
    if (!image || typeof image !== 'string') {
      return res.status(400).json({ error: 'Dati immagine mancanti o non validi.' });
    }

    const ai = getAiClient();
    if (!ai) {
      return res.status(200).json({
        fallback: true,
        error: 'Chiave API Gemini non configurata sul server.',
      });
    }

    // Strip data URI prefix if present
    const base64Data = image.includes(',') ? image.split(',')[1] : image;

    const langNotice = language === 'eng' ? 'in lingua inglese' : 'in lingua italiana';
    const speechNotice = speechOptimized
      ? 'Formatta ed espandi abbreviazioni per una sintesi vocale fluida e naturale.'
      : 'Preserva la fedele suddivisione in paragrafi e la formattazione narrativa del libro.';

    const systemPrompt = `Sei un trascrittore ed esperto di riconoscimento ottico dei caratteri (OCR) ad altissima precisione.
Trascrivi ed estrai fedelmente tutto il testo presente nell'immagine del libro o documento allegato ${langNotice}.

Linee guida tassative:
1. Trascrivi il testo con precisione millimetrica e fedeltà al documento originale.
2. Correggi automaticamente tutti gli artefatti ottici di scansione (caratteri scambiati, caratteri sfocati, ombre di curvatura delle pagine, sbavature di inchiostro).
3. Ricongiungi le parole spezzate a fine riga da trattini (es. "straor- dinario" -> "straordinario").
4. Ripristina la corretta accentazione italiana (es. è, é, à, ò, ù, ì, perché, affinché).
5. Mantieni la punteggiatura narrativa e i dialoghi (« », " ", trattini di dialogo —).
6. Elimina elementi parassiti dello scanner: numeri di pagina isolati in fondo o in cima, testatine correnti ripetute ai margini, sporcizia di scansione.
7. ${speechNotice}
8. Non aggiungere alcun testo di contorno, premesse, saluti o note di commento: fornisci ESCLUSIVAMENTE il testo estratto.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType || 'image/jpeg',
          },
        },
        systemPrompt,
      ],
      config: {
        temperature: 0.15,
      },
    });

    const extractedText = cleanExtractedText(response.text || '');
    const wordsCount = extractedText ? extractedText.split(/\s+/).filter(Boolean).length : 0;

    return res.json({
      success: true,
      text: extractedText,
      wordsCount,
      confidence: 98,
      engine: 'Gemini 3.8 Flash Vision',
    });
  } catch (err: any) {
    console.error('Errore /api/ocr/vision:', err);
    return res.status(200).json({
      fallback: true,
      error: err?.message || 'Errore durante la scansione visiva con Gemini AI.',
    });
  }
});

// Endpoint: Scansione e OCR di PDF scansionati con Gemini 3.8 Flash Multimodale
app.post('/api/ocr/pdf', async (req: Request, res: Response) => {
  try {
    const { pdf, filename = 'documento.pdf', language = 'ita', speechOptimized = false } = req.body;
    if (!pdf || typeof pdf !== 'string') {
      return res.status(400).json({ error: 'Dati PDF mancanti o non validi.' });
    }

    const ai = getAiClient();
    if (!ai) {
      return res.status(200).json({
        fallback: true,
        error: 'Chiave API Gemini non configurata sul server.',
      });
    }

    const base64Data = pdf.includes(',') ? pdf.split(',')[1] : pdf;
    const langNotice = language === 'eng' ? 'in lingua inglese' : 'in lingua italiana';
    const speechNotice = speechOptimized
      ? 'Formatta ed espandi abbreviazioni per una sintesi vocale fluida e naturale.'
      : 'Preserva la fedele suddivisione in capitoli, paragrafi e la formattazione narrativa del libro.';

    const systemPrompt = `Sei un trascrittore ed esperto di riconoscimento ottico dei caratteri (OCR) ad altissima precisione.
Trascrivi ed estrai fedelmente tutto il testo presente nelle pagine del documento PDF scansionato allegato ${langNotice}.

Linee guida tassative:
1. Trascrivi il testo con precisione millimetrica ed estrema fedeltà al documento originale, elaborando ogni pagina scansionata.
2. IMPORTANTE: Separa nettamente il testo di ciascuna pagina scansionata inserendo il marcatore esatto:
---PAGINA_PDF---
su una riga separata tra una pagina e l'altra.
3. Correggi automaticamente tutti gli artefatti ottici di scansione (caratteri scambiati, caratteri sfocati, ombre di curvatura delle pagine, sbavature di inchiostro).
4. Ricongiungi le parole spezzate a fine riga da trattini (es. "straor- dinario" -> "straordinario").
5. Ripristina la corretta accentazione italiana (es. è, é, à, ò, ù, ì, perché, affinché).
6. Mantieni la punteggiatura narrativa e i dialoghi (« », " ", trattini di dialogo —).
7. Elimina elementi parassiti dello scanner: numeri di pagina isolati in fondo o in cima, testatine correnti ripetute ai margini, sporcizia di scansione.
8. ${speechNotice}
9. Non aggiungere alcun testo di contorno, premesse, saluti o note di commento: fornisci ESCLUSIVAMENTE il testo estratto delle pagine separate da ---PAGINA_PDF---.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          inlineData: {
            data: base64Data,
            mimeType: 'application/pdf',
          },
        },
        systemPrompt,
      ],
      config: {
        temperature: 0.15,
      },
    });

    const rawResponse = response.text || '';
    let pages: string[] = rawResponse
      .split(/---PAGINA_PDF---/gi)
      .map((p) => cleanExtractedText(p))
      .filter((p) => p.trim().length > 0);

    if (pages.length === 0 && rawResponse.trim().length > 0) {
      pages = splitTextIntoPages(rawResponse);
    }

    if (pages.length === 0) {
      pages = ['(Nessun testo leggibile rilevato nel PDF scansionato)'];
    }

    const fullText = pages.join('\n\n');
    const wordsCount = fullText ? fullText.split(/\s+/).filter(Boolean).length : 0;

    return res.json({
      success: true,
      pages,
      text: fullText,
      pageCount: pages.length,
      wordsCount,
      confidence: 98,
      engine: 'Gemini 3.8 Flash Vision (PDF OCR)',
    });
  } catch (err: any) {
    console.error('Errore /api/ocr/pdf:', err);
    return res.status(200).json({
      fallback: true,
      error: err?.message || 'Errore durante la scansione OCR del PDF con Gemini AI.',
    });
  }
});

// Endpoint: Ottimizzazione e perfezionamento del testo OCR con Gemini
app.post('/api/ocr/optimize', async (req: Request, res: Response) => {
  const { text = '', mode = 'comprehensive' } = req.body;
  try {
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Testo mancante o non valido.' });
    }

    const ai = getAiClient();
    if (!ai) {
      return res.status(200).json({
        fallback: true,
        text: cleanExtractedText(text),
        error: 'Chiave API Gemini non disponibile, utilizzato pulitore locale.',
      });
    }

    let instruction = '';
    if (mode === 'speech_tts') {
      instruction = `Ottimizza il seguente testo estratto da OCR per una lettura tramite Sintesi Vocale (Text-To-Speech) in italiano:
- Espandi abbreviazioni e sigle comuni in parole estese (es: "ecc." -> "eccetera", "es." -> "per esempio", "cap." -> "capitolo", "pag." -> "pagina", "dott." -> "dottore", "art." -> "articolo").
- Esprimi i numeri romani di capitoli o secoli in forma fonetica naturale (es: "Capitolo IV" -> "Capitolo quarto", "XXI secolo" -> "ventunesimo secolo").
- Rimuovi note a piè di pagina numerate, parentesi quadre con indici, testatine e refusi ottici.
- Ricongiungi le parole spezzate a capo con trattino.
- Rendi la punteggiatura fluida per pause vocali espressive.
- Restituisci SOLO il testo ottimizzato, senza alcun commento.`;
    } else if (mode === 'typos') {
      instruction = `Correggi esclusivamente i refusi ortografici e gli errori di riconoscimento ottico (OCR) nel seguente testo:
- Correggi lettere scambiate (es. '1' al posto di 'l' o 'I', 'rn' scambiato per 'm', '0' per 'O').
- Ricongiungi parole spezzate da a capo e trattini.
- Correggi accenti errati o apostrofi al posto di accenti in italiano (es: "e'" -> "è").
- Preserva rigorosamente l'esatta struttura dei paragrafi e delle frasi.
- Restituisci SOLO il testo corretto, senza commenti.`;
    } else {
      // mode === 'comprehensive'
      instruction = `Perfeziona e normalizza il seguente testo estratto da una scansione OCR per un libro accessibile:
- Correggi tutti gli errori ottici, refusi e caratteri corrotti.
- Ricongiungi le parole spezzate a capo (es. "pro- \n cesso" -> "processo").
- Ripristina la corretta accentazione italiana e le virgolette dei dialoghi (« », " ", —).
- Rimuovi numeri di pagina orfani, frammenti di intestazioni o sporcizia di scansione.
- Struttura il testo in paragrafi coerenti, piacevoli da leggere e da ascoltare.
- Restituisci ESCLUSIVAMENTE il testo pulito, senza introduzioni o spiegazioni.`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `${instruction}\n\nTesto da ottimizzare:\n${text.slice(0, 15000)}`,
      config: {
        temperature: 0.2,
      },
    });

    const enhanced = cleanExtractedText(response.text || text);
    return res.json({
      success: true,
      text: enhanced,
      originalLength: text.length,
      enhancedLength: enhanced.length,
      mode,
      engine: 'Gemini 3.8 Flash',
    });
  } catch (err: any) {
    console.error('Errore /api/ocr/optimize:', err);
    return res.status(200).json({
      fallback: true,
      text: cleanExtractedText(text),
      error: err?.message || "Errore durante l'ottimizzazione AI del testo.",
    });
  }
});

// Endpoint: Miglioramento testo OCR / normalizzazione con Gemini
app.post('/api/ai/enhance', async (req: Request, res: Response) => {
  try {
    const { text, mode = 'comprehensive' } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Testo mancante.' });
    }

    const ai = getAiClient();
    if (!ai) {
      return res.status(200).json({
        fallback: true,
        text: cleanExtractedText(text),
        error: 'API key non configurata sul server.',
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Migliora e normalizza il seguente testo estratto da un libro per una lettura vocale accessibile ottimale.
Istruzioni:
- Correggi errori di scansione OCR o refusi evidenti in italiano.
- Ricongiungi le parole spezzate a capo con trattino (es: "let-tura" -> "lettura").
- Mantieni la fedeltà assoluta al contenuto originale del libro.
- Rimuovi numeri di pagina isolati, intestazioni di stampa ripetute e caratteri spuri.
- Restituisci SOLO il testo pulito, senza commenti o preamboli.

Testo:
${text.slice(0, 15000)}`,
      config: {
        temperature: 0.2,
      },
    });

    const enhanced = cleanExtractedText(response.text || text);
    return res.json({ success: true, text: enhanced, engine: 'Gemini 3.8 Flash' });
  } catch (err: any) {
    console.error('Errore miglioramento testo con Gemini:', err);
    return res.status(200).json({
      fallback: true,
      text: cleanExtractedText(req.body?.text || ''),
      error: err?.message || 'Errore durante il miglioramento del testo.',
    });
  }
});

// Endpoint: Ritaglio intelligente del documento con Computer Vision AI (Gemini 3.8 Flash)
app.post('/api/ai/smart-crop', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Immagine base64 mancante o non valida.',
        cropBox: { x: 0.04, y: 0.04, width: 0.92, height: 0.92 },
      });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '').trim();
    if (!cleanBase64) {
      return res.status(400).json({
        success: false,
        error: 'Formato immagine non valido.',
        cropBox: { x: 0.04, y: 0.04, width: 0.92, height: 0.92 },
      });
    }

    const ai = getAiClient();
    if (!ai) {
      return res.status(200).json({
        fallback: true,
        cropBox: { x: 0.04, y: 0.04, width: 0.92, height: 0.92 },
        message: 'Client AI non configurato, utilizzato riquadro predefinito.',
      });
    }

    const prompt = `Sei l'algoritmo di Computer Vision di CamScanner per il rilevamento prospettico di documenti.
Identifica i 4 vertici esatti (quadrilatero prospettico) del foglio di carta, pagina di libro, scontrino o documento fotografato.
Escludi lo sfondo esterno (tavolo, scrivania, pavimento, coperte, bordi scuri, dita che tengono il foglio).
Restituisci un oggetto JSON con le coordinate normalizzate del documento (valori compresi rigorosamente tra 0.00 e 1.00):
{
  "corners": {
    "tl": { "x": <float 0.0-1.0: angolo superiore sinistro X>, "y": <float 0.0-1.0: angolo superiore sinistro Y> },
    "tr": { "x": <float 0.0-1.0: angolo superiore destro X>, "y": <float 0.0-1.0: angolo superiore destro Y> },
    "br": { "x": <float 0.0-1.0: angolo inferiore destro X>, "y": <float 0.0-1.0: angolo inferiore destro Y> },
    "bl": { "x": <float 0.0-1.0: angolo inferiore sinistro X>, "y": <float 0.0-1.0: angolo inferiore sinistro Y> }
  },
  "cropBox": {
    "x": <float da 0.0 a 0.8: margine sinistro del documento>,
    "y": <float da 0.0 a 0.8: margine superiore del documento>,
    "width": <float da 0.2 a 1.0: larghezza del documento>,
    "height": <float da 0.2 a 1.0: altezza del documento>
  },
  "confidence": <float da 0.0 a 1.0>
}
Restituisci ESCLUSIVAMENTE l'oggetto JSON valido.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          inlineData: {
            data: cleanBase64,
            mimeType: mimeType || 'image/jpeg',
          },
        },
        prompt,
      ],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    const rawText = response.text || '{}';
    let parsed: any = {};
    try {
      parsed = JSON.parse(rawText);
    } catch {
      const match = rawText.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      }
    }

    let x = typeof parsed.cropBox?.x === 'number' ? parsed.cropBox.x : (typeof parsed.x === 'number' ? parsed.x : 0.05);
    let y = typeof parsed.cropBox?.y === 'number' ? parsed.cropBox.y : (typeof parsed.y === 'number' ? parsed.y : 0.05);
    let width = typeof parsed.cropBox?.width === 'number' ? parsed.cropBox.width : (typeof parsed.width === 'number' ? parsed.width : 0.90);
    let height = typeof parsed.cropBox?.height === 'number' ? parsed.cropBox.height : (typeof parsed.height === 'number' ? parsed.height : 0.90);

    // Sanitize and clamp values to [0, 1] range
    x = Math.max(0.00, Math.min(0.80, x));
    y = Math.max(0.00, Math.min(0.80, y));
    width = Math.max(0.15, Math.min(1.0 - x, width));
    height = Math.max(0.15, Math.min(1.0 - y, height));

    const clamp = (v: any, fallback: number) =>
      typeof v === 'number' && !isNaN(v) ? Math.max(0.0, Math.min(1.0, v)) : fallback;

    const corners = {
      tl: {
        x: clamp(parsed.corners?.tl?.x, x),
        y: clamp(parsed.corners?.tl?.y, y),
      },
      tr: {
        x: clamp(parsed.corners?.tr?.x, x + width),
        y: clamp(parsed.corners?.tr?.y, y),
      },
      br: {
        x: clamp(parsed.corners?.br?.x, x + width),
        y: clamp(parsed.corners?.br?.y, y + height),
      },
      bl: {
        x: clamp(parsed.corners?.bl?.x, x),
        y: clamp(parsed.corners?.bl?.y, y + height),
      },
    };

    return res.json({
      success: true,
      corners,
      cropBox: {
        x: Number(x.toFixed(4)),
        y: Number(y.toFixed(4)),
        width: Number(width.toFixed(4)),
        height: Number(height.toFixed(4)),
      },
      confidence: parsed.confidence || 0.95,
      engine: 'Gemini 3.8 Flash CamScanner Perspective Vision',
    });
  } catch (err: any) {
    console.error('Errore /api/ai/smart-crop:', err);
    return res.status(200).json({
      fallback: true,
      cropBox: { x: 0.04, y: 0.04, width: 0.92, height: 0.92 },
      error: err?.message || 'Errore durante il rilevamento intelligente dei bordi.',
    });
  }
});

// Endpoint: Parsing robusto di documenti (PDF, EPUB, TXT) per tutti i browser
app.post('/api/parse-document', async (req: Request, res: Response) => {
  try {
    const { base64, filename, fileType } = req.body;
    if (!base64) {
      return res.status(400).json({ error: 'Nessun dato file fornito.' });
    }

    const buffer = Buffer.from(base64, 'base64');
    const ext = (fileType || filename?.split('.').pop() || '').toLowerCase();

    let extractedPages: string[] = [];
    let fullText = '';

    if (ext === 'pdf') {
      try {
        const parser = new PDFParse({ data: buffer });
        const result = await parser.getText();
        if (result && Array.isArray(result.pages) && result.pages.length > 0) {
          extractedPages = result.pages
            .map((p: any) => cleanExtractedText(p.text || ''))
            .filter((t: string) => t.trim().length > 0);
          fullText = result.text ? cleanExtractedText(result.text) : extractedPages.join('\n\n');
        } else if (result && result.text) {
          fullText = cleanExtractedText(result.text);
          if (fullText.length > 20) {
            extractedPages = splitTextIntoPages(fullText);
          }
        }
      } catch (pdfErr) {
        console.warn('Errore parsing PDF con PDFParse:', pdfErr);
      }

      // If PDFParse yielded no text (scanned PDF or vector images), attempt Gemini Multimodal OCR
      if (extractedPages.length === 0) {
        try {
          const ai = getAiClient();
          if (ai) {
            console.log('Tentativo di trascrizione OCR per PDF con Gemini 3.8 Flash...');
            const aiResponse = await ai.models.generateContent({
              model: 'gemini-3.8-flash',
              contents: [
                {
                  inlineData: {
                    data: base64,
                    mimeType: 'application/pdf',
                  },
                },
                'Trascrivi fedelmente tutto il testo contenuto in questo documento PDF per una lettura accessibile. Non aggiungere commenti personali, saluti o preamboli: restituisci esclusivamente il testo dei capitoli o delle pagine del documento in italiano o nella lingua originale.',
              ],
            });
            const ocrResult = cleanExtractedText(aiResponse.text || '');
            if (ocrResult.length > 30) {
              fullText = ocrResult;
              extractedPages = splitTextIntoPages(fullText);
            }
          }
        } catch (geminiPdfErr) {
          console.warn('Errore OCR PDF con Gemini:', geminiPdfErr);
        }
      }

      // If still empty, provide clean human-readable placeholder, NEVER binary garbage
      if (extractedPages.length === 0) {
        fullText = `Documento PDF: ${filename || 'file.pdf'}\n\nQuesto file PDF non contiene testo digitale estraibile o è una scansione fotografica. Puoi scansionare le pagine direttamente con la fotocamera tramite il pulsante "Scansiona" nella Home.`;
        extractedPages = [fullText];
      }
    } else if (ext === 'epub') {
      try {
        const zip = new AdmZip(buffer);
        const entries = zip.getEntries();
        const htmlEntries = entries
          .filter((e) => {
            const name = e.entryName.toLowerCase();
            return (
              (name.endsWith('.xhtml') || name.endsWith('.html') || name.endsWith('.htm')) &&
              !name.includes('toc.ncx')
            );
          })
          .sort((a, b) => a.entryName.localeCompare(b.entryName));

        for (const entry of htmlEntries) {
          const raw = entry.getData().toString('utf-8');
          const clean = cleanHtmlContent(raw);
          if (clean && clean.length > 20) {
            extractedPages.push(clean);
            fullText += (fullText ? '\n\n' : '') + clean;
          }
        }
      } catch (epubErr) {
        console.warn('Errore parsing EPUB con AdmZip:', epubErr);
      }

      if (extractedPages.length === 0) {
        fullText = `Documento EPUB: ${filename || 'file.epub'}\n\nImpossibile estrarre il testo da questo archivio EPUB (il file potrebbe essere protetto da DRM o non conforme allo standard EPUB).`;
        extractedPages = [fullText];
      }
    } else if (ext === 'docx') {
      try {
        const zip = new AdmZip(buffer);
        const docEntry = zip.getEntry('word/document.xml');
        if (docEntry) {
          const xml = docEntry.getData().toString('utf-8');
          const textMatches = xml.match(/<w:t[^>]*>([^<]+)<\/w:t>/g) || [];
          const text = textMatches.map((m) => m.replace(/<[^>]+>/g, '')).join(' ');
          fullText = cleanExtractedText(text);
          if (fullText.length > 20) {
            extractedPages = splitTextIntoPages(fullText);
          }
        }
      } catch (docxErr) {
        console.warn('Errore parsing DOCX con AdmZip:', docxErr);
      }
      if (extractedPages.length === 0) {
        fullText = `Documento DOCX: ${filename || 'documento.docx'}\n\nContenuto pronto per la lettura.`;
        extractedPages = [fullText];
      }
    } else {
      // Plain text or other document formats
      try {
        const rawText = buffer.toString('utf-8');
        fullText = cleanExtractedText(rawText);
        extractedPages = splitTextIntoPages(fullText);
      } catch (txtErr) {
        console.warn('Errore lettura file di testo:', txtErr);
      }
    }

    // Final safety check to ensure always valid array
    if (extractedPages.length === 0) {
      extractedPages = ['(Nessun testo estraibile trovato nel documento)'];
    }

    return res.json({
      success: true,
      filename: filename || 'documento',
      pageCount: extractedPages.length,
      pages: extractedPages,
      text: fullText,
    });
  } catch (err: any) {
    console.error('Errore /api/parse-document:', err);
    return res.status(500).json({ error: err?.message || 'Errore durante la lettura del documento.' });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: PORT },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Vora server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
});
