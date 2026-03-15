import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { BuildMeClient, User, DashboardEntry, Build, DriftEntry, VersionOverviewEntry } from "./api.js";

const BUILDME_API_URL = process.env.BUILDME_API_URL || "https://build.biswas.me";
const PORT = parseInt(process.env.PORT || "3001", 10);

/** Map known MCP client identifiers to friendly display names. */
const AGENT_NAME_MAP: Record<string, string> = {
  "claude-code": "Claude Code",
  "codex-cli": "Codex",
  "gemini-cli": "Gemini",
  "cursor": "Cursor",
  "windsurf": "Windsurf",
};

function normalizeAgentName(raw: string): string {
  const key = raw.trim().toLowerCase();
  return AGENT_NAME_MAP[key] ?? raw.trim().slice(0, 100);
}

// --- API key validation cache (5-minute TTL) ---
interface CacheEntry {
  user: User;
  validUntil: number;
  agentName?: string;
}
const apiKeyCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

// --- Persistent agent name cache ---
import { readFileSync, writeFileSync } from "fs";
const AGENT_CACHE_PATH = "/tmp/buildme-mcp-agents.json";

function loadAgentCache(): Record<string, string> {
  try {
    return JSON.parse(readFileSync(AGENT_CACHE_PATH, "utf-8"));
  } catch {
    return {};
  }
}

function saveAgentName(apiKeyHash: string, agentName: string): void {
  const cache = loadAgentCache();
  cache[apiKeyHash] = agentName;
  try {
    writeFileSync(AGENT_CACHE_PATH, JSON.stringify(cache));
  } catch {
    /* best-effort */
  }
}

function getPersistedAgentName(apiKeyHash: string): string | undefined {
  return loadAgentCache()[apiKeyHash];
}

function hashKey(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = ((h << 5) - h + key.charCodeAt(i)) | 0;
  }
  return h.toString(36);
}

function formatResponse(data: unknown, verbose = false): string {
  return verbose ? JSON.stringify(data, null, 2) : JSON.stringify(data);
}

interface ProjectMetadata {
  deployment_type?: string;
  tech_stack?: string[];
  ports?: Record<string, number[]>;
  mcp_url?: string;
  custom_headers?: Record<string, Record<string, string>>;
}

