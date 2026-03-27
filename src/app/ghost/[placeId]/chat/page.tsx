import { notFound, redirect } from "next/navigation";
import { createSupabaseServiceClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { GhostChat } from "./ui";

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
  return { title: `Chat with ${data?.name ?? "AI Agent"} — Bloc` };
}

export default async function GhostChatPage({
  params,
}: {
  params: Promise<{ placeId: string }>;
}) {
  const { placeId } = await params;

  // Auth check
  const authClient = await createSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) redirect(`/auth?redirect=/ghost/${placeId}/chat`);

  // Fetch ghost business
  const supabase = createSupabaseServiceClient();
  const { data: ghost } = await supabase
    .from("ghost_businesses")
    .select("id, place_id, name, category, address, phone, website, rating, opening_hours, timezone, photo_url")
    .eq("place_id", placeId)
    .eq("claimed", false)
    .maybeSingle();

  if (!ghost) notFound();

  return <GhostChat ghost={ghost} buyerId={user.id} />;
}
