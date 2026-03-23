"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";

/* ── Categories (same as Step 1) ── */

const categories = ["Hair", "Food", "Home", "Moving", "Tech", "Barber", "Other"] as const;

/* ── CTA types ── */

const ctaTypes = [
  { id: "book", label: "Book an appointment", emoji: "📅" },
  { id: "order", label: "Place an order", emoji: "🛒" },
  { id: "quote", label: "Get a quote", emoji: "💬" },
] as const;

type CtaId = (typeof ctaTypes)[number]["id"];

/* ── Auto-assign CTA from category ── */

const ctaByCategory: Record<string, CtaId> = {
  food: "order",
  restaurant: "order",
  retail: "order",
  beauty: "book",
  wellness: "book",
  fitness: "book",
  hair: "book",
  massage: "book",
  barber: "book",
  home: "quote",
  home_services: "quote",
  cleaning: "quote",
  repair: "quote",
  freelance: "quote",
  creative: "quote",
  moving: "quote",
  tech: "quote",
};

/* ── Component ── */

export function ReviewForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [ctaType, setCtaType] = useState<CtaId | null>(null);
  const [ready, setReady] = useState(false);

  /* ── Load from sessionStorage on mount ── */
  useEffect(() => {
    const raw = sessionStorage.getItem("onboarding");
    if (!raw) {
      router.replace("/seller/onboarding");
      return;
    }

    try {
      const data = JSON.parse(raw);
      let cat = "";

      if (data.manualData) {
        setName(data.manualData.name ?? "");
        cat = (data.manualData.category ?? "").toLowerCase().trim();
        setCategory(cat);
        setLocation(data.manualData.location ?? "");
        setDescription(data.manualData.description ?? "");
      } else if (data.scrapedData) {
        setName(data.scrapedData.title ?? "");
        cat = (data.scrapedData.category ?? "").toLowerCase().trim();
        setCategory(cat);
        setLocation(data.scrapedData.location ?? "");
        setDescription(data.scrapedData.description ?? "");
      }

      // Auto-assign CTA from category
      setCtaType(ctaByCategory[cat] ?? "quote");

      setReady(true);
    } catch {
      router.replace("/seller/onboarding");
    }
  }, [router]);

  // Update CTA when category changes
  useEffect(() => {
    if (category) setCtaType(ctaByCategory[category] ?? "quote");
  }, [category]);

  const canSubmit =
    name.trim().length >= 2 &&
    !!category &&
    location.trim().length >= 2;

  const handleContinue = useCallback(() => {
    if (!canSubmit) return;

    const existing = JSON.parse(sessionStorage.getItem("onboarding") ?? "{}");
    sessionStorage.setItem(
      "onboarding",
      JSON.stringify({
        ...existing,
        reviewedData: { name, category, location, description, ctaType },
      }),
    );

    router.push("/seller/onboarding/step3");
  }, [canSubmit, name, category, location, description, ctaType, router]);

  if (!ready) return null;

  return (
    <div className="flex flex-col gap-10 animate-[fade-in_0.3s_ease-out]">
      {/* ── Editable fields ── */}
      <section>
        <label className="mb-3 block text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Your business
        </label>
        <div className="flex flex-col gap-3">
          <Input
            type="text"
            placeholder="Business name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
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
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <textarea
            placeholder="Short bio or description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-transparent transition focus:border-white/20 focus:ring-fuchsia-400/20"
          />
        </div>
      </section>

      {/* ── CTA type picker ── */}
      <section>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-zinc-500">
          What should customers do?
        </label>
        <p className="mb-3 text-xs text-zinc-600">Auto-selected from your category. You can change it.</p>
        <div className="flex flex-col gap-2">
          {ctaTypes.map((cta) => {
            const active = ctaType === cta.id;
            return (
              <button
                key={cta.id}
                type="button"
                onClick={() => setCtaType(cta.id)}
                className={`relative flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition-all duration-200 ${
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
                <span className="text-lg">{cta.emoji}</span>
                <span className="text-sm font-semibold text-zinc-100">{cta.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Back + CTA ── */}
      <div className="flex flex-col gap-3">
        <button
          type="button"
          disabled={!canSubmit}
          onClick={handleContinue}
          className="relative w-full overflow-hidden rounded-2xl py-3.5 text-sm font-semibold text-white shadow-lg transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
          style={{
            background: canSubmit
              ? "linear-gradient(135deg, #7c5ce8, #4d9ef5, #00d4c8)"
              : "rgba(255,255,255,0.06)",
          }}
        >
          Continue &rarr;
        </button>
        <button
          type="button"
          onClick={() => router.push("/seller/onboarding")}
          className="text-xs text-zinc-500 transition hover:text-zinc-300"
        >
          &larr; Back to step 1
        </button>
      </div>
    </div>
  );
}
