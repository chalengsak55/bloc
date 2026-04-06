"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getTheme } from "@/lib/storefront-config";

// ─── Types ────────────────────────────────────────────────────────────────────

type SellerProfile = {
  id: string;
  display_name: string | null;
  category: string | null;
  location_text: string | null;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  link_url: string | null;
  is_online: boolean;
  lat: number | null;
  lng: number | null;
  storefront_theme: string | null;
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
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
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

// ─── Seller Storefront (Partiful-style) ──────────────────────────────────────

export function SellerStorefront({ seller }: { seller: SellerProfile }) {
  const router = useRouter();
  const theme = getTheme(seller.storefront_theme);
  const hue = getHue(seller.id);
  const firstName = (seller.display_name ?? "").split(/[\s·|–-]/)[0].trim() || "there";

  return (
    <div className="relative min-h-screen" style={{ background: "#0a0a0f" }}>

      {/* ══════════════════════════════════════════════════════════════════════
          HERO — Full viewport photo + overlay
          ══════════════════════════════════════════════════════════════════════ */}
      <div className="relative h-screen w-full overflow-hidden">

        {/* Photo / gradient background */}
        {seller.cover_url ? (
          <img
            src={seller.cover_url}
            alt={seller.display_name ?? ""}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ opacity: theme.photoOpacity }}
          />
        ) : seller.avatar_url ? (
          <img
            src={seller.avatar_url}
            alt={seller.display_name ?? ""}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ opacity: theme.photoOpacity }}
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, hsl(${hue},60%,22%), hsl(${(hue + 60) % 360},50%,16%))`,
            }}
          />
        )}

        {/* Theme gradient tint */}
        <div className="absolute inset-0" style={{ background: theme.colors.backgroundGradient, opacity: 0.3 }} />

        {/* Dark gradient — bottom 60% fades to black */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 from-5% via-black/40 via-40% to-transparent" />

        {/* Sparkles */}
        {theme.sparkles && <Sparkles color={theme.colors.accent} />}

        {/* ── Top bar ── */}
        <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top,14px),14px)]">
          {/* Back */}
          <button
            type="button"
            onClick={() => { if (window.history.length > 1) router.back(); else router.push("/nearby"); }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white/80 backdrop-blur-md transition active:scale-95"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Share */}
          <button
            type="button"
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: seller.display_name ?? "Bloc", url: window.location.href });
              } else {
                navigator.clipboard.writeText(window.location.href);
              }
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white/80 backdrop-blur-md transition active:scale-95"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
        </div>

        {/* ── Bottom overlay content ── */}
        <div className="absolute inset-x-0 bottom-0 z-10 px-6 pb-8">

          {/* Availability badge */}
          <div className="mb-3">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide"
              style={{
                background: seller.is_online ? `${theme.colors.accent}20` : "rgba(113,113,122,0.2)",
                color: seller.is_online ? theme.colors.accent : "#71717a",
              }}
            >
              <span
                className={`h-2 w-2 rounded-full ${seller.is_online ? "" : ""}`}
                style={{ background: seller.is_online ? theme.colors.accent : "#71717a" }}
              />
              {seller.is_online ? "Available now" : "Unavailable"}
            </span>
          </div>

          {/* Business name — 42px */}
          <h1
            className="leading-[1.05] tracking-tight"
            style={{
              fontSize: "42px",
              fontFamily: "'Instrument Serif', Georgia, serif",
              color: theme.colors.text,
            }}
          >
            {seller.display_name ?? "Business"}
          </h1>

          {/* Subtitle: category · location */}
          <p className="mt-2 text-sm" style={{ color: theme.colors.textMuted }}>
            {seller.category && <span className="capitalize">{seller.category}</span>}
            {seller.location_text && (
              <>
                {seller.category && <span> · </span>}
                <span>{seller.location_text}</span>
              </>
            )}
          </p>

          {/* Bottom row: metrics left, Ask button right */}
          <div className="mt-5 flex items-end justify-between">
            {/* Trust metrics — left side */}
            <div className="flex items-center gap-4">
              <div>
                <span className="text-lg font-bold" style={{ color: theme.colors.text }}>98%</span>
                <span className="ml-1 text-[11px]" style={{ color: theme.colors.textMuted }}>smiles</span>
              </div>
              <div className="h-4 w-px" style={{ background: `${theme.colors.textMuted}40` }} />
              <div>
                <span className="text-lg font-bold" style={{ color: theme.colors.text }}>2yr</span>
                <span className="ml-1 text-[11px]" style={{ color: theme.colors.textMuted }}>on Bloc</span>
              </div>
            </div>

            {/* Ask button — 90px circular, Partiful style */}
            <Link
              href={`/message/${seller.id}`}
              className="flex flex-col items-center justify-center rounded-full transition-transform active:scale-95"
              style={{
                width: 90,
                height: 90,
                background: `linear-gradient(135deg, ${theme.colors.accent}, ${theme.colors.accent}bb)`,
                boxShadow: `0 8px 40px ${theme.colors.accent}50, 0 0 80px ${theme.colors.accent}20`,
              }}
            >
              <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                Ask
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SCROLL-DOWN CONTENT
          ══════════════════════════════════════════════════════════════════════ */}
      <div style={{ background: theme.colors.backgroundGradient }}>

        {/* ── About section ── */}
        {seller.bio && (
          <div className="px-6 pt-8">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest" style={{ color: theme.colors.textMuted }}>
              About
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: theme.colors.text }}>
              {seller.bio}
            </p>
          </div>
        )}

        {/* ── Agent chat preview ── */}
        <div className="px-6 pt-8 pb-12">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest" style={{ color: theme.colors.textMuted }}>
            Agent
          </h2>
          <div
            className="rounded-2xl border px-5 py-4"
            style={{ borderColor: `${theme.colors.accent}25`, background: theme.colors.surface }}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full"
                style={{ background: `${theme.colors.accent}25` }}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill={theme.colors.accent}>
                  <path d="M13 2L4.09 12.63a1 1 0 00.78 1.62H11l-1 7.75L19.91 11.37a1 1 0 00-.78-1.62H13l1-7.75z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: theme.colors.text }}>
                  Ask {firstName}
                </p>
                <p className="text-xs" style={{ color: theme.colors.textMuted }}>
                  Agent replies in ~2 min · 24/7
                </p>
              </div>
            </div>

            {/* Chat preview bubbles */}
            <div className="mt-4 space-y-2">
              <div
                className="ml-auto w-fit max-w-[75%] rounded-2xl rounded-br-md px-3.5 py-2 text-[13px]"
                style={{ background: `${theme.colors.accent}20`, color: theme.colors.text }}
              >
                Hi, are you available this weekend?
              </div>
              <div
                className="w-fit max-w-[75%] rounded-2xl rounded-bl-md px-3.5 py-2 text-[13px]"
                style={{ background: theme.colors.surface, color: theme.colors.text, border: `1px solid ${theme.colors.accent}15` }}
              >
                Hey! Yes, I have openings Saturday and Sunday. What time works for you?
              </div>
            </div>

            {/* Ask button */}
            <Link
              href={`/message/${seller.id}`}
              className="mt-4 flex w-full items-center justify-center rounded-full py-3 text-sm font-semibold text-white transition active:scale-[0.98]"
              style={{ background: `linear-gradient(135deg, ${theme.colors.accent}, ${theme.colors.accent}cc)` }}
            >
              Ask {firstName} anything →
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="pb-8 text-center text-[11px]" style={{ color: theme.colors.textMuted }}>
          Verified business on Bloc
        </p>
      </div>
    </div>
  );
}
