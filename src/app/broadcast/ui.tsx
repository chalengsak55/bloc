"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { TabBar } from "@/components/TabBar";

const PENDING_KEY = "bloc_pending_sentence";

const PLACEHOLDER_EXAMPLES = [
  "Looking for a DJ for Saturday night — budget $300",
  "Need a barber open late tonight near SoMa",
  "Private chef for dinner party · 8 guests · tonight",
  "Moving from Daly City to SF — need help tomorrow",
];

const SUGGESTION_PILLS = [
  { emoji: "🎵", label: "DJ for Saturday", color: "#7c5ce8" },
  { emoji: "✂️", label: "Barber tonight", color: "#f472b6" },
  { emoji: "👨‍🍳", label: "Private chef", color: "#f59e0b" },
  { emoji: "📦", label: "Moving help", color: "#00d4c8" },
];

// ─── Typewriter ──────────────────────────────────────────────────────────────

function useTypewriter(examples: string[], speed = 50, pause = 2000) {
  const [text, setText] = useState("");
  const [idx, setIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = examples[idx % examples.length];
    const timer = setTimeout(() => {
      if (!deleting) {
        if (charIdx < current.length) {
          setText(current.slice(0, charIdx + 1));
          setCharIdx((c) => c + 1);
        } else {
          setTimeout(() => setDeleting(true), pause);
        }
      } else {
        if (charIdx > 0) {
          setText(current.slice(0, charIdx - 1));
          setCharIdx((c) => c - 1);
        } else {
          setDeleting(false);
          setIdx((i) => (i + 1) % examples.length);
        }
      }
    }, deleting ? speed / 2 : speed);
    return () => clearTimeout(timer);
  }, [charIdx, deleting, idx, examples, speed, pause]);

  return text;
}

// ─── Main ────────────────────────────────────────────────────────────────────

