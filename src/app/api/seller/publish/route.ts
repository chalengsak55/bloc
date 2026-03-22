import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  /* ── Auth check ── */
  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  /* ── Parse FormData ── */
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const rawData = formData.get("data");
  if (typeof rawData !== "string") {
    return NextResponse.json({ error: "Missing data field" }, { status: 400 });
  }

  let data: {
    manualData?: { name?: string; category?: string; location?: string; description?: string };
    scrapedData?: { title?: string; category?: string; location?: string; description?: string };
    reviewedData?: { name?: string; category?: string; location?: string; description?: string; ctaType?: string };
  };

  try {
    data = JSON.parse(rawData);
  } catch {
    return NextResponse.json({ error: "Invalid JSON in data field" }, { status: 400 });
  }

  /* ── Extract fields (reviewedData takes priority) ── */
  const reviewed = data.reviewedData;
  const manual = data.manualData;
  const scraped = data.scrapedData;

  const displayName = reviewed?.name || manual?.name || scraped?.title || null;
  const category = reviewed?.category || manual?.category || scraped?.category || null;
  const locationText = reviewed?.location || manual?.location || scraped?.location || null;
  const bio = reviewed?.description || manual?.description || scraped?.description || null;
  const ctaType = reviewed?.ctaType || null;

  /* ── Upload cover if provided ── */
  const service = createSupabaseServiceClient();
  let coverUrl: string | null = null;

  const coverFile = formData.get("cover");
  if (coverFile && coverFile instanceof File && coverFile.size > 0) {
    // Validate type
    const validTypes = ["image/jpeg", "image/png", "video/mp4"];
    if (!validTypes.includes(coverFile.type)) {
      return NextResponse.json({ error: "Cover must be JPG, PNG, or MP4" }, { status: 400 });
    }

    // Validate size (50MB)
    if (coverFile.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: "Cover file too large. Max 50MB." }, { status: 400 });
    }

    const ext = coverFile.type === "video/mp4" ? "mp4" : coverFile.type === "image/png" ? "png" : "jpg";
    const path = `${user.id}/cover.${ext}`;

    const { data: uploaded, error: uploadErr } = await service.storage
      .from("storefront-media")
      .upload(path, coverFile, { cacheControl: "3600", upsert: true });

    if (uploadErr) {
      console.error("Cover upload error:", uploadErr);
      return NextResponse.json({ error: "Failed to upload cover" }, { status: 500 });
    }

    const { data: urlData } = service.storage
      .from("storefront-media")
      .getPublicUrl(uploaded.path);

    coverUrl = urlData.publicUrl;
  }

  /* ── Upsert profile ── */
  const profileUpdate: Record<string, unknown> = {
    id: user.id,
    role: "seller",
    display_name: displayName,
    category,
    location_text: locationText,
    bio,
    cta_type: ctaType,
    is_online: true,
    updated_at: new Date().toISOString(),
  };

  if (coverUrl) {
    profileUpdate.cover_url = coverUrl;
  }

  const { error: upsertErr } = await service
    .from("profiles")
    .upsert(profileUpdate, { onConflict: "id" });

  if (upsertErr) {
    console.error("Profile upsert error:", upsertErr);
    return NextResponse.json({ error: "Failed to save profile" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, sellerId: user.id });
}
