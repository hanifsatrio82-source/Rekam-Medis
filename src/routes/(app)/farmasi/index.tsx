import { component$, useSignal, useVisibleTask$, $ } from "@builder.io/qwik";
import { DocumentHead, useLocation } from "@builder.io/qwik-city";
import { getVisitsByStatus, serahkanObat } from "~/lib/api";
import { formatWaktu, hitungUsia } from "~/lib/utils";

export const head: DocumentHead = { title: "Farmasi — RME Praktik" };

export default component$(() => {
  const loc      = useLocation();
  const visits   = useSignal<any[]>([]);
  const loading  = useSignal(true);
  const selected = useSignal<any>(null);
  const saving   = useSignal(false);
  const toast    = useSignal("");
  const toastOk  = useSignal(true);

  const load = $(async () => {
    loading.value = true;
    try {
      visits.value = await getVisitsByStatus("MENUNGGU_OBAT");
      const pre = loc.url.searchParams.get("visit");
      if (pre) selected.value = visits.value.find((v: any) => v.id === pre) || null;
    } finally { loading.value = false; }
  });

  useVisibleTask$(() => { load(); });

  const handleSerahkan = $(async () => {
    if (!selected.value) return;
    saving.value = true;
    try {
      await serahkanObat(selected.value.id);
      toast.value = "Obat diserahkan. Pasien menuju pembayaran.";
      toastOk.value = true;
      selected.value = null;
      await load();
      setTimeout(() => toast.value = "", 3000);
    } catch (e: any) {
      toast.value = "Gagal: " + e.message;
      toastOk.value = false;
    } finally { saving.value = false; }
  });

  const cn = selected.value?.clinical_notes;

  return (
    <div class="page">

      {toast.value && (
        <div class="toast-tray">
          <div class={`toast ${toastOk.value ? "toast-ok" : "toast-err"}`}>{toast.value}</div>
        </div>
      )}

      <div class="page-header">
        <h1 class="page-title">Farmasi</h1>
        <p class="page-sub">{visits.value.length} pasien menunggu obat</p>
      </div>

      {loading.value ? (
        <div class="loading"><div class="spin" /></div>
      ) : visits.value.length === 0 ? (
        <div class="empty">
          <div class="empty-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.5 3.5a5 5 0 017 7l-7-7zm3 3l-7 7a5 5 0 007 7l7-7-7-7z"/></svg>
          </div>
          <p class="empty-title">Antrian farmasi kosong</p>
          <p class="empty-sub">Tidak ada pasien menunggu obat saat ini.</p>
        </div>
      ) : (
        <div class="queue">
          {visits.value.map((v: any) => (
            <button key={v.id} class="qcard" data-status="MENUNGGU_OBAT"
              onClick$={() => selected.value = v}>
              <div class="qcard-num">{String(v.no_antrean).padStart(2, "0")}</div>
              <div class="qcard-body">
                <div class="qcard-name">{v.patients?.nama}</div>
                <div class="qcard-meta">
                  <span>{formatWaktu(v.created_at)}</span>
                  <span class="qcard-meta-dot" />
                  <span>{v.no_kunjungan}</span>
                </div>
              </div>
              <div class="qcard-right">
                <span class="sbadge sbadge-teal">Farmasi</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected.value && (
        <>
          <div class="backdrop" onClick$={() => selected.value = null} />
          <div class="sheet" role="dialog" aria-modal="true" aria-label="Persiapan obat">
            <div class="sheet-grip" />
            <div class="sheet-head">
              <div>
                <span class="sheet-title">Persiapan Obat</span>
                <p style="font-size:.75rem;color:var(--text-4);margin-top:2px">
                  Antrean #{selected.value.no_antrean}
                </p>
              </div>
              <button class="btn btn-ghost btn-icon btn-sm"
                onClick$={() => selected.value = null} aria-label="Tutup">✕</button>
            </div>
            <div class="sheet-body">

              <div class="pt-banner">
                <div class="pt-name">{selected.value.patients?.nama}</div>
                <div class="pt-meta">
                  <span>{hitungUsia(selected.value.patients?.tanggal_lahir)}</span>
                  <span>No. RM: {selected.value.patients?.no_rm}</span>
                </div>
              </div>

              {cn?.keluhan_utama && (
                <div class="alert alert-info mt-3">
                  <strong>Keluhan:</strong> {cn.keluhan_utama}
                </div>
              )}

              {cn?.catatan_pemeriksaan_fisik && (
                <div class="alert alert-info mt-3">
                  <strong>Pemeriksaan:</strong> {cn.catatan_pemeriksaan_fisik}
                </div>
              )}

              <div class="mt-4">
                <div class="empty" style="padding:var(--s8) 0">
                  <div class="empty-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.5 3.5a5 5 0 017 7l-7-7zm3 3l-7 7a5 5 0 007 7l7-7-7-7z"/></svg>
                  </div>
                  <p class="empty-title">Siapkan obat sesuai instruksi dokter</p>
                  <p class="empty-sub">Klik "Obat Diserahkan" setelah obat diberikan ke pasien.</p>
                </div>
              </div>
            </div>
            <div class="sheet-foot">
              <button class="btn btn-ghost btn-full"
                onClick$={() => selected.value = null}>Batal</button>
              <button class="btn btn-primary btn-full"
                onClick$={handleSerahkan} disabled={saving.value}>
                {saving.value ? "Memproses…" : "Obat Diserahkan →"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
});