export function BroadcastComposer() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [sentence, setSentence] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const posRef = useRef<{ lat: number; lng: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const placeholder = useTypewriter(PLACEHOLDER_EXAMPLES);

  // Geolocation
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => { posRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude }; },
      () => {},
      { timeout: 10_000 },
    );
  }, []);

  // Restore draft / auto-submit
  useEffect(() => {
    async function init() {
      try {
        const draft = searchParams.get("draft");
        if (draft) { setSentence(draft); return; }
        const pending = localStorage.getItem(PENDING_KEY);
        if (pending) setSentence(pending);
        const { data: { user } } = await supabase.auth.getUser();
        if (user && pending && pending.trim().length >= 3) {
          setBusy(true);
          await submitRequest(user.id, pending.trim());
        }
      } catch { setBusy(false); }
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Particle canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animId: number;
    const particles: { x: number; y: number; vx: number; vy: number; r: number; color: string }[] = [];
    const colors = ["#7c5ce8", "#4d9ef5", "#00d4c8", "#f472b6"];

    function resize() {
      canvas!.width = canvas!.offsetWidth * 2;
      canvas!.height = canvas!.offsetHeight * 2;
    }
    resize();

    for (let i = 0; i < 30; i++) {
      particles.push({
        x: Math.random() * canvas.width, y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
        r: 1 + Math.random() * 2,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    function draw() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > canvas!.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas!.height) p.vy *= -1;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fillStyle = p.color + "30";
        ctx!.fill();
      }
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx!.beginPath();
            ctx!.moveTo(particles[i].x, particles[i].y);
            ctx!.lineTo(particles[j].x, particles[j].y);
            ctx!.strokeStyle = `rgba(124,92,232,${0.04 * (1 - dist / 120)})`;
            ctx!.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    }
    draw();
    window.addEventListener("resize", resize);
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);

  async function submitRequest(userId: string, text: string) {
    const pos = posRef.current;
    const { data, error: insertErr } = await supabase
      .from("requests")
      .insert({
        sentence: text,
        buyer_id: userId,
        ...(pos ? { lat: pos.lat, lng: pos.lng } : {}),
      })
      .select("id")
      .single();
    if (insertErr) throw insertErr;
    try { localStorage.removeItem(PENDING_KEY); } catch { /* ignore */ }
    router.push(`/broadcast/${data.id}`);
  }

  async function handleBroadcast() {
    if (sentence.trim().length < 3) return;
    setBusy(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        try { localStorage.setItem(PENDING_KEY, sentence.trim()); } catch { /* ignore */ }
        setToast("Saving your request... Sign in to send it.");
        await new Promise((r) => setTimeout(r, 1500));
        router.push("/auth?redirect=/broadcast");
        return;
      }
      await submitRequest(user.id, sentence.trim());
    } catch {
      setError("Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  return (
    <>
    <main className="relative flex min-h-screen flex-col items-center overflow-hidden pb-24" style={{ background: "#0d0d12" }}>

      {/* Particle canvas */}
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" style={{ opacity: 0.5 }} />

      <div className="relative z-10 w-full max-w-[420px] px-5 pt-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <span
            className="text-2xl font-bold tracking-tight"
            style={{
              fontFamily: "var(--font-instrument-serif), Georgia, serif",
              background: "linear-gradient(135deg, #7c5ce8, #4d9ef5, #00d4c8)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Bloc.
          </span>
          <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium text-emerald-400">
            <span className="relative inline-flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            14 active now
          </span>
        </div>

        {/* ── Hero ── */}
        <div className="mt-12 flex flex-col items-center text-center">
          {/* ⚡ Orb with pulse */}
          <div className="relative mb-6">
            <div
              className="absolute inset-0 animate-ping rounded-full opacity-20"
              style={{ background: "linear-gradient(135deg, #7c5ce8, #4d9ef5)", animationDuration: "3s" }}
            />
            <div
              className="relative flex h-20 w-20 items-center justify-center rounded-full"
              style={{ background: "linear-gradient(135deg, rgba(124,92,232,0.4), rgba(77,158,245,0.3))", backdropFilter: "blur(8px)" }}
            >
              <span className="text-4xl">⚡</span>
            </div>
          </div>

          <h1 className="text-[26px] font-bold leading-tight text-white">
            Say what you need.
          </h1>
          <h2 className="text-[26px] font-bold leading-tight" style={{ color: "#22c55e" }}>
            Agents find it for you.
          </h2>
          <p className="mt-3 text-[13px] text-zinc-500">
            The right people find you.
          </p>
        </div>

        {/* ── Input ── */}
        <div className="mt-10">
          <div
            className="relative overflow-hidden rounded-2xl border"
            style={{
              borderColor: sentence ? "rgba(124,92,232,0.5)" : "rgba(124,92,232,0.25)",
              boxShadow: sentence ? "0 0 24px rgba(124,92,232,0.15)" : "0 0 12px rgba(124,92,232,0.06)",
            }}
          >
            <textarea
              value={sentence}
              onChange={(e) => setSentence(e.target.value)}
              placeholder={placeholder}
              rows={3}
              disabled={busy}
              className="w-full resize-none bg-white/[0.03] px-4 py-4 text-[14px] text-zinc-100 placeholder-zinc-600 outline-none disabled:opacity-50"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleBroadcast();
              }}
            />
            <button
              type="button"
              className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-zinc-500 transition hover:bg-white/[0.1]"
            >
              🎙️
            </button>
          </div>
        </div>

        {/* ── Suggestion pills ── */}
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {SUGGESTION_PILLS.map((pill) => (
            <button
              key={pill.label}
              type="button"
              onClick={() => setSentence(pill.label)}
              className="rounded-full bg-white/[0.03] px-3 py-1.5 text-[12px] transition hover:bg-white/[0.06]"
              style={{ border: `1px solid ${pill.color}30`, color: pill.color }}
            >
              {pill.emoji} {pill.label}
            </button>
          ))}
        </div>

        {/* ── CTA ── */}
        <button
          onClick={handleBroadcast}
          disabled={busy || sentence.trim().length < 3}
          className="mt-6 w-full overflow-hidden rounded-2xl py-4 text-[15px] font-bold text-white transition-opacity disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, #7c5ce8, #4d9ef5, #00d4c8)" }}
        >
          {busy ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Broadcasting...
            </span>
          ) : (
            "⚡ Broadcast Now →"
          )}
        </button>

        {error && <p className="mt-3 text-center text-xs text-red-400">{error}</p>}

      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed inset-x-0 bottom-24 z-50 flex justify-center px-5 pointer-events-none">
          <div className="rounded-full border border-white/10 bg-zinc-900/90 px-5 py-3 text-sm text-zinc-200 shadow-xl backdrop-blur-md animate-fade-in">
            {toast}
          </div>
        </div>
      )}
    </main>
    <TabBar active="Broadcast" />
    </>
  );
}
