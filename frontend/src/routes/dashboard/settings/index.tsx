import { component$, useSignal, useContext, useVisibleTask$ } from "@builder.io/qwik";
import { useNavigate } from "@builder.io/qwik-city";
import { AuthContext } from "~/context/auth-context";
import { post, get, clearToken } from "~/lib/api";
import type { Invite } from "~/lib/types";

export default component$(() => {
  const nav = useNavigate();
  const auth = useContext(AuthContext);
  const currentPassword = useSignal("");
  const newPassword = useSignal("");
  const error = useSignal("");
  const success = useSignal("");

  const invites = useSignal<Invite[]>([]);
  const inviteLoading = useSignal(false);
  const inviteError = useSignal("");
  const copied = useSignal<string | null>(null);

  useVisibleTask$(async () => {
    try {
      invites.value = await get<Invite[]>("/invites");
    } catch {
      // ignore
    }
  });

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

      <section class="mb-8 rounded-lg border border-border bg-elevated p-6">
        <h2 class="mb-4 text-lg font-semibold text-text">Invites</h2>
        <div class="mb-4 flex items-center justify-between">
          <span class="text-sm text-muted">
            Remaining:{" "}
            <span class="font-medium text-text">
              {auth.user?.invites_remaining === -1
                ? "Unlimited"
                : auth.user?.invites_remaining ?? 0}
            </span>
          </span>
          <button
            disabled={inviteLoading.value || (auth.user?.invites_remaining !== -1 && (auth.user?.invites_remaining ?? 0) <= 0)}
            onClick$={async () => {
              inviteLoading.value = true;
              inviteError.value = "";
              try {
                const inv = await post<Invite>("/invites", {});
                invites.value = [inv, ...invites.value];
              } catch (e: any) {
                inviteError.value = e.message;
              } finally {
                inviteLoading.value = false;
              }
            }}
            class="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {inviteLoading.value ? "Creating..." : "Create Invite"}
          </button>
        </div>

        {inviteError.value && (
          <div class="mb-3 rounded bg-failure/20 px-3 py-2 text-sm text-failure">
            {inviteError.value}
          </div>
        )}

        {invites.value.length === 0 ? (
          <p class="text-sm text-muted">No invites created yet.</p>
        ) : (
          <div class="space-y-2">
            {invites.value.map((inv) => {
              const isUsed = !!inv.used_at;
              const isExpired =
                !isUsed && new Date(inv.expires_at) < new Date();
              const status = isUsed
                ? "used"
                : isExpired
                  ? "expired"
                  : "active";
              const statusColor =
                status === "used"
                  ? "text-success"
                  : status === "expired"
                    ? "text-failure"
                    : "text-accent";
              const inviteUrl = `https://build.biswas.me/auth/signup?code=${inv.code}`;

              return (
                <div
                  key={inv.id}
                  class="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2"
                >
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2">
                      <span class="font-mono text-sm text-text">
                        {inv.code}
                      </span>
                      <span class={`text-xs font-medium ${statusColor}`}>
                        {status}
                      </span>
                    </div>
                    <span class="text-xs text-muted">
                      {new Date(inv.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {status === "active" && (
                    <button
                      onClick$={async () => {
                        try {
                          await navigator.clipboard.writeText(inviteUrl);
                          copied.value = inv.code;
                          setTimeout(() => (copied.value = null), 2000);
                        } catch {
                          // fallback
                        }
                      }}
                      class="ml-2 rounded px-2 py-1 text-xs text-accent hover:bg-accent/10"
                      title="Copy invite link"
                    >
                      {copied.value === inv.code ? "Copied!" : "Copy Link"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
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
