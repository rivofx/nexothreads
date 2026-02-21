# Nexo — Social Feed Platform

A modern, mobile-first social posting platform built with Next.js 14, TypeScript, Tailwind CSS, and Supabase.

---

## Architecture & Decisions

**Stack: Next.js 14 (App Router) + Supabase**

- **Supabase** chosen over Firebase for: SQL with full relational integrity, RLS at DB level, built-in file storage with MIME/size policies, and no extra SDK complexity. Free tier is generous.
- **App Router + Server Components** for initial data fetching (posts, profiles) with zero client JS for static content — better SEO and TTFB.
- **Optimistic UI** for likes/comments: instant feedback, rollback on failure.
- **Infinite scroll** via `react-intersection-observer` + cursor-based pagination (by `created_at`) — avoids offset pagination issues with new posts.
- **Media stored in Supabase Storage** with per-user folder paths enforced by both client validation and storage RLS policies.
- **Username uniqueness** enforced at both the DB level (UNIQUE constraint) and application level (pre-check before auth signup).
- **Dark-first design** with a warm amber/orange brand palette and Playfair Display + DM Sans typography for a refined, editorial feel.

---

## Project Structure

```
nexo/
├── src/
│   ├── app/
│   │   ├── (auth)/              # Public auth pages (no nav)
│   │   │   ├── layout.tsx       # Auth layout (centered card)
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (app)/               # Protected pages
│   │   │   ├── layout.tsx       # App layout with NavBar
│   │   │   ├── feed/page.tsx    # Main feed (server component)
│   │   │   ├── onboarding/page.tsx
│   │   │   └── profile/[username]/page.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx           # Root layout
│   │   └── page.tsx             # Redirects to /login
│   ├── components/
│   │   ├── auth/                # (reserved for auth components)
│   │   ├── feed/
│   │   │   └── FeedClient.tsx   # Infinite scroll feed
│   │   ├── layout/
│   │   │   └── NavBar.tsx       # Top navigation
│   │   ├── post/
│   │   │   ├── PostCard.tsx     # Post display + like/delete
│   │   │   ├── CommentSection.tsx
│   │   │   └── CreatePostModal.tsx
│   │   ├── profile/
│   │   │   ├── ProfileClient.tsx
│   │   │   └── EditButtonClient.tsx
│   │   └── ui/
│   │       └── Avatar.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts        # Browser Supabase client
│   │   │   └── server.ts        # Server Supabase client
│   │   └── utils/
│   │       └── index.ts         # Shared utilities + constants
│   ├── middleware.ts             # Auth guard + onboarding redirect
│   └── types/
│       └── index.ts             # TypeScript types
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql  # Tables + RLS policies
│       └── 002_storage_buckets.sql # Storage buckets + policies
├── .env.example
├── next.config.js
├── tailwind.config.js
└── package.json
```

---

## Setup Instructions

### 1. Clone and install

```bash
git clone <your-repo>
cd nexo
npm install
```

### 2. Create Supabase project

1. Go to [supabase.com](https://supabase.com) → New project (free tier)
2. Wait for project to be ready
3. Copy your **Project URL** and **anon/public key** from Settings → API

### 3. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Run database migrations

In Supabase Dashboard → **SQL Editor**:

1. Paste and run the contents of `supabase/migrations/001_initial_schema.sql`
2. Paste and run the contents of `supabase/migrations/002_storage_buckets.sql`

### 5. Disable email confirmation (required!)

In Supabase Dashboard → **Authentication → Settings**:
- **Disable** "Enable email confirmations" (toggle off)
- Save changes

This allows instant login after registration without email verification.

### 6. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deployment to Vercel

### One-click deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

### Manual steps

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com) → Import your repo
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_APP_URL` (set to your Vercel URL, e.g. `https://nexo.vercel.app`)
4. Deploy

### Post-deployment Supabase config

In Supabase Dashboard → **Authentication → URL Configuration**:
- Add your Vercel URL to **Site URL**: `https://nexo.vercel.app`
- Add to **Redirect URLs**: `https://nexo.vercel.app/**`

---

## Features

| Feature | Status |
|---|---|
| Email + username + password registration | ✅ |
| Login with session persistence | ✅ |
| Onboarding flow (display name, bio, avatar) | ✅ |
| Protected routes via middleware | ✅ |
| Post feed with infinite scroll | ✅ |
| Create post with text (500 char limit) | ✅ |
| Upload up to 4 images per post | ✅ |
| Upload 1 video per post (50MB max) | ✅ |
| Media preview before posting | ✅ |
| Like / unlike with optimistic UI | ✅ |
| Comments with real-time list | ✅ |
| Delete own posts and comments | ✅ |
| Profile page with edit | ✅ |
| Avatar upload | ✅ |
| Relative timestamps | ✅ |
| RLS security on all tables | ✅ |
| Storage security (per-user folders) | ✅ |
| Responsive mobile-first layout | ✅ |
| Loading / error / empty states | ✅ |

---

## Media Rules

- **Images**: JPG, PNG, WebP — max 8MB each — up to 4 per post
- **Video**: MP4, WebM — max 50MB — 1 per post (cannot mix with images)
- File type and size validated client-side before upload
- Storage policies enforce MIME types and sizes server-side

---

## Security Notes

- RLS enabled on all tables; all access requires authentication
- Username uniqueness enforced at DB level (UNIQUE constraint)
- Storage folders scoped by `auth.uid()` — users can only write to their own folder
- Input sanitized via `white-space: pre-wrap` rendering (no raw HTML injection)
- Zod validation on all user inputs before Supabase calls
- Middleware guards all `/feed`, `/profile`, `/onboarding` routes
