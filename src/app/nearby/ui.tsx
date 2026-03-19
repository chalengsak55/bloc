"use client";

import { useEffect, useMemo, useState } from "react";
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
};

type TickerItem = {
  id: string;
  sentence: string;
  created_at: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const FILTERS = [
  { label: "🟢 Live", value: "live" },
  { label: "✂️ Hair", value: "hair" },
  { label: "🍽️ Food", value: "food" },
  { label: "🔧 Home", value: "home" },
  { label: "📦 Moving", value: "moving" },
  { label: "💻 Tech", value: "tech" },
];

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
      className="relative flex aspect-square w-full flex-col items-center justify-center overflow-hidden border border-white/[0.06] bg-black/60 transition-colors active:bg-white/[0.04]"
      style={{ backgroundImage: `radial-gradient(ellipse at 60% 30%, hsl(${hue},40%,12%), transparent 70%)` }}
    >
      {/* Avatar */}
      <div
        className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-white"
        style={{ background: `linear-gradient(135deg, hsl(${hue},55%,45%), hsl(${(hue + 60) % 360},55%,40%))` }}
      >
        {initials}
      </div>

      {/* Name + category */}
      <div className="mt-1.5 px-1 text-center">
        <div className="truncate text-[10px] font-semibold leading-tight text-zinc-100">
          {seller.display_name ?? "Seller"}
        </div>
        <div className="truncate text-[9px] text-zinc-500">
          {seller.category ?? "—"}
        </div>
      </div>

      {/* Distance */}
      {dist ? (
        <div className="mt-1 text-[9px] text-zinc-500">{dist}</div>
      ) : null}

      {/* Live dot — top-right */}
      <div className="absolute right-2 top-2">
        <LiveDot online={seller.is_online} busy={seller.busy} />
      </div>
    </button>
  );
}

// ─── Live ticker ──────────────────────────────────────────────────────────────

function Ticker({ items }: { items: TickerItem[] }) {
  const text = items.map((i) => i.sentence).join("   •   ");

  if (!text) return null;

  return (
    <div className="relative overflow-hidden border-b border-white/[0.06] bg-black/40 py-1.5">
      <div
        className="flex whitespace-nowrap text-[10px] text-zinc-400"
        style={{ animation: "ticker 30s linear infinite" }}
      >
        <span className="px-4">{text}&nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;{text}</span>
      </div>
      {/* Fade edges */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-black/70 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-black/70 to-transparent" />
    </div>
  );
}

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
  const [activeFilter, setActiveFilter] = useState("live");
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

  // Fetch sellers
  useEffect(() => {
    let canceled = false;
    async function load() {
      setLoading(true);
      try {
        let query = supabase
          .from("profiles")
          .select("id,display_name,category,location_text,is_online,lat,lng")
          .eq("role", "seller")
          .limit(50);

        if (activeFilter === "live") {
          query = query.eq("is_online", true);
        } else {
          query = query.ilike("category", `%${activeFilter}%`);
        }

        const { data } = await query;
        if (!canceled) setSellers((data ?? []) as Seller[]);
      } finally {
        if (!canceled) setLoading(false);
      }
    }
    load();
    return () => { canceled = true; };
  }, [supabase, activeFilter]);

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

  // Sort by distance if we have user position
  const sorted = useMemo(() => {
    if (!userPos) return sellers;
    return [...sellers].sort((a, b) => {
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
  }, [sellers, userPos]);

  function getDistLabel(s: Seller): string | null {
    if (!userPos || s.lat == null || s.lng == null) return null;
    return fmtDist(distanceKm(userPos.lat, userPos.lng, s.lat, s.lng));
  }

  return (
    <>
      {/* Keyframe styles */}
      <style>{`
        @keyframes ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes fab-ripple {
          0%   { transform: scale(1); opacity: 0.4; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        .pb-safe { padding-bottom: env(safe-area-inset-bottom, 12px); }
      `}</style>

      <div className="flex min-h-dvh flex-col pb-24">
        {/* Header */}
        <div className="sticky top-0 z-40 border-b border-white/[0.06] bg-black/70 backdrop-blur-xl">
          <div className="mx-auto max-w-xl px-4 py-3">
            <div className="flex items-center justify-between">
              <h1 className="text-sm font-semibold text-zinc-100">Nearby</h1>
              <span className="text-xs text-zinc-500">
                {sellers.length} agents
              </span>
            </div>
          </div>

          {/* Filter pills */}
          <div className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-none">
            {FILTERS.map((f) => (
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

        {/* Live ticker */}
        <Ticker items={ticker} />

        {/* Grid */}
        <div className="mx-auto w-full max-w-xl flex-1">
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
