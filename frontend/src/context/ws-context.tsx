import { createContextId } from "@builder.io/qwik";
import type { BuildMeWS } from "~/lib/ws";

export interface WSState {
  ws: BuildMeWS | null;
}

export const WSContext = createContextId<WSState>("ws");
