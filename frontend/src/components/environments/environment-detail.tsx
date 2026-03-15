import { component$, useSignal, useVisibleTask$, type Signal } from "@builder.io/qwik";
import type { EnvironmentStatus, MetricPoint, ResourceIncident, ProbesSummary } from "~/lib/types";
import { fetchMetrics, fetchProjectIncidents } from "~/lib/api";
import { MetricChart } from "~/components/charts/metric-chart";

interface EnvironmentDetailProps {
  env: Signal<EnvironmentStatus | null>;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function formatMB(val: unknown): string | undefined {
  if (typeof val !== "number") return undefined;
  return `${val.toFixed(2)} MB`;
}

function formatMs(val: unknown): string | undefined {
  if (typeof val !== "number") return undefined;
  return `${val.toFixed(2)} ms`;
}

function getVal(obj: Record<string, unknown> | null, ...keys: string[]): unknown {
  if (!obj) return undefined;
  let cur: unknown = obj;
  for (const k of keys) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[k];
  }
  return cur;
}

export const EnvironmentDetail = component$<EnvironmentDetailProps>(
  ({ env }) => {
    if (!env.value) return null;
    const e = env.value;
    const vi = e.version_info;

    const healthColor =
      e.health_status === 200
        ? "bg-success"
        : e.health_status > 0
          ? "bg-warning"
          : "bg-failure";

    const backend = vi ? (vi["backend"] as Record<string, unknown> | undefined) : undefined;
    const frontend = vi ? (vi["frontend"] as Record<string, unknown> | undefined) : undefined;
    const runtime = vi ? (vi["runtime"] as Record<string, unknown> | undefined) : undefined;
    const database = vi ? (vi["database"] as Record<string, unknown> | undefined) : undefined;
    const resources = vi ? (vi["resources"] as Record<string, unknown> | undefined) : undefined;
    const probes = vi ? (vi["probes"] as ProbesSummary | undefined) : undefined;
    const services = vi ? (vi["services"] as Record<string, unknown> | undefined) : undefined;

    return (
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
        onClick$={() => {
          env.value = null;
        }}
      >
        <div
          class="mx-4 w-full max-w-lg rounded-xl border border-border bg-elevated shadow-2xl"
          onClick$={(e: Event) => e.stopPropagation()}
        >
          {/* Header */}
          <div class="flex items-center justify-between border-b border-border px-6 py-4">
            <div class="flex items-center gap-3">
              <span class={`inline-block h-3 w-3 rounded-full ${healthColor}`} />
              <h2 class="text-lg font-bold text-text">
                {e.project_name}{" "}
                <span class="font-normal text-muted">/ {e.env}</span>
              </h2>
            </div>
            <button
              class="text-muted transition-colors hover:text-text"
              onClick$={() => {
                env.value = null;
              }}
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div class="max-h-[70vh] overflow-y-auto px-6 py-4">
            {/* Overview */}
            <div class="mb-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <span class="text-muted">Health</span>
                <p class="font-mono text-text">
                  {e.health_status || "unreachable"}
                </p>
              </div>
              <div>
                <span class="text-muted">Response Time</span>
                <p class="font-mono text-text">{e.response_time_ms}ms</p>
              </div>
              <div>
                <span class="text-muted">Deployed SHA</span>
                <p class="font-mono text-text">
                  {e.deployed_sha
                    ? e.deployed_sha.substring(0, 7)
                    : "unknown"}
                </p>
              </div>
              <div>
                <span class="text-muted">Branch HEAD</span>
                <p class="font-mono text-text">
                  {e.branch_head_sha || "—"}
                  {e.is_drifted && (
                    <span class="ml-2 text-warning">drifted</span>
                  )}
                </p>
              </div>
            </div>

            {/* Backend section */}
            {backend && (
              <Section title="Backend">
                <KV label="Version" value={backend["version"] as string} />
                <KV label="Commit" value={backend["git_commit"] as string} mono />
                <KV label="Platform" value={backend["platform"] as string} />
                <KV label="Build Time" value={backend["build_time"] as string} />
              </Section>
            )}

            {/* Frontend section */}
            {frontend && (
              <Section title="Frontend">
                <KV label="Version" value={frontend["version"] as string} />
                <KV label="Commit" value={frontend["git_commit"] as string} mono />
                <KV label="Branch" value={frontend["branch"] as string} />
                <KV
                  label="Node Version"
                  value={frontend["node_version"] as string}
                />
              </Section>
            )}

            {/* Runtime section */}
            {runtime && (
              <Section title="Runtime">
                <KV label="Hostname" value={runtime["hostname"] as string} />
                <KV label="Port" value={String(runtime["port"] ?? "")} />
                <KV
                  label="Environment"
                  value={runtime["environment"] as string}
                />
                <KV label="PID" value={String(runtime["pid"] ?? "")} />
                <KV
                  label="Uptime"
                  value={
                    runtime["uptime_seconds"]
                      ? formatUptime(runtime["uptime_seconds"] as number)
                      : undefined
                  }
                />
                <KV
                  label="Started At"
                  value={runtime["started_at"] as string}
                />
              </Section>
            )}

            {/* Database section */}
            {database && (
              <Section title="Database">
                <KV
                  label="Current Version"
                  value={database["current_version"] as string}
                />
                <KV
                  label="Latest Version"
                  value={database["latest_version"] as string}
                />
                <KV
                  label="Up to Date"
                  value={
                    database["up_to_date"] !== undefined
                      ? database["up_to_date"]
                        ? "Yes"
                        : "No"
                      : undefined
                  }
                />
              </Section>
            )}

            {/* Services section */}
            {services && Object.keys(services).length > 0 && (
              <Section title="Services">
                {Object.entries(services).map(([name, svc]) => {
                  const s = svc as Record<string, unknown> | undefined;
                  if (!s) return null;
                  const status = s["status"] as string;
                  const svcName = (s["service"] as string) || name;
                  const message = s["message"] as string | undefined;
                  const latency = typeof s["latency_ms"] === "number" ? s["latency_ms"] as number : null;
                  const isOk = status === "ok";
                  return (
                    <div key={name} class="py-1">
                      <div class="flex items-center justify-between text-sm">
                        <span class="flex items-center gap-2 text-muted">
                          <span class={`inline-block h-2 w-2 rounded-full ${isOk ? "bg-success" : "bg-failure"}`} />
                          {svcName}
                        </span>
                        <span class={`font-mono ${isOk ? "text-success" : "text-failure font-medium"}`}>
                          {status}
                          {latency !== null && (
                            <span class="ml-2 text-muted font-normal">({latency}ms)</span>
                          )}
                        </span>
                      </div>
                      {message && (
                        <p class="mt-0.5 pl-4 text-xs text-failure">{message}</p>
                      )}
                    </div>
                  );
                })}
              </Section>
            )}

            {/* Resources section */}
            {resources && (
              <Section title="Resources">
                <KV label="Memory Alloc" value={formatMB(resources["memory_alloc_mb"])} />
                <KV label="Heap In-Use" value={formatMB(resources["heap_inuse_mb"])} />
                <KV label="Stack In-Use" value={formatMB(resources["stack_inuse_mb"])} />
                <KV
                  label="Goroutines"
                  value={
                    typeof resources["goroutines"] === "number"
                      ? String(resources["goroutines"])
                      : undefined
                  }
                />
                <KV
                  label="GC Cycles"
                  value={
                    typeof resources["num_gc"] === "number"
                      ? String(resources["num_gc"])
                      : undefined
                  }
                />
                <KV label="GC Pause Total" value={formatMs(resources["gc_pause_total_ms"])} />
                <KV label="GC Last Pause" value={formatMs(resources["gc_last_pause_ms"])} />
              </Section>
            )}

            {/* Metrics (30d) section — expandable */}
            <MetricsPanel projectId={e.project_id} env={e.env} />

            {/* Probes section */}
            {probes && probes.regions && probes.regions.length > 0 && (
              <Section title="Probes">
                <div class="flex justify-between py-1 text-sm">
                  <span class="text-muted">Connected</span>
                  <span class="text-text">
                    {probes.connected}/{probes.total}
                  </span>
                </div>
                {probes.regions.map((r) => (
                  <div
                    key={r.slug}
                    class="flex items-center justify-between py-1 text-sm"
                  >
                    <span class="flex items-center gap-2 text-muted">
                      <span
                        class={`inline-block h-2 w-2 rounded-full ${r.connected ? "bg-success" : "bg-failure"}`}
                      />
                      {r.name}
                    </span>
                    <span class="font-mono text-text">
                      {r.probe_version || "—"}
                    </span>
                  </div>
                ))}
              </Section>
            )}

            {/* Raw fallback for unknown keys */}
            {vi &&
              !backend &&
              !frontend &&
              !runtime &&
              !database &&
              Object.keys(vi).length > 0 && (
                <Section title="Version Info">
                  {Object.entries(vi).map(([k, v]) => (
                    <KV
                      key={k}
                      label={k}
                      value={typeof v === "string" ? v : JSON.stringify(v)}
                    />
                  ))}
                </Section>
              )}

            {/* Checked at */}
            <p class="mt-4 text-xs text-muted">
              Checked {new Date(e.checked_at).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    );
  },
);

const Section = component$<{ title: string }>(({ title }) => {
  return (
    <div class="mb-4">
      <h3 class="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
        {title}
      </h3>
      <div class="rounded-lg border border-border bg-surface p-3">
        <Slot />
      </div>
    </div>
  );
});

import { Slot } from "@builder.io/qwik";

interface KVProps {
  label: string;
  value: string | undefined;
  mono?: boolean;
}

const KV = component$<KVProps>(({ label, value, mono }) => {
  if (!value) return null;
  return (
    <div class="flex justify-between py-1 text-sm">
      <span class="text-muted">{label}</span>
      <span class={`text-text ${mono ? "font-mono" : ""}`}>
        {value.length > 30 ? value.substring(0, 30) + "..." : value}
      </span>
    </div>
  );
});

// --- Metrics Panel (expandable) ---

interface MetricsPanelProps {
  projectId: number;
  env: string;
}

const MetricsPanel = component$<MetricsPanelProps>(({ projectId, env }) => {
  const expanded = useSignal(false);
  const metrics = useSignal<MetricPoint[] | null>(null);
  const incidents = useSignal<ResourceIncident[] | null>(null);
  const loading = useSignal(false);

  useVisibleTask$(({ track }) => {
    track(() => expanded.value);
    if (!expanded.value) return;
    if (metrics.value) return; // already loaded

    loading.value = true;
    Promise.all([
      fetchMetrics(projectId, env, 720).catch(() => []),
      fetchProjectIncidents(projectId, 20).catch(() => []),
    ]).then(([m, inc]) => {
      metrics.value = m;
      incidents.value = inc;
      loading.value = false;
    });
  });

  const memoryData =
    metrics.value?.map((p) => ({
      time: p.created_at,
      value: p.memory_alloc_mb,
    })) ?? [];

  const containerMemData =
    metrics.value?.map((p) => ({
      time: p.created_at,
      value: p.container_memory_mb,
    })) ?? [];

  const goroutineData =
    metrics.value?.map((p) => ({
      time: p.created_at,
      value: p.goroutines,
    })) ?? [];

  const responseData =
    metrics.value?.map((p) => ({
      time: p.created_at,
      value: p.response_time_ms,
    })) ?? [];

  // Filter incidents for this env
  const envIncidents = (incidents.value ?? [])
    .filter((i) => i.env === env)
    .map((i) => ({ time: i.created_at }));

  return (
    <div class="mb-4">
      <button
        class="mb-2 flex w-full items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted hover:text-text"
        onClick$={() => {
          expanded.value = !expanded.value;
        }}
      >
        <span
          class="inline-block transition-transform"
          style={{ transform: expanded.value ? "rotate(90deg)" : "rotate(0)" }}
        >
          &#9654;
        </span>
        Metrics (30d)
      </button>

      {expanded.value && (
        <div class="space-y-3">
          {loading.value ? (
            <div class="flex items-center justify-center rounded-lg border border-border bg-surface p-6">
              <div class="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            </div>
          ) : (
            <>
              <MetricChart
                data={memoryData}
                label="Memory Alloc"
                color="#3b82f6"
                unit="MB"
                incidents={envIncidents}
              />
              {containerMemData.some((d) => d.value > 0) && (
                <MetricChart
                  data={containerMemData}
                  label="Container Memory"
                  color="#f97316"
                  unit="MB"
                  incidents={envIncidents}
                />
              )}
              <MetricChart
                data={goroutineData}
                label="Goroutines"
                color="#22c55e"
                unit=""
                incidents={envIncidents}
              />
              <MetricChart
                data={responseData}
                label="Response Time"
                color="#a855f7"
                unit="ms"
                incidents={envIncidents}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
});
