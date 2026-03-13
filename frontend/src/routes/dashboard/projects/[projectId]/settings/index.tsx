import { component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import { useLocation } from "@builder.io/qwik-city";
import { get, post, del } from "~/lib/api";
import type { CIProvider } from "~/lib/types";
import { ProviderForm } from "~/components/projects/provider-form";

export default component$(() => {
  const loc = useLocation();
  const projectId = loc.params.projectId;
  const providers = useSignal<CIProvider[]>([]);
  const showForm = useSignal(false);
  const loading = useSignal(true);

  useVisibleTask$(async () => {
    try {
      providers.value = await get<CIProvider[]>(`/projects/${projectId}/providers`);
    } catch {
      // ignore
    }
    loading.value = false;
  });

  return (
    <div class="mx-auto max-w-2xl">
      <h1 class="mb-6 text-2xl font-bold text-text">Project Settings</h1>

      <div class="space-y-6">
        <section>
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-lg font-semibold text-text">CI Providers</h2>
            <button
              onClick$={() => (showForm.value = !showForm.value)}
              class="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
            >
              {showForm.value ? "Cancel" : "Add Provider"}
            </button>
          </div>

          {showForm.value && (
            <div class="mb-4 rounded-lg border border-border bg-elevated p-4">
              <ProviderForm
                onSubmit$={async (data) => {
                  try {
                    const p = await post<CIProvider>(
                      `/projects/${projectId}/providers`,
                      data,
                    );
                    providers.value = [...providers.value, p];
                    showForm.value = false;
                  } catch {
                    // ignore
                  }
                }}
              />
            </div>
          )}

          {loading.value ? (
            <div class="flex items-center justify-center p-4">
              <div class="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            </div>
          ) : providers.value.length === 0 ? (
            <p class="text-sm text-muted">No providers configured</p>
          ) : (
            <div class="space-y-3">
              {providers.value.map((p) => (
                <div
                  key={p.id}
                  class="flex items-center justify-between rounded-lg border border-border bg-elevated p-4"
                >
                  <div>
                    <span class="font-medium text-text">{p.display_name}</span>
                    <span class="ml-2 text-sm text-muted">
                      {p.repo_owner}/{p.repo_name}
                    </span>
                    <span class="ml-2 rounded bg-surface px-1.5 py-0.5 text-xs text-muted">
                      {p.provider_type}
                    </span>
                  </div>
                  <div class="flex items-center gap-2">
                    <button
                      onClick$={async () => {
                        try {
                          await post(`/projects/${projectId}/providers/${p.id}/sync`, {});
                        } catch {
                          // ignore
                        }
                      }}
                      class="rounded px-2 py-1 text-xs text-accent hover:bg-accent/10"
                    >
                      Sync
                    </button>
                    <button
                      onClick$={async () => {
                        try {
                          await del(`/projects/${projectId}/providers/${p.id}`);
                          providers.value = providers.value.filter(
                            (pr) => pr.id !== p.id,
                          );
                        } catch {
                          // ignore
                        }
                      }}
                      class="rounded px-2 py-1 text-xs text-failure hover:bg-failure/10"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 class="mb-4 text-lg font-semibold text-text">Links</h2>
          <div class="space-y-2 text-sm">
            <a
              href={`/dashboard/projects/${projectId}/members`}
              class="block text-accent hover:underline"
            >
              Manage Members
            </a>
          </div>
        </section>
      </div>
    </div>
  );
});
