import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const { requestId, force } = (await req.json().catch(() => ({}))) as {
    requestId?: string;
    force?: boolean;
  };

  if (!requestId) {
    return NextResponse.json({ error: "Missing requestId" }, { status: 400 });
  }

  const authClient = await createSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseServiceClient();

  const { data: request, error: requestErr } = await supabase
    .from("requests")
    .select("*")
    .eq("id", requestId)
    .single();
  if (requestErr) {
    return NextResponse.json({ error: requestErr.message }, { status: 400 });
  }

  const { data: existingMatches } = await supabase
    .from("matches")
    .select("*")
    .eq("request_id", requestId)
    .order("rank", { ascending: true });

  if (!force && (existingMatches?.length ?? 0) >= 3) {
    return NextResponse.json({ ok: true, reused: true });
  }

  const q = `${request.category ?? ""} ${request.location_text ?? ""} ${request.sentence ?? ""}`
    .trim()
    .toLowerCase();

  const tokens = q
    .split(/[\s,]+/g)
    .map((t: string) => t.replace(/[^a-z0-9$]/g, ""))
    .filter(Boolean);

  const primary = tokens.find((t: string) => t.length >= 4) ?? null;

  const sellersQuery = supabase
    .from("profiles")
    .select("*")
    .eq("role", "seller")
    .eq("is_online", true)
    .limit(50);

  const { data: sellers, error: sellersErr } = primary
    ? await sellersQuery.or(
        `category.ilike.%${primary}%,location_text.ilike.%${primary}%,display_name.ilike.%${primary}%`,
      )
    : await sellersQuery;

  if (sellersErr) {
    return NextResponse.json({ error: sellersErr.message }, { status: 400 });
  }

  const shuffled = [...(sellers ?? [])].sort(() => Math.random() - 0.5);
  const picked = shuffled.slice(0, 3);

  const rows = picked.map((s, idx) => ({
    request_id: requestId,
    seller_id: s.id as string,
    rank: idx,
    status: "proposed",
  }));

  if (rows.length > 0) {
    await supabase.from("matches").upsert(rows, { onConflict: "request_id,seller_id" });
    await supabase.from("activities").insert(
      rows.map((r) => ({
        request_id: requestId,
        seller_id: r.seller_id,
        type: "match",
        body: "Seller matched and notified.",
      })),
    );
  }

  return NextResponse.json({ ok: true, picked: rows.length });
}

