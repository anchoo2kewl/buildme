import { component$ } from "@builder.io/qwik";
import { useNavigate } from "@builder.io/qwik-city";

export default component$(() => {
  const nav = useNavigate();
  return (
    <>
      {/* ============ NAV ============ */}
      <nav class="nav">
        <div class="nav-inner">
          <a href="/" class="brand">
            <span class="brand-mark">b</span>
            <span class="brand-name">BuildMe <em>/ self-hosted</em></span>
          </a>
          <div class="nav-tabs">
            <a href="#features" class="nav-tab">Features</a>
            <a href="#monitoring" class="nav-tab">Monitoring</a>
            <a href="#teams" class="nav-tab">Teams</a>
            <a href="#mcp" class="nav-tab">MCP</a>
            <a href="https://docs.build.biswas.me" class="nav-tab">Docs</a>
            <a href="#changelog" class="nav-tab">Changelog</a>
          </div>
          <div class="nav-right">
            <a href="/auth/login" class="btn btn-ghost">Sign in</a>
            <button class="btn btn-primary" onClick$={() => nav("/dashboard")}>
              Open dashboard <kbd class="kbd">⌘K</kbd>
            </button>
          </div>
        </div>
      </nav>

      {/* ============ HERO ============ */}
      <section class="hero">
        <div class="hero-grid"></div>
        <div class="container hero-inner">
          {/* Left column */}
          <div>
            <div class="eyebrow">
              <span class="dot"></span>
              Now with MCP for AI agents
              <span class="tag">v2.4</span>
            </div>
            <h1 class="display">
              Complete visibility into every build, host &amp; <em>team.</em>
            </h1>
            <p class="sub">
              BuildMe is a self-hosted build intelligence platform. Monitor CI/CD pipelines, track server
              health, manage incidents, coordinate teams — and let AI agents act on all of it through MCP.
            </p>
            <div class="cta-row">
              <button class="btn btn-primary" onClick$={() => nav("/dashboard")}>Open the dashboard</button>
              <a href="https://docs.build.biswas.me" class="btn btn-outline">Read the docs</a>
              <span class="hint">No credit card required</span>
            </div>
            <div class="hero-stats">
              <div class="hero-stat">
                <b>3</b>
                <span>CI Providers</span>
              </div>
              <div class="hero-stat">
                <b>5+</b>
                <span>Probe regions</span>
              </div>
              <div class="hero-stat">
                <b>∞</b>
                <span>Projects</span>
              </div>
            </div>
          </div>

          {/* Right column — monitor card */}
          <div class="monitor-card">
            <div class="mc-head">
              <div class="lights">
                <span></span><span></span><span></span>
              </div>
              <span class="path">builds / <b>all projects</b></span>
              <span class="pulse"></span>
            </div>
            <div class="mc-tabs">
              <span class="mc-tab active">all builds <span class="cnt">147</span></span>
              <span class="mc-tab">running <span class="cnt">4</span></span>
              <span class="mc-tab">failed <span class="cnt">2</span></span>
              <span class="mc-tab">hosts</span>
              <span class="mc-tab">incidents</span>
            </div>
            <div class="mc-body">
              {/* Row 1 — ok */}
              <div class="build-row">
                <span class="ico ok">
                  <svg viewBox="0 0 14 14" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.4">
                    <path d="M3 7.5l3 3 5-6" />
                  </svg>
                </span>
                <div class="meta"><b>api-service</b><small>deploy #312</small></div>
                <span class="branch">
                  <svg viewBox="0 0 14 14" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M7 1v8M4 4l3-3 3 3" /><circle cx="4" cy="12" r="1.5" /><circle cx="10" cy="12" r="1.5" /></svg>
                  main <span class="sha">a3f2c1d</span>
                </span>
                <span class="dur">1m 42s</span>
                <span class="prov gh">GH</span>
              </div>
              {/* Row 2 — running */}
              <div class="build-row">
                <span class="ico run">
                  <svg viewBox="0 0 14 14" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.4">
                    <path d="M7 1v6l4 2" />
                  </svg>
                </span>
                <div class="meta"><b>frontend</b><small>test #891</small></div>
                <span class="branch">
                  <svg viewBox="0 0 14 14" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M7 1v8M4 4l3-3 3 3" /><circle cx="4" cy="12" r="1.5" /><circle cx="10" cy="12" r="1.5" /></svg>
                  feat/ui <span class="sha">e7b4a91</span>
                </span>
                <span class="dur">0m 38s</span>
                <span class="prov gh">GH</span>
              </div>
              {/* Row 3 — fail */}
              <div class="build-row">
                <span class="ico fail">
                  <svg viewBox="0 0 14 14" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.4">
                    <path d="M4 4l6 6M10 4l-6 6" />
                  </svg>
                </span>
                <div class="meta"><b>worker</b><small>deploy #204</small></div>
                <span class="branch">
                  <svg viewBox="0 0 14 14" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M7 1v8M4 4l3-3 3 3" /><circle cx="4" cy="12" r="1.5" /><circle cx="10" cy="12" r="1.5" /></svg>
                  main <span class="sha">c90fd3e</span>
                </span>
                <span class="dur">4m 11s</span>
                <span class="prov tv">TV</span>
              </div>
              {/* Row 4 — ok */}
              <div class="build-row">
                <span class="ico ok">
                  <svg viewBox="0 0 14 14" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.4">
                    <path d="M3 7.5l3 3 5-6" />
                  </svg>
                </span>
                <div class="meta"><b>docs-site</b><small>build #77</small></div>
                <span class="branch">
                  <svg viewBox="0 0 14 14" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M7 1v8M4 4l3-3 3 3" /><circle cx="4" cy="12" r="1.5" /><circle cx="10" cy="12" r="1.5" /></svg>
                  main <span class="sha">1fd8b3a</span>
                </span>
                <span class="dur">0m 54s</span>
                <span class="prov cc">CC</span>
              </div>
              {/* Row 5 — queued */}
              <div class="build-row">
                <span class="ico queue">
                  <svg viewBox="0 0 14 14" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.4">
                    <circle cx="7" cy="7" r="3" />
                  </svg>
                </span>
                <div class="meta"><b>analytics</b><small>test #512</small></div>
                <span class="branch">
                  <svg viewBox="0 0 14 14" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M7 1v8M4 4l3-3 3 3" /><circle cx="4" cy="12" r="1.5" /><circle cx="10" cy="12" r="1.5" /></svg>
                  staging <span class="sha">b42ea90</span>
                </span>
                <span class="dur">—</span>
                <span class="prov gh">GH</span>
              </div>
            </div>
            <div class="mc-foot">
              <span>5 builds · last refresh 2s ago</span>
              <span class="wsstat"><span class="d"></span> ws connected</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============ PROVIDERS ============ */}
      <div class="providers">
        <span class="label">WORKS WITH YOUR CI</span>
        <span class="pchip">
          <svg viewBox="0 0 14 14" width="14" height="14" fill="currentColor">
            <path d="M7 .5C3.41.5.5 3.41.5 7c0 2.87 1.86 5.3 4.44 6.16.33.06.44-.14.44-.31v-1.21c-1.81.39-2.19-.77-2.19-.77-.3-.75-.72-.95-.72-.95-.59-.4.04-.39.04-.39.65.05 1 .67 1 .67.58.99 1.52.7 1.89.54.06-.42.23-.7.41-.87-1.44-.16-2.96-.72-2.96-3.21 0-.71.25-1.29.67-1.74-.07-.16-.29-.83.06-1.72 0 0 .55-.17 1.79.66a6.2 6.2 0 013.26 0c1.24-.84 1.79-.66 1.79-.66.35.9.13 1.56.07 1.72.42.45.67 1.03.67 1.74 0 2.5-1.52 3.04-2.97 3.2.23.2.45.59.45 1.2v1.78c0 .17.12.38.45.31C11.64 12.3 13.5 9.87 13.5 7c0-3.59-2.91-6.5-6.5-6.5z" />
          </svg>
          GitHub Actions
        </span>
        <span class="pchip">Travis CI</span>
        <span class="pchip">CircleCI</span>
        <span class="pchip">+ webhooks, REST, MCP</span>
      </div>

      {/* ============ BENTO FEATURE GRID ============ */}
      <section id="features" class="section">
        <div class="container">
          <div class="section-head">
            <div>
              <div class="section-kicker">Platform</div>
              <h2 class="section-title">One platform. Everything <em>covered.</em></h2>
              <p class="section-sub">
                From build pipelines to server health, incidents to team access control —
                BuildMe brings it all into a single self-hosted platform.
              </p>
            </div>
          </div>

          <div class="bento">
            {/* Unified CI — c4 */}
            <div class="bf c4">
              <div class="bf-icon">
                <svg viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4">
                  <rect x="1" y="1" width="5" height="5" rx="1" />
                  <rect x="8" y="1" width="5" height="5" rx="1" />
                  <rect x="1" y="8" width="5" height="5" rx="1" />
                  <rect x="8" y="8" width="5" height="5" rx="1" />
                </svg>
              </div>
              <h3>Unified CI Dashboard</h3>
              <p>One view for GitHub Actions, Travis CI, and CircleCI. Filter by environment, branch, or status across all your repos.</p>
              <div class="bf-visual">
                <div class="build-row">
                  <span class="ico ok">
                    <svg viewBox="0 0 14 14" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M3 7.5l3 3 5-6" /></svg>
                  </span>
                  <div class="meta"><b>api-service</b><small>deploy #312</small></div>
                  <span class="branch">main <span class="sha">a3f2c1d</span></span>
                  <span class="dur">1m 42s</span>
                  <span class="prov gh">GH</span>
                </div>
                <div class="build-row">
                  <span class="ico run">
                    <svg viewBox="0 0 14 14" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M7 1v6l4 2" /></svg>
                  </span>
                  <div class="meta"><b>frontend</b><small>test #891</small></div>
                  <span class="branch">feat/ui <span class="sha">e7b4a91</span></span>
                  <span class="dur">0m 38s</span>
                  <span class="prov gh">GH</span>
                </div>
                <div class="build-row">
                  <span class="ico fail">
                    <svg viewBox="0 0 14 14" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M4 4l6 6M10 4l-6 6" /></svg>
                  </span>
                  <div class="meta"><b>worker</b><small>deploy #204</small></div>
                  <span class="branch">main <span class="sha">c90fd3e</span></span>
                  <span class="dur">4m 11s</span>
                  <span class="prov tv">TV</span>
                </div>
              </div>
            </div>

            {/* WebSocket — c2 */}
            <div class="bf c2">
              <div class="bf-icon">
                <svg viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4">
                  <path d="M1 7h3l2-4 2 8 2-4h3" />
                </svg>
              </div>
              <h3>Real-Time WebSocket</h3>
              <p>Live build events the moment they happen. No polling required.</p>
              <div class="bf-visual">
                <div class="logtail">
                  <div class="l"><span class="ts">14:32:01</span><span class="lv o">ws</span><span>connected to wss://build.biswas.me</span></div>
                  <div class="l"><span class="ts">14:32:02</span><span class="lv i">build</span><span>api-service #312 started</span></div>
                  <div class="l"><span class="ts">14:32:18</span><span class="lv i">build</span><span>frontend #891 tests passing</span></div>
                  <div class="l"><span class="ts">14:32:44</span><span class="lv e">build</span><span>worker #204 deploy failed</span></div>
                  <div class="l"><span class="ts">14:33:01</span><span class="lv w">host</span><span>prod-web-01 CPU 89%</span></div>
                  <div class="l"><span class="ts">14:33:12</span><span class="lv o">ws</span><span>heartbeat ok</span></div>
                </div>
              </div>
            </div>

            {/* Drift detection — c3 */}
            <div class="bf c3">
              <div class="bf-icon">
                <svg viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4">
                  <circle cx="4" cy="4" r="2" />
                  <circle cx="10" cy="10" r="2" />
                  <path d="M6 4h4v6" />
                </svg>
              </div>
              <h3>Environment Drift</h3>
              <p>Compare deployed SHAs against branch heads. See when staging or production falls behind.</p>
              <div class="bf-visual">
                <div class="drift">
                  <div class="drift-env">
                    <h5>STAGING <span style={{ color: "var(--accent)" }}>in sync</span></h5>
                    <div class="sha">api-service <span>a3f2c1d</span></div>
                    <div class="sha">frontend <span>e7b4a91</span></div>
                    <div class="sha">worker <span>c90fd3e</span></div>
                  </div>
                  <div class="drift-env behind">
                    <h5>PRODUCTION <span>3 behind</span></h5>
                    <div class="sha">api-service <span>7de14ab</span></div>
                    <div class="sha">frontend <span>1c3b0fa</span></div>
                    <div class="sha">worker <span>89ae2c1</span></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Host monitoring — c3 */}
            <div id="monitoring" class="bf c3">
              <div class="bf-icon">
                <svg viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4">
                  <rect x="2" y="2" width="10" height="8" rx="1" />
                  <path d="M5 13h4M7 10v3" />
                </svg>
              </div>
              <h3>Host Monitoring</h3>
              <p>Lightweight agent reports CPU, memory, disk. Alerts on threshold breaches.</p>
              <div class="bf-visual">
                <div class="host-visual">
                  <div class="host-row">
                    <b>prod-web-01</b>
                    <span class="online">online</span>
                  </div>
                  <div class="host-metric">
                    <span>CPU</span>
                    <div class="track"><div style={{ width: "34%" }}></div></div>
                    <span class="val">34%</span>
                  </div>
                  <div class="host-metric warn">
                    <span>Memory</span>
                    <div class="track"><div style={{ width: "72%" }}></div></div>
                    <span class="val">72%</span>
                  </div>
                  <div class="host-metric">
                    <span>Disk</span>
                    <div class="track"><div style={{ width: "58%" }}></div></div>
                    <span class="val">58%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Incidents — c2 */}
            <div class="bf c2">
              <div class="bf-icon">
                <svg viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4">
                  <path d="M7 1l6 11H1L7 1zM7 5v3M7 10v.5" />
                </svg>
              </div>
              <h3>Incidents</h3>
              <p>Auto-detect, track, and resolve. Full timeline and audit trail.</p>
              <div class="bf-visual">
                <div class="inc-list">
                  <div class="inc">
                    <span class="s a"></span>
                    <span class="title">High CPU on prod-web-01<small>api-service · 4m ago</small></span>
                    <span class="t">active</span>
                  </div>
                  <div class="inc">
                    <span class="s a"></span>
                    <span class="title">Disk usage &gt; 90%<small>worker · 11m ago</small></span>
                    <span class="t">active</span>
                  </div>
                  <div class="inc">
                    <span class="s r"></span>
                    <span class="title">Build failure spike<small>frontend · 1h ago</small></span>
                    <span class="t">resolved</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Probes — c4 */}
            <div class="bf c4">
              <div class="bf-icon">
                <svg viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4">
                  <circle cx="7" cy="7" r="6" />
                  <path d="M1 7h12M7 1c-2 2-2 10 0 12M7 1c2 2 2 10 0 12" />
                </svg>
              </div>
              <h3>Distributed Probes</h3>
              <p>Multi-region health check agents verify uptime from Oregon, Frankfurt, Mumbai, and more. Global coverage with Docker-based agents.</p>
              <div class="bf-visual">
                <div class="probe-map">
                  {/* Simple world map outline */}
                  <svg viewBox="0 0 800 400" fill="none" stroke="var(--line)" stroke-width="0.6" opacity="0.5">
                    <path d="M120 140 Q160 120 200 130 Q240 115 280 125 L290 160 Q260 180 240 200 L200 210 Q160 195 140 180 Z" />
                    <path d="M300 100 Q380 80 460 90 Q520 85 560 100 L570 130 Q560 180 540 200 Q500 240 460 250 Q420 260 380 240 Q340 220 320 190 Q300 160 300 130 Z" />
                    <path d="M560 120 Q620 100 680 110 Q720 120 740 150 L730 200 Q700 230 660 240 Q620 235 590 210 Q560 180 560 150 Z" />
                    <path d="M200 260 Q240 250 280 270 Q300 290 280 320 Q250 340 220 330 Q200 310 200 280 Z" />
                    <path d="M580 260 Q620 250 660 270 Q680 300 660 330 Q630 350 600 340 Q580 310 580 280 Z" />
                  </svg>
                  <div class="probe-node" style={{ top: "38%", left: "18%" }}>
                    <div class="d"></div>
                    <span class="lbl">Oregon 12ms</span>
                  </div>
                  <div class="probe-node" style={{ top: "32%", left: "52%" }}>
                    <div class="d"></div>
                    <span class="lbl">Frankfurt 8ms</span>
                  </div>
                  <div class="probe-node" style={{ top: "50%", left: "68%" }}>
                    <div class="d"></div>
                    <span class="lbl">Mumbai 31ms</span>
                  </div>
                  <div class="probe-node" style={{ top: "35%", left: "28%" }}>
                    <div class="d"></div>
                    <span class="lbl">Virginia 5ms</span>
                  </div>
                  <div class="probe-node" style={{ top: "40%", left: "24%" }}>
                    <div class="d"></div>
                    <span class="lbl">Boston 2ms</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Teams — c3 */}
            <div id="teams" class="bf c3">
              <div class="bf-icon">
                <svg viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4">
                  <circle cx="5" cy="4" r="2" />
                  <circle cx="10" cy="4" r="2" />
                  <path d="M1 12c0-2 2-3 4-3s4 1 4 3M8 12c0-2 1.5-3 3-3s3 1 3 3" />
                </svg>
              </div>
              <h3>Team Collaboration</h3>
              <p>Role-based access per project and group. Invite-only with email codes.</p>
              <div class="bf-visual">
                <div class="team-visual">
                  <div class="team-row-sm">
                    <span class="av" style={{ background: "oklch(0.55 0.15 240)" }}>AC</span>
                    <span class="nm">Alice Chen<small>alice@example.com</small></span>
                    <span class="role owner">owner</span>
                    <span style={{ fontFamily: "var(--mono)", fontSize: "10.5px", color: "var(--text-3)" }}>8 proj</span>
                  </div>
                  <div class="team-row-sm">
                    <span class="av" style={{ background: "oklch(0.55 0.15 160)" }}>BS</span>
                    <span class="nm">Bob Smith<small>bob@example.com</small></span>
                    <span class="role">admin</span>
                    <span style={{ fontFamily: "var(--mono)", fontSize: "10.5px", color: "var(--text-3)" }}>6 proj</span>
                  </div>
                  <div class="team-row-sm">
                    <span class="av" style={{ background: "oklch(0.55 0.15 30)" }}>CD</span>
                    <span class="nm">Carol Davis<small>carol@example.com</small></span>
                    <span class="role">viewer</span>
                    <span style={{ fontFamily: "var(--mono)", fontSize: "10.5px", color: "var(--text-3)" }}>4 proj</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notifications — c3 */}
            <div class="bf c3">
              <div class="bf-icon">
                <svg viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4">
                  <path d="M7 1C4 1 3 3 3 5v3l-1.5 2H12.5L11 8V5c0-2-1-4-4-4zM5.5 12c.3.6.9 1 1.5 1s1.2-.4 1.5-1" />
                </svg>
              </div>
              <h3>Notifications</h3>
              <p>Route build and incident alerts to Slack, email, or webhooks per project.</p>
              <div class="bf-visual">
                <div class="chan-grid">
                  <div class="chan">
                    <svg viewBox="0 0 14 14" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.4">
                      <path d="M3 9l1-4M10 9l1-4M4 5h7M3 9h7" />
                    </svg>
                    Slack
                  </div>
                  <div class="chan">
                    <svg viewBox="0 0 14 14" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.4">
                      <rect x="1" y="3" width="12" height="9" rx="1" />
                      <path d="M1 4l6 4 6-4" />
                    </svg>
                    Email
                  </div>
                  <div class="chan">
                    <svg viewBox="0 0 14 14" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.4">
                      <path d="M2 7c2-3 4-3 5 0M7 7c1-3 3-3 5 0M7 7v5" />
                    </svg>
                    Webhooks
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ MCP SECTION ============ */}
      <section id="mcp" class="section">
        <div class="container">
          <div class="hero-inner" style={{ gap: "48px" }}>
            {/* Left — narrative */}
            <div>
              <div class="section-kicker">MCP Server</div>
              <h2 class="section-title">AI-native build <em>management.</em></h2>
              <p class="section-sub" style={{ marginBottom: "28px" }}>
                The BuildMe MCP server exposes your entire platform to AI coding agents. Query builds,
                cancel runaway pipelines, inspect drift, and watch progress — all through natural language
                in your editor.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {[
                  ["watch_builds", "adaptive 30s/5min polling with live state"],
                  ["cancel_build", "stop running builds without leaving your editor"],
                  ["restart_build", "re-trigger failed deploys instantly"],
                  ["get_drift", "compare deployed versions to branch heads"],
                  ["get_build_stats", "success rates, durations, and failure trends"],
                ].map(([cmd, desc]) => (
                  <div key={cmd} style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "13.5px", color: "var(--text-2)" }}>
                    <span style={{ color: "var(--accent)", marginTop: "2px", flexShrink: 0 }}>+</span>
                    <span>
                      <code style={{ background: "var(--surface)", padding: "2px 7px", borderRadius: "4px", fontSize: "12px", color: "var(--text)", border: "1px solid var(--line-soft)", fontFamily: "var(--mono)" }}>{cmd}</code>
                      {" — "}{desc}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — code blocks */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div class="mcp-code">
                <div class="cpath">
                  <span>~/.claude/settings.json</span>
                </div>
                <pre>
{`{`}
{"\n"}  <span class="k">"mcpServers"</span>: {`{`}
{"\n"}    <span class="k">"buildme"</span>: {`{`}
{"\n"}      <span class="k">"url"</span>: <span class="s">"https://mcp.build.biswas.me"</span>,
{"\n"}      <span class="k">"headers"</span>: {`{`}
{"\n"}        <span class="k">"X-API-Key"</span>: <span class="s">"bm_••••••••"</span>
{"\n"}      {`}`}
{"\n"}    {`}`}
{"\n"}  {`}`}
{"\n"}{`}`}
                </pre>
              </div>
              <div class="mcp-code">
                <div class="cpath">
                  <span>terminal</span>
                </div>
                <pre>
<span class="c"># Ask your AI agent to watch builds</span>
{"\n"}<span class="k">$</span> watch_builds
{"\n"}  <span class="s">api-service/main · deploy · running · 42s</span>
{"\n"}  <span class="s">frontend/main · test · queued</span>
{"\n"}
{"\n"}<span class="k">$</span> restart_build --project 2 --build 312
{"\n"}  <span class="s">retrigger requested</span>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ STEPS ============ */}
      <section class="section">
        <div class="container">
          <div class="section-head" style={{ justifyContent: "center" }}>
            <div style={{ textAlign: "center" }}>
              <div class="section-kicker">Getting Started</div>
              <h2 class="section-title" style={{ margin: "0 auto" }}>Up and running in <em>minutes.</em></h2>
            </div>
          </div>
          <div class="steps">
            <div class="step">
              <div class="step-num">STEP <b>01</b></div>
              <div class="step-title">Deploy</div>
              <div class="step-desc">Run the single Go binary on your server. SQLite included, no database setup required.</div>
            </div>
            <div class="step">
              <div class="step-num">STEP <b>02</b></div>
              <div class="step-title">Connect</div>
              <div class="step-desc">Add GitHub, Travis CI, or CircleCI providers with API tokens. Invite your team.</div>
            </div>
            <div class="step">
              <div class="step-num">STEP <b>03</b></div>
              <div class="step-title">Monitor</div>
              <div class="step-desc">See all builds, hosts, and incidents in real time. Set thresholds and notification channels.</div>
            </div>
            <div class="step">
              <div class="step-num">STEP <b>04</b></div>
              <div class="step-title">Automate</div>
              <div class="step-desc">Connect AI agents via MCP or use the REST API to automate your build workflows.</div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ CLOSING CTA ============ */}
      <section class="section">
        <div class="container">
          <div class="closing" style={{ textAlign: "center" }}>
            <h2 class="section-title" style={{ margin: "0 auto 12px", maxWidth: "600px", position: "relative" }}>
              Take control of your build <em>platform.</em>
            </h2>
            <p style={{ color: "var(--text-2)", marginBottom: "28px", position: "relative" }}>
              Invite-only access. Self-hosted. Your infrastructure, your data.
            </p>
            <div class="cta-row" style={{ justifyContent: "center", position: "relative" }}>
              <button class="btn btn-primary" onClick$={() => nav("/dashboard")}>Open the dashboard</button>
              <a href="/auth/login" class="btn btn-outline">Sign in</a>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer class="bm-footer">
        <div class="container">
          <div class="foot-inner">
            {/* About col */}
            <div class="foot-about">
              <div class="brand" style={{ marginBottom: "14px" }}>
                <span class="brand-mark">b</span>
                <span class="brand-name">BuildMe</span>
              </div>
              <p>
                Self-hosted build intelligence platform.
                Monitor CI/CD pipelines, track server health, manage incidents,
                and coordinate teams from a single dashboard.
              </p>
            </div>
            {/* Product col */}
            <div>
              <h5>Product</h5>
              <a href="#features">Features</a>
              <a href="#monitoring">Monitoring</a>
              <a href="#mcp">MCP Server</a>
              <a href="/dashboard">Dashboard</a>
            </div>
            {/* Resources col */}
            <div>
              <h5>Resources</h5>
              <a href="https://docs.build.biswas.me">Documentation</a>
              <a href="#changelog">Changelog</a>
              <a href="https://github.com/anshuman-biswas">GitHub</a>
              <a href="#">API Reference</a>
            </div>
            {/* Company col */}
            <div>
              <h5>Company</h5>
              <a href="https://biswas.me">About</a>
              <a href="/auth/login">Sign in</a>
              <a href="/auth/signup">Request access</a>
            </div>
          </div>
          <div class="foot-bottom">
            <span>&copy; 2026 BuildMe. All rights reserved.</span>
            <span>Built by Anshuman Biswas</span>
          </div>
        </div>
      </footer>
    </>
  );
});
