import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getEnv } from "@/lib/env";

export async function POST(request: Request) {
  /* ── Env ── */
  const env = getEnv();
  if (!env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  /* ── Body ── */
  const body = await request.json().catch(() => ({}));
  const { scrapedData, manualData, vibe } = body as {
    scrapedData?: { title?: string; description?: string; image?: string; category?: string; location?: string };
    manualData?: { name: string; category: string; location: string; description: string };
    vibe: string;
  };

  if (!vibe) {
    return NextResponse.json({ error: "vibe is required" }, { status: 400 });
  }
  if (!scrapedData && !manualData) {
    return NextResponse.json({ error: "scrapedData or manualData is required" }, { status: 400 });
  }

  /* ── Build context ── */
  const businessInfo = scrapedData
    ? `Business name: ${scrapedData.title ?? "Unknown"}
Description: ${scrapedData.description ?? "N/A"}
Category: ${scrapedData.category ?? "N/A"}
Location: ${scrapedData.location ?? "N/A"}`
    : `Business name: ${manualData!.name}
Description: ${manualData!.description || "N/A"}
Category: ${manualData!.category}
Location: ${manualData!.location}`;

  const vibeDescriptions: Record<string, string> = {
    chill: "Warm, approachable, relaxed — use soft language, friendly emojis, casual tone",
    professional: "Clean, trustworthy, polished — use formal language, confidence, credibility signals",
    bold: "High energy, standout, creative — use punchy copy, bold statements, attention-grabbing language",
    ai: "Analyze the business info and pick the best-fitting tone automatically",
  };

  const vibeGuide = vibeDescriptions[vibe] ?? vibeDescriptions.ai;

  /* ── Call Claude ── */
  try {
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `Generate 4 unique storefront templates for this business.

BUSINESS INFO:
${businessInfo}

VIBE: ${vibe} — ${vibeGuide}

Return ONLY valid JSON (no markdown, no code fences) with this exact structure:
{
  "templates": [
    {
      "id": "template_1",
      "name": "Template display name",
      "tagline": "A catchy one-liner for the storefront",
      "bio": "2-3 sentence bio for the seller profile",
      "services": ["Service 1", "Service 2", "Service 3"],
      "colorScheme": { "primary": "#hexcolor", "secondary": "#hexcolor" },
      "style": "Brief description of the visual style"
    }
  ]
}

Each template should feel distinct. Vary the tone, color palette, and approach while staying true to the vibe. Use colors that work well on dark backgrounds (#0d0d12).`,
        },
      ],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "";
    const text = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed = JSON.parse(text);

    return NextResponse.json({ ok: true, templates: parsed.templates });
  } catch (err) {
    console.error("generate-storefront error:", err);
    const msg = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
