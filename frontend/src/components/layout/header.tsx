import { component$, useContext } from "@builder.io/qwik";
import { AuthContext } from "~/context/auth-context";
import { Avatar } from "../shared/avatar";

export const Header = component$(() => {
  const auth = useContext(AuthContext);

  return (
    <header class="relative border-b border-border bg-elevated/80 backdrop-blur-xl">
      <div class="flex h-14 items-center justify-between px-4">
        <a href="/dashboard" class="flex items-center gap-2.5">
          <svg class="h-6 w-6 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16m-7 6h7M4 18h4" />
          </svg>
          <span class="text-xl font-bold tracking-tight text-accent">BuildMe</span>
        </a>
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
