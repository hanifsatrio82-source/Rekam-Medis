import { component$, Slot, useSignal, useVisibleTask$, $ } from "@builder.io/qwik";
import { useLocation, useNavigate } from "@builder.io/qwik-city";
import { supabase } from "~/lib/supabase";
import { logoutUser } from "~/lib/api";

// ─── Navigation structure ─────────────────────────────────────────────────────
// Dashboard is the command center — all patient workflow runs from there.
// Other pages remain accessible for direct/standalone access.

const NAV_CLINICAL = [
  { href: "/dashboard",   label: "Command Center", icon: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10", badge: "CC" },
  { href: "/dokter",      label: "SOAP / Dokter",  icon: "M22 12h-4l-3 9L9 3l-3 9H2" },
];

const NAV_RECORDS = [
  { href: "/rekam-medis", label: "Rekam Medis",  icon: "M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" },
  { href: "/laporan",     label: "Laporan",      icon: "M12 20V10 M18 20V4 M6 20v-4" },
];

const NAV_MASTER = [
  { href: "/master-obat",     label: "Master Obat",     icon: "M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z M3.27 6.96L12 12.01l8.73-5.05 M12 22.08V12" },
  { href: "/master-biaya",    label: "Master Biaya",    icon: "M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z M7 7h.01" },
  { href: "/pengaturan",      label: "Pengaturan",      icon: "M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" },
];

// Bottom nav: Dashboard (CC) + SOAP + Rekam Medis + More
const BOTTOM_NAV = [
  { href: "/dashboard",   label: "Command",  icon: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10" },
  { href: "/dokter",      label: "SOAP",     icon: "M22 12h-4l-3 9L9 3l-3 9H2" },
  { href: "/rekam-medis", label: "Rekam",    icon: "M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" },
  { href: "/laporan",     label: "Laporan",  icon: "M12 20V10 M18 20V4 M6 20v-4" },
];

// More sheet items — master data and records accessible from bottom nav
const MORE_ITEMS = [
  { href: "/master-obat",     label: "Master Obat",     icon: "M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z M3.27 6.96L12 12.01l8.73-5.05 M12 22.08V12" },
  { href: "/master-biaya",    label: "Master Biaya",    icon: "M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z M7 7h.01" },
  { href: "/pengaturan",      label: "Pengaturan",      icon: "M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" },
];

const ICON_LOGOUT = "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4 M16 17l5-5-5-5 M21 12H9";
const ICON_CLOSE  = "M18 6L6 18 M6 6l12 12";
const ICON_MENU   = "M3 12h18 M3 6h18 M3 18h18";
const ICON_MORE   = "M12 13a1 1 0 100-2 1 1 0 000 2z M19 13a1 1 0 100-2 1 1 0 000 2z M5 13a1 1 0 100-2 1 1 0 000 2z";
const ICON_PULSE  = "M22 12h-4l-3 9L9 3l-3 9H2";

function renderIcon(d: string, size = 20) {
  const parts = d.split(" M").map((seg, i) => (i === 0 ? seg : "M" + seg));
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
      aria-hidden="true">
      {parts.map((p, i) => <path key={i} d={p} />)}
    </svg>
  );
}

export default component$(() => {
  const loc       = useLocation();
  const nav       = useNavigate();
  const moreOpen  = useSignal(false);
  const menuOpen  = useSignal(false);

  useVisibleTask$(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) await nav("/login");
  });

  const isActive = (href: string) => {
    const hrefPath = href.split("?")[0];
    return loc.url.pathname.startsWith(hrefPath);
  };

  const currentPage = (() => {
    const path = loc.url.pathname;
    if (path.startsWith("/dashboard")) return "Command Center";
    const all = [...NAV_CLINICAL, ...NAV_RECORDS, ...NAV_MASTER];
    return all.find(i => path.startsWith(i.href))?.label ?? "RME Praktik";
  })();

  const handleLogout = $(async () => {
    await logoutUser();
    await nav("/login");
  });

  return (
    <div class="app-shell">

      {/* ── Sidebar (desktop ≥ 1024px) ───────────────────────────── */}
      <aside class="sidebar">
        <div class="sidebar-brand">
          <div class="sidebar-brand-mark">
            {renderIcon(ICON_PULSE, 18)}
          </div>
          <div>
            <div class="sidebar-brand-name">RME Praktik</div>
            <div class="sidebar-brand-sub">Rekam Medis Elektronik</div>
          </div>
        </div>

        <nav class="sidebar-nav" aria-label="Navigasi utama">

          {/* Command Center — pinned, visually distinct */}
          <div class="sidebar-section">
            {NAV_CLINICAL.map(item => (
              <a key={item.href} href={item.href}
                class={"nav-item" + (isActive(item.href) ? " active" : "") + (item.href === "/dashboard" ? " nav-cc" : "")}>
                <span class="nav-item-icon">{renderIcon(item.icon, 18)}</span>
                <span style="flex:1">{item.label}</span>
                {item.href === "/dashboard" && (
                  <span class="nav-cc-badge">HQ</span>
                )}
              </a>
            ))}
          </div>

          <div class="sidebar-section">
            <div class="sidebar-label">Rekam Medis</div>
            {NAV_RECORDS.map(item => (
              <a key={item.href} href={item.href}
                class={"nav-item" + (isActive(item.href) ? " active" : "")}>
                <span class="nav-item-icon">{renderIcon(item.icon, 18)}</span>
                {item.label}
              </a>
            ))}
          </div>

          <div class="sidebar-section">
            <div class="sidebar-label">Master Data</div>
            {NAV_MASTER.map(item => (
              <a key={item.href} href={item.href}
                class={"nav-item" + (isActive(item.href) ? " active" : "")}>
                <span class="nav-item-icon">{renderIcon(item.icon, 18)}</span>
                {item.label}
              </a>
            ))}
          </div>
        </nav>

        <div class="sidebar-footer">
          <button class="nav-item" style="color:var(--rose)" onClick$={handleLogout}>
            <span class="nav-item-icon">{renderIcon(ICON_LOGOUT, 18)}</span>
            Keluar
          </button>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────────────────── */}
      <main class="main-content" id="main-content">
        <header class="topbar">
          <div class="topbar-left">
            {loc.url.pathname.startsWith("/dashboard") && (
              <span class="topbar-hq-badge">HQ</span>
            )}
            <h1 class="topbar-title">{currentPage}</h1>
          </div>
          <button class="topbar-action" onClick$={() => menuOpen.value = true} aria-label="Buka menu">
            {renderIcon(ICON_MENU, 22)}
          </button>
        </header>

        <Slot />
      </main>

      {/* ── Bottom nav (mobile) ────────────────────────────────────── */}
      <nav class="bottom-nav" aria-label="Navigasi bawah">
        {BOTTOM_NAV.map(item => (
          <a key={item.href} href={item.href}
            class={"bottom-nav-item" + (isActive(item.href) ? " active" : "") + (item.href === "/dashboard" ? " bnav-cc" : "")}>
            {renderIcon(item.icon, item.href === "/dashboard" ? 24 : 22)}
            <span>{item.label}</span>
          </a>
        ))}
        <button
          class={"bottom-nav-item" + (moreOpen.value ? " active" : "")}
          onClick$={() => moreOpen.value = true}
          aria-label="Lebih banyak menu">
          {renderIcon(ICON_MORE, 22)}
          <span>Lainnya</span>
        </button>
      </nav>

      {/* ── "More" bottom sheet ───────────────────────────────────── */}
      {moreOpen.value && (
        <>
          <div class="backdrop" onClick$={() => moreOpen.value = false} />
          <div class="sheet" role="dialog" aria-modal="true" aria-label="Menu lainnya">
            <div class="sheet-grip" />
            <div class="sheet-head">
              <span class="sheet-title">Menu Lainnya</span>
              <button class="btn btn-ghost btn-icon" onClick$={() => moreOpen.value = false} aria-label="Tutup">
                {renderIcon(ICON_CLOSE, 20)}
              </button>
            </div>
            <div class="sheet-body" style="padding:var(--s2) 0">
              {MORE_ITEMS.map(item => (
                <a key={item.href} href={item.href}
                  class={"nav-item" + (isActive(item.href) ? " active" : "")}
                  onClick$={() => moreOpen.value = false}>
                  <span class="nav-item-icon">{renderIcon(item.icon, 20)}</span>
                  {item.label}
                </a>
              ))}
              <div class="divider" style="margin:var(--s2) var(--s4)" />
              <button class="nav-item" style="color:var(--rose)" onClick$={handleLogout}>
                <span class="nav-item-icon">{renderIcon(ICON_LOGOUT, 20)}</span>
                Keluar
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Full menu sheet (hamburger) ───────────────────────────── */}
      {menuOpen.value && (
        <>
          <div class="backdrop" onClick$={() => menuOpen.value = false} />
          <div class="sheet" role="dialog" aria-modal="true" aria-label="Navigasi">
            <div class="sheet-grip" />
            <div class="sheet-head">
              <div style="display:flex;align-items:center;gap:var(--s3)">
                <div class="sidebar-brand-mark" style="width:32px;height:32px">
                  {renderIcon(ICON_PULSE, 16)}
                </div>
                <span class="sheet-title">RME Praktik</span>
              </div>
              <button class="btn btn-ghost btn-icon" onClick$={() => menuOpen.value = false} aria-label="Tutup">
                {renderIcon(ICON_CLOSE, 20)}
              </button>
            </div>
            <div class="sheet-body" style="padding:var(--s2) 0">

              {/* Command Center first */}
              {NAV_CLINICAL.map(item => (
                <a key={item.href} href={item.href}
                  class={"nav-item" + (isActive(item.href) ? " active" : "") + (item.href === "/dashboard" ? " nav-cc" : "")}
                  onClick$={() => menuOpen.value = false}>
                  <span class="nav-item-icon">{renderIcon(item.icon, 20)}</span>
                  <span style="flex:1">{item.label}</span>
                  {item.href === "/dashboard" && <span class="nav-cc-badge">HQ</span>}
                </a>
              ))}

              <div class="divider" style="margin:var(--s2) var(--s4)" />
              <div class="sidebar-label" style="padding:0 var(--s4) var(--s2)">Rekam Medis</div>
              {NAV_RECORDS.map(item => (
                <a key={item.href} href={item.href}
                  class={"nav-item" + (isActive(item.href) ? " active" : "")}
                  onClick$={() => menuOpen.value = false}>
                  <span class="nav-item-icon">{renderIcon(item.icon, 20)}</span>
                  {item.label}
                </a>
              ))}

              <div class="divider" style="margin:var(--s2) var(--s4)" />
              <div class="sidebar-label" style="padding:0 var(--s4) var(--s2)">Master Data</div>
              {NAV_MASTER.map(item => (
                <a key={item.href} href={item.href}
                  class={"nav-item" + (isActive(item.href) ? " active" : "")}
                  onClick$={() => menuOpen.value = false}>
                  <span class="nav-item-icon">{renderIcon(item.icon, 20)}</span>
                  {item.label}
                </a>
              ))}

              <div class="divider" style="margin:var(--s2) var(--s4)" />
              <button class="nav-item" style="color:var(--rose)" onClick$={handleLogout}>
                <span class="nav-item-icon">{renderIcon(ICON_LOGOUT, 20)}</span>
                Keluar
              </button>
            </div>
          </div>
        </>
      )}

    </div>
  );
});
