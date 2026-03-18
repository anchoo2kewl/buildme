import {
  component$,
  Slot,
  useContextProvider,
  useStore,
  useVisibleTask$,
} from "@builder.io/qwik";
import { useNavigate } from "@builder.io/qwik-city";
import { Header } from "~/components/layout/header";
import { Sidebar } from "~/components/layout/sidebar";
import { AuthContext, type AuthState } from "~/context/auth-context";
import { SidebarContext, type SidebarState } from "~/context/sidebar-context";
import { WSContext, type WSState } from "~/context/ws-context";
import { get } from "~/lib/api";
import { BuildMeWS } from "~/lib/ws";
import type { User } from "~/lib/types";

export default component$(() => {
  const nav = useNavigate();

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

  // Init sidebar pin state from localStorage (client only)
  useVisibleTask$(() => {
    sidebar.pinned = localStorage.getItem("buildme-sidebar-pinned") !== "false";
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
    <div class="flex h-screen flex-col" style={{ background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(129,140,248,0.03), transparent), var(--color-surface)" }}>
      <Header />
      <div class="flex flex-1 overflow-hidden">
        <Sidebar />
        <main class="flex-1 overflow-y-auto p-6">
          {auth.isLoading ? (
            <div class="flex items-center justify-center p-8">
              <div class="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            </div>
          ) : (
            <Slot />
          )}
        </main>
      </div>
    </div>
  );
});
