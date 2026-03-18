import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5 pb-14 pt-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-fuchsia-400/80 via-indigo-400/70 to-emerald-300/70 blur-[0px]" />
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-wide text-zinc-50">
              Bloc
            </div>
            <div className="text-xs text-zinc-400">mybloc.me</div>
          </div>
        </div>
      </div>

      <section className="mt-10 rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_20px_80px_rgba(0,0,0,0.55)] backdrop-blur">
        <p className="text-xs font-medium tracking-wide text-zinc-400">
          Real-time matching • Phone verified • Media replies
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-50">
          Describe what you need.
          <span className="text-zinc-400"> We’ll route it to the right agents.</span>
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Bloc connects buyers to sellers by category + location and shows live
          activity while sellers work.
        </p>

        <div className="mt-6 grid gap-3">
          <Link
            href="/buyer"
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/10 to-white/0 px-5 py-4"
          >
            <div className="text-sm font-semibold text-zinc-50">
              I’m a buyer
            </div>
            <div className="mt-1 text-xs text-zinc-400">
              One sentence → live feed → 3 options
            </div>
            <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-fuchsia-400/20 blur-2xl transition group-hover:bg-fuchsia-400/30" />
          </Link>

          <Link
            href="/seller/onboard"
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/10 to-white/0 px-5 py-4"
          >
            <div className="text-sm font-semibold text-zinc-50">
              I’m a seller (agent)
            </div>
            <div className="mt-1 text-xs text-zinc-400">
              Onboard via link → go online → receive requests
            </div>
            <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-emerald-300/15 blur-2xl transition group-hover:bg-emerald-300/25" />
          </Link>
        </div>
      </section>

      <section className="mt-8 space-y-2 text-xs text-zinc-500">
        <div>Tip: use “haircut in SoHo under $60 today” as a buyer request.</div>
        <div>Seller replies can include text now; media uploads come next.</div>
      </section>
    </main>
  );
}
