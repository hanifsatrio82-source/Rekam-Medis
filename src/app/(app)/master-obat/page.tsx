"use client";

import { useState, useEffect, useCallback } from "react";
import { getMedications, simpanObat, hapusObat } from "~/lib/api";
import { formatRupiah, numericProps } from "~/lib/utils";

const EMPTY_FORM = { id: "", nama: "", kekuatan: "", satuan: "tablet", stok: 0, harga_beli: 0, harga_jual: 0, minimum_stok: 10 };
const SATUAN = ["tablet", "kapsul", "sirup", "salep", "tetes", "ampul", "sachet", "ml", "gram"];

export default function MasterObatPage() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [toastOk, setToastOk] = useState(true);

  const showToast = useCallback((msg: string, ok = true) => { setToast(msg); setToastOk(ok); setTimeout(() => setToast(""), 2500); }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try { setList(await getMedications(search)); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await simpanObat(form);
      showToast(form.id ? "Obat diperbarui." : "Obat berhasil ditambahkan.");
      setFormOpen(false);
      await load();
    } catch (e: any) { showToast("Gagal: " + e.message, false); }
    finally { setSaving(false); }
  }, [form, showToast, load]);

  const handleHapus = useCallback(async (id: string, nama: string) => {
    if (!confirm(`Hapus "${nama}"?`)) return;
    setSaving(true);
    try { await hapusObat(id); showToast("Obat dihapus."); await load(); }
    catch (e: any) { showToast("Gagal: " + e.message, false); }
    finally { setSaving(false); }
  }, [showToast, load]);

  return (
    <div className="page">
      {toast && (<div className="toast-tray"><div className={`toast ${toastOk ? "toast-ok" : "toast-err"}`}>{toast}</div></div>)}

      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:"var(--s3)",marginBottom:"var(--s5)"}}>
        <div><h1 className="page-title">Master Obat</h1><p className="page-sub">{list.length} obat terdaftar</p></div>
        <button className="btn btn-primary btn-sm" onClick={() => { setForm(EMPTY_FORM); setFormOpen(true); }}>+ Tambah</button>
      </div>

      <div className="search-wrap">
        <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input className="search-input" type="search" placeholder="Cari nama obat…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Cari obat" />
      </div>

      {loading ? (<div className="loading"><div className="spin" /></div>) : list.length === 0 ? (
        <div className="empty"><div className="empty-icon">💊</div><p className="empty-title">Belum ada obat</p><p className="empty-sub">Tambahkan obat pertama untuk memulai.</p><button className="btn btn-primary" style={{marginTop:"var(--s4)"}} onClick={() => { setForm(EMPTY_FORM); setFormOpen(true); }}>+ Tambah Obat</button></div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:"var(--s2)"}}>
          {list.map((item: any) => (
            <div key={item.id} className="card">
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:"var(--s3)"}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,color:"var(--text)",fontSize:".9375rem"}}>{item.nama}</div>
                  <div style={{fontSize:".8125rem",color:"var(--text-3)",marginTop:2}}>Stok: <strong style={{color:"var(--text-2)"}}>{item.stok}</strong> {item.satuan}<span style={{margin:"0 var(--s2)",color:"var(--border-2)"}}>·</span><strong style={{color:"var(--text-2)"}}>{formatRupiah(item.harga_jual)}</strong> / {item.satuan}</div>
                  {(item.bentuk_sediaan || item.kekuatan) && <div style={{fontSize:".75rem",color:"var(--text-4)",marginTop:2}}>{[item.bentuk_sediaan, item.kekuatan].filter(Boolean).join(" · ")}</div>}
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
          <div className="sheet" role="dialog" aria-modal="true" aria-label={form.id ? "Edit obat" : "Tambah obat"}>
            <div className="sheet-grip" />
            <div className="sheet-head">
              <span className="sheet-title">{form.id ? "Edit Obat" : "Tambah Obat"}</span>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setFormOpen(false)}>✕</button>
            </div>
            <div className="sheet-body">
              <div className="form-stack">
                <div className="field"><label className="label" htmlFor="ob-nama">Nama Obat <span className="req">*</span></label><input id="ob-nama" className="input" type="text" placeholder="Paracetamol" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} /></div>
                <div className="grid-2">
                  <div className="field"><label className="label" htmlFor="ob-kekuatan">Kekuatan</label><input id="ob-kekuatan" className="input" type="text" placeholder="500mg, 250mg…" value={form.kekuatan} onChange={(e) => setForm({ ...form, kekuatan: e.target.value })} /></div>
                  <div className="field"><label className="label" htmlFor="ob-satuan">Satuan</label><select id="ob-satuan" className="input" value={form.satuan} onChange={(e) => setForm({ ...form, satuan: e.target.value })}>{SATUAN.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                </div>
                <div className="grid-2">
                  <div className="field"><label className="label" htmlFor="ob-stok">Stok</label><input id="ob-stok" className="input" {...numericProps(form.stok, (v) => setForm({ ...form, stok: v }))} /></div>
                  <div className="field"><label className="label" htmlFor="ob-minstok">Min. Stok</label><input id="ob-minstok" className="input" {...numericProps(form.minimum_stok, (v) => setForm({ ...form, minimum_stok: v }))} /></div>
                </div>
                <div className="grid-2">
                  <div className="field"><label className="label" htmlFor="ob-hbeli">Harga Beli (Rp)</label><input id="ob-hbeli" className="input" {...numericProps(form.harga_beli, (v) => setForm({ ...form, harga_beli: v }))} /></div>
                  <div className="field"><label className="label" htmlFor="ob-hjual">Harga Jual (Rp)</label><input id="ob-hjual" className="input" {...numericProps(form.harga_jual, (v) => setForm({ ...form, harga_jual: v }))} /></div>
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
