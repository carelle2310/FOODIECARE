"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import CameraCapture from "./CameraCapture";

const SUGGESTIONS = [
  "pizza",
  "burger",
  "apple",
  "salad",
  "rice",
  "pasta",
  "sandwich",
];

export default function UploadForm() {
  const router = useRouter();
  const fileInputRef = useRef(null);

  // Input mode: 'camera' | 'upload'
  const [inputMode, setInputMode] = useState("camera");

  // Image state
  const [imageSrc, setImageSrc] = useState(null);

  // AI state
  const [isRunningAI, setIsRunningAI] = useState(false);
  const [aiLabel, setAiLabel] = useState(""); // raw MobileNet label
  const [confidence, setConfidence] = useState(null); // 0-100

  // Form state
  const [foodName, setFoodName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  /** Run MobileNet on a data-URL image and auto-fill food name + confidence */
  const runAIPrediction = async (src) => {
    setIsRunningAI(true);
    setFoodName("");
    setConfidence(null);
    setAiLabel("");
    try {
      // Dynamic import keeps TF.js out of the initial bundle
      const { classifyFood } = await import("../lib/aiRecognition");

      // Build a browser Image element to feed to MobileNet
      const img = new window.Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error("Image failed to load."));
        img.src = src;
      });

      const result = await classifyFood(img);
      if (result) {
        setAiLabel(result.rawLabel);
        setConfidence(result.confidence);
        if (result.food) setFoodName(result.food);
      }
    } catch (err) {
      // AI inference failing is non-fatal — user can still type the food name
      console.warn("[FoodieCare] AI recognition failed:", err.message);
    } finally {
      setIsRunningAI(false);
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target.result;
      setImageSrc(src);
      runAIPrediction(src);
    };
    reader.readAsDataURL(file);
  };

  const handleCameraCapture = (dataUrl) => {
    setError("");
    setImageSrc(dataUrl);
    runAIPrediction(dataUrl);
  };

  const clearImage = () => {
    setImageSrc(null);
    setFoodName("");
    setConfidence(null);
    setAiLabel("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!foodName.trim()) {
      setError(
        "Please enter a food name — or wait for the AI detection to finish.",
      );
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("foodName", foodName.trim());
      if (confidence !== null)
        formData.append("confidence", String(confidence));

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        const msg = data?.error || "Analysis failed.";
        const hint = data?.supportedFoods?.length
          ? ` Try: ${data.supportedFoods.join(", ")}.`
          : "";
        setError(msg + hint);
        return;
      }

      router.push(`/result?data=${encodeURIComponent(JSON.stringify(data))}`);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-3xl border border-white/70 bg-white/90 p-6 shadow-lg backdrop-blur-xl transition duration-300 hover:shadow-xl sm:max-w-none">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-emerald-200/50 blur-3xl" />
      <div className="pointer-events-none absolute -left-12 bottom-0 h-36 w-36 rounded-full bg-blue-200/40 blur-3xl" />

      <div className="relative space-y-5">
        {/* Header */}
        <div>
          <h2 className="font-heading text-2xl font-bold text-slate-900">
            Analyze Your Meal
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Capture or upload a food photo — AI will auto-detect and fill in the
            name.
          </p>
        </div>

        {/* Camera / Upload tab switcher */}
        <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
          {[
            ["camera", "📷  Camera"],
            ["upload", "📁  Upload File"],
          ].map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() => {
                setInputMode(mode);
                clearImage();
              }}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition duration-200 ${
                inputMode === mode
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Camera capture UI */}
        {inputMode === "camera" && !imageSrc ? (
          <CameraCapture onCapture={handleCameraCapture} />
        ) : null}

        {/* File upload UI */}
        {inputMode === "upload" && !imageSrc ? (
          <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-4 text-center transition duration-200 hover:border-emerald-400 hover:bg-emerald-50/30">
            <p className="text-sm font-semibold text-slate-700">
              + Upload Food Image
            </p>
            <p className="mt-0.5 text-xs text-slate-500">JPEG, PNG, WebP</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="mt-3 block w-full cursor-pointer rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-700 file:mr-2 file:rounded-md file:border-0 file:bg-emerald-500 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white transition hover:file:bg-emerald-600"
            />
          </div>
        ) : null}

        {/* Image preview with clear button */}
        {imageSrc ? (
          <div className="relative overflow-hidden rounded-xl border border-slate-200">
            <img
              src={imageSrc}
              alt="Food preview"
              className="h-44 w-full object-cover sm:h-52"
            />
            <button
              type="button"
              onClick={clearImage}
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-slate-900/70 text-xs font-bold text-white transition hover:bg-slate-900"
              aria-label="Remove image"
            >
              ✕
            </button>
          </div>
        ) : null}

        {/* AI processing indicator */}
        {isRunningAI ? (
          <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
            <div>
              <p className="text-sm font-semibold text-blue-700">
                AI is analyzing your food...
              </p>
              <p className="text-xs text-blue-500">
                Loading MobileNet model — first run may take 10–15 s
              </p>
            </div>
          </div>
        ) : null}

        {/* AI detection result badge */}
        {!isRunningAI && aiLabel ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                AI Detected
              </p>
              <p className="mt-0.5 text-sm text-slate-700">{aiLabel}</p>
            </div>
            {confidence !== null ? (
              <span className="shrink-0 rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-white">
                {confidence}% confidence
              </span>
            ) : null}
          </div>
        ) : null}

        {/* Food name + form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="foodName"
              className="flex items-center gap-2 text-sm font-medium text-slate-700"
            >
              Food name
              {!isRunningAI && foodName ? (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  auto-filled by AI
                </span>
              ) : null}
            </label>
            <input
              id="foodName"
              type="text"
              value={foodName}
              onChange={(e) => setFoodName(e.target.value)}
              placeholder="e.g. pizza, burger, salad..."
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          {/* Quick suggestion chips */}
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Quick suggestions
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFoodName(item)}
                  className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold capitalize text-blue-700 transition duration-200 hover:scale-105 hover:bg-blue-100"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* Error card */}
          {error ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-semibold text-amber-800">
                Food not recognized.
              </p>
              <p className="mt-0.5 text-xs text-amber-700">{error}</p>
            </div>
          ) : null}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading || isRunningAI}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-lg transition duration-200 hover:scale-[1.01] hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Analyzing nutrition...
              </>
            ) : isRunningAI ? (
              "AI processing — please wait..."
            ) : (
              "Analyze Nutrition"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
