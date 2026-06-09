import React, { useState, useRef, useEffect } from 'react';
import { CropPoints, Point, DocumentFilter } from '../types';
import { detectDocumentCorners, createDefaultCropPoints, cropAndProcessImage } from '../utils/imageProcess';
import { RotateCw, Sparkles, Image as ImageIcon, Eye, Check, RefreshCw } from 'lucide-react';

interface ImageCropperProps {
  originalSrc: string;
  initialCropPoints?: CropPoints;
  initialFilter?: DocumentFilter;
  initialRotation?: number;
  onSave: (cropPoints: CropPoints, filter: DocumentFilter, rotation: number, croppedSrc: string) => void;
  onCancel: () => void;
}

type CornerKey = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';

export default function ImageCropper({
  originalSrc,
  initialCropPoints,
  initialFilter = 'none',
  initialRotation = 0,
  onSave,
  onCancel,
}: ImageCropperProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // States
  const [cropPoints, setCropPoints] = useState<CropPoints>(
    initialCropPoints || createDefaultCropPoints()
  );
  const [filter, setFilter] = useState<DocumentFilter>(initialFilter);
  const [rotation, setRotation] = useState<number>(initialRotation);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [previewSrc, setPreviewSrc] = useState<string>('');
  const [tab, setTab] = useState<'adjust' | 'preview'>('adjust');

  // Tracking active handle dragging
  const [activeCorner, setActiveCorner] = useState<CornerKey | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0, left: 0, top: 0 });

  // Load auto-crop points on mount if not provided explicitly
  const detectCornersOnImageLoad = () => {
    const imgElement = imageRef.current;
    if (!imgElement || initialCropPoints) {
      updateDimensions();
      return;
    }

    updateDimensions();

    // Run auto-corners check on a temporary canvas
    try {
      const canvas = document.createElement('canvas');
      canvas.width = imgElement.naturalWidth;
      canvas.height = imgElement.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(imgElement, 0, 0);
        const detected = detectDocumentCorners(canvas);
        setCropPoints(detected);
      }
    } catch (e) {
      console.warn('Could not run pixel-level auto-cropping, default to safe margins:', e);
    }
  };

  // Keep track of container / image dimensions
  const updateDimensions = () => {
    if (imageRef.current) {
      const { width, height, left, top } = imageRef.current.getBoundingClientRect();
      const containerRect = containerRef.current?.getBoundingClientRect();
      
      setDimensions({
        width,
        height,
        left: left - (containerRect?.left || 0),
        top: top - (containerRect?.top || 0),
      });
    }
  };

  useEffect(() => {
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Recalculate preview in real-time when tab swaps or settings change
  useEffect(() => {
    let active = true;
    if (tab === 'preview') {
      setIsProcessing(true);
      cropAndProcessImage(originalSrc, cropPoints, rotation, filter, 0.95)
        .then((dataUrl) => {
          if (active) {
            setPreviewSrc(dataUrl);
            setIsProcessing(false);
          }
        })
        .catch((err) => {
          console.error(err);
          if (active) setIsProcessing(false);
        });
    }
    return () => {
      active = false;
    };
  }, [tab, cropPoints, rotation, filter, originalSrc]);

  // Pointer event handlers for dragging corner points
  const handlePointerDown = (corner: CornerKey, e: React.PointerEvent) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setActiveCorner(corner);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activeCorner || !dimensions.width || !dimensions.height) return;
    
    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const imageRect = imageRef.current?.getBoundingClientRect();

    if (!imageRect) return;

    // Relative mouse position from the top-left corner of the displayed image
    const mouseX = e.clientX - imageRect.left;
    const mouseY = e.clientY - imageRect.top;

    // Convert to normalized coordinates (0 to 1) constrained inside image boundary
    const x = Math.min(1, Math.max(0, mouseX / dimensions.width));
    const y = Math.min(1, Math.max(0, mouseY / dimensions.height));

    setCropPoints((prev) => ({
      ...prev,
      [activeCorner]: { x, y },
    }));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (activeCorner) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      setActiveCorner(null);
    }
  };

  const handleResetCrop = () => {
    setCropPoints(createDefaultCropPoints());
  };

  const handleAutoDetect = () => {
    const imgElement = imageRef.current;
    if (!imgElement) return;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = imgElement.naturalWidth;
      canvas.height = imgElement.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(imgElement, 0, 0);
        const detected = detectDocumentCorners(canvas);
        setCropPoints(detected);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360 as any);
  };

  const handleApply = async () => {
    setIsProcessing(true);
    try {
      // Create high quality output JPG for the document listing
      const finalCrop = await cropAndProcessImage(originalSrc, cropPoints, rotation, filter, 0.95);
      onSave(cropPoints, filter, rotation, finalCrop);
    } catch (err) {
      console.error(err);
      alert('Failed to process cropped output image.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Convert normalized point coordinates into absolute overlay pixels
  const tl = { x: cropPoints.topLeft.x * dimensions.width + dimensions.left, y: cropPoints.topLeft.y * dimensions.height + dimensions.top };
  const tr = { x: cropPoints.topRight.x * dimensions.width + dimensions.left, y: cropPoints.topRight.y * dimensions.height + dimensions.top };
  const bl = { x: cropPoints.bottomLeft.x * dimensions.width + dimensions.left, y: cropPoints.bottomLeft.y * dimensions.height + dimensions.top };
  const br = { x: cropPoints.bottomRight.x * dimensions.width + dimensions.left, y: cropPoints.bottomRight.y * dimensions.height + dimensions.top };

  // SVG Paths for the background overlay mask utilizing evenodd fill rule
  const containerW = dimensions.width ? dimensions.width + dimensions.left * 2 : 500;
  const containerH = dimensions.height ? dimensions.height + dimensions.top * 2 : 500;

  const maskPath = `
    M 0,0 
    L ${containerW},0 
    L ${containerW},${containerH} 
    L 0,${containerH} Z 
    M ${tl.x},${tl.y} 
    L ${tr.x},${tr.y} 
    L ${br.x},${br.y} 
    L ${bl.x},${bl.y} Z
  `;

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <h3 className="font-semibold text-sm md:text-base">Enhance & Crop Page</h3>
        </div>
        <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-800">
          <button
            onClick={() => setTab('adjust')}
            className={`flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-md transition ${
              tab === 'adjust' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <RotateCw className="w-3.5 h-3.5" />
            Adjust Border
          </button>
          <button
            onClick={() => setTab('preview')}
            className={`flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-md transition ${
              tab === 'preview' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Scan Filter
          </button>
        </div>
      </div>

      {/* Main workspace */}
      <div className="flex-1 min-h-[300px] flex items-center justify-center p-4 bg-slate-950 select-none overflow-hidden relative">
        {tab === 'adjust' ? (
          <div
            ref={containerRef}
            className="relative max-w-full max-h-[450px] inline-block"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <img
              ref={imageRef}
              src={originalSrc}
              alt="Scan capture"
              onLoad={detectCornersOnImageLoad}
              className="max-w-full max-h-[420px] object-contain rounded shadow-lg pointer-events-none"
            />

            {/* SVG Interactive Drawing Plane */}
            {dimensions.width > 0 && (
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none z-10"
                style={{ overflow: 'visible' }}
              >
                {/* Translucent overlay masking outside cropped area */}
                <path
                  d={maskPath}
                  fill="rgba(2, 6, 23, 0.7)"
                  fillRule="evenodd"
                  className="transition-all"
                />

                {/* Cropping boundaries lines */}
                <line x1={tl.x} y1={tl.y} x2={tr.x} y2={tr.y} stroke="#10b981" strokeWidth="2.5" />
                <line x1={tr.x} y1={tr.y} x2={br.x} y2={br.y} stroke="#10b981" strokeWidth="2.5" />
                <line x1={br.x} y1={br.y} x2={bl.x} y2={bl.y} stroke="#10b981" strokeWidth="2.5" />
                <line x1={bl.x} y1={bl.y} x2={tl.x} y2={tl.y} stroke="#10b981" strokeWidth="2.5" />

                {/* Centered target grid markings to aid visual precision alignment */}
                <line x1={(tl.x + bl.x) / 2} y1={(tl.y + bl.y) / 2} x2={(tr.x + br.x) / 2} y2={(tr.y + br.y) / 2} stroke="#10b981" strokeWidth="1" strokeDasharray="3,3" />
                <line x1={(tl.x + tr.x) / 2} y1={(tl.y + tr.y) / 2} x2={(bl.x + br.x) / 2} y2={(bl.y + br.y) / 2} stroke="#10b981" strokeWidth="1" strokeDasharray="3,3" />
              </svg>
            )}

            {/* Absolute draggable handle nodes (placed outside the SVG rotation coordinates for ease of trigger) */}
            {dimensions.width > 0 && (
              <div className="absolute inset-0 w-full h-full pointer-events-none z-20">
                {/* Top Left */}
                <div
                  id="handle-tl"
                  className={`absolute pointer-events-auto w-7 h-7 -ml-3.5 -mt-3.5 rounded-full border-2 border-white bg-emerald-500 shadow-md flex items-center justify-center cursor-move transition active:scale-125 touch-none ${
                    activeCorner === 'topLeft' ? 'scale-125 bg-emerald-400' : ''
                  }`}
                  style={{ left: tl.x, top: tl.y }}
                  onPointerDown={(e) => handlePointerDown('topLeft', e)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                />
                {/* Top Right */}
                <div
                  id="handle-tr"
                  className={`absolute pointer-events-auto w-7 h-7 -ml-3.5 -mt-3.5 rounded-full border-2 border-white bg-emerald-500 shadow-md flex items-center justify-center cursor-move transition active:scale-125 touch-none ${
                    activeCorner === 'topRight' ? 'scale-125 bg-emerald-400' : ''
                  }`}
                  style={{ left: tr.x, top: tr.y }}
                  onPointerDown={(e) => handlePointerDown('topRight', e)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                />
                {/* Bottom Left */}
                <div
                  id="handle-bl"
                  className={`absolute pointer-events-auto w-7 h-7 -ml-3.5 -mt-3.5 rounded-full border-2 border-white bg-emerald-500 shadow-md flex items-center justify-center cursor-move transition active:scale-125 touch-none ${
                    activeCorner === 'bottomLeft' ? 'scale-125 bg-emerald-400' : ''
                  }`}
                  style={{ left: bl.x, top: bl.y }}
                  onPointerDown={(e) => handlePointerDown('bottomLeft', e)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                />
                {/* Bottom Right */}
                <div
                  id="handle-br"
                  className={`absolute pointer-events-auto w-7 h-7 -ml-3.5 -mt-3.5 rounded-full border-2 border-white bg-emerald-500 shadow-md flex items-center justify-center cursor-move transition active:scale-125 touch-none ${
                    activeCorner === 'bottomRight' ? 'scale-125 bg-emerald-400' : ''
                  }`}
                  style={{ left: br.x, top: br.y }}
                  onPointerDown={(e) => handlePointerDown('bottomRight', e)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center w-full max-w-xs h-full relative">
            {isProcessing ? (
              <div className="flex flex-col items-center gap-3 py-12 text-slate-400">
                <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
                <p className="text-xs font-mono">Processing scan filter...</p>
              </div>
            ) : (
              <div className="bg-white p-2 rounded-lg shadow-xl border border-slate-800 max-h-[380px] overflow-hidden flex items-center justify-center">
                <img
                  src={previewSrc}
                  alt="Cropped Filtered scan"
                  className="max-w-full max-h-[340px] object-contain rounded"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Adjust Controls Panel */}
      <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-col md:flex-row gap-4 justify-between items-center">
        {tab === 'adjust' ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              id="auto-crop-btn"
              onClick={handleAutoDetect}
              className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg border border-slate-700 flex items-center gap-1.5 transition"
              title="Automatically detect borders of document paper"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Auto Crop Find</span>
            </button>
            <button
              id="rotate-btn"
              onClick={handleRotate}
              className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg border border-slate-700 flex items-center gap-1.5 transition"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Rotate 90°</span>
            </button>
            <button
              onClick={handleResetCrop}
              className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-lg transition"
            >
              Reset Points
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-400 mr-1.5">Enhancements:</span>
            {(['none', 'magic', 'grayscale', 'threshold'] as DocumentFilter[]).map((f) => (
              <button
                key={f}
                id={`filter-btn-${f}`}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs rounded-lg border font-medium capitalize transition ${
                  filter === f
                    ? 'bg-emerald-600 border-emerald-500 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                }`}
              >
                {f === 'none' ? 'original' : f === 'threshold' ? 'B&W Scan' : f}
              </button>
            ))}
          </div>
        )}

        {/* Apply controls */}
        <div className="flex items-center gap-2 mt-2 md:mt-0 w-full md:w-auto justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs font-medium bg-transparent hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            id="apply-crop-btn"
            disabled={isProcessing}
            onClick={handleApply}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg shadow transition"
          >
            <Check className="w-4 h-4" />
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
}
