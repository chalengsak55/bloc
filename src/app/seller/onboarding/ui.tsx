"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
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

/* ── Categories ── */

const categories = ["Hair", "Food", "Home", "Moving", "Tech", "Barber", "Other"] as const;

/* ── Input mode ── */

type InputMode = "url" | "manual";

/* ── Component ── */

export function OnboardingFlow() {
  const router = useRouter();
  const [mode, setMode] = useState<InputMode>("url");
  const [url, setUrl] = useState("");
  const [manual, setManual] = useState({ name: "", category: "", location: "", description: "" });
  const [selectedVibe, setSelectedVibe] = useState<VibeId | null>(null);
  const [loading, setLoading] = useState(false);

  const platform = url.startsWith("http") ? detectPlatform(url) : null;

  const urlReady = mode === "url" && !!platform;
  const manualReady =
    mode === "manual" &&
    manual.name.trim().length >= 2 &&
    !!manual.category &&
    manual.location.trim().length >= 2;
  const canSubmit = (urlReady || manualReady) && !!selectedVibe && !loading;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      if (mode === "url") {
        const res = await fetch(`/api/scrape?url=${encodeURIComponent(url)}`);
        const data = await res.json();
        if (!data.ok) throw new Error(data.error ?? "Scrape failed");
        sessionStorage.setItem(
          "onboarding",
          JSON.stringify({ scrapedData: data, vibe: selectedVibe }),
        );
      } else {
        sessionStorage.setItem(
          "onboarding",
          JSON.stringify({ manualData: manual, vibe: selectedVibe }),
        );
      }
      router.push("/seller/onboarding/step2");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }, [canSubmit, mode, url, manual, selectedVibe, router]);

  return (
    <div className="flex flex-col gap-10 animate-[fade-in_0.3s_ease-out]">
      {/* ── URL or Manual Input ── */}
      <section>
        {mode === "url" ? (
          <>
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
            <button
              type="button"
              onClick={() => setMode("manual")}
              className="mt-3 text-xs font-semibold text-zinc-300 transition hover:text-white"
            >
              No website or social media? Fill in manually &rarr;
            </button>
          </>
        ) : (
          <>
            <label className="mb-3 block text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Tell us about your business
            </label>
            <div className="flex flex-col gap-3">
              <Input
                type="text"
                placeholder="Business name"
                value={manual.name}
                onChange={(e) => setManual((m) => ({ ...m, name: e.target.value }))}
                autoFocus
              />
              <select
                value={manual.category}
                onChange={(e) => setManual((m) => ({ ...m, category: e.target.value }))}
                className="h-12 w-full appearance-none rounded-2xl border border-white/10 bg-black/30 px-4 text-sm text-zinc-100 outline-none ring-1 ring-transparent transition focus:border-white/20 focus:ring-fuchsia-400/20"
              >
                <option value="" disabled className="bg-[#0d0d12] text-zinc-500">
                  Category
                </option>
                {categories.map((c) => (
                  <option key={c} value={c.toLowerCase()} className="bg-[#0d0d12]">
                    {c}
                  </option>
                ))}
              </select>
              <Input
                type="text"
                placeholder="City / neighborhood"
                value={manual.location}
                onChange={(e) => setManual((m) => ({ ...m, location: e.target.value }))}
              />
              <textarea
                placeholder="Short description of what you do"
                value={manual.description}
                onChange={(e) => setManual((m) => ({ ...m, description: e.target.value }))}
                rows={3}
                className="w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-transparent transition focus:border-white/20 focus:ring-fuchsia-400/20"
              />
            </div>
            <button
              type="button"
              onClick={() => setMode("url")}
              className="mt-3 text-xs text-zinc-500 transition hover:text-zinc-300"
            >
              &larr; I have a link instead
            </button>
          </>
        )}
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
