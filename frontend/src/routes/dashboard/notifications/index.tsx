import { component$ } from "@builder.io/qwik";

export default component$(() => {
  const channels = [
    {
      icon: "slack", name: "#deploys", type: "Slack", rule: "build.completed, deploy.*",
      delivered: 142, on: true, muted: false,
    },
    {
      icon: "slack", name: "#oncall-alerts", type: "Slack", rule: "incident.created, host.alert",
      delivered: 38, on: true, muted: false,
    },
    {
      icon: "email", name: "oncall@biswas.io", type: "Email", rule: "incident.created (P1 only)",
      delivered: 7, on: true, muted: false,
    },
    {
      icon: "webhook", name: "status-page", type: "Webhook", rule: "incident.*, probe.down",
      delivered: 89, on: true, muted: false,
    },
    {
      icon: "mobile", name: "iOS push", type: "Mobile", rule: "incident.created (P1, P2)",
      delivered: 12, on: true, muted: false,
    },
    {
      icon: "slack", name: "#experiments", type: "Slack", rule: "build.completed (exp/*)",
      delivered: 130, on: false, muted: true,
    },
  ];

  const events = [
    { name: "build.completed", count: 147 },
    { name: "incident.created", count: 3 },
    { name: "host.alert", count: 8 },
    { name: "probe.latency_warn", count: 12 },
    { name: "deploy.succeeded", count: 24 },
  ];

  const renderIcon = (type: string) => {
    switch (type) {
      case "slack":
        return (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3.5 8.5a1.5 1.5 0 1 1 0-3H5v1.5A1.5 1.5 0 0 1 3.5 8.5z" />
            <path d="M5 5.5A1.5 1.5 0 1 1 8 5.5V7H6.5A1.5 1.5 0 0 1 5 5.5z" />
            <path d="M10.5 5.5a1.5 1.5 0 1 1 0 3H9V7A1.5 1.5 0 0 1 10.5 5.5z" />
            <path d="M9 8.5A1.5 1.5 0 1 1 6 8.5V7h1.5A1.5 1.5 0 0 1 9 8.5z" />
          </svg>
        );
      case "email":
        return (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
            <rect x="1.5" y="3" width="11" height="8" rx="1" />
            <polyline points="1.5 4 7 8 12.5 4" />
          </svg>
        );
      case "webhook":
        return (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
            <path d="M7 1.5v4l3 2" />
            <circle cx="7" cy="7" r="5.5" />
          </svg>
        );
      case "mobile":
        return (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3.5" y="1" width="7" height="12" rx="1.5" />
            <line x1="7" y1="10.5" x2="7.01" y2="10.5" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div>
      <div class="page-top">
        <div class="breadcrumb">
          workspace <span>/</span> <b>notifications</b>
        </div>
        <div class="page-top-actions">
          <button class="btn btn-outline">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M10 4.5a3 3 0 1 0-6 0c0 3.5-1.5 4.5-1.5 4.5h9S10 8 10 4.5" /><path d="M5.5 9v.5a1.5 1.5 0 0 0 3 0V9" /></svg>
            Test all
          </button>
          <button class="btn btn-primary">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 1.5v11M1.5 7h11" /></svg>
            Add channel
          </button>
        </div>
      </div>

      <div class="greet">
        <div>
          <h1>Notification channels <em>· 6 configured · 418 delivered today</em></h1>
        </div>
      </div>

      <div class="sub-grid c2">
        {/* Left: Channels */}
        <div>
          <div class="panel">
            <div class="panel-head">
              <h3>Channels <span class="cnt">6</span></h3>
            </div>
            <div class="panel-body p0">
              {channels.map((ch) => (
                <div class="channel-row" key={ch.name}>
                  <div class="ch-ico">{renderIcon(ch.icon)}</div>
                  <div class="n">
                    <b>{ch.name}</b>
                    <small>{ch.type}{ch.muted ? " · muted" : ""}</small>
                  </div>
                  <div class="rule">{ch.rule}</div>
                  <div class="delivered">{ch.delivered} today</div>
                  <div class={`toggle ${ch.on ? "on" : ""}`}></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Events + Delivery health */}
        <div>
          <div class="panel">
            <div class="panel-head">
              <h3>Events routed <span class="cnt">today</span></h3>
            </div>
            <div class="panel-body">
              {events.map((ev) => (
                <div key={ev.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px dashed var(--line-soft)", fontSize: 13 }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{ev.name}</span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-3)" }}>{ev.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div class="panel">
            <div class="panel-head">
              <h3>Delivery health <span class="cnt">24h</span></h3>
            </div>
            <div class="panel-body">
              <svg viewBox="0 0 280 60" style={{ width: "100%", height: 60 }}>
                <rect x="0" y="55" width="280" height="1" fill="var(--line-soft)" />
                {/* Success rate line */}
                <polyline
                  fill="none"
                  stroke="var(--accent)"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  points="0,8 20,6 40,8 60,5 80,6 100,4 120,6 140,5 160,8 180,4 200,6 220,5 240,4 260,6 280,5"
                />
                {/* Failures (small bumps) */}
                <polyline
                  fill="none"
                  stroke="var(--danger)"
                  stroke-width="1"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  points="0,54 20,54 40,54 60,54 80,52 100,54 120,54 140,54 160,50 180,54 200,54 220,54 240,54 260,54 280,54"
                />
              </svg>
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-3)", marginTop: 6 }}>
                <span>24h ago</span>
                <span>99.4% delivered</span>
                <span>now</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
