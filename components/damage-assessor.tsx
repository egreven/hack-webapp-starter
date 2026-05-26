"use client";

import { useRef, useState } from "react";
import type { AssessmentResult } from "@/app/api/assess/route";

const DEMO_IMAGES = [
  {
    src: "/demo/image1.png",
    label: "Damaged packaging",
    hint: "Severe damage",
  },
  {
    src: "/demo/image3.png",
    label: "Table — missing parts",
    hint: "Structural issue",
  },
  {
    src: "/demo/image2.png",
    label: "Surface scratch",
    hint: "Minor damage",
  },
];

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const RESOLUTION_CONFIG: Record<
  AssessmentResult["resolution"],
  { label: string; color: string; bg: string; border: string; icon: string }
> = {
  full_refund: {
    label: "Full Refund",
    color: "text-red-400",
    bg: "bg-red-950/40",
    border: "border-red-800",
    icon: "💸",
  },
  full_replacement: {
    label: "Full Replacement",
    color: "text-orange-400",
    bg: "bg-orange-950/40",
    border: "border-orange-800",
    icon: "📦",
  },
  partial_replacement: {
    label: "Partial Replacement",
    color: "text-yellow-400",
    bg: "bg-yellow-950/30",
    border: "border-yellow-800",
    icon: "🔧",
  },
  coupon: {
    label: "Discount Coupon",
    color: "text-green-400",
    bg: "bg-green-950/30",
    border: "border-green-800",
    icon: "🎟️",
  },
};

const DAMAGE_LABEL: Record<AssessmentResult["damageType"], string> = {
  severe_damage: "Severe Damage",
  missing_parts: "Missing Parts",
  scratch: "Surface Scratch",
};

const SEVERITY_COLOR: Record<AssessmentResult["severity"], string> = {
  high: "text-red-400",
  medium: "text-yellow-400",
  low: "text-green-400",
};

export function DamageAssessor() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function assess(dataUrl: string) {
    setSelectedImage(dataUrl);
    setResult(null);
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl: dataUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Assessment failed");
      } else {
        setResult(data as AssessmentResult);
      }
    } catch {
      setError("Network error — is the server running?");
    } finally {
      setLoading(false);
    }
  }

  async function handleDemoClick(src: string) {
    const res = await fetch(src);
    const blob = await res.blob();
    const file = new File([blob], src.split("/").pop() ?? "image.png", { type: blob.type });
    const dataUrl = await fileToDataUrl(file);
    await assess(dataUrl);
  }

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    await assess(dataUrl);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const resConfig = result ? RESOLUTION_CONFIG[result.resolution] : null;

  return (
    <div className="flex min-h-full flex-col bg-black">
      <header className="border-b border-zinc-800 bg-black">
        <div className="mx-auto max-w-4xl px-4 py-5">
          <p className="text-xs font-medium uppercase tracking-wider text-[#FF5C28]">
            Wayfair · Damage Assessment
          </p>
          <h1 className="text-xl font-semibold tracking-tight text-white">
            Furniture Damage Assessor
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Upload a photo of damaged furniture to get an instant resolution recommendation.
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        {/* Demo images */}
        <section className="mb-8">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
            Try a demo case
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {DEMO_IMAGES.map((img) => (
              <button
                key={img.src}
                type="button"
                onClick={() => handleDemoClick(img.src)}
                disabled={loading}
                className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 transition hover:border-[#FF5C28] disabled:opacity-50"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.src}
                  alt={img.label}
                  className="h-36 w-full object-cover"
                />
                <div className="p-2 text-left">
                  <p className="text-xs font-medium text-zinc-200">{img.label}</p>
                  <p className="text-[11px] text-zinc-500">{img.hint}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Upload */}
        <div className="mb-8 flex items-center gap-3">
          <div className="h-px flex-1 bg-zinc-800" />
          <span className="text-xs text-zinc-600">or upload your own</span>
          <div className="h-px flex-1 bg-zinc-800" />
        </div>

        <div className="mb-8 flex justify-center">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="rounded-xl border border-dashed border-zinc-700 bg-zinc-950 px-8 py-4 text-sm text-zinc-400 transition hover:border-[#FF5C28] hover:text-[#FF5C28] disabled:opacity-50"
          >
            Click to upload an image
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center gap-3 py-12 text-zinc-400">
            <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-[#FF5C28]" />
            <span className="text-sm">Analyzing damage…</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="rounded-lg border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-400">
            {error}
          </p>
        )}

        {/* Result */}
        {result && resConfig && selectedImage && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden">
            <div className="grid grid-cols-1 gap-0 sm:grid-cols-2">
              {/* Image panel */}
              <div className="border-b border-zinc-800 sm:border-b-0 sm:border-r">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedImage}
                  alt="Assessed furniture"
                  className="h-64 w-full object-contain bg-zinc-900 sm:h-full sm:max-h-80"
                />
              </div>

              {/* Assessment panel */}
              <div className="p-6 flex flex-col gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-1">
                    Damage Type
                  </p>
                  <p className="text-lg font-semibold text-white">
                    {DAMAGE_LABEL[result.damageType]}
                  </p>
                  <p className={`text-sm font-medium capitalize ${SEVERITY_COLOR[result.severity]}`}>
                    {result.severity} severity
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-2">
                    Resolution
                  </p>
                  <div
                    className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 ${resConfig.bg} ${resConfig.border}`}
                  >
                    <span className="text-xl">{resConfig.icon}</span>
                    <span className={`text-base font-bold ${resConfig.color}`}>
                      {resConfig.label}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-1">
                    Assessment
                  </p>
                  <p className="text-sm text-zinc-300 leading-relaxed">
                    {result.explanation}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setResult(null);
                    setSelectedImage(null);
                    setError(null);
                  }}
                  className="mt-auto self-start rounded-lg border border-zinc-800 px-3 py-1.5 text-xs text-zinc-400 hover:border-[#FF5C28] hover:text-[#FF5C28] transition"
                >
                  Assess another
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
