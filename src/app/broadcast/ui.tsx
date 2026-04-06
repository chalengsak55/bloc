"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { TabBar } from "@/components/TabBar";

const PENDING_KEY = "bloc_pending_sentence";

// ─── Demo data ───────────────────────────────────────────────────────────────

const PLACEHOLDER_EXAMPLES = [
  "Looking for a DJ for Saturday night — budget $300",
  "Need a barber open late tonight near SoMa",
  "Private chef for dinner party · 8 guests · tonight",
  "House cleaner this weekend — 2BR apartment",
  "Moving from Daly City to SF — need help tomorrow",
];

const SUGGESTION_PILLS = [
  { emoji: "🎵", label: "DJ for Saturday", color: "#7c5ce8" },
  { emoji: "✂️", label: "Barber tonight", color: "#f472b6" },
  { emoji: "🏠", label: "House cleaner", color: "#4d9ef5" },
  { emoji: "⚡", label: "Urgent electrician", color: "#22c55e" },
  { emoji: "👨‍🍳", label: "Private chef", color: "#f59e0b" },
  { emoji: "📦", label: "Moving help", color: "#00d4c8" },
];

const WINS_TICKER = [
  "Walk-in barber booked for tonight",
  "DJ matched for birthday party in 6 min",
  "Private chef found for dinner — 8 guests",
  "Electrician arrived within 45 min",
  "House cleaned same-day in Daly City",
];

const LIVE_FEED = [
  { location: "Daly City", text: "Looking for a DJ for a birthday party Saturday — budget ~$300", time: "3 min ago", emoji: "🎵", status: "agent searching...", statusColor: "#4d9ef5" },
  { location: "Mission District", text: "Need an electrician urgently — tonight before 8pm", time: "9 min ago", emoji: "⚡", status: "3 sellers notified", statusColor: "#f59e0b" },
  { location: "Menlo Park", text: "Private chef for dinner party · 8 guests · tonight", time: "14 min ago", emoji: "👨‍🍳", status: "matched in 11 min ✓", statusColor: "#22c55e" },
  { location: "Daly City", text: "Moving from Daly City to SF — need help tomorrow morning", time: "22 min ago", emoji: "📦", status: "expanding search...", statusColor: "#f59e0b" },
  { location: "SoMa", text: "Walk-in barber open late tonight — anywhere near SoMa", time: "31 min ago", emoji: "✂️", status: "matched in 6 min ✓", statusColor: "#22c55e" },
];

// ─── Typewriter placeholder ──────────────────────────────────────────────────

function useTypewriter(examples: string[], typingSpeed = 50, pauseMs = 2000) {
  const [text, setText] = useState("");
  const [exIdx, setExIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = examples[exIdx % examples.length];
    const timer = setTimeout(() => {
      if (!deleting) {
        if (charIdx < current.length) {
          setText(current.slice(0, charIdx + 1));
          setCharIdx((c) => c + 1);
        } else {
          setTimeout(() => setDeleting(true), pauseMs);
        }
      } else {
        if (charIdx > 0) {
          setText(current.slice(0, charIdx - 1));
          setCharIdx((c) => c - 1);
        } else {
          setDeleting(false);
          setExIdx((i) => (i + 1) % examples.length);
        }
      }
    }, deleting ? typingSpeed / 2 : typingSpeed);
    return () => clearTimeout(timer);
  }, [charIdx, deleting, exIdx, examples, typingSpeed, pauseMs]);

  return text;
}

// ─── Main component ──────────────────────────────────────────────────────────

