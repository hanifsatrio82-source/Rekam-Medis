"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  cariPasien, daftarBaru, daftarLama,
  simpanSkrining, serahkanObat,
  bayar, getFeesForVisit,
  updateVisitStatus,
} from "~/lib/api";
import { formatWaktu, formatStatusLabel, hitungUsia, formatRupiah, numericProps, decimalProps } from "~/lib/utils";
import { IcoClose, IcoSearch, IcoPlus, IcoClipboard, IcoUser, IcoPill, IcoCard, IcoBan, IcoFolder, badgeClass } from "./icons";

// Title Case: huruf besar awal tiap kata (setelah spasi juga besar).
function titleCase(s: string): string {
  return s.toLowerCase().replace(/(^|\s)\S/g, (m) => m.toUpperCase());
}

// ═══════════════════════════════════════════════════════════════════════
// ACTION MENU
// ═══════════════════════════════════════════════════════════════════════

export function ActionMenuDrawer({ v, onClose, onOpenSkrining, onOpenFarmasi, onOpenPembayaran }: { v: any; onClose: () => void; onOpenSkrining: (v: any) => void; onOpenFarmasi?: (v: any) => void; onOpenPembayaran?: (v: any) => void }) {
  const nav = useRouter();
  const p = v.patients;
  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <div className="modal" role="dialog" aria-modal="true" aria-label="Aksi pasien">
        <div className="modal-head">
          <div>
            <div className="modal-title">{p?.nama}</div>
            <div style={{ fontSize: ".75rem", color: "var(--text-4)", marginTop: 2 }}>{p?.no_rm} · No. {v.no_antrean}</div>
          </div>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose} aria-label="Tutup"><IcoClose /></button>
        </div>
        <div className="modal-body">
          <div className="pt-banner" style={{ marginBottom: "var(--s4)" }}>
            <div className="pt-meta">
              <span className={badgeClass(v.status)}>{formatStatusLabel(v.status)}</span>
              {p?.tanggal_lahir && <span>{hitungUsia(p.tanggal_lahir)}</span>}
              {p?.jenis_kelamin && <span>{p.jenis_kelamin === "LAKI_LAKI" ? "Laki-laki" : "Perempuan"}</span>}
            </div>
          </div>
          <div className="am-list">
            {v.status === "MENUNGGU_SKRINING" && (
              <button className="am-item am-primary" onClick={() => { onClose(); onOpenSkrining(v); }}>
                <span className="am-icon"><IcoClipboard /></span><span>Mulai Skrining</span>
              </button>
            )}
            {(v.status === "MENUNGGU_DOKTER" || v.status === "SEDANG_DIPERIKSA") && (
              <button className="am-item am-primary" onClick={() => { onClose(); nav.push(`/dokter?visit=${v.id}`); }}>
                <span className="am-icon"><IcoUser /></span><span>Buka SOAP / Pemeriksaan</span>
              </button>
            )}
            {v.status === "MENUNGGU_OBAT" && (
              <button className="am-item am-primary" onClick={() => { onClose(); onOpenFarmasi?.(v); }}>
                <span className="am-icon"><IcoPill /></span><span>Proses Farmasi / Obat</span>
              </button>
            )}
            {v.status === "MENUNGGU_PEMBAYARAN" && (
              <button className="am-item am-primary" onClick={() => { onClose(); onOpenPembayaran?.(v); }}>
                <span className="am-icon"><IcoCard /></span><span>Proses Pembayaran</span>
              </button>
            )}
            <div className="am-divider" />
            <button className="am-item" onClick={() => { onClose(); nav.push(`/rekam-medis?patient=${p?.id}`); }}>
              <span className="am-icon"><IcoFolder /></span><span>Lihat Rekam Medis</span>
            </button>
            {!["SELESAI", "BATAL"].includes(v.status) && (
              <>
                <div className="am-divider" />
                <button className="am-item am-danger" onClick={async () => { onClose(); await updateVisitStatus(v.id, "BATAL"); }}>
                  <span className="am-icon"><IcoBan /></span><span>Batalkan Kunjungan</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// PENDAFTARAN
// ═══════════════════════════════════════════════════════════════════════

export function PendaftaranDrawer({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [mode, setMode] = useState<"search" | "new" | "confirm">("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [nama, setNama] = useState("");
  const [jk, setJk] = useState("LAKI_LAKI");
  const [tglLahir, setTglLahir] = useState("");
  const [pj, setPj] = useState("");
  const [pjName, setPjName] = useState("");
  const [nik, setNik] = useState("");
  const [tanpaKtp, setTanpaKtp] = useState(false);
  const [noHp, setNoHp] = useState("");
  const [alamat, setAlamat] = useState("");
  const [alergi, setAlergi] = useState("");

  const doSearch = useCallback(async () => {
    if (query.length < 2) { setResults([]); return; }
    setSearching(true);
    try { setResults(await cariPasien(query)); }
    finally { setSearching(false); }
  }, [query]);

  const doRegLama = useCallback(async () => {
    if (!selected) return;
    setSaving(true);
    try { await daftarLama(selected.id); onClose(); onDone(); }
    catch (e: any) { alert("Gagal: " + e.message); }
    finally { setSaving(false); }
  }, [selected, onClose, onDone]);

  const doRegBaru = useCallback(async () => {
    if (!nama || !tglLahir) { alert("Nama dan tanggal lahir wajib diisi."); return; }
    setSaving(true);
    try {
      await daftarBaru({ nama: titleCase(nama), jenis_kelamin: jk, tanggal_lahir: tglLahir, penanggung_jawab: pj === "Pasien Sendiri" ? "Pasien Sendiri" : pjName || null, nik: tanpaKtp ? null : (nik || null), no_hp: noHp || null, alamat: alamat ? titleCase(alamat) : null, gol_darah: null, alergi: alergi || null });
      onClose(); onDone();
    } catch (e: any) { alert("Gagal: " + e.message); }
    finally { setSaving(false); }
  }, [nama, jk, tglLahir, pj, pjName, tanpaKtp, nik, noHp, alamat, alergi, onClose, onDone]);

  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <div className="modal" role="dialog" aria-modal="true" aria-label="Pendaftaran pasien">
        <div className="modal-head">
          <span className="modal-title">{mode === "new" ? "Pasien Baru" : mode === "confirm" ? "Konfirmasi Pendaftaran" : "Daftarkan Pasien"}</span>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Tutup"><IcoClose /></button>
        </div>

        {mode === "search" && (
          <>
            <div className="modal-body">
              <div className="search-wrap" style={{ marginBottom: "var(--s3)" }}>
                <span className="search-icon"><IcoSearch /></span>
                <input className="search-input" type="search" placeholder="Cari nama, No. RM, atau no. HP…" value={query} onChange={(e) => { setQuery(e.target.value); if (e.target.value.length >= 2) doSearch(); }} aria-label="Cari pasien" />
              </div>
              {searching && <div className="loading" style={{ padding: "var(--s4)" }}><div className="spin" /></div>}
              {results.length > 0 && (
                <div className="queue">
                  {results.map(p => (
                    <button key={p.id} className="qcard" onClick={() => { setSelected(p); setMode("confirm"); }}>
                      <div className="qcard-body">
                        <div className="qcard-name">{p.nama}</div>
                        <div className="qcard-meta"><span>{p.no_rm}</span>{p.tanggal_lahir && (<><span className="qcard-meta-dot" /><span>{hitungUsia(p.tanggal_lahir)}</span></>)}{p.no_hp && (<><span className="qcard-meta-dot" /><span>{p.no_hp}</span></>)}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {results.length === 0 && query.length >= 2 && !searching && (
                <div className="empty" style={{ padding: "var(--s8) 0" }}><div className="empty-title">Pasien tidak ditemukan</div><div className="empty-sub">Daftarkan sebagai pasien baru.</div></div>
              )}
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost btn-full" onClick={onClose}>Batal</button>
              <button className="btn btn-primary btn-full" onClick={() => setMode("new")}><IcoPlus /> Pasien Baru</button>
            </div>
          </>
        )}

        {mode === "confirm" && selected && (
          <>
            <div className="modal-body">
              <div className="pt-banner">
                <div className="pt-name">{selected.nama}</div>
                <div className="pt-meta"><span>{selected.no_rm}</span>{selected.tanggal_lahir && <span>{hitungUsia(selected.tanggal_lahir)}</span>}{selected.jenis_kelamin && <span>{selected.jenis_kelamin === "LAKI_LAKI" ? "Laki-laki" : "Perempuan"}</span>}</div>
              </div>
              <p style={{ fontSize: ".875rem", color: "var(--text-3)", lineHeight: 1.6 }}>Pasien ini akan didaftarkan ke antrian skrining hari ini.</p>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost btn-full" onClick={() => setMode("search")}>Kembali</button>
              <button className="btn btn-primary btn-full" onClick={doRegLama} disabled={saving}>{saving ? "Mendaftarkan…" : "Daftarkan Sekarang"}</button>
            </div>
          </>
        )}

        {mode === "new" && (
          <>
            <div className="modal-body">
              <div className="form-stack">
                <div className="field"><label className="label" htmlFor="rn-nama">Nama Lengkap <span className="req">*</span></label><input id="rn-nama" className="input" type="text" placeholder="Nama pasien" value={nama} onChange={(e) => setNama(e.target.value)} /></div>
                <div className="grid-2">
                  <div className="field"><label className="label" htmlFor="rn-jk">Jenis Kelamin</label><select id="rn-jk" className="input" value={jk} onChange={(e) => setJk(e.target.value)}><option value="LAKI_LAKI">Laki-laki</option><option value="PEREMPUAN">Perempuan</option></select></div>
                  <div className="field"><label className="label" htmlFor="rn-tgl">Tgl. Lahir <span className="req">*</span></label><input id="rn-tgl" className="input" type="date" value={tglLahir} onChange={(e) => setTglLahir(e.target.value)} /></div>
                </div>
                <div className="field"><label className="label" htmlFor="rn-pj">Penanggung Jawab</label><select id="rn-pj" className="input" value={pj} onChange={(e) => { setPj(e.target.value); setPjName(""); }}><option value="">— Pilih —</option><option value="Pasien Sendiri">Pasien Sendiri</option><option value="Ayah">Ayah</option><option value="Ibu">Ibu</option><option value="Anak">Anak</option></select></div>
                {pj && pj !== "Pasien Sendiri" && (
                  <div className="field"><label className="label" htmlFor="rn-pjname">Nama Penanggung Jawab</label><input id="rn-pjname" className="input" placeholder="Nama penanggung jawab" value={pjName} onChange={(e) => setPjName(e.target.value)} /></div>
                )}
                <div className="field">
                  <div className="nik-label-row"><label className="label" htmlFor="rn-nik">NIK</label><label className="nik-skip-check"><input type="checkbox" checked={tanpaKtp} onChange={(e) => { setTanpaKtp(e.target.checked); if (e.target.checked) setNik(""); }} /><span>Tidak bawa / belum punya KTP</span></label></div>
                  <input id="rn-nik" className="input" type="text" placeholder="16 digit NIK" disabled={tanpaKtp} value={nik} onChange={(e) => setNik(e.target.value)} />
                </div>
                <div className="field"><label className="label" htmlFor="rn-hp">No. HP</label><input id="rn-hp" className="input" type="tel" placeholder="08xx…" value={noHp} onChange={(e) => setNoHp(e.target.value)} /></div>
                <div className="field"><label className="label" htmlFor="rn-alamat">Alamat</label><textarea id="rn-alamat" className="input" placeholder="Alamat lengkap" value={alamat} onChange={(e) => setAlamat(e.target.value)} /></div>
                <div className="field"><label className="label" htmlFor="rn-alergi">Alergi</label><input id="rn-alergi" className="input" placeholder="Alergi, bila ada" value={alergi} onChange={(e) => setAlergi(e.target.value)} /></div>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost btn-full" onClick={() => setMode("search")}>Kembali</button>
              <button className="btn btn-primary btn-full" onClick={doRegBaru} disabled={saving || !nama || !tglLahir}>{saving ? "Mendaftarkan…" : "Daftar & Antri Skrining"}</button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SKRINING
// ═══════════════════════════════════════════════════════════════════════

export function SkriningDrawer({ v, onClose, onDone }: { v: any; onClose: () => void; onDone: () => void }) {
  const p = v.patients;
  const cn = v.clinical_notes;
  const [skTd, setSkTd] = useState(cn?.tb || "");
  const [skBb, setSkBb] = useState(cn?.bb || "");
  const [skSuhu, setSkSuhu] = useState(cn?.suhu || "");
  const [skHr, setSkHr] = useState(cn?.hr || "");
  const [skRr, setSkRr] = useState(cn?.rr || "");
  const [skTekananDarah, setSkTekananDarah] = useState(cn?.tekanan_darah || "");
  const [skSpo2, setSkSpo2] = useState(cn?.spo2 || "");
  const [skKeluhan, setSkKeluhan] = useState(cn?.keluhan_utama || "");
  const [skSaving, setSkSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (!skKeluhan) return;
    setSkSaving(true);
    try {
      await simpanSkrining(v.id, { tb: skTd, bb: skBb, suhu: skSuhu, hr: skHr, rr: skRr, tekanan_darah: skTekananDarah, spo2: skSpo2, keluhan_utama: skKeluhan });
      onClose(); onDone();
    } catch (e: any) { alert("Gagal: " + e.message); }
    finally { setSkSaving(false); }
  }, [v.id, skTd, skBb, skSuhu, skHr, skRr, skTekananDarah, skSpo2, skKeluhan, onClose, onDone]);

  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <div className="modal" role="dialog" aria-modal="true" aria-label="Skrining pasien">
        <div className="modal-head">
          <span className="modal-title">Skrining</span>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose} aria-label="Tutup"><IcoClose /></button>
        </div>
        <div className="modal-body">
          <div className="pt-banner">
            <div className="pt-name">{p?.nama}</div>
            <div className="pt-meta"><span>{p?.no_rm}</span>{p?.tanggal_lahir && <span>{hitungUsia(p.tanggal_lahir)}</span>}<span>No. {v.no_antrean}</span></div>
          </div>
          <div className="form-stack">
            <div className="field"><label className="label" htmlFor="sk-keluhan">Keluhan Utama <span className="req">*</span></label><textarea id="sk-keluhan" className="input" placeholder="Keluhan yang disampaikan pasien…" value={skKeluhan} onChange={(e) => setSkKeluhan(e.target.value)} /></div>
            <div className="grid-2">
              <div className="field"><label className="label">Tinggi Badan (cm)</label><input className="input" placeholder="170" {...numericProps(skTd ?? "", setSkTd)} /></div>
              <div className="field"><label className="label">Berat Badan (kg)</label><input className="input" placeholder="60" {...numericProps(skBb ?? "", setSkBb)} /></div>
            </div>
            <div className="grid-2">
              <div className="field"><label className="label">Tekanan Darah (mmHg)</label><input className="input" type="text" placeholder="120/80" value={skTekananDarah} onChange={(e) => setSkTekananDarah(e.target.value)} /></div>
              <div className="field"><label className="label">Nadi/HR (x/mnt)</label><input className="input" placeholder="80" {...numericProps(skHr ?? "", setSkHr)} /></div>
            </div>
            <div className="grid-2">
              <div className="field"><label className="label">Suhu (°C)</label><input className="input" placeholder="36.5" {...decimalProps(skSuhu ?? "", setSkSuhu)} /></div>
              <div className="field"><label className="label">RR (x/mnt)</label><input className="input" placeholder="18" {...numericProps(skRr ?? "", setSkRr)} /></div>
            </div>
            <div className="grid-2">
              <div className="field"><label className="label">SpO₂ (%)</label><input className="input" placeholder="98" {...numericProps(skSpo2 ?? "", setSkSpo2)} /></div>
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost btn-full" onClick={onClose}>Batal</button>
          <button className="btn btn-primary btn-full" onClick={handleSave} disabled={skSaving || !skKeluhan}>{skSaving ? "Menyimpan…" : "Simpan & Kirim ke Dokter →"}</button>
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// FARMASI
// ═══════════════════════════════════════════════════════════════════════

export function FarmasiDrawer({ v, onClose, onDone }: { v: any; onClose: () => void; onDone: () => void }) {
  const p = v.patients;
  const cn = v.clinical_notes;
  const [faSaving, setFaSaving] = useState(false);

  const handleSerahkan = useCallback(async () => {
    setFaSaving(true);
    try { await serahkanObat(v.id); onClose(); onDone(); }
    catch (e: any) { alert("Gagal: " + e.message); }
    finally { setFaSaving(false); }
  }, [v.id, onClose, onDone]);

  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <div className="modal" role="dialog" aria-modal="true" aria-label="Farmasi">
        <div className="modal-head">
          <span className="modal-title">Farmasi / Obat</span>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose} aria-label="Tutup"><IcoClose /></button>
        </div>
        <div className="modal-body">
          <div className="pt-banner">
            <div className="pt-name">{p?.nama}</div>
            <div className="pt-meta"><span>{p?.no_rm}</span>{p?.tanggal_lahir && <span>{hitungUsia(p.tanggal_lahir)}</span>}<span>No. {v.no_antrean}</span></div>
          </div>
          {cn?.keluhan_utama && <div className="alert alert-info" style={{ marginTop: "var(--s2)" }}><strong>Keluhan:</strong> {cn.keluhan_utama}</div>}
          {cn?.catatan_pemeriksaan_fisik && <div className="alert alert-info" style={{ marginTop: "var(--s2)" }}><strong>Pemeriksaan:</strong> {cn.catatan_pemeriksaan_fisik}</div>}

          {(() => {
            const rxList = (v.prescriptions || []).filter((r: any) => r.is_active);
            const pwList = (v.powders || []).filter((pw: any) => pw.is_active);
            const vaList = v.visit_actions || [];
            const hasAny = rxList.length > 0 || pwList.length > 0 || vaList.length > 0;
            if (!hasAny) return <div className="empty" style={{ padding: "var(--s8) 0" }}><div className="empty-icon">💊</div><p className="empty-title">Tidak ada obat/resep</p><p className="empty-sub">Dokter belum meresepkan obat.</p></div>;
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--s4)" }}>
                {rxList.map((rx: any) => {
                  const items = rx.prescription_items || [];
                  if (items.length === 0) return null;
                  return (
                    <div key={rx.id} style={{ background: "var(--surface-2)", borderRadius: "var(--r3)", padding: "var(--s3)", border: "1px solid var(--border)" }}>
                      <div style={{ fontWeight: 400, fontSize: ".875rem", marginBottom: "var(--s2)", color: "var(--blue-dk)" }}>Obat Resep</div>
                      {items.map((it: any, idx: number) => (
                        <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "var(--s1) 0", borderBottom: "1px solid var(--border)", fontSize: ".8125rem" }}>
                          <div><span style={{ fontWeight: 400 }}>{it.medications?.nama || "?"}</span>{it.medications?.kekuatan && <span style={{ color: "var(--text-3)" }}> {it.medications.kekuatan}</span>}<div style={{ color: "var(--text-4)", fontSize: ".75rem" }}>{it.aturan_pakai}</div></div>
                          <div style={{ textAlign: "right" }}><div style={{ fontWeight: 400 }}>{it.jumlah} {it.medications?.satuan || "tablet"}</div></div>
                        </div>
                      ))}
                    </div>
                  );
                })}
                {pwList.map((pw: any) => {
                  const items = pw.powder_items || [];
                  if (items.length === 0) return null;
                  return (
                    <div key={pw.id} style={{ background: "var(--surface-2)", borderRadius: "var(--r3)", padding: "var(--s3)", border: "1px solid var(--border)" }}>
                      <div style={{ fontWeight: 400, fontSize: ".875rem", marginBottom: "var(--s2)", color: "var(--blue-dk)" }}>Puyer ({pw.jumlah_bungkus} bungkus)</div>
                      {items.map((it: any, idx: number) => (
                        <div key={idx} style={{ padding: "var(--s1) 0", borderBottom: "1px solid var(--border)", fontSize: ".8125rem" }}>
                          <span style={{ fontWeight: 400 }}>{it.medications?.nama || "?"}</span>
                          <div style={{ color: "var(--text-4)", fontSize: ".75rem" }}>{it.jumlah_tablet} tablet</div>
                        </div>
                      ))}
                      <div style={{ marginTop: "var(--s2)", paddingTop: "var(--s2)", borderTop: "1px solid var(--border)", fontSize: ".75rem", color: "var(--text-3)" }}><strong>Aturan:</strong> {pw.aturan_pakai}</div>
                    </div>
                  );
                })}
                {vaList.length > 0 && (
                  <div style={{ background: "var(--surface-2)", borderRadius: "var(--r3)", padding: "var(--s3)", border: "1px solid var(--border)" }}>
                    <div style={{ fontWeight: 400, fontSize: ".875rem", marginBottom: "var(--s2)", color: "var(--blue-dk)" }}>Tindakan</div>
                    {vaList.map((va: any, idx: number) => (
                      <div key={idx} style={{ padding: "var(--s1) 0", borderBottom: "1px solid var(--border)", fontSize: ".8125rem", display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontWeight: 400 }}>{va.actions?.nama || va.fee_snapshot_nama}</span>
                        <span style={{ fontWeight: 400, color: "var(--blue)" }}>{formatRupiah(va.fee_snapshot_tarif)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost btn-full" onClick={onClose}>Batal</button>
          <button className="btn btn-primary btn-full" onClick={handleSerahkan} disabled={faSaving}>{faSaving ? "Memproses…" : "Obat Diserahkan →"}</button>
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// PEMBAYARAN
// ═══════════════════════════════════════════════════════════════════════

const METHODS = ["TUNAI", "QRIS", "TRANSFER", "BPJS", "ASURANSI"];

export function PembayaranDrawer({ v, onClose, onDone }: { v: any; onClose: () => void; onDone: () => void }) {
  const p = v.patients;
  const [saving, setSaving] = useState(false);
  const [metode, setMetode] = useState("TUNAI");
  const [diskonType, setDiskonType] = useState("NOMINAL");
  const [diskon, setDiskon] = useState(0);

  // Calculate from visit data
  const cn = v.clinical_notes;
  const snapshotFee = cn?.fee_snapshot_tarif || 0;
  const rxList = (v.prescriptions || []).filter((r: any) => r.is_active);
  const rxItems = rxList.flatMap((r: any) => r.prescription_items || []);
  const tarifObat = rxItems.reduce((sum: number, it: any) => sum + ((it.medications?.harga_jual || 0) * it.jumlah), 0);
  const vaList = v.visit_actions || [];
  const tarifTindakan = vaList.reduce((sum: number, va: any) => sum + (va.fee_snapshot_tarif || 0), 0);

  const sub = snapshotFee + tarifObat + tarifTindakan;
  const dis = diskonType === "PERSENTASE" ? Math.round(sub * diskon / 100) : diskon;
  const total = Math.max(0, sub - dis);

  const handleBayar = useCallback(async () => {
    setSaving(true);
    try {
      await bayar(v.id, { total, diskon_type: diskonType, diskon_nilai: diskon, tarif_periksa: snapshotFee, tarif_obat: tarifObat, tarif_tindakan: tarifTindakan, metode_pembayaran: metode });
      onClose(); onDone();
    } catch (e: any) { alert("Gagal: " + e.message); }
    finally { setSaving(false); }
  }, [v.id, total, diskonType, diskon, snapshotFee, tarifObat, tarifTindakan, metode, onClose, onDone]);

  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <div className="modal" role="dialog" aria-modal="true" aria-label="Proses pembayaran">
        <div className="modal-head">
          <span className="modal-title">Proses Pembayaran</span>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose} aria-label="Tutup"><IcoClose /></button>
        </div>
        <div className="modal-body">
          <div className="pt-banner">
            <div className="pt-name">{p?.nama}</div>
            <div className="pt-meta"><span>{p?.no_rm}</span><span>#{v.no_antrean} · {v.no_kunjungan}</span></div>
          </div>
          <div className="form-stack" style={{ marginTop: "var(--s4)" }}>
            <div>
              <p className="label" style={{ marginBottom: "var(--s2)" }}>Rincian Tarif</p>
              <div className="grid-2">
                <div className="field"><label className="label">Periksa (Rp)</label><input className="input" type="text" disabled value={formatRupiah(snapshotFee)} /></div>
                <div className="field"><label className="label">Obat (Rp)</label><input className="input" type="text" disabled value={formatRupiah(tarifObat)} /></div>
                <div className="field"><label className="label">Tindakan (Rp)</label><input className="input" type="text" disabled value={formatRupiah(tarifTindakan)} /></div>
                <div className="field"><label className="label">Subtotal</label><input className="input" type="text" disabled value={formatRupiah(sub)} /></div>
              </div>
            </div>
            <div>
              <p className="label" style={{ marginBottom: "var(--s2)" }}>Diskon</p>
              <div className="grid-2">
                <div className="field"><label className="label">Jenis</label><select className="input" value={diskonType} onChange={(e) => setDiskonType(e.target.value)}><option value="NOMINAL">Nominal (Rp)</option><option value="PERSENTASE">Persentase (%)</option></select></div>
                <div className="field"><label className="label">Nilai</label><input className="input" {...numericProps(diskon, setDiskon)} /></div>
              </div>
            </div>
            <div className="field">
              <label className="label">Metode Pembayaran</label>
              <div className="method-grid" style={{ marginTop: "var(--s1)" }}>
                {METHODS.map(m => <button key={m} className={"method-btn" + (metode === m ? " on" : "")} onClick={() => setMetode(m)}>{m}</button>)}
              </div>
            </div>
            <div className="pay-summary">
              <div className="pay-row"><span>Subtotal</span><span>{formatRupiah(sub)}</span></div>
              {dis > 0 && <div className="pay-row pay-discount"><span>Diskon</span><span>− {formatRupiah(dis)}</span></div>}
              <div className="pay-row pay-total"><span>Total</span><span>{formatRupiah(total)}</span></div>
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost btn-full" onClick={onClose}>Batal</button>
          <button className="btn btn-primary btn-full" onClick={handleBayar} disabled={saving}>{saving ? "Memproses…" : `Bayar ${formatRupiah(total)}`}</button>
        </div>
      </div>
    </>
  );
}
