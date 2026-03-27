"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isOpenNow, formatWeeklyHours, type GooglePeriod } from "@/lib/ghost-hours";

// ─── Types ────────────────────────────────────────────────────────────────────

type GhostBusiness = {
  id: string;
  place_id: string;
  name: string;
  category: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  website: string | null;
  email: string | null;
  photo_url: string | null;
  rating: number | null;
  opening_hours: GooglePeriod[] | null;
  timezone: string;
  google_maps_url: string | null;
  message_count: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getHue(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}

function RetryImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="eager"
      onError={(e) => {
        const img = e.currentTarget;
        img.style.display = "none";
      }}
    />
  );
}

// ─── Star Rating ──────────────────────────────────────────────────────────────

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {Array.from({ length: 5 }, (_, i) => (
          <svg key={i} className="h-4 w-4" viewBox="0 0 20 20" fill={i < full ? "#facc15" : i === full && half ? "url(#half)" : "#3f3f46"}>
            {i === full && half && (
              <defs>
                <linearGradient id="half">
                  <stop offset="50%" stopColor="#facc15" />
                  <stop offset="50%" stopColor="#3f3f46" />
                </linearGradient>
              </defs>
            )}
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <span className="text-sm font-medium text-zinc-300">{rating.toFixed(1)}</span>
    </div>
  );
}

// ─── Ghost Storefront ─────────────────────────────────────────────────────────

export function GhostStorefront({ ghost }: { ghost: GhostBusiness }) {
  const router = useRouter();
  const hue = getHue(ghost.place_id);
  const openStatus = useMemo(
    () => isOpenNow(ghost.opening_hours, ghost.timezone),
    [ghost.opening_hours, ghost.timezone],
  );
  const weeklyHours = useMemo(
    () => formatWeeklyHours(ghost.opening_hours),
    [ghost.opening_hours],
  );
  const firstName = ghost.name.split(/[\s·|–-]/)[0].trim();

  return (
    <div className="min-h-screen bg-[#0d0d12] pb-24">
      {/* ── Hero ── */}
      <div className="relative h-[55vh] w-full overflow-hidden">
        {ghost.photo_url ? (
          <RetryImage
            src={ghost.photo_url}
            alt={ghost.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className="h-full w-full"
            style={{
              background: `linear-gradient(135deg, hsl(${hue},60%,25%), hsl(${(hue + 60) % 360},50%,20%))`,
            }}
          />
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d12] via-[#0d0d12]/40 to-transparent" />

        {/* Back button */}
        <button
          type="button"
          onClick={() => { if (window.history.length > 1) router.back(); else router.push("/nearby"); }}
          className="absolute left-4 top-[max(env(safe-area-inset-top,12px),12px)] z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Open/Closed pill */}
        <div className="absolute bottom-20 left-5 z-10">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold tracking-wide ${
              openStatus.isOpen
                ? "bg-emerald-500/20 text-emerald-400"
                : "bg-red-500/20 text-red-400"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                openStatus.isOpen ? "bg-emerald-400" : "bg-red-400"
              }`}
            />
            {openStatus.isOpen ? "OPEN NOW" : "CLOSED"}
          </span>
        </div>

        {/* Business name + category */}
        <div className="absolute bottom-4 left-5 right-5 z-10">
          <h1
            className="text-3xl font-bold leading-tight text-white"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            {ghost.name}
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            {ghost.category && <span>{ghost.category}</span>}
            {ghost.address && (
              <>
                {ghost.category && <span> · </span>}
                <span>{ghost.address.split(",")[0]}</span>
              </>
            )}
          </p>
        </div>
      </div>

      {/* ── Ghost badge ── */}
      <div className="px-5 pt-3">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400">
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
          Unclaimed business
        </span>
        {openStatus.nextChange && (
          <p className="mt-1.5 text-xs text-zinc-500">{openStatus.nextChange}</p>
        )}
      </div>

      {/* ── CTA Buttons ── */}
      <div className="mt-5 flex flex-col gap-3 px-5">
        {/* Claim button — primary */}
        <Link
          href={`/ghost/${ghost.place_id}/claim`}
          className="flex items-center justify-center rounded-full py-3.5 text-center text-sm font-bold text-white transition active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg, #7c5ce8, #4d9ef5, #00d4c8)" }}
        >
          Claim this business
        </Link>

        {/* Ask button — secondary */}
        <Link
          href={`/ghost/${ghost.place_id}/chat`}
          className="flex items-center justify-center rounded-full border border-[#7c5ce8]/40 py-3.5 text-center text-sm font-bold text-[#7c5ce8] transition active:scale-[0.98]"
        >
          Ask {firstName}
        </Link>
      </div>

      {/* ── Agent bar ── */}
      <div className="mx-5 mt-5 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20">
            <svg className="h-4 w-4 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13 2L4.09 12.63a1 1 0 00.78 1.62H11l-1 7.75L19.91 11.37a1 1 0 00-.78-1.62H13l1-7.75z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Ghost Agent</p>
            <p className="text-xs text-zinc-500">Auto-responds with Google info</p>
          </div>
        </div>
        {ghost.message_count > 0 && (
          <p className="mt-2 text-xs text-zinc-500">
            {ghost.message_count} {ghost.message_count === 1 ? "person has" : "people have"} messaged this business
          </p>
        )}
      </div>

      {/* ── Rating ── */}
      {ghost.rating && ghost.rating > 0 && (
        <div className="mx-5 mt-4">
          <StarRating rating={ghost.rating} />
        </div>
      )}

      {/* ── Business Info ── */}
      <div className="mx-5 mt-5 flex flex-col gap-3">
        {ghost.address && (
          <a
            href={ghost.google_maps_url ?? `https://maps.google.com/?q=${encodeURIComponent(ghost.address)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 transition active:bg-white/[0.06]"
          >
            <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-zinc-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
            </svg>
            <span className="text-sm text-zinc-300">{ghost.address}</span>
          </a>
        )}

        {ghost.phone && (
          <a
            href={`tel:${ghost.phone}`}
            className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 transition active:bg-white/[0.06]"
          >
            <svg className="h-4 w-4 flex-shrink-0 text-zinc-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
            </svg>
            <span className="text-sm text-zinc-300">{ghost.phone}</span>
          </a>
        )}

        {ghost.website && (
          <a
            href={ghost.website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 transition active:bg-white/[0.06]"
          >
            <svg className="h-4 w-4 flex-shrink-0 text-zinc-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
            </svg>
            <span className="truncate text-sm text-zinc-300">{ghost.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>
          </a>
        )}
      </div>

      {/* ── Weekly Hours ── */}
      {weeklyHours.length > 0 && (
        <div className="mx-5 mt-5">
          <h3 className="mb-2 text-sm font-semibold text-zinc-400">Hours</h3>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
            {weeklyHours.map((h) => (
              <div key={h.day} className="flex justify-between py-1 text-sm">
                <span className="text-zinc-500">{h.day}</span>
                <span className={h.hours === "Closed" ? "text-red-400" : "text-zinc-300"}>
                  {h.hours}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Powered by Google ── */}
      <p className="mt-6 text-center text-xs text-zinc-600">
        Info from Google Places · Not verified by owner
      </p>
    </div>
  );
}
