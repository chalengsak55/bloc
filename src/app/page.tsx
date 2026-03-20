import Link from "next/link";
import { LivePill } from "./home-pill";
import { LiveTicker } from "./live-ticker";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <LiveTicker />
      <div className="flex flex-1 flex-col items-center justify-center px-5 py-12">
      <div className="flex w-full max-w-sm flex-col gap-8">

        {/* ── Logo ─────────────────────────────────────────────────────── */}
        <div>
          <h1
            className="text-7xl tracking-tight"
            style={{
              fontFamily: "var(--font-instrument-serif), Georgia, serif",
              background: 'linear-gradient(135deg, #7c5ce8, #4d9ef5, #00d4c8)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Bloc.
          </h1>
          <p className="mt-3 text-xl font-normal text-zinc-300">
            What do you need today?
          </p>
        </div>

        {/* ── Live pill ─────────────────────────────────────────────────── */}
        <div>
          <LivePill />
        </div>

        {/* ── Mode cards ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">

          {/* Broadcast — gradient */}
          <Link
            href="/broadcast"
            className="group relative flex min-h-[220px] flex-col overflow-hidden rounded-2xl p-5"
            style={{
              background:
                "linear-gradient(135deg, rgba(124,92,232,0.9), rgba(77,158,245,0.85), rgba(0,212,200,0.8))",
            }}
          >
            {/* Ripple wave icon */}
            <div className="relative flex h-12 w-12 items-center justify-center">
              <span
                className="absolute h-12 w-12 rounded-full bg-white/25"
                style={{ animation: "ripple-ring 2.4s ease-out infinite" }}
              />
              <span
                className="absolute h-12 w-12 rounded-full bg-white/18"
                style={{ animation: "ripple-ring 2.4s ease-out 0.7s infinite" }}
              />
              <span
                className="absolute h-12 w-12 rounded-full bg-white/10"
                style={{ animation: "ripple-ring 2.4s ease-out 1.4s infinite" }}
              />
              <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-white/30 backdrop-blur-sm">
                <svg
                  className="h-4 w-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
                  <path strokeLinecap="round" d="M7 17A7 7 0 017 7" />
                  <path strokeLinecap="round" d="M17 7a7 7 0 010 10" />
                  <path strokeLinecap="round" d="M4.2 19.8A13 13 0 014.2 4.2" />
                  <path strokeLinecap="round" d="M19.8 4.2a13 13 0 010 15.6" />
                </svg>
              </span>
            </div>

            <div className="mt-auto pt-6">
              <div className="text-base font-semibold text-white">Broadcast</div>
              <div className="mt-1 text-[13px] leading-snug text-white/75">
                Tell us what you need — sellers come to you
              </div>
            </div>

            {/* Subtle shine on hover */}
            <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.08), transparent)" }}
            />
          </Link>

          {/* Nearby — dark with border */}
          <Link
            href="/nearby"
            className="group relative flex min-h-[220px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition-colors hover:bg-white/[0.07]"
          >
            {/* Mini grid icon with live dots */}
            <div className="grid grid-cols-3 gap-1">
              {[true, false, true, false, true, false, true, true, false].map(
                (live, i) => (
                  <div
                    key={i}
                    className="flex h-3 w-3 items-center justify-center rounded-sm bg-white/[0.07]"
                  >
                    {live ? (
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                        <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      </span>
                    ) : (
                      <span className="h-1 w-1 rounded-full bg-zinc-700" />
                    )}
                  </div>
                ),
              )}
            </div>

            <div className="mt-auto pt-6">
              <div className="text-base font-semibold text-zinc-100">Nearby</div>
              <div className="mt-1 text-[13px] leading-snug text-zinc-400">
                See who&apos;s live near you now
              </div>
            </div>

            {/* Border glow on hover */}
            <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{ boxShadow: "inset 0 0 0 1px rgba(124,92,232,0.3)" }}
            />
          </Link>
        </div>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <p
          className="text-center text-2xl font-bold text-white"
          style={{ fontFamily: "var(--font-dm-sans), ui-sans-serif, sans-serif" }}
        >
          Quality wins. Not ad budget.
        </p>
      </div>
      </div>
    </main>
  );
}
