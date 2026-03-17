import { component$, useSignal, useVisibleTask$, useComputed$ } from "@builder.io/qwik";
import { fetchRunners } from "~/lib/api";
import type { CIProviderWithProject, ProviderType } from "~/lib/types";
import { CIProviderIcon, providerDisplayName } from "~/components/shared/ci-provider-icon";

const PROVIDER_ORDER: ProviderType[] = ["github", "github_local", "travis", "circleci"];

export default component$(() => {
  const runners = useSignal<CIProviderWithProject[]>([]);
  const loading = useSignal(true);

  useVisibleTask$(async () => {
    try {
      runners.value = await fetchRunners() ?? [];
    } catch { /* ignore */ }
    loading.value = false;
  });

  const grouped = useComputed$(() => {
    const map = new Map<ProviderType, CIProviderWithProject[]>();
    for (const r of runners.value) {
      const type = r.provider_type as ProviderType;
      if (!map.has(type)) map.set(type, []);
      map.get(type)!.push(r);
    }
    // Return in defined order, then any extras
    const result: { type: ProviderType; items: CIProviderWithProject[] }[] = [];
    for (const t of PROVIDER_ORDER) {
      if (map.has(t)) {
        result.push({ type: t, items: map.get(t)! });
        map.delete(t);
      }
    }
    for (const [t, items] of map) {
      result.push({ type: t, items });
    }
    return result;
  });

  const totalEnabled = useComputed$(() => runners.value.filter(r => r.enabled).length);

  return (
    <div>
      <div class="mb-6 flex items-center justify-between">
        <h1 class="text-2xl font-bold text-text">Runners</h1>
        <div class="flex items-center gap-3">
          <span class="text-sm text-muted">
            {runners.value.length} runner{runners.value.length !== 1 ? "s" : ""} · {totalEnabled.value} active
          </span>
        </div>
      </div>

      {loading.value ? (
        <div class="flex items-center justify-center p-8">
          <div class="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      ) : runners.value.length === 0 ? (
        <div class="rounded-lg border border-border bg-elevated p-12 text-center">
          <h2 class="text-lg font-semibold text-text">No runners configured</h2>
          <p class="mt-2 text-sm text-muted">
            Add CI providers to your projects in project settings.
          </p>
        </div>
      ) : (
        <div class="space-y-6">
          {grouped.value.map(({ type, items }) => (
            <div key={type} class="rounded-xl border border-border bg-elevated">
              {/* Group header */}
              <div class="flex items-center gap-3 border-b border-border px-5 py-3">
                <CIProviderIcon provider={type} size={24} />
                <span class="text-base font-semibold text-text">{providerDisplayName(type)}</span>
                <span class="text-sm text-muted">
                  {items.length} instance{items.length !== 1 ? "s" : ""}
                </span>
                <span class={`ml-auto text-xs font-medium ${items.filter(i => i.enabled).length === items.length ? "text-success" : "text-muted"}`}>
                  {items.filter(i => i.enabled).length}/{items.length} active
                </span>
              </div>

              {/* Runner rows */}
              <div class="divide-y divide-border">
                {items.map((runner) => (
                  <div key={runner.id} class={`flex items-center justify-between px-5 py-3 ${!runner.enabled ? "opacity-50" : ""}`}>
                    <div class="flex items-center gap-4">
                      <div>
                        <div class="flex items-center gap-2">
                          <span class={`inline-block h-2 w-2 rounded-full ${runner.enabled ? "bg-success" : "bg-muted"}`} />
                          <span class="font-medium text-text">{runner.display_name || runner.repo_name}</span>
                        </div>
                        <div class="mt-0.5 flex items-center gap-2 text-xs text-muted">
                          <span class="font-mono">{runner.repo_owner}/{runner.repo_name}</span>
                          <span>·</span>
                          <span>every {runner.poll_interval_s}s</span>
                        </div>
                      </div>
                    </div>
                    <div class="flex items-center gap-3">
                      <a
                        href={`/dashboard/projects/${runner.project_id}/settings`}
                        class="inline-flex items-center gap-1.5 rounded-lg bg-surface px-2.5 py-1 text-xs text-text transition-colors hover:bg-accent/10 hover:text-accent"
                      >
                        <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
                        </svg>
                        {runner.project_name}
                      </a>
                      <span class={`rounded px-2 py-0.5 text-[11px] font-medium ${runner.enabled ? "bg-success/15 text-success" : "bg-border/50 text-muted"}`}>
                        {runner.enabled ? "active" : "disabled"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
