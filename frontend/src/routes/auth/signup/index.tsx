import { component$, useSignal } from "@builder.io/qwik";
import { useNavigate } from "@builder.io/qwik-city";
import { post, setToken } from "~/lib/api";
import type { User } from "~/lib/types";

export default component$(() => {
  const nav = useNavigate();
  const email = useSignal("");
  const password = useSignal("");
  const displayName = useSignal("");
  const error = useSignal("");
  const loading = useSignal(false);

  return (
    <div class="flex min-h-screen items-center justify-center bg-surface">
      <div class="w-full max-w-sm rounded-lg border border-border bg-elevated p-8">
        <h1 class="mb-6 text-2xl font-bold text-text">Create Account</h1>

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
                "/auth/signup",
                {
                  email: email.value,
                  password: password.value,
                  display_name: displayName.value,
                },
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
            <label class="block text-sm font-medium text-text">
              Display Name
            </label>
            <input
              type="text"
              bind:value={displayName}
              class="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-text placeholder:text-muted focus:border-accent focus:outline-none"
              placeholder="Your Name"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-text">Email</label>
            <input
              type="email"
              bind:value={email}
              required
              class="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-text placeholder:text-muted focus:border-accent focus:outline-none"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-text">Password</label>
            <input
              type="password"
              bind:value={password}
              required
              minLength={8}
              class="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-text placeholder:text-muted focus:border-accent focus:outline-none"
            />
            <p class="mt-1 text-xs text-muted">
              Min 8 chars, uppercase, lowercase, digit
            </p>
          </div>
          <button
            type="submit"
            disabled={loading.value}
            class="w-full rounded-lg bg-accent px-4 py-2 font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {loading.value ? "Creating..." : "Create Account"}
          </button>
        </form>

        <div class="mt-4 text-center text-sm text-muted">
          <a href="/auth/login" class="text-accent hover:underline">
            Already have an account?
          </a>
        </div>
      </div>
    </div>
  );
});
