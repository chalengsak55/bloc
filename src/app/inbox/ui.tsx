"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { TabBar } from "@/components/TabBar";

// ─── Types ────────────────────────────────────────────────────────────────────

type ConversationRow = {
  id: string;
  sellerId: string;
  sellerName: string | null;
  sellerCategory: string | null;
  sellerAvatarUrl: string | null;
  sellerIsOnline: boolean;
  lastMessage: string;
  lastAt: string;
  isMedia: boolean;
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
      href={`/inbox/${row.id}`}
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
            {relativeTime(row.lastAt)}
          </span>
        </div>
        <p className="mt-0.5 truncate text-xs text-zinc-500">
          {row.isMedia ? "📎 Media" : row.lastMessage}
        </p>
      </div>

      {/* Chevron */}
      <svg className="h-4 w-4 flex-shrink-0 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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


// ─── Main component ───────────────────────────────────────────────────────────

export function InboxList() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();

  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let canceled = false;

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/auth?redirect=/inbox");
        return;
      }

      // 1. Fetch all conversations for this buyer
      const { data: convos } = await supabase
        .from("conversations")
        .select("id, seller_id, created_at")
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false });

      if (canceled) return;

      if (!convos || convos.length === 0) {
        setLoading(false);
        return;
      }

      const convoIds = convos.map((c) => c.id);
      const sellerIds = [...new Set(convos.map((c) => c.seller_id))];

      // 2. Fetch all messages for these conversations + seller profiles in parallel
      const [{ data: allMessages }, { data: profiles }] = await Promise.all([
        supabase
          .from("messages")
          .select("conversation_id, content, media_type, created_at")
          .in("conversation_id", convoIds)
          .order("created_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("id, display_name, category, avatar_url, is_online")
          .in("id", sellerIds),
      ]);

      if (canceled) return;

      // Last message per conversation
      const lastMsgByConvo = new Map<string, { content: string | null; media_type: string | null; created_at: string }>();
      for (const msg of allMessages ?? []) {
        if (!lastMsgByConvo.has(msg.conversation_id)) {
          lastMsgByConvo.set(msg.conversation_id, msg);
        }
      }

      const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

      const rows: ConversationRow[] = convos
        .map((c) => {
          const seller = profileById.get(c.seller_id);
          const last = lastMsgByConvo.get(c.id);
          return {
            id: c.id,
            sellerId: c.seller_id,
            sellerName: seller?.display_name ?? null,
            sellerCategory: seller?.category ?? null,
            sellerAvatarUrl: seller?.avatar_url ?? null,
            sellerIsOnline: seller?.is_online ?? false,
            lastMessage: last?.content ?? "",
            lastAt: last?.created_at ?? c.created_at,
            isMedia: !last?.content && !!last?.media_type,
          };
        })
        .sort((a, b) => b.lastAt.localeCompare(a.lastAt));

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

        <div className="mx-auto w-full max-w-xl flex-1 px-4 pt-4">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-2xl border border-white/[0.04] bg-white/[0.03]" />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-2">
              {conversations.map((row) => (
                <ConversationItem key={row.id} row={row} />
              ))}
            </div>
          )}
        </div>
      </div>

      <TabBar active="Inbox" />
    </>
  );
}

