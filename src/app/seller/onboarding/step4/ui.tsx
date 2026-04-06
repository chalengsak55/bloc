"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { THEMES, THEME_IDS, getTheme } from "@/lib/storefront-config";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function dataUrlToFile(dataUrl: string, fileName: string, mimeType: string): File {
  const arr = dataUrl.split(",");
  const bstr = atob(arr[1]);
  const n = bstr.length;
  const u8arr = new Uint8Array(n);
  for (let i = 0; i < n; i++) u8arr[i] = bstr.charCodeAt(i);
  return new File([u8arr], fileName, { type: mimeType });
}

// ─── Theme Card ──────────────────────────────────────────────────────────────

function ThemeCard({
  themeId,
  selected,
  onSelect,
}: {
  themeId: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const theme = getTheme(themeId);
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative overflow-hidden rounded-2xl border-2 transition-all ${
        selected ? "scale-[1.02] shadow-lg" : "opacity-70 hover:opacity-100"
      }`}
      style={{
        borderColor: selected ? theme.colors.accent : "rgba(255,255,255,0.06)",
        aspectRatio: "3/4",
      }}
    >
      {/* Gradient background */}
      <div className="absolute inset-0" style={{ background: theme.colors.backgroundGradient }} />

      {/* Accent glow at bottom */}
      <div
        className="absolute inset-x-0 bottom-0 h-1/2"
        style={{ background: `linear-gradient(to top, ${theme.colors.accent}15, transparent)` }}
      />

      {/* Sparkle indicator */}
      {theme.sparkles && (
        <div className="absolute right-2 top-2 text-[10px]">✨</div>
      )}

      {/* Theme name */}
      <div className="absolute inset-x-0 bottom-0 px-2 pb-2">
        <p className="text-[11px] font-semibold" style={{ color: theme.colors.text }}>
          {theme.name}
        </p>
      </div>

      {/* Selected checkmark */}
      {selected && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full"
            style={{ background: theme.colors.accent }}
          >
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
      )}
    </button>
  );
}

// ─── Live Preview ────────────────────────────────────────────────────────────

function LivePreview({ themeId, sellerName }: { themeId: string; sellerName: string }) {
  const theme = getTheme(themeId);
  return (
    <div
      className="relative overflow-hidden rounded-2xl border"
      style={{
        borderColor: `${theme.colors.accent}30`,
        background: theme.colors.backgroundGradient,
        height: 200,
      }}
    >
      {/* Sparkles preview */}
      {theme.sparkles && (
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(8)].map((_, i) => (
            <span
              key={i}
              className="absolute animate-pulse rounded-full"
              style={{
                left: `${10 + i * 12}%`,
                top: `${20 + (i % 3) * 25}%`,
                width: 2,
                height: 2,
                background: theme.colors.accent,
                animationDelay: `${i * 0.4}s`,
                opacity: 0.5,
              }}
            />
          ))}
        </div>
      )}

      {/* Content */}
      <div className="absolute inset-x-0 bottom-0 p-5">
        {/* Availability pill */}
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold"
          style={{ background: `${theme.colors.accent}20`, color: theme.colors.accent }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: theme.colors.accent }} />
          AVAILABLE
        </span>

        {/* Name */}
        <h2
          className="mt-2 text-2xl font-bold leading-tight"
          style={{ fontFamily: "'Instrument Serif', Georgia, serif", color: theme.colors.text }}
        >
          {sellerName || "Your Business"}
        </h2>
        <p className="mt-1 text-[11px]" style={{ color: theme.colors.textMuted }}>
          Your category · Your location
        </p>
      </div>

      {/* Mini Ask button */}
      <div className="absolute bottom-4 right-4">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full shadow-lg"
          style={{ background: theme.colors.accent, boxShadow: `0 4px 16px ${theme.colors.accent}40` }}
        >
          <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function ThemeSelector() {
  const router = useRouter();
  const [onboardingData, setOnboardingData] = useState<Record<string, unknown> | null>(null);
  const [selectedTheme, setSelectedTheme] = useState("warm_cozy");
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load sessionStorage
  useEffect(() => {
    const raw = sessionStorage.getItem("onboarding");
    if (!raw) {
      router.replace("/seller/onboarding");
      return;
    }
    try {
      const data = JSON.parse(raw);
      setOnboardingData(data);
      // Restore previously selected theme if any
      if (data.themeId && data.themeId in THEMES) {
        setSelectedTheme(data.themeId);
      }
    } catch {
      router.replace("/seller/onboarding");
    }
  }, [router]);

  // Get seller name for preview
  const sellerName = (() => {
    if (!onboardingData) return "";
    const reviewed = onboardingData.reviewedData as Record<string, string> | undefined;
    const manual = onboardingData.manualData as Record<string, string> | undefined;
    const scraped = onboardingData.scrapedData as Record<string, string> | undefined;
    return reviewed?.name || manual?.name || scraped?.title || "";
  })();

  // Publish
  const handlePublish = useCallback(async () => {
    if (!onboardingData || publishing) return;
    setPublishing(true);
    setError(null);

    try {
      // Save theme to data
      const dataWithTheme = { ...onboardingData, themeId: selectedTheme };

      const formData = new FormData();
      formData.append("data", JSON.stringify(dataWithTheme));

      // Reconstruct cover file from dataURL if present
      const coverDataUrl = onboardingData.coverDataUrl as string | null;
      const coverFileName = (onboardingData.coverFileName as string) || "cover.jpg";
      const coverFileType = (onboardingData.coverFileType as string) || "image/jpeg";
      if (coverDataUrl) {
        const coverFile = dataUrlToFile(coverDataUrl, coverFileName, coverFileType);
        formData.append("cover", coverFile);
      }

      const res = await fetch("/api/seller/publish", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Publish failed");

      sessionStorage.removeItem("onboarding");
      router.push("/seller/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setPublishing(false);
    }
  }, [onboardingData, selectedTheme, publishing, router]);

  if (!onboardingData) return null;

  return (
    <div className="flex flex-col gap-8 animate-[fade-in_0.3s_ease-out]">
      {/* ── Theme grid (3x3) ── */}
      <div className="grid grid-cols-3 gap-3">
        {THEME_IDS.map((id) => (
          <ThemeCard
            key={id}
            themeId={id}
            selected={selectedTheme === id}
            onSelect={() => setSelectedTheme(id)}
          />
        ))}
      </div>

      {/* ── Live preview ── */}
      <section>
        <label className="mb-3 block text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Preview
        </label>
        <LivePreview themeId={selectedTheme} sellerName={sellerName} />
      </section>

      {/* ── Error ── */}
      {error && <p className="text-sm text-red-400">{error}</p>}

      {/* ── Publish + Back ── */}
      <div className="flex flex-col gap-3">
        <button
          type="button"
          disabled={publishing}
          onClick={handlePublish}
          className="relative w-full overflow-hidden rounded-2xl py-3.5 text-sm font-semibold text-white shadow-lg transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          style={{
            background: `linear-gradient(135deg, ${getTheme(selectedTheme).colors.accent}, ${getTheme(selectedTheme).colors.accent}cc)`,
          }}
        >
          {publishing ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Publishing…
            </span>
          ) : (
            "Publish my storefront →"
          )}
        </button>
        <button
          type="button"
          onClick={() => router.push("/seller/onboarding/step3")}
          className="text-xs text-zinc-500 transition hover:text-zinc-300"
        >
          &larr; Back to cover
        </button>
      </div>
    </div>
  );
}
