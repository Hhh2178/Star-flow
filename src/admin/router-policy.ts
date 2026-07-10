import type { AdminRole } from "../shared/auth";

const allAdminRoles = ["admin", "super_admin"] as const;
const superAdminOnly = ["super_admin"] as const;

export const ADMIN_ROUTE_ACCESS = {
  login: { public: true },
  forbidden: { public: true },
  home: { roles: allAdminRoles },
  groups: { roles: superAdminOnly },
  users: { roles: allAdminRoles },
  projects: { roles: allAdminRoles },
  tasks: { roles: allAdminRoles },
  queue: { roles: allAdminRoles },
  usage: { roles: allAdminRoles },
  quota: { roles: allAdminRoles },
  providers: { roles: allAdminRoles },
  aiConfig: { roles: allAdminRoles },
  system: { roles: superAdminOnly },
  audit: { roles: allAdminRoles },
  profile: { roles: allAdminRoles },
} as const;

export type AdminAuthState =
  | { status: "anonymous" }
  | { status: "forbidden" }
  | { status: "authenticated"; role: AdminRole };

export type AdminGuardDecision =
  | { type: "allow" }
  | { type: "redirect"; to: "login" | "forbidden" };

export interface AdminGuardInput {
  publicRoute: boolean;
  auth: AdminAuthState;
  requiredRoles?: readonly AdminRole[];
}

export function decideAdminGuard(input: AdminGuardInput): AdminGuardDecision {
  if (input.publicRoute) return { type: "allow" };
  if (input.auth.status === "anonymous") return { type: "redirect", to: "login" };
  if (input.auth.status === "forbidden") return { type: "redirect", to: "forbidden" };
  if (input.requiredRoles && !input.requiredRoles.includes(input.auth.role)) {
    return { type: "redirect", to: "forbidden" };
  }
  return { type: "allow" };
}
