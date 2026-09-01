import { component$, useSignal, useVisibleTask$, $ } from "@builder.io/qwik";
import { DocumentHead } from "@builder.io/qwik-city";
import { cariPasien, daftarBaru, daftarLama } from "~/lib/api";
import { hitungUsia } from "~/lib/utils";

export const head: DocumentHead = { title: "Pendaftaran — RME Praktik" };

type Mode = "search" | "new" | "confirm-lama";

export default component$(() => {
  const mode            = useSignal<Mode>("search");
  const query           = useSignal("");
  const results         = useSignal<any[]>([]);
  const searching       = useSignal(false);
  const saving          = useSignal(false);
  const toast           = useSignal("");
  const toastOk         = useSignal(true);
  const selectedPasien  = useSignal<any>(null);

  // New patient form
  const nama          = useSignal("");
  const nik           = useSignal("");
  const tglLahir      = useSignal("");
  const jenisKelamin  = useSignal("LAKI_LAKI");
  const alamat        = useSignal("");
  const noHp          = useSignal("");
  const golDarah      = useSignal("");
  const alergi        = useSignal("");

  const showToast = $((msg: string, ok = true) => {
    toast.value = msg; toastOk.value = ok;
    setTimeout(() => toast.value = "", 3500);
  });

  const doSearch = $(async () => {
    if (query.value.length < 2) { results.value = []; return; }
    searching.value = true;
    try   { results.value = await cariPasien(query.value); }
    finally { searching.value = false; }
  });

  const handleDaftarLama = $(async () => {
    if (!selectedPasien.value) return;
    saving.value = true;
    try {
      await daftarLama(selectedPasien.value.id);
      showToast(`${selectedPasien.value.nama} berhasil didaftarkan.`);
      mode.value = "search"; query.value = ""; results.value = []; selectedPasien.value = null;
    } catch (e: any) {
      showToast("Gagal: " + e.message, false);
    } finally { saving.value = false; }
  });

  const handleDaftarBaru = $(async () => {
    if (!nama.value || !tglLahir.value) {
      showToast("Nama dan tanggal lahir wajib diisi.", false); return;
    }
    saving.value = true;
    try {
      await daftarBaru({
        nama: nama.value, nik: nik.value,
        tanggal_lahir: tglLahir.value, jenis_kelamin: jenisKelamin.value,
        alamat: alamat.value, no_hp: noHp.value,
        gol_darah: golDarah.value, alergi: alergi.value,
      });
      showToast(`Pasien baru ${nama.value} berhasil didaftarkan.`);
      mode.value = "search";
      nama.value = ""; nik.value = ""; tglLahir.value = ""; jenisKelamin.value = "LAKI_LAKI";
      alamat.value = ""; noHp.value = ""; golDarah.value = ""; alergi.value = "";
    } catch (e: any) {
      showToast("Gagal: " + e.message, false);
    } finally { saving.value = false; }
  });

  return (
    <div class="page">

      {/* Toast */}
      {toast.value && (
        <div class="toast-tray">
          <div class={`toast ${toastOk.value ? "toast-ok" : "toast-err"}`}>{toast.value}</div>
        </div>
      )}

      {/* Header */}
      <div class="page-header">
        <h1 class="page-title">Pendaftaran</h1>
        <p class="page-sub">Cari pasien lama atau daftarkan pasien baru</p>
      </div>

      {/* ── Search mode ─────────────────────────────────────── */}
      {mode.value === "search" && (
        <>
          <div class="search-wrap">
            <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" aria-hidden="true">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              class="search-input"
              type="search"
              placeholder="Cari nama, No. RM, atau no. HP…"
              value={query.value}
              onInput$={(e) => { query.value = (e.target as HTMLInputElement).value; doSearch(); }}
              aria-label="Cari pasien"
            />
          </div>

          {searching.value && (
            <div class="loading"><div class="spin" /></div>
          )}

          {results.value.length > 0 && (
            <div class="queue mb-4">
              {results.value.map(p => (
                <button key={p.id} class="qcard"
                  onClick$={() => { selectedPasien.value = p; mode.value = "confirm-lama"; }}>
                  <div class="qcard-body">
                    <div class="qcard-name">{p.nama}</div>
                    <div class="qcard-meta">
                      <span>{p.no_rm}</span>
                      <span class="qcard-meta-dot" />
                      <span>{hitungUsia(p.tanggal_lahir)}</span>
                      <span class="qcard-meta-dot" />
                      <span>{p.jenis_kelamin === "LAKI_LAKI" ? "L" : "P"}</span>
                      {p.no_hp && (
                        <>
                          <span class="qcard-meta-dot" />
                          <span>{p.no_hp}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div class="qcard-right">
                    <span class="sbadge sbadge-blue">Daftar</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {query.value.length >= 2 && results.value.length === 0 && !searching.value && (
            <div class="empty">
              <div class="empty-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </div>
              <p class="empty-title">Pasien tidak ditemukan</p>
              <p class="empty-sub">Apakah ini pasien baru?</p>
              <button class="btn btn-primary mt-4"
                onClick$={() => { mode.value = "new"; nama.value = query.value; }}>
                + Daftar Pasien Baru
              </button>
            </div>
          )}

          <div class="mt-5">
            <button class="btn btn-outline btn-full"
              onClick$={() => mode.value = "new"}>
              + Pasien Baru
            </button>
          </div>
        </>
      )}

      {/* ── Confirm returning patient ────────────────────────── */}
      {mode.value === "confirm-lama" && selectedPasien.value && (
        <>
          <div class="backdrop" onClick$={() => mode.value = "search"} />
          <div class="sheet" role="dialog" aria-modal="true" aria-label="Konfirmasi pendaftaran">
            <div class="sheet-grip" />
            <div class="sheet-head">
              <span class="sheet-title">Konfirmasi Pendaftaran</span>
              <button class="btn btn-ghost btn-icon btn-sm"
                onClick$={() => mode.value = "search"} aria-label="Tutup">✕</button>
            </div>
            <div class="sheet-body">
              <div class="pt-banner">
                <div class="pt-name">{selectedPasien.value.nama}</div>
                <div class="pt-meta">
                  <span>No. RM: {selectedPasien.value.no_rm}</span>
                  <span>{hitungUsia(selectedPasien.value.tanggal_lahir)}</span>
                  <span>{selectedPasien.value.jenis_kelamin === "LAKI_LAKI" ? "Laki-laki" : "Perempuan"}</span>
                </div>
              </div>
              <div class="alert alert-info mt-3">
                Pasien akan didaftarkan untuk kunjungan hari ini dan masuk antrian skrining.
              </div>
            </div>
            <div class="sheet-foot">
              <button class="btn btn-ghost btn-full"
                onClick$={() => mode.value = "search"}>Batal</button>
              <button class="btn btn-primary btn-full"
                onClick$={handleDaftarLama} disabled={saving.value}>
                {saving.value ? "Mendaftarkan…" : "Daftarkan Sekarang"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── New patient sheet ────────────────────────────────── */}
      {mode.value === "new" && (
        <>
          <div class="backdrop" onClick$={() => mode.value = "search"} />
          <div class="sheet" role="dialog" aria-modal="true" aria-label="Daftar pasien baru">
            <div class="sheet-grip" />
            <div class="sheet-head">
              <span class="sheet-title">Pasien Baru</span>
              <button class="btn btn-ghost btn-icon btn-sm"
                onClick$={() => mode.value = "search"} aria-label="Tutup">✕</button>
            </div>
            <div class="sheet-body">
              <div class="form-stack">

                <div class="field">
                  <label class="label" for="p-nama">Nama Lengkap <span class="req">*</span></label>
                  <input id="p-nama" class="input" type="text" placeholder="Ahmad Fauzi"
                    value={nama.value}
                    onInput$={(e) => nama.value = (e.target as HTMLInputElement).value} />
                </div>

                <div class="field">
                  <label class="label" for="p-nik">NIK</label>
                  <input id="p-nik" class="input" type="text" placeholder="3201xxxxxxxxxxxx"
                    maxLength={16} value={nik.value}
                    onInput$={(e) => nik.value = (e.target as HTMLInputElement).value} />
                </div>

                <div class="grid-2">
                  <div class="field">
                    <label class="label" for="p-tgl">Tgl. Lahir <span class="req">*</span></label>
                    <input id="p-tgl" class="input" type="date"
                      value={tglLahir.value}
                      onInput$={(e) => tglLahir.value = (e.target as HTMLInputElement).value} />
                  </div>
                  <div class="field">
                    <label class="label" for="p-jk">Jenis Kelamin</label>
                    <select id="p-jk" class="input"
                      value={jenisKelamin.value}
                      onChange$={(e) => jenisKelamin.value = (e.target as HTMLSelectElement).value}>
                      <option value="LAKI_LAKI">Laki-laki</option>
                      <option value="PEREMPUAN">Perempuan</option>
                    </select>
                  </div>
                </div>

                <div class="field">
                  <label class="label" for="p-hp">No. HP</label>
                  <input id="p-hp" class="input" type="tel" placeholder="08xxxxxxxxxx"
                    value={noHp.value}
                    onInput$={(e) => noHp.value = (e.target as HTMLInputElement).value} />
                </div>

                <div class="field">
                  <label class="label" for="p-alamat">Alamat</label>
                  <textarea id="p-alamat" class="input" rows={2} placeholder="Jl. …"
                    value={alamat.value}
                    onInput$={(e) => alamat.value = (e.target as HTMLTextAreaElement).value} />
                </div>

                <div class="grid-2">
                  <div class="field">
                    <label class="label" for="p-gol">Gol. Darah</label>
                    <select id="p-gol" class="input"
                      value={golDarah.value}
                      onChange$={(e) => golDarah.value = (e.target as HTMLSelectElement).value}>
                      <option value="">—</option>
                      {["A","B","AB","O"].map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div class="field">
                    <label class="label" for="p-alergi">Alergi</label>
                    <input id="p-alergi" class="input" type="text" placeholder="Penisilin, …"
                      value={alergi.value}
                      onInput$={(e) => alergi.value = (e.target as HTMLInputElement).value} />
                  </div>
                </div>

              </div>
            </div>
            <div class="sheet-foot">
              <button class="btn btn-ghost btn-full"
                onClick$={() => mode.value = "search"}>Batal</button>
              <button class="btn btn-primary btn-full"
                onClick$={handleDaftarBaru}
                disabled={saving.value || !nama.value || !tglLahir.value}>
                {saving.value ? "Mendaftarkan…" : "Daftar & Antri Skrining"}
              </button>
            </div>
          </div>
        </>
      )}

    </div>
  );
});
