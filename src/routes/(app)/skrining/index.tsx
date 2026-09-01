import { component$, useSignal, useVisibleTask$, $ } from "@builder.io/qwik";
import { DocumentHead, useLocation } from "@builder.io/qwik-city";
import { getVisitsByStatus, simpanSkrining } from "~/lib/api";
import { formatWaktu, hitungUsia } from "~/lib/utils";

export const head: DocumentHead = { title: "Skrining — RME Praktik" };

export default component$(() => {
  const loc      = useLocation();
  const visits   = useSignal<any[]>([]);
  const loading  = useSignal(true);
  const selected = useSignal<any>(null);
  const saving   = useSignal(false);
  const toast    = useSignal("");
  const toastOk  = useSignal(true);

  // vital sign fields
  const td           = useSignal("");
  const bb           = useSignal("");
  const suhu         = useSignal("");
  const hr           = useSignal("");
  const rr           = useSignal("");
  const tekananDarah = useSignal("");
  const spo2         = useSignal("");
  const keluhan      = useSignal("");

  const load = $(async () => {
    loading.value = true;
    try {
      visits.value = await getVisitsByStatus("MENUNGGU_SKRINING");
      const pre = loc.url.searchParams.get("visit");
      if (pre) {
        const v = visits.value.find((x: any) => x.id === pre);
        if (v) openVisit(v);
      }
    } finally { loading.value = false; }
  });

  useVisibleTask$(() => { load(); });

  const openVisit = $((v: any) => {
    selected.value = v;
    const cn = v.clinical_notes;
    td.value           = cn?.tb            || "";
    bb.value           = cn?.bb            || "";
    suhu.value         = cn?.suhu          || "";
    hr.value           = cn?.hr            || "";
    rr.value           = cn?.rr            || "";
    tekananDarah.value = cn?.tekanan_darah || "";
    spo2.value         = cn?.spo2          || "";
    keluhan.value      = cn?.keluhan_utama || "";
  });

  const handleSave = $(async () => {
    if (!selected.value) return;
    saving.value = true;
    try {
      await simpanSkrining(selected.value.id, {
        tb: td.value, bb: bb.value, suhu: suhu.value,
        hr: hr.value, rr: rr.value,
        tekanan_darah: tekananDarah.value,
        spo2: spo2.value, keluhan_utama: keluhan.value,
      });
      toast.value = "Skrining tersimpan, pasien diarahkan ke dokter.";
      toastOk.value = true;
      selected.value = null;
      await load();
      setTimeout(() => toast.value = "", 3000);
    } catch (e: any) {
      toast.value = "Gagal: " + e.message;
      toastOk.value = false;
    } finally { saving.value = false; }
  });

  const p = selected.value?.patients;

  return (
    <div class="page">

      {toast.value && (
        <div class="toast-tray">
          <div class={`toast ${toastOk.value ? "toast-ok" : "toast-err"}`}>{toast.value}</div>
        </div>
      )}

      <div class="page-header">
        <h1 class="page-title">Skrining</h1>
        <p class="page-sub">{visits.value.length} pasien menunggu skrining</p>
      </div>

      {loading.value ? (
        <div class="loading"><div class="spin" /></div>
      ) : visits.value.length === 0 ? (
        <div class="empty">
          <div class="empty-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <p class="empty-title">Antrian skrining kosong</p>
          <p class="empty-sub">Semua pasien sudah diskrining hari ini.</p>
        </div>
      ) : (
        <div class="queue">
          {visits.value.map((v: any) => (
            <button key={v.id} class="qcard" data-status="MENUNGGU_SKRINING"
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
                <span class="sbadge sbadge-amber">Skrining</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected.value && (
        <>
          <div class="backdrop" onClick$={() => selected.value = null} />
          <div class="modal" role="dialog" aria-modal="true" aria-label="Form skrining">
            <div class="modal-head">
              <div>
                <span class="modal-title">Skrining Pasien</span>
                <p style="font-size:.75rem;color:var(--text-4);margin-top:2px">
                  #{selected.value.no_antrean} · {selected.value.no_kunjungan}
                </p>
              </div>
              <button class="btn btn-ghost btn-icon btn-sm"
                onClick$={() => selected.value = null} aria-label="Tutup">✕</button>
            </div>
            <div class="modal-body">

              <div class="pt-banner">
                <div class="pt-name">{p?.nama}</div>
                <div class="pt-meta">
                  <span>{hitungUsia(p?.tanggal_lahir)}</span>
                  <span>{p?.jenis_kelamin === "LAKI_LAKI" ? "Laki-laki" : "Perempuan"}</span>
                  <span>No. RM: {p?.no_rm}</span>
                </div>
              </div>

              <div class="form-stack mt-4">

                <div class="field">
                  <label class="label" for="sk-keluhan">
                    Keluhan Utama <span class="req">*</span>
                  </label>
                  <textarea id="sk-keluhan" class="input" rows={3}
                    placeholder="Tuliskan keluhan pasien…"
                    value={keluhan.value}
                    onInput$={(e) => keluhan.value = (e.target as HTMLTextAreaElement).value} />
                </div>

                {/* Anthropometric */}
                <div>
                  <p class="label" style="margin-bottom:var(--s2)">Antropometri</p>
                  <div class="grid-2">
                    <div class="field">
                      <label class="label" for="sk-tb">Tinggi (cm)</label>
                      <input id="sk-tb" class="input" type="number" placeholder="170"
                        value={td.value}
                        onInput$={(e) => td.value = (e.target as HTMLInputElement).value} />
                    </div>
                    <div class="field">
                      <label class="label" for="sk-bb">Berat (kg)</label>
                      <input id="sk-bb" class="input" type="number" placeholder="65"
                        value={bb.value}
                        onInput$={(e) => bb.value = (e.target as HTMLInputElement).value} />
                    </div>
                  </div>
                </div>

                {/* Vital signs */}
                <div>
                  <p class="label" style="margin-bottom:var(--s2)">Tanda Vital</p>
                  <div class="grid-2">
                    <div class="field">
                      <label class="label" for="sk-suhu">Suhu (°C)</label>
                      <input id="sk-suhu" class="input" type="number" step="0.1" placeholder="36.5"
                        value={suhu.value}
                        onInput$={(e) => suhu.value = (e.target as HTMLInputElement).value} />
                    </div>
                    <div class="field">
                      <label class="label" for="sk-hr">Nadi/HR (x/mnt)</label>
                      <input id="sk-hr" class="input" type="number" placeholder="80"
                        value={hr.value}
                        onInput$={(e) => hr.value = (e.target as HTMLInputElement).value} />
                    </div>
                    <div class="field">
                      <label class="label" for="sk-td">Tekanan Darah (mmHg)</label>
                      <input id="sk-td" class="input" type="text" placeholder="120/80"
                        value={tekananDarah.value}
                        onInput$={(e) => tekananDarah.value = (e.target as HTMLInputElement).value} />
                    </div>
                    <div class="field">
                      <label class="label" for="sk-rr">RR (x/mnt)</label>
                      <input id="sk-rr" class="input" type="number" placeholder="20"
                        value={rr.value}
                        onInput$={(e) => rr.value = (e.target as HTMLInputElement).value} />
                    </div>
                    <div class="field">
                      <label class="label" for="sk-spo2">SpO₂ (%)</label>
                      <input id="sk-spo2" class="input" type="number" placeholder="98"
                        value={spo2.value}
                        onInput$={(e) => spo2.value = (e.target as HTMLInputElement).value} />
                    </div>
                  </div>
                </div>

              </div>
            </div>
            <div class="modal-foot">
              <button class="btn btn-ghost btn-full"
                onClick$={() => selected.value = null}>Batal</button>
              <button class="btn btn-primary btn-full"
                onClick$={handleSave}
                disabled={saving.value || !keluhan.value}>
                {saving.value ? "Menyimpan…" : "Simpan & Kirim ke Dokter"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
});
