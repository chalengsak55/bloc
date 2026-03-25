"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type GhostBusiness = {
  id: string;
  place_id: string;
  name: string;
  category: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  photo_url: string | null;
  lat: number | null;
  lng: number | null;
};

// ─── Claim Flow ───────────────────────────────────────────────────────────────

export function ClaimFlow({ ghost }: { ghost: GhostBusiness }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"auth" | "confirm" | "done">("auth");

  // Check auth
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (u) {
        setUser({ id: u.id, email: u.email ?? undefined });
        setStep("confirm");
      }
    });
  }, [supabase]);

  // Google sign in
  const signInGoogle = useCallback(async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/ghost/${ghost.place_id}/claim`,
      },
    });
  }, [supabase, ghost.place_id]);

  // Magic link
  const [email, setEmail] = useState("");
  const [magicSent, setMagicSent] = useState(false);

  const sendMagicLink = useCallback(async () => {
    if (!email.trim()) return;
    await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/ghost/${ghost.place_id}/claim`,
      },
    });
    setMagicSent(true);
  }, [supabase, email, ghost.place_id]);

  // Claim
  const handleClaim = useCallback(async () => {
    if (!confirmed || claiming) return;
    setClaiming(true);
    setError(null);

    try {
      const res = await fetch("/api/ghost/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeId: ghost.place_id }),
      });

      const data = await res.json();
      if (data.ok) {
        setStep("done");
        setTimeout(() => router.push("/seller/dashboard"), 1500);
      } else {
        setError(data.error ?? "Claim failed. Try again.");
      }
    } catch {
      setError("Network error. Try again.");
    }

    setClaiming(false);
  }, [confirmed, claiming, ghost.place_id, router]);

  const hue = getHue(ghost.place_id);

  return (
    <div className="flex min-h-dvh flex-col bg-[#0d0d12]">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 pb-3"
        style={{ paddingTop: "max(env(safe-area-inset-top, 12px), 12px)" }}
      >
        <button
          type="button"
          onClick={() => router.push(`/ghost/${ghost.place_id}`)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-zinc-400"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-white">Claim your business</h1>
      </div>

      <div className="flex-1 px-5 pt-4">
        {/* Business card */}
        <div className="flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
          {ghost.photo_url ? (
            <img src={ghost.photo_url} alt="" className="h-14 w-14 rounded-xl object-cover" />
          ) : (
            <div
              className="flex h-14 w-14 items-center justify-center rounded-xl text-lg font-bold text-white"
              style={{ background: `linear-gradient(135deg, hsl(${hue},60%,35%), hsl(${(hue + 60) % 360},50%,30%))` }}
            >
              {ghost.name.charAt(0)}
            </div>
          )}
          <div>
            <p className="font-semibold text-white">{ghost.name}</p>
            {ghost.address && <p className="text-xs text-zinc-500">{ghost.address.split(",")[0]}</p>}
            {ghost.category && <p className="text-xs text-zinc-500">{ghost.category}</p>}
          </div>
        </div>

        {/* ── Step: Auth ── */}
        {step === "auth" && (
          <div className="mt-8">
            <h2 className="mb-2 text-base font-semibold text-white">Step 1: Verify your identity</h2>
            <p className="mb-6 text-sm text-zinc-400">Sign in to claim this business on Bloc.</p>

            <button
              type="button"
              onClick={signInGoogle}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-white/10 py-3 text-sm font-semibold text-white transition active:bg-white/[0.03]"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs text-zinc-500">or</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            {!magicSent ? (
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="flex-1 rounded-full bg-white/[0.06] px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none focus:ring-1 focus:ring-[#7c5ce8]"
                  onKeyDown={(e) => e.key === "Enter" && sendMagicLink()}
                />
                <button
                  type="button"
                  onClick={sendMagicLink}
                  className="rounded-full px-5 py-3 text-sm font-semibold text-white"
                  style={{ background: "#7c5ce8" }}
                >
                  Send
                </button>
              </div>
            ) : (
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-center">
                <p className="text-sm font-semibold text-emerald-400">Magic link sent!</p>
                <p className="mt-1 text-xs text-zinc-400">Check your email and click the link to continue.</p>
              </div>
            )}
          </div>
        )}

        {/* ── Step: Confirm ── */}
        {step === "confirm" && (
          <div className="mt-8">
            <h2 className="mb-2 text-base font-semibold text-white">Step 2: Confirm ownership</h2>
            <p className="mb-6 text-sm text-zinc-400">
              Signed in as <span className="text-white">{user?.email ?? "verified user"}</span>
            </p>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 transition active:bg-white/[0.06]">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 h-5 w-5 rounded accent-[#7c5ce8]"
              />
              <span className="text-sm text-zinc-300">
                I am the owner or authorized representative of <strong className="text-white">{ghost.name}</strong>
              </span>
            </label>

            {error && (
              <p className="mt-3 text-sm text-red-400">{error}</p>
            )}

            <button
              type="button"
              onClick={handleClaim}
              disabled={!confirmed || claiming}
              className="mt-6 w-full rounded-full py-3.5 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #7c5ce8, #4d9ef5, #00d4c8)" }}
            >
              {claiming ? "Claiming..." : "Claim this business"}
            </button>
          </div>
        )}

        {/* ── Step: Done ── */}
        {step === "done" && (
          <div className="mt-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
              <svg className="h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white">Business claimed!</h2>
            <p className="mt-2 text-sm text-zinc-400">Redirecting to your dashboard...</p>
          </div>
        )}
      </div>
    </div>
  );
}

function getHue(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}
