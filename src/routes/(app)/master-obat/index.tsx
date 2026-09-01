import { component$, useSignal, useVisibleTask$, $ } from "@builder.io/qwik";
import { DocumentHead } from "@builder.io/qwik-city";
import { getMedications, simpanObat, hapusObat } from "~/lib/api";
import { formatRupiah } from "~/lib/utils";

export const head: DocumentHead = { title: "Master Obat — RME Praktik" };

const EMPTY_FORM = () => ({ id: "", nama: "", kekuatan: "", satuan: "tablet", stok: 0, harga_beli: 0, harga_jual: 0, minimum_stok: 10 });
const SATUAN = ["tablet", "kapsul", "sirup", "salep", "tetes", "ampul", "sachet", "ml", "gram"];

export default component$(() => {
  const list     = useSignal<any[]>([]);
  const loading  = useSignal(true);
  const search   = useSignal("");
  const formOpen = useSignal(false);
  const form     = useSignal(EMPTY_FORM());
  const saving   = useSignal(false);
  const toast    = useSignal("");
  const toastOk  = useSignal(true);

  const showToast = $((msg: string, ok = true) => {
    toast.value = msg; toastOk.value = ok;
    setTimeout(() => toast.value = "", 2500);
  });

  const load = $(async () => {
    loading.value = true;
    try   { list.value = await getMedications(search.value); }
    finally { loading.value = false; }
  });

  useVisibleTask$(() => { load(); });

  const openNew  = $(() => { form.value = EMPTY_FORM(); formOpen.value = true; });
  const openEdit = $((item: any) => { form.value = { ...item }; formOpen.value = true; });

  const handleSave = $(async () => {
    saving.value = true;
    try {
      await simpanObat(form.value);
      showToast(form.value.id ? "Obat diperbarui." : "Obat berhasil ditambahkan.");
      formOpen.value = false;
      await load();
    } catch (e: any) { showToast("Gagal: " + e.message, false); }
    finally { saving.value = false; }
  });

  const handleHapus = $(async (id: string, nama: string) => {
    if (!confirm(`Hapus "${nama}"?`)) return;
    saving.value = true;
    try {
      await hapusObat(id);
      showToast("Obat dihapus.");
      await load();
    } catch (e: any) { showToast("Gagal: " + e.message, false); }
    finally { saving.value = false; }
  });

  return (
    <div class="page">

      {toast.value && (
        <div class="toast-tray">
          <div class={`toast ${toastOk.value ? "toast-ok" : "toast-err"}`}>{toast.value}</div>
        </div>
      )}

      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--s3);margin-bottom:var(--s5)">
        <div>
          <h1 class="page-title">Master Obat</h1>
          <p class="page-sub">{list.value.length} obat terdaftar</p>
        </div>
        <button class="btn btn-primary btn-sm" onClick$={openNew}>+ Tambah</button>
      </div>

      <div class="search-wrap">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" aria-hidden="true">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input class="search-input" type="search" placeholder="Cari nama obat…"
          value={search.value}
          onInput$={(e) => { search.value = (e.target as HTMLInputElement).value; load(); }}
          aria-label="Cari obat" />
      </div>

      {loading.value ? (
        <div class="loading"><div class="spin" /></div>
      ) : list.value.length === 0 ? (
        <div class="empty">
          <div class="empty-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.5 3.5a5 5 0 017 7l-7-7zm3 3l-7 7a5 5 0 007 7l7-7-7-7z"/></svg>
          </div>
          <p class="empty-title">Belum ada obat</p>
          <p class="empty-sub">Tambahkan obat pertama untuk memulai.</p>
          <button class="btn btn-primary mt-4" onClick$={openNew}>+ Tambah Obat</button>
        </div>
      ) : (
        <div style="display:flex;flex-direction:column;gap:var(--s2)">
          {list.value.map((item: any) => (
            <div key={item.id} class="card">
              <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--s3)">
                <div style="flex:1;min-width:0">
                  <div style="font-weight:700;color:var(--text);font-size:.9375rem">{item.nama}</div>
                  <div style="font-size:.8125rem;color:var(--text-3);margin-top:2px">
                    Stok: <strong style="color:var(--text-2)">{item.stok}</strong> {item.satuan}
                    <span style="margin:0 var(--s2);color:var(--border-2)">·</span>
                    <strong style="color:var(--text-2)">{formatRupiah(item.harga_jual)}</strong> / {item.satuan}
                  </div>
                  {(item.bentuk_sediaan || item.kekuatan) && (
                    <div style="font-size:.75rem;color:var(--text-4);margin-top:2px">
                      {[item.bentuk_sediaan, item.kekuatan].filter(Boolean).join(" · ")}
                    </div>
                  )}
                </div>
                <div style="display:flex;gap:var(--s2);flex-shrink:0">
                  <button class="btn btn-ghost btn-sm" onClick$={() => openEdit(item)}>Edit</button>
                  <button class="btn btn-danger btn-sm"
                    onClick$={() => handleHapus(item.id, item.nama)}>Hapus</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {formOpen.value && (
        <>
          <div class="backdrop" onClick$={() => formOpen.value = false} />
          <div class="sheet" role="dialog" aria-modal="true"
            aria-label={form.value.id ? "Edit obat" : "Tambah obat"}>
            <div class="sheet-grip" />
            <div class="sheet-head">
              <span class="sheet-title">{form.value.id ? "Edit Obat" : "Tambah Obat"}</span>
              <button class="btn btn-ghost btn-icon btn-sm"
                onClick$={() => formOpen.value = false} aria-label="Tutup">✕</button>
            </div>
            <div class="sheet-body">
              <div class="form-stack">

                <div class="field">
                  <label class="label" for="ob-nama">Nama Obat <span class="req">*</span></label>
                  <input id="ob-nama" class="input" type="text" placeholder="Paracetamol"
                    value={form.value.nama}
                    onInput$={(e) => form.value = { ...form.value, nama: (e.target as HTMLInputElement).value }} />
                </div>

                <div class="grid-2">
                  <div class="field">
                    <label class="label" for="ob-kekuatan">Kekuatan</label>
                    <input id="ob-kekuatan" class="input" type="text" placeholder="500mg, 250mg…"
                      value={form.value.kekuatan}
                      onInput$={(e) => form.value = { ...form.value, kekuatan: (e.target as HTMLInputElement).value }} />
                  </div>
                  <div class="field">
                    <label class="label" for="ob-satuan">Satuan</label>
                    <select id="ob-satuan" class="input" value={form.value.satuan}
                      onChange$={(e) => form.value = { ...form.value, satuan: (e.target as HTMLSelectElement).value }}>
                      {SATUAN.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div class="grid-2">
                  <div class="field">
                    <label class="label" for="ob-stok">Stok</label>
                    <input id="ob-stok" class="input" type="number" min="0"
                      value={form.value.stok}
                      onInput$={(e) => form.value = { ...form.value, stok: parseInt((e.target as HTMLInputElement).value) || 0 }} />
                  </div>
                  <div class="field">
                    <label class="label" for="ob-minstok">Min. Stok</label>
                    <input id="ob-minstok" class="input" type="number" min="0"
                      value={form.value.minimum_stok}
                      onInput$={(e) => form.value = { ...form.value, minimum_stok: parseInt((e.target as HTMLInputElement).value) || 0 }} />
                  </div>
                </div>

                <div class="grid-2">
                  <div class="field">
                    <label class="label" for="ob-hbeli">Harga Beli (Rp)</label>
                    <input id="ob-hbeli" class="input" type="number" min="0"
                      value={form.value.harga_beli}
                      onInput$={(e) => form.value = { ...form.value, harga_beli: parseInt((e.target as HTMLInputElement).value) || 0 }} />
                  </div>
                  <div class="field">
                    <label class="label" for="ob-hjual">Harga Jual (Rp)</label>
                    <input id="ob-hjual" class="input" type="number" min="0"
                      value={form.value.harga_jual}
                      onInput$={(e) => form.value = { ...form.value, harga_jual: parseInt((e.target as HTMLInputElement).value) || 0 }} />
                  </div>
                </div>

              </div>
            </div>
            <div class="sheet-foot">
              <button class="btn btn-ghost btn-full"
                onClick$={() => formOpen.value = false}>Batal</button>
              <button class="btn btn-primary btn-full"
                onClick$={handleSave}
                disabled={saving.value || !form.value.nama}>
                {saving.value ? "Menyimpan…" : "Simpan"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
});
