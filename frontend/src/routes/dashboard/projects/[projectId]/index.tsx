import {
  component$,
  useSignal,
  useVisibleTask$,
  useContext,
} from "@builder.io/qwik";
import { useLocation, type StaticGenerateHandler } from "@builder.io/qwik-city";

export const onStaticGenerate: StaticGenerateHandler = async () => {
  return { params: [{ projectId: "_" }] };
};
import { get } from "~/lib/api";
import type { Build, Project } from "~/lib/types";
import { BuildCard } from "~/components/builds/build-card";
import { WSContext } from "~/context/ws-context";

export default component$(() => {
  const loc = useLocation();
  const projectId = loc.params.projectId;
  const wsState = useContext(WSContext);

  const project = useSignal<Project | null>(null);
  const builds = useSignal<Build[]>([]);
  const loading = useSignal(true);

  useVisibleTask$(async () => {
    try {
      const [p, res] = await Promise.all([
        get<Project>(`/projects/${projectId}`),
        get<{ builds: Build[]; total: number }>(`/projects/${projectId}/builds`),
      ]);
      project.value = p;
      builds.value = res.builds;
    } catch {
      // ignore
    }
    loading.value = false;

    // Subscribe to WS events for this project
    const ws = wsState.ws as any;
    if (ws) {
      ws.subscribe(Number(projectId));
      const unsub = ws.onEvent((event: any) => {
        if (event.build && event.project_id === Number(projectId)) {
          const idx = builds.value.findIndex(
            (b) => b.id === event.build.id,
          );
          if (idx >= 0) {
            builds.value = [
              ...builds.value.slice(0, idx),
              event.build,
              ...builds.value.slice(idx + 1),
            ];
          } else {
            builds.value = [event.build, ...builds.value];
          }
        }
      });
      return () => {
        ws.unsubscribe(Number(projectId));
        unsub();
      };
    }
  });

  return (
    <div>
      {loading.value ? (
        <div class="flex items-center justify-center p-8">
          <div class="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      ) : (
        <>
          <div class="mb-6 flex items-center justify-between">
            <div>
              <h1 class="text-2xl font-bold text-text">
                {project.value?.name}
              </h1>
              {project.value?.description && (
                <p class="mt-1 text-sm text-muted">
                  {project.value.description}
                </p>
              )}
            </div>
            <a
              href={`/dashboard/projects/${projectId}/settings`}
              class="rounded-lg border border-border px-4 py-2 text-sm text-muted transition-colors hover:border-accent hover:text-text"
            >
              Settings
            </a>
          </div>

          {builds.value.length === 0 ? (
            <div class="rounded-lg border border-border bg-elevated p-12 text-center">
              <h2 class="text-lg font-semibold text-text">No builds yet</h2>
              <p class="mt-2 text-sm text-muted">
                Add a CI provider in settings to start monitoring builds.
              </p>
              <a
                href={`/dashboard/projects/${projectId}/settings`}
                class="mt-4 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white"
              >
                Add Provider
              </a>
            </div>
          ) : (
            <div class="space-y-3">
              {builds.value.map((b) => (
                <BuildCard key={b.id} build={b} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
});
