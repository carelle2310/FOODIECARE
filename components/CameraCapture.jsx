"use client";

import { useRef, useState, useEffect } from "react";

/**
 * CameraCapture — opens the device camera, lets the user take a photo,
 * crops it to a square (224×224 for MobileNet), and passes the data-URL
 * to the parent via `onCapture(dataUrl)`.
 */
export default function CameraCapture({ onCapture }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [isOpen, setIsOpen] = useState(false);
  const [hasCaptured, setHasCaptured] = useState(false);
  const [capturedSrc, setCapturedSrc] = useState(null);
  const [cameraError, setCameraError] = useState("");

  // Stop all camera tracks when the component unmounts
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    setCameraError("");
    if (!navigator?.mediaDevices?.getUserMedia) {
      setCameraError(
        "Camera API not supported in this browser. Please use the Upload File option instead.",
      );
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });
      streamRef.current = stream;
      setIsOpen(true);
      // Attach stream to video after state update
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 50);
    } catch (err) {
      if (
        err.name === "NotAllowedError" ||
        err.name === "PermissionDeniedError"
      ) {
        setCameraError(
          "Camera permission denied. Please allow camera access in your browser settings and try again.",
        );
      } else if (err.name === "NotFoundError") {
        setCameraError(
          "No camera detected on this device. Use the Upload File tab instead.",
        );
      } else {
        setCameraError(
          "Could not start camera. Try using the Upload File option.",
        );
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsOpen(false);
    setHasCaptured(false);
    setCapturedSrc(null);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    // Crop to center square then resize to 224×224 (MobileNet input size)
    const size = Math.min(video.videoWidth, video.videoHeight);
    const sx = (video.videoWidth - size) / 2;
    const sy = (video.videoHeight - size) / 2;
    canvas.width = 224;
    canvas.height = 224;
    canvas
      .getContext("2d")
      .drawImage(video, sx, sy, size, size, 0, 0, 224, 224);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setCapturedSrc(dataUrl);
    setHasCaptured(true);
  };

  const confirmPhoto = () => {
    if (capturedSrc) {
      onCapture(capturedSrc);
      stopCamera();
    }
  };

  if (!isOpen) {
    return (
      <div className="space-y-2">
        <button
          type="button"
          onClick={startCamera}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 px-4 py-4 text-sm font-semibold text-blue-700 transition duration-200 hover:border-blue-400 hover:bg-blue-100"
        >
          <span className="text-xl">📷</span>
          Open Camera
        </button>

        {cameraError ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            {cameraError}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {!hasCaptured ? (
        <div
          className="relative overflow-hidden rounded-xl bg-black"
          style={{ aspectRatio: "4/3" }}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-4 px-4">
            <button
              type="button"
              onClick={stopCamera}
              className="rounded-full bg-slate-900/70 px-4 py-2 text-xs font-semibold text-white backdrop-blur transition hover:bg-slate-900"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={capturePhoto}
              className="inline-flex h-14 w-14 items-center justify-center rounded-full border-4 border-white bg-white/10 text-2xl shadow-xl backdrop-blur transition duration-200 hover:scale-110 hover:bg-white/20"
              aria-label="Capture photo"
            >
              📸
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <img
              src={capturedSrc}
              alt="Captured food"
              className="h-52 w-full object-cover"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setHasCaptured(false);
                setCapturedSrc(null);
              }}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Retake
            </button>
            <button
              type="button"
              onClick={confirmPhoto}
              className="flex-1 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition duration-200 hover:bg-emerald-600"
            >
              Use This Photo
            </button>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
