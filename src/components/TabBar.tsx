"use client";

import Link from "next/link";
import { useUserMode } from "@/lib/user-mode";

/* ── Tab configs ── */

type Tab = { label: string; icon: ((p: { className?: string }) => React.ReactNode) | null; href: string };

const BUYER_TABS: Tab[] = [
  { label: "Home", icon: HomeIcon, href: "/" },
  { label: "Nearby", icon: MapIcon, href: "/nearby" },
  { label: "Broadcast", icon: null, href: "/broadcast" },
  { label: "Inbox", icon: InboxIcon, href: "/inbox" },
  { label: "Profile", icon: ProfileIcon, href: "/profile" },
];

const SELLER_TABS: Tab[] = [
  { label: "Dashboard", icon: DashboardIcon, href: "/seller/dashboard" },
  { label: "Storefront", icon: StorefrontIcon, href: "/profile" },
  { label: "Inbox", icon: InboxIcon, href: "/inbox" },
  { label: "Profile", icon: ProfileIcon, href: "/profile" },
];

/* ── Component ── */

export function TabBar({ active }: { active: string }) {
  const { mode } = useUserMode();
  const tabs = mode === "seller" ? SELLER_TABS : BUYER_TABS;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-white/[0.08] bg-black/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-xl items-end justify-around px-2 pb-safe pt-2">
        {tabs.map((tab) => {
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

/* ── Broadcast FAB ── */

function BroadcastFAB() {
  return (
    <Link href="/broadcast" className="relative -mt-6 flex flex-col items-center">
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

/* ── Icons ── */

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

function DashboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
}

function StorefrontIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
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
