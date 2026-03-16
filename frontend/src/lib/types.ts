export type BuildStatus =
  | "queued"
  | "running"
  | "success"
  | "failure"
  | "cancelled"
  | "error"
  | "skipped";

export type ProviderType = "github" | "travis" | "circleci";
export type ProjectRole = "owner" | "admin" | "editor" | "viewer";
export type ChannelType = "email" | "webhook" | "webpush";

export interface User {
  id: number;
  email: string;
  github_id?: number;
  github_login?: string;
  display_name: string;
  avatar_url?: string;
  is_super_admin: boolean;
  invites_remaining?: number;
  created_at: string;
  updated_at: string;
}

export interface Invite {
  id: number;
  code: string;
  created_by: number;
  used_by?: number;
  expires_at: string;
  used_at?: string;
  created_at: string;
}

export interface APIKey {
  id: number;
  name: string;
  key?: string;
  key_prefix: string;
  created_at: string;
  expires_at?: string;
}

export interface ProjectMetadata {
  deployment_type?: string;
  tech_stack?: string[];
  ports?: Record<string, number[]>;
  mcp_url?: string;
  mcp_urls?: Record<string, string>;
  mcp_health_path?: string;
  custom_headers?: Record<string, Record<string, string>>;
  version_poll_interval_m?: number;
}

export interface Project {
  id: number;
  name: string;
  slug: string;
  description?: string;
  staging_url?: string;
  uat_url?: string;
  production_url?: string;
  version_path?: string;
  version_field?: string;
  health_path?: string;
  metadata?: string;
  created_at: string;
  updated_at: string;
}

export function parseMetadata(p: Project): ProjectMetadata {
  if (!p.metadata || p.metadata === "{}") return {};
  try {
    return JSON.parse(p.metadata);
  } catch {
    return {};
  }
}

export interface ProjectMember {
  project_id: number;
  user_id: number;
  role: ProjectRole;
  created_at: string;
  user?: User;
}

export interface CIProvider {
  id: number;
  project_id: number;
  provider_type: ProviderType;
  display_name: string;
  repo_owner: string;
  repo_name: string;
  poll_interval_s: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Build {
  id: number;
  project_id: number;
  provider_id: number;
  external_id: string;
  status: BuildStatus;
  branch: string;
  commit_sha: string;
  commit_message: string;
  commit_author: string;
  trigger: string;
  workflow_name: string;
  duration_ms?: number;
  started_at?: string;
  finished_at?: string;
  provider_url: string;
  provider_type?: ProviderType;
  jobs?: BuildJob[];
  created_at: string;
  updated_at: string;
}

export interface BuildJob {
  id: number;
  build_id: number;
  external_id: string;
  name: string;
  status: BuildStatus;
  duration_ms?: number;
  started_at?: string;
  finished_at?: string;
}

export interface NotificationChannel {
  id: number;
  project_id: number;
  channel_type: ChannelType;
  config: string;
  event_filter: string;
  enabled: boolean;
}

export interface BuildEvent {
  type: string;
  project_id: number;
  build?: Build;
  job?: BuildJob;
}

export interface EnvironmentStatus {
  project_id: number;
  project_name: string;
  env: string;
  base_url: string;
  deployed_sha: string;
  version_info: Record<string, unknown> | null;
  health_status: number;
  response_time_ms: number;
  branch_head_sha?: string;
  is_drifted: boolean;
  checked_at: string;
  error?: string;
  mcp_health_status?: number;
  mcp_response_time_ms?: number;
}

export interface ProbeRegion {
  name: string;
  slug: string;
  connected: boolean;
  probe_version?: string;
  uptime_seconds?: number;
}

export interface ProbesSummary {
  total: number;
  connected: number;
  regions: ProbeRegion[];
}

export interface DriftProject {
  project: Project;
  environments: EnvironmentStatus[];
}

export interface DriftDashboard {
  projects: DriftProject[];
}

export interface VersionOverviewEntry {
  project_id: number;
  project_name: string;
  env: string;
  version_info: Record<string, unknown> | null;
  deployed_sha: string;
  health_status: number;
  response_time_ms: number;
  checked_at: string;
  mcp_health_status?: number;
  mcp_response_time_ms?: number;
}

export interface DashboardEntry {
  project: Project;
  builds: Build[];
}

export interface MetricPoint {
  id: number;
  project_id: number;
  env: string;
  memory_alloc_mb: number;
  heap_inuse_mb: number;
  goroutines: number;
  gc_pause_ms: number;
  container_memory_mb: number;
  container_memory_limit_mb: number;
  cpu_usage_ns: number;
  response_time_ms: number;
  created_at: string;
}

export interface ResourceIncident {
  id: number;
  project_id: number;
  project_name?: string;
  env: string;
  metric: string;
  value: number;
  threshold: number;
  message: string;
  created_at: string;
}
