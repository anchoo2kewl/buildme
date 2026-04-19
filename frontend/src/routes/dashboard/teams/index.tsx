import { component$, useSignal, useVisibleTask$, useComputed$ } from "@builder.io/qwik";
import { fetchGroups, fetchGroupMembers } from "~/lib/api";
import type { ProjectGroup, GroupMember } from "~/lib/types";

function getInitials(name: string): string {
  return name
    .split(/[\s@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function avatarColor(name: string): string {
  const hues = [210, 330, 140, 200, 260, 30, 170, 300];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return `oklch(0.65 0.14 ${hues[Math.abs(hash) % hues.length]})`;
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

interface GroupWithMembers {
  group: ProjectGroup;
  members: GroupMember[];
}

export default component$(() => {
  const groups = useSignal<GroupWithMembers[]>([]);
  const loading = useSignal(true);
  const error = useSignal("");

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    try {
      const allGroups = await fetchGroups();
      const results: GroupWithMembers[] = [];
      for (const g of allGroups) {
        try {
          const members = await fetchGroupMembers(g.id);
          results.push({ group: g, members });
        } catch {
          results.push({ group: g, members: [] });
        }
      }
      groups.value = results;
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : "Failed to load";
    } finally {
      loading.value = false;
    }
  });

  const totalMembers = useComputed$(() => {
    const seen = new Set<number>();
    for (const g of groups.value) {
      for (const m of g.members) seen.add(m.user_id);
    }
    return seen.size;
  });

  const roles = [
    { name: "Owner", desc: "Full workspace access. Manage billing, members, and all projects." },
    { name: "Admin", desc: "Manage projects, hosts, and incidents. Cannot modify billing or remove owners." },
    { name: "Editor", desc: "Edit project settings, trigger builds, manage deployments. Read-only on workspace settings." },
    { name: "Viewer", desc: "Read-only access to dashboards, builds, and incidents. Cannot modify any settings." },
  ];

  return (
    <div>
      <div class="page-top">
        <div class="breadcrumb">
          workspace <span>/</span> <b>teams</b>
        </div>
        <div class="page-top-actions">
          <button class="btn btn-primary">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 1.5v11M1.5 7h11" /></svg>
            Invite member
          </button>
        </div>
      </div>

      {loading.value ? (
        <div class="greet"><div><h1>Loading...</h1></div></div>
      ) : error.value ? (
        <div class="greet"><div><h1>Teams & roles</h1><p style={{ color: "var(--danger)" }}>{error.value}</p></div></div>
      ) : (
        <>
          <div class="greet">
            <div>
              <h1>Teams & roles <em>· {totalMembers.value} member{totalMembers.value !== 1 ? "s" : ""}</em></h1>
            </div>
          </div>

          {groups.value.length === 0 ? (
            <div class="panel">
              <div class="panel-body" style={{ textAlign: "center", padding: "48px 24px" }}>
                <p style={{ color: "var(--text-2)", fontSize: 14 }}>No groups configured yet. Create a project group to start organizing your team.</p>
              </div>
            </div>
          ) : (
            <div class="sub-grid c2">
              {/* Left: Groups with members */}
              <div>
                {groups.value.map((gw) => (
                  <div class="panel" key={gw.group.id} style={{ marginBottom: 16 }}>
                    <div class="panel-head">
                      <h3>{gw.group.name} <span class="cnt">{gw.members.length}</span></h3>
                    </div>
                    <div class="panel-body p0">
                      {gw.members.length === 0 ? (
                        <div style={{ padding: "16px 20px", color: "var(--text-3)", fontSize: 13 }}>No members in this group</div>
                      ) : (
                        gw.members.map((m) => {
                          const name = m.user?.display_name || m.user?.email || `User #${m.user_id}`;
                          const email = m.user?.email || "";
                          const initials = getInitials(name);
                          return (
                            <div class="team-row" key={m.user_id}>
                              <div class="av" style={{ background: m.user?.avatar_url ? `url(${m.user.avatar_url}) center/cover` : avatarColor(name), color: "#fff" }}>
                                {m.user?.avatar_url ? "" : initials}
                              </div>
                              <div class="n">
                                <b>{name}</b>
                                {email && <small>{email}</small>}
                              </div>
                              <div class={`role ${m.role === "owner" ? "owner" : ""}`}>{m.role}</div>
                              <div class="last">{timeAgo(m.created_at)}</div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Right: Roles + Audit */}
              <div>
                <div class="panel">
                  <div class="panel-head">
                    <h3>Roles <span class="cnt">{roles.length}</span></h3>
                  </div>
                  <div class="panel-body">
                    {roles.map((r) => (
                      <div key={r.name} style={{ padding: "8px 0", borderBottom: "1px dashed var(--line-soft)" }}>
                        <b style={{ fontSize: 13, fontWeight: 500 }}>{r.name}</b>
                        <p style={{ color: "var(--text-2)", fontSize: 12, margin: "3px 0 0", lineHeight: 1.5 }}>{r.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div class="panel">
                  <div class="panel-head">
                    <h3>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12.5V4.5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v8" /><path d="M1 12.5h12" /><line x1="5" y1="6" x2="9" y2="6" /><line x1="5" y1="8.5" x2="8" y2="8.5" /></svg>
                      Audit log
                    </h3>
                  </div>
                  <div class="panel-body" style={{ textAlign: "center", padding: "32px 20px" }}>
                    <p style={{ color: "var(--text-3)", fontSize: 13, margin: 0 }}>Audit log requires the enterprise plan.</p>
                    <p style={{ color: "var(--text-3)", fontSize: 12, marginTop: 8 }}>Contact support to enable detailed activity logging for your workspace.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
});
