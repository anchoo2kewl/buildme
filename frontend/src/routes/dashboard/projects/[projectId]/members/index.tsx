import { component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import { useLocation, type StaticGenerateHandler } from "@builder.io/qwik-city";

export const onStaticGenerate: StaticGenerateHandler = async () => {
  return { params: [{ projectId: "_" }] };
};
import { get, post, del } from "~/lib/api";
import type { ProjectMember } from "~/lib/types";
import { Avatar } from "~/components/shared/avatar";

export default component$(() => {
  const loc = useLocation();
  const projectId = loc.params.projectId;
  const members = useSignal<ProjectMember[]>([]);
  const inviteEmail = useSignal("");
  const inviteRole = useSignal("viewer");
  const loading = useSignal(true);

  useVisibleTask$(async () => {
    try {
      members.value = await get<ProjectMember[]>(
        `/projects/${projectId}/members`,
      );
    } catch {
      // ignore
    }
    loading.value = false;
  });

  return (
    <div class="mx-auto max-w-2xl">
      <h1 class="mb-6 text-2xl font-bold text-text">Members</h1>

      <div class="mb-6 rounded-lg border border-border bg-elevated p-4">
        <h2 class="mb-3 text-sm font-medium text-text">Invite Member</h2>
        <form
          preventdefault:submit
          onSubmit$={async () => {
            try {
              const m = await post<ProjectMember>(
                `/projects/${projectId}/members`,
                { email: inviteEmail.value, role: inviteRole.value },
              );
              members.value = [...members.value, m];
              inviteEmail.value = "";
            } catch {
              // ignore
            }
          }}
          class="flex gap-2"
        >
          <input
            type="email"
            bind:value={inviteEmail}
            placeholder="user@example.com"
            required
            class="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted"
          />
          <select
            bind:value={inviteRole}
            class="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
          >
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
            <option value="admin">Admin</option>
          </select>
          <button
            type="submit"
            class="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white"
          >
            Invite
          </button>
        </form>
      </div>

      {loading.value ? (
        <div class="flex items-center justify-center p-4">
          <div class="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      ) : (
        <div class="space-y-2">
          {members.value.map((m) => (
            <div
              key={m.user_id}
              class="flex items-center justify-between rounded-lg border border-border bg-elevated p-3"
            >
              <div class="flex items-center gap-3">
                <Avatar
                  name={m.user?.display_name || ""}
                  src={m.user?.avatar_url}
                  size="sm"
                />
                <div>
                  <span class="text-sm font-medium text-text">
                    {m.user?.display_name}
                  </span>
                  <span class="ml-2 text-xs text-muted">{m.user?.email}</span>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="rounded bg-surface px-2 py-0.5 text-xs text-muted">
                  {m.role}
                </span>
                {m.role !== "owner" && (
                  <button
                    onClick$={async () => {
                      try {
                        await del(
                          `/projects/${projectId}/members/${m.user_id}`,
                        );
                        members.value = members.value.filter(
                          (mm) => mm.user_id !== m.user_id,
                        );
                      } catch {
                        // ignore
                      }
                    }}
                    class="text-xs text-failure hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
