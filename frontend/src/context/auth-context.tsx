import { createContextId } from "@builder.io/qwik";
import type { User } from "~/lib/types";

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
}

export const AuthContext = createContextId<AuthState>("auth");
