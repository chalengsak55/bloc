#!/usr/bin/env bash
set -euo pipefail

SUPABASE_URL="https://REDACTED.supabase.co"
SERVICE_KEY="REDACTED"
BUCKET="avatars"

# ── Seller definitions ────────────────────────────────────────────────────────
# format: "email|password|display_name|category|location_text|lat|lng|bio|picsum_seed"
SELLERS=(
  "marcus.chen.bloc@yopmail.com|Bloc1234!|Marcus Chen|barber|Tenderloin, San Francisco|37.7836|-122.4150|Precision cuts, fades & beard trims. Walk-ins welcome on weekdays.|marcus"
  "priya.sharma.bloc@yopmail.com|Bloc1234!|Priya Sharma|hair|Castro, San Francisco|37.7609|-122.4350|Color specialist & keratin treatments. 8 years experience in the Bay.|priya"
  "diego.reyes.bloc@yopmail.com|Bloc1234!|Diego Reyes|food|Mission District, San Francisco|37.7599|-122.4148|Personal chef & meal prep. Latin fusion cuisine, weekly packages available.|diego"
  "jasmine.park.bloc@yopmail.com|Bloc1234!|Jasmine Park|tech|SoMa, San Francisco|37.7785|-122.3948|iPhone & MacBook repair, IT support. Same-day service, no appointment needed.|jasmine"
  "kevin.nguyen.bloc@yopmail.com|Bloc1234!|Kevin Nguyen|home|Daly City, CA|37.6879|-122.4702|General handyman — plumbing, electrical, drywall. Free estimates.|kevin"
  "alicia.washington.bloc@yopmail.com|Bloc1234!|Alicia Washington|hair|Oakland, CA|37.8044|-122.2711|Natural hair care, braids & locs. 10+ years, salon-quality results at home.|alicia"
  "tom.nakamura.bloc@yopmail.com|Bloc1234!|Tom Nakamura|moving|Japantown, San Francisco|37.7850|-122.4294|Local SF moves, licensed & insured. Packing supplies included. Free quotes.|tom"
  "sofia.mendez.bloc@yopmail.com|Bloc1234!|Sofia Mendez|food|Excelsior, San Francisco|37.7228|-122.4300|Home-cooked Mexican food & event catering. Minimum 24-hour notice.|sofia"
  "brian.kim.bloc@yopmail.com|Bloc1234!|Brian Kim|tech|Rockridge, Oakland|37.8368|-122.2526|PC builds, networking & smart-home setup. Remote support also available.|brian"
  "rachel.torres.bloc@yopmail.com|Bloc1234!|Rachel Torres|home|SoMa, San Francisco|37.7801|-122.3975|Deep cleaning, organizing & post-construction cleanup. Eco-friendly products.|rachel"
)

TMPDIR_LOCAL=$(mktemp -d)
echo "→ Working in $TMPDIR_LOCAL"

for entry in "${SELLERS[@]}"; do
  IFS='|' read -r email password display_name category location_text lat lng bio seed <<< "$entry"

  echo ""
  echo "── $display_name ──────────────────────────────────────────────"

  # 1. Create auth user (idempotent — ignore duplicate error)
  USER_JSON=$(curl -sf -X POST \
    "$SUPABASE_URL/auth/v1/admin/users" \
    -H "Authorization: Bearer $SERVICE_KEY" \
    -H "apikey: $SERVICE_KEY" \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"$email\",
      \"password\": \"$password\",
      \"email_confirm\": true,
      \"user_metadata\": {\"display_name\": \"$display_name\"}
    }" || echo "")

  if [ -z "$USER_JSON" ] || echo "$USER_JSON" | jq -e '.code == "email_exists"' > /dev/null 2>&1; then
    # User already exists — fetch their ID
    echo "  user already exists, fetching id..."
    USER_ID=$(curl -sf \
      "$SUPABASE_URL/auth/v1/admin/users?email=$email" \
      -H "Authorization: Bearer $SERVICE_KEY" \
      -H "apikey: $SERVICE_KEY" | jq -r '.users[0].id // empty')
  else
    USER_ID=$(echo "$USER_JSON" | jq -r '.id // empty')
  fi

  if [ -z "$USER_ID" ] || [ "$USER_ID" = "null" ]; then
    echo "  ✗ could not get user id for $email, skipping"
    continue
  fi
  echo "  user id: $USER_ID"

  # 2. Download avatar from picsum.photos
  IMG_FILE="$TMPDIR_LOCAL/${seed}.jpg"
  if [ ! -f "$IMG_FILE" ]; then
    curl -sL "https://picsum.photos/seed/${seed}/300/300" -o "$IMG_FILE"
    echo "  downloaded avatar"
  fi

  # 3. Upload avatar to Supabase storage
  STORAGE_PATH="${USER_ID}.jpg"
  UPLOAD_RESP=$(curl -sf -X POST \
    "$SUPABASE_URL/storage/v1/object/$BUCKET/$STORAGE_PATH" \
    -H "Authorization: Bearer $SERVICE_KEY" \
    -H "apikey: $SERVICE_KEY" \
    -H "Content-Type: image/jpeg" \
    -H "x-upsert: true" \
    --data-binary @"$IMG_FILE" || echo "upload_error")

  if echo "$UPLOAD_RESP" | grep -q "upload_error\|error"; then
    echo "  ✗ upload failed: $UPLOAD_RESP"
    AVATAR_URL=""
  else
    AVATAR_URL="$SUPABASE_URL/storage/v1/object/public/$BUCKET/$STORAGE_PATH"
    echo "  uploaded avatar → $AVATAR_URL"
  fi

  # 4. Upsert profile
  PROFILE_PAYLOAD=$(jq -n \
    --arg id "$USER_ID" \
    --arg display_name "$display_name" \
    --arg category "$category" \
    --arg location_text "$location_text" \
    --argjson lat "$lat" \
    --argjson lng "$lng" \
    --arg bio "$bio" \
    --arg avatar_url "$AVATAR_URL" \
    '{
      id: $id,
      role: "seller",
      display_name: $display_name,
      category: $category,
      location_text: $location_text,
      lat: $lat,
      lng: $lng,
      bio: $bio,
      avatar_url: $avatar_url,
      is_online: true
    }')

  UPSERT_RESP=$(curl -sf -X POST \
    "$SUPABASE_URL/rest/v1/profiles" \
    -H "Authorization: Bearer $SERVICE_KEY" \
    -H "apikey: $SERVICE_KEY" \
    -H "Content-Type: application/json" \
    -H "Prefer: resolution=merge-duplicates" \
    -d "$PROFILE_PAYLOAD" || echo "upsert_error")

  if echo "$UPSERT_RESP" | grep -q "upsert_error\|error"; then
    echo "  ✗ profile upsert failed: $UPSERT_RESP"
  else
    echo "  ✓ profile upserted"
  fi
done

rm -rf "$TMPDIR_LOCAL"
echo ""
echo "✅ Done"
