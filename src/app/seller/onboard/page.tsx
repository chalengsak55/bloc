import { SellerOnboard } from "./ui";

export const dynamic = "force-dynamic";

export default function SellerOnboardPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5 pb-14 pt-10">
      <div className="text-sm font-semibold tracking-wide text-zinc-50">
        Seller onboarding
      </div>
      <div className="mt-1 text-xs text-zinc-400">
        Add one public link, auto-fill, then go online.
      </div>
      <div className="mt-8">
        <SellerOnboard />
      </div>
    </main>
  );
}

