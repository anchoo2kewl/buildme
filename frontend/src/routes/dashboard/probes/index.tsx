import { component$ } from "@builder.io/qwik";

export default component$(() => {
  const regions = [
    { name: "us-east-1", status: "ok", latency: "204ms", p50: "198ms", p95: "312ms", checks: 4, polyline: "0,30 20,28 40,32 60,26 80,30 100,24 120,28 140,22 160,26 180,20 200,24" },
    { name: "us-west-2", status: "ok", latency: "188ms", p50: "182ms", p95: "290ms", checks: 3, polyline: "0,34 20,30 40,26 60,28 80,22 100,20 120,24 140,18 160,22 180,16 200,20" },
    { name: "eu-west-1", status: "warn", latency: "850ms", p50: "420ms", p95: "1.2s", checks: 3, polyline: "0,20 20,22 40,18 60,30 80,38 100,42 120,36 140,44 160,40 180,46 200,42" },
    { name: "ap-south-1", status: "ok", latency: "342ms", p50: "328ms", p95: "510ms", checks: 1, polyline: "0,32 20,34 40,30 60,28 80,32 100,26 120,30 140,24 160,28 180,22 200,26" },
    { name: "sa-east-1", status: "ok", latency: "298ms", p50: "284ms", p95: "462ms", checks: 1, polyline: "0,28 20,26 40,30 60,24 80,28 100,22 120,26 140,20 160,24 180,18 200,22" },
  ];

  const endpoints = [
    { url: "api.build.biswas.me/health", check: "HTTP 200", regions: 5, cadence: "30s", p50: "142ms", p95: "280ms", status: "ok", incident: "none" },
    { url: "app.build.biswas.me", check: "HTTP 200", regions: 5, cadence: "30s", p50: "204ms", p95: "410ms", status: "ok", incident: "none" },
    { url: "api.build.biswas.me/v2/builds", check: "HTTP 200", regions: 3, cadence: "60s", p50: "310ms", p95: "580ms", status: "ok", incident: "none" },
    { url: "mcp.build.biswas.me/health", check: "HTTP 200", regions: 5, cadence: "30s", p50: "98ms", p95: "190ms", status: "ok", incident: "none" },
    { url: "docs.build.biswas.me", check: "HTTP 200", regions: 3, cadence: "120s", p50: "180ms", p95: "340ms", status: "ok", incident: "none" },
    { url: "payments.build.biswas.me/health", check: "TCP + TLS", regions: 2, cadence: "30s", p50: "88ms", p95: "150ms", status: "ok", incident: "none" },
    { url: "eu-west-1 → api.build.biswas.me", check: "HTTP 200", regions: 1, cadence: "30s", p50: "420ms", p95: "1.2s", status: "warn", incident: "4h ago" },
  ];

  return (
    <div>
      <div class="page-top">
        <div class="breadcrumb">
          workspace <span>/</span> <b>probes</b>
        </div>
        <div class="page-top-actions">
          <div class="search">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="6.2" cy="6.2" r="4.5" /><path d="m12.5 12.5-3-3" /></svg>
            <input type="text" placeholder="Search probes..." />
          </div>
          <button class="btn btn-outline">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="7" cy="7" r="5.5" /><circle cx="7" cy="7" r="2" /><line x1="7" y1="1" x2="7" y2="2.5" /><line x1="7" y1="11.5" x2="7" y2="13" /><line x1="1" y1="7" x2="2.5" y2="7" /><line x1="11.5" y1="7" x2="13" y2="7" /></svg>
            Add endpoint
          </button>
        </div>
      </div>

      <div class="greet">
        <div>
          <h1>Distributed probes <em>· 5 regions · 12 endpoints</em></h1>
          <p class="sub-row">
            <span class="liveping"><span class="d"></span> streaming</span>
          </p>
        </div>
      </div>

      <div class="sub-grid c3">
        {regions.map((r) => (
          <div class="region-card" key={r.name}>
            <div class="rc-top">
              <div>
                <b>{r.name}</b>
                <small>{r.checks} check{r.checks !== 1 ? "s" : ""}</small>
              </div>
              <span class={`pill ${r.status}`}>{r.latency}</span>
            </div>
            <div class="lat-chart">
              <svg viewBox="0 0 200 50" style={{ width: "100%", height: "100%" }} preserveAspectRatio="none">
                <polyline
                  fill="none"
                  stroke={r.status === "warn" ? "var(--warn)" : "var(--accent)"}
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  points={r.polyline}
                />
              </svg>
            </div>
            <div class="rc-meta">
              <span>p50: {r.p50}</span>
              <span>p95: {r.p95}</span>
            </div>
          </div>
        ))}
      </div>

      <div class="panel" style={{ marginTop: 24 }}>
        <div class="panel-head">
          <h3>Endpoints <span class="cnt">7</span></h3>
        </div>
        <div class="panel-body p0">
          <table class="tbl">
            <thead>
              <tr>
                <th>Endpoint</th>
                <th>Check</th>
                <th>Regions</th>
                <th>Cadence</th>
                <th>p50</th>
                <th>p95</th>
                <th>Status</th>
                <th>Last incident</th>
              </tr>
            </thead>
            <tbody>
              {endpoints.map((e, i) => (
                <tr key={i}>
                  <td><b>{e.url}</b></td>
                  <td class="mono">{e.check}</td>
                  <td class="mono">{e.regions}</td>
                  <td class="mono">{e.cadence}</td>
                  <td class="mono">{e.p50}</td>
                  <td class="mono">{e.p95}</td>
                  <td><span class={`pill ${e.status}`}>{e.status === "ok" ? "healthy" : "degraded"}</span></td>
                  <td class="muted">{e.incident}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});
