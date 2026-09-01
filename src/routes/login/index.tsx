import { component$, useSignal, $ } from "@builder.io/qwik";
import { useNavigate, DocumentHead } from "@builder.io/qwik-city";
import { loginUser } from "~/lib/api";

export const head: DocumentHead = { title: "Masuk — RME Praktik" };

export default component$(() => {
  const nav      = useNavigate();
  const email    = useSignal("");
  const password = useSignal("");
  const error    = useSignal("");
  const loading  = useSignal(false);

  const handleSubmit = $(async (e: SubmitEvent) => {
    e.preventDefault();
    error.value   = "";
    loading.value = true;
    try {
      await loginUser(email.value, password.value);
      await nav("/dashboard");
    } catch (err: any) {
      error.value = err.message || "Email atau kata sandi salah.";
    } finally {
      loading.value = false;
    }
  });

  return (
    <div class="login-shell">

      {/* ── Left panel — identity strip ── */}
      <div class="login-panel">
        <div class="login-wordmark">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2.5"
            stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
          </svg>
          RME
        </div>

        <div class="login-panel-body">
          <p class="login-panel-kicker">Rekam Medis Elektronik</p>
          <h1 class="login-panel-title">Praktik<br/>lebih rapi,<br/>pasien lebih<br/>terlayani.</h1>
          <p class="login-panel-sub">
            Satu layar untuk semua alur pasien —<br/>
            dari pendaftaran hingga pembayaran.
          </p>
        </div>

        <p class="login-panel-footer">RME Praktik · v3</p>
      </div>

      {/* ── Right panel — form ── */}
      <div class="login-form-panel">
        <div class="login-form-wrap">

          <div class="login-form-head">
            <h2 class="login-form-title">Masuk</h2>
            <p class="login-form-sub">Khusus pengguna terdaftar.</p>
          </div>

          {error.value && (
            <div class="login-error" role="alert">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error.value}
            </div>
          )}

          <form preventdefault:submit onSubmit$={handleSubmit} noValidate>
            <div class="login-fields">

              <div class="field">
                <label class="label" for="email">Email</label>
                <input
                  id="email"
                  class="input"
                  type="email"
                  autocomplete="email"
                  placeholder="nama@klinik.id"
                  value={email.value}
                  onInput$={(e) => email.value = (e.target as HTMLInputElement).value}
                  required />
              </div>

              <div class="field">
                <label class="label" for="password">Kata Sandi</label>
                <input
                  id="password"
                  class="input"
                  type="password"
                  autocomplete="current-password"
                  placeholder="••••••••"
                  value={password.value}
                  onInput$={(e) => password.value = (e.target as HTMLInputElement).value}
                  required />
              </div>

            </div>

            <button type="submit" class="login-submit" disabled={loading.value}>
              {loading.value ? (
                <span style="display:flex;align-items:center;gap:8px;justify-content:center">
                  <span class="spin" style="width:16px;height:16px;border-width:2px;flex-shrink:0"/>
                  Memuat…
                </span>
              ) : "Masuk →"}
            </button>
          </form>

        </div>
      </div>

    </div>
  );
});
