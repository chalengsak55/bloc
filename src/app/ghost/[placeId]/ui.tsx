"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isOpenNow, type GooglePeriod } from "@/lib/ghost-hours";
import { getTheme } from "@/lib/storefront-config";

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

function getHue(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}

// ─── Ghost Storefront ────────────────────────────────────────────────────────

export function GhostStorefront({
  ghost,
  isClaimed = false,
  themeId = null,
}: {
  ghost: GhostBusiness;
  isClaimed?: boolean;
  themeId?: string | null;
}) {
  const router = useRouter();
  const theme = isClaimed ? getTheme(themeId) : getTheme("dark_neon");
  const hue = getHue(ghost.place_id);
  const openStatus = useMemo(
    () => isOpenNow(ghost.opening_hours, ghost.timezone),
    [ghost.opening_hours, ghost.timezone],
  );
  const firstName = ghost.name.split(/[\s·|–-]/)[0].trim();
  const city = (() => {
    if (!ghost.address) return "";
    const parts = ghost.address.split(",").map((s) => s.trim());
    if (parts.length >= 2) return parts[1].replace(/\s+\d{5}.*$/, "");
    return parts[0];
  })();

  const accent = isClaimed ? theme.colors.accent : "rgba(255,255,255,0.5)";

  // Sparkle positions matching the HTML mockup
  const sparkles = useMemo(() => [
    { top: "12%", left: "6%", dur: "2.1s", delay: "0s", size: 16 },
    { top: "18%", left: "90%", dur: "2.8s", delay: "0.7s", size: 11 },
    { top: "35%", left: "4%", dur: "3.2s", delay: "1.4s", size: 9 },
    { top: "50%", left: "94%", dur: "2.4s", delay: "0.3s", size: 14 },
    { top: "65%", left: "12%", dur: "2.9s", delay: "1s", size: 10 },
    { top: "8%", left: "40%", dur: "2.2s", delay: "2s", size: 8 },
    { top: "75%", left: "82%", dur: "2.6s", delay: "0.5s", size: 12 },
  ], []);

  return (
    <div style={{ background: "#000" }}>

      {/* ═══════════════════════════════════════════════════════════════════
          HERO — full viewport photo with content overlay
          Matches HTML mockup: .page { height: 700px }
          ═══════════════════════════════════════════════════════════════════ */}
      <div
        className="relative mx-auto overflow-hidden"
        style={{ width: "100%", maxWidth: 600, height: "100dvh" }}
      >
        {/* ── Photo background ── */}
        {ghost.photo_url ? (
          <img
            src={ghost.photo_url}
            alt={ghost.name}
            className="absolute inset-0 h-full w-full object-cover"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: isClaimed
                ? theme.colors.backgroundGradient
                : `linear-gradient(135deg, hsl(${hue},50%,22%), hsl(${(hue + 60) % 360},40%,16%))`,
            }}
          />
        )}

        {/* ── Gradient overlay ── */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.7) 75%, rgba(0,0,0,0.95) 100%)",
          }}
        />

        {/* ── Sparkles (claimed only) ── */}
        {(
          <div className="pointer-events-none absolute inset-0 z-[3]">
            {sparkles.map((s, i) => (
              <span
                key={i}
                className="absolute"
                style={{
                  top: s.top,
                  left: s.left,
                  fontSize: s.size,
                  color: "#fff",
                  animation: `sparkle-anim ${s.dur} ease-in-out infinite`,
                  animationDelay: s.delay,
                }}
              >
                ✦
              </span>
            ))}
          </div>
        )}

        {/* ── Top bar ── */}
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-[22px] pt-5">
          <button
            type="button"
            onClick={() => { if (window.history.length > 1) router.back(); else router.push("/nearby"); }}
            className="flex h-[38px] w-[38px] items-center justify-center rounded-full border border-white/[0.15] text-lg text-white"
            style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(12px)" }}
          >
            ←
          </button>
          <div className="flex gap-2">
            {!isClaimed && (
              <span
                className="flex items-center rounded-full px-2.5 py-1 text-[10px] font-medium text-white/50"
                style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(12px)" }}
              >
                Unclaimed
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                if (navigator.share) navigator.share({ title: ghost.name, url: window.location.href });
                else navigator.clipboard.writeText(window.location.href);
              }}
              className="flex h-[38px] w-[38px] items-center justify-center rounded-full border border-white/[0.15] text-lg text-white"
              style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(12px)" }}
            >
              ···
            </button>
          </div>
        </div>

        {/* ── Content overlay — flex column, fills hero ── */}
        <div
          className="absolute inset-0 z-[5] flex flex-col"
          style={{ padding: "90px 24px 36px" }}
        >
          {/* ── Name — TOP, 52px ── */}
          <h1
            style={{
              fontSize: 52,
              fontWeight: 800,
              color: "#fff",
              lineHeight: 1.0,
              letterSpacing: -2,
              marginBottom: 20,
              textShadow: "0 2px 20px rgba(0,0,0,0.5)",
              fontFamily: "'Instrument Serif', Georgia, serif",
              overflowWrap: "break-word",
            }}
          >
            {ghost.name}
          </h1>

          {/* ── Info items — below name, pushes bottom row down ── */}
          <div className="flex flex-col gap-2.5" style={{ marginBottom: "auto" }}>
            {/* Availability */}
            <div className="flex items-center gap-2 text-sm text-white/80">
              <span>📅</span>
              <span className="font-medium text-white">
                {openStatus.isOpen ? "Available now" : "Currently closed"}
              </span>
            </div>
            {/* Location */}
            {city && (
              <div className="flex items-center gap-2 text-sm text-white/80">
                <span>📍</span>
                <span className="font-medium text-white">{city}</span>
              </div>
            )}
            {/* Category */}
            {ghost.category && (
              <div className="flex items-center gap-2 text-sm text-white/80">
                <span>🏷️</span>
                <span className="font-medium capitalize text-white">{ghost.category}</span>
              </div>
            )}
            {/* Open status */}
            {openStatus.isOpen && (
              <div className="flex items-center gap-2 text-sm" style={{ color: "#00ff87" }}>
                <span>●</span>
                <span className="font-medium" style={{ color: "#00ff87" }}>Open now</span>
              </div>
            )}
          </div>

          {/* ── Bottom row — host LEFT + Ask button RIGHT ── */}
          <div className="mt-7 flex items-end justify-between">
            {/* Left: host/seller info */}
            <div className="flex-1">
              {isClaimed ? (
                <>
                  <div className="text-[11px] text-white/40">Bloc seller since 2023</div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-bold text-white"
                      style={{ background: `linear-gradient(135deg, ${accent}, ${accent}88)` }}
                    >
                      {firstName[0]}
                    </div>
                    <div>
                      <div className="text-[13px] font-medium text-white">{ghost.name}</div>
                      <div className="text-[11px] text-white/40">😊 312 smiles · 1.5 yr on Bloc</div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-[11px] text-white/40">Business on Bloc</div>
                  <div className="mt-1 text-[13px] text-white/60">
                    {ghost.message_count > 0
                      ? `${ghost.message_count} ${ghost.message_count === 1 ? "person" : "people"} asked`
                      : "Be the first to ask"}
                  </div>
                </>
              )}
            </div>

            {/* Right: circular Ask button — 100px */}
            <div className="flex flex-shrink-0 flex-col items-center gap-2">
              <Link
                href={`/ghost/${ghost.place_id}/chat`}
                className="flex flex-col items-center justify-center gap-1.5 rounded-full transition-transform active:scale-95"
                style={{
                  width: 100,
                  height: 100,
                  background: isClaimed
                    ? `linear-gradient(135deg, ${accent}, ${accent}cc)`
                    : "rgba(255,255,255,0.18)",
                  backdropFilter: isClaimed ? undefined : "blur(16px)",
                  border: isClaimed ? "none" : "1.5px solid rgba(255,255,255,0.4)",
                  boxShadow: isClaimed ? `0 8px 40px ${accent}50` : undefined,
                }}
              >
                <span className="text-[32px]">💬</span>
                <span className="text-[12px] font-semibold text-white">Ask {firstName}</span>
              </Link>
              {/* Share circle below Ask */}
              <button
                type="button"
                onClick={() => {
                  if (navigator.share) navigator.share({ title: ghost.name, url: window.location.href });
                  else navigator.clipboard.writeText(window.location.href);
                }}
                className="ml-auto flex h-[44px] w-[44px] items-center justify-center rounded-full border border-white/[0.15] text-sm text-white"
                style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(12px)" }}
              >
                ↗
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer (below hero) ── */}
      {!isClaimed && (
        <div className="mx-auto max-w-[600px] px-6 py-6" style={{ background: "#000" }}>
          <div className="text-center text-[11px]">
            <span style={{ color: "#222" }}>Own this business? </span>
            <Link href={`/ghost/${ghost.place_id}/claim`} style={{ color: "#444" }}>
              Get discovered free →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
