"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

/* ── Types ── */

interface Template {
  id: string;
  name: string;
  tagline: string;
  bio: string;
  services: string[];
  colorScheme: { primary: string; secondary: string };
  style: string;
}

/* ── Component ── */

export function TemplatePicker() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("onboarding");
    if (!raw) {
      setError("No onboarding data found. Please start from step 1.");
      setLoading(false);
      return;
    }

    const data = JSON.parse(raw);

    fetch("/api/generate-storefront", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
      .then((res) => res.json())
      .then((json) => {
        if (!json.ok) throw new Error(json.error ?? "Generation failed");
        setTemplates(json.templates);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Something went wrong"))
      .finally(() => setLoading(false));
  }, []);

  const canContinue = !!selected;

  const handleContinue = useCallback(() => {
    if (!selected) return;
    const template = templates.find((t) => t.id === selected);
    sessionStorage.setItem("selectedTemplate", JSON.stringify(template));
    // TODO: navigate to Step 3
    alert(`Template "${template?.name}" selected! Step 3 coming soon.`);
  }, [selected, templates]);

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex flex-col gap-6 animate-[fade-in_0.3s_ease-out]">
        <div className="flex items-center justify-center gap-3">
          <span className="h-2 w-2 animate-pulse rounded-full bg-purple-400" />
          <span className="text-sm text-zinc-400">Generating your templates...</span>
          <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" style={{ animationDelay: "0.3s" }} />
        </div>
        <div className="flex flex-col gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]"
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>
      </div>
    );
  }

  /* ── Error ── */
  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 animate-[fade-in_0.3s_ease-out]">
        <p className="text-sm text-red-400">{error}</p>
        <button
          type="button"
          onClick={() => router.push("/seller/onboarding")}
          className="text-xs font-semibold text-zinc-300 transition hover:text-white"
        >
          &larr; Back to step 1
        </button>
      </div>
    );
  }

  /* ── Template cards ── */
  return (
    <div className="flex flex-col gap-8 animate-[fade-in_0.3s_ease-out]">
      <div className="flex flex-col gap-4">
        {templates.map((t, i) => {
          const active = selected === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelected(t.id)}
              className={`group relative overflow-hidden rounded-2xl border p-5 text-left transition-all duration-300 ${
                active
                  ? "border-transparent bg-white/[0.08] scale-[1.02] shadow-[0_0_30px_-5px_rgba(124,92,232,0.3)]"
                  : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05] hover:border-white/15"
              }`}
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              {/* gradient border when active */}
              {active && (
                <span
                  className="pointer-events-none absolute inset-0 rounded-2xl"
                  style={{
                    padding: "1.5px",
                    background: "linear-gradient(135deg, #7c5ce8, #4d9ef5, #00d4c8)",
                    WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                    WebkitMaskComposite: "xor",
                    maskComposite: "exclude",
                  }}
                />
              )}

              {/* Color accent bar at top */}
              <div
                className="absolute left-0 top-0 h-1 w-full opacity-60 transition-opacity group-hover:opacity-100"
                style={{
                  background: `linear-gradient(90deg, ${t.colorScheme.primary}, ${t.colorScheme.secondary})`,
                }}
              />

              <div className="flex items-start gap-4 pt-1">
                {/* Color swatch */}
                <div className="flex flex-col gap-1.5 pt-0.5">
                  <span
                    className="h-5 w-5 rounded-lg shadow-lg"
                    style={{
                      backgroundColor: t.colorScheme.primary,
                      boxShadow: `0 0 12px ${t.colorScheme.primary}40`,
                    }}
                  />
                  <span
                    className="h-5 w-5 rounded-lg shadow-lg"
                    style={{
                      backgroundColor: t.colorScheme.secondary,
                      boxShadow: `0 0 12px ${t.colorScheme.secondary}40`,
                    }}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-semibold text-zinc-100">{t.name}</span>
                    {active && (
                      <span className="rounded-full bg-gradient-to-r from-purple-500/20 to-cyan-500/20 px-2 py-0.5 text-[10px] font-medium text-cyan-300">
                        Selected
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[13px] leading-snug text-zinc-400">{t.tagline}</p>
                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-zinc-500">{t.bio}</p>

                  {/* Services pills */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {t.services.slice(0, 3).map((s) => (
                      <span
                        key={s}
                        className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-medium text-zinc-400"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* CTA */}
      <button
        type="button"
        disabled={!canContinue}
        onClick={handleContinue}
        className="relative w-full overflow-hidden rounded-2xl py-3.5 text-sm font-semibold text-white shadow-lg transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
        style={{
          background: canContinue
            ? "linear-gradient(135deg, #7c5ce8, #4d9ef5, #00d4c8)"
            : "rgba(255,255,255,0.06)",
        }}
      >
        Continue with this &rarr;
      </button>
    </div>
  );
}
