import { component$, useSignal, useVisibleTask$, $ } from "@builder.io/qwik";
import { DocumentHead } from "@builder.io/qwik-city";
import { getLaporan } from "~/lib/api";
import { tanggalHariIni, formatRupiah, formatTanggalPendek, formatStatusLabel } from "~/lib/utils";

export const head: DocumentHead = { title: "Laporan — RME Praktik" };

function badgeClass(status: string) {
  const map: Record<string, string> = {
    MENUNGGU_SKRINING:    "sbadge sbadge-amber",
    MENUNGGU_DOKTER:      "sbadge sbadge-blue",
    SEDANG_DIPERIKSA:     "sbadge sbadge-violet",
    MENUNGGU_OBAT:        "sbadge sbadge-teal",
    MENUNGGU_PEMBAYARAN:  "sbadge sbadge-rose",
    SELESAI:              "sbadge sbadge-green",
    BATAL:                "sbadge sbadge-slate",
  };
  return map[status] ?? "sbadge sbadge-slate";
}

export default component$(() => {
  const dari    = useSignal(tanggalHariIni());
  const sampai  = useSignal(tanggalHariIni());
  const data    = useSignal<any>({ visits: [], totalPendapatan: 0, jumlahKunjungan: 0, jumlahSelesai: 0 });
  const loading = useSignal(true);

  const load = $(async () => {
    loading.value = true;
    try   { data.value = await getLaporan(dari.value, sampai.value); }
    finally { loading.value = false; }
  });

  useVisibleTask$(() => { load(); });

  return (
    <div class="page">
      <div class="page-header">
        <h1 class="page-title">Laporan</h1>
        <p class="page-sub">Ringkasan kunjungan &amp; pendapatan</p>
      </div>

      {/* Date filter */}
      <div class="card mb-4">
        <div class="grid-2" style="margin-bottom:var(--s3)">
          <div class="field">
            <label class="label" for="lap-dari">Dari</label>
            <input id="lap-dari" class="input" type="date" value={dari.value}
              onInput$={(e) => dari.value = (e.target as HTMLInputElement).value} />
          </div>
          <div class="field">
            <label class="label" for="lap-sampai">Sampai</label>
            <input id="lap-sampai" class="input" type="date" value={sampai.value}
              onInput$={(e) => sampai.value = (e.target as HTMLInputElement).value} />
          </div>
        </div>
        <button class="btn btn-primary btn-full" onClick$={load} disabled={loading.value}>
          {loading.value ? "Memuat…" : "Tampilkan Laporan"}
        </button>
      </div>

      {/* KPI strip */}
      <div class="kpi-strip mb-4">
        <div class="kpi">
          <div class="kpi-value">{data.value.jumlahKunjungan}</div>
          <div class="kpi-label">Kunjungan</div>
        </div>
        <div class="kpi">
          <div class="kpi-value green">{data.value.jumlahSelesai}</div>
          <div class="kpi-label">Selesai</div>
        </div>
        <div class="kpi" style="grid-column:span 2">
          <div class="kpi-value blue" style="font-size:1.25rem">
            {formatRupiah(data.value.totalPendapatan)}
          </div>
          <div class="kpi-label">Total Pendapatan</div>
        </div>
      </div>

      {/* Table */}
      {loading.value ? (
        <div class="loading"><div class="spin" /></div>
      ) : data.value.visits.length === 0 ? (
        <div class="empty">
          <div class="empty-icon">📊</div>
          <p class="empty-title">Tidak ada data</p>
          <p class="empty-sub">Tidak ada kunjungan pada periode ini.</p>
        </div>
      ) : (
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>No.</th>
                <th>Pasien</th>
                <th>Tanggal</th>
                <th>Status</th>
                <th style="text-align:right">Bayar</th>
              </tr>
            </thead>
            <tbody>
              {data.value.visits.map((v: any, i: number) => {
                const pay = v.payments?.[0];
                return (
                  <tr key={v.id}>
                    <td style="color:var(--text-4);font-variant-numeric:tabular-nums">
                      {v.no_antrean ?? i + 1}
                    </td>
                    <td>
                      <div style="font-weight:600;color:var(--text)">{v.patients?.nama}</div>
                      <div style="font-size:.75rem;color:var(--text-4)">{v.patients?.no_rm}</div>
                    </td>
                    <td style="white-space:nowrap;font-size:.875rem;color:var(--text-2)">
                      {formatTanggalPendek(v.created_at)}
                    </td>
                    <td>
                      <span class={badgeClass(v.status)}>{formatStatusLabel(v.status)}</span>
                    </td>
                    <td style="text-align:right;font-weight:700;color:var(--green)">
                      {pay ? formatRupiah(pay.total) : <span style="color:var(--text-4)">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
});
