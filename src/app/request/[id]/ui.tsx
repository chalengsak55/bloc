"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

type Activity = {
  id: string;
  type: string;
  body: string;
  media_url: string | null;
  created_at: string;
  seller_id: string | null;
};

type Match = {
  id: string;
  seller_id: string;
  status: string;
  rank: number;
  created_at: string;
};

type Profile = {
  id: string;
  display_name: string | null;
  category: string | null;
  location_text: string | null;
  avatar_url: string | null;
  link_url: string | null;
};

export function RequestLive({ requestId }: { requestId: string }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [status, setStatus] = useState<string | null>("Matching sellers…");

  // Remember the last seen request so returning via back button can restore context.
  useEffect(() => {
    try {
      window.localStorage.setItem("bloc_last_request_id", requestId);
    } catch {
      // ignore
    }
  }, [requestId]);

  useEffect(() => {
    let canceled = false;

    async function bootstrap() {
      setStatus("Matching sellers…");
      await fetch(`/api/match`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId }),
      }).catch(() => null);

      const [a, m] = await Promise.all([
        supabase
          .from("activities")
          .select("*")
          .eq("request_id", requestId)
          .order("created_at", { ascending: true }),
        supabase
          .from("matches")
          .select("*")
          .eq("request_id", requestId)
          .order("rank", { ascending: true }),
      ]);

      if (canceled) return;
      setActivities((a.data ?? []) as Activity[]);
      setMatches((m.data ?? []) as Match[]);
      setStatus(null);
    }

    bootstrap();

    const channel = supabase
      .channel(`request:${requestId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "activities", filter: `request_id=eq.${requestId}` },
        (payload) => {
          const row = payload.new as Activity;
          setActivities((prev) => {
            const next = prev.filter((x) => x.id !== row.id);
            next.push(row);
            next.sort((x, y) => x.created_at.localeCompare(y.created_at));
            return next;
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches", filter: `request_id=eq.${requestId}` },
        (payload) => {
          const row = payload.new as Match;
          setMatches((prev) => {
            const next = prev.filter((x) => x.id !== row.id);
            next.push(row);
            next.sort((x, y) => x.rank - y.rank);
            return next;
          });
        },
      )
      .subscribe();

    return () => {
      canceled = true;
      void supabase.removeChannel(channel);
    };
  }, [requestId, supabase]);

  useEffect(() => {
    const sellerIds = Array.from(new Set(matches.map((m) => m.seller_id)));
    const missing = sellerIds.filter((id) => !profiles[id]);
    if (missing.length === 0) return;

    let canceled = false;
    async function loadProfiles() {
      const { data } = await supabase.from("profiles").select("*").in("id", missing);
      if (canceled) return;
      const map: Record<string, Profile> = {};
      for (const p of (data ?? []) as Profile[]) map[p.id] = p;
      setProfiles((prev) => ({ ...prev, ...map }));
    }
    loadProfiles();
    return () => {
      canceled = true;
    };
  }, [matches, profiles, supabase]);

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
        <div className="text-xs font-medium tracking-wide text-zinc-400">
          Live activity feed
        </div>
        <div className="mt-4 space-y-3">
          {activities.length === 0 ? (
            <div className="text-sm text-zinc-400">
              {status ?? "No activity yet. Sellers will appear when they respond."}
            </div>
          ) : (
            activities.map((a) => (
              <div
                key={a.id}
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3"
              >
                <div className="text-xs text-zinc-500">{a.type}</div>
                <div className="mt-1 text-sm text-zinc-100">{a.body}</div>
                {a.media_url ? (
                  <a
                    className="mt-2 block text-xs text-fuchsia-200 underline decoration-white/20 underline-offset-4"
                    href={a.media_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View media
                  </a>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-medium tracking-wide text-zinc-400">
              Your 3 options
            </div>
            <div className="mt-1 text-xs text-zinc-500">
              Confirm to reveal contact link.
            </div>
          </div>
          <Button
            onClick={() => {
              void fetch(`/api/match`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ requestId, force: true }),
              });
            }}
            className="px-3 py-2 text-xs"
          >
            Re-run match
          </Button>
        </div>

        <div className="mt-4 grid gap-3">
          {matches.slice(0, 3).map((m) => {
            const p = profiles[m.seller_id];
            return (
              <div
                key={m.id}
                className="rounded-2xl border border-white/10 bg-black/30 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-zinc-50">
                      {p?.display_name ?? "Seller"}
                    </div>
                    <div className="mt-1 text-xs text-zinc-400">
                      {(p?.category ?? "Category")} • {(p?.location_text ?? "Location")}
                    </div>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-zinc-200">
                    option {m.rank + 1}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    onClick={() => {
                      const url = p?.link_url;
                      if (url) window.open(url, "_blank", "noopener,noreferrer");
                    }}
                    className="bg-emerald-300/10 hover:bg-emerald-300/15"
                    disabled={!p?.link_url}
                  >
                    Contact
                  </Button>
                  <Button
                    onClick={async () => {
                      await supabase
                        .from("matches")
                        .update({ status: "accepted" })
                        .eq("id", m.id);
                      setStatus("Confirmed. Use Contact to reach the seller.");
                    }}
                    className="bg-fuchsia-400/10 hover:bg-fuchsia-400/15"
                  >
                    Confirm
                  </Button>
                </div>
              </div>
            );
          })}

          {matches.length === 0 ? (
            <div className="text-sm text-zinc-400">
              Matching in progress. If nothing appears, onboard a seller and set
              them online.
            </div>
          ) : null}
        </div>

        {status ? <div className="mt-3 text-xs text-zinc-400">{status}</div> : null}
      </div>
    </div>
  );
}

