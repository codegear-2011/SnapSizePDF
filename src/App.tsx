import React, { useState } from 'react';
import { PDFPage, CompressionSettings, CropPoints, DocumentFilter, CompressionStepLog } from './types';
import CameraCapture from './components/CameraCapture';
import ImageCropper from './components/ImageCropper';
import PageList from './components/PageList';
import CompressionPanel from './components/CompressionPanel';
import PDFPreviewModal from './components/PDFPreviewModal';
import { buildPdfFromImages, compressPdfToTargetSize } from './utils/pdfGenerator';
import { createSampleDocument } from './utils/sampleDocuments';
import { createDefaultCropPoints } from './utils/imageProcess';
import { FileCode, FileUp, Sparkles, FolderPlus, Layers, HelpCircle, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';

export default function App() {
  // Page Stock States
  const [pages, setPages] = useState<PDFPage[]>([]);
  
  // Interaction View toggles
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [activeCropPage, setActiveCropPage] = useState<PDFPage | null>(null);
  const [isAddingNewPage, setIsAddingNewPage] = useState<boolean>(false);

  // Compression Tuning states
  const [compressionSettings, setCompressionSettings] = useState<CompressionSettings>({
    enabled: true,
    targetSize: 250,
    unit: 'KB',
  });
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [compilationLogs, setCompilationLogs] = useState<CompressionStepLog[]>([]);

  // Generated PDF artifact outcome modal
  const [compiledPdfResult, setCompiledPdfResult] = useState<{
    pdf: jsPDF;
    finalSizeInBytes: number;
    originalSizeInBytes: number;
    qualityUsed: number;
    scaleUsed: number;
  } | null>(null);

  // Add captured/uploaded raw image. Immediately open cropper to format this page!
  const handleAddNewRawImage = (dataUrl: string) => {
    setIsCameraActive(false);
    
    // Create new temporary page entry
    const newPageId = `page_${Date.now()}`;
    const draftPage: PDFPage = {
      id: newPageId,
      originalSrc: dataUrl,
      croppedSrc: dataUrl, // Defaults to original before crop
      cropPoints: createDefaultCropPoints(),
      filter: 'none',
      rotation: 0,
      name: `Scan Page ${pages.length + 1}`,
    };

    setIsAddingNewPage(true);
    setActiveCropPage(draftPage);
  };

  // Safe manual file upload trigger
  const handleManualFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          handleAddNewRawImage(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Procedural Sample generator injecting standard angled documents
  const handleLoadSample = (type: 'invoice' | 'receipt') => {
    const dataUrl = createSampleDocument(type);
    if (dataUrl) {
      handleAddNewRawImage(dataUrl);
    }
  };

  // Deletes page matching id
  const handleDeletePage = (id: string) => {
    setPages((prev) => prev.filter((p) => p.id !== id));
  };

  // Re-edits page and coordinates crop
  const handleEditPageTrigger = (page: PDFPage) => {
    setIsAddingNewPage(false);
    setActiveCropPage(page);
  };

  // Move page inside the stack index
  const handleMovePage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= pages.length) return;
    const updated = [...pages];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setPages(updated);
  };

  // Commit crop-points and scan filter choices inside cropper modal
  const handleSaveCroppedPage = (
    cropPoints: CropPoints,
    filter: DocumentFilter,
    rotation: number,
    croppedSrc: string
  ) => {
    if (!activeCropPage) return;

    const committedPage: PDFPage = {
      ...activeCropPage,
      cropPoints,
      filter,
      rotation,
      croppedSrc,
    };

    if (isAddingNewPage) {
      // Append new scan to stack
      setPages((prev) => [...prev, committedPage]);
    } else {
      // Update existing page inside array
      setPages((prev) => prev.map((p) => (p.id === activeCropPage.id ? committedPage : p)));
    }

    setActiveCropPage(null);
  };

  // Formulate absolute maximum / custom sizing metrics
  const handleCompilePDF = async () => {
    if (pages.length === 0) return;

    setIsCompiling(true);
    setCompilationLogs([]);

    try {
      // 1. Estimate Normal size (Full quality 0.95 Scale 1.0)
      const normalImgs: string[] = [];
      for (const page of pages) {
        normalImgs.push(page.croppedSrc);
      }
      const { sizeInBytes: estimateNormalBytes } = await buildPdfFromImages(normalImgs);

      if (compressionSettings.enabled) {
        // Enforce the size target budget
        const factor = compressionSettings.unit === 'MB' ? 1024 * 1024 : 1024;
        const targetBytes = compressionSettings.targetSize * factor;

        // Perform Adaptive Bitrate Quality Search
        const result = await compressPdfToTargetSize(pages, targetBytes, (progressLogs) => {
          setCompilationLogs(progressLogs);
        });

        setCompiledPdfResult({
          pdf: result.pdf,
          finalSizeInBytes: result.finalSizeInBytes,
          originalSizeInBytes: estimateNormalBytes,
          qualityUsed: result.qualityUsed,
          scaleUsed: result.scaleUsed,
        });
      } else {
        // Standard full high res compile
        const { pdf, sizeInBytes } = await buildPdfFromImages(normalImgs);
        setCompiledPdfResult({
          pdf,
          finalSizeInBytes: sizeInBytes,
          originalSizeInBytes: sizeInBytes,
          qualityUsed: 0.95,
          scaleUsed: 1.0,
        });
      }
    } catch (e) {
      console.error(e);
      alert('Exception occurred compiling PDF document.');
    } finally {
      setIsCompiling(false);
    }
  };

  return (
    <div id="main-app-container" className="min-h-screen bg-[#070b13] text-slate-100 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-400">
      
      {/* Visual Navigation Header Banner */}
      <header className="border-b border-slate-900 bg-[#090f1a]/80 backdrop-blur-md sticky top-0 z-30 px-4 md:px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl shadow-inner shadow-black">
            <Layers className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-base md:text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
              PDF Maker & Compressor
              <span className="text-[9px] font-mono uppercase bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20">
                Studio
              </span>
            </h1>
            <p className="text-xs text-slate-400">Scan, auto-crop boundaries, and compress pages with exact file size limits.</p>
          </div>
        </div>

        {/* Action triggers top shelf */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            id="camera-launcher"
            onClick={() => setIsCameraActive(true)}
            className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-600/15"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Launch Scanner</span>
          </button>

          <label className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-semibold cursor-pointer text-slate-300 hover:text-white transition">
            <FileUp className="w-3.5 h-3.5" />
            <span>Upload Image</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleManualFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </header>

      {/* Main Dashboard Board Layout split */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Document Pages Stack manager */}
        <div className="lg:col-span-8 space-y-6">
          {pages.length > 0 ? (
            <PageList
              pages={pages}
              onDeletePage={handleDeletePage}
              onEditPage={handleEditPageTrigger}
              onMovePage={handleMovePage}
            />
          ) : (
            <div className="space-y-6">
              {/* Fallback Zero-State Sandbox Playground */}
              <div className="flex flex-col items-center justify-center py-20 px-6 bg-[#090f1a]/50 rounded-2xl border border-dashed border-slate-850 text-slate-500 text-center">
                <Layers className="w-14 h-14 text-slate-800 mb-4 stroke-[1.25]" />
                <h3 className="font-semibold text-slate-300 text-sm md:text-base mb-1">
                  Assemble Your PDF Page Stack
                </h3>
                <p className="text-xs text-slate-450 max-w-sm mb-6 leading-relaxed">
                  Start scanning. You can take live photo snapshots, upload receipt pictures, or trigger simulated scans below to explore instant border detection.
                </p>

                {/* Simulated Sandboxed Quick-Starts */}
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-850 w-full max-w-md">
                  <span className="block text-[10px] font-mono uppercase tracking-wider text-slate-450 mb-3 block">
                    No camera or images handy? Inject procedural simulated scans:
                  </span>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      id="load-sample-invoice-btn"
                      onClick={() => handleLoadSample('invoice')}
                      className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-300 hover:text-white rounded-lg flex items-center justify-center gap-1.5 transition text-left"
                    >
                      <FolderPlus className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Simulate Invoice</span>
                    </button>

                    <button
                      id="load-sample-receipt-btn"
                      onClick={() => handleLoadSample('receipt')}
                      className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-300 hover:text-white rounded-lg flex items-center justify-center gap-1.5 transition text-left"
                    >
                      <FolderPlus className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Simulate Receipt</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Compression & Export Actions */}
        <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-6">
          <CompressionPanel
            settings={compressionSettings}
            onSettingsChange={setCompressionSettings}
            isProcessing={isCompiling}
            logs={compilationLogs}
            onGenerate={handleCompilePDF}
            pagesCount={pages.length}
          />

          {/* Quick Informational Panel details */}
          <div className="bg-slate-950/60 border border-slate-850 rounded-2xl p-4.5 space-y-3">
            <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
              <span>How does DocuFit Size Budgeting work?</span>
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              When a size limit is specified (e.g. 200KB), the engine performs real-time quality testing on page sub-renderers. It compiles arrays in search of optimal compression values for pixel targets, avoiding massive emails or upload denials inside corporate forms.
            </p>
          </div>
        </div>
      </main>

      {/* MODALS OVERLAYS ENTRY PORTALS */}
      <AnimatePresence>
        
        {/* 1. Camera Capture Overlay */}
        {isCameraActive && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="w-full max-w-2xl h-[70vh] min-h-[480px]">
              <CameraCapture
                onPhotoCaptured={handleAddNewRawImage}
                onClose={() => setIsCameraActive(false)}
              />
            </div>
          </div>
        )}

        {/* 2. Cropper & Scan Filters View Overlay */}
        {activeCropPage && (
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 md:p-4 z-50">
            <div className="w-full max-w-3xl h-[92vh] max-h-[820px]">
              <ImageCropper
                originalSrc={activeCropPage.originalSrc}
                initialCropPoints={activeCropPage.cropPoints}
                initialFilter={activeCropPage.filter}
                initialRotation={activeCropPage.rotation}
                onSave={handleSaveCroppedPage}
                onCancel={() => setActiveCropPage(null)}
              />
            </div>
          </div>
        )}

        {/* 3. Compiled Download PDF preview Modal */}
        {compiledPdfResult && (
          <PDFPreviewModal
            pdf={compiledPdfResult.pdf}
            finalSizeInBytes={compiledPdfResult.finalSizeInBytes}
            originalSizeInBytes={compiledPdfResult.originalSizeInBytes}
            qualityUsed={compiledPdfResult.qualityUsed}
            scaleUsed={compiledPdfResult.scaleUsed}
            onClose={() => setCompiledPdfResult(null)}
          />
        )}

      </AnimatePresence>
    </div>
  );
}
