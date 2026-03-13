import { component$, useVisibleTask$ } from "@builder.io/qwik";
import { useNavigate, useLocation } from "@builder.io/qwik-city";
import { setToken } from "~/lib/api";

export default component$(() => {
  const nav = useNavigate();
  const loc = useLocation();

  useVisibleTask$(() => {
    const token = loc.url.searchParams.get("token");
    if (token) {
      setToken(token);
      nav("/dashboard");
    } else {
      nav("/auth/login");
    }
  });

  return (
    <div class="flex min-h-screen items-center justify-center bg-surface">
      <p class="text-muted">Completing sign in...</p>
    </div>
  );
});
