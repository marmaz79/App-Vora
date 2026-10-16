import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Crop,
  RotateCw,
  RotateCcw,
  Check,
  X,
  Wand2,
  Contrast,
  Camera,
  RefreshCw,
  Plus,
  ArrowRight,
} from 'lucide-react';

export type CamScannerFilter = 'magic_color' | 'bw' | 'grayscale' | 'original';

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

interface CropBox {
  x: number; // 0 to 1
  y: number; // 0 to 1
  width: number; // 0 to 1
  height: number; // 0 to 1
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
  const [showCropMode, setShowCropMode] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Normalized crop box (0 to 1)
  const [cropBox, setCropBox] = useState<CropBox>({
    x: 0.02,
    y: 0.02,
    width: 0.96,
    height: 0.96,
  });

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const cropContainerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Dragging state for crop handles
  const isDraggingRef = useRef<string | null>(null);
  const dragStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const startCropBox = useRef<CropBox>({ ...cropBox });

  // Load image on mount
  useEffect(() => {
    if (!imageFile) return;
    const url = URL.createObjectURL(imageFile);
    setImageSrc(url);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgRef.current = img;
      renderProcessedPreview();
    };
    img.src = url;

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [imageFile]);

  // Rotate image by 90 degrees
  const handleRotate = (direction: 'cw' | 'ccw' = 'cw') => {
    setRotation((prev) => {
      const next = direction === 'cw' ? (prev + 90) % 360 : (prev - 90 + 360) % 360;
      return next;
    });
  };

  /**
   * Pulizia automatica della foto (CamScanner Auto-Clean / Background Whitening):
   * Stima adattiva della luminosità locale della carta per eliminare completamente ombre,
   * pieghe e riflessi, sbiancando lo sfondo a bianco puro ed esaltando contrasto e nitidezza dell'inchiostro.
   */
  const applyCamScannerCleanFilter = useCallback(
    (imageData: ImageData, filter: CamScannerFilter, bVal: number, cVal: number) => {
      const data = imageData.data;
      const w = imageData.width;
      const h = imageData.height;
      const len = data.length;

      if (filter === 'original') {
        if (bVal === 0 && cVal === 0) return;
        const factor = (259 * (cVal + 255)) / (255 * (259 - cVal));
        for (let i = 0; i < len; i += 4) {
          data[i] = Math.max(0, Math.min(255, factor * (data[i] - 128) + 128 + bVal));
          data[i + 1] = Math.max(0, Math.min(255, factor * (data[i + 1] - 128) + 128 + bVal));
          data[i + 2] = Math.max(0, Math.min(255, factor * (data[i + 2] - 128) + 128 + bVal));
        }
        return;
      }

      // Griglia adattiva per calcolare la luminosità locale della carta
      const gridCols = 16;
      const gridRows = 16;
      const bgGrid: number[][] = Array.from({ length: gridRows }, () =>
        new Array(gridCols).fill(160)
      );

      const cellW = w / gridCols;
      const cellH = h / gridRows;

      for (let gy = 0; gy < gridRows; gy++) {
        const startY = Math.floor(gy * cellH);
        const endY = Math.floor((gy + 1) * cellH);
        for (let gx = 0; gx < gridCols; gx++) {
          const startX = Math.floor(gx * cellW);
          const endX = Math.floor((gx + 1) * cellW);

          let maxLum = 0;
          let lumSum = 0;
          let count = 0;
          const stepX = Math.max(2, Math.floor(cellW / 12));
          const stepY = Math.max(2, Math.floor(cellH / 12));

          for (let y = startY; y < endY; y += stepY) {
            for (let x = startX; x < endX; x += stepX) {
              const idx = (y * w + x) * 4;
              const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
              if (lum > maxLum) maxLum = lum;
              lumSum += lum;
              count++;
            }
          }

          const avgLum = count > 0 ? lumSum / count : 128;
          bgGrid[gy][gx] = Math.max(60, Math.min(252, maxLum * 0.72 + avgLum * 0.28));
        }
      }

      const contrastFactor = (259 * (cVal + 255)) / (255 * (259 - cVal));

      for (let y = 0; y < h; y++) {
        const gy = Math.max(0, Math.min(gridRows - 1.001, y / cellH - 0.5));
        const gy0 = Math.floor(gy);
        const gy1 = Math.min(gridRows - 1, gy0 + 1);
        const wy = gy - gy0;

        for (let x = 0; x < w; x++) {
          const gx = Math.max(0, Math.min(gridCols - 1.001, x / cellW - 0.5));
          const gx0 = Math.floor(gx);
          const gx1 = Math.min(gridCols - 1, gx0 + 1);
          const wx = gx - gx0;

          const top = bgGrid[gy0][gx0] * (1 - wx) + bgGrid[gy0][gx1] * wx;
          const bot = bgGrid[gy1][gx0] * (1 - wx) + bgGrid[gy1][gx1] * wx;
          const localBg = Math.max(50, top * (1 - wy) + bot * wy);

          const idx = (y * w + x) * 4;
          let r = data[idx];
          let g = data[idx + 1];
          let b = data[idx + 2];
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;

          const ratio = lum / localBg;

          if (filter === 'magic_color') {
            // Pulizia automatica CamScanner:
            // Sfondo della carta sbiancato a bianco pulito, inchiostro scuro e ad alto contrasto
            if (ratio >= 0.84) {
              const norm = Math.min(1, (ratio - 0.84) / 0.16);
              const whiten = Math.pow(norm, 0.55);
              r = r + (255 - r) * whiten;
              g = g + (255 - g) * whiten;
              b = b + (255 - b) * whiten;
            } else {
              const inkFactor = Math.pow(ratio / 0.84, 1.3);
              r = r * inkFactor * 0.75;
              g = g * inkFactor * 0.75;
              b = b * inkFactor * 0.75;
            }
            r = contrastFactor * (r - 128) + 128 + bVal;
            g = contrastFactor * (g - 128) + 128 + bVal;
            b = contrastFactor * (b - 128) + 128 + bVal;
          } else if (filter === 'bw') {
            const isWhite = ratio >= 0.78;
            const val = isWhite ? 255 : 0;
            r = val;
            g = val;
            b = val;
          } else if (filter === 'grayscale') {
            let gVal = ratio >= 0.84 ? 255 : (lum / localBg) * 210;
            gVal = contrastFactor * (gVal - 128) + 128 + bVal;
            r = gVal;
            g = gVal;
            b = gVal;
          }

          data[idx] = Math.max(0, Math.min(255, r));
          data[idx + 1] = Math.max(0, Math.min(255, g));
          data[idx + 2] = Math.max(0, Math.min(255, b));
        }
      }
    },
    []
  );

