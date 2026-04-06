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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getHue(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}

// ─── Sparkles ────────────────────────────────────────────────────────────────

function Sparkles({ color }: { color: string }) {
  const particles = useMemo(() =>
    Array.from({ length: 24 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      delay: `${Math.random() * 5}s`,
      duration: `${2 + Math.random() * 3}s`,
      size: 1 + Math.random() * 2.5,
    })),
  []);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute animate-pulse rounded-full"
          style={{
            left: p.left, top: p.top,
            width: p.size, height: p.size,
            background: color,
            animationDelay: p.delay,
            animationDuration: p.duration,
            opacity: 0.5,
          }}
        />
      ))}
    </div>
  );
}

// ─── Ghost Storefront (Partiful-style) ───────────────────────────────────────

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

  const accent = isClaimed ? theme.colors.accent : "#52525b";
  const textColor = isClaimed ? theme.colors.text : "#d4d4d8";
  const mutedColor = isClaimed ? theme.colors.textMuted : "#71717a";
  const surfaceBg = isClaimed ? theme.colors.surface : "rgba(255,255,255,0.03)";
  const surfaceBorder = isClaimed ? `${theme.colors.accent}25` : "rgba(255,255,255,0.06)";
  const photoOp = isClaimed ? theme.photoOpacity : 0.6;

  return (
    <div className="min-h-screen" style={{ background: isClaimed ? theme.colors.backgroundGradient : "#0a0a0f" }}>

      {/* ═══════════════════════════════════════════════════════════════════
          HERO PHOTO — top portion with gradient fade
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="relative" style={{ height: "55vh" }}>
        {/* Photo background — Google Places photo or theme gradient fallback */}
        {ghost.photo_url ? (
          <img
            src={ghost.photo_url}
            alt={ghost.name}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ opacity: photoOp }}
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

        {/* Theme tint (claimed) */}
        {isClaimed && (
          <div className="absolute inset-0" style={{ background: theme.colors.backgroundGradient, opacity: 0.2 }} />
        )}

        {/* Gradient fade to content bg */}
        <div
          className="absolute inset-0"
          style={{
            background: isClaimed
              ? "linear-gradient(to bottom, transparent 30%, rgba(10,10,15,0.5) 60%, rgba(10,10,15,1) 100%)"
              : "linear-gradient(to bottom, transparent 30%, rgba(10,10,15,0.5) 60%, #0a0a0f 100%)",
          }}
        />

        {/* Sparkles */}
        {isClaimed && theme.sparkles && <Sparkles color={theme.colors.accent} />}

        {/* Top bar */}
        <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top,14px),14px)]">
          <button
            type="button"
            onClick={() => { if (window.history.length > 1) router.back(); else router.push("/nearby"); }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white/80 backdrop-blur-md transition active:scale-95"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            {!isClaimed && (
              <span className="rounded-full bg-zinc-800/70 px-2.5 py-1 text-[10px] font-medium text-zinc-400 backdrop-blur-sm">
                Unclaimed
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                if (navigator.share) navigator.share({ title: ghost.name, url: window.location.href });
                else navigator.clipboard.writeText(window.location.href);
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white/80 backdrop-blur-md transition active:scale-95"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          CONTENT — normal document flow, NOT absolute/fixed
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="mx-auto max-w-[600px] px-6 pb-12" style={{ marginTop: "-1rem" }}>

        {/* Open / Closed pill */}
        <div className="mb-3">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide"
            style={{
              background: openStatus.isOpen ? `${accent}20` : "rgba(113,113,122,0.2)",
              color: openStatus.isOpen ? (isClaimed ? accent : "#34d399") : "#71717a",
            }}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: openStatus.isOpen ? (isClaimed ? accent : "#34d399") : "#71717a" }}
            />
            {openStatus.isOpen ? "Open now" : "Closed"}
          </span>
        </div>

        {/* Business name — 42px */}
        <h1
          className="leading-[1.05] tracking-tight"
          style={{
            fontSize: "42px",
            fontFamily: "'Instrument Serif', Georgia, serif",
            color: isClaimed ? textColor : "rgba(255,255,255,0.85)",
            overflowWrap: "break-word",
            wordBreak: "break-word",
          }}
        >
          {ghost.name}
        </h1>

        {/* Subtitle */}
        <p className="mt-2 text-sm" style={{ color: mutedColor }}>
          {ghost.category && <span className="capitalize">{ghost.category}</span>}
          {city && <>{ghost.category && <span> · </span>}<span>{city}</span></>}
        </p>

        {/* ── Bottom row: metrics LEFT + Ask button RIGHT ── */}
        <div className="mt-6 flex items-center justify-between">
          {/* Left: metrics */}
          <div className="flex items-center gap-4">
            {isClaimed ? (
              <>
                <div>
                  <span className="text-lg font-bold" style={{ color: textColor }}>98%</span>
                  <span className="ml-1 text-[11px]" style={{ color: mutedColor }}>smiles</span>
                </div>
                <div className="h-4 w-px" style={{ background: `${mutedColor}40` }} />
                <div>
                  <span className="text-lg font-bold" style={{ color: textColor }}>2yr</span>
                  <span className="ml-1 text-[11px]" style={{ color: mutedColor }}>on Bloc</span>
                </div>
              </>
            ) : (
              <div className="text-[12px]" style={{ color: mutedColor }}>
                {ghost.message_count > 0
                  ? `${ghost.message_count} ${ghost.message_count === 1 ? "person" : "people"} asked`
                  : "Be the first to ask"}
              </div>
            )}
          </div>

          {/* Right: 90px circular Ask button — normal flow, NOT floating */}
          <Link
            href={`/ghost/${ghost.place_id}/chat`}
            className="flex flex-shrink-0 flex-col items-center justify-center rounded-full transition-transform active:scale-95"
            style={{
              width: 90,
              height: 90,
              background: isClaimed
                ? `linear-gradient(135deg, ${accent}, ${accent}bb)`
                : "linear-gradient(135deg, #3f3f46, #27272a)",
              boxShadow: isClaimed
                ? `0 8px 40px ${accent}50, 0 0 80px ${accent}20`
                : "0 8px 24px rgba(0,0,0,0.4)",
            }}
          >
            <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-white">Ask</span>
          </Link>
        </div>

        {/* ── Agent chat preview ── */}
        <div className="mt-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest" style={{ color: mutedColor }}>
            Agent
          </h2>
          <div
            className="rounded-2xl border px-5 py-4"
            style={{ borderColor: surfaceBorder, background: surfaceBg }}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full"
                style={{ background: isClaimed ? `${accent}25` : "rgba(63,63,70,0.5)" }}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill={isClaimed ? accent : "#71717a"}>
                  <path d="M13 2L4.09 12.63a1 1 0 00.78 1.62H11l-1 7.75L19.91 11.37a1 1 0 00-.78-1.62H13l1-7.75z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: isClaimed ? textColor : "#d4d4d8" }}>
                  {isClaimed ? `Ask ${firstName}` : "AI Agent"}
                </p>
                <p className="text-xs" style={{ color: mutedColor }}>
                  {isClaimed ? "Replies in ~2 min · 24/7" : "Public data only"}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div
                className="ml-auto w-fit max-w-[75%] rounded-2xl rounded-br-md px-3.5 py-2 text-[13px]"
                style={{ background: isClaimed ? `${accent}20` : "rgba(63,63,70,0.3)", color: isClaimed ? textColor : "#d4d4d8" }}
              >
                Hi, are you open this weekend?
              </div>
              <div
                className="w-fit max-w-[75%] rounded-2xl rounded-bl-md border px-3.5 py-2 text-[13px]"
                style={{ background: surfaceBg, borderColor: surfaceBorder, color: isClaimed ? textColor : "#a1a1aa" }}
              >
                {openStatus.isOpen
                  ? "Yes! We're open right now. How can I help you?"
                  : `We're currently closed${openStatus.nextChange ? `. ${openStatus.nextChange}` : ""}. Feel free to leave a message!`}
              </div>
            </div>

            <Link
              href={`/ghost/${ghost.place_id}/chat`}
              className="mt-4 flex w-full items-center justify-center rounded-full py-3 text-sm font-semibold text-white transition active:scale-[0.98]"
              style={{
                background: isClaimed
                  ? `linear-gradient(135deg, ${accent}, ${accent}cc)`
                  : "linear-gradient(135deg, #3f3f46, #27272a)",
              }}
            >
              {isClaimed ? `Ask ${firstName} anything →` : `Ask about ${firstName} →`}
            </Link>
          </div>
        </div>

        {/* ── Own this business (unclaimed only) ── */}
        {!isClaimed && (
          <div className="mt-8">
            <Link
              href={`/ghost/${ghost.place_id}/claim`}
              className="flex items-center justify-center rounded-full py-3.5 text-center text-sm font-bold text-white transition active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg, #7c5ce8, #4d9ef5, #00d4c8)" }}
            >
              Own this business? Get discovered free →
            </Link>
          </div>
        )}

        {/* Footer */}
        <p className="pt-6 text-center text-[11px]" style={{ color: mutedColor }}>
          {isClaimed ? "Verified business on Bloc" : "Info from Google Places · Not verified by owner"}
        </p>
      </div>
    </div>
  );
}
