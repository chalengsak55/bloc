import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient, createSupabaseServerClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { isOpenNow, formatWeeklyHours, type GooglePeriod } from "@/lib/ghost-hours";

export async function POST(req: NextRequest) {
  // Auth check
  const authClient = await createSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { placeId, message } = await req.json();
  if (!placeId || !message) {
    return NextResponse.json({ error: "Missing placeId or message" }, { status: 400 });
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
    return NextResponse.json({ error: "Ghost business not found" }, { status: 404 });
  }

  // Upsert conversation
  const { data: conv } = await supabase
    .from("ghost_conversations")
    .upsert(
      { ghost_business_id: ghost.id, buyer_id: user.id },
      { onConflict: "ghost_business_id,buyer_id" },
    )
    .select("id")
    .single();

  if (!conv) {
    return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
  }

  // Rate limit: max 100 ghost conversations per day
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { count: dailyConvCount } = await supabase
    .from("ghost_conversations")
    .select("id", { count: "exact", head: true })
    .gte("created_at", today.toISOString());

  if ((dailyConvCount ?? 0) >= 100) {
    return NextResponse.json({
      error: "Daily ghost chat limit reached. Please try again tomorrow.",
    }, { status: 429 });
  }

  // Check message count in this conversation
  const { count: existingCount } = await supabase
    .from("ghost_messages")
    .select("id", { count: "exact", head: true })
    .eq("ghost_conversation_id", conv.id);

  const isFirstMessage = (existingCount ?? 0) === 0;
  const buyerMessageCount = Math.ceil((existingCount ?? 0) / 2); // each exchange = buyer + agent

  // Max 5 messages per conversation
  if (buyerMessageCount >= 5) {
    const phoneText = ghost.phone ? `Call them at ${ghost.phone}` : "Contact them directly";
    return NextResponse.json({
      ok: true,
      conversationId: conv.id,
      agentResponse: `Want to speak directly? ${phoneText} or claim this business on Bloc.`,
      limitReached: true,
    });
  }

  // Insert buyer message
  await supabase.from("ghost_messages").insert({
    ghost_conversation_id: conv.id,
    sender_type: "buyer",
    sender_id: user.id,
    content: message,
  });

  // Build system prompt with ghost business info
  const openStatus = isOpenNow(ghost.opening_hours as GooglePeriod[], ghost.timezone);
  const hours = formatWeeklyHours(ghost.opening_hours as GooglePeriod[]);
  const hoursText = hours.length > 0
    ? hours.map((h) => `${h.day}: ${h.hours}`).join("\n")
    : "Hours not available";

  const systemPrompt = `You are a Ghost Agent representing "${ghost.name}", a ${ghost.category ?? "business"} located at ${ghost.address ?? "unknown location"}.

You are NOT the real business owner. You are an automated agent on Bloc (mybloc.me) that responds using only publicly available Google data.

Here is everything you know about this business:
- Name: ${ghost.name}
- Category: ${ghost.category ?? "N/A"}
- Address: ${ghost.address ?? "N/A"}
- Phone: ${ghost.phone ?? "N/A"}
- Website: ${ghost.website ?? "N/A"}
- Rating: ${ghost.rating ?? "N/A"}/5
- Currently: ${openStatus.isOpen ? "OPEN" : "CLOSED"}${openStatus.nextChange ? ` (${openStatus.nextChange})` : ""}
- Hours:
${hoursText}

Rules:
1. Be helpful and friendly, but honest about your limitations.
2. If asked something you don't know (menu items, prices, specific services, availability), say: "I'm a Ghost Agent with limited info. For details, try calling them at ${ghost.phone ?? "their phone number"} or visit ${ghost.website ?? "their website"}."
3. Keep responses concise (2-3 sentences max).
4. Never make up information.
5. If they want to book/order, suggest contacting the business directly.
6. Mention that the business owner can claim this listing on Bloc to respond personally.`;

  // Get last 10 messages for context (5 exchanges)
  const { data: recentMsgs } = await supabase
    .from("ghost_messages")
    .select("sender_type, content")
    .eq("ghost_conversation_id", conv.id)
    .order("created_at", { ascending: true })
    .limit(10); // 5 buyer + 5 agent

  const chatHistory = (recentMsgs ?? []).map((m) => ({
    role: m.sender_type === "buyer" ? "user" as const : "assistant" as const,
    content: m.content,
  }));

  // Call Claude API
  let agentResponse = "I'm having trouble responding right now. Please try calling the business directly.";

  try {
    const anthropic = new Anthropic();
    const completion = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      system: systemPrompt,
      messages: chatHistory,
    });

    const textBlock = completion.content.find((b) => b.type === "text");
    if (textBlock && textBlock.type === "text") {
      agentResponse = textBlock.text;
    }
  } catch (err) {
    console.error("Claude API error:", err);
  }

  // Insert agent response
  const { data: agentMsg } = await supabase
    .from("ghost_messages")
    .insert({
      ghost_conversation_id: conv.id,
      sender_type: "ghost_agent",
      sender_id: null,
      content: agentResponse,
    })
    .select("id")
    .single();

  // Update message count
  if (isFirstMessage) {
    await supabase
      .from("ghost_businesses")
      .update({
        message_count: ghost.message_count + 1,
        first_message_at: ghost.first_message_at ?? new Date().toISOString(),
      })
      .eq("id", ghost.id);

    // Send email notification if business has email
    if (ghost.email) {
      try {
        await sendClaimNotification(ghost.email, ghost.name, ghost.place_id);
      } catch (err) {
        console.error("Email send failed:", err);
      }
    }
  } else {
    await supabase
      .from("ghost_businesses")
      .update({ message_count: ghost.message_count + 1 })
      .eq("id", ghost.id);
  }

  return NextResponse.json({
    ok: true,
    conversationId: conv.id,
    agentResponse,
    agentMessageId: agentMsg?.id,
  });
}

// ─── Email notification ──────────────────────────────────────────────────────

async function sendClaimNotification(email: string, businessName: string, placeId: string) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.log("RESEND_API_KEY not set, skipping email notification");
    return;
  }

  const claimUrl = `https://mybloc.me/ghost/${placeId}/claim`;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendKey}`,
    },
    body: JSON.stringify({
      from: "Bloc <notify@mybloc.me>",
      to: email,
      subject: `Someone is asking about ${businessName} on Bloc`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 20px;">
          <h2 style="color: #111; margin-bottom: 16px;">Someone is looking for you!</h2>
          <p style="color: #555; line-height: 1.6;">
            A customer just asked about <strong>${businessName}</strong> on Bloc.
          </p>
          <p style="color: #555; line-height: 1.6;">
            Claim your business to respond directly and connect with customers in real time.
          </p>
          <a href="${claimUrl}" style="display: inline-block; margin-top: 20px; padding: 14px 32px; background: linear-gradient(135deg, #7c5ce8, #4d9ef5); color: white; text-decoration: none; border-radius: 999px; font-weight: bold; font-size: 14px;">
            Claim this business
          </a>
          <p style="color: #999; font-size: 12px; margin-top: 24px;">
            Bloc · AI Agent Commerce · mybloc.me
          </p>
        </div>
      `,
    }),
  });
}
