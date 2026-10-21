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
  ZoomIn,
} from 'lucide-react';

export type CamScannerFilter = 'magic_color' | 'bw' | 'grayscale' | 'original';

export type AutoCropOption =
  | 'ai_auto'
  | 'a4_doc'
  | 'book_spread'
  | 'safe_margins'
  | 'full_frame'
  | 'manual';

export interface Point {
  x: number; // 0 to 1 normalized
  y: number; // 0 to 1 normalized
}

export interface QuadCorners {
  tl: Point; // Angolo superiore sinistro
  tr: Point; // Angolo superiore destro
  br: Point; // Angolo inferiore destro
  bl: Point; // Angolo inferiore sinistro
}

export interface CropBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

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

// Converte un CropBox asse-allineato nei 4 vertici del quadrilatero CamScanner
export function boxToQuad(box: CropBox): QuadCorners {
  return {
    tl: { x: box.x, y: box.y },
    tr: { x: Math.min(1, box.x + box.width), y: box.y },
    br: { x: Math.min(1, box.x + box.width), y: Math.min(1, box.y + box.height) },
    bl: { x: box.x, y: Math.min(1, box.y + box.height) },
  };
}

// Calcola i 4 vertici del quadrilatero per i preset CamScanner
export function calculatePresetQuad(
  preset: AutoCropOption,
  imgWidth: number,
  imgHeight: number,
  aiCorners?: QuadCorners | null
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
      if (aiCorners) return aiCorners;
      return {
        tl: { x: 0.04, y: 0.04 },
        tr: { x: 0.96, y: 0.04 },
        br: { x: 0.96, y: 0.96 },
        bl: { x: 0.04, y: 0.96 },
      };

    case 'manual':
    default:
      return (
        aiCorners || {
          tl: { x: 0.04, y: 0.04 },
          tr: { x: 0.96, y: 0.04 },
          br: { x: 0.96, y: 0.96 },
          bl: { x: 0.04, y: 0.96 },
        }
      );
  }
}

// Algoritmo locale ultra-rapido per individuare la carta nella foto
function detectPaperBoundsLocal(canvas: HTMLCanvasElement): CropBox {
  const w = canvas.width;
  const h = canvas.height;
  if (!w || !h) return { x: 0.04, y: 0.04, width: 0.92, height: 0.92 };

  const thumbW = 200;
  const thumbH = Math.max(100, Math.round((h / w) * thumbW));
  const off = document.createElement('canvas');
  off.width = thumbW;
  off.height = thumbH;
  const ctx = off.getContext('2d', { willReadFrequently: true });
  if (!ctx) return { x: 0.04, y: 0.04, width: 0.92, height: 0.92 };

  ctx.drawImage(canvas, 0, 0, thumbW, thumbH);
  const imgData = ctx.getImageData(0, 0, thumbW, thumbH);
  const d = imgData.data;

  let totalLum = 0;
  const lums: number[] = new Array(thumbW * thumbH);
  for (let i = 0; i < d.length; i += 4) {
    const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    lums[i / 4] = l;
    totalLum += l;
  }
  const avgLum = totalLum / lums.length;
  const paperThreshold = Math.max(70, Math.min(210, avgLum * 0.90));

  const rowCounts = new Array(thumbH).fill(0);
  const colCounts = new Array(thumbW).fill(0);

  for (let y = 0; y < thumbH; y++) {
    for (let x = 0; x < thumbW; x++) {
      if (lums[y * thumbW + x] >= paperThreshold) {
        rowCounts[y]++;
        colCounts[x]++;
      }
    }
  }

  let minY = 0;
  while (minY < thumbH - 10 && rowCounts[minY] < thumbW * 0.18) minY++;
  let maxY = thumbH - 1;
  while (maxY > minY + 10 && rowCounts[maxY] < thumbW * 0.18) maxY--;

  let minX = 0;
  while (minX < thumbW - 10 && colCounts[minX] < thumbH * 0.18) minX++;
  let maxX = thumbW - 1;
  while (maxX > minX + 10 && colCounts[maxX] < thumbH * 0.18) maxX--;

  const normX = Math.max(0.01, Math.min(0.8, (minX / thumbW) - 0.015));
  const normY = Math.max(0.01, Math.min(0.8, (minY / thumbH) - 0.015));
  const normW = Math.max(0.2, Math.min(1 - normX, ((maxX - minX) / thumbW) + 0.03));
  const normH = Math.max(0.2, Math.min(1 - normY, ((maxY - minY) / thumbH) + 0.03));

  return {
    x: Number(normX.toFixed(4)),
    y: Number(normY.toFixed(4)),
    width: Number(normW.toFixed(4)),
    height: Number(normH.toFixed(4)),
  };
}

/**
 * Renderizza un triangolo affine per il raddrizzamento prospettico a tassellatura bilineare
 */
function renderAffineTriangle(
  ctx: CanvasRenderingContext2D,
  srcCanvas: HTMLCanvasElement,
  x0: number, y0: number,
  x1: number, y1: number,
  x2: number, y2: number,
  u0: number, v0: number,
  u1: number, v1: number,
  u2: number, v2: number
) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.closePath();
  ctx.clip();

  const delta = u0 * (v1 - v2) + u1 * (v2 - v0) + u2 * (v0 - v1);
  if (Math.abs(delta) < 1e-7) {
    ctx.restore();
    return;
  }

  const a = (x0 * (v1 - v2) + x1 * (v2 - v0) + x2 * (v0 - v1)) / delta;
  const b = (y0 * (v1 - v2) + y1 * (v2 - v0) + y2 * (v0 - v1)) / delta;
  const c = (x0 * (u2 - u1) + x1 * (u0 - u2) + x2 * (u1 - u0)) / delta;
  const d = (y0 * (u2 - u1) + y1 * (u0 - u2) + y2 * (u1 - u0)) / delta;
  const e = (x0 * (u1 * v2 - u2 * v1) + x1 * (u2 * v0 - u0 * v2) + x2 * (u0 * v1 - u1 * v0)) / delta;
  const f = (y0 * (u1 * v2 - u2 * v1) + y1 * (u2 * v0 - u0 * v2) + y2 * (u0 * v1 - u1 * v0)) / delta;

  ctx.transform(a, b, c, d, e, f);
  ctx.drawImage(srcCanvas, 0, 0);
  ctx.restore();
}

