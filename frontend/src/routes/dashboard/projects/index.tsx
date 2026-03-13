import { component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import { get } from "~/lib/api";
import type { Project } from "~/lib/types";
import { ProjectCard } from "~/components/projects/project-card";

export default component$(() => {
  const projects = useSignal<Project[]>([]);
  const loading = useSignal(true);

  useVisibleTask$(async () => {
    try {
      projects.value = await get<Project[]>("/projects");
    } catch {
      // ignore
    }
    loading.value = false;
  });

  return (
    <div>
      <div class="mb-6 flex items-center justify-between">
        <h1 class="text-2xl font-bold text-text">Projects</h1>
        <a
          href="/dashboard/projects/new"
          class="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          New Project
        </a>
      </div>

      {loading.value ? (
        <div class="flex items-center justify-center p-8">
          <div class="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
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
