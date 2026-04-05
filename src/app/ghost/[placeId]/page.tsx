import { notFound } from "next/navigation";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { GhostStorefront } from "./ui";

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
    .select("name, category")
    .eq("place_id", placeId)
    .eq("claimed", false)
    .maybeSingle();
  const name = data?.name ?? "Business";
  const cat = data?.category ? ` · ${data.category}` : "";
  return { title: `${name}${cat} — Bloc | mybloc.me` };
}

export default async function GhostPage({
  params,
  searchParams,
}: {
  params: Promise<{ placeId: string }>;
  searchParams: Promise<{ claimed?: string }>;
}) {
  const { placeId } = await params;
  const { claimed } = await searchParams;

  const supabase = createSupabaseServiceClient();
  const { data: ghost } = await supabase
    .from("ghost_businesses")
    .select("*")
    .eq("place_id", placeId)
    .eq("claimed", false)
    .maybeSingle();

  if (!ghost) notFound();

  return <GhostStorefront ghost={ghost} isClaimed={claimed === "true"} />;
}
