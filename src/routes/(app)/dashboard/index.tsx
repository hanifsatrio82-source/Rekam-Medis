import {
  component$, useSignal, useVisibleTask$, $
} from "@builder.io/qwik";
import { DocumentHead, useNavigate, useLocation } from "@builder.io/qwik-city";
import {
  getTodayVisits,
  cariPasien, daftarBaru, daftarLama,
  simpanSkrining,
  serahkanObat,
  bayar, getFeesForVisit,
  updateVisitStatus,
} from "~/lib/api";
import {
  formatWaktu, formatStatusLabel, hitungUsia, formatRupiah
} from "~/lib/utils";

export const head: DocumentHead = { title: "Dashboard — RME Praktik" };

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_PIPELINE = [
  { key: "MENUNGGU_SKRINING",   label: "Skrining",   color: "amber"  },
  { key: "MENUNGGU_DOKTER",     label: "Dokter",     color: "blue"   },
  { key: "SEDANG_DIPERIKSA",    label: "Diperiksa",  color: "violet" },
  { key: "MENUNGGU_OBAT",       label: "Farmasi",    color: "teal"   },
  { key: "MENUNGGU_PEMBAYARAN", label: "Bayar",      color: "rose"   },
  { key: "SELESAI",             label: "Selesai",    color: "green"  },
];

const FILTER_TABS = [
  { key: "ALL",                 label: "Semua"    },
  { key: "MENUNGGU_SKRINING",   label: "Skrining" },
  { key: "MENUNGGU_DOKTER",     label: "Dokter"   },
  { key: "SEDANG_DIPERIKSA",    label: "Diperiksa"},
  { key: "MENUNGGU_OBAT",       label: "Farmasi"  },
  { key: "MENUNGGU_PEMBAYARAN", label: "Bayar"    },
];

const PAYMENT_METHODS = ["TUNAI", "QRIS", "TRANSFER", "BPJS", "ASURANSI"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function badgeClass(status: string) {
  const m: Record<string, string> = {
    MENUNGGU_SKRINING:   "sbadge sbadge-amber",
    MENUNGGU_DOKTER:     "sbadge sbadge-blue",
    SEDANG_DIPERIKSA:    "sbadge sbadge-violet",
    MENUNGGU_OBAT:       "sbadge sbadge-teal",
    MENUNGGU_PEMBAYARAN: "sbadge sbadge-rose",
    SELESAI:             "sbadge sbadge-green",
    BATAL:               "sbadge sbadge-slate",
  };
  return m[status] ?? "sbadge sbadge-slate";
}

function greeting() {
  const h = new Date().getHours();
  if (h < 11) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 18) return "Selamat sore";
  return "Selamat malam";
}

// ─── SVG icons (inline, no deps) ─────────────────────────────────────────────

const IcoPlus = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M12 5v14M5 12h14"/>
  </svg>
);
const IcoSearch = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const IcoClose = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M18 6L6 18M6 6l12 12"/>
  </svg>
);
const IcoChevron = (props: { open?: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
    aria-hidden="true" style={props.open ? "transform:rotate(180deg)" : ""}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);
const IcoRefresh = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
  </svg>
);
const IcoUser = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);
const IcoClipboard = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/>
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
  </svg>
);
const IcoPill = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M10.5 3.5a5 5 0 017 7l-7-7zm3 3l-7 7a5 5 0 007 7l7-7-7-7z"/>
  </svg>
);
const IcoCard = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="1" y="4" width="22" height="16" rx="2"/>
    <line x1="1" y1="10" x2="23" y2="10"/>
  </svg>
);
const IcoBan = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
  </svg>
);
const IcoFolder = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
  </svg>
);

// ─── Component ────────────────────────────────────────────────────────────────

