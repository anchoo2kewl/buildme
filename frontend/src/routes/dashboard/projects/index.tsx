import { component$ } from "@builder.io/qwik";

export default component$(() => {
  const projects = [
    {
      name: "api-service", repo: "biswas/api-service", health: "ok", healthLabel: "healthy",
      bars: [90, 100, 85, 70, 100, 95, 80, 100, 90, 75, 100, 95],
      barCls: ["", "", "", "", "", "", "", "", "", "", "", ""],
      success: "97.2%", avgDur: "4m 12s", builds7d: "68",
      branches: ["main", "staging", "feature/rate-limit"],
    },
    {
      name: "frontend", repo: "biswas/frontend", health: "warn", healthLabel: "at risk",
      bars: [80, 100, 60, 0, 90, 100, 70, 50, 100, 85, 100, 40],
      barCls: ["", "", "", "f", "", "", "", "f", "", "", "", "r"],
      success: "82.4%", avgDur: "5m 48s", builds7d: "34",
      branches: ["main", "refactor/qwik2"],
    },
    {
      name: "worker", repo: "biswas/worker", health: "fail", healthLabel: "broken",
      bars: [100, 70, 50, 30, 0, 0, 40, 60, 0, 20, 50, 0],
      barCls: ["", "", "f", "f", "f", "f", "", "", "f", "f", "", "f"],
      success: "41.7%", avgDur: "2m 33s", builds7d: "24",
      branches: ["main", "deps/redis-v5", "feature/dlq"],
    },
    {
      name: "docs-site", repo: "biswas/docs-site", health: "ok", healthLabel: "healthy",
      bars: [100, 100, 90, 100, 85, 100, 100, 95, 100, 100, 100, 80],
      barCls: ["", "", "", "", "", "", "", "", "", "", "", ""],
      success: "99.1%", avgDur: "2m 55s", builds7d: "11",
      branches: ["main", "docs/mcp"],
    },
    {
      name: "mobile-ios", repo: "biswas/mobile-ios", health: "ok", healthLabel: "healthy",
      bars: [75, 90, 100, 100, 85, 100, 90, 100, 100, 100, 95, 100],
      barCls: ["", "", "", "", "", "", "", "", "", "", "", ""],
      success: "95.8%", avgDur: "8m 02s", builds7d: "18",
      branches: ["main", "test/snapshots"],
    },
    {
      name: "payments-gw", repo: "biswas/payments-gw", health: "ok", healthLabel: "healthy",
      bars: [100, 100, 100, 90, 100, 100, 85, 100, 100, 100, 100, 95],
      barCls: ["", "", "", "", "", "", "", "", "", "", "", ""],
      success: "98.6%", avgDur: "3m 40s", builds7d: "22",
      branches: ["main", "feature/stripe-idem"],
    },
  ];

  return (
    <div>
      <div class="page-top">
        <div class="breadcrumb">
          workspace <span>/</span> <b>projects</b>
        </div>
        <div class="page-top-actions">
          <div class="search">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="6.2" cy="6.2" r="4.5" /><path d="m12.5 12.5-3-3" /></svg>
            <input type="text" placeholder="Search projects..." />
          </div>
          <button class="btn btn-outline">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 1.5v11M1.5 7h11" /></svg>
            Import from git
          </button>
          <button class="btn btn-primary">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 1.5v11M1.5 7h11" /></svg>
            New project
          </button>
        </div>
      </div>

      <div class="greet">
        <div>
          <h1>Projects <em>· 12 tracked · 7 pinned</em></h1>
        </div>
      </div>

      <div class="filter-bar">
        <span class="fchip active">All · 12</span>
        <span class="fchip">Healthy · 9</span>
        <span class="fchip">At risk · 2</span>
        <span class="fchip">Broken · 1</span>
        <span style={{ flex: 1 }}></span>
        <span class="fchip">sort: last build</span>
        <span class="fchip">view: cards</span>
      </div>

      <div class="sub-grid c3">
        {projects.map((p) => (
          <div class="proj-card" key={p.name}>
            <div class="t">
              <div>
                <b>{p.name}</b>
                <small>{p.repo}</small>
              </div>
              <span class={`pill ${p.health}`}>{p.healthLabel}</span>
            </div>
            <div class="sparkrow">
              {p.bars.map((h, i) => (
                <div
                  key={i}
                  class={`bar ${p.barCls[i]}`}
                  style={{ height: `${Math.max(h, 8)}%` }}
                />
              ))}
            </div>
            <div class="pmeta">
              <div>
                <strong>{p.success}</strong>
                success rate
              </div>
              <div>
                <strong>{p.avgDur}</strong>
                avg duration
              </div>
              <div>
                <strong>{p.builds7d}</strong>
                builds 7d
              </div>
            </div>
            <div class="branches">
              {p.branches.map((br) => (
                <span class="pill plain" key={br}>{br}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
