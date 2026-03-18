import { SellerDashboard } from "./ui";

export const dynamic = "force-dynamic";

export default function SellerDashboardPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5 pb-14 pt-10">
      <div className="text-sm font-semibold tracking-wide text-zinc-50">
        Seller dashboard
      </div>
      <div className="mt-1 text-xs text-zinc-400">
        Incoming requests + realtime activity
      </div>
      <div className="mt-8">
        <SellerDashboard />
      </div>
    </main>
  );
}

