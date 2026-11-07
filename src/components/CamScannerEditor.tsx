import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Crop,
  RotateCw,
  RotateCcw,
  Check,
  X,
  Wand2,
  Contrast,
  RefreshCw,
  Plus,
  Sparkles,
  Maximize2,
  Loader2,
  FileText,
  BookOpen,
  ScanLine,
  Eye,
  CheckCheck,
  Palette,
  Sun,
} from 'lucide-react';
import {
  opencvService,
  QuadCorners,
  Point,
  CamScannerFilterType,
  OpenCvStatus,
} from '../services/opencvService';

export type CamScannerFilter = CamScannerFilterType;

export type AutoCropOption =
  | 'ai_auto'
  | 'a4_doc'
  | 'book_spread'
  | 'safe_margins'
  | 'full_frame'
  | 'manual';

export interface CropBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type { QuadCorners, Point };

interface CamScannerEditorProps {
  imageFile: File;
  pageIndex?: number;
  totalPages?: number;
  onAddPage?: (processedFile: File, processedUrl: string) => void;
  onContinueSavePdf?: (processedFile: File, processedUrl: string) => void;
  onConfirm: (processedFile: File, processedUrl: string) => void;
  onRetake: () => void;
  onCancel?: () => void;
}

// Calcola i 4 vertici del quadrilatero per i preset CamScanner
export function calculatePresetQuad(
  preset: AutoCropOption,
  imgWidth: number,
  imgHeight: number,
  detectedCorners?: QuadCorners | null
): QuadCorners {
  const w = Math.max(1, imgWidth);
  const h = Math.max(1, imgHeight);

  switch (preset) {
    case 'full_frame':
      return {
        tl: { x: 0, y: 0 },
        tr: { x: 1, y: 0 },
        br: { x: 1, y: 1 },
        bl: { x: 0, y: 1 },
      };

    case 'safe_margins':
      return {
        tl: { x: 0.04, y: 0.04 },
        tr: { x: 0.96, y: 0.04 },
        br: { x: 0.96, y: 0.96 },
        bl: { x: 0.04, y: 0.96 },
      };

    case 'a4_doc': {
      if (h >= w) {
        const targetRatio = 1 / 1.4142;
        const currentRatio = w / h;
        if (currentRatio < targetRatio) {
          const boxW = 0.92;
          const boxH = Math.min(0.94, (boxW * w / targetRatio) / h);
          const x0 = (1 - boxW) / 2;
          const y0 = (1 - boxH) / 2;
          return {
            tl: { x: x0, y: y0 },
            tr: { x: x0 + boxW, y: y0 },
            br: { x: x0 + boxW, y: y0 + boxH },
            bl: { x: x0, y: y0 + boxH },
          };
        } else {
          const boxH = 0.92;
          const boxW = Math.min(0.92, (boxH * h * targetRatio) / w);
          const x0 = (1 - boxW) / 2;
          const y0 = (1 - boxH) / 2;
          return {
            tl: { x: x0, y: y0 },
            tr: { x: x0 + boxW, y: y0 },
            br: { x: x0 + boxW, y: y0 + boxH },
            bl: { x: x0, y: y0 + boxH },
          };
        }
      } else {
        const targetRatio = 1.4142;
        const currentRatio = w / h;
        if (currentRatio > targetRatio) {
          const boxH = 0.92;
          const boxW = Math.min(0.94, (boxH * h * targetRatio) / w);
          const x0 = (1 - boxW) / 2;
          const y0 = (1 - boxH) / 2;
          return {
            tl: { x: x0, y: y0 },
            tr: { x: x0 + boxW, y: y0 },
            br: { x: x0 + boxW, y: y0 + boxH },
            bl: { x: x0, y: y0 + boxH },
          };
        } else {
          const boxW = 0.92;
          const boxH = Math.min(0.94, (boxW * w / targetRatio) / h);
          const x0 = (1 - boxW) / 2;
          const y0 = (1 - boxH) / 2;
          return {
            tl: { x: x0, y: y0 },
            tr: { x: x0 + boxW, y: y0 },
            br: { x: x0 + boxW, y: y0 + boxH },
            bl: { x: x0, y: y0 + boxH },
          };
        }
      }
    }

    case 'book_spread': {
      const targetRatio = 1.45;
      const currentRatio = w / h;
      if (currentRatio >= targetRatio) {
        const boxH = 0.88;
        const boxW = Math.min(0.95, (boxH * h * targetRatio) / w);
        const x0 = (1 - boxW) / 2;
        const y0 = (1 - boxH) / 2;
        return {
          tl: { x: x0, y: y0 },
          tr: { x: x0 + boxW, y: y0 },
          br: { x: x0 + boxW, y: y0 + boxH },
          bl: { x: x0, y: y0 + boxH },
        };
      } else {
        const boxW = 0.94;
        const boxH = Math.min(0.90, (boxW * w / targetRatio) / h);
        const x0 = (1 - boxW) / 2;
        const y0 = (1 - boxH) / 2;
        return {
          tl: { x: x0, y: y0 },
          tr: { x: x0 + boxW, y: y0 },
          br: { x: x0 + boxW, y: y0 + boxH },
          bl: { x: x0, y: y0 + boxH },
        };
      }
    }

    case 'ai_auto':
      if (detectedCorners) return detectedCorners;
      return {
        tl: { x: 0.02, y: 0.02 },
        tr: { x: 0.98, y: 0.02 },
        br: { x: 0.98, y: 0.98 },
        bl: { x: 0.02, y: 0.98 },
      };

    case 'manual':
    default:
      return (
        detectedCorners || {
          tl: { x: 0.02, y: 0.02 },
          tr: { x: 0.98, y: 0.02 },
          br: { x: 0.98, y: 0.98 },
          bl: { x: 0.02, y: 0.98 },
        }
      );
  }
}

