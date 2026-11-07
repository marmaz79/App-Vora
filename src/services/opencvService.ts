/**
 * OpenCV.js Service for Vora CamScanner Pipeline
 *
 * Implements client-side computer vision:
 * 1. Lazy loading of OpenCV.js WebAssembly runtime with status indicator.
 * 2. Document edge & 4-corner detection (downscale ~800px, grayscale, Gaussian blur, Canny, dilate, findContours, approxPolyDP, >=20% area check).
 * 3. Perspective correction warp (getPerspectiveTransform + warpPerspective).
 * 4. CamScanner cleanup filters:
 *    - 'magic_color' (default): background division shadow removal, contrast/brightness boost, noise reduction.
 *    - 'bw': adaptive thresholding for crisp black text on pure white.
 *    - 'grayscale': normalized clean grayscale.
 *    - 'original': full color preserve.
 * 5. Automatic orientation detection.
 * 6. Strict cv.Mat memory disposal (.delete()) after every operation.
 */

export interface Point {
  x: number; // 0 to 1 normalized
  y: number; // 0 to 1 normalized
}

export interface QuadCorners {
  tl: Point;
  tr: Point;
  br: Point;
  bl: Point;
}

export type OpenCvStatus = 'idle' | 'loading' | 'ready' | 'error';
export type CamScannerFilterType = 'magic_color' | 'bw' | 'grayscale' | 'original';

declare global {
  interface Window {
    cv?: any;
    Module?: any;
  }
}

class OpenCvService {
  private status: OpenCvStatus = 'idle';
  private loadPromise: Promise<any> | null = null;
  private statusListeners: Set<(status: OpenCvStatus, error?: string) => void> = new Set();
  private lastError: string | null = null;

  public getStatus(): OpenCvStatus {
    return this.status;
  }

  public isReady(): boolean {
    return this.status === 'ready' && !!window.cv?.Mat;
  }

