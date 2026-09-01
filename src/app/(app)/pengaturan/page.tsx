"use client";

import { useState, useEffect, useCallback } from "react";
import { getPengaturan, simpanPengaturan, getAkunSaya, getDaftarAkun, undangAkun, setAkunAktif, updateAkunRole, hapusAkun } from "~/lib/api";

export default function PengaturanPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [toastOk, setToastOk] = useState(true);
  const [activeTab, setActiveTab] = useState<"umum" | "akun">("umum");

  const [namaPraktik, setNamaPraktik] = useState("");
  const [alamat, setAlamat] = useState("");
  const [noHp, setNoHp] = useState("");
  const [namaDokter, setNamaDokter] = useState("");
  const [strNo, setStrNo] = useState("");
  const [sipNo, setSipNo] = useState("");
  const [jamBuka, setJamBuka] = useState("08:00");
  const [jamTutup, setJamTutup] = useState("17:00");
  const [pesanKwitansi, setPesanKwitansi] = useState("");

  const [akunSaya, setAkunSaya] = useState<any>(null);
  const [daftarAkun, setDaftarAkun] = useState<any[]>([]);
  const [akunLoading, setAkunLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePass, setInvitePass] = useState("");
  const [inviteNama, setInviteNama] = useState("");
  const [inviteRole, setInviteRole] = useState("staff");
  const [inviting, setInviting] = useState(false);

  const showToastMsg = useCallback((msg: string, ok = true) => { setToast(msg); setToastOk(ok); setTimeout(() => setToast(""), 3000); }, []);

  const loadPengaturan = useCallback(async () => {
    const s = await getPengaturan();
    setNamaPraktik(s.nama_praktik || ""); setAlamat(s.alamat || ""); setNoHp(s.no_hp || "");
    setNamaDokter(s.nama_dokter || ""); setStrNo(s.str_no || ""); setSipNo(s.sip_no || "");
    setJamBuka(s.jam_buka || "08:00"); setJamTutup(s.jam_tutup || "17:00"); setPesanKwitansi(s.pesan_kwitansi || "");
  }, []);

  const loadAkun = useCallback(async () => {
    setAkunLoading(true);
    try {
      const [me, list] = await Promise.all([getAkunSaya(), getDaftarAkun()]);
      setAkunSaya(me); setDaftarAkun(list as any[]);
    } catch {} finally { setAkunLoading(false); }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try { await loadPengaturan(); await loadAkun(); }
      finally { setLoading(false); }
    })();
  }, [loadPengaturan, loadAkun]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await simpanPengaturan({ nama_praktik: namaPraktik, alamat, no_hp: noHp, nama_dokter: namaDokter, str_no: strNo, sip_no: sipNo, jam_buka: jamBuka, jam_tutup: jamTutup, pesan_kwitansi: pesanKwitansi });
      showToastMsg("Pengaturan berhasil disimpan.");
    } catch (e: any) { showToastMsg("Gagal: " + e.message, false); }
    finally { setSaving(false); }
  }, [namaPraktik, alamat, noHp, namaDokter, strNo, sipNo, jamBuka, jamTutup, pesanKwitansi, showToastMsg]);

  const handleInvite = useCallback(async () => {
    if (!inviteEmail || !invitePass) { showToastMsg("Email & password wajib."); setToastOk(false); return; }
    setInviting(true);
    try {
      await undangAkun(inviteEmail.trim(), invitePass, inviteNama.trim() || undefined, inviteRole);
      showToastMsg("Akun berhasil dibuat.");
      setInviteEmail(""); setInvitePass(""); setInviteNama("");
      await loadAkun();
    } catch (e: any) { showToastMsg("Gagal buat akun: " + e.message, false); }
    finally { setInviting(false); }
  }, [inviteEmail, invitePass, inviteNama, inviteRole, showToastMsg, loadAkun]);

  const handleToggleAktif = useCallback(async (id: string, cur: boolean) => {
    try { await setAkunAktif(id, !cur); await loadAkun(); showToastMsg(!cur ? "Akun diaktifkan." : "Akun dinonaktifkan."); }
    catch (e: any) { showToastMsg(e.message, false); }
  }, [loadAkun, showToastMsg]);

  const handleRoleChange = useCallback(async (id: string, newRole: string) => {
    try { await updateAkunRole(id, newRole); await loadAkun(); showToastMsg("Role diperbarui."); }
    catch (e: any) { showToastMsg(e.message, false); }
  }, [loadAkun, showToastMsg]);

  const [confirmHapusId, setConfirmHapusId] = useState<string | null>(null);
  const handleHapus = useCallback(async (id: string, email: string) => {
    if (confirmHapusId !== id) { setConfirmHapusId(id); setTimeout(() => setConfirmHapusId(null), 3000); return; }
    try { await hapusAkun(id); setConfirmHapusId(null); await loadAkun(); showToastMsg(`Akun ${email} dihapus.`); }
    catch (e: any) { showToastMsg(e.message, false); }
  }, [confirmHapusId, loadAkun, showToastMsg]);

  if (loading) return <div className="page"><div className="loading"><div className="spin" /></div></div>;

  const totalAkun = daftarAkun.length;
  const aktifAkun = daftarAkun.filter(a => a.is_active).length;

  return (
    <div className="page">
      {toast && (<div className="toast-tray"><div className={`toast ${toastOk ? "toast-ok" : "toast-err"}`}>{toast}</div></div>)}
      <div className="page-header">
        <h1 className="page-title">Pengaturan</h1>
        <p className="page-sub">Konfigurasi praktik & manajemen akun</p>
      </div>
      <div style={{display:"flex",gap:8,marginBottom:"var(--s5)"}}>
        <button className={`btn ${activeTab === "umum" ? "btn-primary" : "btn-ghost"}`} style={{flex:1,height:40,fontWeight:700}} onClick={() => setActiveTab("umum")}>Umum</button>
        <button className={`btn ${activeTab === "akun" ? "btn-primary" : "btn-ghost"}`} style={{flex:1,height:40,fontWeight:700}} onClick={() => { setActiveTab("akun"); if (daftarAkun.length === 0) loadAkun(); }}>
          Akun <span style={{marginLeft:6,background:"rgba(255,255,255,.25)",padding:"2px 7px",borderRadius:99,fontSize:".7rem"}}>{totalAkun || "·"}</span>
        </button>
      </div>

      {activeTab === "umum" && (
        <div style={{display:"flex",flexDirection:"column",gap:"var(--s5)",maxWidth:600}}>
          <div className="card">
            <div className="card-head"><span className="card-title">Informasi Praktik</span></div>
            <div className="form-stack">
              <div className="field"><label className="label" htmlFor="pg-nama">Nama Praktik</label><input id="pg-nama" className="input" type="text" placeholder="Klinik Sehat Bersama" value={namaPraktik} onChange={(e) => setNamaPraktik(e.target.value)} /></div>
              <div className="field"><label className="label" htmlFor="pg-alamat">Alamat</label><textarea id="pg-alamat" className="input" rows={3} placeholder="Jl. Kesehatan No. 1…" value={alamat} onChange={(e) => setAlamat(e.target.value)} /></div>
              <div className="field"><label className="label" htmlFor="pg-hp">No. HP / WhatsApp</label><input id="pg-hp" className="input" type="tel" placeholder="08xxxxxxxxxx" value={noHp} onChange={(e) => setNoHp(e.target.value)} /></div>
              <div className="grid-2">
                <div className="field"><label className="label" htmlFor="pg-buka">Jam Buka</label><input id="pg-buka" className="input" type="time" value={jamBuka} onChange={(e) => setJamBuka(e.target.value)} /></div>
                <div className="field"><label className="label" htmlFor="pg-tutup">Jam Tutup</label><input id="pg-tutup" className="input" type="time" value={jamTutup} onChange={(e) => setJamTutup(e.target.value)} /></div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-head"><span className="card-title">Data Dokter</span></div>
            <div className="form-stack">
              <div className="field"><label className="label" htmlFor="pg-dokter">Nama Dokter</label><input id="pg-dokter" className="input" type="text" placeholder="dr. Ahmad Fauzi" value={namaDokter} onChange={(e) => setNamaDokter(e.target.value)} /></div>
              <div className="grid-2">
                <div className="field"><label className="label" htmlFor="pg-str">No. STR</label><input id="pg-str" className="input" type="text" placeholder="123/STR/…" value={strNo} onChange={(e) => setStrNo(e.target.value)} /></div>
                <div className="field"><label className="label" htmlFor="pg-sip">No. SIP</label><input id="pg-sip" className="input" type="text" placeholder="123/SIP/…" value={sipNo} onChange={(e) => setSipNo(e.target.value)} /></div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-head"><span className="card-title">Kwitansi</span></div>
            <div className="field"><label className="label" htmlFor="pg-pesan">Pesan / Footer</label><textarea id="pg-pesan" className="input" rows={3} placeholder="Terima kasih telah mempercayakan kesehatan Anda…" value={pesanKwitansi} onChange={(e) => setPesanKwitansi(e.target.value)} /></div>
          </div>
          <button className="btn btn-primary btn-full" style={{height:52,fontSize:"1rem"}} onClick={handleSave} disabled={saving}>{saving ? "Menyimpan…" : "Simpan Pengaturan"}</button>
        </div>
      )}

      {activeTab === "akun" && (
        (() => {
          const emailSaya = akunSaya?.user?.email?.toLowerCase() || "";
          if (emailSaya !== "hanifsatrio82@gmail.com") {
            return (
              <div className="card">
                <div className="card-head"><span className="card-title">Akun</span></div>
                <div style={{padding:"var(--s4)",fontSize:".875rem",color:"var(--text-4)"}}>
                  Hanya <strong style={{color:"var(--text)"}}>hanifsatrio82@gmail.com</strong> yang dapat mengelola akun.
                </div>
              </div>
            );
          }
          return (
          <div style={{display:"flex",flexDirection:"column",gap:"var(--s5)",maxWidth:700}}>
          <div className="card">
            <div className="card-head" style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span className="card-title">Akun Saya</span>
              <span style={{background:"var(--green-bg)",color:"var(--green)",border:"1px solid var(--green-border)",fontSize:".7rem",padding:"3px 8px",borderRadius:99}}>Login saat ini</span>
            </div>
            {akunSaya ? (
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:44,height:44,borderRadius:"50%",background:"var(--blue-bg)",color:"var(--blue)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight: 700,fontSize:"1.1rem"}}>{(akunSaya.user?.email?.[0] || "?").toUpperCase()}</div>
                  <div><div style={{fontWeight:700}}>{akunSaya.profile?.display_name || akunSaya.user?.email?.split("@")[0]}</div><div style={{fontSize:".85rem",color:"var(--text-4)"}}>{akunSaya.user?.email}</div></div>
                  <span style={{marginLeft:"auto",background:"var(--slate-bg)",border:"1px solid var(--slate-border)",padding:"3px 8px",borderRadius:99,textTransform:"capitalize",fontSize:".75rem"}}>{akunSaya.profile?.role || "staff"}</span>
                </div>
              </div>
            ) : <div style={{color:"var(--text-4)",fontSize:".9rem"}}>Tidak ada sesi.</div>}
          </div>

          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"var(--s3)"}}>
            <div className="card" style={{padding:"var(--s4)",textAlign:"center"}}><div style={{fontSize:"1.6rem",fontWeight: 700}}>{akunLoading ? "…" : totalAkun}</div><div style={{fontSize:".75rem",color:"var(--text-4)"}}>Total Akun</div></div>
            <div className="card" style={{padding:"var(--s4)",textAlign:"center"}}><div style={{fontSize:"1.6rem",fontWeight: 700,color:"var(--green)"}}>{akunLoading ? "…" : aktifAkun}</div><div style={{fontSize:".75rem",color:"var(--text-4)"}}>Aktif</div></div>
            <div className="card" style={{padding:"var(--s4)",textAlign:"center"}}><div style={{fontSize:"1.6rem",fontWeight: 700,color:"var(--rose)"}}>{akunLoading ? "…" : totalAkun - aktifAkun}</div><div style={{fontSize:".75rem",color:"var(--text-4)"}}>Nonaktif</div></div>
          </div>

          <div className="card">
            <div className="card-head" style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span className="card-title">Daftar Akun ({totalAkun})</span>
              <button className="btn btn-ghost" style={{fontSize:".8rem",height:32}} onClick={loadAkun}>↻ Muat ulang</button>
            </div>
            {akunLoading ? <div className="loading"><div className="spin"/></div> : daftarAkun.length === 0 ? <div style={{padding:"var(--s4)",color:"var(--text-4)",fontSize:".9rem"}}>Belum ada akun.</div> : (
              <div style={{overflow:"auto"}}>
                <table style={{width:"100%",fontSize:".875rem",borderCollapse:"collapse"}}>
                  <thead><tr style={{textAlign:"left",color:"var(--text-4)",borderBottom:"1px solid var(--border)"}}><th style={{padding:8}}>Email</th><th style={{padding:8}}>Nama</th><th style={{padding:8}}>Role</th><th style={{padding:8}}>Status</th><th style={{padding:8}}></th></tr></thead>
                  <tbody>
                    {daftarAkun.map((a: any) => (
                      <tr key={a.id} style={{borderBottom:"1px solid var(--border)"}}>
                        <td style={{padding:"10px 8px",fontWeight: 400}}>{a.email}</td>
                        <td style={{padding:8}}>{a.display_name || "-"}</td>
                        <td style={{padding:8}}>
                          <select value={a.role} onChange={(e) => handleRoleChange(a.id, e.target.value)} style={{fontSize:".8rem",padding:"4px 6px",borderRadius:6,border:"1px solid var(--border)"}}>
                            <option value="god">god</option><option value="owner">owner</option><option value="admin">admin</option><option value="dokter">dokter</option><option value="staff">staff</option><option value="kasir">kasir</option><option value="farmasi">farmasi</option>
                          </select>
                        </td>
                        <td style={{padding:8}}>
                          <span style={{fontSize:".7rem",padding:"3px 8px",borderRadius:99,...(a.is_active ? {background:"var(--green-bg)",color:"var(--green)",border:"1px solid var(--green-border)"} : {background:"var(--rose-bg)",color:"var(--rose)",border:"1px solid var(--rose-border)"})}}>
                            {a.is_active ? "Aktif" : "Nonaktif"}
                          </span>
                        </td>
                        <td style={{padding:8}}>
                          <div style={{display:"flex",gap:6,alignItems:"center",justifyContent:"flex-end"}}>
                            <button className="btn btn-ghost" style={{fontSize:".75rem",height:30,whiteSpace:"nowrap"}} onClick={() => handleToggleAktif(a.id, a.is_active)} disabled={akunSaya?.user?.id === a.id}>{akunSaya?.user?.id === a.id ? "Akun saya" : a.is_active ? "Nonaktifkan" : "Aktifkan"}</button>
                            <button className={`btn ${confirmHapusId === a.id ? "btn-primary" : "btn-ghost"}`} style={{fontSize:".75rem",height:30,whiteSpace:"nowrap",...(confirmHapusId === a.id ? {background:"var(--rose)",borderColor:"var(--rose)",color:"#fff"} : {color:"var(--rose)"})}} onClick={() => handleHapus(a.id, a.email)} disabled={akunSaya?.user?.id === a.id}>{confirmHapusId === a.id ? "Konfirmasi?" : "Hapus"}</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-head"><span className="card-title">Tambah Akun Baru</span><span style={{fontSize:".75rem",color:"var(--text-4)"}}>Buat akun yang bisa login</span></div>
            <div className="form-stack">
              <div className="grid-2">
                <div className="field"><label className="label">Email</label><input className="input" type="email" placeholder="perawat@klinik.id" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} /></div>
                <div className="field"><label className="label">Password</label><input className="input" type="password" placeholder="min 6 karakter" value={invitePass} onChange={(e) => setInvitePass(e.target.value)} /></div>
              </div>
              <div className="grid-2">
                <div className="field"><label className="label">Nama Tampilan</label><input className="input" type="text" placeholder="Suster Ani" value={inviteNama} onChange={(e) => setInviteNama(e.target.value)} /></div>
                <div className="field"><label className="label">Role</label><select className="input" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}><option value="god">god</option><option value="owner">owner</option><option value="admin">admin</option><option value="dokter">dokter</option><option value="staff">staff</option><option value="kasir">kasir</option><option value="farmasi">farmasi</option></select></div>
              </div>
              <button className="btn btn-primary" style={{height:44}} onClick={handleInvite} disabled={inviting}>{inviting ? "Membuat…" : "Buat Akun →"}</button>
            </div>
          </div>
          </div>)
        })()
      )}
    </div>
  );
}
