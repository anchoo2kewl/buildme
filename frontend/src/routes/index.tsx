import { component$ } from "@builder.io/qwik";

export default component$(() => {
  return (
    <div class="min-h-screen bg-surface">
      {/* Nav */}
      <nav class="border-b border-border bg-elevated/50 backdrop-blur-sm">
        <div class="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span class="text-lg font-bold text-accent">BuildMe</span>
          <div class="flex items-center gap-3">
            <a
              href="/auth/login"
              class="text-sm text-muted transition-colors hover:text-text"
            >
              Sign In
            </a>
            <a
              href="/auth/signup"
              class="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
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
          <span class="text-accent">all your builds</span>
        </h1>
        <p class="mx-auto mt-6 max-w-2xl text-lg text-muted">
          Monitor GitHub Actions, Travis CI, and CircleCI from a unified
          dashboard. Real-time build status, environment drift detection, and
          MCP integration for AI-powered build management.
        </p>
        <div class="mt-10 flex items-center justify-center gap-4">
          <a
            href="/auth/signup"
            class="rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition-all hover:bg-accent-hover hover:shadow-accent/40"
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
        <div class="mx-auto mt-16 max-w-2xl overflow-hidden rounded-xl border border-border bg-elevated shadow-2xl">
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
              <img
                src="https://img.icons8.com/ios-filled/50/ffffff/github.png"
                alt="GitHub"
                width="28"
                height="28"
                style={{ opacity: 0.7 }}
              />
              <span class="text-sm font-medium text-text">GitHub Actions</span>
            </div>
            <div class="flex items-center gap-3 text-muted">
              <img
                src="https://img.icons8.com/color/48/travis-ci.png"
                alt="Travis CI"
                width="28"
                height="28"
                style={{ opacity: 0.8 }}
              />
              <span class="text-sm font-medium text-text">Travis CI</span>
            </div>
            <div class="flex items-center gap-3 text-muted">
              <img
                src="https://img.icons8.com/color/48/circleci.png"
                alt="CircleCI"
                width="28"
                height="28"
                style={{ opacity: 0.8 }}
              />
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
              class="rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
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
    <div class="rounded-xl border border-border bg-elevated p-6 transition-colors hover:border-accent/30">
      <div class="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
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
      <div class="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">
        {step}
      </div>
      <h3 class="font-semibold text-text">{title}</h3>
      <p class="mt-2 text-sm text-muted">{desc}</p>
    </div>
  );
});
