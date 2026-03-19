import { Suspense } from "react";
import { notFound } from "next/navigation";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { DirectMessage } from "./ui";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sellerId: string }>;
}) {
  const { sellerId } = await params;
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", sellerId)
    .maybeSingle();
  return { title: `Message ${data?.display_name ?? "Seller"} — Bloc | mybloc.me` };
}

export default async function MessagePage({
  params,
}: {
  params: Promise<{ sellerId: string }>;
}) {
  const { sellerId } = await params;

  const supabase = createSupabaseServiceClient();
  const { data: seller } = await supabase
    .from("profiles")
    .select("id, display_name, category, avatar_url, is_online")
    .eq("id", sellerId)
    .eq("role", "seller")
    .maybeSingle();

  if (!seller) notFound();

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0d0d12]" />}>
      <DirectMessage seller={seller} />
    </Suspense>
  );
}
