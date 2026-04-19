import {
  component$,
  useSignal,
  useVisibleTask$,
  useComputed$,
  useContext,
  $,
} from "@builder.io/qwik";
import { fetchAllIncidents, ignoreIncident } from "~/lib/api";
import type { ResourceIncident } from "~/lib/types";
import { WSContext } from "~/context/ws-context";

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  if (m < 60) return `${m}m ${rs}s`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return `${h}h ${rm}m`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function sevColor(metric: string): string {
  if (metric.includes("health") || metric.includes("cpu")) return "";
  if (metric.includes("memory") || metric.includes("disk")) return "warn";
  return "info";
}

function sevLabel(metric: string): string {
  if (metric.includes("health") || metric.includes("cpu")) return "P1";
  if (metric.includes("memory") || metric.includes("disk")) return "P2";
  return "P3";
}

export default component$(() => {
  const wsState = useContext(WSContext);
  const incidents = useSignal<ResourceIncident[]>([]);
  const loading = useSignal(true);
  const search = useSignal("");
  const statusFilter = useSignal<"all" | "open" | "resolved" | "ignored">("all");
  const envFilter = useSignal<"all" | "production" | "staging" | "uat">("all");

  const loadIncidents = $(async () => {
    try {
      incidents.value = await fetchAllIncidents(500);
    } catch {
      // ignore
    }
    loading.value = false;
  });

  useVisibleTask$(async () => {
    await loadIncidents();

    const ws = wsState.ws as any;
    if (ws) {
      const unsub = ws.onEvent((event: any) => {
        if (event.type === "incident" || event.type === "incident_resolved") {
          loadIncidents();
        }
      });
      return () => unsub();
    }
  });

  const filtered = useComputed$(() => {
    let list = incidents.value;
    if (statusFilter.value === "open") list = list.filter((i) => !i.resolved_at && !i.ignored);
    else if (statusFilter.value === "resolved") list = list.filter((i) => i.resolved_at);
    else if (statusFilter.value === "ignored") list = list.filter((i) => i.ignored && !i.resolved_at);
    if (envFilter.value !== "all") list = list.filter((i) => i.env === envFilter.value);
    if (search.value) {
      const q = search.value.toLowerCase();
      list = list.filter(
        (i) =>
          i.message.toLowerCase().includes(q) ||
          (i.project_name || "").toLowerCase().includes(q) ||
          i.metric.toLowerCase().includes(q),
      );
    }
    return list;
  });

  const openIncidents = useComputed$(() =>
    filtered.value.filter((i) => !i.resolved_at && !i.ignored),
  );

  const openCount = useComputed$(() =>
    incidents.value.filter((i) => !i.resolved_at && !i.ignored).length,
  );

  const ackCount = useComputed$(() =>
    incidents.value.filter((i) => !i.resolved_at && i.ignored).length,
  );

  const resolvedCount = useComputed$(() =>
    incidents.value.filter((i) => i.resolved_at).length,
  );

  const ignoredCount = useComputed$(() =>
    incidents.value.filter((i) => i.ignored && !i.resolved_at).length,
  );

  const resolvedLast7d = useComputed$(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return filtered.value
      .filter((i) => i.resolved_at && new Date(i.resolved_at).getTime() > cutoff)
      .sort((a, b) => new Date(b.resolved_at!).getTime() - new Date(a.resolved_at!).getTime());
  });

  const mttrData = useComputed$(() => {
    const resolved = incidents.value.filter((i) => i.resolved_at);
    const byDay = new Map<string, number[]>();
    for (const inc of resolved) {
      const day = inc.resolved_at!.slice(0, 10);
      const dur = new Date(inc.resolved_at!).getTime() - new Date(inc.created_at).getTime();
      const arr = byDay.get(day) || [];
      arr.push(dur);
      byDay.set(day, arr);
    }
    const entries = [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14)
      .map(([, durations]) => {
        const avg = durations.reduce((s, d) => s + d, 0) / durations.length;
        return avg;
      });
    if (entries.length === 0) return { points: "", avgMs: 0 };
    const maxVal = Math.max(...entries);
    const avgMs = entries.reduce((s, v) => s + v, 0) / entries.length;
    const pts = entries
      .map((v, i) => {
        const x = entries.length === 1 ? 140 : (i / (entries.length - 1)) * 280;
        const y = maxVal === 0 ? 40 : 70 - (v / maxVal) * 60;
        return `${x},${y}`;
      })
      .join(" ");
    return { points: pts, avgMs };
  });

  const topOffenders = useComputed$(() => {
    const map = new Map<string, { count: number; totalMs: number }>();
    for (const inc of incidents.value) {
      const name = inc.project_name || `project-${inc.project_id}`;
      const entry = map.get(name) || { count: 0, totalMs: 0 };
      entry.count++;
      if (inc.resolved_at) {
        entry.totalMs += new Date(inc.resolved_at).getTime() - new Date(inc.created_at).getTime();
      }
      map.set(name, entry);
    }
    return [...map.entries()]
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 6)
      .map(([name, data]) => ({ name, ...data }));
  });

  const handleAcknowledge = $((id: number) => {
    ignoreIncident(id, true).then(() => loadIncidents());
  });

  return (
    <div>
      <div class="page-top">
        <div class="breadcrumb">
          workspace <span>/</span> <b>incidents</b>
        </div>
        <div class="page-top-actions">
          <div class="search">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="6.2" cy="6.2" r="4.5" /><path d="m12.5 12.5-3-3" /></svg>
            <input
              type="text"
              placeholder="Search incidents..."
              value={search.value}
              onInput$={(_, el) => (search.value = el.value)}
            />
          </div>
          <button class="btn btn-outline">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h10M4 7h6M6 11h2" /></svg>
            Runbooks
          </button>
          <button class="btn btn-primary">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 1.5v11M1.5 7h11" /></svg>
            New incident
          </button>
        </div>
      </div>

      <div class="greet">
        <div>
          <h1>Incidents <em>· {openCount.value} open · {ackCount.value} acknowledged</em></h1>
        </div>
      </div>

      <div class="filter-bar">
        <span
          class={`fchip ${statusFilter.value === "all" ? "active" : ""}`}
          onClick$={() => (statusFilter.value = "all")}
        >All · {incidents.value.length}</span>
        <span
          class={`fchip ${statusFilter.value === "open" ? "active" : ""}`}
          onClick$={() => (statusFilter.value = "open")}
        >Open · {openCount.value}</span>
        <span
          class={`fchip ${statusFilter.value === "resolved" ? "active" : ""}`}
          onClick$={() => (statusFilter.value = "resolved")}
        >Resolved · {resolvedCount.value}</span>
        <span
          class={`fchip ${statusFilter.value === "ignored" ? "active" : ""}`}
          onClick$={() => (statusFilter.value = "ignored")}
        >Ignored · {ignoredCount.value}</span>
        <span style={{ flex: 1 }}></span>
        <span
          class={`fchip ${envFilter.value === "all" ? "active" : ""}`}
          onClick$={() => (envFilter.value = "all")}
        >All envs</span>
        <span
          class={`fchip ${envFilter.value === "production" ? "active" : ""}`}
          onClick$={() => (envFilter.value = "production")}
        >Production</span>
        <span
          class={`fchip ${envFilter.value === "staging" ? "active" : ""}`}
          onClick$={() => (envFilter.value = "staging")}
        >Staging</span>
        <span
          class={`fchip ${envFilter.value === "uat" ? "active" : ""}`}
          onClick$={() => (envFilter.value = "uat")}
        >UAT</span>
      </div>

      {loading.value ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-3)" }}>Loading incidents...</div>
      ) : (
        <div class="sub-grid c2">
          {/* Left column */}
          <div>
            {/* Open incidents */}
            <div class="panel">
              <div class="panel-head">
                <h3>Open incidents <span class="cnt">{openIncidents.value.length}</span></h3>
              </div>
              <div class="panel-body p0">
                {openIncidents.value.length === 0 ? (
                  <div style={{ padding: 24, textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>
                    No open incidents
                  </div>
                ) : (
                  openIncidents.value.map((inc) => (
                    <div class="incident-row" key={inc.id}>
                      <div class={`sev ${sevColor(inc.metric)}`}></div>
                      <div class="title">
                        <b>{inc.message}</b>
                        <p>
                          {inc.metric}: {inc.value.toFixed(1)} (threshold: {inc.threshold.toFixed(1)})
                          {inc.project_name ? ` on ${inc.project_name}` : ""}
                        </p>
                        <div class="tags">
                          <span class="pill plain">{sevLabel(inc.metric)}</span>
                          {inc.project_name && <span class="pill plain">{inc.project_name}</span>}
                          <span class="pill plain">{inc.env}</span>
                        </div>
                      </div>
                      <div class="when">{timeAgo(inc.created_at)}</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <button
                          class="btn btn-outline"
                          style={{ padding: "4px 10px", fontSize: "11px" }}
                          onClick$={() => handleAcknowledge(inc.id)}
                        >Acknowledge</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Resolved last 7d */}
            <div class="panel">
              <div class="panel-head">
                <h3>Resolved <span class="cnt">last 7d</span></h3>
              </div>
              <div class="panel-body p0">
                {resolvedLast7d.value.length === 0 ? (
                  <div style={{ padding: 24, textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>
                    No resolved incidents in the last 7 days
                  </div>
                ) : (
                  <table class="tbl">
                    <thead>
                      <tr>
                        <th>Severity</th>
                        <th>Incident</th>
                        <th>Duration</th>
                        <th>Resolved</th>
                        <th>Closed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resolvedLast7d.value.map((inc) => {
                        const dur = new Date(inc.resolved_at!).getTime() - new Date(inc.created_at).getTime();
                        return (
                          <tr key={inc.id}>
                            <td><span class="pill plain">{sevLabel(inc.metric)}</span></td>
                            <td><b>{inc.message}</b></td>
                            <td class="mono">{formatDuration(dur)}</td>
                            <td class="muted">{timeAgo(inc.resolved_at!)}</td>
                            <td class="muted">{new Date(inc.resolved_at!).toLocaleDateString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div>
            {/* MTTR trend */}
            <div class="panel">
              <div class="panel-head">
                <h3>MTTR trend <span class="cnt">14d</span></h3>
              </div>
              <div class="panel-body">
                {mttrData.value.points ? (
                  <>
                    <svg viewBox="0 0 280 80" style={{ width: "100%", height: 80 }}>
                      <polyline
                        fill="none"
                        stroke="var(--accent)"
                        stroke-width="1.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        points={mttrData.value.points}
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
                      <span>14d ago</span>
                      <span>MTTR: {formatDuration(mttrData.value.avgMs)} avg</span>
                      <span>now</span>
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: "center", color: "var(--text-3)", fontSize: 13, padding: 16 }}>
                    No resolved incidents for MTTR calculation
                  </div>
                )}
              </div>
            </div>

            {/* Top offenders */}
            <div class="panel">
              <div class="panel-head">
                <h3>Top offenders <span class="cnt">all time</span></h3>
              </div>
              <div class="panel-body">
                {topOffenders.value.length === 0 ? (
                  <div style={{ textAlign: "center", color: "var(--text-3)", fontSize: 13, padding: 16 }}>
                    No incident data
                  </div>
                ) : (
                  topOffenders.value.map((o) => (
                    <div key={o.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px dashed var(--line-soft)", fontSize: 13 }}>
                      <span style={{ fontWeight: 500 }}>{o.name}</span>
                      <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-3)" }}>
                        {o.count} incidents{o.totalMs > 0 ? ` · ${formatDuration(o.totalMs)} total` : ""}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
