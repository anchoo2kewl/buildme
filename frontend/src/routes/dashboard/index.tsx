import { component$ } from "@builder.io/qwik";

export default component$(() => {
  return (
    <div>
      {/* ── Page top bar ── */}
      <div class="page-top">
        <div class="breadcrumb">
          workspace <span>/</span> <b>overview</b>
        </div>
        <div class="page-top-actions">
          <div class="search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input type="text" placeholder="Search builds, projects..." />
            <span class="kbd">/</span>
          </div>
          <button class="btn btn-outline">Add provider</button>
          <button class="btn btn-primary">New project</button>
        </div>
      </div>

      {/* ── Greeting ── */}
      <div class="greet">
        <div>
          <h1>Overview <em>&middot; 147 builds in the last 24h</em></h1>
          <div class="sub-row">
            <span class="liveping">
              <span class="d"></span>
              Live &middot; WebSocket connected
            </span>
            <span>Last synced 2m ago</span>
          </div>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div class="filter-bar">
        <span class="fchip active">All providers</span>
        <span class="fchip">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
          GitHub Actions &middot; 98
        </span>
        <span class="fchip">Travis CI &middot; 14</span>
        <span class="fchip">CircleCI &middot; 35</span>
        <span style={{ flex: 1 }}></span>
        <span class="fchip">prod</span>
        <span class="fchip">branch:main</span>
        <span class="fchip active">last 24h</span>
      </div>

      {/* ── KPIs ── */}
      <div class="kpis">
        <div class="kpi">
          <div class="kpi-label">
            Build success rate
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></svg>
          </div>
          <div class="kpi-value">
            94.2%
            <span class="kpi-delta">+1.2%</span>
          </div>
          <div class="kpi-spark">
            <svg width="100%" height="26" viewBox="0 0 120 26" preserveAspectRatio="none">
              <polyline points="0,20 10,18 20,15 30,16 40,12 50,10 60,14 70,8 80,6 90,9 100,5 110,4 120,3" fill="none" stroke="var(--accent)" stroke-width="1.5" />
            </svg>
          </div>
          <div class="kpi-foot">vs 93.0% last week</div>
        </div>

        <div class="kpi">
          <div class="kpi-label">
            Running now
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
          </div>
          <div class="kpi-value">
            4
            <span class="kpi-delta warn">2 queued</span>
          </div>
          <div class="kpi-spark">
            <svg width="100%" height="26" viewBox="0 0 120 26" preserveAspectRatio="none">
              <polyline points="0,22 10,20 20,18 30,22 40,14 50,10 60,16 70,12 80,8 90,14 100,10 110,6 120,8" fill="none" stroke="var(--info)" stroke-width="1.5" />
            </svg>
          </div>
          <div class="kpi-foot">peak 12 at 14:30</div>
        </div>

        <div class="kpi">
          <div class="kpi-label">
            Avg duration
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
          </div>
          <div class="kpi-value">
            1m 24s
            <span class="kpi-delta down">+8s</span>
          </div>
          <div class="kpi-spark">
            <svg width="100%" height="26" viewBox="0 0 120 26" preserveAspectRatio="none">
              <polyline points="0,8 10,10 20,12 30,9 40,14 50,16 60,12 70,18 80,15 90,13 100,16 110,14 120,15" fill="none" stroke="var(--warn)" stroke-width="1.5" />
            </svg>
          </div>
          <div class="kpi-foot">p95 = 3m 42s</div>
        </div>

        <div class="kpi">
          <div class="kpi-label">
            Open incidents
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
          </div>
          <div class="kpi-value">
            3
            <span class="kpi-delta down">+1</span>
          </div>
          <div class="kpi-spark">
            <svg width="100%" height="26" viewBox="0 0 120 26" preserveAspectRatio="none">
              <polyline points="0,18 10,16 20,20 30,14 40,18 50,12 60,16 70,10 80,14 90,8 100,12 110,10 120,8" fill="none" stroke="var(--danger)" stroke-width="1.5" />
            </svg>
          </div>
          <div class="kpi-foot">1 critical, 2 warning</div>
        </div>

        <div class="kpi">
          <div class="kpi-label">
            Drift detected
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" /></svg>
          </div>
          <div class="kpi-value">
            2
            <span class="kpi-delta warn">envs</span>
          </div>
          <div class="kpi-spark">
            <svg width="100%" height="26" viewBox="0 0 120 26" preserveAspectRatio="none">
              <polyline points="0,14 10,12 20,16 30,10 40,8 50,12 60,6 70,10 80,4 90,8 100,6 110,4 120,6" fill="none" stroke="var(--warn)" stroke-width="1.5" />
            </svg>
          </div>
          <div class="kpi-foot">api-service, worker</div>
        </div>
      </div>

      {/* ── Two-column layout ── */}
      <div class="two-col">
        {/* ── Left column ── */}
        <div>
          {/* Build stream panel */}
          <div class="panel">
            <div class="panel-head">
              <h3>
                Build stream
                <span class="cnt">147</span>
              </h3>
              <div class="tools">
                <span class="tab" aria-selected="true">All</span>
                <span class="tab">Running</span>
                <span class="tab">Failed</span>
              </div>
            </div>
            <div class="panel-body p0">
              <div class="b-table">
                <div class="brow head">
                  <span></span>
                  <span>Build</span>
                  <span>Branch</span>
                  <span>Provider</span>
                  <span>Duration</span>
                  <span>When</span>
                  <span>Trigger</span>
                  <span></span>
                </div>

                {/* Row 1 - success */}
                <div class="brow">
                  <div class="ico ok">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  </div>
                  <div class="b-name">
                    <div>
                      <b>api-service</b>
                      <small>#2847 &middot; deploy pipeline</small>
                    </div>
                  </div>
                  <div class="b-branch">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="3" x2="6" y2="15" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M18 9a9 9 0 0 1-9 9" /></svg>
                    main <span class="sha">a3f8c21</span>
                  </div>
                  <div class="prov gh">GH</div>
                  <div class="b-dur">1m 12s</div>
                  <div class="b-when">2m ago</div>
                  <div><span class="pill ok">push</span></div>
                  <button class="icon-btn">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                  </button>
                </div>

                {/* Row 2 - running */}
                <div class="brow">
                  <div class="ico run">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                  </div>
                  <div class="b-name">
                    <div>
                      <b>frontend</b>
                      <small>#1204 &middot; test + build</small>
                    </div>
                  </div>
                  <div class="b-branch">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="3" x2="6" y2="15" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M18 9a9 9 0 0 1-9 9" /></svg>
                    feat/dark-mode <span class="sha">e91b4f0</span>
                  </div>
                  <div class="prov gh">GH</div>
                  <div class="b-dur" style={{ color: "var(--info)" }}>42s...</div>
                  <div class="b-when">just now</div>
                  <div><span class="pill run">push</span></div>
                  <button class="icon-btn">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                  </button>
                </div>

                {/* Row 3 - failure */}
                <div class="brow">
                  <div class="ico fail">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </div>
                  <div class="b-name">
                    <div>
                      <b>worker</b>
                      <small>#892 &middot; cargo test</small>
                    </div>
                  </div>
                  <div class="b-branch">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="3" x2="6" y2="15" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M18 9a9 9 0 0 1-9 9" /></svg>
                    main <span class="sha">7d2e1a9</span>
                  </div>
                  <div class="prov tv">TV</div>
                  <div class="b-dur">2m 38s</div>
                  <div class="b-when">14m ago</div>
                  <div><span class="pill fail">push</span></div>
                  <button class="icon-btn">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                  </button>
                </div>

                {/* Row 4 - success */}
                <div class="brow">
                  <div class="ico ok">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  </div>
                  <div class="b-name">
                    <div>
                      <b>docs-site</b>
                      <small>#421 &middot; build + deploy</small>
                    </div>
                  </div>
                  <div class="b-branch">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="3" x2="6" y2="15" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M18 9a9 9 0 0 1-9 9" /></svg>
                    main <span class="sha">b4c09e3</span>
                  </div>
                  <div class="prov cc">CC</div>
                  <div class="b-dur">48s</div>
                  <div class="b-when">23m ago</div>
                  <div><span class="pill ok">push</span></div>
                  <button class="icon-btn">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                  </button>
                </div>

                {/* Row 5 - queued */}
                <div class="brow">
                  <div class="ico queue">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                  </div>
                  <div class="b-name">
                    <div>
                      <b>mobile-ios</b>
                      <small>#156 &middot; xcode build</small>
                    </div>
                  </div>
                  <div class="b-branch">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="3" x2="6" y2="15" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M18 9a9 9 0 0 1-9 9" /></svg>
                    release/2.1 <span class="sha">f0a3b78</span>
                  </div>
                  <div class="prov gh">GH</div>
                  <div class="b-dur" style={{ color: "var(--text-3)" }}>queued</div>
                  <div class="b-when">1m ago</div>
                  <div><span class="pill plain">tag</span></div>
                  <button class="icon-btn">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                  </button>
                </div>

                {/* Row 6 - success */}
                <div class="brow">
                  <div class="ico ok">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  </div>
                  <div class="b-name">
                    <div>
                      <b>api-service</b>
                      <small>#2846 &middot; test suite</small>
                    </div>
                  </div>
                  <div class="b-branch">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="3" x2="6" y2="15" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M18 9a9 9 0 0 1-9 9" /></svg>
                    fix/auth-flow <span class="sha">c28d1e7</span>
                  </div>
                  <div class="prov gh">GH</div>
                  <div class="b-dur">1m 44s</div>
                  <div class="b-when">38m ago</div>
                  <div><span class="pill ok">PR</span></div>
                  <button class="icon-btn">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                  </button>
                </div>

                {/* Row 7 - running */}
                <div class="brow">
                  <div class="ico run">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                  </div>
                  <div class="b-name">
                    <div>
                      <b>worker</b>
                      <small>#893 &middot; integration tests</small>
                    </div>
                  </div>
                  <div class="b-branch">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="3" x2="6" y2="15" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M18 9a9 9 0 0 1-9 9" /></svg>
                    main <span class="sha">0e4f2d1</span>
                  </div>
                  <div class="prov tv">TV</div>
                  <div class="b-dur" style={{ color: "var(--info)" }}>1m 08s...</div>
                  <div class="b-when">1m ago</div>
                  <div><span class="pill run">push</span></div>
                  <button class="icon-btn">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Hosts panel */}
          <div class="panel">
            <div class="panel-head">
              <h3>
                Hosts
                <span class="cnt">5</span>
              </h3>
              <div class="tools">
                <span class="tab" aria-selected="true">Overview</span>
                <span class="tab">Metrics</span>
              </div>
            </div>
            <div class="panel-body p0">
              <div class="hosts">
                <div class="hrow head">
                  <span>Host</span>
                  <span>CPU</span>
                  <span>Memory</span>
                  <span>Disk</span>
                  <span>Uptime</span>
                  <span>Status</span>
                </div>

                <div class="hrow">
                  <div class="h-name">
                    <span class="h-led on"></span>
                    <div>
                      <b>prod-api-1</b>
                      <small>172.31.4.12</small>
                    </div>
                  </div>
                  <div class="metric-cell">
                    <div class="mtop"><span>CPU</span> <b>34%</b></div>
                    <div class="track"><div style={{ width: "34%" }}></div></div>
                  </div>
                  <div class="metric-cell">
                    <div class="mtop"><span>MEM</span> <b>68%</b></div>
                    <div class="track"><div style={{ width: "68%" }}></div></div>
                  </div>
                  <div class="metric-cell">
                    <div class="mtop"><span>DISK</span> <b>42%</b></div>
                    <div class="track"><div style={{ width: "42%" }}></div></div>
                  </div>
                  <div class="b-dur">14d 6h</div>
                  <div><span class="pill ok">healthy</span></div>
                </div>

                <div class="hrow">
                  <div class="h-name">
                    <span class="h-led on"></span>
                    <div>
                      <b>prod-api-2</b>
                      <small>172.31.4.13</small>
                    </div>
                  </div>
                  <div class="metric-cell">
                    <div class="mtop"><span>CPU</span> <b>28%</b></div>
                    <div class="track"><div style={{ width: "28%" }}></div></div>
                  </div>
                  <div class="metric-cell">
                    <div class="mtop"><span>MEM</span> <b>55%</b></div>
                    <div class="track"><div style={{ width: "55%" }}></div></div>
                  </div>
                  <div class="metric-cell">
                    <div class="mtop"><span>DISK</span> <b>39%</b></div>
                    <div class="track"><div style={{ width: "39%" }}></div></div>
                  </div>
                  <div class="b-dur">14d 6h</div>
                  <div><span class="pill ok">healthy</span></div>
                </div>

                <div class="hrow">
                  <div class="h-name">
                    <span class="h-led warn"></span>
                    <div>
                      <b>worker-1</b>
                      <small>172.31.5.20</small>
                    </div>
                  </div>
                  <div class="metric-cell warn">
                    <div class="mtop"><span>CPU</span> <b>82%</b></div>
                    <div class="track"><div style={{ width: "82%" }}></div></div>
                  </div>
                  <div class="metric-cell warn">
                    <div class="mtop"><span>MEM</span> <b>78%</b></div>
                    <div class="track"><div style={{ width: "78%" }}></div></div>
                  </div>
                  <div class="metric-cell">
                    <div class="mtop"><span>DISK</span> <b>61%</b></div>
                    <div class="track"><div style={{ width: "61%" }}></div></div>
                  </div>
                  <div class="b-dur">7d 12h</div>
                  <div><span class="pill warn">warning</span></div>
                </div>

                <div class="hrow">
                  <div class="h-name">
                    <span class="h-led on"></span>
                    <div>
                      <b>staging-1</b>
                      <small>172.31.6.8</small>
                    </div>
                  </div>
                  <div class="metric-cell">
                    <div class="mtop"><span>CPU</span> <b>12%</b></div>
                    <div class="track"><div style={{ width: "12%" }}></div></div>
                  </div>
                  <div class="metric-cell">
                    <div class="mtop"><span>MEM</span> <b>41%</b></div>
                    <div class="track"><div style={{ width: "41%" }}></div></div>
                  </div>
                  <div class="metric-cell">
                    <div class="mtop"><span>DISK</span> <b>28%</b></div>
                    <div class="track"><div style={{ width: "28%" }}></div></div>
                  </div>
                  <div class="b-dur">21d 3h</div>
                  <div><span class="pill ok">healthy</span></div>
                </div>

                <div class="hrow">
                  <div class="h-name">
                    <span class="h-led off"></span>
                    <div>
                      <b>build-runner-3</b>
                      <small>172.31.7.15</small>
                    </div>
                  </div>
                  <div class="metric-cell">
                    <div class="mtop"><span>CPU</span> <b>--</b></div>
                    <div class="track"><div style={{ width: "0%" }}></div></div>
                  </div>
                  <div class="metric-cell">
                    <div class="mtop"><span>MEM</span> <b>--</b></div>
                    <div class="track"><div style={{ width: "0%" }}></div></div>
                  </div>
                  <div class="metric-cell">
                    <div class="mtop"><span>DISK</span> <b>--</b></div>
                    <div class="track"><div style={{ width: "0%" }}></div></div>
                  </div>
                  <div class="b-dur">--</div>
                  <div><span class="pill fail">offline</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right column ── */}
        <div>
          {/* Incidents panel */}
          <div class="panel">
            <div class="panel-head">
              <h3>
                Incidents
                <span class="cnt">3 open</span>
              </h3>
              <a href="/dashboard/incidents" class="btn btn-ghost" style={{ fontSize: "12px", padding: "4px 8px" }}>View all</a>
            </div>
            <div class="panel-body p0">
              <div class="ifeed">
                <div class="iitem">
                  <span class="mark active"></span>
                  <div class="body">
                    <b>Memory threshold exceeded</b>
                    <div class="meta">worker &middot; production &middot; 82% &gt; 80%</div>
                  </div>
                  <span class="time">4m ago</span>
                </div>
                <div class="iitem">
                  <span class="mark active"></span>
                  <div class="body">
                    <b>Build failure rate spike</b>
                    <div class="meta">api-service &middot; main branch &middot; 3 consecutive failures</div>
                  </div>
                  <span class="time">18m ago</span>
                </div>
                <div class="iitem">
                  <span class="mark warning"></span>
                  <div class="body">
                    <b>High response latency</b>
                    <div class="meta">frontend &middot; staging &middot; p95 &gt; 800ms</div>
                  </div>
                  <span class="time">1h ago</span>
                </div>
                <div class="iitem">
                  <span class="mark resolved"></span>
                  <div class="body">
                    <b>Disk usage warning</b>
                    <div class="meta">prod-api-1 &middot; resolved automatically</div>
                  </div>
                  <span class="time">3h ago</span>
                </div>
                <div class="iitem">
                  <span class="mark resolved"></span>
                  <div class="body">
                    <b>Health check timeout</b>
                    <div class="meta">docs-site &middot; production &middot; recovered after 2m</div>
                  </div>
                  <span class="time">6h ago</span>
                </div>
              </div>
            </div>
          </div>

          {/* Probe regions panel */}
          <div class="panel">
            <div class="panel-head">
              <h3>
                Probe regions
                <span class="cnt">5</span>
              </h3>
              <div><span class="pill ok">4/5 connected</span></div>
            </div>
            <div class="panel-body p0">
              <div class="probe-list">
                <div class="prow">
                  <span class="led on"></span>
                  <div class="name">
                    <b>us-east-1</b>
                    <small>N. Virginia</small>
                  </div>
                  <span class="lat">12ms</span>
                  <span class="up">up 14d</span>
                </div>
                <div class="prow">
                  <span class="led on"></span>
                  <div class="name">
                    <b>eu-west-1</b>
                    <small>Ireland</small>
                  </div>
                  <span class="lat">34ms</span>
                  <span class="up">up 14d</span>
                </div>
                <div class="prow">
                  <span class="led on"></span>
                  <div class="name">
                    <b>ap-south-1</b>
                    <small>Mumbai</small>
                  </div>
                  <span class="lat">89ms</span>
                  <span class="up">up 7d</span>
                </div>
                <div class="prow">
                  <span class="led on"></span>
                  <div class="name">
                    <b>us-west-2</b>
                    <small>Oregon</small>
                  </div>
                  <span class="lat">28ms</span>
                  <span class="up">up 21d</span>
                </div>
                <div class="prow">
                  <span class="led" style={{ background: "var(--text-3)" }}></span>
                  <div class="name">
                    <b>ap-northeast-1</b>
                    <small>Tokyo</small>
                  </div>
                  <span class="lat" style={{ color: "var(--text-3)" }}>--</span>
                  <span class="lat" style={{ color: "var(--danger)", fontSize: "11px", fontFamily: "var(--mono)" }}>offline</span>
                </div>
              </div>
            </div>
          </div>

          {/* Environment drift panel */}
          <div class="panel">
            <div class="panel-head">
              <h3>
                Environment drift
                <span class="cnt">2</span>
              </h3>
            </div>
            <div class="drift-panel">
              <div class="drift-item">
                <div class="di-top">
                  <b>api-service</b>
                  <span class="dtag">3 commits behind</span>
                </div>
                <div class="di-grid">
                  <div>
                    <small>Production</small>
                    <span>a3f8c21</span>
                  </div>
                  <div>
                    <small>HEAD</small>
                    <span>e7b2d04</span>
                  </div>
                </div>
              </div>

              <div class="drift-item">
                <div class="di-top">
                  <b>worker</b>
                  <span class="dtag">1 commit behind</span>
                </div>
                <div class="di-grid">
                  <div>
                    <small>Production</small>
                    <span>7d2e1a9</span>
                  </div>
                  <div>
                    <small>HEAD</small>
                    <span>0e4f2d1</span>
                  </div>
                </div>
              </div>

              <div class="drift-item">
                <div class="di-top">
                  <b>frontend</b>
                  <span class="dtag ok">in sync</span>
                </div>
                <div class="di-grid">
                  <div>
                    <small>Production</small>
                    <span>b91c4e2</span>
                  </div>
                  <div>
                    <small>HEAD</small>
                    <span>b91c4e2</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* MCP activity panel */}
          <div class="panel">
            <div class="panel-head">
              <h3>
                MCP activity
                <span class="cnt">live</span>
              </h3>
              <a href="/dashboard/mcp" class="btn btn-ghost" style={{ fontSize: "12px", padding: "4px 8px" }}>Manage</a>
            </div>
            <div class="panel-body">
              <div class="logtail">
                <div class="l"><span class="ts">14:32:01</span> <span class="lv o">MCP</span> <span>tool_call fleet_status &rarr; 200 (12ms)</span></div>
                <div class="l"><span class="ts">14:31:48</span> <span class="lv i">INFO</span> <span>probe heartbeat us-east-1 connected</span></div>
                <div class="l"><span class="ts">14:31:22</span> <span class="lv o">MCP</span> <span>tool_call build_list project=api-service &rarr; 200</span></div>
                <div class="l"><span class="ts">14:30:55</span> <span class="lv w">WARN</span> <span>probe ap-northeast-1 missed 3 heartbeats</span></div>
                <div class="l"><span class="ts">14:30:12</span> <span class="lv o">MCP</span> <span>tool_call drift_check &rarr; 200 (34ms)</span></div>
                <div class="l"><span class="ts">14:29:44</span> <span class="lv i">INFO</span> <span>build #2847 api-service completed success</span></div>
                <div class="l"><span class="ts">14:29:01</span> <span class="lv o">MCP</span> <span>tool_call incident_list limit=10 &rarr; 200</span></div>
                <div class="l"><span class="ts">14:28:30</span> <span class="lv e">ERR</span> <span>probe tokyo health check timeout after 5s</span></div>
                <div class="l"><span class="ts">14:28:02</span> <span class="lv o">MCP</span> <span>tool_call host_metrics host=worker-1 &rarr; 200</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
