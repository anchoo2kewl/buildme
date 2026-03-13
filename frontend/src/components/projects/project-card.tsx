import { component$ } from "@builder.io/qwik";
import type { Project } from "~/lib/types";

interface ProjectCardProps {
  project: Project;
}

export const ProjectCard = component$<ProjectCardProps>(({ project }) => {
  return (
    <a
      href={`/dashboard/projects/${project.id}`}
      class="block rounded-lg border border-border bg-elevated p-5 transition-colors hover:border-accent/50"
    >
      <h3 class="text-lg font-semibold text-text">{project.name}</h3>
      {project.description && (
        <p class="mt-1 text-sm text-muted">{project.description}</p>
      )}
      <p class="mt-3 text-xs text-muted">
        {new Date(project.created_at).toLocaleDateString()}
      </p>
    </a>
  );
});
