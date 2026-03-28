import { component$, useSignal } from "@builder.io/qwik";
import type { ProviderType } from "~/lib/types";

interface ProviderFormProps {
  onSubmit$: (data: {
    provider_type: ProviderType;
    display_name: string;
    repo_owner: string;
    repo_name: string;
    api_token: string;
    webhook_secret: string;
    poll_interval_s: number;
  }) => void;
}

export const ProviderForm = component$<ProviderFormProps>(({ onSubmit$ }) => {
  const providerType = useSignal<ProviderType>("github");
  const displayName = useSignal("");
  const repoOwner = useSignal("");
  const repoName = useSignal("");
  const apiToken = useSignal("");
  const webhookSecret = useSignal("");
  const pollInterval = useSignal(60);

  return (
    <form
      preventdefault:submit
      onSubmit$={() => {
        onSubmit$({
          provider_type: providerType.value,
          display_name: displayName.value,
          repo_owner: repoOwner.value,
          repo_name: repoName.value,
          api_token: apiToken.value,
          webhook_secret: webhookSecret.value,
          poll_interval_s: pollInterval.value,
        });
      }}
      class="space-y-4"
    >
      <div>
        <label class="block text-sm font-medium text-text">Provider</label>
        <select
          bind:value={providerType}
          class="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-text"
        >
          <option value="github">GitHub Actions</option>
          <option value="github_hosted">GitHub Actions (Self-Hosted)</option>
          <option value="travis">Travis CI</option>
          <option value="circleci">CircleCI</option>
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium text-text">Display Name</label>
        <input
          type="text"
          bind:value={displayName}
          placeholder="e.g., My App CI"
          class="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-text placeholder:text-muted"
        />
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-text">Repo Owner</label>
          <input
            type="text"
            bind:value={repoOwner}
            placeholder="owner"
            class="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-text placeholder:text-muted"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-text">Repo Name</label>
          <input
            type="text"
            bind:value={repoName}
            placeholder="repo"
            class="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-text placeholder:text-muted"
          />
        </div>
      </div>
      <div>
        <label class="block text-sm font-medium text-text">API Token</label>
        <input
          type="password"
          bind:value={apiToken}
          class="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-text"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-text">
          Webhook Secret (optional)
        </label>
        <input
          type="password"
          bind:value={webhookSecret}
          class="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-text"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-text">
          Poll Interval (seconds)
        </label>
        <input
          type="number"
          bind:value={pollInterval}
          min={30}
          class="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-text"
        />
      </div>
      <button
        type="submit"
        class="w-full rounded-lg bg-accent px-4 py-2 font-medium text-white transition-colors hover:bg-accent-hover"
      >
        Add Provider
      </button>
    </form>
  );
});
