import type { InputHTMLAttributes, ChangeEvent } from "react";

// ─── Numeric input helper ──────────────────────────────────────────────────

export function numericProps(
  value: number | string,
  onChange: (val: number) => void,
): InputHTMLAttributes<HTMLInputElement> {
  return {
    type: "text",
    inputMode: "numeric",
    value: String(value ?? ""),
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value.replace(/[^0-9]/g, "");
      onChange(v === "" ? 0 : parseInt(v, 10));
    },
  };
}

// ─── Decimal input helper (for fields like temperature) ────────────────────

export function decimalProps(
  value: number | string,
  onChange: (val: string) => void,
): InputHTMLAttributes<HTMLInputElement> {
  return {
    type: "text",
    value: String(value ?? ""),
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      let cleaned = raw.replace(/[^0-9.,]/g, "");
      // normalize comma → dot
      cleaned = cleaned.replace(",", ".");
      // collapse multiple dots: keep only first
      const idx = cleaned.indexOf(".");
      if (idx !== -1) cleaned = cleaned.slice(0, idx + 1) + cleaned.slice(idx + 1).replace(/\./g, "");
      onChange(cleaned);
    },
  };
}

// ─── Format helpers ───────────────────────────────────────────────────────────

export function formatRupiah(amount: number | null | undefined): string {
  if (amount == null) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatTanggal(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(dateStr));
}

export function formatTanggalPendek(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(dateStr));
}

export function formatWaktu(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr));
}

export function hitungUsia(tanggalLahir: string | null | undefined): string {
  if (!tanggalLahir) return "-";
  const lahir = new Date(tanggalLahir);
  const sekarang = new Date();
  let tahun = sekarang.getFullYear() - lahir.getFullYear();
  let bulan = sekarang.getMonth() - lahir.getMonth();
  if (bulan < 0 || (bulan === 0 && sekarang.getDate() < lahir.getDate())) {
    tahun--;
    bulan += 12;
  }
  if (tahun < 1) return `${bulan} bln`;
  if (tahun < 2) return `${tahun} thn ${bulan} bln`;
  return `${tahun} thn`;
}

export function tanggalHariIni(): string {
  return new Date().toISOString().split("T")[0];
}

export function formatStatusLabel(status: string): string {
  const map: Record<string, string> = {
    MENUNGGU_SKRINING: "Skrining",
    MENUNGGU_DOKTER: "Dokter",
    SEDANG_DIPERIKSA: "Diperiksa",
    MENUNGGU_OBAT: "Farmasi",
    MENUNGGU_PEMBAYARAN: "Pembayaran",
    SELESAI: "Selesai",
    BATAL: "Batal",
  };
  return map[status] || status;
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    MENUNGGU_SKRINING: "warning",
    MENUNGGU_DOKTER: "primary",
    SEDANG_DIPERIKSA: "purple",
    MENUNGGU_OBAT: "orange",
    MENUNGGU_PEMBAYARAN: "pink",
    SELESAI: "success",
    BATAL: "muted",
  };
  return map[status] || "muted";
}

export function generateNoRM(): string {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `RM${y}${m}${rand}`;
}

export function generateNoKunjungan(): string {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 900) + 100;
  return `KNJ${y}${m}${d}${rand}`;
}

export function generateNoAntrean(existing: Array<{ no_antrean?: number }>): number {
  const nums = (existing || []).map((v) => v.no_antrean || 0);
  return nums.length > 0 ? Math.max(...nums) + 1 : 1;
}
