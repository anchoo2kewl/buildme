import { component$, useSignal, useVisibleTask$, useComputed$ } from "@builder.io/qwik";
import { fetchDrift } from "~/lib/api";
import type { DriftDashboard, EnvironmentStatus } from "~/lib/types";

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function statusPill(code: number): { cls: string; label: string } {
  if (code === 200) return { cls: "ok", label: `${code} OK` };
  if (code === 0) return { cls: "fail", label: "unreachable" };
  return { cls: "warn", label: `${code}` };
}

export default component$(() => {
  const drift = useSignal<DriftDashboard | null>(null);
  const loading = useSignal(true);
  const error = useSignal("");

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    try {
      drift.value = await fetchDrift();
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : "Failed to load";
    } finally {
      loading.value = false;
    }
  });

  const allStatuses = useComputed$(() => {
    if (!drift.value) return [] as EnvironmentStatus[];
    return drift.value.projects.flatMap((p) => p.environments);
  });

  const total = useComputed$(() => allStatuses.value.length);
  const healthyCount = useComputed$(() => allStatuses.value.filter((s) => s.health_status === 200).length);

  const envGroups = useComputed$(() => {
    const grouped: Record<string, EnvironmentStatus[]> = {};
    for (const s of allStatuses.value) {
      const key = s.env || "unknown";
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(s);
    }
    return grouped;
  });

  return (
    <div>
      <div class="page-top">
        <div class="breadcrumb">
          workspace <span>/</span> <b>probes</b>
        </div>
        <div class="page-top-actions">
          <button class="btn btn-primary">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 1.5v11M1.5 7h11" /></svg>
            Add probe
          </button>
        </div>
      </div>

      {loading.value ? (
        <div class="greet"><div><h1>Loading...</h1><p class="sub-row"><span class="liveping"><span class="d"></span> checking</span></p></div></div>
      ) : error.value ? (
        <div class="greet"><div><h1>Environment health</h1><p style={{ color: "var(--danger)" }}>{error.value}</p></div></div>
      ) : (
        <>
          <div class="greet">
            <div>
              <h1>Environment health <em>· {total.value} endpoints · {healthyCount.value} healthy</em></h1>
              <p class="sub-row">
                <span class="liveping"><span class="d"></span> live</span>
              </p>
            </div>
          </div>

          {total.value === 0 ? (
            <div class="panel">
              <div class="panel-body" style={{ textAlign: "center", padding: "48px 24px" }}>
                <p style={{ color: "var(--text-2)", fontSize: 14 }}>No environment statuses found. Configure projects with health endpoints to see probes here.</p>
              </div>
            </div>
          ) : (
            <>
              <div class="sub-grid c3">
                {Object.entries(envGroups.value).map(([env, statuses]) => {
                  const healthy = statuses.filter((s) => s.health_status === 200).length;
                  const avgMs = statuses.length > 0
                    ? Math.round(statuses.reduce((sum, s) => sum + s.response_time_ms, 0) / statuses.length)
                    : 0;
                  const pillCls = avgMs < 500 ? "ok" : "warn";

                  return (
                    <div class="region-card" key={env}>
                      <div class="rc-top">
                        <div>
                          <b>{env}</b>
                          <small>{statuses.length} endpoint{statuses.length !== 1 ? "s" : ""}</small>
                        </div>
                        <span class={`pill ${pillCls}`}>{avgMs}ms</span>
                      </div>
                      <div class="rc-meta">
                        <span>{healthy}/{statuses.length} healthy ({statuses.length > 0 ? Math.round((healthy / statuses.length) * 100) : 0}%)</span>
                        <span>avg {avgMs}ms</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div class="panel" style={{ marginTop: 24 }}>
                <div class="panel-head">
                  <h3>All endpoints <span class="cnt">{total.value}</span></h3>
                </div>
                <div class="panel-body p0">
                  <table class="tbl">
                    <thead>
                      <tr>
                        <th>Endpoint</th>
                        <th>Status</th>
                        <th>Response Time</th>
                        <th>Deployed SHA</th>
                        <th>Drift</th>
                        <th>Last Check</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allStatuses.value.map((s, i) => {
                        const sp = statusPill(s.health_status);
                        return (
                          <tr key={i}>
                            <td>
                              <b>{s.project_name}</b>
                              <br />
                              <small class="muted">{s.base_url}</small>
                            </td>
                            <td><span class={`pill ${sp.cls}`}>{sp.label}</span></td>
                            <td class="mono">{s.response_time_ms}ms</td>
                            <td class="mono">{s.deployed_sha ? s.deployed_sha.substring(0, 7) : "—"}</td>
                            <td>
                              {s.is_drifted ? (
                                <span class="pill warn">drifted</span>
                              ) : (
                                <span class="muted">in sync</span>
                              )}
                            </td>
                            <td class="muted">{s.checked_at ? timeAgo(s.checked_at) : "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
});
