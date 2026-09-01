import { component$, useSignal, useVisibleTask$, $ } from "@builder.io/qwik";
import { DocumentHead, useLocation } from "@builder.io/qwik-city";
import { getVisitsByStatus, bayar, getFeesForVisit } from "~/lib/api";
import { formatWaktu, hitungUsia, formatRupiah } from "~/lib/utils";

export const head: DocumentHead = { title: "Pembayaran — RME Praktik" };

const METHODS = ["TUNAI", "QRIS", "TRANSFER", "BPJS", "ASURANSI"];

export default component$(() => {
  const loc          = useLocation();
  const visits       = useSignal<any[]>([]);
  const loading      = useSignal(true);
  const selected     = useSignal<any>(null);
  const saving       = useSignal(false);
  const toast        = useSignal("");
  const toastOk      = useSignal(true);

  const fees         = useSignal<any[]>([]);
  const metodeBayar  = useSignal("TUNAI");
  const diskonType   = useSignal("NOMINAL");
  const diskonNilai  = useSignal(0);
  const tarifPeriksa = useSignal(0);
  const tarifObat    = useSignal(0);
  const tarifTindakan= useSignal(0);

  const load = $(async () => {
    loading.value = true;
    try {
      visits.value = await getVisitsByStatus("MENUNGGU_PEMBAYARAN");
      fees.value   = await getFeesForVisit();
      const pre = loc.url.searchParams.get("visit");
      if (pre) {
        const v = visits.value.find((x: any) => x.id === pre);
        if (v) openVisit(v);
      }
    } finally { loading.value = false; }
  });

  const openVisit = $((v: any) => {
    selected.value = v;
    const periksaFee = fees.value.find((f: any) =>
      !f.action_id && f.nama?.toLowerCase().includes("periksa"));
    tarifPeriksa.value  = periksaFee?.tarif || 0;
    tarifObat.value     = 0;
    tarifTindakan.value = 0;
    diskonNilai.value   = 0;
    diskonType.value    = "NOMINAL";
    metodeBayar.value   = "TUNAI";
  });

  useVisibleTask$(() => { load(); });

  // Math inlined to avoid non-serializable closures (Qwik QRL constraint)
  const handleBayar = $(async () => {
    if (!selected.value) return;
    saving.value = true;
    const _sub = tarifPeriksa.value + tarifObat.value + tarifTindakan.value;
    const _dis = diskonType.value === "PERSENTASE"
      ? Math.round(_sub * diskonNilai.value / 100)
      : diskonNilai.value;
    const _total = Math.max(0, _sub - _dis);
    try {
      await bayar(selected.value.id, {
        tarif_periksa: tarifPeriksa.value,
        tarif_obat: tarifObat.value,
        tarif_tindakan: tarifTindakan.value,
        diskon_type: diskonType.value,
        diskon_nilai: diskonNilai.value,
      });
      toast.value   = `Pembayaran ${formatRupiah(_total)} via ${metodeBayar.value} berhasil.`;
      toastOk.value = true;
      selected.value = null;
      await load();
      setTimeout(() => toast.value = "", 3500);
    } catch (e: any) {
      toast.value   = "Gagal: " + e.message;
      toastOk.value = false;
    } finally { saving.value = false; }
  });

  return (
    <div class="page">

      {toast.value && (
        <div class="toast-tray">
          <div class={`toast ${toastOk.value ? "toast-ok" : "toast-err"}`}>{toast.value}</div>
        </div>
      )}

      <div class="page-header">
        <h1 class="page-title">Pembayaran</h1>
        <p class="page-sub">{visits.value.length} pasien menunggu pembayaran</p>
      </div>

      {loading.value ? (
        <div class="loading"><div class="spin" /></div>
      ) : visits.value.length === 0 ? (
        <div class="empty">
          <div class="empty-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
          </div>
          <p class="empty-title">Tidak ada tagihan</p>
          <p class="empty-sub">Belum ada pasien menunggu pembayaran.</p>
        </div>
      ) : (
        <div class="queue">
          {visits.value.map((v: any) => (
            <button key={v.id} class="qcard" data-status="MENUNGGU_PEMBAYARAN"
              onClick$={() => openVisit(v)}>
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
                <span class="sbadge sbadge-rose">Bayar</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected.value && (() => {
        // Math inlined here — no plain functions captured in $() closures
        const _sub   = tarifPeriksa.value + tarifObat.value + tarifTindakan.value;
        const _dis   = diskonType.value === "PERSENTASE"
          ? Math.round(_sub * diskonNilai.value / 100)
          : diskonNilai.value;
        const _total = Math.max(0, _sub - _dis);
        return (
          <>
            <div class="backdrop" onClick$={() => selected.value = null} />
            <div class="sheet" role="dialog" aria-modal="true" aria-label="Proses pembayaran">
              <div class="sheet-grip" />
              <div class="sheet-head">
                <span class="sheet-title">Proses Pembayaran</span>
                <button class="btn btn-ghost btn-icon btn-sm"
                  onClick$={() => selected.value = null} aria-label="Tutup">✕</button>
              </div>
              <div class="sheet-body">

                <div class="pt-banner">
                  <div class="pt-name">{selected.value.patients?.nama}</div>
                  <div class="pt-meta">
                    <span>{hitungUsia(selected.value.patients?.tanggal_lahir)}</span>
                    <span>#{selected.value.no_antrean} · {selected.value.no_kunjungan}</span>
                  </div>
                </div>

                <div class="form-stack mt-4">

                  {/* Tarif */}
                  <div>
                    <p class="label" style="margin-bottom:var(--s2)">Rincian Tarif</p>
                    <div class="grid-2">
                      <div class="field">
                        <label class="label" for="t-periksa">Periksa (Rp)</label>
                        <input id="t-periksa" class="input" type="number" min="0"
                          value={tarifPeriksa.value}
                          onInput$={(e) => tarifPeriksa.value = parseInt((e.target as HTMLInputElement).value) || 0} />
                      </div>
                      <div class="field">
                        <label class="label" for="t-obat">Obat (Rp)</label>
                        <input id="t-obat" class="input" type="number" min="0"
                          value={tarifObat.value}
                          onInput$={(e) => tarifObat.value = parseInt((e.target as HTMLInputElement).value) || 0} />
                      </div>
                      <div class="field">
                        <label class="label" for="t-tindakan">Tindakan (Rp)</label>
                        <input id="t-tindakan" class="input" type="number" min="0"
                          value={tarifTindakan.value}
                          onInput$={(e) => tarifTindakan.value = parseInt((e.target as HTMLInputElement).value) || 0} />
                      </div>
                      <div class="field">
                        <label class="label">Subtotal</label>
                        <input class="input" type="text" disabled value={formatRupiah(_sub)} />
                      </div>
                    </div>
                  </div>

                  {/* Diskon */}
                  <div>
                    <p class="label" style="margin-bottom:var(--s2)">Diskon</p>
                    <div class="grid-2">
                      <div class="field">
                        <label class="label" for="dk-type">Jenis</label>
                        <select id="dk-type" class="input"
                          value={diskonType.value}
                          onChange$={(e) => diskonType.value = (e.target as HTMLSelectElement).value}>
                          <option value="NOMINAL">Nominal (Rp)</option>
                          <option value="PERSENTASE">Persentase (%)</option>
                        </select>
                      </div>
                      <div class="field">
                        <label class="label" for="dk-nilai">Nilai</label>
                        <input id="dk-nilai" class="input" type="number" min="0"
                          value={diskonNilai.value}
                          onInput$={(e) => diskonNilai.value = parseInt((e.target as HTMLInputElement).value) || 0} />
                      </div>
                    </div>
                  </div>

                  {/* Metode */}
                  <div class="field">
                    <label class="label">Metode Pembayaran</label>
                    <div class="method-grid" style="margin-top:var(--s1)">
                      {METHODS.map(m => (
                        <button key={m}
                          class={"method-btn" + (metodeBayar.value === m ? " on" : "")}
                          onClick$={() => metodeBayar.value = m}>
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Total summary */}
                  <div class="pay-summary">
                    <div class="pay-row">
                      <span>Subtotal</span>
                      <span>{formatRupiah(_sub)}</span>
                    </div>
                    {_dis > 0 && (
                      <div class="pay-row pay-discount">
                        <span>Diskon</span>
                        <span>− {formatRupiah(_dis)}</span>
                      </div>
                    )}
                    <div class="pay-row pay-total">
                      <span>Total</span>
                      <span>{formatRupiah(_total)}</span>
                    </div>
                  </div>

                </div>
              </div>
              <div class="sheet-foot">
                <button class="btn btn-ghost btn-full"
                  onClick$={() => selected.value = null}>Batal</button>
                <button class="btn btn-primary btn-full"
                  onClick$={handleBayar} disabled={saving.value}>
                  {saving.value ? "Memproses…" : `Bayar ${formatRupiah(_total)}`}
                </button>
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
});
