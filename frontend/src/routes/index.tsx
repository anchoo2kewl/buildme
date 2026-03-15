import { component$ } from "@builder.io/qwik";

export default component$(() => {
  return (
    <div class="min-h-screen" style={{ background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(129,140,248,0.06), transparent), radial-gradient(ellipse 60% 40% at 80% 80%, rgba(52,211,153,0.04), transparent), var(--color-surface)" }}>
      {/* Nav */}
      <nav class="border-b border-border bg-elevated/50 backdrop-blur-sm">
        <div class="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span class="flex items-center gap-2 text-lg font-bold text-accent">
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="14" y2="12" />
              <line x1="4" y1="18" x2="18" y2="18" />
            </svg>
            BuildMe
          </span>
          <div class="flex items-center gap-3">
            <a
              href="/auth/login"
              class="text-sm text-muted transition-colors hover:text-text"
            >
              Sign In
            </a>
            <a
              href="/auth/signup"
              class="rounded-lg bg-gradient-to-r from-accent to-indigo-400 px-4 py-2 text-sm font-medium text-white transition-all hover:brightness-110"
            >
              Get Started
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section class="mx-auto max-w-5xl px-6 pb-16 pt-20 text-center">
        <div class="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-sm text-accent">
          <span class="inline-block h-2 w-2 animate-pulse rounded-full bg-accent" />
          Open Source CI/CD Monitor
        </div>
        <h1 class="text-5xl font-extrabold leading-tight tracking-tight text-text sm:text-6xl">
          One dashboard for
          <br />
          <span class="bg-gradient-to-r from-accent to-running bg-clip-text text-transparent">all your builds</span>
        </h1>
        <p class="mx-auto mt-6 max-w-2xl text-lg text-muted">
          Monitor GitHub Actions, Travis CI, and CircleCI from a unified
          dashboard. Real-time build status, environment drift detection, and
          MCP integration for AI-powered build management.
        </p>
        <div class="mt-10 flex items-center justify-center gap-4">
          <a
            href="/auth/signup"
            class="rounded-lg bg-gradient-to-r from-accent to-indigo-400 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/30 transition-all hover:shadow-accent/50 hover:brightness-110"
          >
            Start Monitoring
          </a>
          <a
            href="/auth/login"
            class="rounded-lg border border-border px-6 py-3 text-sm font-semibold text-text transition-colors hover:border-accent hover:text-accent"
          >
            Sign In
          </a>
        </div>

        {/* Terminal mockup */}
        <div class="mx-auto mt-16 max-w-2xl overflow-hidden rounded-xl border border-border bg-elevated shadow-2xl shadow-accent/5">
          <div class="flex items-center gap-2 border-b border-border px-4 py-3">
            <span class="h-3 w-3 rounded-full bg-failure/60" />
            <span class="h-3 w-3 rounded-full bg-warning/60" />
            <span class="h-3 w-3 rounded-full bg-success/60" />
            <span class="ml-2 text-xs text-muted">buildme-mcp</span>
          </div>
          <div class="p-5 text-left font-mono text-sm leading-relaxed">
            <div class="text-muted">
              <span class="text-accent">$</span> watch_builds
            </div>
            <div class="mt-2 text-text">
              {"{"} active_builds: 2, poll_interval: 30s {"}"}
            </div>
            <div class="mt-1 text-success">
              {"  "}pingrly/main {"  "}<span class="text-muted">deploy</span> {"  "}
              <span class="animate-pulse">running</span> {"  "}42s
            </div>
            <div class="mt-0.5 text-running">
              {"  "}buildme/main {"  "}<span class="text-muted">test+build</span>{" "}
              {"  "}queued
            </div>
            <div class="mt-3 text-muted">
              <span class="text-accent">$</span> cancel_build --project 1 --build 847
            </div>
            <div class="mt-1 text-warning">
              {"  "}cancel requested
            </div>
            <div class="mt-3 text-muted">
              <span class="text-accent">$</span> restart_build --project 2 --build 312
            </div>
            <div class="mt-1 text-success">
              {"  "}retrigger requested
            </div>
          </div>
        </div>
      </section>

      {/* CI Provider Logos */}
      <section class="border-y border-border bg-elevated/30 py-10">
        <div class="mx-auto max-w-5xl px-6 text-center">
          <p class="mb-6 text-sm font-medium uppercase tracking-wider text-muted">
            Works with your CI providers
          </p>
          <div class="flex items-center justify-center gap-12">
            <div class="flex items-center gap-3 text-muted">
              <svg class="h-7 w-7 text-text/70" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              <span class="text-sm font-medium text-text">GitHub Actions</span>
            </div>
            <div class="flex items-center gap-3 text-muted">
              <svg class="h-7 w-7" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="2" width="20" height="20" rx="4" fill="#3EAAAF" />
                <path d="M7 8h10M12 8v8M9 16h6" stroke="white" stroke-width="2" stroke-linecap="round" />
              </svg>
              <span class="text-sm font-medium text-text">Travis CI</span>
            </div>
            <div class="flex items-center gap-3 text-muted">
              <svg class="h-7 w-7" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#60a5fa" stroke-width="1.5" />
                <circle cx="12" cy="12" r="6" stroke="#60a5fa" stroke-width="1.5" />
                <circle cx="12" cy="12" r="2.5" fill="#60a5fa" />
              </svg>
              <span class="text-sm font-medium text-text">CircleCI</span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section class="mx-auto max-w-5xl px-6 py-20">
        <h2 class="mb-4 text-center text-3xl font-bold text-text">
          Everything you need
        </h2>
        <p class="mx-auto mb-12 max-w-xl text-center text-muted">
          From real-time monitoring to AI-powered build management, BuildMe
          gives you complete visibility into your CI/CD pipelines.
        </p>
        <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            title="Multi-Provider Dashboard"
            desc="Unified view of GitHub Actions, Travis CI, and CircleCI builds. Filter by environment, branch, or status."
            icon="grid"
          />
          <FeatureCard
            title="Real-Time WebSocket"
            desc="Live build updates pushed via WebSocket. No polling, no refresh — see builds complete in real time."
            icon="zap"
          />
          <FeatureCard
            title="Environment Drift Detection"
            desc="Compare deployed SHAs against branch heads. Know instantly when staging or production falls behind."
            icon="git"
          />
          <FeatureCard
            title="MCP Integration"
            desc="AI agents can query builds, cancel runs, restart pipelines, and watch progress through the Model Context Protocol."
            icon="bot"
          />
          <FeatureCard
            title="Adaptive Polling"
            desc="30-second polling during active builds, 5-minute intervals when idle. Your AI agent always has fresh data."
            icon="clock"
          />
          <FeatureCard
            title="Self-Hosted"
            desc="Single Go binary with embedded frontend and SQLite. Deploy anywhere — your server, your data, your rules."
            icon="server"
          />
        </div>
      </section>

      {/* MCP Section */}
      <section class="border-t border-border bg-elevated/30 py-20">
        <div class="mx-auto max-w-5xl px-6">
          <div class="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <div class="mb-4 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
                MCP Server
              </div>
              <h2 class="text-3xl font-bold text-text">
                AI-native build management
              </h2>
              <p class="mt-4 text-muted">
                The BuildMe MCP server lets AI coding agents interact with your
                CI/CD pipelines directly. Query build status, cancel runaway
                builds, restart failed deploys — all through natural language.
              </p>
              <ul class="mt-6 space-y-3">
                {[
                  "watch_builds — adaptive polling with 30s/5min intervals",
                  "cancel_build — stop running builds from your editor",
                  "restart_build — re-trigger failed deploys instantly",
                  "get_build_stats — success rates and failure trends",
                  "get_drift — environment version comparison",
                ].map((item) => (
                  <li
                    key={item}
                    class="flex items-start gap-2 text-sm text-muted"
                  >
                    <span class="mt-0.5 text-accent">+</span>
                    <span>
                      <code class="text-text">{item.split(" — ")[0]}</code>
                      {" — "}
                      {item.split(" — ")[1]}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div class="overflow-hidden rounded-xl border border-border bg-elevated">
              <div class="flex items-center gap-2 border-b border-border px-4 py-3">
                <span class="h-3 w-3 rounded-full bg-failure/60" />
                <span class="h-3 w-3 rounded-full bg-warning/60" />
                <span class="h-3 w-3 rounded-full bg-success/60" />
                <span class="ml-2 text-xs text-muted">
                  ~/.claude/settings.json
                </span>
              </div>
              <pre class="overflow-x-auto p-5 font-mono text-xs leading-relaxed text-muted">
                <code>
{`{
  "mcpServers": {
    "buildme": {
      "url": "https://mcp.build.biswas.me",
      "headers": {
        "X-API-Key": "bm_..."
      }
    }
  }
}`}
                </code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture */}
      <section class="mx-auto max-w-5xl px-6 py-20">
        <h2 class="mb-12 text-center text-3xl font-bold text-text">
          How it works
        </h2>
        <div class="grid gap-8 sm:grid-cols-3">
          <StepCard
            step="1"
            title="Connect providers"
            desc="Add your GitHub, Travis CI, or CircleCI repositories. BuildMe uses API tokens to fetch build data."
          />
          <StepCard
            step="2"
            title="Monitor builds"
            desc="See all builds in real time. Environment drift detection compares what's deployed vs. what's built."
          />
          <StepCard
            step="3"
            title="Act from anywhere"
            desc="Cancel, restart, or investigate builds from the dashboard or through MCP-connected AI agents."
          />
        </div>
      </section>

      {/* CTA */}
      <section class="border-t border-border bg-elevated/30 py-16">
        <div class="mx-auto max-w-xl px-6 text-center">
          <h2 class="text-2xl font-bold text-text">Ready to monitor?</h2>
          <p class="mt-3 text-muted">
            Self-hosted, open source, and free. Set up in under 5 minutes.
          </p>
          <div class="mt-8 flex items-center justify-center gap-4">
            <a
              href="/auth/signup"
              class="rounded-lg bg-gradient-to-r from-accent to-indigo-400 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/30 transition-all hover:shadow-accent/50 hover:brightness-110"
            >
              Create Account
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer class="border-t border-border px-6 py-8 text-center text-xs text-muted">
        BuildMe &mdash; Open-source CI/CD build monitor
      </footer>
    </div>
  );
});

// --- Sub-components ---

interface FeatureCardProps {
  title: string;
  desc: string;
  icon: string;
}

const FeatureCard = component$<FeatureCardProps>(({ title, desc, icon }) => {
  const icons: Record<string, string> = {
    grid: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z",
    zap: "M13 2L3 14h9l-1 10 10-12h-9l1-10z",
    git: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z",
    bot: "M12 2a2 2 0 012 2v1h2a2 2 0 012 2v10a2 2 0 01-2 2H8a2 2 0 01-2-2V7a2 2 0 012-2h2V4a2 2 0 012-2zm-2 8a1 1 0 100 2 1 1 0 000-2zm4 0a1 1 0 100 2 1 1 0 000-2z",
    clock: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm0-14v4l3 3",
    server: "M4 4h16v6H4V4zm0 10h16v6H4v-6zm2-7h.01M6 17h.01",
  };
  return (
    <div class="group rounded-xl border border-border bg-elevated p-6 transition-all hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5 hover:-translate-y-0.5">
      <div class="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-accent/15 to-accent/5">
        <svg
          class="h-5 w-5 text-accent"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d={icons[icon] || icons.grid}
          />
        </svg>
      </div>
      <h3 class="font-semibold text-text">{title}</h3>
      <p class="mt-2 text-sm leading-relaxed text-muted">{desc}</p>
    </div>
  );
});

interface StepCardProps {
  step: string;
  title: string;
  desc: string;
}

const StepCard = component$<StepCardProps>(({ step, title, desc }) => {
  return (
    <div class="text-center">
      <div class="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-accent to-running text-sm font-bold text-white shadow-lg shadow-accent/20">
        {step}
      </div>
      <h3 class="font-semibold text-text">{title}</h3>
      <p class="mt-2 text-sm text-muted">{desc}</p>
    </div>
  );
});
