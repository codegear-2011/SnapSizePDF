import { CropPoints, Point, DocumentFilter } from '../types';

// Helper to calculate distance between two points
export function getDistance(p1: Point, p2: Point): number {
  return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

/**
 * Automatically detects the 4 corners of a sheet of paper (light object)
 * against a darker background in a high-performance way.
 */
export function detectDocumentCorners(canvas: HTMLCanvasElement): CropPoints {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return createDefaultCropPoints();
  }

  // Downsample to 100x100 for blindingly fast and low-memory analysis
  const sampleSize = 100;
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = sampleSize;
  tempCanvas.height = sampleSize;
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) return createDefaultCropPoints();

  tempCtx.drawImage(canvas, 0, 0, sampleSize, sampleSize);
  const imgData = tempCtx.getImageData(0, 0, sampleSize, sampleSize);
  const data = imgData.data;

  // Calculate average luminance of the entire image
  let totalLuminance = 0;
  const lumList: number[] = new Array(sampleSize * sampleSize);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Standard photo luminance formula
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    lumList[i / 4] = lum;
    totalLuminance += lum;
  }

  const avgLuminance = totalLuminance / (sampleSize * sampleSize);

  // We find document corners by checking pixels brighter than the standard threshold.
  // We'll use a threshold slightly above average (e.g. avg * 1.1) to isolate paper, or just avg if dark.
  const threshold = Math.max(avgLuminance * 1.05, 110);

  // Keep track of best points
  let bestTopLeft = { x: 0, y: 0, score: Infinity };
  let bestTopRight = { x: sampleSize - 1, y: 0, score: Infinity };
  let bestBottomLeft = { x: 0, y: sampleSize - 1, score: Infinity };
  let bestBottomRight = { x: sampleSize - 1, y: sampleSize - 1, score: Infinity };

  let foundPaperPixels = 0;

  for (let y = 0; y < sampleSize; y++) {
    for (let x = 0; x < sampleSize; x++) {
      const idx = y * sampleSize + x;
      const lum = lumList[idx];

      if (lum >= threshold) {
        foundPaperPixels++;
        // Top-left corner minimizes: x + y
        const tlScore = x + y;
        if (tlScore < bestTopLeft.score) {
          bestTopLeft = { x, y, score: tlScore };
        }

        // Top-right corner minimizes: (sampleSize - x) + y
        const trScore = (sampleSize - x) + y;
        if (trScore < bestTopRight.score) {
          bestTopRight = { x, y, score: trScore };
        }

        // Bottom-left corner minimizes: x + (sampleSize - y)
        const blScore = x + (sampleSize - y);
        if (blScore < bestBottomLeft.score) {
          bestBottomLeft = { x, y, score: blScore };
        }

        // Bottom-right corner minimizes: (sampleSize - x) + (sampleSize - y)
        const brScore = (sampleSize - x) + (sampleSize - y);
        if (brScore < bestBottomRight.score) {
          bestBottomRight = { x, y, score: brScore };
        }
      }
    }
  }

  // If we didn't find enough white paper-like pixels, count is too low,
  // or the points are collapsed, fall back to safe default margins
  const minPixels = (sampleSize * sampleSize) * 0.05; // 5% minimum
  if (
    foundPaperPixels < minPixels ||
    bestTopLeft.score === Infinity ||
    bestTopRight.score === Infinity ||
    bestBottomLeft.score === Infinity ||
    bestBottomRight.score === Infinity ||
    Math.abs(bestTopLeft.x - bestTopRight.x) < 15 ||
    Math.abs(bestBottomLeft.y - bestTopLeft.y) < 15
  ) {
    return createDefaultCropPoints();
  }

  return {
    topLeft: { x: bestTopLeft.x / sampleSize, y: bestTopLeft.y / sampleSize },
    topRight: { x: bestTopRight.x / sampleSize, y: bestTopRight.y / sampleSize },
    bottomLeft: { x: bestBottomLeft.x / sampleSize, y: bestBottomLeft.y / sampleSize },
    bottomRight: { x: bestBottomRight.x / sampleSize, y: bestBottomRight.y / sampleSize },
  };
}

export function createDefaultCropPoints(): CropPoints {
  return {
    topLeft: { x: 0.05, y: 0.05 },
    topRight: { x: 0.95, y: 0.05 },
    bottomLeft: { x: 0.05, y: 0.95 },
    bottomRight: { x: 0.95, y: 0.95 },
  };
}

/**
 * Creates an image from a DataURL
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
  });
}

/**
 * Crops, rotates, and applies enhancement filters to the image
 */
