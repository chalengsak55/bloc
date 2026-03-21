# Bloc — CLAUDE.md

> Mobile-first, dark, realtime marketplace connecting buyers to sellers.
> **Domain:** mybloc.me | **Stack:** Next.js 16 + Supabase + Tailwind CSS 4

---

## Brand

| Token | Value |
|-------|-------|
| Background | `#0d0d12` |
| Foreground | `#f4f4f5` |
| Purple | `#7c5ce8` |
| Blue | `#4d9ef5` |
| Cyan | `#00d4c8` |
| Gradient | `linear-gradient(135deg, #7c5ce8, #4d9ef5, #00d4c8)` |
| Heading font | Instrument Serif |
| Body font | DM Sans |
| Mono font | Geist Mono |
| Tagline | "Quality wins. Not ad budget." |

---

## Completed — Buyer Features

- **Auth** — Google OAuth (PKCE) + Magic Link email via Supabase
- **Broadcast** — one-sentence request with geolocation capture, draft recovery via localStorage
- **Request Results** (`/broadcast/[id]`) — live activity feed, "Your 3 options" matched sellers, confirm/reject, re-run match
- **Nearby** (`/nearby`) — 3-col seller grid, live online status (green/yellow/grey ping), category pill filters, search, Haversine distance, realtime ticker
- **Inbox** (`/inbox`) — conversation list, online badge, deterministic gradient avatars, last-message preview
- **Profile** (`/profile`) — edit name/avatar (Supabase Storage `avatars` bucket), active & past broadcasts, sign out
- **Direct Message** (`/message/[sellerId]`) — message a specific seller with draft passthrough

## Completed — Seller Features

- **Onboarding** (`/seller/onboard`) — paste link URL (IG, FB, website, Google Maps) → auto-fill via `/api/scrape`, manual edit, save → go online
- **Dashboard** (`/seller/dashboard`) — online/offline toggle, incoming requests feed (realtime), reply composer with text + media upload (jpg/png/mp4, 50 MB max via Supabase `media` bucket), draft persistence
- **Storefront** (`/seller/[id]`) — public profile, distance badge, contact link, message button

## Completed — Realtime

- Supabase Realtime channels for: homepage ticker, nearby sellers, request activities, seller dashboard, inbox conversations
- All channels clean up on unmount

---

## Auth Rules

- Middleware guards `/seller/dashboard` and `/seller/onboard` — redirects unauthenticated users to `/auth?redirect=…`
- `/seller/[id]` storefronts are public (no auth required)
- Session stored in cookies via `@supabase/ssr`
- Protected API routes use `supabase.auth.getUser()` server-side

---

## Key Files

| File | Purpose |
|------|---------|
| `src/app/page.tsx` | Landing — logo, LivePill, mode cards, bottom tab bar |
| `src/app/broadcast/ui.tsx` | Broadcast composer |
| `src/app/broadcast/[id]/ui.tsx` | Request results (live activity + matches) |
| `src/app/nearby/ui.tsx` | Seller grid with filters & ticker |
| `src/app/inbox/ui.tsx` | Conversation list |
| `src/app/inbox/[conversationId]/ui.tsx` | Chat view |
| `src/app/seller/onboard/ui.tsx` | Seller onboarding form |
| `src/app/seller/dashboard/ui.tsx` | Seller dashboard + reply composer |
| `src/app/seller/[id]/ui.tsx` | Public seller storefront |
| `src/app/message/[sellerId]/ui.tsx` | Direct message to seller |
| `src/app/profile/ui.tsx` | Buyer profile & broadcast history |
| `src/app/auth/ui.tsx` | Google OAuth + Magic Link UI |
| `src/middleware.ts` | Auth guard for protected routes |
| `src/lib/supabase/client.ts` | Browser Supabase client factory |
| `src/lib/supabase/server.ts` | Server Supabase clients (auth + service role) |
| `src/components/ui/Button.tsx` | Polymorphic button/link component |
| `src/components/ui/Input.tsx` | Styled input component |
| `src/app/api/match/route.ts` | Seller matching algorithm |
| `src/app/api/scrape/route.ts` | URL metadata scraper for onboarding |
| `src/app/api/message/route.ts` | Direct message API |
| `supabase/schema.sql` | Full DB schema + RLS + realtime config |
| `supabase/seed.sql` | 12 fake Bangkok sellers for testing |

---

## Database (Supabase)

**Tables:** profiles, requests, matches, activities, conversations, messages

**Storage buckets:** `avatars` (public), `messages-media` (private)

**Realtime:** All tables published to `supabase_realtime` with `REPLICA IDENTITY FULL`

---

## Seed Data (Bangkok)

12 test sellers across 5 categories, spread around Bangkok coordinates:

| Category | Sellers |
|----------|---------|
| hair | Tony Cuts (Sukhumvit), Mia Studio (Silom), Jay Barber (Ari) |
| food | Ploy Kitchen (Thonglor), Alex Eats (Ekkamai), Nong Catering (Lat Phrao) |
| home | James Fix-It (On Nut), Fern Clean Co. (Bearing) |
| moving | Korn Movers (Bang Na), Eve Express Move (Ramkhamhaeng) |
| tech | Mark Tech (Asok), Pim IT Support (Phrom Phong) |

---

## Next: Seller Onboarding Plan (v2)

Replace the current free-form onboarding with a guided 3-step flow:

### Step 1 — Paste Your Link
Seller pastes their Instagram / Facebook / website / Google Maps URL.
System scrapes metadata via `/api/scrape` to pre-fill profile fields.

### Step 2 — Pick Your Vibe
Visual vibe picker — seller selects a style/mood that represents their brand.
Options could include: minimal, bold, friendly, luxury, playful, etc.
Selected vibe informs the tone and layout of auto-generated templates.

### Step 3 — Choose & Customize Your Template
- Call **Claude API** with scraped profile data + selected vibe
- Generate **4 storefront template options** (layout, copy, color accent)
- Seller previews all 4 and picks one
- Seller can customize: edit text, swap photos, adjust colors
- Save → profile goes live

---

## Commands

```bash
npm run dev      # http://localhost:3000
npm run build    # Production build
npm run lint     # ESLint
```
