import {
  component$,
  useSignal,
  useVisibleTask$,
  useComputed$,
  $,
} from "@builder.io/qwik";
import {
  fetchDrift,
  fetchDashboard,
  fetchIncidents,
  fetchHosts,
} from "~/lib/api";
import type {
  Build,
  DashboardEntry,
  ResourceIncident,
  Host,
  DriftProject,
  EnvironmentStatus,
  ProviderType,
} from "~/lib/types";

/* ── helpers ── */

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function formatUptime(secs: number): string {
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  if (d > 0) return `${d}d ${h}h`;
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  return `${days}d ago`;
}

function isHostOnline(host: Host): boolean {
  if (!host.last_heartbeat_at) return false;
  return Date.now() - new Date(host.last_heartbeat_at).getTime() < 2 * 60 * 1000;
}

function hostLedClass(host: Host): string {
  if (!isHostOnline(host)) return "off";
  if (
    host.cpu_percent > host.cpu_threshold ||
    host.memory_percent > host.memory_threshold ||
    host.disk_percent > host.disk_threshold
  )
    return "warn";
  return "on";
}

function hostStatusPill(host: Host): { cls: string; label: string } {
  if (!isHostOnline(host)) return { cls: "fail", label: "offline" };
  if (
    host.cpu_percent > host.cpu_threshold ||
    host.memory_percent > host.memory_threshold ||
    host.disk_percent > host.disk_threshold
  )
    return { cls: "warn", label: "warning" };
  return { cls: "ok", label: "healthy" };
}

function providerChip(type?: ProviderType): string {
  switch (type) {
    case "travis":
      return "tv";
    case "circleci":
      return "cc";
    default:
      return "gh";
  }
}

function providerLabel(type?: ProviderType): string {
  switch (type) {
    case "travis":
      return "TV";
    case "circleci":
      return "CC";
    default:
      return "GH";
  }
}

function statusIconClass(status: string): string {
  switch (status) {
    case "success":
      return "ok";
    case "running":
      return "run";
    case "failure":
    case "error":
      return "fail";
    case "queued":
      return "queue";
    case "cancelled":
    case "skipped":
      return "skip";
    default:
      return "plain";
  }
}

function statusPillClass(status: string): string {
  switch (status) {
    case "success":
      return "ok";
    case "running":
      return "run";
    case "failure":
    case "error":
      return "fail";
    default:
      return "plain";
  }
}

/* ── flatten builds from dashboard entries ── */

interface FlatBuild extends Build {
  project_name: string;
  project_slug: string;
}

function flattenBuilds(entries: DashboardEntry[]): FlatBuild[] {
  const all: FlatBuild[] = [];
  for (const entry of entries) {
    for (const b of entry.builds) {
      all.push({
        ...b,
        project_name: entry.project.name,
        project_slug: entry.project.slug,
      });
    }
  }
  all.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  return all;
}

/* ── component ── */

