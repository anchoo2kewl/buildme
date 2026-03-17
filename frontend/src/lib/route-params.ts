/**
 * Extract route params from the browser URL at runtime.
 * Qwik SSG bakes placeholder values ("_") into useLocation().params,
 * so we must read the real IDs from window.location.pathname.
 */
export function getRouteParams(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const parts = window.location.pathname.split("/").filter(Boolean);
  // Known route patterns:
  //   /dashboard/projects/{projectId}
  //   /dashboard/projects/{projectId}/settings
  //   /dashboard/projects/{projectId}/members
  //   /dashboard/projects/{projectId}/builds/{buildId}
  //   /dashboard/groups/{slug}
  const params: Record<string, string> = {};
  const pidIdx = parts.indexOf("projects");
  if (pidIdx >= 0 && pidIdx + 1 < parts.length) {
    params.projectId = parts[pidIdx + 1];
  }
  const bidIdx = parts.indexOf("builds");
  if (bidIdx >= 0 && bidIdx + 1 < parts.length) {
    params.buildId = parts[bidIdx + 1];
  }
  const gidIdx = parts.indexOf("groups");
  if (gidIdx >= 0 && gidIdx + 1 < parts.length) {
    params.slug = parts[gidIdx + 1];
  }
  return params;
}
