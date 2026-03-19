import { Suspense } from "react";
import { InboxList } from "./ui";

export const metadata = { title: "Inbox — Bloc | mybloc.me" };
export const dynamic = "force-dynamic";

export default function InboxPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0d0d12]" />}>
      <InboxList />
    </Suspense>
  );
}
