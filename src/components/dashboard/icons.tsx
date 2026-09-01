"use client";

export const IcoPlus = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
);

export const IcoSearch = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
);

export const IcoClose = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>
);

export const IcoChevron = ({ open }: { open?: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={open ? { transform: "rotate(180deg)" } : undefined}><polyline points="6 9 12 15 18 9"/></svg>
);

export const IcoRefresh = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
);

export const IcoUser = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
);

export const IcoClipboard = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
);

export const IcoPill = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.5 3.5a5 5 0 017 7l-7-7zm3 3l-7 7a5 5 0 007 7l7-7-7-7z"/></svg>
);

export const IcoCard = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
);

export const IcoBan = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
);

export const IcoFolder = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
);

export function renderIcon(d: string, size = 20) {
  const parts = d.split(" M").map((seg, i) => (i === 0 ? seg : "M" + seg));
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {parts.map((p, i) => <path key={i} d={p} />)}
    </svg>
  );
}

export function badgeClass(status: string) {
  const m: Record<string, string> = {
    MENUNGGU_SKRINING: "sbadge sbadge-amber",
    MENUNGGU_DOKTER: "sbadge sbadge-blue",
    SEDANG_DIPERIKSA: "sbadge sbadge-violet",
    MENUNGGU_OBAT: "sbadge sbadge-teal",
    MENUNGGU_PEMBAYARAN: "sbadge sbadge-rose",
    SELESAI: "sbadge sbadge-green",
    BATAL: "sbadge sbadge-slate",
  };
  return m[status] ?? "sbadge sbadge-slate";
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 11) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 18) return "Selamat sore";
  return "Selamat malam";
}

export const STATUS_PIPELINE = [
  { key: "MENUNGGU_SKRINING", label: "Skrining", color: "amber" },
  { key: "MENUNGGU_DOKTER", label: "Dokter", color: "blue" },
  { key: "SEDANG_DIPERIKSA", label: "Diperiksa", color: "violet" },
  { key: "MENUNGGU_OBAT", label: "Farmasi", color: "teal" },
  { key: "MENUNGGU_PEMBAYARAN", label: "Bayar", color: "rose" },
  { key: "SELESAI", label: "Selesai", color: "green" },
];
