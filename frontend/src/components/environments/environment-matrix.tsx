import { component$, type Signal } from "@builder.io/qwik";
import type { DriftDashboard, EnvironmentStatus } from "~/lib/types";

interface EnvironmentMatrixProps {
  dashboard: DriftDashboard;
  selectedEnv: Signal<EnvironmentStatus | null>;
}

const ENVS = ["staging", "uat", "production"] as const;

export const EnvironmentMatrix = component$<EnvironmentMatrixProps>(
  ({ dashboard, selectedEnv }) => {
    if (!dashboard.projects || dashboard.projects.length === 0) {
      return (
        <div class="rounded-lg border border-border bg-elevated p-12 text-center">
          <h2 class="text-lg font-semibold text-text">
            No environments configured
          </h2>
          <p class="mt-2 text-sm text-muted">
            Add staging, UAT, or production URLs to your projects to see
            environment status.
          </p>
        </div>
      );
    }

    return (
      <div class="overflow-x-auto rounded-lg border border-border">
        <table class="w-full">
          <thead>
            <tr class="border-b border-border bg-elevated">
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                Project
              </th>
              {ENVS.map((env) => (
                <th
                  key={env}
                  class="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted"
                >
                  {env}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dashboard.projects.map((dp) => (
              <tr
                key={dp.project.id}
                class="border-b border-border last:border-0"
              >
                <td class="px-4 py-3">
                  <a
                    href={`/dashboard/projects/${dp.project.id}`}
                    class="text-sm font-medium text-text hover:text-accent"
                  >
                    {dp.project.name}
                  </a>
                </td>
                {ENVS.map((env) => {
                  const es = dp.environments.find((e) => e.env === env);
                  return (
                    <td key={env} class="px-4 py-3 text-center">
                      {es ? (
                        <button
                          class="group inline-flex flex-col items-center gap-1 rounded-lg px-3 py-2 transition-all hover:bg-white/[0.03] hover:shadow-sm"
                          onClick$={() => {
                            selectedEnv.value = es;
                          }}
                        >
                          <EnvCell env={es} />
                        </button>
                      ) : (
                        <span class="text-xs text-muted">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  },
);

const EnvCell = component$<{ env: EnvironmentStatus }>(({ env }) => {
  const healthColor =
    env.health_status === 200
      ? "bg-success shadow-[0_0_6px_rgba(52,211,153,0.5)]"
      : env.health_status > 0
        ? "bg-warning shadow-[0_0_6px_rgba(251,191,36,0.5)]"
        : "bg-failure shadow-[0_0_6px_rgba(248,113,113,0.5)]";

  return (
    <>
      <div class="flex items-center gap-2">
        <span class={`inline-block h-2.5 w-2.5 rounded-full ${healthColor}`} />
        <span class="font-mono text-xs text-text">
          {env.deployed_sha
            ? env.deployed_sha.substring(0, 7)
            : "unknown"}
        </span>
        {env.is_drifted && (
          <span class="text-xs text-warning" title="Drifted from branch HEAD">
            !
          </span>
        )}
      </div>
      <span class="text-xs text-muted">{env.response_time_ms}ms</span>
    </>
  );
});
