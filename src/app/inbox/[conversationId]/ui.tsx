"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type Message = {
  id: string;
  sender_id: string;
  content: string | null;
  media_url: string | null;
  media_type: string | null;
  created_at: string;
};

type SellerProfile = {
  id: string;
  display_name: string | null;
  category: string | null;
  avatar_url: string | null;
  is_online: boolean;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getHue(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  if (diff < 86_400_000) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function Bubble({
  msg,
  isMine,
}: {
  msg: Message;
  isMine: boolean;
}) {
  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[72%] space-y-1 ${isMine ? "items-end" : "items-start"} flex flex-col`}>
        {/* Media */}
        {msg.media_url && msg.media_type === "image" && (
          <div className="overflow-hidden rounded-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={msg.media_url}
              alt="shared image"
              className="max-h-64 w-full object-cover"
              style={{ maxWidth: 240 }}
            />
          </div>
        )}
        {msg.media_url && msg.media_type === "video" && (
          <div className="overflow-hidden rounded-2xl">
            <video
              src={msg.media_url}
              controls
              className="max-h-64 rounded-2xl"
              style={{ maxWidth: 240 }}
            />
          </div>
        )}

        {/* Text */}
        {msg.content && (
          <div
            className="rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
            style={
              isMine
                ? {
                    background: "linear-gradient(135deg, #7c5ce8, #4d9ef5)",
                    color: "#fff",
                    borderBottomRightRadius: 6,
                  }
                : {
                    background: "rgba(255,255,255,0.06)",
                    color: "#e4e4e7",
                    borderBottomLeftRadius: 6,
                  }
            }
          >
            {msg.content}
          </div>
        )}

        {/* Timestamp */}
        <span className="px-1 text-[10px] text-zinc-600">{formatTime(msg.created_at)}</span>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ChatView({ conversationId }: { conversationId: string }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Initial load ────────────────────────────────────────────────────────────
  useEffect(() => {
    let canceled = false;

    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace(`/auth?redirect=/inbox/${conversationId}`);
        return;
      }
      setUserId(user.id);

      // Fetch conversation to verify access + get seller_id
      const { data: convo } = await supabase
        .from("conversations")
        .select("buyer_id, seller_id")
        .eq("id", conversationId)
        .single();

      if (!convo || (convo.buyer_id !== user.id && convo.seller_id !== user.id)) {
        router.replace("/inbox");
        return;
      }

      const sellerId = convo.seller_id;

      // Fetch seller profile + messages in parallel
      const [{ data: profile }, { data: msgs }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, display_name, category, avatar_url, is_online")
          .eq("id", sellerId)
          .single(),
        supabase
          .from("messages")
          .select("id, sender_id, content, media_url, media_type, created_at")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true })
          .limit(100),
      ]);

      if (canceled) return;
      if (profile) setSeller(profile);
      setMessages((msgs ?? []) as Message[]);
      setLoading(false);
    }

    init();
    return () => { canceled = true; };
  }, [supabase, router, conversationId]);

  // ── Scroll to bottom on new messages ────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Real-time: new messages ──────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const m = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((x) => x.id === m.id)) return prev;
            return [...prev, m];
          });
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase, conversationId]);

  // ── Send text message ────────────────────────────────────────────────────────
  async function handleSend() {
    const content = text.trim();
    if (!content || sending || !userId) return;
    setSending(true);
    setText("");

    // Optimistic insert
    const optimistic: Message = {
      id: `opt-${Date.now()}`,
      sender_id: userId,
      content,
      media_url: null,
      media_type: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    const { data: inserted } = await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, sender_id: userId, content })
      .select("id, sender_id, content, media_url, media_type, created_at")
      .single();

    if (inserted) {
      setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? (inserted as Message) : m)));
    }
    setSending(false);
  }

  // ── Send media ───────────────────────────────────────────────────────────────
  async function handleMedia(file: File) {
    if (!userId) return;
    setUploading(true);

    try {
      const mediaType = file.type.startsWith("video/") ? "video" : "image";
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${conversationId}/${userId}/${Date.now()}.${ext}`;

      const { data: upload, error: uploadErr } = await supabase.storage
        .from("messages-media")
        .upload(path, file, { upsert: false });

      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage
        .from("messages-media")
        .getPublicUrl(upload.path);

      await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: userId,
        media_url: publicUrl,
        media_type: mediaType,
      });
    } catch (e) {
      console.error("Media upload failed:", e);
    } finally {
      setUploading(false);
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  const hue = seller ? getHue(seller.id) : 240;
  const initials = getInitials(seller?.display_name ?? null);
  const firstName = seller?.display_name?.split(/\s+/)[0] ?? "Seller";

  return (
    <>
      <style>{`
        .pb-safe { padding-bottom: env(safe-area-inset-bottom, 12px); }
        @keyframes msg-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-msg-in { animation: msg-in 0.2s ease-out forwards; }
      `}</style>

      <div className="flex h-dvh flex-col bg-[#0d0d12]">

        {/* ── Header ── */}
        <div className="flex-shrink-0 border-b border-white/[0.06] bg-black/70 backdrop-blur-xl">
          <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-3">
            <Link href="/inbox" className="text-zinc-500 transition-colors hover:text-zinc-300">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>

            {/* Seller avatar */}
            <div className="relative">
              {seller?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={seller.avatar_url} alt={seller.display_name ?? ""} className="h-9 w-9 rounded-full object-cover" />
              ) : (
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ background: `linear-gradient(135deg, hsl(${hue},65%,55%), hsl(${(hue + 60) % 360},65%,55%))` }}
                >
                  {initials}
                </div>
              )}
              {seller?.is_online && (
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#0d0d12] bg-emerald-400" />
              )}
            </div>

            {/* Name + status */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-zinc-100">
                {seller?.display_name ?? firstName}
              </p>
              <p className="text-[11px] text-zinc-500">
                {seller?.is_online ? (
                  <span className="text-emerald-400">Online</span>
                ) : (
                  seller?.category ?? "Seller"
                )}
              </p>
            </div>

            {/* Profile link */}
            {seller && (
              <Link
                href={`/seller/${seller.id}`}
                className="flex-shrink-0 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-white/20 hover:text-zinc-200"
              >
                Profile
              </Link>
            )}
          </div>
        </div>

        {/* ── Messages ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-xl space-y-3 px-4 py-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-[#7c5ce8]" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <p className="text-sm text-zinc-500">No messages yet.</p>
                <p className="mt-1 text-xs text-zinc-600">Say hello to {firstName}!</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className="animate-msg-in">
                  <Bubble msg={msg} isMine={msg.sender_id === userId} />
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* ── Input bar ── */}
        <div className="flex-shrink-0 border-t border-white/[0.06] bg-black/70 pb-safe backdrop-blur-xl">
          <div className="mx-auto flex max-w-xl items-end gap-2 px-4 py-3">
            {/* Media upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleMedia(file);
                e.target.value = "";
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-white/10 text-zinc-500 transition-colors hover:border-white/20 hover:text-zinc-300 disabled:opacity-40"
            >
              {uploading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-300" />
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              )}
            </button>

            {/* Text input */}
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={`Message ${firstName}…`}
              rows={1}
              className="flex-1 resize-none rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition focus:border-[#7c5ce8]/50 focus:ring-1 focus:ring-[#7c5ce8]/20"
              style={{
                fontFamily: "var(--font-dm-sans), sans-serif",
                maxHeight: 120,
                overflowY: "auto",
              }}
            />

            {/* Send */}
            <button
              onClick={handleSend}
              disabled={!text.trim() || sending}
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-white transition-opacity disabled:opacity-30"
              style={{ background: "linear-gradient(135deg, #7c5ce8, #4d9ef5)" }}
            >
              {sending ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5-5 5M6 12h12" />
                </svg>
              )}
            </button>
          </div>
        </div>

      </div>
    </>
  );
}
