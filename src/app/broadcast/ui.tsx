"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const PENDING_KEY = "bloc_pending_sentence";

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
    <main className="flex min-h-screen flex-col items-center justify-center px-5 py-12 bg-[#0d0d12]">
      <div className="w-full max-w-sm space-y-8">

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
        <div className="fixed inset-x-0 bottom-10 flex justify-center px-5 pointer-events-none">
          <div className="rounded-full border border-white/10 bg-zinc-900/90 px-5 py-3 text-sm text-zinc-200 shadow-xl backdrop-blur-md animate-fade-in">
            {toast}
          </div>
        </div>
      )}
    </main>
  );
}
