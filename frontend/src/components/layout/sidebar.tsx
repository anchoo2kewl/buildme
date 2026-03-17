import { component$, useContext } from "@builder.io/qwik";
import { useLocation } from "@builder.io/qwik-city";
import { AuthContext } from "~/context/auth-context";

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    // Lucide: LayoutDashboard
    icon: (
      <svg class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
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
    // Lucide: AlertTriangle
    icon: (
      <svg class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
      </svg>
    ),
  },
  {
    href: "/dashboard/hosts",
    label: "Hosts",
    // Lucide: Server icon
    icon: (
      <svg class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
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
    // Lucide: Layers
    icon: (
      <svg class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
        <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
        <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
      </svg>
    ),
  },
  {
    href: "/dashboard/projects",
    label: "Projects",
    // Lucide: FolderKanban
    icon: (
      <svg class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
        <path d="M8 10v4M12 10v2M16 10v6" />
      </svg>
    ),
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    // Lucide: Settings
    icon: (
      <svg class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
];

export const Sidebar = component$(() => {
  const loc = useLocation();
  const auth = useContext(AuthContext);

  return (
    <nav class="w-56 border-r border-border bg-gradient-to-b from-elevated to-surface">
      <div class="space-y-1 p-3">
        {navItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? loc.url.pathname === "/dashboard/"
              : loc.url.pathname.startsWith(item.href);
          return (
            <a
              key={item.href}
              href={item.href}
              class={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all ${
                isActive
                  ? "border-l-2 border-accent bg-gradient-to-r from-accent/15 to-transparent font-semibold text-accent"
                  : "border-l-2 border-transparent text-muted hover:bg-white/[0.04] hover:text-text"
              }`}
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
              class={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all ${
                loc.url.pathname.startsWith("/dashboard/admin")
                  ? "border-l-2 border-accent bg-gradient-to-r from-accent/15 to-transparent font-semibold text-accent"
                  : "border-l-2 border-transparent text-muted hover:bg-white/[0.04] hover:text-text"
              }`}
            >
              <svg class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
              Admin
            </a>
          </>
        )}
      </div>
    </nav>
  );
});
