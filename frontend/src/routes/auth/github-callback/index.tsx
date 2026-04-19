import { component$, useVisibleTask$ } from "@builder.io/qwik";
import { setToken } from "~/lib/api";

export default component$(() => {
  useVisibleTask$(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      setToken(token);
      window.location.href = "/dashboard";
    } else {
      window.location.href = "/auth/login";
    }
  });

  return (
    <div class="flex min-h-screen items-center justify-center bg-surface">
      <p class="text-muted">Completing sign in...</p>
    </div>
  );
});
