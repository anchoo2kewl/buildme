import { component$, useSignal, useVisibleTask$, useComputed$, $ } from "@builder.io/qwik";
import { fetchGroups, createGroup, updateGroup, deleteGroup, fetchDrift, assignProjectToGroup } from "~/lib/api";
import type { ProjectGroup, DriftProject } from "~/lib/types";

export default component$(() => {
  const groups = useSignal<ProjectGroup[]>([]);
  const projects = useSignal<DriftProject[]>([]);
  const loading = useSignal(true);

  // Create form
  const showCreate = useSignal(false);
  const newName = useSignal("");
  const newVisible = useSignal(true);
  const newSortOrder = useSignal(0);
  const creating = useSignal(false);

  // Edit form
  const editingId = useSignal<number | null>(null);
  const editName = useSignal("");
  const editVisible = useSignal(true);
  const editSortOrder = useSignal(0);
  const saving = useSignal(false);

  // Assign modal
  const assigningGroupId = useSignal<number | null>(null);
  const copiedSlug = useSignal<string | null>(null);

  const loadData = $(async () => {
    const [g, d] = await Promise.all([
      fetchGroups().catch(() => []),
      fetchDrift().catch(() => null),
    ]);
    groups.value = (g ?? []).sort((a, b) => a.sort_order - b.sort_order);
    projects.value = d?.projects ?? [];
  });

  useVisibleTask$(async () => {
    await loadData();
    loading.value = false;
  });

  const projectCountForGroup = $((groupId: number) => {
    return projects.value.filter((dp) => dp.project.group_id === groupId).length;
  });

  const handleCreate = $(async () => {
    if (!newName.value.trim()) return;
    creating.value = true;
    try {
      await createGroup({
        name: newName.value.trim(),
        visible: newVisible.value,
        sort_order: newSortOrder.value,
      });
      newName.value = "";
      newVisible.value = true;
      newSortOrder.value = 0;
      showCreate.value = false;
      await loadData();
    } catch { /* ignore */ }
    creating.value = false;
  });

  const startEdit = $((group: ProjectGroup) => {
    editingId.value = group.id;
    editName.value = group.name;
    editVisible.value = group.visible;
    editSortOrder.value = group.sort_order;
  });

  const handleUpdate = $(async () => {
    if (editingId.value == null || !editName.value.trim()) return;
    saving.value = true;
    try {
      await updateGroup(editingId.value, {
        name: editName.value.trim(),
        visible: editVisible.value,
        sort_order: editSortOrder.value,
      });
      editingId.value = null;
      await loadData();
    } catch { /* ignore */ }
    saving.value = false;
  });

  const handleDelete = $(async (id: number) => {
    if (!confirm("Delete this group? Projects will become ungrouped.")) return;
    try {
      await deleteGroup(id);
      await loadData();
    } catch { /* ignore */ }
  });

  const handleToggleVisibility = $(async (group: ProjectGroup) => {
    try {
      await updateGroup(group.id, { visible: !group.visible });
      await loadData();
    } catch { /* ignore */ }
  });

  const handleAssign = $(async (projectId: number, groupId: number | null) => {
    try {
      await assignProjectToGroup(projectId, groupId);
      await loadData();
    } catch { /* ignore */ }
  });

  // Compute project counts per group
  const groupProjectCounts = useComputed$(() => {
    const counts: Record<number, number> = {};
    for (const g of groups.value) {
      counts[g.id] = projects.value.filter((dp) => dp.project.group_id === g.id).length;
    }
    return counts;
  });

  const ungroupedProjects = useComputed$(() => {
    return projects.value.filter((dp) => dp.project.group_id == null);
  });

  return (
    <div>
      <div class="mb-6 flex items-center justify-between">
        <h1 class="text-2xl font-bold text-text">Groups</h1>
        <button
          class="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-accent to-indigo-400 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-accent/20 transition-all hover:shadow-accent/30 hover:brightness-110"
          onClick$={() => { showCreate.value = !showCreate.value; }}
        >
          <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New Group
        </button>
      </div>

      {/* Create form */}
      {showCreate.value && (
        <div class="mb-6 rounded-xl border border-border bg-elevated p-5">
          <h2 class="mb-4 text-sm font-semibold text-text">Create Group</h2>
          <div class="flex flex-wrap items-end gap-4">
            <div class="flex-1">
              <label class="mb-1 block text-xs text-muted">Name</label>
              <input
                type="text"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder-muted outline-none focus:border-accent"
                placeholder="Group name"
                value={newName.value}
                onInput$={(e: Event) => { newName.value = (e.target as HTMLInputElement).value; }}
              />
            </div>
            <div class="w-24">
              <label class="mb-1 block text-xs text-muted">Sort Order</label>
              <input
                type="number"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-accent"
                value={newSortOrder.value}
                onInput$={(e: Event) => { newSortOrder.value = Number((e.target as HTMLInputElement).value); }}
              />
            </div>
            <label class="flex items-center gap-2 text-sm text-text">
              <input
                type="checkbox"
                checked={newVisible.value}
                onChange$={(e: Event) => { newVisible.value = (e.target as HTMLInputElement).checked; }}
                class="rounded border-border"
              />
              Visible
            </label>
            <div class="flex gap-2">
              <button
                class="rounded-lg bg-accent/15 px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/25 disabled:opacity-50"
                disabled={creating.value || !newName.value.trim()}
                onClick$={handleCreate}
              >
                {creating.value ? "Creating..." : "Create"}
              </button>
              <button
                class="rounded-lg border border-border px-4 py-2 text-sm text-muted transition-colors hover:text-text"
                onClick$={() => { showCreate.value = false; }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {loading.value ? (
        <div class="flex items-center justify-center p-8">
          <div class="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      ) : groups.value.length === 0 && !showCreate.value ? (
        <div class="rounded-lg border border-border bg-elevated p-12 text-center">
          <h2 class="text-lg font-semibold text-text">No groups yet</h2>
          <p class="mt-2 text-sm text-muted">
            Create groups to organize your projects on the dashboard.
          </p>
        </div>
      ) : (
        <div class="space-y-3">
          {groups.value.map((group) => (
            <div
              key={group.id}
              class="rounded-xl border border-border bg-elevated"
            >
              {editingId.value === group.id ? (
                /* Edit mode */
                <div class="p-5">
                  <div class="flex flex-wrap items-end gap-4">
                    <div class="flex-1">
                      <label class="mb-1 block text-xs text-muted">Name</label>
                      <input
                        type="text"
                        class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-accent"
                        value={editName.value}
                        onInput$={(e: Event) => { editName.value = (e.target as HTMLInputElement).value; }}
                      />
                    </div>
                    <div class="w-24">
                      <label class="mb-1 block text-xs text-muted">Sort Order</label>
                      <input
                        type="number"
                        class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-accent"
                        value={editSortOrder.value}
                        onInput$={(e: Event) => { editSortOrder.value = Number((e.target as HTMLInputElement).value); }}
                      />
                    </div>
                    <label class="flex items-center gap-2 text-sm text-text">
                      <input
                        type="checkbox"
                        checked={editVisible.value}
                        onChange$={(e: Event) => { editVisible.value = (e.target as HTMLInputElement).checked; }}
                        class="rounded border-border"
                      />
                      Visible
                    </label>
                    <div class="flex gap-2">
                      <button
                        class="rounded-lg bg-accent/15 px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/25 disabled:opacity-50"
                        disabled={saving.value || !editName.value.trim()}
                        onClick$={handleUpdate}
                      >
                        {saving.value ? "Saving..." : "Save"}
                      </button>
                      <button
                        class="rounded-lg border border-border px-4 py-2 text-sm text-muted transition-colors hover:text-text"
                        onClick$={() => { editingId.value = null; }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* View mode */
                <div class="flex items-center justify-between px-5 py-4">
                  <div class="flex items-center gap-3">
                    <a
                      href={`/dashboard/groups/${group.slug}`}
                      class="text-base font-bold text-text hover:text-accent"
                    >
                      {group.name}
                    </a>
                    <span class="text-xs text-muted">
                      {groupProjectCounts.value[group.id] ?? 0} project{(groupProjectCounts.value[group.id] ?? 0) !== 1 ? "s" : ""}
                    </span>
                    <span class="font-mono text-xs text-muted">
                      #{group.sort_order}
                    </span>
                    {group.visible ? (
                      <span class="rounded bg-success/15 px-2 py-0.5 text-[11px] font-medium text-success">
                        visible
                      </span>
                    ) : (
                      <span class="rounded bg-border/50 px-2 py-0.5 text-[11px] font-medium text-muted">
                        hidden
                      </span>
                    )}
                  </div>
                  <div class="flex items-center gap-2">
                    <button
                      class="rounded p-1.5 text-muted transition-colors hover:text-accent"
                      title="Copy share link"
                      onClick$={() => {
                        const url = `${window.location.origin}/dashboard/groups/${group.slug}`;
                        navigator.clipboard.writeText(url).then(() => {
                          copiedSlug.value = group.slug;
                          setTimeout(() => (copiedSlug.value = null), 2000);
                        });
                      }}
                    >
                      {copiedSlug.value === group.slug ? (
                        <svg class="h-4 w-4 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                          <polyline points="16 6 12 2 8 6" />
                          <line x1="12" y1="2" x2="12" y2="15" />
                        </svg>
                      )}
                    </button>
                    <button
                      class="rounded p-1.5 text-muted transition-colors hover:text-accent"
                      title="Assign projects"
                      onClick$={() => { assigningGroupId.value = assigningGroupId.value === group.id ? null : group.id; }}
                    >
                      <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
                        <path d="M12 10v6M9 13h6" />
                      </svg>
                    </button>
                    <button
                      class="rounded p-1.5 text-muted transition-colors hover:text-accent"
                      title={group.visible ? "Hide from dashboard" : "Show on dashboard"}
                      onClick$={() => handleToggleVisibility(group)}
                    >
                      {group.visible ? (
                        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      ) : (
                        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                          <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                          <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                          <line x1="2" x2="22" y1="2" y2="22" />
                        </svg>
                      )}
                    </button>
                    <button
                      class="rounded p-1.5 text-muted transition-colors hover:text-accent"
                      title="Edit group"
                      onClick$={() => startEdit(group)}
                    >
                      <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                        <path d="m15 5 4 4" />
                      </svg>
                    </button>
                    <button
                      class="rounded p-1.5 text-muted transition-colors hover:text-failure"
                      title="Delete group"
                      onClick$={() => handleDelete(group.id)}
                    >
                      <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {/* Project assignment panel */}
              {assigningGroupId.value === group.id && (
                <div class="border-t border-border px-5 py-4">
                  <p class="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
                    Projects in this group
                  </p>
                  <div class="space-y-1.5">
                    {/* Assigned projects */}
                    {projects.value
                      .filter((dp) => dp.project.group_id === group.id)
                      .map((dp) => (
                        <div key={dp.project.id} class="flex items-center justify-between rounded-lg bg-surface/50 px-3 py-2">
                          <span class="text-sm text-text">{dp.project.name}</span>
                          <button
                            class="text-xs text-muted transition-colors hover:text-failure"
                            onClick$={() => handleAssign(dp.project.id, null)}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                  </div>

                  {/* Add projects */}
                  {ungroupedProjects.value.length > 0 && (
                    <>
                      <p class="mb-2 mt-4 text-xs font-semibold uppercase tracking-wider text-muted">
                        Ungrouped projects
                      </p>
                      <div class="space-y-1.5">
                        {ungroupedProjects.value.map((dp) => (
                          <div key={dp.project.id} class="flex items-center justify-between rounded-lg bg-surface/50 px-3 py-2">
                            <span class="text-sm text-text">{dp.project.name}</span>
                            <button
                              class="text-xs text-accent transition-colors hover:text-accent/80"
                              onClick$={() => handleAssign(dp.project.id, group.id)}
                            >
                              Add to group
                            </button>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
