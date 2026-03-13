import { component$, useSignal, useContext } from "@builder.io/qwik";
import { useNavigate } from "@builder.io/qwik-city";
import { AuthContext } from "~/context/auth-context";
import { post, clearToken } from "~/lib/api";

export default component$(() => {
  const nav = useNavigate();
  const auth = useContext(AuthContext);
  const currentPassword = useSignal("");
  const newPassword = useSignal("");
  const error = useSignal("");
  const success = useSignal("");

  return (
    <div class="mx-auto max-w-lg">
      <h1 class="mb-6 text-2xl font-bold text-text">Account Settings</h1>

      <section class="mb-8 rounded-lg border border-border bg-elevated p-6">
        <h2 class="mb-4 text-lg font-semibold text-text">Profile</h2>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-muted">Email</span>
            <span class="text-text">{auth.user?.email}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted">Display Name</span>
            <span class="text-text">{auth.user?.display_name}</span>
          </div>
          {auth.user?.github_login && (
            <div class="flex justify-between">
              <span class="text-muted">GitHub</span>
              <span class="text-text">@{auth.user.github_login}</span>
            </div>
          )}
        </div>
      </section>

      <section class="mb-8 rounded-lg border border-border bg-elevated p-6">
        <h2 class="mb-4 text-lg font-semibold text-text">Change Password</h2>

        {error.value && (
          <div class="mb-3 rounded bg-failure/20 px-3 py-2 text-sm text-failure">
            {error.value}
          </div>
        )}
        {success.value && (
          <div class="mb-3 rounded bg-success/20 px-3 py-2 text-sm text-success">
            {success.value}
          </div>
        )}

        <form
          preventdefault:submit
          onSubmit$={async () => {
            error.value = "";
            success.value = "";
            try {
              await post("/me/password", {
                current_password: currentPassword.value,
                new_password: newPassword.value,
              });
              success.value = "Password changed successfully";
              currentPassword.value = "";
              newPassword.value = "";
            } catch (e: any) {
              error.value = e.message;
            }
          }}
          class="space-y-3"
        >
          <input
            type="password"
            bind:value={currentPassword}
            placeholder="Current password"
            required
            class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted"
          />
          <input
            type="password"
            bind:value={newPassword}
            placeholder="New password"
            required
            minLength={8}
            class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted"
          />
          <button
            type="submit"
            class="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white"
          >
            Update Password
          </button>
        </form>
      </section>

      <button
        onClick$={() => {
          clearToken();
          nav("/auth/login");
        }}
        class="rounded-lg border border-failure px-4 py-2 text-sm text-failure transition-colors hover:bg-failure/10"
      >
        Sign Out
      </button>
    </div>
  );
});
