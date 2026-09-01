
# UI/UX Redesign Total — RME Praktik (Round 2)

## Filosofi perubahan

Bukan ganti warna. Ganti *paradigma visual* seluruh aplikasi:

- **Dashboard** → Kanban-style patient flow board, bukan tabel. Setiap pasien adalah *card* dengan status yang dominan secara visual. Flow dari kiri (Skrining) ke kanan (Selesai) terlihat sekilas.
- **Dokter** → Full-screen clinical workspace. Sidebar antrean lebih slim, SOAP area terasa seperti EMR sungguhan dengan visual hierarchy yang kuat.
- **Sidebar** → Icon-only permanent (48px), tooltip on hover. Tidak perlu collapse toggle — selalu compact. Logo di atas.
- **Typography** → Lebih berani. Nama pasien lebih besar. Nomor antrean sangat besar. Numbers monospace dan prominent.
- **Color system** → Tetap dark, tapi lebih dalam. Surface palette lebih kontras. Status colors lebih vibrant.
- **Farmasi & Pembayaran** → Redesign ke dark theme + layout yang sama dengan halaman lain.

---

## Files yang akan diubah (7 files)

### 1. `src/app.css` — Design system baru
- Tambah CSS classes baru: `.patient-card`, `.kanban-col`, `.flow-badge`, `.stat-ring`
- Font size scale yang lebih ekspresif
- Border radius lebih besar (12px, 16px) untuk cards
- Gradient subtle pada header bars
- Hover states via CSS `:hover` pseudo-class, bukan inline JS
- Tambah `--color-surface-750` untuk midpoint
- `.sidebar-icon` class untuk nav icons

### 2. `src/routes/(app)/+layout.svelte` — Icon-only sidebar
- Width **48px permanent** (tidak collapsible, tidak perlu toggle)
- Logo icon di atas (huruf "R" dalam kotak biru)
- Nav icons dengan tooltip (CSS `:hover + .tooltip`)
- Active state: icon highlighted + left accent bar
- Hover states via CSS classes, bukan inline JS
- User avatar circle di bawah, logout icon

### 3. `src/routes/(app)/dashboard/+page.svelte` — Patient Flow Board
- **Layout baru total**: bukan tabel, tapi **kanban board** dengan 5 kolom status
  - Kolom: Skrining | Menunggu Dokter | Diperiksa | Farmasi/Bayar | Selesai
  - Setiap pasien = card dengan nomor antrean besar, nama, waktu masuk, aksi
  - Card yang "butuh aksi" punya glow/accent color sesuai status
- Header tetap: tanggal + stats counters + tombol tambah
- Panel slide-in untuk semua workflow **tetap sama** (tidak diubah logikanya)
- Card actions: tombol aksi utama langsung visible (bukan hamburger menu), secondary actions tetap di dropdown

### 4. `src/routes/(app)/dokter/+page.svelte` — Clinical Workspace
- Queue sidebar tetap ada tapi **lebih slim** (180px), tidak collapsible
- Patient header lebih prominent: nama lebih besar, vitals sebagai grid kecil
- SOAP tabs lebih tebal dan lebih jelas mana yang aktif
- Finalisasi bar di bawah: lebih prominent dengan gradient background
- Plan tab: cards untuk Resep/Puyer/Tindakan lebih jelas dengan left-border colored accent

### 5. `src/routes/(app)/farmasi/+page.svelte` — Dark theme redesign
- Buang semua Tailwind light-mode classes
- Layout: sidebar antrean (dark) + main panel (dark)
- Sama strukturnya tapi visual konsisten

### 6. `src/routes/(app)/pembayaran/+page.svelte` — Dark theme redesign
- Buang semua Tailwind light-mode classes
- Billing breakdown lebih visual: baris dengan icon kecil per item
- Total bayar yang sangat prominent di kanan bawah

### 7. `src/routes/(app)/rekam-medis/+page.svelte` — Timeline lebih visual
- Patient card di kanan punya avatar initials circle
- Timeline entry: date lebih visual (kotak dengan bulan+tahun)
- Expanded view lebih terstruktur

---

## Apa yang TIDAK diubah
- Semua server actions dan business logic
- Semua form names dan field names
- Database queries
- URL structure dan routing
- SOAP form fields
- `use:enhance` patterns
- `$effect` untuk preloadVisit di dokter
