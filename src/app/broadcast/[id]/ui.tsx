"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type SellerCard = {
  matchId: string;
  sellerId: string;
  displayName: string | null;
  category: string | null;
  bio: string | null;
  isOnline: boolean;
  matchedAt: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getHue(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function BroadcastResults({ id }: { id: string }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();

  const [sentence, setSentence] = useState<string | null>(null);
  const [sellers, setSellers] = useState<SellerCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [timedOut, setTimedOut] = useState(false);

  // ── Initial load: auth + request + existing matches ──────────────────────
  useEffect(() => {
    let canceled = false;

    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace(`/auth?redirect=/broadcast/${id}`);
        return;
      }

      const { data: req } = await supabase
        .from("requests")
        .select("sentence, buyer_id")
        .eq("id", id)
        .single();

      if (!req || req.buyer_id !== user.id) {
        router.replace("/");
        return;
      }

      if (canceled) return;
      setSentence(req.sentence);

      // Fetch any matches that already exist (e.g. on refresh)
      const { data: matches } = await supabase
        .from("matches")
        .select("id, seller_id, created_at")
        .eq("request_id", id)
        .order("created_at", { ascending: true });

      if (matches && matches.length > 0) {
        const sellerIds = matches.map((m) => m.seller_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name, category, bio, is_online")
          .in("id", sellerIds);

        if (!canceled) {
          const pm = new Map((profiles ?? []).map((p) => [p.id, p]));
          setSellers(
            matches.map((m) => ({
              matchId: m.id,
              sellerId: m.seller_id,
              displayName: pm.get(m.seller_id)?.display_name ?? null,
              category: pm.get(m.seller_id)?.category ?? null,
              bio: pm.get(m.seller_id)?.bio ?? null,
              isOnline: pm.get(m.seller_id)?.is_online ?? false,
              matchedAt: m.created_at,
            })),
          );
        }
      }

      if (!canceled) setLoading(false);
    }

    init();
    return () => { canceled = true; };
  }, [supabase, router, id]);

  // ── Timeout: 10s with no responses → show "no agents" ────────────────────
  useEffect(() => {
    if (loading || sellers.length > 0) return;
    const t = setTimeout(() => setTimedOut(true), 10_000);
    return () => clearTimeout(t);
  }, [loading, sellers.length]);

  // ── Real-time: new matches inserted for this request ──────────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`results-${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "matches",
          filter: `request_id=eq.${id}`,
        },
        async (payload) => {
          const m = payload.new as { id: string; seller_id: string; created_at: string };
          setTimedOut(false);

          const { data: profile } = await supabase
            .from("profiles")
            .select("id, display_name, category, bio, is_online")
            .eq("id", m.seller_id)
            .single();

          setSellers((prev) => {
            if (prev.some((s) => s.sellerId === m.seller_id)) return prev;
            return [
              ...prev,
              {
                matchId: m.id,
                sellerId: m.seller_id,
                displayName: profile?.display_name ?? null,
                category: profile?.category ?? null,
                bio: profile?.bio ?? null,
                isOnline: profile?.is_online ?? false,
                matchedAt: m.created_at,
              },
            ];
          });
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase, id]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @keyframes results-pulse {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50%       { opacity: 0.35; transform: scale(1.08); }
        }
        @keyframes results-pulse-inner {
          0%, 100% { opacity: 0.25; transform: scale(1); }
          50%       { opacity: 0.5;  transform: scale(1.06); }
        }
        @keyframes seller-in {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-results-pulse       { animation: results-pulse       2.4s ease-in-out infinite; }
        .animate-results-pulse-inner { animation: results-pulse-inner 2.4s ease-in-out 0.5s infinite; }
        .animate-seller-in           { animation: seller-in 0.35s ease-out forwards; }
      `}</style>

      <div className="flex min-h-dvh flex-col bg-[#0d0d12]">

        {/* Header */}
        <div className="sticky top-0 z-40 border-b border-white/[0.06] bg-black/70 backdrop-blur-xl">
          <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-4">
            <Link
              href="/"
              className="text-zinc-500 transition-colors hover:text-zinc-300"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1
              className="text-xl tracking-tight text-zinc-50"
              style={{ fontFamily: "var(--font-instrument-serif), Georgia, serif" }}
            >
              Results
            </h1>
          </div>
        </div>

        <div className="mx-auto w-full max-w-xl flex-1 space-y-6 px-4 pb-16 pt-6">

          {/* Broadcast sentence */}
          {sentence && (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-5 py-4">
              <p className="mb-2 text-[10px] font-medium uppercase tracking-widest text-zinc-600">
                Your broadcast
              </p>
              <p className="text-sm leading-relaxed text-zinc-200">{sentence}</p>
            </div>
          )}

          {/* States */}
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  className="h-28 animate-pulse rounded-2xl border border-white/[0.04] bg-white/[0.03]"
                />
              ))}
            </div>
          ) : sellers.length === 0 ? (
            timedOut ? (
              /* ── No agents ── */
              <div className="flex flex-col items-center py-16 text-center">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-white/[0.06] bg-white/[0.03]">
                  <svg className="h-6 w-6 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-base text-zinc-300">No agents available nearby.</p>
                <p className="mt-1.5 text-sm text-zinc-600">Try again later or broaden your request.</p>
                <Link
                  href="/broadcast"
                  className="mt-6 rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
                  style={{ background: "linear-gradient(135deg,#7c5ce8,#4d9ef5,#00d4c8)" }}
                >
                  New broadcast
                </Link>
              </div>
            ) : (
              /* ── Searching pulse ── */
              <div className="flex flex-col items-center py-16 text-center">
                <div className="relative mb-8 flex h-24 w-24 items-center justify-center">
                  <span
                    className="absolute inset-0 rounded-full animate-results-pulse"
                    style={{ background: "linear-gradient(135deg,#7c5ce8,#4d9ef5,#00d4c8)" }}
                  />
                  <span
                    className="absolute inset-3 rounded-full animate-results-pulse-inner"
                    style={{ background: "linear-gradient(135deg,#7c5ce8,#4d9ef5,#00d4c8)" }}
                  />
                  <span
                    className="relative flex h-12 w-12 items-center justify-center rounded-full"
                    style={{ background: "linear-gradient(135deg,#7c5ce8,#4d9ef5,#00d4c8)" }}
                  >
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
                      <path strokeLinecap="round" d="M7 17A7 7 0 017 7" />
                      <path strokeLinecap="round" d="M17 7a7 7 0 010 10" />
                    </svg>
                  </span>
                </div>
                <p className="text-base text-zinc-300">Looking for agents…</p>
                <p className="mt-1.5 text-sm text-zinc-600">We&apos;re reaching nearby sellers right now.</p>
              </div>
            )
          ) : (
            /* ── Seller cards ── */
            <div className="space-y-3">
              <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-600">
                {sellers.length === 1 ? "1 agent responded" : `${sellers.length} agents responded`}
              </p>

              {sellers.map((seller) => {
                const initials = getInitials(seller.displayName);
                const hue = getHue(seller.sellerId);
                const firstName = (seller.displayName ?? "").split(/\s+/)[0].trim() || "there";
                const cat = seller.category ? ` with ${seller.category}` : "";
                const draft = encodeURIComponent(`Hi ${firstName}, I need help${cat}`);

                return (
                  <div
                    key={seller.sellerId}
                    className="animate-seller-in rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4"
                  >
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div
                        className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                        style={{
                          background: `linear-gradient(135deg, hsl(${hue},65%,55%), hsl(${(hue + 60) % 360},65%,55%))`,
                        }}
                      >
                        {initials}
                        {seller.isOnline && (
                          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#0d0d12] bg-emerald-400" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-zinc-100">
                          {seller.displayName ?? "Anonymous Seller"}
                        </p>
                        {seller.category && (
                          <p className="text-xs text-zinc-500">{seller.category}</p>
                        )}
                        {seller.bio && (
                          <p className="mt-1.5 line-clamp-2 text-xs leading-snug text-zinc-500">
                            {seller.bio}
                          </p>
                        )}

                        {/* Actions */}
                        <div className="mt-3 flex gap-2">
                          <Link
                            href={`/seller/${seller.sellerId}`}
                            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-white/20 hover:text-zinc-200"
                          >
                            View profile
                          </Link>
                          <Link
                            href={`/message/${seller.sellerId}?draft=${draft}`}
                            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                            style={{ background: "linear-gradient(135deg,#7c5ce8,#4d9ef5,#00d4c8)" }}
                          >
                            Message
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>
    </>
  );
}
