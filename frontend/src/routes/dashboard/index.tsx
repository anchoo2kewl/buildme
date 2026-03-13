import { component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import { get, fetchDrift } from "~/lib/api";
import type { Project, DriftDashboard, EnvironmentStatus } from "~/lib/types";
import { ProjectCard } from "~/components/projects/project-card";
import { EnvironmentMatrix } from "~/components/environments/environment-matrix";
import { EnvironmentDetail } from "~/components/environments/environment-detail";

export default component$(() => {
  const activeTab = useSignal<"environments" | "builds">("environments");
  const projects = useSignal<Project[]>([]);
  const drift = useSignal<DriftDashboard | null>(null);
  const selectedEnv = useSignal<EnvironmentStatus | null>(null);
  const loading = useSignal(true);
  const driftLoading = useSignal(true);
  const lastChecked = useSignal<string | null>(null);

  useVisibleTask$(async () => {
    try {
      const [p, d] = await Promise.all([
        get<Project[]>("/projects"),
        fetchDrift(),
      ]);
      projects.value = p;
      drift.value = d;
      lastChecked.value = new Date().toLocaleTimeString();
    } catch {
      // ignore
    }
    loading.value = false;
    driftLoading.value = false;
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
            disabled={driftLoading.value}
            onClick$={async () => {
              driftLoading.value = true;
              try {
                drift.value = await fetchDrift();
                lastChecked.value = new Date().toLocaleTimeString();
              } catch {
                // ignore
              }
              driftLoading.value = false;
            }}
          >
            {driftLoading.value ? "Refreshing..." : "Refresh"}
          </button>
          <a
            href="/dashboard/projects/new"
            class="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            New Project
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div class="mb-4 flex border-b border-border">
        <button
          class={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab.value === "environments"
              ? "border-b-2 border-accent text-accent"
              : "text-muted hover:text-text"
          }`}
          onClick$={() => {
            activeTab.value = "environments";
          }}
        >
          Environments
        </button>
        <button
          class={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab.value === "builds"
              ? "border-b-2 border-accent text-accent"
              : "text-muted hover:text-text"
          }`}
          onClick$={() => {
            activeTab.value = "builds";
          }}
        >
          Builds
        </button>
      </div>

      {loading.value ? (
        <div class="flex items-center justify-center p-8">
          <div class="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      ) : activeTab.value === "environments" ? (
        <>
          {drift.value ? (
            <EnvironmentMatrix
              dashboard={drift.value}
              selectedEnv={selectedEnv}
            />
          ) : (
            <div class="rounded-lg border border-border bg-elevated p-12 text-center">
              <h2 class="text-lg font-semibold text-text">
                No environment data
              </h2>
              <p class="mt-2 text-sm text-muted">
                Configure environment URLs on your projects to see status.
              </p>
            </div>
          )}
          <EnvironmentDetail env={selectedEnv} />
        </>
      ) : projects.value.length === 0 ? (
        <div class="rounded-lg border border-border bg-elevated p-12 text-center">
          <h2 class="text-lg font-semibold text-text">No projects yet</h2>
          <p class="mt-2 text-sm text-muted">
            Create your first project to start monitoring builds.
          </p>
          <a
            href="/dashboard/projects/new"
            class="mt-4 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white"
          >
            Create Project
          </a>
        </div>
      ) : (
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.value.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}
    </div>
  );
});
