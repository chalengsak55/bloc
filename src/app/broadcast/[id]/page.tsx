import { Suspense } from "react";
import { BroadcastResults } from "./ui";

export const dynamic = "force-dynamic";

export default async function BroadcastResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0d0d12]" />}>
      <BroadcastResults id={id} />
    </Suspense>
  );
}
