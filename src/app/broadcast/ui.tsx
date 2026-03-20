"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const PENDING_KEY = "bloc_pending_sentence";

// ─── Tab bar ──────────────────────────────────────────────────────────────────

function TabBar() {
  return (
    <>
      <style>{`
        @keyframes fab-ripple { 0% { transform: scale(1); opacity: 0.4; } 100% { transform: scale(2.2); opacity: 0; } }
        .pb-safe { padding-bottom: env(safe-area-inset-bottom, 12px); }
      `}</style>
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/[0.08] bg-black/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-xl items-end justify-around px-2 pb-safe pt-2">
          <TabItem href="/" label="Home" icon={<HomeIcon />} />
          <TabItem href="/nearby" label="Nearby" icon={<MapIcon />} />
          <BroadcastFAB />
          <TabItem href="/inbox" label="Inbox" icon={<InboxIcon />} />
          <TabItem href="/profile" label="Profile" icon={<ProfileIcon />} />
        </div>
      </nav>
    </>
  );
}

function TabItem({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <Link href={href} className="flex flex-col items-center gap-0.5 pb-1">
      <span className="text-zinc-500 transition-colors">{icon}</span>
      <span className="text-[10px] text-zinc-500 transition-colors">{label}</span>
    </Link>
  );
}

function BroadcastFAB() {
  return (
    <div className="relative -mt-6 flex flex-col items-center">
      <span className="absolute inset-0 m-auto h-14 w-14 rounded-full opacity-40" style={{ background: "linear-gradient(135deg,#7c5ce8,#4d9ef5,#00d4c8)", animation: "fab-ripple 2s ease-out infinite" }} />
      <span className="absolute inset-0 m-auto h-14 w-14 rounded-full opacity-20" style={{ background: "linear-gradient(135deg,#7c5ce8,#4d9ef5,#00d4c8)", animation: "fab-ripple 2s ease-out 0.6s infinite" }} />
      <span className="relative flex h-14 w-14 items-center justify-center rounded-full shadow-lg" style={{ background: "linear-gradient(135deg,#7c5ce8,#4d9ef5,#00d4c8)" }}>
        <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
          <path strokeLinecap="round" d="M7 17A7 7 0 017 7" />
          <path strokeLinecap="round" d="M17 7a7 7 0 010 10" />
        </svg>
      </span>
      <span className="mt-1 text-[10px] text-[#7c5ce8]">Broadcast</span>
    </div>
  );
}

function HomeIcon() {
  return <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M3 9.75L12 3l9 6.75V21a.75.75 0 01-.75.75H15.75v-5.25a.75.75 0 00-.75-.75h-6a.75.75 0 00-.75.75V21.75H3.75A.75.75 0 013 21V9.75z" /></svg>;
}
function MapIcon() {
  return <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503-9.998l2.747-.756A.75.75 0 0119 7.944v9.32a.75.75 0 01-.503.712l-3 .822a.75.75 0 01-.397 0l-4.2-1.155a.75.75 0 00-.397 0l-2.747.756A.75.75 0 015 17.056V7.736a.75.75 0 01.503-.712l3-.822a.75.75 0 01.397 0l4.2 1.155a.75.75 0 00.397 0z" /></svg>;
}
function InboxIcon() {
  return <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859M12 3v8.25m0 0l-3-3m3 3l3-3" /></svg>;
}
function ProfileIcon() {
  return <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function BroadcastComposer() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [sentence, setSentence] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // On mount: restore draft. If session + pending sentence exist together
  // (i.e. user just returned from auth), auto-submit immediately.
  // ?draft= param seeds the textarea without auto-submitting (used by storefront).
  useEffect(() => {
    async function init() {
      try {
        const draft = searchParams.get("draft");
        if (draft) {
          setSentence(draft);
          return; // URL draft → just populate, never auto-submit
        }

        const pending = localStorage.getItem(PENDING_KEY);
        if (pending) setSentence(pending);

        const { data: { user } } = await supabase.auth.getUser();
        if (user && pending && pending.trim().length >= 3) {
          setBusy(true);
          await submitRequest(user.id, pending.trim());
        }
      } catch {
        setBusy(false);
      }
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submitRequest(userId: string, text: string) {
    const { data, error: insertErr } = await supabase
      .from("requests")
      .insert({ sentence: text, buyer_id: userId })
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
        setToast("Saving your request… Sign in to send it.");
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
    <main className="flex min-h-screen flex-col items-center justify-center overflow-x-hidden bg-[#0d0d12] pb-24">
      <div className="w-full max-w-sm space-y-8 px-5 py-12">

        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Home
        </Link>

        {/* Heading */}
        <div>
          <h1
            className="text-6xl tracking-tight"
            style={{
              fontFamily: "var(--font-instrument-serif), Georgia, serif",
              background: "linear-gradient(135deg, #7c5ce8, #4d9ef5, #00d4c8)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Broadcast.
          </h1>
          <p className="mt-3 text-base text-zinc-400" style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}>
            Tell us what you need — sellers come to you.
          </p>
        </div>

        {/* Compose */}
        <div className="space-y-4">
          <textarea
            value={sentence}
            onChange={(e) => setSentence(e.target.value)}
            placeholder={'e.g. "Haircut in SoHo under $60 today at 5pm"'}
            rows={4}
            disabled={busy}
            className="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition focus:border-[#7c5ce8]/60 focus:ring-2 focus:ring-[#7c5ce8]/20 disabled:opacity-50"
            style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleBroadcast();
            }}
          />

          <button
            onClick={handleBroadcast}
            disabled={busy || sentence.trim().length < 3}
            className="relative w-full overflow-hidden rounded-2xl py-4 text-base font-semibold text-white transition-opacity disabled:opacity-40"
            style={{
              background: "linear-gradient(135deg, #7c5ce8, #4d9ef5, #00d4c8)",
              fontFamily: "var(--font-dm-sans), sans-serif",
            }}
          >
            {busy ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Broadcasting…
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                Broadcast
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5-5 5M6 12h12" />
                </svg>
              </span>
            )}
          </button>

          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed inset-x-0 bottom-24 flex justify-center px-5 pointer-events-none">
          <div className="rounded-full border border-white/10 bg-zinc-900/90 px-5 py-3 text-sm text-zinc-200 shadow-xl backdrop-blur-md animate-fade-in">
            {toast}
          </div>
        </div>
      )}
    </main>
    <TabBar />
    </>
  );
}
