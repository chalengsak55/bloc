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
      <div className="flex flex-col gap-4 animate-[fade-in_0.3s_ease-out]">
        <div className="text-center text-sm text-zinc-400">
          Generating your templates...
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]"
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
      <div className="grid grid-cols-2 gap-3">
        {templates.map((t) => {
          const active = selected === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelected(t.id)}
              className={`relative flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition-all duration-200 ${
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

              {/* Color swatch */}
              <div className="flex items-center gap-1.5">
                <span
                  className="h-3.5 w-3.5 rounded-full"
                  style={{ backgroundColor: t.colorScheme.primary }}
                />
                <span
                  className="h-3.5 w-3.5 rounded-full"
                  style={{ backgroundColor: t.colorScheme.secondary }}
                />
              </div>

              {/* Name */}
              <span className="text-sm font-semibold text-zinc-100">{t.name}</span>

              {/* Tagline */}
              <span className="text-xs text-zinc-400">{t.tagline}</span>

              {/* Bio preview */}
              <span className="line-clamp-2 text-xs leading-relaxed text-zinc-500">
                {t.bio}
              </span>
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
