import { component$, useSignal, useContext, useVisibleTask$, $ } from "@builder.io/qwik";
import { useNavigate } from "@builder.io/qwik-city";
import { AuthContext } from "~/context/auth-context";
import { post, get, del, clearToken } from "~/lib/api";
import type { Invite, APIKey } from "~/lib/types";

const MCP_TOOLS = [
  "get_me", "get_dashboard", "get_drift", "list_projects", "get_project",
  "list_builds", "get_build", "sync_project", "retrigger_build",
  "watch_builds", "get_version", "health_check", "get_build_stats",
];

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

  // API Keys state
  const apiKeys = useSignal<APIKey[]>([]);
  const newKeyName = useSignal("");
  const newKeyExpiry = useSignal("");
  const createdKey = useSignal<string | null>(null);
  const keyError = useSignal("");
  const keyLoading = useSignal(false);
  const copiedKey = useSignal(false);

  // MCP copy state
  const copiedMcp = useSignal<string | null>(null);

  useVisibleTask$(async () => {
    try {
      invites.value = await get<Invite[]>("/invites");
    } catch {
      // ignore
    }
    try {
      apiKeys.value = await get<APIKey[]>("/api-keys");
    } catch {
      // ignore
    }
  });

  const createApiKey = $(async () => {
    if (!newKeyName.value.trim()) return;
    keyLoading.value = true;
    keyError.value = "";
    createdKey.value = null;
    try {
      const body: Record<string, string> = { name: newKeyName.value };
      if (newKeyExpiry.value) body.expires_in = newKeyExpiry.value;
      const result = await post<APIKey>("/api-keys", body);
      createdKey.value = result.key || null;
      apiKeys.value = [result, ...apiKeys.value];
      newKeyName.value = "";
      newKeyExpiry.value = "";
    } catch (e: any) {
      keyError.value = e.message;
    } finally {
      keyLoading.value = false;
    }
  });

  const deleteApiKey = $(async (id: number) => {
    try {
      await del(`/api-keys/${id}`);
      apiKeys.value = apiKeys.value.filter((k) => k.id !== id);
    } catch (e: any) {
      keyError.value = e.message;
    }
  });

  const copyToClipboard = $(async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      copiedMcp.value = key;
      setTimeout(() => (copiedMcp.value = null), 2000);
    } catch {
      // fallback
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

      {/* API Keys Section */}
      <section class="mb-8 rounded-lg border border-border bg-elevated p-6">
        <h2 class="mb-4 text-lg font-semibold text-text">API Keys</h2>

        {keyError.value && (
          <div class="mb-3 rounded bg-failure/20 px-3 py-2 text-sm text-failure">
            {keyError.value}
          </div>
        )}

        {createdKey.value && (
          <div class="mb-4 rounded-lg border border-warning/30 bg-warning/10 p-3">
            <p class="mb-2 text-xs font-medium text-warning">
              Copy this key now — you won't be able to see it again.
            </p>
            <div class="flex items-center gap-2">
              <code class="flex-1 break-all rounded bg-surface px-2 py-1 font-mono text-xs text-text">
                {createdKey.value}
              </code>
              <button
                onClick$={async () => {
                  try {
                    await navigator.clipboard.writeText(createdKey.value!);
                    copiedKey.value = true;
                    setTimeout(() => (copiedKey.value = false), 2000);
                  } catch {
                    // fallback
                  }
                }}
                class="rounded px-2 py-1 text-xs text-accent hover:bg-accent/10"
              >
                {copiedKey.value ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        )}

        <div class="mb-4 flex gap-2">
          <input
            type="text"
            bind:value={newKeyName}
            placeholder="Key name (e.g. Claude Code)"
            class="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted"
          />
          <select
            bind:value={newKeyExpiry}
            class="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
          >
            <option value="">No expiry</option>
            <option value="30d">30 days</option>
            <option value="90d">90 days</option>
            <option value="365d">1 year</option>
          </select>
          <button
            onClick$={createApiKey}
            disabled={keyLoading.value || !newKeyName.value.trim()}
            class="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {keyLoading.value ? "..." : "Create"}
          </button>
        </div>

        {apiKeys.value.length === 0 ? (
          <p class="text-sm text-muted">No API keys created yet.</p>
        ) : (
          <div class="space-y-2">
            {apiKeys.value.map((key) => (
              <div
                key={key.id}
                class="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2"
              >
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-medium text-text">{key.name}</span>
                    <span class="font-mono text-xs text-muted">{key.key_prefix}...</span>
                  </div>
                  <div class="flex gap-3 text-xs text-muted">
                    <span>Created {new Date(key.created_at).toLocaleDateString()}</span>
                    {key.expires_at && (
                      <span>
                        Expires {new Date(key.expires_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick$={() => deleteApiKey(key.id)}
                  class="ml-2 rounded px-2 py-1 text-xs text-failure hover:bg-failure/10"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* MCP Server Section */}
      <section class="mb-8 rounded-lg border border-border bg-elevated p-6">
        <h2 class="mb-4 text-lg font-semibold text-text">MCP Server</h2>

        <div class="space-y-4">
          <div>
            <label class="mb-1 block text-sm font-medium text-muted">Endpoint</label>
            <div class="flex items-center gap-2">
              <code class="flex-1 rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm text-text">
                https://build.biswas.me/api/mcp
              </code>
              <button
                onClick$={() => copyToClipboard("https://build.biswas.me/api/mcp", "endpoint")}
                class="rounded px-2 py-1 text-xs text-accent hover:bg-accent/10"
              >
                {copiedMcp.value === "endpoint" ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>

          <div>
            <label class="mb-2 block text-sm font-medium text-muted">Available Tools</label>
            <div class="flex flex-wrap gap-1.5">
              {MCP_TOOLS.map((tool) => (
                <span
                  key={tool}
                  class="rounded-full bg-accent/10 px-2.5 py-0.5 font-mono text-xs text-accent"
                >
                  {tool}
                </span>
              ))}
            </div>
          </div>

          <div>
            <label class="mb-1 block text-sm font-medium text-muted">
              Claude Code Config
            </label>
            <div class="relative">
              <pre class="overflow-x-auto rounded-lg border border-border bg-surface p-3 font-mono text-xs text-text">
{`{
  "mcpServers": {
    "buildme": {
      "command": "npx",
      "args": [
        "-y", "@anthropic-ai/mcp-remote",
        "https://build.biswas.me/api/mcp",
        "--header",
        "Authorization:ApiKey YOUR_API_KEY"
      ]
    }
  }
}`}
              </pre>
              <button
                onClick$={() => copyToClipboard(JSON.stringify({
                  mcpServers: {
                    buildme: {
                      command: "npx",
                      args: [
                        "-y", "@anthropic-ai/mcp-remote",
                        "https://build.biswas.me/api/mcp",
                        "--header",
                        "Authorization:ApiKey YOUR_API_KEY",
                      ],
                    },
                  },
                }, null, 2), "config")}
                class="absolute right-2 top-2 rounded px-2 py-1 text-xs text-accent hover:bg-accent/10"
              >
                {copiedMcp.value === "config" ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>

          <div class="rounded-lg border border-border bg-surface p-3">
            <p class="text-xs text-muted">
              <span class="font-medium text-text">Auth:</span>{" "}
              Include your API key in the <code class="text-accent">Authorization</code> header
              as <code class="text-accent">ApiKey YOUR_API_KEY</code>.
              Create an API key above to get started.
            </p>
          </div>
        </div>
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
