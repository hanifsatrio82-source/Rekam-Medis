"use client";

import { useState, useEffect, useCallback } from "react";
import { getBiaya, simpanBiaya, hapusBiaya } from "~/lib/api";
import { formatRupiah } from "~/lib/utils";

const EMPTY = { id: "", nama: "", kode: "", tarif: 0 };

export default function MasterBiayaPage() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [toastOk, setToastOk] = useState(true);

  const showToast = useCallback((msg: string, ok = true) => { setToast(msg); setToastOk(ok); setTimeout(() => setToast(""), 2500); }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try { setList(await getBiaya()); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await simpanBiaya(form);
      showToast(form.id ? "Biaya diperbarui." : "Biaya ditambahkan.");
      setFormOpen(false); await load();
    } catch (e: any) { showToast("Gagal: " + e.message, false); }
    finally { setSaving(false); }
  }, [form, showToast, load]);

  const handleHapus = useCallback(async (id: string, nama: string) => {
    if (!confirm(`Hapus "${nama}"?`)) return;
    try { await hapusBiaya(id); showToast("Biaya dihapus."); await load(); }
    catch (e: any) { showToast("Gagal: " + e.message, false); }
  }, [showToast, load]);

  return (
    <div className="page">
      {toast && (<div className="toast-tray"><div className={`toast ${toastOk ? "toast-ok" : "toast-err"}`}>{toast}</div></div>)}
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:"var(--s3)",marginBottom:"var(--s5)"}}>
        <div><h1 className="page-title">Master Biaya</h1><p className="page-sub">{list.length} item biaya</p></div>
        <button className="btn btn-primary btn-sm" onClick={() => { setForm(EMPTY); setFormOpen(true); }}>+ Tambah</button>
      </div>
      {loading ? (<div className="loading"><div className="spin" /></div>) : list.length === 0 ? (
        <div className="empty"><div className="empty-icon">🏷️</div><p className="empty-title">Belum ada biaya</p><p className="empty-sub">Tambahkan tarif layanan untuk digunakan saat pemeriksaan.</p><button className="btn btn-primary" style={{marginTop:"var(--s4)"}} onClick={() => { setForm(EMPTY); setFormOpen(true); }}>+ Tambah Biaya</button></div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:"var(--s2)"}}>
          {list.map((item: any) => (
            <div key={item.id} className="card">
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:"var(--s3)"}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,color:"var(--text)"}}>{item.nama}</div>
                  <div style={{display:"flex",alignItems:"center",gap:"var(--s2)",marginTop:4,flexWrap:"wrap"}}>
                    {item.kode && <span className="sbadge sbadge-blue">{item.kode}</span>}
                    <span style={{fontSize:".9375rem",fontWeight:700,color:"var(--blue)"}}>{formatRupiah(item.tarif)}</span>
                  </div>
                </div>
                <div style={{display:"flex",gap:"var(--s2)",flexShrink:0}}>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setForm({ ...item }); setFormOpen(true); }}>Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleHapus(item.id, item.nama)}>Hapus</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {formOpen && (
        <>
          <div className="backdrop" onClick={() => setFormOpen(false)} />
          <div className="sheet" role="dialog" aria-modal="true" aria-label={form.id ? "Edit biaya" : "Tambah biaya"}>
            <div className="sheet-grip" />
            <div className="sheet-head"><span className="sheet-title">{form.id ? "Edit Biaya" : "Tambah Biaya"}</span><button className="btn btn-ghost btn-icon btn-sm" onClick={() => setFormOpen(false)}>✕</button></div>
            <div className="sheet-body">
              <div className="form-stack">
                <div className="field"><label className="label" htmlFor="bi-nama">Nama Biaya <span className="req">*</span></label><input id="bi-nama" className="input" type="text" placeholder="Konsultasi Umum" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} /></div>
                <div className="grid-2">
                  <div className="field"><label className="label" htmlFor="bi-kode">Kode</label><input id="bi-kode" className="input" type="text" placeholder="LITE, MEDIUM, ULTRA…" value={form.kode} onChange={(e) => setForm({ ...form, kode: e.target.value.toUpperCase() })} /></div>
                  <div className="field"><label className="label" htmlFor="bi-tarif">Tarif (Rp)</label><input id="bi-tarif" className="input" type="text" inputMode="numeric" placeholder="0" value={String(form.tarif ?? "")} onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ""); if (v === "") setForm({ ...form, tarif: "" as any }); else setForm({ ...form, tarif: parseInt(v, 10) as any }); }} /></div>
                </div>
              </div>
            </div>
            <div className="sheet-foot">
              <button className="btn btn-ghost btn-full" onClick={() => setFormOpen(false)}>Batal</button>
              <button className="btn btn-primary btn-full" onClick={handleSave} disabled={saving || !form.nama}>{saving ? "Menyimpan…" : "Simpan"}</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
