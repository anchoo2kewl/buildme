import { component$ } from "@builder.io/qwik";

export default component$(() => {
  const builds = [
    { status: "running", cls: "run", proj: "api-service", msg: "feat: add rate limiting middleware", branch: "feature/rate-limit", sha: "a3f7c21", provider: "GitHub Actions", trigger: "push", dur: "2m 14s", started: "2 min ago" },
    { status: "passed", cls: "ok", proj: "frontend", msg: "fix: hydration mismatch on /dashboard", branch: "main", sha: "e9b0145", provider: "GitHub Actions", trigger: "push", dur: "4m 32s", started: "8 min ago" },
    { status: "failed", cls: "fail", proj: "worker", msg: "chore: bump redis driver to v5", branch: "deps/redis-v5", sha: "1c4d982", provider: "CircleCI", trigger: "push", dur: "1m 48s", started: "12 min ago" },
    { status: "passed", cls: "ok", proj: "api-service", msg: "test: add integration tests for /v2/builds", branch: "main", sha: "d82e3fa", provider: "GitHub Actions", trigger: "merge", dur: "5m 11s", started: "18 min ago" },
    { status: "queued", cls: "plain", proj: "docs-site", msg: "docs: update MCP key setup guide", branch: "docs/mcp", sha: "f14b7e0", provider: "Travis CI", trigger: "push", dur: "--", started: "19 min ago" },
    { status: "passed", cls: "ok", proj: "mobile-ios", msg: "fix: biometric auth on iOS 18", branch: "main", sha: "7ea1c33", provider: "GitHub Actions", trigger: "merge", dur: "8m 02s", started: "24 min ago" },
    { status: "running", cls: "run", proj: "payments-gw", msg: "feat: Stripe webhook idempotency", branch: "feature/stripe-idem", sha: "b92d4f1", provider: "GitHub Actions", trigger: "push", dur: "1m 05s", started: "1 min ago" },
    { status: "cancelled", cls: "warn", proj: "frontend", msg: "refactor: migrate to Qwik 2.x signals", branch: "refactor/qwik2", sha: "5de81a7", provider: "GitHub Actions", trigger: "push", dur: "0m 42s", started: "31 min ago" },
    { status: "passed", cls: "ok", proj: "api-service", msg: "ci: add SAST scan step", branch: "main", sha: "c06f3b8", provider: "CircleCI", trigger: "schedule", dur: "3m 27s", started: "38 min ago" },
    { status: "failed", cls: "fail", proj: "worker", msg: "feat: dead-letter queue retry policy", branch: "feature/dlq", sha: "8af2e09", provider: "GitHub Actions", trigger: "push", dur: "6m 19s", started: "44 min ago" },
    { status: "passed", cls: "ok", proj: "docs-site", msg: "fix: broken links in probe setup", branch: "main", sha: "3b7c4d2", provider: "Travis CI", trigger: "push", dur: "2m 55s", started: "52 min ago" },
    { status: "queued", cls: "plain", proj: "mobile-ios", msg: "test: snapshot tests for settings screen", branch: "test/snapshots", sha: "e1a09f6", provider: "GitHub Actions", trigger: "push", dur: "--", started: "54 min ago" },
  ];

  return (
    <div>
      <div class="page-top">
        <div class="breadcrumb">
          workspace <span>/</span> <b>builds</b>
        </div>
        <div class="page-top-actions">
          <div class="search">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="6.2" cy="6.2" r="4.5" /><path d="m12.5 12.5-3-3" /></svg>
            <input type="text" placeholder="Search builds..." />
          </div>
          <button class="btn btn-outline">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8v3.5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V8" /><polyline points="4 5.5 7 8.5 10 5.5" /><line x1="7" y1="8.5" x2="7" y2="1.5" /></svg>
            Export CSV
          </button>
          <button class="btn btn-primary">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><polygon points="4.5 2 12 7 4.5 12" /></svg>
            Run build
          </button>
        </div>
      </div>

      <div class="greet">
        <div>
          <h1>Builds <em>· 147 in the last 24h</em></h1>
          <p class="sub-row">
            <span class="liveping"><span class="d"></span> streaming</span>
          </p>
        </div>
      </div>

      <div class="filter-bar">
        <span class="fchip active">All · 147</span>
        <span class="fchip">Passing · 132</span>
        <span class="fchip">Failed · 9</span>
        <span class="fchip">Running · 4</span>
        <span class="fchip">Queued · 2</span>
        <span style={{ flex: 1 }}></span>
        <span class="fchip">GitHub Actions</span>
        <span class="fchip">Travis</span>
        <span class="fchip">CircleCI</span>
        <span class="fchip">branch:main</span>
        <span class="fchip">last 24h ▾</span>
      </div>

      <div class="panel">
        <table class="tbl">
          <thead>
            <tr>
              <th>Status</th>
              <th>Project · message</th>
              <th>Branch / SHA</th>
              <th>Provider</th>
              <th>Trigger</th>
              <th>Duration</th>
              <th>Started</th>
            </tr>
          </thead>
          <tbody>
            {builds.map((b, i) => (
              <tr key={i}>
                <td><span class={`pill ${b.cls}`}>{b.status}</span></td>
                <td>
                  <b>{b.proj}</b>
                  <span class="muted" style={{ marginLeft: 8 }}>{b.msg}</span>
                </td>
                <td class="mono">
                  {b.branch} <span class="muted">{b.sha}</span>
                </td>
                <td><span class="pill plain">{b.provider}</span></td>
                <td class="muted">{b.trigger}</td>
                <td class="mono">{b.dur}</td>
                <td class="muted">{b.started}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});
