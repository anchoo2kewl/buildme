import { component$, useContext } from "@builder.io/qwik";
import { AuthContext } from "~/context/auth-context";
import { SidebarContext } from "~/context/sidebar-context";
import { Avatar } from "../shared/avatar";

export const Header = component$(() => {
  const auth = useContext(AuthContext);
  const sidebar = useContext(SidebarContext);

  return (
    <header class="relative border-b border-border bg-elevated/80 backdrop-blur-xl">
      <div class="flex h-14 items-center justify-between px-4">
        {/* Left: toggle + brand */}
        <div class="flex items-center gap-3">
          <button
            type="button"
            onClick$={() => {
              const next = !sidebar.pinned;
              sidebar.pinned = next;
              sidebar.hovering = false;
              localStorage.setItem("buildme-sidebar-pinned", String(next));
            }}
            title={sidebar.pinned ? "Collapse sidebar" : "Show sidebar"}
            class="flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-elevated/60 text-muted transition-colors hover:border-border-hover hover:text-text"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 3v18" />
            </svg>
          </button>

          <a href="/dashboard" class="flex items-center gap-2.5">
            <svg class="h-6 w-6 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16m-7 6h7M4 18h4" />
            </svg>
            <span class="text-xl font-bold tracking-tight text-accent">BuildMe</span>
          </a>
        </div>

        {/* Right: user info */}
        <div class="flex items-center gap-3">
          {auth.user && (
            <>
              <span class="text-sm text-muted">{auth.user.display_name}</span>
              <a href="/dashboard/settings">
                <Avatar
                  name={auth.user.display_name}
                  src={auth.user.avatar_url}
                  size="sm"
                />
              </a>
            </>
          )}
        </div>
      </div>
      {/* Gradient bottom edge */}
      <div class="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
    </header>
  );
});
