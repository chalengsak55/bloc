"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type TickerItem = {
  id: string;
  sentence: string;
  created_at: string;
};

export function LiveTicker() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [items, setItems] = useState<TickerItem[]>([]);

  useEffect(() => {
    let canceled = false;
    async function load() {
      const { data } = await supabase
        .from("requests")
        .select("id,sentence,created_at")
        .order("created_at", { ascending: false })
        .limit(10);
      if (!canceled) setItems((data ?? []) as TickerItem[]);
    }
    load();
    return () => { canceled = true; };
  }, [supabase]);

  useEffect(() => {
    const channel = supabase
      .channel("live-ticker-home")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "requests" },
        (payload) => {
          const row = payload.new as TickerItem;
          setItems((prev) => [row, ...prev].slice(0, 10));
        },
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [supabase]);

  const text = items.map((i) => i.sentence).join("   •   ");

  if (!text) return null;

  return (
    <>
      <style>{`@keyframes ticker-scroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}`}</style>
      <div className="relative overflow-hidden border-b border-white/[0.06] bg-black/40 py-1.5">
        <div
          className="flex whitespace-nowrap text-[10px] text-zinc-400"
          style={{ animation: "ticker-scroll 30s linear infinite" }}
        >
          <span className="px-4">{text}&nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;{text}</span>
        </div>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-16" style={{ background: "linear-gradient(to right, #0d0d12, transparent)" }} />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-16" style={{ background: "linear-gradient(to left, #0d0d12, transparent)" }} />
      </div>
    </>
  );
}
