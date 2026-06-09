import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { FileDown, ExternalLink, X, Check, Award, Copy } from 'lucide-react';
import { motion } from 'motion/react';

interface PDFPreviewModalProps {
  pdf: jsPDF;
  finalSizeInBytes: number;
  originalSizeInBytes: number;
  qualityUsed: number;
  scaleUsed: number;
  onClose: () => void;
}

export default function PDFPreviewModal({
  pdf,
  finalSizeInBytes,
  originalSizeInBytes,
  qualityUsed,
  scaleUsed,
  onClose,
}: PDFPreviewModalProps) {
  const [filename, setFilename] = useState<string>('Scanned_Document');
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Compile Blob URL on mount, cleanup on unmount
  useEffect(() => {
    const blob = pdf.output('blob');
    const url = URL.createObjectURL(blob);
    setPdfBlobUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [pdf]);

  // Convert bytes to human-readable size
  const formatBytes = (bytes: number) => {
    if (bytes === 0 || isNaN(bytes)) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleDownload = () => {
    // Add extension if missing
    const cleanName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    pdf.save(cleanName);
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(pdfBlobUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (e) {
      console.warn(e);
    }
  };

  const spaceSavedPct =
    originalSizeInBytes > finalSizeInBytes
      ? Math.round(((originalSizeInBytes - finalSizeInBytes) / originalSizeInBytes) * 100)
      : 0;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-100 text-sm md:text-base">Document Compiled</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Preview and adjust output properties</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body layout split */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Preview Pane */}
          <div className="flex-1 bg-slate-950 p-4 flex flex-col gap-3 justify-center items-center relative overflow-hidden min-h-[250px] md:border-r border-slate-800">
            {pdfBlobUrl ? (
              <iframe
                id="pdf-iframe-preview"
                src={`${pdfBlobUrl}#toolbar=0&navpanes=0`}
                className="w-full h-full rounded-lg border border-slate-850 shadow bg-slate-900 hidden md:block"
                title="PDF Document Preview"
              />
            ) : (
              <div className="text-xs text-slate-500 font-mono">Generating render view...</div>
            )}

            {/* If inside small mobile device or sandboxed frame, show simple preview card */}
            <div className="md:hidden p-6 bg-slate-900 border border-slate-800 rounded-2xl text-center max-w-xs shadow">
              <span className="inline-block px-3 py-1 bg-emerald-500/10 text-emerald-400 font-mono text-[11px] rounded-full mb-3 border border-emerald-500/20">
                PDF Ready to Save
              </span>
              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                The compiled PDF has been successfully structured and compressed! Download or inspect below.
              </p>
            </div>

            {/* Floating manual open button for sandbox fail safes */}
            <a
              href={pdfBlobUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs text-slate-300 hover:text-white hover:border-slate-700 flex items-center gap-1.5 transition-all shadow shadow-black"
            >
              <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
              <span>Open in New Tab for full inspection</span>
            </a>
          </div>

          {/* Right Parameters summary Panel */}
          <div className="w-full md:w-80 p-5 bg-slate-900/60 flex flex-col justify-between overflow-y-auto border-t md:border-t-0 border-slate-800 space-y-6">
            <div className="space-y-5">
              {/* Filename Input */}
              <div className="space-y-1.5">
                <label className="block text-[11px] text-slate-400 font-medium font-mono uppercase tracking-wider">
                  Filename
                </label>
                <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 focus-within:border-emerald-500 transition">
                  <input
                    id="filename-input"
                    type="text"
                    value={filename}
                    onChange={(e) => setFilename(e.target.value)}
                    placeholder="Enter document name"
                    className="flex-1 bg-transparent text-xs text-slate-200 outline-none"
                  />
                  <span className="text-xs font-bold text-slate-600 font-mono">.pdf</span>
                </div>
              </div>

              {/* Compression Metrics report */}
              <div className="space-y-3.5">
                <span className="block text-[11px] text-slate-400 font-medium font-mono uppercase tracking-wider">
                  Optimization Scorecard
                </span>

                <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-850 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Normal size (estimate):</span>
                    <span className="font-mono text-slate-300 line-through">
                      {formatBytes(originalSizeInBytes)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs pt-1.5 border-t border-slate-900">
                    <span className="text-slate-200 font-medium">Compressed size:</span>
                    <span className="font-mono text-emerald-400 font-bold">
                      {formatBytes(finalSizeInBytes)}
                    </span>
                  </div>

                  {spaceSavedPct > 0 && (
                    <div className="bg-emerald-600/10 border border-emerald-500/20 rounded-lg px-3 py-2 flex items-center gap-2 mt-2 animate-fadeIn">
                      <Award className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-[11px] text-emerald-300 font-medium font-sans">
                        Space reduced by <strong className="text-emerald-400">{spaceSavedPct}%</strong>!
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Advanced info lists */}
              <div className="space-y-2 text-[10px] font-mono text-slate-500">
                <div className="flex justify-between">
                  <span>Image Quality Score:</span>
                  <span className="text-slate-400">{Math.round(qualityUsed * 100)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Resolution Scale:</span>
                  <span className="text-slate-400">{Math.round(scaleUsed * 100)}%</span>
                </div>
              </div>
            </div>

            {/* Download Buttons block */}
            <div className="pt-5 border-t border-slate-800 space-y-2">
              <button
                id="download-pdf-btn"
                onClick={handleDownload}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow"
              >
                <FileDown className="w-4 h-4" />
                <span>Save PDF Document</span>
              </button>

              <button
                onClick={handleShare}
                className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5"
                title="Copy PDF internal local buffer URI"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? 'Local link Copied!' : 'Copy Local Link'}</span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
