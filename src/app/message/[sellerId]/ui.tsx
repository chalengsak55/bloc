"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Seller = {
  id: string;
  display_name: string | null;
  category: string | null;
  avatar_url: string | null;
  is_online: boolean;
};

function getHue(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}

export function DirectMessage({ seller }: { seller: Seller }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [body, setBody] = useState(searchParams.get("draft") ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auth gate — redirect to /auth if no session, preserving this page as the return destination
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.replace(`/auth?redirect=/message/${seller.id}`);
    });
  }, [supabase, router, seller.id]);

  async function handleSend() {
    if (body.trim().length < 3) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sellerId: seller.id, sentence: body.trim() }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error((json as { error?: string }).error ?? "Failed to send");
      }
      const json = await res.json() as { conversationId?: string };
      router.push(json.conversationId ? `/inbox/${json.conversationId}` : "/inbox");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send. Please try again.");
      setBusy(false);
    }
  }

  const hue = getHue(seller.id);
  const initials = (seller.display_name ?? "??")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const firstName = seller.display_name?.split(" ")[0] ?? "Seller";

  return (
    <main className="flex min-h-screen flex-col bg-[#0d0d12] px-5 pb-16 pt-10">
      <div className="mx-auto w-full max-w-sm space-y-8">

        {/* Back to storefront */}
        <Link
          href={`/seller/${seller.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-zinc-300"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          {firstName}&apos;s profile
        </Link>

        {/* Heading */}
        <div>
          <h1
            className="text-4xl tracking-tight text-zinc-50"
            style={{ fontFamily: "var(--font-instrument-serif), Georgia, serif" }}
          >
            Message {firstName}.
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            This goes directly to {firstName}
            {seller.category ? ` · ${seller.category}` : ""}.
          </p>
        </div>

        {/* Seller mini-header */}
        <div className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
          {seller.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={seller.avatar_url}
              alt={seller.display_name ?? "Seller"}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{
                background: `linear-gradient(135deg, hsl(${hue},55%,45%), hsl(${(hue + 60) % 360},55%,40%))`,
              }}
            >
              {initials}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-zinc-100">
              {seller.display_name ?? "Seller"}
            </p>
            {seller.category && (
              <p className="truncate text-xs text-zinc-500">{seller.category}</p>
            )}
          </div>
          <div className="ml-auto flex-shrink-0">
            {seller.is_online ? (
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </span>
            ) : (
              <span className="h-2.5 w-2.5 rounded-full bg-zinc-600" />
            )}
          </div>
        </div>

        {/* Message compose */}
        <div className="space-y-4">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={`Hi ${firstName}, I need help with…`}
            rows={5}
            disabled={busy}
            autoFocus
            className="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition focus:border-[#7c5ce8]/60 focus:ring-2 focus:ring-[#7c5ce8]/20 disabled:opacity-50"
            style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend();
            }}
          />

          <button
            onClick={handleSend}
            disabled={busy || body.trim().length < 3}
            className="w-full rounded-2xl py-4 text-base font-semibold text-white transition-opacity disabled:opacity-40"
            style={{
              background: "linear-gradient(135deg, #7c5ce8, #4d9ef5, #00d4c8)",
              fontFamily: "var(--font-dm-sans), sans-serif",
            }}
          >
            {busy ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Sending…
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                Send message
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5-5 5M6 12h12" />
                </svg>
              </span>
            )}
          </button>

          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

      </div>
    </main>
  );
}
