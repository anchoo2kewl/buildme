import { component$, useSignal, useVisibleTask$, $ } from "@builder.io/qwik";
import { get, put, post, patch } from "~/lib/api";

interface AdminUser {
  id: number;
  email: string;
  github_login?: string;
  display_name: string;
  avatar_url?: string;
  is_super_admin: boolean;
  invites_remaining: number;
  created_at: string;
}

interface SystemInfo {
  version: string;
  git_commit: string;
  build_time: string;
  db_type: string;
  user_count: number;
  project_count: number;
  build_count: number;
}

export default component$(() => {
  const tab = useSignal<"users" | "email" | "system">("users");

  return (
    <div class="mx-auto max-w-4xl">
      <h1 class="mb-6 text-2xl font-bold text-text">Admin</h1>

      <div class="mb-6 flex gap-1 rounded-lg border border-border bg-elevated p-1">
        {(["users", "email", "system"] as const).map((t) => (
          <button
            key={t}
            onClick$={() => (tab.value = t)}
            class={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              tab.value === t
                ? "bg-accent text-white"
                : "text-muted hover:text-text"
            }`}
          >
            {t === "users" ? "Users" : t === "email" ? "Email" : "System"}
          </button>
        ))}
      </div>

      {tab.value === "users" && <UsersTab />}
      {tab.value === "email" && <EmailTab />}
      {tab.value === "system" && <SystemTab />}
    </div>
  );
});

const UsersTab = component$(() => {
  const users = useSignal<AdminUser[]>([]);
  const loading = useSignal(true);
  const error = useSignal("");
  const toggling = useSignal<number | null>(null);

  useVisibleTask$(async () => {
    try {
      users.value = await get<AdminUser[]>("/admin/users");
    } catch (e: any) {
      error.value = e.message;
    } finally {
      loading.value = false;
    }
  });

  const toggleSuperAdmin = $(async (userId: number) => {
    toggling.value = userId;
    try {
      const result = await patch<{ id: number; is_super_admin: boolean }>(
        `/admin/users/${userId}/super-admin`,
        {},
      );
      users.value = users.value.map((u) =>
        u.id === result.id ? { ...u, is_super_admin: result.is_super_admin } : u,
      );
    } catch (e: any) {
      error.value = e.message;
    } finally {
      toggling.value = null;
    }
  });

  if (loading.value) {
    return (
      <div class="flex justify-center p-8">
        <div class="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div class="rounded-lg border border-border bg-elevated">
      {error.value && (
        <div class="border-b border-border bg-failure/10 px-4 py-2 text-sm text-failure">
          {error.value}
        </div>
      )}
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead>
            <tr class="border-b border-border text-muted">
              <th class="px-4 py-3 font-medium">User</th>
              <th class="px-4 py-3 font-medium">Email</th>
              <th class="px-4 py-3 font-medium">GitHub</th>
              <th class="px-4 py-3 font-medium">Created</th>
              <th class="px-4 py-3 font-medium">Super Admin</th>
            </tr>
          </thead>
          <tbody>
            {users.value.map((u) => (
              <tr key={u.id} class="border-b border-border last:border-0">
                <td class="px-4 py-3">
                  <div class="flex items-center gap-2">
                    {u.avatar_url ? (
                      <img
                        src={u.avatar_url}
                        alt=""
                        class="h-6 w-6 rounded-full"
                        width={24}
                        height={24}
                      />
                    ) : (
                      <div class="flex h-6 w-6 items-center justify-center rounded-full bg-accent/20 text-xs text-accent">
                        {u.display_name?.[0]?.toUpperCase() || u.email[0].toUpperCase()}
                      </div>
                    )}
                    <span class="text-text">{u.display_name || "—"}</span>
                  </div>
                </td>
                <td class="px-4 py-3 text-muted">{u.email}</td>
                <td class="px-4 py-3 text-muted">
                  {u.github_login ? `@${u.github_login}` : "—"}
                </td>
                <td class="px-4 py-3 text-muted">
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
                <td class="px-4 py-3">
                  <button
                    onClick$={() => toggleSuperAdmin(u.id)}
                    disabled={toggling.value === u.id}
                    class={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      u.is_super_admin ? "bg-accent" : "bg-border"
                    }`}
                  >
                    <span
                      class={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                        u.is_super_admin ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});

const EmailTab = component$(() => {
  const settings = useSignal<Record<string, string>>({});
  const loading = useSignal(true);
  const saving = useSignal(false);
  const testing = useSignal(false);
  const error = useSignal("");
  const success = useSignal("");
  const testTo = useSignal("");

  useVisibleTask$(async () => {
    try {
      settings.value = await get<Record<string, string>>("/admin/email-settings");
    } catch (e: any) {
      error.value = e.message;
    } finally {
      loading.value = false;
    }
  });

  const save = $(async () => {
    saving.value = true;
    error.value = "";
    success.value = "";
    try {
      await put("/admin/email-settings", settings.value);
      success.value = "Settings saved";
    } catch (e: any) {
      error.value = e.message;
    } finally {
      saving.value = false;
    }
  });

  const testEmail = $(async () => {
    if (!testTo.value) return;
    testing.value = true;
    error.value = "";
    success.value = "";
    try {
      await post("/admin/test-email", { to: testTo.value });
      success.value = "Test email sent to " + testTo.value;
    } catch (e: any) {
      error.value = e.message;
    } finally {
      testing.value = false;
    }
  });

  if (loading.value) {
    return (
      <div class="flex justify-center p-8">
        <div class="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  const fields = [
    { key: "smtp.host", label: "SMTP Host", placeholder: "smtp.brevo.com" },
    { key: "smtp.port", label: "SMTP Port", placeholder: "587" },
    { key: "smtp.user", label: "SMTP User", placeholder: "user@example.com" },
    { key: "smtp.pass", label: "SMTP Password", placeholder: "password", type: "password" },
    { key: "smtp.from_email", label: "From Email", placeholder: "noreply@build.biswas.me" },
    { key: "smtp.from_name", label: "From Name", placeholder: "BuildMe" },
    { key: "smtp.api_key", label: "Brevo API Key", placeholder: "xkeysib-...", type: "password" },
  ];

  return (
    <div class="rounded-lg border border-border bg-elevated p-6">
      {error.value && (
        <div class="mb-4 rounded bg-failure/20 px-3 py-2 text-sm text-failure">
          {error.value}
        </div>
      )}
      {success.value && (
        <div class="mb-4 rounded bg-success/20 px-3 py-2 text-sm text-success">
          {success.value}
        </div>
      )}

      <div class="space-y-4">
        {fields.map((f) => (
          <div key={f.key}>
            <label class="mb-1 block text-sm font-medium text-muted">{f.label}</label>
            <input
              type={f.type || "text"}
              value={settings.value[f.key] || ""}
              onInput$={(e: InputEvent) => {
                const target = e.target as HTMLInputElement;
                settings.value = { ...settings.value, [f.key]: target.value };
              }}
              placeholder={f.placeholder}
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted"
            />
          </div>
        ))}
      </div>

      <div class="mt-6 flex items-center gap-3">
        <button
          onClick$={save}
          disabled={saving.value}
          class="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving.value ? "Saving..." : "Save Settings"}
        </button>
      </div>

      <div class="mt-6 border-t border-border pt-6">
        <h3 class="mb-3 text-sm font-semibold text-text">Test Connection</h3>
        <div class="flex gap-2">
          <input
            type="email"
            bind:value={testTo}
            placeholder="recipient@example.com"
            class="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted"
          />
          <button
            onClick$={testEmail}
            disabled={testing.value || !testTo.value}
            class="rounded-lg border border-accent px-4 py-2 text-sm font-medium text-accent disabled:opacity-50"
          >
            {testing.value ? "Sending..." : "Send Test"}
          </button>
        </div>
      </div>
    </div>
  );
});

const SystemTab = component$(() => {
  const info = useSignal<SystemInfo | null>(null);
  const loading = useSignal(true);
  const error = useSignal("");

  useVisibleTask$(async () => {
    try {
      info.value = await get<SystemInfo>("/admin/system-info");
    } catch (e: any) {
      error.value = e.message;
    } finally {
      loading.value = false;
    }
  });

  if (loading.value) {
    return (
      <div class="flex justify-center p-8">
        <div class="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  if (error.value) {
    return (
      <div class="rounded bg-failure/20 px-3 py-2 text-sm text-failure">
        {error.value}
      </div>
    );
  }

  const i = info.value!;

  return (
    <div class="grid gap-4 sm:grid-cols-2">
      <div class="rounded-lg border border-border bg-elevated p-6">
        <h3 class="mb-4 text-sm font-semibold text-muted uppercase tracking-wide">
          Backend
        </h3>
        <div class="space-y-3 text-sm">
          <div class="flex justify-between">
            <span class="text-muted">Version</span>
            <span class="font-mono text-text">{i.version}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted">Commit</span>
            <span class="font-mono text-text">{i.git_commit.slice(0, 8)}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted">Build Time</span>
            <span class="text-text">{i.build_time}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted">Database</span>
            <span class="text-text">{i.db_type}</span>
          </div>
        </div>
      </div>

      <div class="rounded-lg border border-border bg-elevated p-6">
        <h3 class="mb-4 text-sm font-semibold text-muted uppercase tracking-wide">
          App Info
        </h3>
        <div class="space-y-3 text-sm">
          <div class="flex justify-between">
            <span class="text-muted">Users</span>
            <span class="font-mono text-text">{i.user_count}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted">Projects</span>
            <span class="font-mono text-text">{i.project_count}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted">Builds</span>
            <span class="font-mono text-text">{i.build_count}</span>
          </div>
        </div>
      </div>
    </div>
  );
});
