import { component$ } from "@builder.io/qwik";
import { useNavigate } from "@builder.io/qwik-city";
import { useVisibleTask$ } from "@builder.io/qwik";
import { supabase } from "~/lib/supabase";

export default component$(() => {
  const nav = useNavigate();

  useVisibleTask$(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await nav("/dashboard");
    } else {
      await nav("/login");
    }
  });

  return (
    <div style="min-height:100dvh;display:flex;align-items:center;justify-content:center;background:var(--bg)">
      <div class="spin" style="width:32px;height:32px" />
    </div>
  );
});
