import { component$, useSignal, useVisibleTask$, $ } from "@builder.io/qwik";
import { DocumentHead } from "@builder.io/qwik-city";
import { getBiaya, simpanBiaya, hapusBiaya } from "~/lib/api";
import { formatRupiah } from "~/lib/utils";

export const head: DocumentHead = { title: "Master Biaya — RME Praktik" };

const EMPTY = () => ({ id: "", nama: "", kode: "", tarif: 0 });

export default component$(() => {
  const list     = useSignal<any[]>([]);
  const loading  = useSignal(true);
  const formOpen = useSignal(false);
  const form     = useSignal(EMPTY());
  const saving   = useSignal(false);
  const toast    = useSignal("");
  const toastOk  = useSignal(true);

  const showToast = $((msg: string, ok = true) => {
    toast.value = msg; toastOk.value = ok;
    setTimeout(() => toast.value = "", 2500);
  });

  const load = $(async () => {
    loading.value = true;
    try   { list.value = await getBiaya(); }
    finally { loading.value = false; }
  });

  useVisibleTask$(() => { load(); });

  const handleSave = $(async () => {
    saving.value = true;
    try {
      await simpanBiaya(form.value);
      showToast(form.value.id ? "Biaya diperbarui." : "Biaya ditambahkan.");
      formOpen.value = false;
      await load();
    } catch (e: any) { showToast("Gagal: " + e.message, false); }
    finally { saving.value = false; }
  });

  const handleHapus = $(async (id: string, nama: string) => {
    if (!confirm(`Hapus "${nama}"?`)) return;
    try { await hapusBiaya(id); showToast("Biaya dihapus."); await load(); }
    catch (e: any) { showToast("Gagal: " + e.message, false); }
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
          <h1 class="page-title">Master Biaya</h1>
          <p class="page-sub">{list.value.length} item biaya</p>
        </div>
        <button class="btn btn-primary btn-sm"
          onClick$={() => { form.value = EMPTY(); formOpen.value = true; }}>+ Tambah</button>
      </div>

      {loading.value ? (
        <div class="loading"><div class="spin" /></div>
      ) : list.value.length === 0 ? (
        <div class="empty">
          <div class="empty-icon">🏷️</div>
          <p class="empty-title">Belum ada biaya</p>
          <p class="empty-sub">Tambahkan tarif layanan untuk digunakan saat pemeriksaan.</p>
          <button class="btn btn-primary mt-4"
            onClick$={() => { form.value = EMPTY(); formOpen.value = true; }}>+ Tambah Biaya</button>
        </div>
      ) : (
        <div style="display:flex;flex-direction:column;gap:var(--s2)">
          {list.value.map((item: any) => (
            <div key={item.id} class="card">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:var(--s3)">
                <div style="flex:1;min-width:0">
                  <div style="font-weight:700;color:var(--text)">{item.nama}</div>
                  <div style="display:flex;align-items:center;gap:var(--s2);margin-top:4px;flex-wrap:wrap">
                    {item.kode && <span class="sbadge sbadge-blue">{item.kode}</span>}
                    <span style="font-size:.9375rem;font-weight:700;color:var(--blue)">
                      {formatRupiah(item.tarif)}
                    </span>
                  </div>
                </div>
                <div style="display:flex;gap:var(--s2);flex-shrink:0">
                  <button class="btn btn-ghost btn-sm"
                    onClick$={() => { form.value = { ...item }; formOpen.value = true; }}>Edit</button>
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
            aria-label={form.value.id ? "Edit biaya" : "Tambah biaya"}>
            <div class="sheet-grip" />
            <div class="sheet-head">
              <span class="sheet-title">{form.value.id ? "Edit Biaya" : "Tambah Biaya"}</span>
              <button class="btn btn-ghost btn-icon btn-sm"
                onClick$={() => formOpen.value = false} aria-label="Tutup">✕</button>
            </div>
            <div class="sheet-body">
              <div class="form-stack">

                <div class="field">
                  <label class="label" for="bi-nama">Nama Biaya <span class="req">*</span></label>
                  <input id="bi-nama" class="input" type="text"
                    placeholder="Konsultasi Umum"
                    value={form.value.nama}
                    onInput$={(e) => form.value = { ...form.value, nama: (e.target as HTMLInputElement).value }} />
                </div>

                <div class="grid-2">
                  <div class="field">
                    <label class="label" for="bi-kode">Kode</label>
                    <input id="bi-kode" class="input" type="text"
                      placeholder="LITE, MEDIUM, ULTRA…"
                      value={form.value.kode}
                      onInput$={(e) => form.value = { ...form.value, kode: (e.target as HTMLInputElement).value.toUpperCase() }} />
                  </div>
                  <div class="field">
                    <label class="label" for="bi-tarif">Tarif (Rp)</label>
                    <input id="bi-tarif" class="input" type="number" min="0"
                      value={form.value.tarif}
                      onInput$={(e) => form.value = { ...form.value, tarif: parseInt((e.target as HTMLInputElement).value) || 0 }} />
                  </div>
                </div>

              </div>
            </div>
            <div class="sheet-foot">
              <button class="btn btn-ghost btn-full"
                onClick$={() => formOpen.value = false}>Batal</button>
              <button class="btn btn-primary btn-full"
                onClick$={handleSave} disabled={saving.value || !form.value.nama}>
                {saving.value ? "Menyimpan…" : "Simpan"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
});
