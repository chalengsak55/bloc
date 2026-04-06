import { notFound } from "next/navigation";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { SellerStorefront } from "./ui";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("profiles")
    .select("display_name, category")
    .eq("id", id)
    .maybeSingle();
  const name = data?.display_name ?? "Seller";
  const cat = data?.category ? ` · ${data.category}` : "";
  return { title: `${name}${cat} — Bloc | mybloc.me` };
}

export default async function SellerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = createSupabaseServiceClient();
  const { data: seller } = await supabase
    .from("profiles")
    .select("id, display_name, category, location_text, bio, avatar_url, cover_url, link_url, is_online, lat, lng, storefront_theme")
    .eq("id", id)
    .eq("is_seller", true)
    .maybeSingle();

  if (!seller) notFound();

  return <SellerStorefront seller={seller} />;
}
