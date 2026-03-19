import { Suspense } from "react";
import Link from "next/link";
import { AuthPanel } from "./ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in — Bloc | mybloc.me" };

export default function AuthPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-5 py-12 bg-[#0d0d12]">
      <div className="w-full max-w-sm space-y-8">

        {/* Back */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-zinc-300"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Home
        </Link>

        {/* Heading */}
        <div>
          <h1
            className="text-6xl tracking-tight"
            style={{
              fontFamily: "var(--font-instrument-serif), Georgia, serif",
              background: "linear-gradient(135deg, #7c5ce8, #4d9ef5, #00d4c8)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Sign in.
          </h1>
          <p className="mt-3 text-base text-zinc-400">
            Your requests. Your sellers.
          </p>
        </div>

        {/* AuthPanel uses useSearchParams — must be inside Suspense */}
        <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-white/[0.03]" />}>
          <AuthPanel />
        </Suspense>

      </div>
    </main>
  );
}