/**
 * Raddrizzamento prospettico stile CamScanner (Perspective Homography Warp):
 * trasforma il quadrilatero a 4 vertici in un documento piatto, rettangolare, dritto e nitido.
 */
function warpPerspective(
  srcCanvas: HTMLCanvasElement,
  corners: QuadCorners,
  dstWidth: number,
  dstHeight: number
): HTMLCanvasElement {
  const dstCanvas = document.createElement('canvas');
  dstCanvas.width = dstWidth;
  dstCanvas.height = dstHeight;
  const ctx = dstCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return dstCanvas;

  const srcW = srcCanvas.width;
  const srcH = srcCanvas.height;

  // Coordinate in pixel dei 4 vertici sorgente
  const p0 = { x: corners.tl.x * srcW, y: corners.tl.y * srcH };
  const p1 = { x: corners.tr.x * srcW, y: corners.tr.y * srcH };
  const p2 = { x: corners.br.x * srcW, y: corners.br.y * srcH };
  const p3 = { x: corners.bl.x * srcW, y: corners.bl.y * srcH };

  // Interpolazione bilineare per coordinate normalizzate (u, v)
  const sample = (u: number, v: number) => ({
    x: (1 - u) * (1 - v) * p0.x + u * (1 - v) * p1.x + u * v * p2.x + (1 - u) * v * p3.x,
    y: (1 - u) * (1 - v) * p0.y + u * (1 - v) * p1.y + u * v * p2.y + (1 - u) * v * p3.y,
  });

  // Griglia 12x12 (288 triangoli GPU) per un raddrizzamento fluido e accurato senza distorsioni
  const gridN = 12;
  const stepU = 1 / gridN;
  const stepV = 1 / gridN;

  for (let i = 0; i < gridN; i++) {
    const u0 = i * stepU;
    const u1 = (i + 1) * stepU;
    const dx0 = u0 * dstWidth;
    const dx1 = u1 * dstWidth;

    for (let j = 0; j < gridN; j++) {
      const v0 = j * stepV;
      const v1 = (j + 1) * stepV;
      const dy0 = v0 * dstHeight;
      const dy1 = v1 * dstHeight;

      const s00 = sample(u0, v0);
      const s10 = sample(u1, v0);
      const s11 = sample(u1, v1);
      const s01 = sample(u0, v1);

      // Triangolo 1
      renderAffineTriangle(
        ctx,
        srcCanvas,
        dx0, dy0,
        dx1, dy0,
        dx0, dy1,
        s00.x, s00.y,
        s10.x, s10.y,
        s01.x, s01.y
      );

      // Triangolo 2
      renderAffineTriangle(
        ctx,
        srcCanvas,
        dx1, dy0,
        dx1, dy1,
        dx0, dy1,
        s10.x, s10.y,
        s11.x, s11.y,
        s01.x, s01.y
      );
    }
  }

  return dstCanvas;
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

  // Modalità: subito attiva la modalità ritaglio prospettico a 8 punti di CamScanner
  const [showCropMode, setShowCropMode] = useState<boolean>(true);
  const [selectedPreset, setSelectedPreset] = useState<AutoCropOption>('ai_auto');

  // I 4 vertici del quadrilatero prospettico CamScanner (TL, TR, BR, BL)
  const [corners, setCorners] = useState<QuadCorners>({
    tl: { x: 0.04, y: 0.04 },
    tr: { x: 0.96, y: 0.04 },
    br: { x: 0.96, y: 0.96 },
    bl: { x: 0.04, y: 0.96 },
  });
  const [aiDetectedCorners, setAiDetectedCorners] = useState<QuadCorners | null>(null);

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isAiDetecting, setIsAiDetecting] = useState<boolean>(false);
  const [aiStatusMessage, setAiStatusMessage] = useState<string>('');

  // Lente di ingrandimento (Loupe) interattiva durante il trascinamento delle maniglie
  const [activeDraggingHandle, setActiveDraggingHandle] = useState<string | null>(null);
  const [loupePoint, setLoupePoint] = useState<Point | null>(null);

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const loupeCanvasRef = useRef<HTMLCanvasElement>(null);
  const cropSvgContainerRef = useRef<SVGSVGElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Riferimenti per il drag delle 8 maniglie
  const isDraggingRef = useRef<string | null>(null);
  const dragStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const startCornersRef = useRef<QuadCorners>({ ...corners });

  const rotationRef = useRef(rotation);
  useEffect(() => {
    rotationRef.current = rotation;
  }, [rotation]);

  /**
   * Filtro Pulizia Carta CamScanner (Magic Color / B/N / Grayscale)
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
   * Genera la rotazione corrente dell'immagine sorgente in un canvas
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
   * Raddrizza prospetticamente il quadrilatero e applica la pulizia carta
   */
  const renderProcessedPreview = useCallback(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;

    const rotCanvas = getRotatedSourceCanvas();
    if (!rotCanvas) return;

    const rotW = rotCanvas.width;
    const rotH = rotCanvas.height;

    // Calcolo dimensioni target del rettangolo raddrizzato
    const p0 = { x: corners.tl.x * rotW, y: corners.tl.y * rotH };
    const p1 = { x: corners.tr.x * rotW, y: corners.tr.y * rotH };
    const p2 = { x: corners.br.x * rotW, y: corners.br.y * rotH };
    const p3 = { x: corners.bl.x * rotW, y: corners.bl.y * rotH };

    const topW = Math.hypot(p1.x - p0.x, p1.y - p0.y);
    const botW = Math.hypot(p2.x - p3.x, p2.y - p3.y);
    const leftH = Math.hypot(p3.x - p0.x, p3.y - p0.y);
    const rightH = Math.hypot(p2.x - p1.x, p2.y - p1.y);

    let targetW = Math.round(Math.max(topW, botW));
    let targetH = Math.round(Math.max(leftH, rightH));

    const maxDim = 1400;
    if (targetW > maxDim || targetH > maxDim) {
      if (targetW > targetH) {
        targetH = Math.round((targetH * maxDim) / targetW);
        targetW = maxDim;
      } else {
        targetW = Math.round((targetW * maxDim) / targetH);
        targetH = maxDim;
      }
    }
    targetW = Math.max(100, targetW);
    targetH = Math.max(100, targetH);

    // Esegue il raddrizzamento prospettico a 4 angoli
    const warped = warpPerspective(rotCanvas, corners, targetW, targetH);

    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    ctx.drawImage(warped, 0, 0);

    const imageData = ctx.getImageData(0, 0, targetW, targetH);
    applyCamScannerCleanFilter(imageData, selectedFilter, brightness, contrast);
    ctx.putImageData(imageData, 0, 0);
  }, [corners, selectedFilter, brightness, contrast, applyCamScannerCleanFilter, getRotatedSourceCanvas]);

  /**
   * Esegue il rilevamento prospettico intelligente con Computer Vision locale e Gemini AI
   */
  const runAiSmartCrop = useCallback(async (currentRot?: number): Promise<QuadCorners | null> => {
    const img = imgRef.current;
    if (!img) return null;

    const rot = typeof currentRot === 'number' ? currentRot : rotationRef.current;
    setIsAiDetecting(true);
    setAiStatusMessage('Rilevamento contorni CamScanner in corso...');

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

    // 1. Rilevamento locale istantaneo
    let bestQuad: QuadCorners = {
      tl: { x: 0.04, y: 0.04 },
      tr: { x: 0.96, y: 0.04 },
      br: { x: 0.96, y: 0.96 },
      bl: { x: 0.04, y: 0.96 },
    };
    try {
      const localBox = detectPaperBoundsLocal(rotCanvas);
      bestQuad = boxToQuad(localBox);
      setCorners(bestQuad);
      setAiDetectedCorners(bestQuad);
    } catch (e) {
      console.warn('Errore locale CamScanner:', e);
    }

    // 2. Perfezionamento con Gemini CamScanner Perspective Vision
    try {
      const thumbCanvas = document.createElement('canvas');
      const maxDim = 800;
      let tw = rotW;
      let th = rotH;
      if (tw > maxDim || th > maxDim) {
        if (tw > th) {
          th = Math.round((th * maxDim) / tw);
          tw = maxDim;
        } else {
          tw = Math.round((tw * maxDim) / th);
          th = maxDim;
        }
      }
      thumbCanvas.width = tw;
      thumbCanvas.height = th;
      const tctx = thumbCanvas.getContext('2d');
      if (tctx) {
        tctx.drawImage(rotCanvas, 0, 0, tw, th);
      }
      const base64Data = thumbCanvas.toDataURL('image/jpeg', 0.85);

      const res = await fetch('/api/ai/smart-crop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64Data }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.corners && typeof data.corners.tl?.x === 'number') {
          bestQuad = data.corners;
          setCorners(bestQuad);
          setAiDetectedCorners(bestQuad);
          setAiStatusMessage('✓ 4 vertici documento rilevati con CamScanner AI');
        } else if (data?.cropBox && typeof data.cropBox.x === 'number') {
          bestQuad = boxToQuad(data.cropBox);
          setCorners(bestQuad);
          setAiDetectedCorners(bestQuad);
          setAiStatusMessage('✓ Contorni documento rilevati');
        } else {
          setAiStatusMessage('✓ Contorni rilevati');
        }
      } else {
        setAiStatusMessage('✓ Contorni rilevati');
      }
    } catch (apiErr) {
      console.warn('CamScanner AI API error:', apiErr);
      setAiStatusMessage('✓ Contorni rilevati');
    } finally {
      setIsAiDetecting(false);
      setTimeout(() => {
        setAiStatusMessage('');
      }, 2400);
    }

    return bestQuad;
  }, []);

  /**
   * Seleziona un preset di ritaglio CamScanner
   */
  const handleSelectCropPreset = async (preset: AutoCropOption) => {
    setSelectedPreset(preset);

    const img = imgRef.current;
    if (!img) return;

    const rot = rotationRef.current;
    const isSideways = rot === 90 || rot === 270;
    const rotW = isSideways ? img.naturalHeight : img.naturalWidth;
    const rotH = isSideways ? img.naturalWidth : img.naturalHeight;

    if (preset === 'ai_auto') {
      await runAiSmartCrop();
      return;
    }

    if (preset === 'manual') {
      setAiStatusMessage('Ritaglio manuale: sposta gli 8 punti');
      setTimeout(() => setAiStatusMessage(''), 2000);
      return;
    }

    const newQuad = calculatePresetQuad(preset, rotW, rotH, aiDetectedCorners);
    setCorners(newQuad);

    const labels: Record<string, string> = {
      a4_doc: 'Formato A4 Documento applicato',
      book_spread: 'Formato Libro (2 Pagine) applicato',
      safe_margins: 'Margini 90% applicati',
      full_frame: 'Seleziona Tutto (100%) ripristinato',
    };
    if (labels[preset]) {
      setAiStatusMessage(`✓ ${labels[preset]}`);
      setTimeout(() => setAiStatusMessage(''), 2200);
    }
  };

  // Caricamento immagine iniziale ed esecuzione del ritaglio automatico CamScanner
  useEffect(() => {
    if (!imageFile) return;
    const url = URL.createObjectURL(imageFile);
    setImageSrc(url);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgRef.current = img;

      // Attiva subito la modalità ritaglio CamScanner con gli 8 punti
      setShowCropMode(true);
      setSelectedPreset('ai_auto');

      // Calcola subito il riquadro iniziale
      const rotCanvas = document.createElement('canvas');
      rotCanvas.width = img.naturalWidth;
      rotCanvas.height = img.naturalHeight;
      const rotCtx = rotCanvas.getContext('2d');
      if (rotCtx) {
        rotCtx.drawImage(img, 0, 0);
      }
      try {
        const localBox = detectPaperBoundsLocal(rotCanvas);
        const initialQuad = boxToQuad(localBox);
        setCorners(initialQuad);
        setAiDetectedCorners(initialQuad);
      } catch (e) {
        console.warn('Errore ritaglio locale iniziale:', e);
      }

      runAiSmartCrop(0);
    };
    img.src = url;

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [imageFile, runAiSmartCrop]);

  // Aggiorna l'anteprima sul canvas quando cambiano i vertici o i filtri
  useEffect(() => {
    renderProcessedPreview();
  }, [renderProcessedPreview]);

  // Ruota di 90 gradi in senso orario o antiorario
  const handleRotate = (direction: 'cw' | 'ccw' = 'cw') => {
    setRotation((prev) => {
      const next = direction === 'cw' ? (prev + 90) % 360 : (prev - 90 + 360) % 360;
      return next;
    });
  };

  // Disegna l'anteprima 2.5x nella Lente d'ingrandimento circolare (Loupe)
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

      // Ritaglio circolare per la lente
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

      // Mirino a croce CamScanner verde / bianco
      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 1.5;

      // Linea orizzontale
      ctx.beginPath();
      ctx.moveTo(0, size / 2);
      ctx.lineTo(size, size / 2);
      ctx.stroke();

      // Linea verticale
      ctx.beginPath();
      ctx.moveTo(size / 2, 0);
      ctx.lineTo(size / 2, size);
      ctx.stroke();

      // Punto centrale
      ctx.fillStyle = '#10B981';
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, 3, 0, Math.PI * 2);
      ctx.fill();

      // Cerchio interno di collimazione
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, 16, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    },
    [getRotatedSourceCanvas]
  );

  // Calcolo dei 4 punti mediani sui lati del quadrilatero
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

  // Gestione PointerDown per le 8 maniglie CamScanner
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

    // Determina il punto corrente della maniglia per la lente
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

    if (selectedPreset !== 'manual') {
      setSelectedPreset('manual');
    }

    const clamp = (v: number) => Math.max(0.00, Math.min(1.00, v));

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
        // Trascina l'intero bordo superiore
        next.tl = { x: clamp(prev.tl.x + deltaX), y: clamp(prev.tl.y + deltaY) };
        next.tr = { x: clamp(prev.tr.x + deltaX), y: clamp(prev.tr.y + deltaY) };
      } else if (handle === 'mid_right') {
        // Trascina l'intero bordo destro
        next.tr = { x: clamp(prev.tr.x + deltaX), y: clamp(prev.tr.y + deltaY) };
        next.br = { x: clamp(prev.br.x + deltaX), y: clamp(prev.br.y + deltaY) };
      } else if (handle === 'mid_bottom') {
        // Trascina l'intero bordo inferiore
        next.bl = { x: clamp(prev.bl.x + deltaX), y: clamp(prev.bl.y + deltaY) };
        next.br = { x: clamp(prev.br.x + deltaX), y: clamp(prev.br.y + deltaY) };
      } else if (handle === 'mid_left') {
        // Trascina l'intero bordo sinistro
        next.tl = { x: clamp(prev.tl.x + deltaX), y: clamp(prev.tl.y + deltaY) };
        next.bl = { x: clamp(prev.bl.x + deltaX), y: clamp(prev.bl.y + deltaY) };
      } else if (handle === 'body') {
        // Sposta l'intero poligono
        const dx = Math.max(-prev.tl.x, Math.min(1 - prev.tr.x, deltaX));
        const dy = Math.max(-prev.tl.y, Math.min(1 - prev.bl.y, deltaY));
        next.tl = { x: clamp(prev.tl.x + dx), y: clamp(prev.tl.y + dy) };
        next.tr = { x: clamp(prev.tr.x + dx), y: clamp(prev.tr.y + dy) };
        next.br = { x: clamp(prev.br.x + dx), y: clamp(prev.br.y + dy) };
        next.bl = { x: clamp(prev.bl.x + dx), y: clamp(prev.bl.y + dy) };
      }

      // Aggiorna la lente di ingrandimento
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

  // Ottieni il file immagine ritagliato e processato
  const getProcessedResult = (): Promise<{ file: File; url: string } | null> => {
    return new Promise((resolve) => {
      const canvas = previewCanvasRef.current;
      if (!canvas) return resolve(null);
      try {
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
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
          0.85
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

  // Lista opzioni veloci stile CamScanner
  const cropPresets = [
    {
      id: 'ai_auto' as AutoCropOption,
      label: 'Rileva Auto',
      badge: 'CamScanner',
      desc: 'Rilevamento prospettico intelligente dei 4 angoli',
      icon: Sparkles,
    },
    {
      id: 'full_frame' as AutoCropOption,
      label: 'Tutto',
      badge: '100%',
      desc: 'Seleziona l\'intera foto senza ritaglio',
      icon: Maximize2,
    },
    {
      id: 'a4_doc' as AutoCropOption,
      label: 'Doc. A4',
      badge: '1:1.41',
      desc: 'Formato pagina standard verticale',
      icon: FileText,
    },
    {
      id: 'book_spread' as AutoCropOption,
      label: 'Libro 2 Pagg.',
      badge: 'Doppia',
      desc: 'Formato orizzontale per 2 pagine aperte',
      icon: BookOpen,
    },
    {
      id: 'safe_margins' as AutoCropOption,
      label: 'Margini 90%',
      badge: 'Bordi puliti',
      desc: 'Ritaglio sicuro che elimina ombre periferiche',
      icon: ScanLine,
    },
  ];

  // Coordinate normalizzate per l'SVG (0 a 1000)
  const cTL = { x: corners.tl.x * 1000, y: corners.tl.y * 1000 };
  const cTR = { x: corners.tr.x * 1000, y: corners.tr.y * 1000 };
  const cBR = { x: corners.br.x * 1000, y: corners.br.y * 1000 };
  const cBL = { x: corners.bl.x * 1000, y: corners.bl.y * 1000 };

  const mTop = { x: (cTL.x + cTR.x) / 2, y: (cTL.y + cTR.y) / 2 };
  const mRight = { x: (cTR.x + cBR.x) / 2, y: (cTR.y + cBR.y) / 2 };
  const mBottom = { x: (cBL.x + cBR.x) / 2, y: (cBL.y + cBR.y) / 2 };
  const mLeft = { x: (cTL.x + cBL.x) / 2, y: (cTL.y + cBL.y) / 2 };

  // Posizionamento intelligente della lente per non essere coperta dalla mano dell'utente
  const isLoupeOnTop = loupePoint ? loupePoint.y > 0.45 : true;
  const isLoupeOnLeft = loupePoint ? loupePoint.x > 0.5 : false;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Editor CamScanner - Ritaglio Prospettico a 8 Punti"
      className="fixed inset-0 z-50 bg-black text-white flex flex-col justify-between overflow-hidden select-none font-sans"
    >
      {/* 1. Header superiore CamScanner */}
      <header className="bg-black border-b border-zinc-800 px-3 sm:px-4 py-2.5 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-2">
          <Wand2 size={18} className="text-white shrink-0" />
          <h2 className="text-sm font-bold text-white tracking-wide">CamScanner</h2>
          <span className="text-[11px] font-bold bg-white/15 px-2.5 py-0.5 rounded-full text-white border border-white/20 whitespace-nowrap">
            Pagina {pageIndex + 1} {totalPages > 1 ? `di ${totalPages}` : ''}
          </span>
        </div>

        {/* Selettore Vista: Ritaglio Prospettico vs Anteprima Sbiancata */}
        <div className="flex items-center bg-zinc-900 border border-white/20 rounded-full p-0.5">
          <button
            type="button"
            onClick={() => setShowCropMode(true)}
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-all ${
              showCropMode ? 'bg-white text-black shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
            title="Mostra gli 8 punti di ritaglio prospettico"
          >
            <Crop size={12} className={showCropMode ? 'text-black' : 'text-white'} />
            <span>Ritaglio</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setShowCropMode(false);
              renderProcessedPreview();
            }}
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-all ${
              !showCropMode ? 'bg-white text-black shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
            title="Mostra anteprima del documento raddrizzato e sbiancato"
          >
            <Eye size={12} className={!showCropMode ? 'text-black' : 'text-white'} />
            <span>Anteprima</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleContinueSavePdf}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white text-black font-extrabold text-xs hover:bg-zinc-200 active:scale-95 transition-all disabled:opacity-50 shadow-md"
            title="Raddrizza prospettiva e salva documento"
          >
            <Check size={14} className="text-black stroke-[3]" />
            <span>Prossimo</span>
          </button>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="w-8 h-8 rounded-full bg-transparent text-white hover:bg-white/10 flex items-center justify-center transition-colors border border-white shrink-0"
              aria-label="Chiudi"
            >
              <X size={16} className="text-white" />
            </button>
          )}
        </div>
      </header>

      {/* 2. Barra Presets e Strumenti Rapidi CamScanner */}
      <section className="bg-zinc-950 border-b border-zinc-800/80 px-2.5 py-2 shrink-0 z-20 overflow-x-auto scrollbar-thin">
        <div className="flex items-center gap-1.5 max-w-full min-w-max mx-auto justify-start sm:justify-center">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider pr-1 flex items-center gap-1">
            <Crop size={12} className="text-white" />
            <span>Modalità:</span>
          </span>

          {cropPresets.map((preset) => {
            const Icon = preset.icon;
            const isSelected = selectedPreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectCropPreset(preset.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all relative cursor-pointer active:scale-95 ${
                  isSelected
                    ? 'bg-white text-black border-2 border-white shadow-[0_0_12px_rgba(255,255,255,0.4)]'
                    : 'bg-black text-white border border-white/30 hover:border-white hover:bg-zinc-900'
                }`}
                title={preset.desc}
              >
                <Icon size={13} className={isSelected ? 'text-black' : 'text-white'} />
                <span>{preset.label}</span>
                {preset.badge && (
                  <span
                    className={`text-[9px] px-1 py-0.2 rounded font-black ${
                      isSelected ? 'bg-black text-white' : 'bg-white/15 text-white'
                    }`}
                  >
                    {preset.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. Main Viewport: Editor Prospettico CamScanner a 8 Punti */}
      <main className="flex-1 overflow-hidden relative flex items-center justify-center p-2 sm:p-4 bg-black select-none">
        {/* CROP MODE INTERATTIVA A 8 PUNTI STILE CAMSCANNER */}
        <div
          className={`relative max-w-full max-h-[64vh] sm:max-h-[70vh] items-center justify-center touch-none overflow-hidden select-none ${
            showCropMode ? 'flex' : 'hidden'
          }`}
        >
          {/* Immagine con rotazione applicata */}
          {imageSrc && (
            <img
              src={imageSrc}
              alt="Foto scansionata da ritagliare"
              style={{
                transform: `rotate(${rotation}deg)`,
                transformOrigin: 'center center',
              }}
              className="max-h-[60vh] sm:max-h-[66vh] max-w-full object-contain pointer-events-none rounded-lg"
            />
          )}

          {/* SVG Overlay a 8 punti di CamScanner: maschera scura, quadrilatero verde/bianco, 4 angoli e 4 punti mediani */}
          <svg
            ref={cropSvgContainerRef}
            viewBox="0 0 1000 1000"
            preserveAspectRatio="none"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="absolute inset-0 w-full h-full touch-none select-none cursor-crosshair z-10"
          >
            {/* Maschera oscurante esterna */}
            <path
              d={`M 0 0 L 1000 0 L 1000 1000 L 0 1000 Z M ${cTL.x} ${cTL.y} L ${cBL.x} ${cBL.y} L ${cBR.x} ${cBR.y} L ${cTR.x} ${cTR.y} Z`}
              fill="rgba(0, 0, 0, 0.62)"
              fillRule="evenodd"
              className="pointer-events-none"
            />

            {/* Area interna cliccabile per spostare tutto il foglio */}
            <polygon
              points={`${cTL.x},${cTL.y} ${cTR.x},${cTR.y} ${cBR.x},${cBR.y} ${cBL.x},${cBL.y}`}
              fill="rgba(255, 255, 255, 0.05)"
              onPointerDown={(e) => handlePointerDown('body', e)}
              className="cursor-move"
            />

            {/* Griglia a terzi prospettica interna CamScanner */}
            <line
              x1={cTL.x * 0.66 + cBL.x * 0.34}
              y1={cTL.y * 0.66 + cBL.y * 0.34}
              x2={cTR.x * 0.66 + cBR.x * 0.34}
              y2={cTR.y * 0.66 + cBR.y * 0.34}
              stroke="rgba(255, 255, 255, 0.25)"
              strokeWidth="1.2"
              strokeDasharray="4 4"
              className="pointer-events-none"
            />
            <line
              x1={cTL.x * 0.34 + cBL.x * 0.66}
              y1={cTL.y * 0.34 + cBL.y * 0.66}
              x2={cTR.x * 0.34 + cBR.x * 0.66}
              y2={cTR.y * 0.34 + cBR.y * 0.66}
              stroke="rgba(255, 255, 255, 0.25)"
              strokeWidth="1.2"
              strokeDasharray="4 4"
              className="pointer-events-none"
            />
            <line
              x1={cTL.x * 0.66 + cTR.x * 0.34}
              y1={cTL.y * 0.66 + cTR.y * 0.34}
              x2={cBL.x * 0.66 + cBR.x * 0.34}
              y2={cBL.y * 0.66 + cBR.y * 0.34}
              stroke="rgba(255, 255, 255, 0.25)"
              strokeWidth="1.2"
              strokeDasharray="4 4"
              className="pointer-events-none"
            />
            <line
              x1={cTL.x * 0.34 + cTR.x * 0.66}
              y1={cTL.y * 0.34 + cTR.y * 0.66}
              x2={cBL.x * 0.34 + cBR.x * 0.66}
              y2={cBL.y * 0.34 + cBR.y * 0.66}
              stroke="rgba(255, 255, 255, 0.25)"
              strokeWidth="1.2"
              strokeDasharray="4 4"
              className="pointer-events-none"
            />

            {/* Bordo quadrilatero luminoso con tratteggio CamScanner */}
            <polygon
              points={`${cTL.x},${cTL.y} ${cTR.x},${cTR.y} ${cBR.x},${cBR.y} ${cBL.x},${cBL.y}`}
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2.5"
              strokeDasharray="8 5"
              className="pointer-events-none"
            />

            {/* 4 PUNTI MEDIANI SUI BORDI (per trascinare l'intero lato) */}
            {/* Lato Superiore */}
            <g
              onPointerDown={(e) => handlePointerDown('mid_top', e)}
              className="cursor-ns-resize"
            >
              <rect
                x={mTop.x - 22}
                y={mTop.y - 8}
                width="44"
                height="16"
                rx="8"
                fill="#FFFFFF"
                stroke="#000000"
                strokeWidth="2"
              />
              <line
                x1={mTop.x - 10}
                y1={mTop.y}
                x2={mTop.x + 10}
                y2={mTop.y}
                stroke="#10B981"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </g>

            {/* Lato Destro */}
            <g
              onPointerDown={(e) => handlePointerDown('mid_right', e)}
              className="cursor-ew-resize"
            >
              <rect
                x={mRight.x - 8}
                y={mRight.y - 22}
                width="16"
                height="44"
                rx="8"
                fill="#FFFFFF"
                stroke="#000000"
                strokeWidth="2"
              />
              <line
                x1={mRight.x}
                y1={mRight.y - 10}
                x2={mRight.x}
                y2={mRight.y + 10}
                stroke="#10B981"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </g>

            {/* Lato Inferiore */}
            <g
              onPointerDown={(e) => handlePointerDown('mid_bottom', e)}
              className="cursor-ns-resize"
            >
              <rect
                x={mBottom.x - 22}
                y={mBottom.y - 8}
                width="44"
                height="16"
                rx="8"
                fill="#FFFFFF"
                stroke="#000000"
                strokeWidth="2"
              />
              <line
                x1={mBottom.x - 10}
                y1={mBottom.y}
                x2={mBottom.x + 10}
                y2={mBottom.y}
                stroke="#10B981"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </g>

            {/* Lato Sinistro */}
            <g
              onPointerDown={(e) => handlePointerDown('mid_left', e)}
              className="cursor-ew-resize"
            >
              <rect
                x={mLeft.x - 8}
                y={mLeft.y - 22}
                width="16"
                height="44"
                rx="8"
                fill="#FFFFFF"
                stroke="#000000"
                strokeWidth="2"
              />
              <line
                x1={mLeft.x}
                y1={mLeft.y - 10}
                x2={mLeft.x}
                y2={mLeft.y + 10}
                stroke="#10B981"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </g>

            {/* 4 ANGOLI PRINCIPALI CAMSCANNER (TL, TR, BR, BL) */}
            {/* Top-Left */}
            <g
              onPointerDown={(e) => handlePointerDown('tl', e)}
              className="cursor-nwse-resize"
            >
              <circle cx={cTL.x} cy={cTL.y} r="28" fill="transparent" />
              <circle cx={cTL.x} cy={cTL.y} r="18" fill="#FFFFFF" stroke="#000000" strokeWidth="3" />
              <circle cx={cTL.x} cy={cTL.y} r="7" fill="#10B981" />
            </g>

            {/* Top-Right */}
            <g
              onPointerDown={(e) => handlePointerDown('tr', e)}
              className="cursor-nesw-resize"
            >
              <circle cx={cTR.x} cy={cTR.y} r="28" fill="transparent" />
              <circle cx={cTR.x} cy={cTR.y} r="18" fill="#FFFFFF" stroke="#000000" strokeWidth="3" />
              <circle cx={cTR.x} cy={cTR.y} r="7" fill="#10B981" />
            </g>

            {/* Bottom-Right */}
            <g
              onPointerDown={(e) => handlePointerDown('br', e)}
              className="cursor-nwse-resize"
            >
              <circle cx={cBR.x} cy={cBR.y} r="28" fill="transparent" />
              <circle cx={cBR.x} cy={cBR.y} r="18" fill="#FFFFFF" stroke="#000000" strokeWidth="3" />
              <circle cx={cBR.x} cy={cBR.y} r="7" fill="#10B981" />
            </g>

            {/* Bottom-Left */}
            <g
              onPointerDown={(e) => handlePointerDown('bl', e)}
              className="cursor-nesw-resize"
            >
              <circle cx={cBL.x} cy={cBL.y} r="28" fill="transparent" />
              <circle cx={cBL.x} cy={cBL.y} r="18" fill="#FFFFFF" stroke="#000000" strokeWidth="3" />
              <circle cx={cBL.x} cy={cBL.y} r="7" fill="#10B981" />
            </g>
          </svg>

          {/* Lente d'ingrandimento circolare (Loupe 2.5x con mirino a croce) */}
          {activeDraggingHandle && (
            <div
              className={`absolute z-40 flex flex-col items-center gap-1 pointer-events-none transition-all duration-75 ${
                isLoupeOnTop ? 'top-3' : 'bottom-3'
              } ${isLoupeOnLeft ? 'left-3' : 'right-3'}`}
            >
              <div className="relative w-28 h-28 rounded-full border-3 border-white shadow-[0_0_24px_rgba(0,0,0,0.85)] overflow-hidden bg-black flex items-center justify-center">
                <canvas ref={loupeCanvasRef} className="w-full h-full object-cover" />
                <span className="absolute bottom-1 bg-black/85 text-[9px] font-black text-emerald-400 px-1.5 py-0.5 rounded-full border border-emerald-400/30">
                  2.4x
                </span>
              </div>
              <span className="text-[10px] font-bold text-white bg-black/80 px-2 py-0.5 rounded-full border border-white/20">
                Precisione pixel
              </span>
            </div>
          )}

          {/* Scansione laser animata durante il rilevamento AI */}
          {isAiDetecting && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-25">
              <div className="absolute left-0 right-0 h-1 bg-emerald-400 shadow-[0_0_16px_#10B981] animate-laser-scan pointer-events-none" />
            </div>
          )}

          {/* Badge di stato Ritaglio CamScanner */}
          {aiStatusMessage && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-35 bg-black/95 border border-white px-3 py-1 rounded-full shadow-2xl flex items-center gap-1.5 text-xs font-bold text-white animate-fade-in pointer-events-none whitespace-nowrap">
              {isAiDetecting ? (
                <Loader2 size={13} className="animate-spin text-white" />
              ) : (
                <CheckCheck size={13} className="text-emerald-400" />
              )}
              <span>{aiStatusMessage}</span>
            </div>
          )}
        </div>

        {/* ANTEPRIMA DOCUMENTO RADDRIZZATO E PULITO (Sempre montato nel DOM con canvas persistente) */}
        <div
          className={`relative max-w-full max-h-[64vh] sm:max-h-[70vh] shadow-2xl rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 items-center justify-center p-2 ${
            !showCropMode ? 'flex' : 'hidden'
          }`}
        >
          <canvas
            ref={previewCanvasRef}
            className="max-h-[60vh] sm:max-h-[66vh] max-w-full object-contain shadow-2xl rounded-lg"
          />
        </div>
      </main>

      {/* 4. Footer con controlli CamScanner */}
      <footer className="bg-black border-t border-zinc-800 px-1.5 sm:px-4 py-2 pb-5 sm:pb-3 shrink-0 z-20 shadow-2xl">
        <div className="flex items-center justify-between max-w-lg mx-auto w-full gap-1">
          {/* 1. Rifai scatto */}
          <button
            type="button"
            onClick={onRetake}
            className="flex flex-col items-center justify-center gap-1 p-1 rounded-2xl text-white hover:bg-white/10 active:scale-95 transition-all flex-1 min-w-0"
            title="Scatta di nuovo questa pagina"
            aria-label="Rifai"
          >
            <div className="w-10 h-10 rounded-2xl bg-transparent border border-white flex items-center justify-center text-white">
              <RefreshCw size={18} className="text-white" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold text-white tracking-tight truncate">Rifai</span>
          </button>

          {/* 2. Ruota 90° Antiorario */}
          <button
            type="button"
            onClick={() => handleRotate('ccw')}
            className="flex flex-col items-center justify-center gap-1 p-1 rounded-2xl text-white hover:bg-white/10 active:scale-95 transition-all flex-1 min-w-0"
            title="Ruota 90° a sinistra"
            aria-label="Ruota Sx"
          >
            <div className="w-10 h-10 rounded-2xl bg-transparent border border-white flex items-center justify-center text-white">
              <RotateCcw size={18} className="text-white" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold text-white tracking-tight truncate">Ruota Sx</span>
          </button>

          {/* 3. Ruota 90° Orario */}
          <button
            type="button"
            onClick={() => handleRotate('cw')}
            className="flex flex-col items-center justify-center gap-1 p-1 rounded-2xl text-white hover:bg-white/10 active:scale-95 transition-all flex-1 min-w-0"
            title="Ruota 90° a destra"
            aria-label="Ruota Dx"
          >
            <div className="w-10 h-10 rounded-2xl bg-transparent border border-white flex items-center justify-center text-white">
              <RotateCw size={18} className="text-white" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold text-white tracking-tight truncate">Ruota Dx</span>
          </button>

          {/* 4. Filtro Pulizia Carta CamScanner (Magic Color) */}
          <button
            type="button"
            onClick={() => {
              setSelectedFilter('magic_color');
              setShowCropMode(false);
            }}
            className="flex flex-col items-center justify-center gap-1 p-1 rounded-2xl text-white hover:bg-white/10 active:scale-95 transition-all flex-1 min-w-0"
            title="Filtro Magic Color CamScanner (Sbiancamento carta)"
            aria-label="Magic Color"
          >
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white transition-all ${
                selectedFilter === 'magic_color' && !showCropMode
                  ? 'bg-white/20 border-2 border-white shadow-[0_0_12px_rgba(255,255,255,0.4)]'
                  : 'bg-transparent border border-white'
              }`}
            >
              <Wand2 size={18} className="text-white" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold text-white tracking-tight truncate">Magic Color</span>
          </button>

          {/* 5. Filtro B/N */}
          <button
            type="button"
            onClick={() => {
              setSelectedFilter('bw');
              setShowCropMode(false);
            }}
            className="flex flex-col items-center justify-center gap-1 p-1 rounded-2xl text-white hover:bg-white/10 active:scale-95 transition-all flex-1 min-w-0"
            title="Filtro bianco e nero ad alto contrasto"
            aria-label="B/N"
          >
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white transition-all ${
                selectedFilter === 'bw' && !showCropMode
                  ? 'bg-white/20 border-2 border-white shadow-[0_0_12px_rgba(255,255,255,0.4)]'
                  : 'bg-transparent border border-white'
              }`}
            >
              <Contrast size={18} className="text-white" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold text-white tracking-tight truncate">B/N</span>
          </button>

          {/* 6. Aggiungi pagina (Scatti Multipli) */}
          <button
            type="button"
            onClick={handleAddPage}
            disabled={isProcessing}
            className="flex flex-col items-center justify-center gap-1 p-1 rounded-2xl text-white hover:bg-white/10 active:scale-95 transition-all flex-1 min-w-0 disabled:opacity-50"
            title="Aggiungi questa pagina ed esegui un altro scatto (Scatti Multipli)"
            aria-label="+ Pagina"
          >
            <div className="w-10 h-10 rounded-2xl bg-transparent border-2 border-dashed border-white flex items-center justify-center text-white hover:bg-white/10 transition-colors">
              <Plus size={19} className="text-white stroke-[2.5]" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold text-white tracking-tight truncate">+ Pagina</span>
          </button>

          {/* 7. Prossimo / Salva PDF (Spunta verde/bianca CamScanner) */}
          <button
            type="button"
            onClick={handleContinueSavePdf}
            disabled={isProcessing}
            className="flex flex-col items-center justify-center gap-1 p-1 rounded-2xl text-white hover:bg-white/10 active:scale-95 transition-all flex-1 min-w-0 disabled:opacity-50"
            title="Raddrizza prospettiva e salva documento nella libreria in PDF"
            aria-label="Continua"
          >
            <div className="w-10 h-10 rounded-2xl bg-transparent text-white border-2 border-white flex items-center justify-center shadow-[0_0_16px_rgba(255,255,255,0.3)] hover:bg-white/15 transition-colors">
              <Check size={20} className="text-white stroke-[3]" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-black text-white tracking-tight truncate">Fatto</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