  public onStatusChange(listener: (status: OpenCvStatus, error?: string) => void): () => void {
    this.statusListeners.add(listener);
    listener(this.status, this.lastError || undefined);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  private notifyStatus(status: OpenCvStatus, error?: string) {
    this.status = status;
    if (error) this.lastError = error;
    this.statusListeners.forEach((fn) => {
      try {
        fn(status, error);
      } catch (e) {
        console.warn('OpenCV listener error:', e);
      }
    });
  }

  /**
   * Carica OpenCV.js in modo asincrono e pigro (lazy) da CDN
   */
  public async loadOpenCv(): Promise<any> {
    if (typeof window === 'undefined') return null;

    if (this.status === 'ready' && window.cv?.Mat) {
      return window.cv;
    }

    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.notifyStatus('loading');

    this.loadPromise = new Promise<any>((resolve, reject) => {
      // 1. Controlla se cv è già presente e inizializzato
      if (window.cv && window.cv.Mat) {
        this.notifyStatus('ready');
        resolve(window.cv);
        return;
      }

      // CDN primaria ad alte prestazioni (jsDelivr) con fallback rapido
      const primaryUrl = 'https://cdn.jsdelivr.net/npm/@techstark/opencv-js@4.9.0-release.1/dist/opencv.js';
      const fallbackUrl = 'https://docs.opencv.org/4.13.0/opencv.js';

      const setupScript = (srcUrl: string, isFallback: boolean = false) => {
        // Rimuovi eventuali script precedenti non riusciti
        const existingScript = document.getElementById('opencv-script-tag');
        if (existingScript) {
          existingScript.remove();
        }

        const script = document.createElement('script');
        script.id = 'opencv-script-tag';
        script.async = true;
        script.defer = true;
        script.src = srcUrl;

        let isResolved = false;

        const checkCvReady = () => {
          if (!isResolved && window.cv && window.cv.Mat) {
            isResolved = true;
            clearInterval(pollInterval);
            clearTimeout(timeoutTimer);
            this.notifyStatus('ready');
            resolve(window.cv);
          }
        };

        // Module config per Emscripten
        window.Module = {
          wasmBinaryFile: '',
          onRuntimeInitialized: () => {
            checkCvReady();
          },
        };

        const pollInterval = setInterval(() => {
          checkCvReady();
        }, 80);

        // Timeout di sicurezza: se la CDN principale impiega troppo, prova il fallback
        const timeoutTimer = setTimeout(() => {
          if (isResolved) return;
          clearInterval(pollInterval);
          if (!isFallback) {
            console.warn('OpenCV primary CDN timeout, trying fallback...');
            setupScript(fallbackUrl, true);
          } else {
            console.warn('OpenCV.js load timeout reached. Fallback local vision will be used.');
            this.notifyStatus('error', 'Timeout caricamento OpenCV.js');
            reject(new Error('OpenCV timeout'));
          }
        }, isFallback ? 14000 : 9000);

        script.onload = () => {
          checkCvReady();
        };

        script.onerror = () => {
          clearInterval(pollInterval);
          clearTimeout(timeoutTimer);
          if (!isFallback) {
            console.warn('OpenCV script error on primary CDN, trying fallback...');
            setupScript(fallbackUrl, true);
          } else {
            this.notifyStatus('error', 'Impossibile caricare OpenCV.js da CDN');
            reject(new Error('Failed to load opencv.js'));
          }
        };

        document.head.appendChild(script);
      };

      setupScript(primaryUrl, false);
    }).catch((err) => {
      this.loadPromise = null;
      throw err;
    });

    return this.loadPromise;
  }

  /**
   * Ordina 4 punti geometrici in [Top-Left, Top-Right, Bottom-Right, Bottom-Left]
   */
  public orderCorners(pts: Point[]): QuadCorners {
    if (pts.length !== 4) {
      return {
        tl: { x: 0, y: 0 },
        tr: { x: 1, y: 0 },
        br: { x: 1, y: 1 },
        bl: { x: 0, y: 1 },
      };
    }

    // TL ha somma minima (x + y), BR ha somma massima (x + y)
    let minSum = Infinity;
    let maxSum = -Infinity;
    let tl = pts[0];
    let br = pts[0];

    // TR ha differenza minima (y - x), BL ha differenza massima (y - x)
    let minDiff = Infinity;
    let maxDiff = -Infinity;
    let tr = pts[0];
    let bl = pts[0];

    pts.forEach((pt) => {
      const sum = pt.x + pt.y;
      const diff = pt.y - pt.x;

      if (sum < minSum) {
        minSum = sum;
        tl = pt;
      }
      if (sum > maxSum) {
        maxSum = sum;
        br = pt;
      }
      if (diff < minDiff) {
        minDiff = diff;
        tr = pt;
      }
      if (diff > maxDiff) {
        maxDiff = diff;
        bl = pt;
      }
    });

    const clamp = (v: number) => Math.max(0, Math.min(1, Number(v.toFixed(4))));

    return {
      tl: { x: clamp(tl.x), y: clamp(tl.y) },
      tr: { x: clamp(tr.x), y: clamp(tr.y) },
      br: { x: clamp(br.x), y: clamp(br.y) },
      bl: { x: clamp(bl.x), y: clamp(bl.y) },
    };
  }

  /**
   * Step 1: Rilevamento documento con OpenCV.js
   * - ridimensiona una copia (lato lungo ~800px)
   * - scala di grigi
   * - blur gaussiano (5, 5)
   * - Canny edge detection
   * - dilatazione
   * - findContours
   * - approxPolyDP per trovare contorno quadrilatero a 4 vertici
   * - Se area < 20% immagine, usa fallback intera immagine
   * - Libera la memoria cv.Mat (delete)
   */
  public async detectDocumentCorners(
    source: HTMLCanvasElement | HTMLImageElement
  ): Promise<QuadCorners> {
    const fullFallback: QuadCorners = {
      tl: { x: 0.02, y: 0.02 },
      tr: { x: 0.98, y: 0.02 },
      br: { x: 0.98, y: 0.98 },
      bl: { x: 0.02, y: 0.98 },
    };

    const srcW = 'naturalWidth' in source ? source.naturalWidth : source.width;
    const srcH = 'naturalHeight' in source ? source.naturalHeight : source.height;

    if (!srcW || !srcH) return fullFallback;

    // Assicurati che OpenCV sia caricato
    try {
      if (!this.isReady()) {
        await this.loadOpenCv();
      }
    } catch {
      return fullFallback;
    }

    const cv = window.cv;
    if (!cv || !cv.Mat) return fullFallback;

    // 1. Ridimensiona a lato lungo ~800px per elaborazione ultra-rapida e accurata
    const maxDim = 800;
    const scale = Math.min(1, maxDim / Math.max(srcW, srcH));
    const targetW = Math.round(srcW * scale);
    const targetH = Math.round(srcH * scale);

    const smallCanvas = document.createElement('canvas');
    smallCanvas.width = targetW;
    smallCanvas.height = targetH;
    const ctx = smallCanvas.getContext('2d');
    if (!ctx) return fullFallback;

    ctx.drawImage(source, 0, 0, targetW, targetH);

    // Variabili Mat da liberare in finally
    let src: any = null;
    let gray: any = null;
    let blurred: any = null;
    let edges: any = null;
    let kernel: any = null;
    let dilated: any = null;
    let contours: any = null;
    let hierarchy: any = null;

    try {
      src = cv.imread(smallCanvas);
      gray = new cv.Mat();
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

      // Blur gaussiano (5x5)
      blurred = new cv.Mat();
      const ksize = new cv.Size(5, 5);
      cv.GaussianBlur(gray, blurred, ksize, 0, 0, cv.BORDER_DEFAULT);

      // Canny edge detection
      edges = new cv.Mat();
      cv.Canny(blurred, edges, 60, 180);

      // Dilatazione per unire i bordi tratteggiati del foglio
      kernel = cv.Mat.ones(3, 3, cv.CV_8U);
      dilated = new cv.Mat();
      cv.dilate(edges, dilated, kernel);

      // Trova contorni
      contours = new cv.MatVector();
      hierarchy = new cv.Mat();
      cv.findContours(dilated, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

      const totalImageArea = targetW * targetH;
      const minAreaThreshold = totalImageArea * 0.20; // 20% dell'immagine minimo

      let maxArea = 0;
      let detectedPoints: Point[] | null = null;

      for (let i = 0; i < contours.size(); ++i) {
        const cnt = contours.get(i);
        const area = cv.contourArea(cnt);

        if (area > maxArea && area >= minAreaThreshold) {
          const peri = cv.arcLength(cnt, true);
          const approx = new cv.Mat();
          cv.approxPolyDP(cnt, approx, 0.02 * peri, true);

          if (approx.rows === 4) {
            maxArea = area;
            const pts: Point[] = [];
            for (let j = 0; j < 4; j++) {
              pts.push({
                x: approx.data32S[j * 2] / targetW,
                y: approx.data32S[j * 2 + 1] / targetH,
              });
            }
            detectedPoints = pts;
          }
          approx.delete();
        }
      }

      if (detectedPoints && detectedPoints.length === 4) {
        const ordered = this.orderCorners(detectedPoints);

        // Applica un lieve inset del 1.2% per eliminare eventuali sfondi residui del tavolo
        const cx = (ordered.tl.x + ordered.tr.x + ordered.br.x + ordered.bl.x) / 4;
        const cy = (ordered.tl.y + ordered.tr.y + ordered.br.y + ordered.bl.y) / 4;
        const insetFactor = 0.012;

        const insetPt = (p: Point): Point => ({
          x: Math.max(0.005, Math.min(0.995, p.x + (cx - p.x) * insetFactor)),
          y: Math.max(0.005, Math.min(0.995, p.y + (cy - p.y) * insetFactor)),
        });

        return {
          tl: insetPt(ordered.tl),
          tr: insetPt(ordered.tr),
          br: insetPt(ordered.br),
          bl: insetPt(ordered.bl),
        };
      }

      // Se non si trova un quadrilatero valido >= 20% area, usa l'intera immagine
      return fullFallback;
    } catch (err) {
      console.warn('Errore OpenCV durante detectDocumentCorners:', err);
      return fullFallback;
    } finally {
      // Libera rigorosamente tutta la memoria cv.Mat
      try {
        if (src) src.delete();
        if (gray) gray.delete();
        if (blurred) blurred.delete();
        if (edges) edges.delete();
        if (kernel) kernel.delete();
        if (dilated) dilated.delete();
        if (contours) contours.delete();
        if (hierarchy) hierarchy.delete();
      } catch (cleanErr) {
        console.warn('Errore pulizia Mat OpenCV:', cleanErr);
      }
    }
  }

  /**
   * Step 2: Ritaglio con correzione di prospettiva
   * getPerspectiveTransform + warpPerspective sull'immagine a piena risoluzione
   */
  public warpPerspective(
    srcCanvas: HTMLCanvasElement,
    corners: QuadCorners,
    desiredMaxWidth: number = 2400
  ): HTMLCanvasElement {
    const w = srcCanvas.width;
    const h = srcCanvas.height;

    // Coordinate sorgente in pixel
    const pTL = { x: corners.tl.x * w, y: corners.tl.y * h };
    const pTR = { x: corners.tr.x * w, y: corners.tr.y * h };
    const pBR = { x: corners.br.x * w, y: corners.br.y * h };
    const pBL = { x: corners.bl.x * w, y: corners.bl.y * h };

    const topW = Math.hypot(pTR.x - pTL.x, pTR.y - pTL.y);
    const botW = Math.hypot(pBR.x - pBL.x, pBR.y - pBL.y);
    const leftH = Math.hypot(pBL.x - pTL.x, pBL.y - pTL.y);
    const rightH = Math.hypot(pBR.x - pTR.x, pBR.y - pTR.y);

    let dstW = Math.round(Math.max(topW, botW));
    let dstH = Math.round(Math.max(leftH, rightH));

    if (dstW > desiredMaxWidth || dstH > desiredMaxWidth) {
      if (dstW > dstH) {
        dstH = Math.round((dstH * desiredMaxWidth) / dstW);
        dstW = desiredMaxWidth;
      } else {
        dstW = Math.round((dstW * desiredMaxWidth) / dstH);
        dstH = desiredMaxWidth;
      }
    }

    dstW = Math.max(100, dstW);
    dstH = Math.max(100, dstH);

    const cv = window.cv;
    if (this.isReady() && cv && cv.Mat) {
      let srcMat: any = null;
      let srcTri: any = null;
      let dstTri: any = null;
      let M: any = null;
      let dstMat: any = null;

      try {
        srcMat = cv.imread(srcCanvas);
        srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
          pTL.x, pTL.y,
          pTR.x, pTR.y,
          pBR.x, pBR.y,
          pBL.x, pBL.y,
        ]);
        dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
          0, 0,
          dstW, 0,
          dstW, dstH,
          0, dstH,
        ]);

        M = cv.getPerspectiveTransform(srcTri, dstTri);
        dstMat = new cv.Mat();
        const dsize = new cv.Size(dstW, dstH);
        cv.warpPerspective(
          srcMat,
          dstMat,
          M,
          dsize,
          cv.INTER_LINEAR,
          cv.BORDER_CONSTANT,
          new cv.Scalar(255, 255, 255, 255)
        );

        const outCanvas = document.createElement('canvas');
        cv.imshow(outCanvas, dstMat);
        return outCanvas;
      } catch (err) {
        console.warn('Errore OpenCV warpPerspective, fallback a bilinear affine:', err);
      } finally {
        try {
          if (srcMat) srcMat.delete();
          if (srcTri) srcTri.delete();
          if (dstTri) dstTri.delete();
          if (M) M.delete();
          if (dstMat) dstMat.delete();
        } catch {}
      }
    }

    // Fallback con canvas 2D bilinear mesh
    return this.fallbackWarp(srcCanvas, corners, dstW, dstH);
  }

  /**
   * Fallback affine mesh warp se OpenCV non è ancora pronto
   */
  private fallbackWarp(
    srcCanvas: HTMLCanvasElement,
    corners: QuadCorners,
    dstW: number,
    dstH: number
  ): HTMLCanvasElement {
    const dstCanvas = document.createElement('canvas');
    dstCanvas.width = dstW;
    dstCanvas.height = dstH;
    const ctx = dstCanvas.getContext('2d');
    if (!ctx) return dstCanvas;

    const srcW = srcCanvas.width;
    const srcH = srcCanvas.height;

    const p0 = { x: corners.tl.x * srcW, y: corners.tl.y * srcH };
    const p1 = { x: corners.tr.x * srcW, y: corners.tr.y * srcH };
    const p2 = { x: corners.br.x * srcW, y: corners.br.y * srcH };
    const p3 = { x: corners.bl.x * srcW, y: corners.bl.y * srcH };

    const sample = (u: number, v: number) => ({
      x: (1 - u) * (1 - v) * p0.x + u * (1 - v) * p1.x + u * v * p2.x + (1 - u) * v * p3.x,
      y: (1 - u) * (1 - v) * p0.y + u * (1 - v) * p1.y + u * v * p2.y + (1 - u) * v * p3.y,
    });

    const gridN = 10;
    const stepU = 1 / gridN;
    const stepV = 1 / gridN;

    for (let i = 0; i < gridN; i++) {
      const u0 = i * stepU;
      const u1 = (i + 1) * stepU;
      const dx0 = u0 * dstW;
      const dx1 = u1 * dstW;

      for (let j = 0; j < gridN; j++) {
        const v0 = j * stepV;
        const v1 = (j + 1) * stepV;
        const dy0 = v0 * dstH;
        const dy1 = v1 * dstH;

        const s00 = sample(u0, v0);
        const s10 = sample(u1, v0);
        const s11 = sample(u1, v1);
        const s01 = sample(u0, v1);

        this.drawTriangle(ctx, srcCanvas, dx0, dy0, dx1, dy0, dx0, dy1, s00.x, s00.y, s10.x, s10.y, s01.x, s01.y);
        this.drawTriangle(ctx, srcCanvas, dx1, dy0, dx1, dy1, dx0, dy1, s10.x, s10.y, s11.x, s11.y, s01.x, s01.y);
      }
    }

    return dstCanvas;
  }

  private drawTriangle(
    ctx: CanvasRenderingContext2D,
    img: HTMLCanvasElement,
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
    if (Math.abs(delta) < 1e-6) {
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
    ctx.drawImage(img, 0, 0);
    ctx.restore();
  }

  /**
   * Step 3: Pulizia stile CamScanner ("Magic Color" come default)
   * - Magic Color: rimozione ombre dividendo l'immagine per lo sfondo stimato (blur morfologico grande),
   *   aumento contrasto e luminosità, riduzione rumore.
   * - Scala di grigi: documento bianco con testo grigio scuro nitido.
   * - Bianco e nero: soglia adattiva per testo ultra-definito.
   * - Originale: fedele all'acquisizione con leggero tocco di contrasto.
   */
  public applyFilter(
    srcCanvas: HTMLCanvasElement,
    filter: CamScannerFilterType,
    brightness: number = 10,
    contrast: number = 20
  ): HTMLCanvasElement {
    if (filter === 'original') {
      const out = document.createElement('canvas');
      out.width = srcCanvas.width;
      out.height = srcCanvas.height;
      const ctx = out.getContext('2d');
      if (ctx) {
        ctx.drawImage(srcCanvas, 0, 0);
        if (brightness !== 0 || contrast !== 0) {
          const imgData = ctx.getImageData(0, 0, out.width, out.height);
          const d = imgData.data;
          const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
          for (let i = 0; i < d.length; i += 4) {
            d[i] = Math.max(0, Math.min(255, factor * (d[i] - 128) + 128 + brightness));
            d[i + 1] = Math.max(0, Math.min(255, factor * (d[i + 1] - 128) + 128 + brightness));
            d[i + 2] = Math.max(0, Math.min(255, factor * (d[i + 2] - 128) + 128 + brightness));
          }
          ctx.putImageData(imgData, 0, 0);
        }
      }
      return out;
    }

    const cv = window.cv;
    if (this.isReady() && cv && cv.Mat) {
      let src: any = null;
      let rgb: any = null;
      let gray: any = null;
      let morphKernel: any = null;
      let dilated: any = null;
      let bg: any = null;
      let divided: any = null;
      let enhanced: any = null;
      let finalMat: any = null;

      try {
        src = cv.imread(srcCanvas);

        if (filter === 'bw') {
          // B/N: Soglia adattiva leggera
          gray = new cv.Mat();
          cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
          finalMat = new cv.Mat();
          const blockSize = Math.max(15, Math.min(41, Math.round(Math.max(srcCanvas.width, srcCanvas.height) / 45) | 1));
          cv.adaptiveThreshold(
            gray,
            finalMat,
            255,
            cv.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv.THRESH_BINARY,
            blockSize,
            9
          );
        } else if (filter === 'grayscale') {
          // Scala di grigi: divisione sfondo per carta bianca uniforme
          gray = new cv.Mat();
          cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

          const kSize = Math.max(21, Math.min(51, Math.round(Math.max(srcCanvas.width, srcCanvas.height) / 32) | 1));
          morphKernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(kSize, kSize));
          dilated = new cv.Mat();
          cv.morphologyEx(gray, dilated, cv.MORPH_DILATE, morphKernel);

          bg = new cv.Mat();
          cv.GaussianBlur(dilated, bg, new cv.Size(kSize, kSize), 0, 0, cv.BORDER_DEFAULT);

          divided = new cv.Mat();
          cv.divide(gray, bg, divided, 255.0);

          finalMat = new cv.Mat();
          divided.convertTo(finalMat, -1, 1.18, 8);
        } else {
          // MAGIC COLOR (Default CamScanner):
          // Rimozione ombre dividendo l'immagine RGB per lo sfondo stimato (blur morfologico grande)
          rgb = new cv.Mat();
          cv.cvtColor(src, rgb, cv.COLOR_RGBA2RGB);

          const kSize = Math.max(21, Math.min(55, Math.round(Math.max(srcCanvas.width, srcCanvas.height) / 30) | 1));
          morphKernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(kSize, kSize));
          dilated = new cv.Mat();
          cv.morphologyEx(rgb, dilated, cv.MORPH_DILATE, morphKernel);

          bg = new cv.Mat();
          cv.GaussianBlur(dilated, bg, new cv.Size(kSize, kSize), 0, 0, cv.BORDER_DEFAULT);

          divided = new cv.Mat();
          cv.divide(rgb, bg, divided, 255.0);

          enhanced = new cv.Mat();
          // Contrasto e luminosità ottimali
          enhanced.convertTo(enhanced, -1, 1.22, 12);

          // Riduzione rumore con Gaussian blur leggero o bilateral
          finalMat = new cv.Mat();
          cv.GaussianBlur(enhanced, finalMat, new cv.Size(3, 3), 0, 0, cv.BORDER_DEFAULT);
        }

        const outCanvas = document.createElement('canvas');
        cv.imshow(outCanvas, finalMat);
        return outCanvas;
      } catch (err) {
        console.warn('Errore OpenCV applyFilter, fallback a canvas:', err);
      } finally {
        try {
          if (src) src.delete();
          if (rgb) rgb.delete();
          if (gray) gray.delete();
          if (morphKernel) morphKernel.delete();
          if (dilated) dilated.delete();
          if (bg) bg.delete();
          if (divided) divided.delete();
          if (enhanced) enhanced.delete();
          if (finalMat) finalMat.delete();
        } catch {}
      }
    }

    // Fallback locale canvas se OpenCV non è attivo
    return this.fallbackFilter(srcCanvas, filter, brightness, contrast);
  }

  /**
   * Fallback veloce su ImageData se OpenCV è in fase di caricamento
   */
  private fallbackFilter(
    srcCanvas: HTMLCanvasElement,
    filter: CamScannerFilterType,
    bVal: number,
    cVal: number
  ): HTMLCanvasElement {
    const out = document.createElement('canvas');
    out.width = srcCanvas.width;
    out.height = srcCanvas.height;
    const ctx = out.getContext('2d', { willReadFrequently: true });
    if (!ctx) return out;

    ctx.drawImage(srcCanvas, 0, 0);
    const imgData = ctx.getImageData(0, 0, out.width, out.height);
    const data = imgData.data;
    const w = out.width;
    const h = out.height;

    const gridCols = 16;
    const gridRows = 16;
    const cellW = w / gridCols;
    const cellH = h / gridRows;
    const bgGrid: number[][] = Array.from({ length: gridRows }, () => new Array(gridCols).fill(160));

    for (let gy = 0; gy < gridRows; gy++) {
      const startY = Math.floor(gy * cellH);
      const endY = Math.floor((gy + 1) * cellH);
      for (let gx = 0; gx < gridCols; gx++) {
        const startX = Math.floor(gx * cellW);
        const endX = Math.floor((gx + 1) * cellW);
        let maxLum = 0;
        let lumSum = 0;
        let count = 0;
        for (let y = startY; y < endY; y += 4) {
          for (let x = startX; x < endX; x += 4) {
            const idx = (y * w + x) * 4;
            const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
            lumSum += lum;
            if (lum > maxLum) maxLum = lum;
            count++;
          }
        }
        const meanLum = count > 0 ? lumSum / count : 128;
        bgGrid[gy][gx] = Math.max(90, Math.min(250, 0.75 * maxLum + 0.25 * meanLum));
      }
    }

    const contrastFactor = (259 * (cVal + 255)) / (255 * (259 - cVal));

    for (let y = 0; y < h; y++) {
      const gy = Math.min(gridRows - 1, Math.floor(y / cellH));
      const rowOffset = y * w;
      for (let x = 0; x < w; x++) {
        const gx = Math.min(gridCols - 1, Math.floor(x / cellW));
        const localBg = Math.max(70, bgGrid[gy][gx]);
        const idx = (rowOffset + x) * 4;

        let r = data[idx];
        let g = data[idx + 1];
        let b = data[idx + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        const ratio = lum / localBg;

        if (filter === 'magic_color') {
          if (ratio >= 0.88) {
            const whiten = Math.min(1, (ratio - 0.88) / 0.12);
            r = r + (255 - r) * whiten;
            g = g + (255 - g) * whiten;
            b = b + (255 - b) * whiten;
          } else {
            const ink = Math.pow(ratio / 0.88, 1.25);
            r = r * ink * 0.78;
            g = g * ink * 0.78;
            b = b * ink * 0.78;
          }
          r = contrastFactor * (r - 128) + 128 + bVal;
          g = contrastFactor * (g - 128) + 128 + bVal;
          b = contrastFactor * (b - 128) + 128 + bVal;
        } else if (filter === 'bw') {
          const val = ratio >= 0.8 ? 255 : 0;
          r = val;
          g = val;
          b = val;
        } else if (filter === 'grayscale') {
          let gVal = ratio >= 0.86 ? 255 : (lum / localBg) * 215;
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

    ctx.putImageData(imgData, 0, 0);
    return out;
  }

  /**
   * Step 4: Raddrizzamento automatico dell'orientamento se rilevabile
   * Riconosce se un documento è orientato in orizzontale o verticale analizzando
   * il profilo di varianza orizzontale (le righe di testo creano picchi su righe orizzontali)
   */
  public async detectOrientation(canvas: HTMLCanvasElement): Promise<number> {
    const w = canvas.width;
    const h = canvas.height;
    if (!w || !h) return 0;

    // Se le proporzioni sono fortemente verticali (h > w * 1.25), è già verticale
    if (h > w * 1.25) return 0;

    // Campiona una versione piccola
    const sampleW = 200;
    const sampleH = Math.round((h / w) * sampleW);
    const off = document.createElement('canvas');
    off.width = sampleW;
    off.height = sampleH;
    const ctx = off.getContext('2d');
    if (!ctx) return 0;

    ctx.drawImage(canvas, 0, 0, sampleW, sampleH);
    const data = ctx.getImageData(0, 0, sampleW, sampleH).data;

    // Calcolo varianza orizzontale vs verticale dei gradienti
    let rowVarianceSum = 0;
    let colVarianceSum = 0;

    const rowLums = new Float32Array(sampleH);
    const colLums = new Float32Array(sampleW);

    for (let y = 0; y < sampleH; y++) {
      let rSum = 0;
      for (let x = 0; x < sampleW; x++) {
        const i = (y * sampleW + x) * 4;
        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        rSum += lum;
        colLums[x] += lum;
      }
      rowLums[y] = rSum / sampleW;
    }

    for (let x = 0; x < sampleW; x++) {
      colLums[x] = colLums[x] / sampleH;
    }

    // Varianza differenze adiacenti
    for (let y = 1; y < sampleH; y++) {
      const diff = rowLums[y] - rowLums[y - 1];
      rowVarianceSum += diff * diff;
    }
    for (let x = 1; x < sampleW; x++) {
      const diff = colLums[x] - colLums[x - 1];
      colVarianceSum += diff * diff;
    }

    // Se la larghezza è maggiore dell'altezza e la varianza verticale delle colonne è maggiore delle righe,
    // significa che le righe di testo corrono in verticale -> ruota di 90 gradi!
    if (w > h * 1.15 && colVarianceSum > rowVarianceSum * 1.3) {
      return 90;
    }

    return 0;
  }
}

export const opencvService = new OpenCvService();
