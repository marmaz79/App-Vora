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
} from 'lucide-react';
import { ScanSessionData, Book } from '../types';
import { tesseractOcr, OcrEngineMode, OcrLanguage, OcrProgress } from '../services/tesseractOcr';
import { pdfOcrService } from '../services/pdfOcrService';
import { ScanProgressCircle } from './ScanProgressCircle';
import { CamScannerEditor } from './CamScannerEditor';

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
        <div className="bg-[#12141F] border border-purple-500/40 rounded-3xl p-6 shadow-2xl flex flex-col items-center justify-center min-h-[380px]">
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
          {/* Viewfinder Container */}
          <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] bg-black rounded-3xl overflow-hidden border-2 border-[#2B3045] shadow-2xl flex items-center justify-center group">
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
                  <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-red-500 rounded-tl-lg" />
                  {/* Top-Right Corner */}
                  <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-red-500 rounded-tr-lg" />
                  {/* Bottom-Left Corner */}
                  <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-red-500 rounded-bl-lg" />
                  {/* Bottom-Right Corner */}
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-red-500 rounded-br-lg" />

                  {/* Animated Laser Scanning Line */}
                  <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_12px_#EF4444] animate-pulse top-1/2 -translate-y-1/2" />

                  {/* Center hint badge */}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 text-[11px] font-bold text-white whitespace-nowrap shadow-md">
                    Inquadra la pagina del libro
                  </div>
                </div>
              </div>
            )}

            {/* Top Bar inside Viewfinder */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-auto z-10">
              <div className="flex items-center gap-2 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 shadow-md">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Camera size={13} className="text-red-400" />
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
                        ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/50'
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
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[#0E1017]/95 backdrop-blur-sm z-20">
                <div className="w-16 h-16 rounded-2xl bg-red-600/20 text-red-400 border border-red-500/30 flex items-center justify-center mb-3">
                  <Camera size={32} />
                </div>
                <h3 className="text-base font-bold text-white mb-1">
                  Fotocamera del Dispositivo
                </h3>
                <p className="text-xs text-gray-400 max-w-xs mb-4 leading-relaxed">
                  {cameraError ||
                    'Tocca il pulsante per scattare una foto direttamente con la fotocamera del tuo telefono o tablet.'}
                </p>
                <button
                  type="button"
                  onClick={() => nativeCameraInputRef.current?.click()}
                  className="min-h-[46px] px-6 bg-red-600 hover:bg-red-500 active:scale-95 text-white font-bold text-sm rounded-2xl transition-all flex items-center gap-2 shadow-lg shadow-red-950/50"
                >
                  <Camera size={18} />
                  <span>Apri Fotocamera di Sistema</span>
                </button>
              </div>
            )}
          </div>

          {/* Shutter Button & Primary Actions Bar */}
          <div className="bg-[#12141E] border border-[#232738] rounded-3xl p-4 flex flex-col gap-3 shadow-md">
            {/* Main Shutter Row */}
            <div className="flex items-center justify-around gap-3 pt-1">
              {/* Left: Gallery Picker */}
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-1 min-w-[70px] py-1 text-gray-400 hover:text-white transition-colors group"
                title="Scegli dalla galleria"
              >
                <div className="w-11 h-11 rounded-2xl bg-[#1A1D2B] border border-[#2D3349] group-hover:border-emerald-500/50 group-hover:text-emerald-400 flex items-center justify-center transition-all">
                  <ImageIcon size={20} />
                </div>
                <span className="text-[11px] font-bold">Galleria</span>
              </button>

              {/* Center: Tactile Shutter Button (Scatta Foto) */}
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={captureFromVideo}
                  disabled={isCapturing}
                  aria-label="Scatta foto e scansiona con OCR"
                  className="w-20 h-20 rounded-full bg-white/10 p-1.5 border-4 border-red-500 flex items-center justify-center hover:scale-105 active:scale-90 transition-all shadow-xl shadow-red-900/40 group relative cursor-pointer"
                >
                  <div className="w-full h-full rounded-full bg-red-600 group-hover:bg-red-500 flex items-center justify-center transition-colors shadow-inner">
                    <Camera size={30} className="text-white drop-shadow-sm" />
                  </div>
                  {/* Subtle pulsing ring around shutter */}
                  <span className="absolute inset-0 rounded-full border-2 border-red-400/40 animate-ping pointer-events-none" />
                </button>
                <span className="text-xs font-black text-white mt-2 tracking-wide uppercase">
                  Scatta & Converti (OCR)
                </span>
              </div>

              {/* Right: Scanned PDF Upload */}
              <button
                type="button"
                onClick={() => pdfInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-1 min-w-[70px] py-1 text-gray-400 hover:text-white transition-colors group"
                title="Carica PDF scansionato"
              >
                <div className="w-11 h-11 rounded-2xl bg-[#1A1D2B] border border-[#2D3349] group-hover:border-purple-500/50 group-hover:text-purple-400 flex items-center justify-center transition-all">
                  <FileText size={20} />
                </div>
                <span className="text-[11px] font-bold">PDF OCR</span>
              </button>
            </div>

            {/* Bottom Secondary Action: Direct native camera fallback */}
            <div className="pt-2 border-t border-[#1C202F] flex items-center justify-between text-xs">
              <span className="text-gray-400 font-medium">
                Preferisci usare l'app fotocamera del tuo telefono?
              </span>
              <button
                type="button"
                onClick={() => nativeCameraInputRef.current?.click()}
                className="font-bold text-red-400 hover:text-red-300 underline underline-offset-4 transition-colors"
              >
                Fotocamera nativa →
              </button>
            </div>
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
          onConfirm={(processedFile, processedUrl) => {
            setRawImageForEditing(null);
            processImageFile(processedFile, processedUrl);
          }}
          onRetake={() => {
            setRawImageForEditing(null);
            if (!cameraActive) {
              startCamera(facingMode);
            }
          }}
          onCancel={() => {
            setRawImageForEditing(null);
            if (!cameraActive) {
              startCamera(facingMode);
            }
          }}
        />
      )}
    </div>
  );
};