function parseMetadata(raw?: string): ProjectMetadata {
  if (!raw || raw === "{}") return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

// --- Minimizer helpers ---

function minimizeDashboardEntry(entry: DashboardEntry) {
  return {
    project_id: entry.project.id,
    project_name: entry.project.name,
    builds: entry.builds.map((b) => ({
      id: b.id,
      branch: b.branch,
      status: b.status,
      commit_sha: b.commit_sha?.substring(0, 7),
      duration_ms: b.duration_ms,
      finished_at: b.finished_at,
    })),
  };
}

function minimizeBuild(b: Build) {
  return {
    id: b.id,
    status: b.status,
    branch: b.branch,
    commit_sha: b.commit_sha?.substring(0, 7),
    commit_message: b.commit_message?.substring(0, 80),
    commit_author: b.commit_author,
    duration_ms: b.duration_ms,
    started_at: b.started_at,
    finished_at: b.finished_at,
    provider_type: b.provider_type,
  };
}

function minimizeDrift(d: DriftEntry) {
  return {
    project_id: d.project_id,
    env: d.env,
    deployed_sha: d.deployed_sha?.substring(0, 7),
    health: d.health,
  };
}

/**
 * Create and configure the MCP server with all BuildMe tools.
 */
function createServer(client: BuildMeClient, cachedUser?: User): McpServer {
  const server = new McpServer({
    name: "buildme",
    version: "1.0.0",
  });

  // --- get_me ---
  server.tool(
    "get_me",
    "Get current authenticated user info",
    { verbose: z.boolean().optional().describe("Return full details (default: false)") },
    async ({ verbose }) => {
      const user = cachedUser ?? (await client.getMe());
      return { content: [{ type: "text" as const, text: formatResponse(user, verbose) }] };
    }
  );

  // --- get_dashboard ---
  server.tool(
    "get_dashboard",
    "All projects + latest builds per env (staging/uat/prod)",
    {
      verbose: z.boolean().optional().describe("Return full details (default: false)"),
    },
    async ({ verbose }) => {
      const data = await client.getDashboard();
      const result = verbose ? data : data.map(minimizeDashboardEntry);
      return { content: [{ type: "text" as const, text: formatResponse(result, verbose) }] };
    }
  );

  // --- get_drift ---
  server.tool(
    "get_drift",
    "Drift: deployed vs built versions + health per env",
    {
      verbose: z.boolean().optional().describe("Return full details (default: false)"),
    },
    async ({ verbose }) => {
      const data = await client.getDrift();
      const result = verbose ? data : data.map(minimizeDrift);
      return { content: [{ type: "text" as const, text: formatResponse(result, verbose) }] };
    }
  );

  // --- sync_all ---
  server.tool(
    "sync_all",
    "Trigger sync for all projects, returns results",
    {
      verbose: z.boolean().optional().describe("Return full details (default: false)"),
    },
    async ({ verbose }) => {
      const data = await client.syncAll();
      return { content: [{ type: "text" as const, text: formatResponse(data, verbose) }] };
    }
  );

  // --- list_projects ---
  server.tool(
    "list_projects",
    "List user's projects with environment URLs and MCP info",
    {
      verbose: z.boolean().optional().describe("Return full details (default: false)"),
    },
    async ({ verbose }) => {
      const projects = await client.listProjects();
      const data = verbose
        ? projects
        : projects.map((p) => {
            const meta = parseMetadata(p.metadata);
            const base: Record<string, unknown> = { id: p.id, name: p.name, slug: p.slug };
            if (p.production_url) base.production_url = p.production_url;
            if (p.staging_url) base.staging_url = p.staging_url;
            if (meta.mcp_url) base.mcp_url = meta.mcp_url;
            return base;
          });
      return { content: [{ type: "text" as const, text: formatResponse(data, verbose) }] };
    }
  );

  // --- get_project ---
  server.tool(
    "get_project",
    "Project details by ID",
    {
      project_id: z.string().describe("Project ID"),
      verbose: z.boolean().optional().describe("Return full details (default: false)"),
    },
    async ({ project_id, verbose }) => {
      const project = await client.getProject(project_id);
      return { content: [{ type: "text" as const, text: formatResponse(project, verbose) }] };
    }
  );

  // --- list_builds ---
  server.tool(
    "list_builds",
    "Builds for a project",
    {
      project_id: z.string().describe("Project ID"),
      branch: z.string().optional().describe("Filter by branch"),
      status: z.string().optional().describe("Filter by status"),
      page: z.number().optional().describe("Page number"),
      verbose: z.boolean().optional().describe("Return full details (default: false)"),
    },
    async ({ project_id, branch, status, page, verbose }) => {
      const result = await client.listBuilds(project_id, { branch, status, page });
      const data = verbose
        ? result
        : { builds: result.builds.map(minimizeBuild), total: result.total };
      return { content: [{ type: "text" as const, text: formatResponse(data, verbose) }] };
    }
  );

  // --- get_build ---
  server.tool(
    "get_build",
    "Build detail with jobs",
    {
      project_id: z.string().describe("Project ID"),
      build_id: z.string().describe("Build ID"),
      verbose: z.boolean().optional().describe("Return full details (default: false)"),
    },
    async ({ project_id, build_id, verbose }) => {
      const build = await client.getBuild(project_id, build_id);
      return { content: [{ type: "text" as const, text: formatResponse(build, verbose) }] };
    }
  );

  // --- sync_project ---
  server.tool(
    "sync_project",
    "Trigger sync for one project",
    {
      project_id: z.string().describe("Project ID"),
      verbose: z.boolean().optional().describe("Return full details (default: false)"),
    },
    async ({ project_id, verbose }) => {
      const data = await client.syncProject(project_id);
      return { content: [{ type: "text" as const, text: formatResponse(data, verbose) }] };
    }
  );

  // --- retrigger_build ---
  server.tool(
    "retrigger_build",
    "Retrigger a build on CI (re-runs the same commit)",
    {
      project_id: z.string().describe("Project ID"),
      build_id: z.string().describe("Build ID"),
      verbose: z.boolean().optional().describe("Return full details (default: false)"),
    },
    async ({ project_id, build_id, verbose }) => {
      const data = await client.retriggerBuild(project_id, build_id);
      return { content: [{ type: "text" as const, text: formatResponse(data, verbose) }] };
    }
  );

  // --- restart_build (alias for retrigger) ---
  server.tool(
    "restart_build",
    "Restart a build (alias for retrigger_build)",
    {
      project_id: z.string().describe("Project ID"),
      build_id: z.string().describe("Build ID"),
      verbose: z.boolean().optional().describe("Return full details (default: false)"),
    },
    async ({ project_id, build_id, verbose }) => {
      const data = await client.retriggerBuild(project_id, build_id);
      return { content: [{ type: "text" as const, text: formatResponse(data, verbose) }] };
    }
  );

  // --- cancel_build ---
  server.tool(
    "cancel_build",
    "Cancel a running/queued build on CI",
    {
      project_id: z.string().describe("Project ID"),
      build_id: z.string().describe("Build ID"),
      verbose: z.boolean().optional().describe("Return full details (default: false)"),
    },
    async ({ project_id, build_id, verbose }) => {
      const data = await client.cancelBuild(project_id, build_id);
      return { content: [{ type: "text" as const, text: formatResponse(data, verbose) }] };
    }
  );

  // --- watch_builds ---
  server.tool(
    "watch_builds",
    "Get active (running/queued) builds across all or one project. Returns adaptive poll_interval_seconds: 30s when builds are active, 300s when idle. Call this repeatedly to monitor build progress.",
    {
      project_id: z.string().optional().describe("Project ID (omit for all projects)"),
      verbose: z.boolean().optional().describe("Return full details (default: false)"),
    },
    async ({ project_id, verbose }) => {
      let activeBuilds: Array<ReturnType<typeof minimizeBuild> & { project_id: number; project_name?: string }> = [];

      if (project_id) {
        const result = await client.listBuilds(project_id, { per_page: 20 });
        activeBuilds = (result.builds || [])
          .filter((b) => b.status === "running" || b.status === "queued")
          .map((b) => ({ ...minimizeBuild(b), project_id: b.project_id }));
      } else {
        const dashboard = await client.getDashboard();
        for (const entry of dashboard) {
          for (const b of entry.builds) {
            if (b.status === "running" || b.status === "queued") {
              activeBuilds.push({
                ...minimizeBuild(b),
                project_id: entry.project.id,
                project_name: entry.project.name,
              });
            }
          }
        }
      }

      const hasActive = activeBuilds.length > 0;
      const result = {
        active_builds: activeBuilds,
        total_active: activeBuilds.length,
        poll_interval_seconds: hasActive ? 30 : 300,
        recommendation: hasActive
          ? `${activeBuilds.length} build(s) in progress. Poll again in 30s for updates.`
          : "No active builds. Poll again in 5 minutes.",
      };
      return { content: [{ type: "text" as const, text: formatResponse(result, verbose) }] };
    }
  );

  // --- get_version ---
  server.tool(
    "get_version",
    "BuildMe server version/commit/build_time",
    {
      verbose: z.boolean().optional().describe("Return full details (default: false)"),
    },
    async ({ verbose }) => {
      const version = await client.getVersion();
      return { content: [{ type: "text" as const, text: formatResponse(version, verbose) }] };
    }
  );

  // --- health_check ---
  server.tool(
    "health_check",
    "Server health status",
    {
      verbose: z.boolean().optional().describe("Return full details (default: false)"),
    },
    async ({ verbose }) => {
      const health = await client.healthCheck();
      return { content: [{ type: "text" as const, text: formatResponse(health, verbose) }] };
    }
  );

  // --- get_version_overview ---
  server.tool(
    "get_version_overview",
    "Latest version/health/resources for all projects and environments (from cached snapshots)",
    {
      verbose: z.boolean().optional().describe("Return full details (default: false)"),
    },
    async ({ verbose }) => {
      const data = await client.getVersionOverview();
      const result = verbose
        ? data
        : data.map((e: VersionOverviewEntry) => ({
            project: e.project_name,
            env: e.env,
            sha: e.deployed_sha?.substring(0, 7),
            health: e.health_status,
            response_ms: e.response_time_ms,
            checked_at: e.checked_at,
          }));
      return { content: [{ type: "text" as const, text: formatResponse(result, verbose) }] };
    }
  );

  // --- get_version_history ---
  server.tool(
    "get_version_history",
    "Historical version snapshots for a project+environment",
    {
      project_id: z.string().describe("Project ID"),
      env: z.string().optional().describe("Environment: staging, uat, production (default: production)"),
      limit: z.number().optional().describe("Max results (default: 50)"),
      verbose: z.boolean().optional().describe("Return full details (default: false)"),
    },
    async ({ project_id, env, limit, verbose }) => {
      const data = await client.getVersionSnapshots(project_id, { env, limit });
      const result = verbose
        ? data
        : data.map((s) => ({
            sha: s.deployed_sha?.substring(0, 7),
            health: s.health_status,
            response_ms: s.response_time_ms,
            at: s.created_at,
          }));
      return { content: [{ type: "text" as const, text: formatResponse(result, verbose) }] };
    }
  );

  // --- update_project_headers ---
  server.tool(
    "update_project_headers",
    "Set custom HTTP headers per project per environment (e.g., Cloudflare Access tokens)",
    {
      project_id: z.string().describe("Project ID"),
      env: z.enum(["staging", "uat", "production"]).describe("Environment"),
      headers: z
        .record(z.string())
        .describe("Header key-value pairs to set. Pass empty object to clear."),
      verbose: z.boolean().optional().describe("Return full details (default: false)"),
    },
    async ({ project_id, env, headers: newHeaders, verbose }) => {
      // Get existing project to merge metadata
      const project = await client.getProject(project_id);
      const meta = parseMetadata(project.metadata);
      if (!meta.custom_headers) meta.custom_headers = {};

      if (Object.keys(newHeaders).length === 0) {
        delete meta.custom_headers[env];
      } else {
        meta.custom_headers[env] = newHeaders;
      }

      // Clean up empty custom_headers
      if (Object.keys(meta.custom_headers).length === 0) {
        delete meta.custom_headers;
      }

      const updated = await client.updateProject(project_id, {
        metadata: JSON.stringify(meta),
      });

      return {
        content: [
          {
            type: "text" as const,
            text: formatResponse(
              { message: `Headers updated for ${env}`, project_id: updated.id },
              verbose,
            ),
          },
        ],
      };
    }
  );

  // --- get_build_stats ---
  server.tool(
    "get_build_stats",
    "Aggregate: success rate, avg duration, recent failures",
    {
      project_id: z.string().optional().describe("Project ID (omit for all projects)"),
      verbose: z.boolean().optional().describe("Return full details (default: false)"),
    },
    async ({ project_id, verbose }) => {
      // Compute stats from dashboard or build list data
      if (project_id) {
        const result = await client.listBuilds(project_id, { per_page: 100 });
        const builds = result.builds || [];
        const total = builds.length;
        const successes = builds.filter((b) => b.status === "success").length;
        const failures = builds.filter((b) => b.status === "failure").length;
        const durations = builds
          .filter((b) => b.duration_ms != null)
          .map((b) => b.duration_ms as number);
        const avgDuration = durations.length
          ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
          : null;
        const recentFailures = builds
          .filter((b) => b.status === "failure")
          .slice(0, 5)
          .map(minimizeBuild);
        const stats = {
          total_builds: total,
          success_rate: total ? `${((successes / total) * 100).toFixed(1)}%` : "N/A",
          failure_count: failures,
          avg_duration_ms: avgDuration,
          recent_failures: recentFailures,
        };
        return { content: [{ type: "text" as const, text: formatResponse(stats, verbose) }] };
      } else {
        // Aggregate across all projects via dashboard
        const dashboard = await client.getDashboard();
        const allBuilds = dashboard.flatMap((e) => e.builds);
        const total = allBuilds.length;
        const successes = allBuilds.filter((b) => b.status === "success").length;
        const stats = {
          total_projects: dashboard.length,
          total_builds_sampled: total,
          success_rate: total ? `${((successes / total) * 100).toFixed(1)}%` : "N/A",
          projects: dashboard.map((e) => ({
            project: e.project.name,
            latest_status: e.builds[0]?.status ?? "no builds",
          })),
        };
        return { content: [{ type: "text" as const, text: formatResponse(stats, verbose) }] };
      }
    }
  );

  return server;
}

// --- Express app ---
const app = express();
app.use(express.json());

// Health endpoint
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "buildme-mcp" });
});

