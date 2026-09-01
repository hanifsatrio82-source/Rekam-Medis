## Rencana Redesign Frontend: RME Praktik
### Mobile-first · Light theme · Full Tailwind · No inline styles

---

### Keputusan Desain

| Aspek | Keputusan |
|---|---|
| Theme | Light/Clean — slate-50 bg, white surface, blue-600 accent |
| Styling | Full Tailwind utility classes, zero inline style |
| Navigation mobile | Bottom nav bar (5 item) |
| Navigation desktop | Sidebar fixed 220px, icon + label |
| Dashboard layout | Queue list berurutan nomor antrean + filter tab status |
| Filter tab | Semua · Skrining · Dokter · Farmasi · Bayar · Selesai |
| Tambah antrean | FAB `+` kanan bawah (above bottom nav) |
| Alur Dokter mobile | Tap pasien di queue → navigate ke `/dokter?visit_id=xxx` → SOAP langsung terbuka |
| Panel/form mobile | Bottom sheet (slide up), desktop tetap side panel |

---

### Fase 1 — app.css (Design Tokens)

Ganti dark token ke light theme di `@theme`:
- Surface: `#ffffff`, `#f8fafc`, `#f1f5f9`
- Text: `#0f172a` (primary), `#64748b` (muted)
- Border: `#e2e8f0`
- Accent: `#2563eb` (blue-600)
- Status colors disesuaikan untuk light background (tetap vibrant)

Hapus semua class CSS custom lama (`.sidebar`, `.app-shell`, `.patient-card`, `.chip-*`, `.data-table`, dll) — tidak diperlukan lagi.

Tambah 2 animasi minimal: `slideUp` (bottom sheet) dan `fadeIn` (overlay).

---

### Fase 2 — Komponen UI Reusable

Buat `src/lib/components/ui/`:
- `Badge.svelte` — status chip dengan color mapping per status kunjungan
- `BottomSheet.svelte` — mobile drawer slide-up dengan drag handle, backdrop, trap focus
- `EmptyState.svelte` — ilustrasi + teks kosong untuk list/table

Tidak membuat Button/Input/Card karena Tailwind utility langsung sudah cukup tanpa wrapper.

---

### Fase 3 — Layout Shell (routes/(app)/+layout.svelte)

**Desktop (lg: ≥1024px):**
```
┌──────────┬──────────────────────────────┐
│ sidebar  │                              │
│ 220px    │   <slot>                     │
│ fixed    │                              │
└──────────┴──────────────────────────────┘
```

**Mobile (<1024px):**
```
┌──────────────────────────────────────┐
│  <slot>  (content)                   │
│                                      │
│                                      │
├──────────────────────────────────────┤
│ 🏠     👥     🩺     💊     ···     │  ← bottom nav, fixed
└──────────────────────────────────────┘
```

Bottom nav 5 item: Dashboard · Pendaftaran · Dokter · Farmasi · `···`

Item `···` membuka BottomSheet berisi: Rekam Medis, Laporan, Skrining, Pembayaran, Master Data, Pengaturan, Keluar.

---

### Fase 4 — Login Page

Sudah pakai Tailwind — selaraskan warna ke design system baru (primary-600 = blue-600). Tambah logo SVG medis proper. Tidak ada perubahan besar.

---

### Fase 5 — Dashboard Page (paling complex)

**Struktur baru:**

```
┌─────────────────────────────────────┐
│ RME Praktik    Sabtu, 30 Agu 2026   │  ← top bar mobile
├─────────────────────────────────────┤
│ [Semua][Skrining][Dokter]···        │  ← scrollable filter tabs
├─────────────────────────────────────┤
│ ┌───────────────────────────────┐   │
│ │ 01  Ahmad Fauzi    [SKRINING] │   │  ← queue card
│ │     08:12 · Pasien baru       │   │
│ └───────────────────────────────┘   │
│ ┌───────────────────────────────┐   │
│ │ 02  Siti Rahayu      [DOKTER] │   │
│ │     08:25 · Menunggu 18 mnt   │   │
│ └───────────────────────────────┘   │
│ ...                                 │
├─────────────────────────────────────┤
│                           [ + ]     │  ← FAB tambah antrean
└─────────────────────────────────────┘
```

Tap queue card → buka BottomSheet sesuai status (form daftar baru/lama, skrining, farmasi, pembayaran). Untuk status DOKTER/SEDANG_DIPERIKSA → `goto('/dokter?visit_id=xxx')`.

Kolom "selesai & batal" dipisah ke section bawah yang collapsible "Kunjungan Selesai Hari Ini (n)".

---

### Fase 6 — Halaman Dokter

**Mobile:** Queue list atas (filter hanya DOKTER/PERIKSA) → tap → SOAP form terbuka (full screen scroll, queue hilang). Tombol "← Antrean" untuk kembali ke list.

**Desktop:** Split view tetap — queue kiri 280px, SOAP editor kanan. Tidak berubah dari UX existing, hanya styling di-Tailwind-kan.

SOAP tabs (S/O/A/P) min-height 44px touch target.

---

### Fase 7 — Halaman Lainnya

Semua halaman mengikuti pola konsisten:

**Farmasi, Pembayaran, Skrining, Pendaftaran:**
- Header: judul halaman + jumlah pasien menunggu
- Filter tab status (jika relevan)
- Queue cards sama seperti dashboard
- Action via BottomSheet mobile / side panel desktop

**Master Data (Obat, Tindakan, Biaya):**
- Search bar full width di mobile
- List card di mobile, table di desktop (lg+)
- Form add/edit: BottomSheet mobile, modal/inline desktop
- Tombol tambah: full-width di mobile, pojok kanan di desktop

**Laporan:**
- Stats summary cards: 2-col mobile, 4-col desktop
- Date filter full-width mobile
- Tabel dengan horizontal scroll + sticky kolom pertama di mobile

**Rekam Medis:**
- Search pasien prominent di atas
- Timeline riwayat kunjungan sebagai cards

**Pengaturan:**
- Single-column form, mobile-friendly, tidak banyak berubah

---

### Urutan Pengerjaan

1. `app.css` — light design tokens, hapus CSS lama, tambah animasi
2. `src/lib/components/ui/Badge.svelte`
3. `src/lib/components/ui/BottomSheet.svelte`
4. `src/lib/components/ui/EmptyState.svelte`
5. `routes/(app)/+layout.svelte` — sidebar desktop + bottom nav mobile
6. `routes/auth/login/+page.svelte`
7. `routes/(app)/dashboard/+page.svelte`
8. `routes/(app)/dokter/+page.svelte`
9. `routes/(app)/farmasi/+page.svelte`
10. `routes/(app)/pembayaran/+page.svelte`
11. `routes/(app)/skrining/+page.svelte`
12. `routes/(app)/pendaftaran/+page.svelte`
13. `routes/(app)/rekam-medis/+page.svelte`
14. `routes/(app)/laporan/+page.svelte`
15. `routes/(app)/master-obat/+page.svelte`
16. `routes/(app)/master-tindakan/+page.svelte`
17. `routes/(app)/master-biaya/+page.svelte`
18. `routes/(app)/pengaturan/+page.svelte`

---

### Batasan
- File `+page.server.ts` dan `+layout.server.ts` **tidak disentuh** — hanya `.svelte` dan `app.css`
- Svelte 5 runes (`$state`, `$derived`, `$effect`) dipertahankan semua
- Tidak ada dependency baru
- Semua logic form `use:enhance` dan action Supabase tetap utuh
