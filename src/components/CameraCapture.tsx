import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, Upload, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CameraCaptureProps {
  onPhotoCaptured: (dataUrl: string) => void;
  onClose: () => void;
}

export default function CameraCapture({ onPhotoCaptured, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [cameraError, setCameraError] = useState<string>('');
  const [isFlashing, setIsFlashing] = useState<boolean>(false);
  const [isDragActive, setIsDragActive] = useState<boolean>(false);

  // Load available camera devices
  useEffect(() => {
    async function initDevices() {
      try {
        // Request primary camera access
        const initialStream = await navigator.mediaDevices.getUserMedia({ video: true });
        // Stream initialized successfully, stop it immediately to list all devices properly
        initialStream.getTracks().forEach((track) => track.stop());

        const deviceList = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = deviceList.filter((d) => d.kind === 'videoinput');
        setDevices(videoDevices);

        if (videoDevices.length > 0) {
          setSelectedDeviceId(videoDevices[0].deviceId);
        } else {
          setCameraError('No camera found on this device. Please upload a file instead.');
        }
      } catch (err: any) {
        console.warn('Camera permission denied or not found:', err);
        setCameraError(
          'Camera access was denied or is not supported. Please use the Manual File Upload option.'
        );
      }
    }
    initDevices();
  }, []);

  // Initialize camera stream when selected device changes
  useEffect(() => {
    if (!selectedDeviceId) return;

    let activeStream: MediaStream | null = null;

    async function startCamera() {
      // Clean up previous stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: { exact: selectedDeviceId },
            // Request high-resolution for scan utility
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
        activeStream = stream;
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch((err) => console.error('Play error:', err));
        }
      } catch (err) {
        console.error('Error starting camera stream:', err);
        // Fallback without deviceId restriction if exact device fails
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          activeStream = stream;
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch((e) => console.error(e));
          }
        } catch (fallbackErr) {
          setCameraError('Unable to open camera feed.');
        }
      }
    }

    startCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [selectedDeviceId]);

  // Handle capture snapshot
  const handleCapture = () => {
    if (!videoRef.current) return;

    // Trigger visual flash
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 250);

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Draw frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      onPhotoCaptured(dataUrl);
    }
  };

  // Cycle through cameras
  const handleSwitchCamera = () => {
    if (devices.length <= 1) return;
    const currentIndex = devices.findIndex((d) => d.deviceId === selectedDeviceId);
    const nextIndex = (currentIndex + 1) % devices.length;
    setSelectedDeviceId(devices[nextIndex].deviceId);
  };

  // File Upload Handlers (for fallback or manual insert)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        onPhotoCaptured(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = () => {
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  return (
    <div id="camera-capture-container" className="flex flex-col h-full bg-slate-950 text-white rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
      <div className="flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-emerald-400" />
          <h3 className="font-medium text-sm md:text-base text-slate-100">Scan Document / Capture Image</h3>
        </div>
        <button
          id="close-capture-btn"
          onClick={onClose}
          className="px-3 py-1 text-xs text-slate-400 hover:text-white transition-colors hover:bg-slate-800 rounded-md"
        >
          Cancel
        </button>
      </div>

      <div className="relative flex-1 flex flex-col items-center justify-center p-4 min-h-[300px]">
        {/* Flash animation layer */}
        <AnimatePresence>
          {isFlashing && (
            <motion.div
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-0 bg-white z-50 pointer-events-none"
            />
          )}
        </AnimatePresence>

        {!cameraError ? (
          <div className="relative w-full max-w-lg aspect-[4/3] rounded-xl overflow-hidden bg-black shadow-lg border border-slate-800 flex items-center justify-center">
            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full h-full object-cover transform scale-x-[-1]"
            />
            
            {/* Real-time scanning UI guide/frame overlay */}
            <div className="absolute inset-4 border-2 border-dashed border-emerald-500/40 rounded-lg pointer-events-none flex items-center justify-center">
              <div className="text-[10px] text-emerald-400 bg-slate-950/80 px-2 py-1 rounded tracking-wide border border-emerald-500/20 shadow uppercase font-mono">
                Align document within frame
              </div>
            </div>
          </div>
        ) : (
          <div
            id="drag-drop-fallback"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`w-full max-w-md p-8 rounded-xl border-2 border-dashed flex flex-col items-center text-center justify-center transition-all ${
              isDragActive
                ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                : 'border-slate-800 bg-slate-900/50 hover:bg-slate-900/80 text-slate-400'
            }`}
          >
            <div className="p-4 bg-slate-900 rounded-full mb-4 border border-slate-800">
              <AlertCircle className="w-8 h-8 text-amber-500" />
            </div>
            <p className="font-medium text-slate-300 mb-2 text-sm">{cameraError}</p>
            <p className="text-xs text-slate-500 mb-6 max-w-xs leading-relaxed">
              Drag and drop your scanned paper photograph here, or click the button below to upload directly from your device.
            </p>
            <label className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg cursor-pointer transition shadow hover:shadow-emerald-900/30 text-sm font-semibold">
              <Upload className="w-4 h-4" />
              Choose Image File
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>
        )}

        {/* Manual upload helper when camera is working */}
        {!cameraError && (
          <div className="mt-4 flex items-center justify-between w-full max-w-lg px-2">
            <label className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>Or drag / upload file manually</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            {devices.length > 1 && (
              <button
                id="switch-cam-btn"
                onClick={handleSwitchCamera}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition hover:bg-slate-900 px-2 py-1 rounded"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Switch Camera</span>
              </button>
            )}
          </div>
        )}
      </div>

      {!cameraError && (
        <div className="p-6 bg-slate-900/80 border-t border-slate-800/60 flex justify-center items-center">
          <button
            id="snap-photo-btn"
            onClick={handleCapture}
            className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white flex items-center justify-center p-1 border-4 border-slate-950 focus:outline-none transition active:scale-95 shadow-lg shadow-emerald-500/20 group"
          >
            <div className="w-full h-full rounded-full border-2 border-white/40 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Camera className="w-6 h-6 text-white" />
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
