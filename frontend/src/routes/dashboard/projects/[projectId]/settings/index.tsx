import { component$, useSignal, useVisibleTask$, useStore } from "@builder.io/qwik";
import { useLocation, type StaticGenerateHandler } from "@builder.io/qwik-city";

export const onStaticGenerate: StaticGenerateHandler = async () => {
  return { params: [{ projectId: "_" }] };
};
import { get, post, put, del } from "~/lib/api";
import { getRouteParams } from "~/lib/route-params";
import type { CIProvider, Project, ProjectMetadata } from "~/lib/types";
import { parseMetadata } from "~/lib/types";
import { ProviderForm } from "~/components/projects/provider-form";
import { CIProviderIcon, providerDisplayName } from "~/components/shared/ci-provider-icon";

export default component$(() => {
  const loc = useLocation();
  const projectId = useSignal(loc.params.projectId);
  const providers = useSignal<CIProvider[]>([]);
  const showForm = useSignal(false);
  const loading = useSignal(true);

  const project = useSignal<Project | null>(null);
  const envSaving = useSignal(false);
  const envSuccess = useSignal(false);
  const envError = useSignal("");

  const stagingUrl = useSignal("");
  const uatUrl = useSignal("");
  const productionUrl = useSignal("");
  const versionPath = useSignal("/api/version");
  const versionField = useSignal("git_commit");
  const healthPath = useSignal("/health");

  // Metadata
  const metaSaving = useSignal(false);
  const metaSuccess = useSignal(false);
  const metaError = useSignal("");
  const deploymentType = useSignal("");
  const techStack = useSignal("");
  const portsProd = useSignal("");
  const portsStaging = useSignal("");
  const portsUat = useSignal("");
  const mcpUrl = useSignal("");
  const mcpUrlStaging = useSignal("");
  const mcpUrlUat = useSignal("");
  const mcpUrlProd = useSignal("");
  const mcpHealthPath = useSignal("/health");
  const pollInterval = useSignal("60");

  // Custom headers
  const headersSaving = useSignal(false);
  const headersSuccess = useSignal(false);
  const headersError = useSignal("");
  const headersExpanded = useSignal(false);
  const customHeaders = useStore<{
    staging: Array<{ key: string; value: string }>;
    uat: Array<{ key: string; value: string }>;
    production: Array<{ key: string; value: string }>;
  }>({
    staging: [],
    uat: [],
    production: [],
  });

  useVisibleTask$(async () => {
    projectId.value = getRouteParams().projectId || projectId.value;
    try {
      const [p, provs] = await Promise.all([
        get<Project>(`/projects/${projectId.value}`),
        get<CIProvider[]>(`/projects/${projectId.value}/providers`),
      ]);
      project.value = p;
      providers.value = provs;
      stagingUrl.value = p.staging_url || "";
      uatUrl.value = p.uat_url || "";
      productionUrl.value = p.production_url || "";
      versionPath.value = p.version_path || "/api/version";
      versionField.value = p.version_field || "git_commit";
      healthPath.value = p.health_path || "/health";
      const meta = parseMetadata(p);
      deploymentType.value = meta.deployment_type || "";
      techStack.value = (meta.tech_stack || []).join(", ");
      portsProd.value = (meta.ports?.production || []).join(", ");
      portsStaging.value = (meta.ports?.staging || []).join(", ");
      portsUat.value = (meta.ports?.uat || []).join(", ");
      mcpUrl.value = meta.mcp_url || "";
      mcpUrlStaging.value = meta.mcp_urls?.staging || "";
      mcpUrlUat.value = meta.mcp_urls?.uat || "";
      mcpUrlProd.value = meta.mcp_urls?.production || meta.mcp_url || "";
      mcpHealthPath.value = meta.mcp_health_path || "/health";
      pollInterval.value = String(meta.version_poll_interval_m || 60);
      // Load custom headers
      if (meta.custom_headers) {
        for (const env of ["staging", "uat", "production"] as const) {
          const hdrs = meta.custom_headers[env];
          if (hdrs) {
            customHeaders[env] = Object.entries(hdrs).map(([key, value]) => ({ key, value }));
          }
        }
      }
    } catch {
      // ignore
    }
    loading.value = false;
  });

  return (
    <div class="mx-auto max-w-2xl">
      <h1 class="mb-6 text-2xl font-bold text-text">Project Settings</h1>

      <div class="space-y-6">
        {/* Environment URLs */}
        <section>
          <h2 class="mb-4 text-lg font-semibold text-text">
            Environment URLs
          </h2>
          <p class="mb-4 text-sm text-muted">
            Configure deployed URLs for health monitoring and drift detection.
          </p>

          {envError.value && (
            <div class="mb-4 rounded-lg bg-failure/20 px-4 py-2 text-sm text-failure">
              {envError.value}
            </div>
          )}
          {envSuccess.value && (
            <div class="mb-4 rounded-lg bg-success/20 px-4 py-2 text-sm text-success">
              Environment settings saved.
            </div>
          )}

          <form
            preventdefault:submit
            onSubmit$={async () => {
              envSaving.value = true;
              envError.value = "";
              envSuccess.value = false;
              try {
                const updated = await put<Project>(`/projects/${projectId.value}`, {
                  staging_url: stagingUrl.value,
                  uat_url: uatUrl.value,
                  production_url: productionUrl.value,
                  version_path: versionPath.value,
                  version_field: versionField.value,
                  health_path: healthPath.value,
                });
                project.value = updated;
                envSuccess.value = true;
                setTimeout(() => (envSuccess.value = false), 3000);
              } catch (e: any) {
                envError.value = e.message;
              } finally {
                envSaving.value = false;
              }
            }}
            class="space-y-4 rounded-lg border border-border bg-elevated p-4"
          >
            <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label class="block text-xs font-medium text-muted">
                  Staging URL
                </label>
                <input
                  type="url"
                  bind:value={stagingUrl}
                  placeholder="https://staging.example.com"
                  class="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-muted">
                  UAT URL
                </label>
                <input
                  type="url"
                  bind:value={uatUrl}
                  placeholder="https://uat.example.com"
                  class="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-muted">
                  Production URL
                </label>
                <input
                  type="url"
                  bind:value={productionUrl}
                  placeholder="https://example.com"
                  class="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted focus:border-accent focus:outline-none"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label class="block text-xs font-medium text-muted">
                  Version Path
                </label>
                <input
                  type="text"
                  bind:value={versionPath}
                  placeholder="/api/version"
                  class="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-muted">
                  Version JSON Field
                </label>
                <input
                  type="text"
                  bind:value={versionField}
                  placeholder="git_commit"
                  class="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-muted">
                  Health Path
                </label>
                <input
                  type="text"
                  bind:value={healthPath}
                  placeholder="/health"
                  class="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted focus:border-accent focus:outline-none"
                />
              </div>
            </div>

            <div class="flex justify-end">
              <button
                type="submit"
                disabled={envSaving.value}
                class="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
              >
                {envSaving.value ? "Saving..." : "Save Environment Settings"}
              </button>
            </div>
          </form>
        </section>

        {/* Project Metadata */}
        <section>
          <h2 class="mb-4 text-lg font-semibold text-text">
            Project Metadata
          </h2>
          <p class="mb-4 text-sm text-muted">
            Configure deployment type, tech stack, and ports shown on the dashboard.
          </p>

          {metaError.value && (
            <div class="mb-4 rounded-lg bg-failure/20 px-4 py-2 text-sm text-failure">
              {metaError.value}
            </div>
          )}
          {metaSuccess.value && (
            <div class="mb-4 rounded-lg bg-success/20 px-4 py-2 text-sm text-success">
              Metadata saved.
            </div>
          )}

          <form
            preventdefault:submit
            onSubmit$={async () => {
              metaSaving.value = true;
              metaError.value = "";
              metaSuccess.value = false;
              try {
                const parsePorts = (s: string): number[] =>
                  s
                    .split(",")
                    .map((v) => parseInt(v.trim(), 10))
                    .filter((n) => !isNaN(n));
                const meta: ProjectMetadata = {};
                if (deploymentType.value) meta.deployment_type = deploymentType.value;
                if (techStack.value) meta.tech_stack = techStack.value.split(",").map((s) => s.trim()).filter(Boolean);
                const ports: Record<string, number[]> = {};
                if (portsProd.value) ports.production = parsePorts(portsProd.value);
                if (portsStaging.value) ports.staging = parsePorts(portsStaging.value);
                if (portsUat.value) ports.uat = parsePorts(portsUat.value);
                if (Object.keys(ports).length > 0) meta.ports = ports;
                // MCP URLs: per-environment
                const mcpUrls: Record<string, string> = {};
                if (mcpUrlStaging.value) mcpUrls.staging = mcpUrlStaging.value;
                if (mcpUrlUat.value) mcpUrls.uat = mcpUrlUat.value;
                if (mcpUrlProd.value) mcpUrls.production = mcpUrlProd.value;
                if (Object.keys(mcpUrls).length > 0) meta.mcp_urls = mcpUrls;
                // Keep legacy mcp_url for backward compat (set to production)
                if (mcpUrlProd.value) meta.mcp_url = mcpUrlProd.value;
                if (mcpHealthPath.value && mcpHealthPath.value !== "/health") meta.mcp_health_path = mcpHealthPath.value;
                const interval = parseInt(pollInterval.value, 10);
                if (interval > 0 && interval !== 60) meta.version_poll_interval_m = interval;

                const updated = await put<Project>(`/projects/${projectId.value}`, {
                  metadata: JSON.stringify(meta),
                });
                project.value = updated;
                metaSuccess.value = true;
                setTimeout(() => (metaSuccess.value = false), 3000);
              } catch (e: any) {
                metaError.value = e.message;
              } finally {
                metaSaving.value = false;
              }
            }}
            class="space-y-4 rounded-lg border border-border bg-elevated p-4"
          >
            <div>
              <label class="block text-xs font-medium text-muted">
                Version Poll Interval (minutes)
              </label>
              <input
                type="number"
                min={1}
                max={1440}
                bind:value={pollInterval}
                class="mt-1 w-full max-w-xs rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted focus:border-accent focus:outline-none"
              />
              <span class="text-[11px] text-muted">How often to poll version endpoints. Default: 60 minutes.</span>
            </div>

            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label class="block text-xs font-medium text-muted">
                  Deployment Type
                </label>
                <select
                  bind:value={deploymentType}
                  class="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
                >
                  <option value="">None</option>
                  <option value="blue-green">Blue-Green</option>
                  <option value="rolling">Rolling</option>
                  <option value="canary">Canary</option>
                  <option value="direct">Direct</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-medium text-muted">
                  Tech Stack
                </label>
                <input
                  type="text"
                  bind:value={techStack}
                  placeholder="go, react, typescript"
                  class="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted focus:border-accent focus:outline-none"
                />
                <span class="text-[11px] text-muted">Comma-separated</span>
              </div>
            </div>

            <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label class="block text-xs font-medium text-muted">
                  Production Ports
                </label>
                <input
                  type="text"
                  bind:value={portsProd}
                  placeholder="8092, 8094"
                  class="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-muted">
                  Staging Ports
                </label>
                <input
                  type="text"
                  bind:value={portsStaging}
                  placeholder="9090"
                  class="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-muted">
                  UAT Ports
                </label>
                <input
                  type="text"
                  bind:value={portsUat}
                  placeholder="8084"
                  class="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted focus:border-accent focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-medium text-muted mb-2">
                MCP Server URLs
              </label>
              <span class="text-[11px] text-muted block mb-3">
                Per-environment MCP server URLs. Health-checked independently from the main service.
              </span>
              <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div>
                  <label class="block text-[11px] text-muted">Staging</label>
                  <input
                    type="url"
                    bind:value={mcpUrlStaging}
                    placeholder="https://staging.example.com:13426"
                    class="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted focus:border-accent focus:outline-none"
                  />
                </div>
                <div>
                  <label class="block text-[11px] text-muted">UAT</label>
                  <input
                    type="url"
                    bind:value={mcpUrlUat}
                    placeholder="https://uat.example.com:13426"
                    class="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted focus:border-accent focus:outline-none"
                  />
                </div>
                <div>
                  <label class="block text-[11px] text-muted">Production</label>
                  <input
                    type="url"
                    bind:value={mcpUrlProd}
                    placeholder="https://example.com:13426"
                    class="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted focus:border-accent focus:outline-none"
                  />
                </div>
              </div>
              <div class="mt-3">
                <label class="block text-[11px] text-muted">Health Path</label>
                <input
                  type="text"
                  bind:value={mcpHealthPath}
                  placeholder="/health"
                  class="mt-1 w-full max-w-xs rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted focus:border-accent focus:outline-none"
                />
              </div>
            </div>

            <div class="flex justify-end">
              <button
                type="submit"
                disabled={metaSaving.value}
                class="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
              >
                {metaSaving.value ? "Saving..." : "Save Metadata"}
              </button>
            </div>
          </form>
        </section>

        {/* Custom Headers */}
        <section>
          <button
            type="button"
            class="mb-4 flex w-full items-center justify-between text-left"
            onClick$={() => (headersExpanded.value = !headersExpanded.value)}
          >
            <h2 class="text-lg font-semibold text-text">Custom Headers</h2>
            <span class="text-muted">{headersExpanded.value ? "▾" : "▸"}</span>
          </button>

          {headersExpanded.value && (
            <div>
              <p class="mb-4 text-sm text-muted">
                Set custom HTTP headers sent when polling version/health endpoints per
                environment. Useful for Cloudflare Access tokens or API keys.
              </p>

              {headersError.value && (
                <div class="mb-4 rounded-lg bg-failure/20 px-4 py-2 text-sm text-failure">
                  {headersError.value}
                </div>
              )}
              {headersSuccess.value && (
                <div class="mb-4 rounded-lg bg-success/20 px-4 py-2 text-sm text-success">
                  Custom headers saved.
                </div>
              )}

              <div class="space-y-4 rounded-lg border border-border bg-elevated p-4">
                {(["staging", "uat", "production"] as const).map((env) => (
                  <div key={env}>
                    <div class="mb-2 flex items-center justify-between">
                      <span class="text-xs font-semibold uppercase tracking-wider text-muted">
                        {env}
                      </span>
                      <button
                        type="button"
                        class="text-xs text-accent hover:underline"
                        onClick$={() => {
                          customHeaders[env] = [...customHeaders[env], { key: "", value: "" }];
                        }}
                      >
                        + Add Header
                      </button>
                    </div>
                    {customHeaders[env].length === 0 ? (
                      <p class="text-xs text-muted">No custom headers</p>
                    ) : (
                      <div class="space-y-2">
                        {customHeaders[env].map((pair, idx) => (
                          <div key={idx} class="flex items-center gap-2">
                            <input
                              type="text"
                              value={pair.key}
                              placeholder="Header-Name"
                              onInput$={(e: Event) => {
                                const val = (e.target as HTMLInputElement).value;
                                customHeaders[env] = customHeaders[env].map((p, i) =>
                                  i === idx ? { ...p, key: val } : p,
                                );
                              }}
                              class="w-1/3 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-text placeholder:text-muted focus:border-accent focus:outline-none"
                            />
                            <input
                              type="text"
                              value={
                                pair.value.length > 8
                                  ? pair.value.substring(0, 8) + "***"
                                  : pair.value
                              }
                              placeholder="value"
                              onFocus$={(e: Event) => {
                                // Show full value on focus
                                (e.target as HTMLInputElement).value = pair.value;
                              }}
                              onBlur$={(e: Event) => {
                                const val = (e.target as HTMLInputElement).value;
                                customHeaders[env] = customHeaders[env].map((p, i) =>
                                  i === idx ? { ...p, value: val } : p,
                                );
                                // Re-mask
                                if (val.length > 8) {
                                  (e.target as HTMLInputElement).value =
                                    val.substring(0, 8) + "***";
                                }
                              }}
                              class="flex-1 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-text placeholder:text-muted focus:border-accent focus:outline-none"
                            />
                            <button
                              type="button"
                              class="text-xs text-failure hover:underline"
                              onClick$={() => {
                                customHeaders[env] = customHeaders[env].filter(
                                  (_, i) => i !== idx,
                                );
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                <div class="flex justify-end pt-2">
                  <button
                    type="button"
                    disabled={headersSaving.value}
                    class="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
                    onClick$={async () => {
                      headersSaving.value = true;
                      headersError.value = "";
                      headersSuccess.value = false;
                      try {
                        // Build custom_headers object from pairs
                        const ch: Record<string, Record<string, string>> = {};
                        for (const env of ["staging", "uat", "production"] as const) {
                          const pairs = customHeaders[env].filter(
                            (p) => p.key.trim() !== "",
                          );
                          if (pairs.length > 0) {
                            ch[env] = {};
                            for (const p of pairs) {
                              ch[env][p.key.trim()] = p.value;
                            }
                          }
                        }

                        // Merge with existing metadata
                        const existingMeta = project.value
                          ? parseMetadata(project.value)
                          : {};
                        const newMeta = {
                          ...existingMeta,
                          custom_headers:
                            Object.keys(ch).length > 0 ? ch : undefined,
                        };

                        const updated = await put<Project>(
                          `/projects/${projectId.value}`,
                          { metadata: JSON.stringify(newMeta) },
                        );
                        project.value = updated;
                        headersSuccess.value = true;
                        setTimeout(() => (headersSuccess.value = false), 3000);
                      } catch (e: any) {
                        headersError.value = e.message;
                      } finally {
                        headersSaving.value = false;
                      }
                    }}
                  >
                    {headersSaving.value ? "Saving..." : "Save Headers"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* CI Providers */}
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
                      `/projects/${projectId.value}/providers`,
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
                    <span class="ml-2 inline-flex items-center gap-1 rounded bg-surface px-1.5 py-0.5 text-xs text-muted">
                      <CIProviderIcon provider={p.provider_type} size={14} />
                      {providerDisplayName(p.provider_type)}
                    </span>
                  </div>
                  <div class="flex items-center gap-2">
                    <button
                      onClick$={async () => {
                        try {
                          await post(`/projects/${projectId.value}/providers/${p.id}/sync`, {});
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
                          await del(`/projects/${projectId.value}/providers/${p.id}`);
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
              href={`/dashboard/projects/${projectId.value}/members`}
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
