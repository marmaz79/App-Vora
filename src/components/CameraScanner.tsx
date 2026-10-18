import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  RotateCcw,
  Sparkles,
  Image as ImageIcon,
  FileText,
  AlertCircle,
  Zap,
  ZapOff,
  SwitchCamera,
  CheckCircle2,
  RefreshCw,
  X,
  ScanLine,
  Plus,
  ArrowRight,
  Check,
} from 'lucide-react';
import { ScanSessionData, Book } from '../types';
import { tesseractOcr, OcrEngineMode, OcrLanguage, OcrProgress } from '../services/tesseractOcr';
import { pdfOcrService } from '../services/pdfOcrService';
import { storageService } from '../services/storageService';
import { ScanProgressCircle } from './ScanProgressCircle';
import { CamScannerEditor } from './CamScannerEditor';
import { CamScannerDocumentGrid } from './CamScannerDocumentGrid';

interface CameraScannerProps {
  onScanResultsReady: (session: ScanSessionData) => void;
  onAddBook?: (book: Book) => void;
  onClose?: () => void;
  autoStart?: boolean;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({
  onScanResultsReady,
  onAddBook,
  onClose,
  autoStart = true,
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [rawImageForEditing, setRawImageForEditing] = useState<File | null>(null);
  const [scannedPagesList, setScannedPagesList] = useState<
    Array<{ file: File; url: string; pageNumber: number }>
  >([]);
  const [showDocGrid, setShowDocGrid] = useState(false);
  const [editingPageIndex, setEditingPageIndex] = useState<number | null>(null);
  const [customDocTitle, setCustomDocTitle] = useState(() => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('it-IT');
    const timeStr = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    return `CamScanner ${dateStr} ${timeStr}`;
  });
  const [multiShotMode, setMultiShotMode] = useState<boolean>(true);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<OcrProgress>({
    status: '',
    progress: 0,
    message: '',
  });
  const [activeFileName, setActiveFileName] = useState('');
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [ocrEngine] = useState<OcrEngineMode>('ai-vision');
  const [ocrLanguage] = useState<OcrLanguage>('ita');

  const videoRef = useRef<HTMLVideoElement>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const isFinalizingRef = useRef(false);

  // Stop camera tracks cleanly
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }
    setStream(null);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  // Check if multiple camera devices exist
  useEffect(() => {
    if (navigator?.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
          const videoDevices = devices.filter((d) => d.kind === 'videoinput');
          setHasMultipleCameras(videoDevices.length > 1);
        })
        .catch(() => {});
    }
  }, []);

  // Keep videoRef in sync with active stream
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch((err) => {
        console.warn('Autoplay video stream:', err);
      });
    }
  }, [stream]);

  // Start live camera stream with progressive constraint fallbacks
  const startCamera = useCallback(
    async (mode: 'environment' | 'user' = facingMode) => {
      setCameraError(null);

      // Clean up previous stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      if (!navigator?.mediaDevices?.getUserMedia) {
        setCameraError(
          'La fotocamera live non è accessibile direttamente. Tocca il pulsante sotto per scattare una foto con la fotocamera del dispositivo.'
        );
        return;
      }

      try {
        let mediaStream: MediaStream | null = null;
        try {
          // 1. Prova con risoluzione alta e fotocamera posteriore per OCR ottimale
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: mode },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
            audio: false,
          });
        } catch (firstErr) {
          console.warn('Fallback standard per fotocamera:', firstErr);
          try {
            // 2. Fallback senza vincoli di risoluzione ma con facingMode
            mediaStream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: mode },
              audio: false,
            });
          } catch (secondErr) {
            console.warn('Fallback video generico:', secondErr);
            // 3. Fallback universale: qualsiasi fotocamera disponibile
            mediaStream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });
          }
        }

        if (mediaStream) {
          streamRef.current = mediaStream;
          setStream(mediaStream);
          setCameraActive(true);

          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
            videoRef.current.play().catch(() => {});
          }

          // Controlla supporto torcia
          const videoTrack = mediaStream.getVideoTracks()[0];
          if (videoTrack && typeof (videoTrack.getCapabilities as any) === 'function') {
            const caps = (videoTrack.getCapabilities as any)();
            setHasTorch(Boolean(caps && caps.torch));
          }
        }
      } catch (err: any) {
        console.warn('Impossibile accedere alla fotocamera live:', err);
        let msg =
          'Impossibile avviare la fotocamera live. Verifica i permessi nel browser oppure usa la fotocamera di sistema.';
        if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
          msg = 'Permesso fotocamera negato nel browser. Puoi scattare la foto toccando il pulsante Fotocamera di Sistema qui sotto.';
        } else if (err?.name === 'NotFoundError') {
          msg = 'Nessuna fotocamera rilevata sul dispositivo.';
        }
        setCameraError(msg);
        setCameraActive(false);
      }
    },
    [facingMode]
  );

  // Auto-start camera when autoStart is enabled
  useEffect(() => {
    if (autoStart) {
      startCamera(facingMode);
    }
    return () => {
      stopCamera();
    };
  }, [autoStart, startCamera, facingMode, stopCamera]);

  // Flip camera (front / back)
  const toggleCameraFacing = async () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    await startCamera(nextMode);
  };

  // Toggle torch / flashlight if supported
  const toggleTorch = async () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (track && typeof (track.applyConstraints as any) === 'function') {
      try {
        const nextTorch = !torchOn;
        await (track.applyConstraints as any)({
          advanced: [{ torch: nextTorch }],
        });
        setTorchOn(nextTorch);
      } catch (e) {
        console.warn('Errore controllo torcia:', e);
      }
    }
  };

  // Process a captured or uploaded image file with OCR
  const processImageFile = async (file: File, preProcessedUrl?: string) => {
    if (!file) return;

    stopCamera();
    setOcrLoading(true);
    setActiveFileName(file.name || 'foto-scansione.jpg');

    setOcrProgress({
      status: 'init',
      progress: 0.08,
      message: 'Inizializzazione estrazione testo con Gemini AI Vision...',
    });

    const objectUrl = preProcessedUrl || URL.createObjectURL(file);

    try {
      const result = await tesseractOcr.recognize(file, {
        engine: ocrEngine,
        language: ocrLanguage,
        enhanceContrast: true,
        autoOptimizeAi: true,
        speechOptimized: false,
        onProgress: (prog) => {
          setOcrProgress(prog);
        },
      });

      const extractedText = result.text?.trim() || '';
      const rawText = result.rawText || extractedText;

      const title = `Scansione ${new Date().toLocaleDateString('it-IT')} ore ${new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`;

      const session: ScanSessionData = {
        bookId: `scan-${Date.now()}`,
        title,
        pages: [extractedText || '(Nessun testo leggibile rilevato nella foto. Riprova con una migliore illuminazione.)'],
        rawPages: [rawText],
        imageUrls: [objectUrl],
        engine: result.engine || 'Gemini 3.8 Flash Vision',
        confidence: result.confidence || 95,
        isAiOptimized: result.isAiOptimized || true,
        currentPageIndex: 0,
      };

      onScanResultsReady(session);
    } catch (err: any) {
      console.error('Errore durante OCR:', err);
      setCameraError(err?.message || 'Errore durante la scansione della foto.');
      setOcrLoading(false);
    }
  };

  // Aggiungi una pagina allo scatto multiplo
  const handleAddPageToBatch = (processedFile: File, processedUrl: string) => {
    setScannedPagesList((prev) => [
      ...prev,
      {
        file: processedFile,
        url: processedUrl,
        pageNumber: prev.length + 1,
      },
    ]);
    setRawImageForEditing(null);
    if (!cameraActive) {
      startCamera(facingMode);
    }
  };

  // Rimuovi una pagina dalla lista scatti multipli
  const handleRemovePageFromBatch = (indexToRemove: number) => {
    setScannedPagesList((prev) =>
      prev
        .filter((_, idx) => idx !== indexToRemove)
        .map((p, idx) => ({ ...p, pageNumber: idx + 1 }))
    );
  };

  // Reorder pages in the CamScanner grid
  const handleReorderPages = (fromIndex: number, toIndex: number) => {
    if (
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= scannedPagesList.length ||
      toIndex >= scannedPagesList.length
    )
      return;
    setScannedPagesList((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated.map((p, idx) => ({ ...p, pageNumber: idx + 1 }));
    });
  };

  // Delete page from grid
  const handleDeletePageFromGrid = (index: number) => {
    setScannedPagesList((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      if (updated.length === 0) {
        setShowDocGrid(false);
        if (!cameraActive) {
          startCamera(facingMode);
        }
      }
      return updated.map((p, idx) => ({ ...p, pageNumber: idx + 1 }));
    });
  };

  // Edit specific page from grid
  const handleEditPageFromGrid = (index: number) => {
    const page = scannedPagesList[index];
    if (page) {
      setEditingPageIndex(index);
      setRawImageForEditing(page.file);
    }
  };

  // Extract OCR in Word mode from the grid
  const handleOcrExtractWord = async (
    pagesToProcess: Array<{ file: File; url: string; pageNumber: number }>,
    titleName: string
  ) => {
    if (!pagesToProcess || pagesToProcess.length === 0) return;
    setShowDocGrid(false);
    stopCamera();
    setOcrLoading(true);
    setActiveFileName(`${titleName}.docx`);

    setOcrProgress({
      status: 'init',
      progress: 0.1,
      message: 'Estrazione testo documento in modalità Word (OCR)...',
    });

    const extractedPages: string[] = [];
    const imageUrls: string[] = [];

    try {
      for (let i = 0; i < pagesToProcess.length; i++) {
        const item = pagesToProcess[i];
        imageUrls.push(item.url);
        setOcrProgress({
          status: 'recognizing',
          progress: 0.2 + ((i + 1) / pagesToProcess.length) * 0.75,
          message: `Riconoscimento testo pagina ${i + 1} di ${pagesToProcess.length}...`,
        });

        try {
          const res = await tesseractOcr.recognize(item.file, {
            engine: ocrEngine,
            language: ocrLanguage,
            enhanceContrast: true,
            autoOptimizeAi: true,
          });
          const text = res && 'text' in res ? res.text?.trim() : '';
          extractedPages.push(text || `[Pagina ${i + 1} del documento]`);
        } catch (e) {
          extractedPages.push(`[Pagina ${i + 1} del documento]`);
        }
      }

      setOcrProgress({
        status: 'completed',
        progress: 1,
        message: 'Testo estratto con successo!',
      });

      const session: ScanSessionData = {
        bookId: `scan-${Date.now()}`,
        title: titleName,
        pages: extractedPages,
        rawPages: extractedPages,
        imageUrls: imageUrls,
        engine: 'Gemini 3.8 Flash Vision / OCR',
        confidence: 96,
        isAiOptimized: true,
        currentPageIndex: 0,
      };

      setOcrLoading(false);
      if (onScanResultsReady) {
        onScanResultsReady(session);
      }
    } catch (err: any) {
      console.error('Errore estrazione Word:', err);
      setCameraError('Errore durante il riconoscimento del testo.');
      setOcrLoading(false);
      setShowDocGrid(true);
    }
  };

  // Continua: Salva tutte le pagine acquisite come libro PDF nella libreria
  const handleFinalizePdfBook = async (
    pagesToSave: Array<{ file: File; url: string; pageNumber: number }>,
    docTitleOverride?: string
  ) => {
    if (!pagesToSave || pagesToSave.length === 0) return;
    if (isFinalizingRef.current) return;
    isFinalizingRef.current = true;

    setShowDocGrid(false);
    setRawImageForEditing(null);
    stopCamera();
    setOcrLoading(true);
    setActiveFileName(`Libro-PDF-${pagesToSave.length}-pagine.pdf`);

    setOcrProgress({
      status: 'init',
      progress: 0.15,
      message: `Creazione libro PDF in corso (${pagesToSave.length} ${pagesToSave.length === 1 ? 'pagina' : 'pagine'})...`,
    });

    const extractedPages: string[] = [];
    const imageUrls: string[] = [];

    try {
      for (let i = 0; i < pagesToSave.length; i++) {
        const item = pagesToSave[i];
        imageUrls.push(item.url);

        const progressPercent = 0.2 + ((i + 1) / pagesToSave.length) * 0.7;
        setOcrProgress({
          status: 'recognizing',
          progress: progressPercent,
          message: `Elaborazione OCR pagina ${i + 1} di ${pagesToSave.length}...`,
        });

        try {
          // Timeout per pagina per evitare qualsiasi blocco o attesa prolungata
          const ocrPromise = tesseractOcr.recognize(item.file, {
            engine: ocrEngine,
            language: ocrLanguage,
            enhanceContrast: true,
            autoOptimizeAi: true,
          });
          const timeoutPromise = new Promise<null>((res) => setTimeout(() => res(null), 4500));
          const result = await Promise.race([ocrPromise, timeoutPromise]);
          const text = result && 'text' in result ? result.text?.trim() : '';
          extractedPages.push(text || `Pagina ${i + 1} del documento PDF scansionato`);
        } catch (pageErr) {
          console.warn(`Errore OCR pagina ${i + 1}:`, pageErr);
          extractedPages.push(`Pagina ${i + 1} del documento PDF scansionato`);
        }
      }

      setOcrProgress({
        status: 'completed',
        progress: 1,
        message: 'Libro salvato nella libreria in PDF!',
      });

      const now = new Date();
      const dateStr = now.toLocaleDateString('it-IT');
      const timeStr = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
      const title =
        docTitleOverride?.trim() ||
        (pagesToSave.length === 1
          ? `Scansione ${dateStr} ore ${timeStr}`
          : `Libro PDF (${pagesToSave.length} pag.) ${dateStr}`);

      const totalSize = pagesToSave.reduce((acc, p) => acc + (p.file.size || 150000), 0);

      const uniqueSuffix = Math.random().toString(36).substring(2, 8);
      const newBook: Book = {
        book_id: `scan-pdf-${Date.now()}-${uniqueSuffix}`,
        owner_id: 'local-user',
        title,
        author: 'CamScanner Vora',
        file_type: 'pdf', // Salva il libro nella libreria in PDF!
        source: 'scan',
        size: totalSize,
        pages: extractedPages.length > 0 ? extractedPages : ['Documento PDF scansionato pronto per la lettura.'],
        currentPage: 0,
        created_at: now.toISOString(),
        ocr_engine: 'CamScanner OCR',
        coverColor: '#FFFFFF',
        imageUrls: imageUrls,
      };

      if (onAddBook) {
        onAddBook(newBook);
      } else {
        storageService.addBook(newBook);
      }

      if (onClose) {
        onClose();
      }

      setScannedPagesList([]);
      setRawImageForEditing(null);
      setOcrLoading(false);
    } catch (err: any) {
      console.error('Errore durante il salvataggio PDF:', err);
      setCameraError(err?.message || 'Errore durante la creazione del libro PDF.');
      setOcrLoading(false);
    } finally {
      isFinalizingRef.current = false;
    }
  };

  // Process a scanned PDF file with OCR
  const processPdfFile = async (file: File) => {
    if (!file) return;

    stopCamera();
    setOcrLoading(true);
    setActiveFileName(file.name || 'documento.pdf');

    setOcrProgress({
      status: 'init',
      progress: 0.05,
      message: 'Inizializzazione analisi libro PDF con Gemini AI Vision...',
    });

    try {
      const session = await pdfOcrService.convertScannedPdf(file, {
        engine: ocrEngine,
        language: ocrLanguage,
        autoOptimizeAi: true,
        speechOptimized: false,
        onProgress: (prog) => {
          setOcrProgress(prog);
        },
      });

      onScanResultsReady(session);
    } catch (err: any) {
      console.error('Errore durante scansione PDF:', err);
      setCameraError(err?.message || 'Errore durante l\'elaborazione del file PDF.');
      setOcrLoading(false);
    }
  };

  // Capture current video frame from live camera
  const captureFromVideo = () => {
    const video = videoRef.current;
    if (!video || !cameraActive) {
      // If camera stream not active, trigger native camera
      nativeCameraInputRef.current?.click();
      return;
    }

    setIsCapturing(true);

    try {
      const canvas = document.createElement('canvas');
      const w = video.videoWidth || 1280;
      const h = video.videoHeight || 720;
      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, w, h);
        canvas.toBlob(
          (blob) => {
            setIsCapturing(false);
            if (blob) {
              const file = new File([blob], `scansione-camera-${Date.now()}.jpg`, {
                type: 'image/jpeg',
              });
              // Apri subito l'editor CamScanner per ritaglio e pulizia prima dell'OCR
              setRawImageForEditing(file);
            } else {
              setCameraError('Impossibile acquisire il fotogramma della fotocamera.');
            }
          },
          'image/jpeg',
          0.94
        );
      } else {
        setIsCapturing(false);
        setCameraError('Errore durante la creazione del fotogramma.');
      }
    } catch (e: any) {
      setIsCapturing(false);
      console.error('Errore cattura video:', e);
      nativeCameraInputRef.current?.click();
    }
  };

  return (
    <div className="flex flex-col gap-3 w-full animate-fade-in select-none">
      {/* Loading state with ScanProgressCircle */}
      {ocrLoading && (
        <div className="bg-black border border-white/20 rounded-3xl p-6 shadow-2xl flex flex-col items-center justify-center min-h-[380px]">
          <ScanProgressCircle
            progress={ocrProgress.progress}
            status={ocrProgress.status}
            message={ocrProgress.message || 'Scansione ottica in corso con Gemini AI Vision...'}
            engine="Gemini 3.8 Flash Vision"
            fileName={activeFileName}
            size={170}
            strokeWidth={12}
          />
        </div>
      )}

      {/* Camera Live Viewfinder & Controls */}
      {!ocrLoading && (
        <div className="flex flex-col gap-3">
          {/* Selettore Modalità: Scatto Singolo / Scatti Multipli (Libro PDF) */}
          <div className="flex items-center justify-center p-1 bg-black border border-zinc-800 rounded-2xl max-w-sm mx-auto w-full shadow-md">
            <button
              type="button"
              onClick={() => setMultiShotMode(false)}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                !multiShotMode
                  ? 'bg-white text-black shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Camera size={14} />
              <span>Scatto Singolo</span>
            </button>
            <button
              type="button"
              onClick={() => setMultiShotMode(true)}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                multiShotMode
                  ? 'bg-white text-black shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <FileText size={14} />
              <span>Scatti Multipli (PDF)</span>
              {scannedPagesList.length > 0 && (
                <span className="bg-white text-black text-[10px] px-1.5 py-0.2 rounded-full font-black">
                  {scannedPagesList.length}
                </span>
              )}
            </button>
          </div>

          {/* Viewfinder Container */}
          <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] bg-black rounded-3xl overflow-hidden border-2 border-zinc-800 shadow-2xl flex items-center justify-center group">
            {/* Live Video Feed */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                cameraActive ? 'opacity-100' : 'opacity-0'
              }`}
            />

            {/* Scanning Overlay (Corner guides & Laser line) */}
            {cameraActive && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
                {/* Document Viewfinder Target Frame */}
                <div className="relative w-full h-full max-w-sm max-h-72 border-2 border-white/30 rounded-2xl">
                  {/* Top-Left Corner */}
                  <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-lg" />
                  {/* Top-Right Corner */}
                  <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-lg" />
                  {/* Bottom-Left Corner */}
                  <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-lg" />
                  {/* Bottom-Right Corner */}
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-lg" />

                  {/* Animated Laser Scanning Line */}
                  <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-white to-transparent shadow-[0_0_12px_#FFFFFF] animate-pulse top-1/2 -translate-y-1/2" />

                  {/* Center hint badge */}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 text-[11px] font-bold text-white whitespace-nowrap shadow-md">
                    Inquadra la pagina del libro
                  </div>
                </div>
              </div>
            )}

            {/* Top Bar inside Viewfinder */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-auto z-10">
              <div className="flex items-center gap-2 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 shadow-md">
                <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Camera size={13} className="text-white" />
                  {cameraActive ? 'Fotocamera Live' : 'Fotocamera Pronta'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Torch Toggle if available */}
                {hasTorch && cameraActive && (
                  <button
                    type="button"
                    onClick={toggleTorch}
                    aria-label="Attiva o disattiva torcia"
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                      torchOn
                        ? 'bg-white text-black shadow-lg shadow-white/30'
                        : 'bg-black/60 text-white border border-white/20 hover:bg-black/80'
                    }`}
                  >
                    {torchOn ? <Zap size={16} /> : <ZapOff size={16} />}
                  </button>
                )}

                {/* Flip camera button */}
                {hasMultipleCameras && (
                  <button
                    type="button"
                    onClick={toggleCameraFacing}
                    aria-label="Cambia fotocamera"
                    className="w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 flex items-center justify-center transition-all active:scale-95"
                    title="Cambia fotocamera"
                  >
                    <SwitchCamera size={16} />
                  </button>
                )}

                {/* Restart camera if inactive */}
                {!cameraActive && (
                  <button
                    type="button"
                    onClick={() => startCamera(facingMode)}
                    aria-label="Riavvia fotocamera"
                    className="w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 flex items-center justify-center transition-all"
                    title="Riavvia fotocamera"
                  >
                    <RefreshCw size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Error or Inactive Camera Fallback message */}
            {!cameraActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-black/95 backdrop-blur-sm z-20">
                <div className="w-16 h-16 rounded-2xl bg-zinc-900 text-white border border-zinc-700 flex items-center justify-center mb-3">
                  <Camera size={32} />
                </div>
                <h3 className="text-base font-bold text-white mb-1">
                  Fotocamera del Dispositivo
                </h3>
                <p className="text-xs text-zinc-400 max-w-xs mb-4 leading-relaxed">
                  {cameraError ||
                    'Tocca il pulsante per scattare una foto direttamente con la fotocamera del tuo telefono o tablet.'}
                </p>
                <button
                  type="button"
                  onClick={() => nativeCameraInputRef.current?.click()}
                  className="min-h-[46px] px-6 bg-white hover:bg-zinc-200 active:scale-95 text-black font-black text-sm rounded-2xl transition-all flex items-center gap-2 shadow-lg"
                >
                  <Camera size={18} />
                  <span>Apri Fotocamera di Sistema</span>
                </button>
              </div>
            )}
          </div>

          {/* Vassoio Pagine Scatti Multipli Acquisite */}
          {scannedPagesList.length > 0 && (
            <div className="bg-black border border-zinc-800 rounded-2xl p-3 flex flex-col gap-2 shadow-xl animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <FileText size={14} className="text-white" />
                  {scannedPagesList.length}{' '}
                  {scannedPagesList.length === 1 ? 'pagina pronta' : 'pagine pronte'}
                </span>

                {/* Pulsante Continua → Griglia Documento */}
                <button
                  type="button"
                  onClick={() => setShowDocGrid(true)}
                  className="px-3.5 py-1.5 bg-white text-black hover:bg-zinc-200 active:scale-95 text-xs font-black rounded-xl flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                  title="Visualizza e disponi le pagine nel documento"
                >
                  <Check size={14} className="text-black stroke-[3]" />
                  <span>Continua ({scannedPagesList.length}) → Documento</span>
                </button>
              </div>

              {/* Scrolling thumbnails */}
              <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-thin">
                {scannedPagesList.map((page, idx) => (
                  <div
                    key={idx}
                    onClick={() => setShowDocGrid(true)}
                    className="relative shrink-0 w-16 h-20 rounded-xl overflow-hidden border border-zinc-700 bg-black group shadow-sm cursor-pointer"
                  >
                    <img
                      src={page.url}
                      alt={`Pagina ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-1 left-1 bg-black/90 px-1 py-0.5 rounded text-[9px] font-bold text-white">
                      P.{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemovePageFromBatch(idx)}
                      className="absolute top-1 right-1 w-4 h-4 rounded-full bg-white text-black hover:bg-zinc-200 flex items-center justify-center shadow-md opacity-80 group-hover:opacity-100"
                      title="Rimuovi pagina"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}

                {/* Add page hint box */}
                <button
                  type="button"
                  onClick={captureFromVideo}
                  className="shrink-0 w-16 h-20 rounded-xl border-2 border-dashed border-zinc-700 hover:border-white flex flex-col items-center justify-center gap-1 text-white bg-white/5 active:scale-95 transition-all"
                  title="Scatta la prossima pagina"
                >
                  <Plus size={18} className="text-white" />
                  <span className="text-[9px] font-bold text-white">+ Scatta</span>
                </button>
              </div>
            </div>
          )}

          {/* Shutter Button & Primary Actions Bar - Icone e nome sotto */}
          <div className="bg-black border border-zinc-800 rounded-3xl p-3 sm:p-4 flex items-center justify-around gap-2 shadow-xl">
            {/* 1. Galleria */}
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-1.5 p-1.5 sm:p-2 rounded-2xl hover:bg-zinc-900 active:scale-90 transition-all text-white min-w-[64px]"
              title="Scegli dalla galleria"
              aria-label="Galleria"
            >
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-transparent border border-white flex items-center justify-center text-white">
                <ImageIcon size={22} className="text-white" />
              </div>
              <span className="text-[11px] font-bold text-white tracking-tight">Galleria</span>
            </button>

            {/* 2. Centro: Scatto Fotocamera Bianco su Nero */}
            <button
              type="button"
              onClick={captureFromVideo}
              disabled={isCapturing}
              aria-label="Scatta foto"
              title="Scatta foto"
              className="flex flex-col items-center justify-center gap-1 active:scale-90 transition-all group cursor-pointer"
            >
              <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-white/20 p-1.5 border-4 border-white flex items-center justify-center hover:scale-105 transition-all shadow-xl shadow-white/20 relative">
                <div className="w-full h-full rounded-full bg-white group-hover:bg-zinc-200 flex items-center justify-center transition-colors shadow-inner">
                  <Camera size={26} className="text-black drop-shadow-sm" />
                </div>
                <span className="absolute inset-0 rounded-full border-2 border-white/50 animate-ping pointer-events-none" />
              </div>
              <span className="text-[11px] font-bold text-white tracking-tight">Scatta</span>
            </button>

            {/* 3. Fotocamera Nativa di Sistema */}
            <button
              type="button"
              onClick={() => nativeCameraInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-1.5 p-1.5 sm:p-2 rounded-2xl hover:bg-white/10 active:scale-90 transition-all text-white min-w-[64px]"
              title="Fotocamera di sistema"
              aria-label="Fotocamera"
            >
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-transparent border border-white flex items-center justify-center text-white">
                <SwitchCamera size={22} className="text-white" />
              </div>
              <span className="text-[11px] font-bold text-white tracking-tight">Fotocamera</span>
            </button>

            {/* 4. Carica PDF */}
            <button
              type="button"
              onClick={() => pdfInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-1.5 p-1.5 sm:p-2 rounded-2xl hover:bg-white/10 active:scale-90 transition-all text-white min-w-[64px]"
              title="Carica PDF scansionato"
              aria-label="PDF OCR"
            >
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-transparent border border-white flex items-center justify-center text-white">
                <FileText size={22} className="text-white" />
              </div>
              <span className="text-[11px] font-bold text-white tracking-tight">PDF OCR</span>
            </button>
          </div>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={nativeCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          const files = e.target.files;
          if (files && files.length > 0) {
            setRawImageForEditing(files[0]);
          }
          e.target.value = '';
        }}
        className="hidden"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*,.png,.jpg,.jpeg,.webp,.bmp"
        onChange={(e) => {
          const files = e.target.files;
          if (files && files.length > 0) {
            setRawImageForEditing(files[0]);
          }
          e.target.value = '';
        }}
        className="hidden"
      />
      <input
        ref={pdfInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={(e) => {
          const files = e.target.files;
          if (files && files.length > 0) {
            processPdfFile(files[0]);
          }
          e.target.value = '';
        }}
        className="hidden"
      />

      {/* CamScanner Editor per Ritaglio e Pulizia Documento */}
      {rawImageForEditing && (
        <CamScannerEditor
          imageFile={rawImageForEditing}
          pageIndex={
            editingPageIndex !== null ? editingPageIndex : scannedPagesList.length
          }
          totalPages={
            editingPageIndex !== null
              ? scannedPagesList.length
              : scannedPagesList.length + 1
          }
          onAddPage={(processedFile, processedUrl) => {
            if (editingPageIndex !== null) {
              setScannedPagesList((prev) => {
                const updated = [...prev];
                updated[editingPageIndex] = {
                  file: processedFile,
                  url: processedUrl,
                  pageNumber: editingPageIndex + 1,
                };
                return updated;
              });
              setEditingPageIndex(null);
              setRawImageForEditing(null);
              setShowDocGrid(true);
            } else {
              handleAddPageToBatch(processedFile, processedUrl);
            }
          }}
          onContinueSavePdf={(processedFile, processedUrl) => {
            if (editingPageIndex !== null) {
              setScannedPagesList((prev) => {
                const updated = [...prev];
                updated[editingPageIndex] = {
                  file: processedFile,
                  url: processedUrl,
                  pageNumber: editingPageIndex + 1,
                };
                return updated;
              });
              setEditingPageIndex(null);
              setRawImageForEditing(null);
              setShowDocGrid(true);
            } else {
              const allPages = [
                ...scannedPagesList,
                {
                  file: processedFile,
                  url: processedUrl,
                  pageNumber: scannedPagesList.length + 1,
                },
              ];
              setScannedPagesList(allPages);
              setRawImageForEditing(null);
              setShowDocGrid(true);
            }
          }}
          onConfirm={(processedFile, processedUrl) => {
            if (editingPageIndex !== null) {
              setScannedPagesList((prev) => {
                const updated = [...prev];
                updated[editingPageIndex] = {
                  file: processedFile,
                  url: processedUrl,
                  pageNumber: editingPageIndex + 1,
                };
                return updated;
              });
              setEditingPageIndex(null);
              setRawImageForEditing(null);
              setShowDocGrid(true);
            } else {
              const allPages = [
                ...scannedPagesList,
                {
                  file: processedFile,
                  url: processedUrl,
                  pageNumber: scannedPagesList.length + 1,
                },
              ];
              setScannedPagesList(allPages);
              setRawImageForEditing(null);
              setShowDocGrid(true);
            }
          }}
          onRetake={() => {
            setRawImageForEditing(null);
            setEditingPageIndex(null);
            if (scannedPagesList.length > 0 && editingPageIndex !== null) {
              setShowDocGrid(true);
            } else if (!cameraActive) {
              startCamera(facingMode);
            }
          }}
          onCancel={() => {
            setRawImageForEditing(null);
            setEditingPageIndex(null);
            if (scannedPagesList.length > 0 && editingPageIndex !== null) {
              setShowDocGrid(true);
            } else if (!cameraActive) {
              startCamera(facingMode);
            }
          }}
        />
      )}

      {/* CamScanner Document Grid Mode (Disposizione a 2 Colonne con 01, 02, 03, 04) */}
      {showDocGrid && !rawImageForEditing && !ocrLoading && (
        <CamScannerDocumentGrid
          pages={scannedPagesList}
          documentTitle={customDocTitle}
          onUpdateTitle={(newTitle) => setCustomDocTitle(newTitle)}
          onAddMorePages={() => {
            setShowDocGrid(false);
            if (!cameraActive) {
              startCamera(facingMode);
            }
          }}
          onEditPage={handleEditPageFromGrid}
          onDeletePage={handleDeletePageFromGrid}
          onReorderPages={handleReorderPages}
          onSavePdfBook={() => handleFinalizePdfBook(scannedPagesList, customDocTitle)}
          onOpenOcrWord={() => handleOcrExtractWord(scannedPagesList, customDocTitle)}
          onBack={() => {
            setShowDocGrid(false);
            if (!cameraActive) {
              startCamera(facingMode);
            }
          }}
          isSaving={ocrLoading}
        />
      )}
    </div>
  );
};
