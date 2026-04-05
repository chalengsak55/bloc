"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { TabBar } from "@/components/TabBar";

// ─── Types ────────────────────────────────────────────────────────────────────

type Seller = {
  id: string;
  display_name: string | null;
  category: string | null;
  location_text: string | null;
  is_online: boolean;
  busy?: boolean;
  lat?: number | null;
  lng?: number | null;
  avatar_url?: string | null;
  is_ghost?: boolean;
  place_id?: string;
};

type TickerItem = {
  id: string;
  sentence: string;
  created_at: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_RADIUS_KM = 10;



// ─── Haversine distance (km) ──────────────────────────────────────────────────

function distanceKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
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

function fmtDist(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}

// ─── Live dot ─────────────────────────────────────────────────────────────────

function LiveDot({ online, busy }: { online: boolean; busy?: boolean }) {
  if (!online)
    return <span className="inline-block h-2 w-2 rounded-full bg-zinc-600" />;
  if (busy)
    return <span className="inline-block h-2 w-2 rounded-full bg-yellow-400" />;
  return (
    <span className="relative inline-flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
    </span>
  );
}

// ─── Seller cell ──────────────────────────────────────────────────────────────

function SellerCell({
  seller,
  dist,
  onMessage,
}: {
  seller: Seller;
  dist: string | null;
  onMessage: (seller: Seller) => void;
}) {
  const initials = (seller.display_name ?? "??")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Deterministic gradient per seller id
  const hue = useMemo(() => {
    let h = 0;
    for (let i = 0; i < seller.id.length; i++) h = (h * 31 + seller.id.charCodeAt(i)) % 360;
    return h;
  }, [seller.id]);

  return (
    <button
      onClick={() => onMessage(seller)}
      className="relative aspect-square w-full overflow-hidden border border-white/[0.06] transition-opacity active:opacity-80"
    >
      {/* Full-bleed background */}
      {seller.avatar_url ? (
        <img
          src={seller.avatar_url}
          alt={seller.display_name ?? "Seller"}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(135deg, hsl(${hue},40%,18%), hsl(${(hue + 60) % 360},40%,12%))` }}
        >
          <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-white/30">
            {initials}
          </span>
        </div>
      )}

      {/* Bottom gradient scrim + text */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent px-1.5 pb-1.5 pt-6">
        <div className="truncate text-[10px] font-semibold leading-tight text-white">
          {seller.display_name ?? "Seller"}
        </div>
        <div className="truncate text-[9px] text-white/60">
          {dist ? `${dist} · ${seller.category ?? "—"}` : (seller.category ?? "—")}
        </div>
      </div>

      {/* Live dot — top-right */}
      <div className="absolute right-1.5 top-1.5">
        <LiveDot online={seller.is_online} busy={seller.busy} />
      </div>
    </button>
  );
}

// ─── Live ticker ──────────────────────────────────────────────────────────────



// ─── Main component ───────────────────────────────────────────────────────────

export function NearbyGrid() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();

  const [sellers, setSellers] = useState<Seller[]>([]);
  const [ticker, setTicker] = useState<TickerItem[]>([]);
  const [tickerIndex, setTickerIndex] = useState(0);
  const [tickerPaused, setTickerPaused] = useState(false);
  const [activeFilter, setActiveFilter] = useState("live");
  const [searchQuery, setSearchQuery] = useState("");
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);

  // Location filter
  const [locationQuery, setLocationQuery] = useState("");
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [customPos, setCustomPos] = useState<{ lat: number; lng: number } | null>(null);
  const [locationResults, setLocationResults] = useState<{ display_name: string; lat: string; lon: string }[]>([]);
  const [locationSearching, setLocationSearching] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const locationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Geocode search with Nominatim (debounced)
  const searchLocation = useCallback(async (q: string) => {
    if (!q.trim()) { setLocationResults([]); return; }
    setLocationSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(q)}`,
        { headers: { "Accept-Language": "en" } },
      );
      const data = await res.json();
      setLocationResults(data);
    } catch {
      setLocationResults([]);
    } finally {
      setLocationSearching(false);
    }
  }, []);

  function handleLocationInput(val: string) {
    setLocationQuery(val);
    if (locationTimer.current) clearTimeout(locationTimer.current);
    locationTimer.current = setTimeout(() => searchLocation(val), 400);
  }

  function selectLocation(result: { display_name: string; lat: string; lon: string }) {
    const shortName = result.display_name.split(",").slice(0, 2).join(",").trim();
    setLocationLabel(shortName);
    setCustomPos({ lat: parseFloat(result.lat), lng: parseFloat(result.lon) });
    setLocationOpen(false);
    setLocationQuery("");
    setLocationResults([]);
  }

  function clearLocation() {
    setLocationLabel(null);
    setCustomPos(null);
    setLocationQuery("");
    setLocationResults([]);
    setLocationOpen(false);
  }

  // Effective position: custom location > GPS
  const effectivePos = customPos ?? userPos;

  function handleMessage(seller: Seller) {
    if (seller.is_ghost && seller.place_id) {
      router.push(`/ghost/${seller.place_id}`);
    } else {
      router.push(`/seller/${seller.id}`);
    }
  }

  // Geolocation
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}, // silently ignore denied
    );
  }, []);

