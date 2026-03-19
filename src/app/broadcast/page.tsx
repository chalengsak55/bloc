import { Suspense } from "react";
import { BroadcastComposer } from "./ui";

export const metadata = { title: "Broadcast — Bloc | mybloc.me" };
export const dynamic = "force-dynamic";

export default function BroadcastPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0d0d12]" />}>
      <BroadcastComposer />
    </Suspense>
  );
}
