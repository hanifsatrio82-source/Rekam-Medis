import { component$, useSignal, useVisibleTask$, $ } from "@builder.io/qwik";
import { DocumentHead, useLocation } from "@builder.io/qwik-city";
import { getPasienById, getPasienList, getRiwayatKunjungan, hapusPasien } from "~/lib/api";
import { formatTanggal, hitungUsia, formatWaktu, formatStatusLabel, formatRupiah } from "~/lib/utils";

export const head: DocumentHead = { title: "Rekam Medis — RME Praktik" };

function badgeClass(status: string) {
  const map: Record<string, string> = {
    MENUNGGU_SKRINING:    "sbadge sbadge-amber",
    MENUNGGU_DOKTER:      "sbadge sbadge-blue",
    SEDANG_DIPERIKSA:     "sbadge sbadge-violet",
    MENUNGGU_OBAT:        "sbadge sbadge-teal",
    MENUNGGU_PEMBAYARAN:  "sbadge sbadge-rose",
    SELESAI:              "sbadge sbadge-green",
    BATAL:                "sbadge sbadge-slate",
  };
  return map[status] ?? "sbadge sbadge-slate";
}

export default component$(() => {
  const loc             = useLocation();
  const patients        = useSignal<any[]>([]);
  const loading         = useSignal(false);
  const query           = useSignal("");
  const page            = useSignal(1);
  const total           = useSignal(0);
  const selected        = useSignal<any>(null);
  const riwayat         = useSignal<any[]>([]);
  const loadingRiwayat  = useSignal(false);
  const confirmHapus    = useSignal(false);
  const hapusSaving     = useSignal(false);
  const toast           = useSignal("");
  const toastOk         = useSignal(true);
  const detailTab       = useSignal<"identitas" | "rekam">("identitas");
  const expanded        = useSignal<Record<string, boolean>>({});

  const doSearch = $(async () => {
    loading.value = true;
    try {
      const res = await getPasienList(query.value, page.value);
      patients.value = res.patients;
      total.value    = res.total;
    } finally { loading.value = false; }
  });

  useVisibleTask$(async () => {
    await doSearch();
    const patientId = loc.url.searchParams.get("patient");
    if (patientId) {
      loadingRiwayat.value = true;
      try {
        const p = await getPasienById(patientId);
        if (p) {
          selected.value = p;
          detailTab.value = "identitas";
          const list = await getRiwayatKunjungan(p.id);
          riwayat.value  = list;
          if (list.length>0) expanded.value = { [list[0].id]: true };
        }
      } catch {} finally { loadingRiwayat.value = false; }
    }
  });

  const openPasien = $(async (p: any) => {
    selected.value      = p;
    confirmHapus.value  = false;
    detailTab.value     = "identitas";
    loadingRiwayat.value = true;
    try   {
      const list = await getRiwayatKunjungan(p.id);
      riwayat.value = list;
      // buka kunjungan terbaru, lainnya collaps
      const init: Record<string, boolean> = {};
      if (list.length > 0) init[list[0].id] = true;
      expanded.value = init;
    }
    finally { loadingRiwayat.value = false; }
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  const toggleVisit = $((id: string) => {
    expanded.value = { ...expanded.value, [id]: !expanded.value[id] };
  });

  const closeDetail = $(() => {
    selected.value = null;
    confirmHapus.value = false;
  });

  const doHapusPasien = $(async () => {
    if (!selected.value) return;
    hapusSaving.value = true;
    try {
      await hapusPasien(selected.value.id);
      selected.value     = null;
      confirmHapus.value = false;
      await doSearch();
      toast.value  = "Pasien berhasil dihapus.";
      toastOk.value = true;
      setTimeout(() => { toast.value = ""; }, 3000);
    } catch (e: any) {
      toast.value  = "Gagal: " + e.message;
      toastOk.value = false;
      setTimeout(() => { toast.value = ""; }, 4000);
    } finally { hapusSaving.value = false; }
  });

  const totalPages = Math.ceil(total.value / 20);

  // ── Halaman detail (bukan popup) ──
  if (selected.value) {
    return (
      <div class="page">
        {toast.value && (
          <div class="toast-tray"><div class={`toast ${toastOk.value ? "toast-ok" : "toast-err"}`}>{toast.value}</div></div>
        )}

        <button class="btn btn-ghost" style="margin-bottom:var(--s4);gap:6px" onClick$={closeDetail}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          Kembali ke daftar
        </button>

        <div class="page-header" style="margin-bottom:var(--s3)">
          <h1 class="page-title">{selected.value.nama}</h1>
          <p class="page-sub">No. RM: {selected.value.no_rm} · {hitungUsia(selected.value.tanggal_lahir)} · {selected.value.jenis_kelamin === "LAKI_LAKI" ? "L" : "P"}</p>
        </div>

        {/* Tabs halaman */}
        <div style="display:flex;gap:8px;margin-bottom:var(--s5);border-bottom:1px solid var(--border);padding-bottom:0">
          <button
            style={`flex:1;max-width:200px;height:44px;border:none;border-bottom:3px solid ${detailTab.value==="identitas" ? "var(--blue)" : "transparent"};background:transparent;color:${detailTab.value==="identitas" ? "var(--blue)" : "var(--text-4)"};font-weight:800;cursor:pointer`}
            onClick$={() => detailTab.value="identitas"}
          >Identitas</button>
          <button
            style={`flex:1;max-width:200px;height:44px;border:none;border-bottom:3px solid ${detailTab.value==="rekam" ? "var(--blue)" : "transparent"};background:transparent;color:${detailTab.value==="rekam" ? "var(--blue)" : "var(--text-4)"};font-weight:800;cursor:pointer`}
            onClick$={() => detailTab.value="rekam"}
          >Rekam Medis <span style="margin-left:6px;background:var(--slate-bg);border:1px solid var(--slate-border);padding:1px 7px;border-radius:99px;font-size:.7rem;color:var(--text-3)">{riwayat.value.length}</span></button>
        </div>

        {detailTab.value === "identitas" && (
          <div style="display:flex;flex-direction:column;gap:var(--s4);max-width:720px">
            <div class="pt-banner">
              <div class="pt-name">{selected.value.nama}</div>
              <div class="pt-meta">
                <span>{hitungUsia(selected.value.tanggal_lahir)}</span>
                <span>{selected.value.jenis_kelamin === "LAKI_LAKI" ? "Laki-laki" : "Perempuan"}</span>
                <span>{formatTanggal(selected.value.tanggal_lahir)}</span>
              </div>
              {selected.value.alergi && <div style="margin-top:var(--s2)"><span class="sbadge sbadge-rose">⚠ Alergi: {selected.value.alergi}</span></div>}
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--s3)">
              <div class="card" style="padding:var(--s3)"><div style="font-size:.7rem;color:var(--text-4);text-transform:uppercase;letter-spacing:.06em">No. RM</div><div style="font-weight:700;margin-top:2px">{selected.value.no_rm || "—"}</div></div>
              <div class="card" style="padding:var(--s3)"><div style="font-size:.7rem;color:var(--text-4);text-transform:uppercase;letter-spacing:.06em">NIK</div><div style="font-weight:700;margin-top:2px">{(selected.value as any).nik || "—"}</div></div>
              <div class="card" style="padding:var(--s3)"><div style="font-size:.7rem;color:var(--text-4);text-transform:uppercase;letter-spacing:.06em">Tanggal Lahir</div><div style="font-weight:600;margin-top:2px">{formatTanggal(selected.value.tanggal_lahir) || "—"}</div><div style="font-size:.8rem;color:var(--text-4)">{hitungUsia(selected.value.tanggal_lahir)}</div></div>
              <div class="card" style="padding:var(--s3)"><div style="font-size:.7rem;color:var(--text-4);text-transform:uppercase;letter-spacing:.06em">Jenis Kelamin</div><div style="font-weight:600;margin-top:2px">{selected.value.jenis_kelamin === "LAKI_LAKI" ? "Laki-laki" : "Perempuan"}</div></div>
              <div class="card" style="padding:var(--s3)"><div style="font-size:.7rem;color:var(--text-4);text-transform:uppercase;letter-spacing:.06em">No. HP</div><div style="font-weight:600;margin-top:2px">{selected.value.no_hp || "—"}</div></div>
              <div class="card" style="padding:var(--s3)"><div style="font-size:.7rem;color:var(--text-4);text-transform:uppercase;letter-spacing:.06em">Penanggung Jawab</div><div style="font-weight:600;margin-top:2px">{(selected.value as any).penanggung_jawab || "—"}</div></div>
            </div>

            <div class="card" style="padding:var(--s3)"><div style="font-size:.7rem;color:var(--text-4);text-transform:uppercase;letter-spacing:.06em">Alamat</div><div style="font-weight:500;margin-top:4px;line-height:1.5">{selected.value.alamat || "—"}</div></div>

            <div style="display:flex;gap:var(--s2);font-size:.78rem;color:var(--text-4);background:var(--slate-bg);padding:var(--s3);border-radius:8px;border:1px solid var(--slate-border)">Total kunjungan: <strong style="color:var(--text)">{riwayat.value.length}</strong> · Terakhir: {riwayat.value[0] ? formatWaktu(riwayat.value[0].created_at) : "—"}</div>

            <div style="display:flex;justify-content:flex-end;gap:var(--s2);padding-top:var(--s2);border-top:1px solid var(--border-light);margin-top:var(--s2)">
              {confirmHapus.value ? (
                <>
                  <span style="font-size:.8125rem;color:var(--text-3);flex:1">Yakin hapus pasien beserta semua data?</span>
                  <button class="btn btn-ghost btn-sm" onClick$={() => confirmHapus.value = false}>Batal</button>
                  <button class="btn btn-sm" style="background:var(--rose);color:#fff;border:none" onClick$={doHapusPasien} disabled={hapusSaving.value}>{hapusSaving.value ? "Menghapus…" : "Ya, Hapus"}</button>
                </>
              ) : (
                <button class="btn btn-ghost btn-sm" style="color:var(--rose)" onClick$={() => confirmHapus.value = true}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                  <span style="margin-left:6px">Hapus Pasien</span>
                </button>
              )}
            </div>
          </div>
        )}

        {detailTab.value === "rekam" && (
          <div style="max-width:820px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--s3)">
              <span style="font-weight:700">Riwayat Kunjungan</span>
              <span class="tag">{riwayat.value.length} kunjungan</span>
            </div>

            {loadingRiwayat.value ? (
              <div class="loading"><div class="spin" /></div>
            ) : riwayat.value.length === 0 ? (
              <div class="empty" style="padding:var(--s8) 0">
                <div class="empty-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
                <p class="empty-title">Belum ada riwayat</p><p class="empty-sub">Pasien belum pernah berkunjung.</p>
              </div>
            ) : (
              <div style="display:flex;flex-direction:column;gap:var(--s4)">
                {riwayat.value.map((v: any) => {
                  const cn: any = Array.isArray(v.clinical_notes) ? v.clinical_notes[0] : v.clinical_notes;
                  const pay = Array.isArray(v.payments) ? v.payments[0] : v.payments;
                  const fmt = (val:any) => (val===null || val===undefined || val==="" ? "—" : String(val));
                  const hasSOAP = !!cn;
                  return (
                    <div key={v.id} class="card" style="padding:0;overflow:hidden">
                      <button
                        onClick$={() => toggleVisit(v.id)}
                        style="width:100%;display:flex;align-items:center;justify-content:space-between;padding:var(--s3) var(--s4);background:var(--surface-2);border:none;border-bottom:1px solid var(--border);cursor:pointer;text-align:left"
                        aria-expanded={!!expanded.value[v.id]}
                      >
                        <div>
                          <div style="font-weight:700;font-size:.9rem;color:var(--text)">{formatWaktu(v.created_at)} · <span style="font-size:.75rem;color:var(--text-4)">{v.no_kunjungan}</span></div>
                          <div style="font-size:.75rem;color:var(--text-4)">Antrean #{v.no_antrean} · {hasSOAP ? (cn.is_draft ? "Draft" : "Final") : "Belum isi SOAP"}</div>
                        </div>
                        <div style="display:flex;align-items:center;gap:var(--s2)">
                          <span class={badgeClass(v.status)}>{formatStatusLabel(v.status)}</span>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style={`flex-shrink:0;color:var(--text-4);transition:transform .2s;transform:rotate(${expanded.value[v.id] ? "180deg" : "0deg"})`}><polyline points="6 9 12 15 18 9"/></svg>
                        </div>
                      </button>

                      {expanded.value[v.id] && (
                      <div style="padding:var(--s4);display:flex;flex-direction:column;gap:var(--s4)">
                        <div>
                          <div style="font-size:.75rem;font-weight:800;letter-spacing:.06em;color:var(--blue);text-transform:uppercase;margin-bottom:6px">S — Subjektif</div>
                          <div style="display:grid;gap:6px;font-size:.875rem">
                            <div><span style="color:var(--text-4)">Keluhan Utama:</span> <strong style="color:var(--text)">{fmt(cn?.keluhan_utama)}</strong></div>
                            <div><span style="color:var(--text-4)">Riwayat Penyakit Sekarang:</span> <span style="color:var(--text-2)">{fmt(cn?.riwayat_penyakit_sekarang)}</span></div>
                            <div><span style="color:var(--text-4)">Catatan Subjektif:</span> <span style="color:var(--text-2)">{fmt(cn?.catatan_subjektif)}</span></div>
                          </div>
                        </div>

                        <div>
                          <div style="font-size:.75rem;font-weight:800;letter-spacing:.06em;color:var(--teal);text-transform:uppercase;margin-bottom:6px">O — Objektif / TTV</div>
                          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">
                            <div style="background:var(--surface-2);padding:8px;border-radius:8px;text-align:center"><div style="font-size:.65rem;color:var(--text-4)">TD</div><div style="font-weight:700;font-size:.85rem">{fmt(cn?.tekanan_darah)}</div></div>
                            <div style="background:var(--surface-2);padding:8px;border-radius:8px;text-align:center"><div style="font-size:.65rem;color:var(--text-4)">Suhu</div><div style="font-weight:700;font-size:.85rem">{cn?.suhu ? `${cn.suhu}°C` : "—"}</div></div>
                            <div style="background:var(--surface-2);padding:8px;border-radius:8px;text-align:center"><div style="font-size:.65rem;color:var(--text-4)">SpO₂</div><div style="font-weight:700;font-size:.85rem">{cn?.spo2 ? `${cn.spo2}%` : "—"}</div></div>
                            <div style="background:var(--surface-2);padding:8px;border-radius:8px;text-align:center"><div style="font-size:.65rem;color:var(--text-4)">HR</div><div style="font-weight:700;font-size:.85rem">{fmt(cn?.hr)}</div></div>
                            <div style="background:var(--surface-2);padding:8px;border-radius:8px;text-align:center"><div style="font-size:.65rem;color:var(--text-4)">RR</div><div style="font-weight:700;font-size:.85rem">{fmt(cn?.rr)}</div></div>
                            <div style="background:var(--surface-2);padding:8px;border-radius:8px;text-align:center"><div style="font-size:.65rem;color:var(--text-4)">TB</div><div style="font-weight:700;font-size:.85rem">{cn?.tb ? `${cn.tb} cm` : "—"}</div></div>
                            <div style="background:var(--surface-2);padding:8px;border-radius:8px;text-align:center"><div style="font-size:.65rem;color:var(--text-4)">BB</div><div style="font-weight:700;font-size:.85rem">{cn?.bb ? `${cn.bb} kg` : "—"}</div></div>
                            <div style="background:var(--surface-2);padding:8px;border-radius:8px;text-align:center"><div style="font-size:.65rem;color:var(--text-4)">Draft</div><div style="font-weight:700;font-size:.8rem;color:var(--text-4)">{cn ? (cn.is_draft ? "Ya" : "Final") : "—"}</div></div>
                          </div>
                          <div style="margin-top:8px;font-size:.875rem"><span style="color:var(--text-4)">Pemeriksaan Fisik:</span> <span style="color:var(--text-2)">{fmt(cn?.catatan_pemeriksaan_fisik)}</span></div>
                        </div>

                        <div>
                          <div style="font-size:.75rem;font-weight:800;letter-spacing:.06em;color:var(--violet);text-transform:uppercase;margin-bottom:6px">A — Assessment</div>
                          <div style="font-size:.875rem;color:var(--text-2)">{hasSOAP ? (cn?.edukasi ? <span><strong>Edukasi/Plan:</strong> {cn.edukasi}</span> : <span style="color:var(--text-4)">— Tidak ada catatan assessment —</span>) : <span style="color:var(--text-4)">— SOAP belum diisi —</span>}</div>
                        </div>

                        <div>
                          <div style="font-size:.75rem;font-weight:800;letter-spacing:.06em;color:var(--green);text-transform:uppercase;margin-bottom:6px">P — Plan</div>
                          <div style="display:flex;flex-direction:column;gap:6px;font-size:.875rem">
                            {(v.visit_actions && v.visit_actions.length>0) ? <div><span style="color:var(--text-4)">Tindakan:</span> {v.visit_actions.map((a:any)=> `${a.actions?.nama || a.fee_snapshot_nama} (${formatRupiah(a.fee_snapshot_tarif)})`).join(", ")}</div> : <div><span style="color:var(--text-4)">Tindakan:</span> —</div>}
                            {(v.prescriptions && v.prescriptions.filter((p:any)=>p.is_active).length>0) ? <div><span style="color:var(--text-4)">Resep:</span> {v.prescriptions.filter((p:any)=>p.is_active).flatMap((p:any)=> (p.prescription_items||[]).map((it:any)=> `${it.medications?.nama} ${it.medications?.kekuatan || ""} x${it.jumlah} (${it.aturan_pakai})`)).join(" · ") || "—"}</div> : <div><span style="color:var(--text-4)">Resep:</span> —</div>}
                            {(v.powders && v.powders.filter((p:any)=>p.is_active).length>0) ? <div><span style="color:var(--text-4)">Puyer:</span> {v.powders.filter((p:any)=>p.is_active).map((p:any)=> `${p.jumlah_bungkus} bungkus (${p.aturan_pakai})`).join(", ")}</div> : null}
                            {cn?.fee_snapshot_nama ? <div><span style="color:var(--text-4)">Biaya:</span> {cn.fee_snapshot_nama} — {formatRupiah(cn.fee_snapshot_tarif)}</div> : null}
                          </div>
                        </div>

                        {!hasSOAP && <div style="font-size:.78rem;color:var(--amber);background:var(--amber-bg);border:1px solid var(--amber-border);padding:8px;border-radius:8px">⚠️ SOAP kunjungan ini belum diisi — tampil tetap utuh sesuai format.</div>}
                      </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── List halaman ──
  return (
    <div class="page">
      <div class="page-header">
        <h1 class="page-title">Rekam Medis</h1>
        <p class="page-sub">{total.value > 0 ? `${total.value} pasien terdaftar` : "Data pasien"}</p>
      </div>

      <div class="search-wrap">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input class="search-input" type="search" placeholder="Cari nama atau No. RM…" value={query.value} onInput$={(e) => { query.value = (e.target as HTMLInputElement).value; page.value = 1; doSearch(); }} aria-label="Cari pasien" />
      </div>

      {loading.value ? (
        <div class="loading"><div class="spin" /></div>
      ) : patients.value.length === 0 ? (
        <div class="empty"><div class="empty-icon">🗂️</div><p class="empty-title">Tidak ada pasien ditemukan</p><p class="empty-sub">Coba kata kunci lain atau tambahkan pasien baru.</p></div>
      ) : (
        <>
          <div class="queue">
            {patients.value.map((p: any) => (
              <button key={p.id} class="qcard" onClick$={() => openPasien(p)}>
                <div class="qcard-body">
                  <div class="qcard-name">{p.nama}</div>
                  <div class="qcard-meta">
                    <span>{p.no_rm}</span><span class="qcard-meta-dot" /><span>{hitungUsia(p.tanggal_lahir)}</span><span class="qcard-meta-dot" /><span>{p.jenis_kelamin === "LAKI_LAKI" ? "L" : "P"}</span>
                    {p.no_hp && (<><span class="qcard-meta-dot" /><span>{p.no_hp}</span></>)}
                  </div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true" style="flex-shrink:0;color:var(--text-4)"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            ))}
          </div>

          {totalPages > 1 && (
            <div style="display:flex;align-items:center;justify-content:center;gap:var(--s3);margin-top:var(--s5)">
              <button class="btn btn-ghost btn-sm" disabled={page.value <= 1} onClick$={() => { page.value--; doSearch(); }}>← Sebelumnya</button>
              <span style="font-size:.875rem;color:var(--text-4)">{page.value} / {totalPages}</span>
              <button class="btn btn-ghost btn-sm" disabled={page.value >= totalPages} onClick$={() => { page.value++; doSearch(); }}>Berikutnya →</button>
            </div>
          )}
        </>
      )}

      {toast.value && (<div class="toast-tray"><div class={`toast ${toastOk.value ? "toast-ok" : "toast-err"}`}>{toast.value}</div></div>)}
    </div>
  );
});
