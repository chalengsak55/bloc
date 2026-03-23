import { NextResponse } from "next/server";

function pickMeta(content: string, prop: string) {
  const re = new RegExp(
    `<meta\\s+[^>]*property=["']${prop}["'][^>]*content=["']([^"']+)["'][^>]*>`,
    "i",
  );
  return content.match(re)?.[1] ?? null;
}

function pickTitle(content: string) {
  const m = content.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m?.[1]?.trim() ?? null;
}

function stripHtml(content: string) {
  return content
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const CATEGORY_KEYWORDS = [
  "barber",
  "barbershop",
  "haircut",
  "salon",
  "restaurant",
  "cafe",
  "coffee",
  "nail",
  "nails",
  "spa",
  "massage",
  "cleaning",
  "plumber",
  "electrician",
  "photography",
  "photographer",
];

const CITY_HINTS = [
  "daly city",
  "san francisco",
  "oakland",
  "new york",
  "brooklyn",
  "los angeles",
  "chicago",
  "miami",
];

function inferCategoryAndLocation(html: string, urlHost: string) {
  const title = pickMeta(html, "og:title") ?? pickTitle(html) ?? "";
  const description = pickMeta(html, "og:description") ?? "";
  const text = stripHtml(html).toLowerCase();
  const host = urlHost.toLowerCase();

  const haystack = `${title} ${description} ${text} ${host}`.toLowerCase();

  // Map detected keywords → UI categories (hair, food, home, moving, tech, barber, other)
  const keywordToCategory: Record<string, string> = {
    barber: "barber",
    barbershop: "barber",
    haircut: "barber",
    salon: "hair",
    nail: "hair",
    nails: "hair",
    spa: "hair",
    massage: "hair",
    restaurant: "food",
    cafe: "food",
    coffee: "food",
    cleaning: "home",
    plumber: "home",
    electrician: "home",
    photography: "tech",
    photographer: "tech",
  };

  let category: string | null = null;
  for (const kw of CATEGORY_KEYWORDS) {
    if (haystack.includes(kw)) {
      category = keywordToCategory[kw] ?? "other";
      break;
    }
  }

  let location: string | null = null;
  for (const city of CITY_HINTS) {
    if (haystack.includes(city)) {
      // Capitalize each word.
      location = city
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
      break;
    }
  }

  return { category, location };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const target = url.searchParams.get("url");
  if (!target) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }
  if (!/^https?:\/\//i.test(target)) {
    return NextResponse.json({ error: "Only http(s) allowed" }, { status: 400 });
  }

  try {
    const res = await fetch(target, {
      method: "GET",
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari",
      },
      redirect: "follow",
    });
    const html = await res.text();

    const title = pickMeta(html, "og:title") ?? pickTitle(html);
    const description = pickMeta(html, "og:description");
    const image = pickMeta(html, "og:image");

    const { category, location } = inferCategoryAndLocation(html, new URL(target).host);

    return NextResponse.json({
      ok: true,
      title,
      description,
      image,
      category,
      location,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Fetch failed" },
      { status: 400 },
    );
  }
}

