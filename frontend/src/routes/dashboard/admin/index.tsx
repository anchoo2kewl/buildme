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

      <div class="mb-6 inline-flex gap-1 rounded-xl border border-border bg-elevated/60 p-1">
        {(["users", "email", "system"] as const).map((t) => (
          <button
            key={t}
            onClick$={() => (tab.value = t)}
            class={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              tab.value === t
                ? "bg-accent/15 text-accent shadow-sm"
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
            <tr class="border-b border-border bg-surface/30 text-muted">
              <th class="px-4 py-3 font-medium">User</th>
              <th class="px-4 py-3 font-medium">Email</th>
              <th class="px-4 py-3 font-medium">GitHub</th>
              <th class="px-4 py-3 font-medium">Created</th>
              <th class="px-4 py-3 font-medium">Super Admin</th>
            </tr>
          </thead>
          <tbody>
            {users.value.map((u) => (
              <tr key={u.id} class="border-b border-border transition-colors last:border-0 hover:bg-white/[0.02]">
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
                    class={`relative inline-flex h-6 w-11 items-center rounded-full transition-all ${
                      u.is_super_admin ? "bg-gradient-to-r from-accent to-indigo-400 shadow-sm shadow-accent/30" : "bg-border"
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
  const testingProvider = useSignal<string | null>(null);
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

  const updateSetting = $((key: string, value: string) => {
    settings.value = { ...settings.value, [key]: value };
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

  const testEmail = $(async (provider: string) => {
    if (!testTo.value) return;
    testingProvider.value = provider;
    error.value = "";
    success.value = "";
    try {
      await post("/admin/test-email", { to: testTo.value, provider });
      success.value = `Test email sent via ${provider === "mailerlite" ? "MailerLite" : "Brevo"} to ${testTo.value}`;
    } catch (e: any) {
      error.value = e.message;
    } finally {
      testingProvider.value = null;
    }
  });

  if (loading.value) {
    return (
      <div class="flex justify-center p-8">
        <div class="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  const defaultProvider = settings.value["email.default_provider"] || "brevo";
  const hasBrevo = !!(settings.value["smtp.api_key"] && !settings.value["smtp.api_key"].endsWith("****") ? settings.value["smtp.api_key"] : settings.value["smtp.api_key"]?.replace(/\*+$/, ""));
  const hasMailerLite = !!(settings.value["email.mailerlite_api_key"] && !settings.value["email.mailerlite_api_key"].endsWith("****") ? settings.value["email.mailerlite_api_key"] : settings.value["email.mailerlite_api_key"]?.replace(/\*+$/, ""));
  const hasBoth = hasBrevo && hasMailerLite;

  return (
    <div class="space-y-6">
      {error.value && (
        <div class="rounded bg-failure/20 px-3 py-2 text-sm text-failure">
          {error.value}
        </div>
      )}
      {success.value && (
        <div class="rounded bg-success/20 px-3 py-2 text-sm text-success">
          {success.value}
        </div>
      )}

      {/* Sender Info */}
      <div class="rounded-lg border border-border bg-elevated p-6">
        <h3 class="mb-4 text-sm font-semibold text-text">Sender</h3>
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="mb-1 block text-xs font-medium text-muted">From Email</label>
            <input
              type="email"
              value={settings.value["smtp.from_email"] || ""}
              onInput$={(e: InputEvent) => updateSetting("smtp.from_email", (e.target as HTMLInputElement).value)}
              placeholder="noreply@build.biswas.me"
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-muted">From Name</label>
            <input
              type="text"
              value={settings.value["smtp.from_name"] || ""}
              onInput$={(e: InputEvent) => updateSetting("smtp.from_name", (e.target as HTMLInputElement).value)}
              placeholder="BuildMe"
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted"
            />
          </div>
        </div>
      </div>

      {/* Provider Cards */}
      <div class="grid gap-4 sm:grid-cols-2">
        {/* Brevo */}
        <div class={`rounded-lg border bg-elevated p-5 ${defaultProvider === "brevo" ? "border-accent" : "border-border"}`}>
          <div class="mb-3 flex items-center justify-between">
            <h3 class="text-sm font-semibold text-text">Brevo</h3>
            {defaultProvider === "brevo" && (
              <span class="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">Default</span>
            )}
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-muted">API Key</label>
            <input
              type="password"
              value={settings.value["smtp.api_key"] || ""}
              onInput$={(e: InputEvent) => updateSetting("smtp.api_key", (e.target as HTMLInputElement).value)}
              placeholder="xkeysib-..."
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted"
            />
          </div>
          {hasBrevo && (
            <div class="mt-3 flex gap-2">
              <button
                onClick$={() => testEmail("brevo")}
                disabled={testingProvider.value !== null || !testTo.value}
                class="rounded px-3 py-1.5 text-xs font-medium text-accent border border-accent/30 hover:bg-accent/10 disabled:opacity-50"
              >
                {testingProvider.value === "brevo" ? "Sending..." : "Test"}
              </button>
              {hasBoth && defaultProvider !== "brevo" && (
                <button
                  onClick$={() => updateSetting("email.default_provider", "brevo")}
                  class="rounded px-3 py-1.5 text-xs text-muted hover:text-text"
                >
                  Set Default
                </button>
              )}
            </div>
          )}
        </div>

        {/* MailerLite (MailerSend) */}
        <div class={`rounded-lg border bg-elevated p-5 ${defaultProvider === "mailerlite" ? "border-accent" : "border-border"}`}>
          <div class="mb-3 flex items-center justify-between">
            <h3 class="text-sm font-semibold text-text">MailerLite</h3>
            {defaultProvider === "mailerlite" && (
              <span class="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">Default</span>
            )}
          </div>
          <p class="mb-2 text-xs text-muted">Uses MailerSend API for transactional email</p>
          <div>
            <label class="mb-1 block text-xs font-medium text-muted">MailerSend API Key</label>
            <input
              type="password"
              value={settings.value["email.mailerlite_api_key"] || ""}
              onInput$={(e: InputEvent) => updateSetting("email.mailerlite_api_key", (e.target as HTMLInputElement).value)}
              placeholder="mlsn...."
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted"
            />
          </div>
          {hasMailerLite && (
            <div class="mt-3 flex gap-2">
              <button
                onClick$={() => testEmail("mailerlite")}
                disabled={testingProvider.value !== null || !testTo.value}
                class="rounded px-3 py-1.5 text-xs font-medium text-accent border border-accent/30 hover:bg-accent/10 disabled:opacity-50"
              >
                {testingProvider.value === "mailerlite" ? "Sending..." : "Test"}
              </button>
              {hasBoth && defaultProvider !== "mailerlite" && (
                <button
                  onClick$={() => updateSetting("email.default_provider", "mailerlite")}
                  class="rounded px-3 py-1.5 text-xs text-muted hover:text-text"
                >
                  Set Default
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Test email recipient + Save */}
      <div class="rounded-lg border border-border bg-elevated p-6">
        <div class="mb-4">
          <label class="mb-1 block text-xs font-medium text-muted">Test Recipient</label>
          <input
            type="email"
            bind:value={testTo}
            placeholder="recipient@example.com"
            class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted"
          />
          {!testTo.value && (hasBrevo || hasMailerLite) && (
            <p class="mt-1 text-xs text-muted">Enter an email to enable the Test buttons above</p>
          )}
        </div>
        <button
          onClick$={save}
          disabled={saving.value}
          class="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving.value ? "Saving..." : "Save Settings"}
        </button>
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
