import { createContextId } from "@builder.io/qwik";

export interface SidebarState {
  pinned: boolean;
  hovering: boolean;
}

export const SidebarContext = createContextId<SidebarState>("bm-sidebar");
