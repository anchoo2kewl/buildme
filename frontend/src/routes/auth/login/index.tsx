import { component$, useSignal } from "@builder.io/qwik";
import { useNavigate } from "@builder.io/qwik-city";
import { post, setToken } from "~/lib/api";
import type { User } from "~/lib/types";

export default component$(() => {
  const nav = useNavigate();
  const email = useSignal("");
  const password = useSignal("");
  const error = useSignal("");
  const loading = useSignal(false);

  return (
    <div class="flex min-h-screen items-center justify-center" style={{ background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(129,140,248,0.06), transparent), radial-gradient(ellipse 60% 40% at 80% 80%, rgba(52,211,153,0.04), transparent), var(--color-surface)" }}>
      <div class="w-full max-w-sm rounded-xl border border-border bg-elevated/80 p-8 shadow-2xl backdrop-blur-xl">
        <h1 class="mb-6 text-2xl font-bold text-text">Sign In</h1>

        {error.value && (
          <div class="mb-4 rounded-lg bg-failure/20 px-4 py-2 text-sm text-failure">
            {error.value}
          </div>
        )}

        <form
          preventdefault:submit
          onSubmit$={async () => {
            loading.value = true;
            error.value = "";
            try {
              const res = await post<{ token: string; user: User }>(
                "/auth/login",
                { email: email.value, password: password.value },
              );
              setToken(res.token);
              nav("/dashboard");
            } catch (e: any) {
              error.value = e.message;
            } finally {
              loading.value = false;
            }
          }}
          class="space-y-4"
        >
          <div>
            <label class="block text-sm font-medium text-text">Email</label>
            <input
              type="email"
              bind:value={email}
              required
              class="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-text placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-text">Password</label>
            <input
              type="password"
              bind:value={password}
              required
              class="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-text placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <button
            type="submit"
            disabled={loading.value}
            class="w-full rounded-lg bg-gradient-to-r from-accent to-indigo-400 px-4 py-2 font-medium text-white shadow-lg shadow-accent/25 transition-all hover:shadow-accent/40 hover:brightness-110 disabled:opacity-50"
          >
            {loading.value ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div class="mt-4 text-center text-sm text-muted">
          <a href="/auth/signup" class="text-accent hover:underline">
            Create an account
          </a>
        </div>

        <div class="mt-6 border-t border-border pt-4">
          <a
            href="/api/auth/github"
            class="flex w-full items-center justify-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text transition-all hover:border-accent hover:shadow-md hover:shadow-accent/10"
          >
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            Continue with GitHub
          </a>
        </div>
      </div>
    </div>
  );
});