export function BroadcastComposer() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [sentence, setSentence] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const posRef = useRef<{ lat: number; lng: number } | null>(null);
  const [winsIdx, setWinsIdx] = useState(0);
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

  // Wins ticker rotation
  useEffect(() => {
    const timer = setInterval(() => setWinsIdx((i) => (i + 1) % WINS_TICKER.length), 4000);
    return () => clearInterval(timer);
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

    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
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
        ctx!.fillStyle = p.color + "40";
        ctx!.fill();
      }
      // Lines between close particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            ctx!.beginPath();
            ctx!.moveTo(particles[i].x, particles[i].y);
            ctx!.lineTo(particles[j].x, particles[j].y);
            ctx!.strokeStyle = `rgba(124,92,232,${0.06 * (1 - dist / 150)})`;
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
    <main className="relative min-h-screen overflow-hidden pb-24" style={{ background: "#0d0d12" }}>

      {/* ── Particle canvas background ── */}
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" style={{ opacity: 0.6 }} />

      <div className="relative z-10 mx-auto max-w-[420px] px-5 pb-12 pt-6">

        {/* ── Header: Bloc. + live badge ── */}
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
        <div className="mt-10 flex flex-col items-center text-center">
          {/* Orb icon */}
          <div
            className="mb-5 flex h-16 w-16 items-center justify-center rounded-full"
            style={{ background: "linear-gradient(135deg, rgba(124,92,232,0.3), rgba(77,158,245,0.2))" }}
          >
            <span className="text-3xl">⚡</span>
          </div>

          <h1 className="text-2xl font-bold leading-tight text-white">
            Say what you need.
          </h1>
          <h2
            className="text-2xl font-bold leading-tight"
            style={{ color: "#22c55e" }}
          >
            Agents find it for you.
          </h2>
          <p className="mt-3 text-sm text-zinc-500">No searching. No browsing.</p>
          <p className="text-sm text-zinc-500">Broadcast — sellers come to you.</p>
        </div>

        {/* ── Stats row ── */}
        <div className="mt-6 flex items-center justify-center gap-6">
          <div className="text-center">
            <div className="text-lg font-bold" style={{ color: "#4d9ef5" }}>2,847</div>
            <div className="text-[10px] text-zinc-600">broadcasts</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold" style={{ color: "#22c55e" }}>94%</div>
            <div className="text-[10px] text-zinc-600">got matched</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold" style={{ color: "#f472b6" }}>~8 min</div>
            <div className="text-[10px] text-zinc-600">avg first reply</div>
          </div>
        </div>

        {/* ── Wins ticker ── */}
        <div className="mt-5 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
          <div className="mb-1.5 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">Recent matches</span>
          </div>
          <div className="relative overflow-hidden" style={{ height: 20 }}>
            {WINS_TICKER.map((win, i) => (
              <p
                key={i}
                className="absolute inset-x-0 text-[13px] text-zinc-400 transition-all duration-500"
                style={{
                  opacity: winsIdx % WINS_TICKER.length === i ? 1 : 0,
                  transform: winsIdx % WINS_TICKER.length === i ? "translateY(0)" : "translateY(8px)",
                }}
              >
                ✂️ {win} <span className="text-zinc-600">6m ago</span>
              </p>
            ))}
          </div>
        </div>

        {/* ── Divider ── */}
        <div className="mt-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/[0.06]" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-700">Your broadcast</span>
          <div className="h-px flex-1 bg-white/[0.06]" />
        </div>

        {/* ── Input box ── */}
        <div className="mt-4">
          <div
            className="relative rounded-2xl border p-px"
            style={{
              borderColor: sentence ? "rgba(124,92,232,0.5)" : "rgba(124,92,232,0.2)",
              boxShadow: sentence ? "0 0 20px rgba(124,92,232,0.15)" : undefined,
            }}
          >
            <textarea
              value={sentence}
              onChange={(e) => setSentence(e.target.value)}
              placeholder={placeholder}
              rows={3}
              disabled={busy}
              className="w-full resize-none rounded-2xl bg-white/[0.03] px-4 py-4 text-sm text-zinc-100 placeholder-zinc-600 outline-none disabled:opacity-50"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleBroadcast();
              }}
            />
            {/* Mic button */}
            <button
              type="button"
              className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-zinc-500 transition hover:bg-white/[0.1]"
            >
              🎙️
            </button>
          </div>
          <p className="mt-2 text-center text-[10px] text-zinc-700">speak naturally · agents understand</p>
        </div>

        {/* ── Suggestion pills ── */}
        <div className="mt-5">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-700">Popular right now</div>
          <div className="flex flex-wrap gap-2">
            {SUGGESTION_PILLS.map((pill) => (
              <button
                key={pill.label}
                type="button"
                onClick={() => setSentence(pill.label)}
                className="rounded-full px-3 py-1.5 text-[12px] font-medium transition hover:bg-white/[0.06]"
                style={{
                  border: `1px solid ${pill.color}30`,
                  color: pill.color,
                }}
              >
                {pill.emoji} {pill.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── CTA button ── */}
        <button
          onClick={handleBroadcast}
          disabled={busy || sentence.trim().length < 3}
          className="relative mt-6 w-full overflow-hidden rounded-2xl py-4 text-base font-bold text-white transition-opacity disabled:opacity-40"
          style={{
            background: "linear-gradient(135deg, #7c5ce8, #4d9ef5, #00d4c8)",
          }}
        >
          {busy ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Broadcasting...
            </span>
          ) : (
            "⚡ Broadcast Now — It's Free"
          )}
        </button>
        <p className="mt-2 text-center text-[10px] text-zinc-600">
          Free · No account needed · Agents start immediately
        </p>

        {error && <p className="mt-3 text-center text-xs text-red-400">{error}</p>}

        {/* ── Anonymous live feed ── */}
        <div className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#f59e0b" }}>Happening near you</span>
            </div>
            <span className="flex items-center gap-1 text-[10px] text-zinc-700">🔒 anonymous</span>
          </div>

          <div className="flex flex-col gap-3">
            {LIVE_FEED.map((item, i) => (
              <div
                key={i}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3.5"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-lg">
                    {item.emoji}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] text-zinc-600">Someone near {item.location}</div>
                    <div className="mt-0.5 text-[13px] font-medium leading-snug text-zinc-300">
                      {item.text}
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[10px] text-zinc-700">📍 {item.location} · {item.time}</span>
                      <span
                        className="rounded-full border px-2 py-0.5 text-[10px] font-medium italic"
                        style={{ borderColor: `${item.statusColor}40`, color: item.statusColor }}
                      >
                        {item.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

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
