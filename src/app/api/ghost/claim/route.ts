import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient, createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  // Auth check
  const authClient = await createSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { placeId } = await req.json();
  if (!placeId) {
    return NextResponse.json({ error: "Missing placeId" }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();

  // Fetch ghost business
  const { data: ghost } = await supabase
    .from("ghost_businesses")
    .select("*")
    .eq("place_id", placeId)
    .eq("claimed", false)
    .maybeSingle();

  if (!ghost) {
    return NextResponse.json({ error: "Business not found or already claimed" }, { status: 404 });
  }

  // Map Google category → Bloc category
  const categoryMap: Record<string, string> = {
    food: "food",
    hair: "hair",
    barber: "barber",
    home: "home",
    other: "other",
  };
  const blocCategory = categoryMap[ghost.category ?? ""] ?? ghost.category ?? "other";

  // Upsert into profiles table
  const { error: profileErr } = await supabase.from("profiles").upsert({
    id: user.id,
    role: "seller",
    is_seller: true,
    display_name: ghost.name,
    category: blocCategory,
    location_text: ghost.address,
    lat: ghost.lat,
    lng: ghost.lng,
    avatar_url: ghost.photo_url,
    is_online: true,
    bio: null,
  }, { onConflict: "id" });

  if (profileErr) {
    console.error("Profile upsert error:", profileErr);
    return NextResponse.json({ error: "Failed to create seller profile" }, { status: 500 });
  }

  // Mark ghost business as claimed
  await supabase
    .from("ghost_businesses")
    .update({
      claimed: true,
      claimed_by: user.id,
      claimed_at: new Date().toISOString(),
    })
    .eq("id", ghost.id);

  // Migrate ghost conversations → real conversations
  const { data: ghostConvs } = await supabase
    .from("ghost_conversations")
    .select("id, buyer_id")
    .eq("ghost_business_id", ghost.id);

  if (ghostConvs && ghostConvs.length > 0) {
    for (const gc of ghostConvs) {
      // Create real conversation
      const { data: realConv } = await supabase
        .from("conversations")
        .upsert(
          { buyer_id: gc.buyer_id, seller_id: user.id },
          { onConflict: "buyer_id,seller_id" },
        )
        .select("id")
        .single();

      if (!realConv) continue;

      // Copy ghost messages to real messages
      const { data: ghostMsgs } = await supabase
        .from("ghost_messages")
        .select("sender_type, sender_id, content, created_at")
        .eq("ghost_conversation_id", gc.id)
        .order("created_at", { ascending: true });

      if (ghostMsgs && ghostMsgs.length > 0) {
        const realMsgs = ghostMsgs.map((m) => ({
          conversation_id: realConv.id,
          sender_id: m.sender_type === "buyer" ? gc.buyer_id : user.id,
          content: m.content,
          created_at: m.created_at,
        }));

        await supabase.from("messages").insert(realMsgs);
      }
    }
  }

  return NextResponse.json({ ok: true, sellerId: user.id });
}
