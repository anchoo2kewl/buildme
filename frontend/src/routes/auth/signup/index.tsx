import { component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import { useNavigate } from "@builder.io/qwik-city";
import { post, setToken } from "~/lib/api";
import type { User } from "~/lib/types";

export default component$(() => {
  const nav = useNavigate();
  const email = useSignal("");
  const password = useSignal("");
  const displayName = useSignal("");
  const inviteCode = useSignal("");
  const error = useSignal("");
  const loading = useSignal(false);
  const codeFromUrl = useSignal(false);
  const codeInputRef = useSignal<HTMLInputElement>();

  useVisibleTask$(async () => {
    // loc.url in Qwik City SSG does not carry query params — read the live browser URL.
    const code = new URLSearchParams(window.location.search).get("code");
    if (!code) return;

    inviteCode.value = code;
    codeFromUrl.value = true;
    // Directly set the DOM property (not just the attribute) so the browser
    // shows the value immediately regardless of Qwik's attribute handling.
    if (codeInputRef.value) {
      codeInputRef.value.value = code;
    }

    // Look up the invite to pre-populate the email field.
    try {
      const res = await fetch(`/api/auth/invite-lookup?code=${encodeURIComponent(code)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.email && !email.value) {
          email.value = data.email;
        }
      }
    } catch {
      // Non-fatal — email just won't be pre-filled
    }
  });

  return (
    <div class="flex min-h-screen items-center justify-center" style={{ background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(129,140,248,0.06), transparent), radial-gradient(ellipse 60% 40% at 80% 80%, rgba(52,211,153,0.04), transparent), var(--color-surface)" }}>
      <div class="w-full max-w-sm rounded-xl border border-border bg-elevated/80 p-8 shadow-2xl backdrop-blur-xl">
        <h1 class="mb-1 text-2xl font-bold text-text">Create Account</h1>
        <p class="mb-6 text-sm text-muted">
          Invite only. You need an invite code to sign up.
        </p>

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
                  invite_code: inviteCode.value,
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
              Invite Code
            </label>
            <input
              ref={codeInputRef}
              type="text"
              value={inviteCode.value}
              onInput$={(e) => { inviteCode.value = (e.target as HTMLInputElement).value; }}
              required
              readOnly={codeFromUrl.value}
              class={`mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-text placeholder:text-muted focus:border-accent focus:outline-none ${codeFromUrl.value ? "opacity-60" : ""}`}
              placeholder="Enter your invite code"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-text">
              Display Name
            </label>
            <input
              type="text"
              bind:value={displayName}
              class="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-text placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              placeholder="Your Name"
            />
          </div>
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
              minLength={8}
              class="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-text placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
            <p class="mt-1 text-xs text-muted">
              Min 8 chars, uppercase, lowercase, digit
            </p>
          </div>
          <button
            type="submit"
            disabled={loading.value}
            class="w-full rounded-lg bg-gradient-to-r from-accent to-indigo-400 px-4 py-2 font-medium text-white shadow-lg shadow-accent/25 transition-all hover:shadow-accent/40 hover:brightness-110 disabled:opacity-50"
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
