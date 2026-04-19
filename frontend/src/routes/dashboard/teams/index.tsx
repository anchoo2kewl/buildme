import { component$ } from "@builder.io/qwik";

export default component$(() => {
  const members = [
    { initials: "AB", name: "Anshuman Biswas", email: "anshuman@biswas.io", role: "owner", roleCls: "owner", projects: 12, lastSeen: "now", bg: "var(--accent)" },
    { initials: "MP", name: "Maya Patel", email: "maya@biswas.io", role: "admin", roleCls: "", projects: 8, lastSeen: "2h ago", bg: "oklch(0.65 0.16 330)" },
    { initials: "RS", name: "Rahul Sharma", email: "rahul@biswas.io", role: "engineer", roleCls: "", projects: 5, lastSeen: "4h ago", bg: "oklch(0.65 0.14 200)" },
    { initials: "CL", name: "Claire Laurent", email: "claire@biswas.io", role: "engineer", roleCls: "", projects: 3, lastSeen: "1d ago", bg: "oklch(0.65 0.14 140)" },
    { initials: "JL", name: "jl@biswas.io", email: "jl@biswas.io", role: "invited", roleCls: "", projects: 0, lastSeen: "pending", bg: "var(--line)" },
  ];

  const roles = [
    { name: "Owner", desc: "Full workspace access. Manage billing, members, and all projects." },
    { name: "Admin", desc: "Manage projects, hosts, and incidents. Cannot modify billing or remove owners." },
    { name: "Engineer", desc: "View dashboards, trigger builds, acknowledge incidents. Read-only on settings." },
  ];

  const auditLog = [
    { ts: "14:32", lv: "i", lvLabel: "INFO", msg: "anshuman rotated MCP key ci-ops" },
    { ts: "14:18", lv: "o", lvLabel: "AUTH", msg: "maya logged in from 192.168.1.42" },
    { ts: "13:55", lv: "i", lvLabel: "INFO", msg: "rahul triggered build for api-service" },
    { ts: "12:40", lv: "w", lvLabel: "WARN", msg: "failed login attempt for jl@biswas.io" },
    { ts: "11:02", lv: "i", lvLabel: "INFO", msg: "claire acknowledged incident P2-frontend" },
    { ts: "09:15", lv: "e", lvLabel: "ERR", msg: "webhook delivery failed to status-page" },
  ];

  return (
    <div>
      <div class="page-top">
        <div class="breadcrumb">
          workspace <span>/</span> <b>teams</b>
        </div>
        <div class="page-top-actions">
          <button class="btn btn-outline">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M11.5 12.5v-1.5a2.5 2.5 0 0 0-2.5-2.5H5a2.5 2.5 0 0 0-2.5 2.5v1.5" /><circle cx="7" cy="4" r="2.5" /><path d="M10 6.5l1.5 1.5 2.5-2.5" /></svg>
            Manage roles
          </button>
          <button class="btn btn-primary">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 1.5v11M1.5 7h11" /></svg>
            Invite member
          </button>
        </div>
      </div>

      <div class="greet">
        <div>
          <h1>Teams & roles <em>· 4 members · 3 roles</em></h1>
        </div>
      </div>

      <div class="sub-grid c2">
        {/* Left: Members */}
        <div>
          <div class="panel">
            <div class="panel-head">
              <h3>Members <span class="cnt">5</span></h3>
            </div>
            <div class="panel-body p0">
              {members.map((m) => (
                <div class="team-row" key={m.email}>
                  <div class="av" style={{ background: m.bg, color: "#fff" }}>{m.initials}</div>
                  <div class="n">
                    <b>{m.name}</b>
                    <small>{m.email}</small>
                  </div>
                  <div class={`role ${m.roleCls}`}>{m.role}</div>
                  <div class="proj-count">{m.projects} projects</div>
                  <div class="last">{m.lastSeen}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Roles + Audit */}
        <div>
          <div class="panel">
            <div class="panel-head">
              <h3>Roles <span class="cnt">3</span></h3>
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
            <div class="panel-body">
              <div class="logtail">
                {auditLog.map((l, i) => (
                  <div class="l" key={i}>
                    <span class="ts">{l.ts}</span>
                    <span class={`lv ${l.lv}`}>{l.lvLabel}</span>
                    <span>{l.msg}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
