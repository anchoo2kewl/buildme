import { component$, useSignal, useVisibleTask$, useComputed$, $ } from "@builder.io/qwik";
import { get, post, del } from "~/lib/api";
import type { APIKey } from "~/lib/types";

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default component$(() => {
  const keys = useSignal<APIKey[]>([]);
  const loading = useSignal(true);
  const error = useSignal("");
  const creating = useSignal(false);
  const newKeyName = useSignal("");
  const newKeyRevealed = useSignal<string | null>(null);

  const loadKeys = $(async () => {
    try {
      keys.value = await get<APIKey[]>("/api-keys");
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : "Failed to load";
    }
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    await loadKeys();
    loading.value = false;
  });

  const keyCount = useComputed$(() => keys.value.length);

  const handleCreate = $(async () => {
    if (!newKeyName.value.trim()) return;
    creating.value = true;
    try {
      const created = await post<APIKey>("/api-keys", { name: newKeyName.value.trim() });
      if (created.key) {
        newKeyRevealed.value = created.key;
      }
      newKeyName.value = "";
      await loadKeys();
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : "Failed to create key";
    } finally {
      creating.value = false;
    }
  });

  const handleRevoke = $(async (id: number) => {
    try {
      await del(`/api-keys/${id}`);
      await loadKeys();
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : "Failed to revoke key";
    }
  });

  const tools = [
    { name: "watch_builds", desc: "Stream build status for a project" },
    { name: "restart_build", desc: "Re-trigger a build by ID" },
    { name: "read_host", desc: "Get current metrics for a host" },
    { name: "get_incident", desc: "Fetch incident details by ID" },
    { name: "ack_incident", desc: "Acknowledge an open incident" },
    { name: "list_projects", desc: "List all projects with status" },
    { name: "get_drift", desc: "Get deployment drift summary" },
  ];

  return (
    <div>
      <div class="page-top">
        <div class="breadcrumb">
          workspace <span>/</span> <b>mcp keys</b>
        </div>
        <div class="page-top-actions">
          <button class="btn btn-primary" onClick$={handleCreate} disabled={creating.value || !newKeyName.value.trim()}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 1.5v11M1.5 7h11" /></svg>
            Create key
          </button>
        </div>
      </div>

      {loading.value ? (
        <div class="greet"><div><h1>Loading...</h1><p class="sub-row"><span class="liveping"><span class="d"></span> connecting</span></p></div></div>
      ) : error.value && keys.value.length === 0 ? (
        <div class="greet"><div><h1>MCP keys</h1><p style={{ color: "var(--danger)" }}>{error.value}</p></div></div>
      ) : (
        <>
          <div class="greet">
            <div>
              <h1>MCP keys <em>· {keyCount.value} issued</em></h1>
              <p class="sub-row">
                <span class="liveping"><span class="d"></span> server live · mcp.build.biswas.me</span>
              </p>
            </div>
          </div>

          {error.value && (
            <div class="panel" style={{ marginBottom: 16, border: "1px solid var(--danger)" }}>
              <div class="panel-body"><p style={{ color: "var(--danger)", margin: 0, fontSize: 13 }}>{error.value}</p></div>
            </div>
          )}

          {newKeyRevealed.value && (
            <div class="panel" style={{ marginBottom: 16, border: "1px solid var(--accent)" }}>
              <div class="panel-body">
                <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 500 }}>New key created — copy it now, it won't be shown again:</p>
                <code style={{ fontFamily: "var(--mono)", fontSize: 12, wordBreak: "break-all", background: "var(--bg-2)", padding: "8px 12px", borderRadius: 6, display: "block" }}>{newKeyRevealed.value}</code>
                <button class="btn btn-outline" style={{ marginTop: 8, fontSize: 11, padding: "3px 10px" }} onClick$={() => { newKeyRevealed.value = null; }}>Dismiss</button>
              </div>
            </div>
          )}

          <div class="sub-grid c2">
            {/* Left column */}
            <div>
              {/* Create key input */}
              <div class="panel" style={{ marginBottom: 16 }}>
                <div class="panel-body" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="text"
                    placeholder="Key name (e.g. claude-desktop)"
                    value={newKeyName.value}
                    onInput$={(e) => { newKeyName.value = (e.target as HTMLInputElement).value; }}
                    style={{ flex: 1, fontFamily: "var(--mono)", fontSize: 12, padding: "6px 10px", background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 6, color: "var(--text-1)" }}
                    onKeyDown$={(e) => { if (e.key === "Enter") handleCreate(); }}
                  />
                  <button class="btn btn-primary" style={{ padding: "6px 14px", fontSize: 12 }} onClick$={handleCreate} disabled={creating.value || !newKeyName.value.trim()}>
                    {creating.value ? "Creating..." : "Create"}
                  </button>
                </div>
              </div>

              {/* Active keys */}
              <div class="panel">
                <div class="panel-head">
                  <h3>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M8 1.5l4.5 4.5-7 7H1v-4.5z" /><path d="M6.5 3l4.5 4.5" /></svg>
                    Active keys <span class="cnt">{keyCount.value}</span>
                  </h3>
                </div>
                <div class="panel-body p0">
                  {keys.value.length === 0 ? (
                    <div style={{ padding: "24px 20px", textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>
                      No API keys created yet. Create one above to connect MCP clients.
                    </div>
                  ) : (
                    keys.value.map((k) => (
                      <div class="mcp-key-row" key={k.id}>
                        <div class="kname">
                          <b>{k.name}</b>
                          <small>created {timeAgo(k.created_at)}</small>
                        </div>
                        <div class="ktoken">{k.key_prefix}...</div>
                        <div class="kuse">
                          {k.expires_at ? `expires ${formatDate(k.expires_at)}` : "no expiry"}
                        </div>
                        <button class="btn btn-outline" style={{ padding: "3px 8px", fontSize: "11px" }} onClick$={() => handleRevoke(k.id)}>Revoke</button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right column */}
            <div>
              {/* MCP config */}
              <div class="panel">
                <div class="panel-head">
                  <h3>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 1.5h6l2.5 3v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V2.5a1 1 0 0 1 1-1z" /><polyline points="10 1.5 10 4.5 12.5 4.5" /></svg>
                    claude_desktop_config.json
                  </h3>
                </div>
                <div class="panel-body p0">
                  <div class="mcp-code">
                    <div class="cpath">
                      <span>~/.config/claude/claude_desktop_config.json</span>
                    </div>
                    <pre>{`{
  `}<span class="k">"mcpServers"</span>{`: {
    `}<span class="k">"buildme"</span>{`: {
      `}<span class="k">"url"</span>{`: `}<span class="s">"https://mcp.build.biswas.me/sse"</span>{`,
      `}<span class="k">"headers"</span>{`: {
        `}<span class="k">"Authorization"</span>{`: `}<span class="s">"Bearer {keys.value.length > 0 ? keys.value[0].key_prefix + "..." : "bm_sk_..."}"</span>{`
      }
    }
  }
}`}</pre>
                  </div>
                </div>
              </div>

              {/* Tools exposed */}
              <div class="panel">
                <div class="panel-head">
                  <h3>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 1.5L12.5 5.5 5.5 12.5H1.5V8.5z" /></svg>
                    Tools exposed <span class="cnt">{tools.length}</span>
                  </h3>
                </div>
                <div class="panel-body">
                  {tools.map((t) => (
                    <div key={t.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px dashed var(--line-soft)", fontSize: 13 }}>
                      <span style={{ fontFamily: "var(--mono)", fontSize: 12, fontWeight: 500 }}>{t.name}</span>
                      <span style={{ color: "var(--text-2)", fontSize: 12 }}>{t.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
});
