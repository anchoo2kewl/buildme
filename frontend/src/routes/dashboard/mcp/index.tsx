import { component$ } from "@builder.io/qwik";

export default component$(() => {
  const keys = [
    { name: "claude-desktop", token: "bm_sk_cl...x4fQ", scope: "read, write", lastUsed: "2 min ago", active: true },
    { name: "oncall-bot", token: "bm_sk_on...r8kP", scope: "read, ack_incident", lastUsed: "14 min ago", active: true },
    { name: "ci-ops", token: "bm_sk_ci...m2nJ", scope: "read, restart_build", lastUsed: "1h ago", active: true },
    { name: "demo-readonly", token: "bm_sk_dm...v0aW", scope: "read", lastUsed: "3d ago", active: false },
  ];

  const toolCalls = [
    { ts: "14:33", lv: "o", lvLabel: "CALL", msg: "claude-desktop → watch_builds(project=api-service)" },
    { ts: "14:31", lv: "o", lvLabel: "CALL", msg: "claude-desktop → get_incident(id=312)" },
    { ts: "14:28", lv: "i", lvLabel: "OK", msg: "oncall-bot → ack_incident(id=312) → 200" },
    { ts: "14:22", lv: "o", lvLabel: "CALL", msg: "ci-ops → restart_build(id=1847)" },
    { ts: "14:18", lv: "i", lvLabel: "OK", msg: "ci-ops → restart_build(id=1847) → 200" },
    { ts: "14:05", lv: "w", lvLabel: "WARN", msg: "demo-readonly → restart_build(id=1844) → 403 forbidden" },
    { ts: "13:52", lv: "o", lvLabel: "CALL", msg: "claude-desktop → read_host(name=prod-worker-01)" },
    { ts: "13:48", lv: "i", lvLabel: "OK", msg: "claude-desktop → read_host → 200 (cpu:87%)" },
  ];

  const tools = [
    { name: "watch_builds", desc: "Stream build status for a project" },
    { name: "restart_build", desc: "Re-trigger a build by ID" },
    { name: "read_host", desc: "Get current metrics for a host" },
    { name: "get_incident", desc: "Fetch incident details by ID" },
    { name: "ack_incident", desc: "Acknowledge an open incident" },
  ];

  return (
    <div>
      <div class="page-top">
        <div class="breadcrumb">
          workspace <span>/</span> <b>mcp keys</b>
        </div>
        <div class="page-top-actions">
          <button class="btn btn-outline">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12.5V4.5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v8" /><path d="M1 12.5h12" /><line x1="5" y1="6" x2="9" y2="6" /><line x1="5" y1="8.5" x2="8" y2="8.5" /></svg>
            Install docs
          </button>
          <button class="btn btn-primary">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 1.5v11M1.5 7h11" /></svg>
            Create key
          </button>
        </div>
      </div>

      <div class="greet">
        <div>
          <h1>MCP keys <em>· 4 issued · 2 active in last hour</em></h1>
          <p class="sub-row">
            <span class="liveping"><span class="d"></span> streaming</span>
          </p>
        </div>
      </div>

      <div class="sub-grid c2">
        {/* Left column */}
        <div>
          {/* Active keys */}
          <div class="panel">
            <div class="panel-head">
              <h3>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M8 1.5l4.5 4.5-7 7H1v-4.5z" /><path d="M6.5 3l4.5 4.5" /></svg>
                Active keys <span class="cnt">4</span>
              </h3>
            </div>
            <div class="panel-body p0">
              {keys.map((k) => (
                <div class="mcp-key-row" key={k.name}>
                  <div class="kname">
                    <b>{k.name}</b>
                    <small>{k.active ? "active" : "inactive"}</small>
                  </div>
                  <div class="ktoken">{k.token}</div>
                  <div class="kscope">{k.scope}</div>
                  <div class="kuse">{k.lastUsed}</div>
                  <button class="btn btn-outline" style={{ padding: "3px 8px", fontSize: "11px" }}>Revoke</button>
                </div>
              ))}
            </div>
          </div>

          {/* Tool call activity */}
          <div class="panel">
            <div class="panel-head">
              <h3>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="1.5 10 4.5 4 7.5 8 10.5 2 12.5 6" /></svg>
                Tool call activity
              </h3>
            </div>
            <div class="panel-body">
              <div class="logtail">
                {toolCalls.map((l, i) => (
                  <div class="l" key={i}>
                    <span class="ts">{l.ts}</span>
                    <span class={`lv ${l.lv}`}>{l.lvLabel}</span>
                    <span>{l.msg}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div>
          {/* claude_desktop_config.json */}
          <div class="panel">
            <div class="panel-head">
              <h3>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 1.5h6l2.5 3v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V2.5a1 1 0 0 1 1-1z" /><polyline points="10 1.5 10 4.5 12.5 4.5" /></svg>
                claude_desktop_config.json
              </h3>
              <div class="tools">
                <button class="btn btn-ghost" style={{ padding: "2px 6px", fontSize: "11px" }}>Copy</button>
              </div>
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
        `}<span class="k">"Authorization"</span>{`: `}<span class="s">"Bearer bm_sk_cl...x4fQ"</span>{`
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
                Tools exposed <span class="cnt">5</span>
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
    </div>
  );
});
