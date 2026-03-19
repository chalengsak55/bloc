import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const { sellerId, sentence } = (await req.json().catch(() => ({}))) as {
    sellerId?: string;
    sentence?: string;
  };

  if (!sellerId || !sentence?.trim()) {
    return NextResponse.json({ error: "Missing sellerId or sentence" }, { status: 400 });
  }

  // Auth check via cookie session
  const authClient = await createSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Insert request as buyer (RLS allows: auth.uid() = buyer_id)
  const { data: request, error: reqErr } = await authClient
    .from("requests")
    .insert({ sentence: sentence.trim(), buyer_id: user.id })
    .select("id")
    .single();

  if (reqErr) {
    return NextResponse.json({ error: reqErr.message }, { status: 500 });
  }

  // Insert a direct match targeting the specific seller.
  // Requires service role — there is no RLS insert policy on matches
  // (matches are backend-only, same as /api/match).
  const service = createSupabaseServiceClient();
  const { error: matchErr } = await service.from("matches").insert({
    request_id: request.id,
    seller_id: sellerId,
    rank: 0,
    status: "proposed",
  });

  if (matchErr) {
    return NextResponse.json({ error: matchErr.message }, { status: 500 });
  }

  // Notify the seller via the activity feed
  await service.from("activities").insert({
    request_id: request.id,
    seller_id: sellerId,
    type: "direct_message",
    body: sentence.trim(),
  });

  return NextResponse.json({ ok: true, requestId: request.id });
}
