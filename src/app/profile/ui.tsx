"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

// ─── Types ────────────────────────────────────────────────────────────────────

type Broadcast = {
  id: string;
  sentence: string;
  status: string;
  created_at: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  if (hr < 48) return "Yesterday";
  const days = Math.floor(hr / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function getInitials(email: string): string {
  return email.slice(0, 2).toUpperCase();
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

function TabBar() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/[0.08] bg-black/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-xl items-end justify-around px-2 pb-safe pt-2">
        <TabItem href="/" label="Home" icon={<HomeIcon />} active={false} />
        <TabItem href="/nearby" label="Nearby" icon={<MapIcon />} active={false} />
        <BroadcastFAB />
        <TabItem href="/inbox" label="Inbox" icon={<InboxIcon />} active={false} />
        <TabItem href="/profile" label="Profile" icon={<ProfileIcon />} active={true} />
      </div>
    </nav>
  );
}

function TabItem({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
}) {
  return (
    <Link href={href} className="flex flex-col items-center gap-0.5 pb-1">
      <span className={`transition-colors ${active ? "text-[#7c5ce8]" : "text-zinc-500"}`}>
        {icon}
      </span>
      <span className={`text-[10px] transition-colors ${active ? "text-[#7c5ce8]" : "text-zinc-500"}`}>
        {label}
      </span>
    </Link>
  );
}

function BroadcastFAB() {
  return (
    <Link href="/broadcast" className="relative -mt-6 flex flex-col items-center">
      <span
        className="absolute inset-0 m-auto h-14 w-14 rounded-full opacity-40"
        style={{ background: "linear-gradient(135deg,#7c5ce8,#4d9ef5,#00d4c8)", animation: "fab-ripple 2s ease-out infinite" }}
      />
      <span
        className="absolute inset-0 m-auto h-14 w-14 rounded-full opacity-20"
        style={{ background: "linear-gradient(135deg,#7c5ce8,#4d9ef5,#00d4c8)", animation: "fab-ripple 2s ease-out 0.6s infinite" }}
      />
      <span
        className="relative flex h-14 w-14 items-center justify-center rounded-full shadow-lg"
        style={{ background: "linear-gradient(135deg,#7c5ce8,#4d9ef5,#00d4c8)" }}
      >
        <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
          <path strokeLinecap="round" d="M7 17A7 7 0 017 7" />
          <path strokeLinecap="round" d="M17 7a7 7 0 010 10" />
        </svg>
      </span>
      <span className="mt-1 text-[10px] text-zinc-400">Broadcast</span>
    </Link>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function BuyerProfile() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [pastOpen, setPastOpen] = useState(false);
  const [canceling, setCanceling] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState<Set<string>>(new Set());

  useEffect(() => {
    let canceled = false;

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/auth?redirect=/profile");
        return;
      }
      if (canceled) return;
      setUser(user);

      const { data } = await supabase
        .from("requests")
        .select("id, sentence, status, created_at")
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!canceled) {
        setBroadcasts((data ?? []) as Broadcast[]);
        setLoading(false);
      }
    }

    load();
    return () => { canceled = true; };
  }, [supabase, router]);

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push("/");
  }

  async function handleCancel(id: string) {
    setCanceling((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "closed" }),
      });
      if (res.ok) {
        setBroadcasts((prev) =>
          prev.map((b) => (b.id === id ? { ...b, status: "closed" } : b)),
        );
      }
    } finally {
      setCanceling((prev) => { const s = new Set(prev); s.delete(id); return s; });
    }
  }

  async function handleDelete(id: string) {
    setDeleting((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/requests/${id}`, { method: "DELETE" });
      if (res.ok) {
        setBroadcasts((prev) => prev.filter((b) => b.id !== id));
      }
    } finally {
      setDeleting((prev) => { const s = new Set(prev); s.delete(id); return s; });
    }
  }

  const initials = user?.email ? getInitials(user.email) : "..";
  const displayName = user?.user_metadata?.full_name as string | undefined;

  const active = broadcasts.filter((b) => b.status === "open");
  const past = broadcasts.filter((b) => b.status !== "open");

  return (
    <>
      <style>{`
        @keyframes fab-ripple {
          0%   { transform: scale(1); opacity: 0.4; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        .pb-safe { padding-bottom: env(safe-area-inset-bottom, 12px); }
      `}</style>

      <div className="flex min-h-dvh flex-col bg-[#0d0d12] pb-28">

        {/* Header */}
        <div className="sticky top-0 z-40 border-b border-white/[0.06] bg-black/70 backdrop-blur-xl">
          <div className="mx-auto max-w-xl px-4 py-4">
            <h1
              className="text-2xl tracking-tight text-zinc-50"
              style={{ fontFamily: "var(--font-instrument-serif), Georgia, serif" }}
            >
              Profile
            </h1>
          </div>
        </div>

        <div className="mx-auto w-full max-w-xl flex-1 space-y-6 px-4 pt-6">

          {/* Identity card */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5">
            <div className="flex items-center gap-4">
              <div
                className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full text-lg font-bold text-white"
                style={{ background: "linear-gradient(135deg, #7c5ce8, #4d9ef5, #00d4c8)" }}
              >
                {initials}
              </div>

              <div className="min-w-0 flex-1">
                {displayName && (
                  <p className="truncate text-base font-semibold text-zinc-100">{displayName}</p>
                )}
                <p className="truncate text-sm text-zinc-400">{user?.email ?? "—"}</p>
                <p className="mt-0.5 text-xs text-zinc-600">Buyer</p>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-2.5 text-sm text-zinc-400 transition-colors hover:border-red-500/30 hover:text-red-400 disabled:opacity-50"
            >
              {signingOut ? (
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-300" />
                  Signing out…
                </span>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign out
                </>
              )}
            </button>
          </div>

          {/* Active broadcasts */}
          <div>
            <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-600">
              Active Broadcasts
            </h2>

            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="h-16 animate-pulse rounded-2xl border border-white/[0.04] bg-white/[0.03]" />
                ))}
              </div>
            ) : active.length === 0 ? (
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-5 py-8 text-center">
                <p className="text-sm text-zinc-500">No active broadcasts.</p>
                <Link
                  href="/broadcast"
                  className="mt-3 inline-block text-sm font-medium"
                  style={{ color: "#7c5ce8" }}
                >
                  Send a broadcast →
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {active.map((b) => (
                  <div
                    key={b.id}
                    className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="flex-1 text-sm leading-snug text-zinc-200">{b.sentence}</p>
                      <span
                        className="mt-0.5 flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium"
                        style={{ background: "rgba(124,92,232,0.15)", color: "#a78bfa" }}
                      >
                        open
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-[11px] text-zinc-600">{relativeTime(b.created_at)}</p>
                      <button
                        onClick={() => handleCancel(b.id)}
                        disabled={canceling.has(b.id)}
                        className="rounded-lg border border-white/10 px-3 py-1 text-[11px] text-zinc-500 transition-colors hover:border-red-500/30 hover:text-red-400 disabled:opacity-40"
                      >
                        {canceling.has(b.id) ? "Canceling…" : "Cancel"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Past broadcasts (collapsible) */}
          {!loading && past.length > 0 && (
            <div>
              <button
                onClick={() => setPastOpen((v) => !v)}
                className="mb-3 flex w-full items-center justify-between text-xs font-medium uppercase tracking-widest text-zinc-600"
              >
                <span>Past Broadcasts ({past.length})</span>
                <svg
                  className={`h-3.5 w-3.5 transition-transform ${pastOpen ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {pastOpen && (
                <div className="space-y-2">
                  {past.map((b) => (
                    <div
                      key={b.id}
                      className="rounded-2xl border border-white/[0.04] bg-white/[0.02] px-4 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="flex-1 text-sm leading-snug text-zinc-500">{b.sentence}</p>
                        <span
                          className="mt-0.5 flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize"
                          style={{ background: "rgba(255,255,255,0.05)", color: "#71717a" }}
                        >
                          {b.status}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-[11px] text-zinc-700">{relativeTime(b.created_at)}</p>
                        <button
                          onClick={() => handleDelete(b.id)}
                          disabled={deleting.has(b.id)}
                          className="rounded-lg border border-white/10 px-3 py-1 text-[11px] text-zinc-600 transition-colors hover:border-red-500/30 hover:text-red-400 disabled:opacity-40"
                        >
                          {deleting.has(b.id) ? "Deleting…" : "Delete"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      <TabBar />
    </>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function HomeIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.75L12 3l9 6.75V21a.75.75 0 01-.75.75H15.75v-5.25a.75.75 0 00-.75-.75h-6a.75.75 0 00-.75.75V21.75H3.75A.75.75 0 013 21V9.75z" />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503-9.998l2.747-.756A.75.75 0 0119 7.944v9.32a.75.75 0 01-.503.712l-3 .822a.75.75 0 01-.397 0l-4.2-1.155a.75.75 0 00-.397 0l-2.747.756A.75.75 0 015 17.056V7.736a.75.75 0 01.503-.712l3-.822a.75.75 0 01.397 0l4.2 1.155a.75.75 0 00.397 0z" />
    </svg>
  );
}

function InboxIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859M12 3v8.25m0 0l-3-3m3 3l3-3" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}
