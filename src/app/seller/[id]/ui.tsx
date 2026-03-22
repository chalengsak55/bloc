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

    const firstName = (seller.display_name ?? "").split(/\s+/)[0].trim() || "there";
    const cat = seller.category ? ` with ${seller.category}` : "";
    const draft = encodeURIComponent(`Hi ${firstName}, I need help${cat}`);
    router.push(`/message/${seller.id}?draft=${draft}`);
  }

  return (
    <button
      onClick={handleMessage}
      disabled={busy}
      className="flex-1 rounded-full border border-white/20 bg-white/[0.06] py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/[0.1] active:scale-[0.97] disabled:opacity-50"
      style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
    >
      {busy ? (
        <span className="flex items-center justify-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        </span>
      ) : (
        "Message"
      )}
    </button>
  );
}

// ─── Tabs: Posts & Services ───────────────────────────────────────────────────

const PLACEHOLDER_SERVICES = [
  { name: "Classic Haircut", description: "Precision cut with hot towel finish", price: "$35" },
  { name: "Beard Trim & Shape", description: "Line-up, trim, and oil treatment", price: "$20" },
  { name: "Full Service Package", description: "Cut, beard, shave, and styling", price: "$55" },
] as const;

function StorefrontTabs({ seller }: { seller: SellerProfile }) {
  const [tab, setTab] = useState<"posts" | "services">("posts");

  return (
    <div className="px-3.5 pb-16 pt-4">
      {/* Tab bar */}
      <div className="flex gap-1 rounded-full bg-white/[0.04] p-1">
        {(["posts", "services"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 rounded-full py-2 text-sm font-semibold transition-all ${
              tab === t
                ? "bg-white text-black shadow-sm"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {t === "posts" ? "Posts" : "Services"}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="mt-4">
        {tab === "posts" ? (
          /* ── Posts grid ── */
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <svg className="mb-3 h-8 w-8 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
            </svg>
            <p className="text-sm text-zinc-500">No posts yet</p>
          </div>
        ) : (
          /* ── Services list ── */
          <div className="flex flex-col gap-2">
            {PLACEHOLDER_SERVICES.map((s) => (
              <div
                key={s.name}
                className="flex items-center gap-3 rounded-2xl px-4 py-3.5"
                style={{ backgroundColor: "#111", border: "1px solid #1e1e1e" }}
              >
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-bold text-white">{s.name}</span>
                  <p className="mt-0.5 text-xs text-zinc-500">{s.description}</p>
                </div>
                <span className="flex-shrink-0 text-sm font-semibold text-[#7c5ce8]">
                  {s.price}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Storefront ───────────────────────────────────────────────────────────────

export function SellerStorefront({ seller }: { seller: SellerProfile }) {
  const hue = getHue(seller.id);

  return (
    <main className="flex min-h-screen flex-col bg-[#0d0d12]">
      {/* ── Hero cover ── */}
      <div
        className="relative flex min-h-[56vh] flex-col justify-end"
        style={{
          background: seller.avatar_url
            ? undefined
            : `linear-gradient(135deg, hsl(${hue},55%,35%), hsl(${(hue + 60) % 360},55%,25%))`,
        }}
      >
        {/* Avatar background image */}
        {seller.avatar_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={seller.avatar_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}

        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d12] via-[#0d0d12]/60 to-transparent" />

        {/* Top bar — Back + More */}
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 pt-12">
          <Link
            href="/nearby"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm transition hover:bg-black/60"
          >
            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm transition hover:bg-black/60"
          >
            <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="5" cy="12" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="19" cy="12" r="2" />
            </svg>
          </button>
        </div>

        {/* Hero content */}
        <div className="relative z-10 px-5 pb-6">
          {/* Open now pill */}
          {seller.is_online && (
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-400 backdrop-blur-sm"
              style={{ border: "1px solid rgba(52,211,153,0.25)" }}
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              Open now
            </span>
          )}
          {!seller.is_online && (
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-zinc-700/30 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 backdrop-blur-sm"
              style={{ border: "1px solid rgba(113,113,122,0.25)" }}
            >
              <span className="inline-flex h-2 w-2 rounded-full bg-zinc-600" />
              Offline
            </span>
          )}

          {/* Business name */}
          <h1
            className="text-[32px] font-bold leading-tight text-white"
            style={{ fontFamily: "var(--font-instrument-serif), Georgia, serif" }}
          >
            {seller.display_name ?? "Seller"}
          </h1>

          {/* Category + Location */}
          <p className="mt-1 text-sm text-zinc-400" style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}>
            {[seller.category, seller.location_text].filter(Boolean).join(" · ")}
            {seller.lat != null && seller.lng != null && (
              <span className="ml-1">
                <DistanceBadge lat={seller.lat} lng={seller.lng} />
              </span>
            )}
          </p>

          {/* Action buttons */}
          <div className="mt-5 flex gap-3">
            <button
              type="button"
              className="flex-1 rounded-full py-3 text-sm font-semibold text-white shadow-lg transition active:scale-[0.97]"
              style={{ background: "linear-gradient(135deg, #7c5ce8, #4d9ef5)" }}
            >
              Book Now
            </button>
            <MessageButton seller={seller} />
          </div>
        </div>
      </div>

      {/* ── Agent bar ── */}
      <div className="px-3 pt-3">
        <div
          className="flex items-center gap-3 rounded-2xl px-4 py-3.5"
          style={{
            backgroundColor: "#0f0f1a",
            border: "1px solid rgba(124,92,232,0.25)",
          }}
        >
          {/* Lightning bolt icon */}
          <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24" fill="none">
            <defs>
              <linearGradient id="bolt-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#7c5ce8" />
                <stop offset="100%" stopColor="#00d4c8" />
              </linearGradient>
            </defs>
            <path
              d="M13 2L4.09 12.63a1 1 0 00.78 1.62H11l-1 7.75L19.91 11.37a1 1 0 00-.78-1.62H13l1-7.75z"
              fill="url(#bolt-grad)"
            />
          </svg>
          <div className="min-w-0 flex-1">
            <span className="text-sm font-bold text-white">Agent active</span>
            <p className="text-xs text-zinc-500">Replies in ~2 min · 24/7</p>
          </div>
        </div>
      </div>

      {/* ── Trust metrics ── */}
      <div className="flex gap-1.5 px-3.5 pt-2.5">
        {([
          { value: "94%", label: "Response rate" },
          { value: "~2 min", label: "Avg reply" },
          { value: "😊 847", label: "Smiles" },
          { value: "2 yr", label: "On Bloc" },
        ] as const).map((m) => (
          <div
            key={m.label}
            className="flex flex-1 flex-col items-center rounded-2xl py-2.5"
            style={{ backgroundColor: "#111", border: "1px solid #1e1e1e" }}
          >
            <span className="text-[16px] font-bold text-white">{m.value}</span>
            <span className="mt-0.5 text-[9px] font-medium uppercase tracking-wider text-zinc-500">
              {m.label}
            </span>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <StorefrontTabs seller={seller} />
    </main>
  );
}
