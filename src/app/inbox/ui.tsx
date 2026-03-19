"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type ConversationRow = {
  sellerId: string;
  sellerName: string | null;
  sellerCategory: string | null;
  sellerAvatarUrl: string | null;
  sellerIsOnline: boolean;
  latestMessage: string;
  latestAt: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getHue(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}

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

// ─── Conversation row ─────────────────────────────────────────────────────────

function ConversationItem({ row }: { row: ConversationRow }) {
  const hue = getHue(row.sellerId);
  const initials = (row.sellerName ?? "??")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Link
      href={`/seller/${row.sellerId}`}
      className="flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-4 transition-colors hover:bg-white/[0.06] active:bg-white/[0.08]"
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        {row.sellerAvatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={row.sellerAvatarUrl}
            alt={row.sellerName ?? "Seller"}
            className="h-12 w-12 rounded-full object-cover"
          />
        ) : (
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold text-white"
            style={{
              background: `linear-gradient(135deg, hsl(${hue},55%,45%), hsl(${(hue + 60) % 360},55%,40%))`,
            }}
          >
            {initials}
          </div>
        )}
        {/* Online dot */}
        <span className="absolute bottom-0 right-0">
          {row.sellerIsOnline ? (
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-[#0d0d12] bg-emerald-400" />
            </span>
          ) : (
            <span className="inline-flex h-3 w-3 rounded-full border-2 border-[#0d0d12] bg-zinc-600" />
          )}
        </span>
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm font-semibold text-zinc-100">
            {row.sellerName ?? "Seller"}
          </span>
          <span className="flex-shrink-0 text-[11px] text-zinc-600">
            {relativeTime(row.latestAt)}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-1.5">
          {row.sellerCategory && (
            <span className="flex-shrink-0 text-[11px] text-zinc-600">
              {row.sellerCategory} ·
            </span>
          )}
          <span className="truncate text-xs text-zinc-500">{row.latestMessage}</span>
        </div>
      </div>

      {/* Chevron */}
      <svg
        className="h-4 w-4 flex-shrink-0 text-zinc-700"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-24 text-center">
      <div
        className="mx-auto flex h-14 w-14 items-center justify-center rounded-full opacity-60"
        style={{ background: "linear-gradient(135deg, #7c5ce8, #4d9ef5, #00d4c8)" }}
      >
        <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
      <p className="mt-4 text-sm font-medium text-zinc-400">No messages yet</p>
      <p className="mt-1 text-xs text-zinc-600">Tap a seller in Nearby to send your first message.</p>
      <Link
        href="/nearby"
        className="mt-6 rounded-full px-5 py-2.5 text-sm font-semibold text-white"
        style={{ background: "linear-gradient(135deg, #7c5ce8, #4d9ef5, #00d4c8)" }}
      >
        Go to Nearby
      </Link>
    </div>
  );
}

// ─── Tab bar (mirrors nearby) ─────────────────────────────────────────────────

function TabBar() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/[0.08] bg-black/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-xl items-end justify-around px-2 pb-safe pt-2">
        <TabItem href="/" label="Home" icon={<HomeIcon />} active={false} />
        <TabItem href="/nearby" label="Nearby" icon={<MapIcon />} active={false} />
        <BroadcastFAB />
        <TabItem href="/inbox" label="Inbox" icon={<InboxIcon />} active={true} />
        <TabItem href="/profile" label="Profile" icon={<ProfileIcon />} active={false} />
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

export function InboxList() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();

  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let canceled = false;

    async function load() {
      // Auth gate
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/auth?redirect=/inbox");
        return;
      }

      // 1. Fetch buyer's requests
      const { data: requests } = await supabase
        .from("requests")
        .select("id, sentence, created_at")
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (canceled) return;

      if (!requests || requests.length === 0) {
        setLoading(false);
        return;
      }

      const requestIds = requests.map((r) => r.id);

      // 2. Fetch matches + seller profiles in parallel
      const [{ data: matches }, { data: sellers }] = await Promise.all([
        supabase
          .from("matches")
          .select("request_id, seller_id")
          .in("request_id", requestIds),
        supabase
          .from("profiles")
          .select("id, display_name, category, avatar_url, is_online"),
      ]);

      if (canceled) return;

      // Build lookup maps
      const requestById = Object.fromEntries(requests.map((r) => [r.id, r]));
      const sellerById = Object.fromEntries((sellers ?? []).map((s) => [s.id, s]));

      // Group by seller: keep only the most recent request per seller
      type SellerRecord = { id: string; display_name: string | null; category: string | null; avatar_url: string | null; is_online: boolean };
      const latestBySeller = new Map<string, { message: string; at: string; seller: SellerRecord }>();

      for (const match of matches ?? []) {
        const req = requestById[match.request_id];
        const seller = sellerById[match.seller_id] as SellerRecord | undefined;
        if (!req || !seller) continue;

        const existing = latestBySeller.get(match.seller_id);
        if (!existing || req.created_at > existing.at) {
          latestBySeller.set(match.seller_id, {
            message: req.sentence,
            at: req.created_at,
            seller,
          });
        }
      }

      // Sort conversations newest first
      const rows: ConversationRow[] = [...latestBySeller.values()]
        .sort((a, b) => b.at.localeCompare(a.at))
        .map(({ message, at, seller }) => ({
          sellerId: seller.id,
          sellerName: seller.display_name,
          sellerCategory: seller.category,
          sellerAvatarUrl: seller.avatar_url,
          sellerIsOnline: seller.is_online,
          latestMessage: message,
          latestAt: at,
        }));

      if (!canceled) {
        setConversations(rows);
        setLoading(false);
      }
    }

    load();
    return () => { canceled = true; };
  }, [supabase, router]);

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
              Inbox
            </h1>
          </div>
        </div>

        {/* Content */}
        <div className="mx-auto w-full max-w-xl flex-1 px-4 pt-4">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-20 animate-pulse rounded-2xl border border-white/[0.04] bg-white/[0.03]"
                />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-2">
              {conversations.map((row) => (
                <ConversationItem key={row.sellerId} row={row} />
              ))}
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
