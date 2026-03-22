# Bloc — Project Context for Claude

## What is Bloc?
AI Agent Commerce Marketplace. Buyers broadcast intent in one sentence → seller agents respond in real-time.
Core philosophy: **Quality wins over ad budget.** No pay-per-lead, ever.

Positioning: "While others help businesses get discovered, Bloc connects them directly to customers in real time."

Live at: **mybloc.me**
GitHub: **chalengsak55/bloc**
Vercel team: chalengsakth-1714

---

## Stack
- **Framework:** Next.js (App Router)
- **Styling:** Tailwind CSS
- **Database:** Supabase (PostgreSQL + Realtime)
- **Auth:** Google OAuth + Magic link email
- **Storage:** Supabase Storage (avatars, messages-media, storefront-media buckets)
- **AI:** Claude API (Anthropic) — reserved for future AI chat feature
- **Deploy:** Vercel (auto-deploy on push to main)

---

## Brand
```
--purple: #7c5ce8
--blue: #4d9ef5
--cyan: #00d4c8
--grad: linear-gradient(135deg, #7c5ce8, #4d9ef5, #00d4c8)
--bg: #0d0d12
```
- **Headings:** Instrument Serif
- **Body:** DM Sans

---

## Auth Rules
- Nearby (browse) → no auth
- Nearby (message) → auth required
- Broadcast → auth required
- Seller onboarding Steps 1-2 → no auth
- Seller onboarding publish (Step 3) → auth required
- Google OAuth + Magic Link both supported
- Same auth for buyer + seller (role differs only)

---

## Key Files
```
src/app/page.tsx → Home ✅
src/app/nearby/page.tsx + ui.tsx → Nearby grid ✅
src/app/broadcast/page.tsx + ui.tsx → Broadcast ✅
src/app/broadcast/[id]/page.tsx → Broadcast results ✅
src/app/seller/[id]/page.tsx + ui.tsx → Public storefront ✅ (rebuilt)
src/app/seller/dashboard/page.tsx + ui.tsx → Seller dashboard ✅
src/app/seller/onboarding/page.tsx + ui.tsx → Onboarding Step 1 ✅
src/app/seller/onboarding/step2/ → Onboarding Step 2 ✅
src/app/seller/onboarding/step3/ → Onboarding Step 3 ✅
src/app/api/seller/publish/route.ts → Publish API ✅
src/app/api/match/route.ts → Matching API
src/app/api/message/route.ts → Direct message API
src/app/api/scrape/ → URL scraper
src/app/message/[sellerId]/ → Direct message ✅
src/app/inbox/ → Inbox list + chat ✅
src/app/profile/ → Buyer profile ✅
src/app/auth/ → Auth + Google callback ✅
src/app/live-ticker.tsx → Ticker ✅
src/lib/supabase/ → Supabase helpers
```

---

## What's Done ✅

### Buyer Side (COMPLETE)
- Home — 2 mode cards, live ticker, tab bar
- Auth — Google OAuth + Magic link, sign out
- Broadcast — auth gate, results real-time
- Nearby — photo grid, category pills, search bar, distance sort
- Direct message → Inbox → Chat with image/video
- Profile — edit name/photo, Active/Past broadcasts

### Seller Onboarding (COMPLETE)
- Step 1 — URL paste (auto-detect IG/TikTok/FB/website) or manual form
- Step 2 — Review + edit info + choose CTA type (Book/Order/Quote/Contact)
- Step 3 — Upload cover photo or video (optional) → Publish
- Publish API — save to profiles table + upload to storefront-media bucket

### Seller Storefront /seller/[id] (COMPLETE - Snapchat vibe)
- Hero — fullscreen cover (image/video or gradient fallback), OPEN NOW pill
- CTA buttons — dynamic based on cta_type field
- Agent bar — "Agent active · Replies in ~2 min"
- Trust metrics — Response rate, Avg reply, 😊 Smiles, Time on Bloc
- Posts tab — 2-col photo/video grid (placeholder, needs seller_posts table)
- Services tab — service list with prices (placeholder)
- NO star ratings — trust metrics only

### Seller Dashboard (COMPLETE)
- Online/Offline toggle
- Incoming requests feed (realtime)
- Reply composer + media upload

---

## Storefront Design Decisions
- **Snapchat vibe** — bold, rounded, American Gen Z, dark bg
- **Layout fixed** — same for all sellers, no template options
- **Color fixed** — purple/blue/cyan brand, no per-seller color (Phase 2)
- **No star ratings** — replaced by trust metrics (response rate, smiles, etc)
- **😊 Smiles** — replaces "jobs done", universal across all categories
- **CTA dynamic** — seller chooses: Book / Order / Quote / Contact
- **Content feed** = seller-owned posts (business content, not UGC)
- **UGC** = Phase 2, video reviews inside storefront only
- **Live streaming** = Phase 2

---

## Supabase Tables
- `profiles` — id, display_name, category, location_text, bio, avatar_url, cover_url, cta_type, role, is_online, lat, lng
- `requests` — buyer broadcasts
- `conversations` + `messages` — chat system
- `seller_posts` — ❌ NOT YET CREATED (needed for Posts tab)

## Supabase Storage Buckets
- `avatars` — user profile photos
- `messages-media` — chat image/video
- `storefront-media` — seller cover photo/video ✅

---

## Next Priorities
1. ❌ `seller_posts` table + seller can upload posts from dashboard
2. ❌ Posts tab shows real content from seller_posts
3. ❌ Nearby grid supports video content
4. ❌ Smiles feature — buyer taps 😊 after conversation ends
5. ❌ Stripe payment ($50/yr Basic, $150/yr Pro)
6. ❌ Short URL mybloc.me/w/[slug] + Open Graph sharing
7. ❌ Broadcast auto-expiry after 24h
8. ❌ Push notifications

---

## Known Issues
- Posts tab currently shows placeholder/empty state — needs seller_posts table
- Services tab uses hardcoded placeholder data — needs services table or JSON field
- Trust metrics are hardcoded — needs real data from DB
- Storefront cover_url not yet showing in hero (needs to read from profiles)
- Inbox fullscreen image/video — not built

---

## Competitors
- Thumbtack, Bark → pay-per-lead
- Bloc: agent-first, no pay-per-lead, quality wins

## Target
- SF Bay Area local services first
- Solo founder, Meta + Google background
- Build traction → investors come

---

## How to Run
```bash
cd "mybloc with claude/bloc"
npm run dev
```

## Deploy
```bash
git add . && git commit -m "msg" && git push
# Vercel auto-deploys on push to main
# ANTHROPIC_API_KEY in Vercel env (reserved for future use)
```
