import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Crop,
  Sparkles,
  RotateCw,
  RotateCcw,
  Check,
  X,
  Sliders,
  Maximize2,
  RefreshCw,
  Wand2,
  Sun,
  Contrast,
  FileCheck,
  Camera,
} from 'lucide-react';

export type CamScannerFilter = 'magic_color' | 'bw' | 'grayscale' | 'original';

interface CamScannerEditorProps {
  imageFile: File;
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
  onConfirm,
  onRetake,
  onCancel,
}) => {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [rotation, setRotation] = useState<number>(0);
  const [selectedFilter, setSelectedFilter] = useState<CamScannerFilter>('magic_color');
  const [brightness, setBrightness] = useState<number>(10); // -50 to 50
  const [contrast, setContrast] = useState<number>(25); // -50 to 50
  const [activeTab, setActiveTab] = useState<'crop' | 'filter'>('crop');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Crop box normalized coordinates (0 to 1)
  const [cropBox, setCropBox] = useState<CropBox>({
    x: 0.05,
    y: 0.05,
    width: 0.9,
    height: 0.9,
  });

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Dragging state for crop handles
  const isDraggingRef = useRef<string | null>(null);
  const dragStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const startCropBox = useRef<CropBox>({ ...cropBox });

  // Load image from file on mount
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
  const handleRotate = (direction: 'cw' | 'ccw') => {
    setRotation((prev) => {
      const next = direction === 'cw' ? (prev + 90) % 360 : (prev - 90 + 360) % 360;
      return next;
    });
  };

  // Preset: Reset crop to full image
  const handleFullCrop = () => {
    setCropBox({
      x: 0.02,
      y: 0.02,
      width: 0.96,
      height: 0.96,
    });
  };

  // Preset: Auto document border margins (CamScanner default)
  const handleAutoBorderCrop = () => {
    setCropBox({
      x: 0.08,
      y: 0.06,
      width: 0.84,
      height: 0.88,
    });
  };

  /**
   * Apply CamScanner cleaning algorithm to image pixel data
   */
  const applyCamScannerCleanFilter = useCallback(
    (imageData: ImageData, filter: CamScannerFilter, bVal: number, cVal: number) => {
      const data = imageData.data;
      const len = data.length;

      // Brightness and contrast factor
      const factor = (259 * (cVal + 255)) / (255 * (259 - cVal));

      for (let i = 0; i < len; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // 1. Calculate luminance (standard standard BT.601)
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;

        if (filter === 'magic_color') {
          // CamScanner Magic Color:
          // Whiten the page background (remove yellow/grey shadows), enhance text ink sharpness
          if (lum > 140) {
            // Paper background: push aggressively to crisp clean white
            const boost = (lum - 140) * 1.5;
            r = Math.min(255, r + boost + bVal * 1.5);
            g = Math.min(255, g + boost + bVal * 1.5);
            b = Math.min(255, b + boost + bVal * 1.5);
          } else {
            // Text / ink: darken and sharpen for maximum legibility
            r = Math.max(0, r * 0.65 - 10);
            g = Math.max(0, g * 0.65 - 10);
            b = Math.max(0, b * 0.65 - 10);
          }
          // Slight contrast stretch
          r = factor * (r - 128) + 128;
          g = factor * (g - 128) + 128;
          b = factor * (b - 128) + 128;
        } else if (filter === 'bw') {
          // Black & White (Photocopy Thresholding)
          const threshold = 135 + bVal;
          const val = lum >= threshold ? 255 : 0;
          r = val;
          g = val;
          b = val;
        } else if (filter === 'grayscale') {
          // Grayscale Clean
          let gVal = lum + bVal;
          gVal = factor * (gVal - 128) + 128;
          gVal = Math.max(0, Math.min(255, gVal));
          r = gVal;
          g = gVal;
          b = gVal;
        } else {
          // Original with custom brightness/contrast
          r = factor * (r - 128) + 128 + bVal;
          g = factor * (g - 128) + 128 + bVal;
          b = factor * (b - 128) + 128 + bVal;
        }

        // Clamp 0..255
        data[i] = Math.max(0, Math.min(255, r));
        data[i + 1] = Math.max(0, Math.min(255, g));
        data[i + 2] = Math.max(0, Math.min(255, b));
      }
    },
    []
  );

  /**
   * Render preview to canvas reflecting current crop, rotation, and clean filter
   */
  const renderProcessedPreview = useCallback(() => {
    const img = imgRef.current;
    const canvas = previewCanvasRef.current;
    if (!img || !canvas) return;

    // Offscreen canvas for rotated source
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

    // Calculate crop pixel area
    const cropX = Math.max(0, Math.min(rotW, cropBox.x * rotW));
    const cropY = Math.max(0, Math.min(rotH, cropBox.y * rotH));
    const cropW = Math.max(50, Math.min(rotW - cropX, cropBox.width * rotW));
    const cropH = Math.max(50, Math.min(rotH - cropY, cropBox.height * rotH));

    // Size destination preview canvas
    canvas.width = cropW;
    canvas.height = cropH;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Draw cropped region
    ctx.drawImage(rotCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    // Apply CamScanner filter if selected
    if (selectedFilter !== 'original' || brightness !== 0 || contrast !== 0) {
      const imageData = ctx.getImageData(0, 0, cropW, cropH);
      applyCamScannerCleanFilter(imageData, selectedFilter, brightness, contrast);
      ctx.putImageData(imageData, 0, 0);
    }
  }, [rotation, cropBox, selectedFilter, brightness, contrast, applyCamScannerCleanFilter]);

  // Re-render preview whenever crop, rotation, or filter changes
  useEffect(() => {
    renderProcessedPreview();
  }, [renderProcessedPreview]);

  // Handle Dragging crop handles (Mouse & Touch)
  const handlePointerDown = (handle: string, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingRef.current = handle;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    startCropBox.current = { ...cropBox };

    // Capture pointer
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || !containerRef.current) return;
    e.preventDefault();

    const rect = containerRef.current.getBoundingClientRect();
    const deltaX = (e.clientX - dragStartPos.current.x) / rect.width;
    const deltaY = (e.clientY - dragStartPos.current.y) / rect.height;

    const handle = isDraggingRef.current;
    const prev = startCropBox.current;

    setCropBox(() => {
      let nextX = prev.x;
      let nextY = prev.y;
      let nextW = prev.width;
      let nextH = prev.height;

      const minSize = 0.15; // Minimum 15% width/height

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
   * Finalize and export cleaned image as File
   */
  const handleConfirmAndProcess = () => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;

    setIsProcessing(true);

    canvas.toBlob(
      (blob) => {
        setIsProcessing(false);
        if (blob) {
          const processedFile = new File(
            [blob],
            `camscanner-pulita-${Date.now()}.jpg`,
            { type: 'image/jpeg' }
          );
          const processedUrl = URL.createObjectURL(blob);
          onConfirm(processedFile, processedUrl);
        }
      },
      'image/jpeg',
      0.95
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Editor CamScanner - Ritaglia e Pulisci documento"
      className="fixed inset-0 z-50 bg-[#0A0B10] text-white flex flex-col justify-between overflow-hidden select-none font-sans"
    >
      {/* Top Bar Header */}
      <header className="bg-[#12141D] border-b border-[#232736] px-4 py-3 flex items-center justify-between shrink-0 z-20 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-red-950/70 border border-red-500/50 text-red-400 flex items-center justify-center shrink-0">
            <Wand2 size={18} />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2 leading-tight">
              <span>CamScanner</span>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-red-600 text-white">
                Ritaglia & Pulisci
              </span>
            </h2>
            <p className="text-[11px] text-gray-400 font-medium">
              Regola i bordi della pagina e applica il filtro documento
            </p>
          </div>
        </div>

        {/* Rotate and Cancel Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleRotate('ccw')}
            className="w-9 h-9 rounded-xl bg-[#1C2030] hover:bg-[#252B40] text-gray-300 hover:text-white flex items-center justify-center transition-colors"
            title="Ruota a sinistra (90°)"
            aria-label="Ruota sinistra"
          >
            <RotateCcw size={16} />
          </button>
          <button
            type="button"
            onClick={() => handleRotate('cw')}
            className="w-9 h-9 rounded-xl bg-[#1C2030] hover:bg-[#252B40] text-gray-300 hover:text-white flex items-center justify-center transition-colors"
            title="Ruota a destra (90°)"
            aria-label="Ruota destra"
          >
            <RotateCw size={16} />
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="w-9 h-9 rounded-xl bg-[#1C2030] text-gray-400 hover:text-white flex items-center justify-center transition-colors ml-1"
              aria-label="Annulla"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </header>

      {/* Main Interactive Stage */}
      <main className="flex-1 overflow-hidden relative flex items-center justify-center p-3 sm:p-6 bg-[#07080D]">
        {activeTab === 'crop' ? (
          /* CROP MODE: Interactive Drag Handles on Image */
          <div
            ref={containerRef}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="relative max-w-full max-h-[60vh] sm:max-h-[68vh] aspect-auto shadow-2xl rounded-lg overflow-hidden border border-[#2B3147] flex items-center justify-center bg-black"
          >
            {/* Base Image with Rotation */}
            {imageSrc && (
              <img
                src={imageSrc}
                alt="Foto documento da ritagliare"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transformOrigin: 'center center',
                }}
                className="max-h-[58vh] sm:max-h-[66vh] max-w-full object-contain pointer-events-none transition-transform duration-200"
              />
            )}

            {/* Dark Mask Overlay around crop box */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Semi-transparent dark overlay outside crop box */}
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

            {/* Interactive Crop Boundary Box (CamScanner Style) */}
            <div
              onPointerDown={(e) => handlePointerDown('move', e)}
              style={{
                left: `${cropBox.x * 100}%`,
                top: `${cropBox.y * 100}%`,
                width: `${cropBox.width * 100}%`,
                height: `${cropBox.height * 100}%`,
              }}
              className="absolute border-2 border-red-500 shadow-xl cursor-move touch-none"
            >
              {/* Rule of Thirds Grid Lines (CamScanner Document Guides) */}
              <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 border border-red-400/30">
                <div className="border-r border-b border-white/20" />
                <div className="border-r border-b border-white/20" />
                <div className="border-b border-white/20" />
                <div className="border-r border-b border-white/20" />
                <div className="border-r border-b border-white/20" />
                <div className="border-b border-white/20" />
                <div className="border-r border-white/20" />
                <div className="border-r border-white/20" />
                <div />
              </div>

              {/* Top-Left Corner Handle */}
              <div
                onPointerDown={(e) => handlePointerDown('tl', e)}
                className="absolute -top-3.5 -left-3.5 w-7 h-7 bg-white border-3 border-red-600 rounded-full cursor-nwse-resize shadow-md flex items-center justify-center hover:scale-125 transition-transform"
              />
              {/* Top-Right Corner Handle */}
              <div
                onPointerDown={(e) => handlePointerDown('tr', e)}
                className="absolute -top-3.5 -right-3.5 w-7 h-7 bg-white border-3 border-red-600 rounded-full cursor-nesw-resize shadow-md flex items-center justify-center hover:scale-125 transition-transform"
              />
              {/* Bottom-Left Corner Handle */}
              <div
                onPointerDown={(e) => handlePointerDown('bl', e)}
                className="absolute -bottom-3.5 -left-3.5 w-7 h-7 bg-white border-3 border-red-600 rounded-full cursor-nesw-resize shadow-md flex items-center justify-center hover:scale-125 transition-transform"
              />
              {/* Bottom-Right Corner Handle */}
              <div
                onPointerDown={(e) => handlePointerDown('br', e)}
                className="absolute -bottom-3.5 -right-3.5 w-7 h-7 bg-white border-3 border-red-600 rounded-full cursor-nwse-resize shadow-md flex items-center justify-center hover:scale-125 transition-transform"
              />
            </div>
          </div>
        ) : (
          /* FILTER PREVIEW MODE: Live Cleaned Canvas */
          <div className="relative max-w-full max-h-[62vh] sm:max-h-[68vh] shadow-2xl rounded-2xl overflow-hidden border border-zinc-700/80 bg-zinc-900 flex items-center justify-center p-2">
            <canvas
              ref={previewCanvasRef}
              className="max-h-[58vh] sm:max-h-[64vh] max-w-full object-contain shadow-2xl rounded-lg"
            />
          </div>
        )}
      </main>

      {/* Hidden processing canvas if in crop mode */}
      {activeTab === 'crop' && (
        <canvas ref={previewCanvasRef} className="hidden" aria-hidden="true" />
      )}

      {/* Bottom Controls Panel */}
      <footer className="bg-[#12141D] border-t border-[#232736] p-3 sm:p-4 flex flex-col gap-3 shrink-0 z-20 shadow-2xl">
        {/* Tab Selector: Ritaglia vs Pulisci Filtri */}
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('crop')}
            className={`flex-1 min-h-[42px] rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
              activeTab === 'crop'
                ? 'bg-white text-black shadow-md'
                : 'bg-[#181B28] text-gray-300 hover:text-white border border-[#2B3147]'
            }`}
          >
            <Crop size={16} />
            <span>1. Ritaglia bordi</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('filter')}
            className={`flex-1 min-h-[42px] rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
              activeTab === 'filter'
                ? 'bg-red-600 text-white shadow-md'
                : 'bg-[#181B28] text-gray-300 hover:text-white border border-[#2B3147]'
            }`}
          >
            <Wand2 size={16} />
            <span>2. Pulisci come CamScanner</span>
          </button>
        </div>

        {/* Tab 1: Crop Presets */}
        {activeTab === 'crop' && (
          <div className="flex items-center justify-center gap-2 overflow-x-auto py-0.5">
            <button
              type="button"
              onClick={handleAutoBorderCrop}
              className="px-3 py-1.5 rounded-xl bg-[#1C2030] hover:bg-[#252B40] text-gray-200 border border-[#2B3147] text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <Sparkles size={13} className="text-yellow-400" />
              <span>Adatta bordi pagina</span>
            </button>
            <button
              type="button"
              onClick={handleFullCrop}
              className="px-3 py-1.5 rounded-xl bg-[#1C2030] hover:bg-[#252B40] text-gray-200 border border-[#2B3147] text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <Maximize2 size={13} />
              <span>Intero fotogramma</span>
            </button>
          </div>
        )}

        {/* Tab 2: CamScanner Clean Filters */}
        {activeTab === 'filter' && (
          <div className="flex flex-col gap-2.5 animate-fade-in">
            {/* Filter Buttons */}
            <div className="grid grid-cols-4 gap-2">
              {/* Filter 1: Magic Color (Iconic CamScanner) */}
              <button
                type="button"
                onClick={() => setSelectedFilter('magic_color')}
                className={`p-2 rounded-xl border flex flex-col items-center gap-1 text-center transition-all ${
                  selectedFilter === 'magic_color'
                    ? 'bg-red-950/70 border-red-500 text-white shadow-md'
                    : 'bg-[#181B28] border-[#2A2E40] text-gray-400 hover:text-white'
                }`}
              >
                <div className="w-6 h-6 rounded-lg bg-red-600 flex items-center justify-center text-white">
                  <Wand2 size={13} />
                </div>
                <span className="text-[11px] font-bold">Magico</span>
              </button>

              {/* Filter 2: B&W High Contrast */}
              <button
                type="button"
                onClick={() => setSelectedFilter('bw')}
                className={`p-2 rounded-xl border flex flex-col items-center gap-1 text-center transition-all ${
                  selectedFilter === 'bw'
                    ? 'bg-red-950/70 border-red-500 text-white shadow-md'
                    : 'bg-[#181B28] border-[#2A2E40] text-gray-400 hover:text-white'
                }`}
              >
                <div className="w-6 h-6 rounded-lg bg-zinc-800 border border-white flex items-center justify-center text-white font-black text-[10px]">
                  B/N
                </div>
                <span className="text-[11px] font-bold">Fotocopia</span>
              </button>

              {/* Filter 3: Grayscale */}
              <button
                type="button"
                onClick={() => setSelectedFilter('grayscale')}
                className={`p-2 rounded-xl border flex flex-col items-center gap-1 text-center transition-all ${
                  selectedFilter === 'grayscale'
                    ? 'bg-red-950/70 border-red-500 text-white shadow-md'
                    : 'bg-[#181B28] border-[#2A2E40] text-gray-400 hover:text-white'
                }`}
              >
                <div className="w-6 h-6 rounded-lg bg-zinc-500 flex items-center justify-center text-white">
                  <Sliders size={13} />
                </div>
                <span className="text-[11px] font-bold">Grigi</span>
              </button>

              {/* Filter 4: Original */}
              <button
                type="button"
                onClick={() => setSelectedFilter('original')}
                className={`p-2 rounded-xl border flex flex-col items-center gap-1 text-center transition-all ${
                  selectedFilter === 'original'
                    ? 'bg-red-950/70 border-red-500 text-white shadow-md'
                    : 'bg-[#181B28] border-[#2A2E40] text-gray-400 hover:text-white'
                }`}
              >
                <div className="w-6 h-6 rounded-lg bg-[#22283A] flex items-center justify-center text-gray-300">
                  <Camera size={13} />
                </div>
                <span className="text-[11px] font-bold">Originale</span>
              </button>
            </div>

            {/* Brightness & Contrast Sliders */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="flex items-center gap-2">
                <Sun size={14} className="text-gray-400 shrink-0" />
                <input
                  type="range"
                  min="-40"
                  max="40"
                  value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  className="w-full h-1.5 bg-[#2B3147] rounded-lg appearance-none cursor-pointer accent-red-500"
                  title="Luminosità"
                />
              </div>
              <div className="flex items-center gap-2">
                <Contrast size={14} className="text-gray-400 shrink-0" />
                <input
                  type="range"
                  min="-30"
                  max="50"
                  value={contrast}
                  onChange={(e) => setContrast(Number(e.target.value))}
                  className="w-full h-1.5 bg-[#2B3147] rounded-lg appearance-none cursor-pointer accent-red-500"
                  title="Contrasto"
                />
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons: Retake vs Confirm & OCR */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <button
            type="button"
            onClick={onRetake}
            className="min-h-[46px] px-4 rounded-xl bg-[#1C2030] hover:bg-[#252B40] text-gray-300 hover:text-white font-bold text-xs flex items-center gap-2 transition-all active:scale-95 border border-[#2B3147]"
          >
            <RefreshCw size={15} />
            <span>Scatta di nuovo</span>
          </button>

          <button
            type="button"
            onClick={handleConfirmAndProcess}
            disabled={isProcessing}
            className="flex-1 min-h-[46px] px-5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-600/30 active:scale-98 disabled:opacity-60"
          >
            <Check size={18} />
            <span>Applica e Scansiona OCR</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
