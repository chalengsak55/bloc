"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

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
};

type TickerItem = {
  id: string;
  sentence: string;
  created_at: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────


const TABS = [
  { label: "Home", icon: HomeIcon, href: "/" },
  { label: "Nearby", icon: MapIcon, href: "/nearby" },
  { label: "Broadcast", icon: null, href: "/broadcast" },
  { label: "Inbox", icon: InboxIcon, href: "/inbox" },
  { label: "Profile", icon: ProfileIcon, href: "/profile" },
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


// ─── Broadcast FAB ────────────────────────────────────────────────────────────

function BroadcastFAB() {
  return (
    <Link href="/broadcast" className="relative -mt-6 flex flex-col items-center">
      {/* Ripple rings */}
      <span
        className="absolute inset-0 m-auto h-14 w-14 rounded-full opacity-40"
        style={{
          background: "linear-gradient(135deg,#7c5ce8,#4d9ef5,#00d4c8)",
          animation: "fab-ripple 2s ease-out infinite",
        }}
      />
      <span
        className="absolute inset-0 m-auto h-14 w-14 rounded-full opacity-20"
        style={{
          background: "linear-gradient(135deg,#7c5ce8,#4d9ef5,#00d4c8)",
          animation: "fab-ripple 2s ease-out 0.6s infinite",
        }}
      />
      {/* Button */}
      <span
        className="relative flex h-14 w-14 items-center justify-center rounded-full shadow-lg"
        style={{ background: "linear-gradient(135deg,#7c5ce8,#4d9ef5,#00d4c8)" }}
      >
        <BroadcastIcon />
      </span>
      <span className="mt-1 text-[10px] text-zinc-400">Broadcast</span>
    </Link>
  );
}

// ─── Bottom tab bar ───────────────────────────────────────────────────────────

function TabBar({ active }: { active: string }) {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-white/[0.08] bg-black/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-xl items-end justify-around px-2 pb-safe pt-2">
        {TABS.map((tab) => {
          if (tab.label === "Broadcast") return <BroadcastFAB key="broadcast" />;
          const Icon = tab.icon!;
          const isActive = active === tab.label;
          return (
            <Link
              key={tab.label}
              href={tab.href}
              className="flex flex-col items-center gap-0.5 pb-1"
            >
              <Icon
                className={`h-5 w-5 transition-colors ${isActive ? "text-[#7c5ce8]" : "text-zinc-500"}`}
              />
              <span
                className={`text-[10px] transition-colors ${isActive ? "text-[#7c5ce8]" : "text-zinc-500"}`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

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
  const [headerVisible, setHeaderVisible] = useState(true);
  const [headerHeight, setHeaderHeight] = useState(0);
  const headerRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);

  function handleMessage(seller: Seller) {
    router.push(`/seller/${seller.id}`);
  }

  // Geolocation
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}, // silently ignore denied
    );
  }, []);

  // Measure header height once mounted
  useEffect(() => {
    if (headerRef.current) setHeaderHeight(headerRef.current.offsetHeight);
  }, []);

  // Hide header on scroll down, show on scroll up (document works on iOS Safari)
  useEffect(() => {
    function onScroll() {
      const y = document.documentElement.scrollTop || document.body.scrollTop;
      if (y > lastScrollY.current + 4) {
        setHeaderVisible(false);
      } else if (y < lastScrollY.current - 4) {
        setHeaderVisible(true);
      }
      lastScrollY.current = y;
    }
    document.addEventListener("scroll", onScroll, { passive: true });
    return () => document.removeEventListener("scroll", onScroll);
  }, []);

  // Fetch all sellers once (filtering is client-side)
  useEffect(() => {
    let canceled = false;
    async function load() {
      setLoading(true);
      try {
        const { data } = await supabase
          .from("profiles")
          .select("id,display_name,category,location_text,is_online,lat,lng,avatar_url")
          .eq("role", "seller")
          .limit(50);
        if (!canceled) setSellers((data ?? []) as Seller[]);
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

  // Sort by distance if we have user position
  const sorted = useMemo(() => {
    if (!userPos) return filtered;
    return [...filtered].sort((a, b) => {
      const da =
        a.lat != null && a.lng != null
          ? distanceKm(userPos.lat, userPos.lng, a.lat, a.lng)
          : Infinity;
      const db =
        b.lat != null && b.lng != null
          ? distanceKm(userPos.lat, userPos.lng, b.lat, b.lng)
          : Infinity;
      return da - db;
    });
  }, [filtered, userPos]);

  function getDistLabel(s: Seller): string | null {
    if (!userPos || s.lat == null || s.lng == null) return null;
    return fmtDist(distanceKm(userPos.lat, userPos.lng, s.lat, s.lng));
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
            <span className="text-xs text-zinc-500">{sellers.length} agents</span>
          </div>
        </div>

        {/* Header */}
        <div
          ref={headerRef}
          className="sticky top-0 z-40 border-b border-white/[0.06] bg-black/70 backdrop-blur-xl transition-[transform,margin-bottom] duration-300"
          style={{
            transform: headerVisible ? "translateY(0)" : "translateY(-100%)",
            marginBottom: headerVisible ? 0 : -headerHeight,
          }}
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
        </div>

        {/* Live ticker */}
        {ticker.length > 0 && (
          <div
            className="w-full border-b border-white/[0.06] bg-black/40 px-4 py-1.5 select-none"
            onMouseEnter={() => setTickerPaused(true)}
            onMouseLeave={() => setTickerPaused(false)}
            onTouchStart={() => setTickerPaused(true)}
            onTouchEnd={() => setTickerPaused(false)}
          >
            <p className="min-w-0 truncate text-[10px] text-zinc-400">
              {ticker[tickerIndex % ticker.length]?.sentence}
            </p>
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
              <MapIcon className="mb-3 h-8 w-8 opacity-30" />
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

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.75L12 3l9 6.75V21a.75.75 0 01-.75.75H15.75v-5.25a.75.75 0 00-.75-.75h-6a.75.75 0 00-.75.75V21.75H3.75A.75.75 0 013 21V9.75z" />
    </svg>
  );
}

function MapIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503-9.998l2.747-.756A.75.75 0 0119 7.944v9.32a.75.75 0 01-.503.712l-3 .822a.75.75 0 01-.397 0l-4.2-1.155a.75.75 0 00-.397 0l-2.747.756A.75.75 0 015 17.056V7.736a.75.75 0 01.503-.712l3-.822a.75.75 0 01.397 0l4.2 1.155a.75.75 0 00.397 0z" />
    </svg>
  );
}

function InboxIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859M12 3v8.25m0 0l-3-3m3 3l3-3" />
    </svg>
  );
}

function ProfileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}

function BroadcastIcon() {
  return (
    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12h.01M12 12h.01M18 12h.01M6 12a9 9 0 000 0M12 3v.01M12 21v.01M3 12H3M21 12h.01M5.636 5.636l.007.007M18.364 18.364l.007.007M5.636 18.364l.007.007M18.364 5.636l.007.007" />
      <circle cx="12" cy="12" r="3" strokeWidth={2} />
    </svg>
  );
}