export default component$(() => {
  const nav = useNavigate();
  const loc = useLocation();

  // ── Core data ──
  const visits  = useSignal<any[]>([]);
  const loading = useSignal(true);
  const filter  = useSignal("ALL");
  const showDone = useSignal(false);
  const toast   = useSignal("");
  const toastOk = useSignal(true);

  // ── Active drawer ──
  // null | "pendaftaran" | "skrining" | "farmasi" | "pembayaran" | "action-menu"
  const drawer = useSignal<string | null>(null);
  const drawerVisit = useSignal<any>(null); // visit context for skrining/farmasi/bayar

  // ── Pendaftaran state ──
  const regMode   = useSignal<"search"|"new"|"confirm">("search");
  const regQuery  = useSignal("");
  const regResults = useSignal<any[]>([]);
  const regSearching = useSignal(false);
  const regSaving  = useSignal(false);
  const regSelected = useSignal<any>(null);
  const regNama            = useSignal("");
  const regJK              = useSignal("LAKI_LAKI");
  const regTglLahir        = useSignal("");
  const regPenanggungJawab = useSignal("");
  const regNik             = useSignal("");
  const regTanpaKtp        = useSignal(false);
  const regNoHp            = useSignal("");
  const regAlamat          = useSignal("");
  const regGolDarah        = useSignal("");
  const regAlergi          = useSignal("");

  // ── Skrining state ──
  const skTd           = useSignal("");
  const skBb           = useSignal("");
  const skSuhu         = useSignal("");
  const skHr           = useSignal("");
  const skRr           = useSignal("");
  const skTekananDarah = useSignal("");
  const skSpo2         = useSignal("");
  const skKeluhan      = useSignal("");
  const skSaving   = useSignal(false);

  // ── Farmasi state ──
  const faSaving = useSignal(false);

  // ── Pembayaran state ──
  const fees              = useSignal<any[]>([]);
  const bayarMetode       = useSignal("TUNAI");
  const bayarDiskonType   = useSignal("NOMINAL");
  const bayarDiskon       = useSignal(0);
  const bayarTarifP       = useSignal(0);
  const bayarTarifO       = useSignal(0);
  const bayarTarifT       = useSignal(0);
  const bayarTindakanList = useSignal<any[]>([]); // tindakan yang dipilih dari master fees
  const bayarSaving       = useSignal(false);

  // ── Load ──────────────────────────────────────────────────────────
  const load = $(async () => {
    loading.value = true;
    try { visits.value = await getTodayVisits(); }
    finally { loading.value = false; }
  });

  useVisibleTask$(({ track }) => {
    track(() => loc.url.searchParams.get("open"));
    load();
    const openParam = loc.url.searchParams.get("open");
    if (openParam === "pendaftaran") {
      drawer.value = "pendaftaran";
      regMode.value = "search";
    }
  });

  // ── Toast helper ──────────────────────────────────────────────────
  const showToast = $((msg: string, ok = true) => {
    toast.value = msg; toastOk.value = ok;
    setTimeout(() => toast.value = "", 3500);
  });

  // ── Derived ───────────────────────────────────────────────────────
  const counts: Record<string, number> = {};
  visits.value.forEach(v => { counts[v.status] = (counts[v.status] ?? 0) + 1; });
  const active = visits.value.filter(v =>
    !["SELESAI","BATAL"].includes(v.status) &&
    (filter.value === "ALL" || v.status === filter.value)
  );
  const done = visits.value.filter(v => ["SELESAI","BATAL"].includes(v.status));
  const totalActive = visits.value.filter(v => !["SELESAI","BATAL"].includes(v.status)).length;

  const todayLabel = new Date().toLocaleDateString("id-ID", {
    weekday: "short", day: "numeric", month: "short",
  });

  // ── Open drawers ──────────────────────────────────────────────────
  const openPendaftaran = $(() => {
    regMode.value = "search"; regQuery.value = ""; regResults.value = [];
    regSelected.value = null; regSaving.value = false;
    drawer.value = "pendaftaran";
  });

  const openSkrining = $((v: any) => {
    drawerVisit.value = v;
    const cn = v.clinical_notes;
    skTd.value = cn?.tb || ""; skBb.value = cn?.bb || "";
    skSuhu.value = cn?.suhu || ""; skHr.value = cn?.hr || "";
    skRr.value = cn?.rr || ""; skTekananDarah.value = cn?.tekanan_darah || "";
    skSpo2.value = cn?.spo2 || "";
    skKeluhan.value = cn?.keluhan_utama || "";
    skSaving.value = false;
    drawer.value = "skrining";
  });

  const openFarmasi = $((v: any) => {
    drawerVisit.value = v;
    faSaving.value = false;
    drawer.value = "farmasi";
  });

  const openPembayaran = $(async (v: any) => {
    drawerVisit.value = v;
    if (!fees.value.length) fees.value = await getFeesForVisit();
    
    // Gunakan fee snapshot yang sudah disimpan saat dokter finalisasi
    const cn = v.clinical_notes;
    const snapshotFee = cn?.fee_snapshot_tarif;
    const snapshotNama = cn?.fee_snapshot_nama;
    
    // Jika ada snapshot, gunakan itu; otherwise fallback ke master fees
    if (snapshotFee && snapshotFee > 0) {
      bayarTarifP.value = snapshotFee;
    } else {
      const periksaFee = fees.value.find((f: any) =>
        !f.action_id && f.nama?.toLowerCase().includes("periksa"));
      bayarTarifP.value = periksaFee?.tarif || 0;
    }
    
    // Harga obat dari resep
    const rxList = (v.prescriptions || []).filter((r: any) => r.is_active);
    const rxItems = rxList.flatMap((r: any) => r.prescription_items || []);
    const tarifObat = rxItems.reduce((sum: number, it: any) => 
      sum + ((it.medications?.harga_jual || 0) * it.jumlah), 0);
    bayarTarifO.value = tarifObat;
    
    // Tarif tindakan dari visit_actions
    const vaList = v.visit_actions || [];
    const tarifTindakan = vaList.reduce((sum: number, va: any) =>
      sum + (va.fee_snapshot_tarif || 0), 0);
    // Jika ada visit_actions, gunakan itu sebagai tarif tindakan
    // Jika tidak ada, set 0 agar user bisa input manual
    if (vaList.length > 0) {
      bayarTindakanList.value = vaList.map((va: any) => ({
        nama: va.fee_snapshot_nama,
        tarif: va.fee_snapshot_tarif
      }));
      bayarTarifT.value = 0; // Tidak double count — tindakan sudah di bayarTindakanList
    } else {
      bayarTindakanList.value = [];
      bayarTarifT.value = 0;
    }
    
    // Reset diskon dan metode
    bayarDiskon.value = 0; bayarDiskonType.value = "NOMINAL";
    bayarMetode.value = "TUNAI"; 
    bayarSaving.value = false;
    drawer.value = "pembayaran";
  });

  const openActionMenu = $((v: any) => {
    drawerVisit.value = v;
    drawer.value = "action-menu";
  });

  const closeDrawer = $(() => {
    drawer.value = null;
    drawerVisit.value = null;
  });

  // ── Pendaftaran actions ───────────────────────────────────────────
  const doRegSearch = $(async () => {
    if (regQuery.value.length < 2) { regResults.value = []; return; }
    regSearching.value = true;
    try { regResults.value = await cariPasien(regQuery.value); }
    finally { regSearching.value = false; }
  });

  const doRegLama = $(async () => {
    if (!regSelected.value) return;
    regSaving.value = true;
    try {
      const visit = await daftarLama(regSelected.value.id);
      await load();
      showToast(`${regSelected.value.nama} berhasil didaftarkan.`);
      // Langsung buka popup skrining untuk visit baru
      const freshVisits = await getTodayVisits();
      visits.value = freshVisits;
      const newVisit = freshVisits.find((v: any) => v.id === visit.id);
      if (newVisit) {
        drawer.value = null;
        drawerVisit.value = null;
        openSkrining(newVisit);
      } else {
        drawer.value = null; drawerVisit.value = null;
      }
    } catch (e: any) { showToast("Gagal: " + e.message, false); }
    finally { regSaving.value = false; }
  });

  const doRegBaru = $(async () => {
    if (!regNama.value || !regTglLahir.value) {
      showToast("Nama dan tanggal lahir wajib diisi.", false); return;
    }
    regSaving.value = true;
    try {
      const result = await daftarBaru({
        nama: regNama.value,
        jenis_kelamin: regJK.value,
        tanggal_lahir: regTglLahir.value,
        penanggung_jawab: regPenanggungJawab.value || null,
        nik: regTanpaKtp.value ? null : (regNik.value || null),
        no_hp: regNoHp.value || null,
        alamat: regAlamat.value || null,
        gol_darah: null,
        alergi: null,
      });
      await load();
      showToast(`Pasien baru ${regNama.value} berhasil didaftarkan.`);
      // Reset form
      regNama.value = ""; regJK.value = "LAKI_LAKI"; regTglLahir.value = "";
      regPenanggungJawab.value = ""; regNik.value = ""; regTanpaKtp.value = false;
      regNoHp.value = ""; regAlamat.value = "";
      regGolDarah.value = ""; regAlergi.value = "";
      // Langsung buka popup skrining untuk visit baru
      const freshVisits = await getTodayVisits();
      visits.value = freshVisits;
      const newVisit = freshVisits.find((v: any) => v.patient_id === result.pasien.id);
      if (newVisit) {
        drawer.value = null;
        drawerVisit.value = null;
        openSkrining(newVisit);
      } else {
        drawer.value = null; drawerVisit.value = null;
      }
    } catch (e: any) { showToast("Gagal: " + e.message, false); }
    finally { regSaving.value = false; }
  });

  // ── Skrining submit ───────────────────────────────────────────────
  const doSkrining = $(async () => {
    if (!drawerVisit.value || !skKeluhan.value) return;
    skSaving.value = true;
    try {
      await simpanSkrining(drawerVisit.value.id, {
        tb: skTd.value, bb: skBb.value, suhu: skSuhu.value,
        hr: skHr.value, rr: skRr.value,
        tekanan_darah: skTekananDarah.value,
        spo2: skSpo2.value, keluhan_utama: skKeluhan.value,
      });
      await load();
      showToast("Skrining disimpan. Pasien dikirim ke dokter.");
      drawer.value = null; drawerVisit.value = null;
    } catch (e: any) { showToast("Gagal: " + e.message, false); }
    finally { skSaving.value = false; }
  });

  // ── Farmasi submit ────────────────────────────────────────────────
  const doSerahkanObat = $(async () => {
    if (!drawerVisit.value) return;
    faSaving.value = true;
    try {
      await serahkanObat(drawerVisit.value.id);
      await load();
      // Refresh visit data untuk pembayaran
      const freshVisits = await getTodayVisits();
      visits.value = freshVisits;
      const updatedVisit = freshVisits.find((v: any) => v.id === drawerVisit.value.id);
      showToast("Obat diserahkan.");
      drawer.value = null;
      if (updatedVisit) {
        // Langsung buka popup pembayaran
        await openPembayaran(updatedVisit);
      } else {
        drawerVisit.value = null;
      }
    } catch (e: any) { showToast("Gagal: " + e.message, false); }
    finally { faSaving.value = false; }
  });

  // ── Pembayaran calcs & submit ──────────────────────────────────
  const doBayar = $(async () => {
    if (!drawerVisit.value) return;
    bayarSaving.value = true;
    const _tindakanTotal = bayarTindakanList.value.reduce((sum: number, t: any) => sum + (t.tarif || 0), 0);
    const _tarifT = bayarTarifT.value + _tindakanTotal;
    const _sub = bayarTarifP.value + bayarTarifO.value + _tarifT;
    const _dis = bayarDiskonType.value === "PERSENTASE"
      ? Math.round(_sub * bayarDiskon.value / 100)
      : bayarDiskon.value;
    const _total = Math.max(0, _sub - _dis);
    try {
      await bayar(drawerVisit.value.id, {
        total: _total,
        diskon_type: bayarDiskonType.value,
        diskon_nilai: bayarDiskon.value,
        tarif_periksa: bayarTarifP.value,
        tarif_obat: bayarTarifO.value,
        tarif_tindakan: _tarifT,
        metode_pembayaran: bayarMetode.value,
      });
      await load();
      showToast("Pembayaran selesai!");
      drawer.value = null; drawerVisit.value = null;
    } catch (e: any) { showToast("Gagal: " + e.message, false); }
    finally { bayarSaving.value = false; }
  });

  // ── Cancel visit ──────────────────────────────────────────────────
  const doBatalkan = $(async (visitId: string) => {
    try {
      await updateVisitStatus(visitId, "BATAL");
      await load();
      showToast("Kunjungan dibatalkan.");
      drawer.value = null; drawerVisit.value = null;
    } catch (e: any) { showToast("Gagal: " + e.message, false); }
  });

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div class="page">

      {/* ── Toast ──────────────────────────────────────────────── */}
      {toast.value && (
        <div class="toast-tray">
          <div class={`toast ${toastOk.value ? "toast-ok" : "toast-err"}`}>{toast.value}</div>
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────────── */}
      <div class="cc-head">
        <div class="cc-head-left">
          <p class="dash-greeting">{greeting()}</p>
          <h1 class="dash-title">Command Center</h1>
          <p class="cc-sub">Antrian & alur pasien hari ini</p>
        </div>
        <div class="cc-head-right">
          <span class="dash-date">{todayLabel}</span>
          <button class="btn btn-ghost btn-icon btn-sm cc-refresh"
            onClick$={load} aria-label="Refresh data" title="Refresh">
            <IcoRefresh />
          </button>
        </div>
      </div>

      {/* ── Pipeline strip ──────────────────────────────────────── */}
      <div class="pipeline-strip">
        {STATUS_PIPELINE.map(s => (
          <button key={s.key} class={`pipeline-step pipeline-${s.color}`}
            onClick$={() => {
              if (s.key !== "SELESAI") {
                filter.value = filter.value === s.key ? "ALL" : s.key;
              }
            }}
            style={s.key === "SELESAI" ? "cursor:default" : "cursor:pointer"}>
            <div class="pipeline-count">{counts[s.key] ?? 0}</div>
            <div class="pipeline-label">{s.label}</div>
          </button>
        ))}
      </div>

      {/* ── Daftar pasien baru button ────────────────────────────── */}
      <button class="btn btn-primary cc-daftar-btn" onClick$={openPendaftaran}>
        <IcoPlus /> Daftarkan Pasien
      </button>

      {/* ── Active filter indicator ──────────────────────────────── */}
      {filter.value !== "ALL" && (() => {
        const filterLabel = STATUS_PIPELINE.find(s => s.key === filter.value)?.label ?? "";
        return (
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--s3);padding:var(--s2) var(--s3);background:var(--blue-bg);border:1px solid var(--blue-ring);border-radius:var(--r3)">
            <span style="font-size:.8125rem;font-weight:600;color:var(--blue)">
              {"Filter: " + filterLabel + " (" + totalActive + " pasien)"}
            </span>
            <button class="btn btn-ghost btn-xs" onClick$={() => filter.value = "ALL"}>{"× Reset"}</button>
          </div>
        );
      })()}

      {/* ── Queue ───────────────────────────────────────────────── */}
      {loading.value ? (
        <div class="loading"><div class="spin"/></div>
      ) : active.length === 0 ? (
        <div class="empty">
          <div class="empty-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
          <div class="empty-title">Tidak ada antrian aktif</div>
          <div class="empty-sub">
            {filter.value === "ALL"
              ? "Daftarkan pasien baru untuk memulai."
              : "Tidak ada pasien dengan status ini."}
          </div>
        </div>
      ) : (
        <div class="queue">
          {active.map(v => {
            const p = v.patients;
            const st = v.status;
            const actionLabel =
              st === "MENUNGGU_SKRINING"   ? "Mulai Skrining" :
              st === "MENUNGGU_DOKTER"     ? "Buka SOAP" :
              st === "SEDANG_DIPERIKSA"    ? "Buka SOAP" :
              st === "MENUNGGU_OBAT"       ? "Proses Obat" :
              st === "MENUNGGU_PEMBAYARAN" ? "Proses Bayar" : null;
            return (
              <div key={v.id} class="qcard cc-qcard" data-status={v.status}>
                {/* Queue number */}
                <div class="qcard-num">{v.no_antrean}</div>

                {/* Patient info */}
                <div class="qcard-body" onClick$={() => openActionMenu(v)} style="cursor:pointer">
                  <div class="qcard-name">{p?.nama ?? "—"}</div>
                  <div class="qcard-meta">
                    <span>{p?.no_rm}</span>
                    {p?.tanggal_lahir && (
                      <><span class="qcard-meta-dot"/><span>{hitungUsia(p.tanggal_lahir)}</span></>
                    )}
                    <span class="qcard-meta-dot"/>
                    <span>{formatWaktu(v.created_at)}</span>
                  </div>
                </div>

                {/* Right side */}
                <div class="qcard-right">
                  <span class={badgeClass(v.status)}>
                    {formatStatusLabel(v.status)}
                  </span>
                  {actionLabel && (
                    <button
                      class="btn btn-primary btn-xs cc-action-btn"
                      onClick$={$(async () => {
                        if (st === "MENUNGGU_SKRINING")  { openSkrining(v); return; }
                        if (st === "MENUNGGU_DOKTER")    { nav(`/dokter?visit=${v.id}`); return; }
                        if (st === "SEDANG_DIPERIKSA")   { nav(`/dokter?visit=${v.id}`); return; }
                        if (st === "MENUNGGU_OBAT")      { openFarmasi(v); return; }
                        openPembayaran(v);
                      })}>
                      {actionLabel}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Done section ────────────────────────────────────────── */}
      {done.length > 0 && (
        <>
          <button class="done-trigger" onClick$={() => showDone.value = !showDone.value}>
            <span>{done.length} selesai / batal</span>
            <IcoChevron open={showDone.value} />
          </button>
          {showDone.value && (
            <div class="done-list queue">
              {done.map(v => {
                const p = v.patients;
                return (
                  <div key={v.id} class="qcard" data-status={v.status}>
                    <div class="qcard-num">{v.no_antrean}</div>
                    <div class="qcard-body">
                      <div class="qcard-name">{p?.nama ?? "—"}</div>
                      <div class="qcard-meta">
                        <span>{p?.no_rm}</span>
                        <span class="qcard-meta-dot"/>
                        <span>{formatWaktu(v.created_at)}</span>
                      </div>
                    </div>
                    <div class="qcard-right">
                      <span class={badgeClass(v.status)}>{formatStatusLabel(v.status)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}


      {/* ════════════════════════════════════════════════════════════
          DRAWER: ACTION MENU (per-patient)
          ════════════════════════════════════════════════════════════ */}
      {drawer.value === "action-menu" && drawerVisit.value && (() => {
        const v = drawerVisit.value;
        const p = v.patients;
        return (
          <>
            <div class="backdrop" onClick$={closeDrawer}/>
            <div class="modal" role="dialog" aria-modal="true" aria-label="Aksi pasien">
              <div class="modal-head">
                <div>
                  <div class="modal-title">{p?.nama}</div>
                  <div style="font-size:.75rem;color:var(--text-4);margin-top:2px">
                    {p?.no_rm} · No. {v.no_antrean}
                  </div>
                </div>
                <button class="btn btn-ghost btn-icon btn-sm" onClick$={closeDrawer} aria-label="Tutup">
                  <IcoClose/>
                </button>
              </div>
              <div class="modal-body">
                {/* Status banner */}
                <div class="pt-banner" style="margin-bottom:var(--s4)">
                  <div class="pt-meta">
                    <span class={badgeClass(v.status)}>{formatStatusLabel(v.status)}</span>
                    {p?.tanggal_lahir && <span>{hitungUsia(p.tanggal_lahir)}</span>}
                    {p?.jenis_kelamin && <span>{p.jenis_kelamin === "LAKI_LAKI" ? "Laki-laki" : "Perempuan"}</span>}
                  </div>
                </div>

                {/* Action list */}
                <div class="am-list">
                  {(v.status === "MENUNGGU_SKRINING") && (
                    <button class="am-item am-primary"
                      onClick$={() => { closeDrawer(); openSkrining(v); }}>
                      <span class="am-icon"><IcoClipboard/></span>
                      <span>Mulai Skrining</span>
                    </button>
                  )}
                  {(v.status === "MENUNGGU_DOKTER" || v.status === "SEDANG_DIPERIKSA") && (
                    <button class="am-item am-primary"
                      onClick$={() => { closeDrawer(); nav(`/dokter?visit=${v.id}`); }}>
                      <span class="am-icon"><IcoUser/></span>
                      <span>Buka SOAP / Pemeriksaan</span>
                    </button>
                  )}
                  {v.status === "MENUNGGU_OBAT" && (
                    <button class="am-item am-primary"
                      onClick$={() => { closeDrawer(); openFarmasi(v); }}>
                      <span class="am-icon"><IcoPill/></span>
                      <span>Proses Farmasi / Obat</span>
                    </button>
                  )}
                  {v.status === "MENUNGGU_PEMBAYARAN" && (
                    <button class="am-item am-primary"
                      onClick$={() => { closeDrawer(); openPembayaran(v); }}>
                      <span class="am-icon"><IcoCard/></span>
                      <span>Proses Pembayaran</span>
                    </button>
                  )}

                  <div class="am-divider"/>

                  <button class="am-item"
                    onClick$={() => { closeDrawer(); nav(`/rekam-medis?patient=${p?.id}`); }}>
                    <span class="am-icon"><IcoFolder/></span>
                    <span>Lihat Rekam Medis</span>
                  </button>

                  {!["SELESAI","BATAL"].includes(v.status) && (
                    <>
                      <div class="am-divider"/>
                      <button class="am-item am-danger"
                        onClick$={() => { closeDrawer(); doBatalkan(v.id); }}>
                        <span class="am-icon"><IcoBan/></span>
                        <span>Batalkan Kunjungan</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </>
        );
      })()}


      {/* ════════════════════════════════════════════════════════════
          DRAWER: PENDAFTARAN
          ════════════════════════════════════════════════════════════ */}
      {drawer.value === "pendaftaran" && (
        <>
          <div class="backdrop" onClick$={closeDrawer}/>
          <div class="modal" role="dialog" aria-modal="true" aria-label="Pendaftaran pasien">
            <div class="modal-head">
              <span class="modal-title">
                {regMode.value === "new" ? "Pasien Baru" :
                 regMode.value === "confirm" ? "Konfirmasi Pendaftaran" : "Daftarkan Pasien"}
              </span>
              <button class="btn btn-ghost btn-icon" onClick$={closeDrawer} aria-label="Tutup">
                <IcoClose/>
              </button>
            </div>

            {/* ── Search mode ── */}
            {regMode.value === "search" && (
              <>
                <div class="modal-body">
                  <div class="search-wrap" style="margin-bottom:var(--s3)">
                    <span class="search-icon"><IcoSearch/></span>
                    <input class="search-input" type="search"
                      placeholder="Cari nama, No. RM, atau no. HP…"
                      value={regQuery.value}
                      onInput$={(e) => { regQuery.value = (e.target as HTMLInputElement).value; doRegSearch(); }}
                      aria-label="Cari pasien"/>
                  </div>
                  {regSearching.value && <div class="loading" style="padding:var(--s4)"><div class="spin"/></div>}
                  {regResults.value.length > 0 && (
                    <div class="queue">
                      {regResults.value.map(p => (
                        <button key={p.id} class="qcard"
                          onClick$={() => { regSelected.value = p; regMode.value = "confirm"; }}>
                          <div class="qcard-body">
                            <div class="qcard-name">{p.nama}</div>
                            <div class="qcard-meta">
                              <span>{p.no_rm}</span>
                              {p.tanggal_lahir && (
                                <><span class="qcard-meta-dot"/><span>{hitungUsia(p.tanggal_lahir)}</span></>
                              )}
                              {p.no_hp && (
                                <><span class="qcard-meta-dot"/><span>{p.no_hp}</span></>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {regResults.value.length === 0 && regQuery.value.length >= 2 && !regSearching.value && (
                    <div class="empty" style="padding:var(--s8) 0">
                      <div class="empty-title">Pasien tidak ditemukan</div>
                      <div class="empty-sub">Daftarkan sebagai pasien baru.</div>
                    </div>
                  )}
                </div>
                <div class="modal-foot">
                  <button class="btn btn-ghost btn-full" onClick$={closeDrawer}>Batal</button>
                  <button class="btn btn-primary btn-full"
                    onClick$={() => regMode.value = "new"}>
                    <IcoPlus/> Pasien Baru
                  </button>
                </div>
              </>
            )}

            {/* ── Confirm existing patient ── */}
            {regMode.value === "confirm" && regSelected.value && (
              <>
                <div class="modal-body">
                  <div class="pt-banner">
                    <div class="pt-name">{regSelected.value.nama}</div>
                    <div class="pt-meta">
                      <span>{regSelected.value.no_rm}</span>
                      {regSelected.value.tanggal_lahir && (
                        <span>{hitungUsia(regSelected.value.tanggal_lahir)}</span>
                      )}
                      {regSelected.value.jenis_kelamin && (
                        <span>{regSelected.value.jenis_kelamin === "LAKI_LAKI" ? "Laki-laki" : "Perempuan"}</span>
                      )}
                    </div>
                  </div>
                  <p style="font-size:.875rem;color:var(--text-3);line-height:1.6">
                    Pasien ini akan didaftarkan ke antrian skrining hari ini.
                  </p>
                </div>
                <div class="modal-foot">
                  <button class="btn btn-ghost btn-full"
                    onClick$={() => regMode.value = "search"}>Kembali</button>
                  <button class="btn btn-primary btn-full"
                    onClick$={doRegLama} disabled={regSaving.value}>
                    {regSaving.value ? "Mendaftarkan…" : "Daftarkan Sekarang"}
                  </button>
                </div>
              </>
            )}

            {/* ── New patient form ── */}
            {regMode.value === "new" && (
              <>
                <div class="modal-body">
                  <div class="form-stack">

                    {/* Nama */}
                    <div class="field">
                      <label class="label" for="rn-nama">Nama Lengkap <span class="req">*</span></label>
                      <input id="rn-nama" class="input" type="text" placeholder="Nama pasien"
                        value={regNama.value}
                        onInput$={(e) => regNama.value = (e.target as HTMLInputElement).value}/>
                    </div>

                    {/* Jenis Kelamin + Tgl Lahir */}
                    <div class="grid-2">
                      <div class="field">
                        <label class="label" for="rn-jk">Jenis Kelamin</label>
                        <select id="rn-jk" class="input"
                          value={regJK.value}
                          onChange$={(e) => regJK.value = (e.target as HTMLSelectElement).value}>
                          <option value="LAKI_LAKI">Laki-laki</option>
                          <option value="PEREMPUAN">Perempuan</option>
                        </select>
                      </div>
                      <div class="field">
                        <label class="label" for="rn-tgl">Tgl. Lahir <span class="req">*</span></label>
                        <input id="rn-tgl" class="input" type="date"
                          value={regTglLahir.value}
                          onInput$={(e) => regTglLahir.value = (e.target as HTMLInputElement).value}/>
                      </div>
                    </div>

                    {/* Penanggung Jawab */}
                    <div class="field">
                      <label class="label" for="rn-pj">Penanggung Jawab</label>
                      <select id="rn-pj" class="input"
                        value={regPenanggungJawab.value}
                        onChange$={(e) => regPenanggungJawab.value = (e.target as HTMLSelectElement).value}>
                        <option value="">— Pilih —</option>
                        <option value="Pasien Sendiri">Pasien Sendiri</option>
                        <option value="Ayah">Ayah</option>
                        <option value="Ibu">Ibu</option>
                        <option value="Anak">Anak</option>
                      </select>
                    </div>

                    {/* NIK + checkbox tanpa KTP */}
                    <div class="field">
                      <div class="nik-label-row">
                        <label class="label" for="rn-nik">NIK</label>
                        <label class="nik-skip-check">
                          <input type="checkbox"
                            checked={regTanpaKtp.value}
                            onChange$={(e) => {
                              regTanpaKtp.value = (e.target as HTMLInputElement).checked;
                              if (regTanpaKtp.value) regNik.value = "";
                            }}/>
                          <span>Tidak bawa / belum punya KTP</span>
                        </label>
                      </div>
                      <input id="rn-nik" class="input" type="text" placeholder="16 digit NIK"
                        disabled={regTanpaKtp.value}
                        value={regNik.value}
                        onInput$={(e) => regNik.value = (e.target as HTMLInputElement).value}/>
                    </div>

                    {/* No HP */}
                    <div class="field">
                      <label class="label" for="rn-hp">No. HP</label>
                      <input id="rn-hp" class="input" type="tel" placeholder="08xx…"
                        value={regNoHp.value}
                        onInput$={(e) => regNoHp.value = (e.target as HTMLInputElement).value}/>
                    </div>

                    {/* Alamat */}
                    <div class="field">
                      <label class="label" for="rn-alamat">Alamat</label>
                      <textarea id="rn-alamat" class="input" placeholder="Alamat lengkap"
                        value={regAlamat.value}
                        onInput$={(e) => regAlamat.value = (e.target as HTMLTextAreaElement).value}/>
                    </div>

                  </div>
                </div>
                <div class="modal-foot">
                  <button class="btn btn-ghost btn-full"
                    onClick$={() => regMode.value = "search"}>Kembali</button>
                  <button class="btn btn-primary btn-full"
                    onClick$={doRegBaru}
                    disabled={regSaving.value || !regNama.value || !regTglLahir.value}>
                    {regSaving.value ? "Mendaftarkan…" : "Daftar & Antri Skrining"}
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}


      {/* ════════════════════════════════════════════════════════════
          DRAWER: SKRINING
          ════════════════════════════════════════════════════════════ */}
      {drawer.value === "skrining" && drawerVisit.value && (() => {
        const v = drawerVisit.value;
        const p = v.patients;
        return (
          <>
            <div class="backdrop" onClick$={closeDrawer}/>
            <div class="modal" role="dialog" aria-modal="true" aria-label="Skrining pasien">
              <div class="modal-head">
                <span class="modal-title">Skrining</span>
                <button class="btn btn-ghost btn-icon btn-sm" onClick$={closeDrawer} aria-label="Tutup">
                  <IcoClose/>
                </button>
              </div>
              <div class="modal-body">
                <div class="pt-banner">
                  <div class="pt-name">{p?.nama}</div>
                  <div class="pt-meta">
                    <span>{p?.no_rm}</span>
                    {p?.tanggal_lahir && <span>{hitungUsia(p.tanggal_lahir)}</span>}
                    <span>No. {v.no_antrean}</span>
                  </div>
                </div>
                <div class="form-stack">
                  <div class="field">
                    <label class="label" for="sk-keluhan">Keluhan Utama <span class="req">*</span></label>
                    <textarea id="sk-keluhan" class="input" placeholder="Keluhan yang disampaikan pasien…"
                      value={skKeluhan.value}
                      onInput$={(e) => skKeluhan.value = (e.target as HTMLTextAreaElement).value}/>
                  </div>
                  <div class="grid-2">
                    <div class="field">
                      <label class="label" for="sk-td">Tinggi Badan (cm)</label>
                      <input id="sk-td" class="input" type="number" placeholder="170"
                        value={skTd.value}
                        onInput$={(e) => skTd.value = (e.target as HTMLInputElement).value}/>
                    </div>
                    <div class="field">
                      <label class="label" for="sk-bb">Berat Badan (kg)</label>
                      <input id="sk-bb" class="input" type="number" placeholder="60"
                        value={skBb.value}
                        onInput$={(e) => skBb.value = (e.target as HTMLInputElement).value}/>
                    </div>
                  </div>
                  <div class="grid-2">
                    <div class="field">
                      <label class="label" for="sk-td">Tekanan Darah (mmHg)</label>
                      <input id="sk-td" class="input" type="text" placeholder="120/80"
                        value={skTekananDarah.value}
                        onInput$={(e) => skTekananDarah.value = (e.target as HTMLInputElement).value}/>
                    </div>
                    <div class="field">
                      <label class="label" for="sk-hr">Nadi/HR (x/mnt)</label>
                      <input id="sk-hr" class="input" type="number" placeholder="80"
                        value={skHr.value}
                        onInput$={(e) => skHr.value = (e.target as HTMLInputElement).value}/>
                    </div>
                  </div>
                  <div class="grid-2">
                    <div class="field">
                      <label class="label" for="sk-suhu">Suhu (°C)</label>
                      <input id="sk-suhu" class="input" type="number" step="0.1" placeholder="36.5"
                        value={skSuhu.value}
                        onInput$={(e) => skSuhu.value = (e.target as HTMLInputElement).value}/>
                    </div>
                    <div class="field">
                      <label class="label" for="sk-rr">RR (x/mnt)</label>
                      <input id="sk-rr" class="input" type="number" placeholder="18"
                        value={skRr.value}
                        onInput$={(e) => skRr.value = (e.target as HTMLInputElement).value}/>
                    </div>
                  </div>
                  <div class="grid-2">
                    <div class="field">
                      <label class="label" for="sk-spo2">SpO₂ (%)</label>
                      <input id="sk-spo2" class="input" type="number" placeholder="98"
                        value={skSpo2.value}
                        onInput$={(e) => skSpo2.value = (e.target as HTMLInputElement).value}/>
                    </div>
                  </div>
                </div>
              </div>
              <div class="modal-foot">
                <button class="btn btn-ghost btn-full" onClick$={closeDrawer}>Batal</button>
                <button class="btn btn-primary btn-full"
                  onClick$={doSkrining}
                  disabled={skSaving.value || !skKeluhan.value}>
                  {skSaving.value ? "Menyimpan…" : "Simpan & Kirim ke Dokter →"}
                </button>
              </div>
            </div>
          </>
        );
      })()}


      {/* ════════════════════════════════════════════════════════════
          DRAWER: FARMASI
          ════════════════════════════════════════════════════════════ */}
      {drawer.value === "farmasi" && drawerVisit.value && (() => {
        const v = drawerVisit.value;
        const p = v.patients;
        const cn = v.clinical_notes;
        return (
          <>
            <div class="backdrop" onClick$={closeDrawer}/>
            <div class="modal" role="dialog" aria-modal="true" aria-label="Farmasi">
              <div class="modal-head">
                <span class="modal-title">Farmasi / Obat</span>
                <button class="btn btn-ghost btn-icon btn-sm" onClick$={closeDrawer} aria-label="Tutup">
                  <IcoClose/>
                </button>
              </div>
              <div class="modal-body">
                <div class="pt-banner">
                  <div class="pt-name">{p?.nama}</div>
                  <div class="pt-meta">
                    <span>{p?.no_rm}</span>
                    {p?.tanggal_lahir && <span>{hitungUsia(p.tanggal_lahir)}</span>}
                    <span>No. {v.no_antrean}</span>
                  </div>
                </div>

{cn?.keluhan_utama && (
                  <div class="alert alert-info" style="margin-top:var(--s2)">
                    <strong>Keluhan:</strong> {cn.keluhan_utama}
                  </div>
                )}
                {cn?.catatan_pemeriksaan_fisik && (
                  <div class="alert alert-info" style="margin-top:var(--s2)">
                    <strong>Pemeriksaan:</strong> {cn.catatan_pemeriksaan_fisik}
                  </div>
                )}

                {/* Tampilkan resep dari database */}
                {(() => {
                  const rxList = (v.prescriptions || []).filter((r: any) => r.is_active);
                  const pwList = (v.powders || []).filter((p: any) => p.is_active);
                  const vaList = v.visit_actions || [];
                  
                  const hasAny = rxList.length > 0 || pwList.length > 0 || vaList.length > 0;
                  
                  if (!hasAny) {
                    return (
                      <div class="empty" style="padding:var(--s8) 0">
                        <div class="empty-icon">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.5 3.5a5 5 0 017 7l-7-7zm3 3l-7 7a5 5 0 007 7l7-7-7-7z"/></svg>
                        </div>
                        <p class="empty-title">Tidak ada obat/resep</p>
                        <p class="empty-sub">Dokter belum meresepkan obat.</p>
                      </div>
                    );
                  }
                  
                  return (
                    <div style="display:flex;flex-direction:column;gap:var(--s4)">
                      {/* Resep Obat */}
                      {rxList.map((rx: any) => {
                        const items = rx.prescription_items || [];
                        if (items.length === 0) return null;
                        return (
                          <div key={rx.id} style="background:var(--surface-2);border-radius:var(--r3);padding:var(--s3);border:1px solid var(--border)">
                            <div style="font-weight:600;font-size:.875rem;margin-bottom:var(--s2);color:var(--blue-dk)">Obat Resep</div>
                            {items.map((it: any, idx: number) => (
                              <div key={idx} style="display:flex;justify-content:space-between;padding:var(--s1) 0;border-bottom:1px solid var(--border);font-size:.8125rem">
                                <div>
                                  <span style="font-weight:500">{it.medications?.nama || '?'}</span>
                                  {it.medications?.kekuatan && <span style="color:var(--text-3)"> {it.medications.kekuatan}</span>}
                                  <div style="color:var(--text-4);font-size:.75rem">{it.aturan_pakai}</div>
                                </div>
                                <div style="text-align:right">
                                  <div style="font-weight:600">{it.jumlah} {it.medications?.satuan || 'tablet'}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                      
                      {/* Puyer */}
                      {pwList.map((pw: any) => {
                        const items = pw.powder_items || [];
                        if (items.length === 0) return null;
                        return (
                          <div key={pw.id} style="background:var(--surface-2);border-radius:var(--r3);padding:var(--s3);border:1px solid var(--border)">
                            <div style="font-weight:600;font-size:.875rem;margin-bottom:var(--s2);color:var(--blue-dk)">
                              Puyer ({pw.jumlah_bungkus} bungkus)
                            </div>
                            {items.map((it: any, idx: number) => (
                              <div key={idx} style="display:flex;justify-content:space-between;padding:var(--s1) 0;border-bottom:1px solid var(--border);font-size:.8125rem">
                                <div>
                                  <span style="font-weight:500">{it.medications?.nama || '?'}</span>
                                  <div style="color:var(--text-4);font-size:.75rem">{it.jumlah_tablet} tablet</div>
                                </div>
                              </div>
                            ))}
                            <div style="margin-top:var(--s2);padding-top:var(--s2);border-top:1px solid var(--border);font-size:.75rem;color:var(--text-3)">
                              <strong>Aturan:</strong> {pw.aturan_pakai}
                            </div>
                          </div>
                        );
                      })}
                      
                      {/* Tindakan */}
                      {vaList.length > 0 && (
                        <div style="background:var(--surface-2);border-radius:var(--r3);padding:var(--s3);border:1px solid var(--border)">
                          <div style="font-weight:600;font-size:.875rem;margin-bottom:var(--s2);color:var(--amber-dk)">Tindakan</div>
                          {vaList.map((va: any, idx: number) => (
                            <div key={idx} style="display:flex;justify-content:space-between;padding:var(--s1) 0;font-size:.8125rem">
                              <span>{va.fee_snapshot_nama}</span>
                              <span style="font-weight:500">{formatRupiah(va.fee_snapshot_tarif || 0)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
              <div class="modal-foot">
                <button class="btn btn-ghost btn-full" onClick$={closeDrawer}>Batal</button>
                <button class="btn btn-primary btn-full"
                  onClick$={doSerahkanObat} disabled={faSaving.value}>
                  {faSaving.value ? "Memproses…" : "Obat Diserahkan →"}
                </button>
              </div>
            </div>
          </>
        );
      })()}


      {/* ════════════════════════════════════════════════════════════
          DRAWER: PEMBAYARAN
          ════════════════════════════════════════════════════════════ */}
      {drawer.value === "pembayaran" && drawerVisit.value && (() => {
        const v = drawerVisit.value;
        const p = v.patients;
        // Compute totals here — plain variables, not closures, so Qwik can serialize
        const _tindakanTotal = bayarTindakanList.value.reduce((sum: number, t: any) => sum + (t.tarif || 0), 0);
        const _tarifT = bayarTarifT.value + _tindakanTotal;
        const _sub   = bayarTarifP.value + bayarTarifO.value + _tarifT;
        const _dis   = bayarDiskonType.value === "PERSENTASE"
          ? Math.round(_sub * bayarDiskon.value / 100)
          : bayarDiskon.value;
        const _total = Math.max(0, _sub - _dis);
        // fees dengan action_id = tindakan medis, tanpa action_id = tarif dasar
        const tindakanFees = fees.value.filter((f: any) => f.action_id);
        return (
          <>
            <div class="backdrop" onClick$={closeDrawer}/>
            <div class="modal" role="dialog" aria-modal="true" aria-label="Pembayaran">
              <div class="modal-head">
                <span class="modal-title">Pembayaran</span>
                <button class="btn btn-ghost btn-icon btn-sm" onClick$={closeDrawer} aria-label="Tutup">
                  <IcoClose/>
                </button>
              </div>
              <div class="modal-body">
                <div class="pt-banner">
                  <div class="pt-name">{p?.nama}</div>
                  <div class="pt-meta">
                    <span>{p?.no_rm}</span>
                    {p?.tanggal_lahir && <span>{hitungUsia(p.tanggal_lahir)}</span>}
                    <span>No. {v.no_antrean}</span>
                  </div>
                </div>

                <div class="form-stack">
                  {/* Metode */}
                  <div class="field">
                    <label class="label">Metode Pembayaran</label>
                    <div class="method-grid">
                      {PAYMENT_METHODS.map(m => (
                        <button key={m}
                          class={"method-btn" + (bayarMetode.value === m ? " on" : "")}
                          onClick$={() => bayarMetode.value = m}>
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tarif */}
                  <div class="field">
                    <label class="label" for="pay-periksa">Tarif Pemeriksaan</label>
                    <input id="pay-periksa" class="input" type="number"
                      value={bayarTarifP.value}
                      onInput$={(e) => bayarTarifP.value = +(e.target as HTMLInputElement).value}/>
                  </div>
                  <div class="grid-2">
                    <div class="field">
                      <label class="label" for="pay-obat">Tarif Obat</label>
                      <input id="pay-obat" class="input" type="number"
                        value={bayarTarifO.value}
                        onInput$={(e) => bayarTarifO.value = +(e.target as HTMLInputElement).value}/>
                    </div>
                    <div class="field">
                      <label class="label" for="pay-tindakan-manual">Tarif Tindakan Lain (Rp)</label>
                      <input id="pay-tindakan-manual" class="input" type="number"
                        value={bayarTarifT.value}
                        onInput$={(e) => bayarTarifT.value = +(e.target as HTMLInputElement).value}/>
                    </div>
                  </div>

                  {/* Tindakan dari master */}
                  {tindakanFees.length > 0 && (
                    <div class="field">
                      <label class="label">Tindakan Medis</label>
                      <div style="display:flex;flex-direction:column;gap:var(--s2)">
                        {tindakanFees.map((f: any) => {
                          const checked = bayarTindakanList.value.some((t: any) => t.id === f.id);
                          return (
                            <label key={f.id} style="display:flex;align-items:center;gap:var(--s3);cursor:pointer;padding:var(--s2) var(--s3);border-radius:var(--r2);border:1px solid var(--border);background:var(--surface-2)">
                              <input type="checkbox" checked={checked}
                                onChange$={() => {
                                  if (checked) {
                                    bayarTindakanList.value = bayarTindakanList.value.filter((t: any) => t.id !== f.id);
                                  } else {
                                    bayarTindakanList.value = [...bayarTindakanList.value, f];
                                  }
                                }} />
                              <span style="flex:1;font-size:.875rem">{f.nama}</span>
                              <span style="font-size:.875rem;color:var(--text-3);font-weight:600">{formatRupiah(f.tarif)}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Diskon */}
                  <div class="grid-2">
                    <div class="field">
                      <label class="label" for="pay-diskon-type">Jenis Diskon</label>
                      <select id="pay-diskon-type" class="input"
                        value={bayarDiskonType.value}
                        onChange$={(e) => bayarDiskonType.value = (e.target as HTMLSelectElement).value}>
                        <option value="NOMINAL">Nominal (Rp)</option>
                        <option value="PERSENTASE">Persentase (%)</option>
                      </select>
                    </div>
                    <div class="field">
                      <label class="label" for="pay-diskon">
                        Diskon {bayarDiskonType.value === "PERSENTASE" ? "(%)" : "(Rp)"}
                      </label>
                      <input id="pay-diskon" class="input" type="number"
                        value={bayarDiskon.value}
                        onInput$={(e) => bayarDiskon.value = +(e.target as HTMLInputElement).value}/>
                    </div>
                  </div>

                  {/* Summary */}
                  <div class="pay-summary">
                    <div class="pay-row">
                      <span>Subtotal</span>
                      <span>{formatRupiah(_sub)}</span>
                    </div>
                    {_dis > 0 && (
                      <div class="pay-row pay-discount">
                        <span>Diskon</span>
                        <span>- {formatRupiah(_dis)}</span>
                      </div>
                    )}
                    <div class="pay-row pay-total">
                      <span>Total</span>
                      <span>{formatRupiah(_total)}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div class="modal-foot">
                <button class="btn btn-ghost btn-full" onClick$={closeDrawer}>Batal</button>
                <button class="btn btn-primary btn-full"
                  onClick$={doBayar} disabled={bayarSaving.value}>
                  {bayarSaving.value ? "Memproses…" : `Bayar ${formatRupiah(_total)}`}
                </button>
              </div>
            </div>
          </>
        );
      })()}

    </div>
  );
});