export async function cropAndProcessImage(
  originalSrc: string,
  cropPoints: CropPoints,
  rotation: number, // 0, 90, 180, 270
  filter: DocumentFilter,
  quality: number = 0.9 // Quality for JPG compression (0 to 1)
): Promise<string> {
  const img = await loadImage(originalSrc);

  // Create temporary canvas to hold rotated image
  const rotCanvas = document.createElement('canvas');
  const rotCtx = rotCanvas.getContext('2d');
  if (!rotCtx) throw new Error('Could not get 2D canvas context');

  // Set rotation dimensions
  if (rotation === 90 || rotation === 270) {
    rotCanvas.width = img.height;
    rotCanvas.height = img.width;
  } else {
    rotCanvas.width = img.width;
    rotCanvas.height = img.height;
  }

  // Draw rotated image
  rotCtx.translate(rotCanvas.width / 2, rotCanvas.height / 2);
  rotCtx.rotate((rotation * Math.PI) / 180);
  rotCtx.drawImage(img, -img.width / 2, -img.height / 2);

  // Now, crop from this rotated canvas.
  const cropCanvas = document.createElement('canvas');
  const cropCtx = cropCanvas.getContext('2d');
  if (!cropCtx) throw new Error('Could not get 2D canvas context');

  // Points coordinates relative to rotated canvas
  const w = rotCanvas.width;
  const h = rotCanvas.height;

  const tlX = cropPoints.topLeft.x * w;
  const tlY = cropPoints.topLeft.y * h;
  const trX = cropPoints.topRight.x * w;
  const trY = cropPoints.topRight.y * h;
  const blX = cropPoints.bottomLeft.x * w;
  const blY = cropPoints.bottomLeft.y * h;
  const brX = cropPoints.bottomRight.x * w;
  const brY = cropPoints.bottomRight.y * h;

  // Let's crop the flat bounding rectangle
  const minX = Math.max(0, Math.min(tlX, trX, blX, brX));
  const maxX = Math.min(w, Math.max(tlX, trX, blX, brX));
  const minY = Math.max(0, Math.min(tlY, trY, blY, brY));
  const maxY = Math.min(h, Math.max(tlY, trY, blY, brY));

  const cropWidth = Math.max(10, maxX - minX);
  const cropHeight = Math.max(10, maxY - minY);

  cropCanvas.width = cropWidth;
  cropCanvas.height = cropHeight;

  // Capture the quadrilateral region inside the crop points.
  // To keep it simple and ultra-fast, we mask the canvas with the path
  // of the 4 points, draw the rotated image, then copy the bounding box
  cropCtx.beginPath();
  cropCtx.moveTo(tlX - minX, tlY - minY);
  cropCtx.lineTo(trX - minX, trY - minY);
  cropCtx.lineTo(brX - minX, brY - minY);
  cropCtx.lineTo(blX - minX, blY - minY);
  cropCtx.closePath();
  cropCtx.clip();

  cropCtx.drawImage(
    rotCanvas,
    minX,
    minY,
    cropWidth,
    cropHeight,
    0,
    0,
    cropWidth,
    cropHeight
  );

  // Apply filters
  if (filter !== 'none') {
    const imgData = cropCtx.getImageData(0, 0, cropWidth, cropHeight);
    const pixels = imgData.data;

    if (filter === 'grayscale') {
      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        const v = 0.299 * r + 0.587 * g + 0.114 * b;
        pixels[i] = v;
        pixels[i + 1] = v;
        pixels[i + 2] = v;
      }
    } else if (filter === 'threshold') {
      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        const v = 0.299 * r + 0.587 * g + 0.114 * b;
        // B&W scan style thresholding
        const binary = v > 120 ? 255 : 0;
        pixels[i] = binary;
        pixels[i + 1] = binary;
        pixels[i + 2] = binary;
      }
    } else if (filter === 'magic') {
      // Magic color boost: Increase contrast, exposure, and saturation
      for (let i = 0; i < pixels.length; i += 4) {
        let r = pixels[i];
        let g = pixels[i + 1];
        let b = pixels[i + 2];

        // Linear contrast stretching + slightly brighter exposure
        // Map [20, 230] to [0, 255] and bump brightness
        r = Math.min(255, Math.max(0, ((r - 20) * 255) / 210 + 10));
        g = Math.min(255, Math.max(0, ((g - 20) * 255) / 210 + 10));
        b = Math.min(255, Math.max(0, ((b - 20) * 255) / 210 + 10));

        pixels[i] = r;
        pixels[i + 1] = g;
        pixels[i + 2] = b;
      }
    }

    cropCtx.putImageData(imgData, 0, 0);
  }

  // Generate DataURL with custom quality parameter (which acts as our compression engine!)
  return cropCanvas.toDataURL('image/jpeg', quality);
}
