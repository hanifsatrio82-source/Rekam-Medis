# RME Praktik

Rekam Medis Elektronik berbasis web — **Qwik City + Supabase** (SSR/SSG, resumable, zero-hydration).

## Stack

| Layer | Tech |
|-------|------|
| **Framework** | Qwik 1.16 + Qwik City (SSR/SSG) |
| **Build** | Vite 6 |
| **Language** | TypeScript |
| **Styling** | CSS Modules / Tailwind (sesuai implementasi) |
| **Backend/DB** | Supabase (PostgreSQL + Auth + Realtime) |
| **Deploy** | Vercel (Edge Functions) |
| **Package Manager** | npm |

## Struktur Project

```
├── src/
│   ├── routes/              # Qwik City routes (file-based routing)
│   │   ├── (auth)/          # Login, register, layout
│   │   ├── (app)/           # Dashboard, pendaftaran, skrining, dll
│   │   └── api/             # API endpoints (jika ada)
│   ├── components/          # Shared Qwik components
│   ├── services/            # Supabase client, API helpers
│   ├── hooks/               # Custom Qwik hooks
│   ├── types/               # TypeScript types
│   └── utils/               # Format helpers, constants
├── adapters/
│   └── vercel-edge/         # Vercel Edge adapter config
├── public/                  # Static assets
├── scripts/                 # Build scripts (patch-qwik.js)
├── supabase/                # Supabase migrations, types, config
├── .env                     # Supabase URL + anon key (local)
├── .env.local               # Local overrides
├── vercel.json              # Vercel deploy config
├── vite.config.js           # Vite config
├── tsconfig.json            # TypeScript config
└── package.json
```

## Development

```bash
# Install dependencies
npm install

# Dev server (SSR mode)
npm run dev
# buka http://localhost:5173 (default Vite)

# Build untuk production
npm run build

# Preview production build
npm run preview
```

## Environment Variables

Buat file `.env` (sudah ada template di repo):

```env
PUBLIC_SUPABASE_URL=your-project-url
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

> `PUBLIC_` prefix agar bisa diakses di client-side Qwik.

## Deploy ke Vercel

**Opsi 1: Vercel Dashboard (Recommended)**
1. Push ke GitHub
2. Import project di Vercel
3. Set Environment Variables di Vercel Dashboard
4. Deploy otomatis tiap push ke `main`

**Opsi 2: Vercel CLI**
```bash
npm i -g vercel
vercel --prod
```

## Scripts Utama

| Command | Deskripsi |
|---------|-----------|
| `npm run dev` | Dev server dengan SSR |
| `npm run build` | Full build (client + server) |
| `npm run build.client` | Client-only build |
| `npm run build.server` | Server/Edge build |
| `npm run preview` | Preview production build |
| `npm run qwik` | Qwik CLI commands |

## Catatan Teknis

- **Zero Hydration**: Qwik serialize state ke HTML, tidak perlu hydration di client
- **Resumable**: App resume dari server state tanpa re-execute JS
- **Edge Ready**: Deploy ke Vercel Edge Functions untuk latency minimal
- **Type-Safe**: End-to-end TypeScript (Supabase types generated via `supabase/`)

## Supabase Setup

```bash
# Generate types dari Supabase project
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > supabase/types.ts
```

---

**Update**: Stack sebelumnya (HTML + Vanilla JS + Bootstrap) sudah diganti ke Qwik City sejak migrasi.