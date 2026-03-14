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
export interface User {
    id: number;
    email: string;
    display_name: string;
    is_super_admin: boolean;
    [key: string]: unknown;
}
export declare class BuildMeClient {
    private baseURL;
    private apiKey;
    agentName?: string;
    constructor(baseURL: string, apiKey: string);
    private request;
    getMe(): Promise<User>;
    getDashboard(): Promise<DashboardEntry[]>;
    getDrift(): Promise<DriftEntry[]>;
    syncAll(): Promise<unknown>;
    listProjects(): Promise<Project[]>;
    getProject(id: string): Promise<Project>;
    listBuilds(projectId: string, params?: {
        branch?: string;
        status?: string;
        page?: number;
        per_page?: number;
    }): Promise<{
        builds: Build[];
        total: number;
        page: number;
        per_page: number;
    }>;
    getBuild(projectId: string, buildId: string): Promise<Build>;
    syncProject(projectId: string): Promise<unknown>;
    retriggerBuild(projectId: string, buildId: string): Promise<unknown>;
    cancelBuild(projectId: string, buildId: string): Promise<unknown>;
    getVersion(): Promise<{
        version: string;
        git_commit: string;
        build_time: string;
    }>;
    healthCheck(): Promise<{
        status: string;
    }>;
}
//# sourceMappingURL=api.d.ts.map