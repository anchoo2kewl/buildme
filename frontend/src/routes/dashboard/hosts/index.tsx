import { component$, useSignal, useVisibleTask$, useComputed$ } from "@builder.io/qwik";
import { fetchHosts, fetchHostMetrics } from "~/lib/api";
import type { Host, HostMetric } from "~/lib/types";

/* ── helpers ─────────────────────────────────────────────────── */

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatUptime(secs: number): string {
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
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

function isOnline(host: Host): boolean {
  if (!host.last_heartbeat_at) return false;
  return Date.now() - new Date(host.last_heartbeat_at).getTime() < 120_000;
}

function hasAlert(host: Host): boolean {
  return (
    host.cpu_percent > host.cpu_threshold ||
    host.memory_percent > host.memory_threshold ||
    host.disk_percent > host.disk_threshold
  );
}

function gaugeColor(value: number, threshold: number): string {
  if (value > threshold) return "text-failure";
  if (value > threshold * 0.85) return "text-warning";
  return "text-success";
}

function barColor(value: number, threshold: number): string {
  if (value > threshold) return "bg-failure";
  if (value > threshold * 0.85) return "bg-warning";
  return "bg-accent";
}

/* ── sparkline ───────────────────────────────────────────────── */

function sparklinePoints(
  metrics: HostMetric[],
  key: keyof HostMetric,
  w: number,
  h: number,
): string {
  if (metrics.length < 2) return "";
  // API returns newest-first; reverse so chart reads left→right (oldest→newest)
  const reversed = [...metrics].reverse();
  const vals = reversed.map((m) => Number(m[key]));
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const pad = 2; // pixels of top/bottom padding
  const range = max - min;
  const step = w / (vals.length - 1);
  return vals
    .map((v, i) => {
      const x = (i * step).toFixed(1);
      // If all values are identical, draw at 50% height
      const norm = range === 0 ? 0.5 : (v - min) / range;
      const y = (h - norm * (h - 2 * pad) - pad).toFixed(1);
      return `${x},${y}`;
    })
    .join(" ");
}

/* ── component ───────────────────────────────────────────────── */

export default component$(() => {
  const hosts = useSignal<Host[]>([]);
  const loading = useSignal(true);
  const expandedId = useSignal<number | null>(null);
  const metricsMap = useSignal<Record<number, HostMetric[]>>({});
  const metricsLoading = useSignal<Record<number, boolean>>({});

  /* fetch + auto-refresh */
  useVisibleTask$(async ({ cleanup }) => {
    const data = await fetchHosts().catch(() => []);
    hosts.value = data ?? [];
    loading.value = false;

    const interval = setInterval(async () => {
      const fresh = await fetchHosts().catch(() => []);
      hosts.value = fresh ?? [];
    }, 30_000);

    cleanup(() => clearInterval(interval));
  });

  /* computed summary */
  const totalHosts = useComputed$(() => hosts.value.length);
  const onlineCount = useComputed$(() => hosts.value.filter(isOnline).length);
  const offlineCount = useComputed$(
    () => hosts.value.filter((h) => !isOnline(h)).length,
  );
  const alertCount = useComputed$(
    () => hosts.value.filter((h) => isOnline(h) && hasAlert(h)).length,
  );

  return (
    <div>
      {/* Header */}
      <div class="mb-6 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <h1 class="text-2xl font-bold text-text">Hosts</h1>
          {alertCount.value > 0 && (
            <span class="inline-flex items-center gap-1.5 rounded-full bg-failure/15 px-2.5 py-0.5 text-xs font-medium text-failure">
              <span class="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-failure bm-dot-failure" />
              {alertCount.value} alert{alertCount.value !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div class="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total Hosts", value: totalHosts.value, color: "text-text" },
          { label: "Online", value: onlineCount.value, color: "text-success" },
          { label: "Offline", value: offlineCount.value, color: "text-muted" },
          {
            label: "Alerts",
            value: alertCount.value,
            color: alertCount.value > 0 ? "text-failure" : "text-muted",
          },
        ].map((card) => (
          <div
            key={card.label}
            class="rounded-xl border border-border bg-elevated/50 px-4 py-3"
          >
            <p class="text-xs font-medium uppercase tracking-wider text-muted">
              {card.label}
            </p>
            <p class={`mt-1 text-2xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Loading */}
      {loading.value ? (
        <div class="flex items-center justify-center p-12">
          <div class="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      ) : hosts.value.length === 0 ? (
        <div class="rounded-xl border border-border bg-elevated/50 p-12 text-center">
          <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-border/30">
            <svg
              class="h-6 w-6 text-muted"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
              <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
              <line x1="6" y1="6" x2="6.01" y2="6" />
              <line x1="6" y1="18" x2="6.01" y2="18" />
            </svg>
          </div>
          <p class="text-sm text-muted">No hosts configured yet.</p>
        </div>
      ) : (
        /* Host list */
        <div class="space-y-3">
          {hosts.value.map((host) => {
            const online = isOnline(host);
            const alert = hasAlert(host);
            const expanded = expandedId.value === host.id;
            const hostMetrics = metricsMap.value[host.id] ?? [];
            const isLoadingMetrics = metricsLoading.value[host.id] ?? false;

            return (
              <div
                key={host.id}
                class={`rounded-xl border transition-all ${
                  alert
                    ? "border-failure/40 bg-failure/[0.03]"
                    : "border-border bg-elevated/50"
                }`}
                style={{ animation: "bm-fade-in 0.3s ease" }}
              >
                {/* Main row - clickable */}
                <button
                  class="flex w-full items-center gap-4 px-4 py-3.5 text-left"
                  onClick$={async () => {
                    if (expanded) {
                      expandedId.value = null;
                      return;
                    }
                    expandedId.value = host.id;
                    if (!metricsMap.value[host.id]) {
                      metricsLoading.value = {
                        ...metricsLoading.value,
                        [host.id]: true,
                      };
                      const data = await fetchHostMetrics(host.id, 60).catch(
                        () => [],
                      );
                      metricsMap.value = {
                        ...metricsMap.value,
                        [host.id]: data ?? [],
                      };
                      metricsLoading.value = {
                        ...metricsLoading.value,
                        [host.id]: false,
                      };
                    }
                  }}
                >
                  {/* Status dot */}
                  <span
                    class={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${
                      online
                        ? "bg-success bm-dot-success"
                        : "bg-border"
                    } ${online && alert ? "animate-pulse" : ""}`}
                  />

                  {/* Info */}
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2">
                      <span class="truncate font-medium text-text">
                        {host.name}
                      </span>
                      <span class="truncate text-xs text-muted">
                        {host.hostname}
                        {host.ip_address ? ` / ${host.ip_address}` : ""}
                      </span>
                    </div>
                    <div class="mt-0.5 flex items-center gap-2 flex-wrap">
                      {host.os_info && (
                        <span class="truncate text-xs text-muted/70">{host.os_info}</span>
                      )}
                      {host.project_names && host.project_names.length > 0 && (
                        <span class="flex items-center gap-1 text-xs text-accent/70">
                          <svg class="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
                          </svg>
                          {host.project_names.join(", ")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Gauges */}
                  <div class="hidden items-center gap-5 sm:flex">
                    {/* CPU */}
                    <div class="text-center">
                      <p class="text-[10px] font-medium uppercase tracking-wider text-muted">
                        CPU
                      </p>
                      <p
                        class={`text-sm font-bold tabular-nums ${gaugeColor(host.cpu_percent, host.cpu_threshold)}`}
                      >
                        {host.cpu_percent.toFixed(1)}%
                      </p>
                    </div>
                    {/* MEM */}
                    <div class="text-center">
                      <p class="text-[10px] font-medium uppercase tracking-wider text-muted">
                        MEM
                      </p>
                      <p
                        class={`text-sm font-bold tabular-nums ${gaugeColor(host.memory_percent, host.memory_threshold)}`}
                      >
                        {host.memory_percent.toFixed(1)}%
                      </p>
                    </div>
                    {/* DISK */}
                    <div class="text-center">
                      <p class="text-[10px] font-medium uppercase tracking-wider text-muted">
                        DISK
                      </p>
                      <p
                        class={`text-sm font-bold tabular-nums ${gaugeColor(host.disk_percent, host.disk_threshold)}`}
                      >
                        {host.disk_percent.toFixed(1)}%
                      </p>
                    </div>
                    {/* NET I/O */}
                    <div class="text-center">
                      <p class="text-[10px] font-medium uppercase tracking-wider text-muted">
                        Net I/O
                      </p>
                      <p class="text-sm font-bold tabular-nums text-success">
                        {formatBytes(host.net_in_bytes)}/s
                      </p>
                    </div>
                  </div>

                  {/* Heartbeat */}
                  <div class="shrink-0 text-right">
                    <p class="text-xs text-muted">
                      {host.last_heartbeat_at
                        ? timeAgo(host.last_heartbeat_at)
                        : "never"}
                    </p>
                  </div>

                  {/* Chevron */}
                  <svg
                    class={`h-4 w-4 shrink-0 text-muted transition-transform ${
                      expanded ? "rotate-180" : ""
                    }`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>

                {/* Expanded detail */}
                {expanded && (
                  <div class="border-t border-border/50 px-4 pb-4 pt-3">
                    {isLoadingMetrics ? (
                      <div class="flex items-center justify-center py-6">
                        <div class="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                      </div>
                    ) : (
                      <>
                        {/* Metric bars */}
                        <div class="mb-4 grid gap-3 sm:grid-cols-3">
                          {/* CPU bar */}
                          <div>
                            <div class="mb-1 flex items-center justify-between text-xs">
                              <span class="font-medium text-muted">CPU</span>
                              <span
                                class={`font-bold tabular-nums ${gaugeColor(host.cpu_percent, host.cpu_threshold)}`}
                              >
                                {host.cpu_percent.toFixed(1)}%
                              </span>
                            </div>
                            <div class="relative h-2 overflow-hidden rounded-full bg-border/40">
                              <div
                                class={`absolute inset-y-0 left-0 rounded-full transition-all ${barColor(host.cpu_percent, host.cpu_threshold)}`}
                                style={{ width: `${Math.min(host.cpu_percent, 100)}%` }}
                              />
                              <div
                                class="absolute inset-y-0 w-px bg-text/40"
                                style={{ left: `${host.cpu_threshold}%` }}
                              />
                            </div>
                            <p class="mt-0.5 text-[10px] text-muted/60">
                              threshold {host.cpu_threshold}%
                            </p>
                          </div>

                          {/* Memory bar */}
                          <div>
                            <div class="mb-1 flex items-center justify-between text-xs">
                              <span class="font-medium text-muted">Memory</span>
                              <span
                                class={`font-bold tabular-nums ${gaugeColor(host.memory_percent, host.memory_threshold)}`}
                              >
                                {host.memory_percent.toFixed(1)}%
                              </span>
                            </div>
                            <div class="relative h-2 overflow-hidden rounded-full bg-border/40">
                              <div
                                class={`absolute inset-y-0 left-0 rounded-full transition-all ${barColor(host.memory_percent, host.memory_threshold)}`}
                                style={{
                                  width: `${Math.min(host.memory_percent, 100)}%`,
                                }}
                              />
                              <div
                                class="absolute inset-y-0 w-px bg-text/40"
                                style={{ left: `${host.memory_threshold}%` }}
                              />
                            </div>
                            <p class="mt-0.5 text-[10px] text-muted/60">
                              threshold {host.memory_threshold}%
                            </p>
                          </div>

                          {/* Disk bar */}
                          <div>
                            <div class="mb-1 flex items-center justify-between text-xs">
                              <span class="font-medium text-muted">Disk</span>
                              <span
                                class={`font-bold tabular-nums ${gaugeColor(host.disk_percent, host.disk_threshold)}`}
                              >
                                {host.disk_percent.toFixed(1)}%
                              </span>
                            </div>
                            <div class="relative h-2 overflow-hidden rounded-full bg-border/40">
                              <div
                                class={`absolute inset-y-0 left-0 rounded-full transition-all ${barColor(host.disk_percent, host.disk_threshold)}`}
                                style={{
                                  width: `${Math.min(host.disk_percent, 100)}%`,
                                }}
                              />
                              <div
                                class="absolute inset-y-0 w-px bg-text/40"
                                style={{ left: `${host.disk_threshold}%` }}
                              />
                            </div>
                            <p class="mt-0.5 text-[10px] text-muted/60">
                              threshold {host.disk_threshold}%
                            </p>
                          </div>
                        </div>

                        {/* Projects */}
                        {host.project_names && host.project_names.length > 0 && (
                          <div class="mb-4 flex items-center gap-2 flex-wrap">
                            <span class="text-xs font-medium uppercase tracking-wider text-muted">Projects</span>
                            {host.project_names.map((name) => (
                              <span key={name} class="inline-flex items-center gap-1 rounded-full border border-accent/25 bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent">
                                <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                  <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
                                </svg>
                                {name}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Detail info grid */}
                        <div class="mb-4 grid grid-cols-2 gap-x-6 gap-y-2 rounded-lg border border-border/50 bg-surface/50 px-4 py-3 text-xs sm:grid-cols-4">
                          <div>
                            <span class="text-muted">IP</span>
                            <p class="font-medium text-text">
                              {host.ip_address || "-"}
                            </p>
                          </div>
                          <div>
                            <span class="text-muted">OS</span>
                            <p class="truncate font-medium text-text">
                              {host.os_info || "-"}
                            </p>
                          </div>
                          <div>
                            <span class="text-muted">Agent Version</span>
                            <p class="font-medium text-text">
                              {host.agent_version || "-"}
                            </p>
                          </div>
                          <div>
                            <span class="text-muted">Uptime</span>
                            <p class="font-medium text-text">
                              {formatUptime(host.uptime_secs)}
                            </p>
                          </div>
                          <div>
                            <span class="text-muted">Memory</span>
                            <p class="font-medium text-text">
                              {formatBytes(host.memory_used)} /{" "}
                              {formatBytes(host.memory_total)}
                            </p>
                          </div>
                          <div>
                            <span class="text-muted">Disk</span>
                            <p class="font-medium text-text">
                              {formatBytes(host.disk_used)} /{" "}
                              {formatBytes(host.disk_total)}
                            </p>
                          </div>
                          <div>
                            <span class="text-muted">Net In</span>
                            <p class="font-medium text-text">
                              {formatBytes(host.net_in_bytes)}
                            </p>
                          </div>
                          <div>
                            <span class="text-muted">Net Out</span>
                            <p class="font-medium text-text">
                              {formatBytes(host.net_out_bytes)}
                            </p>
                          </div>
                        </div>

                        {/* Sparklines */}
                        {hostMetrics.length >= 2 && (
                          <div class="grid gap-3 sm:grid-cols-4">
                            {(
                              [
                                { key: "cpu_percent" as keyof HostMetric, label: "CPU History", color: "text-accent" },
                                { key: "memory_percent" as keyof HostMetric, label: "Memory History", color: "text-accent" },
                                { key: "disk_percent" as keyof HostMetric, label: "Disk History", color: "text-accent" },
                                { key: "net_in_bytes" as keyof HostMetric, label: "Network I/O", color: "text-success" },
                              ]
                            ).map((chart) => (
                              <div
                                key={chart.key}
                                class="rounded-lg border border-border/50 bg-surface/50 p-3"
                              >
                                <p class="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted">
                                  {chart.label}
                                </p>
                                <svg
                                  viewBox="0 0 200 50"
                                  class="h-[50px] w-full"
                                  preserveAspectRatio="none"
                                >
                                  <polyline
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="1.5"
                                    class={chart.color}
                                    points={sparklinePoints(
                                      hostMetrics,
                                      chart.key,
                                      200,
                                      50,
                                    )}
                                  />
                                </svg>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});
