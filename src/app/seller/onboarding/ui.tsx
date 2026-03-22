"use client";

import { useState, useCallback } from "react";
import { Input } from "@/components/ui/Input";

/* ── URL type detection ── */

type Platform = "instagram" | "tiktok" | "facebook" | "website";

function detectPlatform(url: string): Platform | null {
  try {
    const host = new URL(url).hostname.replace("www.", "");
    if (host.includes("instagram.com")) return "instagram";
    if (host.includes("tiktok.com")) return "tiktok";
    if (host.includes("facebook.com") || host.includes("fb.com")) return "facebook";
    return "website";
  } catch {
    return null;
  }
}

const platformLabels: Record<Platform, { emoji: string; label: string }> = {
  instagram: { emoji: "📸", label: "Instagram" },
  tiktok: { emoji: "🎵", label: "TikTok" },
  facebook: { emoji: "👤", label: "Facebook" },
  website: { emoji: "🌐", label: "Website" },
};

/* ── Vibe options ── */

const vibes = [
  { id: "chill", emoji: "🌿", label: "Chill & Friendly", desc: "Warm, approachable, relaxed" },
  { id: "professional", emoji: "💼", label: "Professional", desc: "Clean, trustworthy, polished" },
  { id: "bold", emoji: "⚡", label: "Bold & Edgy", desc: "High energy, standout, creative" },
  { id: "ai", emoji: "✨", label: "Let AI decide", desc: "We'll pick the best fit for you" },
] as const;

type VibeId = (typeof vibes)[number]["id"];

/* ── Component ── */

export function OnboardingFlow() {
  const [url, setUrl] = useState("");
  const [selectedVibe, setSelectedVibe] = useState<VibeId | null>(null);
  const [loading, setLoading] = useState(false);

  const platform = url.startsWith("http") ? detectPlatform(url) : null;
  const canSubmit = !!platform && !!selectedVibe && !loading;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/scrape?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "Scrape failed");
      // TODO: pass scraped data + vibe to Step 2/3
      console.log("Scraped:", data, "Vibe:", selectedVibe);
      alert(`Scrape OK! Next step coming soon.\n\nTitle: ${data.title ?? "—"}\nVibe: ${selectedVibe}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [canSubmit, url, selectedVibe]);

  return (
    <div className="flex flex-col gap-10 animate-[fade-in_0.3s_ease-out]">
      {/* ── URL Input ── */}
      <section>
        <label className="mb-3 block text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Your link
        </label>
        <div className="relative">
          <Input
            type="url"
            placeholder="Paste your Instagram, TikTok, or website URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            autoFocus
          />
          {platform && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-xs text-zinc-400">
              {platformLabels[platform].emoji} {platformLabels[platform].label}
            </span>
          )}
        </div>
      </section>

      {/* ── Vibe Picker ── */}
      <section>
        <label className="mb-3 block text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Pick your vibe
        </label>
        <div className="grid grid-cols-2 gap-3">
          {vibes.map((v) => {
            const active = selectedVibe === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelectedVibe(v.id)}
                className={`relative flex flex-col items-start gap-1 rounded-2xl border p-4 text-left transition-all duration-200 ${
                  active
                    ? "border-transparent bg-white/[0.06]"
                    : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"
                }`}
              >
                {/* gradient border when active */}
                {active && (
                  <span
                    className="pointer-events-none absolute inset-0 rounded-2xl"
                    style={{
                      padding: "1px",
                      background: "linear-gradient(135deg, #7c5ce8, #4d9ef5, #00d4c8)",
                      WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                      WebkitMaskComposite: "xor",
                      maskComposite: "exclude",
                    }}
                  />
                )}
                <span className="text-xl">{v.emoji}</span>
                <span className="text-sm font-semibold text-zinc-100">{v.label}</span>
                <span className="text-xs leading-snug text-zinc-500">{v.desc}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── CTA ── */}
      <button
        type="button"
        disabled={!canSubmit}
        onClick={handleSubmit}
        className="relative w-full overflow-hidden rounded-2xl py-3.5 text-sm font-semibold text-white shadow-lg transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
        style={{
          background: canSubmit
            ? "linear-gradient(135deg, #7c5ce8, #4d9ef5, #00d4c8)"
            : "rgba(255,255,255,0.06)",
        }}
      >
        {loading ? "Generating…" : "Generate my storefront →"}
      </button>
    </div>
  );
}
