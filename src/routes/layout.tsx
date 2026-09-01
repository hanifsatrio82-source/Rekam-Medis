import { component$, Slot } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";

export const useAuthCheck = routeLoader$(async ({ url, redirect, cookie }) => {
  // Auth is checked per-route in (app)/layout.tsx
  return { path: url.pathname };
});

export default component$(() => {
  return <Slot />;
});
