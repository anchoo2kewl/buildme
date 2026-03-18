import { component$ } from "@builder.io/qwik";

export default component$(() => {
  return (
    <div
      class="min-h-screen"
      style={{
        background:
          "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(129,140,248,0.07), transparent), radial-gradient(ellipse 60% 40% at 80% 80%, rgba(52,211,153,0.04), transparent), var(--color-surface)",
      }}
    >
      {/* Nav */}
      <nav class="sticky top-0 z-50 border-b border-border bg-elevated/60 backdrop-blur-md">
        <div class="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span class="flex items-center gap-2 text-lg font-bold text-text">
            <svg class="h-5 w-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="14" y2="12" />
              <line x1="4" y1="18" x2="18" y2="18" />
            </svg>
            BuildMe
          </span>
          <div class="hidden items-center gap-8 text-sm text-muted sm:flex">
            <a href="#features" class="transition-colors hover:text-text">Features</a>
            <a href="#monitoring" class="transition-colors hover:text-text">Monitoring</a>
            <a href="#teams" class="transition-colors hover:text-text">Teams</a>
            <a href="#mcp" class="transition-colors hover:text-text">MCP</a>
          </div>
          <div class="flex items-center gap-3">
            <a href="/auth/login" class="text-sm text-muted transition-colors hover:text-text">
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
      <section class="mx-auto max-w-6xl px-6 pb-20 pt-24 text-center">
        <div class="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-sm text-accent">
          <span class="inline-block h-2 w-2 animate-pulse rounded-full bg-accent" />
          Build Management Platform
        </div>
        <h1 class="text-5xl font-extrabold leading-tight tracking-tight text-text sm:text-6xl lg:text-7xl">
          Complete visibility into<br />
          <span class="bg-gradient-to-r from-accent via-indigo-400 to-running bg-clip-text text-transparent">
            every build, host & team
          </span>
        </h1>
        <p class="mx-auto mt-6 max-w-2xl text-lg text-muted">
          BuildMe is a self-hosted build intelligence platform. Monitor CI/CD pipelines, track server
          health, manage incidents, coordinate teams — and let AI agents act on all of it through MCP.
        </p>
        <div class="mt-10 flex flex-wrap items-center justify-center gap-4">
          <a
            href="/auth/signup"
            class="rounded-lg bg-gradient-to-r from-accent to-indigo-400 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/30 transition-all hover:shadow-accent/50 hover:brightness-110"
          >
            Start Free
          </a>
          <a
            href="/auth/login"
            class="rounded-lg border border-border px-7 py-3 text-sm font-semibold text-text transition-colors hover:border-accent/50 hover:text-accent"
          >
            Sign In
          </a>
        </div>

        {/* Stats bar */}
        <div class="mx-auto mt-16 grid max-w-2xl grid-cols-3 gap-px overflow-hidden rounded-xl border border-border bg-border">
          {[
            { n: "3", label: "CI Providers" },
            { n: "5+", label: "Probe Regions" },
            { n: "∞", label: "Projects" },
          ].map(({ n, label }) => (
            <div key={label} class="bg-elevated px-6 py-5">
              <div class="text-2xl font-bold text-text">{n}</div>
              <div class="mt-0.5 text-xs text-muted">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CI Provider Logos */}
      <section class="border-y border-border bg-elevated/30 py-10">
        <div class="mx-auto max-w-6xl px-6 text-center">
          <p class="mb-6 text-xs font-semibold uppercase tracking-widest text-muted">
            Works with your CI providers
          </p>
          <div class="flex flex-wrap items-center justify-center gap-12">
            <div class="flex items-center gap-3 opacity-70 transition-opacity hover:opacity-100">
              <svg class="h-8 w-8 text-text" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              <span class="text-sm font-semibold text-text">GitHub Actions</span>
            </div>
            <div class="flex items-center gap-3 opacity-70 transition-opacity hover:opacity-100">
              <svg class="h-8 w-8" viewBox="0 0 24 24" fill="#3EAAAF">
                <path d="M9.32 13.025a.485.485 0 1 1-.97 0c0-.446-.167-.758-.406-.758-.239 0-.405.312-.405.758a.485.485 0 1 1-.97 0c0-1.187.713-1.728 1.375-1.728s1.376.541 1.376 1.728zm6.017.485a.485.485 0 0 0 .485-.485c0-.446.167-.758.405-.758s.405.312.405.758a.485.485 0 1 0 .97 0c0-1.187-.713-1.728-1.375-1.728s-1.375.541-1.375 1.728c0 .268.217.485.485.485zm7.967-4.454l-.191 2.459a.801.801 0 0 1-.367.623.852.852 0 0 1-.46.13 1.07 1.07 0 0 1-.366-.068c-.271-.101-.544-.192-.817-.285a8.978 8.978 0 0 1-.094 1.614c-.04.242-.092.471-.138.707a.485.485 0 0 1-.024.125 19.471 19.471 0 0 1-1.033 3.513l.033-.02.897-.537c.193-.137.599-.122.815.1a.645.645 0 0 1 .173.577.743.743 0 0 1-.053.159c-.061.135-.319.706-.866 1.906-.675 1.483-2.06 1.77-2.121 1.782.001.001-.907.214-1.879.44C15.458 23.419 13.87 24 12.087 24c-1.84 0-3.448-.58-4.787-1.713l-1.924-.45c-.041-.008-1.427-.294-2.103-1.778l-.87-1.914c-.005-.019-.05-.158-.053-.177-.009-.625.621-.914 1.023-.632l.858.512c.006.003.074.043.171.085a20.443 20.443 0 0 1-.982-3.444c-.063-.317-.129-.63-.183-.96a8.937 8.937 0 0 1-.09-1.7c-.357.118-.713.24-1.066.372-.292.109-.593.087-.827-.062a.802.802 0 0 1-.366-.621L.695 9.055c-.036-.475.305-.969.794-1.152l.3-.117c.225-.089.505-.198.837-.318C3.65 3.124 7.566 0 12.041 0c4.516 0 8.438 3.158 9.434 7.549.472.153.843.281 1.036.355.492.183.833.677.793 1.152zm-4.612 8.973c.369-.815.678-1.708.93-2.67l-.997.713a.952.952 0 0 1-.655.166l-4.467-.47a.96.96 0 0 1-.821-.698l-.558-1.923a2.482 2.482 0 0 0-.244 0l-.56 1.93a.955.955 0 0 1-.82.691l-4.471.471a.951.951 0 0 1-.642-.162l-.723-.503c.231.889.506 1.708.824 2.451.609-.028 1.207-.069 1.209-.069.001 0 .434-.039.788-.332l1.061-.885c.148-.165.652-.465 1.33-.271.196.055.495.146.815.243.062.019.12.05.17.092.532.445 1.832.445 2.365.002a.481.481 0 0 1 .168-.091c.337-.103.631-.192.823-.247.68-.193 1.182.108 1.374.314l1.016.843c.353.294.785.332.789.332-.001.001.658.045 1.296.073zm-6.605 5.001a6.42 6.42 0 0 0 1.949-.313c-.932-.209-1.555-1.019-1.588-1.062l-.406-.542-.407.543c-.031.043-.641.842-1.558 1.06.63.196 1.295.314 2.01.314zm6.941-4.016c-.529.035-1.1.066-1.701-.089a2.519 2.519 0 0 1-1.339-.554l-1.065-.888c-.055-.051-.187-.152-.442-.083-.176.05-.436.13-.717.216-.878.655-2.567.655-3.443-.003a43.693 43.693 0 0 0-.709-.212c-.258-.076-.386.03-.411.052l-1.097.918a2.523 2.523 0 0 1-1.341.553s-.872.059-1.594.085h-.002l-.106.004a2.41 2.41 0 0 1-1.341-.343l-.018-.01.453.996c.463 1.017 1.389 1.225 1.427 1.232.014.004 2.754.646 3.822.889.781.174 1.447-.696 1.454-.705l.795-1.061c.183-.245.594-.245.776 0l.796 1.061c.007.009.682.881 1.455.705 1.067-.243 3.807-.886 3.807-.886a2.193 2.193 0 0 0 1.442-1.236l.452-.993-.026.015a2.27 2.27 0 0 1-1.327.337zm1.096-7.412a28.286 28.286 0 0 0-15.998-.075 8.025 8.025 0 0 0 .067 1.845c.045.275.1.535.152.8l1.591 1.108 4.461-.476.642-2.243a.488.488 0 0 1 .395-.345 3.855 3.855 0 0 1 1.135.003.482.482 0 0 1 .394.344l.652 2.245 4.462.468 1.864-1.336c.036-.19.079-.374.111-.568a7.89 7.89 0 0 0 .072-1.77zm2.214-2.623c-.005-.034-.073-.133-.165-.167l-.004-.001c-.22-.083-.68-.242-1.256-.423l-.007-.005c-.955-.299-2.771-.823-4.267-.99a.485.485 0 0 1 .108-.964c1.192.134 2.529.466 3.637.787C19.298 3.552 15.913.97 12.041.97c-3.832 0-7.207 2.549-8.318 6.165a20.252 20.252 0 0 1 3.27-.705.484.484 0 1 1 .121.962 19.235 19.235 0 0 0-3.909.899l-.005.004c-.432.149-.785.288-1.056.394l-.315.123c-.094.035-.162.135-.167.175l.177 2.264a29.36 29.36 0 0 1 10.164-1.817c3.442 0 6.881.607 10.157 1.82l.178-2.275zm-8.534-5.986h-3.539a.485.485 0 0 0-.485.485v.811a.485.485 0 1 0 .97 0v-.326h.746v3.308h-.521a.485.485 0 1 0 0 .97h2.061a.485.485 0 1 0 0-.97h-.57V3.963h.853v.326a.485.485 0 1 0 .97 0v-.811a.485.485 0 0 0-.485-.485z" />
              </svg>
              <span class="text-sm font-semibold text-text">Travis CI</span>
            </div>
            <div class="flex items-center gap-3 opacity-70 transition-opacity hover:opacity-100">
              <svg class="h-8 w-8" viewBox="0 0 24 24" fill="#60a5fa">
                <path d="M8.963 12c0-1.584 1.284-2.855 2.855-2.855 1.572 0 2.856 1.284 2.856 2.855 0 1.572-1.284 2.856-2.856 2.856-1.57 0-2.855-1.284-2.855-2.856zm2.855-12C6.215 0 1.522 3.84.19 9.025c-.01.036-.01.07-.01.12 0 .313.252.576.575.576H5.59c.23 0 .433-.13.517-.333.997-2.16 3.18-3.672 5.712-3.672 3.466 0 6.286 2.82 6.286 6.287 0 3.47-2.82 6.29-6.29 6.29-2.53 0-4.714-1.5-5.71-3.673-.097-.19-.29-.336-.517-.336H.755c-.312 0-.575.253-.575.576 0 .037.014.072.014.12C1.514 20.16 6.214 24 11.818 24c6.624 0 12-5.375 12-12 0-6.623-5.376-12-12-12z" />
              </svg>
              <span class="text-sm font-semibold text-text">CircleCI</span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section id="features" class="mx-auto max-w-6xl px-6 py-24">
        <div class="mb-16 text-center">
          <p class="mb-3 text-sm font-semibold uppercase tracking-widest text-accent">Platform Features</p>
          <h2 class="text-3xl font-bold text-text sm:text-4xl">
            One platform. Everything covered.
          </h2>
          <p class="mx-auto mt-4 max-w-xl text-muted">
            From build pipelines to server health, incidents to team access control —
            BuildMe brings it all into a single self-hosted platform.
          </p>
        </div>
        <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            title="Unified CI Dashboard"
            desc="One view for GitHub Actions, Travis CI, and CircleCI. Filter by environment, branch, or status across all your repos."
            icon="grid"
            color="accent"
          />
          <FeatureCard
            title="Real-Time WebSocket"
            desc="Live build events pushed the moment they happen. No polling required — builds complete in front of you."
            icon="zap"
            color="running"
          />
          <FeatureCard
            title="Environment Drift Detection"
            desc="Compare deployed SHAs against branch heads. Instantly see when staging or production has fallen behind."
            icon="git"
            color="warning"
          />
          <FeatureCard
            title="Host & Server Monitoring"
            desc="Lightweight agent reports CPU, memory, disk, and custom metrics. Set thresholds, get alerts when anything spikes."
            icon="server"
            color="success"
          />
          <FeatureCard
            title="Incident Management"
            desc="Auto-detect, track, and resolve incidents. Full timeline, ignore controls, and cross-project incident feed."
            icon="alert"
            color="failure"
          />
          <FeatureCard
            title="Distributed Probes"
            desc="Multi-region health check agents verify uptime from Oregon, Frankfurt, Mumbai, and more. Global coverage."
            icon="globe"
            color="accent"
          />
          <FeatureCard
            title="Project Groups"
            desc="Organize projects into groups with visibility control and sort order. Perfect for multi-product portfolios."
            icon="folder"
            color="running"
          />
          <FeatureCard
            title="Notification Channels"
            desc="Route build and incident alerts to Slack, email, or custom webhooks per project. Never miss a failure."
            icon="bell"
            color="warning"
          />
          <FeatureCard
            title="Version Snapshots"
            desc="Track deployed versions over time. Full history of what was running in each environment and when."
            icon="clock"
            color="success"
          />
          <FeatureCard
            title="Team Collaboration"
            desc="Role-based access per project and group. Owners, admins, and viewers with invite-only onboarding."
            icon="users"
            color="accent"
          />
          <FeatureCard
            title="MCP Integration"
            desc="AI agents can query builds, cancel pipelines, and watch progress via the Model Context Protocol."
            icon="bot"
            color="running"
          />
          <FeatureCard
            title="Self-Hosted"
            desc="Single Go binary with embedded frontend and SQLite. Your server, your data, zero vendor lock-in."
            icon="lock"
            color="failure"
          />
        </div>
      </section>

      {/* Host Monitoring Section */}
      <section id="monitoring" class="border-t border-border bg-elevated/30 py-24">
        <div class="mx-auto max-w-6xl px-6">
          <div class="grid items-center gap-16 lg:grid-cols-2">
            <div>
              <p class="mb-3 text-sm font-semibold uppercase tracking-widest text-success">Host Monitoring</p>
              <h2 class="text-3xl font-bold text-text">
                Know your infrastructure is healthy
              </h2>
              <p class="mt-4 text-muted">
                Deploy a lightweight agent on any Linux server. It reports metrics every 30 seconds and
                BuildMe alerts you the moment a threshold is breached — before your users notice.
              </p>
              <ul class="mt-8 space-y-4">
                {[
                  { icon: "M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v10m0 0H5a2 2 0 00-2 2v4a2 2 0 002 2h4m0-6h10m0 0a2 2 0 012 2v4a2 2 0 01-2 2H9m10-6v6", label: "CPU, memory, disk metrics with configurable thresholds" },
                  { icon: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101", label: "Link hosts to projects to see which deploys live where" },
                  { icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9", label: "Alert on CPU spike, memory pressure, or disk full via notification channels" },
                  { icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z", label: "Historical metric charts to spot trends and capacity issues" },
                ].map(({ icon, label }) => (
                  <li key={label} class="flex items-start gap-3">
                    <div class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-success/15">
                      <svg class="h-3.5 w-3.5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d={icon} />
                      </svg>
                    </div>
                    <span class="text-sm text-muted">{label}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div class="overflow-hidden rounded-xl border border-border bg-elevated">
              <div class="flex items-center justify-between border-b border-border px-4 py-3">
                <div class="flex items-center gap-2">
                  <span class="h-2 w-2 rounded-full bg-success animate-pulse" />
                  <span class="text-xs font-medium text-text">prod-web-01</span>
                </div>
                <span class="rounded-full bg-success/15 px-2 py-0.5 text-xs text-success">online</span>
              </div>
              <div class="p-5 space-y-4">
                {[
                  { label: "CPU", val: 34, color: "bg-success" },
                  { label: "Memory", val: 72, color: "bg-warning" },
                  { label: "Disk", val: 58, color: "bg-accent" },
                ].map(({ label, val, color }) => (
                  <div key={label}>
                    <div class="mb-1.5 flex justify-between text-xs">
                      <span class="text-muted">{label}</span>
                      <span class="font-medium text-text">{val}%</span>
                    </div>
                    <div class="h-2 overflow-hidden rounded-full bg-surface">
                      <div class={`h-full rounded-full ${color}`} style={{ width: `${val}%` }} />
                    </div>
                  </div>
                ))}
                <div class="border-t border-border pt-3 space-y-2">
                  <div class="flex justify-between text-xs">
                    <span class="text-muted">Linked Projects</span>
                    <span class="text-text">api-service, worker</span>
                  </div>
                  <div class="flex justify-between text-xs">
                    <span class="text-muted">Last heartbeat</span>
                    <span class="text-success">12s ago</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Incidents Section */}
      <section class="mx-auto max-w-6xl px-6 py-24">
        <div class="grid items-center gap-16 lg:grid-cols-2">
          <div class="order-2 lg:order-1 overflow-hidden rounded-xl border border-border bg-elevated">
            <div class="border-b border-border px-4 py-3 flex items-center justify-between">
              <span class="text-xs font-semibold text-text">Recent Incidents</span>
              <span class="text-xs text-muted">2 active</span>
            </div>
            <div class="divide-y divide-border">
              {[
                { title: "High CPU on prod-web-01", project: "api-service", age: "4m ago", status: "active", color: "bg-failure" },
                { title: "Disk usage &gt; 90%", project: "worker", age: "11m ago", status: "active", color: "bg-warning" },
                { title: "Build failure spike", project: "frontend", age: "1h ago", status: "resolved", color: "bg-success" },
              ].map(({ title, project, age, status, color }) => (
                <div key={title} class="flex items-center justify-between px-4 py-3">
                  <div class="flex items-center gap-3">
                    <span class={`h-2 w-2 rounded-full ${color}`} />
                    <div>
                      <div class="text-sm text-text" dangerouslySetInnerHTML={title} />
                      <div class="text-xs text-muted">{project}</div>
                    </div>
                  </div>
                  <div class="text-right">
                    <div class={`text-xs font-medium ${status === "resolved" ? "text-success" : "text-failure"}`}>{status}</div>
                    <div class="text-xs text-muted">{age}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div class="order-1 lg:order-2">
            <p class="mb-3 text-sm font-semibold uppercase tracking-widest text-failure">Incident Management</p>
            <h2 class="text-3xl font-bold text-text">
              Catch problems before they escalate
            </h2>
            <p class="mt-4 text-muted">
              BuildMe automatically opens incidents when metrics breach thresholds or builds fail patterns,
              and auto-resolves them when conditions clear. Full audit trail included.
            </p>
            <ul class="mt-8 space-y-3">
              {[
                "Auto-detect and auto-resolve based on real-time conditions",
                "Cross-project incident feed — one place to triage everything",
                "Ignore false positives without losing the history",
                "Incidents linked to host metrics and CI build failures",
              ].map((item) => (
                <li key={item} class="flex items-start gap-2 text-sm text-muted">
                  <span class="mt-0.5 text-accent font-bold">+</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Teams Section */}
      <section id="teams" class="border-t border-border bg-elevated/30 py-24">
        <div class="mx-auto max-w-6xl px-6">
          <div class="grid items-center gap-16 lg:grid-cols-2">
            <div>
              <p class="mb-3 text-sm font-semibold uppercase tracking-widest text-accent">Teams & Access Control</p>
              <h2 class="text-3xl font-bold text-text">
                Built for teams of any size
              </h2>
              <p class="mt-4 text-muted">
                Fine-grained roles at both project and group level. Invite users via email with
                pre-filled signup links. Organize dozens of projects into groups with curated visibility.
              </p>
              <div class="mt-8 grid grid-cols-2 gap-4">
                {[
                  { title: "Project Groups", desc: "Organize projects with visibility and sort order. Each group has its own member roster." },
                  { title: "Role-Based Access", desc: "Owner, admin, and viewer roles scoped per project and per group independently." },
                  { title: "Email Invites", desc: "Send branded invite emails. Codes are pre-filled, emails pre-populated on the signup page." },
                  { title: "Invite-Only Signup", desc: "No open registration. Every user arrives via a tracked invite code with 7-day expiry." },
                ].map(({ title, desc }) => (
                  <div key={title} class="rounded-lg border border-border bg-elevated p-4">
                    <div class="mb-1.5 text-sm font-semibold text-text">{title}</div>
                    <div class="text-xs leading-relaxed text-muted">{desc}</div>
                  </div>
                ))}
              </div>
            </div>
            <div class="overflow-hidden rounded-xl border border-border bg-elevated">
              <div class="border-b border-border px-4 py-3">
                <span class="text-xs font-semibold text-text">Group: Production Platform</span>
              </div>
              <div class="divide-y divide-border">
                {[
                  { name: "Alice Chen", role: "owner", avatar: "AC", projects: 8 },
                  { name: "Bob Smith", role: "admin", avatar: "BS", projects: 6 },
                  { name: "Carol Davis", role: "viewer", avatar: "CD", projects: 4 },
                ].map(({ name, role, avatar, projects }) => (
                  <div key={name} class="flex items-center justify-between px-4 py-3">
                    <div class="flex items-center gap-3">
                      <div class="flex h-8 w-8 items-center justify-center rounded-full bg-accent/20 text-xs font-bold text-accent">
                        {avatar}
                      </div>
                      <div>
                        <div class="text-sm text-text">{name}</div>
                        <div class="text-xs text-muted">{projects} projects</div>
                      </div>
                    </div>
                    <span class={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      role === "owner" ? "bg-accent/15 text-accent" :
                      role === "admin" ? "bg-warning/15 text-warning" :
                      "bg-surface text-muted"
                    }`}>{role}</span>
                  </div>
                ))}
                <div class="px-4 py-3">
                  <div class="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted">
                    <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Invite via email...
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Notifications Section */}
      <section class="mx-auto max-w-6xl px-6 py-24">
        <div class="mb-16 text-center">
          <p class="mb-3 text-sm font-semibold uppercase tracking-widest text-warning">Notifications</p>
          <h2 class="text-3xl font-bold text-text">Alert the right people, the right way</h2>
          <p class="mx-auto mt-4 max-w-xl text-muted">
            Configure notification channels per project. Route build failures, deployment alerts, and incidents
            to Slack or email so on-call engineers are notified immediately.
          </p>
        </div>
        <div class="grid gap-5 sm:grid-cols-3">
          {[
            {
              icon: "M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z",
              title: "Slack",
              desc: "Post build results and incident alerts directly to your channels. Per-project webhook configuration.",
            },
            {
              icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
              title: "Email",
              desc: "Rich HTML alert emails via SMTP. Configurable per project, supports custom SMTP or platform defaults.",
            },
            {
              icon: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1",
              title: "Webhooks",
              desc: "Send structured JSON payloads to any endpoint. Integrate with PagerDuty, OpsGenie, or your own systems.",
            },
          ].map(({ icon, title, desc }) => (
            <div key={title} class="rounded-xl border border-border bg-elevated p-6">
              <div class="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-warning/10">
                <svg class="h-5 w-5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d={icon} />
                </svg>
              </div>
              <h3 class="font-semibold text-text">{title}</h3>
              <p class="mt-2 text-sm leading-relaxed text-muted">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Probes Section */}
      <section class="border-t border-border bg-elevated/30 py-24">
        <div class="mx-auto max-w-6xl px-6">
          <div class="grid items-center gap-16 lg:grid-cols-2">
            <div class="overflow-hidden rounded-xl border border-border bg-elevated">
              <div class="border-b border-border px-4 py-3">
                <span class="text-xs font-semibold text-text">Probe Regions</span>
              </div>
              <div class="divide-y divide-border">
                {[
                  { region: "us-west-2", location: "Oregon, USA", latency: "12ms", status: "online" },
                  { region: "eu-central-1", location: "Frankfurt, EU", latency: "8ms", status: "online" },
                  { region: "ap-south-1", location: "Mumbai, IN", latency: "31ms", status: "online" },
                  { region: "us-east-1", location: "Virginia, USA", latency: "5ms", status: "online" },
                  { region: "local", location: "Boston, USA", latency: "2ms", status: "online" },
                ].map(({ region, location, latency, status }) => (
                  <div key={region} class="flex items-center justify-between px-4 py-3">
                    <div class="flex items-center gap-3">
                      <span class="h-2 w-2 rounded-full bg-success animate-pulse" />
                      <div>
                        <div class="text-sm font-mono text-text">{region}</div>
                        <div class="text-xs text-muted">{location}</div>
                      </div>
                    </div>
                    <div class="text-right">
                      <div class="text-xs font-medium text-success">{status}</div>
                      <div class="text-xs text-muted">{latency}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p class="mb-3 text-sm font-semibold uppercase tracking-widest text-success">Distributed Probes</p>
              <h2 class="text-3xl font-bold text-text">
                Global health checks from every region
              </h2>
              <p class="mt-4 text-muted">
                Deploy lightweight probe agents in any region. Each probe independently checks your endpoints
                on a schedule and reports results back. Catch regional outages before they become global ones.
              </p>
              <ul class="mt-8 space-y-3">
                {[
                  "Docker-based probe agents — deploy anywhere in minutes",
                  "Assign monitors to specific regions for targeted coverage",
                  "Probes auto-update when a new version is available",
                  "Heartbeat monitoring — know if a probe itself goes down",
                ].map((item) => (
                  <li key={item} class="flex items-start gap-2 text-sm text-muted">
                    <span class="mt-0.5 text-success font-bold">+</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* MCP Section */}
      <section id="mcp" class="mx-auto max-w-6xl px-6 py-24">
        <div class="grid items-center gap-16 lg:grid-cols-2">
          <div>
            <div class="mb-4 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
              MCP Server
            </div>
            <h2 class="text-3xl font-bold text-text">
              AI-native build management
            </h2>
            <p class="mt-4 text-muted">
              The BuildMe MCP server exposes your entire platform to AI coding agents. Query builds,
              cancel runaway pipelines, inspect drift, and watch progress — all through natural language
              in your editor.
            </p>
            <ul class="mt-6 space-y-3">
              {[
                ["watch_builds", "adaptive 30s/5min polling with live state"],
                ["cancel_build", "stop running builds without leaving your editor"],
                ["restart_build", "re-trigger failed deploys instantly"],
                ["get_build_stats", "success rates, durations, and failure trends"],
                ["get_drift", "compare deployed versions to branch heads"],
              ].map(([cmd, desc]) => (
                <li key={cmd} class="flex items-start gap-2 text-sm text-muted">
                  <span class="mt-0.5 text-accent">+</span>
                  <span>
                    <code class="rounded bg-elevated px-1.5 py-0.5 text-xs text-text">{cmd}</code>
                    {" — "}{desc}
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
              <span class="ml-2 text-xs text-muted">~/.claude/settings.json</span>
            </div>
            <pre class="overflow-x-auto p-5 font-mono text-xs leading-relaxed text-muted">
              <code>{`{
  "mcpServers": {
    "buildme": {
      "url": "https://build.biswas.me/mcp",
      "headers": {
        "X-API-Key": "bm_••••••••"
      }
    }
  }
}`}</code>
            </pre>
            <div class="border-t border-border px-5 py-4 font-mono text-xs leading-relaxed">
              <div class="text-muted"><span class="text-accent">$</span> watch_builds</div>
              <div class="mt-1 text-success">  api-service/main · deploy · running · 42s</div>
              <div class="mt-0.5 text-running">  frontend/main · test · queued</div>
              <div class="mt-3 text-muted"><span class="text-accent">$</span> restart_build --project 2 --build 312</div>
              <div class="mt-1 text-success">  retrigger requested</div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section class="border-t border-border bg-elevated/30 py-24">
        <div class="mx-auto max-w-6xl px-6">
          <h2 class="mb-16 text-center text-3xl font-bold text-text">
            Up and running in minutes
          </h2>
          <div class="grid gap-10 sm:grid-cols-4">
            {[
              { step: "1", title: "Deploy", desc: "Run the single Go binary on your server. SQLite included, no database setup required." },
              { step: "2", title: "Connect", desc: "Add GitHub, Travis CI, or CircleCI providers with API tokens. Invite your team." },
              { step: "3", title: "Monitor", desc: "See all builds, hosts, and incidents in real time. Set thresholds and notification channels." },
              { step: "4", title: "Automate", desc: "Connect AI agents via MCP or use the REST API to automate your build workflows." },
            ].map(({ step, title, desc }) => (
              <div key={step} class="text-center">
                <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-accent to-running text-sm font-bold text-white shadow-lg shadow-accent/20">
                  {step}
                </div>
                <h3 class="font-semibold text-text">{title}</h3>
                <p class="mt-2 text-sm leading-relaxed text-muted">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section class="py-24">
        <div class="mx-auto max-w-2xl px-6 text-center">
          <h2 class="text-3xl font-bold text-text">
            Take control of your build platform
          </h2>
          <p class="mt-4 text-muted">
            Invite-only access. Self-hosted. Your infrastructure, your data.
          </p>
          <div class="mt-10 flex flex-wrap items-center justify-center gap-4">
            <a
              href="/auth/signup"
              class="rounded-lg bg-gradient-to-r from-accent to-indigo-400 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/30 transition-all hover:shadow-accent/50 hover:brightness-110"
            >
              Request Access
            </a>
            <a
              href="/auth/login"
              class="rounded-lg border border-border px-8 py-3 text-sm font-semibold text-text transition-colors hover:border-accent/50 hover:text-accent"
            >
              Sign In
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer class="border-t border-border px-6 py-10">
        <div class="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-xs text-muted sm:flex-row">
          <span class="flex items-center gap-2 font-semibold text-text">
            <svg class="h-4 w-4 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="14" y2="12" />
              <line x1="4" y1="18" x2="18" y2="18" />
            </svg>
            BuildMe
          </span>
          <span>Build Intelligence Platform &mdash; Self-hosted CI/CD &amp; Infrastructure Monitoring</span>
        </div>
      </footer>
    </div>
  );
});

// --- Sub-components ---

interface FeatureCardProps {
  title: string;
  desc: string;
  icon: string;
  color: "accent" | "success" | "failure" | "warning" | "running";
}

const ICONS: Record<string, string> = {
  grid: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z",
  zap: "M13 2L3 14h9l-1 10 10-12h-9l1-10z",
  git: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z",
  server: "M4 4h16v6H4V4zm0 10h16v6H4v-6zm2-7h.01M6 17h.01",
  alert: "M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z",
  globe: "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  folder: "M3 7a2 2 0 012-2h3.172a2 2 0 011.414.586l1.414 1.414A2 2 0 0012.414 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z",
  bell: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
  clock: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  users: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  bot: "M12 2a2 2 0 012 2v1h2a2 2 0 012 2v10a2 2 0 01-2 2H8a2 2 0 01-2-2V7a2 2 0 012-2h2V4a2 2 0 012-2zm-2 8a1 1 0 100 2 1 1 0 000-2zm4 0a1 1 0 100 2 1 1 0 000-2z",
  lock: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
};

const COLOR_MAP: Record<string, string> = {
  accent: "bg-accent/10 text-accent",
  success: "bg-success/10 text-success",
  failure: "bg-failure/10 text-failure",
  warning: "bg-warning/10 text-warning",
  running: "bg-running/10 text-running",
};

const FeatureCard = component$<FeatureCardProps>(({ title, desc, icon, color }) => {
  return (
    <div class="group rounded-xl border border-border bg-elevated p-6 transition-all hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5">
      <div class={`mb-4 flex h-11 w-11 items-center justify-center rounded-lg ${COLOR_MAP[color] || COLOR_MAP.accent}`}>
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d={ICONS[icon] || ICONS.grid} />
        </svg>
      </div>
      <h3 class="font-semibold text-text">{title}</h3>
      <p class="mt-2 text-sm leading-relaxed text-muted">{desc}</p>
    </div>
  );
});
