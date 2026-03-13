// BuildMe SPA — vanilla JS client-side router
(function() {
  'use strict';

  const API = '/api';
  const app = document.getElementById('app');

  // --- State ---
  let token = localStorage.getItem('buildme_token');
  let user = null;
  let ws = null;
  let wsReconnectTimer = null;

  // --- API helpers ---
  async function api(path, opts = {}) {
    const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const res = await fetch(API + path, { ...opts, headers });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw { status: res.status, message: data?.error || res.statusText };
    return data;
  }

  // --- Toast ---
  function toast(msg, type = 'error') {
    const el = document.createElement('div');
    el.className = 'toast toast-' + type;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }

  // --- Router ---
  const routes = {};
  function route(path, handler) { routes[path] = handler; }

  function navigate(path) {
    history.pushState(null, '', path);
    render();
  }

  function render() {
    const path = location.pathname;
    for (const [pattern, handler] of Object.entries(routes)) {
      const match = matchRoute(pattern, path);
      if (match) { handler(match); return; }
    }
    app.innerHTML = '<div class="auth-wrapper"><div class="card"><h2>404</h2><p class="text-muted mt-2">Page not found</p><a href="/" class="btn btn-primary mt-4">Go Home</a></div></div>';
  }

  function matchRoute(pattern, path) {
    const patternParts = pattern.split('/');
    const pathParts = path.split('/');
    if (patternParts.length !== pathParts.length) return null;
    const params = {};
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        params[patternParts[i].slice(1)] = pathParts[i];
      } else if (patternParts[i] !== pathParts[i]) {
        return null;
      }
    }
    return params;
  }

  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (a && a.getAttribute('href').startsWith('/') && !a.getAttribute('target')) {
      e.preventDefault();
      navigate(a.getAttribute('href'));
    }
  });
  window.addEventListener('popstate', render);

  // --- Auth helpers ---
  function setAuth(t, u) {
    token = t; user = u;
    localStorage.setItem('buildme_token', t);
  }

  function logout() {
    token = null; user = null;
    localStorage.removeItem('buildme_token');
    if (ws) { ws.close(); ws = null; }
    navigate('/');
  }

  async function loadUser() {
    if (!token) return null;
    try { user = await api('/me'); return user; }
    catch { logout(); return null; }
  }

  // --- Nav ---
  function navHTML(authed) {
    const logo = '<svg viewBox="0 0 32 32" width="28" height="28"><rect width="32" height="32" rx="6" fill="#6366f1"/><path d="M8 16l5 5 11-11" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    if (!authed) {
      return `<nav class="nav"><div class="nav-inner">
        <a href="/" class="nav-brand">${logo} BuildMe</a>
        <div class="nav-links"><a href="/login" class="btn btn-outline btn-sm">Log In</a></div>
      </div></nav>`;
    }
    const adminLink = user?.is_super_admin ? '<a href="/dashboard/admin" class="text-sm">Admin</a>' : '';
    return `<nav class="nav"><div class="nav-inner">
      <a href="/dashboard" class="nav-brand">${logo} BuildMe</a>
      <div class="nav-links">
        <a href="/dashboard" class="text-sm">Dashboard</a>
        <a href="/dashboard/projects" class="text-sm">Projects</a>
        <a href="/dashboard/invites" class="text-sm">Invites</a>
        ${adminLink}
        <span class="text-sm text-muted">${esc(user?.display_name || user?.email || '')}</span>
        <button class="btn btn-outline btn-sm" onclick="window.__logout()">Logout</button>
      </div>
    </div></nav>`;
  }
  window.__logout = logout;

  function esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }

  // --- Formatting helpers ---
  function statusClass(s) {
    if (s === 'success') return 'success';
    if (s === 'failure' || s === 'error') return 'failure';
    if (s === 'running') return 'running';
    if (s === 'queued') return 'queued';
    if (s === 'skipped') return 'cancelled';
    return 'cancelled';
  }

  function formatDuration(ms) {
    if (!ms) return '-';
    const s = Math.floor(ms / 1000);
    if (s < 60) return s + 's';
    const m = Math.floor(s / 60);
    const rem = s % 60;
    if (m < 60) return m + 'm ' + rem + 's';
    const h = Math.floor(m / 60);
    return h + 'h ' + (m % 60) + 'm';
  }

  function formatTime(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC';
  }

  function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function timeAgo(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff/60) + 'm ago';
    if (diff < 86400) return Math.floor(diff/3600) + 'h ago';
    return Math.floor(diff/86400) + 'd ago';
  }

  function runningElapsed(startedAt) {
    if (!startedAt) return '';
    const diff = (Date.now() - new Date(startedAt).getTime()) / 1000;
    const m = Math.floor(diff / 60);
    const s = Math.floor(diff % 60);
    return m + 'm ' + s + 's running';
  }

  // Branch to env mapping
  const envBranchMap = { production: 'production', staging: 'main', uat: 'uat' };
  const envLabels = { production: 'Production', staging: 'Staging', uat: 'UAT' };

  // --- Landing Page ---
  route('/', () => {
    if (token) { navigate('/dashboard'); return; }
    app.innerHTML = `
      ${navHTML(false)}
      <div class="hero">
        <h1>Monitor your <span>CI/CD</span> builds<br>in one place</h1>
        <p>Track GitHub Actions, Travis CI, and CircleCI pipelines with real-time updates, failure notifications, and team collaboration.</p>
        <div class="hero-actions">
          <a href="/login" class="btn btn-primary">Log In</a>
          <a href="/register" class="btn btn-outline">Register with Invite</a>
        </div>
      </div>
      <div class="container">
        <div class="features">
          <div class="card feature-card"><span class="feature-icon">&#9889;</span><h3>Real-time Updates</h3><p>WebSocket-powered live build status.</p></div>
          <div class="card feature-card"><span class="feature-icon">&#128268;</span><h3>Multi-Provider</h3><p>GitHub Actions, Travis CI, and CircleCI.</p></div>
          <div class="card feature-card"><span class="feature-icon">&#128276;</span><h3>Smart Notifications</h3><p>Email, webhook, or push on failures.</p></div>
          <div class="card feature-card"><span class="feature-icon">&#128101;</span><h3>Team Collaboration</h3><p>Role-based access for teams.</p></div>
          <div class="card feature-card"><span class="feature-icon">&#128295;</span><h3>Self-Hosted</h3><p>Single binary + SQLite.</p></div>
          <div class="card feature-card"><span class="feature-icon">&#127760;</span><h3>Open Source</h3><p>MIT licensed. Fork and customize.</p></div>
        </div>
      </div>`;
  });

  // --- Login ---
  route('/login', () => {
    if (token) { navigate('/dashboard'); return; }
    app.innerHTML = `
      ${navHTML(false)}
      <div class="auth-wrapper">
        <div class="auth-card">
          <h1 class="text-2xl font-bold">Welcome back</h1>
          <p class="text-muted text-sm">Log in to your BuildMe account</p>
          <form id="login-form">
            <div class="form-group"><label>Email</label><input type="email" class="form-input" name="email" required autocomplete="email" autofocus></div>
            <div class="form-group"><label>Password</label><input type="password" class="form-input" name="password" required autocomplete="current-password"></div>
            <button type="submit" class="btn btn-primary w-full mt-4">Log In</button>
          </form>
          <p class="text-center text-sm mt-4 text-muted">Have an invite? <a href="/register">Register</a></p>
        </div>
      </div>`;
    document.getElementById('login-form').onsubmit = async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try {
        const data = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email: fd.get('email'), password: fd.get('password') }) });
        setAuth(data.token, data.user);
        navigate('/dashboard');
      } catch (err) { toast(err.message); }
    };
  });

  // --- Register ---
  route('/register', () => {
    if (token) { navigate('/dashboard'); return; }
    const code = new URLSearchParams(location.search).get('code') || '';
    app.innerHTML = `
      ${navHTML(false)}
      <div class="auth-wrapper">
        <div class="auth-card">
          <h1 class="text-2xl font-bold">Create Account</h1>
          <p class="text-muted text-sm">Registration requires an invite code</p>
          <form id="register-form">
            <div class="form-group"><label>Invite Code</label><input type="text" class="form-input" name="invite_code" required value="${esc(code)}" placeholder="Paste your invite code"></div>
            <div class="form-group"><label>Display Name</label><input type="text" class="form-input" name="display_name" placeholder="Your name"></div>
            <div class="form-group"><label>Email</label><input type="email" class="form-input" name="email" required autocomplete="email"></div>
            <div class="form-group"><label>Password</label><input type="password" class="form-input" name="password" required autocomplete="new-password" minlength="8" placeholder="Min 8 characters"></div>
            <button type="submit" class="btn btn-primary w-full mt-4">Create Account</button>
          </form>
          <p class="text-center text-sm mt-4 text-muted">Already have an account? <a href="/login">Log in</a></p>
        </div>
      </div>`;
    document.getElementById('register-form').onsubmit = async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try {
        const data = await api('/auth/signup', { method: 'POST', body: JSON.stringify({
          email: fd.get('email'), password: fd.get('password'), display_name: fd.get('display_name'), invite_code: fd.get('invite_code')
        })});
        setAuth(data.token, data.user);
        toast('Account created!', 'success');
        navigate('/dashboard');
      } catch (err) { toast(err.message); }
    };
  });

  // --- Dashboard (rich, env-tabbed) ---
  route('/dashboard', async () => {
    if (!await requireAuth()) return;

    const savedEnv = localStorage.getItem('buildme_env') || 'production';

    app.innerHTML = navHTML(true) + `
      <div class="container">
        <div class="dash-header">
          <h1 class="text-2xl font-bold">Dashboard</h1>
          <div class="flex gap-2">
            <button class="btn btn-sync btn-sm" id="sync-btn" onclick="window.__syncAll()">Sync All</button>
          </div>
        </div>
        <div class="env-tabs" id="env-tabs">
          <button class="env-tab ${savedEnv==='production'?'active':''}" data-env="production">Production</button>
          <button class="env-tab ${savedEnv==='staging'?'active':''}" data-env="staging">Staging</button>
          <button class="env-tab ${savedEnv==='uat'?'active':''}" data-env="uat">UAT</button>
        </div>
        <div id="dash-content"><div class="text-center mt-8"><span class="spinner"></span> Loading dashboard...</div></div>
      </div>`;

    // Tab click handler
    document.getElementById('env-tabs').addEventListener('click', e => {
      const tab = e.target.closest('.env-tab');
      if (!tab) return;
      document.querySelectorAll('.env-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const env = tab.dataset.env;
      localStorage.setItem('buildme_env', env);
      renderDashboardTable(env);
    });

    // Sync all
    window.__syncAll = async () => {
      const btn = document.getElementById('sync-btn');
      if (!btn) return;
      btn.classList.add('syncing');
      btn.innerHTML = '<span class="spinner"></span> Syncing...';
      try {
        window.__dashData = await api('/sync', { method: 'POST' });
        const env = localStorage.getItem('buildme_env') || 'production';
        renderDashboardTable(env);
        toast('Synced!', 'success');
      } catch (err) { toast(err.message); }
      btn.classList.remove('syncing');
      btn.textContent = 'Sync All';
    };

    // Load dashboard data (from DB, fast)
    try {
      window.__dashData = await api('/dashboard');
      renderDashboardTable(savedEnv);
      // Load drift data asynchronously (health + deployed version)
      api('/drift').then(data => {
        window.__driftData = data;
        const env = localStorage.getItem('buildme_env') || 'production';
        renderDashboardTable(env);
      }).catch(() => {});
    } catch (err) {
      document.getElementById('dash-content').innerHTML = '<p class="text-muted">Failed to load dashboard.</p>';
      toast(err.message);
    }
  });

  function renderDashboardTable(env) {
    const data = window.__dashData;
    const content = document.getElementById('dash-content');
    if (!data || data.length === 0) {
      content.innerHTML = '<div class="empty-state mt-8"><p class="text-lg">No projects yet</p><p class="text-muted mt-2">Create your first project to start monitoring.</p><a href="/dashboard/projects/new" class="btn btn-primary mt-4">Create Project</a></div>';
      return;
    }

    const branch = envBranchMap[env] || 'production';
    const drift = window.__driftData || [];

    let rows = '';
    for (const entry of data) {
      const p = entry.project;
      const build = (entry.builds || []).find(b => b.branch === branch);
      const driftEntry = drift.find(d => d.project_id === p.id && d.env === env);

      // Health column
      let healthHTML = '<span class="text-muted drift-loading">...</span>';
      if (driftEntry) {
        if (driftEntry.health === 200) healthHTML = '<span class="badge badge-success">200</span>';
        else if (driftEntry.health > 0) healthHTML = '<span class="badge badge-failure">' + driftEntry.health + '</span>';
        else healthHTML = '<span class="text-muted">DOWN</span>';
      }

      if (!build) {
        rows += `<tr>
          <td><a href="/dashboard/projects/${p.id}" class="project-name">${esc(p.name)}</a></td>
          <td><span class="badge badge-cancelled">no build</span></td>
          <td>${healthHTML}</td>
          <td class="text-muted">-</td>
          <td class="text-muted">-</td>
          <td class="text-muted">-</td>
          <td class="text-muted">-</td>
          <td class="time-cell">-</td>
          <td></td>
        </tr>`;
        continue;
      }

      const sha = build.commit_sha ? build.commit_sha.substring(0, 7) : '-';
      const isRunning = build.status === 'running' || build.status === 'queued';
      const dur = isRunning ? runningElapsed(build.started_at) : formatDuration(build.duration_ms);
      const lastRan = build.started_at ? timeAgo(build.started_at) : '-';
      const commitMsg = build.commit_message || '-';
      const truncMsg = commitMsg.length > 40 ? commitMsg.substring(0, 40) + '...' : commitMsg;

      const progressHTML = isRunning ? '<div class="progress-bar"><div class="progress-bar-fill" style="width:60%"></div></div>' : '';

      // Deployed + Drift columns
      let deployedHTML = '<span class="text-muted drift-loading">...</span>';
      let driftHTML = '<span class="text-muted drift-loading">...</span>';
      if (driftEntry) {
        const dSha = driftEntry.deployed_sha;
        if (dSha) {
          deployedHTML = '<span class="commit-sha">' + esc(dSha.substring(0, 7)) + '</span>';
          if (build.commit_sha && build.commit_sha.substring(0, 7) === dSha.substring(0, 7)) {
            driftHTML = '<span class="badge badge-success">in sync</span>';
          } else {
            driftHTML = '<span class="badge badge-warning">behind</span>';
          }
        } else {
          deployedHTML = '<span class="text-muted">-</span>';
          driftHTML = '<span class="text-muted">-</span>';
        }
      }

      rows += `<tr>
        <td>
          <a href="/dashboard/projects/${p.id}" class="project-name">${esc(p.name)}</a>
          ${progressHTML}
        </td>
        <td><span class="badge badge-${statusClass(build.status)}">${esc(build.status)}</span></td>
        <td>${healthHTML}</td>
        <td><span class="commit-sha">${esc(sha)}</span></td>
        <td>${deployedHTML}</td>
        <td>${driftHTML}</td>
        <td class="text-sm" title="${esc(commitMsg)}">${esc(truncMsg)}</td>
        <td class="text-muted text-sm">${lastRan}</td>
        <td class="time-cell">${dur}</td>
        <td><button class="btn-retrigger" onclick="window.__retrigger(${p.id},${build.id},this)" title="Re-run build">&#8635;</button></td>
      </tr>`;
    }

    content.innerHTML = `
      <div class="table-wrap">
        <table class="dash-table">
          <thead>
            <tr>
              <th>Project</th>
              <th>Build</th>
              <th>Health</th>
              <th>Commit</th>
              <th>Deployed</th>
              <th>Drift</th>
              <th>Message</th>
              <th>Last Ran</th>
              <th>Duration</th>
              <th></th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <p class="text-sm text-muted mt-4">Showing <strong>${envLabels[env]}</strong> environment (branch: <code>${esc(branch)}</code>). Click "Sync All" to fetch latest from CI providers.</p>
    `;
  }

  // Retrigger build from dashboard or project detail
  window.__retrigger = async (projectId, buildId, btn) => {
    if (!confirm('Re-trigger this build?')) return;
    if (btn) { btn.classList.add('retriggering'); btn.textContent = '...'; }
    try {
      await api('/projects/' + projectId + '/builds/' + buildId + '/retrigger', { method: 'POST' });
      toast('Build re-triggered!', 'success');
    } catch (err) { toast(err.message); }
    if (btn) { btn.classList.remove('retriggering'); btn.innerHTML = '&#8635;'; }
  };

  // --- Projects list ---
  route('/dashboard/projects', async () => {
    if (!await requireAuth()) return;
    app.innerHTML = navHTML(true) + `<div class="container"><div class="dash-header"><h1 class="text-2xl font-bold">Projects</h1><a href="/dashboard/projects/new" class="btn btn-primary btn-sm">+ New Project</a></div><div id="project-list"><p class="text-muted">Loading...</p></div></div>`;
    try {
      const projects = await api('/projects');
      const el = document.getElementById('project-list');
      if (!projects || projects.length === 0) {
        el.innerHTML = '<div class="empty-state"><p>No projects yet.</p></div>';
      } else {
        el.innerHTML = `<div class="grid grid-cols-3 gap-4">${projects.map(p => `
          <a href="/dashboard/projects/${p.id}" class="card card-hover" style="display:block">
            <h3 class="font-bold">${esc(p.name)}</h3>
            <p class="text-sm text-muted mt-2">${esc(p.description || '')}</p>
          </a>`).join('')}</div>`;
      }
    } catch (err) { toast(err.message); }
  });

  // --- New project ---
  route('/dashboard/projects/new', async () => {
    if (!await requireAuth()) return;
    app.innerHTML = navHTML(true) + `
      <div class="container" style="max-width:600px">
        <h1 class="text-2xl font-bold mt-6 mb-4">New Project</h1>
        <form id="new-project" class="card">
          <div class="form-group"><label>Project Name</label><input type="text" class="form-input" name="name" required autofocus></div>
          <div class="form-group"><label>Slug</label><input type="text" class="form-input" name="slug" required pattern="[a-z0-9-]+" placeholder="my-project"></div>
          <div class="form-group"><label>Description</label><input type="text" class="form-input" name="description" placeholder="Optional"></div>
          <button type="submit" class="btn btn-primary mt-4">Create</button>
        </form>
      </div>`;
    document.getElementById('new-project').onsubmit = async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try {
        const p = await api('/projects', { method: 'POST', body: JSON.stringify({ name: fd.get('name'), slug: fd.get('slug'), description: fd.get('description') }) });
        toast('Project created!', 'success');
        navigate('/dashboard/projects/' + p.id);
      } catch (err) { toast(err.message); }
    };
  });

  // --- Project detail with build history + jobs + retrigger ---
  route('/dashboard/projects/:id', async (params) => {
    if (!await requireAuth()) return;
    app.innerHTML = navHTML(true) + `<div class="container"><div id="project-detail"><div class="text-center mt-8"><span class="spinner"></span> Loading...</div></div></div>`;

    try {
      const [project, buildResp] = await Promise.all([
        api('/projects/' + params.id),
        api('/projects/' + params.id + '/builds?per_page=25').catch(() => ({ builds: [], total: 0 }))
      ]);

      const builds = buildResp.builds || [];
      const el = document.getElementById('project-detail');

      el.innerHTML = `
        <div class="dash-header">
          <div>
            <h1 class="text-2xl font-bold">${esc(project.name)}</h1>
            <p class="text-sm text-muted">${esc(project.description || '')}</p>
          </div>
          <div class="flex gap-2">
            <button class="btn btn-sync btn-sm" id="proj-sync-btn">Sync Now</button>
            <a href="/dashboard/projects/${params.id}/settings" class="btn btn-outline btn-sm">Settings</a>
          </div>
        </div>

        <div class="env-tabs" id="proj-env-tabs">
          <button class="env-tab" data-branch="">All</button>
          <button class="env-tab" data-branch="production">Production</button>
          <button class="env-tab" data-branch="main">Staging</button>
          <button class="env-tab" data-branch="uat">UAT</button>
        </div>

        <div id="builds-content"></div>
      `;

      window.__projBuilds = builds;
      window.__projId = params.id;

      document.querySelector('#proj-env-tabs .env-tab').classList.add('active');
      renderBuildHistory('');

      document.getElementById('proj-env-tabs').addEventListener('click', e => {
        const tab = e.target.closest('.env-tab');
        if (!tab) return;
        document.querySelectorAll('#proj-env-tabs .env-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderBuildHistory(tab.dataset.branch);
      });

      document.getElementById('proj-sync-btn').onclick = async () => {
        const btn = document.getElementById('proj-sync-btn');
        btn.classList.add('syncing');
        btn.innerHTML = '<span class="spinner"></span> Syncing...';
        try {
          await api('/projects/' + params.id + '/sync', { method: 'POST' });
          const resp = await api('/projects/' + params.id + '/builds?per_page=25').catch(() => ({ builds: [], total: 0 }));
          window.__projBuilds = resp.builds || [];
          const activeTab = document.querySelector('#proj-env-tabs .env-tab.active');
          renderBuildHistory(activeTab ? activeTab.dataset.branch : '');
          toast('Synced!', 'success');
        } catch (err) { toast(err.message); }
        btn.classList.remove('syncing');
        btn.textContent = 'Sync Now';
      };

      connectWS(params.id);

    } catch (err) { toast(err.message); }
  });

  function renderBuildHistory(branchFilter) {
    const builds = window.__projBuilds || [];
    const projId = window.__projId;
    const content = document.getElementById('builds-content');

    const filtered = branchFilter ? builds.filter(b => b.branch === branchFilter) : builds;

    if (filtered.length === 0) {
      content.innerHTML = '<div class="empty-state mt-4"><p>No builds found.</p><p class="text-sm text-muted mt-2">Click "Sync Now" to fetch builds from CI provider.</p></div>';
      return;
    }

    content.innerHTML = filtered.map(b => {
      const sha = b.commit_sha ? b.commit_sha.substring(0, 7) : '-';
      const isRunning = b.status === 'running' || b.status === 'queued';
      const dur = isRunning ? runningElapsed(b.started_at) : formatDuration(b.duration_ms);
      const started = b.started_at ? formatTime(b.started_at) + ' ' + formatDate(b.started_at) : '-';
      const ended = b.finished_at ? formatTime(b.finished_at) : '-';
      const jobs = b.jobs || [];

      const progressHTML = isRunning ? '<div class="progress-bar" style="margin:8px 16px 0"><div class="progress-bar-fill" style="width:60%"></div></div>' : '';

      const jobsHTML = jobs.length > 0 ? `
        <div class="build-hist-body">
          <div class="job-list">
            ${jobs.map(j => {
              const jRunning = j.status === 'running' || j.status === 'queued';
              const jDur = jRunning ? runningElapsed(j.started_at) : formatDuration(j.duration_ms);
              return `
              <div class="job-row job-${statusClass(j.status)}">
                <span class="badge badge-${statusClass(j.status)}" style="font-size:0.65rem;padding:1px 6px">${esc(j.status)}</span>
                <span class="job-name">${esc(j.name)}</span>
                <span class="job-dur">${jDur}</span>
              </div>`;
            }).join('')}
          </div>
        </div>
      ` : '';

      return `
        <div class="build-hist ${isRunning ? 'build-running' : ''}" data-build-id="${b.id}">
          <div class="build-hist-header" onclick="this.parentElement.classList.toggle('expanded'); var body=this.parentElement.querySelector('.build-hist-body-wrap'); if(body) body.style.display=body.style.display==='none'?'block':'none'">
            <span class="badge badge-${statusClass(b.status)}">${esc(b.status)}</span>
            <span class="build-branch">${esc(b.branch)}</span>
            <span class="commit-sha">${esc(sha)}</span>
            <span class="text-sm" style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(b.commit_message || '-')}</span>
            <span class="text-sm text-muted">${esc(b.commit_author || '')}</span>
            <span class="text-sm text-muted">${dur}</span>
            <span class="text-sm text-muted">${started}</span>
            <button class="btn-retrigger" onclick="event.stopPropagation(); window.__retrigger(${projId},${b.id},this)" title="Re-run build">&#8635;</button>
            ${b.provider_url ? `<a href="${esc(b.provider_url)}" target="_blank" class="btn btn-outline btn-sm" onclick="event.stopPropagation()" style="padding:2px 8px;font-size:0.7rem">CI</a>` : ''}
          </div>
          ${progressHTML}
          ${jobsHTML ? `<div class="build-hist-body-wrap" style="display:none">${jobsHTML}</div>` : ''}
        </div>
      `;
    }).join('');
  }

  // --- Project settings (providers + members + channels) ---
  route('/dashboard/projects/:id/settings', async (params) => {
    if (!await requireAuth()) return;
    app.innerHTML = navHTML(true) + `<div class="container" style="max-width:800px"><div id="settings-content"><p class="text-muted mt-6">Loading...</p></div></div>`;

    try {
      const [project, providers, members, channels] = await Promise.all([
        api('/projects/' + params.id),
        api('/projects/' + params.id + '/providers').catch(() => []),
        api('/projects/' + params.id + '/members').catch(() => []),
        api('/projects/' + params.id + '/channels').catch(() => [])
      ]);

      document.getElementById('settings-content').innerHTML = `
        <h1 class="text-2xl font-bold mt-6 mb-4">${esc(project.name)} — Settings</h1>

        <div class="section-tabs" id="settings-tabs">
          <button class="section-tab active" data-section="providers">Providers</button>
          <button class="section-tab" data-section="deployments">Deployments</button>
          <button class="section-tab" data-section="members">Members</button>
          <button class="section-tab" data-section="channels">Notifications</button>
          <button class="section-tab" data-section="danger">Danger</button>
        </div>

        <div id="settings-sections">
          <!-- Providers -->
          <div id="section-providers">
            <div class="card mb-4">
              <h2 class="text-lg font-bold mb-4">CI Providers</h2>
              ${(providers || []).length === 0 ? '<p class="text-muted">No providers connected.</p>' :
                providers.map(p => `<div class="flex items-center justify-between" style="padding:8px 0;border-bottom:1px solid var(--border)">
                  <div><strong>${esc(p.display_name || p.provider_type)}</strong> <span class="text-muted text-sm">${esc(p.repo_owner)}/${esc(p.repo_name)}</span></div>
                  <span class="badge ${p.enabled ? 'badge-success' : 'badge-cancelled'}">${p.enabled ? 'Active' : 'Disabled'}</span>
                </div>`).join('')}
              <h3 class="font-bold mt-4 mb-2 text-sm">Add Provider</h3>
              <form id="add-provider">
                <div class="flex gap-2" style="flex-wrap:wrap">
                  <select class="form-input" name="provider_type" style="width:auto">
                    <option value="github">GitHub Actions</option>
                    <option value="travis">Travis CI</option>
                    <option value="circleci">CircleCI</option>
                  </select>
                  <input class="form-input" name="repo_owner" placeholder="owner" required style="width:120px">
                  <input class="form-input" name="repo_name" placeholder="repo" required style="width:120px">
                  <input class="form-input" name="api_token" placeholder="API token" type="password" style="flex:1;min-width:140px">
                  <button type="submit" class="btn btn-primary btn-sm">Add</button>
                </div>
              </form>
            </div>
          </div>

          <!-- Deployments -->
          <div id="section-deployments" style="display:none">
            <div class="card mb-4">
              <h2 class="text-lg font-bold mb-2">Deployment URLs</h2>
              <p class="text-sm text-muted mb-4">Configure environment URLs for drift detection and health monitoring.</p>
              <form id="deployment-urls">
                <div class="form-group">
                  <label>Staging URL</label>
                  <input type="url" class="form-input" name="staging_url" placeholder="https://staging.example.com" value="${esc(project.staging_url || '')}">
                </div>
                <div class="form-group">
                  <label>UAT URL</label>
                  <input type="url" class="form-input" name="uat_url" placeholder="https://uat.example.com" value="${esc(project.uat_url || '')}">
                </div>
                <div class="form-group">
                  <label>Production URL</label>
                  <input type="url" class="form-input" name="production_url" placeholder="https://example.com" value="${esc(project.production_url || '')}">
                </div>
                <div class="form-group">
                  <label>Version Endpoint Path</label>
                  <input type="text" class="form-input" name="version_path" placeholder="/api/version" value="${esc(project.version_path || '/api/version')}">
                </div>
                <div class="form-group">
                  <label>Version JSON Field</label>
                  <input type="text" class="form-input" name="version_field" placeholder="git_commit" value="${esc(project.version_field || 'git_commit')}">
                  <p class="text-sm text-muted mt-1">Dot-path to the commit SHA in the JSON response (e.g. <code>git_commit</code> or <code>backend.git_commit</code>)</p>
                </div>
                <div class="form-group">
                  <label>Health Endpoint Path</label>
                  <input type="text" class="form-input" name="health_path" placeholder="/health" value="${esc(project.health_path || '/health')}">
                </div>
                <button type="submit" class="btn btn-primary btn-sm mt-2">Save URLs</button>
              </form>
            </div>
          </div>

          <!-- Members -->
          <div id="section-members" style="display:none">
            <div class="card mb-4">
              <h2 class="text-lg font-bold mb-4">Members</h2>
              <div class="table-wrap"><table><thead><tr><th>User</th><th>Role</th><th></th></tr></thead><tbody>
                ${(members || []).map(m => `<tr>
                  <td>${esc(m.user?.display_name || m.user?.email || 'User #' + m.user_id)}</td>
                  <td><span class="badge badge-running">${esc(m.role)}</span></td>
                  <td><button class="btn btn-outline btn-xs" onclick="window.__removeMember(${params.id},${m.id},this)">Remove</button></td>
                </tr>`).join('')}
              </tbody></table></div>
              <h3 class="font-bold mt-4 mb-2 text-sm">Invite Member</h3>
              <form id="invite-member">
                <div class="flex gap-2">
                  <input class="form-input" name="email" type="email" placeholder="user@example.com" required style="flex:1">
                  <select class="form-input" name="role" style="width:auto">
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button type="submit" class="btn btn-primary btn-sm">Invite</button>
                </div>
              </form>
              <p class="text-sm text-muted mt-2">User must have an account. They'll receive an email notification.</p>
            </div>
          </div>

          <!-- Notification Channels -->
          <div id="section-channels" style="display:none">
            <div class="card mb-4">
              <h2 class="text-lg font-bold mb-4">Notification Channels</h2>
              ${(channels || []).length === 0 ? '<p class="text-muted">No notification channels configured.</p>' :
                channels.map(ch => `<div class="flex items-center justify-between" style="padding:8px 0;border-bottom:1px solid var(--border)">
                  <div><strong>${esc(ch.channel_type)}</strong> <span class="text-muted text-sm">${esc(ch.id)}</span></div>
                  <div class="flex gap-2">
                    <span class="badge ${ch.enabled ? 'badge-success' : 'badge-cancelled'}">${ch.enabled ? 'Active' : 'Disabled'}</span>
                    <button class="btn btn-outline btn-xs" onclick="window.__testChannel(${params.id},${ch.id},this)">Test</button>
                    <button class="btn btn-outline btn-xs" onclick="window.__deleteChannel(${params.id},${ch.id},this)">Delete</button>
                  </div>
                </div>`).join('')}
              <h3 class="font-bold mt-4 mb-2 text-sm">Add Channel</h3>
              <form id="add-channel">
                <div class="flex gap-2" style="flex-wrap:wrap">
                  <select class="form-input" name="channel_type" id="channel-type-select" style="width:auto">
                    <option value="email">Email</option>
                    <option value="webhook">Webhook</option>
                  </select>
                  <input class="form-input" name="config" placeholder='{"to":["team@example.com"]}' required style="flex:1;min-width:200px" id="channel-config-input">
                  <button type="submit" class="btn btn-primary btn-sm">Add</button>
                </div>
                <p class="text-sm text-muted mt-2" id="channel-config-hint">Email config: <code>{"to":["email1","email2"]}</code></p>
              </form>
            </div>
          </div>

          <!-- Danger Zone -->
          <div id="section-danger" style="display:none">
            <div class="card">
              <h2 class="text-lg font-bold mb-4" style="color:var(--failure)">Danger Zone</h2>
              <button class="btn btn-danger btn-sm" id="delete-project">Delete Project</button>
            </div>
          </div>
        </div>
      `;

      // Tab switching
      document.getElementById('settings-tabs').addEventListener('click', e => {
        const tab = e.target.closest('.section-tab');
        if (!tab) return;
        document.querySelectorAll('.section-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const section = tab.dataset.section;
        document.querySelectorAll('#settings-sections > div').forEach(d => d.style.display = 'none');
        document.getElementById('section-' + section).style.display = 'block';
      });

      // Channel type hint toggle
      document.getElementById('channel-type-select').addEventListener('change', e => {
        const hint = document.getElementById('channel-config-hint');
        const input = document.getElementById('channel-config-input');
        if (e.target.value === 'webhook') {
          hint.innerHTML = 'Webhook config: <code>{"url":"https://...","secret":"optional-hmac-secret"}</code>';
          input.placeholder = '{"url":"https://hooks.example.com/buildme"}';
        } else {
          hint.innerHTML = 'Email config: <code>{"to":["email1","email2"]}</code>';
          input.placeholder = '{"to":["team@example.com"]}';
        }
      });

      // Save deployment URLs
      document.getElementById('deployment-urls').onsubmit = async e => {
        e.preventDefault();
        const fd = new FormData(e.target);
        try {
          await api('/projects/' + params.id, { method: 'PUT', body: JSON.stringify({
            staging_url: fd.get('staging_url'), uat_url: fd.get('uat_url'), production_url: fd.get('production_url'),
            version_path: fd.get('version_path'), version_field: fd.get('version_field'), health_path: fd.get('health_path')
          })});
          toast('Deployment URLs saved!', 'success');
        } catch (err) { toast(err.message); }
      };

      // Add provider
      document.getElementById('add-provider').onsubmit = async e => {
        e.preventDefault();
        const fd = new FormData(e.target);
        try {
          await api('/projects/' + params.id + '/providers', { method: 'POST', body: JSON.stringify({
            provider_type: fd.get('provider_type'), repo_owner: fd.get('repo_owner'), repo_name: fd.get('repo_name'),
            api_token: fd.get('api_token'), display_name: fd.get('provider_type') + ': ' + fd.get('repo_owner') + '/' + fd.get('repo_name')
          })});
          toast('Provider added!', 'success');
          render();
        } catch (err) { toast(err.message); }
      };

      // Invite member
      document.getElementById('invite-member').onsubmit = async e => {
        e.preventDefault();
        const fd = new FormData(e.target);
        try {
          await api('/projects/' + params.id + '/members', { method: 'POST', body: JSON.stringify({
            email: fd.get('email'), role: fd.get('role')
          })});
          toast('Member invited!', 'success');
          render();
        } catch (err) { toast(err.message); }
      };

      // Add notification channel
      document.getElementById('add-channel').onsubmit = async e => {
        e.preventDefault();
        const fd = new FormData(e.target);
        try {
          // Validate JSON config
          JSON.parse(fd.get('config'));
          await api('/projects/' + params.id + '/channels', { method: 'POST', body: JSON.stringify({
            channel_type: fd.get('channel_type'), config: fd.get('config'), enabled: true
          })});
          toast('Channel added!', 'success');
          render();
        } catch (err) { toast(err.message || 'Invalid JSON config'); }
      };

      // Remove member
      window.__removeMember = async (projectId, memberId, btn) => {
        if (!confirm('Remove this member?')) return;
        try {
          await api('/projects/' + projectId + '/members/' + memberId, { method: 'DELETE' });
          toast('Member removed', 'success');
          render();
        } catch (err) { toast(err.message); }
      };

      // Test channel
      window.__testChannel = async (projectId, channelId, btn) => {
        btn.textContent = '...';
        try {
          await api('/projects/' + projectId + '/channels/' + channelId + '/test', { method: 'POST' });
          toast('Test notification sent!', 'success');
        } catch (err) { toast(err.message); }
        btn.textContent = 'Test';
      };

      // Delete channel
      window.__deleteChannel = async (projectId, channelId, btn) => {
        if (!confirm('Delete this notification channel?')) return;
        try {
          await api('/projects/' + projectId + '/channels/' + channelId, { method: 'DELETE' });
          toast('Channel deleted', 'success');
          render();
        } catch (err) { toast(err.message); }
      };

      // Delete project
      document.getElementById('delete-project').onclick = async () => {
        if (!confirm('Delete this project? This cannot be undone.')) return;
        try {
          await api('/projects/' + params.id, { method: 'DELETE' });
          toast('Project deleted', 'success');
          navigate('/dashboard');
        } catch (err) { toast(err.message); }
      };
    } catch (err) { toast(err.message); }
  });

  // --- Admin Settings (super admin only) ---
  route('/dashboard/admin', async () => {
    if (!await requireAuth()) return;
    if (!user?.is_super_admin) {
      app.innerHTML = navHTML(true) + '<div class="container"><div class="card mt-8"><h2>Access Denied</h2><p class="text-muted mt-2">Super admin access required.</p></div></div>';
      return;
    }

    app.innerHTML = navHTML(true) + `
      <div class="container" style="max-width:700px">
        <h1 class="text-2xl font-bold mt-6 mb-4">Admin Settings</h1>

        <div class="card mb-4">
          <h2 class="text-lg font-bold mb-2">Email (Brevo / SMTP)</h2>
          <p class="text-sm text-muted mb-4">Configure Brevo API key for sending invite emails and build failure alerts. Alternatively, use any SMTP provider.</p>
          <div id="email-settings-loading"><span class="spinner"></span> Loading...</div>
          <form id="email-settings-form" style="display:none">
            <div class="alert alert-info">Recommended: Use Brevo API key. Leave SMTP fields empty if using Brevo API.</div>
            <div class="form-group">
              <label>Brevo API Key</label>
              <input type="password" class="form-input" name="smtp.api_key" placeholder="xkeysib-...">
            </div>
            <div class="form-group">
              <label>From Email</label>
              <input type="email" class="form-input" name="smtp.from_email" placeholder="noreply@build.biswas.me">
            </div>
            <div class="form-group">
              <label>From Name</label>
              <input type="text" class="form-input" name="smtp.from_name" placeholder="BuildMe" value="BuildMe">
            </div>
            <details class="mt-4" style="cursor:pointer">
              <summary class="text-sm text-muted font-medium">SMTP Settings (alternative to Brevo API)</summary>
              <div class="mt-2">
                <div class="form-group">
                  <label>SMTP Host</label>
                  <input type="text" class="form-input" name="smtp.host" placeholder="smtp-relay.brevo.com">
                </div>
                <div class="form-group">
                  <label>SMTP Port</label>
                  <input type="number" class="form-input" name="smtp.port" placeholder="587" value="587">
                </div>
                <div class="form-group">
                  <label>SMTP User</label>
                  <input type="text" class="form-input" name="smtp.user" placeholder="user@example.com">
                </div>
                <div class="form-group">
                  <label>SMTP Password</label>
                  <input type="password" class="form-input" name="smtp.pass" placeholder="password">
                </div>
              </div>
            </details>
            <div class="flex gap-2 mt-4">
              <button type="submit" class="btn btn-primary btn-sm">Save Settings</button>
              <button type="button" class="btn btn-outline btn-sm" id="test-email-btn">Send Test Email</button>
            </div>
          </form>
          <div id="email-settings-status" class="mt-4"></div>
        </div>
      </div>`;

    // Load current settings
    try {
      const settings = await api('/admin/email-settings');
      const form = document.getElementById('email-settings-form');
      document.getElementById('email-settings-loading').style.display = 'none';
      form.style.display = 'block';

      // Fill in existing values
      for (const [key, val] of Object.entries(settings)) {
        const input = form.querySelector(`[name="${key}"]`);
        if (input && val) input.value = val;
      }
    } catch (err) {
      document.getElementById('email-settings-loading').innerHTML = '<p class="text-muted">Failed to load settings.</p>';
      toast(err.message);
    }

    // Save settings
    document.getElementById('email-settings-form').onsubmit = async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const data = {};
      for (const [k, v] of fd.entries()) data[k] = v;
      try {
        await api('/admin/email-settings', { method: 'PUT', body: JSON.stringify(data) });
        toast('Email settings saved!', 'success');
      } catch (err) { toast(err.message); }
    };

    // Test email
    document.getElementById('test-email-btn').onclick = async () => {
      const to = prompt('Send test email to:', user.email);
      if (!to) return;
      const btn = document.getElementById('test-email-btn');
      btn.disabled = true;
      btn.textContent = 'Sending...';
      try {
        await api('/admin/test-email', { method: 'POST', body: JSON.stringify({ to }) });
        toast('Test email sent!', 'success');
      } catch (err) { toast(err.message); }
      btn.disabled = false;
      btn.textContent = 'Send Test Email';
    };
  });

  // --- Invites ---
  route('/dashboard/invites', async () => {
    if (!await requireAuth()) return;
    const remaining = user.invites_remaining === -1 ? 'Unlimited' : user.invites_remaining;
    app.innerHTML = navHTML(true) + `
      <div class="container" style="max-width:700px">
        <div class="dash-header"><h1 class="text-2xl font-bold">Invites</h1><span class="text-muted">Remaining: <strong>${remaining}</strong></span></div>
        <div class="card mb-4">
          <h2 class="text-lg font-bold mb-2">Generate Invite</h2>
          <form id="create-invite" class="flex gap-2">
            <input class="form-input" name="email" placeholder="Recipient email (optional)" style="flex:1">
            <button type="submit" class="btn btn-primary btn-sm" ${user.invites_remaining === 0 ? 'disabled' : ''}>Generate</button>
          </form>
          <div id="new-invite-result" class="mt-4 hidden"></div>
        </div>
        <div class="card">
          <h2 class="text-lg font-bold mb-4">Your Invites</h2>
          <div id="invites-list"><p class="text-muted">Loading...</p></div>
        </div>
      </div>`;

    try { renderInvitesList(await api('/invites')); } catch (err) { toast(err.message); }

    document.getElementById('create-invite').onsubmit = async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try {
        const inv = await api('/invites', { method: 'POST', body: JSON.stringify({ email: fd.get('email') }) });
        const result = document.getElementById('new-invite-result');
        result.classList.remove('hidden');
        result.innerHTML = `<p class="text-sm mb-2">Share this invite code:</p><div class="invite-code">${esc(inv.code)}</div><p class="text-sm text-muted mt-2">Register URL: ${location.origin}/register?code=${esc(inv.code)}</p>`;
        user = await api('/me');
        renderInvitesList(await api('/invites'));
      } catch (err) { toast(err.message); }
    };
  });

  function renderInvitesList(invites) {
    const el = document.getElementById('invites-list');
    if (!invites || invites.length === 0) { el.innerHTML = '<p class="text-muted">No invites created yet.</p>'; return; }
    el.innerHTML = `<table><thead><tr><th>Code</th><th>Email</th><th>Status</th><th>Created</th></tr></thead><tbody>
      ${invites.map(inv => `<tr>
        <td><code class="text-sm">${esc(inv.code.substring(0,12))}...</code></td>
        <td>${esc(inv.email || '-')}</td>
        <td>${inv.used_by ? '<span class="badge badge-success">Used</span>' : new Date(inv.expires_at) < new Date() ? '<span class="badge badge-cancelled">Expired</span>' : '<span class="badge badge-running">Active</span>'}</td>
        <td class="text-sm text-muted">${new Date(inv.created_at).toLocaleDateString()}</td>
      </tr>`).join('')}
    </tbody></table>`;
  }

  // --- Settings ---
  route('/dashboard/settings', async () => {
    if (!await requireAuth()) return;
    app.innerHTML = navHTML(true) + `
      <div class="container" style="max-width:600px">
        <h1 class="text-2xl font-bold mt-6 mb-4">Account Settings</h1>
        <div class="card">
          <div class="form-group"><label>Email</label><p>${esc(user.email)}</p></div>
          <div class="form-group mt-4"><label>Display Name</label><p>${esc(user.display_name)}</p></div>
          <h3 class="font-bold mt-6 mb-2">Change Password</h3>
          <form id="change-pw">
            <div class="form-group"><label>Current Password</label><input type="password" class="form-input" name="current_password" required></div>
            <div class="form-group"><label>New Password</label><input type="password" class="form-input" name="new_password" required minlength="8"></div>
            <button type="submit" class="btn btn-primary mt-4">Update Password</button>
          </form>
        </div>
      </div>`;
    document.getElementById('change-pw').onsubmit = async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try {
        await api('/me/password', { method: 'POST', body: JSON.stringify({ current_password: fd.get('current_password'), new_password: fd.get('new_password') }) });
        toast('Password updated!', 'success');
        e.target.reset();
      } catch (err) { toast(err.message); }
    };
  });

  // --- WebSocket ---
  function connectWS(projectId) {
    if (ws) { ws.close(); ws = null; }
    if (!token) return;
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(proto + '//' + location.host + '/api/ws?token=' + token);
    ws.onopen = () => { ws.send('subscribe ' + projectId); };
    ws.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        if (event.type === 'ping') { ws.send('pong'); return; }
        if (event.type && event.type.startsWith('build.')) { render(); }
      } catch {}
    };
    ws.onclose = () => { wsReconnectTimer = setTimeout(() => connectWS(projectId), 5000); };
  }

  // --- Auth guard ---
  async function requireAuth() {
    if (!token) { navigate('/login'); return false; }
    if (!user) { const u = await loadUser(); if (!u) { navigate('/login'); return false; } }
    return true;
  }

  // --- Boot ---
  render();
})();