// Fetch all sellers + ghost businesses (filtering is client-side)
  useEffect(() => {
    let canceled = false;
    async function load() {
      setLoading(true);
      try {
        // Fetch real sellers
        const { data: realSellers } = await supabase
          .from("profiles")
          .select("id,display_name,category,location_text,is_online,lat,lng,avatar_url")
          .eq("role", "seller")
          .limit(50);

        // Fetch ghost businesses (unclaimed)
        const { data: ghosts } = await supabase
          .from("ghost_businesses")
          .select("id,place_id,name,category,address,lat,lng,photo_url,opening_hours,timezone")
          .eq("claimed", false)
          .limit(200);

        if (canceled) return;

        // Transform ghosts into Seller shape
        const ghostSellers: Seller[] = (ghosts ?? []).map((g: Record<string, unknown>) => ({
          id: `ghost:${g.place_id}`,
          display_name: g.name as string,
          category: g.category as string | null,
          location_text: g.address as string | null,
          is_online: true, // ghost businesses always "available"
          lat: g.lat as number | null,
          lng: g.lng as number | null,
          avatar_url: g.photo_url as string | null,
          is_ghost: true,
          place_id: g.place_id as string,
        }));

        setSellers([...(realSellers ?? []) as Seller[], ...ghostSellers]);
      } finally {
        if (!canceled) setLoading(false);
      }
    }
    load();
    return () => { canceled = true; };
  }, [supabase]);

  // Fetch recent requests for ticker
  useEffect(() => {
    let canceled = false;
    async function loadTicker() {
      const { data } = await supabase
        .from("requests")
        .select("id,sentence,created_at")
        .order("created_at", { ascending: false })
        .limit(10);
      if (!canceled) setTicker((data ?? []) as TickerItem[]);
    }
    loadTicker();
    return () => { canceled = true; };
  }, [supabase]);

  // Advance ticker index every 3 seconds
  useEffect(() => {
    if (ticker.length <= 1 || tickerPaused) return;
    const timer = setInterval(() => {
      setTickerIndex((i) => (i + 1) % ticker.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [ticker.length, tickerPaused]);

  // Real-time: new requests → prepend to ticker
  useEffect(() => {
    const channel = supabase
      .channel("nearby-ticker")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "requests" },
        (payload) => {
          const row = payload.new as TickerItem;
          setTicker((prev) => [row, ...prev].slice(0, 10));
        },
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [supabase]);

  // Real-time: seller online status changes
  useEffect(() => {
    const channel = supabase
      .channel("nearby-sellers")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        (payload) => {
          const updated = payload.new as Seller;
          setSellers((prev) =>
            prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)),
          );
        },
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [supabase]);

  // Derive filter pills from loaded sellers
  const filters = useMemo(() => {
    const categories = [
      ...new Set(
        sellers.map((s) => s.category?.trim().toLowerCase()).filter(Boolean) as string[],
      ),
    ].sort();
    return [
      { label: "🟢 Live", value: "live" },
      ...categories.map((c) => ({ label: c.charAt(0).toUpperCase() + c.slice(1), value: c })),
    ];
  }, [sellers]);

  // Apply active pill filter then search query
  const filtered = useMemo(() => {
    let result = sellers;
    if (activeFilter === "live") {
      result = result.filter((s) => s.is_online);
    } else {
      result = result.filter((s) => s.category?.toLowerCase().includes(activeFilter));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.display_name?.toLowerCase().includes(q) ||
          s.category?.toLowerCase().includes(q),
      );
    }
    return result;
  }, [sellers, activeFilter, searchQuery]);

  // Filter by radius and sort by distance if we have a position (GPS or custom location)
  const sorted = useMemo(() => {
    if (!effectivePos) return filtered;
    return [...filtered]
      .filter((s) => {
        if (s.lat == null || s.lng == null) return false;
        return distanceKm(effectivePos.lat, effectivePos.lng, s.lat, s.lng) <= DEFAULT_RADIUS_KM;
      })
      .sort((a, b) => {
        const da = distanceKm(effectivePos.lat, effectivePos.lng, a.lat!, a.lng!);
        const db = distanceKm(effectivePos.lat, effectivePos.lng, b.lat!, b.lng!);
        return da - db;
      });
  }, [filtered, effectivePos]);

  function getDistLabel(s: Seller): string | null {
    if (!effectivePos || s.lat == null || s.lng == null) return null;
    return fmtDist(distanceKm(effectivePos.lat, effectivePos.lng, s.lat, s.lng));
  }

  return (
    <>
      <div className="flex min-h-dvh flex-col pb-24">
        {/* Page title */}
        <div className="mx-auto max-w-[600px] px-4 pb-2 pt-6">
          <div className="flex items-baseline justify-between">
            <h1
              className="text-6xl tracking-tight"
              style={{
                fontFamily: "var(--font-instrument-serif), Georgia, serif",
                background: "linear-gradient(135deg, #7c5ce8, #4d9ef5, #00d4c8)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Nearby.
            </h1>
            <span className="text-xs text-zinc-500">{sorted.length} agents</span>
          </div>
        </div>

        {/* Header */}
        <div
          className="sticky top-0 z-40 border-b border-white/[0.06] bg-black/70 backdrop-blur-xl"
        >
          {/* Filter pills */}
          <div className="mx-auto max-w-[600px] overflow-x-auto px-4 pb-3 scrollbar-none">
          <div className="flex gap-2">
            {filters.map((f) => (
              <button
                key={f.value}
                onClick={() => setActiveFilter(f.value)}
                className={`flex-shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  activeFilter === f.value
                    ? "border-transparent text-white"
                    : "border-white/10 bg-white/[0.04] text-zinc-400 hover:bg-white/[0.08]"
                }`}
                style={
                  activeFilter === f.value
                    ? { background: "linear-gradient(135deg,#7c5ce8,#4d9ef5,#00d4c8)" }
                    : undefined
                }
              >
                {f.label}
              </button>
            ))}
          </div>
          </div>
          {/* Search bar */}
          <div className="mx-auto max-w-[600px] px-4 pb-3">
            <div className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 focus-within:border-[#7c5ce8]/60">
              <svg className="h-4 w-4 flex-shrink-0 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or category…"
                className="w-full bg-transparent text-sm text-zinc-200 placeholder-zinc-600 outline-none"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="flex-shrink-0 text-zinc-500 hover:text-zinc-300">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Location filter */}
          <div className="mx-auto max-w-[600px] px-4 pb-3">
            {!locationOpen && !locationLabel && (
              <button
                onClick={() => setLocationOpen(true)}
                className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-zinc-400 transition hover:bg-white/[0.08]"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Near me
              </button>
            )}

            {locationLabel && !locationOpen && (
              <div className="flex items-center gap-1.5">
                <span
                  className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium text-white"
                  style={{ borderColor: "#7c5ce8", background: "rgba(124,92,232,0.15)" }}
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {locationLabel}
                  <button onClick={clearLocation} className="ml-0.5 text-zinc-400 hover:text-white">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              </div>
            )}

            {locationOpen && (
              <div className="relative">
                <div className="flex items-center gap-2 rounded-xl border border-[#7c5ce8]/60 bg-white/10 px-3 py-2">
                  <svg className="h-4 w-4 flex-shrink-0 text-[#7c5ce8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <input
                    type="text"
                    autoFocus
                    value={locationQuery}
                    onChange={(e) => handleLocationInput(e.target.value)}
                    placeholder="City, neighborhood, or address…"
                    className="w-full bg-transparent text-sm text-zinc-200 placeholder-zinc-600 outline-none"
                  />
                  <button
                    onClick={() => { setLocationOpen(false); setLocationQuery(""); setLocationResults([]); }}
                    className="flex-shrink-0 text-zinc-500 hover:text-zinc-300"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Results dropdown */}
                {(locationResults.length > 0 || locationSearching) && (
                  <div className="absolute inset-x-0 top-full z-50 mt-1 rounded-xl border border-white/10 bg-[#1a1a24] shadow-xl">
                    {locationSearching && (
                      <div className="flex items-center gap-2 px-4 py-3 text-xs text-zinc-500">
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-700 border-t-[#7c5ce8]" />
                        Searching…
                      </div>
                    )}
                    {locationResults.map((r, i) => {
                      const short = r.display_name.split(",").slice(0, 3).join(",").trim();
                      return (
                        <button
                          key={i}
                          onClick={() => selectLocation(r)}
                          className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-zinc-300 transition hover:bg-white/[0.06]"
                        >
                          <svg className="h-3.5 w-3.5 flex-shrink-0 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="truncate">{short}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Live ticker */}
        {ticker.length > 0 && (
          <div
            className="w-full overflow-hidden border-b border-white/[0.06] bg-black/40 py-1.5 select-none"
            onMouseEnter={() => setTickerPaused(true)}
            onMouseLeave={() => setTickerPaused(false)}
            onTouchStart={() => setTickerPaused(true)}
            onTouchEnd={() => setTickerPaused(false)}
          >
            <div className="mx-auto max-w-[600px] px-4">
              <p className="min-w-0 truncate text-[10px] text-zinc-400">
                {ticker[tickerIndex % ticker.length]?.sentence}
              </p>
            </div>
          </div>
        )}

        {/* Grid */}
        <div className="mx-auto w-full max-w-[600px] flex-1">
          {loading ? (
            <div className="grid grid-cols-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square animate-pulse border border-white/[0.04] bg-white/[0.03]"
                />
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-sm text-zinc-500">
              <svg className="mb-3 h-8 w-8 opacity-30 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503-9.998l2.747-.756A.75.75 0 0119 7.944v9.32a.75.75 0 01-.503.712l-3 .822a.75.75 0 01-.397 0l-4.2-1.155a.75.75 0 00-.397 0l-2.747.756A.75.75 0 015 17.056V7.736a.75.75 0 01.503-.712l3-.822a.75.75 0 01.397 0l4.2 1.155a.75.75 0 00.397 0z" />
              </svg>
              No agents nearby for this filter.
            </div>
          ) : (
            <div className="grid grid-cols-3">
              {sorted.map((s) => (
                <SellerCell key={s.id} seller={s} dist={getDistLabel(s)} onMessage={handleMessage} />
              ))}
            </div>
          )}
        </div>
      </div>

      <TabBar active="Nearby" />
    </>
  );
}

