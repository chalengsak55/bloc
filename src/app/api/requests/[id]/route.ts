import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const authClient = await createSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { status } = body as { status: string };
  if (!status) return NextResponse.json({ error: "Missing status" }, { status: 400 });

  const serviceClient = createSupabaseServiceClient();

  // Verify ownership before updating
  const { data: existing } = await serviceClient
    .from("requests")
    .select("buyer_id")
    .eq("id", id)
    .single();

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.buyer_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { error } = await serviceClient
    .from("requests")
    .update({ status })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const authClient = await createSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const serviceClient = createSupabaseServiceClient();

  // Verify ownership before deleting
  const { data: existing } = await serviceClient
    .from("requests")
    .select("buyer_id")
    .eq("id", id)
    .single();

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.buyer_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { error } = await serviceClient
    .from("requests")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
