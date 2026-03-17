import { component$, useSignal, useVisibleTask$, useComputed$, $ } from "@builder.io/qwik";
import { fetchAllIncidents, ignoreIncident } from "~/lib/api";
import type { ResourceIncident } from "~/lib/types";

type StatusFilter = "all" | "open" | "resolved" | "ignored";
type EnvFilter = "all" | "production" | "staging" | "uat";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatDuration(start: string, end: string): string {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

function metricLabel(metric: string): string {
  switch (metric) {
    case "health_status": return "Health";
    case "memory_alloc_mb": return "Memory";
    case "container_memory_pct": return "Container Mem";
    case "goroutines": return "Goroutines";
    case "gc_pause_ms": return "GC Pause";
    case "response_time_ms": return "Response Time";
    default: return metric;
  }
}

export default component$(() => {
  const incidents = useSignal<ResourceIncident[]>([]);
  const loading = useSignal(true);
  const statusFilter = useSignal<StatusFilter>("all");
  const envFilter = useSignal<EnvFilter>("all");

  const doRefresh = $(async () => {
    const data = await fetchAllIncidents(200).catch(() => []);
    incidents.value = data ?? [];
  });

  useVisibleTask$(async ({ cleanup }) => {
    await doRefresh();
    loading.value = false;

    // Auto-refresh on WS events
    const token = typeof window !== "undefined" ? localStorage.getItem("buildme_token") : null;
    if (token && typeof window !== "undefined") {
      const { BuildMeWS } = await import("~/lib/ws");
      const ws = new BuildMeWS(token);
      ws.connect();

      const unsub = ws.onEvent(async (event) => {
        if (event.type === "incident.created" || event.type === "incident.resolved") {
          await doRefresh();
        }
      });

      cleanup(() => {
        unsub();
        ws.disconnect();
      });
    }
  });

  const filtered = useComputed$(() => {
    return incidents.value.filter((inc) => {
      if (statusFilter.value === "open" && (inc.resolved_at || inc.ignored)) return false;
      if (statusFilter.value === "resolved" && !inc.resolved_at) return false;
      if (statusFilter.value === "ignored" && !inc.ignored) return false;
      if (envFilter.value !== "all" && inc.env !== envFilter.value) return false;
      return true;
    });
  });

  const openCount = useComputed$(() =>
    incidents.value.filter((i) => !i.resolved_at).length,
  );

  return (
    <div>
      {/* Header */}
      <div class="mb-6 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <h1 class="text-2xl font-bold text-text">Incidents</h1>
          {openCount.value > 0 && (
            <span class="inline-flex items-center gap-1.5 rounded-full bg-failure/15 px-2.5 py-0.5 text-xs font-medium text-failure">
              <span class="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-failure bm-dot-failure" />
              {openCount.value} open
            </span>
          )}
        </div>
      </div>

      {/* Filters */}
      <div class="mb-4 flex flex-wrap items-center gap-2">
        {/* Status filter */}
        {(["all", "open", "resolved", "ignored"] as StatusFilter[]).map((s) => (
          <button
            key={s}
            class={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              statusFilter.value === s
                ? s === "open"
                  ? "bg-failure/15 text-failure"
                  : s === "resolved"
                    ? "bg-success/15 text-success"
                    : s === "ignored"
                      ? "bg-warning/15 text-warning"
                      : "bg-accent/15 text-accent"
                : "bg-elevated text-muted hover:bg-white/[0.04] hover:text-text"
            }`}
            onClick$={() => { statusFilter.value = s; }}
          >
            {s === "all" ? "All" : s === "open" ? "Open" : s === "resolved" ? "Resolved" : "Ignored"}
          </button>
        ))}

        <span class="mx-1 h-4 w-px bg-border" />

        {/* Env filter */}
        {(["all", "production", "staging", "uat"] as EnvFilter[]).map((e) => (
          <button
            key={e}
            class={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              envFilter.value === e
                ? "bg-accent/15 text-accent"
                : "bg-elevated text-muted hover:bg-white/[0.04] hover:text-text"
            }`}
            onClick$={() => { envFilter.value = e; }}
          >
            {e === "all" ? "All Envs" : e.charAt(0).toUpperCase() + e.slice(1)}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading.value ? (
        <div class="flex items-center justify-center p-12">
          <div class="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      ) : filtered.value.length === 0 ? (
        <div class="rounded-xl border border-border bg-elevated/50 p-12 text-center">
          <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-border/30">
            <svg class="h-6 w-6 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
            </svg>
          </div>
          <p class="text-sm text-muted">No incidents found.</p>
        </div>
      ) : (
        /* Incidents table */
        <div class="overflow-hidden rounded-xl border border-border">
          {/* Table header */}
          <div class="grid grid-cols-[auto_1fr_80px_100px_1fr_100px_100px_100px_60px] items-center gap-3 border-b border-border bg-elevated/80 px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-muted">
            <span class="w-2" />
            <span>Project</span>
            <span>Env</span>
            <span>Metric</span>
            <span>Message</span>
            <span>Created</span>
            <span>Resolved</span>
            <span>Duration</span>
            <span />
          </div>

          {/* Rows */}
          {filtered.value.map((inc) => {
            const isOpen = !inc.resolved_at;
            return (
              <div
                key={inc.id}
                class={`grid grid-cols-[auto_1fr_80px_100px_1fr_100px_100px_100px_60px] items-center gap-3 border-b border-border/50 px-4 py-3 text-sm transition-colors hover:bg-white/[0.02] ${inc.ignored ? "opacity-40" : ""}`}
                style={{ animation: "bm-fade-in 0.3s ease" }}
              >
                {/* Status dot */}
                <span
                  class={`inline-block h-2 w-2 rounded-full ${
                    inc.ignored ? "bg-warning bm-dot-warning" : isOpen ? "bg-failure bm-dot-failure animate-pulse" : "bg-success bm-dot-success"
                  }`}
                />

                {/* Project */}
                <span class={`truncate font-medium text-text ${inc.ignored ? "line-through" : ""}`}>
                  {inc.project_name || `Project ${inc.project_id}`}
                </span>

                {/* Env */}
                <span class="inline-block w-fit rounded bg-border/50 px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted">
                  {inc.env}
                </span>

                {/* Metric */}
                <span class={`text-xs font-medium ${
                  inc.metric === "health_status" ? "text-failure" : "text-warning"
                }`}>
                  {metricLabel(inc.metric)}
                </span>

                {/* Message */}
                <span class="truncate text-xs text-muted">
                  {inc.message}
                </span>

                {/* Created */}
                <span class="text-xs text-muted">
                  {timeAgo(inc.created_at)}
                </span>

                {/* Resolved */}
                <span class="text-xs text-muted">
                  {inc.resolved_at ? timeAgo(inc.resolved_at) : (
                    <span class="text-failure">active</span>
                  )}
                </span>

                {/* Duration */}
                <span class="font-mono text-xs text-muted">
                  {inc.resolved_at
                    ? formatDuration(inc.created_at, inc.resolved_at)
                    : formatDuration(inc.created_at, new Date().toISOString())}
                </span>

                {/* Ignore/Unignore */}
                <button
                  class={`rounded p-1 transition-colors ${inc.ignored ? "text-warning hover:text-text" : "text-muted hover:text-warning"}`}
                  title={inc.ignored ? "Unignore incident" : "Ignore incident"}
                  onClick$={async () => {
                    await ignoreIncident(inc.id, !inc.ignored).catch(() => {});
                    await doRefresh();
                  }}
                >
                  {inc.ignored ? (
                    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});
