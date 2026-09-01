# RME Praktik

Rekam Medis Elektronik berbasis web — Static HTML + Vanilla JavaScript + Bootstrap 5 + Supabase.

## Stack

- **Frontend**: HTML5 + Vanilla JavaScript (ES Modules)
- **Styling**: Bootstrap 5.3 (CDN) + custom CSS
- **Backend/DB**: Supabase (PostgreSQL + Auth)
- **Deploy**: Vercel (static)

## Struktur

```
├── index.html              # Redirect ke dashboard/login
├── login.html
├── dashboard.html
├── pendaftaran.html
├── skrining.html
├── dokter.html
├── farmasi.html
├── pembayaran.html
├── rekam-medis.html
├── laporan.html
├── master-obat.html
├── master-tindakan.html
├── master-biaya.html
├── pengaturan.html
├── css/
│   └── app.css
├── js/
│   ├── config.js           # Supabase URL + anon key
│   ├── supabase-client.js  # Inisialisasi Supabase client
│   ├── auth.js             # Login, logout, session guard
│   ├── api.js              # Semua operasi database
│   ├── utils.js            # Format helpers, toast
│   └── layout.js           # Sidebar + bottom nav injection
└── vercel.json
```

## Development

```bash
npm install
npm run dev
# buka http://localhost:3000
```

## Environment

Tidak diperlukan file `.env` — konfigurasi Supabase ada di `js/config.js`.

Untuk production, nilai di `js/config.js` sudah berisi anon key yang aman untuk di-expose ke client.

## Deploy ke Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Atau hubungkan repository ke Vercel dashboard — deploy otomatis setiap push.
