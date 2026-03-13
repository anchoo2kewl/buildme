import { component$ } from "@builder.io/qwik";

export default component$(() => {
  return (
    <div class="flex min-h-screen flex-col items-center justify-center bg-surface">
      <div class="mx-auto max-w-2xl px-4 text-center">
        <h1 class="text-5xl font-bold text-text">
          <span class="text-accent">BuildMe</span>
        </h1>
        <p class="mt-4 text-xl text-muted">
          Open-source CI/CD build monitor for GitHub Actions, Travis CI, and
          CircleCI. Real-time build status, failure notifications, and team
          collaboration.
        </p>
        <div class="mt-8 flex items-center justify-center gap-4">
          <a
            href="/auth/login"
            class="rounded-lg bg-accent px-6 py-3 font-medium text-white transition-colors hover:bg-accent-hover"
          >
            Sign In
          </a>
          <a
            href="/auth/signup"
            class="rounded-lg border border-border px-6 py-3 font-medium text-text transition-colors hover:border-accent"
          >
            Create Account
          </a>
        </div>
        <div class="mt-16 grid grid-cols-3 gap-8 text-left">
          <div class="rounded-lg border border-border bg-elevated p-6">
            <h3 class="font-semibold text-text">Multi-Provider</h3>
            <p class="mt-2 text-sm text-muted">
              Monitor GitHub Actions, Travis CI, and CircleCI from a single
              dashboard.
            </p>
          </div>
          <div class="rounded-lg border border-border bg-elevated p-6">
            <h3 class="font-semibold text-text">Real-Time</h3>
            <p class="mt-2 text-sm text-muted">
              Live build updates via WebSocket. No refresh needed.
            </p>
          </div>
          <div class="rounded-lg border border-border bg-elevated p-6">
            <h3 class="font-semibold text-text">Self-Hosted</h3>
            <p class="mt-2 text-sm text-muted">
              Single binary with embedded frontend and SQLite. Deploy anywhere.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});
