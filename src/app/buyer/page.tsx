import { BuyerComposer } from "./ui";

export const dynamic = "force-dynamic";

export default function BuyerPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5 pb-14 pt-10">
      <div className="text-sm font-semibold tracking-wide text-zinc-50">
        Buyer
      </div>
      <div className="mt-1 text-xs text-zinc-400">
        One sentence request → live activity → 3 options
      </div>
      <div className="mt-8">
        <BuyerComposer />
      </div>
    </main>
  );
}

