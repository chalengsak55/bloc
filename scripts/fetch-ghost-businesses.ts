#!/usr/bin/env npx tsx
/**
 * Ghost Business Scraper — Google Places API (New)
 *
 * Fetches ~1,000 businesses in SF Bay Area and upserts into ghost_businesses table.
 * Usage: npx tsx scripts/fetch-ghost-businesses.ts
 *
 * Required env vars (from .env.local):
 *   GOOGLE_PLACES_API_KEY
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!GOOGLE_API_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing env vars. Need: GOOGLE_PLACES_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── Config ──────────────────────────────────────────────────────────────────

// SF Bay Area bounding box
const LAT_MIN = 37.25;
const LAT_MAX = 37.85;
const LNG_MIN = -122.55;
const LNG_MAX = -121.80;
const GRID_STEP_KM = 4; // ~4km between grid points (2km radius overlap)
const RADIUS_M = 2000;
const DELAY_MS = 250;

// Google Places types → Bloc categories
const TYPE_TO_CATEGORY: Record<string, string> = {
  restaurant: "food",
  cafe: "food",
  bakery: "food",
  hair_salon: "hair",
  beauty_salon: "hair",
  barber_shop: "barber",
  nail_salon: "hair",
  spa: "hair",
  gym: "other",
  auto_repair: "home",
  laundry: "home",
  pet_store: "other",
  dentist: "other",
  meal_delivery: "food",
  meal_takeaway: "food",
};

const SEARCH_TYPES = Object.keys(TYPE_TO_CATEGORY);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ~111km per degree latitude
function kmToLatDeg(km: number) {
  return km / 111;
}
function kmToLngDeg(km: number, lat: number) {
  return km / (111 * Math.cos((lat * Math.PI) / 180));
}

function buildGrid(): { lat: number; lng: number }[] {
  const points: { lat: number; lng: number }[] = [];
  const latStep = kmToLatDeg(GRID_STEP_KM);

  for (let lat = LAT_MIN; lat <= LAT_MAX; lat += latStep) {
    const lngStep = kmToLngDeg(GRID_STEP_KM, lat);
    for (let lng = LNG_MIN; lng <= LNG_MAX; lng += lngStep) {
      points.push({ lat: Math.round(lat * 10000) / 10000, lng: Math.round(lng * 10000) / 10000 });
    }
  }
  return points;
}

// ─── Google Places API (New) ─────────────────────────────────────────────────

type PlaceResult = {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  nationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  regularOpeningHours?: {
    periods?: {
      open: { day: number; hour: number; minute: number };
      close?: { day: number; hour: number; minute: number };
    }[];
  };
  googleMapsUri?: string;
  photos?: { name: string }[];
  primaryType?: string;
};

async function searchNearby(
  lat: number,
  lng: number,
  type: string,
): Promise<PlaceResult[]> {
  const url = "https://places.googleapis.com/v1/places:searchNearby";

  const body = {
    includedTypes: [type],
    maxResultCount: 20,
    locationRestriction: {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: RADIUS_M,
      },
    },
  };

  const fieldMask = [
    "places.id",
    "places.displayName",
    "places.formattedAddress",
    "places.location",
    "places.nationalPhoneNumber",
    "places.websiteUri",
    "places.rating",
    "places.regularOpeningHours",
    "places.googleMapsUri",
    "places.photos",
    "places.primaryType",
  ].join(",");

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_API_KEY!,
        "X-Goog-FieldMask": fieldMask,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      if (res.status === 429) {
        console.warn(`  Rate limited, waiting 2s...`);
        await sleep(2000);
        return [];
      }
      console.warn(`  API error ${res.status}: ${text.slice(0, 200)}`);
      return [];
    }

    const data = await res.json();
    return data.places ?? [];
  } catch (err) {
    console.warn(`  Fetch error:`, err);
    return [];
  }
}

async function getPhotoUrl(photoName: string): Promise<string | null> {
  try {
    const url = `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=800&maxWidthPx=800&key=${GOOGLE_API_KEY}`;
    const res = await fetch(url, { redirect: "follow" });
    if (res.ok) return res.url;
    return null;
  } catch {
    return null;
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🔍 Ghost Business Scraper");
  console.log("========================\n");

  const grid = buildGrid();
  console.log(`Grid: ${grid.length} points across SF Bay Area`);
  console.log(`Types: ${SEARCH_TYPES.length} categories`);
  console.log(`Total queries: ~${grid.length * SEARCH_TYPES.length}\n`);

  const seen = new Set<string>();
  const businesses: Record<string, {
    place_id: string;
    name: string;
    category: string;
    address: string | null;
    lat: number | null;
    lng: number | null;
    phone: string | null;
    website: string | null;
    photo_ref: string | null;
    rating: number | null;
    opening_hours: unknown;
    google_maps_url: string | null;
  }> = {};

  let queryCount = 0;
  const totalQueries = grid.length * SEARCH_TYPES.length;

  for (const type of SEARCH_TYPES) {
    for (const point of grid) {
      queryCount++;
      const places = await searchNearby(point.lat, point.lng, type);

      for (const p of places) {
        const placeId = p.id;
        if (!placeId || seen.has(placeId)) continue;
        seen.add(placeId);

        businesses[placeId] = {
          place_id: placeId,
          name: p.displayName?.text ?? "Unknown",
          category: TYPE_TO_CATEGORY[p.primaryType ?? type] ?? TYPE_TO_CATEGORY[type] ?? "other",
          address: p.formattedAddress ?? null,
          lat: p.location?.latitude ?? null,
          lng: p.location?.longitude ?? null,
          phone: p.nationalPhoneNumber ?? null,
          website: p.websiteUri ?? null,
          photo_ref: p.photos?.[0]?.name ?? null,
          rating: p.rating ?? null,
          opening_hours: p.regularOpeningHours?.periods ?? null,
          google_maps_url: p.googleMapsUri ?? null,
        };
      }

      if (queryCount % 50 === 0) {
        console.log(`  [${queryCount}/${totalQueries}] ${type} — ${Object.keys(businesses).length} unique businesses`);
      }

      await sleep(DELAY_MS);
    }
  }

  console.log(`\n✅ Found ${Object.keys(businesses).length} unique businesses\n`);

  // Fetch photos (1 per business, with rate limiting)
  const entries = Object.values(businesses);
  console.log("📸 Fetching photos...");

  let photoCount = 0;
  const BATCH_SIZE = 50;

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);

    for (const biz of batch) {
      if (!biz.photo_ref) continue;

      const photoUrl = await getPhotoUrl(biz.photo_ref);
      if (photoUrl) {
        (biz as Record<string, unknown>).photo_url = photoUrl;
        photoCount++;
      }
      await sleep(100);
    }

    console.log(`  Photos: ${photoCount} fetched (${Math.min(i + BATCH_SIZE, entries.length)}/${entries.length})`);
  }

  // Upsert to Supabase in batches
  console.log("\n💾 Upserting to Supabase...");

  const rows = entries.map((b) => ({
    place_id: b.place_id,
    name: b.name,
    category: b.category,
    address: b.address,
    lat: b.lat,
    lng: b.lng,
    phone: b.phone,
    website: b.website,
    photo_url: (b as Record<string, unknown>).photo_url as string | null ?? null,
    rating: b.rating,
    opening_hours: b.opening_hours,
    timezone: "America/Los_Angeles",
    google_maps_url: b.google_maps_url,
  }));

  const UPSERT_BATCH = 100;
  let upserted = 0;

  for (let i = 0; i < rows.length; i += UPSERT_BATCH) {
    const batch = rows.slice(i, i + UPSERT_BATCH);
    const { error } = await supabase
      .from("ghost_businesses")
      .upsert(batch, { onConflict: "place_id" });

    if (error) {
      console.error(`  Upsert error at batch ${i}:`, error.message);
    } else {
      upserted += batch.length;
    }
  }

  console.log(`\n🎉 Done! Upserted ${upserted} ghost businesses.`);
}

main().catch(console.error);
