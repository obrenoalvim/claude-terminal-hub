import type { Role, SearchFilters } from "./types";

const ROLES: readonly Role[] = ["user", "assistant", "tool"];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parseFilters(params: URLSearchParams): SearchFilters {
  const role = params.get("role");
  const from = params.get("from");
  const to = params.get("to");
  const limit = Number(params.get("limit"));
  return {
    project: params.get("project") || undefined,
    role: ROLES.includes(role as Role) ? (role as Role) : undefined,
    from: from && DATE.test(from) ? from : undefined,
    to: to && DATE.test(to) ? to : undefined,
    limit: Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : undefined,
  };
}
