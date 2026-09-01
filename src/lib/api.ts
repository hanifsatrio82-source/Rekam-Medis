import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let _supabase: SupabaseClient | null = null;
function supabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return _supabase;
}
import { generateNoRM, generateNoKunjungan, generateNoAntrean } from "./utils";

const todayStart = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};
const todayEnd = () => {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
};

const VISIT_SELECT = `
  id, no_antrean, no_kunjungan, status, created_at, updated_at,
  patients(id, no_rm, nama, tanggal_lahir, jenis_kelamin, alamat, no_hp, alergi),
  clinical_notes(id, keluhan_utama, catatan_subjektif, riwayat_penyakit_sekarang, tekanan_darah, suhu, spo2, hr, rr, tb, bb, catatan_pemeriksaan_fisik, edukasi, is_draft, fee_id, fee_snapshot_nama, fee_snapshot_tarif),
  payments(id, total, subtotal, diskon_nominal, diskon_tipe, metode_pembayaran),
  visit_actions(id, action_id, fee_id, fee_snapshot_nama, fee_snapshot_tarif, actions(nama)),
  prescriptions(id, status, is_active, version, prescription_items(id, medication_id, jumlah, aturan_pakai, catatan, is_tersedia, medications(id, nama, kekuatan, satuan, harga_jual))),
  powders(id, is_active, version, jumlah_bungkus, aturan_pakai, catatan, powder_items(id, medication_id, jumlah_tablet, medications(id, nama, kekuatan, satuan, harga_jual)))
`;

// ─── VISITS ──────────────────────────────────────────────────────────────────

