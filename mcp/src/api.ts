/**
 * BuildMe REST API client.
 * Wraps fetch calls with Authorization: ApiKey header.
 */

export interface Project {
  id: number;
  name: string;
  slug: string;
  description: string;
  staging_url: string;
  uat_url: string;
  production_url: string;
  version_path: string;
  version_field: string;
  health_path: string;
  metadata?: string;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface Build {
  id: number;
  project_id: number;
  provider_id: number;
  external_id: string;
  status: string;
  branch: string;
  commit_sha: string;
  commit_message: string;
  commit_author: string;
  trigger: string;
  workflow_name: string;
  duration_ms: number | null;
  started_at: string | null;
  finished_at: string | null;
  provider_url: string;
  provider_type: string;
  created_at: string;
  updated_at: string;
  jobs?: BuildJob[];
  [key: string]: unknown;
}

export interface BuildJob {
  id: number;
  build_id: number;
  external_id: string;
  name: string;
  status: string;
  duration_ms: number | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DashboardEntry {
  project: Project;
  builds: Build[];
}

export interface DriftEntry {
  project_id: number;
  project_name: string;
  env: string;
  deployed_sha: string;
  health: number;
  response_time_ms: number;
  is_drifted: boolean;
}

interface DriftDashboard {
  projects: Array<{
    project: Project;
    environments: Array<{
      project_id: number;
      project_name: string;
      env: string;
      deployed_sha: string;
      health_status: number;
      response_time_ms: number;
      is_drifted: boolean;
      [key: string]: unknown;
    }>;
  }>;
}

export interface User {
  id: number;
  email: string;
  display_name: string;
  is_super_admin: boolean;
  [key: string]: unknown;
}

export class BuildMeClient {
  private baseURL: string;
  private apiKey: string;
  public agentName?: string;

  constructor(baseURL: string, apiKey: string) {
    this.baseURL = baseURL.replace(/\/+$/, "");
    this.apiKey = apiKey;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `ApiKey ${this.apiKey}`,
    };
    if (this.agentName) {
      headers["X-Agent-Name"] = this.agentName;
    }
    const res = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...(options.headers as Record<string, string>),
      },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`BuildMe API error ${res.status}: ${body}`);
    }

    return res.json() as Promise<T>;
  }

  async getMe(): Promise<User> {
    return this.request<User>("/api/me");
  }

  async getDashboard(): Promise<DashboardEntry[]> {
    return this.request<DashboardEntry[]>("/api/dashboard");
  }

  async getDrift(): Promise<DriftEntry[]> {
    const data = await this.request<DriftDashboard>("/api/drift");
    const flat: DriftEntry[] = [];
    if (data && data.projects) {
      for (const dp of data.projects) {
        for (const es of dp.environments || []) {
          flat.push({
            project_id: es.project_id,
            project_name: es.project_name,
            env: es.env,
            deployed_sha: es.deployed_sha,
            health: es.health_status,
            response_time_ms: es.response_time_ms,
            is_drifted: es.is_drifted,
          });
        }
      }
    }
    return flat;
  }

  async syncAll(): Promise<unknown> {
    return this.request("/api/sync", { method: "POST" });
  }

  async listProjects(): Promise<Project[]> {
    return this.request<Project[]>("/api/projects");
  }

  async getProject(id: string): Promise<Project> {
    return this.request<Project>(`/api/projects/${encodeURIComponent(id)}`);
  }

  async listBuilds(
    projectId: string,
    params?: { branch?: string; status?: string; page?: number; per_page?: number }
  ): Promise<{ builds: Build[]; total: number; page: number; per_page: number }> {
    const qs = new URLSearchParams();
    if (params?.branch) qs.set("branch", params.branch);
    if (params?.status) qs.set("status", params.status);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.per_page) qs.set("per_page", String(params.per_page));
    const suffix = qs.toString() ? `?${qs}` : "";
    return this.request(`/api/projects/${encodeURIComponent(projectId)}/builds${suffix}`);
  }

  async getBuild(projectId: string, buildId: string): Promise<Build> {
    return this.request<Build>(
      `/api/projects/${encodeURIComponent(projectId)}/builds/${encodeURIComponent(buildId)}`
    );
  }

  async syncProject(projectId: string): Promise<unknown> {
    return this.request(`/api/projects/${encodeURIComponent(projectId)}/sync`, {
      method: "POST",
    });
  }

  async retriggerBuild(projectId: string, buildId: string): Promise<unknown> {
    return this.request(
      `/api/projects/${encodeURIComponent(projectId)}/builds/${encodeURIComponent(buildId)}/retrigger`,
      { method: "POST" }
    );
  }

  async cancelBuild(projectId: string, buildId: string): Promise<unknown> {
    return this.request(
      `/api/projects/${encodeURIComponent(projectId)}/builds/${encodeURIComponent(buildId)}/cancel`,
      { method: "POST" }
    );
  }

  async getVersion(): Promise<{ version: string; git_commit: string; build_time: string }> {
    return this.request("/api/version");
  }

  async healthCheck(): Promise<{ status: string }> {
    return this.request("/health");
  }
}
