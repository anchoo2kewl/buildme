import { component$, useSignal } from "@builder.io/qwik";
import { useNavigate } from "@builder.io/qwik-city";
import { post } from "~/lib/api";
import type { Project } from "~/lib/types";

export default component$(() => {
  const nav = useNavigate();
  const name = useSignal("");
  const description = useSignal("");
  const error = useSignal("");
  const loading = useSignal(false);

  return (
    <div class="mx-auto max-w-lg">
      <h1 class="mb-6 text-2xl font-bold text-text">New Project</h1>

      {error.value && (
        <div class="mb-4 rounded-lg bg-failure/20 px-4 py-2 text-sm text-failure">
          {error.value}
        </div>
      )}

      <form
        preventdefault:submit
        onSubmit$={async () => {
          loading.value = true;
          error.value = "";
          try {
            const project = await post<Project>("/projects", {
              name: name.value,
              description: description.value,
            });
            nav(`/dashboard/projects/${project.id}`);
          } catch (e: any) {
            error.value = e.message;
          } finally {
            loading.value = false;
          }
        }}
        class="space-y-4"
      >
        <div>
          <label class="block text-sm font-medium text-text">
            Project Name
          </label>
          <input
            type="text"
            bind:value={name}
            required
            class="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-text placeholder:text-muted focus:border-accent focus:outline-none"
            placeholder="My Project"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-text">
            Description (optional)
          </label>
          <textarea
            bind:value={description}
            rows={3}
            class="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-text placeholder:text-muted focus:border-accent focus:outline-none"
            placeholder="Brief project description"
          />
        </div>
        <button
          type="submit"
          disabled={loading.value}
          class="w-full rounded-lg bg-accent px-4 py-2 font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {loading.value ? "Creating..." : "Create Project"}
        </button>
      </form>
    </div>
  );
});
