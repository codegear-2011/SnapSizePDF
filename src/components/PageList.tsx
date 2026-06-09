import React from 'react';
import { PDFPage } from '../types';
import { ArrowLeft, ArrowRight, Trash2, Edit3, MoveLeft, MoveRight, Layers } from 'lucide-react';
import { motion } from 'motion/react';

interface PageListProps {
  pages: PDFPage[];
  onDeletePage: (id: string) => void;
  onEditPage: (page: PDFPage) => void;
  onMovePage: (fromIndex: number, toIndex: number) => void;
}

export default function PageList({ pages, onDeletePage, onEditPage, onMovePage }: PageListProps) {
  if (pages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 bg-slate-900/40 rounded-2xl border border-dashed border-slate-800 text-slate-500 text-center max-w-xl mx-auto">
        <Layers className="w-12 h-12 text-slate-700 mb-3 stroke-[1.5]" />
        <p className="font-semibold text-slate-400 mb-1">No captured pages yet</p>
        <p className="text-xs text-slate-500 max-w-sm">
          Snap a photo of your receipt, letter, or book page using the camera or upload from your computer to kickstart your PDF.
        </p>
      </div>
    );
  }

  return (
    <div id="pages-list-container" className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
          Page Stack ({pages.length} {pages.length === 1 ? 'Page' : 'Pages'})
        </span>
        <span className="text-xs text-slate-500">Order from Top to Bottom</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {pages.map((page, index) => {
          const filterLabel =
            page.filter === 'none'
              ? 'Original'
              : page.filter === 'magic'
              ? 'Magic Color'
              : page.filter === 'grayscale'
              ? 'Grayscale'
              : 'B&W Scan';

          return (
            <motion.div
              layout
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              key={page.id}
              className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-md flex flex-col group hover:border-slate-700 transition"
            >
              {/* Card Header numbering */}
              <div className="px-3 py-2 bg-slate-950 flex items-center justify-between border-b border-slate-800">
                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  Page {index + 1}
                </span>
                <span className="text-[10px] text-slate-500 font-mono capitalize">{filterLabel}</span>
              </div>

              {/* Visual Thumbnail */}
              <div className="relative aspect-[3/4] bg-slate-950 p-2 flex items-center justify-center overflow-hidden">
                <img
                  src={page.croppedSrc}
                  alt={`Page ${index + 1}`}
                  className="max-h-full max-w-full object-contain rounded shadow-sm"
                />
                
                {/* Visual Rotate indicator badge */}
                {page.rotation > 0 && (
                  <span className="absolute bottom-2 right-2 px-1.5 py-0.5 text-[9px] font-mono bg-slate-950/80 text-emerald-400 rounded border border-emerald-500/20">
                    Rotated {page.rotation}°
                  </span>
                )}
              </div>

              {/* Quick Actions Footer */}
              <div className="p-2 bg-slate-950/40 border-t border-slate-800/80 flex justify-between items-center gap-1.5 mt-auto">
                {/* Page reordering button triggers */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onMovePage(index, index - 1)}
                    disabled={index === 0}
                    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:bg-slate-800 transition"
                    title="Move up / left"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onMovePage(index, index + 1)}
                    disabled={index === pages.length - 1}
                    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:bg-slate-800 transition"
                    title="Move down / right"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Edit / Delete triggers */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onEditPage(page)}
                    className="p-1.5 rounded bg-slate-800 hover:bg-emerald-950/30 text-slate-300 hover:text-emerald-400 border border-slate-700/80 hover:border-emerald-500/20 transition flex items-center gap-1 text-[11px] font-medium"
                    title="Re-crop and change filter details"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => onDeletePage(page.id)}
                    className="p-1.5 rounded bg-slate-800 hover:bg-rose-950/20 text-slate-400 hover:text-rose-400 transition"
                    title="Delete page"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
