import { component$ } from "@builder.io/qwik";
import type { BuildStatus } from "~/lib/types";

interface StatusBadgeProps {
  status: BuildStatus;
}

export const StatusBadge = component$<StatusBadgeProps>(({ status }) => {
  const config: Record<BuildStatus, { bg: string; label: string }> = {
    queued: { bg: "bg-muted/30 text-muted", label: "Queued" },
    running: { bg: "bg-running/20 text-running shadow-[0_0_8px_rgba(96,165,250,0.15)]", label: "Running" },
    success: { bg: "bg-success/20 text-success shadow-[0_0_8px_rgba(52,211,153,0.15)]", label: "Success" },
    failure: { bg: "bg-failure/20 text-failure shadow-[0_0_8px_rgba(248,113,113,0.15)]", label: "Failed" },
    cancelled: { bg: "bg-warning/20 text-warning", label: "Cancelled" },
    error: { bg: "bg-failure/20 text-failure shadow-[0_0_8px_rgba(248,113,113,0.15)]", label: "Error" },
    skipped: { bg: "bg-muted/30 text-muted", label: "Skipped" },
  };

  const { bg, label } = config[status] || config.queued;

  return (
    <span
      class={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${bg}`}
    >
      {status === "running" && (
        <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
      )}
      {label}
    </span>
  );
});
