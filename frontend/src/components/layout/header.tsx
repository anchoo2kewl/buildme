import { component$, useContext } from "@builder.io/qwik";
import { AuthContext } from "~/context/auth-context";
import { Avatar } from "../shared/avatar";

export const Header = component$(() => {
  const auth = useContext(AuthContext);

  return (
    <header class="border-b border-border bg-elevated">
      <div class="flex h-14 items-center justify-between px-4">
        <a href="/dashboard" class="flex items-center gap-2">
          <span class="text-xl font-bold text-accent">BuildMe</span>
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
    </header>
  );
});
