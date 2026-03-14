/**
 * BuildMe REST API client.
 * Wraps fetch calls with Authorization: ApiKey header.
 */
export class BuildMeClient {
    baseURL;
    apiKey;
    agentName;
    constructor(baseURL, apiKey) {
        this.baseURL = baseURL.replace(/\/+$/, "");
        this.apiKey = apiKey;
    }
    async request(path, options = {}) {
        const url = `${this.baseURL}${path}`;
        const headers = {
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
                ...options.headers,
            },
        });
        if (!res.ok) {
            const body = await res.text();
            throw new Error(`BuildMe API error ${res.status}: ${body}`);
        }
        return res.json();
    }
    async getMe() {
        return this.request("/api/me");
    }
    async getDashboard() {
        return this.request("/api/dashboard");
    }
    async getDrift() {
        const data = await this.request("/api/drift");
        const flat = [];
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
    async syncAll() {
        return this.request("/api/sync", { method: "POST" });
    }
    async listProjects() {
        return this.request("/api/projects");
    }
    async getProject(id) {
        return this.request(`/api/projects/${encodeURIComponent(id)}`);
    }
    async listBuilds(projectId, params) {
        const qs = new URLSearchParams();
        if (params?.branch)
            qs.set("branch", params.branch);
        if (params?.status)
            qs.set("status", params.status);
        if (params?.page)
            qs.set("page", String(params.page));
        if (params?.per_page)
            qs.set("per_page", String(params.per_page));
        const suffix = qs.toString() ? `?${qs}` : "";
        return this.request(`/api/projects/${encodeURIComponent(projectId)}/builds${suffix}`);
    }
    async getBuild(projectId, buildId) {
        return this.request(`/api/projects/${encodeURIComponent(projectId)}/builds/${encodeURIComponent(buildId)}`);
    }
    async syncProject(projectId) {
        return this.request(`/api/projects/${encodeURIComponent(projectId)}/sync`, {
            method: "POST",
        });
    }
    async retriggerBuild(projectId, buildId) {
        return this.request(`/api/projects/${encodeURIComponent(projectId)}/builds/${encodeURIComponent(buildId)}/retrigger`, { method: "POST" });
    }
    async cancelBuild(projectId, buildId) {
        return this.request(`/api/projects/${encodeURIComponent(projectId)}/builds/${encodeURIComponent(buildId)}/cancel`, { method: "POST" });
    }
    async getVersion() {
        return this.request("/api/version");
    }
    async healthCheck() {
        return this.request("/health");
    }
}
//# sourceMappingURL=api.js.map