import React, { useState } from 'react';
import { CompressionSettings, CompressionStepLog } from '../types';
import { Sliders, Database, ArrowRight, Zap, RefreshCw, Eye, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CompressionPanelProps {
  settings: CompressionSettings;
  onSettingsChange: (settings: CompressionSettings) => void;
  isProcessing: boolean;
  logs: CompressionStepLog[];
  onGenerate: () => void;
  pagesCount: number;
}

export default function CompressionPanel({
  settings,
  onSettingsChange,
  isProcessing,
  logs,
  onGenerate,
  pagesCount,
}: CompressionPanelProps) {
  const [customActive, setCustomActive] = useState<boolean>(false);

  // Apply a quick preset target size
  const applyPreset = (value: number, unit: 'KB' | 'MB') => {
    setCustomActive(false);
    onSettingsChange({
      enabled: true,
      targetSize: value,
      unit,
    });
  };

  // Convert settings config to bytes for search
  const getTargetInBytes = () => {
    const bytesFactor = settings.unit === 'MB' ? 1024 * 1024 : 1024;
    return settings.targetSize * bytesFactor;
  };

  return (
    <div id="compression-panel-card" className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl p-5 space-y-6">
      {/* Title block */}
      <div className="flex items-center gap-2">
        <Sliders className="w-5 h-5 text-emerald-400" />
        <h3 className="font-semibold text-sm md:text-base text-slate-100">PDF Compression & Target Budget</h3>
      </div>

      <div className="space-y-4">
        {/* Compress Toggle */}
        <div className="flex items-center justify-between p-3.5 bg-slate-950/60 rounded-xl border border-slate-800/80">
          <div>
            <span className="block text-xs font-semibold text-slate-200">Enforce File Size Limit</span>
            <span className="block text-[10px] text-slate-400 mt-0.5">
              Automatically scale and compress pages to fit inside a file size budget.
            </span>
          </div>
          <button
            id="compress-limit-toggle"
            onClick={() =>
              onSettingsChange({
                ...settings,
                enabled: !settings.enabled,
              })
            }
            className={`w-11 h-6 rounded-full transition-colors relative flex items-center ${
              settings.enabled ? 'bg-emerald-600' : 'bg-slate-800'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 shadow absolute ${
                settings.enabled ? 'left-6' : 'left-1'
              }`}
            />
          </button>
        </div>

        {/* Compression configuration controls */}
        {settings.enabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4 overflow-hidden pt-1"
          >
            {/* Quick Presets Grid */}
            <div>
              <span className="block text-[11px] text-slate-400 font-medium mb-2 font-mono uppercase tracking-wider">
                Quick File Budget Presets
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => applyPreset(150, 'KB')}
                  className={`py-2 px-3 text-xs rounded-xl border font-medium flex flex-col items-center justify-center transition ${
                    settings.targetSize === 150 && settings.unit === 'KB' && !customActive
                      ? 'bg-emerald-600/10 border-emerald-500 text-emerald-400 font-semibold'
                      : 'bg-slate-950 border-slate-850 hover:bg-slate-800/60 text-slate-300'
                  }`}
                >
                  <span className="text-sm">150 KB</span>
                  <span className="text-[9px] opacity-65 font-mono">Email standard</span>
                </button>

                <button
                  onClick={() => applyPreset(500, 'KB')}
                  className={`py-2 px-3 text-xs rounded-xl border font-medium flex flex-col items-center justify-center transition ${
                    settings.targetSize === 500 && settings.unit === 'KB' && !customActive
                      ? 'bg-emerald-600/10 border-emerald-500 text-emerald-400 font-semibold'
                      : 'bg-slate-950 border-slate-850 hover:bg-slate-800/60 text-slate-300'
                  }`}
                >
                  <span className="text-sm">500 KB</span>
                  <span className="text-[9px] opacity-65 font-mono">Medium scan</span>
                </button>

                <button
                  onClick={() => applyPreset(1.5, 'MB')}
                  className={`py-2 px-3 text-xs rounded-xl border font-medium flex flex-col items-center justify-center transition ${
                    settings.targetSize === 1.5 && settings.unit === 'MB' && !customActive
                      ? 'bg-emerald-600/10 border-emerald-500 text-emerald-400 font-semibold'
                      : 'bg-slate-950 border-slate-850 hover:bg-slate-800/60 text-slate-300'
                  }`}
                >
                  <span className="text-sm">1.5 MB</span>
                  <span className="text-[9px] opacity-65 font-mono">High-res print</span>
                </button>
              </div>
            </div>

            {/* Custom controls toggler */}
            <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-850 space-y-2">
              <label className="flex items-center gap-1.5 text-xs text-slate-300 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={customActive}
                  onChange={(e) => setCustomActive(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 h-3.5 w-3.5 bg-slate-900"
                />
                <span>Set custom file size budget</span>
              </label>

              {customActive && (
                <div className="flex items-center gap-2 pt-1 animate-fadeIn">
                  <div className="relative flex-1">
                    <input
                      id="custom-size-input"
                      type="number"
                      min="10"
                      step={settings.unit === 'MB' ? '0.1' : '10'}
                      value={settings.targetSize}
                      onChange={(e) =>
                        onSettingsChange({
                          ...settings,
                          targetSize: Math.max(1, parseFloat(e.target.value) || 0),
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-emerald-500"
                    />
                  </div>
                  <select
                    id="custom-unit-select"
                    value={settings.unit}
                    onChange={(e) =>
                      onSettingsChange({
                        ...settings,
                        unit: e.target.value as 'KB' | 'MB',
                        // Scale sensible defaults on layout shift
                        targetSize: e.target.value === 'KB' ? 300 : 1.0,
                      })
                    }
                    className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-lg py-1.5 px-2 outline-none focus:border-emerald-500"
                  >
                    <option value="KB">KB</option>
                    <option value="MB">MB</option>
                  </select>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* Compiler Action & Logger output */}
      <div className="pt-2 border-t border-slate-800">
        <button
          id="compile-pdf-btn"
          disabled={pagesCount === 0 || isProcessing}
          onClick={onGenerate}
          className="w-full py-3 px-4 rounded-xl font-bold text-xs md:text-sm bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/15 cursor-pointer select-none transition group active:scale-[0.98]"
        >
          {isProcessing ? (
            <RefreshCw className="w-4 h-4 animate-spin text-white" />
          ) : (
            <Zap className="w-4 h-4 text-emerald-100 group-hover:scale-110 transition" />
          )}
          <span>
            {isProcessing
              ? 'Searching Compression Target...'
              : settings.enabled
              ? `Compile & Fit to ${settings.targetSize} ${settings.unit}`
              : 'Compile & Export High-Res PDF'}
          </span>
        </button>

        {/* Compression Steps logs */}
        <AnimatePresence>
          {isProcessing && logs.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 p-3 bg-black border border-slate-850 rounded-xl overflow-hidden"
            >
              <div className="flex items-center gap-2 mb-2">
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  Dynamic Bitrate Optimizer Logs
                </span>
              </div>
              <div className="space-y-1.5 font-mono text-[10px] text-slate-300 max-h-[140px] overflow-y-auto pt-0.5">
                {logs.map((log, i) => (
                  <div key={i} className="flex items-start gap-1 p-1 rounded hover:bg-slate-900">
                    <span className="text-slate-600 font-bold shrink-0">#{log.iteration}</span>
                    <div className="flex-1">
                      <span className="text-slate-400">Q:</span>
                      <span className="text-emerald-400 font-semibold mr-1.5">{log.quality}</span>
                      <span className="text-slate-400">Res:</span>
                      <span className="text-sky-400 font-semibold mr-2">
                        {Math.round(log.scale * 100)}%
                      </span>
                      <span className="text-slate-400">{log.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
