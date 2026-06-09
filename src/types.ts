export interface Point {
  x: number; // Normalized coordinate between 0 and 1
  y: number; // Normalized coordinate between 0 and 1
}

export interface CropPoints {
  topLeft: Point;
  topRight: Point;
  bottomLeft: Point;
  bottomRight: Point;
}

export type DocumentFilter = 'none' | 'magic' | 'grayscale' | 'threshold';

export interface PDFPage {
  id: string;
  originalSrc: string; // Original input (File Data URL)
  croppedSrc: string;  // Cropped & filtered output used for PDF rendering
  cropPoints: CropPoints;
  filter: DocumentFilter;
  rotation: number; // 0, 90, 180, 270
  name: string;
}

export interface CompressionSettings {
  enabled: boolean;
  targetSize: number; // Numeric value
  unit: 'KB' | 'MB';
}

export interface CompressionStepLog {
  iteration: number;
  quality: number;
  scale: number;
  sizeInBytes: number;
  status: string;
}

