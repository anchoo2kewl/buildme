import { component$ } from "@builder.io/qwik";
import type { Build } from "~/lib/types";
import { StatusBadge } from "./status-badge";
import { CIProviderIcon } from "~/components/shared/ci-provider-icon";

interface BuildCardProps {
  build: Build;
}

function formatDuration(ms?: number): string {
  if (!ms) return "-";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}m ${rem}s`;
}

function formatTime(iso?: string): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString();
}

function shortSha(sha: string): string {
  return sha.slice(0, 7);
}

export const BuildCard = component$<BuildCardProps>(({ build }) => {
  return (
    <a
      href={`/dashboard/projects/${build.project_id}/builds/${build.id}`}
      class="block rounded-lg border border-border bg-elevated p-4 transition-all hover:border-accent/50 hover:shadow-lg hover:shadow-accent/5 hover:-translate-y-0.5"
    >
      <div class="flex items-start justify-between">
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <StatusBadge status={build.status} />
            <span class="truncate text-sm font-medium text-text">
              {build.workflow_name || build.external_id}
            </span>
          </div>
          <p class="mt-1 truncate text-sm text-muted">
            {build.commit_message || "No commit message"}
          </p>
          <div class="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
            <span class="inline-flex items-center gap-1">
              <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              {build.branch}
            </span>
            <span>{shortSha(build.commit_sha)}</span>
            <span>{build.commit_author}</span>
            <span>{formatDuration(build.duration_ms)}</span>
            <span>{formatTime(build.started_at)}</span>
          </div>
        </div>
        <div class="ml-4 shrink-0">
          {build.provider_type && (
            <CIProviderIcon provider={build.provider_type} size={18} />
          )}
        </div>
      </div>
    </a>
  );
});
