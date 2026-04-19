import { component$, useSignal, useVisibleTask$, useComputed$ } from "@builder.io/qwik";
import { fetchDashboard } from "~/lib/api";
import type { DashboardEntry } from "~/lib/types";

export default component$(() => {
  const projects = useSignal<DashboardEntry[]>([]);
  const loading = useSignal(true);
  const error = useSignal("");

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    try {
      projects.value = await fetchDashboard();
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : "Failed to load";
    } finally {
      loading.value = false;
    }
  });

  const projectCount = useComputed$(() => projects.value.length);

  return (
    <div>
      <div class="page-top">
        <div class="breadcrumb">
          workspace <span>/</span> <b>notifications</b>
        </div>
      </div>

      {loading.value ? (
        <div class="greet"><div><h1>Loading...</h1></div></div>
      ) : error.value ? (
        <div class="greet"><div><h1>Notification channels</h1><p style={{ color: "var(--danger)" }}>{error.value}</p></div></div>
      ) : (
        <>
          <div class="greet">
            <div>
              <h1>Notification channels</h1>
            </div>
          </div>

          <div class="panel">
            <div class="panel-head">
              <h3>Configuration</h3>
            </div>
            <div class="panel-body">
              <p style={{ color: "var(--text-2)", fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                Notification channels are configured per-project in each project's settings page.
                Supported channel types include <b>email</b>, <b>webhook</b>, and <b>web push</b>.
              </p>
              <p style={{ color: "var(--text-3)", fontSize: 12, marginTop: 12, lineHeight: 1.5 }}>
                To add or manage notification channels, navigate to a project's settings below and
                configure alerts for build completions, deploy events, and incident notifications.
              </p>
            </div>
          </div>

          {projectCount.value === 0 ? (
            <div class="panel" style={{ marginTop: 16 }}>
              <div class="panel-body" style={{ textAlign: "center", padding: "48px 24px" }}>
                <p style={{ color: "var(--text-2)", fontSize: 14 }}>No projects found. Create a project first to configure notification channels.</p>
              </div>
            </div>
          ) : (
            <div class="panel" style={{ marginTop: 16 }}>
              <div class="panel-head">
                <h3>Projects <span class="cnt">{projectCount.value}</span></h3>
              </div>
              <div class="panel-body p0">
                <table class="tbl">
                  <thead>
                    <tr>
                      <th>Project</th>
                      <th>Description</th>
                      <th>Settings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.value.map((entry) => (
                      <tr key={entry.project.id}>
                        <td><b>{entry.project.name}</b></td>
                        <td class="muted">{entry.project.description || "—"}</td>
                        <td>
                          <a
                            href={`/dashboard/projects/${entry.project.id}/settings`}
                            class="btn btn-outline"
                            style={{ padding: "3px 10px", fontSize: "11px", textDecoration: "none" }}
                          >
                            Configure notifications
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
});
