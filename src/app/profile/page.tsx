import { Suspense } from "react";
import { BuyerProfile } from "./ui";

export const metadata = { title: "Profile — Bloc | mybloc.me" };
export const dynamic = "force-dynamic";

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0d0d12]" />}>
      <BuyerProfile />
    </Suspense>
  );
}
