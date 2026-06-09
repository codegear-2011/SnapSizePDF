import { jsPDF } from 'jspdf';
import { PDFPage, CompressionStepLog } from '../types';
import { cropAndProcessImage, loadImage } from './imageProcess';

export interface CompressionResult {
  pdf: jsPDF;
  finalSizeInBytes: number;
  qualityUsed: number;
  scaleUsed: number;
  logs: CompressionStepLog[];
}

/**
 * Builds a standard jsPDF document from a list of page data-urls
 * Fit pages to A4 size (210mm x 297mm) while maintaining aspect ratio, or fit to page content.
 */
export async function buildPdfFromImages(
  images: string[]
): Promise<{ pdf: jsPDF; sizeInBytes: number }> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;

  for (let i = 0; i < images.length; i++) {
    if (i > 0) {
      doc.addPage();
    }

    try {
      const img = await loadImage(images[i]);
      const imgWidth = img.width || 1;
      const imgHeight = img.height || 1;
      const imgRatio = imgWidth / imgHeight;

      // Fit inside A4 with margins (10mm)
      const margin = 10;
      const maxWidth = pageWidth - margin * 2;
      const maxHeight = pageHeight - margin * 2;

      let drawWidth = maxWidth;
      let drawHeight = maxWidth / imgRatio;

      if (drawHeight > maxHeight) {
        drawHeight = maxHeight;
        drawWidth = maxHeight * imgRatio;
      }

      const x = (pageWidth - drawWidth) / 2;
      const y = (pageHeight - drawHeight) / 2;

      // Add image as JPEG format
      doc.addImage(images[i], 'JPEG', x, y, drawWidth, drawHeight, undefined, 'FAST');
    } catch (e) {
      console.error('Error drawing image to PDF page:', e);
    }
  }

  const arrayBuffer = doc.output('arraybuffer');
  return {
    pdf: doc,
    sizeInBytes: arrayBuffer.byteLength,
  };
}

/**
 * Compiles a list of PDFPages using custom quality and image scale factors.
 */
async function compileProcessedImages(
  pages: PDFPage[],
  quality: number,
  scale: number
): Promise<string[]> {
  const processedImages: string[] = [];

  for (const page of pages) {
    // If scale is less than 1.0, we want to downsample the visual canvas.
    // Quality parameter is supplied directly to cropAndProcessImage which exports JPEG.
    let srcToCrop = page.originalSrc;
    if (scale < 1.0) {
      try {
        const loadedImg = await loadImage(page.originalSrc);
        const downCanvas = document.createElement('canvas');
        downCanvas.width = Math.round(loadedImg.width * scale);
        downCanvas.height = Math.round(loadedImg.height * scale);
        const downCtx = downCanvas.getContext('2d');
        if (downCtx) {
          downCtx.drawImage(loadedImg, 0, 0, downCanvas.width, downCanvas.height);
          srcToCrop = downCanvas.toDataURL('image/jpeg', 0.9);
        }
      } catch (e) {
        console.error('Downscaling error', e);
      }
    }

    const processed = await cropAndProcessImage(
      srcToCrop,
      page.cropPoints,
      page.rotation,
      page.filter,
      quality
    );
    processedImages.push(processed);
  }

  return processedImages;
}

/**
 * Iteratively searches for quality and scale targets to achieve the target file size.
 */
export async function compressPdfToTargetSize(
  pages: PDFPage[],
  targetBytes: number,
  onProgress?: (logs: CompressionStepLog[]) => void
): Promise<CompressionResult> {
  const logs: CompressionStepLog[] = [];
  let bestPdf: jsPDF | null = null;
  let bestSize = Infinity;
  let bestQuality = 0.8;
  let bestScale = 1.0;

  // Search parameters
  let scaleCandidates = [1.0, 0.75, 0.5, 0.3];
  let iterationCount = 1;

  // Let's run a robust multi-stage search over scale and quality parameters
  for (let scaleIndex = 0; scaleIndex < scaleCandidates.length; scaleIndex++) {
    const scale = scaleCandidates[scaleIndex];
    let lowQ = 0.05;
    let highQ = 0.95;
    let closestQ = 0.8;
    let localBestPdf: jsPDF | null = null;
    let localBestSize = Infinity;

    // Binary search quality for the current scale
    // 4 steps of binary search per scale is sufficient and fast
    for (let step = 0; step < 4; step++) {
      const q = (lowQ + highQ) / 2;
      const formattedQ = parseFloat(q.toFixed(2));

      // 1. Prepare images with specific scale & quality parameters
      const images = await compileProcessedImages(pages, formattedQ, scale);

      // 2. Generate the PDF
      const { pdf, sizeInBytes } = await buildPdfFromImages(images);

      const status = `Size: ${(sizeInBytes / 1024).toFixed(1)} KB (Target: ${(targetBytes / 1024).toFixed(1)} KB)`;
      const currentLog: CompressionStepLog = {
        iteration: iterationCount++,
        quality: formattedQ,
        scale,
        sizeInBytes,
        status,
      };

      logs.push(currentLog);
      if (onProgress) onProgress([...logs]);

      // Handle binary search boundary shifting
      if (sizeInBytes <= targetBytes) {
        // PDF fits budget! Try to get higher quality if possible.
        localBestPdf = pdf;
        localBestSize = sizeInBytes;
        closestQ = formattedQ;

        bestPdf = pdf;
        bestSize = sizeInBytes;
        bestQuality = formattedQ;
        bestScale = scale;

        lowQ = q; // Search on the upper/higher quality half
      } else {
        // Too big. We need to decrease the quality.
        highQ = q; // Search on the lower/lower quality half
      }

      // If we are close enough (within 5% of target and under), we can stop
      if (sizeInBytes <= targetBytes && Math.abs(sizeInBytes - targetBytes) < targetBytes * 0.05) {
        break;
      }
    }

    // If we successfully found a fit in this scale, we don't need to try smaller scales!
    if (localBestPdf && localBestSize <= targetBytes) {
      break;
    }
  }

  // If no combination could get the PDF under the target size,
  // we default to the lowest quality and scale configuration we tested.
  if (!bestPdf) {
    const scale = 0.3;
    const q = 0.05;
    const images = await compileProcessedImages(pages, q, scale);
    const { pdf, sizeInBytes } = await buildPdfFromImages(images);

    const log: CompressionStepLog = {
      iteration: iterationCount,
      quality: q,
      scale,
      sizeInBytes,
      status: `Unable to shrink further. Best size achieved: ${(sizeInBytes / 1024).toFixed(1)} KB`,
    };
    logs.push(log);
    if (onProgress) onProgress([...logs]);

    bestPdf = pdf;
    bestSize = sizeInBytes;
    bestQuality = q;
    bestScale = scale;
  }

  return {
    pdf: bestPdf,
    finalSizeInBytes: bestSize,
    qualityUsed: bestQuality,
    scaleUsed: bestScale,
    logs,
  };
}
