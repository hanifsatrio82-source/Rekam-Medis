import { component$, useSignal, useVisibleTask$, $ } from "@builder.io/qwik";
import { DocumentHead } from "@builder.io/qwik-city";
import { getPengaturan, simpanPengaturan, getAkunSaya, getDaftarAkun, undangAkun, setAkunAktif, updateAkunRole, hapusAkun } from "~/lib/api";

export const head: DocumentHead = { title: "Pengaturan — RME Praktik" };

export default component$(() => {
  const loading       = useSignal(true);
  const saving        = useSignal(false);
  const toast         = useSignal("");
  const toastOk       = useSignal(true);
  const activeTab     = useSignal<"umum" | "akun">("umum");

  const namaPraktik   = useSignal("");
  const alamat        = useSignal("");
  const noHp          = useSignal("");
  const namaDokter    = useSignal("");
  const strNo         = useSignal("");
  const sipNo         = useSignal("");
  const jamBuka       = useSignal("08:00");
  const jamTutup      = useSignal("17:00");
  const pesanKwitansi = useSignal("");

  // akun
  const akunSaya      = useSignal<any>(null);
  const daftarAkun    = useSignal<any[]>([]);
  const akunLoading   = useSignal(true);
  const inviteEmail   = useSignal("");
  const invitePass    = useSignal("");
  const inviteNama    = useSignal("");
  const inviteRole    = useSignal("staff");
  const inviting      = useSignal(false);

  const loadPengaturan = $(async () => {
    const s = await getPengaturan();
    namaPraktik.value   = s.nama_praktik   || "";
    alamat.value        = s.alamat         || "";
    noHp.value          = s.no_hp          || "";
    namaDokter.value    = s.nama_dokter    || "";
    strNo.value         = s.str_no         || "";
    sipNo.value         = s.sip_no         || "";
    jamBuka.value       = s.jam_buka       || "08:00";
    jamTutup.value      = s.jam_tutup      || "17:00";
    pesanKwitansi.value = s.pesan_kwitansi || "";
  });

  const loadAkun = $(async () => {
    akunLoading.value = true;
    try {
      const [me, list] = await Promise.all([getAkunSaya(), getDaftarAkun()]);
      akunSaya.value = me;
      daftarAkun.value = list as any[];
    } catch (e: any) {
      // diamkan, tampilkan akun saya saja
    } finally { akunLoading.value = false; }
  });

  useVisibleTask$(async () => {
    loading.value = true;
    try { await loadPengaturan(); await loadAkun(); } finally { loading.value = false; }
  });

  const handleSave = $(async () => {
    saving.value = true;
    try {
      await simpanPengaturan({
        nama_praktik: namaPraktik.value, alamat: alamat.value, no_hp: noHp.value,
        nama_dokter: namaDokter.value, str_no: strNo.value, sip_no: sipNo.value,
        jam_buka: jamBuka.value, jam_tutup: jamTutup.value,
        pesan_kwitansi: pesanKwitansi.value,
      });
      toast.value = "Pengaturan berhasil disimpan.";
      toastOk.value = true;
      setTimeout(() => toast.value = "", 3000);
    } catch (e: any) {
      toast.value = "Gagal: " + e.message;
      toastOk.value = false;
    } finally { saving.value = false; }
  });

  const handleInvite = $(async () => {
    if (!inviteEmail.value || !invitePass.value) { toast.value="Email & password wajib."; toastOk.value=false; return; }
    inviting.value = true;
    try {
      await undangAkun(inviteEmail.value.trim(), invitePass.value, inviteNama.value.trim() || undefined, inviteRole.value);
      toast.value = "Akun berhasil dibuat."; toastOk.value = true;
      inviteEmail.value=""; invitePass.value=""; inviteNama.value="";
      await loadAkun();
      setTimeout(()=> toast.value="",3000);
    } catch(e:any){ toast.value="Gagal buat akun: "+e.message; toastOk.value=false; } finally{ inviting.value=false; }
  });

  const handleToggleAktif = $(async (id:string, cur:boolean) => {
    try { await setAkunAktif(id, !cur); await loadAkun(); toast.value = !cur ? "Akun diaktifkan." : "Akun dinonaktifkan."; toastOk.value=true; setTimeout(()=>toast.value="",2000); } catch(e:any){ toast.value=e.message; toastOk.value=false; }
  });

  const handleRoleChange = $(async (id:string, newRole:string) => {
    try { await updateAkunRole(id, newRole); await loadAkun(); toast.value="Role diperbarui."; toastOk.value=true; setTimeout(()=>toast.value="",2000); } catch(e:any){ toast.value=e.message; toastOk.value=false; }
  });

  const confirmHapusId = useSignal<string | null>(null);
  const handleHapus = $(async (id:string, email:string) => {
    if (confirmHapusId.value !== id) { confirmHapusId.value = id; setTimeout(()=> confirmHapusId.value=null, 3000); return; }
    try { await hapusAkun(id); confirmHapusId.value=null; await loadAkun(); toast.value=`Akun ${email} dihapus.`; toastOk.value=true; setTimeout(()=>toast.value="",3000); } catch(e:any){ toast.value=e.message; toastOk.value=false; }
  });

  if (loading.value) {
    return <div class="page"><div class="loading"><div class="spin" /></div></div>;
  }

  const totalAkun = daftarAkun.value.length;
  const aktifAkun = daftarAkun.value.filter(a=>a.is_active).length;

  return (
    <div class="page">

      {toast.value && (
        <div class="toast-tray">
          <div class={`toast ${toastOk.value ? "toast-ok" : "toast-err"}`}>{toast.value}</div>
        </div>
      )}

      <div class="page-header">
        <h1 class="page-title">Pengaturan</h1>
        <p class="page-sub">Konfigurasi praktik & manajemen akun</p>
      </div>

      {/* Tabs */}
      <div style="display:flex;gap:8px;margin-bottom:var(--s5);">
        <button class={`btn ${activeTab.value==="umum" ? "btn-primary" : "btn-ghost"}`} style="flex:1;height:40px;font-weight:700" onClick$={() => activeTab.value="umum"}>Umum</button>
        <button class={`btn ${activeTab.value==="akun" ? "btn-primary" : "btn-ghost"}`} style="flex:1;height:40px;font-weight:700" onClick$={() => { activeTab.value="akun"; if(daftarAkun.value.length===0) loadAkun(); }}>
          Akun <span style="margin-left:6px;background:rgba(255,255,255,.25);padding:2px 7px;border-radius:99px;font-size:.7rem;">{totalAkun || "·"}</span>
        </button>
      </div>

      {activeTab.value === "umum" && (
      <div style="display:flex;flex-direction:column;gap:var(--s5);max-width:600px">
        <div class="card">
          <div class="card-head"><span class="card-title">Informasi Praktik</span></div>
          <div class="form-stack">
            <div class="field">
              <label class="label" for="pg-nama">Nama Praktik</label>
              <input id="pg-nama" class="input" type="text" placeholder="Klinik Sehat Bersama" value={namaPraktik.value} onInput$={(e) => namaPraktik.value = (e.target as HTMLInputElement).value} />
            </div>
            <div class="field">
              <label class="label" for="pg-alamat">Alamat</label>
              <textarea id="pg-alamat" class="input" rows={3} placeholder="Jl. Kesehatan No. 1…" value={alamat.value} onInput$={(e) => alamat.value = (e.target as HTMLTextAreaElement).value} />
            </div>
            <div class="field">
              <label class="label" for="pg-hp">No. HP / WhatsApp</label>
              <input id="pg-hp" class="input" type="tel" placeholder="08xxxxxxxxxx" value={noHp.value} onInput$={(e) => noHp.value = (e.target as HTMLInputElement).value} />
            </div>
            <div class="grid-2">
              <div class="field"><label class="label" for="pg-buka">Jam Buka</label><input id="pg-buka" class="input" type="time" value={jamBuka.value} onInput$={(e) => jamBuka.value = (e.target as HTMLInputElement).value} /></div>
              <div class="field"><label class="label" for="pg-tutup">Jam Tutup</label><input id="pg-tutup" class="input" type="time" value={jamTutup.value} onInput$={(e) => jamTutup.value = (e.target as HTMLInputElement).value} /></div>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-head"><span class="card-title">Data Dokter</span></div>
          <div class="form-stack">
            <div class="field"><label class="label" for="pg-dokter">Nama Dokter</label><input id="pg-dokter" class="input" type="text" placeholder="dr. Ahmad Fauzi" value={namaDokter.value} onInput$={(e) => namaDokter.value = (e.target as HTMLInputElement).value} /></div>
            <div class="grid-2">
              <div class="field"><label class="label" for="pg-str">No. STR</label><input id="pg-str" class="input" type="text" placeholder="123/STR/…" value={strNo.value} onInput$={(e) => strNo.value = (e.target as HTMLInputElement).value} /></div>
              <div class="field"><label class="label" for="pg-sip">No. SIP</label><input id="pg-sip" class="input" type="text" placeholder="123/SIP/…" value={sipNo.value} onInput$={(e) => sipNo.value = (e.target as HTMLInputElement).value} /></div>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-head"><span class="card-title">Kwitansi</span></div>
          <div class="field"><label class="label" for="pg-pesan">Pesan / Footer</label><textarea id="pg-pesan" class="input" rows={3} placeholder="Terima kasih telah mempercayakan kesehatan Anda…" value={pesanKwitansi.value} onInput$={(e) => pesanKwitansi.value = (e.target as HTMLTextAreaElement).value} /></div>
        </div>
        <button class="btn btn-primary btn-full" style="height:52px;font-size:1rem" onClick$={handleSave} disabled={saving.value}>{saving.value ? "Menyimpan…" : "Simpan Pengaturan"}</button>
      </div>
      )}

      {activeTab.value === "akun" && (
      <div style="display:flex;flex-direction:column;gap:var(--s5);max-width:700px">
        {/* Akun Saya */}
        <div class="card">
          <div class="card-head" style="display:flex;justify-content:space-between;align-items:center">
            <span class="card-title">Akun Saya</span>
            <span class="badge" style="background:var(--green-bg);color:var(--green);border:1px solid var(--green-border);font-size:.7rem;">Login saat ini</span>
          </div>
          {akunSaya.value ? (
            <div style="display:flex;flex-direction:column;gap:10px">
              <div style="display:flex;align-items:center;gap:12px">
                <div style="width:44px;height:44px;border-radius:50%;background:var(--blue-bg);color:var(--blue);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.1rem">
                  {(akunSaya.value.user?.email?.[0] || "?").toUpperCase()}
                </div>
                <div>
                  <div style="font-weight:700">{akunSaya.value.profile?.display_name || akunSaya.value.user?.email?.split("@")[0]}</div>
                  <div style="font-size:.85rem;color:var(--text-4)">{akunSaya.value.user?.email}</div>
                </div>
                <span class="badge" style="margin-left:auto;background:var(--slate-bg);border:1px solid var(--slate-border);text-transform:capitalize">{akunSaya.value.profile?.role || "staff"}</span>
              </div>
              <div style="display:flex;gap:12px;font-size:.8rem;color:var(--text-4);flex-wrap:wrap">
                <span>ID: <code style="font-size:.75rem">{akunSaya.value.user?.id?.slice(0,8)}…</code></span>
                <span>· Terakhir login: {akunSaya.value.user?.last_sign_in_at ? new Date(akunSaya.value.user.last_sign_in_at).toLocaleString("id-ID") : "-"}</span>
              </div>
            </div>
          ) : <div style="color:var(--text-4);font-size:.9rem">Tidak ada sesi.</div>}
        </div>

        {/* Statistik */}
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--s3)">
          <div class="card" style="padding:var(--s4);text-align:center"><div style="font-size:1.6rem;font-weight:800">{akunLoading.value ? "…" : totalAkun}</div><div style="font-size:.75rem;color:var(--text-4)">Total Akun</div></div>
          <div class="card" style="padding:var(--s4);text-align:center"><div style="font-size:1.6rem;font-weight:800;color:var(--green)">{akunLoading.value ? "…" : aktifAkun}</div><div style="font-size:.75rem;color:var(--text-4)">Aktif</div></div>
          <div class="card" style="padding:var(--s4);text-align:center"><div style="font-size:1.6rem;font-weight:800;color:var(--rose)">{akunLoading.value ? "…" : totalAkun-aktifAkun}</div><div style="font-size:.75rem;color:var(--text-4)">Nonaktif</div></div>
        </div>

        {/* Daftar Akun */}
        <div class="card">
          <div class="card-head" style="display:flex;justify-content:space-between;align-items:center">
            <span class="card-title">Daftar Akun — bisa login ({totalAkun})</span>
            <button class="btn btn-ghost" style="font-size:.8rem;height:32px" onClick$={loadAkun}>↻ Muat ulang</button>
          </div>
          {akunLoading.value ? <div class="loading"><div class="spin"/></div> : daftarAkun.value.length===0 ? <div style="padding:var(--s4);color:var(--text-4);font-size:.9rem">Belum ada akun. Buat via form di bawah.</div> : (
            <div style="overflow:auto">
              <table style="width:100%;font-size:.875rem;border-collapse:collapse">
                <thead><tr style="text-align:left;color:var(--text-4);border-bottom:1px solid var(--border)"><th style="padding:8px">Email</th><th style="padding:8px">Nama</th><th style="padding:8px">Role</th><th style="padding:8px">Status</th><th style="padding:8px">Dibuat</th><th style="padding:8px"></th></tr></thead>
                <tbody>
                  {daftarAkun.value.map((a:any)=>(
                    <tr key={a.id} style="border-bottom:1px solid var(--border-light)">
                      <td style="padding:10px 8px;font-weight:600">{a.email}</td>
                      <td style="padding:8px">{a.display_name || "-"}</td>
                      <td style="padding:8px">
                        <select value={a.role} onChange$={(e)=> handleRoleChange(a.id, (e.target as HTMLSelectElement).value)} style="font-size:.8rem;padding:4px 6px;border-radius:6px;border:1px solid var(--border)">
                          <option value="owner">owner</option><option value="admin">admin</option><option value="dokter">dokter</option><option value="staff">staff</option><option value="kasir">kasir</option><option value="farmasi">farmasi</option>
                        </select>
                      </td>
                      <td style="padding:8px"><span class="badge" style={`font-size:.7rem;padding:3px 8px;border-radius:99px;${a.is_active ? "background:var(--green-bg);color:var(--green);border:1px solid var(--green-border)" : "background:var(--rose-bg);color:var(--rose);border:1px solid var(--rose-border)"}`}>{a.is_active ? "Aktif" : "Nonaktif"}</span></td>
                      <td style="padding:8px;color:var(--text-4);font-size:.8rem">{new Date(a.created_at).toLocaleDateString("id-ID")}</td>
                      <td style="padding:8px">
                        <div style="display:flex;gap:6px;align-items:center;justify-content:flex-end">
                          <button class="btn btn-ghost" style="font-size:.75rem;height:30px;white-space:nowrap" onClick$={()=> handleToggleAktif(a.id, a.is_active)} disabled={akunSaya.value?.user?.id===a.id}>{akunSaya.value?.user?.id===a.id ? "Akun saya" : a.is_active ? "Nonaktifkan" : "Aktifkan"}</button>
                          <button class={`btn ${confirmHapusId.value===a.id ? "btn-primary" : "btn-ghost"}`} style={`font-size:.75rem;height:30px;white-space:nowrap;${confirmHapusId.value===a.id ? "background:var(--rose);border-color:var(--rose);color:#fff" : "color:var(--rose)"}`} onClick$={()=> handleHapus(a.id, a.email)} disabled={akunSaya.value?.user?.id===a.id} title={akunSaya.value?.user?.id===a.id ? "Tidak bisa hapus akun sendiri" : "Hapus akun"}>{confirmHapusId.value===a.id ? "Konfirmasi?" : "Hapus"}</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div style="margin-top:var(--s3);font-size:.78rem;color:var(--text-4);background:var(--slate-bg);padding:var(--s3);border-radius:8px;border:1px solid var(--slate-border)">ℹ️ Daftar ini dari tabel <code>profiles</code> (mirror <code>auth.users</code>). Untuk melihat semua user, jalankan migrasi <code>007_profiles_akun.sql</code> di Supabase SQL Editor.</div>
        </div>

        {/* Undang / Buat akun */}
        <div class="card">
          <div class="card-head"><span class="card-title">Tambah Akun Baru</span><span style="font-size:.75rem;color:var(--text-4)">Buat akun yang bisa login</span></div>
          <div class="form-stack">
            <div class="grid-2">
              <div class="field"><label class="label">Email</label><input class="input" type="email" placeholder="perawat@klinik.id" value={inviteEmail.value} onInput$={(e)=> inviteEmail.value=(e.target as HTMLInputElement).value} /></div>
              <div class="field"><label class="label">Password</label><input class="input" type="password" placeholder="min 6 karakter" value={invitePass.value} onInput$={(e)=> invitePass.value=(e.target as HTMLInputElement).value} /></div>
            </div>
            <div class="grid-2">
              <div class="field"><label class="label">Nama Tampilan</label><input class="input" type="text" placeholder="Suster Ani" value={inviteNama.value} onInput$={(e)=> inviteNama.value=(e.target as HTMLInputElement).value} /></div>
              <div class="field"><label class="label">Role</label><select class="input" value={inviteRole.value} onChange$={(e)=> inviteRole.value=(e.target as HTMLSelectElement).value}><option value="staff">staff</option><option value="dokter">dokter</option><option value="admin">admin</option><option value="owner">owner</option><option value="kasir">kasir</option><option value="farmasi">farmasi</option></select></div>
            </div>
            <button class="btn btn-primary" style="height:44px" onClick$={handleInvite} disabled={inviting.value}>{inviting.value ? "Membuat…" : "Buat Akun →"}</button>
            <div style="font-size:.78rem;color:var(--text-4)">Akun dibuat via <code>supabase.auth.signUp</code>. Jika Supabase mengharuskan konfirmasi email, matikan di Dashboard → Authentication → Email → Confirm email = OFF untuk klinik internal.</div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
});
