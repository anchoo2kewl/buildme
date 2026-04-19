import {
  component$,
  useSignal,
  useVisibleTask$,
  useComputed$,
  $,
  type Signal,
} from "@builder.io/qwik";
import {
  fetchDrift,
  fetchDashboard,
  fetchIncidents,
  fetchGroups,
  syncProject,
} from "~/lib/api";
import type {
  Build,
  BuildJob,
  BuildStatus,
  DashboardEntry,
  DriftProject,
  EnvironmentStatus,
  ProjectGroup,
  ResourceIncident,
  ProviderType,
  ProbesSummary,
  ProbeRegion,
  Project,
} from "~/lib/types";
import { parseMetadata } from "~/lib/types";
import {
  CIProviderIcon,
  providerDisplayName,
} from "~/components/shared/ci-provider-icon";
import { EnvironmentDetail } from "~/components/environments/environment-detail";

/* ================================================================
   CONSTANTS
   ================================================================ */

const ENVS_ORDER = ["production", "staging", "uat"];

const COLLAPSE_STORAGE_KEY = "dashboard_collapsed_groups";

/* ================================================================
   HELPERS
   ================================================================ */

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

function mcpPillClass(status?: number): string {
  if (!status || status === 0) return "fail";
  if (status >= 200 && status < 300) return "ok";
  return "warn";
}

function mcpPillLabel(status?: number): string {
  if (!status || status === 0) return "MCP down";
  if (status >= 200 && status < 300) return "MCP ok";
  return `MCP ${status}`;
}

function getVal(
  obj: Record<string, unknown> | null | undefined,
  ...keys: string[]
): unknown {
  if (!obj) return undefined;
  let cur: unknown = obj;
  for (const k of keys) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[k];
  }
  return cur;
}

