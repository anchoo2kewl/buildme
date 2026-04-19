import { component$, useSignal, useVisibleTask$, useComputed$, $ } from "@builder.io/qwik";
import { fetchHosts, fetchHostMetrics } from "~/lib/api";
import type { Host, HostMetric } from "~/lib/types";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function formatUptime(secs: number): string {
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  if (d > 0) return `${d}d ${h}h`;
  const m = Math.floor((secs % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function isOnline(host: Host): boolean {
  if (!host.last_heartbeat_at) return false;
  return (Date.now() - new Date(host.last_heartbeat_at).getTime()) / 1000 < 120;
}

function hasAlert(host: Host): boolean {
  return (
    host.cpu_percent > host.cpu_threshold ||
    host.memory_percent > host.memory_threshold ||
    host.disk_percent > host.disk_threshold
  );
}

function sparklinePoints(
  metrics: HostMetric[],
  key: keyof HostMetric,
  w: number,
  h: number,
): string {
  const reversed = [...metrics].reverse();
  if (reversed.length === 0) return "";
  const vals = reversed.map((m) => Number(m[key]));
  const max = Math.max(...vals, 1);
  const step = w / Math.max(reversed.length - 1, 1);
  return reversed
    .map((_, i) => {
      const x = i * step;
      const y = h - (vals[i] / max) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function hostStatus(host: Host): "ok" | "warn" | "fail" {
  if (!isOnline(host)) return "fail";
  if (hasAlert(host)) return "warn";
  return "ok";
}

function statusLabel(s: "ok" | "warn" | "fail"): string {
  if (s === "ok") return "healthy";
  if (s === "warn") return "warning";
  return "offline";
}

export default component$(() => {
  const hosts = useSignal<Host[]>([]);
  const search = useSignal("");
  const filter = useSignal<"all" | "healthy" | "warning" | "offline">("all");
  const expandedCardId = useSignal<number | null>(null);
  const expandedRowId = useSignal<number | null>(null);
  const metricsCache = useSignal<Record<number, HostMetric[]>>({});

  const onlineCount = useComputed$(() =>
    hosts.value.filter((h) => isOnline(h)).length,
  );
  const offlineCount = useComputed$(() =>
    hosts.value.filter((h) => !isOnline(h)).length,
  );
  const healthyCount = useComputed$(() =>
    hosts.value.filter((h) => isOnline(h) && !hasAlert(h)).length,
  );
  const warningCount = useComputed$(() =>
    hosts.value.filter((h) => isOnline(h) && hasAlert(h)).length,
  );

  const filtered = useComputed$(() => {
    let list = hosts.value;
    if (search.value) {
      const q = search.value.toLowerCase();
      list = list.filter(
        (h) =>
          h.name.toLowerCase().includes(q) ||
          h.hostname.toLowerCase().includes(q) ||
          (h.ip_address && h.ip_address.toLowerCase().includes(q)),
      );
    }
    if (filter.value === "healthy")
      list = list.filter((h) => isOnline(h) && !hasAlert(h));
    else if (filter.value === "warning")
      list = list.filter((h) => isOnline(h) && hasAlert(h));
    else if (filter.value === "offline") list = list.filter((h) => !isOnline(h));
    return list;
  });

  const loadMetrics = $(async (hostId: number) => {
    if (metricsCache.value[hostId]) return;
    try {
      const data = await fetchHostMetrics(hostId, 60);
      metricsCache.value = { ...metricsCache.value, [hostId]: data };
    } catch {
      /* ignore */
    }
  });

  const toggleCard = $(async (hostId: number) => {
    if (expandedCardId.value === hostId) {
      expandedCardId.value = null;
    } else {
      expandedCardId.value = hostId;
      await loadMetrics(hostId);
    }
  });

  const toggleRow = $(async (hostId: number) => {
    if (expandedRowId.value === hostId) {
      expandedRowId.value = null;
    } else {
      expandedRowId.value = hostId;
      await loadMetrics(hostId);
    }
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ cleanup }) => {
    const load = async () => {
      try {
        const data = await fetchHosts();
        hosts.value = data;
      } catch {
        /* ignore */
      }
    };
    load();
    const id = setInterval(load, 30_000);
    cleanup(() => clearInterval(id));
  });

  return (
    <div>
      {/* ── Page top ── */}
      <div class="page-top">
        <div class="breadcrumb">
          workspace <span>/</span> <b>hosts</b>
        </div>
        <div class="page-top-actions">
          <div class="search">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="6.2" cy="6.2" r="4.5" />
              <path d="m12.5 12.5-3-3" />
            </svg>
            <input
              type="text"
              placeholder="Search hosts..."
              value={search.value}
              onInput$={(_, el) => (search.value = (el as HTMLInputElement).value)}
            />
          </div>
          <button class="btn btn-outline">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
              <path d="M7 2v10M4 5l3-3 3 3" />
            </svg>
            Install agent
          </button>
          <button class="btn btn-primary">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
              <path d="M7 2v10M2 7h10" />
            </svg>
            Add host
          </button>
        </div>
      </div>

      {/* ── Greeting ── */}
      <div class="greet">
        <div>
          <h1>
            Hosts{" "}
            <em>
              · {onlineCount.value} online · {offlineCount.value} offline
            </em>
          </h1>
          <p class="sub-row">
            <span class="liveping">
              <span class="d"></span> agents reporting
            </span>
            <span class="muted">metrics every 30s</span>
          </p>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div class="filter-bar">
        <span
          class={`fchip ${filter.value === "all" ? "active" : ""}`}
          onClick$={() => (filter.value = "all")}
        >
          All · {hosts.value.length}
        </span>
        <span
          class={`fchip ${filter.value === "healthy" ? "active" : ""}`}
          onClick$={() => (filter.value = "healthy")}
        >
          Healthy · {healthyCount.value}
        </span>
        <span
          class={`fchip ${filter.value === "warning" ? "active" : ""}`}
          onClick$={() => (filter.value = "warning")}
        >
          Warning · {warningCount.value}
        </span>
        <span
          class={`fchip ${filter.value === "offline" ? "active" : ""}`}
          onClick$={() => (filter.value = "offline")}
        >
          Offline · {offlineCount.value}
        </span>
        <span style={{ flex: 1 }}></span>
      </div>

      {/* ── Host cards ── */}
      <div class="sub-grid c2-even">
        {filtered.value.map((h) => {
          const st = hostStatus(h);
          const expanded = expandedCardId.value === h.id;
          const metrics = metricsCache.value[h.id] || [];
          return (
            <div
              class="host-card"
              key={h.id}
              onClick$={() => toggleCard(h.id)}
              style={{ cursor: "pointer" }}
            >
              <div class="hc-top">
                <div>
                  <b>{h.name}</b>
                  <small>{h.os_info || h.hostname}</small>
                </div>
                <span class={`pill ${st}`}>{statusLabel(st)}</span>
              </div>
              <div class="hc-metrics">
                {[
                  { label: "CPU", val: `${h.cpu_percent.toFixed(1)}%`, pct: h.cpu_percent, warn: h.cpu_percent > h.cpu_threshold },
                  { label: "Memory", val: `${h.memory_percent.toFixed(1)}%`, pct: h.memory_percent, warn: h.memory_percent > h.memory_threshold },
                  { label: "Disk", val: `${h.disk_percent.toFixed(1)}%`, pct: h.disk_percent, warn: h.disk_percent > h.disk_threshold },
                  { label: "Net In", val: formatBytes(h.net_in_bytes) + "/s", pct: Math.min((h.net_in_bytes / 1_000_000) * 10, 100), warn: false },
                  { label: "Net Out", val: formatBytes(h.net_out_bytes) + "/s", pct: Math.min((h.net_out_bytes / 1_000_000) * 10, 100), warn: false },
                ].map((m) => (
                  <div class={`host-metric ${m.warn ? "warn" : ""}`} key={m.label}>
                    <span>{m.label}</span>
                    <div class="track">
                      <div
                        style={{
                          width: `${Math.min(m.pct, 100)}%`,
                          background: m.warn ? "var(--warn)" : "var(--accent)",
                        }}
                      ></div>
                    </div>
                    <span class="val">{m.val}</span>
                  </div>
                ))}
              </div>

              {/* ── Expanded card detail ── */}
              {expanded && (
                <div class="hc-detail" onClick$={(e) => e.stopPropagation()}>
                  {/* Threshold metric bars */}
                  <div class="hc-metrics" style={{ marginTop: 12 }}>
                    {[
                      { label: "CPU", pct: h.cpu_percent, threshold: h.cpu_threshold },
                      { label: "MEM", pct: h.memory_percent, threshold: h.memory_threshold },
                      { label: "DISK", pct: h.disk_percent, threshold: h.disk_threshold },
                    ].map((m) => (
                      <div class={`host-metric ${m.pct > m.threshold ? "warn" : ""}`} key={m.label}>
                        <span>{m.label}</span>
                        <div class="track" style={{ position: "relative" }}>
                          <div
                            style={{
                              width: `${Math.min(m.pct, 100)}%`,
                              background: m.pct > m.threshold ? "var(--warn)" : "var(--accent)",
                            }}
                          ></div>
                          <div
                            style={{
                              position: "absolute",
                              left: `${m.threshold}%`,
                              top: 0,
                              bottom: 0,
                              width: "2px",
                              background: "var(--warn)",
                              opacity: 0.7,
                            }}
                            title={`Threshold: ${m.threshold}%`}
                          ></div>
                        </div>
                        <span class="val">{m.pct.toFixed(1)}% / {m.threshold}%</span>
                      </div>
                    ))}
                  </div>

                  {/* Info grid */}
                  <div class="sub-grid c2-even" style={{ marginTop: 12, gap: "6px 16px", fontSize: "0.85em" }}>
                    <div><span class="muted">IP</span> <span class="mono">{h.ip_address || "—"}</span></div>
                    <div><span class="muted">OS</span> <span class="mono">{h.os_info || "—"}</span></div>
                    <div><span class="muted">Agent</span> <span class="mono">{h.agent_version || "—"}</span></div>
                    <div><span class="muted">Uptime</span> <span class="mono">{formatUptime(h.uptime_secs)}</span></div>
                    <div><span class="muted">Memory</span> <span class="mono">{formatBytes(h.memory_used)} / {formatBytes(h.memory_total)}</span></div>
                    <div><span class="muted">Disk</span> <span class="mono">{formatBytes(h.disk_used)} / {formatBytes(h.disk_total)}</span></div>
                    <div><span class="muted">Net In</span> <span class="mono">{formatBytes(h.net_in_bytes)}/s</span></div>
                    <div><span class="muted">Net Out</span> <span class="mono">{formatBytes(h.net_out_bytes)}/s</span></div>
                  </div>

                  {/* Sparkline charts */}
                  {metrics.length > 0 && (
                    <div class="sub-grid c2-even" style={{ marginTop: 12 }}>
                      {(
                        [
                          { title: "CPU History", key: "cpu_percent" as keyof HostMetric },
                          { title: "Memory History", key: "memory_percent" as keyof HostMetric },
                          { title: "Disk History", key: "disk_percent" as keyof HostMetric },
                          { title: "Network I/O", key: "net_in_bytes" as keyof HostMetric },
                        ] as const
                      ).map((chart) => (
                        <div key={chart.title} style={{ padding: "8px 0" }}>
                          <small class="muted">{chart.title}</small>
                          <svg
                            viewBox="0 0 200 40"
                            width="100%"
                            height="40"
                            preserveAspectRatio="none"
                            style={{ display: "block", marginTop: 4 }}
                          >
                            <polyline
                              points={sparklinePoints(metrics, chart.key, 200, 40)}
                              fill="none"
                              stroke="var(--accent)"
                              stroke-width="1.5"
                            />
                          </svg>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Linked projects */}
                  {h.project_names && h.project_names.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <small class="muted">Linked projects</small>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                        {h.project_names.map((p) => (
                          <span class="pill" key={p}>{p}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── All hosts table ── */}
      <div class="panel" style={{ marginTop: 24 }}>
        <table class="tbl">
          <thead>
            <tr>
              <th>Host</th>
              <th>Region</th>
              <th>Status</th>
              <th>CPU</th>
              <th>Mem</th>
              <th>Disk</th>
              <th>Uptime</th>
              <th>Last seen</th>
            </tr>
          </thead>
          <tbody>
            {filtered.value.map((h) => {
              const st = hostStatus(h);
              const expanded = expandedRowId.value === h.id;
              const metrics = metricsCache.value[h.id] || [];
              return (
                <>
                  <tr
                    key={h.id}
                    onClick$={() => toggleRow(h.id)}
                    style={{ cursor: "pointer" }}
                  >
                    <td><b>{h.name}</b></td>
                    <td class="mono">{h.os_info || h.hostname}</td>
                    <td><span class={`pill ${st}`}>{statusLabel(st)}</span></td>
                    <td class="mono">{h.cpu_percent.toFixed(1)}%</td>
                    <td class="mono">{h.memory_percent.toFixed(1)}%</td>
                    <td class="mono">{h.disk_percent.toFixed(1)}%</td>
                    <td class="mono">{formatUptime(h.uptime_secs)}</td>
                    <td class="muted">{h.last_heartbeat_at ? timeAgo(h.last_heartbeat_at) : "—"}</td>
                  </tr>
                  {expanded && (
                    <tr key={`${h.id}-detail`}>
                      <td colSpan={8} style={{ padding: "12px 16px", background: "var(--bg-raised, var(--bg2))" }}>
                        {/* Threshold bars */}
                        <div class="hc-metrics" style={{ maxWidth: 500 }}>
                          {[
                            { label: "CPU", pct: h.cpu_percent, threshold: h.cpu_threshold },
                            { label: "MEM", pct: h.memory_percent, threshold: h.memory_threshold },
                            { label: "DISK", pct: h.disk_percent, threshold: h.disk_threshold },
                          ].map((m) => (
                            <div class={`host-metric ${m.pct > m.threshold ? "warn" : ""}`} key={m.label}>
                              <span>{m.label}</span>
                              <div class="track" style={{ position: "relative" }}>
                                <div
                                  style={{
                                    width: `${Math.min(m.pct, 100)}%`,
                                    background: m.pct > m.threshold ? "var(--warn)" : "var(--accent)",
                                  }}
                                ></div>
                                <div
                                  style={{
                                    position: "absolute",
                                    left: `${m.threshold}%`,
                                    top: 0,
                                    bottom: 0,
                                    width: "2px",
                                    background: "var(--warn)",
                                    opacity: 0.7,
                                  }}
                                  title={`Threshold: ${m.threshold}%`}
                                ></div>
                              </div>
                              <span class="val">{m.pct.toFixed(1)}% / {m.threshold}%</span>
                            </div>
                          ))}
                        </div>

                        {/* Info grid */}
                        <div class="sub-grid c2-even" style={{ marginTop: 12, gap: "6px 16px", fontSize: "0.85em", maxWidth: 500 }}>
                          <div><span class="muted">IP</span> <span class="mono">{h.ip_address || "—"}</span></div>
                          <div><span class="muted">OS</span> <span class="mono">{h.os_info || "—"}</span></div>
                          <div><span class="muted">Agent</span> <span class="mono">{h.agent_version || "—"}</span></div>
                          <div><span class="muted">Uptime</span> <span class="mono">{formatUptime(h.uptime_secs)}</span></div>
                          <div><span class="muted">Memory</span> <span class="mono">{formatBytes(h.memory_used)} / {formatBytes(h.memory_total)}</span></div>
                          <div><span class="muted">Disk</span> <span class="mono">{formatBytes(h.disk_used)} / {formatBytes(h.disk_total)}</span></div>
                          <div><span class="muted">Net In</span> <span class="mono">{formatBytes(h.net_in_bytes)}/s</span></div>
                          <div><span class="muted">Net Out</span> <span class="mono">{formatBytes(h.net_out_bytes)}/s</span></div>
                        </div>

                        {/* Sparklines */}
                        {metrics.length > 0 && (
                          <div class="sub-grid c2-even" style={{ marginTop: 12, maxWidth: 500 }}>
                            {(
                              [
                                { title: "CPU History", key: "cpu_percent" as keyof HostMetric },
                                { title: "Memory History", key: "memory_percent" as keyof HostMetric },
                                { title: "Disk History", key: "disk_percent" as keyof HostMetric },
                                { title: "Network I/O", key: "net_in_bytes" as keyof HostMetric },
                              ] as const
                            ).map((chart) => (
                              <div key={chart.title} style={{ padding: "8px 0" }}>
                                <small class="muted">{chart.title}</small>
                                <svg
                                  viewBox="0 0 200 40"
                                  width="100%"
                                  height="40"
                                  preserveAspectRatio="none"
                                  style={{ display: "block", marginTop: 4 }}
                                >
                                  <polyline
                                    points={sparklinePoints(metrics, chart.key, 200, 40)}
                                    fill="none"
                                    stroke="var(--accent)"
                                    stroke-width="1.5"
                                  />
                                </svg>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Linked projects */}
                        {h.project_names && h.project_names.length > 0 && (
                          <div style={{ marginTop: 12 }}>
                            <small class="muted">Linked projects</small>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                              {h.project_names.map((p) => (
                                <span class="pill" key={p}>{p}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
});
