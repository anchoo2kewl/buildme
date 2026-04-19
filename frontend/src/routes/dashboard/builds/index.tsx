import {
  component$,
  useSignal,
  useVisibleTask$,
  useComputed$,
  useContext,
  $,
} from "@builder.io/qwik";
import { fetchDashboard } from "~/lib/api";
import type { Build, DashboardEntry, BuildStatus, ProviderType } from "~/lib/types";
import { WSContext } from "~/context/ws-context";

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  if (m < 60) return `${m}m ${rs.toString().padStart(2, "0")}s`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return `${h}h ${rm.toString().padStart(2, "0")}m`;
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

function statusCls(status: BuildStatus): string {
  switch (status) {
    case "success": return "ok";
    case "running": return "run";
    case "failure": case "error": return "fail";
    case "cancelled": case "skipped": return "warn";
    case "queued": return "plain";
    default: return "plain";
  }
}

function providerLabel(pt?: ProviderType): string {
  switch (pt) {
    case "github": return "GitHub Actions";
    case "github_hosted": return "GitHub Hosted";
    case "travis": return "Travis CI";
    case "circleci": return "CircleCI";
    default: return "CI";
  }
}

export default component$(() => {
  const wsState = useContext(WSContext);
  const entries = useSignal<DashboardEntry[]>([]);
  const loading = useSignal(true);
  const search = useSignal("");
  const statusFilter = useSignal<"all" | BuildStatus>("all");
  const providerFilter = useSignal<"all" | ProviderType>("all");

  const loadData = $(async () => {
    try {
      entries.value = await fetchDashboard();
    } catch {
      // ignore
    }
    loading.value = false;
  });

  useVisibleTask$(async () => {
    await loadData();

    const ws = wsState.ws as any;
    if (ws) {
      // Subscribe to all projects
      for (const entry of entries.value) {
        ws.subscribe(entry.project.id);
      }
      const unsub = ws.onEvent((event: any) => {
        if (event.build) {
          const projIdx = entries.value.findIndex((e) => e.project.id === event.project_id);
          if (projIdx >= 0) {
            const newEntries = [...entries.value];
            const builds = [...newEntries[projIdx].builds];
            const bIdx = builds.findIndex((b) => b.id === event.build.id);
            if (bIdx >= 0) {
              builds[bIdx] = event.build;
            } else {
              builds.unshift(event.build);
            }
            newEntries[projIdx] = { ...newEntries[projIdx], builds };
            entries.value = newEntries;
          }
        }
      });
      return () => {
        for (const entry of entries.value) {
          ws.unsubscribe(entry.project.id);
        }
        unsub();
      };
    }
  });

  // Flatten all builds with project name attached
  const allBuilds = useComputed$(() => {
    const flat: (Build & { projectName: string; projectId: number })[] = [];
    for (const entry of entries.value) {
      for (const b of entry.builds) {
        flat.push({ ...b, projectName: entry.project.name, projectId: entry.project.id });
      }
    }
    return flat.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  });

  const filtered = useComputed$(() => {
    let list = allBuilds.value;
    if (statusFilter.value !== "all") {
      list = list.filter((b) => b.status === statusFilter.value);
    }
    if (providerFilter.value !== "all") {
      list = list.filter((b) => b.provider_type === providerFilter.value);
    }
    if (search.value) {
      const q = search.value.toLowerCase();
      list = list.filter(
        (b) =>
          b.projectName.toLowerCase().includes(q) ||
          b.branch.toLowerCase().includes(q) ||
          b.commit_message.toLowerCase().includes(q),
      );
    }
    return list;
  });

  const last24h = useComputed$(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return allBuilds.value.filter((b) => new Date(b.created_at).getTime() > cutoff).length;
  });

  const counts = useComputed$(() => {
    const all = allBuilds.value;
    return {
      total: all.length,
      passing: all.filter((b) => b.status === "success").length,
      failed: all.filter((b) => b.status === "failure" || b.status === "error").length,
      running: all.filter((b) => b.status === "running").length,
      queued: all.filter((b) => b.status === "queued").length,
    };
  });

  // Unique providers
  const providers = useComputed$(() => {
    const set = new Set<ProviderType>();
    for (const b of allBuilds.value) {
      if (b.provider_type) set.add(b.provider_type);
    }
    return [...set];
  });

  return (
    <div>
      <div class="page-top">
        <div class="breadcrumb">
          workspace <span>/</span> <b>builds</b>
        </div>
        <div class="page-top-actions">
          <div class="search">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="6.2" cy="6.2" r="4.5" /><path d="m12.5 12.5-3-3" /></svg>
            <input
              type="text"
              placeholder="Search builds..."
              value={search.value}
              onInput$={(_, el) => (search.value = el.value)}
            />
          </div>
          <button class="btn btn-outline">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8v3.5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V8" /><polyline points="4 5.5 7 8.5 10 5.5" /><line x1="7" y1="8.5" x2="7" y2="1.5" /></svg>
            Export CSV
          </button>
          <button class="btn btn-primary">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><polygon points="4.5 2 12 7 4.5 12" /></svg>
            Run build
          </button>
        </div>
      </div>

      <div class="greet">
        <div>
          <h1>Builds <em>· {last24h.value} in the last 24h</em></h1>
          <p class="sub-row">
            <span class="liveping"><span class="d"></span> streaming</span>
          </p>
        </div>
      </div>

      <div class="filter-bar">
        <span
          class={`fchip ${statusFilter.value === "all" ? "active" : ""}`}
          onClick$={() => (statusFilter.value = "all")}
        >All · {counts.value.total}</span>
        <span
          class={`fchip ${statusFilter.value === "success" ? "active" : ""}`}
          onClick$={() => (statusFilter.value = "success")}
        >Passing · {counts.value.passing}</span>
        <span
          class={`fchip ${statusFilter.value === "failure" ? "active" : ""}`}
          onClick$={() => (statusFilter.value = "failure")}
        >Failed · {counts.value.failed}</span>
        <span
          class={`fchip ${statusFilter.value === "running" ? "active" : ""}`}
          onClick$={() => (statusFilter.value = "running")}
        >Running · {counts.value.running}</span>
        <span
          class={`fchip ${statusFilter.value === "queued" ? "active" : ""}`}
          onClick$={() => (statusFilter.value = "queued")}
        >Queued · {counts.value.queued}</span>
        <span style={{ flex: 1 }}></span>
        {providers.value.map((pt) => (
          <span
            key={pt}
            class={`fchip ${providerFilter.value === pt ? "active" : ""}`}
            onClick$={() => (providerFilter.value = providerFilter.value === pt ? "all" : pt)}
          >{providerLabel(pt)}</span>
        ))}
      </div>

      {loading.value ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-3)" }}>Loading builds...</div>
      ) : (
        <div class="panel">
          <table class="tbl">
            <thead>
              <tr>
                <th>Status</th>
                <th>Project · message</th>
                <th>Branch / SHA</th>
                <th>Provider</th>
                <th>Trigger</th>
                <th>Duration</th>
                <th>Started</th>
              </tr>
            </thead>
            <tbody>
              {filtered.value.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", color: "var(--text-3)", padding: 24 }}>
                    No builds found
                  </td>
                </tr>
              ) : (
                filtered.value.map((b) => (
                  <tr key={b.id}>
                    <td><span class={`pill ${statusCls(b.status)}`}>{b.status}</span></td>
                    <td>
                      <a href={`/dashboard/projects/${b.projectId}`} style={{ fontWeight: 600, color: "var(--text)" }}>{b.projectName}</a>
                      <span class="muted" style={{ marginLeft: 8 }}>{b.commit_message}</span>
                    </td>
                    <td class="mono">
                      {b.branch} <span class="muted">{b.commit_sha.slice(0, 7)}</span>
                    </td>
                    <td>
                      <span class="pill plain">{providerLabel(b.provider_type)}</span>
                    </td>
                    <td class="muted">{b.trigger}</td>
                    <td class="mono">
                      {b.duration_ms ? formatDuration(b.duration_ms) : "--"}
                    </td>
                    <td class="muted">
                      {b.started_at ? (
                        <a href={b.provider_url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-3)" }}>
                          {timeAgo(b.started_at)}
                        </a>
                      ) : (
                        timeAgo(b.created_at)
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
});
