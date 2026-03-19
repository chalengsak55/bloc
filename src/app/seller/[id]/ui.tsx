"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type SellerProfile = {
  id: string;
  display_name: string | null;
  category: string | null;
  location_text: string | null;
  bio: string | null;
  avatar_url: string | null;
  link_url: string | null;
  is_online: boolean;
  lat: number | null;
  lng: number | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getHue(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function fmtDist(km: number) {
  return km < 1 ? `${Math.round(km * 1000)}m away` : `${km.toFixed(1)}km away`;
}

// ─── Distance badge (client-only, geolocation) ────────────────────────────────

function DistanceBadge({ lat, lng }: { lat: number; lng: number }) {
  const [dist, setDist] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setDist(fmtDist(haversineKm(pos.coords.latitude, pos.coords.longitude, lat, lng))),
      () => {},
    );
  }, [lat, lng]);

  if (!dist) return null;

  return (
    <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      {dist}
    </span>
  );
}

// ─── Message button ───────────────────────────────────────────────────────────

function MessageButton({ seller }: { seller: SellerProfile }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleMessage() {
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push(`/auth?redirect=/seller/${seller.id}`);
      return;
    }

    // Pre-fill the broadcast with seller context so the buyer has a starting point
    try {
      const name = seller.display_name ?? "this seller";
      const cat = seller.category ? ` for ${seller.category}` : "";
      localStorage.setItem("bloc_pending_sentence", `Hi ${name}, I'm looking${cat}`);
    } catch { /* ignore */ }

    router.push("/broadcast");
  }

  return (
    <button
      onClick={handleMessage}
      disabled={busy}
      className="w-full rounded-2xl py-4 text-base font-semibold text-white transition-opacity disabled:opacity-50"
      style={{
        background: "linear-gradient(135deg, #7c5ce8, #4d9ef5, #00d4c8)",
        fontFamily: "var(--font-dm-sans), sans-serif",
      }}
    >
      {busy ? (
        <span className="flex items-center justify-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          Loading…
        </span>
      ) : (
        `Message ${seller.display_name?.split(" ")[0] ?? "seller"}`
      )}
    </button>
  );
}

// ─── Storefront ───────────────────────────────────────────────────────────────

export function SellerStorefront({ seller }: { seller: SellerProfile }) {
  const hue = getHue(seller.id);
  const initials = (seller.display_name ?? "??")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <main className="flex min-h-screen flex-col bg-[#0d0d12] px-5 pb-16 pt-10">
      <div className="mx-auto w-full max-w-sm">

        {/* Back */}
        <Link
          href="/nearby"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-zinc-300"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Nearby
        </Link>

        {/* Avatar + status */}
        <div className="mt-10 flex flex-col items-center text-center">
          <div className="relative">
            {seller.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={seller.avatar_url}
                alt={seller.display_name ?? "Seller"}
                className="h-24 w-24 rounded-full object-cover ring-2 ring-white/10"
              />
            ) : (
              <div
                className="flex h-24 w-24 items-center justify-center rounded-full text-2xl font-bold text-white"
                style={{
                  background: `linear-gradient(135deg, hsl(${hue},55%,45%), hsl(${(hue + 60) % 360},55%,40%))`,
                }}
              >
                {initials}
              </div>
            )}

            {/* Online indicator */}
            <span className="absolute bottom-1 right-1">
              {seller.is_online ? (
                <span className="relative flex h-4 w-4">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-4 w-4 rounded-full border-2 border-[#0d0d12] bg-emerald-400" />
                </span>
              ) : (
                <span className="inline-flex h-4 w-4 rounded-full border-2 border-[#0d0d12] bg-zinc-600" />
              )}
            </span>
          </div>

          {/* Name */}
          <h1
            className="mt-5 text-3xl tracking-tight text-zinc-50"
            style={{ fontFamily: "var(--font-instrument-serif), Georgia, serif" }}
          >
            {seller.display_name ?? "Seller"}
          </h1>

          {/* Category pill */}
          {seller.category && (
            <span
              className="mt-2 rounded-full px-3 py-1 text-xs font-medium text-white"
              style={{ background: "linear-gradient(135deg, rgba(124,92,232,0.35), rgba(77,158,245,0.35))", border: "1px solid rgba(124,92,232,0.4)" }}
            >
              {seller.category}
            </span>
          )}

          {/* Location + distance */}
          <div className="mt-2 flex items-center gap-3">
            {seller.location_text && (
              <span className="text-xs text-zinc-500">{seller.location_text}</span>
            )}
            {seller.lat != null && seller.lng != null && (
              <>
                {seller.location_text && <span className="text-zinc-700">·</span>}
                <DistanceBadge lat={seller.lat} lng={seller.lng} />
              </>
            )}
          </div>

          {/* Online label */}
          <p className="mt-1 text-xs font-medium" style={{ color: seller.is_online ? "#00d4c8" : "#52525b" }}>
            {seller.is_online ? "Available now" : "Currently offline"}
          </p>
        </div>

        {/* Divider */}
        <div className="my-8 border-t border-white/[0.06]" />

        {/* Bio */}
        {seller.bio && (
          <div className="mb-8">
            <p className="text-sm leading-7 text-zinc-300" style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}>
              {seller.bio}
            </p>
          </div>
        )}

        {/* Portfolio link */}
        {seller.link_url && (
          <a
            href={seller.link_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] py-3.5 text-sm text-zinc-300 transition-colors hover:bg-white/[0.08]"
          >
            <svg className="h-4 w-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            View portfolio
          </a>
        )}

        {/* Message CTA */}
        <MessageButton seller={seller} />

      </div>
    </main>
  );
}