  /**
   * Genera e visualizza la preview pulita sul canvas
   */
  const renderProcessedPreview = useCallback(() => {
    const img = imgRef.current;
    const canvas = previewCanvasRef.current;
    if (!img || !canvas) return;

    // Canvas temporaneo per rotazione
    const rotCanvas = document.createElement('canvas');
    const isSideways = rotation === 90 || rotation === 270;
    const rotW = isSideways ? img.naturalHeight : img.naturalWidth;
    const rotH = isSideways ? img.naturalWidth : img.naturalHeight;
    rotCanvas.width = rotW;
    rotCanvas.height = rotH;

    const rotCtx = rotCanvas.getContext('2d');
    if (!rotCtx) return;

    rotCtx.save();
    rotCtx.translate(rotW / 2, rotH / 2);
    rotCtx.rotate((rotation * Math.PI) / 180);
    rotCtx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    rotCtx.restore();

    // Calcolo coordinate di ritaglio
    const cropX = Math.max(0, Math.min(rotW, cropBox.x * rotW));
    const cropY = Math.max(0, Math.min(rotH, cropBox.y * rotH));
    const rawCropW = Math.max(50, Math.min(rotW - cropX, cropBox.width * rotW));
    const rawCropH = Math.max(50, Math.min(rotH - cropY, cropBox.height * rotH));

    // Scala a risoluzione ad alta definizione ottimale (max 1280px) per prestazioni istantanee senza blocchi
    const maxDimension = 1280;
    let targetW = Math.round(rawCropW);
    let targetH = Math.round(rawCropH);
    if (targetW > maxDimension || targetH > maxDimension) {
      if (targetW > targetH) {
        targetH = Math.round((targetH * maxDimension) / targetW);
        targetW = maxDimension;
      } else {
        targetW = Math.round((targetW * maxDimension) / targetH);
        targetH = maxDimension;
      }
    }

    // Dimensiona il canvas finale di anteprima
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Disegna la porzione ritagliata scalata
    ctx.drawImage(rotCanvas, cropX, cropY, rawCropW, rawCropH, 0, 0, targetW, targetH);

    // Applica sempre la pulizia automatica o il filtro selezionato
    const imageData = ctx.getImageData(0, 0, targetW, targetH);
    applyCamScannerCleanFilter(imageData, selectedFilter, brightness, contrast);
    ctx.putImageData(imageData, 0, 0);
  }, [rotation, cropBox, selectedFilter, brightness, contrast, applyCamScannerCleanFilter]);

