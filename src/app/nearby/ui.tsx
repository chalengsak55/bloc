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
  opening_hours?: unknown;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_RADIUS_KM = 10;
const PAGE_SIZE = 9;
const SF_DEFAULT = { lat: 37.6879, lng: -122.4702 };
const BAY_AREA_RADIUS_KM = 80;

const DEMO_TICKER = [
  "5 people looking for a DJ this weekend near Daly City",
  "Someone needs an electrician tonight before 8pm",
  "2 requests for house cleaning this Saturday",
  "Looking for a private chef for dinner party tonight",
  "Need a barber open late — walk-ins welcome",
];



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

function isInBayArea(lat: number, lng: number): boolean {
  return distanceKm(lat, lng, SF_DEFAULT.lat, SF_DEFAULT.lng) <= BAY_AREA_RADIUS_KM;
}

type HoursPeriod = { open: { day: number; hour: number; minute: number }; close: { day: number; hour: number; minute: number } };

function fmtTime(hour: number, minute: number): string {
  const ampm = hour >= 12 ? "pm" : "am";
  const h = hour % 12 || 12;
  return minute === 0 ? `${h}${ampm}` : `${h}:${minute.toString().padStart(2, "0")}${ampm}`;
}

function getStatusText(s: Seller): { text: string; color: string } {
  if (!s.is_ghost) {
    if (s.is_online) return { text: "Open now · agent ready", color: "#34d399" };
    return { text: "Closed", color: "#71717a" };
  }
  // Ghost: check opening_hours for open/closed status
  if (s.opening_hours) {
    try {
      const periods: HoursPeriod[] = typeof s.opening_hours === "string"
        ? JSON.parse(s.opening_hours)
        : s.opening_hours;
      if (Array.isArray(periods) && periods.length > 0) {
        const now = new Date();
        const day = now.getDay(); // 0=Sun
        const mins = now.getHours() * 60 + now.getMinutes();

        // Check if currently open
        for (const p of periods) {
          if (p.open.day === day) {
            const openMins = p.open.hour * 60 + p.open.minute;
            const closeMins = p.close.hour * 60 + p.close.minute;
            if (mins >= openMins && mins < closeMins) {
              return { text: `Open · closes ${fmtTime(p.close.hour, p.close.minute)}`, color: "#34d399" };
            }
          }
        }

        // Find next opening time
        // Check later today first, then upcoming days
        for (let offset = 0; offset < 7; offset++) {
          const checkDay = (day + offset) % 7;
          for (const p of periods) {
            if (p.open.day === checkDay) {
              const openMins = p.open.hour * 60 + p.open.minute;
              if (offset === 0 && openMins > mins) {
                return { text: `Closed · opens ${fmtTime(p.open.hour, p.open.minute)}`, color: "#71717a" };
              }
              if (offset === 1) {
                return { text: `Closed · opens tomorrow ${fmtTime(p.open.hour, p.open.minute)}`, color: "#71717a" };
              }
              if (offset > 1) {
                const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                return { text: `Closed · opens ${dayNames[checkDay]}`, color: "#71717a" };
              }
            }
          }
        }
        return { text: "Closed", color: "#71717a" };
      }
    } catch { /* ignore parse errors */ }
  }
  return { text: "Open", color: "#71717a" };
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
  const [tickerIndex, setTickerIndex] = useState(0);
  const [tickerPaused, setTickerPaused] = useState(false);
  const [activeFilter, setActiveFilter] = useState("live");
  const [searchQuery, setSearchQuery] = useState("");
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);

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

  // Effective position: custom location > GPS > SF default
  const effectivePos = customPos ?? userPos ?? SF_DEFAULT;
  const isUsingDefault = !customPos && !userPos;
  const outsideBayArea = userPos ? !isInBayArea(userPos.lat, userPos.lng) : false;

  function handleMessage(seller: Seller) {
    if (seller.is_ghost && seller.place_id) {
      router.push(`/ghost/${seller.place_id}`);
    } else {
      router.push(`/seller/${seller.id}`);
    }
  }

  // Geolocation — only triggered by "Near me" button, not on mount
  function requestUserLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
    );
  }

