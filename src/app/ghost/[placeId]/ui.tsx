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

// ─── Sparkles ────────────────────────────────────────────────────────────────

function Sparkles({ color }: { color: string }) {
  const spots = useMemo(() => [
    { top: "12%", left: "6%", dur: "2.1s", delay: "0s", size: 16 },
    { top: "18%", left: "90%", dur: "2.8s", delay: "0.7s", size: 11 },
    { top: "35%", left: "4%", dur: "3.2s", delay: "1.4s", size: 9 },
    { top: "50%", left: "94%", dur: "2.4s", delay: "0.3s", size: 14 },
    { top: "65%", left: "12%", dur: "2.9s", delay: "1s", size: 10 },
    { top: "8%", left: "40%", dur: "2.2s", delay: "2s", size: 8 },
    { top: "75%", left: "82%", dur: "2.6s", delay: "0.5s", size: 12 },
  ], []);
  return (
    <div className="pointer-events-none absolute inset-0 z-[3] overflow-hidden">
      {spots.map((s, i) => (
        <span
          key={i}
          className="absolute animate-pulse"
          style={{
            top: s.top, left: s.left,
            fontSize: s.size,
            color,
            animationDuration: s.dur,
            animationDelay: s.delay,
          }}
        >
          ✦
        </span>
      ))}
    </div>
  );
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
  const textColor = isClaimed ? theme.colors.text : "#fff";
  const mutedColor = isClaimed ? theme.colors.textMuted : "rgba(255,255,255,0.5)";

  return (
    <div style={{ background: "#000" }}>

      {/* ═══════════════════════════════════════════════════════════════════
          HERO — full viewport, photo + overlay + content pinned to bottom
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="relative" style={{ height: "100vh", maxWidth: 600, margin: "0 auto" }}>

        {/* Photo — absolute, fills entire viewport */}
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

        {/* Gradient overlay — transparent top → black bottom */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.7) 75%, rgba(0,0,0,0.95) 100%)",
          }}
        />

        {/* Sparkles */}
        {isClaimed && theme.sparkles && <Sparkles color={accent} />}

        {/* ── Top bar ── */}
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 pt-5">
          <button
            type="button"
            onClick={() => { if (window.history.length > 1) router.back(); else router.push("/nearby"); }}
            className="flex h-[38px] w-[38px] items-center justify-center rounded-full border border-white/15 text-white"
            style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(12px)" }}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            {!isClaimed && (
              <span className="rounded-full px-2.5 py-1 text-[10px] font-medium text-white/50" style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(12px)" }}>
                Unclaimed
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                if (navigator.share) navigator.share({ title: ghost.name, url: window.location.href });
                else navigator.clipboard.writeText(window.location.href);
              }}
              className="flex h-[38px] w-[38px] items-center justify-center rounded-full border border-white/15 text-white"
              style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(12px)" }}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Content pinned to bottom of hero ── */}
        <div className="absolute inset-x-0 bottom-0 z-[5] px-6 pb-9">

          {/* Open / Closed badge */}
          <div className="mb-4">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide"
              style={{
                background: openStatus.isOpen ? "rgba(0,255,135,0.15)" : "rgba(255,255,255,0.1)",
                color: openStatus.isOpen ? "#00ff87" : "rgba(255,255,255,0.5)",
              }}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: openStatus.isOpen ? "#00ff87" : "rgba(255,255,255,0.3)" }}
              />
              {openStatus.isOpen ? "Open now" : "Closed"}
            </span>
          </div>

          {/* Business name — 42px */}
          <h1
            style={{
              fontSize: 42,
              fontWeight: 800,
              color: "#fff",
              lineHeight: 1.0,
              letterSpacing: -1.5,
              fontFamily: "'Instrument Serif', Georgia, serif",
              textShadow: "0 2px 20px rgba(0,0,0,0.5)",
              overflowWrap: "break-word",
            }}
          >
            {ghost.name}
          </h1>

          {/* Subtitle: category · city */}
          <p className="mt-2 text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
            {ghost.category && <span className="capitalize">{ghost.category}</span>}
            {city && <>{ghost.category && <span> · </span>}<span>{city}</span></>}
          </p>

          {/* ── Bottom row: metrics LEFT + Ask button RIGHT ── */}
          <div className="mt-7 flex items-center justify-between">
            {/* Left: metrics */}
            <div>
              {isClaimed ? (
                <div>
                  <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>Bloc seller since 2023</div>
                  <div className="mt-1 text-[13px] text-white/80">
                    😊 312 smiles · 1.5 yr on Bloc
                  </div>
                </div>
              ) : (
                <div className="text-[13px]" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {ghost.message_count > 0
                    ? `${ghost.message_count} ${ghost.message_count === 1 ? "person" : "people"} asked`
                    : "Be the first to ask"}
                </div>
              )}
            </div>

            {/* Right: circular Ask button — 100px, same row */}
            <Link
              href={`/ghost/${ghost.place_id}/chat`}
              className="flex flex-shrink-0 flex-col items-center justify-center gap-1 rounded-full transition-transform active:scale-95"
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
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          BELOW FOLD — scrolls below the hero
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="mx-auto max-w-[600px] px-6 pb-24 pt-7" style={{ background: "#000" }}>

        {/* ── Agent chat ── */}
        <div className="mb-5 text-[11px] uppercase tracking-[0.1em]" style={{ color: "#444" }}>
          Chat with {firstName}&apos;s agent
        </div>
        <div className="mb-5 overflow-hidden rounded-[18px] border border-[#1a1a1a]" style={{ background: "#0a0a0a" }}>
          {/* Agent header */}
          <div className="flex items-center gap-3 px-[18px] pb-3 pt-4">
            <div className="relative h-[38px] w-[38px] flex-shrink-0 overflow-hidden rounded-full bg-zinc-800">
              {ghost.photo_url && (
                <img src={ghost.photo_url} alt="" className="h-full w-full object-cover" />
              )}
              <div
                className="absolute bottom-[1px] right-[1px] h-[9px] w-[9px] rounded-full border-2"
                style={{ background: "#00ff87", borderColor: "#0a0a0a" }}
              />
            </div>
            <div>
              <div className="text-[13px] font-semibold text-[#e0e0e0]">{firstName}&apos;s Agent</div>
              <div className="text-[11px]" style={{ color: "rgba(0,255,135,0.47)" }}>● online · replies in ~2 min</div>
            </div>
          </div>

          {/* Chat bubbles */}
          <div className="flex flex-col gap-2 px-[18px] pb-4">
            <div
              className="max-w-[88%] rounded-2xl rounded-bl-[4px] px-3.5 py-2.5 text-[12px] leading-relaxed"
              style={{ background: "#141414", color: "#888" }}
            >
              {openStatus.isOpen
                ? <>Hi! How can I help you today? 🎉</>
                : <>We&apos;re currently closed{openStatus.nextChange ? `. ${openStatus.nextChange}` : ""}. Feel free to leave a message!</>}
            </div>
            <div
              className="ml-auto max-w-[88%] self-end rounded-2xl rounded-br-[4px] px-3.5 py-2.5 text-[12px] leading-relaxed text-white"
              style={{
                background: isClaimed
                  ? `linear-gradient(135deg, ${accent}, ${accent}cc)`
                  : "linear-gradient(135deg, #3f3f46, #52525b)",
              }}
            >
              Hi, are you open this weekend?
            </div>
          </div>

          {/* Ask button */}
          <Link
            href={`/ghost/${ghost.place_id}/chat`}
            className="mx-[18px] mb-4 block rounded-[14px] py-3.5 text-center text-[13px] font-semibold text-white"
            style={{
              background: isClaimed
                ? `linear-gradient(135deg, ${accent}, ${accent}cc)`
                : "linear-gradient(135deg, #3f3f46, #52525b)",
            }}
          >
            💬 Continue with {firstName}&apos;s agent
          </Link>
        </div>

        {/* ── Own this business (unclaimed) ── */}
        {!isClaimed && (
          <div className="mt-4 text-center text-[11px]">
            <span style={{ color: "#222" }}>Own this business? </span>
            <Link href={`/ghost/${ghost.place_id}/claim`} className="cursor-pointer" style={{ color: "#444" }}>
              Get discovered free →
            </Link>
          </div>
        )}

        {isClaimed && (
          <div className="mt-2 text-center text-[11px]" style={{ color: "#222" }}>
            Verified business on Bloc
          </div>
        )}
      </div>
    </div>
  );
}
