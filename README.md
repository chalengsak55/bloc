## Bloc (mybloc.me)

Mobile-first, dark, realtime marketplace prototype with two user types:

- **Buyer**: one sentence request → live activity feed → 3 seller options → confirm + contact
- **Seller (agent)**: onboard with one link → go online → receive requests → reply with text/media

Tech: **Next.js (App Router)**, **Tailwind**, **Supabase Auth (phone OTP)**, **Supabase Realtime**.

### Setup

Create a Supabase project, then run the SQL in `supabase/schema.sql` in the Supabase SQL editor.

Enable Phone Auth in Supabase:

- **Authentication → Providers → Phone**

Copy env vars:

```bash
cp .env.example .env.local
```

Set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-side matching API uses this)

Run the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

### Product notes (current MVP)

- **“Auto-scrape”** is a safe server fetch that extracts `og:title` / `<title>` + `og:description`.
- **Media replies** are URL-based for now. Next step is Supabase Storage uploads.
- **Matching** is a simple online-seller filter + keyword match. Next step is category taxonomy + geolocation.

### Pages

- `/` landing
- `/auth` phone verification
- `/buyer` compose request
- `/request/[id]` live feed + options
- `/seller/onboard` seller onboarding via link
- `/seller/dashboard` incoming requests + replies

### Realtime

The schema adds `requests`, `matches`, and `activities` to the `supabase_realtime` publication and sets `REPLICA IDENTITY FULL`.
