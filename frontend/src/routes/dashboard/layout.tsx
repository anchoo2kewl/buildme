import {
  component$,
  Slot,
  useContextProvider,
  useStore,
  useVisibleTask$,
} from "@builder.io/qwik";
import { useNavigate, useLocation } from "@builder.io/qwik-city";
import { AuthContext, type AuthState } from "~/context/auth-context";
import { SidebarContext, type SidebarState } from "~/context/sidebar-context";
import { WSContext, type WSState } from "~/context/ws-context";
import { get } from "~/lib/api";
import { BuildMeWS } from "~/lib/ws";
import type { User } from "~/lib/types";

export default component$(() => {
  const nav = useNavigate();
  const loc = useLocation();

  const auth = useStore<AuthState>({
    user: null,
    token: null,
    isLoading: true,
  });
  useContextProvider(AuthContext, auth);

  const sidebar = useStore<SidebarState>({ pinned: true, hovering: false });
  useContextProvider(SidebarContext, sidebar);

  const wsState = useStore<WSState>({ ws: null });
  useContextProvider(WSContext, wsState);

  useVisibleTask$(() => {
    sidebar.pinned =
      localStorage.getItem("buildme-sidebar-pinned") !== "false";
  });

  useVisibleTask$(async () => {
    const token = localStorage.getItem("buildme_token");
    if (!token) {
      auth.isLoading = false;
      nav("/auth/login");
      return;
    }
    auth.token = token;
    try {
      const user = await get<User>("/me");
      auth.user = user;
      auth.isLoading = false;

      const ws = new BuildMeWS(token);
      ws.connect();
      wsState.ws = ws as any;

      return () => ws.disconnect();
    } catch {
      auth.isLoading = false;
      localStorage.removeItem("buildme_token");
      nav("/auth/login");
    }
  });

  return (
    <div>
      {/* ── Nav bar ── */}
      <nav class="nav">
        <div class="nav-inner">
          <a href="/" class="brand">
            <span class="brand-mark">b</span>
            <span class="brand-name">
              BuildMe <em>/ self-hosted</em>
            </span>
          </a>

          <div class="nav-tabs">
            <a href="/" class="nav-tab">Features</a>
            <a href="/" class="nav-tab">Monitoring</a>
            <a href="/" class="nav-tab">Teams</a>
            <a href="/" class="nav-tab">MCP</a>
            <a href="/" class="nav-tab">Docs</a>
            <a href="/" class="nav-tab">Changelog</a>
          </div>

          <div class="nav-right">
            <button
              class="btn btn-ghost"
              onClick$={() => {
                localStorage.removeItem("buildme_token");
                nav("/auth/login");
              }}
            >
              Sign out
            </button>
            <a href="/dashboard" class="btn btn-primary">Open dashboard</a>
          </div>
        </div>
      </nav>

      {/* ── Dashboard shell ── */}
      <div class="dash-shell">
        {/* ── Sidebar ── */}
        <aside class="side">
          {/* Workspace selector */}
          <div class="workspace">
            <div class="ws-ava">AB</div>
            <div class="ws-name">
              Biswas workspace
              <small>self-hosted &middot; 4 members</small>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
          </div>

          {/* Main nav links */}
          <div class="side-group">
            <a
              href="/dashboard"
              class={`side-link ${loc.url.pathname === '/dashboard/' || loc.url.pathname === '/dashboard' ? 'active' : ''}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
              Overview
            </a>
            <a
              href="/dashboard/builds"
              class={`side-link ${loc.url.pathname.startsWith('/dashboard/builds') ? 'active' : ''}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
              Builds
              <span class="count">147</span>
            </a>
            <a
              href="/dashboard/projects"
              class={`side-link ${loc.url.pathname.startsWith('/dashboard/projects') ? 'active' : ''}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
              Projects
              <span class="count">5</span>
            </a>
            <a
              href="/dashboard/hosts"
              class={`side-link ${loc.url.pathname.startsWith('/dashboard/hosts') ? 'active' : ''}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" /><rect x="2" y="14" width="20" height="8" rx="2" /><line x1="6" y1="6" x2="6.01" y2="6" /><line x1="6" y1="18" x2="6.01" y2="18" /></svg>
              Hosts
              <span class="count">5</span>
            </a>
            <a
              href="/dashboard/incidents"
              class={`side-link ${loc.url.pathname.startsWith('/dashboard/incidents') ? 'active' : ''}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
              Incidents
              <span class="count">3</span>
            </a>
            <a
              href="/dashboard/probes"
              class={`side-link ${loc.url.pathname.startsWith('/dashboard/probes') ? 'active' : ''}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
              Probes
              <span class="count">5</span>
            </a>
            <a
              href="/dashboard/teams"
              class={`side-link ${loc.url.pathname.startsWith('/dashboard/teams') ? 'active' : ''}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
              Teams
            </a>
            <a
              href="/dashboard/notifications"
              class={`side-link ${loc.url.pathname.startsWith('/dashboard/notifications') ? 'active' : ''}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
              Notifications
            </a>
            <a
              href="/dashboard/mcp"
              class={`side-link ${loc.url.pathname.startsWith('/dashboard/mcp') ? 'active' : ''}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>
              MCP
            </a>
          </div>

          {/* Pinned projects */}
          <div class="side-group">
            <h6>
              Pinned projects
              <button>+</button>
            </h6>
            <a href="/dashboard/projects" class="side-link">
              <span class="pdot g"></span>
              api-service
              <span class="count">live</span>
            </a>
            <a href="/dashboard/projects" class="side-link">
              <span class="pdot a"></span>
              frontend
              <span class="count">build</span>
            </a>
            <a href="/dashboard/projects" class="side-link">
              <span class="pdot r"></span>
              worker
              <span class="count">!</span>
            </a>
            <a href="/dashboard/projects" class="side-link">
              <span class="pdot b"></span>
              docs-site
            </a>
            <a href="/dashboard/projects" class="side-link">
              <span class="pdot"></span>
              mobile-ios
            </a>
          </div>

          {/* Credits / system health */}
          <div class="side-credits">
            <div class="t">
              System health
              <small>&#9679; nominal</small>
            </div>
            <div class="bar-track">
              <div class="bar-fill"></div>
            </div>
            <div class="meta">
              <span>build worker pool</span>
              <span>74%</span>
            </div>
          </div>
        </aside>

        {/* ── Main content area ── */}
        <main class="main-content">
          {auth.isLoading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "64px 0" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  border: "2px solid var(--accent)",
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                  animation: "spin 0.6s linear infinite",
                }}
              />
            </div>
          ) : (
            <Slot />
          )}
        </main>
      </div>
    </div>
  );
});
