"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function LivePill() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      const { count: c } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "seller")
        .eq("is_online", true);
      setCount(c ?? 0);
    }
    load();

    // Real-time updates when sellers go on/offline
    const channel = supabase
      .channel("home-pill")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        () => load(),
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [supabase]);

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5">
      <span className="relative flex h-2 w-2 flex-shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
      </span>
      <span className="text-xs text-zinc-300">
        {count === null ? "connecting…" : `${count} active`}
      </span>
    </div>
  );
}
