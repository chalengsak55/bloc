"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  rating: number | null;
  opening_hours: unknown;
  timezone: string;
  photo_url: string | null;
};

type GhostMessage = {
  id: string;
  sender_type: "buyer" | "ghost_agent";
  content: string;
  created_at: string;
};

// ─── Ghost Chat ───────────────────────────────────────────────────────────────

export function GhostChat({
  ghost,
  buyerId,
}: {
  ghost: GhostBusiness;
  buyerId: string;
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();
  const [messages, setMessages] = useState<GhostMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load existing conversation & messages
  useEffect(() => {
    let canceled = false;

    async function load() {
      const { data: conv } = await supabase
        .from("ghost_conversations")
        .select("id")
        .eq("ghost_business_id", ghost.id)
        .eq("buyer_id", buyerId)
        .maybeSingle();

      if (canceled) return;

      if (conv) {
        setConversationId(conv.id);
        const { data: msgs } = await supabase
          .from("ghost_messages")
          .select("id, sender_type, content, created_at")
          .eq("ghost_conversation_id", conv.id)
          .order("created_at", { ascending: true });

        if (!canceled && msgs) setMessages(msgs);
      }
    }

    load();
    return () => { canceled = true; };
  }, [supabase, ghost.id, buyerId]);

  // Realtime subscription
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`ghost-chat-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ghost_messages",
          filter: `ghost_conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as GhostMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, conversationId]);

  // Auto-scroll to bottom
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Send message (accepts optional override for quick reply chips)
  const handleSend = useCallback(async (overrideMessage?: string) => {
    const text = (overrideMessage ?? input).trim();
    if (!text || sending) return;

    setSending(true);
    setInput("");

    // Optimistic: add buyer message immediately
    const tempId = crypto.randomUUID();
    const buyerMsg: GhostMessage = {
      id: tempId,
      sender_type: "buyer",
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, buyerMsg]);

    try {
      const res = await fetch("/api/ghost/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeId: ghost.place_id, message: text }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.conversationId && !conversationId) {
          setConversationId(data.conversationId);
        }
        // Agent response comes via realtime or from API response
        if (data.agentResponse) {
          const agentMsg: GhostMessage = {
            id: data.agentMessageId ?? crypto.randomUUID(),
            sender_type: "ghost_agent",
            content: data.agentResponse,
            created_at: new Date().toISOString(),
          };
          setMessages((prev) => {
            if (prev.some((m) => m.id === agentMsg.id)) return prev;
            return [...prev, agentMsg];
          });
        }
      }
    } catch (err) {
      console.error("Send failed:", err);
    }

    setSending(false);
    inputRef.current?.focus();
  }, [input, sending, ghost.place_id, conversationId]);

  const firstName = ghost.name.split(/[\s·|–-]/)[0].trim();
  const hue = getHue(ghost.place_id);

  return (
    <div className="flex h-dvh flex-col bg-[#0d0d12]">
      {/* ── Header ── */}
      <div
        className="flex items-center gap-3 border-b border-white/[0.06] px-4 pb-3"
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

        {/* Avatar */}
        {ghost.photo_url ? (
          <img src={ghost.photo_url} alt="" className="h-9 w-9 rounded-full object-cover" />
        ) : (
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white"
            style={{ background: `linear-gradient(135deg, hsl(${hue},60%,35%), hsl(${(hue + 60) % 360},50%,30%))` }}
          >
            {ghost.name.charAt(0)}
          </div>
        )}

        <div className="flex-1">
          <p className="text-sm font-semibold text-white">{ghost.name}</p>
          <div className="flex items-center gap-1.5">
            <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">
              Ghost Agent
            </span>
            {ghost.category && (
              <span className="text-xs text-zinc-500">{ghost.category}</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Messages ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="mt-12 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10">
              <svg className="h-7 w-7 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13 2L4.09 12.63a1 1 0 00.78 1.62H11l-1 7.75L19.91 11.37a1 1 0 00-.78-1.62H13l1-7.75z" />
              </svg>
            </div>
            <p className="text-sm text-zinc-400">
              Ask anything about <strong className="text-white">{firstName}</strong>
            </p>
            <p className="mt-1 text-xs text-zinc-600">
              Ghost Agent responds with Google data only
            </p>

            {/* Quick reply chips */}
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {[
                { label: "Open now?", msg: "Are you open right now?" },
                { label: "Hours tomorrow", msg: "What are your hours tomorrow?" },
                { label: "Phone number", msg: "What's your phone number?" },
                { label: "Website", msg: "What's your website?" },
              ].map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => handleSend(chip.msg)}
                  className="rounded-full border border-[#7c5ce8]/40 bg-[#7c5ce8]/10 px-3.5 py-1.5 text-xs font-medium text-[#7c5ce8] transition hover:bg-[#7c5ce8]/20 active:scale-95"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender_type === "buyer" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.sender_type === "buyer"
                    ? "rounded-br-md text-white"
                    : "rounded-bl-md bg-white/[0.06] text-zinc-200"
                }`}
                style={
                  msg.sender_type === "buyer"
                    ? { background: "linear-gradient(135deg, #7c5ce8, #4d9ef5)" }
                    : undefined
                }
              >
                {msg.content}
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-md bg-white/[0.06] px-4 py-2.5">
                <div className="flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-500 [animation-delay:0ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-500 [animation-delay:150ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-500 [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Input ── */}
      <div
        className="border-t border-white/[0.06] px-4 py-3"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom, 12px), 12px)" }}
      >
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={`Ask ${firstName}...`}
            rows={1}
            className="flex-1 resize-none rounded-2xl bg-white/[0.06] px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:ring-1 focus:ring-[#7c5ce8]"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-white transition disabled:opacity-30"
            style={{ background: "#7c5ce8" }}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function getHue(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}
