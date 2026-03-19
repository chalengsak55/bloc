import Link from "next/link";

export const metadata = { title: "Inbox — Bloc | mybloc.me" };

export default function InboxPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0d0d12] px-5 py-12">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
          style={{ background: "linear-gradient(135deg, #7c5ce8, #4d9ef5, #00d4c8)" }}
        >
          <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>

        <div>
          <h1
            className="text-4xl text-zinc-50"
            style={{ fontFamily: "var(--font-instrument-serif), Georgia, serif" }}
          >
            Message sent.
          </h1>
          <p className="mt-3 text-sm text-zinc-400">
            Your message is on its way. Inbox coming soon.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href="/nearby"
            className="rounded-2xl py-3.5 text-sm font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #7c5ce8, #4d9ef5, #00d4c8)" }}
          >
            Back to Nearby
          </Link>
          <Link
            href="/"
            className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
