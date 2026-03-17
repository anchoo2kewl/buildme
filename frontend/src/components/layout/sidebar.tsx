import { component$, useContext } from "@builder.io/qwik";
import { useLocation } from "@builder.io/qwik-city";
import { AuthContext } from "~/context/auth-context";
import { SidebarContext } from "~/context/sidebar-context";

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg class="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </svg>
    ),
  },
  {
    href: "/dashboard/incidents",
    label: "Incidents",
    icon: (
      <svg class="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
      </svg>
    ),
  },
  {
    href: "/dashboard/hosts",
    label: "Hosts",
    icon: (
      <svg class="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
        <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
        <line x1="6" y1="6" x2="6.01" y2="6" />
        <line x1="6" y1="18" x2="6.01" y2="18" />
      </svg>
    ),
  },
  {
    href: "/dashboard/groups",
    label: "Groups",
    icon: (
      <svg class="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
        <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
        <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
      </svg>
    ),
  },
  {
    href: "/dashboard/runners",
    label: "Runners",
    icon: (
      <svg class="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
    ),
  },
  {
    href: "/dashboard/projects",
    label: "Projects",
    icon: (
      <svg class="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
        <path d="M8 10v4M12 10v2M16 10v6" />
      </svg>
    ),
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    icon: (
      <svg class="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
];

export const Sidebar = component$(() => {
  const loc = useLocation();
  const auth = useContext(AuthContext);
  const sidebar = useContext(SidebarContext);

  return (
    <>
      {/* Edge trigger: thin strip at left edge, hover to reveal floating sidebar */}
      {!sidebar.pinned && (
        <div
          class="fixed top-14 bottom-0 left-0 w-3 z-40"
          style={{ cursor: "e-resize" }}
          onMouseEnter$={() => { sidebar.hovering = true; }}
          onMouseLeave$={() => { sidebar.hovering = false; }}
        >
          <div class="absolute left-0.5 top-1/2 -translate-y-1/2 w-1 h-14 rounded-full bg-accent/30 opacity-0 transition-opacity duration-200 group-hover:opacity-100 hover:opacity-100" />
        </div>
      )}

      {/* Sidebar wrapper: takes space in flex when pinned, zero-width when floating */}
      <div
        class={{
          "shrink-0 transition-all duration-250": true,
          "w-56": sidebar.pinned,
          "w-0": !sidebar.pinned,
        }}
      >
        {/* The actual nav panel */}
        <nav
          class={{
            "h-full border-r border-border bg-gradient-to-b from-elevated to-surface flex flex-col overflow-hidden transition-transform duration-250": true,
            "w-56 relative": sidebar.pinned,
            "fixed top-14 bottom-0 left-0 w-56 z-50 shadow-2xl shadow-black/60": !sidebar.pinned,
            "translate-x-0": sidebar.pinned || sidebar.hovering,
            "-translate-x-full": !sidebar.pinned && !sidebar.hovering,
          }}
          onMouseEnter$={() => { if (!sidebar.pinned) sidebar.hovering = true; }}
          onMouseLeave$={() => { if (!sidebar.pinned) sidebar.hovering = false; }}
        >
          {/* Sidebar header: label + pin button */}
          <div class="flex items-center justify-between px-3 pt-3 pb-2">
            <span class="text-[10px] font-semibold uppercase tracking-widest text-muted/60">
              Navigation
            </span>
            <button
              type="button"
              onClick$={() => {
                const next = !sidebar.pinned;
                sidebar.pinned = next;
                sidebar.hovering = false;
                localStorage.setItem("buildme-sidebar-pinned", String(next));
              }}
              title={sidebar.pinned ? "Unpin sidebar" : "Pin sidebar open"}
              class={{
                "flex items-center justify-center w-6 h-6 rounded-md transition-colors": true,
                "text-accent bg-accent/10 hover:bg-accent/20": sidebar.pinned,
                "text-muted hover:text-text hover:bg-white/[0.06]": !sidebar.pinned,
              }}
            >
              {/* Pushpin icon */}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5">
                <line x1="12" y1="17" x2="12" y2="22" />
                <path d="M5 17h14" />
                <path d="M9 5h6" />
                <path
                  d="M15 5c0 2-1.5 3.5-3 5.5S9 13 9 15.5V17h6v-1.5c0-2.5-1.5-4-3-5.5S15 7 15 5z"
                  fill={sidebar.pinned ? "currentColor" : "none"}
                />
              </svg>
            </button>
          </div>

          {/* Nav items */}
          <div class="flex-1 overflow-y-auto px-2 pb-3">
            <div class="space-y-0.5">
              {navItems.map((item) => {
                const isActive =
                  item.href === "/dashboard"
                    ? loc.url.pathname === "/dashboard/"
                    : loc.url.pathname.startsWith(item.href);
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    class={{
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all": true,
                      "bg-gradient-to-r from-accent/15 to-transparent font-semibold text-accent border-l-2 border-accent": isActive,
                      "border-l-2 border-transparent text-muted hover:bg-white/[0.04] hover:text-text": !isActive,
                    }}
                  >
                    {item.icon}
                    {item.label}
                  </a>
                );
              })}

              {auth.user?.is_super_admin && (
                <>
                  <div class="my-2 border-t border-border/50" />
                  <a
                    href="/dashboard/admin"
                    class={{
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all": true,
                      "bg-gradient-to-r from-accent/15 to-transparent font-semibold text-accent border-l-2 border-accent": loc.url.pathname.startsWith("/dashboard/admin"),
                      "border-l-2 border-transparent text-muted hover:bg-white/[0.04] hover:text-text": !loc.url.pathname.startsWith("/dashboard/admin"),
                    }}
                  >
                    <svg class="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      <path d="m9 12 2 2 4-4" />
                    </svg>
                    Admin
                  </a>
                </>
              )}
            </div>
          </div>
        </nav>
      </div>
    </>
  );
});
