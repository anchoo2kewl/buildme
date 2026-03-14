import { component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import { useLocation } from "@builder.io/qwik-city";
import { get } from "~/lib/api";
import type { Build } from "~/lib/types";
import { StatusBadge } from "~/components/builds/status-badge";
import { BuildTimeline } from "~/components/builds/build-timeline";
import { CIProviderIcon, providerDisplayName } from "~/components/shared/ci-provider-icon";

export default component$(() => {
  const loc = useLocation();
  const { projectId, buildId } = loc.params;
  const build = useSignal<Build | null>(null);
  const loading = useSignal(true);

  useVisibleTask$(async () => {
    try {
      build.value = await get<Build>(`/projects/${projectId}/builds/${buildId}`);
    } catch {
      // ignore
    }
    loading.value = false;
  });

  return (
    <div>
      {loading.value ? (
        <div class="flex items-center justify-center p-8">
          <div class="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      ) : build.value ? (
        <>
          <div class="mb-6">
            <a
              href={`/dashboard/projects/${projectId}`}
              class="text-sm text-accent hover:underline"
            >
              Back to builds
            </a>
          </div>

          <div class="rounded-lg border border-border bg-elevated p-6">
            <div class="flex items-start justify-between">
              <div>
                <div class="flex items-center gap-3">
                  <StatusBadge status={build.value.status} />
                  <h1 class="text-xl font-bold text-text">
                    {build.value.workflow_name || `Build #${build.value.external_id}`}
                  </h1>
                </div>
                <p class="mt-2 text-sm text-muted">
                  {build.value.commit_message}
                </p>
              </div>
              {build.value.provider_url && (
                <a
                  href={build.value.provider_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-muted transition-colors hover:border-accent hover:text-text"
                >
                  {build.value.provider_type && (
                    <CIProviderIcon provider={build.value.provider_type} size={16} />
                  )}
                  View on {build.value.provider_type ? providerDisplayName(build.value.provider_type) : "CI"}
                </a>
              )}
            </div>

            <div class="mt-4 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
              <div>
                <span class="text-muted">Branch</span>
                <p class="font-medium text-text">{build.value.branch}</p>
              </div>
              <div>
                <span class="text-muted">Commit</span>
                <p class="font-mono text-text">
                  {build.value.commit_sha.slice(0, 7)}
                </p>
              </div>
              <div>
                <span class="text-muted">Author</span>
                <p class="text-text">{build.value.commit_author}</p>
              </div>
              <div>
                <span class="text-muted">Duration</span>
                <p class="text-text">
                  {build.value.duration_ms
                    ? `${Math.floor(build.value.duration_ms / 1000)}s`
                    : "-"}
                </p>
              </div>
            </div>
          </div>

          {build.value.jobs && build.value.jobs.length > 0 && (
            <div class="mt-6">
              <h2 class="mb-3 text-lg font-semibold text-text">Jobs</h2>
              <BuildTimeline jobs={build.value.jobs} />
            </div>
          )}
        </>
      ) : (
        <p class="text-muted">Build not found</p>
      )}
    </div>
  );
});
