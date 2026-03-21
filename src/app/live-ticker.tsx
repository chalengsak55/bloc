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

  const sentences = displayed.map((i) => i.sentence);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (sentences.length <= 1 || paused) return;
    const fadeOut = setTimeout(() => setVisible(false), 2700);
    const advance = setTimeout(() => {
      setIndex((i) => (i + 1) % sentences.length);
      setVisible(true);
    }, 3000);
    return () => { clearTimeout(fadeOut); clearTimeout(advance); };
  }, [index, paused, sentences.length]);

  if (sentences.length === 0) return null;

  const safeIndex = index % sentences.length;

  return (
    <div
      className="relative w-full overflow-hidden border-b border-white/[0.06] bg-black/40 px-4 py-1.5 select-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      <p
        className="min-w-0 truncate text-[10px] text-zinc-400 transition-opacity duration-300"
        style={{ opacity: visible ? 1 : 0 }}
      >
        {sentences[safeIndex]}
      </p>
    </div>
  );
}
