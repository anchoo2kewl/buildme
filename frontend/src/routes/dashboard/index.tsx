import { component$, useSignal, useVisibleTask$, useComputed$, $, type Signal } from "@builder.io/qwik";
import { fetchDrift, fetchDashboard, fetchVersionOverview } from "~/lib/api";
import type {
  DriftDashboard,
  DashboardEntry,
  EnvironmentStatus,
  DriftProject,
  Build,
  ProbesSummary,
  ProviderType,
  VersionOverviewEntry,
} from "~/lib/types";
import { parseMetadata } from "~/lib/types";
import { EnvironmentDetail } from "~/components/environments/environment-detail";
import { CIProviderIcon, providerDisplayName } from "~/components/shared/ci-provider-icon";

type EnvFilter = "all" | "production" | "staging" | "uat";

const ENVS_ORDER = ["production", "staging", "uat"] as const;

export default component$(() => {
  const drift = useSignal<DriftDashboard | null>(null);
  const dashboard = useSignal<DashboardEntry[] | null>(null);
  const versionOverview = useSignal<VersionOverviewEntry[] | null>(null);
  const selectedEnv = useSignal<EnvironmentStatus | null>(null);
  const loading = useSignal(true);
  const refreshing = useSignal(false);
  const lastChecked = useSignal<string | null>(null);
  const envFilter = useSignal<EnvFilter>("all");

  const doRefresh = $(async () => {
    const [driftData, dashData, versionData] = await Promise.all([
      fetchDrift().catch(() => null),
      fetchDashboard().catch(() => null),
      fetchVersionOverview().catch(() => null),
    ]);
    drift.value = driftData;
    dashboard.value = dashData;
    versionOverview.value = versionData;
    lastChecked.value = new Date().toLocaleTimeString();
  });

  useVisibleTask$(async ({ cleanup }) => {
    await doRefresh();
    loading.value = false;

    // Listen for version.updated and build events via WebSocket
    const token = typeof window !== "undefined" ? localStorage.getItem("buildme_token") : null;
    if (token && typeof window !== "undefined") {
      const { BuildMeWS } = await import("~/lib/ws");
      const ws = new BuildMeWS(token);
      ws.connect();

      // Subscribe to all projects once drift data is loaded
      if (drift.value?.projects) {
        for (const dp of drift.value.projects) {
          ws.subscribe(dp.project.id);
        }
      }

      const unsub = ws.onEvent((event) => {
        if (event.type === "version.updated" || event.type === "build.completed" || event.type === "build.created") {
          doRefresh();
        }
      });

      cleanup(() => {
        unsub();
        ws.disconnect();
      });
    }
  });

  // Merge drift + builds into unified card data
  const cards = useComputed$(() => {
    if (!drift.value) return [];
    return drift.value.projects
      .filter((dp) => {
        if (envFilter.value === "all") return true;
        return dp.environments.some((e) => e.env === envFilter.value);
      })
      .map((dp) => {
        const builds =
          dashboard.value?.find((d) => d.project.id === dp.project.id)
            ?.builds ?? [];
        return { dp, builds };
      });
  });

  return (
    <div>
      <div class="mb-6 flex items-center justify-between">
        <h1 class="text-2xl font-bold text-text">Dashboard</h1>
        <div class="flex items-center gap-3">
          {lastChecked.value && (
            <span class="text-xs text-muted">
              Last checked {lastChecked.value}
            </span>
          )}
          <button
            class="rounded-lg border border-border bg-elevated px-3 py-1.5 text-sm text-text transition-colors hover:border-accent/50 disabled:opacity-50"
            disabled={refreshing.value}
            onClick$={async () => {
              refreshing.value = true;
              await doRefresh();
              refreshing.value = false;
            }}
          >
            {refreshing.value ? "Refreshing..." : "Refresh"}
          </button>
          <a
            href="/dashboard/projects/new"
            class="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            New Project
          </a>
        </div>
      </div>

      {/* Environment filter tabs */}
      <div class="mb-4 flex border-b border-border">
        {(["all", "production", "staging", "uat"] as const).map((tab) => (
          <button
            key={tab}
            class={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
              envFilter.value === tab
                ? "border-b-2 border-accent text-accent"
                : "text-muted hover:text-text"
            }`}
            onClick$={() => {
              envFilter.value = tab;
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading.value ? (
        <div class="flex items-center justify-center p-8">
          <div class="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      ) : cards.value.length === 0 ? (
        <div class="rounded-lg border border-border bg-elevated p-12 text-center">
          <h2 class="text-lg font-semibold text-text">No projects</h2>
          <p class="mt-2 text-sm text-muted">
            Configure environment URLs on your projects to see status.
          </p>
        </div>
      ) : (
        <div class="bm-cards flex flex-col gap-4">
          {cards.value.map(({ dp, builds }) => (
            <ProjectCard
              key={dp.project.id}
              dp={dp}
              builds={builds}
              envFilter={envFilter.value}
              selectedEnv={selectedEnv}
            />
          ))}
        </div>
      )}

      <EnvironmentDetail env={selectedEnv} />
    </div>
  );
});

// ─── Helpers ──────────────────────────────────────

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m > 0) return `${m}m${sec > 0 ? `${sec}s` : ""}`;
  return `${sec}s`;
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h`;
  const m = Math.floor(seconds / 60);
  return `${m}m`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function statusColor(status: number): string {
  if (status === 200) return "bg-success";
  if (status > 0) return "bg-warning";
  return "bg-failure";
}

function buildStatusColor(status: string): string {
  switch (status) {
    case "success":
      return "text-success";
    case "failure":
    case "error":
      return "text-failure";
    case "running":
    case "queued":
      return "text-running";
    case "cancelled":
      return "text-warning";
    default:
      return "text-muted";
  }
}

function buildStatusIcon(status: string): string {
  switch (status) {
    case "success":
      return "\u2713";
    case "failure":
    case "error":
      return "\u2717";
    case "running":
      return "\u25CB";
    case "queued":
      return "\u25CB";
    case "cancelled":
      return "\u25CB";
    default:
      return "\u00B7";
  }
}

function getVal(
  obj: Record<string, unknown> | null | undefined,
  ...keys: string[]
): unknown {
  let cur: unknown = obj;
  for (const k of keys) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[k];
  }
  return cur;
}

// ─── Project Card ─────────────────────────────────

interface ProjectCardProps {
  dp: DriftProject;
  builds: Build[];
  envFilter: EnvFilter;
  selectedEnv: Signal<EnvironmentStatus | null>;
}

const ProjectCard = component$<ProjectCardProps>(
  ({ dp, builds, envFilter, selectedEnv }) => {
    const meta = parseMetadata(dp.project);
    // Unique CI providers from builds
    const ciProviders = [
      ...new Set(
        builds
          .map((b) => b.provider_type)
          .filter((t): t is ProviderType => !!t),
      ),
    ];
    const envs = ENVS_ORDER.filter((env) => {
      if (envFilter !== "all" && env !== envFilter) return false;
      return dp.environments.some((e) => e.env === env);
    });

    // Find the main branch build (latest)
    const mainBuild = builds.find((b) => b.branch === "main") ?? builds[0];

    // Extract probes — prefer production (where probes connect), fall back to any env
    const probes = dp.environments.reduce<ProbesSummary | null>((acc, e) => {
      const p = e.version_info?.["probes"] as ProbesSummary | undefined;
      if (!p) return acc;
      // Prefer the environment with more connected probes
      if (!acc || (p.connected ?? 0) > (acc.connected ?? 0)) return p;
      return acc;
    }, null);

    return (
      <div class="bm-card rounded-xl border border-border bg-elevated">
        {/* Card Header */}
        <div class="flex items-center justify-between border-b border-border px-5 py-3">
          <div class="flex items-center gap-3">
            <a
              href={`/dashboard/projects/${dp.project.id}`}
              class="text-base font-bold text-text hover:text-accent"
            >
              {dp.project.name}
            </a>
            {dp.project.description && (
              <span class="text-xs text-muted">
                {dp.project.description}
              </span>
            )}
          </div>
          <div class="flex items-center gap-2">
            {ciProviders.map((pt) => (
              <span
                key={pt}
                class="bm-tag inline-flex items-center gap-1 rounded bg-border/50 px-2 py-0.5 text-[11px] font-medium text-muted"
                title={providerDisplayName(pt)}
              >
                <CIProviderIcon provider={pt} size={14} />
              </span>
            ))}
            {meta.mcp_url && (() => {
              let port = "";
              try {
                const u = new URL(meta.mcp_url);
                if (u.port) port = `:${u.port}`;
              } catch { /* ignore */ }
              return (
                <span
                  class="bm-tag inline-flex items-center gap-1 rounded bg-success/15 px-2 py-0.5 text-[11px] font-medium text-success"
                  title={meta.mcp_url}
                >
                  <span class="inline-block h-1.5 w-1.5 rounded-full bg-success" />
                  MCP{port}
                </span>
              );
            })()}
            {meta.deployment_type && (
              <span class="bm-tag rounded bg-accent/15 px-2 py-0.5 text-[11px] font-medium text-accent">
                {meta.deployment_type}
              </span>
            )}
            {meta.tech_stack?.map((t) => (
              <span
                key={t}
                class="bm-tag rounded bg-border/50 px-2 py-0.5 text-[11px] font-medium text-muted"
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Environment Columns */}
        <div
          class="bm-env-grid grid gap-0 divide-x divide-border"
          style={{ gridTemplateColumns: `repeat(${envs.length}, 1fr)` }}
        >
          {envs.map((env) => {
            const es = dp.environments.find((e) => e.env === env);
            if (!es) return null;
            const vi = es.version_info;
            const runtime = vi?.["runtime"] as
              | Record<string, unknown>
              | undefined;
            const backend = vi?.["backend"] as
              | Record<string, unknown>
              | undefined;
            const frontend = vi?.["frontend"] as
              | Record<string, unknown>
              | undefined;
            const database = vi?.["database"] as
              | Record<string, unknown>
              | undefined;
            const envProbes = vi?.["probes"] as
              | { total?: number; connected?: number }
              | undefined;
            const ports = meta.ports?.[env];

            return (
              <button
                key={env}
                class="bm-env-col px-4 py-3 text-left transition-colors hover:bg-surface/50"
                onClick$={() => {
                  selectedEnv.value = es;
                }}
              >
                <div class="mb-2 flex items-center justify-between">
                  <span class="text-[11px] font-semibold uppercase tracking-wider text-muted">
                    {env}
                  </span>
                  <div class="flex items-center gap-1.5">
                    <span
                      class={`inline-block h-2 w-2 rounded-full ${statusColor(es.health_status)}`}
                    />
                    <span class="font-mono text-xs text-text">
                      {es.health_status || "—"}
                    </span>
                    <span class="text-xs text-muted">
                      {es.response_time_ms}ms
                    </span>
                  </div>
                </div>

                {/* URL */}
                <div class="mb-1 truncate text-xs text-muted">
                  {es.base_url.replace(/^https?:\/\//, "")}
                </div>

                {/* SHA + drift */}
                <div class="mb-1 flex items-center gap-2">
                  {es.deployed_sha && (
                    <span class="font-mono text-xs text-text">
                      {es.deployed_sha.substring(0, 7)}
                    </span>
                  )}
                  {es.branch_head_sha &&
                    es.deployed_sha &&
                    es.deployed_sha.substring(0, 7) !==
                      es.branch_head_sha.substring(0, 7) && (
                      <span class="font-mono text-xs text-muted">
                        {"→ "}
                        {es.branch_head_sha.substring(0, 7)}
                      </span>
                    )}
                </div>
                <div class="mb-1">
                  {es.is_drifted ? (
                    <span class="text-[11px] font-medium text-warning">
                      drifted
                    </span>
                  ) : es.deployed_sha ? (
                    <span class="text-[11px] font-medium text-success">
                      in sync
                    </span>
                  ) : null}
                </div>

                {/* Port + runtime info */}
                <div class="flex flex-wrap items-center gap-x-2 text-[11px] text-muted">
                  {ports && ports.length > 0 && (
                    <span>
                      {ports.map((p) => `:${p}`).join("/")}
                    </span>
                  )}
                  {typeof runtime?.["hostname"] === "string" && (
                    <span>{String(runtime["hostname"])}</span>
                  )}
                  {typeof backend?.["platform"] === "string" && (
                    <span>{String(backend["platform"])}</span>
                  )}
                  {typeof runtime?.["uptime_seconds"] === "number" && (
                    <span>
                      up {formatUptime(runtime["uptime_seconds"] as number)}
                    </span>
                  )}
                  {typeof backend?.["go_version"] === "string" && (
                    <span>{String(backend["go_version"])}</span>
                  )}
                  {typeof frontend?.["version"] === "string" && (
                    <span>v{String(frontend["version"])}</span>
                  )}
                  {typeof frontend?.["nodeVersion"] === "string" && (
                    <span>{String(frontend["nodeVersion"])}</span>
                  )}
                </div>

                {/* DB + resources */}
                <div class="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted">
                  {typeof database?.["server_version"] === "string" ? (
                    <span>{String(database["server_version"])}</span>
                  ) : typeof database?.["type"] === "string" ? (
                    <span>{String(database["type"])}</span>
                  ) : null}
                  {typeof database?.["current_version"] === "number" && (
                    <span>
                      migration v{Number(database["current_version"])}
                      {database["up_to_date"] === true ? "" : " (pending)"}
                    </span>
                  )}
                  {!!vi?.["resources"] && typeof (vi["resources"] as Record<string, unknown>)?.["memory_alloc_mb"] === "number" && (
                    <span>
                      {((vi["resources"] as Record<string, unknown>)["memory_alloc_mb"] as number).toFixed(1)}MB
                    </span>
                  )}
                  {!!vi?.["resources"] && typeof (vi["resources"] as Record<string, unknown>)?.["goroutines"] === "number" && (
                    <span>
                      {Number((vi["resources"] as Record<string, unknown>)["goroutines"])} gr
                    </span>
                  )}
                  {envProbes && typeof envProbes.total === "number" && envProbes.total > 0 && (
                    <span>
                      {envProbes.connected}/{envProbes.total} probes
                    </span>
                  )}
                </div>

                {/* Container metrics */}
                {!!vi?.["container"] && (
                  <div class="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted">
                    {typeof (vi["container"] as Record<string, unknown>)?.["memory_usage_mb"] === "number" && (
                      <span>
                        container{" "}
                        {((vi["container"] as Record<string, unknown>)["memory_usage_mb"] as number).toFixed(0)}MB
                        {typeof (vi["container"] as Record<string, unknown>)?.["memory_limit_mb"] === "number" &&
                          `/${((vi["container"] as Record<string, unknown>)["memory_limit_mb"] as number).toFixed(0)}MB`}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Build Strip */}
        {mainBuild && (
          <div class="border-t border-border px-5 py-2.5">
            <div class="flex items-center gap-3 text-xs">
              <span class={buildStatusColor(mainBuild.status)}>
                {buildStatusIcon(mainBuild.status)}
              </span>
              {mainBuild.provider_type && (
                <CIProviderIcon provider={mainBuild.provider_type} size={14} />
              )}
              <span class="font-medium text-text">{mainBuild.branch}</span>
              <span class="font-mono text-muted">
                {mainBuild.commit_sha?.substring(0, 7)}
              </span>
              <span class="min-w-0 flex-1 truncate text-muted">
                "{mainBuild.commit_message}"
              </span>
              {mainBuild.created_at && (
                <span class="text-muted">{timeAgo(mainBuild.created_at)}</span>
              )}
              {mainBuild.duration_ms != null && (
                <span class="text-muted">
                  {formatDuration(mainBuild.duration_ms)}
                </span>
              )}
              {mainBuild.provider_url && (
                <a
                  href={mainBuild.provider_url}
                  target="_blank"
                  rel="noopener"
                  class="text-muted hover:text-accent"
                  onClick$={(e: Event) => e.stopPropagation()}
                >
                  ↗
                </a>
              )}
            </div>

            {/* Job pipeline */}
            {mainBuild.jobs && mainBuild.jobs.length > 0 && (
              <div class="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                {mainBuild.jobs.map((job) => (
                  <span key={job.id} class="flex items-center gap-1">
                    <span class={buildStatusColor(job.status)}>
                      {buildStatusIcon(job.status)}
                    </span>
                    <span class="text-muted">{job.name}</span>
                    {job.duration_ms != null && (
                      <span class="text-muted">
                        {formatDuration(job.duration_ms)}
                      </span>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Probe Agents */}
        {probes && probes.regions && probes.regions.length > 0 && (
          <div class="border-t border-border px-5 py-2.5">
            <div class="flex items-center gap-3 text-xs">
              <span class="text-[11px] font-semibold uppercase tracking-wider text-muted">
                Probes
              </span>
              <div class="flex items-center gap-2">
                {probes.regions.map((r) => (
                  <span
                    key={r.slug}
                    class="flex items-center gap-1"
                    title={`${r.name}${r.probe_version ? ` (${r.probe_version})` : ""}${r.uptime_seconds ? ` up ${formatUptime(r.uptime_seconds)}` : ""}`}
                  >
                    <span
                      class={`inline-block h-1.5 w-1.5 rounded-full ${r.connected ? "bg-success" : "bg-failure"}`}
                    />
                    <span class="text-muted">{r.slug}</span>
                  </span>
                ))}
              </div>
              <span class="text-muted">
                {probes.connected}/{probes.total} connected
              </span>
              {probes.regions[0]?.probe_version && (
                <span class="font-mono text-muted">
                  {probes.regions[0].probe_version}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  },
);