  // Aggiorna l'anteprima quando cambiano filtri o ritaglio
  useEffect(() => {
    renderProcessedPreview();
  }, [renderProcessedPreview]);

  // Gestione drag per le maniglie di ritaglio (mouse e touch)
  const handlePointerDown = (handle: string, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingRef.current = handle;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    startCropBox.current = { ...cropBox };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || !cropContainerRef.current) return;
    e.preventDefault();

    const rect = cropContainerRef.current.getBoundingClientRect();
    const deltaX = (e.clientX - dragStartPos.current.x) / rect.width;
    const deltaY = (e.clientY - dragStartPos.current.y) / rect.height;

    const handle = isDraggingRef.current;
    const prev = startCropBox.current;

    setCropBox(() => {
      let nextX = prev.x;
      let nextY = prev.y;
      let nextW = prev.width;
      let nextH = prev.height;

      const minSize = 0.15;

      if (handle === 'tl') {
        nextX = Math.max(0, Math.min(prev.x + deltaX, prev.x + prev.width - minSize));
        nextY = Math.max(0, Math.min(prev.y + deltaY, prev.y + prev.height - minSize));
        nextW = prev.width - (nextX - prev.x);
        nextH = prev.height - (nextY - prev.y);
      } else if (handle === 'tr') {
        nextY = Math.max(0, Math.min(prev.y + deltaY, prev.y + prev.height - minSize));
        nextW = Math.max(minSize, Math.min(1 - prev.x, prev.width + deltaX));
        nextH = prev.height - (nextY - prev.y);
      } else if (handle === 'bl') {
        nextX = Math.max(0, Math.min(prev.x + deltaX, prev.x + prev.width - minSize));
        nextW = prev.width - (nextX - prev.x);
        nextH = Math.max(minSize, Math.min(1 - prev.y, prev.height + deltaY));
      } else if (handle === 'br') {
        nextW = Math.max(minSize, Math.min(1 - prev.x, prev.width + deltaX));
        nextH = Math.max(minSize, Math.min(1 - prev.y, prev.height + deltaY));
      } else if (handle === 'move') {
        nextX = Math.max(0, Math.min(1 - prev.width, prev.x + deltaX));
        nextY = Math.max(0, Math.min(1 - prev.height, prev.y + deltaY));
      }

      return {
        x: Math.max(0, Math.min(1 - minSize, nextX)),
        y: Math.max(0, Math.min(1 - minSize, nextY)),
        width: Math.max(minSize, Math.min(1, nextW)),
        height: Math.max(minSize, Math.min(1, nextH)),
      };
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDraggingRef.current) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      isDraggingRef.current = null;
    }
  };

  /**
   * Genera il file e l'URL ripulito dal canvas in formato JPEG compatto e durevole
   */
  const getProcessedResult = (): Promise<{ file: File; url: string } | null> => {
    return new Promise((resolve) => {
      const canvas = previewCanvasRef.current;
      if (!canvas) return resolve(null);
      try {
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              const byteString = atob(dataUrl.split(',')[1]);
              const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
              const ab = new ArrayBuffer(byteString.length);
              const ia = new Uint8Array(ab);
              for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
              }
              const fallbackBlob = new Blob([ab], { type: mimeString });
              const fallbackFile = new File(
                [fallbackBlob],
                `camscanner-pulita-${Date.now()}.jpg`,
                { type: 'image/jpeg' }
              );
              resolve({ file: fallbackFile, url: dataUrl });
              return;
            }
            const processedFile = new File(
              [blob],
              `camscanner-pulita-${Date.now()}.jpg`,
              { type: 'image/jpeg' }
            );
            resolve({ file: processedFile, url: dataUrl });
          },
          'image/jpeg',
          0.82
        );
      } catch (err) {
        console.error('Errore getProcessedResult:', err);
        resolve(null);
      }
    });
  };

  /**
   * Scatti Multipli: Salva la pagina corrente e apre la fotocamera per il prossimo scatto
   */
  const handleAddPage = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    const result = await getProcessedResult();
    setIsProcessing(false);
    if (result && onAddPage) {
      onAddPage(result.file, result.url);
    }
  };

  /**
   * Continua: salva il libro direttamente nella libreria in PDF
   */
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Editor CamScanner - Pulizia e Ritaglio Documento"
      className="fixed inset-0 z-50 bg-black text-white flex flex-col justify-between overflow-hidden select-none font-sans"
    >
      {/* Header compatto ed essenziale con indicatore di pagina */}
      <header className="bg-black border-b border-zinc-800 px-3 sm:px-4 py-3 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <Wand2 size={18} className="text-white shrink-0" />
          <h2 className="text-sm font-bold text-white tracking-wide">
            CamScanner
          </h2>
          <span className="text-[11px] font-bold bg-white/15 px-2.5 py-0.5 rounded-full text-white border border-white/20 whitespace-nowrap">
            Pagina {pageIndex + 1} {totalPages > 1 ? `di ${totalPages}` : ''}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Pulsante rapido Continua in alto */}
          <button
            type="button"
            onClick={handleContinueSavePdf}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-black font-extrabold text-xs shadow-md hover:bg-gray-100 active:scale-95 transition-all disabled:opacity-50"
            title="Salva il libro nella libreria in PDF"
          >
            <Check size={14} className="text-black stroke-[3]" />
            <span>Continua</span>
          </button>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="w-9 h-9 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center transition-colors border border-white/20 shrink-0"
              aria-label="Chiudi"
            >
              <X size={18} className="text-white" />
            </button>
          )}
        </div>
      </header>

      {/* Main Viewport: Anteprima Documento Pulito o Modalità Ritaglio */}
      <main className="flex-1 overflow-hidden relative flex items-center justify-center p-3 sm:p-5 bg-black">
        {showCropMode ? (
          /* CROP MODE: Immagine ruotata con rettangolo e maniglie interattive bianche */
          <div
            ref={cropContainerRef}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="relative max-w-full max-h-[64vh] sm:max-h-[70vh] flex items-center justify-center touch-none overflow-hidden select-none"
          >
            {imageSrc && (
              <img
                src={imageSrc}
                alt="Foto da ritagliare"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transformOrigin: 'center center',
                }}
                className="max-h-[60vh] sm:max-h-[66vh] max-w-full object-contain pointer-events-none"
              />
            )}

            {/* Overlay scuro fuori dal box di ritaglio */}
            <div className="absolute inset-0 pointer-events-none">
              <div
                className="absolute inset-0 bg-black/60 backdrop-blur-[1px]"
                style={{
                  clipPath: `polygon(
                    0% 0%, 100% 0%, 100% 100%, 0% 100%,
                    0% 0%,
                    ${cropBox.x * 100}% ${cropBox.y * 100}%,
                    ${cropBox.x * 100}% ${(cropBox.y + cropBox.height) * 100}%,
                    ${(cropBox.x + cropBox.width) * 100}% ${(cropBox.y + cropBox.height) * 100}%,
                    ${(cropBox.x + cropBox.width) * 100}% ${cropBox.y * 100}%,
                    ${cropBox.x * 100}% ${cropBox.y * 100}%
                  )`,
                }}
              />
            </div>

            {/* Box di ritaglio in bianco stile CamScanner */}
            <div
              onPointerDown={(e) => handlePointerDown('move', e)}
              style={{
                left: `${cropBox.x * 100}%`,
                top: `${cropBox.y * 100}%`,
                width: `${cropBox.width * 100}%`,
                height: `${cropBox.height * 100}%`,
              }}
              className="absolute border-2 border-white shadow-[0_0_15px_rgba(255,255,255,0.4)] cursor-move touch-none"
            >
              {/* Griglia a terzi bianca */}
              <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 border border-white/30">
                <div className="border-r border-b border-white/20" />
                <div className="border-r border-b border-white/20" />
                <div className="border-b border-white/20" />
                <div className="border-r border-b border-white/20" />
                <div className="border-r border-b border-white/20" />
                <div className="border-b border-white/20" />
                <div className="border-r border-b border-white/20" />
                <div className="border-r border-b border-white/20" />
                <div />
              </div>

              {/* 4 Maniglie angolari bianche */}
              <div
                onPointerDown={(e) => handlePointerDown('tl', e)}
                className="absolute -top-3.5 -left-3.5 w-7 h-7 bg-white border-2 border-zinc-900 rounded-full cursor-nwse-resize shadow-lg flex items-center justify-center hover:scale-125 transition-transform"
              />
              <div
                onPointerDown={(e) => handlePointerDown('tr', e)}
                className="absolute -top-3.5 -right-3.5 w-7 h-7 bg-white border-2 border-zinc-900 rounded-full cursor-nesw-resize shadow-lg flex items-center justify-center hover:scale-125 transition-transform"
              />
              <div
                onPointerDown={(e) => handlePointerDown('bl', e)}
                className="absolute -bottom-3.5 -left-3.5 w-7 h-7 bg-white border-2 border-zinc-900 rounded-full cursor-nesw-resize shadow-lg flex items-center justify-center hover:scale-125 transition-transform"
              />
              <div
                onPointerDown={(e) => handlePointerDown('br', e)}
                className="absolute -bottom-3.5 -right-3.5 w-7 h-7 bg-white border-2 border-zinc-900 rounded-full cursor-nwse-resize shadow-lg flex items-center justify-center hover:scale-125 transition-transform"
              />
            </div>
          </div>
        ) : (
          /* AUTO-CLEAN PREVIEW: Mostra subito il documento con pulizia automatica applicata */
          <div className="relative max-w-full max-h-[64vh] sm:max-h-[70vh] shadow-2xl rounded-2xl overflow-hidden border border-zinc-700/80 bg-zinc-900 flex items-center justify-center p-2">
            <canvas
              ref={previewCanvasRef}
              className="max-h-[60vh] sm:max-h-[66vh] max-w-full object-contain shadow-2xl rounded-lg"
            />
          </div>
        )}
      </main>

      {/* Canvas nascosto se in modalità ritaglio per non perdere il rendering */}
      {showCropMode && (
        <canvas ref={previewCanvasRef} className="hidden" aria-hidden="true" />
      )}

      {/* Barra inferiore: opzioni con icone e nome sotto, con Scatti Multipli (+ Pagina) e Continua */}
      <footer className="bg-black border-t border-zinc-800 px-1.5 sm:px-4 py-2.5 pb-6 sm:pb-3 shrink-0 z-20 shadow-2xl">
        <div className="flex items-center justify-between max-w-lg mx-auto w-full gap-1">
          {/* 1. Icona Rifai */}
          <button
            type="button"
            onClick={onRetake}
            className="flex flex-col items-center justify-center gap-1 p-1 rounded-2xl text-white hover:bg-white/10 active:scale-95 transition-all flex-1 min-w-0"
            title="Scatta di nuovo questa pagina"
            aria-label="Rifai"
          >
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
              <RefreshCw size={19} className="text-white" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold text-white tracking-tight truncate">Rifai</span>
          </button>

          {/* 2. Icona Pulizia Automatica */}
          <button
            type="button"
            onClick={() => {
              setSelectedFilter('magic_color');
              setShowCropMode(false);
            }}
            className="flex flex-col items-center justify-center gap-1 p-1 rounded-2xl text-white hover:bg-white/10 active:scale-95 transition-all flex-1 min-w-0"
            title="Pulizia automatica documento"
            aria-label="Pulisci"
          >
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white transition-all ${
                selectedFilter === 'magic_color' && !showCropMode
                  ? 'bg-white/30 border-2 border-white shadow-[0_0_12px_rgba(255,255,255,0.4)]'
                  : 'bg-white/10 border border-white/20'
              }`}
            >
              <Wand2 size={19} className="text-white" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold text-white tracking-tight truncate">Pulisci</span>
          </button>

          {/* 3. Icona Bianco e Nero */}
          <button
            type="button"
            onClick={() => {
              setSelectedFilter('bw');
              setShowCropMode(false);
            }}
            className="flex flex-col items-center justify-center gap-1 p-1 rounded-2xl text-white hover:bg-white/10 active:scale-95 transition-all flex-1 min-w-0"
            title="Filtro bianco e nero"
            aria-label="B/N"
          >
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white transition-all ${
                selectedFilter === 'bw' && !showCropMode
                  ? 'bg-white/30 border-2 border-white shadow-[0_0_12px_rgba(255,255,255,0.4)]'
                  : 'bg-white/10 border border-white/20'
              }`}
            >
              <Contrast size={19} className="text-white" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold text-white tracking-tight truncate">B/N</span>
          </button>

          {/* 4. Icona Ritaglia */}
          <button
            type="button"
            onClick={() => setShowCropMode((prev) => !prev)}
            className="flex flex-col items-center justify-center gap-1 p-1 rounded-2xl text-white hover:bg-white/10 active:scale-95 transition-all flex-1 min-w-0"
            title="Ritaglia bordi documento"
            aria-label="Ritaglia"
          >
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white transition-all ${
                showCropMode
                  ? 'bg-white/30 border-2 border-white shadow-[0_0_12px_rgba(255,255,255,0.4)]'
                  : 'bg-white/10 border border-white/20'
              }`}
            >
              <Crop size={19} className="text-white" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold text-white tracking-tight truncate">Ritaglia</span>
          </button>

          {/* 5. Icona Ruota */}
          <button
            type="button"
            onClick={() => handleRotate('cw')}
            className="flex flex-col items-center justify-center gap-1 p-1 rounded-2xl text-white hover:bg-white/10 active:scale-95 transition-all flex-1 min-w-0"
            title="Ruota immagine (90°)"
            aria-label="Ruota"
          >
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
              <RotateCw size={19} className="text-white" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold text-white tracking-tight truncate">Ruota</span>
          </button>

          {/* 6. SCATTI MULTIPLI: + Pagina */}
          <button
            type="button"
            onClick={handleAddPage}
            disabled={isProcessing}
            className="flex flex-col items-center justify-center gap-1 p-1 rounded-2xl text-white hover:bg-white/10 active:scale-95 transition-all flex-1 min-w-0 disabled:opacity-50"
            title="Aggiungi questa pagina ed esegui un altro scatto (Scatti Multipli)"
            aria-label="+ Pagina"
          >
            <div className="w-10 h-10 rounded-2xl bg-white/15 border-2 border-dashed border-white flex items-center justify-center text-white hover:bg-white/25 transition-colors">
              <Plus size={20} className="text-white stroke-[2.5]" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold text-white tracking-tight truncate">+ Pagina</span>
          </button>

          {/* 7. CONTINUA: Salva libro nella libreria in PDF */}
          <button
            type="button"
            onClick={handleContinueSavePdf}
            disabled={isProcessing}
            className="flex flex-col items-center justify-center gap-1 p-1 rounded-2xl text-white hover:bg-white/10 active:scale-95 transition-all flex-1 min-w-0 disabled:opacity-50"
            title="Salva il libro nella libreria in PDF"
            aria-label="Continua"
          >
            <div className="w-10 h-10 rounded-2xl bg-white text-black border-2 border-white flex items-center justify-center shadow-[0_0_16px_rgba(255,255,255,0.45)] hover:bg-gray-100 transition-colors">
              <Check size={22} className="text-black stroke-[3]" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-black text-white tracking-tight truncate">Continua</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
