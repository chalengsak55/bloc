"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type TickerItem = {
  id: string;
  sentence: string;
  created_at: string;
  lat?: number | null;
  lng?: number | null;
};

const RADIUS_KM = 50;

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function LiveTicker() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [items, setItems] = useState<TickerItem[]>([]);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [geoReady, setGeoReady] = useState(false);

  // Resolve geolocation once; mark ready either way so fetch isn't delayed
  useEffect(() => {
    if (!navigator?.geolocation) { setGeoReady(true); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoReady(true);
      },
      () => setGeoReady(true), // denied or timed out → fall back to global
      { timeout: 5_000, maximumAge: 60_000 },
    );
  }, []);

  // Fetch once geo settles — grab extra rows so filtering leaves enough
  useEffect(() => {
    if (!geoReady) return;
    let canceled = false;
    async function load() {
      const { data } = await supabase
        .from("requests")
        .select("id,sentence,created_at,lat,lng")
        .order("created_at", { ascending: false })
        .limit(50);
      if (!canceled) setItems((data ?? []) as TickerItem[]);
    }
    load();
    return () => { canceled = true; };
  }, [supabase, geoReady]);

  // Real-time inserts
  useEffect(() => {
    const channel = supabase
      .channel("live-ticker-home")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "requests" },
        (payload) => {
          const row = payload.new as TickerItem;
          setItems((prev) => [row, ...prev].slice(0, 50));
        },
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [supabase]);

  // Filter to nearby if we have a position; fall back to all if nothing qualifies
  const displayed = useMemo(() => {
    if (!userPos) return items.slice(0, 10);
    const nearby = items.filter(
      (i) => i.lat != null && i.lng != null &&
        distanceKm(userPos.lat, userPos.lng, i.lat, i.lng) <= RADIUS_KM,
    );
    return (nearby.length > 0 ? nearby : items).slice(0, 10);
  }, [items, userPos]);

  const text = displayed.map((i) => i.sentence).join("   •   ");
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
