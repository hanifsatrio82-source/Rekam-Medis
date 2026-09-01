"use client";

import { Suspense, useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getVisitsByStatus, panggil, simpanDraftSOAP, simpanResepDanTindakan, finalisasiDokter, cariDiagnosis, getMedications, getTindakan, getRiwayatKunjungan } from "~/lib/api";
import { formatWaktu, hitungUsia, formatRupiah, numericProps } from "~/lib/utils";

export default function DokterPageWrapper() {
  return <Suspense><DokterPage /></Suspense>;
}

function DokterPage() {
  const nav = useRouter();
  const searchParams = useSearchParams();
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [toastOk, setToastOk] = useState(true);
  const [showList, setShowList] = useState(true);

  // SOAP fields
  const [subjektif, setSubjektif] = useState("");
  const [objektif, setObjektif] = useState("");
  const [asesmen, setAsesmen] = useState("");
  const [plan, setPlan] = useState("");

  // Diagnosis
  const [dxQuery, setDxQuery] = useState("");
  const [dxResults, setDxResults] = useState<any[]>([]);
  const [dxList, setDxList] = useState<any[]>([]);

  // Resep
  const [resepRows, setResepRows] = useState<{ medication_id: string; nama: string; signa: string; jumlah: string; query: string }[]>([
    { medication_id: "", nama: "", signa: "", jumlah: "", query: "" }
  ]);
  const [obatList, setObatList] = useState<any[]>([]);

  // Rekam medis popup
  const [showRm, setShowRm] = useState(false);
  const [rmLoading, setRmLoading] = useState(false);
  const [rmList, setRmList] = useState<any[]>([]);
  const [rmExpanded, setRmExpanded] = useState<Record<string, boolean>>({});

  // Tindakan
  const [tindakanList, setTindakanList] = useState<any[]>([]);
  const [tindakanMaster, setTindakanMaster] = useState<any[]>([]);

  // Puyer
  const [puyerRows, setPuyerRows] = useState<{nama: string; jumlah: string; query: string; medication_id: string}[]>([
    { nama: "", jumlah: "", query: "", medication_id: "" }
  ]);
  const [puyerJml, setPuyerJml] = useState("");
  const [puyerSigna, setPuyerSigna] = useState("");

  // Plan tabs
  const [planTab, setPlanTab] = useState<"resep" | "puyer" | "tindakan">("resep");

  // Vital signs
  const [oSistol, setOSistol] = useState("");
  const [oDiastol, setODiastol] = useState("");
  const [oHr, setOHr] = useState("");
  const [oRr, setORr] = useState("");
  const [oSpo2, setOSpo2] = useState("");
  const [oSuhu, setOSuhu] = useState("");
  const [oTb, setOTb] = useState("");
  const [oBb, setOBb] = useState("");

  const bmi = useMemo(() => {
    const b = Number(oBb), t = Number(oTb);
    if (!b || !t) return "";
    return (b / ((t / 100) ** 2)).toFixed(1);
  }, [oBb, oTb]);

  const showToastMsg = useCallback((msg: string, ok = true) => {
    setToast(msg); setToastOk(ok);
    setTimeout(() => setToast(""), 3000);
  }, []);

  const loadSOAP = useCallback((v: any) => {
    const cn = v.clinical_notes;
    setSubjektif(cn?.catatan_subjektif || cn?.keluhan_utama || "");
    setObjektif(cn?.catatan_pemeriksaan_fisik || "");
    const td = cn?.tekanan_darah || "";
    const parts = td.split("/");
    setOSistol(parts[0]?.trim() || "");
    setODiastol(parts[1]?.trim() || "");
    setOHr(cn?.hr != null ? String(cn.hr) : "");
    setORr(cn?.rr != null ? String(cn.rr) : "");
    setOSpo2(cn?.spo2 != null ? String(cn.spo2) : "");
    setOSuhu(cn?.suhu != null ? String(cn.suhu) : "");
    setOTb(cn?.tb != null ? String(cn.tb) : "");
    setOBb(cn?.bb != null ? String(cn.bb) : "");
    try { setDxList(cn?.riwayat_penyakit_sekarang ? JSON.parse(cn.riwayat_penyakit_sekarang) : []); } catch { setDxList([]); }
    setPlan(cn?.edukasi || "");
    // Load prescriptions
    const rxList = (v.prescriptions || []).filter((r: any) => r.is_active);
    const rxItems = rxList.flatMap((r: any) => r.prescription_items || []);
    const loadedRows = rxItems.map((it: any) => ({
      medication_id: it.medication_id || "",
      nama: `${it.medications?.nama || "?"} ${it.medications?.kekuatan || ""}`.trim(),
      signa: it.aturan_pakai || "",
      jumlah: String(it.jumlah || ""),
      query: "",
    }));
    setResepRows(loadedRows.length > 0 ? loadedRows : [{ medication_id: "", nama: "", signa: "", jumlah: "", query: "" }]);
    // Load powders
    const pwList = (v.powders || []).filter((p: any) => p.is_active);
    const allPuyerRows: {nama: string; jumlah: string; query: string; medication_id: string}[] = [];
    for (const p of pwList) {
      for (const it of (p.powder_items || [])) {
        allPuyerRows.push({
          nama: `${it.medications?.nama || "?"} ${it.medications?.kekuatan || ""}`.trim(),
          jumlah: String(it.jumlah_tablet || ""),
          query: "",
          medication_id: it.medication_id || "",
        });
      }
    }
    setPuyerRows(allPuyerRows.length > 0 ? allPuyerRows : [{ nama: "", jumlah: "", query: "", medication_id: "" }]);
    if (pwList.length > 0) {
      setPuyerJml(String(pwList[0].jumlah_bungkus || ""));
      setPuyerSigna(pwList[0].aturan_pakai || "");
    }
    // Load visit_actions
    const vaList = v.visit_actions || [];
    setTindakanList(vaList.map((va: any) => ({
      id: va.id, action_id: va.action_id, fee_id: va.fee_id,
      nama: va.actions?.nama || va.fee_snapshot_nama || "?",
      tarif: va.fee_snapshot_tarif,
    })));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setVisits(await getVisitsByStatus(["MENUNGGU_DOKTER", "SEDANG_DIPERIKSA"]));
      setObatList(await getMedications());
      setTindakanMaster(await getTindakan());
      const preselect = searchParams.get("visit");
      if (preselect) {
        const v = (await getVisitsByStatus(["MENUNGGU_DOKTER", "SEDANG_DIPERIKSA"])).find((x: any) => x.id === preselect);
        if (v) { setSelected(v); loadSOAP(v); setShowList(false); }
      }
    } finally { setLoading(false); }
  }, [searchParams, loadSOAP]);

  useEffect(() => { load(); }, [load]);

  const selectVisit = useCallback(async (v: any) => {
    setSelected(v);
    loadSOAP(v);
    if (v.status === "MENUNGGU_DOKTER") await panggil(v.id);
    setShowList(false);
  }, [loadSOAP]);

  const saveDraft = useCallback(async () => {
    if (!selected) return;
    setSaving(true);
    const td = oSistol && oDiastol ? `${oSistol}/${oDiastol}` : oSistol || "";
    try {
      await simpanDraftSOAP(selected.id, {
        catatan_subjektif: subjektif, catatan_pemeriksaan_fisik: objektif,
        riwayat_penyakit_sekarang: JSON.stringify(dxList),
        tekanan_darah: td || null,
        hr: oHr ? Number(oHr) : null, rr: oRr ? Number(oRr) : null,
        spo2: oSpo2 ? Number(oSpo2) : null, suhu: oSuhu ? Number(oSuhu) : null,
        tb: oTb ? Number(oTb) : null, bb: oBb ? Number(oBb) : null,
        edukasi: plan, is_draft: true,
      });
      const mappedResep = resepRows.filter((r) => r.medication_id && r.jumlah).map((r) => ({
        medication_id: r.medication_id, jumlah: Number(r.jumlah), aturan_pakai: r.signa || "-",
      }));
      const mappedPuyer = puyerRows.filter((r) => r.medication_id && r.jumlah).length > 0 ? [{
        jumlah_bungkus: Number(puyerJml) || 1, aturan_pakai: puyerSigna || "-",
        items: puyerRows.filter((r) => r.medication_id && r.jumlah).map((r) => ({
          medication_id: r.medication_id,
          jumlah_tablet: Number(r.jumlah) || 1,
        })),
      }] : [];
      await simpanResepDanTindakan(selected.id, mappedResep, mappedPuyer, tindakanList.map((t) => ({
        action_id: t.action_id, fee_id: t.fee_id, fee_snapshot_nama: t.nama, fee_snapshot_tarif: t.tarif,
      })));
      showToastMsg("Draft tersimpan.");
    } catch (e: any) { showToastMsg("Gagal: " + e.message, false); }
    finally { setSaving(false); }
  }, [selected, subjektif, objektif, dxList, oSistol, oDiastol, oHr, oRr, oSpo2, oSuhu, oTb, oBb, plan, resepRows, puyerRows, puyerJml, puyerSigna, obatList, tindakanList, showToastMsg]);

  const [tindakanWarn, setTindakanWarn] = useState(false);
  const [soapWarn, setSoapWarn] = useState(false);

  const finalize = useCallback(async () => {
    if (!selected) return;
    if (!subjektif.trim()) {
      setSoapWarn(true);
      setTimeout(() => setSoapWarn(false), 3000);
      return;
    }
    if (tindakanList.length === 0) {
      setTindakanWarn(true);
      setTimeout(() => setTindakanWarn(false), 3000);
      return;
    }
    setSaving(true);
    const td = oSistol && oDiastol ? `${oSistol}/${oDiastol}` : oSistol || "";
    try {
      const mappedResep = resepRows.filter((r) => r.medication_id && r.jumlah).map((r) => ({
        medication_id: r.medication_id, jumlah: Number(r.jumlah), aturan_pakai: r.signa || "-",
      }));
      const mappedPuyer = puyerRows.filter((r) => r.medication_id && r.jumlah).length > 0 ? [{
        jumlah_bungkus: Number(puyerJml) || 1, aturan_pakai: puyerSigna || "-",
        items: puyerRows.filter((r) => r.medication_id && r.jumlah).map((r) => ({
          medication_id: r.medication_id,
          jumlah_tablet: Number(r.jumlah) || 1,
        })),
      }] : [];
      await finalisasiDokter(selected.id, {
        catatan_subjektif: subjektif, catatan_pemeriksaan_fisik: objektif,
        riwayat_penyakit_sekarang: JSON.stringify(dxList),
        tekanan_darah: td || null,
        hr: oHr ? Number(oHr) : null, rr: oRr ? Number(oRr) : null,
        spo2: oSpo2 ? Number(oSpo2) : null, suhu: oSuhu ? Number(oSuhu) : null,
        tb: oTb ? Number(oTb) : null, bb: oBb ? Number(oBb) : null,
        edukasi: plan, is_draft: false,
      }, mappedResep, mappedPuyer, tindakanList.map((t) => ({
        action_id: t.action_id, fee_id: t.fee_id, fee_snapshot_nama: t.nama, fee_snapshot_tarif: t.tarif,
      })));
      showToastMsg("Dokter selesai. Pasien dikirim ke farmasi.");
      setSelected(null); setShowList(true);
      await load();
    } catch (e: any) { showToastMsg("Gagal: " + e.message, false); }
    finally { setSaving(false); }
  }, [selected, subjektif, objektif, dxList, oSistol, oDiastol, oHr, oRr, oSpo2, oSuhu, oTb, oBb, plan, resepRows, puyerRows, puyerJml, puyerSigna, obatList, tindakanList, showToastMsg, load]);

  const getResepMatches = useCallback((q: string) =>
    q ? obatList.filter((o: any) => `${o.nama} ${o.kekuatan || ""}`.toLowerCase().includes(q.toLowerCase())).slice(0, 8) : []
  , [obatList]);
  const selectResepObat = useCallback((med: any, idx: number) => {
    const r = [...resepRows];
    r[idx] = { ...r[idx], medication_id: med.id, nama: `${med.nama} ${med.kekuatan || ""}`.trim(), query: "" };
    setResepRows(r);
  }, [resepRows]);
  const selectPuyerObat = useCallback((med: any, idx: number) => {
    const r = [...puyerRows];
    r[idx] = { ...r[idx], medication_id: med.id, nama: `${med.nama} ${med.kekuatan || ""}`.trim(), query: "" };
    setPuyerRows(r);
  }, [puyerRows]);

  const openRm = useCallback(async (patientId: string) => {
    setShowRm(true); setRmLoading(true); setRmList([]); setRmExpanded({});
    try {
      const list = await getRiwayatKunjungan(patientId);
      setRmList(list);
      if (list.length > 0) setRmExpanded({ [list[0].id]: true });
    } catch { setRmList([]); }
    finally { setRmLoading(false); }
  }, []);

  const toggleRm = useCallback((id: string) => {
    setRmExpanded((o) => ({ ...o, [id]: !o[id] }));
  }, []);

  const fmt = useCallback((v: any) => v || "—", []);

  return (
    <div className="page">
      {toast && (
        <div className="toast-tray">
          <div className={`toast ${toastOk ? "toast-ok" : "toast-err"}`}>{toast}</div>
        </div>
      )}

      <div className="page-header">
        <h1 className="page-title">SOAP / Dokter</h1>
        <p className="page-sub">{visits.length} pasien menunggu</p>
      </div>

      {loading ? (
        <div className="loading"><div className="spin" /></div>
      ) : visits.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">🩺</div>
          <p className="empty-title">Antrian kosong</p>
          <p className="empty-sub">Tidak ada pasien menunggu pemeriksaan.</p>
        </div>
      ) : showList ? (
        <div className="queue">
          {visits.map((v: any) => (
            <button key={v.id} className="qcard" data-status={v.status} onClick={() => selectVisit(v)}>
              <div className="qcard-num">{String(v.no_antrean).padStart(2, "0")}</div>
              <div className="qcard-body">
                <div className="qcard-name">{v.patients?.nama}</div>
                <div className="qcard-meta">
                  <span>{formatWaktu(v.created_at)}</span>
                  <span className="qcard-meta-dot" />
                  <span>{v.no_kunjungan}</span>
                </div>
                {v.patients?.alergi && <div style={{marginTop:4}}><span style={{background:"var(--rose-bg)",color:"var(--rose)",border:"1px solid var(--rose-border)",padding:"1px 6px",borderRadius:99,fontSize:".68rem",fontWeight:700,textTransform:"uppercase"}}>ALERGI : {v.patients.alergi}</span></div>}
              </div>
              <div className="qcard-right">
                <span className={v.status === "SEDANG_DIPERIKSA" ? "sbadge sbadge-violet" : "sbadge sbadge-blue"}>
                  {v.status === "SEDANG_DIPERIKSA" ? "Diperiksa" : "Dokter"}
                </span>
              </div>
            </button>
          ))}
        </div>
      ) : selected ? (
        <div>
          <button className="btn btn-ghost" style={{marginBottom:"var(--s4)",gap:6}} onClick={() => { setSelected(null); setShowList(true); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            Kembali ke daftar
          </button>

          <div className="pt-banner" style={{marginBottom:"var(--s4)",display:"flex",alignItems:"center",gap:"var(--s3)"}}>
            <div style={{flex:1,minWidth:0}}>
              <div className="pt-name">{selected.patients?.nama}</div>
              <div className="pt-meta">
                <span>{selected.patients?.no_rm}</span>
                <span>{hitungUsia(selected.patients?.tanggal_lahir)}</span>
                <span>{selected.patients?.jenis_kelamin === "L" ? "L" : selected.patients?.jenis_kelamin === "P" ? "P" : "-"}</span>
                <span>{selected.patients?.alamat}</span>
                <span>No. {selected.no_antrean}</span>
                {selected.patients?.alergi && <span style={{background:"var(--rose-bg)",color:"var(--rose)",border:"1px solid var(--rose-border)",padding:"2px 8px",borderRadius:99,fontSize:".7rem",fontWeight:700,textTransform:"uppercase"}}>ALERGI : {selected.patients.alergi}</span>}
              </div>
            </div>
            <button className="btn btn-outline" style={{flexShrink:0,height:36,fontSize:".75rem"}} onClick={() => openRm(selected.patients?.id)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
              Rekam Medis
            </button>
          </div>

          {/* SOAP form */}
          <div className="card" style={{marginBottom:"var(--s4)"}}>
            <div className="card-head"><span className="card-title">Subjective</span></div>
            <div className="field"><textarea className="input" rows={3} placeholder="Keluhan & catatan subjektif…" value={subjektif} onChange={(e) => setSubjektif(e.target.value)}/></div>
          </div>

          <div className="card" style={{marginBottom:"var(--s4)"}}>
            <div className="card-head"><span className="card-title">Objective</span></div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"var(--s3)",marginBottom:"var(--s3)"}}>
              <div className="field">
                <label className="label">TD <span className="text-muted">(mmHg)</span></label>
                <div style={{display:"flex",alignItems:"stretch",gap:4}}>
                  <input className="input" style={{height:36,flex:1,textAlign:"center",fontWeight:700}} value={oSistol} onChange={(e) => setOSistol(e.target.value)} placeholder="120"/>
                  <span style={{display:"flex",alignItems:"center",padding:"0 var(--s2)",color:"var(--text-4)",fontWeight:700}}>/</span>
                  <input className="input" style={{height:36,flex:1,textAlign:"center",fontWeight:700}} value={oDiastol} onChange={(e) => setODiastol(e.target.value)} placeholder="80"/>
                </div>
              </div>
              <div className="field">
                <label className="label">HR <span className="text-muted">(bpm)</span></label>
                <input className="input" style={{height:36,fontWeight:700}} value={oHr} onChange={(e) => setOHr(e.target.value)} placeholder="80"/>
              </div>
              <div className="field">
                <label className="label">RR <span className="text-muted">/menit</span></label>
                <input className="input" style={{height:36,fontWeight:700}} value={oRr} onChange={(e) => setORr(e.target.value)} placeholder="18"/>
              </div>
              <div className="field">
                <label className="label">SpO₂ <span className="text-muted">(%)</span></label>
                <input className="input" style={{height:36,fontWeight:700}} value={oSpo2} onChange={(e) => setOSpo2(e.target.value)} placeholder="98"/>
              </div>
              <div className="field">
                <label className="label">Suhu <span className="text-muted">(°C)</span></label>
                <input className="input" style={{height:36,fontWeight:700}} value={oSuhu} onChange={(e) => setOSuhu(e.target.value)} placeholder="36.5"/>
              </div>
              <div style={{gridColumn:"span 1"}} />
              <div className="field">
                <label className="label">TB <span className="text-muted">(cm)</span></label>
                <input className="input" style={{height:36,fontWeight:700}} value={oTb} onChange={(e) => setOTb(e.target.value)} placeholder="170"/>
              </div>
              <div className="field">
                <label className="label">BB <span className="text-muted">(kg)</span></label>
                <input className="input" style={{height:36,fontWeight:700}} value={oBb} onChange={(e) => setOBb(e.target.value)} placeholder="65"/>
              </div>
              <div className="field">
                <label className="label">BMI</label>
                <input className="input" style={{height:36,fontWeight:700,textAlign:"center",background:"var(--surface-2)"}} readOnly value={bmi} />
              </div>
            </div>
            <div className="field"><textarea className="input" rows={3} placeholder="Temuan pemeriksaan fisik…" value={objektif} onChange={(e) => setObjektif(e.target.value)}/></div>
          </div>

          {/* Assessment */}
          <div className="card" style={{marginBottom:"var(--s4)"}}>
            <div className="card-head"><span className="card-title">Assessment</span></div>
            <div style={{display:"flex",flexDirection:"column",gap:"var(--s2)"}}>
              {dxList.map((dx: any, i: number) => (
                <div key={i} style={{display:"flex",alignItems:"center",gap:"var(--s2)",padding:"var(--s2) var(--s3)",background:"var(--surface-2)",borderRadius:"var(--r3)",border:"1px solid var(--border)"}}>
                  <span style={{flex:1,fontSize:".875rem"}}>{dx.kode} — {dx.nama}</span>
                  <button className="btn btn-ghost btn-xs" style={{color:"var(--rose)"}} onClick={() => setDxList(dxList.filter((_, idx) => idx !== i))}>×</button>
                </div>
              ))}
              <div className="search-wrap">
                <span className="search-icon">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                </span>
                <input className="search-input" type="search" placeholder="Cari diagnosis (kode / nama)…" value={dxQuery} onChange={async (e) => {
                  setDxQuery(e.target.value);
                  if (e.target.value.length >= 2) {
                    const results = await cariDiagnosis(e.target.value);
                    setDxResults(results);
                  } else { setDxResults([]); }
                }}/>
              </div>
              {dxResults.length > 0 && (
                <div style={{maxHeight:200,overflowY:"auto",border:"1px solid var(--border)",borderRadius:"var(--r3)"}}>
                  {dxResults.map((dx: any, i: number) => (
                    <button key={i} style={{width:"100%",display:"flex",textAlign:"left",padding:"var(--s2) var(--s3)",border:"none",borderBottom:"1px solid var(--border)",background:"var(--surface)",cursor:"pointer",fontSize:".8125rem"}} onClick={() => { setDxList([...dxList, dx]); setDxQuery(""); setDxResults([]); }}>
                      <span style={{fontWeight: 400,color:"var(--blue)"}}>{dx.kode}</span>
                      <span style={{marginLeft:8}}>{dx.nama}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="card" style={{marginBottom:"var(--s4)"}}>
            <div className="card-head"><span className="card-title">Plan</span></div>
            <div style={{display:"flex",flexDirection:"column",gap:"var(--s4)"}}>

              <div className="field">
                <label className="label">Edukasi / Rencana Tindak Lanjut</label>
                <textarea className="input" rows={3} placeholder="Edukasi dan rencana tindak lanjut…" value={plan} onChange={(e) => setPlan(e.target.value)}/>
              </div>

              <div className="divider" style={{margin:0}} />

              <div style={{display:"flex",gap:8}}>
                {(["resep", "puyer", "tindakan"] as const).map(tab => (
                  <button key={tab} className={`btn ${planTab === tab ? "btn-primary" : "btn-ghost"}`} style={{flex:1,height:40}} onClick={() => setPlanTab(tab)}>
                    {tab === "resep" ? "Resep" : tab === "puyer" ? "Puyer" : "Tindakan"}
                  </button>
                ))}
              </div>

          {planTab === "resep" && (
            <div style={{display:"flex",flexDirection:"column",gap:"var(--s3)"}}>
              <div className="field"><span className="label">Resep Obat</span></div>
              <div style={{display:"flex",flexDirection:"column",gap:"var(--s2)"}}>
                {resepRows.map((row, idx) => (
                  <div key={idx} style={{display:"grid",gridTemplateColumns:"1fr 80px 60px 32px",gap:"var(--s2)",alignItems:"center",position:"relative"}}>
                    <input className="input" style={{height:36,fontSize:".8125rem"}} placeholder="Cari obat…" value={row.query || row.nama} onChange={(e) => {
                      const newRows = [...resepRows]; newRows[idx] = { ...newRows[idx], nama: e.target.value, query: e.target.value }; setResepRows(newRows);
                    }}/>
                    <input className="input" style={{height:36,fontSize:".8125rem"}} placeholder="Signa" value={row.signa} onChange={(e) => {
                      const newRows = [...resepRows]; newRows[idx] = { ...newRows[idx], signa: e.target.value }; setResepRows(newRows);
                    }}/>
                    <input className="input" style={{height:36,fontSize:".8125rem"}} placeholder="Qty" {...numericProps(row.jumlah ?? "", (v) => {
                      const newRows = [...resepRows]; newRows[idx] = { ...newRows[idx], jumlah: String(v) }; setResepRows(newRows);
                    })}/>
                    <button className="btn btn-ghost btn-xs" style={{color:"var(--rose)"}} onClick={() => setResepRows(resepRows.filter((_, i) => i !== idx))}>×</button>
                    {row.query && getResepMatches(row.query).length > 0 && (
                      <div style={{position:"absolute",top:"100%",left:0,right:0,background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--r3)",boxShadow:"var(--e3)",zIndex:50,maxHeight:200,overflowY:"auto"}}>
                        {getResepMatches(row.query).map((m: any, mi: number) => (
                          <button key={mi} style={{width:"100%",display:"flex",textAlign:"left",padding:"var(--s2) var(--s3)",border:"none",borderBottom:"1px solid var(--border)",background:"var(--surface)",cursor:"pointer",fontSize:".8125rem"}} onClick={() => selectResepObat(m, idx)}>
                            <span style={{fontWeight: 400,color:"var(--blue)"}}>{m.nama}</span>
                            <span style={{marginLeft:8,color:"var(--text-4)"}}>{m.kekuatan}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <button className="btn btn-outline btn-sm btn-full" onClick={() => setResepRows([...resepRows, { medication_id: "", nama: "", signa: "", jumlah: "", query: "" }])}>+ Tambah Obat</button>
            </div>
          )}

          {planTab === "puyer" && (
            <div style={{display:"flex",flexDirection:"column",gap:"var(--s3)"}}>
              <div className="field"><span className="label">Puyer</span></div>
              <div className="grid-2" style={{marginBottom:"var(--s1)"}}>
                <div className="field"><label className="label">Jumlah Bungkus</label><input className="input" placeholder="3" {...numericProps(puyerJml ?? "", (v) => setPuyerJml(String(v)))} /></div>
                <div className="field"><label className="label">Aturan Pakai</label><input className="input" value={puyerSigna} onChange={(e) => setPuyerSigna(e.target.value)} placeholder="3x1"/></div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:"var(--s2)"}}>
                {puyerRows.map((row, idx) => (
                  <div key={idx} style={{display:"grid",gridTemplateColumns:"1fr 60px 32px",gap:"var(--s2)",alignItems:"center",position:"relative"}}>
                    <input className="input" style={{height:36,fontSize:".8125rem"}} placeholder="Cari obat…" value={row.query || row.nama} onChange={(e) => {
                      const newRows = [...puyerRows]; newRows[idx] = { ...newRows[idx], nama: e.target.value, query: e.target.value }; setPuyerRows(newRows);
                    }}/>
                    <input className="input" style={{height:36,fontSize:".8125rem"}} placeholder="Qty" {...numericProps(row.jumlah ?? "", (v) => {
                      const newRows = [...puyerRows]; newRows[idx] = { ...newRows[idx], jumlah: String(v) }; setPuyerRows(newRows);
                    })}/>
                    <button className="btn btn-ghost btn-xs" style={{color:"var(--rose)"}} onClick={() => setPuyerRows(puyerRows.filter((_, i) => i !== idx))}>×</button>
                    {row.query && (() => { const matches = obatList.filter((o: any) => `${o.nama} ${o.kekuatan || ""}`.toLowerCase().includes(row.query.toLowerCase())).slice(0, 8); return matches.length > 0 && (
                      <div style={{position:"absolute",top:"100%",left:0,right:0,background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--r3)",boxShadow:"var(--e3)",zIndex:50,maxHeight:200,overflowY:"auto"}}>
                        {matches.map((m: any, mi: number) => (
                          <button key={mi} style={{width:"100%",display:"flex",textAlign:"left",padding:"var(--s2) var(--s3)",border:"none",borderBottom:"1px solid var(--border)",background:"var(--surface)",cursor:"pointer",fontSize:".8125rem"}} onClick={() => selectPuyerObat(m, idx)}>
                            <span style={{fontWeight: 400,color:"var(--blue)"}}>{m.nama}</span>
                            <span style={{marginLeft:8,color:"var(--text-4)"}}>{m.kekuatan}</span>
                          </button>
                        ))}
                      </div>
                    ); })()}
                  </div>
                ))}
              </div>
              <button className="btn btn-outline btn-sm btn-full" onClick={() => setPuyerRows([...puyerRows, { nama: "", jumlah: "", query: "", medication_id: "" }])}>+ Tambah Item</button>
            </div>
          )}

          {planTab === "tindakan" && (
            <div style={{display:"flex",flexDirection:"column",gap:"var(--s3)"}}>
              <div className="field"><span className="label">Pilih Tindakan</span></div>
              <div style={{display:"flex",flexDirection:"column"}}>
                {tindakanMaster.map((t: any) => {
                  const isOn = tindakanList.some((tl) => tl.fee_id === t.id);
                  return (
                    <label key={t.id} style={{display:"flex",alignItems:"center",gap:"var(--s3)",padding:"var(--s2) var(--s3)",borderBottom:"1px solid var(--border)",cursor:"pointer",fontSize:".875rem",background:isOn ? "var(--blue-bg)" : "transparent",borderLeft:`3px solid ${isOn ? "var(--blue)" : "transparent"}`,transition:"background .12s,border-color .12s"}}>
                      <input type="checkbox" checked={isOn} onChange={() => {
                        if (isOn) setTindakanList(tindakanList.filter((tl) => tl.fee_id !== t.id));
                        else setTindakanList([...tindakanList, { action_id: t.action_id, fee_id: t.id, nama: t.nama, kode: t.kode || "", tarif: t.tarif }]);
                      }} style={{width:16,height:16,accentColor:"var(--blue)",cursor:"pointer",flexShrink:0}}/>
                      <span style={{flex:1,fontWeight:isOn ? 700 : 400,color:isOn ? "var(--blue)" : "var(--text)",display:"flex",alignItems:"center",gap:8,minWidth:0}}>
                        <span style={{flexShrink:0,fontSize:".7rem",fontWeight:700,letterSpacing:".02em",color:isOn ? "var(--blue)" : "var(--text-4)",background:isOn ? "rgba(37,99,235,.12)" : "var(--surface-3)",border:"1px solid",borderColor:isOn ? "var(--blue-lt)" : "var(--border)",padding:"1px 6px",borderRadius:4}}>{t.kode || "—"}</span>
                        <span className="truncate">{t.nama}</span>
                      </span>
                      <span style={{fontSize:".8125rem",fontWeight:700,color:isOn ? "var(--blue)" : "var(--text-3)",whiteSpace:"nowrap"}}>{formatRupiah(t.tarif)}</span>
                    </label>
                  );
                })}
                {tindakanMaster.length === 0 && (
                  <div style={{fontSize:".8125rem",color:"var(--text-4)",padding:"var(--s4)"}}>Memuat data tindakan…</div>
                )}
              </div>
              {tindakanWarn && tindakanList.length === 0 && (
                <div className="alert alert-danger" style={{marginTop:"var(--s2)",display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:"1rem"}}>⚠️</span>
                  <span>Tindakan wajib diisi. Pilih minimal satu tindakan sebelum finalisasi.</span>
                </div>
              )}
              {tindakanList.length > 0 && (
                <div>
                  <span className="label">Dipilih ({tindakanList.length})</span>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:6}}>
                    {tindakanList.map((t, i) => (
                      <span key={i} style={{display:"inline-flex",alignItems:"center",gap:4,background:"var(--blue-bg)",color:"var(--blue)",border:"1px solid var(--blue-lt)",padding:"2px 8px",borderRadius:99,fontSize:".75rem",fontWeight: 400}}>
                        {t.kode ? <span style={{fontSize:".68rem",opacity:.7,letterSpacing:".02em"}}>[{t.kode}]</span> : null} {t.nama}
                        <button onClick={() => setTindakanList(tindakanList.filter((_, idx) => idx !== i))} style={{background:"none",border:"none",color:"var(--blue)",cursor:"pointer",fontWeight:700,padding:0,fontSize:".8rem"}}>×</button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {soapWarn && !subjektif.trim() && (
            <div className="alert alert-danger" style={{marginTop:"var(--s2)",display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:"1rem"}}>⚠️</span>
              <span>SOAP belum diisi. Isi keluhkan utama sebelum finalisasi.</span>
            </div>
          )}

            </div>
          </div>

          {/* Action buttons */}
          <div style={{display:"flex",gap:"var(--s3)",paddingTop:"var(--s4)",borderTop:"1px solid var(--border)"}}>
            <button className="btn btn-ghost" style={{flex:1}} onClick={saveDraft} disabled={saving}>{saving ? "Menyimpan…" : "Simpan Draft"}</button>
            <button className="btn btn-primary" style={{flex:2}} onClick={finalize} disabled={saving || !subjektif.trim() || tindakanList.length === 0}>{saving ? "Memproses…" : !subjektif.trim() ? "Isi SOAP Dulu" : tindakanList.length === 0 ? "Pilih Tindakan Dulu" : "Finalisasi → Kirim ke Farmasi"}</button>
          </div>
        </div>
      ) : null}

      {/* Rekam medis popup — riwayat kunjungan saja */}
      {showRm && (
        <>
          <div className="backdrop" onClick={() => setShowRm(false)} />
          <div className="sheet" role="dialog" aria-modal="true" aria-label="Riwayat kunjungan">
            <div className="sheet-grip" />
            <div className="sheet-head">
              <span className="sheet-title">Riwayat Kunjungan · {selected?.patients?.nama}</span>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowRm(false)}>✕</button>
            </div>
            <div className="sheet-body">
              {rmLoading ? (
                <div className="loading"><div className="spin" /></div>
              ) : rmList.length === 0 ? (
                <div className="empty" style={{padding:"var(--s8) 0"}}><div className="empty-icon">📋</div><p className="empty-title">Belum ada riwayat</p><p className="empty-sub">Pasien belum pernah berkunjung sebelumnya.</p></div>
              ) : (
                <>
                  <div style={{fontSize:".78rem",color:"var(--text-4)",background:"var(--slate-bg)",padding:"var(--s3)",borderRadius:8,border:"1px solid var(--slate-border)",marginBottom:"var(--s3)"}}>
                    Total kunjungan: <strong style={{color:"var(--text)"}}>{rmList.length}</strong> · Terakhir: {formatWaktu(rmList[0].created_at)}
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:"var(--s4)"}}>
                    {rmList.map((v: any) => {
                      const cn: any = Array.isArray(v.clinical_notes) ? v.clinical_notes[0] : v.clinical_notes;
                      const hasSOAP = !!cn;
                      return (
                        <div key={v.id} className="card" style={{padding:0,overflow:"hidden"}}>
                          <button onClick={() => toggleRm(v.id)} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"var(--s3) var(--s4)",background:"var(--surface-2)",border:"none",borderBottom:"1px solid var(--border)",cursor:"pointer",textAlign:"left"}} aria-expanded={!!rmExpanded[v.id]}>
                            <div>
                              <div style={{fontWeight:700,fontSize:".9rem",color:"var(--text)"}}>{formatWaktu(v.created_at)} · <span style={{fontSize:".75rem",color:"var(--text-4)"}}>{v.no_kunjungan}</span></div>
                              <div style={{fontSize:".75rem",color:"var(--text-4)"}}>Antrean #{v.no_antrean} · {hasSOAP ? (cn.is_draft ? "Draft" : "Final") : "Belum isi SOAP"}</div>
                            </div>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{flexShrink:0,color:"var(--text-4)",transition:"transform .2s",transform:rmExpanded[v.id] ? "rotate(180deg)" : "rotate(0deg)"}}><polyline points="6 9 12 15 18 9"/></svg>
                          </button>
                          {rmExpanded[v.id] && (
                            <div style={{padding:"var(--s4)",display:"flex",flexDirection:"column",gap:"var(--s3)",fontSize:".875rem"}}>
                              <div><div style={{fontWeight: 700,letterSpacing:".06em",color:"var(--blue)",fontSize:".7rem",textTransform:"uppercase",marginBottom:4}}>S — Subjektif</div><div><span style={{color:"var(--text-4)"}}>Keluhan Utama:</span> <strong style={{color:"var(--text)"}}>{fmt(cn?.keluhan_utama)}</strong></div><div><span style={{color:"var(--text-4)"}}>Catatan Subjektif:</span> <span style={{color:"var(--text-2)"}}>{fmt(cn?.catatan_subjektif)}</span></div></div>
                              <div><div style={{fontWeight: 700,letterSpacing:".06em",color:"var(--teal)",fontSize:".7rem",textTransform:"uppercase",marginBottom:4}}>O — Objektif / TTV</div><div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>{[["TD", cn?.tekanan_darah || "—"], ["Suhu", cn?.suhu ? `${cn.suhu}°C` : "—"], ["SpO₂", cn?.spo2 ? `${cn.spo2}%` : "—"], ["HR", fmt(cn?.hr)], ["RR", fmt(cn?.rr)], ["TB", cn?.tb ? `${cn.tb} cm` : "—"], ["BB", cn?.bb ? `${cn.bb} kg` : "—"], ["BMI", (cn?.tb && cn?.bb) ? ((Number(cn.bb) / ((Number(cn.tb) / 100) ** 2)).toFixed(1)) : "—"]].map(([label, value]) => (<div key={label} style={{background:"var(--surface-2)",padding:6,borderRadius:8,textAlign:"center"}}><div style={{fontSize:".6rem",color:"var(--text-4)"}}>{label}</div><div style={{fontWeight:700,fontSize:".78rem"}}>{value}</div></div>))}</div><div style={{marginTop:6}}><span style={{color:"var(--text-4)"}}>Pemeriksaan Fisik:</span> <span style={{color:"var(--text-2)"}}>{fmt(cn?.catatan_pemeriksaan_fisik)}</span></div></div>
                              <div><div style={{fontWeight: 700,letterSpacing:".06em",color:"var(--violet)",fontSize:".7rem",textTransform:"uppercase",marginBottom:4}}>A — Assessment</div>{hasSOAP ? (() => { let dx: any[] = []; try { dx = cn?.riwayat_penyakit_sekarang ? JSON.parse(cn.riwayat_penyakit_sekarang) : []; } catch { dx = []; } return dx.length > 0 ? (<div style={{display:"flex",flexDirection:"column",gap:4}}>{dx.map((d: any, i: number) => (<div key={i} style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:".6rem",fontWeight:700,color:"var(--text-4)",background:"var(--surface-2)",padding:"1px 6px",borderRadius:4}}>{d.kode || "—"}</span><span style={{color:"var(--text)"}}>{d.nama}</span></div>))}</div>) : <span style={{color:"var(--text-4)"}}>— Tidak ada diagnosis —</span>; })() : <span style={{color:"var(--text-4)"}}>— Belum diisi —</span>}</div>
                              <div><div style={{fontWeight: 700,letterSpacing:".06em",color:"var(--green)",fontSize:".7rem",textTransform:"uppercase",marginBottom:4}}>P — Plan</div><div style={{display:"flex",flexDirection:"column",gap:4}}><div><span style={{color:"var(--text-4)"}}>Edukasi / Rencana Tindak Lanjut:</span> <span style={{color:"var(--text-2)"}}>{fmt(cn?.edukasi)}</span></div>{v.visit_actions?.length > 0 ? <div><span style={{color:"var(--text-4)"}}>Tindakan:</span> {v.visit_actions.map((a: any) => `${a.actions?.nama || a.fee_snapshot_nama}`).join(", ")}</div> : <div><span style={{color:"var(--text-4)"}}>Tindakan:</span> —</div>}{v.prescriptions?.filter((p: any) => p.is_active).length > 0 ? <div><span style={{color:"var(--text-4)"}}>Resep:</span> {v.prescriptions.filter((p: any) => p.is_active).flatMap((p: any) => (p.prescription_items || []).map((it: any) => `${it.medications?.nama} ${it.medications?.kekuatan || ""} x${it.jumlah} (${it.aturan_pakai})`)).join(" · ") || "—"}</div> : <div><span style={{color:"var(--text-4)"}}>Resep:</span> —</div>}{v.powders?.filter((p: any) => p.is_active).length > 0 ? <div><span style={{color:"var(--text-4)"}}>Puyer:</span> {v.powders.filter((p: any) => p.is_active).map((p: any) => `${p.jumlah_bungkus} bungkus (${p.aturan_pakai})`).join(", ")}</div> : null}{cn?.fee_snapshot_nama ? <div><span style={{color:"var(--text-4)"}}>Biaya:</span> {cn.fee_snapshot_nama} — {formatRupiah(cn.fee_snapshot_tarif)}</div> : null}</div></div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}