export async function getTodayVisits() {
  const { data, error } = await supabase()
    .from("visits")
    .select(VISIT_SELECT)
    .gte("created_at", todayStart())
    .lte("created_at", todayEnd())
    .order("no_antrean", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getVisitsByStatus(status: string | string[]) {
  const statuses = Array.isArray(status) ? status : [status];
  const { data, error } = await supabase()
    .from("visits")
    .select(VISIT_SELECT)
    .in("status", statuses)
    .gte("created_at", todayStart())
    .lte("created_at", todayEnd())
    .order("no_antrean", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function updateVisitStatus(visitId: string, status: string) {
  const { error } = await supabase()
    .from("visits")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", visitId);
  if (error) throw error;
}

// ─── PATIENTS ────────────────────────────────────────────────────────────────

export async function cariPasien(query: string) {
  const { data, error } = await supabase()
    .from("patients")
    .select("id, no_rm, nama, tanggal_lahir, jenis_kelamin, alamat, no_hp")
    .or(`nama.ilike.%${query}%,no_rm.ilike.%${query}%,no_hp.ilike.%${query}%`)
    .order("nama")
    .limit(20);
  if (error) throw error;
  return data || [];
}

export async function daftarBaru(pasienData: Record<string, any>) {
  const noRM = generateNoRM();
  const { data: pasien, error: pe } = await supabase()
    .from("patients")
    .insert({ ...pasienData, no_rm: noRM })
    .select()
    .single();
  if (pe) throw pe;
  const today = await getTodayVisits();
  const noAntrean = generateNoAntrean(today);
  const noKunjungan = generateNoKunjungan();
  const { data: visit, error: ve } = await supabase()
    .from("visits")
    .insert({ patient_id: pasien.id, no_antrean: noAntrean, no_kunjungan: noKunjungan, status: "MENUNGGU_SKRINING" })
    .select()
    .single();
  if (ve) throw ve;
  return { pasien, visit };
}

export async function daftarLama(patientId: string) {
  const today = await getTodayVisits();
  const noAntrean = generateNoAntrean(today);
  const noKunjungan = generateNoKunjungan();
  const { data: visit, error } = await supabase()
    .from("visits")
    .insert({ patient_id: patientId, no_antrean: noAntrean, no_kunjungan: noKunjungan, status: "MENUNGGU_SKRINING" })
    .select()
    .single();
  if (error) throw error;
  return visit;
}

export async function hapusPasien(patientId: string) {
  // visits.patient_id sudah ON DELETE CASCADE (migration 002)
  const { error } = await supabase().from("patients").delete().eq("id", patientId);
  if (error) throw error;
}

export async function updatePasien(patientId: string, data: Record<string, any>) {
  const { error } = await supabase().from("patients").update(data).eq("id", patientId);
  if (error) throw error;
}

// ─── SKRINING ────────────────────────────────────────────────────────────────

export async function simpanSkrining(visitId: string, data: Record<string, any>) {
  const numericFields = ["tb", "bb", "suhu", "hr", "rr", "spo2"];
  const sanitized: Record<string, any> = { ...data };
  for (const f of numericFields) {
    if (sanitized[f] === "" || sanitized[f] === undefined) sanitized[f] = null;
    else if (sanitized[f] !== null) sanitized[f] = Number(sanitized[f]);
  }
  const { error } = await supabase()
    .from("clinical_notes")
    .upsert({ visit_id: visitId, ...sanitized, updated_at: new Date().toISOString() }, { onConflict: "visit_id" });
  if (error) throw error;
  await updateVisitStatus(visitId, "MENUNGGU_DOKTER");
}

// ─── DOKTER ───────────────────────────────────────────────────────────────────

export async function panggil(visitId: string) {
  await updateVisitStatus(visitId, "SEDANG_DIPERIKSA");
}

export async function simpanDraftSOAP(visitId: string, soapData: Record<string, any>) {
  const { error } = await supabase()
    .from("clinical_notes")
    .upsert({ visit_id: visitId, ...soapData, updated_at: new Date().toISOString() }, { onConflict: "visit_id" });
  if (error) throw error;
}

export async function finalisasiDokter(
  visitId: string,
  soapData: Record<string, any>,
  resep: ResepItemInput[] = [],
  puyer: PuyerInput[] = [],
  tindakan: TindakanInput[] = [],
  feeId?: string,
  feeNama?: string,
  feeTarif?: number
) {
  // Simpan SOAP dan resep/tindakan terlebih dahulu
  await simpanDraftSOAP(visitId, soapData);
  await simpanResepDanTindakan(visitId, resep, puyer, tindakan);
  
  // Jika ada fee yang dipilih, simpan snapshot ke clinical_notes
  if (feeId && feeNama && feeTarif) {
    const { data: cn } = await supabase()
      .from("clinical_notes")
      .select("id")
      .eq("visit_id", visitId)
      .single();
    
    if (cn) {
      await supabase()
        .from("clinical_notes")
        .update({ 
          fee_id: feeId,
          fee_snapshot_nama: feeNama,
          fee_snapshot_tarif: feeTarif,
          updated_at: new Date().toISOString()
        })
        .eq("id", cn.id);
    }
  }
  
  // Baru ubah status setelah semua data tersimpan
  await updateVisitStatus(visitId, "MENUNGGU_OBAT");
}

export async function cariDiagnosis(query: string) {
  const { data, error } = await supabase()
    .from("diagnoses")
    .select("kode, nama, nama_en")
    .or(`kode.ilike.%${query}%,nama.ilike.%${query}%,nama_en.ilike.%${query}%`)
    .limit(20);
  if (error) throw error;
  return data || [];
}

// ─── RESEP & TINDAKAN (persistence) ─────────────────────────────────────────

export interface ResepItemInput {
  medication_id: string;
  jumlah: number;
  aturan_pakai: string;
  catatan?: string | null;
}
export interface PuyerInput {
  jumlah_bungkus: number;
  aturan_pakai: string;
  catatan?: string | null;
  items: { medication_id: string; jumlah_tablet: number }[];
}
export interface TindakanInput {
  action_id: string | null;
  fee_id: string;
  fee_snapshot_nama: string;
  fee_snapshot_tarif: number;
}

/**
 * Idempotent persistence untuk resep/puyer/tindakan satu kunjungan.
 * Draft: upsert snapshot tunggal (version 1, is_active true) — item lama diganti.
 * Finalisasi: sama snapshot, lalu status visit dimajukan oleh pemanggil.
 */
export async function simpanResepDanTindakan(
  visitId: string,
  resep: ResepItemInput[],
  puyer: PuyerInput[],
  tindakan: TindakanInput[]
) {
  // 1) prescriptions — soft-delete draft lama, buat snapshot baru
  const { data: oldRx } = await supabase()
    .from("prescriptions")
    .select("id, version")
    .eq("visit_id", visitId).eq("is_active", true);
  const nextRxVersion = (oldRx || []).reduce((m: number, r: any) => Math.max(m, r.version || 0), 0) + 1;
  if (oldRx && oldRx.length > 0) {
    const { error: dxErr } = await supabase()
      .from("prescriptions")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .in("id", oldRx.map((r: any) => r.id));
    if (dxErr) throw dxErr;
  }
  let rxId: string | null = null;
  if (resep.length > 0) {
    const { data: rx, error: rxErr } = await supabase()
      .from("prescriptions")
      .insert({ visit_id: visitId, status: "MENUNGGU", is_active: true, version: nextRxVersion })
      .select("id").single();
    if (rxErr) throw rxErr;
    rxId = rx.id;
    const { error: itemErr } = await supabase().from("prescription_items").insert(
      resep.map((r) => ({
        prescription_id: rx.id,
        medication_id: r.medication_id,
        jumlah: r.jumlah,
        aturan_pakai: r.aturan_pakai || "-",
        catatan: r.catatan ?? null,
        is_tersedia: true,
      }))
    );
    if (itemErr) throw itemErr;
  }

  // 2) powders — soft-delete draft lama, buat snapshot baru
  const { data: oldPw } = await supabase()
    .from("powders")
    .select("id, version")
    .eq("visit_id", visitId).eq("is_active", true);
  const nextPwVersion = (oldPw || []).reduce((m: number, p: any) => Math.max(m, p.version || 0), 0) + 1;
  if (oldPw && oldPw.length > 0) {
    const { error: dxErr } = await supabase()
      .from("powders")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .in("id", oldPw.map((p: any) => p.id));
    if (dxErr) throw dxErr;
  }
  if (puyer.length > 0) {
    const { data: pwRows, error: pwErr } = await supabase()
      .from("powders")
      .insert(puyer.map((p) => ({
        visit_id: visitId,
        jumlah_bungkus: p.jumlah_bungkus,
        aturan_pakai: p.aturan_pakai || "-",
        catatan: p.catatan ?? null,
        is_active: true, version: nextPwVersion,
      })))
      .select("id");
    if (pwErr) throw pwErr;
    const { error: piErr } = await supabase().from("powder_items").insert(
      puyer.flatMap((p, idx) =>
        p.items.map((it) => ({
          powder_id: pwRows[idx].id,
          medication_id: it.medication_id,
          jumlah_tablet: it.jumlah_tablet,
        }))
      )
    );
    if (piErr) throw piErr;
  }

  // 3) visit_actions — full delete + reinsert (tabel audit-only, tidak punya is_active)
  const { error: delErr } = await supabase()
    .from("visit_actions")
    .delete()
    .eq("visit_id", visitId);
  if (delErr) throw delErr;
  if (tindakan.length > 0) {
    const { error: vaErr } = await supabase().from("visit_actions").insert(
      tindakan.map((t) => ({
        visit_id: visitId,
        action_id: t.action_id,
        fee_id: t.fee_id,
        fee_snapshot_nama: t.fee_snapshot_nama,
        fee_snapshot_tarif: t.fee_snapshot_tarif,
      }))
    );
    if (vaErr) throw vaErr;
  }
  return { prescription_id: rxId };
}

export async function getVisitFull(visitId: string) {
  const { data, error } = await supabase()
    .from("visits")
    .select(VISIT_SELECT)
    .eq("id", visitId)
    .single();
  if (error) throw error;
  return data;
}

// ─── FARMASI ──────────────────────────────────────────────────────────────────

export async function serahkanObat(visitId: string) {
  // 1) Tandai resep aktif + semua itemnya DISERAHKAN
  const { data: rxList } = await supabase()
    .from("prescriptions")
    .select("id")
    .eq("visit_id", visitId).eq("is_active", true);
  if (rxList && rxList.length > 0) {
    const ids = rxList.map((r: any) => r.id);
    const { error: rErr } = await supabase()
      .from("prescriptions")
      .update({ status: "DISERAHKAN", updated_at: new Date().toISOString() })
      .in("id", ids);
    if (rErr) throw rErr;

    // 2) Ambil items untuk kurangi stok
    const { data: items } = await supabase()
      .from("prescription_items")
      .select("medication_id, jumlah")
      .in("prescription_id", ids);

    if (items && items.length > 0) {
      // Kurangi stok per item
      for (const it of items) {
        const { data: med } = await supabase()
          .from("medications")
          .select("stok")
          .eq("id", it.medication_id)
          .single();
        if (med) {
          const newStok = Math.max(0, med.stok - it.jumlah);
          await supabase()
            .from("medications")
            .update({ stok: newStok })
            .eq("id", it.medication_id);
        }
      }
    }

    const { error: iErr } = await supabase()
      .from("prescription_items")
      .update({ is_tersedia: true })
      .in("prescription_id", ids);
    if (iErr) throw iErr;
  }

  // 3) Kurangi stok puyer
  const { data: pwList } = await supabase()
    .from("powders")
    .select("id")
    .eq("visit_id", visitId).eq("is_active", true);
  if (pwList && pwList.length > 0) {
    const pwIds = pwList.map((p: any) => p.id);
    const { data: pwItems } = await supabase()
      .from("powder_items")
      .select("medication_id, jumlah_tablet")
      .in("powder_id", pwIds);

    if (pwItems && pwItems.length > 0) {
      for (const it of pwItems) {
        const { data: med } = await supabase()
          .from("medications")
          .select("stok")
          .eq("id", it.medication_id)
          .single();
        if (med) {
          const newStok = Math.max(0, med.stok - it.jumlah_tablet);
          await supabase()
            .from("medications")
            .update({ stok: newStok })
            .eq("id", it.medication_id);
        }
      }
    }
  }

  await updateVisitStatus(visitId, "MENUNGGU_PEMBAYARAN");
}

/**
 * Update ketersediaan satu item resep (stok habis / diganti obat sejenis).
 * Dipakai farmasi sebelum menyerahkan obat.
 */
export async function setItemTersedia(itemId: string, tersedia: boolean) {
  const { error } = await supabase()
    .from("prescription_items")
    .update({ is_tersedia: tersedia })
    .eq("id", itemId);
  if (error) throw error;
}

// ─── PEMBAYARAN ───────────────────────────────────────────────────────────────

export async function bayar(visitId: string, bayarData: Record<string, any>) {
  const { tarif_periksa = 0, tarif_obat = 0, tarif_tindakan = 0, diskon_type, diskon_nilai = 0, metode_pembayaran = "TUNAI" } = bayarData;
  let subtotal = tarif_periksa + tarif_obat + tarif_tindakan;
  let diskon = 0;
  if (diskon_type === "PERSENTASE") diskon = Math.round(subtotal * diskon_nilai / 100);
  else if (diskon_type === "NOMINAL") diskon = diskon_nilai;
  const total = Math.max(0, subtotal - diskon);
  const diskon_nominal_val = Math.round(diskon);
  const { error } = await supabase().from("payments").insert({
    visit_id: visitId,
    subtotal,
    diskon_tipe:        diskon_type || "NOMINAL",
    diskon_nilai:       diskon_nilai,
    diskon_nominal:     diskon_nominal_val,
    total,
    metode_pembayaran,
  });
  if (error) throw error;
  await updateVisitStatus(visitId, "SELESAI");
  return total;
}

// ─── MASTER OBAT ──────────────────────────────────────────────────────────────

export async function getMedications(search = "") {
  let q = supabase().from("medications").select("*").eq("is_aktif", true).order("nama");
  if (search) q = q.ilike("nama", `%${search}%`);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function simpanObat(obatData: Record<string, any>) {
  const { id, ...rest } = obatData;
  if (id) {
    const { error } = await supabase().from("medications").update(rest).eq("id", id);
    if (error) throw error;
  } else {
    const { error } = await supabase().from("medications").insert({ ...rest, is_aktif: true });
    if (error) throw error;
  }
}

export async function hapusObat(id: string) {
  const { error } = await supabase().from("medications").update({ is_aktif: false }).eq("id", id);
  if (error) throw error;
}

// ─── MASTER TINDAKAN & BIAYA (gabungan dari fees) ────────────────────────────

/** Semua fees aktif — dipakai untuk tindakan, biaya pemeriksaan, dll. */
export async function getSemuaBiaya() {
  const { data, error } = await supabase()
    .from("fees")
    .select("*")
    .eq("is_aktif", true)
    .order("nama");
  if (error) throw error;
  return data || [];
}

export async function simpanBiaya(data: Record<string, any>) {
  const { id, ...rest } = data;
  if (id) {
    const { error } = await supabase().from("fees").update(rest).eq("id", id);
    if (error) throw error;
  } else {
    const { error } = await supabase().from("fees").insert({ ...rest, is_aktif: true });
    if (error) throw error;
  }
}

export async function hapusBiaya(id: string) {
  const { error } = await supabase().from("fees").update({ is_aktif: false }).eq("id", id);
  if (error) throw error;
}

// Backward compat aliases
export const getTindakan = getSemuaBiaya;
export const getBiaya = getSemuaBiaya;
export const simpanTindakanMaster = simpanBiaya;
export const hapusTindakan = hapusBiaya;
export const simpanTarif = simpanBiaya;
export const hapusTarif = hapusBiaya;

// ─── LAPORAN ──────────────────────────────────────────────────────────────────

export async function getLaporan(dari?: string, sampai?: string) {
  const start = dari ? `${dari}T00:00:00` : todayStart();
  const end = sampai ? `${sampai}T23:59:59` : todayEnd();
  const { data: visits, error } = await supabase()
    .from("visits")
    .select(`id, no_kunjungan, no_antrean, status, created_at, patients(nama, no_rm), payments(total, diskon_nominal, created_at)`)
    .gte("created_at", start)
    .lte("created_at", end)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const totalPendapatan = (visits || []).flatMap((v: any) => v.payments || []).reduce((s: number, p: any) => s + (p.total || 0), 0);
  return { visits: visits || [], totalPendapatan, jumlahKunjungan: visits?.length || 0, jumlahSelesai: visits?.filter((v: any) => v.status === "SELESAI").length || 0 };
}

// ─── REKAM MEDIS ──────────────────────────────────────────────────────────────

export async function getPasienById(id: string) {
  const { data, error } = await supabase()
    .from("patients")
    .select("id, no_rm, nama, tanggal_lahir, jenis_kelamin, no_hp, alamat")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function getPasienList(search = "", page = 1) {
  const pageSize = 20;
  const from = (page - 1) * pageSize;
  let q = supabase().from("patients").select("id, no_rm, nama, tanggal_lahir, jenis_kelamin, no_hp, alamat", { count: "exact" }).order("nama").range(from, from + pageSize - 1);
  if (search) q = q.or(`nama.ilike.%${search}%,no_rm.ilike.%${search}%`);
  const { data, error, count } = await q;
  if (error) throw error;
  return { patients: data || [], total: count || 0, page, pageSize };
}

export async function getRiwayatKunjungan(patientId: string) {
  const { data, error } = await supabase()
    .from("visits")
    .select(`
      id, no_kunjungan, no_antrean, status, created_at,
      clinical_notes(keluhan_utama, catatan_subjektif, riwayat_penyakit_sekarang, tekanan_darah, suhu, spo2, hr, rr, tb, bb, catatan_pemeriksaan_fisik, edukasi, is_draft, fee_snapshot_nama, fee_snapshot_tarif),
      payments(total, subtotal, diskon_nominal, diskon_tipe, metode_pembayaran),
      visit_actions(id, fee_snapshot_nama, fee_snapshot_tarif, actions(nama)),
      prescriptions(id, status, is_active, version, prescription_items(id, jumlah, aturan_pakai, catatan, is_tersedia, medications(nama, kekuatan, satuan))),
      powders(id, jumlah_bungkus, aturan_pakai, catatan, version, is_active, powder_items(jumlah_tablet, medications(nama, kekuatan, satuan)))
    `)
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

// ─── PENGATURAN ───────────────────────────────────────────────────────────────

export async function getPengaturan() {
  const { data, error } = await supabase().from("practice_settings").select("*").limit(1).single();
  if (error && error.code !== "PGRST116") throw error;
  return data || {};
}

export async function simpanPengaturan(settingsData: Record<string, any>) {
  const existing: any = await getPengaturan();
  if (existing?.id) {
    const { error } = await supabase().from("practice_settings").update(settingsData).eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase().from("practice_settings").insert(settingsData);
    if (error) throw error;
  }
}

export async function getFeesForVisit() {
  const { data, error } = await supabase().from("fees").select("id, nama, kode, tarif, action_id").eq("is_aktif", true);
  if (error) throw error;
  return data || [];
}

// ─── AKUN / PROFILES ──────────────────────────────────────────────────────────

export async function getAkunSaya() {
  const { data: { user } } = await supabase().auth.getUser();
  const { data: { session } } = await supabase().auth.getSession();
  if (!user) return null;
  // coba ambil profile tambahan jika ada
  let profile: any = null;
  try { const r = await supabase().from("profiles").select("*").eq("id", user.id).single(); profile = r.data; } catch {}
  return { user, session, profile: profile || null };
}

export async function getDaftarAkun() {
  const { data, error } = await supabase().from("profiles").select("id, email, display_name, role, is_active, last_sign_in_at, created_at").order("created_at", { ascending: true });
  if (error) {
    // fallback: jika tabel profiles belum ada / belum migrasi, kembalikan akun saat ini saja
    if ((error as any).code === "42P01" || (error.message||"").includes("profiles")) {
      const me = await getAkunSaya();
      if (!me?.user) return [];
      return [{ id: me.user.id, email: me.user.email, display_name: me.user.email?.split("@")[0], role: "owner", is_active: true, last_sign_in_at: me.user.last_sign_in_at, created_at: me.user.created_at }];
    }
    throw error;
  }
  return data || [];
}

export async function getJumlahAkun(): Promise<number> {
  const list = await getDaftarAkun();
  return list.length;
}

export async function undangAkun(email: string, password: string, displayName?: string, role: string = "staff") {
  const { data, error } = await supabase().auth.signUp({
    email, password,
    options: { data: { display_name: displayName || email.split("@")[0], role } }
  });
  if (error) throw error;
  // upsert profile agar langsung muncul di daftar (trigger juga akan buat)
  if (data.user) {
    await supabase().from("profiles").upsert({
      id: data.user.id, email, display_name: displayName || email.split("@")[0], role, is_active: true, updated_at: new Date().toISOString()
    }, { onConflict: "id" } as any);
  }
  return data;
}

export async function updateAkunRole(id: string, role: string) {
  const { error } = await supabase().from("profiles").update({ role, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

export async function setAkunAktif(id: string, isActive: boolean) {
  const { error } = await supabase().from("profiles").update({ is_active: isActive, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

export async function hapusAkun(id: string) {
  const { error } = await supabase().from("profiles").delete().eq("id", id);
  if (error) throw error;
  // Note: auth.users hanya bisa dihapus via service_role / Dashboard.
  // Dengan anon key, hapus di profiles saja (user tidak muncul di daftar, tapi masih bisa login sampai dihapus di Dashboard -> Authentication -> Users).
  // Jika ada edge function dengan service_role, tambahkan call ke admin.deleteUser di sini.
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────

export async function getSession() {
  const { data: { session } } = await supabase().auth.getSession();
  return session;
}

export async function loginUser(email: string, password: string) {
  const { data, error } = await supabase().auth.signInWithPassword({ email, password });
  if (error) throw error;
  // update last_sign_in_at di profiles jika ada
  if (data.user) {
    supabase().from("profiles").update({ last_sign_in_at: new Date().toISOString() }).eq("id", data.user.id).then(()=>{},()=>{});
  }
  return data;
}

export async function logoutUser() {
  await supabase().auth.signOut();
}