export const CamScannerEditor: React.FC<CamScannerEditorProps> = ({
  imageFile,
  pageIndex = 0,
  totalPages = 1,
  onAddPage,
  onContinueSavePdf,
  onConfirm,
  onRetake,
  onCancel,
}) => {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [rotation, setRotation] = useState<number>(0);
  const [selectedFilter, setSelectedFilter] = useState<CamScannerFilter>('magic_color');
  const [brightness] = useState<number>(10);
  const [contrast] = useState<number>(25);

  // Modalità iniziale: mostra l'anteprima con i 4 angoli trascinabili per regolare il ritaglio manualmente
  const [showCropMode, setShowCropMode] = useState<boolean>(true);
  const [selectedPreset, setSelectedPreset] = useState<AutoCropOption>('ai_auto');

  // I 4 vertici del quadrilatero prospettico
  const [corners, setCorners] = useState<QuadCorners>({
    tl: { x: 0.02, y: 0.02 },
    tr: { x: 0.98, y: 0.02 },
    br: { x: 0.98, y: 0.98 },
    bl: { x: 0.02, y: 0.98 },
  });
  const [detectedCorners, setDetectedCorners] = useState<QuadCorners | null>(null);

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isDetecting, setIsDetecting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [openCvStatus, setOpenCvStatus] = useState<OpenCvStatus>(opencvService.getStatus());

  // Loupe (lente d'ingrandimento 2.4x)
  const [activeDraggingHandle, setActiveDraggingHandle] = useState<string | null>(null);
  const [loupePoint, setLoupePoint] = useState<Point | null>(null);

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const loupeCanvasRef = useRef<HTMLCanvasElement>(null);
  const cropSvgContainerRef = useRef<SVGSVGElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const isDraggingRef = useRef<string | null>(null);
  const dragStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const startCornersRef = useRef<QuadCorners>({ ...corners });

  const rotationRef = useRef(rotation);
  useEffect(() => {
    rotationRef.current = rotation;
  }, [rotation]);

  // Ascolta lo stato di caricamento di OpenCV.js
  useEffect(() => {
    const unsub = opencvService.onStatusChange((status) => {
      setOpenCvStatus(status);
    });
    // Avvia il caricamento lazy
    opencvService.loadOpenCv().catch((err) => {
      console.warn('Avviso caricamento OpenCV:', err);
    });
    return () => unsub();
  }, []);

  /**
   * Genera canvas della foto con rotazione corrente
   */
  const getRotatedSourceCanvas = useCallback((): HTMLCanvasElement | null => {
    const img = imgRef.current;
    if (!img) return null;

    const rot = rotationRef.current;
    const isSideways = rot === 90 || rot === 270;
    const rotW = isSideways ? img.naturalHeight : img.naturalWidth;
    const rotH = isSideways ? img.naturalWidth : img.naturalHeight;

    const rotCanvas = document.createElement('canvas');
    rotCanvas.width = rotW;
    rotCanvas.height = rotH;
    const rotCtx = rotCanvas.getContext('2d');
    if (!rotCtx) return null;

    rotCtx.save();
    rotCtx.translate(rotW / 2, rotH / 2);
    rotCtx.rotate((rot * Math.PI) / 180);
    rotCtx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    rotCtx.restore();

    return rotCanvas;
  }, []);

  /**
   * Renderizza l'anteprima pulita del documento raddrizzato
   */
  const renderProcessedPreview = useCallback(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;

    const rotCanvas = getRotatedSourceCanvas();
    if (!rotCanvas) return;

    // Step 2: Ritaglio prospettico
    const warped = opencvService.warpPerspective(rotCanvas, corners, 1600);

    // Step 3: Pulizia stile CamScanner con filtro selezionato
    const filtered = opencvService.applyFilter(warped, selectedFilter, brightness, contrast);

    canvas.width = filtered.width;
    canvas.height = filtered.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(filtered, 0, 0);
    }
  }, [corners, selectedFilter, brightness, contrast, getRotatedSourceCanvas]);

  /**
   * Esegue la pipeline di rilevamento automatico del documento con OpenCV.js
   */
  const runOpenCvDetection = useCallback(async (currentRot?: number): Promise<QuadCorners> => {
    const img = imgRef.current;
    if (!img) return corners;

    const rot = typeof currentRot === 'number' ? currentRot : rotationRef.current;
    setIsDetecting(true);
    setStatusMessage('Rilevamento documento con OpenCV.js...');

    const isSideways = rot === 90 || rot === 270;
    const rotW = isSideways ? img.naturalHeight : img.naturalWidth;
    const rotH = isSideways ? img.naturalWidth : img.naturalHeight;

    const rotCanvas = document.createElement('canvas');
    rotCanvas.width = rotW;
    rotCanvas.height = rotH;
    const rotCtx = rotCanvas.getContext('2d');
    if (rotCtx) {
      rotCtx.save();
      rotCtx.translate(rotW / 2, rotH / 2);
      rotCtx.rotate((rot * Math.PI) / 180);
      rotCtx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      rotCtx.restore();
    }

    try {
      // Step 1: Document detection con OpenCV.js (lato lungo ~800px, gray, blur, canny, dilate, approxPolyDP 4 vertici)
      const detected = await opencvService.detectDocumentCorners(rotCanvas);
      setCorners(detected);
      setDetectedCorners(detected);
      setStatusMessage('✓ 4 angoli del documento rilevati');
      return detected;
    } catch (err) {
      console.warn('Fallback contorni documento:', err);
      const fallback: QuadCorners = {
        tl: { x: 0.02, y: 0.02 },
        tr: { x: 0.98, y: 0.02 },
        br: { x: 0.98, y: 0.98 },
        bl: { x: 0.02, y: 0.98 },
      };
      setCorners(fallback);
      return fallback;
    } finally {
      setIsDetecting(false);
      setTimeout(() => setStatusMessage(''), 2200);
    }
  }, [corners]);

  // Caricamento immagine iniziale ed esecuzione automatica di orientamento & ritaglio
  useEffect(() => {
    if (!imageFile) return;
    const url = URL.createObjectURL(imageFile);
    setImageSrc(url);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      imgRef.current = img;

      // Inizia in modalità ritaglio a 4 angoli trascinabili
      setShowCropMode(true);
      setSelectedPreset('ai_auto');
      setSelectedFilter('magic_color');

      // Crea canvas di verifica iniziale
      const testCanvas = document.createElement('canvas');
      testCanvas.width = img.naturalWidth;
      testCanvas.height = img.naturalHeight;
      const tctx = testCanvas.getContext('2d');
      if (tctx) {
        tctx.drawImage(img, 0, 0);
      }

      // Step 4: Raddrizzamento automatico dell'orientamento se rilevabile
      try {
        const autoAngle = await opencvService.detectOrientation(testCanvas);
        if (autoAngle !== 0) {
          setRotation(autoAngle);
          rotationRef.current = autoAngle;
        }
      } catch (e) {
        console.warn('Errore orientamento automatico:', e);
      }

      // Step 1: Esegui rilevamento automatico 4 vertici
      await runOpenCvDetection(rotationRef.current);
    };
    img.src = url;

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [imageFile, runOpenCvDetection]);

  // Aggiorna anteprima quando cambiano le selezioni
  useEffect(() => {
    if (!showCropMode) {
      renderProcessedPreview();
    }
  }, [showCropMode, renderProcessedPreview]);

  // Ruota 90 gradi
  const handleRotate = (direction: 'cw' | 'ccw' = 'cw') => {
    setRotation((prev) => {
      const next = direction === 'cw' ? (prev + 90) % 360 : (prev - 90 + 360) % 360;
      rotationRef.current = next;
      return next;
    });
  };

  // Aggiorna mirino e lente d'ingrandimento 2.4x
  const updateLoupeCanvas = useCallback(
    (pt: Point) => {
      const loupeCanvas = loupeCanvasRef.current;
      if (!loupeCanvas) return;

      const rotCanvas = getRotatedSourceCanvas();
      if (!rotCanvas) return;

      const rotW = rotCanvas.width;
      const rotH = rotCanvas.height;
      const ctx = loupeCanvas.getContext('2d');
      if (!ctx) return;

      const px = pt.x * rotW;
      const py = pt.y * rotH;

      const size = 120;
      loupeCanvas.width = size;
      loupeCanvas.height = size;

      const zoom = 2.4;
      const srcRadius = size / 2 / zoom;

      ctx.clearRect(0, 0, size, size);

      ctx.save();
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.clip();

      ctx.drawImage(
        rotCanvas,
        px - srcRadius,
        py - srcRadius,
        srcRadius * 2,
        srcRadius * 2,
        0,
        0,
        size,
        size
      );

      // Mirino a croce CamScanner con accento giallo / bianco
      ctx.strokeStyle = '#FFD23F';
      ctx.lineWidth = 1.6;

      ctx.beginPath();
      ctx.moveTo(0, size / 2);
      ctx.lineTo(size, size / 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(size / 2, 0);
      ctx.lineTo(size / 2, size);
      ctx.stroke();

      ctx.fillStyle = '#FFD23F';
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, 16, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    },
    [getRotatedSourceCanvas]
  );

  // Punti mediani sui 4 lati
  const midTop: Point = {
    x: (corners.tl.x + corners.tr.x) / 2,
    y: (corners.tl.y + corners.tr.y) / 2,
  };
  const midRight: Point = {
    x: (corners.tr.x + corners.br.x) / 2,
    y: (corners.tr.y + corners.br.y) / 2,
  };
  const midBottom: Point = {
    x: (corners.bl.x + corners.br.x) / 2,
    y: (corners.bl.y + corners.br.y) / 2,
  };
  const midLeft: Point = {
    x: (corners.tl.x + corners.bl.x) / 2,
    y: (corners.tl.y + corners.bl.y) / 2,
  };

  // Drag handles (4 angoli + 4 lati)
  const handlePointerDown = (handle: string, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();

    isDraggingRef.current = handle;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    startCornersRef.current = {
      tl: { ...corners.tl },
      tr: { ...corners.tr },
      br: { ...corners.br },
      bl: { ...corners.bl },
    };

    setActiveDraggingHandle(handle);

    let currentPoint = corners.tl;
    if (handle === 'tl') currentPoint = corners.tl;
    else if (handle === 'tr') currentPoint = corners.tr;
    else if (handle === 'br') currentPoint = corners.br;
    else if (handle === 'bl') currentPoint = corners.bl;
    else if (handle === 'mid_top') currentPoint = midTop;
    else if (handle === 'mid_right') currentPoint = midRight;
    else if (handle === 'mid_bottom') currentPoint = midBottom;
    else if (handle === 'mid_left') currentPoint = midLeft;

    setLoupePoint(currentPoint);
    updateLoupeCanvas(currentPoint);

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || !cropSvgContainerRef.current) return;
    e.preventDefault();

    const rect = cropSvgContainerRef.current.getBoundingClientRect();
    const deltaX = (e.clientX - dragStartPos.current.x) / rect.width;
    const deltaY = (e.clientY - dragStartPos.current.y) / rect.height;

    const handle = isDraggingRef.current;
    const prev = startCornersRef.current;
    const clamp = (v: number) => Math.max(0.00, Math.min(1.00, v));

    if (selectedPreset !== 'manual') {
      setSelectedPreset('manual');
    }

    setCorners(() => {
      const next: QuadCorners = {
        tl: { ...prev.tl },
        tr: { ...prev.tr },
        br: { ...prev.br },
        bl: { ...prev.bl },
      };

      if (handle === 'tl') {
        next.tl = { x: clamp(prev.tl.x + deltaX), y: clamp(prev.tl.y + deltaY) };
      } else if (handle === 'tr') {
        next.tr = { x: clamp(prev.tr.x + deltaX), y: clamp(prev.tr.y + deltaY) };
      } else if (handle === 'br') {
        next.br = { x: clamp(prev.br.x + deltaX), y: clamp(prev.br.y + deltaY) };
      } else if (handle === 'bl') {
        next.bl = { x: clamp(prev.bl.x + deltaX), y: clamp(prev.bl.y + deltaY) };
      } else if (handle === 'mid_top') {
        next.tl = { x: clamp(prev.tl.x + deltaX), y: clamp(prev.tl.y + deltaY) };
        next.tr = { x: clamp(prev.tr.x + deltaX), y: clamp(prev.tr.y + deltaY) };
      } else if (handle === 'mid_right') {
        next.tr = { x: clamp(prev.tr.x + deltaX), y: clamp(prev.tr.y + deltaY) };
        next.br = { x: clamp(prev.br.x + deltaX), y: clamp(prev.br.y + deltaY) };
      } else if (handle === 'mid_bottom') {
        next.bl = { x: clamp(prev.bl.x + deltaX), y: clamp(prev.bl.y + deltaY) };
        next.br = { x: clamp(prev.br.x + deltaX), y: clamp(prev.br.y + deltaY) };
      } else if (handle === 'mid_left') {
        next.tl = { x: clamp(prev.tl.x + deltaX), y: clamp(prev.tl.y + deltaY) };
        next.bl = { x: clamp(prev.bl.x + deltaX), y: clamp(prev.bl.y + deltaY) };
      } else if (handle === 'body') {
        const dx = Math.max(-prev.tl.x, Math.min(1 - prev.tr.x, deltaX));
        const dy = Math.max(-prev.tl.y, Math.min(1 - prev.bl.y, deltaY));
        next.tl = { x: clamp(prev.tl.x + dx), y: clamp(prev.tl.y + dy) };
        next.tr = { x: clamp(prev.tr.x + dx), y: clamp(prev.tr.y + dy) };
        next.br = { x: clamp(prev.br.x + dx), y: clamp(prev.br.y + dy) };
        next.bl = { x: clamp(prev.bl.x + dx), y: clamp(prev.bl.y + dy) };
      }

      let updatedPt = next.tl;
      if (handle === 'tl') updatedPt = next.tl;
      else if (handle === 'tr') updatedPt = next.tr;
      else if (handle === 'br') updatedPt = next.br;
      else if (handle === 'bl') updatedPt = next.bl;
      else if (handle === 'mid_top')
        updatedPt = { x: (next.tl.x + next.tr.x) / 2, y: (next.tl.y + next.tr.y) / 2 };
      else if (handle === 'mid_right')
        updatedPt = { x: (next.tr.x + next.br.x) / 2, y: (next.tr.y + next.br.y) / 2 };
      else if (handle === 'mid_bottom')
        updatedPt = { x: (next.bl.x + next.br.x) / 2, y: (next.bl.y + next.br.y) / 2 };
      else if (handle === 'mid_left')
        updatedPt = { x: (next.tl.x + next.bl.x) / 2, y: (next.tl.y + next.bl.y) / 2 };

      setLoupePoint(updatedPt);
      updateLoupeCanvas(updatedPt);

      return next;
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDraggingRef.current) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      isDraggingRef.current = null;
      setActiveDraggingHandle(null);
      setLoupePoint(null);
    }
  };

  // Esegue warpPerspective e applyFilter per produrre il file JPEG pulito finale
  const getProcessedResult = (): Promise<{ file: File; url: string } | null> => {
    return new Promise((resolve) => {
      try {
        const rotCanvas = getRotatedSourceCanvas();
        if (!rotCanvas) return resolve(null);

        // Step 2: Prospettiva a piena risoluzione
        const warped = opencvService.warpPerspective(rotCanvas, corners, 2400);

        // Step 3: Filtro CamScanner scelto (Magic Color, B/N, Grayscale, Originale)
        const filtered = opencvService.applyFilter(warped, selectedFilter, brightness, contrast);

        filtered.toBlob(
          (blob) => {
            if (!blob) {
              const dataUrl = filtered.toDataURL('image/jpeg', 0.9);
              const byteString = atob(dataUrl.split(',')[1]);
              const ab = new ArrayBuffer(byteString.length);
              const ia = new Uint8Array(ab);
              for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
              }
              const fallbackBlob = new Blob([ab], { type: 'image/jpeg' });
              const fallbackFile = new File(
                [fallbackBlob],
                `camscanner-pulita-${Date.now()}.jpg`,
                { type: 'image/jpeg' }
              );
              resolve({ file: fallbackFile, url: dataUrl });
              return;
            }
            const dataUrl = URL.createObjectURL(blob);
            const processedFile = new File(
              [blob],
              `camscanner-pulita-${Date.now()}.jpg`,
              { type: 'image/jpeg' }
            );
            resolve({ file: processedFile, url: dataUrl });
          },
          'image/jpeg',
          0.9
        );
      } catch (err) {
        console.error('Errore getProcessedResult:', err);
        resolve(null);
      }
    });
  };

  const handleAddPage = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    const result = await getProcessedResult();
    setIsProcessing(false);
    if (result && onAddPage) {
      onAddPage(result.file, result.url);
    }
  };

  const handleContinueSavePdf = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    const result = await getProcessedResult();
    setIsProcessing(false);
    if (result) {
      if (onContinueSavePdf) {
        onContinueSavePdf(result.file, result.url);
      } else {
        onConfirm(result.file, result.url);
      }
    }
  };

  // Preset ritaglio rapido
  const handleSelectCropPreset = async (preset: AutoCropOption) => {
    setSelectedPreset(preset);

    const img = imgRef.current;
    if (!img) return;

    const rot = rotationRef.current;
    const isSideways = rot === 90 || rot === 270;
    const rotW = isSideways ? img.naturalHeight : img.naturalWidth;
    const rotH = isSideways ? img.naturalWidth : img.naturalHeight;

    if (preset === 'ai_auto') {
      await runOpenCvDetection();
      return;
    }

    if (preset === 'manual') {
      setStatusMessage('Ritaglio manuale: trascina i 4 angoli');
      setTimeout(() => setStatusMessage(''), 2000);
      return;
    }

    const newQuad = calculatePresetQuad(preset, rotW, rotH, detectedCorners);
    setCorners(newQuad);
  };

  // 4 Filtri con striscia anteprime
  const filterOptions: Array<{
    id: CamScannerFilter;
    label: string;
    sublabel: string;
    icon: any;
    badge?: string;
  }> = [
    {
      id: 'magic_color',
      label: 'Magic Color',
      sublabel: 'Rimozione ombre',
      icon: Sparkles,
      badge: 'CamScanner',
    },
    {
      id: 'original',
      label: 'Originale',
      sublabel: 'Colori fedeli',
      icon: Palette,
    },
    {
      id: 'grayscale',
      label: 'Scala grigi',
      sublabel: 'Doc. pulito',
      icon: Sun,
    },
    {
      id: 'bw',
      label: 'Bianco & Nero',
      sublabel: 'Alto contrasto',
      icon: Contrast,
    },
  ];

  // Coordinate normalizzate per SVG (0 - 1000)
  const cTL = { x: corners.tl.x * 1000, y: corners.tl.y * 1000 };
  const cTR = { x: corners.tr.x * 1000, y: corners.tr.y * 1000 };
  const cBR = { x: corners.br.x * 1000, y: corners.br.y * 1000 };
  const cBL = { x: corners.bl.x * 1000, y: corners.bl.y * 1000 };

  const mTop = { x: (cTL.x + cTR.x) / 2, y: (cTL.y + cTR.y) / 2 };
  const mRight = { x: (cTR.x + cBR.x) / 2, y: (cTR.y + cBR.y) / 2 };
  const mBottom = { x: (cBL.x + cBR.x) / 2, y: (cBL.y + cBR.y) / 2 };
  const mLeft = { x: (cTL.x + cBL.x) / 2, y: (cTL.y + cBL.y) / 2 };

  const isLoupeOnTop = loupePoint ? loupePoint.y > 0.45 : true;
  const isLoupeOnLeft = loupePoint ? loupePoint.x > 0.5 : false;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Editor Scansione CamScanner - Ritaglio Prospettico e Pulizia"
      className="fixed inset-0 z-50 bg-black text-white flex flex-col justify-between overflow-hidden select-none font-sans"
    >
      {/* 1. Header con stile scuro, bordo bianco e badge OpenCV.js */}
      <header className="bg-black/90 border-b border-white/20 text-white px-3 sm:px-4 py-2.5 flex items-center justify-between shrink-0 z-20 backdrop-blur-md">
        <div className="flex items-center gap-2 min-w-0">
          <Wand2 size={18} className="text-[#FFD23F] shrink-0" />
          <div className="flex flex-col min-w-0">
            <h2 className="text-sm font-bold text-white tracking-wide truncate">
              Scanner CamScanner
            </h2>
            <div className="flex items-center gap-1.5 text-[10px] text-white/70">
              <span>Pag. {pageIndex + 1} {totalPages > 1 ? `di ${totalPages}` : ''}</span>
              {openCvStatus === 'loading' && (
                <span className="flex items-center gap-1 text-[#FFD23F] font-medium">
                  <Loader2 size={10} className="animate-spin" />
                  Caricamento OpenCV...
                </span>
              )}
              {openCvStatus === 'ready' && (
                <span className="text-emerald-400 font-medium">✓ OpenCV.js Pronto</span>
              )}
            </div>
          </div>
        </div>

        {/* Selettore Vista: Ritaglio 4 Angoli vs Anteprima Pulita */}
        <div className="flex items-center bg-transparent border-2 border-white rounded-full p-0.5 shadow-sm">
          <button
            type="button"
            onClick={() => setShowCropMode(true)}
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-all ${
              showCropMode
                ? 'bg-[#FFD23F] text-slate-950 font-black shadow-accent-glow'
                : 'text-white hover:text-white/80'
            }`}
            title="Mostra i 4 angoli trascinabili di ritaglio prospettico"
          >
            <Crop size={12} className={showCropMode ? 'text-slate-950 stroke-[2.5]' : 'text-white'} />
            <span>Ritaglio</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setShowCropMode(false);
              renderProcessedPreview();
            }}
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-all ${
              !showCropMode
                ? 'bg-[#FFD23F] text-slate-950 font-black shadow-accent-glow'
                : 'text-white hover:text-white/80'
            }`}
            title="Mostra anteprima del documento pulito e raddrizzato"
          >
            <Eye size={12} className={!showCropMode ? 'text-slate-950 stroke-[2.5]' : 'text-white'} />
            <span>Anteprima</span>
          </button>
        </div>

        {/* Pulsante Continua rapido nell'header */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleContinueSavePdf}
            disabled={isProcessing}
            className="flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-[#FFD23F] text-slate-950 font-black text-xs hover:bg-[#FFE47A] active:scale-95 transition-all disabled:opacity-50 shadow-accent-glow"
            title="Crea PDF con le sole immagini già ritagliate e pulite, senza OCR"
          >
            {isProcessing ? (
              <Loader2 size={13} className="animate-spin text-slate-950" />
            ) : (
              <Check size={14} className="text-slate-950 stroke-[3]" />
            )}
            <span>Continua</span>
          </button>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="w-8 h-8 rounded-full bg-transparent border-2 border-white text-white hover:bg-white/10 flex items-center justify-center transition-colors"
              aria-label="Chiudi"
            >
              <X size={15} className="text-white" />
            </button>
          )}
        </div>
      </header>

      {/* 2. Barra Preset di Ritaglio Rapido */}
      {showCropMode && (
        <section className="bg-black/60 border-b border-white/10 px-2.5 py-1.5 shrink-0 z-20 overflow-x-auto scrollbar-thin">
          <div className="flex items-center gap-1.5 max-w-full min-w-max mx-auto justify-start sm:justify-center">
            <span className="text-[11px] font-bold text-white/70 uppercase tracking-wider pr-1 flex items-center gap-1">
              <ScanLine size={12} className="text-[#FFD23F]" />
              <span>Ritaglio:</span>
            </span>

            {[
              { id: 'ai_auto' as AutoCropOption, label: 'Auto OpenCV', icon: Sparkles },
              { id: 'full_frame' as AutoCropOption, label: 'Tutto', icon: Maximize2 },
              { id: 'a4_doc' as AutoCropOption, label: 'Doc. A4', icon: FileText },
              { id: 'book_spread' as AutoCropOption, label: '2 Pagine', icon: BookOpen },
              { id: 'safe_margins' as AutoCropOption, label: 'Margini 90%', icon: ScanLine },
            ].map((preset) => {
              const Icon = preset.icon;
              const isSelected = selectedPreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectCropPreset(preset.id)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                    isSelected
                      ? 'bg-[#FFD23F] text-slate-950 font-black shadow-accent-glow'
                      : 'bg-transparent border border-white/30 text-white hover:border-white'
                  }`}
                >
                  <Icon size={12} className={isSelected ? 'text-slate-950' : 'text-[#FFD23F]'} />
                  <span>{preset.label}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* 3. Main Viewport */}
      <main className="flex-1 overflow-hidden relative flex items-center justify-center p-2 sm:p-4 bg-black select-none">
        {/* MODALITÀ RITAGLIO A 4 ANGOLI TRASCINABILI */}
        <div
          className={`relative max-w-full max-h-[62vh] sm:max-h-[68vh] items-center justify-center touch-none overflow-hidden select-none ${
            showCropMode ? 'flex' : 'hidden'
          }`}
        >
          {imageSrc && (
            <img
              src={imageSrc}
              alt="Scansione da ritagliare"
              style={{
                transform: `rotate(${rotation}deg)`,
                transformOrigin: 'center center',
              }}
              className="max-h-[58vh] sm:max-h-[64vh] max-w-full object-contain pointer-events-none rounded-lg"
            />
          )}

          {/* SVG Overlay dei 4 angoli trascinabili */}
          <svg
            ref={cropSvgContainerRef}
            viewBox="0 0 1000 1000"
            preserveAspectRatio="none"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="absolute inset-0 w-full h-full touch-none select-none cursor-crosshair z-10"
          >
            {/* Maschera esterna oscurante */}
            <path
              d={`M 0 0 L 1000 0 L 1000 1000 L 0 1000 Z M ${cTL.x} ${cTL.y} L ${cBL.x} ${cBL.y} L ${cBR.x} ${cBR.y} L ${cTR.x} ${cTR.y} Z`}
              fill="rgba(0, 0, 0, 0.64)"
              fillRule="evenodd"
              className="pointer-events-none"
            />

            {/* Area interna per trascinamento dell'intero foglio */}
            <polygon
              points={`${cTL.x},${cTL.y} ${cTR.x},${cTR.y} ${cBR.x},${cBR.y} ${cBL.x},${cBL.y}`}
              fill="rgba(255, 255, 255, 0.04)"
              onPointerDown={(e) => handlePointerDown('body', e)}
              className="cursor-move"
            />

            {/* Griglia interna a terzi */}
            <line
              x1={cTL.x * 0.66 + cBL.x * 0.34}
              y1={cTL.y * 0.66 + cBL.y * 0.34}
              x2={cTR.x * 0.66 + cBR.x * 0.34}
              y2={cTR.y * 0.66 + cBR.y * 0.34}
              stroke="rgba(255, 255, 255, 0.28)"
              strokeWidth="1.2"
              strokeDasharray="4 4"
              className="pointer-events-none"
            />
            <line
              x1={cTL.x * 0.34 + cBL.x * 0.66}
              y1={cTL.y * 0.34 + cBL.y * 0.66}
              x2={cTR.x * 0.34 + cBR.x * 0.66}
              y2={cTR.y * 0.34 + cBR.y * 0.66}
              stroke="rgba(255, 255, 255, 0.28)"
              strokeWidth="1.2"
              strokeDasharray="4 4"
              className="pointer-events-none"
            />
            <line
              x1={cTL.x * 0.66 + cTR.x * 0.34}
              y1={cTL.y * 0.66 + cTR.y * 0.34}
              x2={cBL.x * 0.66 + cBR.x * 0.34}
              y2={cBL.y * 0.66 + cBR.y * 0.34}
              stroke="rgba(255, 255, 255, 0.28)"
              strokeWidth="1.2"
              strokeDasharray="4 4"
              className="pointer-events-none"
            />
            <line
              x1={cTL.x * 0.34 + cTR.x * 0.66}
              y1={cTL.y * 0.34 + cTR.y * 0.66}
              x2={cBL.x * 0.34 + cBR.x * 0.66}
              y2={cBL.y * 0.34 + cBR.y * 0.66}
              stroke="rgba(255, 255, 255, 0.28)"
              strokeWidth="1.2"
              strokeDasharray="4 4"
              className="pointer-events-none"
            />

            {/* Bordo quadrilatero bianco luminoso con accento CamScanner */}
            <polygon
              points={`${cTL.x},${cTL.y} ${cTR.x},${cTR.y} ${cBR.x},${cBR.y} ${cBL.x},${cBL.y}`}
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2.5"
              strokeDasharray="7 4"
              className="pointer-events-none"
            />

            {/* 4 Maniglie sui lati mediani */}
            <g onPointerDown={(e) => handlePointerDown('mid_top', e)} className="cursor-ns-resize">
              <rect x={mTop.x - 20} y={mTop.y - 7} width="40" height="14" rx="7" fill="#FFFFFF" stroke="#000000" strokeWidth="2" />
              <line x1={mTop.x - 8} y1={mTop.y} x2={mTop.x + 8} y2={mTop.y} stroke="#FFD23F" strokeWidth="2.5" strokeLinecap="round" />
            </g>
            <g onPointerDown={(e) => handlePointerDown('mid_right', e)} className="cursor-ew-resize">
              <rect x={mRight.x - 7} y={mRight.y - 20} width="14" height="40" rx="7" fill="#FFFFFF" stroke="#000000" strokeWidth="2" />
              <line x1={mRight.x} y1={mRight.y - 8} x2={mRight.x} y2={mRight.y + 8} stroke="#FFD23F" strokeWidth="2.5" strokeLinecap="round" />
            </g>
            <g onPointerDown={(e) => handlePointerDown('mid_bottom', e)} className="cursor-ns-resize">
              <rect x={mBottom.x - 20} y={mBottom.y - 7} width="40" height="14" rx="7" fill="#FFFFFF" stroke="#000000" strokeWidth="2" />
              <line x1={mBottom.x - 8} y1={mBottom.y} x2={mBottom.x + 8} y2={mBottom.y} stroke="#FFD23F" strokeWidth="2.5" strokeLinecap="round" />
            </g>
            <g onPointerDown={(e) => handlePointerDown('mid_left', e)} className="cursor-ew-resize">
              <rect x={mLeft.x - 7} y={mLeft.y - 20} width="14" height="40" rx="7" fill="#FFFFFF" stroke="#000000" strokeWidth="2" />
              <line x1={mLeft.x} y1={mLeft.y - 8} x2={mLeft.x} y2={mLeft.y + 8} stroke="#FFD23F" strokeWidth="2.5" strokeLinecap="round" />
            </g>

            {/* I 4 ANGOLI PRINCIPALI TRASCINABILI (TL, TR, BR, BL) */}
            {/* Top-Left */}
            <g onPointerDown={(e) => handlePointerDown('tl', e)} className="cursor-nwse-resize">
              <circle cx={cTL.x} cy={cTL.y} r="28" fill="transparent" />
              <circle cx={cTL.x} cy={cTL.y} r="18" fill="#FFFFFF" stroke="#000000" strokeWidth="3" />
              <circle cx={cTL.x} cy={cTL.y} r="7" fill="#FFD23F" />
            </g>

            {/* Top-Right */}
            <g onPointerDown={(e) => handlePointerDown('tr', e)} className="cursor-nesw-resize">
              <circle cx={cTR.x} cy={cTR.y} r="28" fill="transparent" />
              <circle cx={cTR.x} cy={cTR.y} r="18" fill="#FFFFFF" stroke="#000000" strokeWidth="3" />
              <circle cx={cTR.x} cy={cTR.y} r="7" fill="#FFD23F" />
            </g>

            {/* Bottom-Right */}
            <g onPointerDown={(e) => handlePointerDown('br', e)} className="cursor-nwse-resize">
              <circle cx={cBR.x} cy={cBR.y} r="28" fill="transparent" />
              <circle cx={cBR.x} cy={cBR.y} r="18" fill="#FFFFFF" stroke="#000000" strokeWidth="3" />
              <circle cx={cBR.x} cy={cBR.y} r="7" fill="#FFD23F" />
            </g>

            {/* Bottom-Left */}
            <g onPointerDown={(e) => handlePointerDown('bl', e)} className="cursor-nesw-resize">
              <circle cx={cBL.x} cy={cBL.y} r="28" fill="transparent" />
              <circle cx={cBL.x} cy={cBL.y} r="18" fill="#FFFFFF" stroke="#000000" strokeWidth="3" />
              <circle cx={cBL.x} cy={cBL.y} r="7" fill="#FFD23F" />
            </g>
          </svg>

          {/* Lente d'ingrandimento 2.4x durante il drag */}
          {activeDraggingHandle && (
            <div
              className={`absolute z-40 flex flex-col items-center gap-1 pointer-events-none transition-all duration-75 ${
                isLoupeOnTop ? 'top-3' : 'bottom-3'
              } ${isLoupeOnLeft ? 'left-3' : 'right-3'}`}
            >
              <div className="relative w-28 h-28 rounded-full border-2 border-white shadow-[0_0_24px_rgba(0,0,0,0.9)] overflow-hidden bg-black flex items-center justify-center">
                <canvas ref={loupeCanvasRef} className="w-full h-full object-cover" />
                <span className="absolute bottom-1 bg-black/85 text-[9px] font-black text-[#FFD23F] px-1.5 py-0.5 rounded-full border border-white/30">
                  2.4x
                </span>
              </div>
              <span className="text-[10px] font-bold text-white bg-black/80 px-2 py-0.5 rounded-full border border-white/20">
                Precisione pixel
              </span>
            </div>
          )}

          {/* Raggio laser durante il rilevamento */}
          {isDetecting && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-25">
              <div className="absolute left-0 right-0 h-1 bg-[#FFD23F] shadow-[0_0_16px_#FFD23F] animate-laser-scan pointer-events-none" />
            </div>
          )}

          {statusMessage && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-35 bg-black/90 border-2 border-white px-3.5 py-1 rounded-full shadow-2xl flex items-center gap-1.5 text-xs font-bold text-white pointer-events-none whitespace-nowrap">
              {isDetecting ? (
                <Loader2 size={13} className="animate-spin text-[#FFD23F]" />
              ) : (
                <CheckCheck size={13} className="text-[#FFD23F]" />
              )}
              <span>{statusMessage}</span>
            </div>
          )}
        </div>

        {/* MODALITÀ ANTEPRIMA DOCUMENTO PULITO */}
        <div
          className={`relative max-w-full max-h-[62vh] sm:max-h-[68vh] shadow-2xl rounded-2xl overflow-hidden bg-transparent border-2 border-white items-center justify-center p-2 ${
            !showCropMode ? 'flex' : 'hidden'
          }`}
        >
          <canvas
            ref={previewCanvasRef}
            className="max-h-[58vh] sm:max-h-[64vh] max-w-full object-contain rounded-lg"
          />

          <button
            type="button"
            onClick={() => setShowCropMode(true)}
            className="absolute bottom-3 right-3 z-30 bg-transparent border-2 border-white hover:bg-white/10 text-white text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-md flex items-center gap-1.5 shadow-lg active:scale-95 transition-all cursor-pointer"
            title="Modifica manualmente i 4 angoli di ritaglio"
          >
            <Crop size={13} className="text-[#FFD23F]" />
            <span>Regola ritaglio</span>
          </button>
        </div>
      </main>

      {/* 4. STRISCIA ANTEPRIME FILTRI CAMSCANNER (Magic Color default, Originale, Scala grigi, B/N) */}
      <section className="bg-black/90 border-t border-white/20 px-2.5 py-2 shrink-0 z-20 overflow-x-auto scrollbar-thin">
        <div className="flex items-center gap-2 max-w-md mx-auto justify-center">
          {filterOptions.map((f) => {
            const Icon = f.icon;
            const isSelected = selectedFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  setSelectedFilter(f.id);
                  // Passa ad anteprima pulita per mostrare il risultato del filtro
                  setShowCropMode(false);
                }}
                className={`flex-1 flex flex-col items-center justify-center p-1.5 rounded-xl transition-all cursor-pointer text-center relative ${
                  isSelected
                    ? 'bg-[#FFD23F] text-slate-950 font-black shadow-accent-glow scale-102'
                    : 'bg-transparent border border-white/30 text-white hover:border-white'
                }`}
              >
                {f.badge && (
                  <span
                    className={`absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] font-black px-1.5 py-0.2 rounded-full uppercase tracking-tighter ${
                      isSelected
                        ? 'bg-slate-950 text-[#FFD23F]'
                        : 'bg-[#FFD23F] text-slate-950'
                    }`}
                  >
                    {f.badge}
                  </span>
                )}
                <Icon size={16} className={isSelected ? 'text-slate-950' : 'text-[#FFD23F]'} />
                <span className="text-[11px] font-bold truncate leading-tight mt-0.5">
                  {f.label}
                </span>
                <span className={`text-[9px] truncate ${isSelected ? 'text-slate-800' : 'text-white/60'}`}>
                  {f.sublabel}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 5. FOOTER CON CONTROLLI: Ripeti, Ruota Sx, Ruota Dx, + Pagina, Continua */}
      <footer className="bg-black border-t border-white/20 px-2 sm:px-4 py-2 pb-5 sm:pb-3 shrink-0 z-20">
        <div className="flex items-center justify-between max-w-lg mx-auto w-full gap-1.5">
          {/* 1. Ripeti (Rifai scatto o ricarica) */}
          <button
            type="button"
            onClick={onRetake}
            className="flex flex-col items-center justify-center gap-1 p-1 rounded-2xl text-white hover:bg-white/10 active:scale-95 transition-all flex-1 min-w-0"
            title="Scatta o carica di nuovo questa pagina"
            aria-label="Ripeti"
          >
            <div className="w-10 h-10 rounded-2xl bg-transparent border-2 border-white flex items-center justify-center text-white">
              <RefreshCw size={18} className="text-white" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold text-white tracking-tight truncate">
              Ripeti
            </span>
          </button>

          {/* 2. Ruota Sx (90° Antiorario) */}
          <button
            type="button"
            onClick={() => handleRotate('ccw')}
            className="flex flex-col items-center justify-center gap-1 p-1 rounded-2xl text-white hover:bg-white/10 active:scale-95 transition-all flex-1 min-w-0"
            title="Ruota 90° a sinistra"
            aria-label="Ruota Sx"
          >
            <div className="w-10 h-10 rounded-2xl bg-transparent border-2 border-white flex items-center justify-center text-white">
              <RotateCcw size={18} className="text-white" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold text-white tracking-tight truncate">
              Ruota Sx
            </span>
          </button>

          {/* 3. Ruota Dx (90° Orario) */}
          <button
            type="button"
            onClick={() => handleRotate('cw')}
            className="flex flex-col items-center justify-center gap-1 p-1 rounded-2xl text-white hover:bg-white/10 active:scale-95 transition-all flex-1 min-w-0"
            title="Ruota 90° a destra"
            aria-label="Ruota Dx"
          >
            <div className="w-10 h-10 rounded-2xl bg-transparent border-2 border-white flex items-center justify-center text-white">
              <RotateCw size={18} className="text-white" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold text-white tracking-tight truncate">
              Ruota Dx
            </span>
          </button>

          {/* 4. Aggiungi pagina (Scatto Multiplo) */}
          <button
            type="button"
            onClick={handleAddPage}
            disabled={isProcessing}
            className="flex flex-col items-center justify-center gap-1 p-1 rounded-2xl text-white hover:bg-white/10 active:scale-95 transition-all flex-1 min-w-0 disabled:opacity-50"
            title="Aggiungi questa pagina ed esegui un altro scatto (Scatto Multiplo)"
            aria-label="+ Pagina"
          >
            <div className="w-10 h-10 rounded-2xl bg-transparent border-2 border-dashed border-[#FFD23F] flex items-center justify-center text-[#FFD23F]">
              <Plus size={19} className="text-[#FFD23F] stroke-[2.5]" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold text-[#FFD23F] tracking-tight truncate">
              + Pagina
            </span>
          </button>

          {/* 5. Continua (Crea PDF senza OCR) */}
          <button
            type="button"
            onClick={handleContinueSavePdf}
            disabled={isProcessing}
            className="flex flex-col items-center justify-center gap-1 p-1 rounded-2xl text-white hover:bg-white/10 active:scale-95 transition-all flex-1 min-w-0 disabled:opacity-50"
            title="Crea PDF con le sole immagini già ritagliate e pulite, senza OCR"
            aria-label="Continua"
          >
            <div className="w-10 h-10 rounded-2xl bg-[#FFD23F] text-slate-950 flex items-center justify-center shadow-accent-glow hover:bg-[#FFE47A] transition-colors">
              {isProcessing ? (
                <Loader2 size={20} className="animate-spin text-slate-950" />
              ) : (
                <Check size={22} className="text-slate-950 stroke-[3]" />
              )}
            </div>
            <span className="text-[10px] sm:text-[11px] font-black text-white tracking-tight truncate">
              Continua
            </span>
          </button>
        </div>
      </footer>
    </div>
  );
};
