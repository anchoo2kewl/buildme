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
              <svg class="h-9 w-9 text-text/70" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              <span class="text-sm font-medium text-text">GitHub Actions</span>
            </div>
            <div class="flex items-center gap-3 text-muted">
              <svg class="h-9 w-9" viewBox="0 0 24 24" fill="#3EAAAF">
                <path d="M9.32 13.025a.485.485 0 1 1-.97 0c0-.446-.167-.758-.406-.758-.239 0-.405.312-.405.758a.485.485 0 1 1-.97 0c0-1.187.713-1.728 1.375-1.728s1.376.541 1.376 1.728zm6.017.485a.485.485 0 0 0 .485-.485c0-.446.167-.758.405-.758s.405.312.405.758a.485.485 0 1 0 .97 0c0-1.187-.713-1.728-1.375-1.728s-1.375.541-1.375 1.728c0 .268.217.485.485.485zm7.967-4.454l-.191 2.459a.801.801 0 0 1-.367.623.852.852 0 0 1-.46.13 1.07 1.07 0 0 1-.366-.068c-.271-.101-.544-.192-.817-.285a8.978 8.978 0 0 1-.094 1.614c-.04.242-.092.471-.138.707a.485.485 0 0 1-.024.125 19.471 19.471 0 0 1-1.033 3.513l.033-.02.897-.537c.193-.137.599-.122.815.1a.645.645 0 0 1 .173.577.743.743 0 0 1-.053.159c-.061.135-.319.706-.866 1.906-.675 1.483-2.06 1.77-2.121 1.782.001.001-.907.214-1.879.44C15.458 23.419 13.87 24 12.087 24c-1.84 0-3.448-.58-4.787-1.713l-1.924-.45c-.041-.008-1.427-.294-2.103-1.778l-.87-1.914c-.005-.019-.05-.158-.053-.177-.009-.625.621-.914 1.023-.632l.858.512c.006.003.074.043.171.085a20.443 20.443 0 0 1-.982-3.444c-.063-.317-.129-.63-.183-.96a8.937 8.937 0 0 1-.09-1.7c-.357.118-.713.24-1.066.372-.292.109-.593.087-.827-.062a.802.802 0 0 1-.366-.621L.695 9.055c-.036-.475.305-.969.794-1.152l.3-.117c.225-.089.505-.198.837-.318C3.65 3.124 7.566 0 12.041 0c4.516 0 8.438 3.158 9.434 7.549.472.153.843.281 1.036.355.492.183.833.677.793 1.152zm-4.612 8.973c.369-.815.678-1.708.93-2.67l-.997.713a.952.952 0 0 1-.655.166l-4.467-.47a.96.96 0 0 1-.821-.698l-.558-1.923a2.482 2.482 0 0 0-.244 0l-.56 1.93a.955.955 0 0 1-.82.691l-4.471.471a.951.951 0 0 1-.642-.162l-.723-.503c.231.889.506 1.708.824 2.451.609-.028 1.207-.069 1.209-.069.001 0 .434-.039.788-.332l1.061-.885c.148-.165.652-.465 1.33-.271.196.055.495.146.815.243.062.019.12.05.17.092.532.445 1.832.445 2.365.002a.481.481 0 0 1 .168-.091c.337-.103.631-.192.823-.247.68-.193 1.182.108 1.374.314l1.016.843c.353.294.785.332.789.332-.001.001.658.045 1.296.073zm-6.605 5.001a6.42 6.42 0 0 0 1.949-.313c-.932-.209-1.555-1.019-1.588-1.062l-.406-.542-.407.543c-.031.043-.641.842-1.558 1.06.63.196 1.295.314 2.01.314zm6.941-4.016c-.529.035-1.1.066-1.701-.089a2.519 2.519 0 0 1-1.339-.554l-1.065-.888c-.055-.051-.187-.152-.442-.083-.176.05-.436.13-.717.216-.878.655-2.567.655-3.443-.003a43.693 43.693 0 0 0-.709-.212c-.258-.076-.386.03-.411.052l-1.097.918a2.523 2.523 0 0 1-1.341.553s-.872.059-1.594.085h-.002l-.106.004a2.41 2.41 0 0 1-1.341-.343l-.018-.01.453.996c.463 1.017 1.389 1.225 1.427 1.232.014.004 2.754.646 3.822.889.781.174 1.447-.696 1.454-.705l.795-1.061c.183-.245.594-.245.776 0l.796 1.061c.007.009.682.881 1.455.705 1.067-.243 3.807-.886 3.807-.886a2.193 2.193 0 0 0 1.442-1.236l.452-.993-.026.015a2.27 2.27 0 0 1-1.327.337zm1.096-7.412a28.286 28.286 0 0 0-15.998-.075 8.025 8.025 0 0 0 .067 1.845c.045.275.1.535.152.8l1.591 1.108 4.461-.476.642-2.243a.488.488 0 0 1 .395-.345 3.855 3.855 0 0 1 1.135.003.482.482 0 0 1 .394.344l.652 2.245 4.462.468 1.864-1.336c.036-.19.079-.374.111-.568a7.89 7.89 0 0 0 .072-1.77zm2.214-2.623c-.005-.034-.073-.133-.165-.167l-.004-.001c-.22-.083-.68-.242-1.256-.423l-.007-.005c-.955-.299-2.771-.823-4.267-.99a.485.485 0 0 1 .108-.964c1.192.134 2.529.466 3.637.787C19.298 3.552 15.913.97 12.041.97c-3.832 0-7.207 2.549-8.318 6.165a20.252 20.252 0 0 1 3.27-.705.484.484 0 1 1 .121.962 19.235 19.235 0 0 0-3.909.899l-.005.004c-.432.149-.785.288-1.056.394l-.315.123c-.094.035-.162.135-.167.175l.177 2.264a29.36 29.36 0 0 1 10.164-1.817c3.442 0 6.881.607 10.157 1.82l.178-2.275zm-8.534-5.986h-3.539a.485.485 0 0 0-.485.485v.811a.485.485 0 1 0 .97 0v-.326h.746v3.308h-.521a.485.485 0 1 0 0 .97h2.061a.485.485 0 1 0 0-.97h-.57V3.963h.853v.326a.485.485 0 1 0 .97 0v-.811a.485.485 0 0 0-.485-.485z" />
              </svg>
              <span class="text-sm font-medium text-text">Travis CI</span>
            </div>
            <div class="flex items-center gap-3 text-muted">
              <svg class="h-9 w-9" viewBox="0 0 24 24" fill="#60a5fa">
                <path d="M8.963 12c0-1.584 1.284-2.855 2.855-2.855 1.572 0 2.856 1.284 2.856 2.855 0 1.572-1.284 2.856-2.856 2.856-1.57 0-2.855-1.284-2.855-2.856zm2.855-12C6.215 0 1.522 3.84.19 9.025c-.01.036-.01.07-.01.12 0 .313.252.576.575.576H5.59c.23 0 .433-.13.517-.333.997-2.16 3.18-3.672 5.712-3.672 3.466 0 6.286 2.82 6.286 6.287 0 3.47-2.82 6.29-6.29 6.29-2.53 0-4.714-1.5-5.71-3.673-.097-.19-.29-.336-.517-.336H.755c-.312 0-.575.253-.575.576 0 .037.014.072.014.12C1.514 20.16 6.214 24 11.818 24c6.624 0 12-5.375 12-12 0-6.623-5.376-12-12-12z" />
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
