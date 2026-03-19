"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export function AuthPanel() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const params = useSearchParams();
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Default redirect to "/" (not "/buyer" which no longer exists)
  const redirect = params.get("redirect") ?? "/";
  const oauthError = params.get("error");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
  }, [supabase]);

  // ── Google OAuth ────────────────────────────────────────────────────────────
  async function signInWithGoogle() {
    setBusy(true);
    setStatus(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // Must go through /auth/callback for PKCE code exchange
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirect)}`,
      },
    });
    if (error) {
      setStatus(error.message);
      setBusy(false);
    }
    // On success the browser navigates away — no need to setBusy(false)
  }

  // ── Magic link ──────────────────────────────────────────────────────────────
  async function sendMagicLink() {
    setBusy(true);
    setStatus(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          // Magic links deliver a session directly — no code exchange needed
          emailRedirectTo: `${window.location.origin}${redirect}`,
        },
      });
      if (error) throw error;
      setStatus("Magic link sent — check your email.");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Failed to send magic link.");
    } finally {
      setBusy(false);
    }
  }

  // ── Sign out ────────────────────────────────────────────────────────────────
  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setStatus(null);
    router.refresh();
  }

  // ── Already signed in ───────────────────────────────────────────────────────
  if (user) {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
          <p className="text-xs text-zinc-500">Signed in as</p>
          <p className="mt-0.5 text-sm text-zinc-100">{user.email}</p>
        </div>

        <Link
          href={redirect}
          className="flex w-full items-center justify-center rounded-2xl py-3.5 text-sm font-semibold text-white"
          style={{ background: "linear-gradient(135deg, #7c5ce8, #4d9ef5, #00d4c8)" }}
        >
          Continue →
        </Link>

        <button
          onClick={signOut}
          className="w-full rounded-2xl border border-white/10 py-3.5 text-sm text-zinc-500 transition-colors hover:text-zinc-200"
        >
          Sign out
        </button>
      </div>
    );
  }

  // ── Sign in form ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {oauthError && (
        <p className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-400">
          Sign-in failed. Please try again.
        </p>
      )}

      {/* Google OAuth */}
      <button
        onClick={signInWithGoogle}
        disabled={busy}
        className="flex w-full items-center justify-center gap-3 rounded-2xl bg-white py-3.5 text-sm font-medium text-zinc-900 transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        <GoogleIcon />
        Continue with Google
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 border-t border-white/10" />
        <span className="text-xs text-zinc-600">or</span>
        <div className="flex-1 border-t border-white/10" />
      </div>

      {/* Magic link */}
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") sendMagicLink(); }}
        placeholder="your@email.com"
        inputMode="email"
        autoComplete="email"
        disabled={busy}
        className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition focus:border-[#7c5ce8]/60 focus:ring-2 focus:ring-[#7c5ce8]/20 disabled:opacity-50"
      />

      <button
        onClick={sendMagicLink}
        disabled={busy || !email.includes("@")}
        className="w-full rounded-2xl py-3.5 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
        style={{ background: "linear-gradient(135deg, #7c5ce8, #4d9ef5, #00d4c8)" }}
      >
        {busy ? "Sending…" : "Send magic link"}
      </button>

      {status && (
        <p className={`text-xs ${status.includes("sent") ? "text-emerald-400" : "text-red-400"}`}>
          {status}
        </p>
      )}
    </div>
  );
}

// ── Google "G" logo ───────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z" />
      <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z" />
      <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 010-3.04V5.41H1.83a8 8 0 000 7.18l2.67-2.07z" />
      <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.83 5.4L4.5 7.49a4.77 4.77 0 014.48-3.3z" />
    </svg>
  );
}
