import { component$, useSignal, useVisibleTask$, $ } from "@builder.io/qwik";
import { DocumentHead } from "@builder.io/qwik-city";
import { getTindakan, simpanTindakanMaster, hapusTindakan, simpanTarif, hapusTarif } from "~/lib/api";
import { formatRupiah } from "~/lib/utils";

export const head: DocumentHead = { title: "Master Tindakan — RME Praktik" };

const EMPTY_TINDAKAN = () => ({ id: "", nama: "", kode: "" });
const EMPTY_TARIF    = () => ({ id: "", nama: "", tarif: 0, action_id: "" });
const JENIS = ["UMUM", "BPJS", "ASURANSI", "KHUSUS"];

export default component$(() => {
  const list           = useSignal<any[]>([]);
  const loading        = useSignal(true);
  const formOpen       = useSignal(false);
  const tarifOpen      = useSignal(false);
  const form           = useSignal(EMPTY_TINDAKAN());
  const tarifForm      = useSignal(EMPTY_TARIF());
  const currentTindakan= useSignal<any>(null);
  const saving         = useSignal(false);
  const toast          = useSignal("");
  const toastOk        = useSignal(true);

  const showToast = $((msg: string, ok = true) => {
    toast.value = msg; toastOk.value = ok;
    setTimeout(() => toast.value = "", 2500);
  });

  const load = $(async () => {
    loading.value = true;
    try   { list.value = await getTindakan(); }
    finally { loading.value = false; }
  });

  useVisibleTask$(() => { load(); });

  const handleSaveTindakan = $(async () => {
    saving.value = true;
    try {
      await simpanTindakanMaster(form.value);
      showToast(form.value.id ? "Tindakan diperbarui." : "Tindakan ditambahkan.");
      formOpen.value = false;
      await load();
    } catch (e: any) { showToast("Gagal: " + e.message, false); }
    finally { saving.value = false; }
  });

  const handleSaveTarif = $(async () => {
    saving.value = true;
    try {
      await simpanTarif({ ...tarifForm.value, action_id: currentTindakan.value?.id });
      showToast("Tarif disimpan.");
      tarifOpen.value = false;
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
          <h1 class="page-title">Master Tindakan</h1>
          <p class="page-sub">{list.value.length} tindakan</p>
        </div>
        <button class="btn btn-primary btn-sm"
          onClick$={() => { form.value = EMPTY_TINDAKAN(); formOpen.value = true; }}>+ Tambah</button>
      </div>

      {loading.value ? (
        <div class="loading"><div class="spin" /></div>
      ) : list.value.length === 0 ? (
        <div class="empty">
          <div class="empty-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          </div>
          <p class="empty-title">Belum ada tindakan</p>
          <p class="empty-sub">Tambahkan prosedur medis yang tersedia di praktik ini.</p>
          <button class="btn btn-primary mt-4"
            onClick$={() => { form.value = EMPTY_TINDAKAN(); formOpen.value = true; }}>+ Tambah Tindakan</button>
        </div>
      ) : (
        <div style="display:flex;flex-direction:column;gap:var(--s3)">
          {list.value.map((item: any) => (
            <div key={item.id} class="card">
              {/* Tindakan header */}
              <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--s3)">
                <div style="flex:1;min-width:0">
                  <div style="font-weight:700;color:var(--text)">{item.nama}</div>
                  {item.kode && (
                    <div style="font-size:.75rem;color:var(--text-4);margin-top:2px">{item.kode}</div>
                  )}
                </div>
                <div style="display:flex;gap:var(--s2);flex-shrink:0">
                  <button class="btn btn-ghost btn-sm"
                    onClick$={() => { form.value = { ...item }; formOpen.value = true; }}>Edit</button>
                  <button class="btn btn-danger btn-sm"
                    onClick$={async () => {
                      if (confirm(`Hapus tindakan "${item.nama}"?`)) {
                        await hapusTindakan(item.id); await load();
                      }
                    }}>Hapus</button>
                </div>
              </div>

              {/* Tarif rows */}
              {(item.fees || []).length > 0 && (
                <div style="margin-top:var(--s3);display:flex;flex-direction:column;gap:var(--s1)">
                  {item.fees.map((f: any) => (
                    <div key={f.id}
                      style="display:flex;align-items:center;justify-content:space-between;padding:var(--s2) var(--s3);background:var(--surface-2);border:1px solid var(--border);border-radius:var(--r3)">
                      <div>
                        <span style="font-size:.875rem;font-weight:500;color:var(--text-2)">{f.nama}</span>
                      </div>
                      <div style="display:flex;align-items:center;gap:var(--s2)">
                        <span style="font-size:.875rem;font-weight:700;color:var(--blue)">
                          {formatRupiah(f.tarif)}
                        </span>
                        <button class="btn btn-ghost btn-xs btn-icon"
                          style="color:var(--rose)"
                          onClick$={async () => { await hapusTarif(f.id); await load(); }}
                          aria-label={`Hapus tarif ${f.nama}`}>×</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button class="btn btn-outline btn-sm btn-full mt-3"
                onClick$={() => {
                  currentTindakan.value = item;
                  tarifForm.value = { ...EMPTY_TARIF(), nama: "Tarif " + item.nama };
                  tarifOpen.value = true;
                }}>
                + Tambah Tarif
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tindakan form sheet */}
      {formOpen.value && (
        <>
          <div class="backdrop" onClick$={() => formOpen.value = false} />
          <div class="sheet" role="dialog" aria-modal="true"
            aria-label={form.value.id ? "Edit tindakan" : "Tambah tindakan"}>
            <div class="sheet-grip" />
            <div class="sheet-head">
              <span class="sheet-title">{form.value.id ? "Edit Tindakan" : "Tambah Tindakan"}</span>
              <button class="btn btn-ghost btn-icon btn-sm"
                onClick$={() => formOpen.value = false} aria-label="Tutup">✕</button>
            </div>
            <div class="sheet-body">
              <div class="form-stack">
                <div class="field">
                  <label class="label" for="ti-nama">Nama Tindakan <span class="req">*</span></label>
                  <input id="ti-nama" class="input" type="text" placeholder="Jahit luka"
                    value={form.value.nama}
                    onInput$={(e) => form.value = { ...form.value, nama: (e.target as HTMLInputElement).value }} />
                </div>
                <div class="field">
                  <label class="label" for="ti-kode">Kode</label>
                  <input id="ti-kode" class="input" type="text" placeholder="T001"
                    value={form.value.kode}
                    onInput$={(e) => form.value = { ...form.value, kode: (e.target as HTMLInputElement).value }} />
                </div>
              </div>
            </div>
            <div class="sheet-foot">
              <button class="btn btn-ghost btn-full"
                onClick$={() => formOpen.value = false}>Batal</button>
              <button class="btn btn-primary btn-full"
                onClick$={handleSaveTindakan} disabled={saving.value || !form.value.nama}>
                {saving.value ? "Menyimpan…" : "Simpan"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Tarif form sheet */}
      {tarifOpen.value && (
        <>
          <div class="backdrop" onClick$={() => tarifOpen.value = false} />
          <div class="sheet" role="dialog" aria-modal="true" aria-label="Tambah tarif">
            <div class="sheet-grip" />
            <div class="sheet-head">
              <span class="sheet-title">Tambah Tarif</span>
              <button class="btn btn-ghost btn-icon btn-sm"
                onClick$={() => tarifOpen.value = false} aria-label="Tutup">✕</button>
            </div>
            <div class="sheet-body">
              <div class="alert alert-info mb-4">
                Tindakan: <strong>{currentTindakan.value?.nama}</strong>
              </div>
              <div class="form-stack">
                <div class="field">
                  <label class="label" for="tr-nama">Nama Tarif</label>
                  <input id="tr-nama" class="input" type="text"
                    value={tarifForm.value.nama}
                    onInput$={(e) => tarifForm.value = { ...tarifForm.value, nama: (e.target as HTMLInputElement).value }} />
                </div>
                <div class="field">
                  <label class="label" for="tr-tarif">Tarif (Rp)</label>
                  <input id="tr-tarif" class="input" type="number" min="0"
                    value={tarifForm.value.tarif}
                    onInput$={(e) => tarifForm.value = { ...tarifForm.value, tarif: parseInt((e.target as HTMLInputElement).value) || 0 }} />
                </div>
              </div>
            </div>
            <div class="sheet-foot">
              <button class="btn btn-ghost btn-full"
                onClick$={() => tarifOpen.value = false}>Batal</button>
              <button class="btn btn-primary btn-full"
                onClick$={handleSaveTarif} disabled={saving.value}>
                {saving.value ? "Menyimpan…" : "Simpan Tarif"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
});
