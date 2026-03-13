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
  created_at: string;
  updated_at: string;
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
  created_at: string;
  updated_at: string;
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
}

export interface DriftProject {
  project: Project;
  environments: EnvironmentStatus[];
}

export interface DriftDashboard {
  projects: DriftProject[];
}
