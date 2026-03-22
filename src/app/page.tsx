import Link from "next/link";
import { LivePill } from "./home-pill";
import { LiveTicker } from "./live-ticker";

export default function Home() {
  return (
    <>
    <main className="flex min-h-screen flex-col pb-24">
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
                Find what you need, nearby
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

        {/* ── Seller CTA ──────────────────────────────────────────────── */}
        <Link
          href="/seller/onboarding"
          className="block text-center text-xs text-zinc-500 transition-colors hover:text-zinc-300"
        >
          Are you a business? Join as a seller &rarr;
        </Link>
      </div>
      </div>
    </main>

    {/* ── Bottom tab bar ────────────────────────────────────────────── */}
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/[0.08] bg-black/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-xl items-end justify-around px-2 pb-safe pt-2">

        {/* Home — active */}
        <div className="flex flex-col items-center gap-0.5 pb-1">
          <svg className="h-5 w-5 text-[#7c5ce8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.75L12 3l9 6.75V21a.75.75 0 01-.75.75H15.75v-5.25a.75.75 0 00-.75-.75h-6a.75.75 0 00-.75.75V21.75H3.75A.75.75 0 013 21V9.75z" />
          </svg>
          <span className="text-[10px] text-[#7c5ce8]">Home</span>
        </div>

        {/* Nearby */}
        <Link href="/nearby" className="flex flex-col items-center gap-0.5 pb-1">
          <svg className="h-5 w-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503-9.998l2.747-.756A.75.75 0 0119 7.944v9.32a.75.75 0 01-.503.712l-3 .822a.75.75 0 01-.397 0l-4.2-1.155a.75.75 0 00-.397 0l-2.747.756A.75.75 0 015 17.056V7.736a.75.75 0 01.503-.712l3-.822a.75.75 0 01.397 0l4.2 1.155a.75.75 0 00.397 0z" />
          </svg>
          <span className="text-[10px] text-zinc-500">Nearby</span>
        </Link>

        {/* Broadcast FAB */}
        <Link href="/broadcast" className="relative -mt-6 flex flex-col items-center">
          <span className="absolute inset-0 m-auto h-14 w-14 rounded-full opacity-40" style={{ background: "linear-gradient(135deg,#7c5ce8,#4d9ef5,#00d4c8)", animation: "fab-ripple 2s ease-out infinite" }} />
          <span className="absolute inset-0 m-auto h-14 w-14 rounded-full opacity-20" style={{ background: "linear-gradient(135deg,#7c5ce8,#4d9ef5,#00d4c8)", animation: "fab-ripple 2s ease-out 0.6s infinite" }} />
          <span className="relative flex h-14 w-14 items-center justify-center rounded-full shadow-lg" style={{ background: "linear-gradient(135deg,#7c5ce8,#4d9ef5,#00d4c8)" }}>
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
              <path strokeLinecap="round" d="M7 17A7 7 0 017 7" />
              <path strokeLinecap="round" d="M17 7a7 7 0 010 10" />
            </svg>
          </span>
          <span className="mt-1 text-[10px] text-zinc-400">Broadcast</span>
        </Link>

        {/* Inbox */}
        <Link href="/inbox" className="flex flex-col items-center gap-0.5 pb-1">
          <svg className="h-5 w-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859M12 3v8.25m0 0l-3-3m3 3l3-3" />
          </svg>
          <span className="text-[10px] text-zinc-500">Inbox</span>
        </Link>

        {/* Profile */}
        <Link href="/profile" className="flex flex-col items-center gap-0.5 pb-1">
          <svg className="h-5 w-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
          <span className="text-[10px] text-zinc-500">Profile</span>
        </Link>

      </div>
    </nav>
    </>
  );
}
