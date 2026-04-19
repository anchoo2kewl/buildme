import { component$ } from "@builder.io/qwik";

export default component$(() => {
  const openIncidents = [
    {
      sev: "P1", sevCls: "", title: "prod-worker-01 CPU > 90% for 12 min",
      desc: "Worker node saturated after deploy of redis-v5 branch. Retry storm from dead-letter queue.",
      tags: ["worker", "cpu", "prod"], ago: "12 min ago",
    },
    {
      sev: "P2", sevCls: "warn", title: "frontend hydration errors spiking",
      desc: "Client-side errors increased 4x after Qwik 2.x refactor merge. Rollback candidate.",
      tags: ["frontend", "errors", "prod"], ago: "38 min ago",
    },
    {
      sev: "P3", sevCls: "info", title: "stg-web-01 memory at 89%",
      desc: "Staging web server memory usage approaching threshold. Non-critical but should be investigated.",
      tags: ["staging", "memory"], ago: "1h 14m ago",
    },
  ];

  const resolvedRows = [
    { title: "API p95 latency > 800ms", sev: "P2", resolved: "2h ago", dur: "18 min" },
    { title: "CircleCI webhook delivery failures", sev: "P3", resolved: "6h ago", dur: "42 min" },
    { title: "prod-db-01 disk 92%", sev: "P1", resolved: "1d ago", dur: "7 min" },
    { title: "Mobile push notifications delayed", sev: "P2", resolved: "2d ago", dur: "1h 12m" },
    { title: "Stripe webhook 5xx errors", sev: "P1", resolved: "3d ago", dur: "23 min" },
  ];

  const topOffenders = [
    { name: "prod-worker-01", count: 7 },
    { name: "frontend", count: 4 },
    { name: "prod-db-01", count: 3 },
    { name: "payments-gw", count: 2 },
  ];

  return (
    <div>
      <div class="page-top">
        <div class="breadcrumb">
          workspace <span>/</span> <b>incidents</b>
        </div>
        <div class="page-top-actions">
          <div class="search">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="6.2" cy="6.2" r="4.5" /><path d="m12.5 12.5-3-3" /></svg>
            <input type="text" placeholder="Search incidents..." />
          </div>
        </div>
      </div>

      <div class="greet">
        <div>
          <h1>Incidents <em>· 3 open · 2 acknowledged</em></h1>
        </div>
      </div>

      <div class="sub-grid c2">
        {/* Left column */}
        <div>
          {/* Open incidents */}
          <div class="panel">
            <div class="panel-head">
              <h3>Open incidents <span class="cnt">3</span></h3>
            </div>
            <div class="panel-body p0">
              {openIncidents.map((inc, i) => (
                <div class="incident-row" key={i}>
                  <div class={`sev ${inc.sevCls}`}></div>
                  <div class="title">
                    <b>{inc.title}</b>
                    <p>{inc.desc}</p>
                    <div class="tags">
                      <span class="pill plain">{inc.sev}</span>
                      {inc.tags.map((t) => (
                        <span class="pill plain" key={t}>{t}</span>
                      ))}
                    </div>
                  </div>
                  <div class="when">{inc.ago}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <button class="btn btn-outline" style={{ padding: "4px 10px", fontSize: "11px" }}>Acknowledge</button>
                    <button class="btn btn-primary" style={{ padding: "4px 10px", fontSize: "11px" }}>Resolve</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent resolved */}
          <div class="panel">
            <div class="panel-head">
              <h3>Recent <span class="cnt">last 7d</span></h3>
            </div>
            <div class="panel-body p0">
              <table class="tbl">
                <thead>
                  <tr>
                    <th>Incident</th>
                    <th>Severity</th>
                    <th>Resolved</th>
                    <th>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {resolvedRows.map((r, i) => (
                    <tr key={i}>
                      <td><b>{r.title}</b></td>
                      <td><span class="pill plain">{r.sev}</span></td>
                      <td class="muted">{r.resolved}</td>
                      <td class="mono">{r.dur}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div>
          {/* On-call */}
          <div class="panel">
            <div class="panel-head">
              <h3>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 10.5v-1a4 4 0 0 1 4-4h0a4 4 0 0 1 4 4v1" /><circle cx="5.5" cy="3" r="2" /><path d="M9.5 5.5a2.5 2.5 0 0 1 3.5 2.3v2.7" /><circle cx="11" cy="3.5" r="1.5" /></svg>
                On-call
              </h3>
            </div>
            <div class="panel-body">
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <b style={{ fontSize: 13 }}>Anshuman Biswas</b>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>primary</div>
                  </div>
                  <span class="pill ok">on-call</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <b style={{ fontSize: 13 }}>Maya Patel</b>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>secondary</div>
                  </div>
                  <span class="pill plain">backup</span>
                </div>
              </div>
            </div>
          </div>

          {/* MTTR trend */}
          <div class="panel">
            <div class="panel-head">
              <h3>MTTR trend <span class="cnt">30d</span></h3>
            </div>
            <div class="panel-body">
              <svg viewBox="0 0 280 80" style={{ width: "100%", height: 80 }}>
                <polyline
                  fill="none"
                  stroke="var(--accent)"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  points="0,60 20,55 40,48 60,52 80,40 100,35 120,42 140,30 160,25 180,32 200,22 220,18 240,20 260,15 280,12"
                />
                <polyline
                  fill="none"
                  stroke="var(--text-3)"
                  stroke-width="1"
                  stroke-dasharray="4 3"
                  points="0,40 280,40"
                />
                <text x="282" y="42" fill="var(--text-3)" font-size="8" font-family="var(--mono)">avg</text>
              </svg>
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-3)", marginTop: 6 }}>
                <span>30d ago</span>
                <span>MTTR: 18 min avg</span>
                <span>now</span>
              </div>
            </div>
          </div>

          {/* Top offenders */}
          <div class="panel">
            <div class="panel-head">
              <h3>Top offenders <span class="cnt">30d</span></h3>
            </div>
            <div class="panel-body">
              {topOffenders.map((o) => (
                <div key={o.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px dashed var(--line-soft)", fontSize: 13 }}>
                  <span style={{ fontWeight: 500 }}>{o.name}</span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-3)" }}>{o.count} incidents</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