// Version endpoint
app.get("/api/version", (_req, res) => {
  res.json({
    version: process.env.BUILDME_MCP_VERSION || "dev",
    git_commit: process.env.BUILDME_MCP_GIT_COMMIT || "unknown",
    build_time: process.env.BUILDME_MCP_BUILD_TIME || "unknown",
  });
});

// MCP endpoint — stateless: one transport per request
app.post("/", async (req, res) => {
  const apiKey = req.headers["x-api-key"] as string | undefined;
  if (!apiKey) {
    res.status(401).json({ error: "Missing X-API-Key header" });
    return;
  }

  const client = new BuildMeClient(BUILDME_API_URL, apiKey);
  let cachedUser: User | undefined;
  const now = Date.now();
  const cached = apiKeyCache.get(apiKey);
  if (cached && cached.validUntil > now) {
    cachedUser = cached.user;
  } else {
    try {
      cachedUser = await client.getMe();
      apiKeyCache.set(apiKey, { user: cachedUser, validUntil: now + CACHE_TTL_MS });
    } catch {
      res.status(403).json({ error: "Invalid API key" });
      return;
    }
  }

  // Detect agent name from multiple sources
  const headerAgent = req.headers["x-agent-name"] as string | undefined;
  if (headerAgent) {
    client.agentName = normalizeAgentName(headerAgent);
  }

  if (!client.agentName) {
    const messages = Array.isArray(req.body) ? req.body : [req.body];
    for (const msg of messages) {
      if (msg?.method === "initialize" && msg?.params?.clientInfo?.name) {
        client.agentName = normalizeAgentName(msg.params.clientInfo.name);
        break;
      }
    }
  }

  if (!client.agentName) {
    const ua = (req.headers["user-agent"] || "").toLowerCase();
    for (const [key, name] of Object.entries(AGENT_NAME_MAP)) {
      if (ua.includes(key)) {
        client.agentName = name;
        break;
      }
    }
  }

  if (!client.agentName) {
    const entry = apiKeyCache.get(apiKey);
    if (entry?.agentName) client.agentName = entry.agentName;
  }

  const keyHash = hashKey(apiKey);
  if (!client.agentName) {
    const persisted = getPersistedAgentName(keyHash);
    if (persisted) client.agentName = persisted;
  }

  if (client.agentName) {
    const entry = apiKeyCache.get(apiKey);
    if (entry) entry.agentName = client.agentName;
    saveAgentName(keyHash, client.agentName);
  }

  const server = createServer(client, cachedUser);

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

app.get("/", (_req, res) => {
  res.status(405).json({ error: "Method not allowed — stateless server, use POST" });
});

app.delete("/", (_req, res) => {
  res.status(405).json({ error: "Method not allowed — stateless server, use POST" });
});

app.listen(PORT, () => {
  console.log(`BuildMe MCP server listening on port ${PORT}`);
  console.log(`API backend: ${BUILDME_API_URL}`);
});
