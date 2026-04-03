"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import CameraCapture from "./CameraCapture";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

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
  const [imageFile, setImageFile] = useState(null);

  // Prediction state
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictionResult, setPredictionResult] = useState(null);

  // Form state
  const [foodName, setFoodName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  /**
   * Send image to backend prediction API
   */
  const sendToPredictionAPI = async (file) => {
    setIsPredicting(true);
    setPredictionResult(null);
    setFoodName("");
    setError("");

    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/predict", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Prediction failed");
      }

      if (data.success && data.data) {
        setPredictionResult(data.data);
        const predictedFood = String(data.data.food || "");
        const isUnknown =
          predictedFood.trim().toLowerCase() === "unknown food" ||
          predictedFood.trim().toLowerCase() === "unknown_food";

        if (isUnknown) {
          setFoodName("");
          setError(
            "AI could not confidently detect this food. Please type the food name manually.",
          );
        } else {
          setFoodName(predictedFood);
        }
      }
    } catch (err) {
      console.warn("[FoodieCare] Prediction failed:", err.message);
      setError(`Prediction error: ${err.message}`);
    } finally {
      setIsPredicting(false);
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setImageFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target.result;
      setImageSrc(src);
      // Send to backend API
      sendToPredictionAPI(file);
    };
    reader.readAsDataURL(file);
  };

  const handleCameraCapture = (dataUrl) => {
    setError("");
    setImageSrc(dataUrl);

    // Convert data URL to File
    fetch(dataUrl)
      .then((res) => res.blob())
      .then((blob) => {
        const file = new File([blob], "camera-capture.png", {
          type: "image/png",
        });
        setImageFile(file);
        sendToPredictionAPI(file);
      })
      .catch((err) => {
        console.error("Camera capture conversion failed:", err);
        setError("Failed to process camera image");
      });
  };

  const clearImage = () => {
    setImageSrc(null);
    setImageFile(null);
    setFoodName("");
    setPredictionResult(null);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!foodName.trim()) {
      setError(
        "Please enter a food name — or wait for the prediction to finish.",
      );
      return;
    }

    const normalizedFoodName = foodName.trim().toLowerCase();
    if (
      normalizedFoodName === "unknown food" ||
      normalizedFoodName === "unknown_food"
    ) {
      setError(
        "Detection is uncertain. Please replace 'Unknown food' with a specific food name.",
      );
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("foodName", foodName.trim());

      if (predictionResult) {
        formData.append("confidence", String(predictionResult.confidence));
        formData.append(
          "nutrition",
          JSON.stringify(predictionResult.nutrition),
        );
      }

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        const msg = data?.error || "Analysis failed.";
        setError(msg);
        return;
      }

      // Fire-and-forget meal logging if user is signed in
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: authData } = await supabase.auth.getUser();
        if (authData.user) {
          void fetch("/api/meals", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              foodName: data.food,
              nutrition: {
                calories: data.calories,
                protein: data.protein,
                carbs: data.carbs,
                fat: data.fat,
              },
              goal: null,
              metadata: {
                confidence: predictionResult?.confidence ?? null,
              },
            }),
          });
        }
      } catch (err) {
        console.warn("Failed to log meal", err);
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

        {/* AI prediction processing indicator */}
        {isPredicting ? (
          <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
            <div>
              <p className="text-sm font-semibold text-blue-700">
                AI is analyzing your food...
              </p>
              <p className="text-xs text-blue-500">
                Running food detection model
              </p>
            </div>
          </div>
        ) : null}

        {/* Prediction result badge */}
        {!isPredicting && predictionResult ? (
          <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                  AI Predicted
                </p>
                <p className="mt-0.5 text-lg font-bold text-slate-900">
                  {predictionResult.food}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-white">
                {(predictionResult.confidence * 100).toFixed(1)}%
              </span>
            </div>

            {/* Top predictions */}
            {predictionResult.topPredictions &&
            predictionResult.topPredictions.length > 1 ? (
              <div className="space-y-2 border-t border-emerald-200 pt-3">
                <p className="text-xs font-semibold text-emerald-600">
                  Other possibilities:
                </p>
                <div className="flex flex-wrap gap-2">
                  {predictionResult.topPredictions
                    .slice(1, 3)
                    .map((pred, idx) => (
                      <span
                        key={idx}
                        className="rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-700"
                      >
                        {pred.label} ({(pred.confidence * 100).toFixed(0)}%)
                      </span>
                    ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Nutrition preview */}
        {predictionResult?.nutrition ? (
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-purple-200 bg-purple-50 p-4">
            <div className="text-center">
              <p className="text-xs font-semibold uppercase text-purple-600">
                Calories
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {Math.round(predictionResult.nutrition.calories || 0)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold uppercase text-purple-600">
                Protein
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {(predictionResult.nutrition.protein || 0).toFixed(1)}g
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold uppercase text-purple-600">
                Carbs
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {(predictionResult.nutrition.carbs || 0).toFixed(1)}g
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold uppercase text-purple-600">
                Fat
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {(predictionResult.nutrition.fat || 0).toFixed(1)}g
              </p>
            </div>
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
              {!isPredicting && predictionResult && foodName ? (
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
              <p className="text-sm font-semibold text-amber-800">Error</p>
              <p className="mt-0.5 text-xs text-amber-700">{error}</p>
            </div>
          ) : null}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading || isPredicting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-lg transition duration-200 hover:scale-[1.01] hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Analyzing nutrition...
              </>
            ) : isPredicting ? (
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
