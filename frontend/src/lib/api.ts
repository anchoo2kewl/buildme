const API_BASE = "/api";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("buildme_token");
}

export function setToken(token: string) {
  localStorage.setItem("buildme_token", token);
}

export function clearToken() {
  localStorage.removeItem("buildme_token");
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const resp = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!resp.ok) {
    const body = await resp.json().catch(() => ({ error: resp.statusText }));
    throw new Error(body.error || `API error ${resp.status}`);
  }

  return resp.json();
}

export const get = <T>(path: string) => api<T>(path);
export const post = <T>(path: string, body: unknown) =>
  api<T>(path, { method: "POST", body: JSON.stringify(body) });
export const put = <T>(path: string, body: unknown) =>
  api<T>(path, { method: "PUT", body: JSON.stringify(body) });
export const patch = <T>(path: string, body: unknown) =>
  api<T>(path, { method: "PATCH", body: JSON.stringify(body) });
export const del = <T>(path: string) => api<T>(path, { method: "DELETE" });

export const fetchDrift = () =>
  get<import("~/lib/types").DriftDashboard>("/drift");

export const fetchDashboard = () =>
  get<import("~/lib/types").DashboardEntry[]>("/dashboard");

export const fetchVersionOverview = () =>
  get<import("~/lib/types").VersionOverviewEntry[]>("/version-overview");

export const fetchMetrics = (projectId: number, env: string, hours = 24) =>
  get<import("~/lib/types").MetricPoint[]>(
    `/projects/${projectId}/metrics?env=${env}&hours=${hours}`,
  );

export const fetchIncidents = (limit = 50) =>
  get<import("~/lib/types").ResourceIncident[]>(`/incidents?limit=${limit}`);

export const fetchProjectIncidents = (projectId: number, limit = 20) =>
  get<import("~/lib/types").ResourceIncident[]>(
    `/projects/${projectId}/incidents?limit=${limit}`,
  );

export const syncProject = (projectId: number) =>
  api<unknown>(`/projects/${projectId}/sync`, { method: "POST" });

export const fetchHosts = () => get<import("~/lib/types").Host[]>("/hosts");
export const fetchHostMetrics = (hostId: number, limit = 60) =>
  get<import("~/lib/types").HostMetric[]>(`/hosts/${hostId}/metrics?limit=${limit}`);
