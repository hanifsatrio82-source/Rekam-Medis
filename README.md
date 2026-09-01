# RME Praktik

Rekam Medis Elektronik berbasis web — **Next.js 15 App Router + Supabase**.

## Stack

| Layer | Tech |
|-------|------|
| **Framework** | Next.js 15 (App Router, SSR/SSG) |
| **Language** | TypeScript |
| **Styling** | CSS variables (global.css design system) |
| **Backend/DB** | Supabase (PostgreSQL + Auth + Realtime) |
| **Deploy** | Vercel |
| **Package Manager** | npm |

## Struktur Project

```
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (app)/              # Dashboard, pendaftaran, skrining, dokter, rekam-medis, dll.
│   │   ├── (auth)/             # Login
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Root redirect
│   ├── components/
│   │   └── dashboard/          # Shared components (Drawers, icons, UI)
│   ├── lib/
│   │   ├── api.ts              # Supabase query helpers
│   │   ├── utils.ts            # Format helpers, numeric input utilities
│   │   └── supabase/           # Supabase client (browser, server, middleware)
│   └── styles/global.css       # Design system (CSS variables, components)
├── middleware.ts               # Route protection
├── supabase/
│   └── migrations/             # Database migrations
├── .env.local                  # Supabase URL + anon key
├── next.config.ts              # Next.js config
├── tsconfig.json               # TypeScript config
└── package.json
```

## Development

```bash
# Install dependencies
npm install

# Dev server
npm run dev
# buka https://localhost:3000

# Build untuk production
npm run build

# Preview production build
npm run start
```

## Environment Variables

Buat file `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

> `NEXT_PUBLIC_` prefix agar bisa diakses di client-side.

## Deploy ke Vercel

**Otomatis:** Push ke GitHub → Vercel deploy mixtomatis.

**Manual:**
```bash
vercel --prod
```

## Scripts

| Command | Deskripsi |
|---------|-----------|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Production server |
| `npm run lint` | ESLint |

## Supabase Migrations

```
supabase/migrations/
├── 000_initial_schema.sql
├── 002_sync_schema.sql
├── 008_nullable_action_id.sql
└── 009_god_role.sql
```

---

*Migrasi dari Qwik ke Next.js (App Router) pada September 2026.*
