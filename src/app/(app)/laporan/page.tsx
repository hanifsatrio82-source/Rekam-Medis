"use client";

import { useState, useEffect, useCallback } from "react";
import { getLaporan } from "~/lib/api";
import { tanggalHariIni, formatRupiah, formatTanggalPendek, formatStatusLabel } from "~/lib/utils";

function badgeClass(status: string) {
  const map: Record<string, string> = {
    MENUNGGU_SKRINING: "sbadge sbadge-amber", MENUNGGU_DOKTER: "sbadge sbadge-blue", SEDANG_DIPERIKSA: "sbadge sbadge-violet",
    MENUNGGU_OBAT: "sbadge sbadge-teal", MENUNGGU_PEMBAYARAN: "sbadge sbadge-rose", SELESAI: "sbadge sbadge-green", BATAL: "sbadge sbadge-slate",
  };
  return map[status] ?? "sbadge sbadge-slate";
}

export default function LaporanPage() {
  const [dari, setDari] = useState(tanggalHariIni());
  const [sampai, setSampai] = useState(tanggalHariIni());
  const [data, setData] = useState<any>({ visits: [], totalPendapatan: 0, jumlahKunjungan: 0, jumlahSelesai: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await getLaporan(dari, sampai)); }
    finally { setLoading(false); }
  }, [dari, sampai]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Laporan</h1>
        <p className="page-sub">Ringkasan kunjungan &amp; pendapatan</p>
      </div>
      <div className="card" style={{marginBottom:"var(--s4)"}}>
        <div className="grid-2" style={{marginBottom:"var(--s3)"}}>
          <div className="field"><label className="label" htmlFor="lap-dari">Dari</label><input id="lap-dari" className="input" type="date" value={dari} onChange={(e) => setDari(e.target.value)} /></div>
          <div className="field"><label className="label" htmlFor="lap-sampai">Sampai</label><input id="lap-sampai" className="input" type="date" value={sampai} onChange={(e) => setSampai(e.target.value)} /></div>
        </div>
        <button className="btn btn-primary btn-full" onClick={load} disabled={loading}>{loading ? "Memuat…" : "Tampilkan Laporan"}</button>
      </div>
      <div className="kpi-strip" style={{marginBottom:"var(--s4)"}}>
        <div className="kpi"><div className="kpi-value">{data.jumlahKunjungan}</div><div className="kpi-label">Kunjungan</div></div>
        <div className="kpi"><div className="kpi-value green">{data.jumlahSelesai}</div><div className="kpi-label">Selesai</div></div>
        <div className="kpi" style={{gridColumn:"span 2"}}><div className="kpi-value blue" style={{fontSize:"1.25rem"}}>{formatRupiah(data.totalPendapatan)}</div><div className="kpi-label">Total Pendapatan</div></div>
      </div>
      {loading ? (<div className="loading"><div className="spin" /></div>) : data.visits.length === 0 ? (
        <div className="empty"><div className="empty-icon">📊</div><p className="empty-title">Tidak ada data</p><p className="empty-sub">Tidak ada kunjungan pada periode ini.</p></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>No.</th><th>Pasien</th><th>Tanggal</th><th>Status</th><th style={{textAlign:"right"}}>Bayar</th></tr></thead>
            <tbody>
              {data.visits.map((v: any, i: number) => {
                const pay = v.payments?.[0];
                return (
                  <tr key={v.id}>
                    <td style={{color:"var(--text-4)",fontVariantNumeric:"tabular-nums"}}>{v.no_antrean ?? i + 1}</td>
                    <td><div style={{fontWeight: 400,color:"var(--text)"}}>{v.patients?.nama}</div><div style={{fontSize:".75rem",color:"var(--text-4)"}}>{v.patients?.no_rm}</div></td>
                    <td style={{whiteSpace:"nowrap",fontSize:".875rem",color:"var(--text-2)"}}>{formatTanggalPendek(v.created_at)}</td>
                    <td><span className={badgeClass(v.status)}>{formatStatusLabel(v.status)}</span></td>
                    <td style={{textAlign:"right",fontWeight:700,color:"var(--green)"}}>{pay ? formatRupiah(pay.total) : <span style={{color:"var(--text-4)"}}>—</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
