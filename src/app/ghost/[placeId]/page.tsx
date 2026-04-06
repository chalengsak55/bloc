import { notFound } from "next/navigation";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { GhostStorefront } from "./ui";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ placeId: string }>;
  searchParams: Promise<{ name?: string }>;
}) {
  const { placeId } = await params;
  const { name: overrideName } = await searchParams;

  if (overrideName) {
    return { title: `${overrideName} — Bloc | mybloc.me` };
  }

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
  searchParams: Promise<{
    claimed?: string;
    theme?: string;
    name?: string;
    cat?: string;
    loc?: string;
    photo?: string;
  }>;
}) {
  const { placeId } = await params;
  const { claimed, theme, name, cat, loc, photo } = await searchParams;

  const supabase = createSupabaseServiceClient();
  const { data: ghost } = await supabase
    .from("ghost_businesses")
    .select("*")
    .eq("place_id", placeId)
    .eq("claimed", false)
    .maybeSingle();

  if (!ghost) notFound();

  // Override ghost data with demo seller info if provided
  const overrides = (claimed === "true" && name) ? { name, cat, loc, photo } : null;

  return (
    <GhostStorefront
      ghost={ghost}
      isClaimed={claimed === "true"}
      themeId={theme ?? null}
      overrides={overrides}
    />
  );
}
