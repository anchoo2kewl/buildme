import {
  component$,
  useSignal,
  useVisibleTask$,
  useComputed$,
  useContext,
} from "@builder.io/qwik";
import { fetchDrift, fetchDashboard } from "~/lib/api";
import type { DriftProject, DashboardEntry, Build } from "~/lib/types";
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

type HealthStatus = "ok" | "warn" | "fail";

interface ProjectView {
  id: number;
  name: string;
  slug: string;
  description?: string;
  health: HealthStatus;
  healthLabel: string;
  builds: Build[];
  successRate: number;
  avgDurationMs: number;
  builds7d: number;
  branches: string[];
  hasDrift: boolean;
}

function computeHealth(builds: Build[], hasDrift: boolean): { health: HealthStatus; label: string } {
  if (builds.length === 0) return { health: "ok", label: "healthy" };
  // Check last build
  const sorted = [...builds].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const last = sorted[0];
  if (last.status === "failure" || last.status === "error") return { health: "fail", label: "broken" };
  if (hasDrift) return { health: "warn", label: "at risk" };
  // Check recent failure rate
  const recent = sorted.slice(0, 10);
  const failures = recent.filter((b) => b.status === "failure" || b.status === "error").length;
  if (failures >= 3) return { health: "warn", label: "at risk" };
  return { health: "ok", label: "healthy" };
}

