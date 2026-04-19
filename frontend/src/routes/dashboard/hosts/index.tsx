import { component$ } from "@builder.io/qwik";

export default component$(() => {
  const hostCards = [
    {
      name: "prod-web-01", region: "us-east-1", status: "ok",
      metrics: [
        { label: "CPU", val: "34%", pct: 34, warn: false },
        { label: "Memory", val: "61%", pct: 61, warn: false },
        { label: "Disk", val: "42%", pct: 42, warn: false },
        { label: "Net I/O", val: "12 MB/s", pct: 24, warn: false },
        { label: "Load", val: "1.82", pct: 46, warn: false },
      ],
    },
    {
      name: "prod-web-02", region: "us-east-1", status: "ok",
      metrics: [
        { label: "CPU", val: "28%", pct: 28, warn: false },
        { label: "Memory", val: "55%", pct: 55, warn: false },
        { label: "Disk", val: "38%", pct: 38, warn: false },
        { label: "Net I/O", val: "9 MB/s", pct: 18, warn: false },
        { label: "Load", val: "1.24", pct: 31, warn: false },
      ],
    },
    {
      name: "prod-worker-01", region: "us-west-2", status: "warn",
      metrics: [
        { label: "CPU", val: "87%", pct: 87, warn: true },
        { label: "Memory", val: "72%", pct: 72, warn: false },
        { label: "Disk", val: "65%", pct: 65, warn: false },
        { label: "Net I/O", val: "4 MB/s", pct: 8, warn: false },
        { label: "Load", val: "6.41", pct: 80, warn: true },
      ],
    },
    {
      name: "stg-web-01", region: "eu-west-1", status: "warn",
      metrics: [
        { label: "CPU", val: "42%", pct: 42, warn: false },
        { label: "Memory", val: "89%", pct: 89, warn: true },
        { label: "Disk", val: "71%", pct: 71, warn: false },
        { label: "Net I/O", val: "2 MB/s", pct: 4, warn: false },
        { label: "Load", val: "2.10", pct: 53, warn: false },
      ],
    },
  ];

  const hostRows = [
    { name: "prod-web-01", region: "us-east-1", status: "ok", cpu: "34%", mem: "61%", disk: "42%", uptime: "42d 7h", seen: "12s ago" },
    { name: "prod-web-02", region: "us-east-1", status: "ok", cpu: "28%", mem: "55%", disk: "38%", uptime: "42d 7h", seen: "10s ago" },
    { name: "prod-worker-01", region: "us-west-2", status: "warn", cpu: "87%", mem: "72%", disk: "65%", uptime: "18d 3h", seen: "8s ago" },
    { name: "prod-worker-02", region: "us-west-2", status: "ok", cpu: "22%", mem: "48%", disk: "51%", uptime: "18d 3h", seen: "14s ago" },
    { name: "stg-web-01", region: "eu-west-1", status: "warn", cpu: "42%", mem: "89%", disk: "71%", uptime: "9d 14h", seen: "6s ago" },
    { name: "stg-worker-01", region: "eu-west-1", status: "ok", cpu: "15%", mem: "34%", disk: "28%", uptime: "9d 14h", seen: "18s ago" },
    { name: "prod-db-01", region: "us-east-1", status: "ok", cpu: "19%", mem: "67%", disk: "54%", uptime: "91d 2h", seen: "4s ago" },
    { name: "prod-cache-01", region: "us-east-1", status: "ok", cpu: "11%", mem: "82%", disk: "12%", uptime: "91d 2h", seen: "9s ago" },
  ];

  return (
    <div>
      <div class="page-top">
        <div class="breadcrumb">
          workspace <span>/</span> <b>hosts</b>
        </div>
        <div class="page-top-actions">
          <div class="search">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="6.2" cy="6.2" r="4.5" /><path d="m12.5 12.5-3-3" /></svg>
            <input type="text" placeholder="Search hosts..." />
          </div>
          <button class="btn btn-outline">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="10" height="4" rx="1" /><rect x="2" y="8" width="10" height="4" rx="1" /><circle cx="4.5" cy="4" r="0.5" fill="currentColor" /><circle cx="4.5" cy="10" r="0.5" fill="currentColor" /></svg>
            Add host
          </button>
        </div>
      </div>

      <div class="greet">
        <div>
          <h1>Hosts <em>· 8 online · 0 offline</em></h1>
          <p class="sub-row">
            <span class="liveping"><span class="d"></span> streaming</span>
          </p>
        </div>
      </div>

      <div class="filter-bar">
        <span class="fchip active">All · 8</span>
        <span class="fchip">Healthy · 6</span>
        <span class="fchip">Warning · 2</span>
        <span class="fchip">Offline · 0</span>
        <span style={{ flex: 1 }}></span>
        <span class="fchip">env:prod</span>
        <span class="fchip">env:stg</span>
        <span class="fchip">tag:worker</span>
      </div>

      <div class="sub-grid c2-even">
        {hostCards.map((h) => (
          <div class="host-card" key={h.name}>
            <div class="hc-top">
              <div>
                <b>{h.name}</b>
                <small>{h.region}</small>
              </div>
              <span class={`pill ${h.status}`}>{h.status === "ok" ? "healthy" : "warning"}</span>
            </div>
            <div class="hc-metrics">
              {h.metrics.map((m) => (
                <div class={`host-metric ${m.warn ? "warn" : ""}`} key={m.label}>
                  <span>{m.label}</span>
                  <div class="track"><div style={{ width: `${m.pct}%` }}></div></div>
                  <span class="val">{m.val}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div class="panel" style={{ marginTop: 24 }}>
        <table class="tbl">
          <thead>
            <tr>
              <th>Host</th>
              <th>Region</th>
              <th>Status</th>
              <th>CPU</th>
              <th>Mem</th>
              <th>Disk</th>
              <th>Uptime</th>
              <th>Last seen</th>
            </tr>
          </thead>
          <tbody>
            {hostRows.map((r) => (
              <tr key={r.name}>
                <td><b>{r.name}</b></td>
                <td class="mono">{r.region}</td>
                <td><span class={`pill ${r.status}`}>{r.status === "ok" ? "healthy" : "warning"}</span></td>
                <td class="mono">{r.cpu}</td>
                <td class="mono">{r.mem}</td>
                <td class="mono">{r.disk}</td>
                <td class="mono">{r.uptime}</td>
                <td class="muted">{r.seen}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});
