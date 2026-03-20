#!/usr/bin/env bash
set -euo pipefail

SUPABASE_URL="https://REDACTED.supabase.co"
SERVICE_KEY="REDACTED"
BUCKET="avatars"

# format: "user_id|display_name|loremflickr_keywords|lock_number"
SELLERS=(
  "34cd1eed-37a4-47ce-a97b-16060daf7140|Marcus Chen|barber,haircut|42"
  "3570cfb9-7553-4a4e-9233-02c504207531|Priya Sharma|hair,salon|17"
  "5c6be311-3fe3-4162-98ab-0a05b49d78eb|Diego Reyes|food,cooking,chef|8"
  "c7d89131-cfe9-45d3-86bb-1d48f1196459|Jasmine Park|technology,laptop,computer|23"
  "856962bf-c2e7-4eb0-b140-7d56446fcf52|Kevin Nguyen|tools,repair,handyman|5"
  "d9baeb80-3a08-4b50-b9f2-773a3dd11256|Alicia Washington|hairstyle,braids|31"
  "053ef160-9d70-4b3b-b7e0-6469b70e7bb0|Tom Nakamura|moving,boxes,truck|14"
  "b7a4f477-fa15-4723-8f78-bfa7ede516f6|Sofia Mendez|food,restaurant,mexican|3"
  "1f38e58d-fd67-4fa6-8f0d-f27da30ad679|Brian Kim|computer,programming,tech|19"
  "49303974-224d-40fe-afba-8bc450a580ba|Rachel Torres|interior,cleaning,home|27"
)

TMPDIR_LOCAL=$(mktemp -d)
echo "→ Working in $TMPDIR_LOCAL"
echo ""

for entry in "${SELLERS[@]}"; do
  IFS='|' read -r user_id display_name keywords lock <<< "$entry"

  echo "── $display_name ($keywords) ──"

  # Download category-relevant photo from loremflickr
  IMG_FILE="$TMPDIR_LOCAL/${user_id}.jpg"
  curl -sL "https://loremflickr.com/400/400/${keywords}?lock=${lock}" -o "$IMG_FILE"

  # Verify we got a real image
  FILE_SIZE=$(wc -c < "$IMG_FILE")
  if [ "$FILE_SIZE" -lt 5000 ]; then
    echo "  ✗ download too small (${FILE_SIZE} bytes), skipping"
    continue
  fi
  echo "  downloaded ${FILE_SIZE} bytes"

  # Upload to Supabase storage (overwrite existing)
  STORAGE_PATH="${user_id}.jpg"
  UPLOAD_RESP=$(curl -sf -X POST \
    "$SUPABASE_URL/storage/v1/object/$BUCKET/$STORAGE_PATH" \
    -H "Authorization: Bearer $SERVICE_KEY" \
    -H "apikey: $SERVICE_KEY" \
    -H "Content-Type: image/jpeg" \
    -H "x-upsert: true" \
    --data-binary @"$IMG_FILE")

  echo "  uploaded → $SUPABASE_URL/storage/v1/object/public/$BUCKET/$STORAGE_PATH"

  # Update avatar_url in profiles (in case URL changed)
  AVATAR_URL="$SUPABASE_URL/storage/v1/object/public/$BUCKET/$STORAGE_PATH"
  curl -sf -X PATCH \
    "$SUPABASE_URL/rest/v1/profiles?id=eq.${user_id}" \
    -H "Authorization: Bearer $SERVICE_KEY" \
    -H "apikey: $SERVICE_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"avatar_url\": \"$AVATAR_URL\"}" > /dev/null

  echo "  ✓ profile updated"
  echo ""
done

rm -rf "$TMPDIR_LOCAL"
echo "✅ Done"
