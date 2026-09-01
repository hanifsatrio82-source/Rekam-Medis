"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getTodayVisits } from "~/lib/api";
import { formatWaktu, formatStatusLabel, hitungUsia } from "~/lib/utils";
import { IcoRefresh, IcoChevron, badgeClass, greeting, STATUS_PIPELINE } from "~/components/dashboard/icons";
import { ActionMenuDrawer, PendaftaranDrawer, SkriningDrawer, FarmasiDrawer, PembayaranDrawer } from "~/components/dashboard/Drawers";

export default function DashboardPageWrapper() {
  return <Suspense><DashboardPage /></Suspense>;
}

function DashboardPage() {
  const nav = useRouter();
  const searchParams = useSearchParams();
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [showDone, setShowDone] = useState(false);
  const [drawer, setDrawer] = useState<string | null>(null);
  const [drawerVisit, setDrawerVisit] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setVisits(await getTodayVisits()); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    const openParam = searchParams.get("open");
    if (openParam === "pendaftaran") { setDrawer("pendaftaran"); }
  }, [load, searchParams]);

  const counts: Record<string, number> = {};
  visits.forEach(v => { counts[v.status] = (counts[v.status] ?? 0) + 1; });
  const active = visits.filter(v => !["SELESAI", "BATAL"].includes(v.status) && (filter === "ALL" || v.status === filter));
  const done = visits.filter(v => ["SELESAI", "BATAL"].includes(v.status));
  const totalActive = visits.filter(v => !["SELESAI", "BATAL"].includes(v.status)).length;

  const todayLabel = new Date().toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" });

  const closeDrawer = () => { setDrawer(null); setDrawerVisit(null); };
  const openSkrining = (v: any) => { setDrawerVisit(v); setDrawer("skrining"); };

  const handleDrawerDone = useCallback(async () => {
    setDrawer(null); setDrawerVisit(null);
    await load();
  }, [load]);

  return (
    <div className="page">
      {/* Header */}
      <div className="cc-head">
        <div className="cc-head-left">
          <p className="dash-greeting">{greeting()}</p>
          <h1 className="dash-title">Command Center</h1>
          <p className="cc-sub">Antrian & alur pasien hari ini</p>
        </div>
        <div className="cc-head-right">
          <span className="dash-date">{todayLabel}</span>
          <button className="btn btn-ghost btn-icon btn-sm cc-refresh" onClick={load} aria-label="Refresh"><IcoRefresh /></button>
        </div>
      </div>

      {/* Pipeline strip */}
      <div className="pipeline-strip">
        {STATUS_PIPELINE.map(s => (
          <button key={s.key} className={`pipeline-step pipeline-${s.color}`}
            onClick={() => { if (s.key !== "SELESAI") setFilter(filter === s.key ? "ALL" : s.key); }}
            style={s.key === "SELESAI" ? { cursor: "default" } : { cursor: "pointer" }}>
            <div className="pipeline-count">{counts[s.key] ?? 0}</div>
            <div className="pipeline-label">{s.label}</div>
          </button>
        ))}
      </div>

      <button className="btn btn-primary cc-daftar-btn" onClick={() => setDrawer("pendaftaran")}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg> Daftarkan Pasien
      </button>

      {/* Active filter */}
      {filter !== "ALL" && (() => {
        const label = STATUS_PIPELINE.find(s => s.key === filter)?.label ?? "";
        return (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--s3)", padding: "var(--s2) var(--s3)", background: "var(--blue-bg)", border: "1px solid var(--blue-ring)", borderRadius: "var(--r3)" }}>
            <span style={{ fontSize: ".8125rem", fontWeight: 400, color: "var(--blue)" }}>Filter: {label} ({totalActive} pasien)</span>
            <button className="btn btn-ghost btn-xs" onClick={() => setFilter("ALL")}>× Reset</button>
          </div>
        );
      })()}

      {/* Queue */}
      {loading ? (
        <div className="loading"><div className="spin" /></div>
      ) : active.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
          <div className="empty-title">Tidak ada antrian aktif</div>
          <div className="empty-sub">{filter === "ALL" ? "Daftarkan pasien baru untuk memulai." : "Tidak ada pasien dengan status ini."}</div>
        </div>
      ) : (
        <div className="queue">
          {active.map(v => {
            const p = v.patients;
            const st = v.status;
            const actionLabel = st === "MENUNGGU_SKRINING" ? "Mulai Skrining" : st === "MENUNGGU_DOKTER" ? "Buka SOAP" : st === "SEDANG_DIPERIKSA" ? "Buka SOAP" : st === "MENUNGGU_OBAT" ? "Proses Obat" : st === "MENUNGGU_PEMBAYARAN" ? "Proses Bayar" : null;
            return (
              <div key={v.id} className="qcard cc-qcard" data-status={v.status}>
                <div className="qcard-num">{v.no_antrean}</div>
                <div className="qcard-body" onClick={() => { setDrawerVisit(v); setDrawer("action-menu"); }} style={{ cursor: "pointer" }}>
                  <div className="qcard-name">{p?.nama ?? "—"}</div>
                  <div className="qcard-meta">
                    <span>{p?.no_rm}</span>
                    {p?.tanggal_lahir && <><span className="qcard-meta-dot" /><span>{hitungUsia(p.tanggal_lahir)}</span></>}
                    <span className="qcard-meta-dot" /><span>{formatWaktu(v.created_at)}</span>
                  </div>
                </div>
                <div className="qcard-right">
                  <span className={badgeClass(v.status)}>{formatStatusLabel(v.status)}</span>
                  {actionLabel && (
                    <button className="btn btn-primary btn-xs cc-action-btn" onClick={() => {
                      if (st === "MENUNGGU_SKRINING") { openSkrining(v); return; }
                      if (st === "MENUNGGU_DOKTER" || st === "SEDANG_DIPERIKSA") { nav.push(`/dokter?visit=${v.id}`); return; }
                      if (st === "MENUNGGU_OBAT") { setDrawerVisit(v); setDrawer("farmasi"); return; }
                      setDrawerVisit(v); setDrawer("pembayaran");
                    }}>{actionLabel}</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Done section */}
      {done.length > 0 && (
        <>
          <button className="done-trigger" onClick={() => setShowDone(!showDone)}>
            <span>{done.length} selesai / batal</span>
            <IcoChevron open={showDone} />
          </button>
          {showDone && (
            <div className="done-list queue">
              {done.map(v => {
                const p = v.patients;
                return (
                  <div key={v.id} className="qcard" data-status={v.status}>
                    <div className="qcard-num">{v.no_antrean}</div>
                    <div className="qcard-body">
                      <div className="qcard-name">{p?.nama ?? "—"}</div>
                      <div className="qcard-meta"><span>{p?.no_rm}</span><span className="qcard-meta-dot" /><span>{formatWaktu(v.created_at)}</span></div>
                    </div>
                    <div className="qcard-right"><span className={badgeClass(v.status)}>{formatStatusLabel(v.status)}</span></div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Drawers */}
      {drawer === "action-menu" && drawerVisit && <ActionMenuDrawer v={drawerVisit} onClose={closeDrawer} onOpenSkrining={(v) => { closeDrawer(); openSkrining(v); }} onOpenFarmasi={(v) => { closeDrawer(); setDrawerVisit(v); setDrawer("farmasi"); }} onOpenPembayaran={(v) => { closeDrawer(); setDrawerVisit(v); setDrawer("pembayaran"); }} />}
      {drawer === "pendaftaran" && <PendaftaranDrawer onClose={closeDrawer} onDone={handleDrawerDone} />}
      {drawer === "skrining" && drawerVisit && <SkriningDrawer v={drawerVisit} onClose={closeDrawer} onDone={handleDrawerDone} />}
      {drawer === "farmasi" && drawerVisit && <FarmasiDrawer v={drawerVisit} onClose={closeDrawer} onDone={handleDrawerDone} />}
      {drawer === "pembayaran" && drawerVisit && <PembayaranDrawer v={drawerVisit} onClose={closeDrawer} onDone={handleDrawerDone} />}
    </div>
  );
}
