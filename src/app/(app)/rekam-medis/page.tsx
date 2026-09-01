"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { getPasienById, getPasienList, getRiwayatKunjungan, hapusPasien, updatePasien, getAkunSaya } from "~/lib/api";
import { formatTanggal, hitungUsia, formatWaktu, formatStatusLabel, formatRupiah } from "~/lib/utils";

function badgeClass(status: string) {
  const map: Record<string, string> = {
    MENUNGGU_SKRINING: "sbadge sbadge-amber", MENUNGGU_DOKTER: "sbadge sbadge-blue", SEDANG_DIPERIKSA: "sbadge sbadge-violet",
    MENUNGGU_OBAT: "sbadge sbadge-teal", MENUNGGU_PEMBAYARAN: "sbadge sbadge-rose", SELESAI: "sbadge sbadge-green", BATAL: "sbadge sbadge-slate",
  };
  return map[status] ?? "sbadge sbadge-slate";
}

export default function RekamMedisPageWrapper() {
  return <Suspense><RekamMedisPage /></Suspense>;
}

function RekamMedisPage() {
  const searchParams = useSearchParams();
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<any>(null);
  const [riwayat, setRiwayat] = useState<any[]>([]);
  const [loadingRiwayat, setLoadingRiwayat] = useState(false);
  const [confirmHapus, setConfirmHapus] = useState(false);
  const [hapusSaving, setHapusSaving] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [updateSaving, setUpdateSaving] = useState(false);
  const [editNama, setEditNama] = useState("");
  const [editNik, setEditNik] = useState("");
  const [editTanpaKtp, setEditTanpaKtp] = useState(false);
  const [editTanggalLahir, setEditTanggalLahir] = useState("");
  const [editJenisKelamin, setEditJenisKelamin] = useState("LAKI_LAKI");
  const [editNoHp, setEditNoHp] = useState("");
  const [editPenanggungJawab, setEditPenanggungJawab] = useState("");
  const [editPjName, setEditPjName] = useState("");
  const [editAlamat, setEditAlamat] = useState("");
  const [editAlergi, setEditAlergi] = useState("");
  const [toast, setToast] = useState("");
  const [toastOk, setToastOk] = useState(true);
  const [detailTab, setDetailTab] = useState<"identitas" | "rekam">("identitas");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [canDelete, setCanDelete] = useState(true);

  const doSearch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPasienList(query, page);
      setPatients(res.patients); setTotal(res.total);
    } finally { setLoading(false); }
  }, [query, page]);

  useEffect(() => {
    (async () => {
      // Role check: dokter tidak boleh hapus rekam medis
      getAkunSaya().then((me: any) => {
        if (me?.profile?.role) setCanDelete(me.profile.role !== "dokter");
        else if (me?.user?.email?.toLowerCase() === "dokter@rme.com") setCanDelete(false);
      }).catch(() => {});
      await doSearch();
      const patientId = searchParams.get("patient");
      if (patientId) {
        setLoadingRiwayat(true);
        try {
          const p = await getPasienById(patientId);
          if (p) {
            setSelected(p); setDetailTab("identitas");
            const list = await getRiwayatKunjungan(p.id);
            setRiwayat(list);
            if (list.length > 0) setExpanded({ [list[0].id]: true });
          }
        } catch {} finally { setLoadingRiwayat(false); }
      }
    })();
  }, [doSearch, searchParams]);

  const openPasien = useCallback(async (p: any) => {
    setSelected(p); setConfirmHapus(false); setDetailTab("identitas");
    setLoadingRiwayat(true);
    try {
      const list = await getRiwayatKunjungan(p.id);
      setRiwayat(list);
      const init: Record<string, boolean> = {};
      if (list.length > 0) init[list[0].id] = true;
      setExpanded(init);
    } finally { setLoadingRiwayat(false); }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const toggleVisit = useCallback((id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const openEdit = useCallback(() => {
    if (!selected) return;
    setEditNama(selected.nama || "");
    setEditNik(selected.nik || "");
    setEditTanpaKtp(!selected.nik);
    setEditTanggalLahir(selected.tanggal_lahir || "");
    setEditJenisKelamin(selected.jenis_kelamin || "LAKI_LAKI");
    setEditNoHp(selected.no_hp || "");
    const pj = selected.penanggung_jawab || "";
    if (pj === "Pasien Sendiri") { setEditPenanggungJawab("Pasien Sendiri"); setEditPjName(""); }
    else if (["Ayah", "Ibu", "Anak"].includes(pj)) { setEditPenanggungJawab(pj); setEditPjName(""); }
    else if (pj) { setEditPenanggungJawab(""); setEditPjName(pj); }
    else { setEditPenanggungJawab(""); setEditPjName(""); }
    setEditAlamat(selected.alamat || "");
    setEditAlergi(selected.alergi || "");
    setUpdateOpen(true);
  }, [selected]);

  const doUpdateIdentitas = useCallback(async () => {
    if (!selected) return;
    setUpdateSaving(true);
    try {
      const payload: Record<string, any> = {
        nama: editNama,
        nik: editTanpaKtp ? null : (editNik || null),
        tanggal_lahir: editTanggalLahir || null,
        jenis_kelamin: editJenisKelamin,
        no_hp: editNoHp || null,
        penanggung_jawab: editPenanggungJawab === "Pasien Sendiri" ? "Pasien Sendiri" : editPjName || null,
        alamat: editAlamat || null,
        alergi: editAlergi || null,
      };
      await updatePasien(selected.id, payload);
      const fresh = await getPasienById(selected.id);
      if (fresh) setSelected(fresh);
      setUpdateOpen(false);
      await doSearch();
      setToast("Identitas diperbarui."); setToastOk(true); setTimeout(() => setToast(""), 3000);
    } catch (e: any) { setToast("Gagal: " + e.message); setToastOk(false); setTimeout(() => setToast(""), 4000); }
    finally { setUpdateSaving(false); }
  }, [selected, editNama, editNik, editTanpaKtp, editTanggalLahir, editJenisKelamin, editNoHp, editPenanggungJawab, editPjName, editAlamat, editAlergi, doSearch]);

  const closeDetail = useCallback(() => { setSelected(null); setConfirmHapus(false); setUpdateOpen(false); }, []);

  const doHapusPasien = useCallback(async () => {
    if (!selected) return;
    setHapusSaving(true);
    try {
      await hapusPasien(selected.id);
      setSelected(null); setConfirmHapus(false); await doSearch();
      setToast("Pasien berhasil dihapus."); setToastOk(true); setTimeout(() => setToast(""), 3000);
    } catch (e: any) { setToast("Gagal: " + e.message); setToastOk(false); setTimeout(() => setToast(""), 4000); }
    finally { setHapusSaving(false); }
  }, [selected, doSearch]);

  const totalPages = Math.ceil(total / 20);
  const fmt = (val: any) => (val === null || val === undefined || val === "" ? "—" : String(val));

  // ── Detail view ──
  if (selected) {
    return (
      <div className="page">
        {toast && (<div className="toast-tray"><div className={`toast ${toastOk ? "toast-ok" : "toast-err"}`}>{toast}</div></div>)}
        <button className="btn btn-ghost" style={{marginBottom:"var(--s4)",gap:6}} onClick={closeDetail}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          Kembali ke daftar
        </button>
        <div className="page-header" style={{marginBottom:"var(--s3)"}}>
          <h1 className="page-title">{selected.nama}</h1>
          <p className="page-sub">No. RM: {selected.no_rm} · {hitungUsia(selected.tanggal_lahir)} · {selected.jenis_kelamin === "LAKI_LAKI" ? "L" : "P"}</p>
        </div>
        <div style={{display:"flex",gap:8,marginBottom:"var(--s5)",borderBottom:"1px solid var(--border)",paddingBottom:0}}>
          <button style={{flex:1,maxWidth:200,height:44,border:"none",borderBottom:`3px solid ${detailTab === "identitas" ? "var(--blue)" : "transparent"}`,background:"transparent",color:detailTab === "identitas" ? "var(--blue)" : "var(--text-4)",fontWeight: 700,cursor:"pointer"}} onClick={() => setDetailTab("identitas")}>Identitas</button>
          <button style={{flex:1,maxWidth:200,height:44,border:"none",borderBottom:`3px solid ${detailTab === "rekam" ? "var(--blue)" : "transparent"}`,background:"transparent",color:detailTab === "rekam" ? "var(--blue)" : "var(--text-4)",fontWeight: 700,cursor:"pointer"}} onClick={() => setDetailTab("rekam")}>Rekam Medis <span style={{marginLeft:6,background:"var(--slate-bg)",border:"1px solid var(--slate-border)",padding:"1px 7px",borderRadius:99,fontSize:".7rem",color:"var(--text-3)"}}>{riwayat.length}</span></button>
        </div>

        {detailTab === "identitas" && (
          <div style={{display:"flex",flexDirection:"column",gap:"var(--s4)",maxWidth:720}}>
            <div className="pt-banner">
              <div className="pt-name">{selected.nama}</div>
              <div className="pt-meta"><span>{hitungUsia(selected.tanggal_lahir)}</span><span>{selected.jenis_kelamin === "LAKI_LAKI" ? "Laki-laki" : "Perempuan"}</span><span>{formatTanggal(selected.tanggal_lahir)}</span></div>
              {selected.alergi && <div style={{marginTop:"var(--s2)"}}><span className="sbadge sbadge-rose">⚠ Alergi: {selected.alergi}</span></div>}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"var(--s3)"}}>
              {[["No. RM", selected.no_rm || "—"], ["NIK", selected.nik || "—"], ["Tanggal Lahir", formatTanggal(selected.tanggal_lahir) || "—"], ["Jenis Kelamin", selected.jenis_kelamin === "LAKI_LAKI" ? "Laki-laki" : "Perempuan"], ["No. HP", selected.no_hp || "—"], ["Penanggung Jawab", selected.penanggung_jawab || "—"]].map(([label, value]) => (
                <div key={label} className="card" style={{padding:"var(--s3)"}}><div style={{fontSize:".7rem",color:"var(--text-4)",textTransform:"uppercase",letterSpacing:".06em"}}>{label}</div><div style={{fontWeight:700,marginTop:2}}>{value}</div></div>
              ))}
            </div>
            <div className="card" style={{padding:"var(--s3)"}}><div style={{fontSize:".7rem",color:"var(--text-4)",textTransform:"uppercase",letterSpacing:".06em"}}>Alamat</div><div style={{fontWeight: 400,marginTop:4,lineHeight:1.5}}>{selected.alamat || "—"}</div></div>
            <div style={{display:"flex",gap:"var(--s2)",fontSize:".78rem",color:"var(--text-4)",background:"var(--slate-bg)",padding:"var(--s3)",borderRadius:8,border:"1px solid var(--slate-border)"}}>Total kunjungan: <strong style={{color:"var(--text)"}}>{riwayat.length}</strong> · Terakhir: {riwayat[0] ? formatWaktu(riwayat[0].created_at) : "—"}</div>
            <div style={{display:"flex",justifyContent:"flex-end",gap:"var(--s2)",paddingTop:"var(--s2)",borderTop:"1px solid var(--border)",marginTop:"var(--s2)"}}>
              <button className="btn btn-outline btn-sm" onClick={openEdit}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                <span style={{marginLeft:4}}>Update Identitas</span>
              </button>
              {canDelete ? (
                confirmHapus ? (
                  <>
                    <span style={{fontSize:".8125rem",color:"var(--text-3)",flex:1}}>Yakin hapus pasien beserta semua data?</span>
                    <button className="btn btn-ghost btn-sm" onClick={() => setConfirmHapus(false)}>Batal</button>
                    <button className="btn btn-sm" style={{background:"var(--rose)",color:"#fff",border:"none"}} onClick={doHapusPasien} disabled={hapusSaving}>{hapusSaving ? "Menghapus…" : "Ya, Hapus"}</button>
                  </>
                ) : (
                  <button className="btn btn-ghost btn-sm" style={{color:"var(--rose)"}} onClick={() => setConfirmHapus(true)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                    <span style={{marginLeft:6}}>Hapus Pasien</span>
                  </button>
                )
              ) : (
                <span style={{fontSize:".75rem",color:"var(--text-4)"}}>Hapus rekam medis hanya untuk admin/owner.</span>
              )}
            </div>
          </div>
        )}

        {detailTab === "rekam" && (
          <div style={{maxWidth:820}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"var(--s3)"}}>
              <span style={{fontWeight:700}}>Riwayat Kunjungan</span>
              <span style={{background:"var(--slate-bg)",border:"1px solid var(--slate-border)",padding:"2px 8px",borderRadius:99,fontSize:".75rem"}}>{riwayat.length} kunjungan</span>
            </div>
            {loadingRiwayat ? (<div className="loading"><div className="spin" /></div>) : riwayat.length === 0 ? (
              <div className="empty" style={{padding:"var(--s8) 0"}}><div className="empty-icon">📋</div><p className="empty-title">Belum ada riwayat</p><p className="empty-sub">Pasien belum pernah berkunjung.</p></div>
            ) : (
              <div style={{display:"flex",flexDirection:"column",gap:"var(--s4)"}}>
                {riwayat.map((v: any) => {
                  const cn: any = Array.isArray(v.clinical_notes) ? v.clinical_notes[0] : v.clinical_notes;
                  const hasSOAP = !!cn;
                  return (
                    <div key={v.id} className="card" style={{padding:0,overflow:"hidden"}}>
                      <button onClick={() => toggleVisit(v.id)} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"var(--s3) var(--s4)",background:"var(--surface-2)",border:"none",borderBottom:"1px solid var(--border)",cursor:"pointer",textAlign:"left"}} aria-expanded={!!expanded[v.id]}>
                        <div>
                          <div style={{fontWeight:700,fontSize:".9rem",color:"var(--text)"}}>{formatWaktu(v.created_at)} · <span style={{fontSize:".75rem",color:"var(--text-4)"}}>{v.no_kunjungan}</span></div>
                          <div style={{fontSize:".75rem",color:"var(--text-4)"}}>Antrean #{v.no_antrean} · {hasSOAP ? (cn.is_draft ? "Draft" : "Final") : "Belum isi SOAP"}</div>
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:"var(--s2)"}}>
                          <span className={badgeClass(v.status)}>{formatStatusLabel(v.status)}</span>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{flexShrink:0,color:"var(--text-4)",transition:"transform .2s",transform:expanded[v.id] ? "rotate(180deg)" : "rotate(0deg)"}}><polyline points="6 9 12 15 18 9"/></svg>
                        </div>
                      </button>
                      {expanded[v.id] && (
                        <div style={{padding:"var(--s4)",display:"flex",flexDirection:"column",gap:"var(--s4)"}}>
                          <div>
                            <div style={{fontSize:".75rem",fontWeight: 700,letterSpacing:".06em",color:"var(--blue)",textTransform:"uppercase",marginBottom:6}}>S — Subjektif</div>
                            <div style={{display:"grid",gap:6,fontSize:".875rem"}}>
                              <div><span style={{color:"var(--text-4)"}}>Keluhan Utama:</span> <strong style={{color:"var(--text)"}}>{fmt(cn?.keluhan_utama)}</strong></div>
                              <div><span style={{color:"var(--text-4)"}}>Riwayat Penyakit Sekarang:</span> <span style={{color:"var(--text-2)"}}>{fmt(cn?.riwayat_penyakit_sekarang)}</span></div>
                              <div><span style={{color:"var(--text-4)"}}>Catatan Subjektif:</span> <span style={{color:"var(--text-2)"}}>{fmt(cn?.catatan_subjektif)}</span></div>
                            </div>
                          </div>
                          <div>
                            <div style={{fontSize:".75rem",fontWeight: 700,letterSpacing:".06em",color:"var(--teal)",textTransform:"uppercase",marginBottom:6}}>O — Objektif / TTV</div>
                            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
                              {[["TD", cn?.tekanan_darah], ["Suhu", cn?.suhu ? `${cn.suhu}°C` : "—"], ["SpO₂", cn?.spo2 ? `${cn.spo2}%` : "—"], ["HR", fmt(cn?.hr)], ["RR", fmt(cn?.rr)], ["TB", cn?.tb ? `${cn.tb} cm` : "—"], ["BB", cn?.bb ? `${cn.bb} kg` : "—"], ["Draft", cn ? (cn.is_draft ? "Ya" : "Final") : "—"]].map(([label, value]) => (
                                <div key={label} style={{background:"var(--surface-2)",padding:8,borderRadius:8,textAlign:"center"}}><div style={{fontSize:".65rem",color:"var(--text-4)"}}>{label}</div><div style={{fontWeight:700,fontSize:".85rem"}}>{value}</div></div>
                              ))}
                            </div>
                            <div style={{marginTop:8,fontSize:".875rem"}}><span style={{color:"var(--text-4)"}}>Pemeriksaan Fisik:</span> <span style={{color:"var(--text-2)"}}>{fmt(cn?.catatan_pemeriksaan_fisik)}</span></div>
                          </div>
                          <div>
                            <div style={{fontSize:".75rem",fontWeight: 700,letterSpacing:".06em",color:"var(--violet)",textTransform:"uppercase",marginBottom:6}}>A — Assessment</div>
                            <div style={{fontSize:".875rem",color:"var(--text-2)"}}>{hasSOAP ? (cn?.edukasi ? <span><strong>Edukasi/Plan:</strong> {cn.edukasi}</span> : <span style={{color:"var(--text-4)"}}>— Tidak ada catatan assessment —</span>) : <span style={{color:"var(--text-4)"}}>— SOAP belum diisi —</span>}</div>
                          </div>
                          <div>
                            <div style={{fontSize:".75rem",fontWeight: 700,letterSpacing:".06em",color:"var(--green)",textTransform:"uppercase",marginBottom:6}}>P — Plan</div>
                            <div style={{display:"flex",flexDirection:"column",gap:6,fontSize:".875rem"}}>
                              {v.visit_actions?.length > 0 ? <div><span style={{color:"var(--text-4)"}}>Tindakan:</span> {v.visit_actions.map((a: any) => `${a.actions?.nama || a.fee_snapshot_nama} (${formatRupiah(a.fee_snapshot_tarif)})`).join(", ")}</div> : <div><span style={{color:"var(--text-4)"}}>Tindakan:</span> —</div>}
                              {v.prescriptions?.filter((p: any) => p.is_active).length > 0 ? <div><span style={{color:"var(--text-4)"}}>Resep:</span> {v.prescriptions.filter((p: any) => p.is_active).flatMap((p: any) => (p.prescription_items || []).map((it: any) => `${it.medications?.nama} ${it.medications?.kekuatan || ""} x${it.jumlah} (${it.aturan_pakai})`)).join(" · ") || "—"}</div> : <div><span style={{color:"var(--text-4)"}}>Resep:</span> —</div>}
                              {v.powders?.filter((p: any) => p.is_active).length > 0 ? <div><span style={{color:"var(--text-4)"}}>Puyer:</span> {v.powders.filter((p: any) => p.is_active).map((p: any) => `${p.jumlah_bungkus} bungkus (${p.aturan_pakai})`).join(", ")}</div> : null}
                              {cn?.fee_snapshot_nama ? <div><span style={{color:"var(--text-4)"}}>Biaya:</span> {cn.fee_snapshot_nama} — {formatRupiah(cn.fee_snapshot_tarif)}</div> : null}
                            </div>
                          </div>
                          {!hasSOAP && <div style={{fontSize:".78rem",color:"var(--amber)",background:"var(--amber-bg)",border:"1px solid var(--amber-border)",padding:8,borderRadius:8}}>⚠️ SOAP kunjungan ini belum diisi</div>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {updateOpen && (
          <>
            <div className="backdrop" onClick={() => setUpdateOpen(false)} />
            <div className="sheet" role="dialog" aria-modal="true" aria-label="Update identitas">
              <div className="sheet-grip" />
              <div className="sheet-head">
                <span className="sheet-title">Update Identitas</span>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setUpdateOpen(false)}>✕</button>
              </div>
              <div className="sheet-body">
                <div className="form-stack">
                  <div className="field"><label className="label" htmlFor="ut-nama">Nama Lengkap <span className="req">*</span></label><input id="ut-nama" className="input" type="text" placeholder="Nama pasien" value={editNama} onChange={(e) => setEditNama(e.target.value)} /></div>
                  <div className="grid-2">
                    <div className="field"><label className="label" htmlFor="ut-jk">Jenis Kelamin</label><select id="ut-jk" className="input" value={editJenisKelamin} onChange={(e) => setEditJenisKelamin(e.target.value)}><option value="LAKI_LAKI">Laki-laki</option><option value="PEREMPUAN">Perempuan</option></select></div>
                    <div className="field"><label className="label" htmlFor="ut-tgl">Tgl. Lahir <span className="req">*</span></label><input id="ut-tgl" className="input" type="date" value={editTanggalLahir} onChange={(e) => setEditTanggalLahir(e.target.value)} /></div>
                  </div>
                  <div className="field"><label className="label" htmlFor="ut-pj">Penanggung Jawab</label><select id="ut-pj" className="input" value={editPenanggungJawab} onChange={(e) => { setEditPenanggungJawab(e.target.value); if (e.target.value !== "Pasien Sendiri") setEditPjName(e.target.value === "" ? editPjName : ""); }}><option value="">— Pilih —</option><option value="Pasien Sendiri">Pasien Sendiri</option><option value="Ayah">Ayah</option><option value="Ibu">Ibu</option><option value="Anak">Anak</option></select></div>
                  {editPenanggungJawab && editPenanggungJawab !== "Pasien Sendiri" && (
                    <div className="field"><label className="label" htmlFor="ut-pjname">Nama Penanggung Jawab</label><input id="ut-pjname" className="input" placeholder="Nama penanggung jawab" value={editPjName} onChange={(e) => setEditPjName(e.target.value)} /></div>
                  )}
                  <div className="field">
                    <div className="nik-label-row"><label className="label" htmlFor="ut-nik">NIK</label><label className="nik-skip-check"><input type="checkbox" checked={editTanpaKtp} onChange={(e) => { setEditTanpaKtp(e.target.checked); if (e.target.checked) setEditNik(""); }} /><span>Tidak bawa / belum punya KTP</span></label></div>
                    <input id="ut-nik" className="input" type="text" placeholder="16 digit NIK" disabled={editTanpaKtp} value={editNik} onChange={(e) => setEditNik(e.target.value)} />
                  </div>
                  <div className="field"><label className="label" htmlFor="ut-hp">No. HP</label><input id="ut-hp" className="input" type="tel" placeholder="08xx…" value={editNoHp} onChange={(e) => setEditNoHp(e.target.value)} /></div>
                  <div className="field"><label className="label" htmlFor="ut-alamat">Alamat</label><textarea id="ut-alamat" className="input" placeholder="Alamat lengkap" value={editAlamat} onChange={(e) => setEditAlamat(e.target.value)} /></div>
                  <div className="field"><label className="label" htmlFor="ut-alergi">Alergi</label><input id="ut-alergi" className="input" placeholder="Alergi, bila ada" value={editAlergi} onChange={(e) => setEditAlergi(e.target.value)} /></div>
                </div>
              </div>
              <div className="sheet-foot">
                <button className="btn btn-ghost btn-full" onClick={() => setUpdateOpen(false)}>Batal</button>
                <button className="btn btn-primary btn-full" onClick={doUpdateIdentitas} disabled={updateSaving || !editNama.trim() || !editTanggalLahir}>
                  {updateSaving ? "Menyimpan…" : "Simpan"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // ── List view ──
  return (
    <div className="page">
      {toast && (<div className="toast-tray"><div className={`toast ${toastOk ? "toast-ok" : "toast-err"}`}>{toast}</div></div>)}
      <div className="page-header">
        <h1 className="page-title">Rekam Medis</h1>
        <p className="page-sub">{total > 0 ? `${total} pasien terdaftar` : "Data pasien"}</p>
      </div>
      <div className="search-wrap">
        <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input className="search-input" type="search" placeholder="Cari nama atau No. RM…" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} aria-label="Cari pasien" />
      </div>
      {loading ? (<div className="loading"><div className="spin" /></div>) : patients.length === 0 ? (
        <div className="empty"><div className="empty-icon">🗂️</div><p className="empty-title">Tidak ada pasien ditemukan</p><p className="empty-sub">Coba kata kunci lain atau tambahkan pasien baru.</p></div>
      ) : (
        <>
          <div className="queue">
            {patients.map((p: any) => (
              <button key={p.id} className="qcard" onClick={() => openPasien(p)}>
                <div className="qcard-body">
                  <div className="qcard-name">{p.nama}</div>
                  <div className="qcard-meta">
                    <span>{p.no_rm}</span><span className="qcard-meta-dot" /><span>{hitungUsia(p.tanggal_lahir)}</span><span className="qcard-meta-dot" /><span>{p.jenis_kelamin === "LAKI_LAKI" ? "L" : "P"}</span>
                    {p.no_hp && (<><span className="qcard-meta-dot" /><span>{p.no_hp}</span></>)}
                  </div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true" style={{flexShrink:0,color:"var(--text-4)"}}><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            ))}
          </div>
          {totalPages > 1 && (
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"var(--s3)",marginTop:"var(--s5)"}}>
              <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Sebelumnya</button>
              <span style={{fontSize:".875rem",color:"var(--text-4)"}}>{page} / {totalPages}</span>
              <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Berikutnya →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