function loadCollapsedGroups(): Set<string> {
  try {
    const raw = localStorage.getItem(COLLAPSE_STORAGE_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch {
    /* ignore */
  }
  return new Set();
}

function saveCollapsedGroups(set: Set<string>) {
  try {
    localStorage.setItem(COLLAPSE_STORAGE_KEY, JSON.stringify([...set]));
  } catch {
    /* ignore */
  }
}

/* ================================================================
   STATUS ICON SVGs (inline, for build jobs)
   ================================================================ */

const StatusIcon = component$<{ status: BuildStatus; size?: number }>(
  ({ status, size = 10 }) => {
    const s = size;
    if (status === "success") {
      return (
        <svg
          width={s}
          height={s}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="3"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      );
    }
    if (status === "running") {
      return (
        <svg
          width={s}
          height={s}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="3"
          stroke-linecap="round"
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      );
    }
    if (status === "failure" || status === "error") {
      return (
        <svg
          width={s}
          height={s}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="3"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      );
    }
    if (status === "queued") {
      return (
        <svg
          width={s}
          height={s}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );
    }
    // cancelled / skipped
    return (
      <svg
        width={s}
        height={s}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
      </svg>
    );
  },
);

/* ================================================================
   INCIDENTS BANNER (collapsible, paginated)
   ================================================================ */

const IncidentsBanner = component$<{
  incidents: ResourceIncident[];
}>(({ incidents }) => {
  const open = useSignal(true);
  const page = useSignal(0);
  const perPage = 5;

  if (incidents.length === 0) return null;

  const sorted = incidents
    .slice()
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  const totalPages = Math.ceil(sorted.length / perPage);
  const pageItems = sorted.slice(
    page.value * perPage,
    (page.value + 1) * perPage,
  );

  return (
    <div class="panel" style={{ marginBottom: "24px" }}>
      <div
        class="panel-head"
        style={{ cursor: "pointer" }}
        onClick$={() => {
          open.value = !open.value;
        }}
      >
        <h3>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--danger)"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            style={{
              transform: open.value ? "rotate(90deg)" : "rotate(0)",
              transition: "transform .15s",
            }}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
          Open Incidents
          <span class="cnt">{incidents.length}</span>
        </h3>
        <span class="pill fail">{incidents.length} active</span>
      </div>
      {open.value && (
        <div class="panel-body p0">
          <div class="ifeed">
            {pageItems.map((inc) => (
              <div class="iitem" key={inc.id}>
                <span class="mark active"></span>
                <div class="body">
                  <b>{inc.message}</b>
                  <div class="meta">
                    {inc.project_name || `project #${inc.project_id}`} &middot;{" "}
                    {inc.env} &middot; {inc.metric}{" "}
                    {Math.round(inc.value)} &gt; {Math.round(inc.threshold)}
                  </div>
                </div>
                <span class="time">{timeAgo(inc.created_at)}</span>
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "8px",
                padding: "10px 16px",
                borderTop: "1px solid var(--line-soft)",
                fontFamily: "var(--mono)",
                fontSize: "11px",
              }}
            >
              <button
                class="btn btn-ghost"
                style={{ padding: "2px 8px", fontSize: "11px" }}
                disabled={page.value === 0}
                onClick$={() => {
                  page.value = Math.max(0, page.value - 1);
                }}
              >
                Prev
              </button>
              <span style={{ color: "var(--text-3)", padding: "2px 6px" }}>
                {page.value + 1} / {totalPages}
              </span>
              <button
                class="btn btn-ghost"
                style={{ padding: "2px 8px", fontSize: "11px" }}
                disabled={page.value >= totalPages - 1}
                onClick$={() => {
                  page.value = Math.min(totalPages - 1, page.value + 1);
                }}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

/* ================================================================
   PROJECT CARD
   ================================================================ */

interface ProjectCardProps {
  project: Project;
  environments: EnvironmentStatus[];
  builds: Build[];
  selectedEnv: Signal<EnvironmentStatus | null>;
  onSync$: (projectId: number) => void;
}

const ProjectCard = component$<ProjectCardProps>(
  ({ project, environments, builds, selectedEnv, onSync$ }) => {
    const meta = parseMetadata(project);
    const latestBuild = builds.length > 0 ? builds[0] : null;

    // Gather CI providers from builds
    const providerTypes = [
      ...new Set(builds.map((b) => b.provider_type ?? "github")),
    ] as ProviderType[];

    // MCP health: pick first env that has mcp data
    const mcpEnv = environments.find(
      (e) => e.mcp_health_status != null && e.mcp_health_status > 0,
    );

    // Probes from version_info
    const probesSummary = environments.reduce<ProbesSummary | null>(
      (acc, es) => {
        if (acc) return acc;
        const p = getVal(es.version_info, "probes") as
          | ProbesSummary
          | undefined;
        return p && p.regions ? p : null;
      },
      null,
    );

    // Running build progress
    const runningBuild = builds.find((b) => b.status === "running");
    let runningDone = 0;
    let runningTotal = 0;
    if (runningBuild?.jobs && runningBuild.jobs.length > 0) {
      runningTotal = runningBuild.jobs.length;
      runningDone = runningBuild.jobs.filter(
        (j) =>
          j.status === "success" ||
          j.status === "failure" ||
          j.status === "error" ||
          j.status === "cancelled" ||
          j.status === "skipped",
      ).length;
    }

    return (
      <div class="panel" style={{ marginBottom: "16px" }}>
        {/* ── Card header ── */}
        <div class="panel-head" style={{ flexWrap: "wrap", gap: "8px" }}>
          <h3 style={{ flex: "1", minWidth: "200px" }}>
            <a
              href={`/dashboard/projects/${project.id}`}
              style={{ color: "var(--text)", textDecoration: "none" }}
            >
              {project.name}
            </a>
            {project.description && (
              <span
                style={{
                  color: "var(--text-3)",
                  fontWeight: "400",
                  fontSize: "12px",
                  marginLeft: "8px",
                }}
              >
                {project.description}
              </span>
            )}
          </h3>
          <div
            class="tools"
            style={{ flexWrap: "wrap", gap: "6px", alignItems: "center" }}
          >
            {/* CI provider icons */}
            {providerTypes.map((pt) => (
              <span
                key={pt}
                title={providerDisplayName(pt)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <CIProviderIcon provider={pt} size={16} />
              </span>
            ))}

            {/* MCP health badge */}
            {mcpEnv && (
              <span class={`pill ${mcpPillClass(mcpEnv.mcp_health_status)}`}>
                {mcpPillLabel(mcpEnv.mcp_health_status)}
                {mcpEnv.mcp_response_time_ms != null && (
                  <span style={{ marginLeft: "4px", opacity: 0.7 }}>
                    {Math.round(mcpEnv.mcp_response_time_ms)}ms
                  </span>
                )}
              </span>
            )}

            {/* Deployment type */}
            {meta.deployment_type && (
              <span class="pill plain">{meta.deployment_type}</span>
            )}

            {/* Tech stack tags */}
            {meta.tech_stack &&
              meta.tech_stack.map((t) => (
                <span key={t} class="pill plain">
                  {t}
                </span>
              ))}

            {/* Sync button */}
            <button
              class="btn btn-ghost"
              style={{ padding: "3px 8px", fontSize: "11px" }}
              title="Sync project"
              onClick$={() => onSync$(project.id)}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Environment columns ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${ENVS_ORDER.length}, 1fr)`,
            gap: "1px",
            background: "var(--line-soft)",
          }}
        >
          {ENVS_ORDER.map((envName) => {
            const es = environments.find((e) => e.env === envName);
            if (!es) {
              return (
                <div
                  key={envName}
                  style={{
                    background: "var(--surface)",
                    padding: "12px 14px",
                    fontSize: "12px",
                    color: "var(--text-3)",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: "10px",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      marginBottom: "6px",
                      color: "var(--text-3)",
                    }}
                  >
                    {envName}
                  </div>
                  <span style={{ fontStyle: "italic" }}>not configured</span>
                </div>
              );
            }

            const vi = es.version_info;
            const backend = vi
              ? (vi["backend"] as Record<string, unknown> | undefined)
              : undefined;
            const runtime = vi
              ? (vi["runtime"] as Record<string, unknown> | undefined)
              : undefined;
            const database = vi
              ? (vi["database"] as Record<string, unknown> | undefined)
              : undefined;
            const resources = vi
              ? (vi["resources"] as Record<string, unknown> | undefined)
              : undefined;
            const container = vi
              ? (vi["container"] as Record<string, unknown> | undefined)
              : undefined;
            const services = vi
              ? (vi["services"] as Record<string, unknown> | undefined)
              : undefined;
            const probes = vi
              ? (vi["probes"] as ProbesSummary | undefined)
              : undefined;
            const healthy =
              es.health_status >= 200 && es.health_status < 300;

            return (
              <div
                key={envName}
                style={{
                  background: "var(--surface)",
                  padding: "12px 14px",
                  fontSize: "12px",
                  cursor: "pointer",
                  transition: "background .15s",
                }}
                onClick$={() => {
                  selectedEnv.value = es;
                }}
              >
                {/* Env label + health */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: "10px",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "var(--text-3)",
                    }}
                  >
                    {envName}
                  </span>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span
                      style={{
                        width: "7px",
                        height: "7px",
                        borderRadius: "50%",
                        display: "inline-block",
                        ...(healthy
                          ? {
                              background: "var(--accent)",
                              boxShadow:
                                "0 0 0 3px color-mix(in oklch, var(--accent) 20%, transparent)",
                            }
                          : {
                              background: "var(--danger)",
                              boxShadow:
                                "0 0 0 3px color-mix(in oklch, var(--danger) 20%, transparent)",
                            }),
                      }}
                    ></span>
                    <span
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: "11px",
                        color: healthy ? "var(--accent)" : "var(--danger)",
                      }}
                    >
                      {es.health_status || "down"}
                    </span>
                    {es.response_time_ms > 0 && (
                      <span
                        style={{
                          fontFamily: "var(--mono)",
                          fontSize: "10px",
                          color: "var(--text-3)",
                        }}
                      >
                        {Math.round(es.response_time_ms)}ms
                      </span>
                    )}
                  </div>
                </div>

                {/* Base URL */}
                {es.base_url && (
                  <div
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: "10.5px",
                      color: "var(--text-3)",
                      marginBottom: "6px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {es.base_url}
                  </div>
                )}

                {/* Deployed SHA + drift */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    marginBottom: "6px",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: "11px",
                      color: "var(--text-2)",
                    }}
                  >
                    {es.deployed_sha ? es.deployed_sha.slice(0, 7) : "---"}
                  </span>
                  {es.is_drifted ? (
                    <span
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: "10px",
                        color: "var(--warn)",
                        padding: "1px 5px",
                        borderRadius: "3px",
                        background:
                          "color-mix(in oklch, var(--warn) 15%, transparent)",
                        border:
                          "1px solid color-mix(in oklch, var(--warn) 30%, transparent)",
                      }}
                    >
                      drifted
                    </span>
                  ) : (
                    <span
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: "10px",
                        color: "var(--accent)",
                        opacity: 0.6,
                      }}
                    >
                      in sync
                    </span>
                  )}
                </div>

                {/* Container hostname:port, platform, uptime, go_version */}
                {runtime && (
                  <div
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: "10.5px",
                      color: "var(--text-3)",
                      marginBottom: "4px",
                      lineHeight: "1.6",
                    }}
                  >
                    {(typeof runtime["hostname"] === "string" || runtime["port"] != null) && (
                      <div>
                        {typeof runtime["hostname"] === "string" ? (runtime["hostname"] as string) : ""}
                        {runtime["port"] != null
                          ? `:${runtime["port"]}`
                          : ""}
                      </div>
                    )}
                    {typeof backend?.["platform"] === "string" && (
                      <div>{backend["platform"] as string}</div>
                    )}
                    {typeof runtime["uptime_seconds"] === "number" && (
                      <div>
                        up {formatUptime(runtime["uptime_seconds"] as number)}
                      </div>
                    )}
                    {typeof backend?.["go_version"] === "string" && (
                      <div>{backend["go_version"] as string}</div>
                    )}
                  </div>
                )}

                {/* Database */}
                {database && (
                  <div
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: "10.5px",
                      color: "var(--text-3)",
                      marginBottom: "4px",
                      lineHeight: "1.6",
                    }}
                  >
                    {typeof database["server_version"] === "string" && (
                      <div>db {database["server_version"] as string}</div>
                    )}
                    {typeof database["current_version"] === "string" && (
                      <div>
                        migration {database["current_version"] as string}
                        {database["up_to_date"] !== undefined && (
                          <span
                            style={{
                              marginLeft: "4px",
                              color: database["up_to_date"]
                                ? "var(--accent)"
                                : "var(--warn)",
                            }}
                          >
                            {database["up_to_date"]
                              ? "up to date"
                              : "pending"}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Resources */}
                {resources && (
                  <div
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: "10.5px",
                      color: "var(--text-3)",
                      marginBottom: "4px",
                      display: "flex",
                      gap: "8px",
                      flexWrap: "wrap",
                    }}
                  >
                    {typeof resources["memory_alloc_mb"] === "number" && (
                      <span>
                        mem{" "}
                        {(resources["memory_alloc_mb"] as number).toFixed(1)}MB
                      </span>
                    )}
                    {typeof resources["goroutines"] === "number" && (
                      <span>{resources["goroutines"] as number} goroutines</span>
                    )}
                  </div>
                )}

                {/* Container metrics */}
                {container && (
                  <div
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: "10.5px",
                      color: "var(--text-3)",
                      marginBottom: "4px",
                    }}
                  >
                    {typeof container["memory_usage_mb"] === "number" &&
                      typeof container["memory_limit_mb"] === "number" && (
                        <span>
                          container{" "}
                          {(container["memory_usage_mb"] as number).toFixed(0)}/
                          {(container["memory_limit_mb"] as number).toFixed(0)}
                          MB
                        </span>
                      )}
                  </div>
                )}

                {/* Services health */}
                {services && Object.keys(services).length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      gap: "6px",
                      flexWrap: "wrap",
                      marginBottom: "4px",
                      marginTop: "4px",
                    }}
                  >
                    {Object.entries(services).map(([name, svc]) => {
                      const s = svc as Record<string, unknown> | undefined;
                      if (!s) return null;
                      const status = s["status"] as string;
                      const isOk = status === "ok";
                      const latency =
                        typeof s["latency_ms"] === "number"
                          ? (s["latency_ms"] as number)
                          : null;
                      const svcName = (s["service"] as string) || name;
                      return (
                        <span
                          key={name}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            fontFamily: "var(--mono)",
                            fontSize: "10px",
                            color: isOk ? "var(--text-3)" : "var(--danger)",
                          }}
                        >
                          <span
                            style={{
                              width: "5px",
                              height: "5px",
                              borderRadius: "50%",
                              background: isOk
                                ? "var(--accent)"
                                : "var(--danger)",
                              display: "inline-block",
                            }}
                          ></span>
                          {svcName}
                          {latency !== null && (
                            <span style={{ color: "var(--text-3)" }}>
                              {latency}ms
                            </span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* MCP health */}
                {es.mcp_health_status != null && es.mcp_health_status > 0 && (
                  <div
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: "10px",
                      color:
                        es.mcp_health_status >= 200 &&
                        es.mcp_health_status < 300
                          ? "var(--accent)"
                          : "var(--warn)",
                      marginBottom: "4px",
                    }}
                  >
                    MCP {es.mcp_health_status}
                    {es.mcp_response_time_ms != null &&
                      ` ${Math.round(es.mcp_response_time_ms)}ms`}
                  </div>
                )}

                {/* Host name + IP */}
                {es.host_name && (
                  <div
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: "10.5px",
                      marginBottom: "4px",
                    }}
                  >
                    <a
                      href="/dashboard/hosts"
                      style={{
                        color: "var(--text-2)",
                        textDecoration: "none",
                      }}
                      onClick$={(e: Event) => e.stopPropagation()}
                    >
                      {es.host_name}
                      {es.host_ip && (
                        <span style={{ color: "var(--text-3)" }}>
                          {" "}
                          {es.host_ip}
                        </span>
                      )}
                    </a>
                  </div>
                )}

                {/* Running build progress bar */}
                {runningBuild && runningTotal > 0 && (
                  <div
                    style={{
                      marginTop: "6px",
                      marginBottom: "2px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontFamily: "var(--mono)",
                        fontSize: "10px",
                        color: "var(--info)",
                        marginBottom: "3px",
                      }}
                    >
                      <span>building</span>
                      <span>
                        {runningDone}/{runningTotal} jobs
                      </span>
                    </div>
                    <div
                      style={{
                        height: "3px",
                        background: "var(--bg-2)",
                        borderRadius: "2px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          background: "var(--info)",
                          width: `${runningTotal > 0 ? (runningDone / runningTotal) * 100 : 0}%`,
                          transition: "width .3s",
                        }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Probes (per-env from version_info) */}
                {probes && probes.regions && probes.regions.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      marginTop: "6px",
                      fontFamily: "var(--mono)",
                      fontSize: "10px",
                      color: "var(--text-3)",
                    }}
                  >
                    <span>
                      probes {probes.connected}/{probes.total}
                    </span>
                    {probes.regions.map((r: ProbeRegion) => (
                      <span
                        key={r.slug}
                        title={`${r.name} ${r.connected ? "connected" : "disconnected"}`}
                        style={{
                          width: "5px",
                          height: "5px",
                          borderRadius: "50%",
                          display: "inline-block",
                          background: r.connected
                            ? "var(--accent)"
                            : "var(--danger)",
                        }}
                      ></span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Build strip (latest build) ── */}
        {latestBuild && (
          <div
            style={{
              padding: "10px 16px",
              borderTop: "1px solid var(--line-soft)",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontSize: "12px",
              flexWrap: "wrap",
            }}
          >
            {/* Status icon */}
            <div class={`ico ${statusIconClass(latestBuild.status)}`}>
              <StatusIcon status={latestBuild.status} />
            </div>

            {/* CI provider */}
            <CIProviderIcon
              provider={latestBuild.provider_type ?? "github"}
              size={14}
            />

            {/* Branch */}
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: "11px",
                color: "var(--text-2)",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <line x1="6" y1="3" x2="6" y2="15" />
                <circle cx="18" cy="6" r="3" />
                <circle cx="6" cy="18" r="3" />
                <path d="M18 9a9 9 0 0 1-9 9" />
              </svg>
              {latestBuild.branch}
            </span>

            {/* Commit SHA */}
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: "11px",
                color: "var(--text-3)",
              }}
            >
              {latestBuild.commit_sha.slice(0, 7)}
            </span>

            {/* Commit message */}
            <span
              style={{
                color: "var(--text-2)",
                fontSize: "12px",
                flex: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                minWidth: 0,
              }}
            >
              {latestBuild.commit_message}
            </span>

            {/* Time ago */}
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: "10.5px",
                color: "var(--text-3)",
              }}
            >
              {timeAgo(latestBuild.created_at)}
            </span>

            {/* Duration */}
            {latestBuild.duration_ms != null && latestBuild.duration_ms > 0 && (
              <span
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: "10.5px",
                  color: "var(--text-2)",
                }}
              >
                {formatDuration(latestBuild.duration_ms)}
              </span>
            )}

            {/* External link */}
            <a
              href={latestBuild.provider_url}
              target="_blank"
              rel="noopener noreferrer"
              class="icon-btn"
              onClick$={(e: Event) => e.stopPropagation()}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>

            {/* Job pipeline */}
            {latestBuild.jobs && latestBuild.jobs.length > 0 && (
              <div
                style={{
                  display: "flex",
                  gap: "3px",
                  alignItems: "center",
                  marginLeft: "4px",
                }}
              >
                {latestBuild.jobs.map((job: BuildJob) => (
                  <span
                    key={job.id}
                    title={`${job.name}: ${job.status}`}
                    class={`ico ${statusIconClass(job.status)}`}
                    style={{ width: "14px", height: "14px", fontSize: "8px" }}
                  >
                    <StatusIcon status={job.status} size={7} />
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Probe agents strip ── */}
        {probesSummary && (
          <div
            style={{
              padding: "6px 16px",
              borderTop: "1px solid var(--line-soft)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontFamily: "var(--mono)",
              fontSize: "10.5px",
              color: "var(--text-3)",
            }}
          >
            <span>
              Probes {probesSummary.connected}/{probesSummary.total}
            </span>
            {probesSummary.regions.map((r: ProbeRegion) => (
              <span
                key={r.slug}
                title={`${r.name} ${r.connected ? "connected" : "disconnected"}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                }}
              >
                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    display: "inline-block",
                    background: r.connected
                      ? "var(--accent)"
                      : "var(--danger)",
                  }}
                ></span>
                {r.name}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  },
);

/* ================================================================
   MAIN DASHBOARD COMPONENT
   ================================================================ */

export default component$(() => {
  const loading = useSignal(true);
  const dashboard = useSignal<DashboardEntry[]>([]);
  const driftProjects = useSignal<DriftProject[]>([]);
  const incidents = useSignal<ResourceIncident[]>([]);
  const groups = useSignal<ProjectGroup[]>([]);
  const lastSynced = useSignal<string>("");
  const wsConnected = useSignal(false);
  const envFilter = useSignal<string>("all");
  const collapsedGroups = useSignal<Set<string>>(new Set());
  const selectedEnv = useSignal<EnvironmentStatus | null>(null);
  const syncing = useSignal<number | null>(null);

  /* ── data fetching ── */

  const doRefresh$ = $(async () => {
    try {
      const [dashData, driftData, incData, grpData] = await Promise.all([
        fetchDashboard(),
        fetchDrift(),
        fetchIncidents(50),
        fetchGroups(),
      ]);
      dashboard.value = dashData;
      driftProjects.value = driftData.projects;
      incidents.value = incData;
      groups.value = grpData;
      lastSynced.value = new Date().toISOString();
    } catch (e) {
      console.error("Dashboard refresh failed:", e);
    }
  });

  const handleSync$ = $(async (projectId: number) => {
    syncing.value = projectId;
    try {
      await syncProject(projectId);
      await doRefresh$();
    } catch (e) {
      console.error("Sync failed:", e);
    }
    syncing.value = null;
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    collapsedGroups.value = loadCollapsedGroups();
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
        ws.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data);
            const t = msg.type || "";
            if (
              t.startsWith("build.") ||
              t === "version.updated" ||
              t.startsWith("incident.")
            ) {
              doRefresh$();
            }
          } catch {
            doRefresh$();
          }
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

  const allBuilds = useComputed$(() => {
    const all: Build[] = [];
    for (const entry of dashboard.value) {
      for (const b of entry.builds) {
        all.push(b);
      }
    }
    return all;
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

  const successRate = useComputed$(() => {
    const builds = allBuilds.value;
    if (builds.length === 0) return "0";
    const ok = builds.filter((b) => b.status === "success").length;
    return ((ok / builds.length) * 100).toFixed(1);
  });

  const runningCount = useComputed$(
    () => allBuilds.value.filter((b) => b.status === "running").length,
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

  /* ── Build a project-id -> builds map ── */
  const buildsMap = useComputed$(() => {
    const m = new Map<number, Build[]>();
    for (const entry of dashboard.value) {
      m.set(entry.project.id, entry.builds);
    }
    return m;
  });

  /* ── Filtered drift projects by env ── */
  const filteredDriftProjects = useComputed$(() => {
    if (envFilter.value === "all") return driftProjects.value;
    return driftProjects.value
      .map((dp) => ({
        ...dp,
        environments: dp.environments.filter(
          (e) => e.env === envFilter.value,
        ),
      }))
      .filter((dp) => dp.environments.length > 0);
  });

  /* ── Group projects ── */
  const groupedProjects = useComputed$(() => {
    const result: {
      group: ProjectGroup | null;
      projects: DriftProject[];
    }[] = [];
    const visibleGroups = groups.value
      .filter((g) => g.visible)
      .sort((a, b) => a.sort_order - b.sort_order);

    for (const g of visibleGroups) {
      const projs = filteredDriftProjects.value.filter(
        (dp) => dp.project.group_id === g.id,
      );
      if (projs.length > 0) {
        result.push({ group: g, projects: projs });
      }
    }

    // Ungrouped
    const groupIds = new Set(visibleGroups.map((g) => g.id));
    const ungrouped = filteredDriftProjects.value.filter(
      (dp) => !dp.project.group_id || !groupIds.has(dp.project.group_id),
    );
    if (ungrouped.length > 0) {
      result.push({ group: null, projects: ungrouped });
    }

    return result;
  });

  /* ── render ── */

  if (loading.value) {
    return (
      <div
        class="main-content"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "400px",
        }}
      >
        <div class="spinner"></div>
      </div>
    );
  }

  return (
    <div>
      {/* ── Environment Detail Modal ── */}
      <EnvironmentDetail env={selectedEnv} />

      {/* ── Page top bar ── */}
      <div class="page-top">
        <div class="breadcrumb">
          workspace <span>/</span> <b>overview</b>
        </div>
        <div class="page-top-actions">
          <button
            class="btn btn-ghost"
            onClick$={() => doRefresh$()}
            title="Refresh"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            Refresh
          </button>
          <a href="/dashboard/projects/new" class="btn btn-primary">
            New project
          </a>
        </div>
      </div>

      {/* ── Greeting ── */}
      <div class="greet">
        <div>
          <h1>
            Overview{" "}
            <em>
              &middot; {driftProjects.value.length} projects &middot;{" "}
              {allBuilds.value.length} builds
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

      {/* ── Environment filter tabs ── */}
      <div class="filter-bar">
        <span
          class={`fchip${envFilter.value === "all" ? " active" : ""}`}
          onClick$={() => {
            envFilter.value = "all";
          }}
        >
          All environments
        </span>
        {ENVS_ORDER.map((env) => (
          <span
            key={env}
            class={`fchip${envFilter.value === env ? " active" : ""}`}
            onClick$={() => {
              envFilter.value = envFilter.value === env ? "all" : env;
            }}
          >
            {env}
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: "10px",
                opacity: 0.6,
              }}
            >
              {
                allEnvs.value.filter(
                  (e) =>
                    e.env === env &&
                    e.health_status >= 200 &&
                    e.health_status < 300,
                ).length
              }
              /{allEnvs.value.filter((e) => e.env === env).length}
            </span>
          </span>
        ))}
        <span style={{ flex: 1 }}></span>
      </div>

      {/* ── KPIs ── */}
      <div class="kpis">
        <div class="kpi">
          <div class="kpi-label">
            Build success rate
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.4"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="m9 12 2 2 4-4" />
            </svg>
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
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.4"
              stroke-linecap="round"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          </div>
          <div class="kpi-value">{runningCount.value}</div>
          <div class="kpi-foot">active builds</div>
        </div>

        <div class="kpi">
          <div class="kpi-label">
            Avg duration
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.4"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div class="kpi-value">{avgDuration.value}</div>
          <div class="kpi-foot">completed builds average</div>
        </div>

        <div class="kpi">
          <div class="kpi-label">
            Open incidents
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.4"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div class="kpi-value">{openIncidents.value.length}</div>
          <div class="kpi-foot">
            {incidents.value.filter((i) => !!i.resolved_at).length} resolved
          </div>
        </div>

        <div class="kpi">
          <div class="kpi-label">
            Drift detected
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.4"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M18 20V10" />
              <path d="M12 20V4" />
              <path d="M6 20v-6" />
            </svg>
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

      {/* ── Incidents banner ── */}
      <IncidentsBanner incidents={openIncidents.value} />

      {/* ── Project groups ── */}
      {groupedProjects.value.map((groupEntry, gi) => {
        const { group, projects } = groupEntry;
        const groupKey = group ? group.slug : "__ungrouped__";
        const isCollapsed = collapsedGroups.value.has(groupKey);

        return (
          <div key={gi} style={{ marginBottom: "28px" }}>
            {/* Group header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "12px",
                cursor: "pointer",
                userSelect: "none",
              }}
              onClick$={() => {
                const next = new Set(collapsedGroups.value);
                if (next.has(groupKey)) {
                  next.delete(groupKey);
                } else {
                  next.add(groupKey);
                }
                collapsedGroups.value = next;
                saveCollapsedGroups(next);
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--text-2)"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                style={{
                  transform: isCollapsed ? "rotate(0)" : "rotate(90deg)",
                  transition: "transform .15s",
                }}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
              <h2
                style={{
                  fontSize: "16px",
                  fontWeight: "600",
                  letterSpacing: "-0.01em",
                  margin: 0,
                  color: "var(--text)",
                }}
              >
                {group ? group.name : "Ungrouped"}
              </h2>
              <span
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: "11px",
                  color: "var(--text-3)",
                  padding: "1px 7px",
                  borderRadius: "10px",
                  background: "var(--bg-2)",
                  border: "1px solid var(--line-soft)",
                }}
              >
                {projects.length}
              </span>
            </div>

            {/* Projects */}
            {!isCollapsed &&
              projects.map((dp) => (
                <ProjectCard
                  key={dp.project.id}
                  project={dp.project}
                  environments={dp.environments}
                  builds={buildsMap.value.get(dp.project.id) ?? []}
                  selectedEnv={selectedEnv}
                  onSync$={handleSync$}
                />
              ))}
          </div>
        );
      })}

      {/* Empty state */}
      {driftProjects.value.length === 0 && !loading.value && (
        <div
          class="panel"
          style={{
            padding: "48px",
            textAlign: "center",
            color: "var(--text-3)",
          }}
        >
          <p style={{ fontSize: "15px", marginBottom: "16px" }}>
            No projects configured yet.
          </p>
          <a href="/dashboard/projects/new" class="btn btn-primary">
            Create your first project
          </a>
        </div>
      )}
    </div>
  );
});
