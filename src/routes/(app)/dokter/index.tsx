import { component$, useSignal, useVisibleTask$, $ } from "@builder.io/qwik";
import { DocumentHead, useLocation } from "@builder.io/qwik-city";
import { getVisitsByStatus, panggil, simpanDraftSOAP, simpanResepDanTindakan, finalisasiDokter, cariDiagnosis, getMedications, getTindakan, getFeesForVisit } from "~/lib/api";
import { formatWaktu, hitungUsia, formatRupiah } from "~/lib/utils";

export const head: DocumentHead = { title: "Dokter — RME Praktik" };

export default component$(() => {
  const loc       = useLocation();
  const visits    = useSignal<any[]>([]);
  const loading   = useSignal(true);
  const selected  = useSignal<any>(null);
  const saving    = useSignal(false);
  const toast     = useSignal("");
  const toastOk   = useSignal(true);
  const showList  = useSignal(true);

  // SOAP fields
  const subjektif = useSignal("");
  const objektif  = useSignal("");
  const asesmen   = useSignal("");
  const plan      = useSignal("");

  // Diagnosis
  const dxQuery   = useSignal("");
  const dxResults = useSignal<any[]>([]);
  const dxList    = useSignal<any[]>([]);

  // Resep (list-based)
  const resepRows = useSignal<{medication_id: string; nama: string; signa: string; jumlah: string; query: string}[]>([
    { medication_id: "", nama: "", signa: "", jumlah: "", query: "" }
  ]);

  // Prescription
  const obatList    = useSignal<any[]>([]);
  const resepItems  = useSignal<any[]>([]);
  const obatQuery   = useSignal("");
  const obatResults = useSignal<any[]>([]);
  const signaInput  = useSignal("");
  const jumlahInput = useSignal("1");

  // Tindakan
  const tindakanQuery   = useSignal("");
  const tindakanResults = useSignal<any[]>([]);
  const tindakanMaster  = useSignal<any[]>([]);
  const tindakanList    = useSignal<any[]>([]);

  // Puyer
  const puyerRows = useSignal<{nama: string; jumlah: string; query: string}[]>([
    { nama: "", jumlah: "", query: "" }
  ]);
  const puyerJml   = useSignal("");
  const puyerSigna = useSignal("");

  // Plan tabs
  const planTab = useSignal<"resep"|"puyer"|"edukasi"|"tindakan">("resep");

  // Biaya Pemeriksaan Popup
  const showFeePopup    = useSignal(false);
  const feeList         = useSignal<any[]>([]);
  const selectedFee     = useSignal<any>(null);

  // Vital signs (Objektif)
  const oSistol  = useSignal("");
  const oDiastol = useSignal("");
  const oHr      = useSignal("");
  const oRr      = useSignal("");
  const oSpo2    = useSignal("");
  const oSuhu    = useSignal("");
  const oTb      = useSignal("");
  const oBb      = useSignal("");

  const showToast = $((msg: string, ok = true) => {
    toast.value = msg; toastOk.value = ok;
    setTimeout(() => toast.value = "", 3000);
  });

  const loadSOAP = $((v: any) => {
    const cn = v.clinical_notes;
    subjektif.value = cn?.catatan_subjektif || cn?.keluhan_utama || "";
    objektif.value  = cn?.catatan_pemeriksaan_fisik || "";
    // Parse vital signs dari skrining
    const td = cn?.tekanan_darah || "";
    const parts = td.split("/");
    oSistol.value  = parts[0]?.trim() || "";
    oDiastol.value = parts[1]?.trim() || "";
    oHr.value      = cn?.hr   != null ? String(cn.hr)   : "";
    oRr.value      = cn?.rr   != null ? String(cn.rr)   : "";
    oSpo2.value    = cn?.spo2 != null ? String(cn.spo2) : "";
    oSuhu.value    = cn?.suhu != null ? String(cn.suhu) : "";
    oTb.value      = cn?.tb   != null ? String(cn.tb)   : "";
    oBb.value      = cn?.bb   != null ? String(cn.bb)   : "";
    try {
      dxList.value = cn?.riwayat_penyakit_sekarang ? JSON.parse(cn.riwayat_penyakit_sekarang) : [];
    } catch { dxList.value = []; }
    plan.value         = cn?.edukasi || "";
    // Load prescriptions into resepRows
    const rxList = (v.prescriptions || []).filter((r: any) => r.is_active);
    const rxItems = rxList.flatMap((r: any) => r.prescription_items || []);
    const loadedRows = rxItems.map((it: any) => ({
      medication_id: it.medication_id || "",
      nama: `${it.medications?.nama || "?"} ${it.medications?.kekuatan || ""}`.trim(),
      signa: it.aturan_pakai || "",
      jumlah: String(it.jumlah || ""),
      query: "",
    }));
    resepRows.value = loadedRows.length > 0 ? loadedRows : [{ medication_id: "", nama: "", signa: "", jumlah: "", query: "" }];
    // Load powders into puyerRows
    const pwList = (v.powders || []).filter((p: any) => p.is_active);
    const allPuyerRows: {nama: string; jumlah: string; query: string}[] = [];
    for (const p of pwList) {
      for (const it of (p.powder_items || [])) {
        allPuyerRows.push({
          nama: `${it.medications?.nama || "?"} ${it.medications?.kekuatan || ""}`.trim(),
          jumlah: String(it.jumlah_tablet || ""),
          query: "",
        });
      }
    }
    puyerRows.value = allPuyerRows.length > 0 ? allPuyerRows : [{ nama: "", jumlah: "", query: "" }];
    if (pwList.length > 0) {
      puyerJml.value = String(pwList[0].jumlah_bungkus || "");
      puyerSigna.value = pwList[0].aturan_pakai || "";
    }
    // Load visit_actions
    const vaList = v.visit_actions || [];
    tindakanList.value = vaList.map((va: any) => ({
      id: va.id,
      action_id: va.action_id,
      fee_id: va.fee_id,
      nama: va.actions?.nama || va.fee_snapshot_nama || "?",
      tarif: va.fee_snapshot_tarif,
    }));
  });

  const load = $(async () => {
    loading.value = true;
    try {
      visits.value   = await getVisitsByStatus(["MENUNGGU_DOKTER", "SEDANG_DIPERIKSA"]);
      obatList.value = await getMedications();
      tindakanMaster.value = await getTindakan(); // fees + actions
      const preselect = loc.url.searchParams.get("visit");
      if (preselect) {
        const v = visits.value.find((x: any) => x.id === preselect);
        if (v) { selected.value = v; await loadSOAP(v); showList.value = false; }
      }
    } finally { loading.value = false; }
  });

  useVisibleTask$(() => { load(); });

  const selectVisit = $(async (v: any) => {
    selected.value = v;
    await loadSOAP(v);
    if (v.status === "MENUNGGU_DOKTER") await panggil(v.id);
    showList.value = false;
  });

  const saveDraft = $(async () => {
    if (!selected.value) return;
    saving.value = true;
    const td = oSistol.value && oDiastol.value ? `${oSistol.value}/${oDiastol.value}` : oSistol.value || "";
    try {
      await simpanDraftSOAP(selected.value.id, {
        catatan_subjektif: subjektif.value,
        catatan_pemeriksaan_fisik: objektif.value,
        riwayat_penyakit_sekarang: JSON.stringify(dxList.value),
        tekanan_darah: td || null,
        hr:   oHr.value   ? Number(oHr.value)   : null,
        rr:   oRr.value   ? Number(oRr.value)   : null,
        spo2: oSpo2.value ? Number(oSpo2.value) : null,
        suhu: oSuhu.value ? Number(oSuhu.value) : null,
        tb:   oTb.value   ? Number(oTb.value)   : null,
        bb:   oBb.value   ? Number(oBb.value)   : null,
        edukasi: plan.value,
        is_draft: true,
      });
      // Persist resep, puyer, tindakan (idempotent)
      const mappedResep = resepRows.value
        .filter((r) => r.medication_id && r.jumlah)
        .map((r) => ({
          medication_id: r.medication_id,
          jumlah: parseInt(r.jumlah) || 1,
          aturan_pakai: r.signa || "-",
          catatan: null,
        }));
      // TODO: map puyerRows to PuyerInput[] when puyer logic is ready
      const puyerData: any[] = [];
      const tindakanData = tindakanList.value.map((t) => ({
        action_id: t.action_id,
        fee_id: t.fee_id,
        fee_snapshot_nama: t.nama,
        fee_snapshot_tarif: t.tarif || 0,
      }));
      await simpanResepDanTindakan(selected.value.id, mappedResep, puyerData, tindakanData);
      showToast("Draft tersimpan.");
    } catch (e: any) { showToast("Gagal: " + e.message, false); }
    finally { saving.value = false; }
  });

  const finalisasi = $(async () => {
    if (!selected.value) return;
    // Tampilkan popup biaya pemeriksaan terlebih dahulu
    // Load fee list jika belum ada
    if (feeList.value.length === 0) {
      feeList.value = await getFeesForVisit();
    }
    selectedFee.value = null; // Reset pilihan
    showFeePopup.value = true;
  });

  const confirmFinalisasi = $(async () => {
    if (!selected.value || !selectedFee.value) return;
    showFeePopup.value = false;
    saving.value = true;
    const td = oSistol.value && oDiastol.value ? `${oSistol.value}/${oDiastol.value}` : oSistol.value || "";
    try {
      const soapPayload = {
        catatan_subjektif: subjektif.value,
        catatan_pemeriksaan_fisik: objektif.value,
        riwayat_penyakit_sekarang: JSON.stringify(dxList.value),
        tekanan_darah: td || null,
        hr:   oHr.value   ? Number(oHr.value)   : null,
        rr:   oRr.value   ? Number(oRr.value)   : null,
        spo2: oSpo2.value ? Number(oSpo2.value) : null,
        suhu: oSuhu.value ? Number(oSuhu.value) : null,
        tb:   oTb.value   ? Number(oTb.value)   : null,
        bb:   oBb.value   ? Number(oBb.value)   : null,
        edukasi: plan.value,
        is_draft: false,
      };
      const mappedResep = resepRows.value
        .filter((r) => r.medication_id && r.jumlah)
        .map((r) => ({
          medication_id: r.medication_id,
          jumlah: parseInt(r.jumlah) || 1,
          aturan_pakai: r.signa || "-",
          catatan: null,
        }));
      // TODO: map puyerRows to PuyerInput[] when puyer logic is ready
      const puyerData: any[] = [];
      const tindakanData = tindakanList.value.map((t) => ({
        action_id: t.action_id,
        fee_id: t.fee_id,
        fee_snapshot_nama: t.nama,
        fee_snapshot_tarif: t.tarif || 0,
      }));
      // Kirim fee yang dipilih ke API
      await finalisasiDokter(
        selected.value.id,
        soapPayload,
        mappedResep,
        puyerData,
        tindakanData,
        selectedFee.value.id,
        selectedFee.value.nama,
        selectedFee.value.tarif
      );
      showToast("Pemeriksaan selesai. Pasien diarahkan ke farmasi.");
      selected.value = null; showList.value = true;
      await load();
    } catch (e: any) { showToast("Gagal: " + e.message, false); }
    finally { saving.value = false; }
  });

  const searchDx = $(async (q: string) => {
    dxQuery.value = q;
    if (q.length < 2) { dxResults.value = []; return; }
    dxResults.value = await cariDiagnosis(q);
  });

  const addDx = $((dx: any) => {
    if (!dxList.value.find((d: any) => d.kode === dx.kode))
      dxList.value = [...dxList.value, dx];
    dxQuery.value = ""; dxResults.value = [];
  });

  const searchObat = $((q: string) => {
    obatQuery.value = q;
    if (q.length < 1) { obatResults.value = []; return; }
    obatResults.value = obatList.value
      .filter((o: any) => o.nama.toLowerCase().includes(q.toLowerCase()))
      .slice(0, 10);
  });

  const addResep = $((obat: any) => {
    resepItems.value = [...resepItems.value, {
      medication_id: obat.id, nama: obat.nama, satuan: obat.satuan,
      kekuatan: obat.kekuatan,
      jumlah: parseInt(jumlahInput.value) || 1, signa: signaInput.value,
    }];
    obatQuery.value = ""; obatResults.value = [];
    signaInput.value = ""; jumlahInput.value = "1";
  });

  const addTindakan = $((fee: any) => {
    if (!tindakanList.value.find((t: any) => t.fee_id === fee.id)) {
      tindakanList.value = [...tindakanList.value, {
        action_id: fee.action_id,
        fee_id: fee.id,
        nama: fee.nama,
        tarif: fee.tarif,
      }];
    }
  });

  const p  = selected.value?.patients;
  const cn = selected.value?.clinical_notes;

  return (
    <div class="page" style="padding:0;display:flex;flex-direction:column;min-height:0;flex:1">

      {/* Toast */}
      {toast.value && (
        <div class="toast-tray">
          <div class={`toast ${toastOk.value ? "toast-ok" : "toast-err"}`}>{toast.value}</div>
        </div>
      )}

      {/* ── Queue list ──────────────────────────────────────── */}
      {(!selected.value || showList.value) && (
        <div class="page">
          <div class="page-header">
            <h1 class="page-title">Dokter</h1>
            <p class="page-sub">{visits.value.length} pasien menunggu</p>
          </div>

          {loading.value ? (
            <div class="loading"><div class="spin" /></div>
          ) : visits.value.length === 0 ? (
            <div class="empty">
              <div class="empty-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
              </div>
              <p class="empty-title">Tidak ada pasien menunggu</p>
              <p class="empty-sub">Antrian dokter kosong saat ini.</p>
            </div>
          ) : (
            <div class="queue">
              {visits.value.map((v: any) => (
                <button key={v.id} class="qcard"
                  data-status={v.status}
                  onClick$={() => selectVisit(v)}>
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
                    <span class={v.status === "SEDANG_DIPERIKSA"
                      ? "sbadge sbadge-violet"
                      : "sbadge sbadge-blue"}>
                      {v.status === "SEDANG_DIPERIKSA" ? "Diperiksa" : "Dokter"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── SOAP editor — single scrolling page ─────────────── */}
      {selected.value && !showList.value && (
        <div style="display:flex;flex-direction:column;flex:1;min-height:0;height:100%">

          {/* Sticky patient bar */}
          <div style="background:var(--surface);border-bottom:1px solid var(--border);padding:var(--s3) var(--s4);display:flex;align-items:center;gap:var(--s3);flex-shrink:0;position:sticky;top:0;z-index:10">
            <button class="btn btn-ghost btn-icon btn-sm"
              onClick$={() => { showList.value = true; selected.value = null; }}
              aria-label="Kembali ke daftar">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2.5" stroke-linecap="round"
                stroke-linejoin="round" aria-hidden="true">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <div style="flex:1;min-width:0">
              <div style="font-weight:700;font-size:1rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--text)">
                {p?.nama}
              </div>
              <div style="font-size:.75rem;color:var(--text-4)">
                {hitungUsia(p?.tanggal_lahir)} · {p?.jenis_kelamin === "LAKI_LAKI" ? "L" : "P"} · #{selected.value.no_antrean}
              </div>
            </div>
            <button class="btn btn-ghost btn-sm"
              onClick$={saveDraft} disabled={saving.value}>
              Simpan Draft
            </button>
          </div>

          {/* Scrollable content */}
          <div style="flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch">
            <div style="padding:var(--s4);display:flex;flex-direction:column;gap:var(--s4);padding-bottom:calc(var(--s10) + env(safe-area-inset-bottom,0))">

              {/* ── S — Subjektif ── */}
              <div class="card" style="padding:var(--s4)">
                <div style="display:flex;align-items:center;gap:var(--s3);margin-bottom:var(--s4);padding-bottom:var(--s3);border-bottom:1px solid var(--border)">
                  <span style="background:var(--blue);color:#fff;font-weight:800;font-size:.875rem;width:32px;height:32px;border-radius:var(--r2);display:flex;align-items:center;justify-content:center;flex-shrink:0;letter-spacing:.05em">S</span>
                  <div>
                    <div style="font-weight:700;font-size:.9375rem;color:var(--text)">Subjektif</div>
                    <div style="font-size:.75rem;color:var(--text-4)">Anamnesis &amp; keluhan pasien</div>
                  </div>
                </div>
                <div class="field">
                  <label class="label" for="soap-s">Anamnesis</label>
                  <textarea id="soap-s" class="input" rows={6}
                    placeholder="Keluhan utama, riwayat penyakit sekarang, riwayat penyakit dahulu…"
                    value={subjektif.value}
                    onInput$={(e) => subjektif.value = (e.target as HTMLTextAreaElement).value} />
                </div>
              </div>

              {/* ── O — Objektif ── */}
              <div class="card" style="padding:var(--s4)">
                <div style="display:flex;align-items:center;gap:var(--s3);margin-bottom:var(--s4);padding-bottom:var(--s3);border-bottom:1px solid var(--border)">
                  <span style="background:var(--teal);color:#fff;font-weight:800;font-size:.875rem;width:32px;height:32px;border-radius:var(--r2);display:flex;align-items:center;justify-content:center;flex-shrink:0;letter-spacing:.05em">O</span>
                  <div>
                    <div style="font-weight:700;font-size:.9375rem;color:var(--text)">Objektif</div>
                    <div style="font-size:.75rem;color:var(--text-4)">Pemeriksaan fisik &amp; tanda vital</div>
                  </div>
                </div>
                <div class="form-stack">
                  {/* Baris 1: TD | HR | RR | Suhu | SpO₂ */}
                  <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr;gap:var(--s3)">
                    <div class="field">
                      <label class="label">Tekanan Darah</label>
                      <div style="display:flex;align-items:center;gap:var(--s1)">
                        <input class="input" type="number" placeholder="Sis" style="flex:1;min-width:0"
                          value={oSistol.value}
                          onInput$={(e) => oSistol.value = (e.target as HTMLInputElement).value} />
                        <span style="color:var(--text-4);font-weight:700">/</span>
                        <input class="input" type="number" placeholder="Dia" style="flex:1;min-width:0"
                          value={oDiastol.value}
                          onInput$={(e) => oDiastol.value = (e.target as HTMLInputElement).value} />
                        <span style="color:var(--text-4);font-size:.75rem;white-space:nowrap">mmHg</span>
                      </div>
                    </div>
                    <div class="field">
                      <label class="label" for="o-hr">HR</label>
                      <div style="display:flex;align-items:center;gap:var(--s1)">
                        <input id="o-hr" class="input" type="number" placeholder="80" style="flex:1;min-width:0"
                          value={oHr.value}
                          onInput$={(e) => oHr.value = (e.target as HTMLInputElement).value} />
                        <span style="color:var(--text-4);font-size:.75rem;white-space:nowrap">x/mnt</span>
                      </div>
                    </div>
                    <div class="field">
                      <label class="label" for="o-rr">RR</label>
                      <div style="display:flex;align-items:center;gap:var(--s1)">
                        <input id="o-rr" class="input" type="number" placeholder="20" style="flex:1;min-width:0"
                          value={oRr.value}
                          onInput$={(e) => oRr.value = (e.target as HTMLInputElement).value} />
                        <span style="color:var(--text-4);font-size:.75rem;white-space:nowrap">x/mnt</span>
                      </div>
                    </div>
                    <div class="field">
                      <label class="label" for="o-suhu">Suhu</label>
                      <div style="display:flex;align-items:center;gap:var(--s1)">
                        <input id="o-suhu" class="input" type="number" step="0.1" placeholder="36.5" style="flex:1;min-width:0"
                          value={oSuhu.value}
                          onInput$={(e) => oSuhu.value = (e.target as HTMLInputElement).value} />
                        <span style="color:var(--text-4);font-size:.75rem">°C</span>
                      </div>
                    </div>
                    <div class="field">
                      <label class="label" for="o-spo2">SpO₂</label>
                      <div style="display:flex;align-items:center;gap:var(--s1)">
                        <input id="o-spo2" class="input" type="number" placeholder="98" style="flex:1;min-width:0"
                          value={oSpo2.value}
                          onInput$={(e) => oSpo2.value = (e.target as HTMLInputElement).value} />
                        <span style="color:var(--text-4);font-size:.75rem">%</span>
                      </div>
                    </div>
                  </div>

                  {/* Baris 2: TB | BB | BMI (auto-calculated) */}
                  <div class="grid-3">
                    <div class="field">
                      <label class="label" for="o-tb">Tinggi Badan</label>
                      <div style="display:flex;align-items:center;gap:var(--s1)">
                        <input id="o-tb" class="input" type="number" placeholder="170" style="flex:1;min-width:0"
                          value={oTb.value}
                          onInput$={(e) => oTb.value = (e.target as HTMLInputElement).value} />
                        <span style="color:var(--text-4);font-size:.75rem">cm</span>
                      </div>
                    </div>
                    <div class="field">
                      <label class="label" for="o-bb">Berat Badan</label>
                      <div style="display:flex;align-items:center;gap:var(--s1)">
                        <input id="o-bb" class="input" type="number" placeholder="60" style="flex:1;min-width:0"
                          value={oBb.value}
                          onInput$={(e) => oBb.value = (e.target as HTMLInputElement).value} />
                        <span style="color:var(--text-4);font-size:.75rem">kg</span>
                      </div>
                    </div>
                    <div class="field">
                      <label class="label">BMI</label>
                      <div style="display:flex;align-items:center;gap:var(--s2);height:38px;padding:0 var(--s3);background:var(--bg);border:1px solid var(--border);border-radius:var(--r2)">
                        {oTb.value && oBb.value ? (() => {
                          const bmi = Number(oBb.value) / Math.pow(Number(oTb.value) / 100, 2);
                          const cat = bmi < 18.5 ? "Kurang" : bmi < 25 ? "Normal" : bmi < 30 ? "Lebih" : "Obesitas";
                          const col = bmi < 18.5 ? "var(--blue)" : bmi < 25 ? "var(--green)" : bmi < 30 ? "var(--amber)" : "var(--rose)";
                          return (
                            <>
                              <span style={`font-weight:700;font-size:.9375rem;color:${col}`}>{bmi.toFixed(1)}</span>
                              <span style={`font-size:.75rem;color:${col}`}>{cat}</span>
                            </>
                          );
                        })() : (
                          <span style="font-size:.8125rem;color:var(--text-4)">—</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Catatan pemeriksaan fisik tambahan */}
                  <div class="field">
                    <label class="label" for="soap-o">Catatan Pemeriksaan Fisik</label>
                    <textarea id="soap-o" class="input" rows={3}
                      placeholder="Temuan pemeriksaan fisik tambahan…"
                      value={objektif.value}
                      onInput$={(e) => objektif.value = (e.target as HTMLTextAreaElement).value} />
                  </div>
                </div>
              </div>

              {/* ── A — Asesmen ── */}
              <div class="card" style="padding:var(--s4)">
                <div style="display:flex;align-items:center;gap:var(--s3);margin-bottom:var(--s4);padding-bottom:var(--s3);border-bottom:1px solid var(--border)">
                  <span style="background:var(--violet);color:#fff;font-weight:800;font-size:.875rem;width:32px;height:32px;border-radius:var(--r2);display:flex;align-items:center;justify-content:center;flex-shrink:0;letter-spacing:.05em">A</span>
                  <div>
                    <div style="font-weight:700;font-size:.9375rem;color:var(--text)">Asesmen</div>
                    <div style="font-size:.75rem;color:var(--text-4)">Diagnosis klinis &amp; ICD-10</div>
                  </div>
                </div>
                <div class="form-stack">
                  <div class="field">
                    <label class="label" for="dx-search">Cari Diagnosis ICD-10</label>
                    <div class="autocomplete">
                      <input id="dx-search" class="input" type="search"
                        placeholder="Ketik kode atau nama diagnosis…"
                        value={dxQuery.value}
                        onInput$={(e) => searchDx((e.target as HTMLInputElement).value)} />
                      {dxResults.value.length > 0 && (
                        <div class="ac-list">
                          {dxResults.value.map((dx: any) => (
                            <div key={dx.kode} class="ac-item" onClick$={() => addDx(dx)}>
                              <strong>{dx.kode}</strong> — {dx.nama}
                              {dx.nama_en && <span class="ac-sub">{dx.nama_en}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {dxList.value.length > 0 && (
                    <div style="display:flex;flex-wrap:wrap;gap:var(--s2)">
                      {dxList.value.map((dx: any, i: number) => (
                        <span key={dx.kode} class="sbadge sbadge-blue"
                          style="gap:var(--s2);align-items:center">
                          {dx.kode} — {dx.nama}
                          <button style="background:none;border:none;cursor:pointer;color:inherit;padding:0;line-height:1;font-size:1rem"
                            onClick$={() => dxList.value = dxList.value.filter((_: any, j: number) => j !== i)}
                            aria-label={`Hapus ${dx.kode}`}>×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ── P — Plan ── */}
              <div class="card" style="padding:var(--s4)">
                <div style="display:flex;align-items:center;gap:var(--s3);margin-bottom:var(--s4);padding-bottom:var(--s3);border-bottom:1px solid var(--border)">
                  <span style="background:var(--amber);color:#fff;font-weight:800;font-size:.875rem;width:32px;height:32px;border-radius:var(--r2);display:flex;align-items:center;justify-content:center;flex-shrink:0;letter-spacing:.05em">P</span>
                  <div>
                    <div style="font-weight:700;font-size:.9375rem;color:var(--text)">Plan</div>
                    <div style="font-size:.75rem;color:var(--text-4)">Terapi, resep, puyer, edukasi &amp; tindakan</div>
                  </div>
                </div>

                {/* Tab buttons */}
                <div style="display:flex;gap:var(--s2);margin-bottom:var(--s4)">
                  {([
                    { key: "resep" as const, label: "Resep" },
                    { key: "puyer" as const, label: "Puyer" },
                    { key: "edukasi" as const, label: "Edukasi" },
                    { key: "tindakan" as const, label: "Tindakan" },
                  ]).map(tab => (
                    <button key={tab.key}
                      style={{
                        flex: "1",
                        height: "36px",
                        borderRadius: "var(--r3)",
                        border: "1px solid",
                        borderColor: planTab.value === tab.key ? "var(--blue)" : "var(--border)",
                        background: planTab.value === tab.key ? "var(--blue)" : "var(--surface)",
                        color: planTab.value === tab.key ? "#fff" : "var(--text-3)",
                        fontWeight: "600",
                        fontSize: ".8125rem",
                        cursor: "pointer",
                        transition: "all var(--fast)"
                      }}
                      onClick$={() => planTab.value = tab.key}>
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab: Resep */}
                {planTab.value === "resep" && (
                  <div style="display:flex;flex-direction:column;gap:var(--s2)">
                    {resepRows.value.map((row: any, i: number) => {
                      const filtered = row.query.length >= 1
                        ? obatList.value.filter((o: any) => o.nama.toLowerCase().includes(row.query.toLowerCase())).slice(0, 5)
                        : [];
                      return (
                        <div key={i} style="display:flex;gap:var(--s2);align-items:center">
                          <div class="autocomplete" style="flex:2;min-width:0;position:relative">
                            <input class="input" type="search" placeholder="Nama obat…"
                              value={row.nama || row.query}
                              onInput$={(e) => {
                                const val = (e.target as HTMLInputElement).value;
                                resepRows.value = resepRows.value.map((r: any, j: number) => j === i ? { ...r, query: val, nama: "" } : r);
                              }} />
                            {filtered.length > 0 && !row.nama && (
                              <div class="ac-list">
                                {filtered.map((o: any) => (
                                    <div key={o.id} class="ac-item" onClick$={() => {
                                      resepRows.value = resepRows.value.map((r: any, j: number) => j === i ? { ...r, medication_id: o.id, nama: `${o.nama} ${o.kekuatan}`, query: "" } : r);
                                    }}>
                                    <span>{o.nama} {o.kekuatan}</span>
                                    <span class="ac-sub">Stok: {o.stok}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <input class="input" type="text" placeholder="3×1" style="flex:1"
                            value={row.signa}
                            onInput$={(e) => resepRows.value = resepRows.value.map((r: any, j: number) => j === i ? { ...r, signa: (e.target as HTMLInputElement).value } : r)} />
                          <input class="input" type="number" min="1" placeholder="Jml" style="flex:1"
                            value={row.jumlah}
                            onInput$={(e) => resepRows.value = resepRows.value.map((r: any, j: number) => j === i ? { ...r, jumlah: (e.target as HTMLInputElement).value } : r)} />
                          <button class="btn btn-ghost btn-icon btn-xs" style="color:var(--teal);flex-shrink:0"
                            onClick$={() => {
                              const rows = [...resepRows.value];
                              rows.splice(i + 1, 0, { nama: "", signa: "", jumlah: "", query: "" });
                              resepRows.value = rows;
                            }}>+</button>
                          {resepRows.value.length > 1 && (
                            <button class="btn btn-ghost btn-icon btn-xs" style="color:var(--rose);flex-shrink:0"
                              onClick$={() => resepRows.value = resepRows.value.filter((_: any, j: number) => j !== i)}>×</button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Tab: Puyer */}
                {planTab.value === "puyer" && (
                  <div style="display:flex;flex-direction:column;gap:var(--s3)">
                    <div style="display:flex;gap:var(--s2)">
                      <input class="input" type="number" min="1" placeholder="Jumlah puyer" style="flex:1"
                        value={puyerJml.value}
                        onInput$={(e) => puyerJml.value = (e.target as HTMLInputElement).value} />
                      <input class="input" type="text" placeholder="Aturan pakai (3×1)" style="flex:1"
                        value={puyerSigna.value}
                        onInput$={(e) => puyerSigna.value = (e.target as HTMLInputElement).value} />
                    </div>
                    <div style="display:flex;flex-direction:column;gap:var(--s2)">
                      {puyerRows.value.map((row: any, i: number) => {
                        const filtered = row.query.length >= 1
                          ? obatList.value.filter((o: any) => o.nama.toLowerCase().includes(row.query.toLowerCase())).slice(0, 5)
                          : [];
                        return (
                          <div key={i} style="display:flex;gap:var(--s2);align-items:center">
                            <div class="autocomplete" style="flex:2;min-width:0;position:relative">
                              <input class="input" type="search" placeholder="Nama obat…"
                                value={row.nama || row.query}
                                onInput$={(e) => {
                                  const val = (e.target as HTMLInputElement).value;
                                  puyerRows.value = puyerRows.value.map((r: any, j: number) => j === i ? { ...r, query: val, nama: "" } : r);
                                }} />
                              {filtered.length > 0 && !row.nama && (
                                <div class="ac-list">
                                  {filtered.map((o: any) => (
                                    <div key={o.id} class="ac-item" onClick$={() => {
                                      puyerRows.value = puyerRows.value.map((r: any, j: number) => j === i ? { ...r, nama: `${o.nama} ${o.kekuatan}`, query: "" } : r);
                                    }}>
                                      <span>{o.nama} {o.kekuatan}</span>
                                      <span class="ac-sub">Stok: {o.stok}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            <input class="input" type="number" min="1" placeholder="Jml" style="flex:1"
                              value={row.jumlah}
                              onInput$={(e) => puyerRows.value = puyerRows.value.map((r: any, j: number) => j === i ? { ...r, jumlah: (e.target as HTMLInputElement).value } : r)} />
                            <button class="btn btn-ghost btn-icon btn-xs" style="color:var(--teal);flex-shrink:0"
                              onClick$={() => {
                                const rows = [...puyerRows.value];
                                rows.splice(i + 1, 0, { nama: "", jumlah: "", query: "" });
                                puyerRows.value = rows;
                              }}>+</button>
                            {puyerRows.value.length > 1 && (
                              <button class="btn btn-ghost btn-icon btn-xs" style="color:var(--rose);flex-shrink:0"
                                onClick$={() => puyerRows.value = puyerRows.value.filter((_: any, j: number) => j !== i)}>×</button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Tab: Edukasi */}
                {planTab.value === "edukasi" && (
                  <div>
                    <textarea class="input" rows={4}
                      placeholder="Edukasi untuk pasien: diet, istirahat, kontrol ulang…"
                      value={plan.value}
                      onInput$={(e) => plan.value = (e.target as HTMLTextAreaElement).value} />
                  </div>
                )}

                {/* Tab: Tindakan */}
                {planTab.value === "tindakan" && (
                  <div>
                    <select class="input"
                      value={tindakanQuery.value}
                      onChange$={(e) => {
                        const feeId = (e.target as HTMLSelectElement).value;
                        if (!feeId) return;
                        const fee = tindakanMaster.value.find((f: any) => f.id === feeId);
                        if (fee) addTindakan(fee);
                        tindakanQuery.value = "";
                      }}>
                      <option value="">+ Pilih tindakan…</option>
                      {tindakanMaster.value.map((f: any) => (
                        <option key={f.id} value={f.id}>{`${f.nama} — ${formatRupiah(f.tarif)}`}</option>
                      ))}
                    </select>
                    {tindakanList.value.length > 0 && (
                      <div style="display:flex;flex-direction:column;gap:var(--s2);margin-top:var(--s2)">
                        {tindakanList.value.map((t: any, i: number) => (
                          <div key={i} style="display:flex;align-items:center;justify-content:space-between;padding:var(--s2) var(--s3);border-radius:var(--r2);background:var(--surface-2);border:1px solid var(--border)">
                            <span>{t.nama} <span style="color:var(--text-4);font-size:.75rem">{formatRupiah(t.tarif)}</span></span>
                            <button style="background:none;border:none;cursor:pointer;color:var(--rose);padding:0;font-size:1rem"
                              onClick$={() => tindakanList.value = tindakanList.value.filter((_: any, j: number) => j !== i)}>×</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </div>
          <div style="border-top:1px solid var(--border);padding:var(--s3) var(--s4);display:flex;gap:var(--s3);flex-shrink:0;background:var(--surface);padding-bottom:calc(var(--s3) + env(safe-area-inset-bottom,0))">
            <button class="btn btn-ghost btn-full"
              onClick$={saveDraft} disabled={saving.value}>
              Simpan Draft
            </button>
            <button class="btn btn-primary btn-full"
              onClick$={finalisasi} disabled={saving.value}>
              {saving.value ? "Menyimpan…" : "Selesai Periksa →"}
            </button>
          </div>

          </div>
          </div>
        </div>
      )}

      {/* ── Popup Biaya Pemeriksaan ── */}
      {showFeePopup.value && (
        <div class="modal-backdrop" onClick$={() => showFeePopup.value = false}>
          <div class="modal" onClick$={(e) => e.stopPropagation()}>
            <div class="modal-head">
              <h3 class="modal-title">Biaya Pemeriksaan</h3>
              <button class="modal-close" onClick$={() => showFeePopup.value = false} aria-label="Tutup">×</button>
            </div>
            <div class="modal-body">
              <p style="margin-bottom:var(--s4);color:var(--text-3);font-size:.875rem">
                Pilih tarif pemeriksaan untuk pasien ini:
              </p>
              <div style="display:flex;flex-direction:column;gap:var(--s3)">
                {feeList.value.map((fee: any) => (
                  <label key={fee.id} style={{
                    display:'flex',alignItems:'center',justifyContent:'space-between',
                    padding:'var(--s3) var(--s4)',borderRadius:'var(--r3)',
                    border:'2px solid',borderColor: selectedFee.value?.id === fee.id ? 'var(--blue)' : 'var(--border)',
                    background: selectedFee.value?.id === fee.id ? 'var(--blue-bg)' : 'var(--surface)',
                    cursor:'pointer',transition:'all var(--fast)'
                  }}>
                    <div style="display:flex;alignItems:center;gap:var(--s3)">
                      <input type="radio" name="fee" 
                        checked={selectedFee.value?.id === fee.id}
                        onChange$={() => selectedFee.value = fee}
                        style="width:18px;height:18px;accent-color:var(--blue)" />
                      <span style="font-weight:600">{fee.nama}</span>
                    </div>
                    <span style="font-weight:700;color:var(--blue-dk)">{formatRupiah(fee.tarif)}</span>
                  </label>
                ))}
              </div>
            </div>
            <div class="modal-foot">
              <button class="btn btn-ghost btn-full" onClick$={() => showFeePopup.value = false}>
                Batal
              </button>
              <button class="btn btn-primary btn-full"
                onClick$={confirmFinalisasi} 
                disabled={!selectedFee.value || saving.value}>
                {saving.value ? "Menyimpan…" : "Konfirmasi & Selesai"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
});
