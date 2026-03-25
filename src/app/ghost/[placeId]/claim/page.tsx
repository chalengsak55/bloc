import { notFound } from "next/navigation";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { ClaimFlow } from "./ui";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ placeId: string }>;
}) {
  const { placeId } = await params;
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("ghost_businesses")
    .select("name")
    .eq("place_id", placeId)
    .eq("claimed", false)
    .maybeSingle();
  return { title: `Claim ${data?.name ?? "Business"} — Bloc` };
}

export default async function ClaimPage({
  params,
}: {
  params: Promise<{ placeId: string }>;
}) {
  const { placeId } = await params;

  const supabase = createSupabaseServiceClient();
  const { data: ghost } = await supabase
    .from("ghost_businesses")
    .select("id, place_id, name, category, address, phone, website, photo_url, lat, lng")
    .eq("place_id", placeId)
    .eq("claimed", false)
    .maybeSingle();

  if (!ghost) notFound();

  return <ClaimFlow ghost={ghost} />;
}
