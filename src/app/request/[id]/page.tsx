import { RequestLive } from "./ui";

export const dynamic = "force-dynamic";

export default async function RequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5 pb-14 pt-10">
      <div className="text-sm font-semibold tracking-wide text-zinc-50">
        Live request
      </div>
      <div className="mt-1 text-xs text-zinc-400">
        Watch sellers work in real time, then pick one.
      </div>
      <div className="mt-8">
        <RequestLive requestId={id} />
      </div>
    </main>
  );
}

