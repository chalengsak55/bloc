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

// ─── Ghost Storefront ────────────────────────────────────────────────────────

export function GhostStorefront({ ghost, isClaimed = false }: { ghost: GhostBusiness; isClaimed?: boolean }) {
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
              background: isClaimed
                ? `linear-gradient(135deg, hsl(${hue},60%,25%), hsl(${(hue + 60) % 360},50%,20%))`
                : `linear-gradient(135deg, hsl(${hue},30%,18%), hsl(${(hue + 60) % 360},20%,14%))`,
            }}
          />
        )}
        {/* Overlay — muted for unclaimed, subtle for claimed */}
        {!isClaimed && <div className="absolute inset-0 bg-[#0d0d12]/50" />}
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

        {/* Badge — top right */}
        {!isClaimed && (
          <div className="absolute right-4 top-[max(env(safe-area-inset-top,12px),12px)] z-20">
            <span className="rounded-full bg-zinc-800/80 px-2.5 py-1 text-[10px] font-medium text-zinc-400 backdrop-blur-sm">
              Unclaimed
            </span>
          </div>
        )}

        {/* Open/Closed pill */}
        <div className="absolute bottom-20 left-5 z-10">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold tracking-wide ${
              openStatus.isOpen
                ? "bg-emerald-500/20 text-emerald-400"
                : isClaimed ? "bg-red-500/20 text-red-400" : "bg-zinc-700/40 text-zinc-400"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                openStatus.isOpen ? "bg-emerald-400" : isClaimed ? "bg-red-400" : "bg-zinc-500"
              }`}
            />
            {openStatus.isOpen ? "OPEN NOW" : "CLOSED"}
          </span>
        </div>

        {/* Business name + category */}
        <div className="absolute bottom-4 left-5 right-5 z-10">
          <h1
            className={`text-3xl font-bold leading-tight ${isClaimed ? "text-white" : "text-white/80"}`}
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            {ghost.name}
          </h1>
          <p className={`mt-1 text-sm ${isClaimed ? "text-zinc-400" : "text-zinc-500"}`}>
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

      {/* ── Agent bar ── */}
      {isClaimed ? (
        /* Claimed: vibrant agent bar with brand colors */
        <div className="mx-5 mt-4 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: "linear-gradient(135deg, #7c5ce8, #4d9ef5)" }}>
              <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13 2L4.09 12.63a1 1 0 00.78 1.62H11l-1 7.75L19.91 11.37a1 1 0 00-.78-1.62H13l1-7.75z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Agent active</p>
              <p className="text-xs text-zinc-400">Replies in ~2 min · 24/7</p>
            </div>
          </div>
        </div>
      ) : (
        /* Unclaimed: muted/inactive gray agent bar */
        <div className="mx-5 mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800">
              <svg className="h-4 w-4 text-zinc-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13 2L4.09 12.63a1 1 0 00.78 1.62H11l-1 7.75L19.91 11.37a1 1 0 00-.78-1.62H13l1-7.75z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-400">AI Agent</p>
              <p className="text-[11px] text-zinc-600">Public data only · Not managed by owner</p>
            </div>
          </div>
        </div>
      )}

      {/* ── CTA Buttons ── */}
      <div className="mt-4 px-5">
        {isClaimed ? (
          /* Claimed: vibrant Ask button */
          <Link
            href={`/ghost/${ghost.place_id}/chat`}
            className="flex items-center justify-center rounded-full py-3.5 text-center text-sm font-bold text-white transition active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg, #7c5ce8, #4d9ef5, #00d4c8)" }}
          >
            Ask {firstName}
          </Link>
        ) : (
          /* Unclaimed: muted Ask button */
          <Link
            href={`/ghost/${ghost.place_id}/chat`}
            className="flex items-center justify-center rounded-full border border-zinc-700 py-3 text-center text-sm font-semibold text-zinc-400 transition active:scale-[0.98]"
          >
            Ask about {firstName}
          </Link>
        )}
      </div>

      {/* ── Rating ── */}
      {ghost.rating && ghost.rating > 0 && (
        <div className="mx-5 mt-4">
          <StarRating rating={ghost.rating} />
        </div>
      )}

      {openStatus.nextChange && (
        <p className={`mx-5 mt-2 text-xs ${isClaimed ? "text-zinc-500" : "text-zinc-600"}`}>{openStatus.nextChange}</p>
      )}

      {/* ── Trust Metrics (claimed only) ── */}
      {isClaimed && (
        <div className="mx-5 mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-center">
            <p className="text-lg font-bold text-white">94%</p>
            <p className="text-[10px] text-zinc-500">Response rate</p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-center">
            <p className="text-lg font-bold text-white">~2 min</p>
            <p className="text-[10px] text-zinc-500">Avg reply</p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-center">
            <p className="text-lg font-bold text-white">98%</p>
            <p className="text-[10px] text-zinc-500">Satisfaction</p>
          </div>
        </div>
      )}

      {/* ── Business Info ── */}
      <div className="mx-5 mt-5 flex flex-col gap-3">
        {ghost.address && (
          <a
            href={ghost.google_maps_url ?? `https://maps.google.com/?q=${encodeURIComponent(ghost.address)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-start gap-3 rounded-xl border px-4 py-3 transition active:bg-white/[0.06] ${
              isClaimed ? "border-white/[0.06] bg-white/[0.03]" : "border-zinc-800 bg-zinc-900/50"
            }`}
          >
            <svg className={`mt-0.5 h-4 w-4 flex-shrink-0 ${isClaimed ? "text-zinc-500" : "text-zinc-600"}`} viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
            </svg>
            <span className={`text-sm ${isClaimed ? "text-zinc-300" : "text-zinc-400"}`}>{ghost.address}</span>
          </a>
        )}

        {ghost.phone && (
          <a
            href={`tel:${ghost.phone}`}
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition active:bg-white/[0.06] ${
              isClaimed ? "border-white/[0.06] bg-white/[0.03]" : "border-zinc-800 bg-zinc-900/50"
            }`}
          >
            <svg className={`h-4 w-4 flex-shrink-0 ${isClaimed ? "text-zinc-500" : "text-zinc-600"}`} viewBox="0 0 24 24" fill="currentColor">
              <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
            </svg>
            <span className={`text-sm ${isClaimed ? "text-zinc-300" : "text-zinc-400"}`}>{ghost.phone}</span>
          </a>
        )}

        {ghost.website && (
          <a
            href={ghost.website}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition active:bg-white/[0.06] ${
              isClaimed ? "border-white/[0.06] bg-white/[0.03]" : "border-zinc-800 bg-zinc-900/50"
            }`}
          >
            <svg className={`h-4 w-4 flex-shrink-0 ${isClaimed ? "text-zinc-500" : "text-zinc-600"}`} viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
            </svg>
            <span className={`truncate text-sm ${isClaimed ? "text-zinc-300" : "text-zinc-400"}`}>{ghost.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>
          </a>
        )}
      </div>

      {/* ── Weekly Hours ── */}
      {weeklyHours.length > 0 && (
        <div className="mx-5 mt-5">
          <h3 className={`mb-2 text-sm font-semibold ${isClaimed ? "text-zinc-400" : "text-zinc-500"}`}>Hours</h3>
          <div className={`rounded-xl border px-4 py-3 ${isClaimed ? "border-white/[0.06] bg-white/[0.03]" : "border-zinc-800 bg-zinc-900/50"}`}>
            {weeklyHours.map((h) => (
              <div key={h.day} className="flex justify-between py-1 text-sm">
                <span className={isClaimed ? "text-zinc-500" : "text-zinc-600"}>{h.day}</span>
                <span className={h.hours === "Closed" ? (isClaimed ? "text-red-400" : "text-red-400/60") : (isClaimed ? "text-zinc-300" : "text-zinc-400")}>
                  {h.hours}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Bottom CTA ── */}
      {!isClaimed && (
        <div className="mx-5 mt-6">
          <Link
            href={`/ghost/${ghost.place_id}/claim`}
            className="flex items-center justify-center rounded-full py-3.5 text-center text-sm font-bold text-white transition active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg, #7c5ce8, #4d9ef5, #00d4c8)" }}
          >
            Own this business? Get discovered free →
          </Link>
        </div>
      )}

      {/* ── Footer ── */}
      <p className={`mt-4 text-center text-[11px] ${isClaimed ? "text-zinc-600" : "text-zinc-700"}`}>
        {isClaimed ? "Verified business on Bloc" : "Info from Google Places · Not verified by owner"}
      </p>
    </div>
  );
}