export default component$(() => {
  const wsState = useContext(WSContext);
  const driftProjects = useSignal<DriftProject[]>([]);
  const dashEntries = useSignal<DashboardEntry[]>([]);
  const loading = useSignal(true);
  const search = useSignal("");
  const healthFilter = useSignal<"all" | HealthStatus>("all");

  useVisibleTask$(async () => {
    try {
      const [drift, dash] = await Promise.all([fetchDrift(), fetchDashboard()]);
      driftProjects.value = drift.projects;
      dashEntries.value = dash;
    } catch {
      // ignore
    }
    loading.value = false;

    const ws = wsState.ws as any;
    if (ws) {
      for (const entry of dashEntries.value) {
        ws.subscribe(entry.project.id);
      }
      const unsub = ws.onEvent((event: any) => {
        if (event.build) {
          const idx = dashEntries.value.findIndex((e) => e.project.id === event.project_id);
          if (idx >= 0) {
            const newEntries = [...dashEntries.value];
            const builds = [...newEntries[idx].builds];
            const bIdx = builds.findIndex((b) => b.id === event.build.id);
            if (bIdx >= 0) {
              builds[bIdx] = event.build;
            } else {
              builds.unshift(event.build);
            }
            newEntries[idx] = { ...newEntries[idx], builds };
            dashEntries.value = newEntries;
          }
        }
      });
      return () => {
        for (const entry of dashEntries.value) {
          ws.unsubscribe(entry.project.id);
        }
        unsub();
      };
    }
  });

  const projects = useComputed$(() => {
    const driftMap = new Map<number, boolean>();
    for (const dp of driftProjects.value) {
      const isDrifted = dp.environments.some((e) => e.is_drifted);
      driftMap.set(dp.project.id, isDrifted);
    }

    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    const views: ProjectView[] = dashEntries.value.map((entry) => {
      const { project, builds } = entry;
      const hasDrift = driftMap.get(project.id) || false;
      const { health, label } = computeHealth(builds, hasDrift);

      const finished = builds.filter((b) => b.status === "success" || b.status === "failure" || b.status === "error");
      const successes = finished.filter((b) => b.status === "success").length;
      const successRate = finished.length > 0 ? (successes / finished.length) * 100 : 100;

      const withDuration = builds.filter((b) => b.duration_ms);
      const avgDurationMs = withDuration.length > 0
        ? withDuration.reduce((s, b) => s + (b.duration_ms || 0), 0) / withDuration.length
        : 0;

      const builds7d = builds.filter((b) => new Date(b.created_at).getTime() > sevenDaysAgo).length;

      const branchSet = new Set<string>();
      for (const b of builds) branchSet.add(b.branch);

      return {
        id: project.id,
        name: project.name,
        slug: project.slug,
        description: project.description,
        health,
        healthLabel: label,
        builds,
        successRate,
        avgDurationMs,
        builds7d,
        branches: [...branchSet].slice(0, 5),
        hasDrift,
      };
    });

    return views;
  });

  const filtered = useComputed$(() => {
    let list = projects.value;
    if (healthFilter.value !== "all") {
      list = list.filter((p) => p.health === healthFilter.value);
    }
    if (search.value) {
      const q = search.value.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q) ||
          (p.description || "").toLowerCase().includes(q),
      );
    }
    return list;
  });

  const healthCounts = useComputed$(() => {
    const all = projects.value;
    return {
      total: all.length,
      healthy: all.filter((p) => p.health === "ok").length,
      atRisk: all.filter((p) => p.health === "warn").length,
      broken: all.filter((p) => p.health === "fail").length,
    };
  });

  return (
    <div>
      <div class="page-top">
        <div class="breadcrumb">
          workspace <span>/</span> <b>projects</b>
        </div>
        <div class="page-top-actions">
          <div class="search">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="6.2" cy="6.2" r="4.5" /><path d="m12.5 12.5-3-3" /></svg>
            <input
              type="text"
              placeholder="Search projects..."
              value={search.value}
              onInput$={(_, el) => (search.value = el.value)}
            />
          </div>
          <button class="btn btn-outline">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 1.5v11M1.5 7h11" /></svg>
            Import from git
          </button>
          <a href="/dashboard/projects/new" class="btn btn-primary">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 1.5v11M1.5 7h11" /></svg>
            New project
          </a>
        </div>
      </div>

      <div class="greet">
        <div>
          <h1>Projects <em>· {healthCounts.value.total} tracked</em></h1>
        </div>
      </div>

      <div class="filter-bar">
        <span
          class={`fchip ${healthFilter.value === "all" ? "active" : ""}`}
          onClick$={() => (healthFilter.value = "all")}
        >All · {healthCounts.value.total}</span>
        <span
          class={`fchip ${healthFilter.value === "ok" ? "active" : ""}`}
          onClick$={() => (healthFilter.value = "ok")}
        >Healthy · {healthCounts.value.healthy}</span>
        <span
          class={`fchip ${healthFilter.value === "warn" ? "active" : ""}`}
          onClick$={() => (healthFilter.value = "warn")}
        >At risk · {healthCounts.value.atRisk}</span>
        <span
          class={`fchip ${healthFilter.value === "fail" ? "active" : ""}`}
          onClick$={() => (healthFilter.value = "fail")}
        >Broken · {healthCounts.value.broken}</span>
        <span style={{ flex: 1 }}></span>
        <span class="fchip">sort: last build</span>
        <span class="fchip">view: cards</span>
      </div>

      {loading.value ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-3)" }}>Loading projects...</div>
      ) : filtered.value.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-3)" }}>
          No projects found
        </div>
      ) : (
        <div class="sub-grid c3">
          {filtered.value.map((p) => {
            // Take last 12 builds for sparkline
            const recentBuilds = [...p.builds]
              .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
              .slice(-12);

            return (
              <div class="proj-card" key={p.id}>
                <div class="t">
                  <div>
                    <b><a href={`/dashboard/projects/${p.id}`} style={{ color: "var(--text)", textDecoration: "none" }}>{p.name}</a></b>
                    <small><a href={`/dashboard/projects/${p.id}`} style={{ color: "var(--text-3)", textDecoration: "none" }}>{p.slug}</a></small>
                  </div>
                  <span class={`pill ${p.health}`}>{p.healthLabel}</span>
                </div>
                <div class="sparkrow">
                  {recentBuilds.length > 0
                    ? recentBuilds.map((b, i) => {
                        const barClass =
                          b.status === "failure" || b.status === "error"
                            ? "f"
                            : b.status === "running"
                            ? "r"
                            : "";
                        // Height based on duration relative to max in set
                        const maxDur = Math.max(...recentBuilds.map((rb) => rb.duration_ms || 1));
                        const h = b.duration_ms ? Math.max(Math.round(((b.duration_ms) / maxDur) * 100), 12) : 40;
                        return (
                          <div
                            key={i}
                            class={`bar ${barClass}`}
                            style={{ height: `${h}%` }}
                          />
                        );
                      })
                    : Array.from({ length: 12 }).map((_, i) => (
                        <div key={i} class="bar" style={{ height: "8%" }} />
                      ))
                  }
                </div>
                <div class="pmeta">
                  <div>
                    <strong>{p.successRate.toFixed(1)}%</strong>
                    success rate
                  </div>
                  <div>
                    <strong>{p.avgDurationMs > 0 ? formatDuration(p.avgDurationMs) : "--"}</strong>
                    avg duration
                  </div>
                  <div>
                    <strong>{p.builds7d}</strong>
                    builds 7d
                  </div>
                </div>
                <div class="branches">
                  {p.branches.map((br) => (
                    <span class="pill plain" key={br}>{br}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});
