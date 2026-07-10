import { describe, expect, it } from "vitest";
import { ADMIN_HISTORY_BASE, adminRoutes } from "../router";
import { ADMIN_ROUTE_ACCESS, decideAdminGuard } from "../router-policy";

describe("admin route policy", () => {
  it("uses the /admin/ history base and applies role meta to real route records", () => {
    const layoutRoute = adminRoutes.find((route) => route.name === "layout");
    const groupsRoute = layoutRoute?.children?.find((route) => route.name === "groups");

    expect(ADMIN_HISTORY_BASE).toBe("/admin/");
    expect(groupsRoute?.meta?.roles).toEqual(["super_admin"]);
  });

  it("marks login and forbidden as public routes", () => {
    expect(ADMIN_ROUTE_ACCESS.login.public).toBe(true);
    expect(ADMIN_ROUTE_ACCESS.forbidden.public).toBe(true);
  });

  it("marks group and system routes as super-admin only", () => {
    expect(ADMIN_ROUTE_ACCESS.groups.roles).toEqual(["super_admin"]);
    expect(ADMIN_ROUTE_ACCESS.system.roles).toEqual(["super_admin"]);
  });

  it("redirects an anonymous direct visit to login", () => {
    expect(
      decideAdminGuard({
        publicRoute: false,
        auth: { status: "anonymous" },
        requiredRoles: ["admin", "super_admin"],
      }),
    ).toEqual({ type: "redirect", to: "login" });
  });

  it("redirects a creator rejected during restore to forbidden", () => {
    expect(
      decideAdminGuard({
        publicRoute: false,
        auth: { status: "forbidden" },
        requiredRoles: ["admin", "super_admin"],
      }),
    ).toEqual({ type: "redirect", to: "forbidden" });
  });

  it("blocks an admin from a super-admin route reached by URL", () => {
    expect(
      decideAdminGuard({
        publicRoute: false,
        auth: { status: "authenticated", role: "admin" },
        requiredRoles: ADMIN_ROUTE_ACCESS.groups.roles,
      }),
    ).toEqual({ type: "redirect", to: "forbidden" });
  });

  it("allows an authenticated role accepted by route meta", () => {
    expect(
      decideAdminGuard({
        publicRoute: false,
        auth: { status: "authenticated", role: "admin" },
        requiredRoles: ADMIN_ROUTE_ACCESS.home.roles,
      }),
    ).toEqual({ type: "allow" });
  });
});