export default component$(() => {
  const loading = useSignal(true);
  const dashboard = useSignal<DashboardEntry[]>([]);
  const incidents = useSignal<ResourceIncident[]>([]);
  const hosts = useSignal<Host[]>([]);
  const driftProjects = useSignal<DriftProject[]>([]);
  const lastSynced = useSignal<string>("");
  const wsConnected = useSignal(false);
  const providerFilter = useSignal<string>("all");
  const buildFilter = useSignal<string>("all");
  const searchQuery = useSignal("");

  /* ── data fetching ── */

  const doRefresh$ = $(async () => {
    try {
      const [dashData, incData, hostData, driftData] = await Promise.all([
        fetchDashboard(),
        fetchIncidents(50),
        fetchHosts(),
        fetchDrift(),
      ]);
      dashboard.value = dashData;
      incidents.value = incData;
      hosts.value = hostData;
      driftProjects.value = driftData.projects;
      lastSynced.value = new Date().toISOString();
    } catch (e) {
      console.error("Dashboard refresh failed:", e);
    }
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    await doRefresh$();
    loading.value = false;

    /* WebSocket */
    const proto = location.protocol === "https:" ? "wss" : "ws";
    const wsUrl = `${proto}://${location.host}/api/ws`;
    let ws: WebSocket | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      try {
        ws = new WebSocket(wsUrl);
        ws.onopen = () => {
          wsConnected.value = true;
        };
        ws.onclose = () => {
          wsConnected.value = false;
          retryTimer = setTimeout(connect, 5000);
        };
        ws.onerror = () => {
          wsConnected.value = false;
        };
        ws.onmessage = () => {
          doRefresh$();
        };
      } catch {
        wsConnected.value = false;
        retryTimer = setTimeout(connect, 5000);
      }
    };

    connect();

    return () => {
      if (retryTimer) clearTimeout(retryTimer);
      if (ws) ws.close();
    };
  });

  /* ── computed values ── */

  const allBuilds = useComputed$(() => flattenBuilds(dashboard.value));

  const filteredBuilds = useComputed$(() => {
    let builds = allBuilds.value;
    if (providerFilter.value !== "all") {
      builds = builds.filter(
        (b) => (b.provider_type ?? "github") === providerFilter.value,
      );
    }
    if (buildFilter.value === "running") {
      builds = builds.filter((b) => b.status === "running");
    } else if (buildFilter.value === "failed") {
      builds = builds.filter(
        (b) => b.status === "failure" || b.status === "error",
      );
    }
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase();
      builds = builds.filter(
        (b) =>
          b.project_name.toLowerCase().includes(q) ||
          b.workflow_name.toLowerCase().includes(q) ||
          b.branch.toLowerCase().includes(q) ||
          b.commit_sha.toLowerCase().includes(q),
      );
    }
    return builds;
  });

  const providerCounts = useComputed$(() => {
    const builds = allBuilds.value;
    let gh = 0;
    let tv = 0;
    let cc = 0;
    for (const b of builds) {
      const pt = b.provider_type ?? "github";
      if (pt === "github" || pt === "github_hosted") gh++;
      else if (pt === "travis") tv++;
      else if (pt === "circleci") cc++;
    }
    return { gh, tv, cc };
  });

  const successRate = useComputed$(() => {
    const builds = allBuilds.value;
    if (builds.length === 0) return "0";
    const ok = builds.filter((b) => b.status === "success").length;
    return ((ok / builds.length) * 100).toFixed(1);
  });

  const runningCount = useComputed$(
    () => allBuilds.value.filter((b) => b.status === "running").length,
  );

  const queuedCount = useComputed$(
    () => allBuilds.value.filter((b) => b.status === "queued").length,
  );

  const avgDuration = useComputed$(() => {
    const completed = allBuilds.value.filter(
      (b) =>
        b.duration_ms != null &&
        b.duration_ms > 0 &&
        (b.status === "success" || b.status === "failure"),
    );
    if (completed.length === 0) return "--";
    const avg =
      completed.reduce((sum, b) => sum + b.duration_ms!, 0) / completed.length;
    return formatDuration(Math.round(avg));
  });

  const openIncidents = useComputed$(
    () => incidents.value.filter((i) => !i.resolved_at && !i.ignored),
  );

  const driftedEnvs = useComputed$(() => {
    const envs: EnvironmentStatus[] = [];
    for (const dp of driftProjects.value) {
      for (const e of dp.environments) {
        if (e.is_drifted) envs.push(e);
      }
    }
    return envs;
  });

  const allEnvs = useComputed$(() => {
    const envs: EnvironmentStatus[] = [];
    for (const dp of driftProjects.value) {
      for (const e of dp.environments) {
        envs.push(e);
      }
    }
    return envs;
  });

  /* ── render ── */

  if (loading.value) {
    return (
      <div class="main-content" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "400px" }}>
        <div class="spinner"></div>
      </div>
    );
  }

  return (
    <div>
      {/* ── Page top bar ── */}
      <div class="page-top">
        <div class="breadcrumb">
          workspace <span>/</span> <b>overview</b>
        </div>
        <div class="page-top-actions">
          <div class="search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input
              type="text"
              placeholder="Search builds, projects..."
              value={searchQuery.value}
              onInput$={(_, el) => {
                searchQuery.value = (el as HTMLInputElement).value;
              }}
            />
            <span class="kbd">/</span>
          </div>
          <a href="/dashboard/projects/new" class="btn btn-outline">Add provider</a>
          <a href="/dashboard/projects/new" class="btn btn-primary">New project</a>
        </div>
      </div>

      {/* ── Greeting ── */}
      <div class="greet">
        <div>
          <h1>
            Overview{" "}
            <em>
              &middot; {allBuilds.value.length} builds in the last 24h
            </em>
          </h1>
          <div class="sub-row">
            <span class="liveping">
              <span class="d"></span>
              {wsConnected.value
                ? "Live \u00B7 WebSocket connected"
                : "Disconnected \u00B7 reconnecting..."}
            </span>
            <span>
              {lastSynced.value
                ? `Last synced ${timeAgo(lastSynced.value)}`
                : "Syncing..."}
            </span>
          </div>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div class="filter-bar">
        <span
          class={`fchip${providerFilter.value === "all" ? " active" : ""}`}
          onClick$={() => {
            providerFilter.value = "all";
          }}
        >
          All providers
        </span>
        <span
          class={`fchip${providerFilter.value === "github" ? " active" : ""}`}
          onClick$={() => {
            providerFilter.value =
              providerFilter.value === "github" ? "all" : "github";
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
          GitHub Actions &middot; {providerCounts.value.gh}
        </span>
        <span
          class={`fchip${providerFilter.value === "travis" ? " active" : ""}`}
          onClick$={() => {
            providerFilter.value =
              providerFilter.value === "travis" ? "all" : "travis";
          }}
        >
          Travis CI &middot; {providerCounts.value.tv}
        </span>
        <span
          class={`fchip${providerFilter.value === "circleci" ? " active" : ""}`}
          onClick$={() => {
            providerFilter.value =
              providerFilter.value === "circleci" ? "all" : "circleci";
          }}
        >
          CircleCI &middot; {providerCounts.value.cc}
        </span>
        <span style={{ flex: 1 }}></span>
      </div>

      {/* ── KPIs ── */}
      <div class="kpis">
        <div class="kpi">
          <div class="kpi-label">
            Build success rate
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></svg>
          </div>
          <div class="kpi-value">{successRate.value}%</div>
          <div class="kpi-foot">
            {allBuilds.value.filter((b) => b.status === "success").length} of{" "}
            {allBuilds.value.length} builds passed
          </div>
        </div>

        <div class="kpi">
          <div class="kpi-label">
            Running now
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
          </div>
          <div class="kpi-value">
            {runningCount.value}
            {queuedCount.value > 0 && (
              <span class="kpi-delta warn">{queuedCount.value} queued</span>
            )}
          </div>
          <div class="kpi-foot">
            {runningCount.value + queuedCount.value} active builds
          </div>
        </div>

        <div class="kpi">
          <div class="kpi-label">
            Avg duration
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
          </div>
          <div class="kpi-value">{avgDuration.value}</div>
          <div class="kpi-foot">completed builds average</div>
        </div>

        <div class="kpi">
          <div class="kpi-label">
            Open incidents
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
          </div>
          <div class="kpi-value">{openIncidents.value.length}</div>
          <div class="kpi-foot">
            {incidents.value.filter((i) => !!i.resolved_at).length} resolved
          </div>
        </div>

        <div class="kpi">
          <div class="kpi-label">
            Drift detected
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" /></svg>
          </div>
          <div class="kpi-value">
            {driftedEnvs.value.length}
            <span class="kpi-delta warn">envs</span>
          </div>
          <div class="kpi-foot">
            {driftedEnvs.value.length > 0
              ? driftedEnvs.value
                  .map((e) => e.project_name)
                  .filter((v, i, a) => a.indexOf(v) === i)
                  .join(", ")
              : "all environments in sync"}
          </div>
        </div>
      </div>

      {/* ── Two-column layout ── */}
      <div class="two-col">
        {/* ── Left column ── */}
        <div>
          {/* Build stream panel */}
          <div class="panel">
            <div class="panel-head">
              <h3>
                Build stream
                <span class="cnt">{filteredBuilds.value.length}</span>
              </h3>
              <div class="tools">
                <span
                  class="tab"
                  aria-selected={buildFilter.value === "all"}
                  onClick$={() => {
                    buildFilter.value = "all";
                  }}
                >
                  All
                </span>
                <span
                  class="tab"
                  aria-selected={buildFilter.value === "running"}
                  onClick$={() => {
                    buildFilter.value = "running";
                  }}
                >
                  Running
                </span>
                <span
                  class="tab"
                  aria-selected={buildFilter.value === "failed"}
                  onClick$={() => {
                    buildFilter.value = "failed";
                  }}
                >
                  Failed
                </span>
              </div>
            </div>
            <div class="panel-body p0">
              <div class="b-table">
                <div class="brow head">
                  <span></span>
                  <span>Build</span>
                  <span>Branch</span>
                  <span>Provider</span>
                  <span>Duration</span>
                  <span>When</span>
                  <span>Trigger</span>
                  <span></span>
                </div>

                {filteredBuilds.value.length === 0 && (
                  <div class="brow" style={{ justifyContent: "center", color: "var(--text-3)", padding: "24px" }}>
                    No builds found
                  </div>
                )}

                {filteredBuilds.value.slice(0, 50).map((b) => (
                  <div class="brow" key={b.id}>
                    <div class={`ico ${statusIconClass(b.status)}`}>
                      {b.status === "success" && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      )}
                      {b.status === "running" && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                      )}
                      {(b.status === "failure" || b.status === "error") && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      )}
                      {b.status === "queued" && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                      )}
                      {(b.status === "cancelled" || b.status === "skipped") && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>
                      )}
                    </div>
                    <div class="b-name">
                      <div>
                        <b>{b.project_name}</b>
                        <small>
                          #{b.external_id} &middot; {b.workflow_name}
                        </small>
                      </div>
                    </div>
                    <div class="b-branch">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="3" x2="6" y2="15" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M18 9a9 9 0 0 1-9 9" /></svg>
                      {b.branch}{" "}
                      <span class="sha">{b.commit_sha.slice(0, 7)}</span>
                    </div>
                    <div class={`prov ${providerChip(b.provider_type)}`}>
                      {providerLabel(b.provider_type)}
                    </div>
                    <div class="b-dur">
                      {b.status === "running" ? (
                        <span style={{ color: "var(--info)" }}>
                          {b.duration_ms ? `${formatDuration(b.duration_ms)}...` : "running..."}
                        </span>
                      ) : b.status === "queued" ? (
                        <span style={{ color: "var(--text-3)" }}>queued</span>
                      ) : b.duration_ms ? (
                        formatDuration(b.duration_ms)
                      ) : (
                        "--"
                      )}
                    </div>
                    <div class="b-when">{timeAgo(b.created_at)}</div>
                    <div>
                      <span class={`pill ${statusPillClass(b.status)}`}>
                        {b.trigger || b.status}
                      </span>
                    </div>
                    <a
                      href={b.provider_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="icon-btn"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Hosts panel */}
          <div class="panel">
            <div class="panel-head">
              <h3>
                Hosts
                <span class="cnt">{hosts.value.length}</span>
              </h3>
              <div class="tools">
                <span class="tab" aria-selected={true}>
                  Overview
                </span>
              </div>
            </div>
            <div class="panel-body p0">
              <div class="hosts">
                <div class="hrow head">
                  <span>Host</span>
                  <span>CPU</span>
                  <span>Memory</span>
                  <span>Disk</span>
                  <span>Uptime</span>
                  <span>Status</span>
                </div>

                {hosts.value.length === 0 && (
                  <div class="hrow" style={{ justifyContent: "center", color: "var(--text-3)", padding: "24px" }}>
                    No hosts registered
                  </div>
                )}

                {hosts.value.map((h) => {
                  const online = isHostOnline(h);
                  const led = hostLedClass(h);
                  const pill = hostStatusPill(h);
                  return (
                    <div class="hrow" key={h.id}>
                      <div class="h-name">
                        <span class={`h-led ${led}`}></span>
                        <div>
                          <b>{h.name}</b>
                          <small>
                            {h.ip_address || h.hostname}
                            {h.project_names && h.project_names.length > 0 && (
                              <> &middot; {h.project_names.join(", ")}</>
                            )}
                          </small>
                        </div>
                      </div>
                      <div class={`metric-cell${online && h.cpu_percent > h.cpu_threshold ? " warn" : ""}`}>
                        <div class="mtop">
                          <span>CPU</span>{" "}
                          <b>{online ? `${Math.round(h.cpu_percent)}%` : "--"}</b>
                        </div>
                        <div class="track">
                          <div
                            style={{ width: online ? `${h.cpu_percent}%` : "0%" }}
                          ></div>
                        </div>
                      </div>
                      <div class={`metric-cell${online && h.memory_percent > h.memory_threshold ? " warn" : ""}`}>
                        <div class="mtop">
                          <span>MEM</span>{" "}
                          <b>
                            {online ? `${Math.round(h.memory_percent)}%` : "--"}
                          </b>
                        </div>
                        <div class="track">
                          <div
                            style={{
                              width: online ? `${h.memory_percent}%` : "0%",
                            }}
                          ></div>
                        </div>
                      </div>
                      <div class={`metric-cell${online && h.disk_percent > h.disk_threshold ? " warn" : ""}`}>
                        <div class="mtop">
                          <span>DISK</span>{" "}
                          <b>
                            {online ? `${Math.round(h.disk_percent)}%` : "--"}
                          </b>
                        </div>
                        <div class="track">
                          <div
                            style={{
                              width: online ? `${h.disk_percent}%` : "0%",
                            }}
                          ></div>
                        </div>
                      </div>
                      <div class="b-dur">
                        {online ? formatUptime(h.uptime_secs) : "--"}
                      </div>
                      <div>
                        <span class={`pill ${pill.cls}`}>{pill.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── Right column ── */}
        <div>
          {/* Incidents panel */}
          <div class="panel">
            <div class="panel-head">
              <h3>
                Incidents
                <span class="cnt">{openIncidents.value.length} open</span>
              </h3>
              <a
                href="/dashboard/incidents"
                class="btn btn-ghost"
                style={{ fontSize: "12px", padding: "4px 8px" }}
              >
                View all
              </a>
            </div>
            <div class="panel-body p0">
              <div class="ifeed">
                {incidents.value.length === 0 && (
                  <div class="iitem" style={{ justifyContent: "center", color: "var(--text-3)" }}>
                    No incidents recorded
                  </div>
                )}

                {incidents.value
                  .slice()
                  .sort((a, b) => {
                    // unresolved first, then by created_at desc
                    if (!a.resolved_at && b.resolved_at) return -1;
                    if (a.resolved_at && !b.resolved_at) return 1;
                    return (
                      new Date(b.created_at).getTime() -
                      new Date(a.created_at).getTime()
                    );
                  })
                  .slice(0, 10)
                  .map((inc) => (
                    <div class="iitem" key={inc.id}>
                      <span
                        class={`mark ${
                          inc.resolved_at
                            ? "resolved"
                            : inc.ignored
                              ? "warning"
                              : "active"
                        }`}
                      ></span>
                      <div class="body">
                        <b>{inc.message}</b>
                        <div class="meta">
                          {inc.project_name || `project #${inc.project_id}`}{" "}
                          &middot; {inc.env} &middot; {inc.metric}{" "}
                          {Math.round(inc.value)} &gt; {Math.round(inc.threshold)}
                        </div>
                      </div>
                      <span class="time">{timeAgo(inc.created_at)}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Probe / environment health panel */}
          <div class="panel">
            <div class="panel-head">
              <h3>
                Environment health
                <span class="cnt">{allEnvs.value.length}</span>
              </h3>
              <div>
                <span class={`pill ${allEnvs.value.every((e) => e.health_status >= 200 && e.health_status < 300) ? "ok" : "warn"}`}>
                  {allEnvs.value.filter((e) => e.health_status >= 200 && e.health_status < 300).length}/
                  {allEnvs.value.length} healthy
                </span>
              </div>
            </div>
            <div class="panel-body p0">
              <div class="probe-list">
                {allEnvs.value.length === 0 && (
                  <div class="prow" style={{ justifyContent: "center", color: "var(--text-3)", padding: "16px" }}>
                    No environments configured
                  </div>
                )}

                {allEnvs.value.map((env) => {
                  const healthy =
                    env.health_status >= 200 && env.health_status < 300;
                  return (
                    <div class="prow" key={`${env.project_id}-${env.env}`}>
                      <span class={`led ${healthy ? "on" : ""}`} style={!healthy ? { background: "var(--danger)" } : {}}></span>
                      <div class="name">
                        <b>{env.project_name}</b>
                        <small>{env.env}</small>
                      </div>
                      <span class="lat">
                        {env.response_time_ms > 0
                          ? `${Math.round(env.response_time_ms)}ms`
                          : "--"}
                      </span>
                      <span class="up">
                        {healthy ? (
                          <span style={{ color: "var(--ok)", fontSize: "11px", fontFamily: "var(--mono)" }}>
                            {env.health_status}
                          </span>
                        ) : (
                          <span style={{ color: "var(--danger)", fontSize: "11px", fontFamily: "var(--mono)" }}>
                            {env.health_status || "down"}
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Environment drift panel */}
          <div class="panel">
            <div class="panel-head">
              <h3>
                Environment drift
                <span class="cnt">{driftedEnvs.value.length}</span>
              </h3>
            </div>
            <div class="drift-panel">
              {driftProjects.value.length === 0 && (
                <div style={{ color: "var(--text-3)", padding: "16px", textAlign: "center" }}>
                  No drift data available
                </div>
              )}

              {driftProjects.value.map((dp) =>
                dp.environments.map((env) => (
                  <div class="drift-item" key={`${dp.project.id}-${env.env}`}>
                    <div class="di-top">
                      <b>{dp.project.name}</b>
                      {env.is_drifted ? (
                        <span class="dtag">
                          {env.env} drifted
                        </span>
                      ) : (
                        <span class="dtag ok">in sync</span>
                      )}
                    </div>
                    <div class="di-grid">
                      <div>
                        <small>{env.env}</small>
                        <span>{env.deployed_sha.slice(0, 7)}</span>
                      </div>
                      <div>
                        <small>HEAD</small>
                        <span>
                          {env.branch_head_sha
                            ? env.branch_head_sha.slice(0, 7)
                            : env.deployed_sha.slice(0, 7)}
                        </span>
                      </div>
                    </div>
                  </div>
                )),
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