// Fetch sellers + ghost businesses near effective position
  useEffect(() => {
    let canceled = false;
    async function load() {
      setLoading(true);
      try {
        // Bounding box ~15km around position (generous to catch all within 10km radius)
        const pos = effectivePos;
        const latDelta = 0.135; // ~15km in latitude
        const lngDelta = 0.17;  // ~15km in longitude at SF latitude

        // Fetch real sellers
        const { data: realSellers } = await supabase
          .from("profiles")
          .select("id,display_name,category,location_text,is_online,lat,lng,avatar_url")
          .eq("role", "seller")
          .gte("lat", pos.lat - latDelta)
          .lte("lat", pos.lat + latDelta)
          .gte("lng", pos.lng - lngDelta)
          .lte("lng", pos.lng + lngDelta)
          .limit(100);

        // Fetch ghost businesses (unclaimed) within bounding box
        const { data: ghosts } = await supabase
          .from("ghost_businesses")
          .select("id,place_id,name,category,address,lat,lng,photo_url,opening_hours,timezone")
          .eq("claimed", false)
          .gte("lat", pos.lat - latDelta)
          .lte("lat", pos.lat + latDelta)
          .gte("lng", pos.lng - lngDelta)
          .lte("lng", pos.lng + lngDelta)
          .limit(500);

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
          opening_hours: g.opening_hours,
        }));

        setSellers([...(realSellers ?? []) as Seller[], ...ghostSellers]);
      } finally {
        if (!canceled) setLoading(false);
      }
    }
    load();
    return () => { canceled = true; };
  }, [supabase, effectivePos]);

  // Advance demo ticker every 3 seconds
  useEffect(() => {
    if (tickerPaused) return;
    const timer = setInterval(() => {
      setTickerIndex((i) => (i + 1) % DEMO_TICKER.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [tickerPaused]);

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

  // Filter by radius, sort by priority (claimed+open → claimed+closed → unclaimed) then distance
  const sorted = useMemo(() => {
    function priorityOf(s: Seller): number {
      if (!s.is_ghost && s.is_online) return 0;  // claimed + open
      if (!s.is_ghost) return 1;                  // claimed + closed
      return 2;                                    // unclaimed ghost
    }
    return [...filtered]
      .filter((s) => {
        if (s.lat == null || s.lng == null) return false;
        return distanceKm(effectivePos.lat, effectivePos.lng, s.lat, s.lng) <= DEFAULT_RADIUS_KM;
      })
      .sort((a, b) => {
        const pa = priorityOf(a);
        const pb = priorityOf(b);
        if (pa !== pb) return pa - pb;
        const da = distanceKm(effectivePos.lat, effectivePos.lng, a.lat!, a.lng!);
        const db = distanceKm(effectivePos.lat, effectivePos.lng, b.lat!, b.lng!);
        return da - db;
      });
  }, [filtered, effectivePos]);

  // Reset display count when filters change
  useEffect(() => {
    setDisplayCount(PAGE_SIZE);
  }, [activeFilter, searchQuery, effectivePos]);

  // Group by priority: claimed+open → claimed+closed → unclaimed ghosts
  const groups = useMemo(() => {
    const visible = sorted.slice(0, displayCount);
    const claimedOpen: Seller[] = [];
    const claimedClosed: Seller[] = [];
    const unclaimed: Seller[] = [];
    for (const s of visible) {
      if (!s.is_ghost) {
        if (s.is_online) claimedOpen.push(s);
        else claimedClosed.push(s);
      } else {
        unclaimed.push(s);
      }
    }
    return [
      { label: "RESPONDING NOW", dot: "emerald", sellers: claimedOpen },
      { label: "OPEN \u00b7 AGENT ON", dot: "emerald", sellers: claimedClosed },
      { label: "UNCLAIMED NEARBY", dot: "zinc", sellers: unclaimed },
    ].filter((g) => g.sellers.length > 0);
  }, [sorted, displayCount]);

  const totalCount = sorted.length;
  const showingCount = Math.min(displayCount, totalCount);
  const hasMore = displayCount < totalCount;

  function getDistLabel(s: Seller): string | null {
    if (s.lat == null || s.lng == null) return null;
    return fmtDist(distanceKm(effectivePos.lat, effectivePos.lng, s.lat, s.lng));
  }

  // Online seller count
  const onlineCount = useMemo(() => sorted.filter((s) => s.is_online && !s.is_ghost).length, [sorted]);


  return (
    <>
      <div className="flex min-h-dvh flex-col pb-24" style={{ background: "#0d0d12" }}>

        {/* ── Page title + counts ── */}
        <div className="mx-auto w-full max-w-[600px] px-4 pb-1 pt-6">
          <h1
            className="tracking-tight"
            style={{
              fontSize: "32px",
              fontFamily: "var(--font-instrument-serif), Georgia, serif",
              background: "linear-gradient(135deg, #7c5ce8, #4d9ef5, #00d4c8)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Nearby
          </h1>
          <div className="flex items-center gap-3 pt-0.5">
            <span className="text-xs text-zinc-500">{totalCount} agents found</span>
            {onlineCount > 0 && (
              <span className="flex items-center gap-1 text-xs text-emerald-400">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                {onlineCount} online now
              </span>
            )}
          </div>
        </div>

        {/* ── Location bar ── */}
        <div className="mx-auto w-full max-w-[600px] px-4 py-3">
          <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-sm">📍</span>
              <span className="text-xs text-zinc-300">
                Daly City, CA
                <span className="ml-1 text-zinc-500">·</span>
                <span className="ml-1 font-medium text-white">showing within {DEFAULT_RADIUS_KM}km</span>
              </span>
            </div>
            <span className="rounded-md border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] text-zinc-400">
              {DEFAULT_RADIUS_KM} km
            </span>
          </div>
        </div>

        {/* ── Live demand ticker ── */}
        <div
          className="mx-auto w-full max-w-[600px] px-4 pb-2"
          onMouseEnter={() => setTickerPaused(true)}
          onMouseLeave={() => setTickerPaused(false)}
          onTouchStart={() => setTickerPaused(true)}
          onTouchEnd={() => setTickerPaused(false)}
        >
          <div className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2">
            <span className="text-sm">⚡</span>
            <p className="min-w-0 flex-1 truncate text-[11px] text-zinc-400">
              {DEMO_TICKER[tickerIndex % DEMO_TICKER.length]}
            </p>
            <span className="flex-shrink-0 text-[10px] text-zinc-600">{DEMO_TICKER.length} active</span>
          </div>
        </div>

        {/* ── Broadcasts unanswered FOMO ── */}
        <div className="mx-auto w-full max-w-[600px] px-4 pb-2">
          <div className="flex items-center justify-between rounded-xl border border-yellow-500/20 bg-yellow-500/[0.06] px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-sm">⚡</span>
              <span className="text-[11px] text-zinc-300">
                <span className="font-semibold text-yellow-400">3 broadcasts unanswered nearby</span>
                <span className="ml-1 text-zinc-500">— claimed agents got them all</span>
              </span>
            </div>
            <Link
              href="/seller/onboarding"
              className="flex-shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold text-white"
              style={{ background: "linear-gradient(135deg, #7c5ce8, #4d9ef5)" }}
            >
              Claim →
            </Link>
          </div>
        </div>

        {/* ── Filter pills ── */}
        <div className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#0d0d12]/90 backdrop-blur-xl">
          <div className="mx-auto max-w-[600px] overflow-x-auto px-4 py-3 scrollbar-none">
            <div className="flex gap-2">
              {filters.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setActiveFilter(f.value)}
                  className={`flex-shrink-0 rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
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
        </div>

        {/* ── Grid ── */}
        <div className="mx-auto w-full max-w-[600px] flex-1">
          {loading ? (
            <div className="grid grid-cols-3 gap-px p-4">
              {Array.from({ length: 9 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square animate-pulse rounded-xl bg-white/[0.04]"
                />
              ))}
            </div>
          ) : groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-sm text-zinc-500">
              <svg className="mb-3 h-8 w-8 opacity-30 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503-9.998l2.747-.756A.75.75 0 0119 7.944v9.32a.75.75 0 01-.503.712l-3 .822a.75.75 0 01-.397 0l-4.2-1.155a.75.75 0 00-.397 0l-2.747.756A.75.75 0 015 17.056V7.736a.75.75 0 01.503-.712l3-.822a.75.75 0 01.397 0l4.2 1.155a.75.75 0 00.397 0z" />
              </svg>
              No agents nearby for this filter.
            </div>
          ) : (
            <>
              {groups.map((group) => (
                <div key={group.label}>
                  {/* 3-col card grid */}
                  <div className="grid grid-cols-3 gap-2 px-4">
                    {group.sellers.map((s) => {
                      const dist = getDistLabel(s);
                      const initials = (s.display_name ?? "??").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
                      // Deterministic hue from id
                      let hue = 0;
                      for (let i = 0; i < s.id.length; i++) hue = (hue * 31 + s.id.charCodeAt(i)) % 360;

                      const status = getStatusText(s);

                      return (
                        <button
                          key={s.id}
                          onClick={() => handleMessage(s)}
                          className="relative overflow-hidden rounded-2xl border border-white/[0.08] transition-opacity active:opacity-80"
                          style={{ aspectRatio: "3/4" }}
                        >
                          {/* Full card photo background */}
                          {s.avatar_url ? (
                            <img
                              src={s.avatar_url}
                              alt={s.display_name ?? ""}
                              className="absolute inset-0 h-full w-full object-cover"
                            />
                          ) : (
                            <div
                              className="absolute inset-0"
                              style={{ background: `linear-gradient(135deg, hsl(${hue},40%,20%), hsl(${(hue + 60) % 360},40%,12%))` }}
                            >
                              <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-white/20">
                                {initials}
                              </span>
                            </div>
                          )}

                          {/* Dark gradient overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

                          {/* Live dot — top right */}
                          {s.is_online && !s.is_ghost && (
                            <div className="absolute right-2.5 top-2.5">
                              <span className="relative inline-flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                              </span>
                            </div>
                          )}

                          {/* Bottom info */}
                          <div className="absolute inset-x-0 bottom-0 px-2.5 pb-2.5">
                            <div className="truncate text-[12px] font-bold leading-tight text-white">
                              {s.display_name ?? "Business"}
                            </div>
                            <div className="truncate pt-0.5 text-[10px] font-medium" style={{ color: status.color }}>
                              {status.text}
                            </div>
                            <div className="truncate pt-0.5 text-[10px] text-zinc-500">
                              {dist ? `${dist} · ${s.category ?? "—"}` : (s.category ?? "—")}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Load more bar */}
              <div className="mx-4 mt-4 rounded-xl bg-white/[0.04] py-3 text-center">
                <span className="text-xs text-zinc-500">
                  Showing {showingCount} of{" "}
                  <span className="font-semibold text-white">{totalCount} agents</span>
                  {" "}within {DEFAULT_RADIUS_KM}km
                </span>
                {hasMore && (
                  <>
                    <span className="mx-2 text-zinc-700">·</span>
                    <button
                      onClick={() => setDisplayCount((c) => c + PAGE_SIZE)}
                      className="text-xs font-medium text-zinc-400 underline decoration-zinc-700 underline-offset-2 transition hover:text-white"
                    >
                      Load more →
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>

      </div>

      <TabBar active="Nearby" />
    </>
  );
}

