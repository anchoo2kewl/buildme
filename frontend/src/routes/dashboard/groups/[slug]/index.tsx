import { component$, useSignal, useVisibleTask$, useComputed$, $, type Signal } from "@builder.io/qwik";
import { useLocation, type StaticGenerateHandler } from "@builder.io/qwik-city";
import { fetchGroupBySlug, fetchDrift, fetchDashboard, syncProject } from "~/lib/api";
import type {
  ProjectGroup,
  DriftDashboard,
  DashboardEntry,
  EnvironmentStatus,
  DriftProject,
  Build,
  ProbesSummary,
  ProviderType,
} from "~/lib/types";
import { parseMetadata } from "~/lib/types";
import { getRouteParams } from "~/lib/route-params";
import { EnvironmentDetail } from "~/components/environments/environment-detail";
import { CIProviderIcon, providerDisplayName } from "~/components/shared/ci-provider-icon";

export const onStaticGenerate: StaticGenerateHandler = async () => {
  return { params: [{ slug: "_" }] };
};

type EnvFilter = "all" | "production" | "staging" | "uat";
const ENVS_ORDER = ["production", "staging", "uat"] as const;

export default component$(() => {
  const loc = useLocation();
  const group = useSignal<ProjectGroup | null>(null);
  const drift = useSignal<DriftDashboard | null>(null);
  const dashboard = useSignal<DashboardEntry[] | null>(null);
  const selectedEnv = useSignal<EnvironmentStatus | null>(null);
  const loading = useSignal(true);
  const refreshing = useSignal(false);
  const lastChecked = useSignal<string | null>(null);
  const envFilter = useSignal<EnvFilter>("all");
  const error = useSignal<string | null>(null);
  const copied = useSignal(false);

  const doRefresh = $(async () => {
    const slug = getRouteParams().slug || loc.params.slug;
    if (!slug || slug === "_") return;

    try {
      const [groupData, driftData, dashData] = await Promise.all([
        fetchGroupBySlug(slug),
        fetchDrift().catch(() => null),
        fetchDashboard().catch(() => null),
      ]);
      group.value = groupData;
      drift.value = driftData;
      dashboard.value = dashData;
      lastChecked.value = new Date().toLocaleTimeString();
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to load group";
    }
  });

  useVisibleTask$(async ({ cleanup }) => {
    await doRefresh();
    loading.value = false;

    // Listen for events via WebSocket
    const token = typeof window !== "undefined" ? localStorage.getItem("buildme_token") : null;
    if (token && typeof window !== "undefined" && drift.value?.projects) {
      const { BuildMeWS } = await import("~/lib/ws");
      const ws = new BuildMeWS(token);
      ws.connect();

      for (const dp of drift.value.projects) {
        if (dp.project.group_id === group.value?.id) {
          ws.subscribe(dp.project.id);
        }
      }

      const unsub = ws.onEvent((event) => {
        if (event.type === "version.updated" || event.type === "build.completed" || event.type === "build.created" || event.type === "build.updated") {
          doRefresh();
        }
      });

      cleanup(() => {
        unsub();
        ws.disconnect();
      });
    }
  });

  // Filter to only projects in this group
  const cards = useComputed$(() => {
    if (!drift.value || !group.value) return [];
    return drift.value.projects
      .filter((dp) => dp.project.group_id === group.value!.id)
      .filter((dp) => {
        if (envFilter.value === "all") return true;
        return dp.environments.some((e) => e.env === envFilter.value);
      })
      .map((dp) => {
        const builds =
          dashboard.value?.find((d) => d.project.id === dp.project.id)?.builds ?? [];
        return { dp, builds };
      });
  });

  if (loading.value) {
    return (
      <div class="flex items-center justify-center p-8">
        <div class="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  if (error.value) {
    return (
      <div class="rounded-lg border border-border bg-elevated p-12 text-center">
        <h2 class="text-lg font-semibold text-failure">{error.value}</h2>
        <a href="/dashboard/groups" class="mt-4 inline-block text-sm text-accent hover:underline">
          Back to Groups
        </a>
      </div>
    );
  }

  return (
    <div>
      <div class="mb-6 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <a href="/dashboard/groups" class="text-muted transition-colors hover:text-text">
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </a>
          <h1 class="text-2xl font-bold text-text">{group.value?.name ?? "Group"}</h1>
          <span class="text-sm text-muted">
            {cards.value.length} project{cards.value.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div class="flex items-center gap-3">
          {lastChecked.value && (
            <span class="text-xs text-muted">
              Last checked {lastChecked.value}
            </span>
          )}
          <button
            class="inline-flex items-center gap-1.5 rounded-lg border border-border bg-elevated px-3 py-1.5 text-sm text-text transition-all hover:border-accent/40 hover:shadow-[0_0_12px_rgba(129,140,248,0.06)]"
            onClick$={() => {
              const url = window.location.href;
              navigator.clipboard.writeText(url).then(() => {
                copied.value = true;
                setTimeout(() => (copied.value = false), 2000);
              });
            }}
          >
            <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            {copied.value ? "Copied!" : "Share"}
          </button>
          <button
            class="inline-flex items-center gap-1.5 rounded-lg border border-border bg-elevated px-3 py-1.5 text-sm text-text transition-all hover:border-accent/40 hover:shadow-[0_0_12px_rgba(129,140,248,0.06)] disabled:opacity-50"
            disabled={refreshing.value}
            onClick$={async () => {
              refreshing.value = true;
              await doRefresh();
              refreshing.value = false;
            }}
          >
            <svg class={`h-3.5 w-3.5 ${refreshing.value ? "animate-spin" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
            </svg>
            {refreshing.value ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Environment filter pills */}
      <div class="mb-5 inline-flex rounded-xl bg-elevated/60 p-1">
        {(["all", "production", "staging", "uat"] as const).map((tab) => (
          <button
            key={tab}
            class={`rounded-lg px-4 py-1.5 text-sm font-medium capitalize transition-all ${
              envFilter.value === tab
                ? "bg-accent/15 text-accent shadow-sm"
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

      {cards.value.length === 0 ? (
        <div class="rounded-lg border border-border bg-elevated p-12 text-center">
          <h2 class="text-lg font-semibold text-text">No projects in this group</h2>
          <p class="mt-2 text-sm text-muted">
            Assign projects to this group from the{" "}
            <a href="/dashboard/groups" class="text-accent hover:underline">groups management page</a>.
          </p>
        </div>
      ) : (
        <div class="bm-cards flex flex-col gap-4">
          {cards.value.map(({ dp, builds }) => (
            <GroupProjectCard
              key={dp.project.id}
              dp={dp}
              builds={builds}
              envFilter={envFilter.value}
              selectedEnv={selectedEnv}
              onRefresh$={doRefresh}
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

function formatElapsed(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m > 0) return `${m}m${sec > 0 ? `${sec}s` : ""}`;
  return `${sec}s`;
}

function statusColor(status: number): string {
  if (status === 200) return "bg-success bm-dot-success";
  if (status > 0) return "bg-warning bm-dot-warning";
  return "bg-failure bm-dot-failure";
}

function buildStatusColor(status: string): string {
  switch (status) {
    case "success": return "text-success";
    case "failure": case "error": return "text-failure";
    case "running": case "queued": return "text-running";
    case "cancelled": return "text-warning";
    default: return "text-muted";
  }
}

function BuildStatusIcon({ status }: { status: string }) {
  const cls = "h-3.5 w-3.5";
  switch (status) {
    case "success":
      return (
        <svg class={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10" opacity="0.2" fill="currentColor" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
    case "failure": case "error":
      return (
        <svg class={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10" opacity="0.2" fill="currentColor" />
          <path d="m15 9-6 6M9 9l6 6" />
        </svg>
      );
    case "running":
      return (
        <svg class={`${cls} animate-spin`} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      );
    case "queued":
      return (
        <svg class={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );
    case "cancelled":
      return (
        <svg class={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <circle cx="12" cy="12" r="10" opacity="0.2" fill="currentColor" />
          <path d="M4.93 4.93l14.14 14.14" />
        </svg>
      );
    default:
      return <span class="inline-block h-1.5 w-1.5 rounded-full bg-current" />;
  }
}

// ─── Project Card (group detail) ──────────────────

interface GroupProjectCardProps {
  dp: DriftProject;
  builds: Build[];
  envFilter: EnvFilter;
  selectedEnv: Signal<EnvironmentStatus | null>;
  onRefresh$: () => Promise<void>;
}

const GroupProjectCard = component$<GroupProjectCardProps>(
  ({ dp, builds, envFilter, selectedEnv, onRefresh$ }) => {
    const meta = parseMetadata(dp.project);
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

    const mainBuild = builds.find((b) => b.branch === "main") ?? builds[0];

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
              <span class="text-xs text-muted">{dp.project.description}</span>
            )}
          </div>
          <div class="flex items-center gap-2">
            <button
              class="rounded p-1 text-muted transition-colors hover:text-accent"
              title="Refresh this project"
              onClick$={async (e: Event) => {
                e.stopPropagation();
                await syncProject(dp.project.id).catch(() => {});
                await onRefresh$();
              }}
            >
              <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
              </svg>
            </button>
            {ciProviders.map((pt) => (
              <span
                key={pt}
                class="bm-tag inline-flex items-center gap-1 rounded bg-border/50 px-2 py-0.5 text-[11px] font-medium text-muted"
                title={providerDisplayName(pt)}
              >
                <CIProviderIcon provider={pt} size={22} />
              </span>
            ))}
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
            const runtime = vi?.["runtime"] as Record<string, unknown> | undefined;
            const backend = vi?.["backend"] as Record<string, unknown> | undefined;
            const frontend = vi?.["frontend"] as Record<string, unknown> | undefined;
            const database = vi?.["database"] as Record<string, unknown> | undefined;

            return (
              <button
                key={env}
                class="bm-env-col px-4 py-3 text-left transition-colors hover:bg-surface/50"
                onClick$={() => { selectedEnv.value = es; }}
              >
                <div class="mb-2 flex items-center justify-between">
                  <span class="text-[11px] font-semibold uppercase tracking-wider text-muted">{env}</span>
                  <div class="flex items-center gap-1.5">
                    <span class={`inline-block h-2 w-2 rounded-full ${statusColor(es.health_status)}`} />
                    <span class="font-mono text-xs text-text">{es.health_status || "\u2014"}</span>
                    <span class="text-xs text-muted">{es.response_time_ms}ms</span>
                  </div>
                </div>

                <div class="mb-1 truncate text-xs text-muted">
                  {es.base_url.replace(/^https?:\/\//, "")}
                </div>

                <div class="mb-1 flex items-center gap-2">
                  {es.deployed_sha && (
                    <span class="font-mono text-xs text-text">{es.deployed_sha.substring(0, 7)}</span>
                  )}
                  {es.branch_head_sha && es.deployed_sha && es.deployed_sha.substring(0, 7) !== es.branch_head_sha.substring(0, 7) && (
                    <span class="font-mono text-xs text-muted">{"\u2192 "}{es.branch_head_sha.substring(0, 7)}</span>
                  )}
                </div>
                <div class="mb-1">
                  {es.is_drifted ? (
                    <span class="text-[11px] font-medium text-warning">drifted</span>
                  ) : es.deployed_sha ? (
                    <span class="text-[11px] font-medium text-success">in sync</span>
                  ) : null}
                </div>

                <div class="flex flex-wrap items-center gap-x-2 text-[11px] text-muted">
                  {typeof runtime?.["uptime_seconds"] === "number" && (
                    <span>up {formatUptime(runtime["uptime_seconds"] as number)}</span>
                  )}
                  {typeof backend?.["go_version"] === "string" && (
                    <span>{String(backend["go_version"])}</span>
                  )}
                  {typeof frontend?.["version"] === "string" && (
                    <span>v{String(frontend["version"])}</span>
                  )}
                  {typeof backend?.["build_time"] === "string" && (
                    <span>built {timeAgo(String(backend["build_time"]))}</span>
                  )}
                </div>

                <div class="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted">
                  {typeof database?.["server_version"] === "string" ? (
                    <span>{String(database["server_version"])}</span>
                  ) : typeof database?.["type"] === "string" ? (
                    <span>{String(database["type"])}</span>
                  ) : null}
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
                </div>
              </button>
            );
          })}
        </div>

        {/* Build Strip */}
        {mainBuild && (
          <div class="border-t border-border px-5 py-2.5">
            <div class="flex items-center gap-3 text-xs">
              <span class={buildStatusColor(mainBuild.status)}>
                <BuildStatusIcon status={mainBuild.status} />
              </span>
              {mainBuild.provider_type && (
                <CIProviderIcon provider={mainBuild.provider_type} size={14} />
              )}
              <span class="font-medium text-text">{mainBuild.branch}</span>
              <span class="font-mono text-muted">{mainBuild.commit_sha?.substring(0, 7)}</span>
              <span class="min-w-0 flex-1 truncate text-muted">"{mainBuild.commit_message}"</span>
              {mainBuild.created_at && (
                <span class="text-muted">{timeAgo(mainBuild.created_at)}</span>
              )}
              {mainBuild.duration_ms != null ? (
                <span class="text-muted">{formatDuration(mainBuild.duration_ms)}</span>
              ) : mainBuild.status === "running" && mainBuild.started_at ? (
                <span class="text-running">{formatElapsed(mainBuild.started_at)} running</span>
              ) : null}
              {mainBuild.provider_url && (
                <a
                  href={mainBuild.provider_url}
                  target="_blank"
                  rel="noopener"
                  class="text-muted hover:text-accent"
                  onClick$={(e: Event) => e.stopPropagation()}
                >
                  {"\u2197"}
                </a>
              )}
            </div>

            {/* Job pipeline */}
            {mainBuild.jobs && mainBuild.jobs.length > 0 && (
              <div class="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                {mainBuild.jobs.map((job) => (
                  <span key={job.id} class="flex items-center gap-1">
                    <span class={buildStatusColor(job.status)}>
                      <BuildStatusIcon status={job.status} />
                    </span>
                    <span class="text-muted">{job.name}</span>
                    {job.duration_ms != null && (
                      <span class="text-muted">{formatDuration(job.duration_ms)}</span>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  },
);
