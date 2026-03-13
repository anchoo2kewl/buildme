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
    // Find matching route
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

  // --- Click handler for SPA links ---
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
    token = t;
    user = u;
    localStorage.setItem('buildme_token', t);
  }

  function logout() {
    token = null;
    user = null;
    localStorage.removeItem('buildme_token');
    if (ws) { ws.close(); ws = null; }
    navigate('/');
  }

  async function loadUser() {
    if (!token) return null;
    try {
      user = await api('/me');
      return user;
    } catch {
      logout();
      return null;
    }
  }

  // --- Nav ---
  function navHTML(authed) {
    const logo = '<svg viewBox="0 0 32 32" width="28" height="28"><rect width="32" height="32" rx="6" fill="#6366f1"/><path d="M8 16l5 5 11-11" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    if (!authed) {
      return `<nav class="nav"><div class="nav-inner">
        <a href="/" class="nav-brand">${logo} BuildMe</a>
        <div class="nav-links">
          <a href="/login" class="btn btn-outline btn-sm">Log In</a>
        </div>
      </div></nav>`;
    }
    return `<nav class="nav"><div class="nav-inner">
      <a href="/dashboard" class="nav-brand">${logo} BuildMe</a>
      <div class="nav-links">
        <a href="/dashboard" class="text-sm">Dashboard</a>
        <a href="/dashboard/projects" class="text-sm">Projects</a>
        <a href="/dashboard/invites" class="text-sm">Invites</a>
        <span class="text-sm text-muted">${esc(user?.display_name || user?.email || '')}</span>
        <button class="btn btn-outline btn-sm" onclick="window.__logout()">Logout</button>
      </div>
    </div></nav>`;
  }
  window.__logout = logout;

  function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

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
          <div class="card feature-card">
            <span class="feature-icon">&#9889;</span>
            <h3>Real-time Updates</h3>
            <p>WebSocket-powered live build status. See changes the moment they happen.</p>
          </div>
          <div class="card feature-card">
            <span class="feature-icon">&#128268;</span>
            <h3>Multi-Provider</h3>
            <p>Connect GitHub Actions, Travis CI, and CircleCI. One dashboard for all.</p>
          </div>
          <div class="card feature-card">
            <span class="feature-icon">&#128276;</span>
            <h3>Smart Notifications</h3>
            <p>Get notified on failures and fixes via email, webhook, or push.</p>
          </div>
          <div class="card feature-card">
            <span class="feature-icon">&#128101;</span>
            <h3>Team Collaboration</h3>
            <p>Share projects with role-based access. Viewer, editor, admin roles.</p>
          </div>
          <div class="card feature-card">
            <span class="feature-icon">&#128295;</span>
            <h3>Self-Hosted</h3>
            <p>Single binary + SQLite. Deploy anywhere in seconds.</p>
          </div>
          <div class="card feature-card">
            <span class="feature-icon">&#127760;</span>
            <h3>Open Source</h3>
            <p>MIT licensed. Fork, customize, contribute.</p>
          </div>
        </div>
      </div>
    `;
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
            <div class="form-group">
              <label>Email</label>
              <input type="email" class="form-input" name="email" required autocomplete="email" autofocus>
            </div>
            <div class="form-group">
              <label>Password</label>
              <input type="password" class="form-input" name="password" required autocomplete="current-password">
            </div>
            <button type="submit" class="btn btn-primary w-full mt-4">Log In</button>
          </form>
          <p class="text-center text-sm mt-4 text-muted">
            Have an invite? <a href="/register">Register</a>
          </p>
        </div>
      </div>
    `;
    document.getElementById('login-form').onsubmit = async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try {
        const data = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email: fd.get('email'), password: fd.get('password') }) });
        setAuth(data.token, data.user);
        navigate('/dashboard');
      } catch (err) {
        toast(err.message);
      }
    };
  });

  // --- Register with invite ---
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
            <div class="form-group">
              <label>Invite Code</label>
              <input type="text" class="form-input" name="invite_code" required value="${esc(code)}" placeholder="Paste your invite code">
            </div>
            <div class="form-group">
              <label>Display Name</label>
              <input type="text" class="form-input" name="display_name" placeholder="Your name">
            </div>
            <div class="form-group">
              <label>Email</label>
              <input type="email" class="form-input" name="email" required autocomplete="email">
            </div>
            <div class="form-group">
              <label>Password</label>
              <input type="password" class="form-input" name="password" required autocomplete="new-password" minlength="8" placeholder="Min 8 characters">
            </div>
            <button type="submit" class="btn btn-primary w-full mt-4">Create Account</button>
          </form>
          <p class="text-center text-sm mt-4 text-muted">
            Already have an account? <a href="/login">Log in</a>
          </p>
        </div>
      </div>
    `;
    document.getElementById('register-form').onsubmit = async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try {
        const data = await api('/auth/signup', { method: 'POST', body: JSON.stringify({
          email: fd.get('email'),
          password: fd.get('password'),
          display_name: fd.get('display_name'),
          invite_code: fd.get('invite_code')
        })});
        setAuth(data.token, data.user);
        toast('Account created!', 'success');
        navigate('/dashboard');
      } catch (err) {
        toast(err.message);
      }
    };
  });

  // --- Dashboard ---
  route('/dashboard', async () => {
    if (!await requireAuth()) return;
    app.innerHTML = navHTML(true) + `<div class="container"><div class="dash-header"><h1 class="text-2xl font-bold">Dashboard</h1></div><div id="dash-content"><p class="text-muted">Loading...</p></div></div>`;

    try {
      const projects = await api('/projects');
      const content = document.getElementById('dash-content');
      if (!projects || projects.length === 0) {
        content.innerHTML = `
          <div class="empty-state mt-8">
            <p class="text-lg">No projects yet</p>
            <p class="text-muted mt-2">Create your first project to start monitoring builds.</p>
            <a href="/dashboard/projects/new" class="btn btn-primary mt-4">Create Project</a>
          </div>`;
      } else {
        content.innerHTML = `
          <div class="stats mb-4">
            <div class="card stat-card"><div class="stat-value">${projects.length}</div><div class="stat-label">Projects</div></div>
          </div>
          <h2 class="text-xl font-bold mt-6 mb-4">Your Projects</h2>
          <div class="grid grid-cols-3 gap-4">
            ${projects.map(p => `
              <a href="/dashboard/projects/${p.id}" class="card card-hover" style="display:block">
                <h3 class="font-bold">${esc(p.name)}</h3>
                <p class="text-sm text-muted mt-2">${esc(p.description || 'No description')}</p>
                <p class="text-sm text-muted mt-2"><code>${esc(p.slug)}</code></p>
              </a>
            `).join('')}
          </div>
          <a href="/dashboard/projects/new" class="btn btn-primary mt-4">+ New Project</a>
        `;
      }
    } catch (err) {
      toast(err.message);
    }
  });

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
    } catch (err) {
      toast(err.message);
    }
  });

  // --- New project ---
  route('/dashboard/projects/new', async () => {
    if (!await requireAuth()) return;
    app.innerHTML = navHTML(true) + `
      <div class="container" style="max-width:600px">
        <h1 class="text-2xl font-bold mt-6 mb-4">New Project</h1>
        <form id="new-project" class="card">
          <div class="form-group">
            <label>Project Name</label>
            <input type="text" class="form-input" name="name" required autofocus>
          </div>
          <div class="form-group">
            <label>Slug (URL-friendly)</label>
            <input type="text" class="form-input" name="slug" required pattern="[a-z0-9-]+" placeholder="my-project">
          </div>
          <div class="form-group">
            <label>Description</label>
            <input type="text" class="form-input" name="description" placeholder="Optional">
          </div>
          <button type="submit" class="btn btn-primary mt-4">Create</button>
        </form>
      </div>`;
    document.getElementById('new-project').onsubmit = async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try {
        const p = await api('/projects', { method: 'POST', body: JSON.stringify({
          name: fd.get('name'), slug: fd.get('slug'), description: fd.get('description')
        })});
        toast('Project created!', 'success');
        navigate('/dashboard/projects/' + p.id);
      } catch (err) {
        toast(err.message);
      }
    };
  });

  // --- Project detail with builds ---
  route('/dashboard/projects/:id', async (params) => {
    if (!await requireAuth()) return;
    app.innerHTML = navHTML(true) + `<div class="container"><div id="project-detail"><p class="text-muted mt-6">Loading...</p></div></div>`;

    try {
      const [project, builds] = await Promise.all([
        api('/projects/' + params.id),
        api('/projects/' + params.id + '/builds?per_page=20').catch(() => ({ builds: [], total: 0 }))
      ]);
      const el = document.getElementById('project-detail');
      el.innerHTML = `
        <div class="dash-header">
          <div>
            <h1 class="text-2xl font-bold">${esc(project.name)}</h1>
            <p class="text-sm text-muted">${esc(project.description || '')}</p>
          </div>
          <div class="flex gap-2">
            <a href="/dashboard/projects/${params.id}/settings" class="btn btn-outline btn-sm">Settings</a>
          </div>
        </div>
        <div id="builds-list">
          ${renderBuilds(builds.builds || [])}
        </div>
      `;

      // Connect WebSocket for live updates
      connectWS(params.id);
    } catch (err) {
      toast(err.message);
    }
  });

  // --- Project settings ---
  route('/dashboard/projects/:id/settings', async (params) => {
    if (!await requireAuth()) return;
    app.innerHTML = navHTML(true) + `<div class="container" style="max-width:800px"><div id="settings-content"><p class="text-muted mt-6">Loading...</p></div></div>`;

    try {
      const [project, providers, members] = await Promise.all([
        api('/projects/' + params.id),
        api('/projects/' + params.id + '/providers').catch(() => []),
        api('/projects/' + params.id + '/members').catch(() => [])
      ]);

      document.getElementById('settings-content').innerHTML = `
        <h1 class="text-2xl font-bold mt-6 mb-4">${esc(project.name)} — Settings</h1>

        <div class="card mb-4">
          <h2 class="text-lg font-bold mb-4">CI Providers</h2>
          ${(providers || []).length === 0 ? '<p class="text-muted">No providers connected.</p>' :
            providers.map(p => `<div class="flex items-center justify-between" style="padding:8px 0;border-bottom:1px solid var(--border)">
              <div><strong>${esc(p.display_name || p.provider_type)}</strong> <span class="text-muted text-sm">${esc(p.repo_owner)}/${esc(p.repo_name)}</span></div>
              <span class="badge ${p.enabled ? 'badge-success' : 'badge-cancelled'}">${p.enabled ? 'Active' : 'Disabled'}</span>
            </div>`).join('')}
          <h3 class="font-bold mt-4 mb-2 text-sm">Add Provider</h3>
          <form id="add-provider">
            <div class="flex gap-2">
              <select class="form-input" name="provider_type" style="width:auto">
                <option value="github">GitHub Actions</option>
                <option value="travis">Travis CI</option>
                <option value="circleci">CircleCI</option>
              </select>
              <input class="form-input" name="repo_owner" placeholder="owner" required style="width:120px">
              <input class="form-input" name="repo_name" placeholder="repo" required style="width:120px">
              <input class="form-input" name="api_token" placeholder="API token" type="password" style="flex:1">
              <button type="submit" class="btn btn-primary btn-sm">Add</button>
            </div>
          </form>
        </div>

        <div class="card mb-4">
          <h2 class="text-lg font-bold mb-4">Members</h2>
          <div class="table-wrap">
            <table>
              <thead><tr><th>User</th><th>Role</th></tr></thead>
              <tbody>
                ${(members || []).map(m => `<tr>
                  <td>${esc(m.user?.display_name || m.user?.email || 'User #' + m.user_id)}</td>
                  <td><span class="badge badge-running">${esc(m.role)}</span></td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div class="card">
          <h2 class="text-lg font-bold mb-4 text-failure">Danger Zone</h2>
          <button class="btn btn-danger btn-sm" id="delete-project">Delete Project</button>
        </div>
      `;

      document.getElementById('add-provider').onsubmit = async e => {
        e.preventDefault();
        const fd = new FormData(e.target);
        try {
          await api('/projects/' + params.id + '/providers', { method: 'POST', body: JSON.stringify({
            provider_type: fd.get('provider_type'),
            repo_owner: fd.get('repo_owner'),
            repo_name: fd.get('repo_name'),
            api_token: fd.get('api_token'),
            display_name: fd.get('provider_type') + ': ' + fd.get('repo_owner') + '/' + fd.get('repo_name')
          })});
          toast('Provider added!', 'success');
          render(); // Refresh
        } catch (err) {
          toast(err.message);
        }
      };

      document.getElementById('delete-project').onclick = async () => {
        if (!confirm('Delete this project? This cannot be undone.')) return;
        try {
          await api('/projects/' + params.id, { method: 'DELETE' });
          toast('Project deleted', 'success');
          navigate('/dashboard');
        } catch (err) {
          toast(err.message);
        }
      };
    } catch (err) {
      toast(err.message);
    }
  });

  // --- Invites ---
  route('/dashboard/invites', async () => {
    if (!await requireAuth()) return;
    const remaining = user.invites_remaining === -1 ? 'Unlimited' : user.invites_remaining;
    app.innerHTML = navHTML(true) + `
      <div class="container" style="max-width:700px">
        <div class="dash-header">
          <h1 class="text-2xl font-bold">Invites</h1>
          <span class="text-muted">Remaining: <strong>${remaining}</strong></span>
        </div>
        <div class="card mb-4">
          <h2 class="text-lg font-bold mb-2">Generate Invite</h2>
          <p class="text-sm text-muted mb-4">Create an invite code to share with someone.</p>
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

    // Load existing invites
    try {
      const invites = await api('/invites');
      renderInvitesList(invites);
    } catch (err) {
      toast(err.message);
    }

    document.getElementById('create-invite').onsubmit = async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try {
        const inv = await api('/invites', { method: 'POST', body: JSON.stringify({ email: fd.get('email') }) });
        const result = document.getElementById('new-invite-result');
        result.classList.remove('hidden');
        result.innerHTML = `<p class="text-sm mb-2">Share this invite code:</p><div class="invite-code">${esc(inv.code)}</div><p class="text-sm text-muted mt-2">Register URL: ${location.origin}/register?code=${esc(inv.code)}</p>`;
        // Refresh user and list
        user = await api('/me');
        const invites = await api('/invites');
        renderInvitesList(invites);
      } catch (err) {
        toast(err.message);
      }
    };
  });

  function renderInvitesList(invites) {
    const el = document.getElementById('invites-list');
    if (!invites || invites.length === 0) {
      el.innerHTML = '<p class="text-muted">No invites created yet.</p>';
      return;
    }
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
      } catch (err) {
        toast(err.message);
      }
    };
  });

  // --- Build rendering ---
  function renderBuilds(builds) {
    if (!builds || builds.length === 0) {
      return '<div class="empty-state mt-4"><p>No builds yet.</p><p class="text-sm text-muted mt-2">Connect a CI provider in Settings to start monitoring.</p></div>';
    }
    return '<div class="card" style="padding:0">' + builds.map(b => `
      <div class="build-item">
        <span class="badge badge-${statusClass(b.status)}">${esc(b.status)}</span>
        <div class="build-info">
          <div class="build-title">${esc(b.commit_message || b.workflow_name || '#' + b.external_id)}</div>
          <div class="build-meta">
            <span>${esc(b.branch)}</span>
            ${b.commit_sha ? '<code>' + esc(b.commit_sha.substring(0,7)) + '</code>' : ''}
            ${b.commit_author ? '<span>' + esc(b.commit_author) + '</span>' : ''}
            ${b.duration_ms ? '<span>' + formatDuration(b.duration_ms) + '</span>' : ''}
            <span>${timeAgo(b.created_at)}</span>
          </div>
        </div>
        ${b.provider_url ? '<a href="' + esc(b.provider_url) + '" target="_blank" class="btn btn-outline btn-sm">View</a>' : ''}
      </div>
    `).join('') + '</div>';
  }

  function statusClass(s) {
    if (s === 'success') return 'success';
    if (s === 'failure' || s === 'error') return 'failure';
    if (s === 'running') return 'running';
    if (s === 'queued') return 'queued';
    return 'cancelled';
  }

  function formatDuration(ms) {
    const s = Math.floor(ms / 1000);
    if (s < 60) return s + 's';
    const m = Math.floor(s / 60);
    return m + 'm ' + (s % 60) + 's';
  }

  function timeAgo(dateStr) {
    const d = new Date(dateStr);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff/60) + 'm ago';
    if (diff < 86400) return Math.floor(diff/3600) + 'h ago';
    return Math.floor(diff/86400) + 'd ago';
  }

  // --- WebSocket ---
  function connectWS(projectId) {
    if (ws) { ws.close(); ws = null; }
    if (!token) return;

    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(proto + '//' + location.host + '/api/ws?token=' + token);

    ws.onopen = () => {
      ws.send('subscribe ' + projectId);
    };

    ws.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        if (event.type === 'ping') { ws.send('pong'); return; }
        // Refresh builds on any build event
        if (event.type && event.type.startsWith('build.')) {
          render(); // Simple: re-render the page
        }
      } catch {}
    };

    ws.onclose = () => {
      wsReconnectTimer = setTimeout(() => connectWS(projectId), 5000);
    };
  }

  // --- Auth guard ---
  async function requireAuth() {
    if (!token) { navigate('/login'); return false; }
    if (!user) {
      const u = await loadUser();
      if (!u) { navigate('/login'); return false; }
    }
    return true;
  }

  // --- Boot ---
  render();
})();
