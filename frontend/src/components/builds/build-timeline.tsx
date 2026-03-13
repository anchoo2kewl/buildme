import { component$ } from "@builder.io/qwik";
import type { BuildJob } from "~/lib/types";
import { StatusBadge } from "./status-badge";

interface BuildTimelineProps {
  jobs: BuildJob[];
}

function formatDuration(ms?: number): string {
  if (!ms) return "-";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}m ${rem}s`;
}

export const BuildTimeline = component$<BuildTimelineProps>(({ jobs }) => {
  if (!jobs || jobs.length === 0) {
    return <p class="text-sm text-muted">No jobs available</p>;
  }

  return (
    <div class="space-y-2">
      {jobs.map((job) => (
        <div
          key={job.id}
          class="flex items-center justify-between rounded-lg border border-border bg-elevated p-3"
        >
          <div class="flex items-center gap-3">
            <StatusBadge status={job.status} />
            <span class="text-sm text-text">{job.name}</span>
          </div>
          <span class="text-xs text-muted">{formatDuration(job.duration_ms)}</span>
        </div>
      ))}
    </div>
  );
});
